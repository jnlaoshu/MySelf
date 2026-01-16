/*
 * 今日黄历&节假日倒数 (V28.0 纯净内核修正版)
 * ✅ 修复：全链路使用 UTC 时间戳计算，彻底解决 "农历/节气错一天" 问题
 * ✅ 修复：修正生肖/干支计算逻辑 (严格以农历年为准，春节前不换生肖)
 * ✅ 修复：重写动态节日算法 (母亲节/父亲节等)，确保星期计算准确
 * ✅ 布局：保持经典四行布局 (法定/节气/民俗/国际)，每行显示 3 个
 */
(async () => {
  // ========== 1. 基础环境 (精准锁定北京时间) ==========
  const getNow = () => {
    const d = new Date();
    // 将当前时间转换为 UTC+8 的 "视觉时间"
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bj = new Date(utc + (3600000 * 8));
    return {
      y: bj.getFullYear(),
      m: bj.getMonth() + 1,
      d: bj.getDate(),
      day: bj.getDay()
    };
  };

  const NOW = getNow();
  const [cY, cM, cD] = [NOW.y, NOW.m, NOW.d];
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  const weekCn = "日一二三四五六";
  
  // 匹配指纹
  const MATCH = {
    s: `${cY}-${pad(cM)}-${pad(cD)}`,
    s2: `${cY}-${cM}-${cD}`,
    d: cD
  };

  // ========== 2. 网络请求 (递归扫描) ==========
  const getData = async () => {
    if (typeof $httpClient === "undefined") return null;
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${cY}/${cY}${pad(cM)}.json`;
    
    return new Promise(resolve => {
      $httpClient.get({ url, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } }, (e, r, d) => {
        resolve(!e && r.status === 200 && d ? JSON.parse(d) : null);
      });
    }).then(raw => {
      if (!raw) return null;
      let list = [];
      const scan = n => {
        if (!n || typeof n !== 'object') return;
        if ((n.yi || n.ji || n.suit || n.Yi || n.Ji) && (n.day || n.date)) list.push(n);
        if (Array.isArray(n)) n.forEach(scan);
        else Object.values(n).forEach(scan);
      };
      scan(raw);
      // 鹰眼匹配
      return list.find(i => {
        if (i.date) {
          const ds = String(i.date);
          if (ds === MATCH.s || ds === MATCH.s2 || ds.includes(MATCH.s)) return true;
        }
        if (i.day !== undefined && parseInt(i.day, 10) === MATCH.d) return true;
        return false;
      });
    });
  };

  // ========== 3. 农历核心 (UTC 纯净版) ==========
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    
    // 核心：全部使用 UTC 时间计算，避免时区偏差
    convert(y, m, d) {
      const base = Date.UTC(1900, 0, 31);
      const obj = Date.UTC(y, m-1, d);
      let offset = (obj - base) / 86400000;
      
      let i, leap=0, temp=0;
      for(i=1900; i<2101 && offset>0; i++) {
        temp = this.lYearDays(i);
        offset -= temp;
      }
      if(offset<0) { offset += temp; i--; }
      
      // i 为最终农历年份
      const lYear = i;
      leap = this.leapMonth(i);
      let isLeap = false;
      
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=this.leapDays(lYear); }
        else { temp = this.monthDays(lYear, i); }
        if(isLeap && i==(leap+1)) isLeap=false;
        offset -= temp;
      }
      if(offset==0 && leap>0 && i==leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset += temp; i--; }
      
      const lMonth = i;
      const lDay = offset + 1;
      
      const gzY = this.gan[(lYear-4)%10] + this.zhi[(lYear-4)%12];
      const animal = this.ani[(lYear-4)%12];
      const lMonthCn = (isLeap ? "闰" : "") + this.monStr[lMonth-1];
      
      let lDayCn;
      const dStr = ["初","十","廿","卅"];
      if(lDay===10) lDayCn = "初十";
      else if(lDay===20) lDayCn = "二十";
      else if(lDay===30) lDayCn = "三十";
      else lDayCn = dStr[Math.floor(lDay/10)] + this.nStr[lDay%10];

      const astro = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座";
      
      return { 
        gzYear: gzY, animal, 
        monthCn: lMonthCn + "月", 
        dayCn: lDayCn, 
        astro 
      };
    },
    
    // 节气 (修正版)
    getTerm(y, n) {
      // 31556925974.7 是回归年长度 (毫秒)
      const offDate = new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
      return offDate.getUTCDate();
    },
    
    // 农历转公历 (使用UTC计算)
    l2s(y,m,d) { try {
      let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i);
      let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i);
      if(lp>0 && lp<m) off+=this.leapDays(y);
      const ts = (off+d-31)*86400000 + Date.UTC(1900,0,31);
      const dt = new Date(ts);
      return dt;
    } catch(e){return null;} }
  };

  // 4. 节日配置 (全称 + 精准计算)
  const getFests = (y) => {
    // 格式化输出
    const fmt = (d) => d ? `${d.getUTCFullYear()}/${pad(d.getUTCMonth()+1)}/${pad(d.getUTCDate())}` : "";
    const ymd2 = (Y,M,D) => `${Y}/${pad(M)}/${pad(D)}`;
    
    const l2s = (m,d) => fmt(Lunar.l2s(y,m,d));
    const term = (n) => ymd2(y, Math.floor((n-1)/2)+1, Lunar.getTerm(y,n));
    
    // 动态节日：某月第N个周W (UTC计算)
    const getWDay = (m, n, w) => {
        // 构造当月1号 (UTC)
        const firstDay = new Date(Date.UTC(y, m-1, 1));
        const dayOfWeek = firstDay.getUTCDay();
        let diff = w - dayOfWeek;
        if(diff < 0) diff += 7;
        const date = 1 + diff + (n-1)*7;
        return ymd2(y, m, date);
    };

    return {
      legal: [["元旦",ymd2(y,1,1)],["寒假",ymd2(y,1,31)],["春节",l2s(1,1)],["开学",ymd2(y,3,2)],["清明节",term(7)],["春假",ymd2(y,4,29)],["劳动节",ymd2(y,5,1)],["端午节",l2s(5,5)],["高考",ymd2(y,6,7)],["暑假",ymd2(y,7,4)],["中秋节",l2s(8,15)],["国庆节",ymd2(y,10,1)],["秋假",getWDay(11,2,3)]], // 修正秋假逻辑
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
      intl: [["情人节",ymd2(y,2,14)],["妇女节",ymd2(y,3,8)],["母亲节",getWDay(5,2,0)],["儿童节",ymd2(y,6,1)],["父亲节",getWDay(6,3,0)],["万圣节",ymd2(y,10,31)],["平安夜",ymd2(y,12,24)],["圣诞节",ymd2(y,12,25)],["感恩节",getWDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>[["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][i], term(i+1)])
    };
  };

  // 排序与置顶
  const merge = (list, count) => {
    // 今天的 UTC 时间戳 (去除时分秒)
    const todayTs = Date.UTC(cY, cM-1, cD);
    
    return list.map(([n, dStr]) => {
        if (!dStr) return null;
        const [yy, mm, dd] = dStr.split('/').map(Number);
        const targetTs = Date.UTC(yy, mm-1, dd);
        const diff = Math.floor((targetTs - todayTs) / 86400000);
        
        // 高考置顶逻辑
        let sortKey = diff;
        if (n === "高考" && diff > 0 && diff <= 200) sortKey = -9999;
        
        return { n, diff, sortKey };
      })
      .filter(i => i && i.diff >= -1)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, count)
      .map(i => i.diff === 0 ? `🎉${i.n}` : `${i.n} ${i.diff}天`)
      .join(" , ");
  };

  // 5. 执行逻辑
  try {
    const lObj = Lunar.convert(cY, cM, cD);
    const dayData = await getData();
    
    const getV = (...k) => { 
        if(!dayData) return ""; 
        for(let i of k) if(dayData[i]) return dayData[i]; 
        return ""; 
    };
    const yi = getV("yi","Yi","suit");
    const ji = getV("ji","Ji","avoid");
    const chong = getV("chongsha","ChongSha","chong");
    const bai = getV("baiji","BaiJi");
    const almanac = [chong, bai, yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(s => s && s.trim()).join("\n");
    
    const f1 = getFests(cY);
    const f2 = getFests(cY+1);
    
    const showFests = [
      merge([...f1.legal, ...f2.legal], 3),
      merge([...f1.term, ...f2.term], 3),
      merge([...f1.folk, ...f2.folk], 3),
      merge([...f1.intl, ...f2.intl], 3)
    ].filter(Boolean).join("\n");

    $done({
      title: `${cY}年${pad(cM)}月${pad(cD)}日 星期${weekCn[NOW.day]} ${lObj.astro}`,
      content: `${lObj.gzYear}(${lObj.animal})年 ${lObj.monthCn}${lObj.dayCn} ${lObj.term||""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: e.message });
  }
})();
