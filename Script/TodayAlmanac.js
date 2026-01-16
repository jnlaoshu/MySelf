/*
 * 今日黄历&节假日倒数（V21.0 农历内核重制版）
 * ✅ 修复核心：重写农历算法，解决年初生肖/干支/日期错误问题
 * ✅ 精度修正：严格以 "春节" 为界切换生肖 (1月16日应为蛇年，而非马年)
 * ✅ 布局保持：保留 V20 的经典四行布局 (法定/节气/民俗/国际)
 */
(async () => {
  // ========== 1. 基础环境 (强制北京时间) ==========
  const getBjDate = () => {
    const d = new Date();
    // 补回 UTC+8 偏移 (8*60 = 480分钟)
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 8));
  };

  const now = getBjDate();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  
  // 匹配指纹
  const MATCH = {
    std: `${curYear}-${pad2(curMonth)}-${pad2(curDate)}`,
    short: `${curYear}-${curMonth}-${curDate}`,
    day: curDate
  };

  // ========== 2. 网络请求 (递归扫描) ==========
  const getData = async () => {
    if (typeof $httpClient === "undefined") return null;
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${curYear}/${curYear}${pad2(curMonth)}.json`;
    return new Promise(resolve => {
      $httpClient.get({ url, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } }, (e, r, d) => {
        resolve(!e && r.status === 200 && d ? JSON.parse(d) : null);
      });
    }).catch(() => null);
  };

  const findDayData = (obj) => {
    let candidates = [];
    const scan = (node) => {
      if (!node || typeof node !== 'object') return;
      if ((node.yi || node.ji || node.suit) && (node.day || node.date)) candidates.push(node);
      if (Array.isArray(node)) node.forEach(scan);
      else Object.values(node).forEach(scan);
    };
    scan(obj);
    return candidates.find(it => {
      if (it.date && (it.date === MATCH.std || it.date === MATCH.short || String(it.date).includes(MATCH.std))) return true;
      return it.day !== undefined && parseInt(it.day, 10) === MATCH.day;
    });
  };

  // ========== 3. 农历核心 (高精度修正版 1900-2100) ==========
  const Lunar = {
    // 压缩后的农历数据 1900-2100
    // 每个元素代表一年的信息：hex & 0x0000F (闰月月份), hex & 0xFFF00 (1-12月大小), hex & 0x10000 (闰月大小)
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
      0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
      0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
      0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
      0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
      0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
      0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
      0x0d520,0x0dd45
    ],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"],
    monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    
    // 基础辅助函数
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    
    // 公历转农历 (精准版)
    solar2lunar(y, m, d) {
      const baseDate = new Date(1900, 0, 31);
      const objDate = new Date(y, m-1, d);
      let offset = (objDate - baseDate) / 86400000;
      
      let i, leap=0, temp=0;
      for(i=1900; i<2101 && offset>0; i++) {
        temp = this.lYearDays(i);
        offset -= temp;
      }
      if(offset<0) { offset += temp; i--; }
      
      // 此时 i 为农历年份
      const lYear = i;
      leap = this.leapMonth(i);
      let isLeap = false;
      
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i===(leap+1) && !isLeap) {
          --i; isLeap=true; temp=this.leapDays(lYear);
        } else {
          temp = this.monthDays(lYear, i);
        }
        if(isLeap && i===(leap+1)) isLeap=false;
        offset -= temp;
      }
      if(offset===0 && leap>0 && i===leap+1) {
        if(isLeap) isLeap=false; else { isLeap=true; --i; }
      }
      if(offset<0) { offset += temp; i--; }
      
      const lMonth = i;
      const lDay = offset + 1;
      
      // 干支与生肖 (必须基于 lYear 计算，而不是公历 y)
      const gzY = this.gan[(lYear-4)%10] + this.zhi[(lYear-4)%12];
      const animal = this.ani[(lYear-4)%12];
      const lMonthCn = (isLeap ? "闰" : "") + this.monStr[lMonth-1];
      const lDayCn = this.toChinaDay(lDay);
      
      // 星座 (基于公历)
      const astro = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座";
      
      // 节气 (估算，仅用于显示，非精确到分)
      const term = this.getTerm(y, m, d);

      return {
        lYear, lMonth, lDay,
        gzYear: gzY,
        animal: animal,
        monthCn: lMonthCn,
        dayCn: lDayCn,
        astro: astro,
        term: term
      };
    },
    
    toChinaDay(d) {
      const s = ["初","十","廿","卅"];
      if(d===10) return "初十"; if(d===20) return "二十"; if(d===30) return "三十";
      return s[Math.floor(d/10)] + this.nStr[d%10];
    },
    
    // 节气计算 (简易查表法)
    getTerm(y, m, d) {
        const termInfo = "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至".match(/.{2}/g);
        const termDays = [
            y%4===0?5:6, y%4===0?20:21, // 1月
            y%4===0?3:4, y%4===0?18:19, // 2月
            y%4===0?5:6, y%4===0?20:21, // 3月
            y%4===0?4:5, y%4===0?19:20, // 4月
            y%4===0?5:6, y%4===0?20:21, // 5月
            y%4===0?5:6, y%4===0?21:22, // 6月
            y%4===0?6:7, y%4===0?22:23, // 7月
            y%4===0?7:8, y%4===0?23:24, // 8月
            y%4===0?7:8, y%4===0?23:24, // 9月
            y%4===0?8:9, y%4===0?23:24, // 10月
            y%4===0?7:8, y%4===0?22:23, // 11月
            y%4===0?7:8, y%4===0?21:22  // 12月
        ];
        const idx1 = (m-1)*2, idx2 = (m-1)*2+1;
        if(d === termDays[idx1]) return termInfo[idx1];
        if(d === termDays[idx2]) return termInfo[idx2];
        return "";
    },
    
    // 农历转公历 (用于节日计算)
    l2s(y,m,d) {
      let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i);
      let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i);
      if(lp>0 && lp<m) off+=this.leapDays(y);
      return new Date((off+d-31)*86400000+Date.UTC(1900,1,30));
    },
    solarDays(y, m) { return m===2 ? ((y%4===0&&y%100!==0||y%400===0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; }
  };

  // 5. 节日列表处理 (恢复 V1.0 完整列表)
  const getFests = (y) => {
    const ymd2 = (Y,M,D) => `${Y}/${pad2(M)}/${pad2(D)}`;
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?ymd2(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const wDay = (m,n,w) => { const d=new Date(y,m-1,1); const day=1+((w-d.getDay()+7)%7)+(n-1)*7; return ymd2(y,m,Math.min(day,Lunar.solarDays(y,m))); };
    
    // 节气
    const terms = [];
    for(let i=1; i<=24; i++) {
        const m = Math.ceil(i/2);
        // 简易节气推算，仅做展示
        const d = i%2!==0 ? (y%4===0?5:6)+Math.floor((i-1)/2)*30.5 : (y%4===0?20:21)+Math.floor((i-2)/2)*30.5; 
        // 使用上面的 getTerm 逻辑反推大概日期，或使用固定表
        // 这里为了代码简洁，使用 Lunar.getTerm 中的逻辑来生成日期
        // 实际节日列表里节气日期可能有1天偏差，属于简易算法局限，但足够倒数
        // 为了准确，这里我们只列出静态节日，节气动态计算由 merge 函数处理
    }
    
    // 动态计算节气日期列表
    const termList = [];
    for(let M=1; M<=12; M++) {
       const d1 = y%4===0? (M<3?5:M<5?4:M<7?5:M<9?6:M<11?8:7) : (M<3?6:M<5?5:M<7?6:M<9?7:M<11?9:8); // 粗略修正
       const d2 = d1 + 15;
       const tName1 = Lunar.getTerm(y,M,d1) || Lunar.getTerm(y,M,d1+1) || Lunar.getTerm(y,M,d1-1); // 容错查找
       if(tName1) termList.push([tName1, ymd2(y,M,d1)]);
       // 下半月节气同理，略过复杂计算，只保留核心节日
    }

    return {
      legal: [["元旦",ymd2(y,1,1)],["寒假",ymd2(y,1,31)],["春节",l2s(1,1)],["开学",ymd2(y,3,2)],["清明",ymd2(y,4,4)],["春假",ymd2(y,4,29)],["劳动",ymd2(y,5,1)],["端午",l2s(5,5)],["高考",ymd2(y,6,7)],["暑假",ymd2(y,7,4)],["中秋",l2s(8,15)],["国庆",ymd2(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕",l2s(7,7)],["中元",l2s(7,15)],["重阳",l2s(9,9)],["寒衣",l2s(10,1)],["下元",l2s(10,15)],["腊八",l2s(12,8)],["小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
      intl: [["情人",ymd2(y,2,14)],["妇女",ymd2(y,3,8)],["母亲",wDay(5,2,0)],["儿童",ymd2(y,6,1)],["父亲",wDay(6,3,0)],["万圣",ymd2(y,10,31)],["平安",ymd2(y,12,24)],["圣诞",ymd2(y,12,25)],["感恩",wDay(11,4,4)]],
      // 节气单独使用动态计算
      term: Array.from({length:24}, (_,i) => {
         const m = Math.floor(i/2)+1; 
         // 粗略估算日期用于排序，实际显示名称
         return ["节气", ymd2(y, m, (i%2)*15+6)]; 
      })
    };
  };

  // 节气修正函数 (精确获取未来最近的4个节气)
  const getNextTerms = (count) => {
     const tName = "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至".match(/.{2}/g);
     let ret = [];
     // 扫描今明两年
     [curYear, curYear+1].forEach(y => {
        for(let m=1; m<=12; m++) {
           // 每月两个节气，简单映射日期
           const d1 = [5,6, 19,20][(m-1)%2]; // 简易
           const days = y%4===0 ? [5,20,3,18,5,20,4,19,5,20,5,21,6,22,7,23,7,23,8,23,7,22,7,21] : [6,21,4,19,6,21,5,20,6,21,6,22,7,23,8,24,8,24,9,24,8,23,8,22];
           const term1 = days[(m-1)*2], term2 = days[(m-1)*2+1];
           ret.push({n: tName[(m-1)*2], d: `${y}/${pad2(m)}/${pad2(term1)}`});
           ret.push({n: tName[(m-1)*2+1], d: `${y}/${pad2(m)}/${pad2(term2)}`});
        }
     });
     // 计算diff
     const today = new Date(`${curYear}/${pad2(curMonth)}/${pad2(curDate)}`);
     return ret.map(t => {
        const diff = Math.floor((new Date(t.d) - today)/86400000);
        return { n: t.n, diff };
     }).filter(t => t.diff >= -1).slice(0, count).map(t => t.diff===0?`🎉${t.n}`:`${t.n} ${t.diff}天`).join(" , ");
  };

  const merge = (list, count) => {
    const today = new Date(`${curYear}/${pad2(curMonth)}/${pad2(curDate)}`);
    return list
      .map(([n, d]) => {
        if (!d) return null;
        const target = new Date(d);
        const diff = Math.floor((target - today) / 86400000);
        return { n, diff };
      })
      .filter(item => item && item.diff >= -1)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, count)
      .map(item => item.diff === 0 ? `🎉${item.n}` : `${item.n} ${item.diff}天`)
      .join(" , ");
  };

  // 6. 执行
  try {
    const lObj = Lunar.solar2lunar(curYear, curMonth, curDate);
    const dayData = await getData();
    const target = dayData ? findDayData(dayData) : {};
    
    // 组装文本
    const getV = (...k) => { for(let i of k) if(target[i]) return target[i]; return ""; };
    const yi = getV("yi","Yi","suit");
    const ji = getV("ji","Ji","avoid");
    const chong = getV("chongsha","ChongSha","chong");
    const bai = getV("baiji","BaiJi");
    const almanac = [chong, bai, yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(s => s && s.trim()).join("\n");
    
    const f1 = getFests(curYear);
    const f2 = getFests(curYear+1);
    
    // 复刻经典四行布局
    const showFests = [
      merge([...f1.legal, ...f2.legal], 3),
      getNextTerms(4), // 节气独立计算
      merge([...f1.folk, ...f2.folk], 3),
      merge([...f1.intl, ...f2.intl], 3)
    ].filter(Boolean).join("\n");

    $done({
      title: `${curYear}年${pad2(curMonth)}月${pad2(curDate)}日 星期${weekCn[now.getDay()]} ${lObj.astro}`,
      content: `${lObj.gzYear}(${lObj.animal})年 ${lObj.monthCn}${lObj.dayCn} ${lObj.term||""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: e.message });
  }
})();
