/**
 * ==========================================
 * 📌 代码名称: ⏳ 节假日倒计时（时光倒数）
 * ✨ 特色功能: 集成法定/民俗/国际及6大专属纪念日，法定精控4个显示；支持任意节日置顶与当天高亮展示；1:1复刻黄历组件255px黄金宽度，取消词组折行，实现紧贴边缘的原生硬换行；内置AI动态间距补偿引擎，智能侦测折行状态并自动拉伸留白，确保整体视觉重心恒定且跨分类绝对等距。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
 * ⏱️ 更新时间: 2026.03.16 23:02
 * ==========================================
 */

export default async function(ctx) {
  // 动态读取环境配置
  const showSchoolHolidays = (ctx.env.SHOW_SCHOOL_HOLIDAYS || "true").trim() !== "false";
  const pinnedHoliday = (ctx.env.PINNED_HOLIDAY || "").trim();
  const springDateStr = (ctx.env.SPRING_BREAK_DATE || "").trim();
  const autumnDateStr = (ctx.env.AUTUMN_BREAK_DATE || "").trim();

  // 读取用户填写的最多 6 个专属纪念日
  const customDays = [];
  for (let i = 1; i <= 6; i++) {
    const nameKey = i === 1 ? (ctx.env.EXCLUSIVE_NAME_1 || ctx.env.EXCLUSIVE_NAME) : ctx.env[`EXCLUSIVE_NAME_${i}`];
    const dateKey = i === 1 ? (ctx.env.EXCLUSIVE_DATE_1 || ctx.env.EXCLUSIVE_DATE) : ctx.env[`EXCLUSIVE_DATE_${i}`];
    const n = nameKey || (i === 1 ? "我的生日" : "");
    const d = dateKey || (i === 1 ? "12/13" : "");
    if (n && n.trim() !== "" && d && d.includes('/')) customDays.push({ name: n.trim(), date: d.trim() });
  }

  const BG_COLORS = [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }]; 
  const TEXT_MAIN = { light: '#1C1C1E', dark: '#FFFFFF' };
  const TEXT_SUB = { light: '#48484A', dark: '#D1D1D6' }; 

  const COLOR_GOLD = { light: '#B58A28', dark: '#D6A53A' }; 
  const COLOR_RED = { light: '#CA3B32', dark: '#FF453A' };   
  const COLOR_BLUE = { light: '#3A5F85', dark: '#5E8EB8' };  
  const COLOR_TEAL = { light: '#628C7B', dark: '#73A491' };  

  const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const YMD = (y, m, d) => `${y}/${m < 10 ? '0'+m : m}/${d < 10 ? '0'+d : d}`;
  const todayMs = Date.UTC(Y, M - 1, D);

  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    term(y, n) { return new Date((31556925974.7*(y-1900)+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000)+Date.UTC(1900,0,6,2,5)) },
    lDays(y) { let s=348; for(let i=0x8000; i>0x8; i>>=1) s+=((this.info[y-1900] & i) ? 1 : 0); return s + ((this.info[y-1900] & 0xf) ? ((this.info[y-1900]&0x10000)?30:29) : 0) },
    mDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29 },
    l2s(y,m,d) { try { let off=0, lp=this.info[y-1900]&0xf; for(let i=1900; i<y; i++) off+=this.lDays(i); for(let i=1; i<m; i++) { off+=this.mDays(y,i); if(lp>0 && i===lp) off+=((this.info[y-1900]&0x10000)?30:29); } return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;} }
  };

  const getCustomDate = (y, dateStr, defaultCalc) => {
    if (!dateStr) return defaultCalc();
    let [m, d] = dateStr.split('/').map(Number);
    return (m && d) ? YMD(y, m, d) : defaultCalc();
  };

  const getFests = (y) => {
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?YMD(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const term = (n) => { const d=Lunar.term(y,n); return YMD(d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate()); };
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return YMD(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    let legalFests = [ ["元旦",YMD(y,1,1),1], ["春节",l2s(1,1),3], ["清明节",term(7),1], ["劳动节",YMD(y,5,1),1], ["端午节",l2s(5,5),1], ["中秋节",l2s(8,15),1], ["国庆节",YMD(y,10,1),3] ];
    if (showSchoolHolidays) {
      legalFests.push(["春假", getCustomDate(y, springDateStr, () => YMD(y, 4, Lunar.term(y, 7).getUTCDate() - 3)), 3]);
      legalFests.push(["秋假", getCustomDate(y, autumnDateStr, () => wDay(11,2,3)), 3]);
    }
    const exclusiveFests = customDays.map(item => [item.name, YMD(y, item.date.split('/')[0], item.date.split('/')[1]), 1]);
    exclusiveFests.push(["高考", YMD(y, 6, 7), 2]);
    return {
      legal: legalFests, folk: [ ["元宵节",l2s(1,15),1], ["龙抬头",l2s(2,2),1], ["七夕节",l2s(7,7),1], ["中元节",l2s(7,15),1], ["重阳节",l2s(9,9),1], ["寒衣节",l2s(10,1),1], ["腊八节",l2s(12,8),1], ["小年",l2s(12,23),1], ["除夕",l2s(12, Lunar.mDays(y,12)),1] ],
      intl: [ ["情人节",YMD(y,2,14),1], ["妇女节",YMD(y,3,8),1], ["儿童节",YMD(y,6,1),1], ["母亲节",wDay(5,2,0),1], ["父亲节",wDay(6,3,0),1], ["万圣节",YMD(y,10,31),1], ["感恩节",wDay(11,4,4),1], ["平安夜",YMD(y,12,24),1], ["圣诞节",YMD(y,12,25),1] ],
      exclusive: exclusiveFests
    };
  };

  let stickyFest = "";
  let minPinnedDiff = Infinity; 
  const todayFests = []; 
  const f1 = getFests(Y), f2 = getFests(Y + 1), result = { legal: [], folk: [], intl: [], exclusive: [] };

  ["legal", "folk", "intl", "exclusive"].forEach(cat => {
    f1[cat].concat(f2[cat]).forEach(([name, dateStr, duration]) => {
      if (!dateStr) return;
      const [yy, mm, dd] = dateStr.split('/').map(Number);
      const diff = Math.round((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);
      if (diff <= 0 && diff > -(duration || 1)) if (!todayFests.includes(name)) todayFests.push(name);
      if (diff < 0) return;
      if (pinnedHoliday && name === pinnedHoliday && diff > 0 && diff < minPinnedDiff) { minPinnedDiff = diff; stickyFest = `${name} ${diff}天`; }
      if (!result[cat].find(i => i.name === name)) result[cat].push({ name, diff });
    });
  });

  const format = (cat, limit) => {
    return result[cat].sort((a,b)=>a.diff-b.diff).slice(0, limit).map(i => i.diff === 0 ? `🎉${i.name}` : `${i.name} ${i.diff}天`).join("，");
  };

  const categoriesData = [
    { i: "building.columns.fill", col: COLOR_RED, n: "法定", t: format("legal", 4), lines: 2 },
    { i: "moon.stars.fill", col: COLOR_GOLD, n: "民俗", t: format("folk", 3), lines: 1 },
    { i: "globe.americas.fill", col: COLOR_BLUE, n: "国际", t: format("intl", 3), lines: 1 },
    { i: "gift.fill", col: COLOR_TEAL, n: "专属", t: format("exclusive", 6), lines: 2 }
  ].filter(c => c.t);

  const isWrapped = categoriesData.some(c => c.t.length > 20); 
  const dynamicGap = isWrapped ? 10 : 12;
  const dynamicSpacer = isWrapped ? 12 : 14;

  let topAddons = [];
  if (todayFests.length > 0) topAddons.push(`🎉 ${todayFests.join('、')}`);
  if (stickyFest) topAddons.push(`✨ ${stickyFest}`);
  const titleAddon = topAddons.join(" | ");

  return {
    type: 'widget', 
    padding: 12, 
    backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: 'sf-symbol:hourglass.circle.fill', color: TEXT_MAIN, width: 16, height: 16 },
          { type: 'text', text: '时光倒数', font: { size: 15, weight: 'heavy' }, textColor: TEXT_MAIN },
          { type: 'spacer' },
          { type: 'text', text: titleAddon, font: { size: 12, weight: 'bold' }, textColor: COLOR_RED, maxLines: 1, minScale: 0.8 }
      ]},
      { type: 'spacer', length: dynamicSpacer }, 
      { type: 'stack', direction: 'column', alignItems: 'start', gap: dynamicGap,
        children: categoriesData.map(cat => ({
          type: 'stack', direction: 'row', alignItems: 'start', gap: 4, children: [
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 50, children: [
                { type: 'image', src: `sf-symbol:${cat.i}`, color: cat.col, width: 13, height: 13 },
                { type: 'text', text: cat.n, font: { size: 12, weight: 'heavy' }, textColor: cat.col }
            ]},
            { type: 'text', text: cat.t, font: { size: 12, weight: 'medium' }, textColor: TEXT_SUB, maxLines: cat.lines, width: 255 }
          ]
        }))
      },
      { type: 'spacer' }
    ]
  };
}
