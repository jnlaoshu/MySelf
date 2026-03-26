/**
 * ==========================================
 * 📌 模块名称: 🌐 实时网络信息面板
 * ✨ 主要功能: 内网/本地/节点精准 IP 与原生住宅防欺诈侦测；独家双轨测速胶囊底座；双向实时网速测试；防假死时间戳水印；动态捕捉底层代理协议；智能 DNS 泄漏侦测；内网/外网 IPv6 支持状态独立识别。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
 * ⏱️ 更新时间: 2026.03.26 09:25
 * ==========================================
 */

export default async function(ctx) {

  // ── 全局防崩溃时间基准 ──────────────────────────────────────────
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // ── 调色板（支持深浅色自适应）────────────────────────────────────
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
    cyan: { light: '#628C7B', dark: '#73A491' },
    pingBg: { light: '#F2F2F7', dark: '#2C2C2E' },   // 双轨胶囊底色
    proxyGreen: { light: '#2E8045', dark: '#32D74B' } // 代理盾牌色
  };

  // ── 通用 HTTP GET（含耗时统计，用于 Ping 计算）────────────────────
  const httpGet = async (url) => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 });
      const text = await resp.text();
      const json = JSON.parse(text);
      return { data: json.data || json, ping: Date.now() - start };
    } catch (e) { return { data: {}, ping: 0 }; }
  };

  // ── 下载测速（Cloudflare 100KB，稳定可达）────────────────────────
  const speedDownload = async () => {
    try {
      const start = Date.now();
      const resp = await ctx.http.get('https://speed.cloudflare.com/__down?bytes=102400', {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 6000
      });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  // ── 上传测速（Cloudflare POST 100KB）─────────────────────────────
  const speedUpload = async () => {
    try {
      const payload = 'x'.repeat(102400);
      const start = Date.now();
      const resp = await ctx.http.post('https://speed.cloudflare.com/__up', {
        headers: { "User-Agent": "Mozilla/5.0", "Content-Type": "application/octet-stream" },
        body: payload,
        timeout: 6000
      });
      await resp.text();
      const timeMs = Date.now() - start;
      return timeMs > 0 ? Math.round((102400 / timeMs) * 1000 / 1024) : 0;
    } catch (e) { return 0; }
  };

  // ── 国旗 Emoji 转换（双字母国家码 → Unicode 旗帜）────────────────
  const getFlagEmoji = (cc) => {
    if (!cc) return "";
    const str = String(cc).toUpperCase();
    if (!/^[A-Z]{2}$/.test(str)) return "";
    return String.fromCodePoint(...[...str].map(c => 127397 + c.charCodeAt(0)));
  };

  // ── ISP 名称格式化（兼容全角/半角括号，归一化四大运营商）─────────
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

  // ── 读取当前节点代理协议（静默降级，不影响其余数据）─────────────
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

    // ── 读取设备网络基础信息 ───────────────────────────────────────
    const d = ctx.device || {};
    const [internalIP, internalIPv6, gatewayIP, wifiSsid, cellularRadio] = [
      d.ipv4?.address,   // 内网 IPv4
      d.ipv6?.address,   // 内网 IPv6（有则在内网行标注 [v6]）
      d.ipv4?.gateway,   // 网关 IP
      d.wifi?.ssid,      // Wi-Fi 名称
      d.cellular?.radio  // 蜂窝网络制式（LTE / NR 等）
    ];

    // ── 并发发起全部网络请求（IP 查询 + 双向测速）────────────────
    const [localResp, nodeResp, pureResp, ipv6Resp, downloadSpeed, uploadSpeed] = await Promise.all([
      httpGet('https://myip.ipip.net/json'),          // 本地真实 IP + 归属地
      httpGet('http://ip-api.com/json/?lang=zh-CN'),  // 节点 IP + 地理信息 + ASN
      httpGet('https://my.ippure.com/v1/info'),        // 原生住宅 + 欺诈风险评分
      httpGet('https://api64.ipify.org?format=json'),  // 公网 IPv6 探测（双栈接口）
      speedDownload(),                                  // 下载速率（KB/s）
      speedUpload()                                     // 上传速率（KB/s）
    ]);

    const { data: local, ping: localPing } = localResp;
    const { data: node, ping: nodePing } = nodeResp;
    const pure = pureResp.data || {};

    // ── 公网 IPv6 验证（含冒号才确认为真实 IPv6，排除回退 IPv4）──
    const publicIPv6Raw = ipv6Resp.data?.ip || '';
    const publicIPv6 = publicIPv6Raw.includes(':') ? publicIPv6Raw : '';

    // ── 网速格式化（KB → MB 自动换档，0 显示 --）────────────────
    const fmtSpeed = (kb) => kb > 0
      ? (kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB/s` : `${kb}KB/s`)
      : '--';
    const speedStr = `↓ ${fmtSpeed(downloadSpeed)}  ↑ ${fmtSpeed(uploadSpeed)}`;

    // ── 网速颜色：失败 → 灰色；按均速判断快/中/慢 ───────────────
    const avgKB = (downloadSpeed + uploadSpeed) / 2;
    const avgMB = avgKB / 1024;
    const speedColor = (downloadSpeed === 0 && uploadSpeed === 0)
      ? C.muted                                         // 测速失败降级为灰色
      : (avgMB >= 10 ? C.teal : (avgMB >= 2 ? C.gold : C.red));

    // ── 代理协议 & 是否有代理 ─────────────────────────────────────
    const proxyProtocol = getProxyProtocol();
    const hasProxy = !!proxyProtocol;

    // ── Ping 颜色（本地 / 节点分别判定阈值）─────────────────────
    const locColor = localPing === 0 ? C.muted : (localPing < 60 ? C.teal : (localPing < 150 ? C.gold : C.red));
    const nodColor = nodePing === 0 ? C.muted : (nodePing < 150 ? C.teal : (nodePing < 300 ? C.gold : C.red));

    // ── ISP 识别（优先 ipip 末位归属，回退 ip-api ISP/Org）──────
    const rawISP = (Array.isArray(local.location) ? local.location[local.location.length - 1] : "") || node?.isp || node?.org;
    const currentISP = fmtISP(rawISP);

    // ── 蜂窝制式映射 & 运营商 App 跳转 URL ──────────────────────
    const rawRadio = cellularRadio ? String(cellularRadio).toUpperCase().trim() : "";
    const radioType = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" }[rawRadio] || rawRadio;
    const jumpUrl = { "中国移动": "leadeon://", "中国电信": "ctclient://", "中国联通": "chinaunicom://" }[currentISP] || "";

    // ── DNS 泄漏检测（仅代理生效时：本地和节点同属中国才触发）──
    const localCountryRaw = Array.isArray(local.location) ? (local.location[0] || "") : "";
    const nodeCountryCode = (node.countryCode || "").toUpperCase();
    const localIsCN = localCountryRaw.includes("中国") || localCountryRaw.includes("China");
    const nodeIsCN = nodeCountryCode === "CN";
    const isDnsLeak = hasProxy && localIsCN && nodeIsCN;
    const leakLabel = isDnsLeak ? "⚠️ 泄漏" : "";

    // ── 内网行：IPv4 / 网关 / [v6]（有内网 IPv6 时标注）────────
    const r1Parts = [internalIP || "未连接", gatewayIP !== internalIP ? gatewayIP : null].filter(Boolean);
    if (internalIPv6) r1Parts.push("[v6]");
    const r1Content = r1Parts.join(" / ");

    // ── 本地行：公网 IP / 归属地 / [v6]（有公网 IPv6 时标注）──
    const locStr = Array.isArray(local.location) ? local.location.slice(0, 3).join('').trim() : '';
    const r2Base = [local.ip || "获取中...", locStr].filter(Boolean).join(" / ");
    const r2Content = publicIPv6 ? `${r2Base} / [v6]` : r2Base;

    // ── 节点行：节点 IP / 归属地 / ASN / 协议 ───────────────────
    const nodeLoc = [getFlagEmoji(nodeCountryCode), node.country, node.city].filter(Boolean).join(" ");
    const asnStr = node.as ? String(node.as).split(' ')[0] : "";
    const r3Content = [node.query || node.ip || "获取中...", nodeLoc, asnStr, proxyProtocol].filter(Boolean).join(" / ");

    // ── 属性行：住宅类型 / 欺诈风险评分 ─────────────────────────
    const risk = pure.fraudScore;
    const riskTxt = risk === undefined ? "未知风险" : (risk >= 80 ? `极高危(${risk})` : risk >= 70 ? `高危(${risk})` : risk >= 40 ? `中危(${risk})` : `低危(${risk})`);
    const r4Content = `${pure.isResidential === true ? "原生住宅" : (pure.isResidential === false ? "商业机房" : "未知属性")} / ${riskTxt}`;

    // ── 通用行渲染器（图标 + 标签 + 内容，支持传入内容颜色）────
    const buildRow = (icon, color, label, content, contentColor = C.sub) => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        {
          // ⭐️ 精确到像素的调优：width 设为 52
          type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
            { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: color }
          ]
        },
        { type: 'text', text: content, font: { size: 12, weight: 'medium' }, textColor: contentColor, maxLines: 1, minScale: 0.5, flex: 1 }
      ]
    });

    // ── 组件渲染 ──────────────────────────────────────────────────
    let widgetConfig = {
      type: 'widget', padding: 12,
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [

        // 第一行：网络图标 + 运营商·SSID + 泄漏警告 + 代理盾牌 + 双轨 Ping 胶囊
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image',
            src: wifiSsid ? 'sf-symbol:wifi' : (cellularRadio ? 'sf-symbol:antenna.radiowaves.left.and.right' : 'sf-symbol:wifi.slash'),
            color: C.main, width: 16, height: 16 },
          { type: 'text', text: `${currentISP} · ${wifiSsid || radioType || "未连接"}`, font: { size: 15, weight: 'heavy' }, textColor: C.main, maxLines: 1, minScale: 0.7 },
          { type: 'spacer' },
          // DNS 泄漏警告（有泄漏时显示红色文字）
          ...(leakLabel ? [{ type: 'text', text: leakLabel, font: { size: 10, weight: 'bold' }, textColor: C.red }] : []),
          // 代理状态图标（有代理时显示绿色盾牌）
          ...(hasProxy ? [{ type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C.proxyGreen, width: 14, height: 14 }] : []),
          // 双轨 Ping 胶囊（本地 | 节点，带圆角底色）
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

        // 核心数据行（内网 / 本地 / 节点 / 网速 / 属性）
        { type: 'stack', direction: 'column', alignItems: 'start', gap: 8, flex: 1, children: [
          buildRow('house.fill',                  C.teal,   '内网', r1Content),
          buildRow('location.circle.fill',         C.blue,   '本地', r2Content),
          buildRow('network',                      C.purple, '节点', r3Content, isDnsLeak ? C.red : C.sub),
          buildRow('arrow.up.and.down.circle.fill', speedColor, '网速', speedStr, speedColor),
          buildRow('shield.lefthalf.filled',       C.cyan,   '属性', r4Content)
        ]},

        // 底部时间戳水印
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'spacer' },
          { type: 'text', text: `更新于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
        ]}
      ]
    };

    // 运营商 App 跳转（仅识别到对应运营商时挂载）
    if (jumpUrl) widgetConfig.url = jumpUrl;
    return widgetConfig;

  } catch (err) {
    // ── 全局异常捕获：展示崩溃原因，便于排查 ────────────────────
    return {
      type: 'widget', padding: 12,
      backgroundGradient: { type: 'linear', colors: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: 'text', text: '网络面板崩溃 ⚠️', font: { size: 14, weight: 'heavy' }, textColor: '#FF453A' },
        { type: 'spacer', length: 4 },
        { type: 'text', text: String(err.message || err), font: { size: 11 }, textColor: '#8E8E93', maxLines: 5 },
        { type: 'spacer' },
        { type: 'stack', direction: 'row', children: [
          { type: 'spacer' },
          { type: 'text', text: `重试于 ${timeStr}`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: '#8E8E93' }
        ]}
      ]
    };
  }
}