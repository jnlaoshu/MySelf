/**
 * ==========================================
 * 📌 代码名称: 🌐 实时网络信息面板
 * ✨ 主要功能: 实时侦测内网、本地与节点 IP 及详尽地理位置；解析 ASN 与防欺诈风险评分；动态测算 Ping 延迟并进行状态警示；智能映射国旗 Emoji；识别网络代际状态及当前运营商，支持点击唤起对应营业厅 App；采用原生弹性布局 (Flex)，适配系统深浅色模式。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.18 10:30
 * ==========================================
 */

export default async function(ctx) {
  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    gold: { light: '#B58A28', dark: '#D6A53A' },     
    red: { light: '#CA3B32', dark: '#FF453A' },      
    teal: { light: '#2E8045', dark: '#32D74B' },     
    blue: { light: '#3A5F85', dark: '#5E8EB8' },     
    purple: { light: '#6B4C9A', dark: '#8B6AA8' },   
    cyan: { light: '#628C7B', dark: '#73A491' }      
  };

  const httpGet = async (url) => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 });
      const text = await resp.text();
      const json = JSON.parse(text);
      return { data: json.data || json, ping: Date.now() - start }; 
    } catch (e) { return { data: {}, ping: 0 }; }
  };

  const getFlagEmoji = (cc) => {
    if (!cc) return "";
    const str = String(cc).toUpperCase();
    if (!/^[A-Z]{2}$/.test(str)) return "";
    return String.fromCodePoint(...[...str].map(c => 127397 + c.charCodeAt(0)));
  };

  const fmtISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    const raw = String(isp).replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
    if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
    if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
    if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
    if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s)) return "中国广电";
    return raw || "未知";
  };

  try {
    const d = ctx.device || {};
    const [internalIP, gatewayIP, wifiSsid, cellularRadio] = [d.ipv4?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio];

    const [localResp, nodeResp, pureResp] = await Promise.all([
      httpGet('https://myip.ipip.net/json'), 
      httpGet('http://ip-api.com/json/?lang=zh-CN'),
      httpGet('https://my.ippure.com/v1/info')
    ]);

    const { data: local, ping: localPing } = localResp;
    const { data: node, ping: nodePing } = nodeResp;
    const pure = pureResp.data || {}; 

    const pingMs = nodePing || localPing || 0;
    const pingColor = pingMs === 0 ? C.muted : (pingMs < 100 ? C.teal : (pingMs < 200 ? C.gold : C.red));

    const rawISP = (Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node?.isp || node?.org;
    const currentISP = fmtISP(rawISP);
    
    const rawRadio = cellularRadio ? String(cellularRadio).toUpperCase().trim() : "";
    const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[rawRadio] || rawRadio;
    const jumpUrl = { "中国移动": "leadeon://", "中国电信": "ctclient://", "中国联通": "chinaunicom://" }[currentISP] || "";

    const r1Content = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean).join(" / ");
    const locStr = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
    const r2Content = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");
    const nodeLoc = [getFlagEmoji(node.countryCode), node.country, node.city].filter(Boolean).join(" ");
    const asnStr = node.as ? String(node.as).split(' ')[0] : "";
    const r3Content = [node.query || node.ip || "获取中...", nodeLoc, asnStr].filter(Boolean).join(" / ");

    const risk = pure.fraudScore;
    const riskTxt = risk === undefined ? "未知风险" : (risk >= 80 ? `极高危(${risk})` : risk >= 70 ? `高危(${risk})` : risk >= 40 ? `中危(${risk})` : `低危(${risk})`);
    const nativeText = pure.isResidential === true ? "原生住宅" : (pure.isResidential === false ? "商业机房" : "未知属性");
    const r4Content = `${nativeText} / ${riskTxt}`;

    const buildRow = (icon, color, label, content) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 45, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'text', text: content, font: { size: 12, weight: 'medium' }, textColor: C.sub, maxLines: 1, flex: 1 }
      ]
    });

    const widgetConfig = {
      type: 'widget', padding: 12, 
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
            { type: 'image', src: wifiSsid ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'), color: C.main, width: 16, height: 16 },
            { type: 'text', text: `${currentISP} · ${wifiSsid || radioType || "未连接"}`, font: { size: 15, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.7 },
            { type: 'spacer' },
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
                { type: 'image', src: 'sf-symbol:timer', color: pingColor, width: 12, height: 12 },
                { type: 'text', text: pingMs > 0 ? `${pingMs}` : "--", font: { size: 12, weight: 'bold' }, textColor: pingColor },
                { type: 'text', text: 'ms', font: { size: 12, weight: 'medium' }, textColor: pingColor }
            ]}
        ]},
        { type: 'spacer', length: 8 }, 
        { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, children: [
            buildRow('house.fill', C.teal, '内网', r1Content),
            buildRow('location.circle.fill', C.blue, '本地', r2Content),
            buildRow('network', C.purple, '节点', r3Content),
            buildRow('shield.lefthalf.filled', C.cyan, '属性', r4Content)
        ]},
        { type: 'spacer' } 
      ]
    };
    
    if (jumpUrl) widgetConfig.url = jumpUrl;
    return widgetConfig;

  } catch (err) {
    return {
      type: 'widget', padding: 12, 
      backgroundGradient: { type: 'linear', colors: [{light:'#FFFFFF',dark:'#1C1C1E'}, {light:'#F5F5F9',dark:'#0C0C0E'}], startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 } },
      children: [
        { type: 'text', text: '小组件崩溃 ⚠️', font: { size: 14, weight: 'heavy' }, textColor: '#FF453A' },
        { type: 'spacer', length: 4 },
        { type: 'text', text: String(err.message || err), font: { size: 11 }, textColor: '#8E8E93', maxLines: 5 }
      ]
    };
  }
}
