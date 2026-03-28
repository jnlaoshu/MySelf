/**
 * ==========================================
 * 📌 时光倒数 Widget
 * ✨ 功能概览:
 *   • 三尺寸自适应：小号紧凑四行，中/大号经典分类列表风
 *   • 聚合四类节日：法定、民俗、国际、专属，覆盖全年
 *   • 内置春秋假推算，支持自定义日期覆盖
 *   • A 股期指交割日与期权行权日自动推算，15:00 后自动取消置顶
 *   • 优先级排序：重点节日自动前置，专属纪念日可提权
 *   • 今日节日触发暖色背景；周末启用蓝调背景
 *   • 多节日置顶高亮；专属条目超长自动折行
 * 🔧 环境变量:
 *   PINNED_HOLIDAY           — 置顶节日名，逗号分隔 (默认: 高考)
 *   SHOW_SCHOOL_HOLIDAYS     — 是否显示春秋假 (默认: true)
 *   SPRING_BREAK_DATE        — 春假自定义日期，格式 MM/DD
 *   AUTUMN_BREAK_DATE        — 秋假自定义日期，格式 MM/DD
 *   SHOW_FINANCE_DATES       — 是否显示金融交割日 (默认: true)
 *   ENABLE_PRIORITY_SORT     — 是否启用优先级排序 (默认: true)
 *   ENABLE_EXCLUSIVE_WEIGHT  — 是否提高专属纪念日权重 (默认: true)
 *   ENABLE_WEEKEND_THEME     — 是否启用周末蓝调背景 (默认: true)
 *   SMALL_FORCE_FOUR_ROWS    — 小号是否补足四行 (默认: true)
 *   EXCLUSIVE_NAME_1~6       — 专属纪念日名称
 *   EXCLUSIVE_DATE_1~6       — 专属纪念日日期，格式 MM/DD
 * 🔗 引用链接：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * ⏱️ 更新时间：2026.03.28 11:25
 * ==========================================
 */

export default async function(ctx) {
  const env = ctx.env ?? {};

  // ── 环境变量工具 ──────────────────────────────────────────────────────────
  const toBool = (val, def = true) => {
    if (val == null || String(val).trim() === "") return def;
    return String(val).trim().toLowerCase() !== "false";
  };
  const toStr = (val, def = "") => (val == null ? def : String(val).trim());

  // ── 环境变量 ──────────────────────────────────────────────────────────────
  const showSchoolHolidays    = toBool(env.SHOW_SCHOOL_HOLIDAYS,    true);
  const showFinanceDates      = toBool(env.SHOW_FINANCE_DATES,      true);
  const enablePrioritySort    = toBool(env.ENABLE_PRIORITY_SORT,    true);
  const enableExclusiveWeight = toBool(env.ENABLE_EXCLUSIVE_WEIGHT, true);
  const enableWeekendTheme    = toBool(env.ENABLE_WEEKEND_THEME,    true);
  const forceFourSmallRows    = toBool(env.SMALL_FORCE_FOUR_ROWS,   true);
  const springDateStr         = toStr(env.SPRING_BREAK_DATE);
  const autumnDateStr         = toStr(env.AUTUMN_BREAK_DATE);
  const pinnedHolidays        = toStr(env.PINNED_HOLIDAY, "高考")
    .split(",").map(s => s.trim()).filter(Boolean);

  // 专属纪念日（最多 6 条）
  const customDays = [1, 2, 3, 4, 5, 6].map(i => ({
    name: toStr(env[`EXCLUSIVE_NAME_${i}`], i === 1 ? toStr(env.EXCLUSIVE_NAME, "我的生日") : ""),
    date: toStr(env[`EXCLUSIVE_DATE_${i}`], i === 1 ? toStr(env.EXCLUSIVE_DATE, "11/10")   : "")
  })).filter(item => item.name && /^\d{1,2}\/\d{1,2}$/.test(item.date));

  // ── 尺寸检测 ──────────────────────────────────────────────────────────────
  const isSmall = toStr(ctx.widgetFamily, "systemMedium").toLowerCase().includes("small");

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
    transparent: "#00000000"
  };

  // ── UI 基础构建器 ─────────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) =>
    ({ type: "text", text: String(text ?? ""), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) =>
    ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };
  const mkIcon   = (src, color, size = 13) =>
    ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });

  // ── 时间基准（强制 UTC+8）─────────────────────────────────────────────────
  const tzOffset    = new Date().getTimezoneOffset();
  const now         = new Date(Date.now() + (tzOffset + 480) * 60000);
  const [Y, M, D]   = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const currentHour = now.getHours();
  const currentDay  = now.getDay();
  const todayMs     = Date.UTC(Y, M - 1, D);
  const YMD = (y, m, d) => `${y}/${m < 10 ? "0"+m : m}/${d < 10 ? "0"+d : d}`;

  // ── 农历引擎 ──────────────────────────────────────────────────────────────
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    term(y, n) {
      return new Date(
        (31556925974.7 * (y - 1900)) +
        [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n - 1] * 60000 +
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

  // ── A 股金融交割日推算 ────────────────────────────────────────────────────
  if (showFinanceDates) {
    const getFinanceDate = (y, monthIndex, nth, targetDow) => {
      const firstDow = new Date(Date.UTC(y, monthIndex, 1)).getUTCDay();
      let diff = targetDow - firstDow;
      if (diff < 0) diff += 7;
      return Date.UTC(y, monthIndex, 1 + diff + (nth - 1) * 7);
    };
    const nextYear  = M === 12 ? Y + 1 : Y;
    const nextMonth = M === 12 ? 0 : M;

    // 交割日：每月第 3 个周五
    let futuresMs = getFinanceDate(Y, M - 1, 3, 5);
    if (todayMs > futuresMs) futuresMs = getFinanceDate(nextYear, nextMonth, 3, 5);
    const fd = new Date(futuresMs);
    customDays.push({ name: "交割", date: `${fd.getUTCMonth() + 1}/${fd.getUTCDate()}` });

    // 行权日：每月第 4 个周三
    let optionsMs = getFinanceDate(Y, M - 1, 4, 3);
    if (todayMs > optionsMs) optionsMs = getFinanceDate(nextYear, nextMonth, 4, 3);
    const od = new Date(optionsMs);
    customDays.push({ name: "行权", date: `${od.getUTCMonth() + 1}/${od.getUTCDate()}` });
  }

  // ── 节日数据生成 ──────────────────────────────────────────────────────────
  const getCustomDate = (y, dateStr, defaultCalc) => {
    const parts = toStr(dateStr).split("/");
    if (parts.length !== 2) return defaultCalc();
    const m = Number(parts[0]), d = Number(parts[1]);
    return (m && d) ? YMD(y, m, d) : defaultCalc();
  };

  const getFests = (y) => {
    const l2s = (m, d) => { const r = Lunar.l2s(y, m, d); return r ? YMD(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate()) : ""; };
    const term = (n)    => { const t = Lunar.term(y, n);   return YMD(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
    const wDay = (m, n, w) => {
      const f  = new Date(Date.UTC(y, m - 1, 1)), dd = f.getUTCDay(), x = w - dd;
      return YMD(y, m, 1 + (x < 0 ? x + 7 : x) + (n - 1) * 7);
    };

    const legal = [
      ["元旦",   YMD(y,1,1),  1], ["春节",   l2s(1,1),  3], ["清明节", term(7),  1],
      ["劳动节", YMD(y,5,1),  1], ["端午节", l2s(5,5),  1], ["儿童节", YMD(y,6,1),1],
      ["中秋节", l2s(8,15),   1], ["国庆节", YMD(y,10,1),3]
    ];
    if (showSchoolHolidays) {
      legal.push(["春假", getCustomDate(y, springDateStr, () => {
        const qm = Lunar.term(y, 7), sb = new Date(qm.getTime() - 3 * 86400000);
        return YMD(sb.getUTCFullYear(), sb.getUTCMonth() + 1, sb.getUTCDate());
      }), 3]);
      legal.push(["秋假", getCustomDate(y, autumnDateStr, () => {
        const nov1 = new Date(Date.UTC(y, 10, 1)), offset = (3 - nov1.getUTCDay() + 7) % 7;
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

    return {
      legal,
      folk:  [["元宵节",l2s(1,15),1],["龙抬头",l2s(2,2),1],["七夕节",l2s(7,7),1],["中元节",l2s(7,15),1],["重阳节",l2s(9,9),1],["寒衣节",l2s(10,1),1],["腊八节",l2s(12,8),1],["小年",l2s(12,23),1],["除夕",l2s(12,Lunar.mDays(y,12)),1]],
      intl:  [["情人节",YMD(y,2,14),1],["妇女节",YMD(y,3,8),1],["母亲节",wDay(5,2,0),1],["父亲节",wDay(6,3,0),1],["万圣节",YMD(y,10,31),1],["感恩节",wDay(11,4,4),1],["平安夜",YMD(y,12,24),1],["圣诞节",YMD(y,12,25),1]],
      exclusive
    };
  };

  // ── 优先级表 ──────────────────────────────────────────────────────────────
  const basePriority    = { legal: 3, folk: 2, intl: 1, exclusive: 2 };
  const specialPriority = { 春节:10, 国庆节:9, 高考:9, 交割:8, 行权:8, 元旦:7, 清明节:7, 端午节:7, 中秋节:7, 春假:6, 秋假:6, 除夕:6 };

  const getPriority = (name, cat, sourceKind) => {
    if (!enablePrioritySort) return 1;
    if (sourceKind === "custom") return enableExclusiveWeight ? 9 : (basePriority[cat] ?? 1);
    return specialPriority[name] ?? basePriority[cat] ?? 1;
  };

  // ── 数据处理 ──────────────────────────────────────────────────────────────
  const result      = { legal: [], folk: [], intl: [], exclusive: [] };
  const todayFests  = [], todayFinance = [], pinnedMap = {};
  const festCache   = {};

  for (const y of [Y, Y + 1]) {
    if (!festCache[y]) festCache[y] = getFests(y);
    const f = festCache[y];

    for (const cat of Object.keys(result)) {
      for (const [name, dateStr, duration, sourceKind = ""] of f[cat]) {
        if (!dateStr) continue;
        const parts = dateStr.split("/").map(Number);
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) continue;
        const [yy, mm, dd] = parts;
        const diff = Math.floor((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);

        if (diff <= 0) {
          if (diff > -(duration || 1)) {
            const isFinance = name === "交割" || name === "行权";
            // 金融日 15:00 后不再置顶
            if (isFinance && currentHour < 15 && !todayFinance.includes(name)) todayFinance.push(name);
            else if (!isFinance && !todayFests.includes(name)) todayFests.push(name);
          }
          continue;
        }
        if (pinnedHolidays.includes(name) && diff <= 200) {
          if (pinnedMap[name] === undefined || diff < pinnedMap[name]) pinnedMap[name] = diff;
        }
        if (!result[cat].some(i => i.name === name) && !todayFests.includes(name) && !todayFinance.includes(name)) {
          result[cat].push({ name, diff, priority: getPriority(name, cat, sourceKind), cat });
        }
      }
    }
  }

  for (const cat of Object.keys(result)) {
    result[cat].sort((a, b) => a.diff !== b.diff ? a.diff - b.diff : b.priority - a.priority);
  }

  const formatStr = (cat, limit) =>
    result[cat].slice(0, limit).map(i => `${i.name} ${i.diff}天`).join("，");

  // 专属条目超长折行，阈值 45
  const getExclusiveLines = (str) => {
    if (!str) return [];
    let firstLine = "", w = 0;
    const tokens = str.match(/[\d\/a-zA-Z.\-]+|./gu) || [];
    for (let i = 0; i < tokens.length; i++) {
      const token  = tokens[i];
      const tokenW = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tokenW > 45) return [firstLine.replace(/[，\s]+$/, ""), tokens.slice(i).join("").replace(/^[，\s]+/, "")].filter(Boolean);
      firstLine += token; w += tokenW;
    }
    return [str];
  };

  // ── 标题附加信息拼装 ─────────────────────────────────────────────────────
  const todayNoticeParts = [];
  if (todayFests.length > 0)   todayNoticeParts.push(`今日 🎉 ${todayFests.slice(0, 2).join("·")}${todayFests.length > 2 ? "…" : ""}`);
  if (todayFinance.length > 0) todayNoticeParts.push(`今日 🚨 ${todayFinance.join("·")}`);
  const todayNoticeText = todayNoticeParts.join(" ｜ ");

  const stickyParts = pinnedHolidays.filter(n => pinnedMap[n] !== undefined).map(n => `${n} ${pinnedMap[n]}天`);
  const stickyText  = stickyParts.length > 0 ? `🔝 ${stickyParts.join("·")}` : "";

  const buildAddonText = (parts, maxLen) => {
    const text = parts.filter(Boolean).join(" | ");
    return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
  };

  // ── 背景主题选择 ──────────────────────────────────────────────────────────
  const bgColors = (todayFests.length > 0 || todayFinance.length > 0)
    ? C.bgFest
    : (enableWeekendTheme && (currentDay === 0 || currentDay === 6) ? C.bgWeekend : C.bg);
  const bgGradient = { type: "linear", colors: bgColors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  // ── 分类配置表 ────────────────────────────────────────────────────────────
  const CATEGORY_CONFIG = [
    { key: "legal",     label: "法定", icon: "building.columns.fill", color: C.red  },
    { key: "folk",      label: "民俗", icon: "moon.stars.fill",       color: C.gold },
    { key: "intl",      label: "国际", icon: "globe.americas.fill",   color: C.blue },
    { key: "exclusive", label: "专属", icon: "gift.fill",             color: C.teal }
  ];

  // ── 小号布局 ──────────────────────────────────────────────────────────────
  if (isSmall) {
    const pinnedNames  = pinnedHolidays.filter(n => pinnedMap[n] !== undefined);
    const selected     = [];
    const selectedNames = new Set();

    // 每类取最近一条
    for (const cfg of CATEGORY_CONFIG) {
      const item = result[cfg.key].find(i => !pinnedNames.includes(i.name));
      if (item) { selected.push({ ...item, ...cfg }); selectedNames.add(item.name); }
    }

    // 补位至 4 行
    if (forceFourSmallRows && selected.length < 4) {
      const pool = CATEGORY_CONFIG.flatMap(cfg =>
        result[cfg.key]
          .filter(i => !pinnedNames.includes(i.name) && !selectedNames.has(i.name))
          .map(i => ({ ...i, ...cfg }))
      ).sort((a, b) => a.diff !== b.diff ? a.diff - b.diff : b.priority - a.priority);
      for (const item of pool) {
        if (selected.length >= 4) break;
        if (!selectedNames.has(item.name)) { selected.push(item); selectedNames.add(item.name); }
      }
    }

    const buildSmallRow = (item) => mkRow([
      mkRow([mkIcon(item.icon, item.color, 13)], 0, { width: 18 }),
      mkText(item.name, 12, "medium", C.sub, { maxLines: 1 }),
      mkSpacer(),
      mkText(`${item.diff}天`, 12, "bold", C.muted)
    ], 4);

    const smallRows   = selected.slice(0, 4).map(buildSmallRow);
    const smallTopText = buildAddonText([todayNoticeText, stickyText], 30);
    const smallGap    = smallRows.length <= 3 ? 10 : 8;

    return {
      type: "widget", padding: 12,
      backgroundGradient: bgGradient,
      children: [
        mkRow([
          mkIcon("hourglass.circle.fill", C.main, 14),
          mkText("时光倒数", 13, "heavy", C.main),
          mkSpacer(),
          ...(smallTopText ? [mkText(smallTopText, 10, "bold", C.red, { maxLines: 1, minScale: 0.6 })] : [])
        ], 4),
        mkSpacer(smallRows.length <= 3 ? 14 : 12),
        smallRows.length > 0
          ? { type: "stack", direction: "column", alignItems: "stretch", gap: smallGap, children: smallRows }
          : mkText("近期暂无节日", 12, "medium", C.muted),
        mkSpacer()
      ]
    };
  }

  // ── 中/大号公共组件 ───────────────────────────────────────────────────────
  // 标签列固定宽度 52，内容区 flex 自适应
  const buildRow = (icon, color, label, content, isFirst, contentColor = C.sub) => ({
    type: "stack", direction: "row", alignItems: "start", gap: 4,
    children: [
      { type: "stack", direction: "row", alignItems: "center", gap: 2, width: 52, children: [
        mkIcon(isFirst ? icon : "circle.fill", isFirst ? color : C.transparent, 13),
        mkText(isFirst ? label : " ", 12, "heavy", isFirst ? color : C.transparent)
      ]},
      mkText(content, 12, "medium", contentColor, { maxLines: 1, flex: 1 })
    ]
  });

  // ── 中/大号布局 ───────────────────────────────────────────────────────────
  const gridRows = [];
  for (const cfg of CATEGORY_CONFIG) {
    if (cfg.key === "exclusive") continue;
    const text = formatStr(cfg.key, 3);
    if (text) gridRows.push(buildRow(cfg.icon, cfg.color, cfg.label, text, true));
  }
  const tExc = formatStr("exclusive", 6);
  if (tExc) {
    getExclusiveLines(tExc).forEach((line, idx) => {
      const isAlert = /(交割|行权) [1-2]天/.test(line);
      gridRows.push(buildRow("gift.fill", C.teal, "专属", line, idx === 0, isAlert ? C.red : C.sub));
    });
  }

  const dynamicGap = gridRows.length <= 4 ? 11 : 8;
  const topText    = buildAddonText([stickyText], 36);

  return {
    type: "widget", padding: 12,
    backgroundGradient: bgGradient,
    children: [
      mkRow([
        mkIcon("hourglass.circle.fill", C.main, 16),
        mkText("时光倒数", 15, "heavy", C.main),
        mkSpacer(),
        ...(topText ? [mkText(topText, 11.5, "bold", C.red, { maxLines: 1, minScale: 0.75 })] : [])
      ], 5),
      mkSpacer(todayNoticeText ? 8 : (gridRows.length <= 4 ? 12 : 10)),
      ...(todayNoticeText ? [
        mkRow([ mkIcon("sparkles", C.red, 13), mkText(todayNoticeText, 12, "bold", C.red, { maxLines: 1, minScale: 0.8 }) ], 4),
        mkSpacer(8)
      ] : []),
      gridRows.length > 0
        ? { type: "stack", direction: "column", alignItems: "start", gap: dynamicGap, children: gridRows }
        : mkText("近期暂无倒计时", 12, "medium", C.muted),
      mkSpacer()
    ]
  };
}