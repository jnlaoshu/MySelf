/* 网络信息
 * * 更新：2026.02.14 08:16
 */

/*
[Script]
网络信息 = type=generic, timeout=10, script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Script/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 工具：HTTP 请求
const http = {
  get: (url) => new Promise((resolve) => {
    $httpClient.get({
        url: url,
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1" }
    }, (err, resp, data) => {
      try {
        if (err) return resolve({});
        const json = JSON.parse(data);
        resolve(json.data || json); 
      } catch {
        resolve({});
      }
    });
  })
};

// 工具：格式化 ISP 名称
const fmtISP = (isp) => {
  if (!isp) return "未知运营商";
  const s = isp.toLowerCase();
  const raw = isp.replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
  if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
  if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
  if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
  if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s)) return "中国广电";
  return raw;
};

// 工具：获取蜂窝网络制式
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
    
    // 并行请求：
    // 1. 本地信息：使用 ipip.net (数据最准)
    // 2. 节点信息：使用 ip-api.com (强制 lang=zh-CN 显示中文)
    const [localInfo, nodeInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json'),
      http.get('http://ip-api.com/json/?lang=zh-CN') 
    ]);

    // --- 1. 标题与运营商处理 ---
    let rawISP = "";
    if (Array.isArray(localInfo.location) && localInfo.location.length) {
      rawISP = localInfo.location[localInfo.location.length - 1];
    }
    if (!rawISP) rawISP = nodeInfo?.isp || nodeInfo?.org; 
    
    const displayISP = fmtISP(rawISP);
    const radioType = n["cellular-data"]?.radio || n.cellular?.radio;
    
    let title = `${displayISP} | `;
    if (wifi.ssid) title += wifi.ssid;
    else if (radioType) title += getRadioType(radioType);
    else title += "未连接";

    // --- 2. IP 地址逻辑 ---
    const content = [];
    const internalIP = v4.primaryAddress || v4.address || wifi.address;
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    // 尝试获取系统报告的路由器 IP (Surge 专用)
    let routerIP = v4.primaryRouter || wifi.router || v4.router;
    
    // 校验：如果是无效 IP 或 0.0.0.0，视为获取失败，不显示
    if (routerIP && (!ipv4Regex.test(routerIP) || routerIP === '0.0.0.0')) {
        routerIP = null;
    }

    // --- 3. 构建显示内容 ---
    
    // 内网信息
    if (internalIP) content.push(`内网IPv4：${internalIP}`);
    // 只有在连接 WiFi 且 系统明确返回了有效的 routerIP 时才显示
    if (routerIP && wifi.ssid) content.push(`内网路由：${routerIP}`);
    if (v6.primaryAddress) content.push(`内网IPv6：${v6.primaryAddress}`);
    
    // 本地公网信息
    if (localInfo.ip) {
      const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('') : '';
      content.push(`本地IPv4：${localInfo.ip}`);
      content.push(`本地位置：${locStr || ''}`);	  
    } else {
      content.push(`本地IPv4：检测失败`);
    }

    // 节点信息
    // ip-api 返回的 IP 字段是 query，ipwhois 返回的是 ip。这里做兼容处理。
    const nodeIP = nodeInfo.query || nodeInfo.ip;
    
    if (nodeIP) {
      content.push(`节点IPv4：${nodeIP}`);
      // 纯中文位置 (ip-api 强制返回中文)
      content.push(`节点位置：${nodeInfo.country || ''} ${nodeInfo.city || ''}`);
    } else {
      content.push(`节点IPv4：检测失败`);
    }

    // --- 4. 输出 ---
    $done({
      title: title,
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