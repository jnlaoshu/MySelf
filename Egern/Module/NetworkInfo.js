/*
 * 网络信息
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
 * 更新：2025.12.17 08:45
 */

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 通用 HTTP GET 请求
const http = {
  get: (url) => new Promise((resolve) => {
    // 添加 User-Agent 模拟浏览器，防止被部分 API 拦截
    const opts = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        }
    };
    $httpClient.get(opts, (err, resp, data) => {
      try {
        if (err) return resolve({});
        const json = JSON.parse(data);
        // 兼容 ipip.net 的嵌套结构 (json.data) 和普通结构
        resolve(json.data || json); 
      } catch {
        resolve({});
      }
    });
  })
};

// 格式化 ISP 名称
const fmtISP = (isp) => {
  if (!isp) return "未知运营商";
  const s = isp.toLowerCase();
  // 移除干扰词
  const raw = isp.replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
  if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
  if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
  if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
  if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s)) return "中国广电";
  
  return raw;
};

// 获取网络制式
const getRadioType = (radio) => {
  if (!radio) return "";
  const map = {
    "GPRS": "2.5G", "CDMA1X": "2.5G", "EDGE": "2.75G",
    "WCDMA": "3G", "HSDPA": "3.5G", "HSUPA": "3.75G", 
    "LTE": "4G", "LTEA": "4G", "LTE+": "4G", 
    "NRNSA": "5G", "NR": "5G", "NR5G": "5G"
  };
  return map[radio.toUpperCase().replace(/\s+/g, "")] || radio;
};

// 主逻辑
(async () => {
  try {
    const n = $network || {};
    const v4 = n.v4 || {};
    const v6 = n.v6 || {};
    const wifi = n.wifi || {};
    
    // 并行请求 API
    // 1. myip.ipip.net (本地公网)
    // 2. ipwho.is (节点出口 - 使用 HTTPS)
    // 注意：将 ip-api.com 替换为 ipwho.is 以支持 HTTPS，防止请求失败
    const [localInfo, nodeInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json'),
      http.get('https://ipwho.is/?lang=zh') 
    ]);

    // 1. 处理 ISP 名称与标题
    // 优先尝试从 ipip.net 的 location 数组获取真实 ISP (通常在最后一位)
    let rawISP = "";
    if (Array.isArray(localInfo.location) && localInfo.location.length) {
      rawISP = localInfo.location[localInfo.location.length - 1];
    }
    
    // 如果 ipip 没获取到，尝试从节点信息获取
    // 兼容 ipwho.is (connection.isp) 和 ip-api (isp)
    if (!rawISP) {
        rawISP = nodeInfo?.connection?.isp || nodeInfo.isp; 
    }
    
    const displayISP = fmtISP(rawISP);
    const radioType = n["cellular-data"]?.radio || n.cellular?.radio;
    
    // 构建标题：运营商 | SSID 或 网络制式
    let title = `${displayISP} | `;
    if (wifi.ssid) title += wifi.ssid;
    else if (radioType) title += getRadioType(radioType);
    else title += "未连接";

    // 2. 构建内容
    const content = [];
    
    // FIX START: 增强内网IP和路由IP的获取逻辑
    const internalIP = wifi.address || v4.primaryAddress || v4.address;
    
    // 定义 IPv4 正则校验
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // 尝试多个字段获取路由IP
    let routerIP = wifi.router || v4.router || v4.primaryRouter || v4.routerAddress;

    // 校验：如果获取到的 routerIP 不是 IPv4 格式，将其置空（过滤掉 IPv6 格式的路由）
    if (routerIP && !ipv4Regex.test(routerIP)) {
        routerIP = null;
    }

    // 兜底策略：如果API没返回有效的IPv4路由IP，但有内网IP (e.g. 192.168.1.5)，尝试推断网关 (192.168.1.1)
    if (!routerIP && internalIP && ipv4Regex.test(internalIP)) {
        routerIP = internalIP.replace(/\.\d+$/, '.1');
    }
    // FIX END

    if (internalIP) content.push(`内网IPv4：${internalIP}`);
    if (routerIP) content.push(`内网路由：${routerIP}`);

    if (v6.primaryAddress) content.push(`内网IPv6：${v6.primaryAddress}`);
    
    // 本地公网信息
    if (localInfo.ip) {
      // ipip 返回的 location 为数组，取前三位 (国家 省 市)
      const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('') : '';
      content.push(`本地IPv4：${localInfo.ip}`);
      content.push(`本地位置：${locStr ? `${locStr}` : ''}`);	  
    } else {
      content.push(`本地IPv4：检测失败`);
    }

    // 节点信息处理
    // 兼容 ipwho.is 使用 .ip 字段，ip-api 使用 .query 字段
    const nodeIP = nodeInfo.ip || nodeInfo.query;
    
    if (nodeIP) {
      content.push(`节点IPv4：${nodeIP}`);
      content.push(`节点位置：${nodeInfo.country || ''} ${nodeInfo.city || ''}`);
    } else {
      content.push(`节点IPv4：检测失败`);
    }

    // 3. 输出结果
    $done({
      title: `${title}`,
      content: content.join("\n"),
      icon: wifi.ssid ? 'wifi' : 'simcard',
      'icon-color': wifi.ssid ? '#005CAF' : '#F9BF45'
    });

  } catch (err) {
    console.log(`[NetworkInfo Error] ${err}`);
    $done({
      title: '信息获取失败',
      content: '请检查网络连接或脚本配置',
      icon: 'exclamationmark.triangle',
      'icon-color': '#CB1B45'
    });
  }
})();
