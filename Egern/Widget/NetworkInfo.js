/**
 * ==========================================
 * 🌐 网络信息 (Network Info) 小组件
 * * ✨ 【功能概览】
 * • 三尺寸自适应统一规范：
 * - 小号：无测速极简版，正文11px、标题12px对标黄历小号。标题左对齐，优化并拉大行间距。
 * - 中号：经典双列展示，左侧标签定宽 52，经典黄历风格。
 * - 大号：沉浸式放大排版，左宽 60，字号 14，等高行距，测速角标放大。
 * • 核心引擎：内网/本地/节点精准 IP 与原生住宅防欺诈侦测。
 * • 测速模块：双向实时网速测试；双轨测速胶囊底座 (仅中/大号启用)。
 * • 稳健防护：3.5秒全局超时熔断机制，杜绝假死白屏。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.30 10:00
 * ==========================================
 */

export default async function(ctx) {
  // ── 时间基准与尺寸侦测 ────────────────────────────────────────────────
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  // ── 统一色彩令牌系统 ──────────────────────────────────────────────────
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF' },
    sub:         { light: '#48484A', dark: '#D1D1D6' },
    muted:       { light: '#8E8E93', dark: '#8E8E93' },
    gold:        { light: '#B58A28', dark: '#D6A53A' },
    red:         { light: '#CA3B32', dark: '#FF453A' },
    teal:        { light: '#2E8045', dark: '#32D74B' },
    blue:        { light: '#3A5F85', dark: '#5E8EB8' },
    purple:      { light: '#6B4C9A', dark: '#8B6AA8' },
    cyan:        { light: '#628C7B', dark: '#73A491' },
    pingBg:      { light: '#F2F2F7', dark: '#2C2C2E' },
    proxyGreen:  { light: '#2E8045', dark: '#32D74B' },
    divider:     { light: '#E5E5EA', dark: '#38383A' },
    transparent: '#00000000'
  };

  // ── UI 统一构建器 ─────────────────────────────────────────────────────
  const mkText = (text, size, weight, color, opts = {}) => {
    const { family: fontFamily, ...restOpts } = opts;
    return {
      type: "text",
      text: String(text ?? ""),
      font: { size, weight, ...(fontFamily ? { family: fontFamily } : {}) },
      textColor: color,
      ...restOpts
    };
  };
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };
  const backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  // ── 严格超时熔断请求包装 (3500ms) ─────────────────────────────────────
  const TIMEOUT_MS = 3500;

  const httpGet = async (url) => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: TIMEOUT_MS });
      const text = await resp.text();
      const json = JSON.parse(text);
      return { data: json.data || json, ping: Date.now() - start };
    } catch (e) { return { data: {}, ping: 0 }; }
  };

  // 小号模式跳过测速以提升性能
  const speedDownload = async () => {
    if (isSmall) return 0;
    try {
      const start = Date.now();
      const resp = await ctx.http.get('https://speed.cloudflare.com/__down?bytes=102400', { headers: { "User-Agent": "Mozilla/5.0" }, timeout: TIMEOUT_MS });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  const speedUpload = async () => {
    if (isSmall) return 0;
    try {
      const payload = 'x'.repeat(102400);
      const start = Date.now();
      const resp = await ctx.http.post('https://speed.cloudflare.com/__up', {
        headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/octet-stream" }, body: payload, timeout: TIMEOUT_MS
      });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  // ── 格式化辅助 ────────────────────────────────────────────────────────
  const getFlagEmoji = (cc) => {
    if (!cc) return "";
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

  // 【说明】ctx.proxy 为非官方 API，不在官方文档列举范围内，以 try/catch 兜底
  const getProxyProtocol = () => {
    try {
      const p = ctx.proxy;
      if (!p) return "";
      const proto = p.protocol || p.type || p.proxyType || "";
      if (!proto) return "";
      const map = {
        "shadowsocks": "SS",    "ss": "SS",         "vmess": "VMess",
        "vless": "VLESS",       "trojan": "Trojan",  "hysteria": "Hysteria",
        "hysteria2": "Hysteria2","tuic": "TUIC",     "wireguard": "WireGuard",
        "http": "HTTP",          "https": "HTTPS",   "socks5": "SOCKS5",
        "anytls": "AnyTLS"
      };
      return map[String(proto).toLowerCase()] || String(proto).toUpperCase();
    } catch (e) { return ""; }
  };

  try {
    const d = ctx.device || {};
    const [internalIP, internalIPv6, gatewayIP, wifiSsid, cellularRadio] = [
      d.ipv4?.address, d.ipv6?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio
    ];

    // 并发请求数据
    const [localResp, nodeResp, pureResp, ipv6Resp, downloadSpeed, uploadSpeed] = await Promise.all([
      httpGet('https://myip.ipip.net/json'),
      httpGet('http://ip-api.com/json/?lang=zh-CN'),
      httpGet('https://my.ippure.com/v1/info'),
      httpGet('https://api64.ipify.org?format=json'),
      speedDownload(),
      speedUpload()
    ]);

    const { data: local, ping: localPing } = localResp;
    const { data: node,  ping: nodePing  } = nodeResp;
    const pure = pureResp.data || {};

    const publicIPv6Raw = ipv6Resp.data?.ip || '';
    const publicIPv6    = publicIPv6Raw.includes(':') ? publicIPv6Raw : '';

    const fmtSpeed   = (kb) => kb > 0 ? (kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB/s` : `${kb}KB/s`) : '--';
    const speedStr   = `↓ ${fmtSpeed(downloadSpeed)}  ↑ ${fmtSpeed(uploadSpeed)}`;
    const avgMB      = ((downloadSpeed + uploadSpeed) / 2) / 1024;
    const speedColor = (downloadSpeed === 0 && uploadSpeed === 0) ? C.muted
      : (avgMB >= 10 ? C.teal : avgMB >= 2 ? C.gold : C.red);

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

    // ── 数据拼装 ──────────────────────────────────────────────────────────
    const r1Parts = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean);
    if (internalIPv6) r1Parts.push("[v6]");
    const r1Content = r1Parts.join(" / ");

    const locStr    = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
    const r2Base    = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");
    const r2Content = publicIPv6 ? `${r2Base} / [v6]` : r2Base;

    const nodeLoc   = [getFlagEmoji(nodeCountryCode), node.country, node.city].filter(Boolean).join(" ");
    const asnStr    = node.as ? String(node.as).split(' ')[0] : "";
    const r3Content = [node.query || node.ip || "获取中...", nodeLoc, asnStr, proxyProtocol].filter(Boolean).join(" / ");

    const risk      = pure.fraudScore;
    const riskTxt   = risk === undefined ? "未知风险"
      : risk >= 80 ? `极高危(${risk})` : risk >= 70 ? `高危(${risk})` : risk >= 40 ? `中危(${risk})` : `低危(${risk})`;
    const r4Content = `${pure.isResidential === true ? "原生住宅" : pure.isResidential === false ? "商业机房" : "未知属性"} / ${riskTxt}`;

    // ── 小号专属布局渲染 ──────────────────────────────────────────────────
    if (isSmall) {
      const r1Line2       = [gatewayIP !== internalIP ? gatewayIP : null, internalIPv6 ? "[v6]" : null].filter(Boolean).join(" ");
      const r2SmallContent = [local.ip || "获取中...", publicIPv6 ? "[v6]" : null].filter(Boolean).join(" / ");
      const r3SmallContent = [node.query || node.ip || "获取中...", proxyProtocol].filter(Boolean).join(" / ");

      const smallRows = [];
      const pushSmallRow = (icon, color, content) => smallRows.push(
        mkRow([
          icon ? mkIcon(icon, color, 11) : mkSpacer(11),
          mkText(content, 11, "medium", C.sub, { maxLines: 1, flex: 1 })
        ], 6)
      );

      pushSmallRow('house.fill',             C.teal,   internalIP || "未连接");
      if (r1Line2) pushSmallRow(null, null, r1Line2);
      pushSmallRow('location.circle.fill',   C.blue,   r2SmallContent);
      pushSmallRow('network',                C.purple,  r3SmallContent);
      pushSmallRow('shield.lefthalf.filled', C.cyan,   `风险: ${pure.fraudScore || "-"}`);

      return {
        type: 'widget', padding: 12, url: jumpUrl || undefined, backgroundGradient,
        children: [
          mkRow([
            { type: 'stack', direction: 'column', padding: [2, 0, 0, 0], children: [
              mkIcon(wifiSsid ? 'wifi' : 'antenna.radiowaves.left.and.right', C.main, 12)
            ]},
            { type: 'stack', direction: 'column', alignItems: 'start', children: [
              mkText(currentISP,                  12, "heavy", C.main, { maxLines: 1, minScale: 0.6 }),
              mkText(wifiSsid || radioType || "未连接", 12, "heavy", C.main, { maxLines: 1, minScale: 0.6 })
            ]},
            mkSpacer(),
            ...(hasProxy ? [mkIcon('shield.lefthalf.filled', C.proxyGreen, 11)] : [])
          ], 6, { alignItems: 'start' }),
          mkSpacer(10),
          { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, children: smallRows },
          mkSpacer(),
          mkRow([ mkSpacer(), mkText(`更新于 ${timeStr}`, 9, "bold", C.muted, { family: 'Menlo' }) ])
        ]
      };
    }

    // ── 中大号参数及组件统一构造 ──────────────────────────────────────────
    const layout = {
      fz:        isLarge ? 14 : 12,
      icz:       isLarge ? 15 : 13,
      lw:        isLarge ? 60 : 52,
      titleFz:   isLarge ? 17 : 15,
      titleIcz:  isLarge ? 18 : 16,
      pingFz:    isLarge ? 11 : 10,
      gap:       8,
      padding:   isLarge ? 16 : 12,
      spacerTop: isLarge ? 12 : 8,
      timeFz:    isLarge ? 11 : 9
    };

    const buildHeader = () => mkRow([
      mkIcon(wifiSsid ? 'wifi' : (cellularRadio ? 'antenna.radiowaves.left.and.right' : 'wifi.slash'), C.main, layout.titleIcz),
      mkText(`${currentISP} · ${wifiSsid || radioType || "未连接"}`, layout.titleFz, "heavy", C.main, { maxLines: 1, minScale: 0.7, flex: 1 }),
      ...(leakLabel ? [mkText(leakLabel, layout.pingFz, "bold", C.red)] : []),
      ...(hasProxy  ? [mkIcon('shield.lefthalf.filled', C.proxyGreen, layout.titleIcz - 3)] : []),
      mkRow([
        mkRow([ mkIcon('mappin.circle.fill', locColor, layout.pingFz), mkText(localPing > 0 ? `${localPing}` : "-", layout.pingFz, "bold", locColor, { family: 'Menlo' }) ], 2),
        mkText('|', layout.pingFz, "light", C.muted),
        mkRow([ mkIcon('globe.fill', nodColor, layout.pingFz), mkText(nodePing > 0 ? `${nodePing}` : "-", layout.pingFz, "bold", nodColor, { family: 'Menlo' }) ], 2)
      ], 4, { padding: [3, 6], borderRadius: 6, backgroundColor: C.pingBg })
    ], 6);

    const buildContentRow = (icon, color, label, content, contentColor = C.sub) => mkRow([
      mkRow([ mkIcon(icon, color, layout.icz), mkText(label, layout.fz, "heavy", color) ], 2, { width: layout.lw }),
      mkText(content, layout.fz, "medium", contentColor, { maxLines: 1, minScale: 0.5, flex: 1 })
    ], 4);

    return {
      type: 'widget', padding: layout.padding, url: jumpUrl || undefined, backgroundGradient,
      children: [
        buildHeader(),
        mkSpacer(layout.spacerTop),
        { type: 'stack', direction: 'column', alignItems: 'start', gap: layout.gap, flex: 1, children: [
          buildContentRow('house.fill',                    C.teal,     '内网', r1Content),
          buildContentRow('location.circle.fill',          C.blue,     '本地', r2Content),
          buildContentRow('network',                       C.purple,   '节点', r3Content, isDnsLeak ? C.red : C.sub),
          buildContentRow('arrow.up.and.down.circle.fill', speedColor, '网速', speedStr, speedColor),
          buildContentRow('shield.lefthalf.filled',        C.cyan,     '属性', r4Content)
        ]},
        mkRow([ mkSpacer(), mkText(`更新于 ${timeStr}`, layout.timeFz, "bold", C.muted, { family: 'Menlo' }) ])
      ]
    };

  } catch (err) {
    // ── 错误降级处理 ──────────────────────────────────────────────────────
    return {
      type: 'widget', padding: 12, backgroundGradient,
      children: [
        mkText('网络面板崩溃或超时 ⚠️', 14, "heavy", C.red),
        mkSpacer(4),
        mkText(String(err.message || err), 11, "medium", C.muted, { maxLines: 5 }),
        mkSpacer(),
        mkRow([ mkSpacer(), mkText(`重试于 ${timeStr}`, 9, "bold", C.muted, { family: 'Menlo' }) ])
      ]
    };
  }
}
