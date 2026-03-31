/**
 * ==========================================
 * 📌 时光倒数 (Countdown) 小组件
 *
 * ✨ 主要功能：
 * • 尺寸适配：支持 Small、Medium、Large 三种组件尺寸，区分紧凑列表与定宽多行列表排版。
 * • 节日计算：内置农历算法数组，支持计算法定节假日、民俗节日、国际节日、金融交割/行权日的倒计时。
 * • 时区基准：采用 UTC+8 固定时区进行绝对时间计算。
 * • 自定义配置：支持通过环境变量设置最多 6 个专属纪念日，支持修改清明节及春/秋假的起始日期。
 * • 排序与显示：支持按倒数天数及分类优先级进行排序，支持指定节日跨分类置顶。
 * • 状态响应：根据工作日、周末、节假日当天状态切换背景渐变色；当天节日提示于中大号标题栏显示，小号于分类行内显示。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * ⏱️ 更新时间: 2026.04.01 01:40
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

  // ── 环境变量解析 ────────────────────────────────────────────────────────
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

  const springDateStr   = getStr("SPRING_BREAK_DATE");
  const autumnDateStr   = getStr("AUTUMN_BREAK_DATE");
  const qingmingDateStr = getStr("QINGMING_DATE", "4/4");

  const pinnedHolidays = getStr("PINNED_HOLIDAY", "高考").split(",").map(s => s.trim()).filter(Boolean);

  const customDays = [1,2,3,4,5,6].map(i => ({
    name: getStr(`EXCLUSIVE_NAME_${i}`, i === 1 ? getStr("EXCLUSIVE_NAME", "我的生日") : ""),
    date: getStr(`EXCLUSIVE_DATE_${i}`, i === 1 ? getStr("EXCLUSIVE_DATE", "11/10") : "")
  })).filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 尺寸与色彩系统 ───────────────────────────────────────────────────────
  const family  = (ctx.widgetFamily || "systemMedium").toLowerCase();
  const isSmall = family.includes("small");
  const isLarge = family.includes("large");

  const C = {
    bgWorkday:   [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    bgWeekend:   [{ light: '#F4F8FF', dark: '#111827' }, { light: '#E6F2FF', dark: '#0B0F19' }],
    bgFest:      [{ light: '#FFF8EC', dark: '#2A1F0E' }, { light: '#FFEFD5', dark: '#1A1208' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF'  },
    sub:         { light: '#48484A', dark: '#D1D1D6'  },
    muted:       { light: '#8E8E93', dark: '#8E8E93'  },
    gold:        { light: '#B58A28', dark: '#D6A53A'  },
    red:         { light: '#CA3B32', dark: '#FF453A'  },
    blue:        { light: '#3A5F85', dark: '#5E8EB8'  },
    teal:        { light: '#628C7B', dark: '#73A491'  },
    transparent: '#00000000'
  };

  // ── UI 构建器 ──────────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) => ({ type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 绝对时区计算 (UTC+8) ─────────────────────────────────────────────────
  const bjDate = new Date(Date.now() + 8 * 3600000);
  const Y = bjDate.getUTCFullYear();
  const M = bjDate.getUTCMonth() + 1;
  const D = bjDate.getUTCDate();
  const currentHour = bjDate.getUTCHours();
  const currentDay  = bjDate.getUTCDay();
  const todayMs = Date.UTC(Y, M - 1, D);

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;

  const formatItemStr = (name, diff) => diff <= 0 ? `今日 ${name}` : `${name} ${diff}天`;

  // ── 核心日期推演算法 ─────────────────────────────────────────────────────
  const getFinanceDate = (y, monthIndex, nth, targetDow) => {
    const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
    let diff = targetDow - firstDow;
    if (diff < 0) diff += 7;
    return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
  };

  const nextFinanceDate = (nth, dow) => {
    let d = getFinanceDate(Y, M - 1, nth, dow);
    if (todayMs > d) {
      const nextMonthIdx = M === 12 ? 0 : M;
      const nextYear     = M === 12 ? Y + 1 : Y;
      d = getFinanceDate(nextYear, nextMonthIdx, nth, dow);
    }
    return d;
  };

  const getCustomDate = (y, dateStr, fallbackFn) => {
    if (!dateStr || typeof dateStr !== 'string') return fallbackFn ? fallbackFn() : null;
    const parts = dateStr.split("/");
    if (parts.length !== 2) return fallbackFn ? fallbackFn() : null;
    const m = Number(parts[0]), d = Number(parts[1]);
    if (!m || !d || m > 12 || d > 31) return fallbackFn ? fallbackFn() : null;
    return YMD(y, m, d);
  };

  const l2s = (y, m, d) => {
    ensureLunarCumulative(y + 1);
    let off = (lunarCumulativeCache.off.get(y) ?? 0);
    const lp = Lunar.info[y - 1900] & 0xf;
    for (let i = 1; i < m; i++) {
      off += Lunar.mDays(y, i);
      if (lp > 0 && i === lp) off += (Lunar.info[y - 1900] & 0x10000) ? 30 : 29;
    }
    const date = new Date(Date.UTC(1900, 0, 31) + (off + d - 1) * 86400000);
    return YMD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  };

  const getFests = (y) => {
    const term = n => {
      const t = Lunar.term(y, n);
      const bjT = new Date(t.getTime() + 8 * 3600000);
      return YMD(bjT.getUTCFullYear(), bjT.getUTCMonth() + 1, bjT.getUTCDate());
    };
    const wDay = (m, n, w) => {
      const f = new Date(Date.UTC(y, m - 1, 1));
      const x = w - f.getUTCDay();
      return YMD(y, m, 1 + (x < 0 ? x + 7 : x) + (n - 1) * 7);
    };

    const qmDateStr = getCustomDate(y, qingmingDateStr, () => term(7));

    const legal = [
      ["元旦",   YMD(y, 1, 1),  1], ["春节",   l2s(y, 1, 1),  3],
      ["清明节", qmDateStr,     1],
      ["劳动节", YMD(y, 5, 1),  1], ["端午节", l2s(y, 5, 5),  1],
      ["中秋节", l2s(y, 8, 15), 1], ["国庆节", YMD(y, 10, 1), 3]
    ];

    if (showSchoolHolidays) {
      const springDate = getCustomDate(y, springDateStr, () => {
        const [qy, qm, qd] = qmDateStr.split("/").map(Number);
        const s = new Date(Date.UTC(qy, qm - 1, qd - 3));
        return YMD(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate());
      });
      if (springDate) legal.push(["春假", springDate, 3]);

      const autumnDate = getCustomDate(y, autumnDateStr, () => {
        const nov1 = new Date(Date.UTC(y, 10, 1));
        return YMD(y, 11, 1 + ((3 - nov1.getUTCDay() + 7) % 7) + 7);
      });
      if (autumnDate) legal.push(["秋假", autumnDate, 3]);
    }

    const exclusive = [
      ...customDays.map(item => [item.name, getCustomDate(y, item.date), 1, "custom"]),
      ["高考", YMD(y, 6, 7), 2, "fixed"]
    ];

    return {
      legal,
      folk: [
        ["元宵节", l2s(y, 1, 15), 1], ["龙抬头", l2s(y, 2, 2),  1], ["七夕节", l2s(y, 7, 7),  1],
        ["中元节", l2s(y, 7, 15), 1], ["重阳节", l2s(y, 9, 9),  1], ["寒衣节", l2s(y, 10, 1), 1],
        ["腊八节", l2s(y, 12, 8), 1], ["小年",   l2s(y, 12, 23), 1], ["除夕",   l2s(y, 12, Lunar.mDays(y, 12)), 1]
      ],
      intl: [
        ["情人节", YMD(y, 2, 14), 1], ["妇女节", YMD(y, 3, 8),  1], ["母亲节", wDay(5, 2, 0), 1],
        ["儿童节", YMD(y, 6, 1),  1], ["父亲节", wDay(6, 3, 0), 1], ["万圣节", YMD(y, 10, 31),1],
        ["感恩节", wDay(11, 4, 4),1], ["平安夜", YMD(y, 12, 24),1], ["圣诞节", YMD(y, 12, 25),1]
      ],
      exclusive
    };
  };

  const festCache = new Map();
  const getFestsCached = (y) => {
    if (!festCache.has(y)) festCache.set(y, getFests(y));
    return festCache.get(y);
  };

  // ── 优先级运算系统 ───────────────────────────────────────────────────────
  const basePriority    = { legal: 3, folk: 2, intl: 1, exclusive: 2 };
  const specialPriority = { 春节: 10, 国庆节: 9, 高考: 9, 交割: 8, 行权: 8, 元旦: 7, 清明节: 7, 端午节: 7, 中秋节: 7, 春假: 6, 秋假: 6, 除夕: 6 };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    return specialPriority[name] !== undefined ? specialPriority[name] : (basePriority[cat] ?? 1);
  };

  // ── 核心数据运算 ────────────────────────────────────────────────────────
  const result = { legal: new Map(), folk: new Map(), intl: new Map(), exclusive: new Map() };
  const todayFests = new Set(), todayFinance = new Set(), pinnedMap = new Map();

  for (const y of [Y, Y + 1]) {
    const f = getFestsCached(y);
    for (const cat of Object.keys(result)) {
      const catMap = result[cat];
      for (const item of f[cat]) {
        const [name, dateStr, duration = 1, sourceKind = ""] = item;
        if (!dateStr) continue;
        const [yy, mm, dd] = dateStr.split("/").map(Number);
        const diff = Math.floor((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);

        if (diff <= 0) {
          if (diff > -duration) {
            todayFests.add(name);
            if (isSmall && !catMap.has(name)) {
              catMap.set(name, { name, diff, priority: getPriority(name, cat, sourceKind) + 100, cat });
            }
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

  // ── 金融日期独立处理（严格剔除跨年幽灵数据） ─────────────────────────────
  if (showFinanceDates) {
    const processFinance = (name, nth, dow) => {
      const ms   = nextFinanceDate(nth, dow);
      const d    = new Date(ms);
      const diff = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - todayMs) / 86400000);
      if (diff <= 0 && diff > -1 && currentHour < 15) {
        todayFinance.add(name);
        if (isSmall) result.exclusive.set(name, { name, diff, priority: getPriority(name, "exclusive") + 100, cat: "exclusive" });
      } else if (diff > 0) {
        result.exclusive.set(name, { name, diff, priority: getPriority(name, "exclusive"), cat: "exclusive" });
      }
    };
    processFinance("交割", 3, 5);
    processFinance("行权", 4, 3);
  }

  Object.keys(result).forEach(cat => {
    result[cat] = Array.from(result[cat].values())
      .filter(i => !pinnedMap.has(i.name))
      .sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff;
        return enablePrioritySort ? b.priority - a.priority : 0;
      });
  });

  const formatStr = (cat, limit) => result[cat].slice(0, limit).map(i => formatItemStr(i.name, i.diff)).join("，");

  // ── 标题栏通告逻辑（中大号） ───────────────────────────────────────────────
  const todayNoticeParts = [];
  if (todayFests.size > 0)   todayNoticeParts.push(`今日 ${Array.from(todayFests).slice(0, 2).join("·")}${todayFests.size > 2 ? "…" : ""}`);
  if (todayFinance.size > 0) todayNoticeParts.push(`今日 ${Array.from(todayFinance).join("·")}`);
  const todayNoticeText = todayNoticeParts.join(" ｜ ");

  const stickyParts = pinnedHolidays.filter(n => pinnedMap.has(n)).map(n => `${n} ${pinnedMap.get(n)}天`);
  const stickyText  = stickyParts.length > 0 ? `🔝 ${stickyParts.join("·")}` : "";

  const themeKey = (todayFests.size > 0 || todayFinance.size > 0) ? "fest"
    : (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) ? "weekend" : "workday";
  const backgroundGradient = {
    type: "linear",
    colors: themeKey === "fest" ? C.bgFest : themeKey === "weekend" ? C.bgWeekend : C.bgWorkday,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  // ── UI 渲染引擎 ──────────────────────────────────────────────────────────
  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red  },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  const splitTextToLines = (str, maxW) => {
    if (!str) return [];
    let lines = [], line = "", w = 0;
    for (const token of (str.match(/[\d\/a-zA-Z.\-]+|./gu) || [])) {
      const tw = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tw > maxW) {
        lines.push(line.replace(/^[，\s]+|[，\s]+$/g, ""));
        line = token; w = tw;
      } else { line += token; w += tw; }
    }
    if (line) lines.push(line.replace(/^[，\s]+|[，\s]+$/g, ""));
    return lines;
  };

  const createRowFactory = (config) => (iconName, color, label, rawText, isAlert) => {
    if (!rawText) return [];
    const lines = splitTextToLines(rawText, config.maxW);
    return lines.map((lineStr, idx) => ({
      type: "stack", direction: "row", alignItems: "start", gap: config.rowGap,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 2, width: config.lw, children: [
          mkIcon(idx === 0 ? iconName : "circle.fill", idx === 0 ? color : C.transparent, config.icz),
          mkText(idx === 0 ? label : " ", config.fz, "heavy", idx === 0 ? color : C.transparent)
        ]},
        mkText(lineStr, config.fz, "medium", isAlert && /(交割|行权) [1-3]天/.test(lineStr) ? C.red : C.sub, { flex: 1, maxLines: 1 })
      ]
    }));
  };

  // ── Small 尺寸渲染 ───────────────────────────────────────────────────────
  if (isSmall) {
    const pinnedNames = pinnedHolidays.filter(n => pinnedMap.has(n));
    const smallRows = CATEGORY_CONFIG.map(cfg => {
      const fests = result[cfg.key].filter(i => !pinnedNames.includes(i.name)).slice(0, 2);
      if (fests.length === 0) return null;
      return mkRow([
        mkIcon(cfg.icon, cfg.color, 13),
        mkText(fests.map(i => formatItemStr(i.name, i.diff)).join("，"), 12, "medium", cfg.color, { flex: 1, maxLines: 1 })
      ], 6);
    }).filter(Boolean);

    return {
      type: "widget", padding: 14, backgroundGradient,
      children: [
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 16),
          mkText("时光\n倒数", 14, "heavy", C.main, { maxLines: 2 }),
          mkSpacer(),
          ...(stickyParts.length > 0 ? [mkText(`🔝 ${stickyParts[0]}`, 11, "bold", C.red, { maxLines: 1 })] : [])
        ], 6),
        mkSpacer(10),
        { type: "stack", direction: "column", gap: 8, flex: 1, children: smallRows }
      ]
    };
  }

  // ── Medium & Large 尺寸渲染 ─────────────────────────────────────────────
  const layoutConfig = {
    fz: isLarge ? 14 : 12, icz: isLarge ? 15 : 13, lw: isLarge ? 60 : 52, maxW: isLarge ? 36 : 45,
    rowGap: isLarge ? 6 : 4, titleFz: isLarge ? 17 : 15, titleIcz: isLarge ? 18 : 16, topFz: isLarge ? 12 : 11.5
  };

  const buildRows = createRowFactory(layoutConfig);
  let gridRows = [];

  for (const cfg of CATEGORY_CONFIG) {
    const limit   = isLarge ? 7 : (cfg.key === "exclusive" ? 6 : 3);
    const rawText = formatStr(cfg.key, limit);
    if (!rawText) continue;
    gridRows.push(...buildRows(cfg.icon, cfg.color, cfg.label, rawText, cfg.key === "exclusive"));
  }

  // ── 构建标题栏右侧元素 (保留 sparkles 图标) ──────────────────────────────
  const rightHeaderElements = [];
  if (todayNoticeText) {
    rightHeaderElements.push(mkIcon("sparkles", C.red, layoutConfig.topFz));
    rightHeaderElements.push(mkText(todayNoticeText, layoutConfig.topFz, "bold", C.red));
  }
  if (stickyText) {
    if (todayNoticeText) rightHeaderElements.push(mkText(" ｜ ", layoutConfig.topFz, "bold", C.red));
    rightHeaderElements.push(mkText(stickyText, layoutConfig.topFz, "bold", C.red));
  }

  return {
    type: "widget", padding: isLarge ? 16 : 12, backgroundGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, layoutConfig.titleIcz),
        mkText("时光倒数", layoutConfig.titleFz, "heavy", C.main),
        mkSpacer(),
        ...(rightHeaderElements.length > 0 ? [mkRow(rightHeaderElements, 4)] : [])
      ], 6),
      mkSpacer(gridRows.length <= 4 ? 12 : 10),
      ...(gridRows.length > 0
        ? [{ type: "stack", direction: "column", alignItems: "start", gap: gridRows.length <= 4 ? (isLarge ? 14 : 11) : (isLarge ? 10 : 8), children: gridRows }]
        : [mkText("近期暂无倒计时", layoutConfig.fz, "medium", C.muted)]),
      mkSpacer()
    ]
  };
}
