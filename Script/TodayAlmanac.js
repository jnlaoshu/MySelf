/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 * 更新：2025.12.15 17:30
 */

(async () => {
  /* ========== 配置与工具 ========== */
  const TAG = "festival_countdown";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const curYear = now.getFullYear();

  // 工具函数
  const pad2 = (n) => n.toString().padStart(2, '0');
  const fmtYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  
  // 参数解析
  const args = (() => {
    if (typeof $argument === "undefined" || !$argument) return {};
    return Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&').trim()));
  })();
  
  const getConfig = (key, def) => {
    const val = args[key] || args[key.toLowerCase()];
    if (val === undefined) return def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  // 简易 Get 请求
  const httpGet = (url) => new Promise(resolve => {
    $httpClient.get({ url, timeout: 5000 }, (err, resp, data) => resolve((!err && resp.status === 200) ? data : null));
  });

  const fetchJson = async (url, fallback) => {
    if (!url) return fallback;
    try { return JSON.parse(await httpGet(url)) || fallback; } 
    catch { return fallback; }
  };

  // 计算天数差
  const dateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor((new Date(y, m - 1, d) - new Date(curYear, now.getMonth(), now.getDate())) / 86400000);
  };

  /* ========== 农历核心算法 ========== */
  const cal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥", Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    
    lYearDays(y) {
      let i, sum = 348;
      for(i = 0x8000; i > 0x8; i >>= 1) sum += ((this.lInfo[y-1900] & i) ? 1 : 0);
      return sum + this.leapDays(y);
    },
    leapMonth(y) { return (this.lInfo[y-1900] & 0xf); },
    leapDays(y) { return this.leapMonth(y) ? ((this.lInfo[y-1900] & 0x10000) ? 30 : 29) : 0; },
    monthDays(y, m) { return ((this.lInfo[y-1900] & (0x10000 >> m)) ? 30 : 29); },
    solarDays(y, m) {
      if (m === 2) return (((y%4 === 0) && (y%100 !== 0) || (y%400 === 0)) ? 29 : 28);
      return [31,28,31,30,31,30,31,31,30,31,30,31][m-1];
    },
    toGanZhi(o) { return this.Gan[o%10] + this.Zhi[o%12]; },
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
    getAnimal(y) { return this.Animals[(y-4)%12]; },
    // 阳历转阴历 (修正版)
    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0;
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      
      const year = i;
      let isLeap = false;
      leap = this.leapMonth(i);
      
      for(i = 1; i < 13 && offset > 0; i++) {
        // 闰月
        if(leap > 0 && i === (leap+1) && !isLeap) { 
          --i; 
          isLeap = true; 
          temp = this.leapDays(year); 
        } else { 
          temp = this.monthDays(year, i); 
        }
        
        // 解除闰月
        if (isLeap === true && i === (leap + 1)) isLeap = false;
        
        offset -= temp;
      }
      
      if (offset === 0 && leap > 0 && i === leap + 1) {
        if (isLeap) { isLeap = false; }
        else { isLeap = true; --i; }
      }
      
      if(offset < 0) { offset += temp; i--; }
      
      const month = i, day = offset + 1;
      const gzY = this.toGanZhi(year-3); // 简化计算
      const termId = this.getTerm(y, m*2-1) === d ? m*2-2 : (this.getTerm(y, m*2) === d ? m*2-1 : null);
      
      return {
        lYear: year, lMonth: month, lDay: day,
        animal: this.getAnimal(year),
        monthCn: (leap === month && isLeap ? "闰" : "") + this.nStr3[month-1] + "月",
        dayCn: this.toChinaDay(day),
        gzYear: gzY,
        gzMonth: this.toGanZhi((y-1900)*12 + m + 11 + (d >= this.getTerm(y, m*2-1)?1:0)),
        gzDay: this.toGanZhi(Date.UTC(y, m-1, 1)/86400000 + 25567 + 10 + d - 1),
        term: termId !== null ? this.terms[termId] : null,
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0), 2) + "座"
      };
    },
    // 阴历转阳历 (节日计算用)
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
    // 农历除夕
    const eve = cal.monthDays(year, 12) === 29 ? 29 : 30;
    const lToS = (m, d) => { const r = cal.lunar2solar(year, m, d); return fmtYMD(r.y, r.m, r.d); };
    const weekDay = (m, n, w) => { // m月第n个周w
      const d = new Date(year, m-1, 1);
      let day = 1 + ((w - d.getDay() + 7) % 7) + (n-1)*7;
      return fmtYMD(year, m, Math.min(day, 31));
    };

    return {
  // 法定节假日（含成都义教段学校特定时间）
      legal: [
        ["元旦", fmtYMD(year, 1, 1)], 
		["寒假", fmtYMD(year, 1, 31)], //2026年成都义教段学校放寒假
		["春节", lToS(1, 1)],
        ["开学", fmtYMD(year, 3, 2)], //2026年成都义教段学校春季开学
		["清明节", fmtYMD(year, 4, cal.getTerm(year, 7))],
        ["春假", fmtYMD(year, 4, 7)], //清明节后第1天（成都春假）
		["劳动节", fmtYMD(year, 5, 1)], ["端午节", lToS(5, 5)],
        ["暑假", fmtYMD(year, 7, 4)], //2026年成都义教段学校放暑假
		["中秋节", lToS(8, 15)], 
		["国庆节", fmtYMD(year, 10, 1)],
        ["秋假", weekDay(11, 2, 3)]   // 11月第2个周三（成都秋假）
      ],
 // 民俗节日
      folk: [
        ["除夕", lToS(12, eve)], ["元宵节", lToS(1, 15)], ["龙抬头", lToS(2, 2)],
        ["七夕节", lToS(7, 7)], ["中元节", lToS(7, 15)], ["重阳节", lToS(9, 9)],
        ["寒衣节", lToS(10, 1)], ["下元节", lToS(10, 15)], ["腊八节", lToS(12, 8)],
        ["北方小年", lToS(12, 23)], ["南方小年", lToS(12, 24)]
      ],
  // 国际/洋节
      intl: [
        ["情人节", fmtYMD(year, 2, 14)], 
		["母亲节", weekDay(5, 2, 0)],   // 5月第2个周日
		["父亲节", weekDay(6, 3, 0)],   // 6月第3个周日
        ["万圣节", fmtYMD(year, 10, 31)], 
		["平安夜", fmtYMD(year, 12, 24)], 
		["圣诞节", fmtYMD(year, 12, 25)],
        ["感恩节", weekDay(11, 4, 4)]   // 11月第4个周四
      ],
      term: Array.from({length:24}, (_, i) => {
        const m = Math.floor(i/2)+1, id = i+1;
        return [cal.terms[i], fmtYMD(year, m, cal.getTerm(year, id))];
      })
    };
  };

  /* ========== 业务逻辑执行 ========== */
  const lNow = cal.solar2lunar(curYear, now.getMonth()+1, now.getDate());
  
  // 1. 获取黄历详情 (并行请求)
  const almanacReq = getConfig('show_almanac', true) ? (async () => {
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${pad2(now.getMonth()+1)}.json`;
    const data = await fetchJson(url, {});
    const item = data?.data?.[0]?.almanac?.find(i => Number(i.day) === now.getDate());
    
    // 基础头部
    const baseHead = `干支纪法：${lNow.gzYear}年 ${lNow.gzMonth}月 ${lNow.gzDay}日`;
    // 如果API失败，使用基础计算；成功则增强显示
    if (!item) return baseHead + (lNow.term ? ` ${lNow.term}` : '');
    
    const desc = [item.desc, item.term, item.value].filter(Boolean).join(" ");
    return `${item.gzYear}年 ${item.gzMonth}月 ${item.gzDate}日 ${desc}\n✅ 宜：${item.suit || '——'}\n❎ 忌：${item.avoid || '——'}`;
  })() : Promise.resolve("");

  // 2. 准备配置数据
  const titleReq = fetchJson(args.TITLES_URL, null);
  const blessReq = fetchJson(args.BLESS_URL, {});

  const [almanacTxt, titles, blessMap] = await Promise.all([almanacReq, titleReq, blessReq]);

  // 3. 计算所有节日列表 (今年+明年)
  const fThis = getFests(curYear), fNext = getFests(curYear + 1);
  const merge = (k, count) => [...fThis[k], ...fNext[k]].filter(i => dateDiff(i[1]) >= 0).slice(0, count);
  
  const L3 = merge("legal", 4);
  const F3 = merge("folk", 3);
  const I3 = merge("intl", 3);
  const T3 = merge("term", 4);

  // 4. 通知检查 (6点后，且未通知过)
  const checkNotify = (list) => {
    const todayFest = list.find(i => dateDiff(i[1]) === 0);
    if (todayFest && now.getHours() >= 6) {
      const key = `timecard_pushed_${todayFest[1]}`;
      if ($store && $store.read(key) !== "1") {
        $store.write("1", key);
        if (typeof $notification !== "undefined") {
          $notification.post(`🎉 今天是 ${todayFest[0]}`, "", blessMap[todayFest[0]] || "节日快乐！");
        }
      }
    }
  };
  checkNotify(L3); checkNotify(F3);

  // 5. 生成标题
  const getTitle = () => {
    // 寻找最近的重要节日
    const near = [L3[0], F3[0], I3[0]].sort((a,b) => dateDiff(a[1]) - dateDiff(b[1]))[0];
    const diff = dateDiff(near[1]);
    
    const defT = [
      `${curYear}年${pad2(now.getMonth()+1)}月${pad2(now.getDate())}日 星期${"日一二三四五六"[now.getDay()]} ${lNow.astro}`,
      `{lunar}`
    ];
    const pool = (Array.isArray(titles) && titles.length) ? titles : defT;
    
    // 随机或轮循标题
    const mode = (args.TITLE_MODE || "random").toLowerCase();
    let idx = 0;
    if (mode === "random" || !$store) idx = Math.floor(Math.random() * pool.length);
    else {
      const key = `${TAG}_title_idx_${todayStr}`;
      idx = parseInt($store.read(key) || "0") % pool.length;
      if (!$store.read(key)) $store.write(String(Math.floor(Math.random() * pool.length)), key);
    }

    // 规范化农历显示格式 (例如：甲辰(龙)年 正月初一)
    const tLunar = `${lNow.gzYear}(${lNow.animal})年 ${lNow.monthCn}${lNow.dayCn}`;
    const tSolar = `${now.getMonth()+1}月${now.getDate()}日（${lNow.astro}）`;
    
    return pool[idx]
      .replace("{lunar}", tLunar).replace("{solar}", tSolar)
      .replace("{next}", near[0]).replace(/\{diff\}/g, diff);
  };

  // 6. 渲染面板
  const renderLine = (list) => list.map(i => {
    const d = dateDiff(i[1]);
    return `${i[0]}${d === 0 ? '' : d + '天'}`;
  }).join(" , ");

  const content = [
    almanacTxt,
    [renderLine(L3), renderLine(T3), renderLine(F3), renderLine(I3)].filter(Boolean).join("\n")
  ].filter(Boolean).join("\n\n");

  $done({
    title: getTitle(),
    content: content,
    icon: "calendar",
    "icon-color": "#FF9800"
  });

})().catch(e => {
  console.log(`Error: ${e.message}`);
  $done({ title: "黄历加载失败", content: e.message, icon: "exclamationmark.triangle" });
});
