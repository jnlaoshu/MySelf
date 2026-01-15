/*
 * 今日黄历 & 节假日倒数 (逻辑修正版)
 * 修正内容：
 * 1. 修正天干地支年份变更逻辑：以“立春”为岁首，而非正月初一。
 * 2. 修正月份干支：以“节气”划分月份，而非农历月。
 * 3. 修正日期干支：以 1900-01-31 (甲午日) 为基准的精确偏移量计算。
 */

(async () => {
  const TAG = "Festival_Countdown";
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const todayStr = `${curYear}-${curMonth}-${curDate}`;
  const weekCn = "日一二三四五六";

  // 环境兼容性处理
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const hasNotify = typeof $notification !== "undefined";
  const isSurge = typeof $httpClient !== "undefined";

  /* ========== 核心算法：农历与干支 (Logic Fixed) ========== */
  const LunarCal = {
    GAN: "甲乙丙丁戊己庚辛壬癸",
    ZHI: "子丑寅卯辰巳午未申酉戌亥",
    ANIMALS: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    N_STR1: "日一二三四五六七八九十",
    N_STR2: ["初", "十", "廿", "卅"],
    N_STR3: ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"],
    TERMS: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
    L_INFO: [
      0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,1,0x06d20,0x0ada0,1,0x09370,1,0x04970,0x064b0,1,0x0ea50,0x06b20,1,0x0aae0,0x092e0,1,0x0c960,1,0x0d4a0,0x0da50,1,0x056a0,0x0a6d0,1,0x052d0,1,0x0a950,0x0b4a0,1,0x0ad50,0x055a0,1,0x0a5b0,0x052b0,1,0x06930,1,0x06aa0,0x0ad50,1,0x04b60,0x0a570,1,0x0d160,1,0x0d520,0x0daa0,1,0x056d0,0x04ae0,1,0x0a2d0,0x0d150,1,0x0d520
    ],
    S_TERM_INFO: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc92108dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc92108dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc92108dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc92108dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc92108dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc92108dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],

    lYearDays(y) {
      let sum = 348;
      for (let i = 0x8000; i > 0x8; i >>= 1) sum += (this.L_INFO[y - 1900] & i) ? 1 : 0;
      return sum + this.leapDays(y);
    },
    leapMonth(y) { return this.L_INFO[y - 1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.L_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.L_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; },
    toGanZhi(o) { return this.GAN[o % 10] + this.ZHI[o % 12]; },
    getTerm(y, n) {
      const t = this.S_TERM_INFO[y - 1900];
      const d = [];
      for (let i = 0; i < t.length; i += 5) {
        const c = parseInt('0x' + t.substr(i, 5)).toString();
        d.push(c[0], c.substr(1, 2), c[3], c.substr(4, 2));
      }
      return parseInt(d[n - 1]);
    },
    toChinaDay(d) {
      if (d === 10) return "初十";
      if (d === 20) return "二十";
      if (d === 30) return "三十";
      return this.N_STR2[Math.floor(d / 10)] + this.N_STR1[d % 10];
    },
    getAnimal(y) { return this.ANIMALS[(y - 4) % 12]; },

    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0;
      let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for (i = 1900; i < 2101 && offset > 0; i++) {
        temp = this.lYearDays(i);
        offset -= temp;
      }
      if (offset < 0) { offset += temp; i--; }
      const year = i;
      let isLeap = false;
      leap = this.leapMonth(i);
      for (i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i === leap + 1 && !isLeap) { --i; isLeap = true; temp = this.leapDays(year); }
        else { temp = this.monthDays(year, i); }
        if (isLeap && i === leap + 1) isLeap = false;
        offset -= temp;
      }
      if (offset === 0 && leap > 0 && i === leap + 1) {
        if (isLeap) isLeap = false; else { isLeap = true; --i; }
      }
      if (offset < 0) { offset += temp; i--; }
      const month = i, day = offset + 1;

      // --- 干支修正逻辑 (Fixed GanZhi Logic) ---
      // 1. 年干支以“立春”划分
      const liChunDay = this.getTerm(y, 3);
      let gzYearIndex = y - 4;
      if (m < 2 || (m === 2 && d < liChunDay)) gzYearIndex--;
      const gzYear = this.toGanZhi(gzYearIndex);

      // 2. 月干支以“节气”划分
      // 寅月(3月)开始于立春，卯月(4月)开始于惊蛰...
      const firstTermOfCurrentMonth = this.getTerm(y, m * 2 - 1);
      let gzMonthIndex = (y - 1900) * 12 + m + 11;
      if (d >= firstTermOfCurrentMonth) gzMonthIndex++;
      const gzMonth = this.toGanZhi(gzMonthIndex);

      // 3. 日干支基准计算
      // 1900-01-31 是甲午日 (index 30)
      const totalOffset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      const gzDay = this.toGanZhi(totalOffset + 30);

      const termId = this.getTerm(y, m * 2 - 1) === d ? m * 2 - 2 : (this.getTerm(y, m * 2) === d ? m * 2 - 1 : null);

      return {
        lYear: year, lMonth: month, lDay: day, animal: this.getAnimal(year),
        monthCn: (leap === month && isLeap ? "闰" : "") + this.N_STR3[month - 1] + "月",
        dayCn: this.toChinaDay(day), gzYear, gzMonth, gzDay,
        term: termId !== null ? this.TERMS[termId] : null,
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m * 2 - (d < [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22][m - 1] ? 2 : 0), 2) + "座"
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

  /* ========== 辅助工具函数 ========== */
  const padStart2 = (n) => n.toString().padStart(2, '0');
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  const calcDateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetTime = new Date(y, m - 1, d).getTime();
    const todayTime = new Date(curYear, curMonth - 1, curDate).getTime();
    return Math.floor((targetTime - todayTime) / 86400000);
  };

  /* ========== 节日生成 ========== */
  const generateFestData = (year) => {
    const l2s = (m, d) => { const r = LunarCal.lunar2solar(year, m, d); return formatYmd(r.y, r.m, r.d); };
    const qmDay = LunarCal.getTerm(year, 7);
    return [
      ["元旦", formatYmd(year, 1, 1)],
      ["春节", l2s(1, 1)],
      ["元宵节", l2s(1, 15)],
      ["清明节", formatYmd(year, 4, qmDay)],
      ["劳动节", formatYmd(year, 5, 1)],
      ["端午节", l2s(5, 5)],
      ["七夕节", l2s(7, 7)],
      ["中秋节", l2s(8, 15)],
      ["国庆节", formatYmd(year, 10, 1)],
      ["除夕", l2s(12, LunarCal.monthDays(year, 12) === 29 ? 29 : 30)]
    ];
  };

  /* ========== 主逻辑 ========== */
  const lunarNow = LunarCal.solar2lunar(curYear, curMonth, curDate);
  const fThis = generateFestData(curYear);
  const fNext = generateFestData(curYear + 1);
  const festivals = [...fThis, ...fNext]
    .filter(item => calcDateDiff(item[1]) >= 0)
    .sort((a, b) => calcDateDiff(a[1]) - calcDateDiff(b[1]))
    .slice(0, 4);

  const festDesc = festivals.map(([name, date]) => {
    const diff = calcDateDiff(date);
    return diff === 0 ? `🎉 今天是 ${name}` : `${name}: ${diff}天`;
  }).join("\n");

  const title = `${curYear}年${curMonth}月${curDate}日 星期${weekCn[now.getDay()]}`;
  const content = [
    `📅 农历：${lunarNow.monthCn}${lunarNow.dayCn} (${lunarNow.astro})`,
    `🏮 干支：${lunarNow.gzYear}年 ${lunarNow.gzMonth}月 ${lunarNow.gzDay}日`,
    `🐾 属相：${lunarNow.animal} · 节气：${lunarNow.term || "无"}`,
    `--------------------------`,
    festDesc
  ].join("\n");

  // 发送通知 (仅在早上 6-10 点且有当日节日时)
  if (hasNotify && now.getHours() >= 6 && now.getHours() <= 10) {
    const todayFest = festivals.find(f => calcDateDiff(f[1]) === 0);
    if (todayFest && $store) {
      const cacheKey = `pushed_${todayFest[1]}`;
      if ($store.read(cacheKey) !== "1") {
        $store.write("1", cacheKey);
        $notification.post(`🎉 今日节日：${todayFest[0]}`, "", `祝您：节日快乐，万事如意！`);
      }
    }
  }

  // 脚本结束输出
  if (typeof $done !== "undefined") {
    $done({
      title: title,
      content: content,
      icon: "calendar",
      "icon-color": "#FF9800"
    });
  } else {
    console.log(`${title}\n\n${content}`);
  }

})().catch(e => {
  console.log(`脚本错误: ${e.message}`);
  if (typeof $done !== "undefined") $done({ title: "脚本出错", content: e.message });
});
