/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * 修复：民俗节日错乱、动态春秋假计算
 */

(async () => {
  /* ========== 配置与工具 ========== */
  const now = new Date();
  const curYear = now.getFullYear();

  const pad2 = (n) => n.toString().padStart(2, '0');
  const fmtYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  
  // 计算天数差
  const dateDiff = (targetDateStr) => {
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((target - today) / 86400000);
  };

  /* ========== 农历核心算法 ========== */
  const cal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f'], // 仅保留关键年份数据
    nStr1: "日一二三四五六七八九十", nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    
    lYearDays(y) {
      let sum = 348;
      for(let i = 0x8000; i > 0x8; i >>= 1) sum += ((this.lInfo[y-1900] & i) ? 1 : 0);
      return sum + this.leapDays(y);
    },
    leapMonth(y) { return (this.lInfo[y-1900] & 0xf); },
    leapDays(y) { return this.leapMonth(y) ? ((this.lInfo[y-1900] & 0x10000) ? 30 : 29) : 0; },
    monthDays(y, m) { return ((this.lInfo[y-1900] & (0x10000 >> m)) ? 30 : 29); },
    
    // 清明节日期算法
    getTermDay(y, n) {
      const off = new Date((31556925974.7 * (y - 1900) + [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
      return off.getUTCDate();
    },

    lunar2solar(y, m, d) {
      let offset = 0;
      for (let i = 1900; i < y; i++) offset += this.lYearDays(i);
      const leap = this.leapMonth(y);
      for (let i = 1; i < m; i++) offset += this.monthDays(y, i);
      if (leap > 0 && leap < m) offset += this.leapDays(y);
      const base = new Date(1900, 0, 31);
      const target = new Date(base.getTime() + (offset + d - 1) * 86400000);
      return { y: target.getFullYear(), m: target.getMonth() + 1, d: target.getDate() };
    },

    solar2lunar(y, m, d) {
      let i, temp = 0, offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      const year = i, leap = this.leapMonth(i);
      let isLeap = false;
      for(i = 1; i < 13 && offset > 0; i++) {
        if(leap > 0 && i === (leap+1) && !isLeap) { --i; isLeap = true; temp = this.leapDays(year); }
        else { temp = this.monthDays(year, i); }
        if (isLeap === true && i === (leap + 1)) isLeap = false;
        offset -= temp;
      }
      if (offset === 0 && leap > 0 && i === leap + 1) { if (isLeap) isLeap = false; else { isLeap = true; --i; } }
      if(offset < 0) { offset += temp; i--; }
      const month = i, day = offset + 1;
      return {
        gzYear: "甲乙丙丁戊己庚辛壬癸"[(year-4)%10] + "子丑寅卯辰巳午未申酉戌亥"[(year-4)%12],
        animal: "鼠牛虎兔龙蛇马羊猴鸡狗猪"[(year-4)%12],
        monthCn: (leap === month && isLeap ? "闰" : "") + this.nStr3[month-1] + "月",
        dayCn: (day === 10 ? "初十" : day === 20 ? "二十" : day === 30 ? "三十" : ["初","十","廿","卅"][Math.floor(day/10)] + this.nStr1[day%10])
      };
    }
  };

  /* ========== 节日列表生成 ========== */
  const getFests = (year) => {
    const lToS = (m, d) => { const r = cal.lunar2solar(year, m, d); return fmtYMD(r.y, r.m, r.d); };
    
    // 1. 计算春假 (清明节后第一天)
    const qmDay = cal.getTermDay(year, 7); // 清明
    const springVacation = fmtYMD(year, 4, qmDay + 1);

    // 2. 计算秋假 (11月第二周周三)
    const firstDayOfNov = new Date(year, 10, 1).getDay(); // 0是周日
    const offsetToFirstWed = (3 - firstDayOfNov + 7) % 7; 
    const autumnVacation = fmtYMD(year, 11, 1 + offsetToFirstWed + 7);

    // 3. 腊月长度 (除夕计算)
    const eveDay = cal.monthDays(year, 12);

    return {
      legal: [
        ["元旦", fmtYMD(year, 1, 1)], 
        ["春节", lToS(1, 1)],
        ["清明", fmtYMD(year, 4, qmDay)],
        ["春假", springVacation],
        ["劳动节", fmtYMD(year, 5, 1)], 
        ["端午节", lToS(5, 5)],
        ["中秋节", lToS(8, 15)], 
        ["国庆节", fmtYMD(year, 10, 1)],
        ["秋假", autumnVacation]
      ],
      folk: [
        ["除夕", lToS(12, eveDay)], 
        ["元宵节", lToS(1, 15)], 
        ["龙抬头", lToS(2, 2)],
        ["七夕节", lToS(7, 7)], 
        ["中元节", lToS(7, 15)], 
        ["重阳节", lToS(9, 9)],
        ["腊八节", lToS(12, 8)]
      ]
    };
  };

  /* ========== 数据展示 ========== */
  const lNow = cal.solar2lunar(curYear, now.getMonth()+1, now.getDate());
  const fThis = getFests(curYear), fNext = getFests(curYear + 1);
  
  const merge = (k) => {
    return [...fThis[k], ...fNext[k]]
      .map(i => [i[0], i[1], dateDiff(i[1])])
      .filter(i => i[2] >= 0)
      .sort((a, b) => a[2] - b[2])
      .slice(0, 4);
  };

  const LList = merge("legal");
  const FList = merge("folk");

  const render = (list) => list.map(i => `${i[0]}${i[2] === 0 ? '·今日' : i[2] + '天'}`).join(" , ");

  $done({
    title: `${curYear}年${pad2(now.getMonth()+1)}月${pad2(now.getDate())}日 星期${"日一二三四五六"[now.getDay()]}`,
    content: `📅 农历：${lNow.gzYear}(${lNow.animal})年 ${lNow.monthCn}${lNow.dayCn}\n\n🎋 节假倒计时：\n${render(LList)}\n\n🍂 民俗传统节：\n${render(FList)}`,
    icon: "calendar",
    "icon-color": "#FF9800"
  });
})();
