/**
 * ==========================================
 * 📌 时光倒数 Widget
 *
 * ✨ 【功能概览】
 * 1. 三尺寸自适应：小号提供微缩无标签视图，中大号提供经典多行分类列表。
 * 2. 多维度数据源：支持法定、民俗、国际、专属四类节假日倒计时。
 * 3. 智能推算引擎：内置春秋假动态推算；A 股期指交割日与期权行权日智能推算。
 * 4. 优先级排序引擎：引入排序权重，支持单独提高专属纪念日权重。
 * 5. 视觉增强矩阵：多节日置顶高亮；今日节日触发暖色背景；周末触发独立背景。
 * 6. 小号智能布局：已被置顶的高亮节日自动去重顺延；智能池补位，尽量保持 4 行饱满展示。
 * 7. 全局规范对齐：小号图标严格对标黄历大小(13px)，天数两端对齐；中大号左侧标签严格锁定 52 宽度。
 *
 * 🔧 【环境变量】(需在 Egern 模块/YAML 中设定)
 * SHOW_SCHOOL_HOLIDAYS  — 是否显示春秋假 (默认: true)
 * SPRING_BREAK_DATE     — 春假自定义日期，格式 MM/DD
 * AUTUMN_BREAK_DATE     — 秋假自定义日期，格式 MM/DD
 * SHOW_FINANCE_DATES    — 是否显示金融交割日与行权日 (默认: true)
 * PINNED_HOLIDAY        — 需要置顶的节日名称，逗号分隔 (默认: 高考)
 * EXCLUSIVE_NAME_1~6    — 专属纪念日名称
 * EXCLUSIVE_DATE_1~6    — 专属纪念日日期，格式 MM/DD
 * ENABLE_PRIORITY_SORT  — 是否启用优先级排序 (默认: true)
 * ENABLE_EXCLUSIVE_WEIGHT — 是否提高专属纪念日权重 (默认: true)
 * ENABLE_WEEKEND_THEME  — 是否启用周末独立背景 (默认: true)
 * SMALL_FORCE_FOUR_ROWS — 小号是否尽量补足四行 (默认: true)
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * @version 2026.03.29 13:00
 * ==========================================
 */

export default async function (ctx) {
  const env = ctx.env ?? {};

  // ── 1. 健壮的环境变量解析器 ────────────────────────────────────────────────
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
  const forceFourSmallRows    = toBool(env.SMALL_FORCE_FOUR_ROWS, true);

  const springDateStr = toStr(env.SPRING_BREAK_DATE, "");
  const autumnDateStr = toStr(env.AUTUMN_BREAK_DATE, "");

  const pinnedHolidays = toStr(env.PINNED_HOLIDAY, "高考")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // 专属纪念日（最大支持 6 条配置）
  const customDays = [1, 2, 3, 4, 5, 6]
    .map(i => {
      const name = toStr(env[`EXCLUSIVE_NAME_${i}`], i === 1 ? toStr(env.EXCLUSIVE_NAME, "我的生日") : "");
      const date = toStr(env[`EXCLUSIVE_DATE_${i}`], i === 1 ? toStr(env.EXCLUSIVE_DATE, "11/10") : "");
      return { name, date };
    })
    .filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 2. Widget 尺寸侦测 ────────────────────────────────────────────────────
  const family  = toStr(ctx.widgetFamily, "systemMedium").toLowerCase();
  const isSmall = family.includes("small");

  // ── 3. 全局色彩令牌 (支持深浅色与周末主题自适应) ─────────────────────────────
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
    divider:     { light: "#E5E5EA", dark: '#38383A'  },
    transparent: "#00000000"
  };

  // ── 4. UI 渲染辅助函数 ─────────────────────────────────────────────────────
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

  // ── 5. 时间基准初始化（强制采用 UTC+8 北京时间）──────────────────────────────
  const tzOffset    = new Date().getTimezoneOffset();
  const now         = new Date(Date.now() + (tzOffset + 480) * 60000);
  const Y           = now.getFullYear();
  const M           = now.getMonth() + 1;
  const currentHour = now.getHours();
  const currentDay  = now.getDay();
  const todayMs     = Date.UTC(Y, M - 1, now.getDate());

  const YMD = (y, m, d) => `${y}/${m < 10 ? "0" + m : m}/${d < 10 ? "0" + d : d}`;

  // ── 6. A 股金融交割日推算引擎 ──────────────────────────────────────────────
  const getFinanceDate = (y, monthIndex, nth, targetDow) => {
    const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
    let diff = targetDow - firstDow;
    if (diff < 0) diff += 7;
    return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
  };

  // ── 7. 本地农历与节气推算引擎 ──────────────────────────────────────────────
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
    mDays(y, m) {
      return (this.info[y - 1900] & (0x10000 >> m)) ? 30 : 29;
    },
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
      } catch (_) {
        return null;
      }
    }
  };

  // ── 8. 节日聚合数据生成与按年份缓存 ─────────────────────────────────────────
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
      ["元旦", YMD(y, 1, 1), 1],
      ["春节", l2s(1, 1), 3],
      ["清明节", term(7), 1],
      ["劳动节", YMD(y, 5, 1), 1],
      ["端午节", l2s(5, 5), 1],
      ["儿童节", YMD(y, 6, 1), 1],
      ["中秋节", l2s(8, 15), 1],
      ["国庆节", YMD(y, 10, 1), 3]
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
      // ⭐️ 补全了之前漏掉的年份，使用严格的 YYYY/MM/DD 格式
      exclusive.push(["交割", YMD(fd.getUTCFullYear(), fd.getUTCMonth() + 1, fd.getUTCDate()), 1]);

      let optionsMs = getFinanceDate(y, M - 1, 4, 3);
      if (todayMs > optionsMs) optionsMs = getFinanceDate(nextYear, nextMonth, 4, 3);
      const od = new Date(optionsMs);
      exclusive.push(["行权", YMD(od.getUTCFullYear(), od.getUTCMonth() + 1, od.getUTCDate()), 1]);
    }

    return {
      legal,
      folk: [
        ["元宵节", l2s(1, 15), 1],
        ["龙抬头", l2s(2, 2), 1],
        ["七夕节", l2s(7, 7), 1],
        ["中元节", l2s(7, 15), 1],
        ["重阳节", l2s(9, 9), 1],
        ["寒衣节", l2s(10, 1), 1],
        ["腊八节", l2s(12, 8), 1],
        ["小年", l2s(12, 23), 1],
        ["除夕", l2s(12, Lunar.mDays(y, 12)), 1]
      ],
      intl: [
        ["情人节", YMD(y, 2, 14), 1],
        ["妇女节", YMD(y, 3, 8), 1],
        ["母亲节", wDay(5, 2, 0), 1],
        ["父亲节", wDay(6, 3, 0), 1],
        ["万圣节", YMD(y, 10, 31), 1],
        ["感恩节", wDay(11, 4, 4), 1],
        ["平安夜", YMD(y, 12, 24), 1],
        ["圣诞节", YMD(y, 12, 25), 1]
      ],
      exclusive
    };
  };

  const festCache = {};
  const getFestsCached = (y) => {
    if (!festCache[y]) festCache[y] = getFests(y);
    return festCache[y];
  };

  // ── 9. 优先级引擎与排序配置 ───────────────────────────────────────────────
  const basePriority = {
    legal: 3,
    folk: 2,
    intl: 1,
    exclusive: 2
  };

  const specialPriority = {
    春节: 10,
    国庆节: 9,
    高考: 9,
    交割: 8,
    行权: 8,
    元旦: 7,
    清明节: 7,
    端午节: 7,
    中秋节: 7,
    春假: 6,
    秋假: 6,
    除夕: 6
  };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    if (specialPriority[name] !== undefined) return specialPriority[name];
    return basePriority[cat] ?? 1;
  };

  // ── 10. 核心数据运算与一次性排序机制 ───────────────────────────────────────
  const result = { legal: [], folk: [], intl: [], exclusive: [] };
  const todayFests = [];
  const todayFinance = [];
  const pinnedMap = {};

  const yearsToScan = [Y, Y + 1];
  for (const y of yearsToScan) {
    const f = getFestsCached(y);

    for (const cat of Object.keys(result)) {
      for (const item of f[cat]) {
        const name = item[0];
        const dateStr = item[1];
        const duration = item[2];
        const sourceKind = item[3] || "";

        if (!dateStr) continue;

        // 因为之前我们添加了严格的 3 段式验证，所以 8 步骤必须提供 YYYY/MM/DD 
        const parts = dateStr.split("/").map(Number);
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) continue;

        const yy = parts[0];
        const mm = parts[1];
        const dd = parts[2];
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

  // 统一执行排序，优先按时间升序，相同时间按权重降序
  Object.keys(result).forEach(cat => {
    result[cat].sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      if (!enablePrioritySort) return 0;
      return b.priority - a.priority;
    });
  });

  const formatStr = (cat, limit) => {
    return result[cat]
      .slice(0, limit)
      .map(i => `${i.name} ${i.diff}天`)
      .join("，");
  };

  // 中/大号专属条目超长防截断切行算法 (阈值 45)
  const getExclusiveLines = (str) => {
    const text = toStr(str, "");
    if (!text) return [];

    let firstLine = "";
    let w = 0;
    const tokens = text.match(/[\d\/a-zA-Z.]+|./gu) || [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenW = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tokenW > 45) {
        return [
          firstLine.replace(/[，\s]+$/, ""),
          tokens.slice(i).join("").replace(/^[，\s]+/, "")
        ].filter(Boolean);
      }
      firstLine += token;
      w += tokenW;
    }

    return [text];
  };

  // ── 11. 高亮通知信息提取 ──────────────────────────────────────────────────
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

  // ── 12. 智能主题渲染引擎 (节日/周末/工作日) ───────────────────────────────
  const selectTheme = () => {
    if (todayFests.length > 0 || todayFinance.length > 0) return "fest";
    if (enableWeekendTheme && (currentDay === 0 || currentDay === 6)) return "weekend";
    return "workday";
  };

  const themeKey = selectTheme();
  const bgColors = themeKey === "fest"
    ? C.bgFest
    : themeKey === "weekend"
      ? C.bgWeekend
      : C.bg;

  const bgGradient = {
    type: "linear",
    colors: bgColors,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 }
  };

  // ── 13. 分类基础配置表 ────────────────────────────────────────────────────
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

  // ── 14. UI 渲染分流：小号 (Small) 动态补位模式 ────────────────────────────
  if (isSmall) {
    const pinnedNames = pinnedHolidays.filter(n => pinnedMap[n] !== undefined);
    const selected = [];
    const selectedNames = new Set();

    // 优先提取各分类下最近的一个未置顶项
    for (const cfg of CATEGORY_CONFIG) {
      const item = result[cfg.key].find(i => !pinnedNames.includes(i.name));
      if (item) {
        selected.push({ ...item, ...cfg });
        selectedNames.add(item.name);
      }
    }

    // 智能池补位：如果不足 4 行，从所有未置顶项中按优先级提取补足
    if (forceFourSmallRows && selected.length < 4) {
      const pool = CATEGORY_CONFIG.flatMap(cfg =>
        result[cfg.key]
          .filter(i => !pinnedNames.includes(i.name) && !selectedNames.has(i.name))
          .map(i => ({ ...i, ...cfg }))
      ).sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff;
        if (!enablePrioritySort) return 0;
        return b.priority - a.priority;
      });

      for (const item of pool) {
        if (selected.length >= 4) break;
        if (!selectedNames.has(item.name)) {
          selected.push(item);
          selectedNames.add(item.name);
        }
      }
    }

    // 强制锁定图标容器宽度 18，确保所有首字完美垂直对齐
    const buildSmallRow = (item) => {
      if (!item) return null;
      return mkRow([
        {
          type: "stack", direction: "row", alignItems: "center", width: 18,
          children: [mkIcon(item.icon, item.color, 13)]
        },
        mkText(item.name, 12, "medium", C.sub, { maxLines: 1 }),
        mkSpacer(),
        mkText(`${item.diff}天`, 12, "bold", C.muted)
      ], 4);
    };

    const smallRows = selected.slice(0, 4).map(buildSmallRow).filter(Boolean);
    const smallTopText = buildAddonText([todayNoticeText, stickyText], 30);
    const smallGap = smallRows.length <= 3 ? 10 : 8;

    return {
      type: "widget",
      padding: 12,
      backgroundGradient: bgGradient,
      children: [
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 14),
          mkText("时光倒数", 13, "heavy", C.main),
          mkSpacer(),
          ...(smallTopText ? [mkText(smallTopText, 10, "bold", C.red, { maxLines: 1, minScale: 0.6 })] : [])
        ], 4),

        mkSpacer(smallRows.length <= 3 ? 14 : 12),

        ...(smallRows.length > 0
          ? [{
              type: "stack", direction: "column", alignItems: "stretch", gap: smallGap,
              children: smallRows
            }]
          : [mkText("近期暂无节日", 12, "medium", C.muted)]),

        mkSpacer()
      ]
    };
  }

  // ── 15. UI 渲染分流：中号/大号 (Medium/Large) 经典模式 ────────────────────
  // 左侧标签列宽度严格锁定为 52，确保与黄历等组件桌面基准线绝对对齐
  const buildRow = (icon, color, label, content, isFirst, contentColor = C.sub) => ({
    type: "stack", direction: "row", alignItems: "start", gap: 4,
    children: [
      {
        type: "stack", direction: "row", alignItems: "center", gap: 2, width: 52,
        children: [
          mkIcon(isFirst ? icon : "circle.fill", isFirst ? color : C.transparent, 13),
          mkText(isFirst ? label : " ", 12, "heavy", isFirst ? color : C.transparent)
        ]
      },
      mkText(content, 12, "medium", contentColor, { maxLines: 1, flex: 1 })
    ]
  });

  const gridRows = [];

  for (const cfg of CATEGORY_CONFIG) {
    if (cfg.key === "exclusive") continue;
    const text = formatStr(cfg.key, 3);
    if (text) gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, text, true));
  }

  const tExc = formatStr("exclusive", 6);
  if (tExc) {
    const lines = getExclusiveLines(tExc);
    lines.forEach((line, idx) => {
      const isAlert = /(交割|行权) [1-2]天/.test(line);
      gridRows.push(buildRow("gift.fill", C.teal, "专属", line, idx === 0, isAlert ? C.red : C.sub));
    });
  }

  const dynamicGap = gridRows.length <= 4 ? 11 : 8;
  const topText = buildAddonText([stickyText], 36);

  // ── 16. 主布局构建 ────────────────────────────────────────────────────────
  return {
    type: "widget",
    padding: 12,
    backgroundGradient: bgGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, 16),
        mkText("时光倒数", 15, "heavy", C.main),
        mkSpacer(),
        ...(topText ? [mkText(topText, 11.5, "bold", C.red, { maxLines: 1, minScale: 0.75 })] : [])
      ], 5),

      mkSpacer(todayNoticeText ? 8 : (gridRows.length <= 4 ? 12 : 10)),

      ...(todayNoticeText ? [buildTodayLine(), mkSpacer(8)] : []),

      ...(gridRows.length > 0
        ? [{
            type: "stack",
            direction: "column",
            alignItems: "start",
            gap: dynamicGap,
            children: gridRows
          }]
        : [mkText("近期暂无倒计时", 12, "medium", C.muted)]),

      mkSpacer()
    ]
  };
}
