/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * URL： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/Almanac.js
 * 更新：2026.03.12 15:42
 */

(async () => {
  // 1. 基础环境 (UTC+8)
  const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const P = n => n < 10 ? `0${n}` : n;
  const YMD = (y, m, d) => `${y}/${P(m)}/${P(d)}`;
  
  const DATE_PATTERNS = [
    `${Y}-${P(M)}-${P(D)}`, `${Y}-${M}-${D}`, 
    `${Y}/${P(M)}/${P(D)}`, `${Y}/${M}/${D}`, 
    `${Y}${P(M)}${P(D)}`
  ];
  const WEEK = "日一二三四五六";

  // 2. 农历核心 (1900-2100 完整标准库)
  const Lunar = {
    info: [
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
      0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0xada0,
      0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
      0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
      0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
      0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
      0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
      0x0d520 
    ],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    bit(y,n){ return (this.info[y-1900] & n) ? 1 : 0 },
    lDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=this.bit(y,i); return s + (this.leap(y) ? ((this.info[y-1900]&0x10000)?30:29) : 0) },
    leap(y) { return this.info[y-1900] & 0xf },
    mDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29 },
    term(y, n) { return new Date((31556925974.7*(y-1900)+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000)+Date.UTC(1900,0,6,2,5)).getUTCDate() },
    toObj(y, m, d) {
      let offset = (Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000, i, temp=0;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i, leap=this.leap(i); let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=((this.info[lYear-1900]&0x10000)?30:29); }
        else { temp=this.mDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) if(isLeap) isLeap=false; else { isLeap=true; --i; }
      if(offset<0) { offset+=temp; i--; }
      const lD = offset+1, tId = m*2-(d<this.term(y,m*2-1)?2:1);
      return {
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lD==10?"初十":lD==20?"二十":lD==30?"三十":["初","十","廿","卅"][Math.floor(lD/10)]+this.nStr[lD%10]}`,
        term: (this.term(y,tId+1)==d) ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][tId] : "",
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    },
    l2s(y,m,d) { try { let off=0, lp=this.leap(y); for(let i=1900; i<y; i++) off+=this.lDays(i); for(let i=1; i<m; i++) off+=this.mDays(y,i); if(lp>0 && lp<m) off+=((this.info[y-1900]&0x10000)?30:29); return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;} }
  };

  // 3. 网络请求
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return {};
    return new Promise(r => {
      $httpClient.get({ 
        url: `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`, 
        timeout: 5000, 
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } 
      }, (e, _, d) => r(!e && d ? JSON.parse(d) : {}));
    }).then(raw => {
      let found = {};
      const isTargetDate = (s) => DATE_PATTERNS.some(p => s.includes(p));
      const scan = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (let key in obj) {
          const val = obj[key];
          if (!val) continue;
          if (isTargetDate(key)) { found = (typeof val === 'object') ? val : obj; return; }
          if (typeof val === 'object') {
             const dStr = String(val.date || val.day || val.gregorian || val.oDate || "");
             if (isTargetDate(dStr)) { found = val; return; }
             if (val.day == D) { 
                if (val.month == M || (!val.month && !val.year)) {
                   if (!dStr.includes(`-${P(M + 1)}-`) && !dStr.includes(`-${M + 1}-`)) {
                       if (Object.keys(found).length === 0) found = val; 
                   }
                }
             }
             scan(val);
             if (Object.keys(found).length > 0 && found.yi) return;
          }
        }
      };
      scan(raw);
      return found;
    }).catch(e => { console.log("Error:", e); return {}; });
  };

  // 4. 节日配置
  const getFests = (y) => {
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?YMD(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const getTerm = (n) => YMD(y, Math.floor((n-1)/2)+1, Lunar.term(y,n));
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return YMD(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    return {
      // 法定节假日（含成都义教段学校特定日期）
      legal: [
        ["元旦",YMD(y,1,1)], 
        ["寒假",YMD(y,1,31)], //2026年成都义教段学校放寒假
        ["春节",l2s(1,1)],
        ["开学",YMD(y,3,2)],    //2026年成都义教段学校春季开学
        ["清明节",getTerm(7)],
        ["成都春假",YMD(y, 4, Lunar.term(y, 7) - 3)],   //成都春假安排在清明节前三天
        ["劳动节",YMD(y,5,1)], 
        ["端午节",l2s(5,5)],
        ["高考",YMD(y,6,7)],     //200天开始置顶倒计时
        ["暑假",YMD(y,7,4)],    //2026年成都义教段学校放暑假
        ["中秋节",l2s(8,15)], 
        ["国庆节",YMD(y,10,1)],
        ["成都秋假",wDay(11,2,3)]   // 成都秋假11月第2个周三（即11月第2周的周三至周五）
      ],
      // 民俗节日
      folk: [
        ["元宵节",l2s(1,15)], ["龙抬头",l2s(2,2)], ["七夕节",l2s(7,7)],
        ["中元节",l2s(7,15)], ["重阳节",l2s(9,9)], ["寒衣节",l2s(10,1)],
        ["下元节",l2s(10,15)], ["腊八节",l2s(12,8)], ["小年",l2s(12,23)],
        ["除夕",l2s(12, Lunar.mDays(y,12))] 
      ],
      // 国际/洋节
      intl: [
        ["情人节",YMD(y,2,14)], ["妇女节",YMD(y,3,8)], ["母亲节",wDay(5,2,0)],
        ["儿童节",YMD(y,6,1)], ["父亲节",wDay(6,3,0)], ["万圣节",YMD(y,10,31)],
        ["平安夜",YMD(y,12,24)], ["圣诞节",YMD(y,12,25)], ["感恩节",wDay(11,4,4)]
      ],
      // 节气
      term: Array.from({length:24},(_,i)=>[["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][i], getTerm(i+1)])
    };
  };

  // 5. 渲染合并
  const merge = (list, limit = 3) => {
    const todayMs = Date.UTC(Y, M - 1, D);
    const result = [];
    if (!list || !Array.isArray(list)) return "";
    
    for (const [name, dateStr] of list) {
        if (!dateStr) continue;
        const [yy, mm, dd] = dateStr.split('/').map(Number);
        if (!yy || !mm || !dd) continue;
        
        const diff = Math.round((Date.UTC(yy, mm - 1, dd) - todayMs) / 86400000);
        if (diff < 0) continue;
        
        let sortKey = diff;
        if (name === "高考" && diff > 0 && diff <= 200) sortKey = -9999;
        result.push({ name, diff, sortKey });
    }
    
    const unique = new Map();
    result.sort((a, b) => a.sortKey - b.sortKey).forEach(item => {
        if(!unique.has(item.name)) unique.set(item.name, item);
    });
    
    return Array.from(unique.values())
        .slice(0, limit)
        .map(i => i.diff === 0 ? `🎉${i.name}` : `${i.name} ${i.diff}天`)
        .join(" , ");
  };

  try {
    const obj = Lunar.toObj(Y, M, D);
    const api = await getAlmanac();
    const get = (...k) => { for(let i of k) if(api[i]) return api[i]; return ""; };
    
    const yi = get("yi","Yi","suit").replace(/\./g, " "), ji = get("ji","Ji","avoid").replace(/\./g, " ");
    
    const alm = [
      get("chongsha","ChongSha"), 
      get("baiji","BaiJi"), 
      yi ? `✅ 宜：${yi}` : "", 
      ji ? `❎ 忌：${ji}` : ""  
    ].filter(Boolean).join("\n");

    // 获取跨年数据 (去年、今年、明年)
    const f0 = getFests(Y - 1); 
    const f1 = getFests(Y);     
    const f2 = getFests(Y + 1); 

    const pools = {
       legal: [...f0.legal, ...f1.legal, ...f2.legal],
       folk: [...f0.folk, ...f1.folk, ...f2.folk],
       intl: [...f0.intl, ...f1.intl, ...f2.intl],
       term: [...f0.term, ...f1.term, ...f2.term]
    };

    // 当日节日检测
    const todayStr = YMD(Y, M, D);
    const todayFests = [...pools.legal, ...pools.folk, ...pools.intl]
        .filter(item => item[1] === todayStr)
        .map(item => item[0]);
    // 去掉🎉图标，仅留空格间隔
    const todayTag = todayFests.length > 0 ? ` ${[...new Set(todayFests)].join("&")}` : "";

    $done({
      title: `${Y}年${M}月${D}日 星期${WEEK[now.getDay()]} ${obj.astro}`,
      content: `${obj.gz}(${obj.ani})年 ${obj.cn} ${obj.term||""}${todayTag}\n${alm}\n\n${[
        merge(pools.legal), 
        merge(pools.term),
        merge(pools.folk), 
        merge(pools.intl)
      ].filter(Boolean).join("\n")}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) { $done({ title: "黄历异常", content: "请检查日志: " + e.message }); }
})();
