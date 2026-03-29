/**
 * ==========================================
 * � 网络信息 Widget
 * * ✨ 【功能概览】
 * • 三尺寸自适应统一规范：
 * - 小号：无测速极简版，正文11px、标题12px对标黄历小号。标题左对齐，优化并拉大行间距。
 * - 中号：经典双列展示，左侧标签定宽 52，经典黄历风格。
 * - 大号：沉浸式放大排版，左宽 60，字号 14，等高行距，测速角标放大。
 * • 核心引擎：内网/本地/节点精准 IP 与原生住宅防欺诈侦测。
 * • 测速模块：双向实时网速测试；双轨测速胶囊底座 (仅中/大号启用)。
 * • 稳健防护：3.5秒全局超时熔断机制，杜绝假死白屏。
 *
 * � 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.29 00:40
 * ==========================================
 */

export default async function(ctx) {

  // ── 时间基准与环境变量侦测 ────────────────────────────────────────────────
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  // ── 色彩令牌 ──────────────────────────────────────────────────────────────
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
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

  // ── 严格超时熔断请求包装 (3500ms) ─────────────────────────────────────────
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

  // 小号模式直接跳过测速以提升性能和省电
  const speedDownload = async () => {
    if (isSmall) return 0;
    try {
      const start = Date.now();
      const resp = await ctx.http.get('https://speed.cloudflare.com/__down?bytes=102400', {
        headers: { "User-Agent": "Mozilla/5.0" }, timeout: TIMEOUT_MS
      });
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
        headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/octet-stream" },
        body: payload, timeout: TIMEOUT_MS
      });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  // ── 格式化辅助 ────────────────────────────────────────────────────────────
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
    if (/(^|[\s-])(chinanet|telecom|ctcc|ct)\b|电信/.test(s)) return "中国电信";
    if (/(^|[\s-])(unicom|cncgroup|netcom|link)\b|联通/.test(s)) return "中国联通";
    if (/(^|[\s-])(cbn|broadcast)\b|广电/.test(s)) return "中国广电";
    return raw || "未知";
  };

  const getProxyProtocol = () => {
    try {
      const p = ctx.proxy;
      if (!p) return "";
      const proto = p.protocol || p.type || p.proxyType || "";
      if (!proto) return "";
      const map = {
        "shadowsocks": "SS", "ss": "SS", "vmess": "VMess", "vless": "VLESS",
        "trojan": "Trojan", "hysteria": "Hysteria", "hysteria2": "Hysteria2",
        "tuic": "TUIC", "wireguard": "WireGuard", "http": "HTTP",
        "https": "HTTPS", "socks5": "SOCKS5", "anytls": "AnyTLS"
      };
      return map[String(proto).toLowerCase()] || String(proto).toUpperCase();
    } catch (e) { return ""; }
  };

  try {
    const d = ctx.device || {};
    const [internalIP, internalIPv6, gatewayIP, wifiSsid, cellularRadio] = [
      d.ipv4?.address, d.ipv6?.address, d.ipv4?.gateway, d.wifi?.ssid, d.cellular?.radio
    ];

    // 并发请求数据，如果小号则后两个测速方法直接返回 0
    const [localResp, nodeResp, pureResp, ipv6Resp, downloadSpeed, uploadSpeed] = await Promise.all([
      httpGet('https://myip.ipip.net/json'),
      httpGet('http://ip-api.com/json/?lang=zh-CN'),
      httpGet('https://my.ippure.com/v1/info'),
      httpGet('https://api64.ipify.org?format=json'),
      speedDownload(),
      speedUpload()
    ]);

    const { data: local, ping: localPing } = localResp;
    const { data: node, ping: nodePing }   = nodeResp;
    const pure = pureResp.data || {};

    const publicIPv6Raw = ipv6Resp.data?.ip || '';
    const publicIPv6 = publicIPv6Raw.includes(':') ? publicIPv6Raw : '';

    const fmtSpeed = (kb) => kb > 0 ? (kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB/s` : `${kb}KB/s`) : '--';
    const speedStr = `↓ ${fmtSpeed(downloadSpeed)}  ↑ ${fmtSpeed(uploadSpeed)}`;

    const avgMB = ((downloadSpeed + uploadSpeed) / 2) / 1024;
    const speedColor = (downloadSpeed === 0 && uploadSpeed === 0) ? C.muted : (avgMB >= 10 ? C.teal : (avgMB >= 2 ? C.gold : C.red));

    const proxyProtocol = getProxyProtocol();
    const hasProxy = !!proxyProtocol;

    const locColor = localPing === 0 ? C.muted : (localPing < 60 ? C.teal : (localPing < 150 ? C.gold : C.red));
    const nodColor = nodePing === 0 ? C.muted : (nodePing < 150 ? C.teal : (nodePing < 300 ? C.gold : C.red));

    const rawISP = (Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node?.isp || node?.org;
    const currentISP = fmtISP(rawISP);

    const rawRadio = cellularRadio ? String(cellularRadio).toUpperCase().trim() : "";
    const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[rawRadio] || rawRadio;
    const jumpUrl = { "中国移动": "leadeon://", "中国电信": "ctclient://", "中国联通": "chinaunicom://" }[currentISP] || "";

    const localCountryRaw = Array.isArray(local.location) ? (local.location[0] || "") : "";
    const nodeCountryCode = (node.countryCode || "").toUpperCase();
    const isDnsLeak = hasProxy && (localCountryRaw.includes("中国") || localCountryRaw.includes("China")) && nodeCountryCode === "CN";
    const leakLabel = isDnsLeak ? "⚠️ 泄漏" : "";

    // ── 数据拼装 ──────────────────────────────────────────────────────────────
    const r1Parts = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean);
    if (internalIPv6) r1Parts.push("[v6]");
    const r1Content = r1Parts.join(" / ");

    const locStr = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
    const r2Base = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");
    const r2Content = publicIPv6 ? `${r2Base} / [v6]` : r2Base;

    const nodeLoc = [getFlagEmoji(nodeCountryCode), node.country, node.city].filter(Boolean).join(" ");
    const asnStr = node.as ? String(node.as).split(' ')[0] : "";
    const r3Content = [node.query || node.ip || "获取中...", nodeLoc, asnStr, proxyProtocol].filter(Boolean).join(" / ");

    const risk = pure.fraudScore;
    const riskTxt = risk === undefined ? "未知风险" : (risk >= 80 ? `极高危(${risk})` : risk >= 70 ? `高危(${risk})` : risk >= 40 ? `中危(${risk})` : `低危(${risk})`);
    const r4Content = `${pure.isResidential === true ? "原生住宅" : (pure.isResidential === false ? "商业机房" : "未知属性")} / ${riskTxt}`;

    // ── 小号专属布局渲染 (完全解耦，对标黄历小号字号，拉大行间距) ─────────────────────────
    if (isSmall) {
      // 组装小号专用精简数据
      const r1Line1 = internalIP || "未连接";
      const r1Line2 = [gatewayIP !== internalIP ? gatewayIP : null, internalIPv6 ? "[v6]" : null].filter(Boolean).join(" ");
      
      const r2SmallContent = [local.ip || "获取中...", publicIPv6 ? "[v6]" : null].filter(Boolean).join(" / ");
      const r3SmallContent = [node.query || node.ip || "获取中...", proxyProtocol].filter(Boolean).join(" / ");
      
      const smallRows = [];
      const buildSmallRow = (icon, color, content) => ({
        // gap 设置为 6 保证图标与文字间的横向间距协调
        type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          icon ? { type: 'image', src: `sf-symbol:${icon}`, color, width: 11, height: 11 } : { type: 'spacer', length: 11 },
          { type: 'text', text: content, font: { size: 11, weight: 'medium' }, textColor: C.sub, maxLines: 1, flex: 1 }
        ]
      });

      smallRows.push(buildSmallRow('house.fill', C.teal, r1Line1));
      if (r1Line2) smallRows.push(buildSmallRow(null, null, r1Line2));
      smallRows.push(buildSmallRow('location.circle.fill', C.blue, r2SmallContent)); 
      smallRows.push(buildSmallRow('network', C.purple, r3SmallContent)); 
      smallRows.push(buildSmallRow('shield.lefthalf.filled', C.cyan, `风险: ${pure.fraudScore || "-"}`));

      return {
        type: 'widget', padding: 12, url: jumpUrl || undefined,
        backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
        children: [
          // 标题栏：左对齐两行，字号 12
          { type: 'stack', direction: 'row', alignItems: 'start', gap: 6, children: [
            { type: 'stack', direction: 'column', padding: [2, 0, 0, 0], children: [
               { type: 'image', src: `sf-symbol:${wifiSsid ? 'wifi' : 'antenna.radiowaves.left.and.right'}`, color: C.main, width: 12, height: 12 }
            ]},
            { type: 'stack', direction: 'column', alignItems: 'start', children: [
               { type: 'text', text: currentISP, font: { size: 12, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.6, align: 'left' },
               { type: 'text', text: wifiSsid || radioType || "未连接", font: { size: 12, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.6, align: 'left' }
            ]},
            { type: 'spacer' }, 
            ...(hasProxy ? [{ type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C.proxyGreen, width: 11, height: 11 }] : [])
          ]},
          { type: 'spacer', length: 10 },
          // 优化修复：统一行纵向间距 (gap: 8)，不加 flex: 1，强制高度自然撑开防止被压缩
          { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, children: smallRows },
          { type: 'spacer' }, 
          { type: 'stack', direction: 'row', alignItems: 'center', children: [
            { type: 'spacer' },
            { type: 'text', text: `更新于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
          ]}
        ]
      };
    }

    // ── 通用带测速胶囊顶栏模块 (供中大号使用) ─────────────────────────────────
    const buildHeader = (titleFz, titleIcz) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
        { type: 'image', src: wifiSsid ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'), color: C.main, width: titleIcz, height: titleIcz },
        { type: 'text', text: `${currentISP} · ${wifiSsid || radioType || "未连接"}`, font: { size: titleFz, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.7, flex: 1 },
        ...(leakLabel ? [{ type: 'text', text: leakLabel, font: { size: 10, weight: 'bold' }, textColor: C.red }] : []),
        ...(hasProxy ? [{ type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C.proxyGreen, width: 14, height: 14 }] : []),
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, padding: [3, 6], borderRadius: 6, backgroundColor: C.pingBg, children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
            { type: 'image', src: 'sf-symbol:mappin.circle.fill', color: locColor, width: 10, height: 10 },
            { type: 'text', text: localPing > 0 ? `${localPing}` : "-", font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: locColor }
          ]},
          { type: 'text', text: '|', font: { size: 10, weight: 'light' }, textColor: C.muted },
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
            { type: 'image', src: 'sf-symbol:globe.fill', color: nodColor, width: 10, height: 10 },
            { type: 'text', text: nodePing > 0 ? `${nodePing}` : "-", font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: nodColor }
          ]}
        ]}
      ]
    });

    // ── 大号专属布局渲染 (完全还原，不动分毫) ─────────────────────────────────
    if (isLarge) {
      const fz  = 14;
      const icz = 15;
      const lw  = 60;
      
      const buildLargeRow = (icon, color, label, content, contentColor = C.sub) => ({
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: lw, children: [
              { type: 'image', src: `sf-symbol:${icon}`, color, width: icz, height: icz },
              { type: 'text', text: label, font: { size: fz, weight: 'heavy' }, textColor: color }
          ]},
          { type: 'text', text: content, font: { size: fz, weight: 'medium' }, textColor: contentColor, maxLines: 1, minScale: 0.5, flex: 1 }
        ]
      });

      return {
        type: 'widget', padding: 16, url: jumpUrl || undefined,
        backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
        children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
            { type: 'image', src: wifiSsid ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'), color: C.main, width: 18, height: 18 },
            { type: 'text', text: `${currentISP} · ${wifiSsid || radioType || "未连接"}`, font: { size: 17, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.7, flex: 1 },
            ...(leakLabel ? [{ type: 'text', text: leakLabel, font: { size: 11, weight: 'bold' }, textColor: C.red }] : []),
            ...(hasProxy ? [{ type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C.proxyGreen, width: 15, height: 15 }] : []),
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, padding: [3, 6], borderRadius: 6, backgroundColor: C.pingBg, children: [
              { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
                { type: 'image', src: 'sf-symbol:mappin.circle.fill', color: locColor, width: 11, height: 11 },
                { type: 'text', text: localPing > 0 ? `${localPing}` : "-", font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: locColor }
              ]},
              { type: 'text', text: '|', font: { size: 11, weight: 'light' }, textColor: C.muted },
              { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
                { type: 'image', src: 'sf-symbol:globe.fill', color: nodColor, width: 11, height: 11 },
                { type: 'text', text: nodePing > 0 ? `${nodePing}` : "-", font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: nodColor }
              ]}
            ]}
          ]},
          { type: 'spacer', length: 12 },
          { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, flex: 1, children: [
            buildLargeRow('house.fill', C.teal, '内网', r1Content),
            buildLargeRow('location.circle.fill', C.blue, '本地', r2Content),
            buildLargeRow('network', C.purple, '节点', r3Content, isDnsLeak ? C.red : C.sub),
            buildLargeRow('arrow.up.and.down.circle.fill', speedColor, '网速', speedStr, speedColor),
            buildLargeRow('shield.lefthalf.filled', C.cyan, '属性', r4Content)
          ]},
          { type: 'stack', direction: 'row', alignItems: 'center', children: [
            { type: 'spacer' },
            { type: 'text', text: `更新于 ${timeStr}`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
          ]}
        ]
      };
    }

    // ── 中号经典布局 (完全保留原生版结构) ──────────────────────────────────────
    const buildMedRow = (icon, color, label, content, contentColor = C.sub) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'text', text: content, font: { size: 12, weight: 'medium' }, textColor: contentColor, maxLines: 1, minScale: 0.5, flex: 1 }
      ]
    });

    return {
      type: 'widget', padding: 12, url: jumpUrl || undefined,
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        buildHeader(15, 16),
        { type: 'spacer', length: 8 },
        { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, flex: 1, children: [
          buildMedRow('house.fill', C.teal, '内网', r1Content),
          buildMedRow('location.circle.fill', C.blue, '本地', r2Content),
          buildMedRow('network', C.purple, '节点', r3Content, isDnsLeak ? C.red : C.sub),
          buildMedRow('arrow.up.and.down.circle.fill', speedColor, '网速', speedStr, speedColor),
          buildMedRow('shield.lefthalf.filled', C.cyan, '属性', r4Content)
        ]},
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'spacer' },
          { type: 'text', text: `更新于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
        ]}
      ]
    };

  } catch (err) {
    // ── 错误与超时降级处理 ────────────────────────────────────────────────────
    return {
      type: 'widget', padding: 12,
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'text', text: '网络面板崩溃或超时 ⚠️', font: { size: 14, weight: 'heavy' }, textColor: C.red.light },
        { type: 'spacer', length: 4 },
        { type: 'text', text: String(err.message || err), font: { size: 11 }, textColor: C.muted.light, maxLines: 5 },
        { type: 'spacer' },
        { type: 'stack', direction: 'row', children: [
          { type: 'spacer' },
          { type: 'text', text: `重试于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted.light }
        ]}
      ]
    };
  }
}
