/*
 * 今日黄历&节假日倒数 (成都定制全功能版)
 * 包含：网络黄历、高精度农历、成都义教段学校特定日期、全国高考
 */

(async () => {
  const now = new Date();
  const curYear = now.getFullYear();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // --- 工具函数 ---
  const pad = (n) => n < 10 ? '0' + n : n;
  const fmtYMD = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const dateDiff = (dateStr) => {
    const parts = dateStr.split('-').map(Number);
    const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
    return Math.floor((tDate - todayDate) / 86400000);
  };

  const httpGet = (url) => new Promise(resolve => {
    $httpClient.get({ url, timeout: 2000 }, (err, resp, data) => resolve(data || null));
  });

  /* ========== 1. 农历算法核心 ========== */
  const cal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"],
    leapMonth(y) { return this.lInfo[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.lInfo[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return this.lInfo[y-1900] & (0x10000 >> m) ? 30 : 29; },
    lYearDays(y) {
      let sum = 348;
      for (let i = 0x8000; i > 0x8; i >>= 1) sum += (this.lInfo[y-1900] & i ? 1 : 0);
      return sum + this.leapDays(y);
    },
    getTerm(y, n) {
      const off = [1272061, 1275495, 1281105, 1289445, 1299215, 1310355, 1321560, 1333035, 1342770, 1350855, 1356465, 1359045, 1358580, 1355055, 1348695, 1340400, 1329600, 1318440, 1306935, 1297380, 1289160, 1283115, 1277505, 1274490];
      const d = new Date((31556925974.7 * (y - 1900) + off[n - 1] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
      return d.getUTCDate();
    },
    solar2lunar(y, m, d) {
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      let i, temp = 0;
      for (i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if (offset < 0) { offset += temp; i--; }
      const year = i;
      let leap = this.leapMonth(year), isLeap = false;
      for (i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i === leap + 1 && !isLeap) { --i; isLeap = true; temp = this.leapDays(year); }
        else { temp = this.monthDays(year, i); }
        if (isLeap && i === leap + 1) isLeap = false;
        offset -= temp;
      }
      if (offset === 0 && leap > 0 && i === leap + 1) isLeap = !isLeap;
      if (offset < 0) { offset += temp; i--; }
      return {
        monthCn: (isLeap ? "闰" : "") + this.nStr3[i-1] + "月",
        dayCn: (offset + 1 === 10 ? "初十" : (offset + 1 === 20 ? "二十" : (offset + 1 === 30 ? "三十" : this.nStr2[Math.floor((offset + 1) / 10)] + this.nStr1[(offset + 1) % 10])))
      };
    },
    lunar2solar(y, m, d) {
      let offset = 0;
      for (let i = 1900; i < y; i++) offset += this.lYearDays(i);
      let leap = this.leapMonth(y);
      for (let i = 1; i < m; i++) offset += this.monthDays(y, i);
      if (leap > 0 && leap < m) offset += this.leapDays(y);
      const t = new Date((offset + d - 31) * 86400000 + Date.UTC(1900, 1, 30));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
    }
  };

  /* ========== 2. 节日列表与定制日期算法 ========== */
  const getFests = (year) => {
    const lToS = (m, d) => {
      const r = cal.lunar2solar(year, m, d);
      return fmtYMD(r.y, r.m, r.d);
    };

    // 成都春秋假算法（成都春假、秋假各3天。原则上春假安排在每年清明假期后，与清明假期形成连休；秋假安排在11月第二周的后三天（周三至周五），与周末形成连休）
    const qmDay = cal.getTerm(year, 7);
    const springBreak = fmtYMD(year, 4, qmDay + 1);
    const getAutumnBreak = (y) => {
        let nov1 = new Date(y, 10, 1);
        let firstWed = (3 - nov1.getDay() + 7) % 7;
        if (nov1.getDay() > 3) firstWed += 7;
        return fmtYMD(y, 11, firstWed + 8);
    };

    return {
      legal: [
        ["元旦", `${year}-01-01`],["寒假", `2026-01-31`],["春节", lToS(1, 1)],
        ["开学", `2026-03-02`], ["春假", springBreak], ["劳动节", `${year}-05-01`],
        ["端午", lToS(5, 5)], ["高考", `${year}-06-07`], ["暑假", `2026-07-04`],
        ["中秋", lToS(8, 15)], ["国庆", `${year}-10-01`], ["秋假", getAutumnBreak(year)]
      ],
      folk: [["除夕", lToS(12, cal.monthDays(year, 12))], ["元宵", lToS(1, 15)], ["腊八", lToS(12, 8)]],
      term: Array.from({length:24}, (_, i) => [cal.terms[i], fmtYMD(year, Math.floor(i/2)+1, cal.getTerm(year, i+1))])
    };
  };

  const merge = (key) => {
    return [].concat(getFests(curYear)[key], getFests(curYear + 1)[key])
      .filter(i => dateDiff(i[1]) >= 0)
      .sort((a, b) => parseInt(a[1].replace(/-/g, '')) - parseInt(b[1].replace(/-/g, '')))
      .slice(0, 5); // 增加到5个显示项，确保开学、高考等能露出来
  };

  /* ========== 3. 数据合成与显示 ========== */
  let almanacTxt = "";
  const alData = await httpGet(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${pad(now.getMonth()+1)}.json`);
  if (alData) {
    try {
      const item = JSON.parse(alData).data[0].almanac.find(i => Number(i.day) === now.getDate());
      almanacTxt = item ? `宜：${item.suit}\n忌：${item.avoid}` : "宜：余事勿取";
    } catch(e) { almanacTxt = "黄历解析失败"; }
  } else {
    almanacTxt = "黄历请求超时";
  }

  const lNow = cal.solar2lunar(curYear, now.getMonth() + 1, now.getDate());
  const L5 = merge("legal"), T3 = merge("term"), F3 = merge("folk");
  const render = (arr) => arr.map(i => `${i[0]}${dateDiff(i[1]) === 0 ? "今天" : dateDiff(i[1]) + "天"}`).join(" , ");

  $done({
    title: `${curYear}年${now.getMonth()+1}月${now.getDate()}日 星期${"日一二三四五六"[now.getDay()]} ${lNow.monthCn}${lNow.dayCn}`,
    content: `${almanacTxt}\n\n🗓 节假日：${render(L5)}\n🍂 节气：${render(T3)}\n🧧 民俗：${render(F3)}`,
    icon: "calendar",
    "icon-color": "#FF9800"
  });
})();
