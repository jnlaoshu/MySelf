/**
 * ==========================================
 * 📌 代码名称: 📅 岁时黄历 (节气流转全览版)
 * ✨ 主要功能: 实时推算公农历、干支生肖、时辰；调用 API 获取宜忌、冲煞与运势；内置历法计算节气倒数；采用弹性布局，适配深浅色模式。右上角支持”星座”与”周次”双模式动态切换显示，支持通过模块环境变量 ASTRO_OR_WEEK 控制。
 * ⏱️ 更新时间: 2026.03.25 13:55
 * ==========================================
 */

export default async function (ctx) {

  // ─────────────────────────────────────────────────────────────────────────
  // §1  配置 & 工具
  // ─────────────────────────────────────────────────────────────────────────

  /** 环境变量：'week' 显示周次，其余显示星座（默认） */
  const SHOW_MODE = (ctx.env?.ASTRO_OR_WEEK ?? '').toLowerCase() === 'week' ? 'week' : 'astro';

  /** 颜色主题 */
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF'   },
    sub:         { light: '#48484A', dark: '#D1D1D6'   },
    muted:       { light: '#8E8E93', dark: '#8E8E93'   },
    divider:     { light: '#E5E5EA', dark: '#38383A'   },
    gold:        { light: '#B58A28', dark: '#D6A53A'   },
    yi:          { light: '#2E8045', dark: '#32D74B'   },
    ji:          { light: '#CA3B32', dark: '#FF453A'   },
    term:        { light: '#628C7B', dark: '#73A491'   },
    transparent: '#00000000',
  };

  /** 零填充 */
  const pad = n => n < 10 ? `0${n}` : `${n}`;

  /**
   * 获取东八区当前时间
   * 使用 Intl 先格式化再解析，规避夏令时地区的偏移误差。
   */
  function getNowCST() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:  'Asia/Shanghai',
      year:      'numeric', month:   '2-digit', day:    '2-digit',
      hour:      '2-digit', minute:  '2-digit', second: '2-digit',
      hour12:    false,
    }).formatToParts(Date.now());
    const get = type => parseInt(parts.find(p => p.type === type).value, 10);
    return {
      year: get('year'), month: get('month'), day: get('day'),
      hour: get('hour'), minute: get('minute'),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §2  农历核心数据（1900–2100）
  // ─────────────────────────────────────────────────────────────────────────

  const LUNAR_DATA = [
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
    0x0d520,
  ];

  const HEAVENLY_STEMS   = '甲乙丙丁戊己庚辛壬癸';
  const EARTHLY_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  const ANIMALS          = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
  const CN_MONTHS        = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  const CN_DAYS_TENS     = ['初','十','廿','卅'];
  const CN_DAYS_UNITS    = ['日','一','二','三','四','五','六','七','八','九','十'];
  const ASTRO_MONTHS_CUT = [20,19,21,21,21,22,23,23,23,23,22,22];
  const ASTRO_NAMES      = '摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯';

  // ─────────────────────────────────────────────────────────────────────────
  // §3  节气（Solar Terms）
  // ─────────────────────────────────────────────────────────────────────────

  const TERM_NAMES = [
    '小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨',
    '立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑',
    '白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至',
  ];

  /** 各节气相对 1900-01-06 02:05 UTC 的分钟偏移量 */
  const TERM_OFFSETS = [
    0,21208,42467,63836,85337,107014,128867,150921,
    173149,195551,218072,240693,263343,285989,308563,331033,
    353350,375494,397447,419210,440795,462224,483532,504758,
  ];

  /** 返回 y 年第 n 个节气（1-indexed）的日期（UTC 日） */
  function getTermDay(y, n) {
    return new Date(
      31556925974.7 * (y - 1900) + TERM_OFFSETS[n - 1] * 60000 + Date.UTC(1900, 0, 6, 2, 5)
    ).getUTCDate();
  }

  /**
   * 懒查：从 startMonth 向后最多跨 24 个节气，找到 need 个未来节气即停止。
   * 避免一次性生成三年 72 个节气对象。
   */
  function getUpcomingTerms(Y, M, D, need = 4) {
    const todayMs  = Date.UTC(Y, M - 1, D);
    const results  = [];
    let   year     = Y;
    let   termIdx  = (M - 1) * 2 + 1;

    for (let guard = 0; guard < 32 && results.length < need; guard++) {
      if (termIdx > 24) { termIdx = 1; year++; }
      const d    = getTermDay(year, termIdx);
      const mo   = Math.floor((termIdx - 1) / 2);
      const date = Date.UTC(year, mo, d);
      const diff = Math.round((date - todayMs) / 86400000);
      if (diff > 0) results.push({ name: TERM_NAMES[termIdx - 1], days: diff });
      termIdx++;
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §4  农历解析
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 将公历 (y, m, d) 转换为农历信息。
   * 同时返回日柱干支，供冲煞降级计算复用，避免重复推算。
   */
  function parseLunar(y, m, d) {
    // —— 距 1900-01-31 的天数偏移 ——
    let offset = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
    let lYear, temp = 0, i;

    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = 348;
      for (let j = 0x8000; j > 0x8; j >>= 1) {
        if (LUNAR_DATA[i - 1900] & j) temp++;
      }
      const leapDays = LUNAR_DATA[i - 1900] & 0xf;
      if (leapDays) temp += (LUNAR_DATA[i - 1900] & 0x10000) ? 30 : 29;
      offset -= temp;
    }
    if (offset < 0) { offset += temp; i--; }
    lYear = i;

    const leap    = LUNAR_DATA[lYear - 1900] & 0xf;
    let   isLeap  = false;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i; isLeap = true;
        temp = (LUNAR_DATA[lYear - 1900] & 0x10000) ? 30 : 29;
      } else {
        temp = (LUNAR_DATA[lYear - 1900] & (0x10000 >> i)) ? 30 : 29;
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) isLeap = false; else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; i--; }

    const lDay = offset + 1;

    // —— 年柱 / 生肖 ——
    const yearStem  = (lYear - 4) % 10;
    const yearBranch = (lYear - 4) % 12;
    const gz  = HEAVENLY_STEMS[yearStem] + EARTHLY_BRANCHES[yearBranch];
    const ani = ANIMALS[yearBranch];

    // —— 农历月/日汉字 ——
    const cnMonth = (isLeap ? '闰' : '') + CN_MONTHS[i - 1] + '月';
    let   cnDay;
    if      (lDay === 10) cnDay = '初十';
    else if (lDay === 20) cnDay = '二十';
    else if (lDay === 30) cnDay = '三十';
    else cnDay = CN_DAYS_TENS[Math.floor(lDay / 10)] + CN_DAYS_UNITS[lDay % 10];

    // —— 节气（当日是否节气）——
    const tId  = m * 2 - (d < getTermDay(y, m * 2 - 1) ? 2 : 1);
    const term = getTermDay(y, tId + 1) === d ? TERM_NAMES[tId] : '';

    // —— 星座 ——
    const astro = ASTRO_NAMES.substr(
      m * 2 - (d < ASTRO_MONTHS_CUT[m - 1] ? 2 : 0), 2
    ) + '座';

    // —— 日柱干支（供冲煞复用）——
    const dayCycle  = (Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000) + 40) % 60;
    const dc        = dayCycle < 0 ? dayCycle + 60 : dayCycle;
    const dayZhi    = dc % 12;
    const chongIdx  = (dc + 6) % 60;
    const dayGanzhi = {
      zhi:        dayZhi,
      chongStem:  HEAVENLY_STEMS[chongIdx % 10],
      chongBranch: EARTHLY_BRANCHES[chongIdx % 12],
      sha:        ['南','东','北','西'][dayZhi % 4],
      chongAni:   ANIMALS[(dayZhi + 6) % 12],
    };

    return { gz, ani, cn: cnMonth + cnDay, term, astro, dayGanzhi };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §5  周次信息
  // ─────────────────────────────────────────────────────────────────────────

  function getWeekInfo(y, m, d) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dayNum = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const weekNo    = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);

    const firstDayWeekday = (new Date(y, m - 1, 1).getDay() || 7);
    const monthWeekNo     = Math.ceil((d + firstDayWeekday - 1) / 7);

    return `本年第${weekNo}周（本月第${monthWeekNo}周）`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §6  API 数据拉取（带月级缓存 & 分层错误处理）
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 尝试从缓存读取本月数据；未命中则发起请求并写入缓存。
   * 缓存 key 格式：almanac_YYYYMM
   */
  async function fetchMonthData(y, m) {
    const cacheKey = `almanac_${y}${pad(m)}`;

    // —— 读缓存 ——
    try {
      const cached = ctx.cache?.get?.(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) { /* 缓存读取失败不影响主流程 */ }

    // —— 发起网络请求（3 秒超时） ——
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${y}/${y}${pad(m)}.json`;
    let json;
    try {
      const resp = await ctx.http.get(url, { timeout: 3000 });
      const text = await resp.text();
      json = JSON.parse(text);
    } catch (err) {
      // 网络失败或超时：静默返回空对象，UI 会显示降级数据
      console.warn(`[Almanac] 网络请求失败: ${err?.message ?? err}`);
      return {};
    }

    // —— 写缓存 ——
    try {
      ctx.cache?.set?.(cacheKey, JSON.stringify(json));
    } catch (_) { /* 缓存写入失败不影响主流程 */ }

    return json;
  }

  /**
   * 在已解析的月数据中定位今日条目。
   * 限制递归深度为 3，防止格式异常时无限遍历。
   */
  function findDayData(data, y, m, d, depth = 0) {
    if (!data || typeof data !== 'object' || depth > 3) return null;
    const patterns = [
      `${y}-${pad(m)}-${pad(d)}`,
      `${y}-${m}-${d}`,
      `${y}${pad(m)}${pad(d)}`,
    ];
    for (const key in data) {
      const val = data[key];
      if (!val) continue;
      if (patterns.some(p => String(key).includes(p))) return val;
      if (typeof val === 'object') {
        const ds = String(val.date ?? val.day ?? val.gregorian ?? val.oDate ?? '');
        if (patterns.some(p => ds.includes(p))) return val;
        if (val.day == d && (!val.month || val.month == m)) return val;
        const found = findDayData(val, y, m, d, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // §7  主流程
  // ─────────────────────────────────────────────────────────────────────────

  const { year: Y, month: M, day: D, hour, minute } = getNowCST();
  const WEEK_CH = '日一二三四五六'[new Date(Y, M - 1, D).getDay()];

  // 农历解析（含日柱干支）
  const lunar = parseLunar(Y, M, D);

  // 时辰
  const shichen = EARTHLY_BRANCHES[Math.floor((hour + 1) % 24 / 2)] + '时';

  // 节气
  const upcomingTerms = getUpcomingTerms(Y, M, D, 4);

  // 当前所处节气（找今日之前最近的一个）
  let currentTerm = '';
  for (let gi = (M - 1) * 2; gi >= 0; gi--) {
    const td = getTermDay(Y, gi + 1);
    if (td <= D && Math.floor(gi / 2) === M - 1) { currentTerm = TERM_NAMES[gi]; break; }
    if (gi === 0) { currentTerm = TERM_NAMES[23]; break; }
  }

  // 拉取 API 数据
  const monthJson = await fetchMonthData(Y, M);
  const dayData   = findDayData(monthJson, Y, M, D) ?? {};

  const gv = (...keys) => { for (const k of keys) { if (dayData[k]) return dayData[k]; } return ''; };
  const rawYi = gv('yi', 'Yi', 'suit').replace(/./g, ' ').trim();
  const rawJi = gv('ji', 'Ji', 'avoid').replace(/./g, ' ').trim();

  // 冲煞：优先 API，降级复用日柱干支（无重复计算）
  let chongshaInfo = gv('chongsha', 'ChongSha', 'chong');
  if (!chongshaInfo || chongshaInfo === '无') {
    const { chongAni, chongStem, chongBranch, sha } = lunar.dayGanzhi;
    chongshaInfo = `冲${chongAni}(${chongStem}${chongBranch})煞${sha}`;
  }

  // 运势星级
  const scStr = gv('score', 'Score', 'pingfen', 'star');
  let   stars = 4;
  if (!scStr || scStr === '暂无') {
    if (rawYi.includes('诸事不宜') || rawJi.includes('诸事不宜')) stars = 2;
    else if (rawJi.length > rawYi.length)                         stars = 3;
    else if (rawYi.length > rawJi.length + 8)                     stars = 5;
  } else if (!isNaN(scStr)) {
    stars = Math.min(5, Math.max(1, parseInt(scStr, 10)));
  }
  const starStr = '⭐'.repeat(stars);

  // 顶部动态信息
  const topText = SHOW_MODE === 'week'
    ? getWeekInfo(Y, M, D)
    : lunar.astro;
  const topIcon = SHOW_MODE === 'week' ? 'sf-symbol:list.number' : 'sf-symbol:sparkles';

  // ─────────────────────────────────────────────────────────────────────────
  // §8  UI 构建
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 构建单行宜/忌条目。
   * 移除了 getCharWidth 字符宽度模拟换行，直接用 maxLines:1 由渲染引擎负责截断。
   */
  const makeRow = (icon, color, label, text, isFirst) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 2,
        children: [
          { type: 'image', src: `sf-symbol:${icon}`, color: isFirst ? color : C.transparent, width: 13, height: 13 },
          { type: 'text',  text: label, font: { size: 12, weight: 'heavy' }, textColor: isFirst ? color : C.transparent },
        ],
      },
      { type: 'text', text, font: { size: 12, weight: 'medium' }, textColor: C.sub, maxLines: 1, flex: 1 },
    ],
  });

  // 宜/忌各最多输出两行，超出部分拼入第二行
  const buildRows = (raw, icon, color, label) => {
    if (!raw) return [];
    // 按空格拆词后按渲染宽度分两段，超出部分省略为“…”
    const words = raw.split(/\s+/).filter(Boolean);
    const LIMIT = 14;
    let line1 = '', line2 = '';
    for (const w of words) {
      if ((line1 + w).length <= LIMIT)       line1 += (line1 ? ' ' : '') + w;
      else if ((line2 + w).length <= LIMIT)  line2 += (line2 ? ' ' : '') + w;
      else                                   { line2 = line2.trimEnd() + '…'; break; }
    }
    const rows = [makeRow(icon, color, label, line1, true)];
    if (line2) rows.push(makeRow(icon, color, label, line2, false));
    return rows;
  };

  const gridRows = [
    ...buildRows(rawYi, 'checkmark.circle.fill', C.yi, '宜'),
    ...buildRows(rawJi, 'xmark.circle.fill',     C.ji, '忌'),
  ];
  const dynamicGap = gridRows.length <= 2 ? 9 : gridRows.length === 3 ? 6 : 4;

  const lunarHeader = [
    `${lunar.gz}(${lunar.ani})年 ${lunar.cn} ${shichen}`,
    lunar.term ? `· 今日${lunar.term}` : `· 当前${currentTerm}`,
  ].join(' ');

  return {
    type: 'widget', padding: 12, url: 'calshow://',
    backgroundGradient: {
      type: 'linear', colors: C.bg,
      startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 },
    },
    children: [
      // ── 顶部：公历日期 + 星座/周次 ──
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
        children: [
          { type: 'image', src: 'sf-symbol:calendar', color: C.main, width: 16, height: 16 },
          { type: 'text',  text: `${Y}年${M}月${D}日 星期${WEEK_CH}`, font: { size: 15, weight: 'heavy' }, textColor: C.main },
          { type: 'spacer' },
          {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
            children: [
              { type: 'image', src: topIcon, color: C.gold, width: 12, height: 12 },
              { type: 'text',  text: topText, font: { size: 11, weight: 'bold' }, textColor: C.muted, maxLines: 1, minScale: 0.6 },
            ],
          },
        ],
      },

      { type: 'spacer', length: 6 },

      // ── 主体 ──
      {
        type: 'stack', direction: 'column', alignItems: 'start', gap: dynamicGap,
        children: [

          // 农历 / 干支 / 时辰
          { type: 'text', text: lunarHeader, font: { size: 13, weight: 'bold' }, textColor: C.gold },

          // 宜 / 忌
          ...gridRows,

          // 冲煞 & 运势
          {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
            children: [
              {
                type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
                children: [
                  { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C.gold, width: 12, height: 12 },
                  { type: 'text',  text: '冲煞:', font: { size: 12, weight: 'bold'   }, textColor: C.muted },
                  { type: 'text',  text: chongshaInfo, font: { size: 12, weight: 'medium' }, textColor: C.muted },
                ],
              },
              { type: 'text', text: '|', font: { size: 11, weight: 'medium' }, textColor: C.divider },
              {
                type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
                children: [
                  { type: 'text', text: '运势:', font: { size: 12, weight: 'bold'   }, textColor: C.muted },
                  { type: 'text', text: starStr,  font: { size: 12, weight: 'medium' }, textColor: C.muted },
                ],
              },
            ],
          },

          // 节气倒计时
          {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
              { type: 'image', src: 'sf-symbol:leaf.arrow.circlepath', color: C.term, width: 13, height: 13 },
              { type: 'text',  text: '节气:', font: { size: 12, weight: 'bold'   }, textColor: C.term },
              {
                type: 'text',
                text: upcomingTerms.map(t => `${t.name} ${t.days}天`).join(', '),
                font: { size: 12, weight: 'medium' }, textColor: C.term, maxLines: 1, flex: 1,
              },
            ],
          },

        ],
      },

      { type: 'spacer' },
    ],
  };
}
