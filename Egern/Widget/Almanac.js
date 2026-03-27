/**
 * ==========================================
 * 📌 岁时黄历 Widget
 * ✨ 功能概览:
 *   • 三尺寸自适应：小号日历风，中/大号经典黄历风
 *   • 农历引擎：干支、生肖、农历日期、二十四节气，全部本地计算
 *   • 宜忌数据：远程 API 获取，多字段 key 兼容，断网自动降级
 *   • 中/大号宜忌：splitText 多节点行渲染，规避 iOS 长文截断
 *   • 小号：精简单行模式，右上角显示星座或周次
 * 🔧 环境变量:
 *   ASTRO_OR_WEEK         — 右上角显示「星座」或「周次」(默认: 星座)
 *   SHOW_TEACHING_WEEK    — 是否显示教学周 (默认: true)
 *   TEACHING_WEEK_START   — 教学周起始日期，格式 YYYY-MM-DD
 * 🔗 引用链接：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.js
 * ⏱️ 更新时间：2026.03.28 07:15
 * ==========================================
 */

export default async function(ctx) {

  // ── 环境变量 ──────────────────────────────────────────────────────────────
  const envMode    = String(ctx.env?.ASTRO_OR_WEEK       ?? '').trim();
  const SHOW_MODE  = (envMode === '周次' || envMode.toLowerCase() === 'week') ? 'week' : 'astro';
  const envShowTW  = String(ctx.env?.SHOW_TEACHING_WEEK  ?? 'true').trim().toLowerCase();
  const envTWStart = String(ctx.env?.TEACHING_WEEK_START ?? '').trim();

  // ── 尺寸检测 ──────────────────────────────────────────────────────────────
  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');

  // ── 色彩令牌 ──────────────────────────────────────────────────────────────
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF'  },
    sub:         { light: '#48484A', dark: '#D1D1D6'  },
    muted:       { light: '#8E8E93', dark: '#8E8E93'  },
    divider:     { light: '#E5E5EA', dark: '#38383A'  },
    gold:        { light: '#B58A28', dark: '#D6A53A'  },
    yi:          { light: '#2E8045', dark: '#32D74B'  },
    ji:          { light: '#CA3B32', dark: '#FF453A'  },
    term:        { light: '#628C7B', dark: '#73A491'  },
    transparent: '#00000000'
  };

  // ── UI 基础构建器 ─────────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) =>
    ({ type: "text", text: String(text), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) =>
    ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) =>
    ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 时间基准（强制 UTC+8）─────────────────────────────────────────────────
  const tzOffset  = new Date().getTimezoneOffset();
  const now       = new Date(Date.now() + (tzOffset + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const WEEK      = "日一二三四五六"[now.getDay()];
  const P         = n => String(n).padStart(2, '0');

  // ── 教学周计算 ────────────────────────────────────────────────────────────
  let teachingWeekStr = "";
  if (SHOW_MODE === 'astro' && envShowTW === 'true' && envTWStart) {
    const tStart = new Date(envTWStart.replace(/-/g, '/'));
    if (!isNaN(tStart.getTime())) {
      const diffDays = Math.floor(
        (new Date(Y, M - 1, D).getTime() - new Date(tStart.getFullYear(), tStart.getMonth(), tStart.getDate()).getTime()) / 86400000
      );
      teachingWeekStr = diffDays >= 0 ? `教学第${Math.floor(diffDays / 7) + 1}周` : "未开学";
    }
  }

  // ── ISO 周次计算 ──────────────────────────────────────────────────────────
  const getWeekInfo = (dateObj) => {
    const d          = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
    const dayNum     = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart  = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo     = Math.ceil((d.getTime() - yearStart.getTime()) / 86400000 / 7 + 1);
    const offsetDate = dateObj.getDate() + (new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay() || 7) - 1;
    return `本年第${weekNo}周 · 月第${Math.ceil(offsetDate / 7)}周`;
  };

  // ── 农历引擎 ──────────────────────────────────────────────────────────────
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    termNames: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    getTerm(y, n) {
      return new Date(
        (31556925974.7 * (y - 1900)) +
        [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n - 1] * 60000 +
        Date.UTC(1900, 0, 6, 2, 5)
      ).getUTCDate();
    },
    parse(y, m, d) {
      let offset = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
      let i, temp = 0;
      for (i = 1900; i < 2101 && offset > 0; i++) {
        temp = 348;
        for (let j = 0x8000; j > 0x8; j >>= 1) temp += (this.info[i - 1900] & j) ? 1 : 0;
        temp += (this.info[i - 1900] & 0xf) ? ((this.info[i - 1900] & 0x10000) ? 30 : 29) : 0;
        offset -= temp;
      }
      if (offset < 0) { offset += temp; i--; }
      const lYear = i, leap = this.info[lYear - 1900] & 0xf;
      let isLeap = false;
      for (i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i === (leap + 1) && !isLeap) {
          --i; isLeap = true;
          temp = (this.info[lYear - 1900] & 0x10000) ? 30 : 29;
        } else {
          temp = (this.info[lYear - 1900] & (0x10000 >> i)) ? 30 : 29;
        }
        if (isLeap && i === (leap + 1)) isLeap = false;
        offset -= temp;
      }
      if (offset === 0 && leap > 0 && i === leap + 1) {
        isLeap = !isLeap ? true : (isLeap = false, --i, false);
      }
      if (offset < 0) { offset += temp; i--; }
      const lD      = offset + 1;
      const tId     = m * 2 - (d < this.getTerm(y, m * 2 - 1) ? 2 : 1);
      const gz      = "甲乙丙丁戊己庚辛壬癸"[(lYear - 4) % 10] + "子丑寅卯辰巳午未申酉戌亥"[(lYear - 4) % 12];
      const ani     = "鼠牛虎兔龙蛇马羊猴鸡狗猪"[(lYear - 4) % 12];
      const cnMonth = `${isLeap ? "闰" : ""}${"正二三四五六七八九十冬腊"[i - 1]}月`;
      const cnDay   = lD === 10 ? "初十" : lD === 20 ? "二十" : lD === 30 ? "三十"
        : ["初","十","廿","卅"][Math.floor(lD / 10)] + ["日","一","二","三","四","五","六","七","八","九","十"][lD % 10];
      const astro   = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯"
        .substr(m * 2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m - 1] ? 2 : 0), 2) + "座";
      return { gz, ani, cn: `${cnMonth}${cnDay}`, term: this.getTerm(y, tId + 1) === d ? this.termNames[tId] : "", astro };
    }
  };

  // ── 未来节气（取前 4 条）─────────────────────────────────────────────────
  const todayMs  = new Date(Y, M - 1, D).getTime();
  const allTerms = [];
  [-1, 0, 1].forEach(offset => {
    for (let i = 1; i <= 24; i++)
      allTerms.push({ name: Lunar.termNames[i - 1], date: new Date(Y + offset, Math.floor((i - 1) / 2), Lunar.getTerm(Y + offset, i)) });
  });
  let upcomingTerms = [];
  for (let i = 0; i < allTerms.length; i++) {
    const diff = Math.round((allTerms[i].date.getTime() - todayMs) / 86400000);
    if (diff >= 0) {
      const startIdx = diff === 0 ? i + 1 : i;
      upcomingTerms  = allTerms.slice(startIdx, startIdx + 4)
        .map(t => `${t.name} ${Math.round((t.date.getTime() - todayMs) / 86400000)}天`);
      break;
    }
  }

  // ── 农历解析 & 时辰 ───────────────────────────────────────────────────────
  const obj        = Lunar.parse(Y, M, D);
  const shichenStr = "子丑寅卯辰巳午未申酉戌亥"[Math.floor((now.getHours() + 1) % 24 / 2)] + "时";

  // ── 远程黄历数据（断网自动降级为空对象）─────────────────────────────────
  let apiData = {};
  try {
    const resp = await ctx.http.get(
      `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`,
      { timeout: 10000 }
    );
    const json     = JSON.parse(await resp.text());
    const patterns = [
      `${Y}-${P(M)}-${P(D)}`, `${Y}-${M}-${D}`,
      `${Y}/${P(M)}/${P(D)}`, `${Y}/${M}/${D}`,
      `${Y}${P(M)}${P(D)}`
    ];
    // 递归查找匹配当日的数据节点，兼容多种 JSON 结构
    const findDateData = (data) => {
      if (!data || typeof data !== 'object') return null;
      for (const key in data) {
        const val = data[key];
        if (!val) continue;
        if (patterns.some(p => String(key).includes(p))) return val;
        if (typeof val === 'object') {
          const dStr = String(val.date || val.day || val.gregorian || val.oDate || "");
          if (patterns.some(p => dStr.includes(p))) return val;
          if (val.day == D && (val.month == M || (!val.month && !val.year))) return val;
          const res = findDateData(val);
          if (res) return res;
        }
      }
      return null;
    };
    apiData = findDateData(json) || {};
  } catch (_) {}

  // ── 宜忌 & 冲煞 & 运势 ───────────────────────────────────────────────────
  const getVal = (...keys) => {
    for (const k of keys)
      if (apiData[k] != null && apiData[k] !== '') return String(apiData[k]);
    return "";
  };
  const rawYi = getVal("yi", "Yi", "suit", "appropriate").replace(/[.。]/g, " ").trim();
  const rawJi = getVal("ji", "Ji", "avoid", "taboo").replace(/[.。]/g, " ").trim();

  let chongshaInfo = getVal("chongsha", "ChongSha", "chong");
  if (!chongshaInfo || chongshaInfo === "无") {
    // API 无数据时按干支日序推算冲煞
    const cycle = (Math.round((Date.UTC(Y, M - 1, D) - Date.UTC(1900, 0, 31)) / 86400000) + 40) % 60;
    chongshaInfo = `冲${"鼠牛虎兔龙蛇马羊猴鸡狗猪"[(cycle % 12 + 6) % 12]}` +
      `(${"甲乙丙丁戊己庚辛壬癸"[(cycle + 6) % 10]}${"子丑寅卯辰巳午未申酉戌亥"[(cycle + 6) % 12]})` +
      `煞${"南东北西"[cycle % 12 % 4]}`;
  }
  const starStr = "⭐".repeat(parseInt(getVal("score", "Score", "pingfen", "star")) || 4);

  // ── 宜忌分行（maxW=52 保证中/大号换行位置一致）──────────────────────────
  const splitText = (str, maxW = 52) => {
    if (!str) return [];
    let lines = [], line = "", w = 0;
    for (const token of (str.match(/[\d\/a-zA-Z.\-]+|./gu) || [])) {
      const tw = [...token].reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0);
      if (w + tw > maxW) { lines.push(line); line = token; w = tw; }
      else               { line += token;    w += tw; }
    }
    if (line) lines.push(line);
    return lines.map(l => l.replace(/^[\s，。、]+|[\s，。、]+$/g, ''));
  };

  const topIcon = SHOW_MODE === 'week' ? 'list.number' : 'sparkles';
  const topText = SHOW_MODE === 'week' ? getWeekInfo(now) : obj.astro;

  // ── 小号布局 ──────────────────────────────────────────────────────────────
  if (isSmall) {
    return {
      type: 'widget', padding: 12, url: 'calshow://',
      backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        mkRow([
          mkText(D, 36, "heavy", C.main),
          { type: 'stack', direction: 'column', alignItems: 'start', padding: [4, 0, 0, 0], children: [
            mkText(`${M}月`, 12, "heavy", C.muted),
            mkText(`周${WEEK}`, 12, "heavy", C.muted)
          ]},
          mkSpacer(),
          mkRow([ mkIcon(topIcon, C.gold, 11), mkText(topText, 10, "bold", C.muted, { maxLines: 1 }) ], 3)
        ], 6),
        mkSpacer(8),
        mkText(`${obj.gz}年 ${obj.cn}${obj.term ? ` 今日${obj.term}` : ""}`, 11, "bold", C.gold),
        mkSpacer(8),
        ...(rawYi ? [mkRow([ mkIcon('checkmark.circle.fill', C.yi, 11), mkText(rawYi.replace(/\s+/g, ' '), 11, "medium", C.sub, { maxLines: 1 }) ], 6)] : []),
        mkSpacer(6),
        ...(rawJi ? [mkRow([ mkIcon('xmark.circle.fill',     C.ji, 11), mkText(rawJi.replace(/\s+/g, ' '), 11, "medium", C.sub, { maxLines: 1 }) ], 6)] : []),
        mkSpacer(8),
        mkRow([ mkIcon('shield.lefthalf.filled', C.gold, 11), mkText(chongshaInfo,           10, "medium", C.muted, { maxLines: 1 }) ], 6),
        mkSpacer(6),
        mkRow([ mkIcon('leaf.arrow.circlepath',  C.term, 11), mkText(upcomingTerms[0] || "", 10, "medium", C.term,  { maxLines: 1 }) ], 6)
      ]
    };
  }

  // ── 中/大号公共组件 ───────────────────────────────────────────────────────
  // 标签列固定宽度 52，内容区 flex 自适应
  const buildRow = (icon, color, label, content, isFirst = true, contentColor = C.sub) => ({
    type: 'stack', direction: 'row', alignItems: 'start', gap: 4,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
        mkIcon(isFirst ? icon : 'circle.fill', isFirst ? color : C.transparent, 13),
        mkText(isFirst ? label : " ", 12, "heavy", isFirst ? color : C.transparent)
      ]},
      mkText(content, 12, "medium", contentColor, { flex: 1 })
    ]
  });

  // 第一行带标签，溢出内容折至无标签的第二行继续渲染
  const buildYiJiRows = (raw, icon, color, label) => {
    if (!raw) return [];
    const [l0, ...rest] = splitText(raw);
    const rows = [];
    if (l0)          rows.push(buildRow(icon, color, label, l0,             true));
    if (rest.length) rows.push(buildRow(icon, color, label, rest.join(" "), false));
    return rows;
  };

  // ── 中/大号布局 ───────────────────────────────────────────────────────────
  return {
    type: 'widget', padding: 12, url: 'calshow://',
    backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [

      mkRow([
        mkIcon('calendar', C.main, 16),
        mkText(`${Y}年${M}月${D}日 星期${WEEK}`, 15, "heavy", C.main),
        mkSpacer(),
        mkRow([
          ...(teachingWeekStr ? [
            mkIcon('book.closed', C.muted, 12),
            mkText(teachingWeekStr, 11, "bold", C.muted),
            mkText('·', 11, "bold", C.divider, { padding: [0, 2] })
          ] : []),
          mkIcon(topIcon, C.gold, 12),
          mkText(topText, 11, "bold", C.muted, { maxLines: 1, minScale: 0.5 })
        ], 3)
      ], 6),

      mkSpacer(6),

      { type: 'stack', direction: 'column', alignItems: 'start', gap: 6, children: [
        mkText(
          `${obj.gz}(${obj.ani})年 ${obj.cn} ${shichenStr}${obj.term ? ` · 今日${obj.term}` : ""}`,
          13, "bold", C.gold
        ),
        ...buildYiJiRows(rawYi, 'checkmark.circle.fill', C.yi,  '宜'),
        ...buildYiJiRows(rawJi, 'xmark.circle.fill',     C.ji,  '忌'),
        buildRow('shield.lefthalf.filled', C.gold, '冲煞', `${chongshaInfo}  |  运势: ${starStr}`),
        buildRow('leaf.arrow.circlepath',  C.term, '节气', upcomingTerms.join(", "), true, C.term)
      ]},

      mkSpacer()
    ]
  };
}
