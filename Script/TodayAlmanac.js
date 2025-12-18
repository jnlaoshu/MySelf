/*
 * 今日黄历&节假日倒数（成都义教段特定修复版）
 * 包含：动态春秋假、农历民俗节日
 */

(async () => {
  const now = new Date();
  const curYear = now.getFullYear();
  
  // 工具函数
  const pad = (n) => n < 10 ? '0' + n : n;
  const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  
  // 计算两个公历日期的天数差
  const dateDiff = (tStr) => {
    const t = new Date(tStr.replace(/-/g, '/'));
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((t - s) / 86400000);
  };

  /* ========== 简易农历数据 (1900-2100) ========== */
  const lunarData = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520];

  const helper = {
    getLeapMonth: (y) => lunarData[y - 1900] & 0xf,
    getLeapDays: (y) => (helper.getLeapMonth(y) ? (lunarData[y - 1900] & 0x10000 ? 30 : 29) : 0),
    getMonthDays: (y, m) => (lunarData[y - 1900] & (0x10000 >> m) ? 30 : 29),
    getYearDays: (y) => {
      let sum = 348;
      for (let i = 0x8000; i > 0x8; i >>= 1) sum += (lunarData[y - 1900] & i ? 1 : 0);
      return sum + helper.getLeapDays(y);
    },
    // 农历转公历 (核心修复)
    lunarToSolar: (y, m, d) => {
      let offset = 0;
      for (let i = 1900; i < y; i++) offset += helper.getYearDays(i);
      let leap = helper.getLeapMonth(y);
      for (let i = 1; i < m; i++) offset += helper.getMonthDays(y, i);
      if (leap > 0 && leap < m) offset += helper.getLeapDays(y);
      const base = new Date(1900, 0, 31);
      const res = new Date(base.getTime() + (offset + d - 1) * 86400000);
      return fmt(res.getFullYear(), res.getMonth() + 1, res.getDate());
    },
    // 获取清明日期 (简易算法)
    getQingMing: (y) => {
      const d = new Date(y, 3, (y % 4 === 0 ? 4 : 5)); 
      return d; // 大多数年份清明是4/4或4/5
    }
  };

  /* ========== 逻辑计算 ========== */
  const generateFests = (year) => {
    // 农历计算
    const chuxi = helper.lunarToSolar(year, 12, helper.getMonthDays(year, 12));
    const chunjie = helper.lunarToSolar(year, 1, 1);
    const yuanxiao = helper.lunarToSolar(year, 1, 15);
    const duanwu = helper.lunarToSolar(year, 5, 5);
    const zhongqiu = helper.lunarToSolar(year, 8, 15);

    // 成都特有假期
    // 1. 春假：清明连休 (清明后一天开始)
    const qm = helper.getQingMing(year);
    const springVacation = fmt(year, 4, qm.getDate() + 1);

    // 2. 秋假：11月第二周后三天 (周三)
    const nov1 = new Date(year, 10, 1);
    const firstWedOffset = (3 - nov1.getDay() + 7) % 7;
    const autumnVacation = fmt(year, 11, 1 + firstWedOffset + 7);

    return [
      ["元旦", fmt(year, 1, 1)],
      ["除夕", chuxi],
      ["春节", chunjie],
      ["春假(成都)", springVacation],
      ["劳动节", fmt(year, 5, 1)],
      ["端午节", duanwu],
      ["中秋节", zhongqiu],
      ["国庆节", fmt(year, 10, 1)],
      ["秋假(成都)", autumnVacation],
      ["元宵节", yuanxiao]
    ];
  };

  // 汇总今年和明年的节日
  const allFests = [...generateFests(curYear), ...generateFests(curYear + 1)]
    .map(f => ({ name: f[0], date: f[1], diff: dateDiff(f[1]) }))
    .filter(f => f.diff >= 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 6);

  // 渲染文本
  const listText = allFests.map(f => `${f.name}:${f.diff === 0 ? "今日" : f.diff + "天"}`).join("  ");

  $done({
    title: `📅 节假日倒计时`,
    content: listText,
    icon: "calendar.circle",
    "icon-color": "#5AC8FA"
  });
})();
