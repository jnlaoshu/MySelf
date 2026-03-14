export default async function(ctx) {
  const http = {
    get: async (url) => {
      try {
        const resp = await ctx.http.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1" },
          timeout: 10000
        });
        const text = await resp.text();
        const json = JSON.parse(text);
        return json.data || json; 
      } catch (e) {
        return {};
      }
    }
  };

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

  try {
    const d = ctx.device || {};
    const internalIP = d.ipv4?.address;
    const internalIPv6 = d.ipv6?.address;
    const wifiSsid = d.wifi?.ssid;
    const cellularRadio = d.cellular?.radio;

    const [localInfo, nodeInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json'),
      http.get('http://ip-api.com/json/?lang=zh-CN') 
    ]);

    let rawISP = "";
    if (Array.isArray(localInfo.location) && localInfo.location.length) {
      rawISP = localInfo.location[localInfo.location.length - 1];
    }
    if (!rawISP) rawISP = nodeInfo?.isp || nodeInfo?.org; 
    
    const displayISP = fmtISP(rawISP);
    
    let title = `${displayISP} | `;
    if (wifiSsid) title += wifiSsid;
    else if (cellularRadio) title += getRadioType(cellularRadio);
    else title += "未连接";

    const rows = [];
    if (internalIP) rows.push({ icon: 'house.fill', color: '#66D175', text: `内网IPv4：${internalIP}` });
    if (internalIPv6) rows.push({ icon: 'globe.americas.fill', color: '#70D7FF', text: `内网IPv6：${internalIPv6}` });
    
    if (localInfo.ip) {
      rows.push({ icon: 'location.circle.fill', color: '#59B2FF', text: `本地IPv4：${localInfo.ip}` });
      const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('').trim() : '';
      if (locStr) rows.push({ icon: 'map.fill', color: '#FFD426', text: `本地位置：${locStr}` });
    } else {
      rows.push({ icon: 'exclamationmark.circle.fill', color: '#FF6B6B', text: `本地IPv4：检测失败` });
    }

    const nodeIP = nodeInfo.query || nodeInfo.ip;
    if (nodeIP) {
      rows.push({ icon: 'network', color: '#D4A5FF', text: `节点IPv4：${nodeIP}` });
      const nodeLoc = `${nodeInfo.country || ''} ${nodeInfo.city || ''}`.trim();
      if (nodeLoc) rows.push({ icon: 'paperplane.circle.fill', color: '#FF9570', text: `节点位置：${nodeLoc}` });
    } else {
      rows.push({ icon: 'xmark.circle.fill', color: '#FF6B6B', text: `节点IPv4：检测失败` });
    }

    const rowCount = rows.length;
    let fontSize = 'footnote', iconSize = 13, rowGap = 5, titleContentSpacer = 6, extremeTopSpacer = 5;

    if (rowCount <= 4) {
      fontSize = 'body'; iconSize = 17; rowGap = 10; titleContentSpacer = 10; extremeTopSpacer = 12;
    } else if (rowCount === 5) {
      fontSize = 'body'; iconSize = 17; rowGap = 7; titleContentSpacer = 8; extremeTopSpacer = 10;
    } else if (rowCount === 6) {
      fontSize = 'subheadline'; iconSize = 15; rowGap = 5; titleContentSpacer = 6; extremeTopSpacer = 8;
    }

    const rowElements = rows.map(r => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 8,
      children: [
        { type: 'image', src: `sf-symbol:${r.icon}`, color: r.color, width: iconSize, height: iconSize },
        { 
          type: 'text', text: r.text, 
          font: { size: fontSize, weight: 'medium' }, 
          textColor: '#F5F5F7', maxLines: 1, minScale: 0.45 
        }
      ]
    }));

    const isWifi = !!wifiSsid;
    const topIconName = isWifi ? 'sf-symbol:wifi' : 'sf-symbol:antenna.radiowaves.left.and.right';

    return {
      type: 'widget',
      padding: 16,
      backgroundGradient: {
        type: 'linear', colors: ['#8E261E', '#4D0F0A'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
      },
      children: [
        { type: 'spacer', length: extremeTopSpacer },
        {
          type: 'stack', direction: 'row', alignItems: 'center', gap: 8,
          children: [
            { type: 'image', src: topIconName, color: '#FFFFFF', width: 18, height: 18 },
            { 
              type: 'text', text: title, 
              font: { size: 'headline', weight: 'bold' }, 
              textColor: '#FFFFFF', maxLines: 1, minScale: 0.8
            }
          ]
        },
        { type: 'spacer', length: titleContentSpacer },
        { type: 'stack', direction: 'column', alignItems: 'start', gap: rowGap, children: rowElements },
        { type: 'spacer' }
      ]
    };

  } catch (err) {
    return {
      type: 'widget', padding: 16,
      backgroundGradient: { type: 'linear', colors: ['#8E261E', '#4D0F0A'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [{ type: 'text', text: '加载失败，请检查网络', font: { size: 'subheadline' }, textColor: '#F5F5F7' }]
    };
  }
}
