/**
 * ==========================================
 * 🌐 网络雷达 (NetRadar) 小组件
 * 
 * ✨ 【功能概览】
 * • 三尺寸自适应独立排版：
 *   - 小号：极简美学布局。标题单行自适应防换行；底部独创极简版媒体与 AI 解锁状态（简称+国旗）。
 *   - 中号：清爽参数面板。时间指示器置顶右侧；完美拉大行间距提升呼吸感；精准呈现流媒体与 AI 解锁状况。
 *   - 大号：沉浸式卡片网格。物理级隔离布局，全量展示节点深层数据与 8 通道并发解锁探测图谱。
 * • 核心引擎：内网/本地/节点精准 IP 穿透识别（新增 IPv4 / v6 双栈标识）及节点风险/纯净评分探测。
 * • 智能解析：突破代理工具嵌套层级，精准获取节点协议；引入专属策略地图（POLICY_REGION）智能映射解锁国旗。
 * • 稳健防护：针对 Fallback 策略组深度调优 AI 并发熔断机制，显著提升 ChatGPT 探测成功率。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetRadar.js
 * ⏱️ 更新时间: 2026.08.17 04:20
 * ==========================================
 */

export default async function (ctx) {
  const widgetFamily = ctx.widgetFamily || ctx.family || (ctx.widget && ctx.widget.family) || 'large';
  const familyStr = String(widgetFamily).toLowerCase();
  const isSmall = familyStr.includes('small') || widgetFamily === 0;
  const isLarge = familyStr.includes('large') || widgetFamily === 2;
  const isMedium = !isSmall && !isLarge;

  const TIMEOUT_MS = 3000;
  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  if (isSmall || isMedium) {
    // =========================================================================
    // 🟡 小号与中号模式
    // =========================================================================
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const timeStr = `${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const C = {
      bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F4F4F7', dark: '#0C0C0E' }],
      main:        { light: '#111111', dark: '#FFFFFF' },
      sub:         { light: '#555555', dark: '#D1D1D6' },
      muted:       { light: '#8A8A8E', dark: '#8E8E93' },
      gold:        { light: '#B58A28', dark: '#D6A53A' },
      red:         { light: '#D70015', dark: '#FF453A' },
      teal:        { light: '#006A60', dark: '#32D74B' },
      blue:        { light: '#0040DD', dark: '#5E8EB8' },
      purple:      { light: '#5E2CA5', dark: '#8B6AA8' },
      cyan:        { light: '#2B7067', dark: '#73A491' },
      pingBg:      { light: '#F2F2F7', dark: '#2C2C2E' },
      proxyGreen:  { light: '#248A3D', dark: '#32D74B' },
      divider:     { light: '#E5E5EA', dark: '#38383A' },
      transparent: '#00000000'
    };

    const mkText = (text, size, weight, color, opts = {}) => {
      const { family: fontFamily, ...restOpts } = opts;
      return { type: "text", text: String(text ?? ""), font: { size, weight, ...(fontFamily ? { family: fontFamily } : {}) }, textColor: color, ...restOpts };
    };
    const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
    const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
    const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };
    const backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

    const httpGet = async (url) => {
      try {
        const start = Date.now();
        const resp = await ctx.http.get(url, { headers: commonHeaders, timeout: 3500 });
        const text = await resp.text();
        const json = JSON.parse(text);
        return { data: json.data || json, ping: Date.now() - start };
      } catch (e) { return { data: {}, ping: 0 }; }
    };

    async function timed(fn, timeoutMs = 3500) {
      const start = Date.now();
      try {
        const result = await Promise.race([
          fn(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
        ]);
        return { ...result, ms: Date.now() - start };
      } catch { return { code: 'ERR', ms: 0 }; }
    }

    async function checkYouTube() { const res = await ctx.http.get(`https://www.youtube.com/generate_204`, { timeout: 3500, headers: commonHeaders }).catch(() => null); return { code: res?.status === 204 ? 'OK' : 'ERR' }; }
    async function checkNetflix() { const res = await ctx.http.get(`https://www.netflix.com/generate_204`, { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res?.status === 204 || res?.status === 200) ? 'OK' : 'ERR' }; }
    async function checkDisney() { const res = await ctx.http.get(`https://www.disneyplus.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && res.status !== 403) ? 'OK' : 'ERR' }; }
    async function checkSpotify() { const res = await ctx.http.get(`https://open.spotify.com/`, { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
    async function checkChatGPT() { const res = await ctx.http.get(`https://chatgpt.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && (res.status === 200 || res.status === 302 || res.status === 401 || res.status === 404)) ? 'OK' : 'ERR' }; }
    async function checkClaude() { const res = await ctx.http.get(`https://api.anthropic.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && (res.status === 404 || res.status === 401 || res.status === 200)) ? 'OK' : 'ERR' }; }
    async function checkGemini() { const res = await ctx.http.get(`https://generativelanguage.googleapis.com/v1beta/models`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res ? 'OK' : 'ERR' }; }
    async function checkGrok() { const res = await ctx.http.get(`https://grok.com/`, { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }

    const getFlagEmoji = (cc) => {
      if (!cc || cc === '--' || cc === 'XX') return "";
      const str = String(cc).toUpperCase();
      if (!/^[A-Z]{2}$/.test(str)) return "";
      return String.fromCodePoint(...[...str].map(c => 127397 + c.charCodeAt(0)));
    };

    const fmtISP = (isp) => {
      if (!isp) return "未知";
      const s = String(isp).toLowerCase();
      const raw = String(isp).replace(/\s*[\(\（]中国[\)\）]\s*/, "").replace(/\s+/g, " ").trim();
      if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
      if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s))  return "中国电信";
      if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
      if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s))             return "中国广电";
      return raw || "未知";
    };

    const getProxyProtocol = () => {
      try {
        const p = ctx.proxy;
        if (!p) return "";
        const proto = p.protocol || p.type || p.proxyType || "";
        const map = { "shadowsocks": "SS", "ss": "SS", "vmess": "VMess", "vless": "VLESS", "trojan": "Trojan", "hysteria": "Hysteria", "hysteria2": "Hysteria2","tuic": "TUIC", "wireguard": "WireGuard", "http": "HTTP", "https": "HTTPS", "socks5": "SOCKS5", "anytls": "AnyTLS" };
        return map[String(proto).toLowerCase()] || String(proto).toUpperCase();
      } catch (e) { return ""; }
    };

    try {
      const d = ctx.device || {};
      const [internalIP, internalIPv6, gatewayIP, wifiSsid, cellularRadio] = [
        d.ipv4?.address, d.ipv6?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio
      ];

      const [localResp, nodeResp, pureResp, ipv6Resp] = await Promise.all([
        httpGet('https://myip.ipip.net/json'),
        httpGet(`http://ip-api.com/json/?lang=zh-CN&_t=${Date.now()}`),
        httpGet('https://my.ippure.com/v1/info'),
        httpGet('https://api64.ipify.org?format=json')
      ]);

      let yt, nf, dp, sp, gpt, cl, gm, gk;
      if (isMedium || isSmall) {
        [yt, nf, dp, sp, gpt, cl, gm, gk] = await Promise.all([
          timed(checkYouTube, 3500), timed(checkNetflix, 3500), timed(checkDisney, 4500), timed(checkSpotify, 3500),
          timed(checkChatGPT, 4500), timed(checkClaude, 4500), timed(checkGemini, 4500), timed(checkGrok, 3500)
        ]);
      }

      const { data: local, ping: localPing } = localResp;
      const { data: node,  ping: nodePing  } = nodeResp;

      const publicIPv6Raw = ipv6Resp.data?.ip || '';
      const publicIPv6    = publicIPv6Raw.includes(':') ? publicIPv6Raw : '';
      const hasLocalIPv6  = !!internalIPv6;
      const currentIpType = (hasLocalIPv6 || publicIPv6) ? 'v4 / v6' : 'IPv4';

      const proxyProtocol = getProxyProtocol();
      const hasProxy      = !!proxyProtocol;

      const locColor = localPing === 0 ? C.muted : (localPing < 60  ? C.teal : localPing < 150 ? C.gold : C.red);
      const nodColor = nodePing  === 0 ? C.muted : (nodePing  < 150 ? C.teal : nodePing  < 300 ? C.gold : C.red);

      const rawISP     = (Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node?.isp || node?.org;
      const currentISP = fmtISP(rawISP);

      const rawRadio  = cellularRadio ? String(cellularRadio).toUpperCase().trim() : "";
      const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[rawRadio] || rawRadio;
      const jumpUrl   = { "中国移动": "leadeon://", "中国电信": "ctclient://", "中国联通": "chinaunicom://" }[currentISP] || "";

      const localCountryRaw = Array.isArray(local.location) ? (local.location[0] || "") : "";
      const nodeCountryCode = (node.countryCode || "").toUpperCase();
      const isDnsLeak  = hasProxy && (localCountryRaw.includes("中国") || localCountryRaw.includes("China")) && nodeCountryCode === "CN";
      const leakLabel  = isDnsLeak ? "⚠️ 泄漏" : "";

      const r1Parts = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean);
      r1Parts.push(`[${currentIpType}]`); 
      const r1Content = r1Parts.join(" / ");

      const locStr    = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
      const r2Content = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");

      const nodeLoc   = [getFlagEmoji(nodeCountryCode), node.country, node.city].filter(Boolean).join(" ");
      const asnStr    = node.as ? String(node.as).split(' ')[0] : "";
      const r3Content = [node.query || node.ip || "获取中...", nodeLoc, asnStr, proxyProtocol].filter(Boolean).join(" / ");

      const POLICY_REGION = {
        'YouTube': 'HK', 'Netflix': 'SG', 'Disney+': 'SG', 'Spotify': 'US',
        'ChatGPT': 'US', 'Claude':  'US', 'Gemini':  'US', 'Grok':    'US'
      };

      const uf = (res, name) => {
        if (res && res.code !== 'ERR') {
          const finalRegion = POLICY_REGION[name] || nodeCountryCode || 'XX';
          return getFlagEmoji(finalRegion) || '🇺🇸';
        }
        return '🚫';
      };

      if (isSmall) {
        const r1Line2       = [gatewayIP !== internalIP ? gatewayIP : null, `[${currentIpType}]`].filter(Boolean).join(" ");
        const r2SmallContent = local.ip || "获取中...";
        const r3SmallContent = [node.query || node.ip || "获取中...", proxyProtocol].filter(Boolean).join(" / ");

        const smallRows = [];
        const pushSmallRow = (icon, color, content) => smallRows.push(
          mkRow([
            icon ? mkIcon(icon, color, 11) : mkSpacer(11),
            mkText(content, 11, "medium", C.sub, { maxLines: 1, flex: 1, minScale: 0.45 })
          ], 5)
        );

        pushSmallRow('house.fill',             C.teal,   internalIP || "未连接");
        if (r1Line2) pushSmallRow(null, null, r1Line2);
        pushSmallRow('location.circle.fill',   C.
