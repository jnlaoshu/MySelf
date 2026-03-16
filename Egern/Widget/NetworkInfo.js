/**
 * ==========================================
 * 📌 代码名称: 🌐 实时网络信息面板
 * ✨ 特色功能: 智能聚合内网、本地、节点 IP 与地理位置；集成 IPPure 纯净度检测及防欺诈风险评估；动态识别无线局域网与蜂窝网络；极致微缩的紧凑左对齐流式排版，全面支持深浅模式。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.17 00.08
 * ==========================================
 */

export default async function(ctx) {
  const BG_COLORS = [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }]; 
  const TEXT_MAIN = { light: '#1C1C1E', dark: '#FFFFFF' };
  const TEXT_SUB = { light: '#48484A', dark: '#D1D1D6' }; 
  const TEXT_MUTED = { light: '#8E8E93', dark: '#8E8E93' }; 

  const COLOR_FEICUI = { light: '#2E8045', dark: '#32D74B' }; 
  const COLOR_ZHUSHA = { light: '#CA3B32', dark: '#FF453A' }; 
  const COLOR_JINGTAI= { light: '#3A5F85', dark: '#5E8EB8' }; 
  const COLOR_LIULI  = { light: '#B58A28', dark: '#D6A53A' }; 
  const COLOR_ZITENG = { light: '#6B4C9A', dark: '#8B6AA8' }; 
  const COLOR_DAI    = { light: '#628C7B', dark: '#73A491' }; 

  const http = {
    get: async (url) => {
      try {
        const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 });
        const text = await resp.text();
        return JSON.parse(text).data || JSON.parse(text); 
      } catch (e) { return {}; }
    }
  };

  const fmtISP = (isp) => {
    if (!isp) return "未知";
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
      d.ipv4?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio
    ];

    const [localInfo, nodeInfo, pureInfo] = await Promise.all([
      http.get('https://myip.ipip.net/json').catch(() => ({})), 
      http.get('http://ip-api.com/json/?lang=zh-CN').catch(() => ({})),
      http.get('https://my.ippure.com/v1/info').catch(() => ({}))
    ]);

    let rawISP = (Array.isArray(localInfo.location) ? localInfo.location[localInfo.location.length - 1] : "") || nodeInfo?.isp || nodeInfo?.org; 
    let mainTitle = `${fmtISP(rawISP)} · ${wifiSsid || getRadioType(cellularRadio) || "未连接"}`;
    const isWifi = !!wifiSsid;

    let r1Content = internalIP || "未连接";
    if (gatewayIP && gatewayIP !== internalIP) r1Content += ` / ${gatewayIP}`;

    let r2Content = localInfo.ip || "获取中...";
    const locStr = Array.isArray(localInfo.location) ? localInfo.location.slice(0, 3).join('').trim() : '';
    if (locStr) r2Content += ` / ${locStr}`;

    const nodeIP = nodeInfo.query || nodeInfo.ip || "获取中...";
    let r3Content = nodeIP;
    const nodeLoc = `${nodeInfo.country || ''} ${nodeInfo.city || ''}`.trim();
    if (nodeLoc) r3Content += ` / ${nodeLoc}`;

    const nativeText = pureInfo.isResidential === true ? "原生住宅" : (pureInfo.isResidential === false ? "商业机房" : "未知属性");
    const risk = pureInfo.fraudScore;
    let riskTxt = "未知风险";
    if (risk !== undefined) {
      if (risk >= 80) riskTxt = `极高危(${risk})`;
      else if (risk >= 70) riskTxt = `高危(${risk})`;
      else if (risk >= 40) riskTxt = `中危(${risk})`;
      else riskTxt = `低危纯净(${risk})`;
    }
    const r4Content = `${nativeText} / ${riskTxt}`;

    const buildRow = (icon, color, label, content) => ({
      type: 'stack', direction: 'row', alignItems: 'start', gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color: color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 13, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'text', text: content, font: { size: 13, weight: 'medium' }, textColor: TEXT_SUB, maxLines: 2, width: 236 }
      ]
    });

    return {
      type: 'widget', 
      padding: 12, 
      backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
            { type: 'image', src: isWifi ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'), color: TEXT_MAIN, width: 16, height: 16 },
            { type: 'text', text: mainTitle, font: { size: 15, weight: 'heavy' }, textColor: TEXT_MAIN, maxLines: 1, minScale: 0.7 },
            { type: 'spacer' },
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 3, children: [
                { type: 'image', src: `sf-symbol:sparkles`, color: COLOR_LIULI, width: 10, height: 10 },
                { type: 'text', text: isWifi ? '无线局域网' : '蜂窝网络', font: { size: 12, weight: 'bold' }, textColor: TEXT_MUTED }
            ]}
        ]},
        
        { type: 'spacer', length: 12 }, 

        { type: 'stack', direction: 'column', alignItems: 'start', gap: 10, children: [
            buildRow('house.fill', COLOR_FEICUI, '内网', r1Content),
            buildRow('location.circle.fill', COLOR_JINGTAI, '本地', r2Content),
            buildRow('network', COLOR_ZITENG, '节点', r3Content),
            buildRow('shield.lefthalf.filled', COLOR_DAI, '属性', r4Content)
        ]},
        
        { type: 'spacer' } 
      ]
    };
  } catch (err) {
    return { type: 'widget', padding: 12, backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 } }, children: [{ type: 'text', text: '刷新中...', textColor: TEXT_MUTED }] };
  }
}