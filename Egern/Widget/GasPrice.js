/**
 * ==========================================
 * 📌 全国油价 Widget (三尺寸自适应版)
 * * ✨ 【主要功能】
 * • 三端尺寸完美适配：
 * - 小号 (Small) ：极简 2x2 四宫格，告别拥挤遮挡，纯净留白。
 * - 中号 (Medium)：经典 1x4 横排卡片布局，等比分配，信息直观。
 * - 大号 (Large) ：沉浸式 2x2 放大四宫格，字号与间距完美扩容。
 * • 实时油价精准拉取：支持 92/95/98/柴油，全拼音自定义省市参数。
 * • 智能调价倒数引擎：内置 2026 年法定调价日历，自动计算倒数时间。
 * • 视觉预警机制：距调价 ≤4 天预测高亮变色；>4 天本轮回顾置灰。
 * * 🔧 【环境变量】
 * GAS_REGION — 城市全拼音 (默认: sichuan/chengdu)
 * * 🔗 【脚本引用】
 * https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * * ⏱️ 【更新时间】
 * 2026.03.29 07:00
 * ==========================================
 */

export default async function (ctx) {
  
  // ── 基础环境与配置 ──────────────────────────────────────────────────────
  const env = ctx.env || {};
  const regionParam = env.GAS_REGION || env.region || "sichuan/chengdu";

  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const now = new Date();
  const Y   = now.getFullYear();
  const P   = n => String(n).padStart(2, "0");
  const updateTimeStr = `${P(now.getMonth()+1)}.${P(now.getDate())} ${P(now.getHours())}:${P(now.getMinutes())}`;

  // ── 色彩令牌与日历 ──────────────────────────────────────────────────────
  const C = {
    bg:      [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card:    { light: '#FFFFFF', dark: '#2C2C2E' },
    main:    { light: '#1C1C1E', dark: '#F2F2F7' },
    muted:   { light: '#8E8E93', dark: '#636366' },
    gold:    { light: '#B07C1A', dark: '#D4A02A' },
    red:     { light: '#C0392B', dark: '#FF453A' },
    teal:    { light: '#1E7E44', dark: '#30D158' },
    blue:    { light: '#2C5F8A', dark: '#5E9ED6' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const CALENDAR_2026 = [
    [1,12],[1,23],[2,9],[2,23],[3,9],[3,23],[4,7],[4,21],[5,8],[5,22],
    [6,5],[6,19],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,25],
    [10,14],[10,28],[11,11],[11,25],[12,9],[12,23]
  ];

  // ── UI 渲染辅助构建器 ───────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) => ({ type: "text", text: String(text), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 调价计算引擎 ────────────────────────────────────────────────────────
  const getNextAdjust = () => {
    const next = CALENDAR_2026.find(([m, d]) => new Date(Y, m - 1, d, 23, 59, 59).getTime() > now.getTime());
    if (!next) return { dateStr: "待更新", countdown: "", isUrgent: false, daysLeft: 99 };

    const target     = new Date(Y, next[0]-1, next[1], 23, 59, 59);
    const totalHours = Math.floor((target.getTime() - now.getTime()) / 3600000);
    const days  = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return {
      dateStr:   `${P(next[0])}.${P(next[1])} 24:00`,
      countdown: `(${days}d${hours}h后)`,
      isUrgent:  totalHours < 72,
      daysLeft:  days
    };
  };

  const nextAdjust = getNextAdjust();
  const infoColor  = nextAdjust.isUrgent ? C.red : C.gold;

  // ── 网络数据获取与解析 ──────────────────────────────────────────────────
  const prices = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = "全国";
  let trendLabel = "调价趋势: ";
  let trendInfo  = "暂无数据";
  let trendColor = C.muted;

  try {
    const resp = await ctx.http.get(`http://m.qiyoujiage.com/${regionParam}.shtml`, { timeout: 8000 });
    const html = await resp.text();

    regionName = (html.match(/<title>([^_]+)_/) || [])[1]?.replace(/(油价|实时|今日|最新|价格)/g, "").trim() || "全国";

    for (const m of html.matchAll(/<dt>(.*?)<\/dt>[\s\S]*?<dd>([\d.]+)\(元\)<\/dd>/g)) {
      const val = parseFloat(m[2]);
      if (isNaN(val)) continue;
      if      (m[1].includes("92")) prices.p92    = val;
      else if (m[1].includes("95")) prices.p95    = val;
      else if (m[1].includes("98")) prices.p98    = val;
      else if (m[1].includes("柴") || m[1].includes("0号")) prices.diesel = val;
    }

    const tm = html.match(/<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/);
    if (tm) {
      const [, timeText, priceText] = tm;
      const rd = timeText.match(/(\d{1,2})月(\d{1,2})日(\d{1,2})时/);
      const adjustDate = rd ? `${P(rd[1])}.${P(rd[2])} ${P(rd[3])}:00` : "未知时间";

      const isUp   = /上调|上涨|涨/.test(priceText);
      const isDown = /下调|下跌|降|跌/.test(priceText);
      const amounts = (priceText.match(/[\d.]+\s*元\/升/g) || []).map(p => p.match(/[\d.]+/)[0]);
      const amountStr = amounts.length >= 2 ? `${amounts[0]}-${amounts[1]}¥/L` : (amounts[0] ? `${amounts[0]}¥/L` : "");

      trendInfo = `${adjustDate}, ${isUp ? "↑" : isDown ? "↓" : "-"} ${amountStr}`.trim();

      if (nextAdjust.daysLeft <= 4) {
        trendLabel = "下轮预测: ";
        trendColor = isUp ? C.red : isDown ? C.teal : C.muted;
      } else {
        trendLabel = "本轮调价: ";
        trendColor = C.muted;
      }
    }
  } catch (_) {}

  // 格式化价格数据源
  const PRICE_ITEMS = [
    { label: "92号", key: "p92",    color: C.gold },
    { label: "95号", key: "p95",    color: C.red  },
    { label: "98号", key: "p98",    color: C.blue },
    { label: "柴油", key: "diesel", color: C.teal }
  ].map(i => ({ ...i, val: prices[i.key] })).filter(i => i.val !== null);


  // ── 视图渲染 (小号尺寸) ──────────────────────────────────────────────────
  if (isSmall) {
    const priceCardSmall = ({ label, val, color }) => ({
      type: "stack", direction: "column", alignItems: "center", flex: 1, backgroundColor: C.card, borderRadius: 10, padding: [6, 2, 6, 2],
      children: [
        mkSpacer(),
        mkText(label, 10, "bold", color),
        mkSpacer(3),
        mkText(val.toFixed(2), 15, "heavy", C.main),
        mkSpacer()
      ]
    });

    return {
      type: "widget", padding: 12, url: "hellobike://",
      backgroundGradient: { type: "linear", colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        mkRow([
          { type: "image", src: "sf-symbol:fuelpump.circle.fill", width: 13, height: 13, color: C.main },
          mkSpacer(4),
          mkText(`${regionName}油价`, 13, "heavy", C.main, { maxLines: 1, minScale: 0.8 }),
          mkSpacer()
        ], 0),
        mkSpacer(10),
        
        { type: "stack", direction: "column", gap: 8, flex: 1, children: [
          { type: "stack", direction: "row", gap: 8, flex: 1, children: PRICE_ITEMS.slice(0, 2).map(priceCardSmall) },
          { type: "stack", direction: "row", gap: 8, flex: 1, children: PRICE_ITEMS.slice(2, 4).map(priceCardSmall) }
        ]},
        
        mkSpacer(10),
        mkRow([
          mkSpacer(),
          { type: "image", src: "sf-symbol:clock.fill", width: 9, height: 9, color: nextAdjust.isUrgent ? C.red : C.muted },
          mkSpacer(3),
          mkText(`调价: ${nextAdjust.dateStr}`, 9, "bold", nextAdjust.isUrgent ? C.red : C.muted)
        ], 0)
      ]
    };
  }

  // ── 视图渲染 (大号尺寸) ──────────────────────────────────────────────────
  if (isLarge) {
    const priceCardLarge = ({ label, val, color }) => ({
      type: "stack", direction: "column", alignItems: "center", flex: 1, backgroundColor: C.card, borderRadius: 16,
      children: [
        mkSpacer(),
        mkText(label, 16, "heavy", color),
        mkSpacer(10),
        mkText(val.toFixed(2), 28, "heavy", C.main),
        mkSpacer()
      ]
    });

    return {
      type: "widget", padding: 16, url: "hellobike://",
      backgroundGradient: { type: "linear", colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        mkRow([
          { type: "image", src: "sf-symbol:fuelpump.circle.fill", width: 18, height: 18, color: C.main },
          mkSpacer(4),
          mkText(`${regionName}油价`, 17, "heavy", C.main),
          mkSpacer(),
          mkText("下轮调价: ", 12, "medium", infoColor, { minScale: 0.8 }),
          mkText(nextAdjust.dateStr, 12, "bold", infoColor, { minScale: 0.8 }),
          mkText(` ${nextAdjust.countdown}`, 12, "bold", infoColor, { minScale: 0.8 })
        ], 0),

        mkSpacer(16),
        { type: "stack", direction: "column", gap: 12, flex: 1, children: [
          { type: "stack", direction: "row", gap: 12, flex: 1, children: PRICE_ITEMS.slice(0, 2).map(priceCardLarge) },
          { type: "stack", direction: "row", gap: 12, flex: 1, children: PRICE_ITEMS.slice(2, 4).map(priceCardLarge) }
        ]},
        mkSpacer(16),
        { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(12),

        mkRow([
          mkRow([
            { type: "image", src: "sf-symbol:arrow.triangle.2.circlepath", width: 13, height: 13, color: C.muted },
            mkSpacer(4),
            mkText(updateTimeStr, 11, "bold", C.muted, { family: "Menlo" })
          ], 0),
          mkSpacer(),
          { type: "stack", direction: "row", alignItems: "center", gap: 2, children: [
              mkText(trendLabel, 12, "medium", C.muted),
              mkText(trendInfo, 12, "bold", trendColor, { maxLines: 1, minScale: 0.7 })
          ]}
        ], 0)
      ]
    };
  }

  // ── 视图渲染 (中号默认尺寸) ──────────────────────────────────────────────
  const priceCard = ({ label, val, color }) => ({
    type: "stack", direction: "column", alignItems: "center", flex: 1, backgroundColor: C.card, borderRadius: 13, padding: [12, 6, 12, 6],
    children: [
      mkText(label, 11, "bold", color),
      mkSpacer(6),
      mkText(val.toFixed(2), 18, "heavy", C.main)
    ]
  });

  return {
    type: "widget", padding: 12, url: "hellobike://",
    backgroundGradient: { type: "linear", colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      mkRow([
        { type: "image", src: "sf-symbol:fuelpump.circle.fill", width: 16, height: 16, color: C.main },
        mkSpacer(2),
        mkText(`${regionName}油价`, 15, "heavy", C.main),
        mkSpacer(),
        mkText("下轮调价: ", 11, "medium", infoColor),
        mkText(nextAdjust.dateStr, 11, "bold", infoColor),
        mkText(` ${nextAdjust.countdown}`, 11, "bold", infoColor)
      ], 0),

      mkSpacer(12),
      { type: "stack", direction: "row", gap: 6, children: PRICE_ITEMS.map(priceCard) },
      mkSpacer(12),
      { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
      mkSpacer(8),

      mkRow([
        mkRow([
          { type: "image", src: "sf-symbol:arrow.triangle.2.circlepath", width: 11, height: 11, color: C.muted },
          mkText(updateTimeStr, 9, "bold", C.muted, { family: "Menlo" })
        ], 4),
        mkSpacer(),
        { type: "stack", direction: "row", alignItems: "center", gap: 2, children: [
            mkText(trendLabel, 11, "medium", C.muted),
            mkText(trendInfo, 11, "bold", trendColor, { maxLines: 1, minScale: 0.7 })
        ]}
      ], 0)
    ]
  };
}