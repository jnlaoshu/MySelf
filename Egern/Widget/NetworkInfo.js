/**
 * ==========================================
 * 📌 代码名称: 🌐 网络信息小组件
 * ✨ 特色功能: 实时显示 Wi-Fi/数据网络状态、内网与网关 IPv4 地址、双端物理位置定位，全面支持 iOS 系统深浅模式（Light/Dark）自适应切换。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026-03-15
 * ==========================================
 */

export default async function(ctx) {
  const BG_COLORS = [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F4F5F9', dark: '#000000' }];
  const TEXT_MAIN = { light: '#000000', dark: '#FFFFFF' };
  const TEXT_SUB = { light: '#3C3C43', dark: '#EBEBF5' }; 

  const http = {
    get: async (url) => {
      try {
        const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 });
        const text = await resp.text();
        return JSON.parse(text).data || JSON.parse(text); 
      } catch (e) { return {}; }
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
    const map = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" };
    return map[radio?.toUpperCase().replace(/\s+/g, "")] || radio || "";
  };

  try {
    const d = ctx.device || {};
    const [internalIP, gatewayIP, wifiSsid, cellularRadio] = [
      d.ipv4?.address, 
      d.ipv4?.gateway, 
      d.wifi?.ssid, 
      d.cellular?.radio
    ];

    const [localInfo, nodeInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json'), 
      http.get('http://ip-api.com/json/?lang=zh-CN')
    ]);

    let rawISP = (Array.isArray(localInfo.location) ? localInfo.location[localInfo.location.length - 1] : "") || nodeInfo?.isp || nodeInfo?.org; 
    let title = `${fmtISP(rawISP)} | ${wifiSsid || getRadioType(cellularRadio) || "未连接"}`;

    const rows = [];
    
    if (internalIP) rows.push({ icon: 'house.fill', color: { light: '#28CD41', dark: '#32D74B' }, text: `内网地址：${internalIP}` });
    if (gatewayIP) rows.push({ icon: 'wifi.router.fill', color: { light: '#FF3B30', dark: '#FF453A' }, text: `网关地址：${gatewayIP}` });
    
    if (localInfo.ip) {
      rows.push({ icon: 'location.circle.fill', color: { light: '#007AFF', dark: '#0A84FF' }, text: `本地地址：${localInfo.ip}` });
      const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('').trim() : '';
      if (locStr) rows.push({ icon: 'map.fill', color: { light: '#FFCC00', dark: '#FFD60A' }, text: `本地位置：${locStr}` });
    }

    const nodeIP = nodeInfo.query || nodeInfo.ip;
    if (nodeIP) {
      rows.push({ icon: 'network', color: { light: '#AF52DE', dark: '#BF5AF2' }, text: `节点地址：${nodeIP}` });
      const nodeLoc = `${nodeInfo.country || ''} ${nodeInfo.city || ''}`.trim();
      if (nodeLoc) rows.push({ icon: 'paperplane.circle.fill', color: { light: '#FF9500', dark: '#FF9F0A' }, text: `节点位置：${nodeLoc}` });
    }

    const isWifi = !!wifiSsid;
    return {
      type: 'widget', 
      padding: 12, 
      backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'spacer', length: 2 },
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
            { type: 'image', src: isWifi ? 'sf-symbol:wifi' : 'sf-symbol:antenna.radiowaves.left.and.right', color: TEXT_MAIN, width: 18, height: 18 },
            { type: 'text', text: title, font: { size: 'headline', weight: 'bold' }, textColor: TEXT_MAIN, maxLines: 1, minScale: 0.7 }
        ]},
        { type: 'spacer', length: 6 }, 
        { type: 'stack', direction: 'column', alignItems: 'start', gap: 4, children: rows.map(r => ({
            type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
              { type: 'image', src: `sf-symbol:${r.icon}`, color: r.color, width: 16, height: 16 },
              { type: 'text', text: r.text, font: { size: 'subheadline', weight: 'medium' }, textColor: TEXT_SUB, maxLines: 1, minScale: 0.5 }
            ]
        }))},
        { type: 'spacer' }
      ]
    };
  } catch (err) {
    return { 
      type: 'widget', 
      padding: 12, 
      backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 } }, 
      children: [{ type: 'text', text: '加载失败，请检查网络', font: { size: 'subheadline' }, textColor: TEXT_SUB }] 
    };
  }
}