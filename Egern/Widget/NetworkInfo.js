/**
 * ==========================================
 * 📌 网络信息 Widget
 * ✨ 功能概览:
 * • 内网/本地/节点精准 IP 与原生住宅防欺诈侦测
 * • 双向实时网速测试；双轨测速胶囊底座
 * • 防假死时间戳水印；动态捕捉底层代理协议
 * • 智能 DNS 泄漏侦测；内网/外网 IPv6 支持状态独立识别
 * 🔗 https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 2026.03.28 15:30
 * ==========================================
 */

export default async function(ctx) {

  // ── 时间基准 ──────────────────────────────────────────────────────────────
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

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
    proxyGreen:  { light: '#2E8045', dark: '#32D74B' }
  };

  // ── 请求包装 ──────────────────────────────────────────────────────────────
  const httpGet = async (url) => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 });
      const text = await resp.text();
      const json = JSON.parse(text);
      return { data: json.data || json, ping: Date.now() - start };
    } catch (e) { return { data: {}, ping: 0 }; }
  };

  const speedDownload = async () => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get('https://speed.cloudflare.com/__down?bytes=102400', {
        headers: { "User-Agent": "Mozilla/5.0" }, timeout: 6000
      });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  const speedUpload = async () => {
    try {
      const payload = 'x'.repeat(102400);
      const start = Date.now();
      const resp = await ctx.http.post('https://speed.cloudflare.com/__up', {
        headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/octet-stream" },
        body: payload, timeout: 6000
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

    // 标签列固定宽度 52
    const buildRow = (icon, color, label, content, contentColor = C.sub) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'text', text: content, font: { size: 12, weight: 'medium' }, textColor: contentColor, maxLines: 1, minScale: 0.5, flex: 1 }
      ]
    });

    let widgetConfig = {
      type: 'widget', padding: 12,
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: wifiSsid ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'), color: C.main, width: 16, height: 16 },
          { type: 'text', text: `${currentISP} · ${wifiSsid || radioType || "未连接"}`, font: { size: 15, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.7 },
          { type: 'spacer' },
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
        ]},

        { type: 'spacer', length: 8 },

        { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, flex: 1, children: [
          buildRow('house.fill',                  C.teal,   '内网', r1Content),
          buildRow('location.circle.fill',        C.blue,   '本地', r2Content),
          buildRow('network',                     C.purple, '节点', r3Content, isDnsLeak ? C.red : C.sub),
          buildRow('arrow.up.and.down.circle.fill', speedColor, '网速', speedStr, speedColor),
          buildRow('shield.lefthalf.filled',      C.cyan,   '属性', r4Content)
        ]},

        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'spacer' },
          { type: 'text', text: `更新于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
        ]}
      ]
    };

    if (jumpUrl) widgetConfig.url = jumpUrl;
    return widgetConfig;

  } catch (err) {
    return {
      type: 'widget', padding: 12,
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'text', text: '网络面板崩溃 ⚠️', font: { size: 14, weight: 'heavy' }, textColor: C.red.light },
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
