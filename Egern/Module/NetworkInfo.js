/*
 * 网络信息
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
 * 更新：2025.12.15 10:45
 */

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 通用 HTTP GET 请求
const httpGet = (url) => new Promise((resolve) => {
  $httpClient.get({ url }, (err, _, data) => {
    try {
      const res = !err && data ? JSON.parse(data) : {};
      resolve(res.data || res); // 兼容 ipip.net 嵌套结构
    } catch {
      resolve({});
    }
  });
});

// 格式化 ISP 名称
const getISP = (name) => {
  if (!name) return "未知运营商";
  const s = name.replace(/\s*\(中国\)/g, "").trim();
  if (/mobile|cmcc|cmnet|移动/i.test(s)) return "中国移动";
  if (/telecom|ctcc|电信/i.test(s)) return "中国电信";
  if (/unicom|link|联通/i.test(s)) return "中国联通";
  if (/cbn|广电/i.test(s)) return "中国广电";
  return s;
};

// 获取网络制式
const getRadio = (r) => {
  const map = {
    "GPRS": "2.5G", "CDMA1X": "2.5G", "EDGE": "2.75G",
    "WCDMA": "3G", "HSDPA": "3.5G", "HSUPA": "3.75G",
    "LTE": "4G", "LTEA": "4G", "LTE+": "4G",
    "NR": "5G", "NRNSA": "5G", "NR5G": "5G"
  };
  return r ? (map[r.toUpperCase().replace(/\s+/g, "")] || r) : "";
};

// 主逻辑
(async () => {
  try {
    const { v4 = {}, v6 = {}, wifi = {}, cellular = {}, "cellular-data": cd = {} } = $network || {};
    const radio = cellular.radio || cd.radio;

    // 并行请求 API
    // 1. myip.ipip.net (本地公网)
    // 2. ip-api.com (节点出口)
    const [local, node] = await Promise.all([
      httpGet('https://myip.ipip.net/json'),
      httpGet('http://ip-api.com/json?lang=zh-CN')
    ]);

    // 1. 标题构建
    // 优先尝试从 ipip.net 的 location 数组获取真实 ISP (通常在最后一位)，否则降级使用节点 ISP
    const rawISP = (Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node.isp;
    const netStatus = wifi.ssid || (radio ? getRadio(radio) : "未连接");
    const title = `${getISP(rawISP)} | ${netStatus}`;

    // 2. 内容构建
    const body = [];
    
    // 内网信息
    if (v4.primaryAddress) body.push(`内网IPv4：${v4.primaryAddress}`);
    if (v4.routerAddress) body.push(`内网路由：${v4.routerAddress}`);
    if (v6.primaryAddress) body.push(`内网IPv6：${v6.primaryAddress}`);

    // 本地公网
    const locStr = Array.isArray(local.location) ? `(${local.location.slice(0, 3).join('')})` : "";
    body.push(`本地IPv4：${local.ip || "检测失败"} ${locStr}`);

    // 节点信息
    const nodeStr = node.query ? `${node.country || ""} ${node.city || ""}` : "";
    body.push(`节点IPv4：${node.query || "检测失败"} ${nodeStr}`);

    // 3. 输出
    $done({
      title,
      content: body.join("\n"),
      icon: wifi.ssid ? 'wifi' : 'simcard',
      'icon-color': wifi.ssid ? '#005CAF' : '#F9BF45'
    });

  } catch (e) {
    console.log(`[NetInfo Error] ${e}`);
    $done({
      title: '信息获取失败',
      content: '请检查网络连接或脚本配置',
      icon: 'exclamationmark.triangle',
      'icon-color': '#CB1B45'
    });
  }
})();
