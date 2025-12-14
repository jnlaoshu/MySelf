/*
 * 网络信息
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
 * 𝐅𝐫𝐨𝐦：https://github.com/Nebulosa-Cat/Surge/blob/main/Panel/Network-Info/net-info-panel.js
 * 更新：2025.12.14 21:30
 */

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 工具类：HTTP 请求
const http = {
  get: (url) => new Promise((resolve, reject) => {
    $httpClient.get({ url }, (err, resp, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  })
};

// 工具类：日志
const logger = {
  log: (msg) => console.log(`[NetworkInfo] ${msg}`),
  error: (msg) => console.log(`[NetworkInfo] [ERROR] ${msg}`)
};

// 核心逻辑：格式化运营商名称 (源自 1.js)
function fmtISP(isp) {
  const raw = String(isp || "").trim();
  if (!raw) return "未知运营商";
  
  // 移除常见干扰词
  const norm = raw.replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
  const s = norm.toLowerCase();
  
  // 匹配常见国内运营商
  if (/(^|[\s-])(cmcc|cmnet|cmi)\b|china\s*mobile|移动/.test(s)) return "中国移动";
  if (/(^|[\s-])(chinanet|china\s*telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
  if (/(^|[\s-])(china\s*unicom|cncgroup|netcom)\b|联通/.test(s)) return "中国联通";
  if (/(^|[\s-])(cbn|china\s*broadcast)|广电/.test(s)) return "中国广电";
  if (/^中国(移动|联通|电信|广电)$/.test(norm)) return norm;
  
  return raw;
}

// 核心逻辑：网络制式转换 (源自 1.js)
function getRadioType(radio) {
  if (!radio) return "";
  const x = String(radio).toUpperCase().replace(/\s+/g, "");
  const map = {
    "GPRS": "2.5G", "CDMA1X": "2.5G", "EDGE": "2.75G",
    "WCDMA": "3G", "HSDPA": "3.5G", "HSUPA": "3.75G", "CDMAEVD0REV0": "3.5G", "CDMAEVD0REVA": "3.5G", "CDMAEVD0REVB": "3.75G", "EHRPD": "3.9G",
    "LTE": "4G", "LTEA": "4G", "LTE+": "4G", "LTEPLUS": "4G",
    "NRNSA": "5G", "NR": "5G", "NR5G": "5G"
  };
  return map[x] || x;
}

// 核心逻辑：获取网络状态
function getNetworkState() {
  const n = $network || {};
  const ssid = n.wifi?.ssid;
  const radio = n["cellular-data"]?.radio || n.cellular?.radio;
  
  return {
    ssid,
    radio,
    radioType: getRadioType(radio),
    v4: n.v4?.primaryAddress,
    v6: n.v6?.primaryAddress,
    router: n.v4?.primaryRouter
  };
}

// 核心逻辑：获取当前时间
function getCurrentTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// 主逻辑
(async () => {
  try {
    const net = getNetworkState();
    
    // 并行请求：
    // 1. ipip.net 获取本地 ISP (用于标题替换 Wi-Fi/蜂窝) - 源自 1.js 逻辑
    // 2. ip-api.com 获取详细节点信息 (用于面板内容)
    const pLocal = http.get('https://myip.ipip.net/json').then(data => {
      try { return JSON.parse(data).data.location; } catch { return []; }
    }).catch(() => []);
    
    const pNode = http.get('http://ip-api.com/json?lang=zh-CN').then(data => {
      try { return JSON.parse(data); } catch { return {}; }
    }).catch(() => ({}));

    // 等待请求完成
    const [locArr, nodeInfo] = await Promise.all([pLocal, pNode]);

    // 解析本地 ISP (优先取 ipip 返回的运营商字段，通常在索引 4 或 3)
    let rawISP = "";
    if (locArr && locArr.length) {
       rawISP = locArr[4] || locArr[3] || "";
    }
    // 如果本地获取失败，回退到节点 ISP
    if (!rawISP && nodeInfo.isp) rawISP = nodeInfo.isp;
    
    const displayISP = fmtISP(rawISP);

    // 构建标题：使用 ISP 名称替换原有的 Wi-Fi/蜂窝文本
    let title = "";
    if (net.ssid) {
      // 模式: 运营商 | Wi-Fi名 (原: Wi-Fi | SSID)
      title = `${displayISP} | ${net.ssid}`;
    } else if (net.radio) {
      // 模式: 运营商 | 5G (原: 蜂窝网络 | 5G)
      title = `${displayISP} | ${net.radioType || net.radio}`;
    } else {
      title = `${displayISP} | 未连接`;
    }

    // 构建内容
    let content = [];
    if (net.v4) content.push(`本机 IPv4：${net.v4}`);
    if (net.v6) content.push(`本机 IPv6：${net.v6}`);
    if (net.ssid && net.router) content.push(`路由器 IP：${net.router}`);
    
    if (nodeInfo.query) {
      content.push(`现用节点：${nodeInfo.query}`);
      content.push(`节点运营：${nodeInfo.isp || '-'}`);
      content.push(`节点位置：${nodeInfo.country || '-'} - ${nodeInfo.city || '-'}`);
    } else {
      content.push("节点信息获取失败");
    }

    $done({
      title: `${title} (${getCurrentTime()})`,
      content: content.join("\n"),
      icon: net.ssid ? 'wifi' : 'simcard',
      'icon-color': net.ssid ? '#005CAF' : '#F9BF45'
    });

  } catch (err) {
    logger.error(err);
    $done({
      title: '发生错误',
      content: '无法获取网络信息，请检查网络\n' + String(err),
      icon: 'exclamationmark.triangle',
      'icon-color': '#CB1B45'
    });
  }
})();
