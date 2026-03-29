/**
 * ==========================================
 * 📌 时光倒数 Widget
 *
 * ✨ 主要功能：
 * • 三尺寸自适应完美适配：
 *   - Small：左侧图标 + 紧凑双行节日（每类最多2个）
 *   - Medium：定宽标签列 + splitText 自动换行（每类最多3个）
 *   - Large：定宽标签列 + splitText 多行展开（每类最多7个）
 * • 多类别节日聚合：法定假日、民俗节日、国际节日、专属纪念日
 * • 内置智能计算：农历/节气、成都春秋假、A股交割日与行权日
 * • 自定义支持：专属纪念日（最多6个）、置顶节日、是否显示春秋假/金融日期
 * • 优先级排序 + 多节日置顶高亮
 * • 智能主题：今日节日暖色背景、周末独立蓝调背景
 * • 性能优化：Lunar常量顶级声明 + 累计天数预计算 + Map/Set 去重
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * ⏱️ 更新时间: 2026.03.29 20:48
 * ==========================================
 */

// ── 静态常量（顶级声明，只初始化一次） ─────────────────────────────────
const Lunar = {
  info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
  term(y, n) {
    return new Date((31556925974.7 * (y - 1900)) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000 + Date.UTC(1900,0,6,2,5));
  },
  lDays(y) {
    let s = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) s += (this.info[y - 1900] & i) ? 1 : 0;
    return s + ((this.info[y - 1900] & 0xf) ? ((this.info[y - 1900] & 0x10000) ? 30 : 29) : 0);
  },
  mDays(y, m) { return (this.info[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
};

// ── 累计天数预计算缓存 ───────────────────────────────────────────────────
let lunarCumulativeCache = null;
function ensureLunarCumulative(maxYear) {
  if (lunarCumulativeCache && lunarCumulativeCache.maxYear >= maxYear) return;
  lunarCumulativeCache = { maxYear, off: new Map() };
  let off = 0;
  for (let i = 1900; i <= maxYear; i++) {
    lunarCumulativeCache.off.set(i, off);
    off += Lunar.lDays(i);
  }
}

export default async function (ctx) {
  const env = ctx.env ?? {};

  // ── 环境变量批量解析 ─────────────────────────────────────────────────
  const getBool = (key, defaultVal = true) => {
    const v = env[key];
    if (v === undefined || v === null || String(v).trim() === "") return defaultVal;
    return String(v).trim().toLowerCase() !== "false";
  };
  const getStr = (key, defaultVal = "") => String(env[key] ?? defaultVal).trim();

  const showSchoolHolidays    = getBool("SHOW_SCHOOL_HOLIDAYS", true);
  const showFinanceDates      = getBool("SHOW_FINANCE_DATES", true);
  const enablePrioritySort    = getBool("ENABLE_PRIORITY_SORT", true);
  const enableExclusiveWeight = getBool("ENABLE_EXCLUSIVE_WEIGHT", true);
  const enableWeekendTheme    = getBool("ENABLE_WEEKEND_THEME", true);

  const springDateStr = getStr("SPRING_BREAK_DATE");
  const autumnDateStr = getStr("AUTUMN_BREAK_DATE");

  const pinnedHolidays = getStr("PINNED_HOLIDAY", "高考")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const customDays = [1,2,3,4,5,6].map(i => ({
    name: getStr(`EXCLUSIVE_NAME_${i}`, i === 1 ? getStr("EXCLUSIVE_NAME", "我的生日") : ""),
    date: getStr(`EXCLUSIVE_DATE_${i}`, i === 1 ? getStr("EXCLUSIVE_DATE", "11/10") : "")
  })).filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 尺寸检测 ──────────────────────────────────────────────────────────
  const family  = ctx.widgetFamily ?? "systemMedium";
  const isSmall = family === "systemSmall";
  const isLarge = family === "systemLarge";

  // ── 色彩令牌 ──────────────────────────────────────────────────────────
  const C = {
    bgWorkday: { light: "#FFFFFF", dark: "#1C1C1E" },
    bgWeekend: { light: "#F4F8FF", dark: "#111827" },
    bgFest:    { light: "#FFF8EC", dark: "#2A1F0E" },
    main:      { light: "#1C1C1E", dark: "#FFFFFF"  },
    sub:       { light: "#48484A", dark: "#D1D1D6"  },
    muted:     { light: "#8E8E93", dark: "#8E8E93"  },
    gold:      { light: "#B58A28", dark: "#D6A53A"  },
    red:       { light: "#CA3B32", dark: "#FF453A"  },
    blue:      { light: "#3A5F85", dark: "#5E8EB8"  },
    teal:      { light: "#628C7B", dark: "#73A491"  }
  };

  // ── UI 辅助函数 ────────────────────────────────────────────────────────
  const txt = (text, size, weight, color, opts = {}) => ({
    type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts
  });
  const hstack = (children, gap = 4, opts = {}) => ({
    type: "stack", direction: "row", alignItems: "center", gap, children, ...opts
  });
  const vstack = (children, gap = 4, opts = {}) => ({
    type: "stack", direction: "column", gap, children, ...opts
  });
  const icon = (name, color, size = 13) => ({
    type: "image", src: `sf-symbol:${name}`, color, width: size, height: size
  });
  const spacer = len => len != null ? { type: "spacer", length: len } : { type: "spacer" };

  // ── 时间基准 ───────────────────────────────────────────────────────────
  const tzOffset  = new Date().getTimezoneOffset();
  const now       = new Date(Date.now() + (tzOffset + 480) * 60000);
  const Y         = now.getFullYear();
  const M         = now.getMonth() + 1;
  const currentHour = now.getHours();
  const currentDay  = now.getDay();
  const todayMs   = Date.UTC(Y, M - 1, now.getDate());

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;

  // ── 统一使用"X天"显示 ──────────────────────────────────────────────────
  const formatDiff = d => `${d}天`;

  // ── 金融交割日推算 ─────────────────────────────────────────────────────
  const getFinanceDate = (y, monthIndex, nth, targetDow) => {
    const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
    let diff = targetDow - firstDow;
    if (diff < 0) diff += 7;
    return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
  };

  // ── 自定义日期解析 ─────────────────────────────────────────────────────
  const getCustomDate = (y, dateStr, defaultCalc) => {
    const parts = getStr(dateStr, "").split("/");
    if (parts.length !== 2) return defaultCalc();
    const m = Number(parts[0]);
    const d = Number(parts[1]);
    if (!m || !d) return defaultCalc();
    return YMD(y, m, d);
  };

  // ── 农历 l2s（累计天数优化版） ──────────────────────────────────────────
  const l2s = (y, m, d) => {
    ensureLunarCumulative(y + 1);
    const offBase = lunarCumulativeCache.off.get(y) ?? 0;
    let off = offBase;
    const lp = Lunar.info[y - 1900] & 0xf;
    for (let i = 1; i < m; i++) {
      off += Lunar.mDays(y, i);
      if (lp > 0 && i === lp) off += (Lunar.info[y - 1900] & 0x10000) ? 30 : 29;
    }
    const date = new Date(Date.UTC(1900, 0, 31) + (off + d - 1) * 86400000);
    return YMD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  };

  // ── 节日数据生成 ────────────────────────────────────────────────────────
  const getFests = (y) => {
    const term = n => {
      const t = Lunar.term(y, n);
      return YMD(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
    };
    const wDay = (m, n, w) => {
      const f = new Date(Date.UTC(y, m - 1, 1));
      const dd = f.getUTCDay();
      const x = w - dd;
      return YMD(y, m, 1 + (x < 0 ? x + 7 : x) + (n - 1) * 7);
    };

    const legal = [
      ["元旦",   YMD(y, 1, 1),        1],
      ["春节",   l2s(y, 1, 1),        3],
      ["清明节", term(7),              1],
      ["劳动节", YMD(y, 5, 1),        1],
      ["端午节", l2s(y, 5, 5),        1],
      ["中秋节", l2s(y, 8, 15),       1],
      ["国庆节", YMD(y, 10, 1),       3]
    ];

    if (showSchoolHolidays) {
      legal.push(["春假", getCustomDate(y, springDateStr, () => {
        const qm = Lunar.term(y, 7);
        const sb = new Date(qm.getTime() - 3 * 86400000);
        return YMD(sb.getUTCFullYear(), sb.getUTCMonth() + 1, sb.getUTCDate());
      }), 3]);
      legal.push(["秋假", getCustomDate(y, autumnDateStr, () => {
        const nov1 = new Date(Date.UTC(y, 10, 1));
        const offset = (3 - nov1.getUTCDay() + 7) % 7;
        return YMD(y, 11, 1 + offset + 7);
      }), 3]);
    }

    const exclusive = [
      ...customDays.map(item => {
        const [em, ed] = item.date.split("/").map(Number);
        return [item.name, YMD(y, em, ed), 1, "custom"];
      }),
      ["高考", YMD(y, 6, 7), 2, "fixed"]
    ];

    if (showFinanceDates) {
      const nextMonth = y === Y && M === 12 ? 0 : (y === Y ? M : 0);
      const nextYear  = y === Y && M === 12 ? Y + 1 : y;

      let futuresMs = getFinanceDate(y, M - 1, 3, 5);
      if (todayMs > futuresMs) futuresMs = getFinanceDate(nextYear, nextMonth, 3, 5);
      const fd = new Date(futuresMs);
      exclusive.push(["交割", YMD(fd.getUTCFullYear(), fd.getUTCMonth() + 1, fd.getUTCDate()), 1]);

      let optionsMs = getFinanceDate(y, M - 1, 4, 3);
      if (todayMs > optionsMs) optionsMs = getFinanceDate(nextYear, nextMonth, 4, 3);
      const od = new Date(optionsMs);
      exclusive.push(["行权", YMD(od.getUTCFullYear(), od.getUTCMonth() + 1, od.getUTCDate()), 1]);
    }

    return {
      legal,
      folk: [
        ["元宵节", l2s(y, 1, 15), 1], ["龙抬头", l2s(y, 2, 2),  1], ["七夕节", l2s(y, 7, 7),  1],
        ["中元节", l2s(y, 7, 15), 1], ["重阳节", l2s(y, 9, 9),  1], ["寒衣节", l2s(y, 10, 1), 1],
        ["腊八节", l2s(y, 12, 8), 1], ["小年",   l2s(y, 12, 23), 1],
        ["除夕",   l2s(y, 12, Lunar.mDays(y, 12)), 1]
      ],
      intl: [
        ["情人节", YMD(y, 2, 14),    1], ["妇女节", YMD(y, 3, 8),    1],
        ["儿童节", YMD(y, 6, 1),     1], ["母亲节", wDay(5, 2, 0),   1],
        ["父亲节", wDay(6, 3, 0),    1], ["万圣节", YMD(y, 10, 31),  1],
        ["感恩节", wDay(11, 4, 4),   1], ["平安夜", YMD(y, 12, 24),  1],
        ["圣诞节", YMD(y, 12, 25),   1]
      ],
      exclusive
    };
  };

  const festCache = new Map();
  const getFestsCached = (y) => {
    if (!festCache.has(y)) festCache.set(y, getFests(y));
    return festCache.get(y);
  };

  // ── 优先级配置 ──────────────────────────────────────────────────────────
  const basePriority = { legal: 3, folk: 2, intl: 1, exclusive: 2 };
  const specialPriority = {
    春节: 10, 国庆节: 9, 高考: 9,
    交割: 8,  行权: 8,
    元旦: 7,  清明节: 7, 端午节: 7, 中秋节: 7,
    春假: 6,  秋假: 6,   除夕: 6
  };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    return specialPriority[name] !== undefined ? specialPriority[name] : (basePriority[cat] ?? 1);
  };

  // ── 核心数据运算 ────────────────────────────────────────────────────────
  const result = { legal: new Map(), folk: new Map(), intl: new Map(), exclusive: new Map() };
  const todayFests   = new Set();
  const todayFinance = new Set();
  const pinnedMap    = new Map();

  for (const y of [Y, Y + 1]) {
    const f = getFestsCached(y);
    for (const cat of Object.keys(result)) {
      const catMap = result[cat];
      for (const item of f[cat]) {
        const [name, dateStr, duration = 1, sourceKind = ""] = item;
        if (!dateStr) continue;
        const parts = dateStr.split("/").map(Number);
        if (parts.length !== 3) continue;
        const [yy, mm, dd] = parts;
        const diff = Math.floor((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);

        if (diff <= 0) {
          if (diff > -duration) {
            const isFinance = name === "交割" || name === "行权";
            if (isFinance && currentHour < 15) todayFinance.add(name);
            else if (!isFinance) todayFests.add(name);
          }
          continue;
        }

        if (pinnedHolidays.includes(name) && diff <= 200) {
          if (!pinnedMap.has(name) || diff < pinnedMap.get(name)) pinnedMap.set(name, diff);
        }

        if (!catMap.has(name)) {
          catMap.set(name, { name, diff, priority: getPriority(name, cat, sourceKind), cat });
        }
      }
    }
  }

  Object.keys(result).forEach(cat => {
    result[cat] = Array.from(result[cat].values()).sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      return enablePrioritySort ? b.priority - a.priority : 0;
    });
  });

  const formatStr = (cat, limit) =>
    result[cat].slice(0, limit).map(i => `${i.name} ${formatDiff(i.diff)}`).join("，");

  // ── 高亮通知 ────────────────────────────────────────────────────────────
  const todayNoticeParts = [];
  if (todayFests.size > 0)
    todayNoticeParts.push(`今日 🎉 ${Array.from(todayFests).slice(0, 2).join("·")}${todayFests.size > 2 ? "…" : ""}`);
  if (todayFinance.size > 0)
    todayNoticeParts.push(`今日 🚨 ${Array.from(todayFinance).join("·")}`);
  const todayNoticeText = todayNoticeParts.join(" ｜ ");

  const stickyParts = pinnedHolidays
    .filter(n => pinnedMap.has(n))
    .map(n => `${n} ${formatDiff(pinnedMap.get(n))}`);
  const stickyText = stickyParts.length > 0 ? `🔝 ${stickyParts.join("·")}` : "";

  // ── 主题 ────────────────────────────────────────────────────────────────
  const themeKey = (todayFests.size > 0 || todayFinance.size > 0) ? "fest"
    : (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) ? "weekend"
    : "workday";

  const bg = themeKey === "fest" ? C.bgFest : themeKey === "weekend" ? C.bgWeekend : C.bgWorkday;
  const backgroundGradient = {
    type: "linear", colors: [bg, bg],
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  // ── 分类配置表 ───────────────────────────────────────────────────────────
  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red  },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  // ── Small 尺寸 ───────────────────────────────────────────────────────────
  if (isSmall) {
    const pinnedNames = pinnedHolidays.filter(n => pinnedMap.has(n));
    const smallRows = [];

    for (const cfg of CATEGORY_CONFIG) {
      const fests = result[cfg.key].filter(i => !pinnedNames.includes(i.name)).slice(0, 2);
      if (fests.length === 0) continue;
      const rowText = fests.map(i => `${i.name} ${formatDiff(i.diff)}`).join("，");
      smallRows.push(
        hstack([
          icon(cfg.icon, cfg.color, 13),
          txt(rowText, 12, "medium", cfg.color, { flex: 1, maxLines: 1, minScale: 0.8 })
        ], 6)
      );
    }

    const stickyPartsSmall = pinnedHolidays
      .filter(n => pinnedMap.has(n))
      .map(n => `${n} ${formatDiff(pinnedMap.get(n))}`);

    let topElement = null;
    if (stickyPartsSmall.length > 0) {
      topElement = txt(`🔝 ${stickyPartsSmall[0]}`, 12, "bold", C.red, { minScale: 0.8, maxLines: 1 });
    } else if (todayNoticeText) {
      topElement = txt(todayNoticeText, 11, "bold", C.red, { minScale: 0.8, maxLines: 1 });
    }

    return {
      type: "widget", padding: 14, backgroundGradient,
      children: [
        hstack([
          icon("hourglass.circle.fill", C.main, 16),
          txt("时光\n倒数", 14, "heavy", C.main, { maxLines: 2 }),
          spacer(),
          ...(topElement ? [topElement] : [])
        ], 6),
        spacer(10),
        vstack(smallRows, 8, { flex: 1, justifyContent: "center" })
      ]
    };
  }

  // ── Medium & Large 尺寸 ─────────────────────────────────────────────────
  const fz       = isLarge ? 14 : 12;
  const icz      = isLarge ? 15 : 13;
  const lw       = isLarge ? 60 : 52;
  const rowGap   = isLarge ? 6  : 4;
  const titleFz  = isLarge ? 17 : 15;
  const titleIcz = isLarge ? 18 : 16;
  const topFz    = isLarge ? 12 : 11.5;

  const buildRow = (iconName, color, label, content, isFirst, contentColor = C.sub) => ({
    type: "stack", direction: "row", alignItems: "start", gap: rowGap,
    children: [
      {
        type: "stack", direction: "row", alignItems: "center", gap: 2, width: lw,
        children: [
          icon(isFirst ? iconName : "circle.fill", isFirst ? color : "#00000000", icz),
          txt(isFirst ? label : " ", fz, "heavy", isFirst ? color : "#00000000")
        ]
      },
      txt(content, fz, "medium", contentColor, { flex: 1 })
    ]
  });

  const splitText = (str, maxW) => {
    const text = String(str ?? "");
    if (!text) return [];
    let lines = [], cur = "", w = 0;
    const tokens = text.match(/[\d\/a-zA-Z.\-]+|./gu) || [];
    for (const token of tokens) {
      const tw = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tw > maxW) {
        lines.push(cur.replace(/[，\s]+$/, ""));
        cur = token.replace(/^[，\s]+/, "");
        w = tw;
      } else {
        cur += token;
        w += tw;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const gridRows = [];
  const maxW = isLarge ? 36 : 45;

  for (const cfg of CATEGORY_CONFIG) {
    const isExc = cfg.key === "exclusive";
    const limit = isLarge ? 7 : (isExc ? 6 : 3);
    const rawText = formatStr(cfg.key, limit);
    if (!rawText) continue;

    if (isLarge || isExc) {
      const lines = splitText(rawText, maxW);
      lines.forEach((line, idx) => {
        const isAlert = isExc && /(交割|行权) [1-3]天/.test(line);
        gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, line, idx === 0, isAlert ? C.red : C.sub));
      });
    } else {
      gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, rawText, true, C.sub));
    }
  }

  const dynamicGap = gridRows.length <= 4 ? (isLarge ? 14 : 11) : (isLarge ? 10 : 8);

  return {
    type: "widget",
    padding: isLarge ? 16 : 12,
    backgroundGradient,
    children: [
      hstack([
        icon("hourglass.circle.fill", C.main, titleIcz),
        txt("时光倒数", titleFz, "heavy", C.main),
        spacer(),
        ...(stickyText ? [txt(stickyText, topFz, "bold", C.red, { maxLines: 1, minScale: 0.8 })] : [])
      ], 6),

      spacer(todayNoticeText ? (isLarge ? 10 : 8) : (gridRows.length <= 4 ? 12 : 10)),

      ...(todayNoticeText ? [
        hstack([
          icon("sparkles", C.red, 13),
          txt(todayNoticeText, 12, "bold", C.red, { maxLines: 1, minScale: 0.8 })
        ], 4),
        spacer(isLarge ? 10 : 8)
      ] : []),

      ...(gridRows.length > 0
        ? [{ type: "stack", direction: "column", alignItems: "start", gap: dynamicGap, children: gridRows }]
        : [txt("近期暂无倒计时", fz, "medium", C.muted)]),

      spacer()
    ]
  };
}