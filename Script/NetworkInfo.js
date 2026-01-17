/*
 * 网络信息
 * 
 * 更新：2026.01.17 21:38
 */

/*
[Script]
网络信息 = type=generic, timeout=10, script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Script/NetworkInfo.js

[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

// 通用 HTTP GET 请求
const http = {
  get: (url) => new Promise((resolve) => {
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
    const [localInfo, nodeInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json'),
      http.get('https://ipwho.is/?lang=zh') 
    ]);

    // 1. 处理 ISP 名称与标题
    let rawISP = "";
    if (Array.isArray(localInfo.location) && localInfo.location.length) {
      rawISP = localInfo.location[localInfo.location.length - 1];
    }
    if (!rawISP) {
        rawISP = nodeInfo?.connection?.isp || nodeInfo.isp; 
    }
    
    const displayISP = fmtISP(rawISP);
    const radioType = n["cellular-data"]?.radio || n.cellular?.radio;
    
    let title = `${displayISP} | `;
    if (wifi.ssid) title += wifi.ssid;
    else if (radioType) title += getRadioType(radioType);
    else title += "未连接";

    // 2. 构建内容
    const content = [];
    
    // FIX START: 修复内网IP和路由IP的获取逻辑 (By Gemini) ----------------
    
    // 获取内网 IP：优先使用 v4.primaryAddress (主接口IP)，其次尝试 wifi.address
    const internalIP = v4.primaryAddress || v4.address || wifi.address;
    
    // 定义 IPv4 正则校验
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // 获取路由/网关 IP：
    // 1. v4.primaryRouter: 系统识别的主网关（通常最准确）
    // 2. wifi.router: 特定 Wi-Fi 接口的路由
    // 3. v4.router: 旧版兼容
    let routerIP = v4.primaryRouter || wifi.router || v4.router;

    // 校验：必须是 IPv4 格式，且不显示 0.0.0.0
    if (routerIP && (!ipv4Regex.test(routerIP) || routerIP === '0.0.0.0')) {
        routerIP = null;
    }
    
    // 注意：已删除原有的 .replace(/\.\d+$/, '.1') 猜测逻辑
    // 以防止路由网关不是 .1 时显示错误信息
    
    // FIX END --------------------------------------------------------

    if (internalIP) content.push(`内网IPv4：${internalIP}`);
    // 只有当存在有效的路由IP，且当前连接了Wi-Fi时，才显示“内网路由”
    // 避免在蜂窝网络下显示运营商的内网网关（如 10.x.x.x），造成困惑
    if (routerIP && wifi.ssid) {
        content.push(`内网路由：${routerIP}`);
    }

    if (v6.primaryAddress) content.push(`内网IPv6：${v6.primaryAddress}`);
    
    // 本地公网信息
    if (localInfo.ip) {
      const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('') : '';
      content.push(`本地IPv4：${localInfo.ip}`);
      content.push(`本地位置：${locStr ? `${locStr}` : ''}`);	  
    } else {
      content.push(`本地IPv4：检测失败`);
    }

    // 节点信息处理
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
