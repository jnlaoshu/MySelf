/*
 * 今日黄历&节假日倒数
 * ✅ 数据：100% 恢复第一版最全节日库 (含寒暑假/高考/民俗/节气)
 * ✅ 修复：彻底移除 "宜" 上方的空行，排版紧凑美观
 * ✅ 核心：保留 "递归扫描 + 鹰眼匹配" 算法，精准获取 JSON 数据
 */
(async () => {
  // 1. 基础环境 (强制北京时间)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (3600000 * 8));
  const [curYear, curMonth, curDate] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const weekCn = "日一二三四五六";
  const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  const ymd = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  
  // 匹配指纹
  const MATCH = {
    std: `${curYear}-${pad2(curMonth)}-${pad2(curDate)}`,
    short: `${curYear}-${curMonth}-${curDate}`,
    day: curDate
  };

  // 2. 网络请求 (GitHub Raw + UA伪装)
  const getData = async () => {
    if (typeof $httpClient === "undefined") return null;
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${curYear}/${curYear}${pad2(curMonth)}.json`;
    return new Promise(resolve => {
      $httpClient.get({ url, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } }, (e, r, d) => {
        resolve(!e && r.status === 200 && d ? JSON.parse(d) : null);
      });
    }).catch(() => null);
  };

  // 3. 递归数据扫描 (穿透任意层级)
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

  // 4. 农历核心 (恢复完整版以支持所有节日计算)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    termInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["初","十","廿","卅","正","二","三","四","五","六","七","八","九","十","冬","腊"],
    monthDays(y,m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    solarDays(y, m) { return m===2 ? ((y%4===0&&y%100!==0||y%400===0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; },
    getTerm(y, n) { 
      const t=this.termInfo[y-1900]||"", d=[];
      for(let i=0;i<t.length;i+=5){ const c=parseInt("0x"+t.substr(i,5)).toString(); d.push([c[0],c.substr(1,2),c[3],c.substr(4,2)]); }
      const arr = d[Math.ceil(n/2)-1];
      return parseInt(arr && arr[n%2==1?0:2]?arr[n%2==1?1:3]:0)||0;
    },
    convert(y, m, d) {
      let i, leap=0, temp=0, offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lYearDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const year=i; let isLeap=false; leap=this.leapMonth(i);
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i===(leap+1) && !isLeap) { --i; isLeap=true; temp=this.leapDays(year); }
        else { temp=this.monthDays(year,i); }
        if(isLeap && i===(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset===0 && leap>0 && i===leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset+=temp; i--; }
      const month=i, day=offset+1;
      const termId = this.getTerm(y, m*2-1)===d ? m*2-2 : (this.getTerm(y, m*2)===d ? m*2-1 : null);
      const astro = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座";
      return { 
        gz: this.gan[(year-4)%10]+this.zhi[(year-4)%12], 
        ani: this.ani[(year-4)%12],
        cn: `${isLeap?"闰":""}${this.nStr[month+3]}月${day===10?"初十":day===20?"二十":day===30?"三十":this.nStr[Math.floor(day/10)]+["日","一","二","三","四","五","六","七","八","九","十"][day%10]}`,
        term: termId!==null ? this.terms[termId] : "", astro
      };
    },
    l2s(y,m,d) { try {
      let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i);
      let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i);
      if(lp>0 && lp<m) off+=this.leapDays(y);
      return new Date((off+d-31)*86400000+Date.UTC(1900,1,30));
    } catch(e){return null;} }
  };

  // 5. 节日逻辑 (1:1 恢复 V1.0 数据)
  const getFests = (y) => {
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?ymd(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const wDay = (m,n,w) => { const d=new Date(y,m-1,1); const day=1+((w-d.getDay()+7)%7)+(n-1)*7; return ymd(y,m,Math.min(day,Lunar.solarDays(y,m))); };
    const qm = Lunar.getTerm(y,7);
    
    return {
      legal: [["元旦",ymd(y,1,1)],["寒假",ymd(y,1,31)],["春节",l2s(1,1)],["开学",ymd(y,3,2)],["清明",ymd(y,4,qm)],["春假",ymd(y,4,qm+1)],["劳动",ymd(y,5,1)],["端午",l2s(5,5)],["高考",ymd(y,6,7)],["暑假",ymd(y,7,4)],["中秋",l2s(8,15)],["国庆",ymd(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕",l2s(7,7)],["中元",l2s(7,15)],["重阳",l2s(9,9)],["寒衣",l2s(10,1)],["下元",l2s(10,15)],["腊八",l2s(12,8)],["小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
      intl: [["情人",ymd(y,2,14)],["妇女",ymd(y,3,8)],["母亲",wDay(5,2,0)],["儿童",ymd(y,6,1)],["父亲",wDay(6,3,0)],["万圣",ymd(y,10,31)],["平安",ymd(y,12,24)],["圣诞",ymd(y,12,25)],["感恩",wDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>{ const m=Math.floor(i/2)+1; const day=Lunar.getTerm(y,i+1); return [Lunar.terms[i], ymd(y,m,day)]; })
    };
  };

  const merge = (list) => list.filter(i=>i[1]).map(([n,d])=>{
    const diff = Math.floor((new Date(d.split('-').join('/')) - new Date(ymd(curYear,curMonth,curDate).split('-').join('/')))/86400000);
    return diff===0 ? `🎉${n}` : (diff>0 && diff<=365 ? `${n} ${diff}天` : null);
  }).filter(Boolean).join(" , ");

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
    
    // 🚀 核心修复：强力去除空行，如果前面没数据，宜忌自动顶上去
    const almanac = [chong, bai, yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(s => s && s.trim() !== "").join("\n");
    
    const fests = getFests(curYear);
    const festsNext = getFests(curYear+1);
    
    // 恢复四行显示
    const showFests = [
      merge([...fests.legal, ...festsNext.legal].slice(0,3)),
      merge([...fests.term, ...festsNext.term].slice(0,4)),
      merge([...fests.folk, ...festsNext.folk].slice(0,3)),
      merge([...fests.intl, ...festsNext.intl].slice(0,3))
    ].filter(Boolean).join("\n");

    $done({
      title: `${curYear}年${pad2(curMonth)}月${pad2(curDate)}日 星期${weekCn[now.getDay()]} ${lObj.astro}`,
      content: `${lObj.gz}(${lObj.ani})年 ${lObj.cn} ${lObj.term||""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: "请查看日志" });
  }
})();
