/**
 * ==========================================
 * 📌 代码名称: 📅 岁时黄历（节气流转全览版）小组件
 * ✨ 特色功能: 深度融合农历信息、传统宜忌、星座运势与最近四大节气动态追踪，全面支持 iOS 系统深浅模式（Light/Dark）自适应切换。
 * ⏱ 更新时间: 2026-03-16 
 * ==========================================
 */

export default async function(ctx) {
  // 🎨 Apple HIG 原生级自适应配色
  const BG_COLORS = [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F4F5F9', dark: '#000000' }];
  const TEXT_MAIN = { light: '#000000', dark: '#FFFFFF' };
  const TEXT_SUB = { light: '#3C3C43', dark: '#EBEBF5' };
  const THEME_ACCENT_GOLD = { light: '#B27600', dark: '#E5C07B' }; // 雅致琉璃金
  const THEME_ACCENT_GREEN = { light: '#28CD41', dark: '#32D74B' };

  const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const HOUR = now.getHours(); // 获取当前小时数
  const P = n => n < 10 ? `0${n}` : n;
  const DATE_PATTERNS = [`${Y}-${P(M)}-${P(D)}`, `${Y}-${M}-${D}`, `${Y}/${P(M)}/${P(D)}`, `${Y}/${M}/${D}`, `${Y}${P(M)}${P(D)}` ];
  const WEEK = "日一二三四五六";

  // 🕒 计算当前时辰与详情 (仅保留古称，去除具体时间段)
  const ZHI_LIST = "子丑寅卯辰巳午未申酉戌亥";
  const SHICHEN_NAMES = ["夜半", "鸡鸣", "平旦", "日出", "食时", "隅中", "日中", "日昳", "晡时", "日入", "黄昏", "人定"];
  const zhiIdx = Math.floor((HOUR + 1) % 24 / 2);
  // 生成如: 子时(夜半)
  const currentShichen = `${ZHI_LIST[zhiIdx]}时(${SHICHEN_NAMES[zhiIdx]})`;

  // 🏮 冲煞参考常量
  const CHONG = ["马","羊","猴","鸡","狗","猪","鼠","牛","虎","兔","龙","蛇"];
  const SHA = ["南","东","北","西","南","东","北","西","南","东","北","西"];

  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,111252,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,111191,0x0c950,0x0d4a0,121000,0x0b550,0x056a0,107956,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,111145,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,111054,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,111222,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,111141,0x0b5a0,0x056d0,0x055b2,0x049b0,111223,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,133987,0x09370,0x049f8,0x04970,0x064b0,147878,0x0ea50,0x06b20,173764,0x0aae0,0x092e0,0x0d2e3,0x0c960,185687,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,173496,0x0a950,0x0b4a0,186022,0x0ad50,0x055a0,133540,0x0a5b0,0x052b0,111219,0x06930,134007,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    termNames: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    term(y, n) { return new Date((31556925974.7*(y-1900)+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000)+Date.UTC(1900,0,6,2,5)).getUTCDate() },
    toObj(y, m, d) {
      let offset = (Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000, i, temp=0;
      const lDays = (y) => { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=((this.info[y-1900] & i) ? 1 : 0); return s + ((this.info[y-1900] & 0xf) ? ((this.info[y-1900]&0x10000)?30:29) : 0) };
      const mDays = (y, m) => (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29;
      for(i=1900; i<2101 && offset>0; i++) { temp=lDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i, leap=this.info[lYear-1900] & 0xf; let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=((this.info[lYear-1900]&0x10000)?30:29); } else { temp=mDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) if(isLeap) isLeap=false; else { isLeap=true; --i; }
      if(offset<0) { offset+=temp; i--; }
      const lD = offset+1, tId = m*2-(d<this.term(y,m*2-1)?2:1);
      
      const dayIdx = Math.floor((Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000 + 40);
      const dayBranch = dayIdx % 12;
      
      // 🔮 去除了 Emoji，恢复纯文字星座
      const ASTRO_NAMES = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
      const astroIdx = m - (d < [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22][m - 1] ? 1 : 0);
      
      return { 
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], 
        ani: this.ani[(lYear-4)%12], 
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lD==10?"初十":lD==20?"二十":lD==30?"三十":["初","十","廿","卅"][Math.floor(lD/10)]+this.nStr[lD%10]}`, 
        term: (this.term(y,tId+1)==d) ? this.termNames[tId] : "", 
        astro: ASTRO_NAMES[astroIdx],
        chong: `冲${CHONG[dayBranch]}煞${SHA[dayBranch]}`,
        stars: "⭐".repeat((dayIdx % 3) + 3)
      };
    }
  };

  const getTermInfo = (y, n) => ({ name: Lunar.termNames[n - 1], date: new Date(y, Math.floor((n - 1) / 2), Lunar.term(y, n)) });
  const allTerms = [];
  for(let i=1; i<=24; i++) allTerms.push(getTermInfo(Y-1, i));
  for(let i=1; i<=24; i++) allTerms.push(getTermInfo(Y, i));
  for(let i=1; i<=24; i++) allTerms.push(getTermInfo(Y+1, i));

  let currentTerm = "", upcomingTerms = [];
  const todayMs = new Date(Y, M - 1, D).getTime();
  for (let i = 0; i < allTerms.length; i++) {
    const diff = Math.round((allTerms[i].date.getTime() - todayMs) / 86400000);
    if (diff === 0) {
      currentTerm = allTerms[i].name; 
      upcomingTerms = allTerms.slice(i + 1, i + 5).map(t => `${t.name} ${Math.round((t.date.getTime() - todayMs) / 86400000)}天`); break;
    } else if (diff > 0) {
      currentTerm = allTerms[i - 1].name;
      upcomingTerms = allTerms.slice(i, i + 4).map(t => `${t.name} ${Math.round((t.date.getTime() - todayMs) / 86400000)}天`); break;
    }
  }

  const getAlmanac = async () => {
    try {
      const resp = await ctx.http.get(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`, { timeout: 8000 });
      let found = {};
      const scan = (obj) => {
        if (!obj || typeof obj !== 'object' || Object.keys(found).length > 0) return;
        for (let key in obj) {
          const val = obj[key]; if (!val) continue;
          if (DATE_PATTERNS.some(p => String(key).includes(p))) { found = val; return; }
          if (typeof val === 'object') {
             const dStr = String(val.date || val.day || val.gregorian || val.oDate || "");
             if (DATE_PATTERNS.some(p => dStr.includes(p))) { found = val; return; }
             if (val.day == D && (val.month == M || (!val.month && !val.year)) && !dStr.includes(`-${P(M + 1)}-`) && !dStr.includes(`-${M + 1}-`)) {
                 if (Object.keys(found).length === 0) found = val; 
             }
             scan(val);
          }
        }
      };
      scan(JSON.parse(await resp.text())); return found;
    } catch (e) { return {}; }
  };

  const obj = Lunar.toObj(Y, M, D);
  const api = await getAlmanac();
  const getVal = (...k) => { for(let i of k) if(api[i]) return api[i]; return ""; };
  const rawYi = (getVal("yi","Yi","suit") || "诸事不宜").replace(/\./g, " ");
  const rawJi = (getVal("ji","Ji","avoid") || "诸事大吉").replace(/\./g, " ");
  
  // ⚠️ 冲煞与百忌数据逻辑融合
  const apiChongsha = getVal("chongsha","ChongSha");
  const apiBaiji = getVal("baiji","BaiJi");
  // 如果API有冲煞数据，优先用API的详细冲煞；否则使用本地简单计算的冲煞
  const finalChongsha = apiChongsha || obj.chong; 

  return {
    type: 'widget', padding: 16, backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: 'spacer', length: 8 }, 
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
          { type: 'image', src: 'sf-symbol:calendar.badge.clock', color: TEXT_MAIN, width: 18, height: 18 },
          { type: 'text', text: `${Y}年${M}月${D}日 星期${WEEK[now.getDay()]}`, font: { size: 'headline', weight: 'bold' }, textColor: TEXT_MAIN, maxLines: 1, minScale: 0.8 },
          { type: 'spacer' },
          { type: 'text', text: obj.astro, font: { size: 'subheadline', weight: 'medium' }, textColor: TEXT_SUB }
      ]},
      { type: 'spacer', length: 6 }, 
      // 运用新的 currentShichen
      { type: 'text', text: `${obj.gz}(${obj.ani})年 · ${obj.cn} · ${currentShichen}${obj.term ? ` ✨今日${obj.term}` : ` · 当前${currentTerm}`}`, font: { size: 13, weight: 'medium' }, textColor: THEME_ACCENT_GOLD, maxLines: 1, minScale: 0.8 },
      { type: 'spacer', length: 8 }, 
      { type: 'stack', direction: 'column', alignItems: 'start', gap: 4, children: [
          // 独立显示彭祖百忌（若存在）
          ...(apiBaiji ? [{ type: 'text', text: `📜 百忌：${apiBaiji}`, font: { size: 12 }, textColor: TEXT_SUB, maxLines: 1, minScale: 0.8 }] : []),
          ...(rawYi ? [{ type: 'stack', direction: 'row', alignItems: 'start', gap: 2, children: [ { type: 'text', text: '✅ 宜：', font: { size: 13 }, textColor: TEXT_SUB }, { type: 'text', text: rawYi, font: { size: 13 }, textColor: TEXT_SUB, lineSpacing: 4, maxLines: 4, minScale: 0.7 } ]}] : []),
          ...(rawJi ? [{ type: 'stack', direction: 'row', alignItems: 'start', gap: 2, children: [ { type: 'text', text: '❎ 忌：', font: { size: 13 }, textColor: TEXT_SUB }, { type: 'text', text: rawJi, font: { size: 13 }, textColor: TEXT_SUB, lineSpacing: 4, maxLines: 4, minScale: 0.7 } ]}] : []),
          
          { type: 'stack', direction: 'row', alignItems: 'start', gap: 2, children: [
              { type: 'text', text: '⚠️ 冲煞：', font: { size: 13 }, textColor: TEXT_SUB },
              // 融合后的冲煞与星星
              { type: 'text', text: `${finalChongsha} · ${obj.stars}`, font: { size: 13 }, textColor: TEXT_SUB, maxLines: 1, minScale: 0.7 }
          ]}
      ]},
      { type: 'spacer', length: 6 },
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
          { type: 'image', src: 'sf-symbol:leaf.fill', color: THEME_ACCENT_GREEN, width: 13, height: 13 },
          { type: 'text', text: `节气：${upcomingTerms.join(" , ")}`, font: { size: 12, weight: 'bold' }, textColor: THEME_ACCENT_GREEN, maxLines: 1, minScale: 0.5 }
      ]},
      { type: 'spacer' }
    ]
  };
}
