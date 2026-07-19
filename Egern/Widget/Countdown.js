/**
 * ==========================================
 * 📌 Egern 时光倒数 (Countdown) 小组件
 *
 * 功能特性：
 * - 自动适配 Small / Medium / Large 三种尺寸，呈现不同排版风格。
 * - 内置农历算法，覆盖法定假日、传统节日、国际节日及金融交割/行权日。
 * - 基于 UTC+8 时区进行精确的倒计时计算（剩余天数）。
 * - 支持最多 6 个自定义纪念日，可单独配置清明节、春假、秋假日期。
 * - 支持节日按天数及优先级排序，并可将指定节日跨分类置顶显示。
 * - 根据工作日/周末/当天节日状态自动切换背景渐变色。
 * - 小号模式：今日节日独立高亮，其余按天数排序，可配置置顶数量与天数范围；中大号模式：分组展示，自适应裁剪。
 *
 * 环境变量 (可选)：
 * - EXCLUSIVE_NAME_1~6 / EXCLUSIVE_DATE_1~6 : 自定义纪念日
 * - PINNED_HOLIDAY : 置顶节日（逗号分隔）
 * - PINNED_MAX_DAYS : 置顶节日最大提前天数，默认 90
 * - PINNED_MAX_SHOW  : 置顶节日最多显示个数，默认 2（超出显示“等N个”）
 * - QINGMING_DATE / SPRING_BREAK_DATE / AUTUMN_BREAK_DATE : 自定义假期日期
 * - SHOW_SCHOOL_HOLIDAYS / SHOW_FINANCE_DATES / ENABLE_PRIORITY_SORT / ENABLE_EXCLUSIVE_WEIGHT / ENABLE_WEEKEND_THEME : 功能开关
 * - SMALL_MAX_ITEMS : 小尺寸最大显示条目数，默认 11
 *
 * 仓库地址: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * 更新时间: 2026.07.19 19:00
 * ==========================================
 */

// ═══════════════════════════════════════════════
//  农历算法核心（数据表 1900-2100）
// ═══════════════════════════════════════════════
const Lunar = {
  // 每 16bit 编码一年：低 4 bit 闰月月份（0 表示无闰），高 12 bit 每月大小月标记（1 大 0 小）
  info: [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ],
  term(y, n) {
    return new Date(
      (31556925974.7 * (y - 1900)) +
      [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,
       218072,240693,263343,285989,308563,331033,353350,375494,397447,
       419210,440795,462224,483532,504758][n-1] * 60000 +
      Date.UTC(1900,0,6,2,5)
    );
  },
  lDays(y) {
    const idx = y - 1900;
    if (idx < 0 || idx >= this.info.length) return 365;
    let s = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) s += (this.info[idx] & i) ? 1 : 0;
    return s + ((this.info[idx] & 0xf) ? ((this.info[idx] & 0x10000) ? 30 : 29) : 0);
  },
  mDays(y, m) {
    const idx = y - 1900;
    if (idx < 0 || idx >= this.info.length) return 30;
    return (this.info[idx] & (0x10000 >> m)) ? 30 : 29;
  }
};

// ═══════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════

function estimateCharWidth(ch, smallMode = false) {
  const code = ch.charCodeAt(0);
  if (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xff00 && code <= 0xffef)
  ) return 1;
  if (/[，。！？、；：“”‘’（）…—·《》]/.test(ch)) return 0.3;
  return smallMode ? 0.6 : 0.55;
}

function estimateTextLines(text, fontSize, availableWidth, smallMode = false) {
  if (!text || availableWidth <= 0) return 1;
  let totalWidth = 0;
  for (const ch of text) totalWidth += estimateCharWidth(ch, smallMode) * fontSize;
  return Math.max(1, Math.ceil(totalWidth / availableWidth));
}

// ═══════════════════════════════════════════════
//  主组件
// ═══════════════════════════════════════════════
export default async function (ctx) {
  const env = ctx.env ?? {};
  const getBool = (key, defaultVal = true) => {
    const v = env[key];
    if (v === undefined || v === null || String(v).trim() === "") return defaultVal;
    return String(v).trim().toLowerCase() !== "false";
  };
  const getStr = (key, defaultVal = "") => String(env[key] ?? defaultVal).trim();
  const getNum = (key, defaultVal) => {
    const v = getStr(key);
    if (v === "") return defaultVal;
    const n = parseInt(v, 10);
    return isNaN(n) ? defaultVal : n;
  };

  const showSchoolHolidays    = getBool("SHOW_SCHOOL_HOLIDAYS", true);
  const showFinanceDates      = getBool("SHOW_FINANCE_DATES", true);
  const enablePrioritySort    = getBool("ENABLE_PRIORITY_SORT", true);
  const enableExclusiveWeight = getBool("ENABLE_EXCLUSIVE_WEIGHT", true);
  const enableWeekendTheme    = getBool("ENABLE_WEEKEND_THEME", true);

  const pinnedMaxDays   = getNum("PINNED_MAX_DAYS", 90);
  const pinnedMaxShow   = getNum("PINNED_MAX_SHOW", 2);
  const smallMaxItems   = getNum("SMALL_MAX_ITEMS", 11);

  const springDateStr   = getStr("SPRING_BREAK_DATE");
  const autumnDateStr   = getStr("AUTUMN_BREAK_DATE");
  const qingmingDateStr = getStr("QINGMING_DATE", "4/4");
  const pinnedHolidays  = getStr("PINNED_HOLIDAY").split(",").map(s => s.trim()).filter(Boolean);

  const customDays = [1,2,3,4,5,6].map(i => ({
    name: getStr(`EXCLUSIVE_NAME_${i}`, i === 1 ? getStr("EXCLUSIVE_NAME", "我的生日") : ""),
    date: getStr(`EXCLUSIVE_DATE_${i}`, i === 1 ? getStr("EXCLUSIVE_DATE", "11/10") : "")
  })).filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  const family  = (ctx.widgetFamily || "systemMedium").toLowerCase();
  const isSmall = family.includes("small");
  const isLarge = family.includes("large");

  const widgetWidth  = ctx.size?.width  ?? (isSmall ? 155 : isLarge ? 329 : 329);
  const widgetHeight = ctx.size?.height ?? (isSmall ? 155 : isLarge ? 345 : 155);

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

  const mkText   = (text, size, weight, color, opts = {}) => ({ type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  const bjDate = new Date(Date.now() + 8 * 3600000);
  const Y = bjDate.getUTCFullYear();
  const M = bjDate.getUTCMonth() + 1;
  const D = bjDate.getUTCDate();
  const currentHour = bjDate.getUTCHours();
  const currentDay  = bjDate.getUTCDay();
  const todayMs = Date.UTC(Y, M - 1, D);

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;
  const formatItemStr = (name, diff) => diff <= 0 ? `${name}` : `${name} ${diff}天`;
  const pad = n => String(n).padStart(2, '0');
  const refreshTimeStr = `${pad(M)}.${pad(D)} ${pad(currentHour)}:${pad(bjDate.getUTCMinutes())}`;
  const smallRefreshTimeStr = `${pad(M)}.${pad(D)}`;

  const isValidDate = (y, m, d) => {
    const test = new Date(Date.UTC(y, m - 1, d));
    return test.getUTCMonth() + 1 === m && test.getUTCDate() === d;
  };

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
    if (!m || !d || !isValidDate(y, m, d)) return fallbackFn ? fallbackFn() : null;
    return YMD(y, m, d);
  };

  let lunarCumulativeCache = null;
  function ensureLunarCumulative(maxYear) {
    if (!lunarCumulativeCache) {
      lunarCumulativeCache = { maxYear: 1900, off: new Map([[1900, 0]]) };
    }
    let y = lunarCumulativeCache.maxYear;
    while (y < maxYear) {
      if (y - 1900 >= Lunar.info.length) break;
      const currentOff = lunarCumulativeCache.off.get(y);
      lunarCumulativeCache.off.set(y + 1, currentOff + Lunar.lDays(y));
      lunarCumulativeCache.maxYear = y + 1;
      y++;
    }
  }

  const l2s = (y, m, d) => {
    ensureLunarCumulative(y + 1);
    let off = lunarCumulativeCache.off.get(y) ?? 0;
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
      ...customDays.map(item => [item.name, getCustomDate(y, item.date), 1, "custom"])
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

  const basePriority    = { legal: 3, folk: 2, intl: 1, exclusive: 2 };
  const specialPriority = { 春节: 10, 国庆节: 9, 交割: 8, 行权: 8, 元旦: 7, 清明节: 7, 端午节: 7, 中秋节: 7, 春假: 6, 秋假: 6, 除夕: 6 };
  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    return specialPriority[name] !== undefined ? specialPriority[name] : (basePriority[cat] ?? 1);
  };

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
            if (isSmall && !catMap.has(name)) catMap.set(name, { name, diff, priority: getPriority(name, cat, sourceKind) + 100, cat });
          }
          continue;
        }
        if (pinnedHolidays.includes(name) && diff <= pinnedMaxDays) {
          if (!pinnedMap.has(name) || diff < pinnedMap.get(name)) pinnedMap.set(name, diff);
        }
        if (!catMap.has(name)) catMap.set(name, { name, diff, priority: getPriority(name, cat, sourceKind), cat });
      }
    }
  }

  if (showFinanceDates) {
    const processFinance = (name, nth, dow) => {
      const ms   = nextFinanceDate(nth, dow);
      const d    = new Date(ms);
      const diff = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - todayMs) / 86400000);
      if (diff <= 0 && diff > -1 && currentHour < 15) {
        todayFinance.add(name);
        if (isSmall) result.exclusive.set(name, { name, diff, priority: getPriority(name, "exclusive") + 100, cat: "exclusive" });
      } else if (diff > 0) result.exclusive.set(name, { name, diff, priority: getPriority(name, "exclusive"), cat: "exclusive" });
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

  const themeKey = (todayFests.size > 0 || todayFinance.size > 0) ? "fest"
    : (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) ? "weekend" : "workday";
  const backgroundGradient = {
    type: "linear",
    colors: themeKey === "fest" ? C.bgFest : themeKey === "weekend" ? C.bgWeekend : C.bgWorkday,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 }
  };

  // ══════════════════════════════════════════════
  //  Small 布局
  // ══════════════════════════════════════════════
  if (isSmall) {
    let futureItems = [];
    Object.keys(result).forEach(cat => futureItems.push(...result[cat]));
    futureItems.sort((a, b) => a.diff - b.diff);

    const pinnedEntries = [];
    pinnedMap.forEach((diff, name) => pinnedEntries.push({ name, diff }));
    pinnedEntries.sort((a, b) => a.diff - b.diff);
    const displayPins = pinnedEntries.slice(0, pinnedMaxShow);

    const todayNames = [...todayFests, ...todayFinance];
    let todayPrefix = "";
    if (todayNames.length > 0) {
      todayPrefix = `🔔 今日 ${todayNames.join("·")}`;
    }

    let displayItems = [...displayPins, ...futureItems];
    let textParts = [];
    if (todayPrefix) textParts.push(todayPrefix);
    const limit = todayPrefix ? smallMaxItems - 1 : smallMaxItems;
    const restText = displayItems.slice(0, limit).map(i => formatItemStr(i.name, i.diff)).join("，");
    if (restText) textParts.push(restText);
    const smallText = textParts.join(" ｜ ");

    const padding = 12;
    const titleHeight = 20;
    const gapTitleBody = 16;
    const fontSize = 12;
    const textAvailableWidth = widgetWidth - padding * 2;
    const lineHeight = fontSize * 1.5;
    let lines = estimateTextLines(smallText, fontSize, textAvailableWidth, true);
    const textAvailableHeight = widgetHeight - padding * 2 - titleHeight - gapTitleBody;

    let lineSpacing = 0;
    if (lines > 1) {
      let idealSpacing = (textAvailableHeight - lineHeight * lines) / (lines - 1);
      const maxSpacing = lines <= 3 ? 14 : lines === 4 ? 12 : lines === 5 ? 10 : 8;
      lineSpacing = Math.min(idealSpacing, maxSpacing);
      lineSpacing = Math.max(0, lineSpacing);
      while (lineSpacing > 0 && (lineHeight * lines + lineSpacing * (lines - 1)) > (textAvailableHeight - 2)) {
        lineSpacing = Math.max(0, lineSpacing - 1);
      }
    }

    return {
      type: "widget", padding, backgroundGradient,
      children: [
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 14),
          mkText("时光倒数", 13, "heavy", C.main, { maxLines: 1 }),
          mkSpacer(),
          mkIcon("arrow.clockwise", C.muted, 10),
          mkText(smallRefreshTimeStr, 10, "medium", C.muted, { maxLines: 1 })
        ], 4),
        mkSpacer(gapTitleBody),
        mkText(smallText, fontSize, "medium", C.sub, { lineLimit: 0, lineSpacing })
      ]
    };
  }

  // ══════════════════════════════════════════════
  //  Medium / Large 布局
  // ══════════════════════════════════════════════
  const todayNoticeParts = [];
  if (todayFests.size > 0)   todayNoticeParts.push(`今日 ${Array.from(todayFests).join("·")}`);
  if (todayFinance.size > 0) todayNoticeParts.push(`今日 ${Array.from(todayFinance).join("·")}`);
  let todayNoticeText = todayNoticeParts.join(" ｜ ");
  if (todayNoticeText.length > 18) todayNoticeText = todayNoticeText.slice(0, 18) + "…";

  const stickyList = pinnedHolidays.filter(n => pinnedMap.has(n)).slice(0, pinnedMaxShow);
  let stickyText = "";
  if (stickyList.length > 0) {
    stickyText = `🔝 ${stickyList.map(n => `${n} ${pinnedMap.get(n)}天`).join("·")}`;
    if (stickyText.length > 18) stickyText = stickyText.slice(0, 18) + "…";
  }

  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red  },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  const layoutConfig = {
    fz: isLarge ? 14 : 12,
    icz: isLarge ? 15 : 13,
    lw: isLarge ? 60 : 52,
    titleFz: isLarge ? 17 : 15,
    titleIcz: isLarge ? 18 : 16,
    topFz: isLarge ? 12 : 11.5
  };

  const padding = isLarge ? 16 : 12;
  const titleAreaHeight = layoutConfig.titleFz * 1.4 + 6;
  const gapHeaderGrid = 14;
  const gridAvailableHeight = widgetHeight - padding * 2 - titleAreaHeight - gapHeaderGrid;

  let textsWithMeta = CATEGORY_CONFIG.map(cfg => {
    const limit = cfg.key === "exclusive" ? 7 : (isLarge ? 7 : 3);
    const rawText = formatStr(cfg.key, limit);
    if (!rawText) return null;
    const lines = estimateTextLines(rawText, layoutConfig.fz, widgetWidth - padding * 2 - layoutConfig.lw - 4);
    return { cfg, rawText, lines, limit };
  }).filter(Boolean);

  let totalLines = textsWithMeta.reduce((sum, m) => sum + m.lines, 0);
  const lineHeight = layoutConfig.fz * 1.5;

  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (totalLines * lineHeight <= gridAvailableHeight - 2) break;
    const exclIdx = textsWithMeta.findIndex(m => m.cfg.key === 'exclusive');
    if (exclIdx === -1) break;
    const excl = textsWithMeta[exclIdx];
    if (excl.limit <= 1) break;
    excl.limit -= 1;
    excl.rawText = formatStr('exclusive', excl.limit);
    if (!excl.rawText) break;
    excl.lines = estimateTextLines(excl.rawText, layoutConfig.fz, widgetWidth - padding * 2 - layoutConfig.lw - 4);
    totalLines = textsWithMeta.reduce((sum, m) => sum + m.lines, 0);
  }

  let dynamicLineSpacing = 0;
  if (totalLines > textsWithMeta.length) {
    const totalGaps = totalLines - textsWithMeta.length;
    const idealSpacing = (gridAvailableHeight - lineHeight * totalLines) / totalGaps;
    dynamicLineSpacing = Math.min(idealSpacing, totalLines <= 3 ? 14 : totalLines === 4 ? 12 : totalLines === 5 ? 10 : 8);
    dynamicLineSpacing = Math.max(0, dynamicLineSpacing);
    while (dynamicLineSpacing > 0 && (lineHeight * totalLines + dynamicLineSpacing * totalGaps) > (gridAvailableHeight - 2)) {
      dynamicLineSpacing = Math.max(0, dynamicLineSpacing - 0.5);
    }
  }

  const gridRows = textsWithMeta.map(({ cfg, rawText }) => {
    const isAlert = cfg.key === "exclusive";
    return {
      type: "stack", direction: "row", alignItems: "start", gap: 4,
      children: [
        { type: "stack", direction: "row", alignItems: "center", gap: 2, width: layoutConfig.lw, children: [
          mkIcon(cfg.icon, cfg.color, layoutConfig.icz),
          mkText(cfg.label, layoutConfig.fz, "heavy", cfg.color)
        ]},
        mkText(rawText, layoutConfig.fz, "medium",
          isAlert && /(交割|行权) [1-3]天/.test(rawText) ? C.red : C.sub,
          { flex: 1, lineLimit: 0, lineSpacing: dynamicLineSpacing })
      ]
    };
  });

  const rightHeaderElements = [];
  if (todayNoticeText) {
    rightHeaderElements.push(mkIcon("sparkles", C.red, layoutConfig.topFz));
    rightHeaderElements.push(mkText(todayNoticeText, layoutConfig.topFz, "bold", C.red, { maxLines: 1 }));
  }
  if (stickyText) {
    if (todayNoticeText) rightHeaderElements.push(mkText(" ｜ ", layoutConfig.topFz, "bold", C.red));
    rightHeaderElements.push(mkText(stickyText, layoutConfig.topFz, "bold", C.red, { maxLines: 1 }));
  }
  if (rightHeaderElements.length > 0) {
    rightHeaderElements.push(mkText(" ｜ ", layoutConfig.topFz, "bold", C.muted));
  }
  rightHeaderElements.push(mkIcon("arrow.clockwise", C.muted, layoutConfig.topFz));
  rightHeaderElements.push(mkText(refreshTimeStr, layoutConfig.topFz, "medium", C.muted, { maxLines: 1 }));

  return {
    type: "widget", padding, backgroundGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, layoutConfig.titleIcz),
        mkText("时光倒数", layoutConfig.titleFz, "heavy", C.main, { maxLines: 1 }),
        mkSpacer(),
        ...(rightHeaderElements.length > 0 ? [mkRow(rightHeaderElements, 4)] : [])
      ], 6),
      mkSpacer(gapHeaderGrid),
      gridRows.length > 0
        ? { type: "stack", direction: "column", alignItems: "start", gap: 2, children: gridRows }
        : mkText("近期暂无倒计时", layoutConfig.fz, "medium", C.muted)
    ]
  };
}