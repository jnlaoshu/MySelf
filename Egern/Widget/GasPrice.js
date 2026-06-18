/**
 * ==========================================
 * 📌 全国油价 (Gas Price) 小组件
 * * ✨ 【主要功能】
 * • 三端尺寸完美适配：
 * - 小号 (Small)  ：极简 2x2 四宫格，告别拥挤遮挡，纯净留白。
 * - 中号 (Medium) ：经典 1x4 横排卡片布局，等比分配，信息直观。
 * - 大号 (Large)  ：沉浸式 2x2 放大四宫格，字号与间距完美扩容。
 * • 实时油价精准拉取：支持 92/95/98/柴油，全拼音自定义省市参数。
 * • 智能调价倒数引擎：内置 2026 年法定调价日历，自动计算倒数时间。
 * • 视觉预警机制：距调价 ≤4 天预测高亮变色；>4 天本轮回顾置灰。
 * * 🔧 【环境变量】
 * GAS_REGION — 城市全拼音 (默认: sichuan/chengdu)
 * * 🔗 链接引用 https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * * ⏱️ 更新时间 2026.06.19 06:55
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

  // ── 统一色彩令牌系统 ──────────────────────────────────────────────────
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

  // ── 增强版调价计算引擎 ─────────────────────────────────────────────────
  const getNextAdjust = (html = null) => {
    let targetDate = null;
    let isWebExpired = false;
    let rawWebDateStr = "未知时间";

    // 1. 尝试从网页解析
    if (html) {
      const tm = html.match(/<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/);
      if (tm) {
        const timeText = tm[1];
        const rd = timeText.match(/(\d{1,2})[月.\-]?(\d{1,2})[日]?\s*(\d{1,2})?[:时]?/);
        if (rd) {
          const m = parseInt(rd[1]);
          const d = parseInt(rd[2]);
          const candidate = new Date(Y, m - 1, d, 23, 59, 59);
          rawWebDateStr = `${P(m)}.${P(d)} 24:00`;

          if (candidate.getTime() > now.getTime()) {
            targetDate = candidate;
          } else {
            isWebExpired = true;
          }
        }
      }
    }

    // 2. 回退到日历 + 10天冷却保护
    if (!targetDate) {
      let baseTime = now.getTime();
      if (isWebExpired) {
        const [mStr, dStr] = rawWebDateStr.split('.');
        const webMonth = parseInt(mStr);
        const webDay = parseInt(dStr.split(' ')[0]);
        const webDate = new Date(Y, webMonth - 1, webDay, 23, 59, 59);
        baseTime = webDate.getTime() + 10 * 24 * 3600 * 1000;
      }

      const next = CALENDAR_2026.find(([m, d]) => {
        const t = new Date(Y, m - 1, d, 23, 59, 59);
        return t.getTime() > baseTime;
      });

      if (next) {
        targetDate = new Date(Y, next[0] - 1, next[1], 23, 59, 59);
      }
    }

    if (!targetDate) {
      return { dateStr: "待更新", countdown: "", isUrgent: false, daysLeft: 99, isWebExpired, rawWebDateStr };
    }

    const totalHours = Math.floor((targetDate.getTime() - now.getTime()) / 3600000);
    const days  = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return {
      dateStr:   `${P(targetDate.getMonth() + 1)}.${P(targetDate.getDate())} 24:00`,
      countdown: `(${days}d${hours}h后)`,
      isUrgent:  totalHours < 72,
      daysLeft:  days,
      isWebExpired,
      rawWebDateStr
    };
  };

  let nextAdjust = getNextAdjust();

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

    // 解析油价
    for (const m of html.matchAll(/<dt>(.*?)<\/dt>[\s\S]*?<dd>([\d.]+)\(元\)<\/dd>/g)) {
      const val = parseFloat(m[2]);
      if (isNaN(val)) continue;
      if (m[1].includes("92")) prices.p92 = val;
      else if (m[1].includes("95")) prices.p95 = val;
      else if (m[1].includes("98")) prices.p98 = val;
      else if (m[1].includes("柴") || m[1].includes("0号")) prices.diesel = val;
    }

    nextAdjust = getNextAdjust(html);

    // 趋势信息
    const tm = html.match(/<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/);
    if (tm) {
      const [, , priceText] = tm;
      const isUp   = /上调|上涨|涨/.test(priceText);
      const isDown = /下调|下跌|降|跌/.test(priceText);
      const amounts = (priceText.match(/[\d.]+\s*元\/升/g) || []).map(p => p.match(/[\d.]+/)[0]);
      const amountStr = amounts.length >= 2 ? `${amounts[0]}-${amounts[1]}¥/L` : (amounts[0] ? `${amounts[0]}¥/L` : "");

      if (nextAdjust.isWebExpired) {
        trendLabel = "上轮已调: ";
        trendColor = C.muted;
        trendInfo  = `${nextAdjust.rawWebDateStr}, ${isUp ? "↑" : isDown ? "↓" : "-"} ${amountStr}`;
      } else {
        trendLabel = nextAdjust.daysLeft <= 4 ? "下轮预测: " : "本轮调价: ";
        trendColor = nextAdjust.daysLeft <= 4 ? (isUp ? C.red : isDown ? C.teal : C.muted) : C.muted;
        trendInfo  = `${nextAdjust.dateStr}, ${isUp ? "↑" : isDown ? "↓" : "-"} ${amountStr}`;
      }
    }
  } catch (_) {
    nextAdjust = getNextAdjust();
  }

  // ── 价格卡片数据 ───────────────────────────────────────────────────────
  const PRICE_ITEMS = [
    { label: "92号", key: "p92",    color: C.gold },
    { label: "95号", key: "p95",    color: C.red  },
    { label: "98号", key: "p98",    color: C.blue },
    { label: "柴油", key: "diesel", color: C.teal }
  ].map(i => ({ ...i, val: prices[i.key] !== null ? prices[i.key].toFixed(2) : "--" }));

  // ── UI 辅助函数 ───────────────────────────────────────────────────────
  const mkText = (text, size, weight, color, opts = {}) => ({
    type: "text",
    text: String(text ?? ""),
    font: { size, weight, ...(opts.family ? { family: opts.family } : {}) },
    textColor: color,
    ...opts
  });

  const mkRow = (children, gap = 4, opts = {}) => ({
    type: "stack", direction: "row", alignItems: "center", gap, children, ...opts
  });

  const mkIcon = (src, color, size = 13) => ({
    type: "image", src: `sf-symbol:${src}`, color, width: size, height: size
  });

  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  const buildPriceCard = (item, config) => ({
    type: "stack", direction: "column", alignItems: "center", flex: 1,
    backgroundColor: C.card, borderRadius: config.radius, padding: config.padding,
    children: [
      mkSpacer(),
      mkText(item.label, config.labelFz, config.labelWeight, item.color),
      mkSpacer(config.innerGap),
      mkText(item.val, config.valFz, "heavy", C.main),
      mkSpacer()
    ]
  });

  const backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  // ── 小号视图 ───────────────────────────────────────────────────────────
  if (isSmall) {
    const cardCfg = { radius: 10, padding: [6, 2, 6, 2], labelFz: 10, labelWeight: "bold", valFz: 15, innerGap: 3 };
    return {
      type: "widget", padding: 12, url: "hellobike://", backgroundGradient,
      children: [
        mkRow([mkIcon("fuelpump.circle.fill", C.main, 13), mkSpacer(4),
               mkText(`${regionName}油价`, 13, "heavy", C.main, { maxLines: 1, minScale: 0.8 }), mkSpacer()], 0),
        mkSpacer(10),
        { type: "stack", direction: "column", gap: 8, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 8, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 8, { flex: 1 })
        ]},
        mkSpacer(10),
        mkRow([ mkSpacer(), mkIcon("clock.fill", nextAdjust.isUrgent ? C.red : C.muted, 9),
                mkSpacer(3), mkText(`调价: ${nextAdjust.dateStr}`, 9, "bold", nextAdjust.isUrgent ? C.red : C.muted) ], 0)
      ]
    };
  }

  // ── 大号视图 ───────────────────────────────────────────────────────────
  if (isLarge) {
    const cardCfg = { radius: 16, padding: [0, 0, 0, 0], labelFz: 16, labelWeight: "heavy", valFz: 28, innerGap: 10 };
    const infoColor = nextAdjust.isUrgent ? C.red : C.gold;
    return {
      type: "widget", padding: 16, url: "hellobike://", backgroundGradient,
      children: [
        mkRow([
          mkIcon("fuelpump.circle.fill", C.main, 18), mkSpacer(4),
          mkText(`${regionName}油价`, 17, "heavy", C.main), mkSpacer(),
          mkText("下轮调价: ", 12, "medium", infoColor, { minScale: 0.8 }),
          mkText(nextAdjust.dateStr, 12, "bold", infoColor, { minScale: 0.8 }),
          mkText(` ${nextAdjust.countdown}`, 12, "bold", infoColor, { minScale: 0.8 })
        ], 0),

        mkSpacer(16),
        { type: "stack", direction: "column", gap: 12, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 })
        ]},
        mkSpacer(16),
        { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(12),

        mkRow([
          mkRow([mkIcon("arrow.triangle.2.circlepath", C.muted, 13), mkSpacer(4),
                 mkText(updateTimeStr, 11, "bold", C.muted, { family: "Menlo" })], 0),
          mkSpacer(),
          mkRow([mkText(trendLabel, 12, "medium", C.muted),
                 mkText(trendInfo, 12, "bold", trendColor, { maxLines: 1, minScale: 0.7 })], 2)
        ], 0)
      ]
    };
  }

  // ── 中号视图（默认） ───────────────────────────────────────────────────
  const cardCfgMed = { radius: 13, padding: [12, 6, 12, 6], labelFz: 11, labelWeight: "bold", valFz: 18, innerGap: 6 };
  const infoColorMed = nextAdjust.isUrgent ? C.red : C.gold;

  return {
    type: "widget", padding: 12, url: "hellobike://", backgroundGradient,
    children: [
      mkRow([
        mkIcon("fuelpump.circle.fill", C.main, 16), mkSpacer(2),
        mkText(`${regionName}油价`, 15, "heavy", C.main), mkSpacer(),
        mkText("下轮调价: ", 11, "medium", infoColorMed),
        mkText(nextAdjust.dateStr, 11, "bold", infoColorMed),
        mkText(` ${nextAdjust.countdown}`, 11, "bold", infoColorMed)
      ], 0),

      mkSpacer(12),
      mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 6),
      mkSpacer(12),
      { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
      mkSpacer(8),

      mkRow([
        mkRow([mkIcon("arrow.triangle.2.circlepath", C.muted, 11),
               mkText(updateTimeStr, 9, "bold", C.muted, { family: "Menlo" })], 4),
        mkSpacer(),
        mkRow([mkText(trendLabel, 11, "medium", C.muted),
               mkText(trendInfo, 11, "bold", trendColor, { maxLines: 1, minScale: 0.7 })], 2)
      ], 0)
    ]
  };
}