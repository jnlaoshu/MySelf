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
 * ⏱️ 更新时间: 2026.07.18 14:30
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
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

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
    async function checkGemini() { const res = await ctx.http.get(`https://gemini.google.com/app`, { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
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
          timed(checkChatGPT, 4500), timed(checkClaude, 4500), timed(checkGemini, 3500), timed(checkGrok, 3500)
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
        pushSmallRow('location.circle.fill',   C.blue,   r2SmallContent);
        pushSmallRow('network',                C.purple,  r3SmallContent);
        
        pushSmallRow('play.tv.fill', C.blue, `YT ${uf(yt, 'YouTube')} NF ${uf(nf, 'Netflix')} DP ${uf(dp, 'Disney+')} SP ${uf(sp, 'Spotify')}`);
        pushSmallRow('cpu', C.purple, `GPT ${uf(gpt, 'ChatGPT')} CL ${uf(cl, 'Claude')} GM ${uf(gm, 'Gemini')} GK ${uf(gk, 'Grok')}`);

        const smallTitleStr = currentISP ? `${currentISP} · ${wifiSsid || radioType || "未连接"}` : (wifiSsid || radioType || "未连接");

        return {
          type: 'widget', padding: 14, url: jumpUrl || undefined, backgroundGradient,
          children: [
            mkRow([
              mkIcon(wifiSsid ? 'wifi' : 'antenna.radiowaves.left.and.right', C.main, 14),
              mkSpacer(6),
              mkText(smallTitleStr, 13, "heavy", C.main, { maxLines: 1, minScale: 0.5, flex: 1 }),
              ...(hasProxy ? [mkSpacer(4), mkIcon('shield.lefthalf.filled', C.proxyGreen, 12)] : [])
            ], 0),
            mkSpacer(6),
            { type: 'stack', direction: 'column', alignItems: 'start', gap: 2, flex: 1, children: smallRows }
          ]
        };
      }

      const layout = { fz: 12, icz: 13, lw: 52, titleFz: 15, titleIcz: 16, pingFz: 10, gap: 11, padding: 12, spacerTop: 12 };

      const buildHeader = () => mkRow([
        mkIcon(wifiSsid ? 'wifi' : (cellularRadio ? 'antenna.radiowaves.left.and.right' : 'wifi.slash'), C.main, layout.titleIcz),
        mkText(`${currentISP} · ${wifiSsid || radioType || "未连接"}`, layout.titleFz, "heavy", C.main, { maxLines: 1, minScale: 0.6, flex: 1 }),
        ...(leakLabel ? [mkText(leakLabel, layout.pingFz, "bold", C.red)] : []),
        ...(hasProxy  ? [mkIcon('shield.lefthalf.filled', C.proxyGreen, layout.titleIcz - 3)] : []),
        mkRow([
          mkRow([ mkIcon('mappin.circle.fill', locColor, layout.pingFz), mkText(localPing > 0 ? `${localPing}` : "-", layout.pingFz, "bold", locColor, { family: 'Menlo' }) ], 2),
          mkText('|', layout.pingFz, "light", C.muted),
          mkRow([ mkIcon('globe.fill', nodColor, layout.pingFz), mkText(nodePing > 0 ? `${nodePing}` : "-", layout.pingFz, "bold", nodColor, { family: 'Menlo' }) ], 2)
        ], 4, { padding: [3, 6], borderRadius: 6, backgroundColor: C.pingBg }),
        mkSpacer(4),
        mkRow([ mkIcon('clock', C.muted, 10), mkText(timeStr, 10, "bold", C.muted, { family: 'Menlo' }) ], 2)
      ], 4);

      const buildContentRow = (icon, color, label, content, contentColor = C.sub) => mkRow([
        mkRow([ mkIcon(icon, color, layout.icz), mkText(label, layout.fz, "heavy", color) ], 2, { width: layout.lw }),
        mkText(content, layout.fz, "medium", contentColor, { maxLines: 1, minScale: 0.4, flex: 1 })
      ], 4);

      return {
        type: 'widget', padding: layout.padding, url: jumpUrl || undefined, backgroundGradient,
        children: [
          buildHeader(), mkSpacer(layout.spacerTop),
          { type: 'stack', direction: 'column', alignItems: 'start', gap: layout.gap, flex: 1, children: [
            buildContentRow('house.fill',           C.teal,   '内网', r1Content),
            buildContentRow('location.circle.fill', C.blue,   '本地', r2Content),
            buildContentRow('network',              C.cyan,   '节点', r3Content, isDnsLeak ? C.red : C.sub),
            buildContentRow('play.tv.fill',         C.blue,   '媒体', `YouTube ${uf(yt, 'YouTube')}  Netflix ${uf(nf, 'Netflix')}  Disney+ ${uf(dp, 'Disney+')}  Spotify ${uf(sp, 'Spotify')}`),
            buildContentRow('cpu',                  C.purple, 'AIGC',   `ChatGPT ${uf(gpt, 'ChatGPT')}  Claude ${uf(cl, 'Claude')}  Gemini ${uf(gm, 'Gemini')}  Grok ${uf(gk, 'Grok')}`)
          ]}
        ]
      };
    } catch (err) {
      return {
        type: 'widget', padding: 12, backgroundGradient,
        children: [
          mkText('网络面板崩溃或超时 ⚠️', 14, "heavy", C.red), mkSpacer(4),
          mkText(String(err.message || err), 11, "medium", C.muted, { maxLines: 5 }), mkSpacer(),
          mkRow([ mkSpacer(), mkIcon('clock', C.muted, 10), mkSpacer(4), mkText(timeStr, 9, "bold", C.muted, { family: 'Menlo' }) ])
        ]
      };
    }

  } else {
    // =========================================================================
    // 🔴 大号模式
    // =========================================================================
    
    const getFlagEmoji = (cc) => {
      if (!cc || cc === 'XX' || cc === '--' || cc === 'CN') return '🇨🇳';
      return cc.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    };

    const fmtISP = (isp) => {
      if (!isp) return "";
      const s = String(isp).toLowerCase();
      if (s.includes('--') || s === '未知' || s === 'unknown') return "";
      const raw = String(isp).replace(/\s*[\(\（]中国[\)\）]\s*/, "").replace(/\s+/g, " ").trim();
      if (/(^|[\s-])(cmcc|cmnet|cmi|mobile)\b|移动/.test(s)) return "中国移动";
      if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s))  return "中国电信";
      if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
      if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s))             return "中国广电";
      return raw;
    };

    const parseProxyMode = (context) => {
      let mode = "Rule";
      try {
        if (!context) return mode;
        const p = context.proxy || context.node || context.policy || context.outbound || context.egern;
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object') return p.name || p.title || p.remark || p.policy || "Rule";
      } catch (e) {}
      return mode;
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const C = {
      bg: { light: '#F9F9FB', dark: '#0A0C10' },
      cardBg: { light: '#FFFFFF', dark: '#12151D' },
      cardBorder: { light: '#E8E8ED', dark: '#1F2430' },
      textMain: { light: '#111111', dark: '#FFFFFF' },
      textSub: { light: '#7C7C80', dark: '#8B949E' },
      blue: { light: '#0066FF', dark: '#58A6FF' },
      green: { light: '#248A3D', dark: '#3FB950' },
      purple: { light: '#8C32E6', dark: '#BC8CFF' },
      red: { light: '#E3241B', dark: '#F85149' },
      warn: { light: '#E87D00', dark: '#F5A623' },
      badgeBg: { light: '#F0F0F4', dark: '#1C212B' },
      greenBadge: { light: '#E8F5E9', dark: '#1A3320' }
    };

    const isDarkMode = ctx.device?.isDarkMode || false;

    const httpGet = async (url) => {
      const start = Date.now();
      try {
        const resp = await ctx.http.get(url, { headers: commonHeaders, timeout: TIMEOUT_MS });
        const text = await resp.text();
        const json = JSON.parse(text);
        return { data: json.data || json, ping: Date.now() - start };
      } catch (e) { return { data: {}, ping: 0 }; }
    };

    async function timed(fn, timeoutMs = TIMEOUT_MS) {
      const start = Date.now();
      try {
        const result = await Promise.race([ fn(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)) ]);
        return { ...result, ms: Date.now() - start };
      } catch { return { code: 'ERR', ms: 0 }; }
    }

    async function checkYouTube() { const res = await ctx.http.get(`https://www.youtube.com/generate_204`, { timeout: TIMEOUT_MS, headers: commonHeaders }).catch(() => null); return { code: res?.status === 204 ? 'OK' : 'ERR' }; }
    async function checkNetflix() { const res = await ctx.http.get(`https://www.netflix.com/generate_204`, { timeout: TIMEOUT_MS, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res?.status === 204 || res?.status === 200) ? 'OK' : 'ERR' }; }
    async function checkDisney() { const res = await ctx.http.get(`https://www.disneyplus.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && res.status !== 403) ? 'OK' : 'ERR' }; }
    async function checkSpotify() { const res = await ctx.http.get(`https://open.spotify.com/`, { timeout: TIMEOUT_MS, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
    async function checkChatGPT() { const res = await ctx.http.get(`https://chatgpt.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && (res.status === 200 || res.status === 302 || res.status === 401 || res.status === 404)) ? 'OK' : 'ERR' }; }
    async function checkClaude() { const res = await ctx.http.get(`https://api.anthropic.com/`, { timeout: 4500, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && (res.status === 404 || res.status === 401 || res.status === 200)) ? 'OK' : 'ERR' }; }
    async function checkGemini() { const res = await ctx.http.get(`https://gemini.google.com/app`, { timeout: TIMEOUT_MS, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
    async function checkGrok() { const res = await ctx.http.get(`https://grok.com/`, { timeout: TIMEOUT_MS, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }

    const d = ctx.device || {};
    const localIP = d.ipv4?.address || "127.0.0.1";
    const gatewayIP = d.ipv4?.gateway || "192.168.1.1";
    const wifiSsid = d.wifi?.ssid;
    const cellularRadio = d.cellular?.radio;
    const hasLocalIPv6 = !!d.ipv6?.address;
    const currentPolicy = parseProxyMode(ctx); 

    const [
      localInfo, nodeInfo, pureInfo, ipv6Resp,
      youtube, netflix, disney, spotify, chatgpt, claude, gemini, grok
    ] = await Promise.all([
      httpGet('https://myip.ipip.net/json'),
      httpGet(`http://ip-api.com/json/?lang=zh-CN&_t=${Date.now()}`),
      httpGet('https://my.ippure.com/v1/info'),
      httpGet('https://api64.ipify.org?format=json'),
      timed(checkYouTube, TIMEOUT_MS), timed(checkNetflix, TIMEOUT_MS), timed(checkDisney, 4500), timed(checkSpotify, TIMEOUT_MS),
      timed(checkChatGPT, 4500), timed(checkClaude, 4500), timed(checkGemini, TIMEOUT_MS), timed(checkGrok, TIMEOUT_MS)
    ]);

    const local = localInfo.data || {};
    const node = nodeInfo.data || {};
    
    const proxyIP = node.query || "未知 IP"; 
    const cc = (node.countryCode || "US").toUpperCase();
    const nodeIsp = node.isp || node.org || "未知ISP";
    
    const riskScore = pureInfo.data?.fraudScore || 0;
    const pureScore = 100 - riskScore;
    const resolveThemeColor = (colorObj) => isDarkMode ? colorObj.dark : colorObj.light;
    const activePureColorHex = pureScore >= 80 ? resolveThemeColor(C.green) : (pureScore >= 50 ? resolveThemeColor(C.warn) : resolveThemeColor(C.red));
    
    const isResidential = pureInfo.data?.isResidential;
    const residentialColorHex = isResidential ? resolveThemeColor(C.green) : resolveThemeColor(C.red);
    const asnStr = node.as ? String(node.as).split(' ')[0] : "未知"; 
    const publicIPv6 = ipv6Resp.data?.ip?.includes(':') ? ipv6Resp.data.ip : '';
    const currentIpType = (hasLocalIPv6 || publicIPv6) ? 'v4 / v6' : 'IPv4';
    const locArr = Array.isArray(local.location) ? local.location : [];
    
    let sysCarrier = d.cellular?.carrier || "";
    if (sysCarrier && (sysCarrier.toLowerCase() === 'unknown' || sysCarrier.includes('--') || sysCarrier === '未知')) sysCarrier = "";
    
    let apiISP = (locArr.length > 0 ? locArr[locArr.length - 1] : "") || "";
    if (apiISP && (apiISP.toLowerCase() === 'unknown' || apiISP.includes('--') || apiISP === '未知')) apiISP = "";
    
    const rawISP = wifiSsid ? (apiISP || sysCarrier) : (sysCarrier || apiISP);
    const currentISP = fmtISP(rawISP);
    const ispPrefix = currentISP ? `${currentISP} · ` : ""; 

    let exactLocation = "未知";
    if (locArr.length > 0) {
      let prov = locArr[1] || ""; let city = locArr[2] || "";
      exactLocation = (prov || city) ? (prov === city ? prov : (prov + city)) : (locArr[0] || "中国");
    }
    
    const rawRadio  = cellularRadio ? String(cellularRadio).toUpperCase().trim() : "";
    const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[rawRadio] || rawRadio;
    
    const netIconName = wifiSsid ? 'wifi.circle.fill' : (cellularRadio ? 'antenna.radiowaves.left.and.right' : 'wifi.slash');
    const netTitle = wifiSsid ? `${ispPrefix}${wifiSsid}` : (radioType ? `${ispPrefix}${radioType}` : "未连接");

    const POLICY_REGION = {
      'YouTube': 'HK', 'Netflix': 'SG', 'Disney+': 'SG', 'Spotify': 'US',
      'ChatGPT': 'US', 'Claude':  'US', 'Gemini':  'US', 'Grok':    'US'
    };

    const resultInfo = (result, name) => {
      const available = result.code !== 'ERR';
      const finalRegion = POLICY_REGION[name] || cc || 'XX';
      return { available, region: available ? finalRegion : '--', ms: result.ms || 0 };
    };

    const allServices = [
      { name: 'YouTube', info: resultInfo(youtube, 'YouTube') }, { name: 'Netflix', info: resultInfo(netflix, 'Netflix') },
      { name: 'Disney+', info: resultInfo(disney, 'Disney+') }, { name: 'Spotify', info: resultInfo(spotify, 'Spotify') },
      { name: 'ChatGPT', info: resultInfo(chatgpt, 'ChatGPT') }, { name: 'Claude',  info: resultInfo(claude, 'Claude') },
      { name: 'Gemini',  info: resultInfo(gemini, 'Gemini') }, { name: 'Grok',    info: resultInfo(grok, 'Grok') }
    ];

    const mkRow = (children, opts = {}) => ({ type: 'stack', direction: 'row', alignItems: 'center', ...opts, children });
    const mkCol = (children, opts = {}) => ({ type: 'stack', direction: 'column', ...opts, children });
    const mkText = (text, size, color, weight = 'regular', opts = {}) => ({ type: 'text', text: String(text), textColor: color, font: { size, weight }, ...opts });
    const mkIcon = (src, color, size = 14, opts = {}) => ({ type: 'image', src: `sf-symbol:${src}`, color, width: size, height: size, ...opts });
    const mkSpacer = (len) => len ? { type: 'spacer', length: len } : { type: 'spacer' };

    const responseColor = (ms, available) => !available ? C.red : (ms >= 1500 ? C.warn : C.textSub);

    const renderDataBlock = (icon, title, value, valColor = C.textMain) => {
      return mkCol([
        mkRow([ mkIcon(icon, C.textSub, 9), mkSpacer(4), mkText(title, 9, C.textSub, 'bold') ], { justifyContent: 'center' }),
        mkSpacer(5), 
        mkText(value, 10, valColor, 'bold', { maxLines: 1, minScale: 0.3 })
      ], { alignItems: 'center', justifyContent: 'center', padding: [6, 4], backgroundColor: C.badgeBg, borderRadius: 6, flex: 1 });
    };

    const ServiceBlock = (item) => {
      const isOk = item.info.available;
      return mkCol([
        mkRow([
          mkText(item.name, 11, C.textMain, 'bold', { flex: 1, maxLines: 1 }),
          { type: 'stack', width: 5, height: 5, borderRadius: 2.5, backgroundColor: isOk ? C.green : C.red }
        ]),
        mkSpacer(8),
        mkRow([
          mkText(item.info.region, 9, C.textSub, 'regular'),
          mkSpacer(),
          mkText(isOk ? `${item.info.ms}ms` : '--', 9, responseColor(item.info.ms, isOk), 'regular', { design: 'monospaced' })
        ])
      ], { backgroundColor: C.cardBg, borderRadius: 8, padding: [8, 8], flex: 1, borderWidth: 1, borderColor: C.cardBorder });
    };

    const headerRow = mkRow([
      mkIcon('waveform.path.ecg', C.blue, 12), mkSpacer(6),
      mkText('网络雷达', 12, C.textMain, 'bold'),
      mkSpacer(),
      mkRow([ mkIcon('shield.fill', C.purple, 9), mkSpacer(4), mkText(currentPolicy, 9, C.textMain, 'bold', { maxLines: 1 }) ], { padding: [3, 8], backgroundColor: C.badgeBg, borderRadius: 6 }),
      mkSpacer(8),
      mkRow([ mkIcon('clock', C.textSub, 10), mkSpacer(3), mkText(timeStr, 10, C.textSub, 'bold', { family: 'Menlo' }) ])
    ]);

    const localBox = mkCol([
      mkRow([
        mkIcon(netIconName, C.blue, wifiSsid ? 26 : 22), mkSpacer(8),
        mkCol([
          mkText(netTitle, 13, C.textMain, 'bold', { maxLines: 1, minScale: 0.3 }), mkSpacer(4),
          mkRow([ mkIcon('iphone', C.textSub, 10), mkSpacer(4), mkText(localIP, 10, C.textSub, 'regular', { maxLines: 1 }) ]), mkSpacer(2), 
          mkRow([ mkIcon('wifi.router', C.textSub, 11), mkSpacer(3), mkText(gatewayIP, 10, C.textSub, 'regular', { maxLines: 1 }) ])
        ], { alignItems: 'start', flex: 1 }) 
      ]),
      mkSpacer(), 
      mkRow([
        renderDataBlock('network', '本地IP', local.ip || '获取中...'), mkSpacer(6), 
        renderDataBlock('stopwatch', '本地延迟', localInfo.ping ? `${localInfo.ping} ms` : '-- ms', C.green)
      ]),
      mkSpacer(8), 
      mkRow([
        renderDataBlock('mappin.and.ellipse', '地理位置', exactLocation), mkSpacer(6), 
        renderDataBlock('globe', 'IP类型', currentIpType) 
      ])
    ], { flex: 1, backgroundColor: C.cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder });

    const proxyBox = mkCol([
      mkRow([
        mkText(getFlagEmoji(cc), 26, C.textMain), mkSpacer(8),
        mkCol([
          mkText(proxyIP, 13, C.textMain, 'bold', { maxLines: 1, minScale: 0.3 }), mkSpacer(2),
          mkRow([ mkIcon('building.2', C.textSub, 10), mkSpacer(4), mkText(nodeIsp, 10, C.textSub, 'regular', { maxLines: 1 }) ]), mkSpacer(2),
          mkRow([ mkIcon('server.rack', C.textSub, 10), mkSpacer(4), mkText(asnStr, 9, C.textSub, 'regular', { maxLines: 1 }) ]) 
        ], { alignItems: 'start', flex: 1 })
      ]),
      mkSpacer(),
      mkRow([
        renderDataBlock('building.2.fill', 'IP属性', isResidential ? '住宅IP' : '机房IP', residentialColorHex), mkSpacer(6),
        renderDataBlock('stopwatch', '节点延迟', nodeInfo.ping ? `${nodeInfo.ping} ms` : '-- ms', C.purple)
      ]),
      mkSpacer(8), 
      mkRow([
        renderDataBlock('checkmark.shield.fill', '原生状态', isResidential ? '原生' : '非原生', residentialColorHex), mkSpacer(6),
        renderDataBlock('shield.checkerboard', '纯净评分', `${pureScore} / 100`, activePureColorHex) 
      ])
    ], { flex: 1, backgroundColor: C.cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder });

    return {
      type: 'widget', backgroundColor: C.bg, padding: 12,
      children: [
        headerRow, mkSpacer(10),
        mkRow([ localBox, mkSpacer(8), proxyBox ], { flex: 1 }), mkSpacer(10),
        mkRow(allServices.slice(0, 4).map(ServiceBlock), { gap: 8 }), mkSpacer(8),
        mkRow(allServices.slice(4, 8).map(ServiceBlock), { gap: 8 })
      ]
    };
  }
}