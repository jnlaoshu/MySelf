/*
 * 网络信息
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
 * 𝐅𝐫𝐨𝐦：https://github.com/Nebulosa-Cat/Surge/blob/main/Panel/Network-Info/net-info-panel.js
 * 更新：2025.12.14 21:40
 */

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 工具类：HTTP 请求
const http = {
  get: (url) => new Promise((resolve) => {
    $httpClient.get({ url }, (err, resp, data) => {
      // 即使错误也 resolve，避免 Promise.all 失败，后续逻辑判空处理
      if (err) resolve(null);
      else resolve(data);
    });
  })
};

// 工具类：格式化 ISP 名称
function fmtISP(isp) {
  const raw = String(isp || "").trim();
  if (!raw) return "未知运营商";
  
  // 移除干扰词并标准化
  const norm = raw.replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
  const s = norm.toLowerCase();
  
  // 匹配常见运营商
  if (/(^|[\s-])(cmcc|cmnet|cmi)\b|china\s*mobile|移动/.test(s)) return "中国移动";
  if (/(^|[\s-])(chinanet|china\s*telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
  if (/(^|[\s-])(china\s*unicom|cncgroup|netcom)\b|联通/.test(s)) return "中国联通";
  if (/(^|[\s-])(cbn|china\s*broadcast)|广电/.test(s)) return "中国广电";
  if (/^中国(移动|联通|电信|广电)$/.test(norm)) return norm;
  
  return raw;
}

// 工具类：获取网络制式
function getRadioType(radio) {
  if (!radio) return "";
  const map = {
    "GPRS": "2.5G", "CDMA1X": "2.5G", "EDGE": "2.75G",
    "WCDMA": "3G", "HSDPA": "3.5G", "HSUPA": "3.75G", 
    "LTE": "4G", "LTEA": "4G", "LTE+": "4G", 
    "NRNSA": "5G", "NR": "5G", "NR5G": "5G"
  };
  return map[radio.toUpperCase().replace(/\s+/g, "")] || radio;
}

// 主逻辑
(async () => {
  try {
    const n = $network || {};
    const ssid = n.wifi?.ssid;
    const radio = n["cellular-data"]?.radio || n.cellular?.radio;
    const v4 = n.v4?.primaryAddress; // 内网 IP
    const v6 = n.v6?.primaryAddress;
    
    // 并行请求：本地信息 (myip.ipip.net) 和 节点信息 (ip-api.com)
    // myip.ipip.net 返回结构: { "ret": "ok", "data": { "ip": "...", "location": ["中国", "xx省", "xx市", "", "运营商"] } }
    const pLocal = http.get('https://myip.ipip.net/json').then(d => {
      try { return JSON.parse(d).data || {}; } catch { return {}; }
    });
    
    const pNode = http.get('http://ip-api.com/json?lang=zh-CN').then(d => {
      try { return JSON.parse(d) || {}; } catch { return {}; }
    });

    const [localInfo, nodeInfo] = await Promise.all([pLocal, pNode]);

    // 1. 处理运营商名称 (用于标题)
    // 优先取 ipip 的 location 数组最后一位，通常是运营商
    let rawISP = "";
    if (localInfo.location && localInfo.location.length) {
       rawISP = localInfo.location[localInfo.location.length - 1]; // 取数组最后一位作为ISP
    }
    // 回退到 ip-api
    if (!rawISP && nodeInfo.isp) rawISP = nodeInfo.isp;
    const displayISP = fmtISP(rawISP);

    // 2. 构建标题
    let title = `${displayISP} | `;
    if (ssid) title += ssid;
    else if (radio) title += getRadioType(radio);
    else title += "未连接";

    // 3. 构建内容
    let content = [];
    
    // 内网信息
    if (v4) content.push(`内网 IPv4：${v4}`);
    if (v6) content.push(`内网 IPv6：${v6}`);
    
    // 本地公网信息 (新增需求：整合1.js逻辑，显示在节点上方)
    if (localInfo.ip) {
      const locStr = localInfo.location ? localInfo.location.slice(0, 3).join('') : ''; // 仅取国家省市
      content.push(`本地 IPv4：${localInfo.ip} ${locStr ? `(${locStr})` : ''}`);
    } else {
      content.push(`本地 IPv4：检测失败`);
    }

    // 节点信息
    if (nodeInfo.query) {
      content.push(`现用节点：${nodeInfo.query}`);
      content.push(`节点位置：${nodeInfo.country || ''} ${nodeInfo.city || ''} - ${nodeInfo.isp || ''}`);
    } else {
      content.push(`现用节点：检测失败`);
    }

    // 4. 输出
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    
    $done({
      title: `${title} (${timeStr})`,
      content: content.join("\n"),
      icon: ssid ? 'wifi' : 'simcard',
      'icon-color': ssid ? '#005CAF' : '#F9BF45'
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
