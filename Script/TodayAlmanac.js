/*
 * 今日黄历&节假日倒数
 * 修复：民俗节日跨年排序问题
 * 更新：2025.12.18 08:51
 */

(async () => {
  /* ========== 配置与工具 ========== */
  const TAG = "festival_countdown";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const curYear = now.getFullYear();

  const pad2 = (n) => n.toString().padStart(2, '0');
  const fmtYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  
  const args = (() => {
    if (typeof $argument === "undefined" || !$argument) return {};
    return Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&').trim()));
  })();
  
  const getConfig = (key, def) => {
    const val = args[key] || args[key.toLowerCase()];
    if (val === undefined) return def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  const httpGet = (url) => new Promise(resolve => {
    $httpClient.get({ url, timeout: 5000 }, (err, resp, data) => resolve((!err && resp.status === 200) ? data : null));
  });

  const fetchJson = async (url, fallback) => {
    if (!url) return fallback;
    try { 
      const res = await httpGet(url);
      return res ? JSON.parse(res) : fallback;
    } catch { return fallback; }
  };

  // 计算天数差
  const dateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((target - today) / 86400000);
  };

  /* ========== 农历核心算法 (保持原版不变) ========== */
  const cal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc92108dc2','9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc92108dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc92108dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc92108dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc92108dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc92108dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc92108dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0723b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    
    lYearDays(y) {
      let i, sum = 348;
      for(i = 0x8000; i > 0x8; i >>= 1) sum += ((this.lInfo[y-1900] & i) ? 1 : 0);
      return sum + this.leapDays(y);
    },
    leapMonth(y) { return (this.lInfo[y-1900] & 0xf); },
    leapDays(y) { return this.leapMonth(y) ? ((this.lInfo[y-1900] & 0x10000) ? 30 : 29) : 0; },
    monthDays(y, m) { return ((this.lInfo[y-1900] & (0x10000 >> m)) ? 30 : 29); },
    getTerm(y, n) {
      const t = this.sTermInfo[y-1900];
      const d = [];
      for(let i=0; i<t.length; i+=5) {
        const c = parseInt('0x' + t.substr(i,5)).toString();
        d.push(c[0], c.substr(1,2), c[3], c.substr(4,2));
      }
      return parseInt(d[n-1]);
    },
    toChinaDay(d) {
      if (d===10) return "初十"; if (d===20) return "二十"; if (d===30) return "三十";
      return this.nStr2[Math.floor(d/10)] + this.nStr1[d%10];
    },
    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0;
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      const year = i;
      let isLeap = false;
      leap = this.leapMonth(i);
      for(i = 1; i < 13 && offset > 0; i++) {
        if(leap > 0 && i === (leap+1) && !isLeap) { --i; isLeap = true; temp = this.leapDays(year); }
        else { temp = this.monthDays(year, i); }
        if (isLeap === true && i === (leap + 1)) isLeap = false;
        offset -= temp;
      }
      if(offset < 0) { offset += temp; i--; }
      const month = i, day = offset + 1;
      return {
        lYear: year, lMonth: month, lDay: day,
        animal: "鼠牛虎兔龙蛇马羊猴鸡狗猪"[(year-4)%12],
        monthCn: (leap === month && isLeap ? "闰" : "") + this.nStr3[month-1] + "月",
        dayCn: this.toChinaDay(day),
        gzYear: "甲乙丙丁戊己庚辛壬癸"[(year-4)%10] + "子丑寅卯辰巳午未申酉戌亥"[(year-4)%12],
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0), 2) + "座"
      };
    },
    lunar2solar(y, m, d) {
      let offset = 0;
      for(let i = 1900; i < y; i++) offset += this.lYearDays(i);
      let leap = this.leapMonth(y);
      for(let i = 1; i < m; i++) offset += this.monthDays(y, i);
      if(leap > 0 && leap < m) offset += this.leapDays(y);
      const t = new Date((offset + d - 31) * 86400000 + Date.UTC(1900, 1, 30));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth()+1, d: t.getUTCDate() };
    }
  };

  /* ========== 节日数据生成 ========== */
  const getFests = (year) => {
    const lToS = (m, d) => { const r = cal.lunar2solar(year, m, d); return fmtYMD(r.y, r.m, r.d); };
    const weekDay = (m, n, w) => {
      const d = new Date(year, m-1, 1);
      let day = 1 + ((w - d.getDay() + 7) % 7) + (n-1)*7;
      return fmtYMD(year, m, Math.min(day, 31));
    };
    const qmDay = cal.getTerm(year, 7);
    const lastDay12 = cal.monthDays(year, 12);

    return {
      legal: [
        ["元旦", fmtYMD(year, 1, 1)], ["寒假", fmtYMD(year, 1, 31)], ["春节", lToS(1, 1)],
        ["开学", fmtYMD(year, 3, 2)], ["清明", fmtYMD(year, 4, qmDay)], ["春假", fmtYMD(year, 4, qmDay + 1)],
        ["劳动节", fmtYMD(year, 5, 1)], ["端午", lToS(5, 5)], ["暑假", fmtYMD(year, 7, 4)],
        ["中秋", lToS(8, 15)], ["国庆", fmtYMD(year, 10, 1)], ["秋假", weekDay(11, 2, 3)]
      ],
      folk: [
        ["除夕", lToS(12, lastDay12)], ["元宵", lToS(1, 15)], ["龙抬头", lToS(2, 2)],
        ["七夕", lToS(7, 7)], ["中元", lToS(7, 15)], ["重阳", lToS(9, 9)], ["寒衣", lToS(10, 1)], 
        ["下元", lToS(10, 15)], ["腊八", lToS(12, 8)], ["北小年", lToS(12, 23)], ["南小年", lToS(12, 24)]
      ],
      intl: [
        ["情人节", fmtYMD(year, 2, 14)], ["母亲节", weekDay(5, 2, 0)], ["父亲节", weekDay(6, 3, 0)],
        ["平安夜", fmtYMD(year, 12, 24)], ["圣诞节", fmtYMD(year, 12, 25)], ["感恩节", weekDay(11, 4, 4)]
      ],
      term: Array.from({length:24}, (_, i) => [cal.terms[i], fmtYMD(year, Math.floor(i/2)+1, cal.getTerm(year, i+1))])
    };
  };

  /* ========== 业务逻辑 ========== */
  const lNow = cal.solar2lunar(curYear, now.getMonth()+1, now.getDate());
  
  // 1. 获取黄历详情
  let almanacTxt = `干支：${lNow.gzYear}年 ${lNow.monthCn}${lNow.dayCn}`;
  if (getConfig('show_almanac', true)) {
    const data = await fetchJson(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${pad2(now.getMonth()+1)}.json`, {});
    const item = data?.data?.[0]?.almanac?.find(i => Number(i.day) === now.getDate());
    if (item) almanacTxt = `${item.gzYear}年 ${item.gzMonth}月 ${item.gzDate}日\n✅宜：${item.suit}\n❎忌：${item.avoid}`;
  }

  // 2. 节日排序核心逻辑（修复点）
  const fThis = getFests(curYear), fNext = getFests(curYear + 1);
  const mergeSort = (key, count) => {
    return [...fThis[key], ...fNext[key]]
      .map(i => ({ name: i[0], date: i[1], diff: dateDiff(i[1]) }))
      .filter(i => i.diff >= 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, count);
  };

  const L3 = mergeSort("legal", 3), F3 = mergeSort("folk", 3), I3 = mergeSort("intl", 3), T3 = mergeSort("term", 4);

  // 3. 渲染
  const render = (list) => list.map(i => `${i.name}${i.diff === 0 ? ' [今天]' : ' ' + i.diff + '天'}`).join(" , ");

  const title = `${curYear}年${pad2(now.getMonth()+1)}月${pad2(now.getDate())}日 星期${"日一二三四五六"[now.getDay()]} ${lNow.astro}`;
  const content = [
    almanacTxt,
    `法定: ${render(L3)}`,
    `节气: ${render(T3)}`,
    `民俗: ${render(F3)}`,
    `国际: ${render(I3)}`
  ].join("\n\n");

  // 4. 完成
  $done({
    title: title,
    content: content,
    icon: "calendar",
    "icon-color": "#FF9800"
  });

})().catch(e => {
  $done({ title: "脚本错误", content: e.message });
});
