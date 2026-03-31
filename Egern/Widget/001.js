/**
 * ==========================================
 * 📌 时光倒数 (Countdown) 小组件 - 终极时区安全版
 *
 * ✨ 主要补丁与优化：
 * • 彻底删除春假和秋假的内置默认计算逻辑，由环境变量接管。
 * • 新增 QINGMING_DATE 环境变量手动覆写机制。
 * • 核心底层：全面采用 UTC+8 绝对时间锚点，彻底免疫系统夏令时与设备时区干扰。
 * • 节气校准：清明等所有节气精准 +8 小时对齐，杜绝夜间节气导致的“提早1天”Bug。
 * • 防呆设计：清明节不设死默认值，优先利用天文历法精准推演当年及次年正日。
 *
 * 🔗 更新时间: 2026.03.31（合入清明变量 + 时区安全底层）
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

  const springDateStr   = getStr("SPRING_BREAK_DATE");
  const autumnDateStr   = getStr("AUTUMN_BREAK_DATE");
  // 建议去掉默认值，让强大的时区算法默认自动算。有特殊需要时再通过配置覆写。
  const qingmingDateStr = getStr("QINGMING_DATE", ""); 

  const pinnedHolidays = getStr("PINNED_HOLIDAY", "高考").split(",").map(s => s.trim()).filter(Boolean);

  const customDays = [1,2,3,4,5,6].map(i => ({
    name: getStr(`EXCLUSIVE_NAME_${i}`, i === 1 ? getStr("EXCLUSIVE_NAME", "我的生日") : ""),
    date: getStr(`EXCLUSIVE_DATE_${i}`, i === 1 ? getStr("EXCLUSIVE_DATE", "11/10") : "")
  })).filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 尺寸检测 ──────────────────────────────────────────────────────────
  const family  = (ctx.widgetFamily || "systemMedium").toLowerCase();
  const isSmall = family.includes("small");
  const isLarge = family.includes("large");

  // ── 统一色彩令牌系统 ──────────────────────────────────────────────────
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

  // ── UI 统一构建器 ─────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) => ({ type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 核心修正：使用绝对 UTC 推算北京时间，完美避开夏令时及系统时区错乱 ──
  const nowUtc = Date.now();
  const bjDate = new Date(nowUtc + 8 * 3600000); // 强制平移至 UTC+8
  
  const Y = bjDate.getUTCFullYear();
  const M = bjDate.getUTCMonth() + 1;
  const D = bjDate.getUTCDate();
  const currentHour = bjDate.getUTCHours();
  const currentDay = bjDate.getUTCDay();
  
  const todayMs = Date.UTC(Y, M - 1, D);

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;
  const formatDiff = d => `${d}天`;

  // ── 金融交割日推算 ─────────────────────────────────────────────────────
  const getFinanceDate = (y, monthIndex, nth, targetDow) => {
    const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
    let diff = targetDow - firstDow;
    if (diff < 0) diff += 7;
    return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
  };

  // ── 自定义日期解析（仅环境变量，无默认公式） ───────────────────────────
  const getCustomDate = (y, dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split("/");
    if (parts.length !== 2) return null;
    const m = Number(parts[0]), d = Number(parts[1]);
    if (!m || !d || m > 12 || d > 31) return null;
    return YMD(y, m, d);
  };

  // ── 农历 l2s（累计天数优化版） ──────────────────────────────────────────
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

  // ── 节日数据生成 ────────────────────────────────────────────────────────
  const getFests = (y) => {
    
    // 核心修正：节气时区校准，强制对齐 +8 小时
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

    const legal = [
      ["元旦",   YMD(y, 1, 1),        1], ["春节",   l2s(y, 1, 1),        3],
      // 优先判断环境变量覆盖，若无则执行精准天文计算
      ["清明节", getCustomDate(y, qingmingDateStr) || term(7), 1],
      ["劳动节", YMD(y, 5, 1),        1], ["端午节", l2s(y, 5, 5),        1],
      ["中秋节", l2s(y, 8, 15),       1], ["国庆节", YMD(y, 10, 1),       3]
    ];

    if (showSchoolHolidays) {
      const springDate = getCustomDate(y, springDateStr);
      if (springDate) legal.push(["春假", springDate, 3]);

      const autumnDate = getCustomDate(y, autumnDateStr);
      if (autumnDate) legal.push(["秋假", autumnDate, 3]);
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
        ["腊八节", l2s(y, 12, 8), 1], ["小年",   l2s(y, 12, 23), 1], ["除夕",   l2s(y, 12, Lunar.mDays(y, 12)), 1]
      ],
      intl: [
        ["情人节", YMD(y, 2, 14), 1], ["妇女节", YMD(y, 3, 8),  1], ["儿童节", YMD(y, 6, 1),  1],
        ["母亲节", wDay(5, 2, 0), 1], ["父亲节", wDay(6, 3, 0), 1], ["万圣节", YMD(y, 10, 31),1],
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

  // ── 优先级配置 ──────────────────────────────────────────────────────────
  const basePriority = { legal: 3, folk: 2, intl: 1, exclusive: 2 };
  const specialPriority = { 春节: 10, 国庆节: 9, 高考: 9, 交割: 8, 行权: 8, 元旦: 7, 清明节: 7, 端午节: 7, 中秋节: 7, 春假: 6, 秋假: 6, 除夕: 6 };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    return specialPriority[name] !== undefined ? specialPriority[name] : (basePriority[cat] ?? 1);
  };

  // ── 核心数据运算 ────────────────────────────────────────────────────────
  const result = { legal: new Map(), folk: new Map(), intl: new Map(), exclusive: new Map() };
  const todayFests   = new Set(), todayFinance = new Set(), pinnedMap = new Map();

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

  const formatStr = (cat, limit) => result[cat].slice(0, limit).map(i => `${i.name} ${formatDiff(i.diff)}`).join("，");

  // ── 高亮通知与渐变主题 ──────────────────────────────────────────────────
  const todayNoticeParts = [];
  if (todayFests.size > 0) todayNoticeParts.push(`今日 🎉 ${Array.from(todayFests).slice(0, 2).join("·")}${todayFests.size > 2 ? "…" : ""}`);
  if (todayFinance.size > 0) todayNoticeParts.push(`今日 🚨 ${Array.from(todayFinance).join("·")}`);
  const todayNoticeText = todayNoticeParts.join(" ｜ ");

  const stickyParts = pinnedHolidays.filter(n => pinnedMap.has(n)).map(n => `${n} ${formatDiff(pinnedMap.get(n))}`);
  const stickyText = stickyParts.length > 0 ? `🔝 ${stickyParts.join("·")}` : "";

  const themeKey = (todayFests.size > 0 || todayFinance.size > 0) ? "fest" : (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) ? "weekend" : "workday";
  const bgColors = themeKey === "fest" ? C.bgFest : themeKey === "weekend" ? C.bgWeekend : C.bgWorkday;
  const backgroundGradient = { type: "linear", colors: bgColors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red  },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  // ── 文本换行引擎 ────────────────────────────────────────────────────────
  const splitTextToLines = (str, maxW) => {
    if (!str) return [];
    let lines = [], line = "", w = 0;
    for (const token of (str.match(/[\d\/a-zA-Z.\-]+|./gu) || [])) {
      const tw = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tw > maxW) {
        lines.push(line.replace(/^[，\s]+|[，\s]+$/g, ""));
        line = token;
        w = tw;
      } else {
        line += token;
        w += tw;
      }
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
        mkText(fests.map(i => `${i.name} ${formatDiff(i.diff)}`).join("，"), 12, "medium", cfg.color, { flex: 1, maxLines: 1, minScale: 0.8 })
      ], 6);
    }).filter(Boolean);

    let topElement = null;
    if (stickyParts.length > 0) topElement = mkText(`🔝 ${stickyParts[0]}`, 12, "bold", C.red, { minScale: 0.8, maxLines: 1 });
    else if (todayNoticeText) topElement = mkText(todayNoticeText, 11, "bold", C.red, { minScale: 0.8, maxLines: 1 });

    return {
      type: "widget", padding: 14, backgroundGradient,
      children: [
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 16),
          mkText("时光\n倒数", 14, "heavy", C.main, { maxLines: 2 }),
          mkSpacer(),
          ...(topElement ? [topElement] : [])
        ], 6),
        mkSpacer(10),
        { type: "stack", direction: "column", gap: 8, flex: 1, justifyContent: "center", children: smallRows }
      ]
    };
  }

  // ── Medium & Large 尺寸渲染 ─────────────────────────────────────────────
  const layoutConfig = {
    fz: isLarge ? 14 : 12,
    icz: isLarge ? 15 : 13,
    lw: isLarge ? 60 : 52,
    maxW: isLarge ? 36 : 45,
    rowGap: isLarge ? 6 : 4,
    titleFz: isLarge ? 17 : 15,
    titleIcz: isLarge ? 18 : 16,
    topFz: isLarge ? 12 : 11.5
  };

  const buildRows = createRowFactory(layoutConfig);
  let gridRows = [];

  for (const cfg of CATEGORY_CONFIG) {
    const isExc = cfg.key === "exclusive";
    const limit = isLarge ? 7 : (isExc ? 6 : 3);
    const rawText = formatStr(cfg.key, limit);
    if (!rawText) continue;
    
    if (isLarge || isExc) {
      gridRows.push(...buildRows(cfg.icon, cfg.color, cfg.label, rawText, isExc));
    } else {
      gridRows.push({
        type: "stack", direction: "row", alignItems: "start", gap: layoutConfig.rowGap, children: [
          mkRow([ mkIcon(cfg.icon, cfg.color, layoutConfig.icz), mkText(cfg.label, layoutConfig.fz, "heavy", cfg.color) ], 2, { width: layoutConfig.lw }),
          mkText(rawText, layoutConfig.fz, "medium", C.sub, { flex: 1 })
        ]
      });
    }
  }

  const dynamicGap = gridRows.length <= 4 ? (isLarge ? 14 : 11) : (isLarge ? 10 : 8);

  return {
    type: "widget", padding: isLarge ? 16 : 12, backgroundGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, layoutConfig.titleIcz),
        mkText("时光倒数", layoutConfig.titleFz, "heavy", C.main),
        mkSpacer(),
        ...(stickyText ? [mkText(stickyText, layoutConfig.topFz, "bold", C.red, { maxLines: 1, minScale: 0.8 })] : [])
      ], 6),

      mkSpacer(todayNoticeText ? (isLarge ? 10 : 8) : (gridRows.length <= 4 ? 12 : 10)),

      ...(todayNoticeText ? [
        mkRow([ mkIcon("sparkles", C.red, 13), mkText(todayNoticeText, 12, "bold", C.red, { maxLines: 1, minScale: 0.8 }) ], 4),
        mkSpacer(isLarge ? 10 : 8)
      ] : []),

      ...(gridRows.length > 0
        ? [{ type: "stack", direction: "column", alignItems: "start", gap: dynamicGap, children: gridRows }]
        : [mkText("近期暂无倒计时", layoutConfig.fz, "medium", C.muted)]),

      mkSpacer()
    ]
  };
}
