/**
 * ==========================================
 * 📌 时光倒数 Widget
 *
 * ✨ 【功能概览】
 * • 三尺寸自适应布局：
 * - 小号：左侧标题双行排版，右侧列表紧凑展示 8 个节日（4行2列纯净网格，无分类文字）。
 * - 中号：经典单列分类列表，每个分类展示 3 个，左侧标签定宽对齐。
 * - 大号：经典单列分类列表放大版，单行承载更多数据，字号等比放大填满屏幕。
 * • 数据引擎：节日按年缓存，智能去重补位，内置春秋假与 A 股交割推算。
 * • 视觉交互：多节日置顶高亮；今日节日触发暖色背景；周末触发蓝调背景。
 *
 * 🔧 【环境变量】
 * SHOW_SCHOOL_HOLIDAYS    — 是否显示春秋假 (默认: true)
 * SPRING_BREAK_DATE       — 春假自定义日期，格式 MM/DD
 * AUTUMN_BREAK_DATE       — 秋假自定义日期，格式 MM/DD
 * SHOW_FINANCE_DATES      — 是否显示金融交割日与行权日 (默认: true)
 * PINNED_HOLIDAY          — 需要置顶的节日名称，逗号分隔 (默认: 高考)
 * EXCLUSIVE_NAME_1~6      — 专属纪念日名称
 * EXCLUSIVE_DATE_1~6      — 专属纪念日日期，格式 MM/DD
 * ENABLE_PRIORITY_SORT    — 是否启用优先级排序 (默认: true)
 * ENABLE_EXCLUSIVE_WEIGHT — 是否提高专属纪念日权重 (默认: true)
 * ENABLE_WEEKEND_THEME    — 是否启用周末独立背景 (默认: true)
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * ⏱️ 更新时间: 2026.03.28 21:00
 * ==========================================
 */

export default async function (ctx) {
  const env = ctx.env ?? {};

  // ── 环境变量解析 ──────────────────────────────────────────────────────────
  const toBool = (value, defaultValue = true) => {
    if (value === undefined || value === null || String(value).trim() === "") return defaultValue;
    return String(value).trim().toLowerCase() !== "false";
  };

  const toStr = (value, defaultValue = "") => {
    if (value === undefined || value === null) return defaultValue;
    return String(value).trim();
  };

  const showSchoolHolidays    = toBool(env.SHOW_SCHOOL_HOLIDAYS, true);
  const showFinanceDates      = toBool(env.SHOW_FINANCE_DATES, true);
  const enablePrioritySort    = toBool(env.ENABLE_PRIORITY_SORT, true);
  const enableExclusiveWeight = toBool(env.ENABLE_EXCLUSIVE_WEIGHT, true);
  const enableWeekendTheme    = toBool(env.ENABLE_WEEKEND_THEME, true);

  const springDateStr = toStr(env.SPRING_BREAK_DATE, "");
  const autumnDateStr = toStr(env.AUTUMN_BREAK_DATE, "");

  const pinnedHolidays = toStr(env.PINNED_HOLIDAY, "高考")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const customDays = [1, 2, 3, 4, 5, 6]
    .map(i => {
      const name = toStr(env[`EXCLUSIVE_NAME_${i}`], i === 1 ? toStr(env.EXCLUSIVE_NAME, "我的生日") : "");
      const date = toStr(env[`EXCLUSIVE_DATE_${i}`], i === 1 ? toStr(env.EXCLUSIVE_DATE, "11/10") : "");
      return { name, date };
    })
    .filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 尺寸检测 ──────────────────────────────────────────────────────────────
  const family  = toStr(ctx.widgetFamily, "systemMedium").toLowerCase();
  const isSmall = family.includes("small");
  const isLarge = family.includes("large");

  // ── 色彩令牌 ──────────────────────────────────────────────────────────────
  const C = {
    bg:          [{ light: "#FFFFFF", dark: "#1C1C1E" }, { light: "#F5F5F9", dark: "#0C0C0E" }],
    bgWeekend:   [{ light: "#F4F8FF", dark: "#111827" }, { light: "#EAF1FF", dark: "#0B1220" }],
    bgFest:      [{ light: "#FFF8EC", dark: "#2A1F0E" }, { light: "#FFF3E0", dark: "#1F1608" }],
    main:        { light: "#1C1C1E", dark: "#FFFFFF"  },
    sub:         { light: "#48484A", dark: "#D1D1D6"  },
    muted:       { light: "#8E8E93", dark: "#8E8E93"  },
    gold:        { light: "#B58A28", dark: "#D6A53A"  },
    red:         { light: "#CA3B32", dark: "#FF453A"  },
    blue:        { light: "#3A5F85", dark: "#5E8EB8"  },
    teal:        { light: "#628C7B", dark: "#73A491"  },
    divider:     { light: "#E5E5EA", dark: "#38383A"  },
    transparent: "#00000000"
  };

  // ── UI 渲染辅助 ───────────────────────────────────────────────────────────
  const mkText = (text, size, weight, color, opts = {}) => ({
    type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts
  });

  const mkRow = (children, gap = 4, opts = {}) => ({
    type: "stack", direction: "row", alignItems: "center", gap, children, ...opts
  });

  const mkSpacer = length => length != null ? { type: "spacer", length } : { type: "spacer" };

  const mkIcon = (src, color, size = 13) => ({
    type: "image", src: `sf-symbol:${src}`, color, width: size, height: size
  });

  // ── 时间基准初始化 ────────────────────────────────────────────────────────
  const tzOffset    = new Date().getTimezoneOffset();
  const now         = new Date(Date.now() + (tzOffset + 480) * 60000);
  const Y           = now.getFullYear();
  const M           = now.getMonth() + 1;
  const currentHour = now.getHours();
  const currentDay  = now.getDay();
  const todayMs     = Date.UTC(Y, M - 1, now.getDate());

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;

  // ── 金融交割日推算 ────────────────────────────────────────────────────────
  const getFinanceDate = (y, monthIndex, nth, targetDow) => {
    const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
    let diff = targetDow - firstDow;
    if (diff < 0) diff += 7;
    return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
  };

  // ── 农历与节气推算 ────────────────────────────────────────────────────────
  const Lunar = {
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
        [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758][n - 1] * 60000 +
        Date.UTC(1900, 0, 6, 2, 5)
      );
    },
    lDays(y) {
      let s = 348;
      for (let i = 0x8000; i > 0x8; i >>= 1) s += (this.info[y - 1900] & i) ? 1 : 0;
      return s + ((this.info[y - 1900] & 0xf) ? ((this.info[y - 1900] & 0x10000) ? 30 : 29) : 0);
    },
    mDays(y, m) { return (this.info[y - 1900] & (0x10000 >> m)) ? 30 : 29; },
    l2s(y, m, d) {
      try {
        if (y < 1900 || y > 2100) return null;
        let off = 0;
        const lp = this.info[y - 1900] & 0xf;
        for (let i = 1900; i < y; i++) off += this.lDays(i);
        for (let i = 1; i < m; i++) {
          off += this.mDays(y, i);
          if (lp > 0 && i === lp) off += (this.info[y - 1900] & 0x10000) ? 30 : 29;
        }
        return new Date(Date.UTC(1900, 0, 31) + (off + d - 1) * 86400000);
      } catch (_) { return null; }
    }
  };

  // ── 节日聚合数据生成 ────────────────────────────────────────────────────────
  const getCustomDate = (y, dateStr, defaultCalc) => {
    const parts = toStr(dateStr, "").split("/");
    if (parts.length !== 2) return defaultCalc();
    const m = Number(parts[0]);
    const d = Number(parts[1]);
    if (!m || !d) return defaultCalc();
    return YMD(y, m, d);
  };

  const getFests = (y) => {
    const l2s = (m, d) => {
      const r = Lunar.l2s(y, m, d);
      return r ? YMD(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate()) : "";
    };

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
      ["元旦", YMD(y, 1, 1), 1], ["春节", l2s(1, 1), 3], ["清明节", term(7), 1],
      ["劳动节", YMD(y, 5, 1), 1], ["端午节", l2s(5, 5), 1], ["儿童节", YMD(y, 6, 1), 1],
      ["中秋节", l2s(8, 15), 1], ["国庆节", YMD(y, 10, 1), 3]
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

    // 添加儿童节到法定假日
    legal.push(["儿童节", YMD(y, 6, 1), 1]);

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
        ["元宵节", l2s(1, 15), 1], ["龙抬头", l2s(2, 2), 1], ["七夕节", l2s(7, 7), 1],
        ["中元节", l2s(7, 15), 1], ["重阳节", l2s(9, 9), 1], ["寒衣节", l2s(10, 1), 1],
        ["腊八节", l2s(12, 8), 1], ["小年", l2s(12, 23), 1], ["除夕", l2s(12, Lunar.mDays(y, 12)), 1]
      ],
      intl: [
        ["情人节", YMD(y, 2, 14), 1], ["妇女节", YMD(y, 3, 8), 1], ["母亲节", wDay(5, 2, 0), 1],
        ["父亲节", wDay(6, 3, 0), 1], ["万圣节", YMD(y, 10, 31), 1], ["感恩节", wDay(11, 4, 4), 1],
        ["平安夜", YMD(y, 12, 24), 1], ["圣诞节", YMD(y, 12, 25), 1]
      ],
      exclusive
    };
  };

  const festCache = {};
  const getFestsCached = (y) => {
    if (!festCache[y]) festCache[y] = getFests(y);
    return festCache[y];
  };

  // ── 优先级排序配置 ────────────────────────────────────────────────────────
  const basePriority = {
    legal: 3, folk: 2, intl: 1, exclusive: 2
  };

  const specialPriority = {
    春节: 10, 国庆节: 9, 高考: 9,
    交割: 8, 行权: 8,
    元旦: 7, 清明节: 7, 端午节: 7, 中秋节: 7,
    春假: 6, 秋假: 6, 除夕: 6
  };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    if (specialPriority[name] !== undefined) return specialPriority[name];
    return basePriority[cat] ?? 1;
  };

  // ── 核心数据运算 ──────────────────────────────────────────────────────────
  const result = { legal: [], folk: [], intl: [], exclusive: [] };
  const todayFests = [];
  const todayFinance = [];
  const pinnedMap = {};

  const yearsToScan = [Y, Y + 1];
  for (const y of yearsToScan) {
    const f = getFestsCached(y);

    for (const cat of Object.keys(result)) {
      for (const item of f[cat]) {
        const name = item[0], dateStr = item[1], duration = item[2], sourceKind = item[3] || "";

        if (!dateStr) continue;

        const parts = dateStr.split("/").map(Number);
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) continue;

        const yy = parts[0], mm = parts[1], dd = parts[2];
        const diff = Math.floor((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);

        if (diff <= 0) {
          if (diff > -((duration || 1))) {
            const isFinance = name === "交割" || name === "行权";
            if (isFinance && currentHour < 15) {
              if (!todayFinance.includes(name)) todayFinance.push(name);
            } else {
              if (!todayFests.includes(name) && !isFinance) todayFests.push(name);
            }
          }
          continue;
        }

        if (pinnedHolidays.includes(name) && diff <= 200) {
          if (pinnedMap[name] === undefined || diff < pinnedMap[name]) pinnedMap[name] = diff;
        }

        if (!result[cat].some(i => i.name === name) && !todayFests.includes(name) && !todayFinance.includes(name)) {
          result[cat].push({
            name,
            diff,
            priority: getPriority(name, cat, sourceKind),
            cat
          });
        }
      }
    }
  }

  Object.keys(result).forEach(cat => {
    result[cat].sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      if (!enablePrioritySort) return 0;
      return b.priority - a.priority;
    });
  });

  const formatStr = (cat, limit) => {
    return result[cat].slice(0, limit).map(i => `${i.name} ${i.diff}天`).join("，");
  };

  // ── 高亮通知信息提取 ──────────────────────────────────────────────────────
  const todayNoticeParts = [];
  if (todayFests.length > 0) {
    todayNoticeParts.push(`今日 🎉 ${todayFests.slice(0, 2).join("·")}${todayFests.length > 2 ? "…" : ""}`);
  }
  if (todayFinance.length > 0) {
    todayNoticeParts.push(`今日 🚨 ${todayFinance.join("·")}`);
  }
  const todayNoticeText = todayNoticeParts.join(" ｜ ");

  const stickyParts = pinnedHolidays
    .filter(n => pinnedMap[n] !== undefined)
    .map(n => `${n} ${pinnedMap[n]}天`);
  const stickyText = stickyParts.length > 0 ? `🔝 ${stickyParts.join("·")}` : "";

  // ── 主题渲染引擎 ──────────────────────────────────────────────────────────
  const selectTheme = () => {
    if (todayFests.length > 0 || todayFinance.length > 0) return "fest";
    if (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) return "weekend";
    return "workday";
  };

  const themeKey = selectTheme();
  const bgColors = themeKey === "fest" ? C.bgFest : themeKey === "weekend" ? C.bgWeekend : C.bg;
  const bgGradient = { type: "linear", colors: bgColors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  // ── 分类基础配置表 ────────────────────────────────────────────────────────
  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  const buildAddonText = (arr, maxLen) => {
    const list = arr.filter(Boolean);
    if (!list.length) return "";
    const text = list.join(" | ");
    return text.length <= maxLen ? text : `${text.slice(0, Math.max(0, maxLen - 1))}…`;
  };

  const buildTodayLine = () => {
    if (!todayNoticeText) return null;
    return mkRow([
      mkIcon("sparkles", C.red, 13),
      mkText(todayNoticeText, 12, "bold", C.red, { maxLines: 1, minScale: 0.8 })
    ], 4);
  };

  // ── 小号布局渲染：左侧两行标题 + 右侧 4 行直排 ──────────────────────────────
  if (isSmall) {
    const pinnedNames = pinnedHolidays.filter(n => pinnedMap[n] !== undefined);
    
    // 我们需要收集 8 个未置顶的节日（4行，每行2个）
    const allAvailableFests = [];
    
    // 遍历所有分类，将未置顶的节日加入备选池，并打上分类的图标和颜色烙印
    for (const cfg of CATEGORY_CONFIG) {
      result[cfg.key].forEach(i => {
        if (!pinnedNames.includes(i.name)) {
          allAvailableFests.push({ ...i, ...cfg });
        }
      });
    }

    // 重新排序：按照时间升序，权重降序
    allAvailableFests.sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff;
        if (!enablePrioritySort) return 0;
        return b.priority - a.priority;
    });

    // 截取前 8 个节日
    const selectedFests = allAvailableFests.slice(0, 8);

    // 小号列表行构建：每行包含 2 个节日项
    // 结构：[图标 名字 天数] [间距] [图标 名字 天数]
    const buildSmallRow = (item1, item2) => {
        
        const buildCell = (item) => {
            if (!item) return { type: "stack", flex: 1, children: [] }; // 占位保持对齐
            return {
                type: "stack", direction: "row", alignItems: "center", flex: 1, gap: 2,
                children: [
                    mkIcon(item.icon, item.color, 11),
                    mkText(item.name, 11, "medium", C.sub, { maxLines: 1, minScale: 0.8, flex: 1 }), // 弹性收缩名字
                    mkText(`${item.diff}天`, 11, "bold", C.muted)
                ]
            };
        };

        return mkRow([
            buildCell(item1),
            mkSpacer(4), // 两个项目之间的列距
            buildCell(item2)
        ], 0);
    };

    // 组装 4 行数据
    const smallRows = [];
    for (let i = 0; i < 8; i += 2) {
        smallRows.push(buildSmallRow(selectedFests[i], selectedFests[i+1]));
    }

    const smallTopText = buildAddonText([todayNoticeText, stickyText], 20);

    return {
      type: "widget", padding: 14, backgroundGradient: bgGradient,
      children: [
        // 顶部区域：沙漏 + 置顶信息
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 14),
          mkSpacer(),
          ...(smallTopText ? [mkText(smallTopText, 10, "bold", C.red, { maxLines: 1 })] : [])
        ], 0),

        mkSpacer(8),

        // 左侧两行标题 + 右侧 4 行数据
        mkRow([
          {
            type: "stack", direction: "column", alignItems: "start", width: 36, // 缩小宽度留给右边
            children: [
              mkText("时光", 15, "heavy", C.main),
              mkSpacer(4),
              mkText("倒数", 15, "heavy", C.main)
            ]
          },
          mkSpacer(4),
          {
            type: "stack", direction: "column", alignItems: "stretch", flex: 1, gap: 6, // 调整行距
            children: smallRows
          }
        ], 0),

        mkSpacer()
      ]
    };
  }

  // ── 中/大号通用行渲染器 ────────────────────────────────────────────────
  const fz      = isLarge ? 14 : 12;
  const icz     = isLarge ? 15 : 13;
  const lw      = isLarge ? 60 : 52;
  const rowGap  = isLarge ? 6 : 4;
  const titleFz = isLarge ? 17 : 15;
  const titleIcz= isLarge ? 18 : 16;
  const topFz   = isLarge ? 12 : 11.5;

  const buildRow = (icon, color, label, content, isFirst, contentColor = C.sub) => ({
    type: "stack", direction: "row", alignItems: "start", gap: rowGap,
    children: [
      {
        type: "stack", direction: "row", alignItems: "center", gap: 2, width: lw,
        children: [
          mkIcon(isFirst ? icon : "circle.fill", isFirst ? color : C.transparent, icz),
          mkText(isFirst ? label : " ", fz, "heavy", isFirst ? color : C.transparent)
        ]
      },
      mkText(content, fz, "medium", contentColor, { flex: 1 })
    ]
  });

  // ── 中/大号切行引擎 ──────────────────────────────────────────────────────
  const splitText = (str, maxW) => {
    const text = toStr(str, "");
    if (!text) return [];
    let lines = [], currentLine = "", w = 0;
    const tokens = text.match(/[\d\/a-zA-Z.\-]+|./gu) || [];
    for (const token of tokens) {
      const tokenW = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tokenW > maxW) {
        lines.push(currentLine.replace(/[，\s]+$/, ""));
        currentLine = token.replace(/^[，\s]+/, "");
        w = tokenW;
      } else {
        currentLine += token;
        w += tokenW;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // ── 中/大号布局列表组装 ──────────────────────────────────────────────────
  const gridRows = [];
  const maxW = isLarge ? 36 : 45;

  for (const cfg of CATEGORY_CONFIG) {
    const isExc = cfg.key === "exclusive";
    // 大号全部分类提取 7 个；中号专属提取 6 个，普通提取 3 个
    const limit = isLarge ? 7 : (isExc ? 6 : 3);
    const rawText = formatStr(cfg.key, limit);
    if (!rawText) continue;

    if (isLarge || isExc) {
      // 触发多行铺满折断逻辑：大号因为数据多必然折行；中号专属长数据也折行
      const lines = splitText(rawText, maxW);
      lines.forEach((line, idx) => {
        const isAlert = isExc && /(交割|行权) [1-3]天/.test(line);
        gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, line, idx === 0, isAlert ? C.red : C.sub));
      });
    } else {
      // 中号普通分类直接单行显示
      gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, rawText, true, C.sub));
    }
  }

  const topText = buildAddonText([stickyText], 45);
  const dynamicGap = gridRows.length <= 4 ? (isLarge ? 14 : 11) : (isLarge ? 10 : 8);

  // ── 渲染输出 ────────────────────────────────────────────────────────────
  return {
    type: "widget", padding: isLarge ? 16 : 12, backgroundGradient: bgGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, titleIcz),
        mkText("时光倒数", titleFz, "heavy", C.main),
        mkSpacer(),
        ...(topText ? [mkText(topText, topFz, "bold", C.red, { maxLines: 1, minScale: 0.8 })] : [])
      ], 6),

      mkSpacer(todayNoticeText ? (isLarge ? 10 : 8) : (gridRows.length <= 4 ? 12 : 10)),

      ...(todayNoticeText ? [buildTodayLine(), mkSpacer(isLarge ? 10 : 8)] : []),

      ...(gridRows.length > 0
        ? [{
            type: "stack", direction: "column", alignItems: "start", gap: dynamicGap,
            children: gridRows
          }]
        : [mkText("近期暂无倒计时", fz, "medium", C.muted)]),

      mkSpacer()
    ]
  };
}
