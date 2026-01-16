/*
 * 今日黄历&节假日倒数（V24.0 均衡布局版）
 * ✅ 布局优化：所有节假日行 (法定/节气/民俗/国际) 统一显示最近的 3 个
 * ✅ 内核保持：高精度农历算法 + 鹰眼数据匹配 + 智能排序
 */
(async () => {
  // ========== 1. 基础环境 (使用设备时间) ==========
  const now = new Date();
  const [curYear, curMonth, curDate] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
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

  // ========== 3. 高精度农历算法 (1900-2100) ==========
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"],
    monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    
    // 公历转农历
    convert(y, m, d) {
      const base = new Date(1900, 0, 31);
      const obj = new Date(y, m-1, d);
      let offset = Math.floor((obj - base) / 86400000);
      
      let i, leap=0, temp=0;
      for(i=1900; i<2101 && offset>0; i++) {
        temp = this.lYearDays(i);
        offset -= temp;
      }
      if(offset<0) { offset += temp; i--; }
      
      const lYear = i; 
      leap = this.leapMonth(i);
      let isLeap = false;
      
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i===(leap+1) && !isLeap) { --i; isLeap=true; temp=this.leapDays(lYear); }
        else { temp = this.monthDays(lYear, i); }
        if(isLeap && i===(leap+1)) isLeap=false;
        offset -= temp;
      }
      if(offset===0 && leap>0 && i===leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
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
    
    // 节气计算
    getTerm(y, n) {
      const d = new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
      return d.getUTCDate();
    },
    
    l2s(y,m,d) { try {
      let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i);
      let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i);
      if(lp>0 && lp<m) off+=this.leapDays(y);
      return new Date((off+d-31)*86400000+Date.UTC(1900,1,30));
    } catch(e){return null;} }
  };

  // 4. 节日列表处理
  const getFests = (y) => {
    const ymd2 = (Y,M,D) => `${Y}/${pad2(M)}/${pad2(D)}`;
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?ymd2(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    
    const getTermDay = (n) => ymd2(y, Math.floor((n-1)/2)+1, Lunar.getTerm(y,n));
    
    const getWDay = (m, n, w) => {
        let d = new Date(y, m-1, 1);
        let day = d.getDay();
        let diff = w - day;
        if(diff < 0) diff += 7;
        let date = 1 + diff + (n-1)*7;
        return ymd2(y, m, date);
    };

    return {
      legal: [["元旦",ymd2(y,1,1)],["寒假",ymd2(y,1,31)],["春节",l2s(1,1)],["开学",ymd2(y,3,2)],["清明节",getTermDay(7)],["春假",ymd2(y,4,29)],["劳动节",ymd2(y,5,1)],["端午节",l2s(5,5)],["高考",ymd2(y,6,7)],["暑假",ymd2(y,7,4)],["中秋节",l2s(8,15)],["国庆节",ymd2(y,10,1)],["秋假",ymd2(y,11,1)]],
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
      intl: [["情人节",ymd2(y,2,14)],["妇女节",ymd2(y,3,8)],["母亲节",getWDay(5,2,0)],["儿童节",ymd2(y,6,1)],["父亲节",getWDay(6,3,0)],["万圣节",ymd2(y,10,31)],["平安夜",ymd2(y,12,24)],["圣诞节",ymd2(y,12,25)],["感恩节",getWDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>{ 
          const tName = "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至".match(/.{2}/g);
          return [tName[i], getTermDay(i+1)];
      })
    };
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
      .slice(0, count) // 截取前 count 个
      .map(item => item.diff === 0 ? `🎉${item.n}` : `${item.n} ${item.diff}天`)
      .join(" , ");
  };

  // 6. 执行
  try {
    const lObj = Lunar.convert(curYear, curMonth, curDate);
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
    
    // 每一行都只显示最近的 3 个
    const showFests = [
      merge([...f1.legal, ...f2.legal], 3),
      merge([...f1.term, ...f2.term], 3),
      merge([...f1.folk, ...f2.folk], 3),
      merge([...f1.intl, ...f2.intl], 3)
    ].filter(Boolean).join("\n");

    $done({
      title: `${curYear}年${pad2(curMonth)}月${pad2(curDate)}日 星期${weekCn[now.getDay()]} ${lObj.astro}`,
      content: `${lObj.gzYear}(${lObj.animal})年 ${lObj.monthCn}${lObj.dayCn} ${lObj.term?lObj.term+" ":""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: e.message });
  }
})();
