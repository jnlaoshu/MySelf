/*
 * 今日黄历&节假日倒数 (V27.0 高考置顶版)
 * ✅ 特性：高考倒计时 200 天内强制置顶 (法定节假日首位)
 * ✅ 特性：6月7日当天取消置顶，恢复正常排序显示
 * ✅ 内核：保留 V26 的所有修复 (鹰眼匹配/递归扫描/全称规范)
 */
(async () => {
  // 1. 基础环境 (强制北京时间)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (3600000 * 8));
  const [cY, cM, cD] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const weekCn = "日一二三四五六";
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  const ymd = (y, m, d) => `${y}/${pad(m)}/${pad(d)}`;
  
  const MATCH = {
    s: `${cY}-${pad(cM)}-${pad(cD)}`,
    s2: `${cY}-${cM}-${cD}`,
    d: cD
  };

  // 2. 网络请求 (递归扫描 + 鹰眼匹配)
  const getData = async () => {
    if (typeof $httpClient === "undefined") return null;
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${cY}/${cY}${pad(cM)}.json`;
    
    return new Promise(resolve => {
      $httpClient.get({ url, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } }, (e, r, d) => {
        if (e || r.status !== 200 || !d) return resolve(null);
        try { resolve(JSON.parse(d)); } catch { resolve(null); }
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

  // 3. 农历内核 (1900-2100)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    solarDays(y, m) { return m==2 ? ((y%4==0&&y%100!=0||y%400==0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; },
    getTerm(y, n) { 
      return new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5)).getUTCDate();
    },
    convert(y, m, d) {
      let i, leap=0, temp=0, offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lYearDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i; leap=this.leapMonth(i); let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=this.leapDays(lYear); }
        else { temp=this.monthDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset+=temp; i--; }
      const lDay = offset+1;
      const term = this.getTerm(y, m*2-1)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-2] : (this.getTerm(y, m*2)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-1] : "");
      return { 
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lDay==10?"初十":lDay==20?"二十":lDay==30?"三十":["初","十","廿","卅"][Math.floor(lDay/10)]+this.nStr[lDay%10]}`,
        term: term, astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座"
      };
    },
    l2s(y,m,d) { try {
      let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i);
      let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i);
      if(lp>0 && lp<m) off+=this.leapDays(y);
      return new Date((off+d-31)*86400000+Date.UTC(1900,1,30));
    } catch(e){return null;} }
  };

  // 4. 节日配置
  const getFests = (y) => {
    const ymd2 = (Y,M,D) => `${Y}/${pad(M)}/${pad(D)}`;
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?ymd2(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const wDay = (m,n,w) => { const d=new Date(y,m-1,1), day=d.getDay(), diff=w-day; return ymd2(y,m,1+(diff<0?diff+7:diff)+(n-1)*7); };
    const term = (n) => ymd2(y, Math.floor((n-1)/2)+1, Lunar.getTerm(y,n));
    return {
      legal: [["元旦",ymd2(y,1,1)],["寒假",ymd2(y,1,31)],["春节",l2s(1,1)],["开学",ymd2(y,3,2)],["清明节",term(7)],["春假",ymd2(y,4,29)],["劳动节",ymd2(y,5,1)],["端午节",l2s(5,5)],["高考",ymd2(y,6,7)],["暑假",ymd2(y,7,4)],["中秋节",l2s(8,15)],["国庆节",ymd2(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
      intl: [["情人节",ymd2(y,2,14)],["妇女节",ymd2(y,3,8)],["母亲节",wDay(5,2,0)],["儿童节",ymd2(y,6,1)],["父亲节",wDay(6,3,0)],["万圣节",ymd2(y,10,31)],["平安夜",ymd2(y,12,24)],["圣诞节",ymd2(y,12,25)],["感恩节",wDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>[["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][i], term(i+1)])
    };
  };

  // 🔥 核心排序逻辑：高考置顶
  const merge = (list, count) => {
    const today = new Date(`${cY}/${pad(cM)}/${pad(cD)}`);
    return list
      .map(([n, d]) => {
        if (!d) return null;
        const target = new Date(d);
        const diff = Math.floor((target - today) / 86400000);
        
        // 🚨 置顶逻辑：如果是高考，且倒数日在 1~200 天之间，权重设为极小值(置顶)
        let sortKey = diff;
        if (n === "高考" && diff > 0 && diff <= 200) {
            sortKey = -9999;
        }
        
        return { n, diff, sortKey };
      })
      .filter(item => item && item.diff >= -1)
      .sort((a, b) => a.sortKey - b.sortKey) // 按权重排序
      .slice(0, count)
      .map(item => item.diff === 0 ? `🎉${item.n}` : `${item.n} ${item.diff}天`)
      .join(" , ");
  };

  // 5. 执行
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
    
    const f1 = getFests(cY), f2 = getFests(cY+1);
    
    // 渲染四行
    const showFests = [
      merge([...f1.legal, ...f2.legal], 3),
      merge([...f1.term, ...f2.term], 3),
      merge([...f1.folk, ...f2.folk], 3),
      merge([...f1.intl, ...f2.intl], 3)
    ].filter(Boolean).join("\n");

    $done({
      title: `${cY}年${pad(cM)}月${pad(cD)}日 星期${weekCn[now.getDay()]} ${lObj.astro}`,
      content: `${lObj.gz}(${lObj.ani})年 ${lObj.cn} ${lObj.term||""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: "请检查日志" });
  }
})();
