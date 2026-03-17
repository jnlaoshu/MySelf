/**
 * ==========================================
 * 📌 代码名称: 🌐 实时网络信息面板
 * ✨ 特色功能: 实时侦测内网、本地与节点 IP 及详尽地理位置；集成 IP 纯净度检测、防欺诈风险评分与 ASN (自治系统编号) 深度解析；动态测算网络请求延迟（Ping）并进行状态分级警示；智能提取地区代码并映射国旗 Emoji；自动识别 Wi-Fi / 蜂窝网络代际状态；精准匹配当前运营商，并支持点击面板一键唤起官方营业厅 App（已适配移动、电信、联通）；底层采用高容错并发请求与数组滤空拼接算法，拒绝空值报错；全系适配深浅色模式。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.18 00:23
 * ==========================================
 */

export default async function(ctx) {
  // ===================== 1. 家族式色彩引擎 =====================
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

  // ===================== 2. 核心通信与解析包 =====================
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
    if (!/^[a-zA-Z]{2}$/.test(cc || "")) return "";
    return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 127397 + c.charCodeAt()));
  };

  const fmtISP = (isp = "") => {
    const s = isp.toLowerCase();
    const raw = isp.replace(/\s*\(中国\)\s*/, "").replace(/\s+/g, " ").trim();
    if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
    if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
    if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
    if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s)) return "中国广电";
    return raw || "未知";
  };

  // ===================== 3. 数据探针与核心逻辑 =====================
  try {
    const d = ctx.device || {};
    const [internalIP, gatewayIP, wifiSsid, cellularRadio] = [d.ipv4?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio];

    // 并发请求，榨干网络性能
    const [localResp, nodeResp, pureResp] = await Promise.all([
      httpGet('https://myip.ipip.net/json'), 
      httpGet('http://ip-api.com/json/?lang=zh-CN'),
      httpGet('https://my.ippure.com/v1/info')
    ]);

    const { data: local, ping: localPing } = localResp;
    const { data: node, ping: nodePing } = nodeResp;
    const pure = pureResp.data;

    // Ping 值探测与颜色降维
    const pingMs = nodePing || localPing || 0;
    const pingColor = pingMs === 0 ? C.muted : (pingMs < 100 ? C.teal : (pingMs < 200 ? C.gold : C.red));

    // 运营商识别与 App URL Scheme 映射
    const currentISP = fmtISP((Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node?.isp || node?.org);
    const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[cellularRadio?.toUpperCase().trim()] || cellularRadio || "";
    const jumpUrl = { "中国移动": "leadeon://", "中国电信": "ctclient://", "中国联通": "chinaunicom://" }[currentISP] || "";

    // 结构化拼接输出（滤除空值，拒绝 undefiend 污染）
    const r1Content = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean).join(" / ");
    const locStr = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
    const r2Content = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");
    const nodeLoc = [getFlagEmoji(node.countryCode), node.country, node.city].filter(Boolean).join(" ");
    const r3Content = [node.query || node.ip || "获取中...", nodeLoc, node.as?.split(' ')[0]].filter(Boolean).join(" / ");

    // 风险评测逻辑
    const risk = pure.fraudScore;
    const riskTxt = risk === undefined ? "未知风险" : (risk >= 80 ? `极高危(${risk})` : risk >= 70 ? `高危(${risk})` : risk >= 40 ? `中危(${risk})` : `低危(${risk})`);
    const r4Content = `${pure.isResidential === true ? "原生住宅" : (pure.isResidential === false ? "商业机房" : "未知属性")} / ${riskTxt}`;

    // ===================== 4. 视觉渲染引擎 =====================
    const buildRow = (icon, color, label, content) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 45, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'text', text: content, font: { size: 12, weight: 'medium' }, textColor: C.sub, maxLines: 1, width: 320 }
      ]
    });

    const widget = {
      type: 'widget', padding: 12, 
      ...(jumpUrl && { url: jumpUrl }),
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'spacer', length: 6 }, 
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
    return widget;

  } catch (err) {
    return { type: 'widget', padding: 12, backgroundGradient: { type: 'linear', colors: [{light:'#FFF',dark:'#1C1C1E'},{light:'#F5F5F9',dark:'#0C0C0E'}], startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 } }, children: [{ type: 'text', text: '网络探测异常', textColor: {light:'#8E8E93',dark:'#8E8E93'} }] };
  }
}
