/*
 * 📅 今日黄历 & 节假日倒数 (精简优化版)
 * 🛠 修复：日期格式匹配(01 vs 1)、字段大小写兼容(Yi/yi)
 * 🚀 优化：移除冗余代码、合并网络请求、时区强制校准
 */
(async () => {
  // ========== 1. 环境与时间初始化 ==========
  const $ = {
    store: typeof $persistentStore !== "undefined" ? $persistentStore : {},
    notify: typeof $notification !== "undefined" ? $notification : null,
    get: (url) => new Promise((resolve) => {
      if (typeof $httpClient === "undefined") return resolve(null);
      $httpClient.get({ url, timeout: 5000 }, (err, resp, data) => {
        try {
          if (err || resp.status !== 200 || !data) resolve(null);
          else resolve(JSON.parse(data));
        } catch (e) { resolve(null); }
      });
    })
  };

  // 强制北京时间 (UTC+8)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (3600000 * 8));
  const [curYear, curMonth, curDate] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const todayStr = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(curDate).padStart(2, '0')}`;

  // ========== 2. 核心工具函数 ==========
  const dateDiff = (dateStr) => {
    if (!dateStr) return -999;
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor((new Date(y, m - 1, d) - new Date(curYear, curMonth - 1, curDate)) / 86400000);
  };

  // 农历核心算法 (压缩版)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    toYmd: (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
    getTerm(y,n) {
      const s='9778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c359801ec95f8c965cc920f97bd09801d98082c95f8e1cfcc920fb027097bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c359801ec95f8c965cc920f97bd09801d98082c95f8e1cfcc920fb027097bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c359801ec95f8c965cc920f97bd09801d98082c95f8e1cfcc920fb027097bd097c36b0b6fc9274c91aa9778397bd19801ec9210c965cc920e97b6b97bd19801ec95f8c965cc920f97bd09801d98082c95f8e1cfcc920f97bd097bd097c36b0b6fc9210c8dc29778397bd197c36c9210c9274c91aa97b6b97bd19801ec95f8c965cc920e97bd09801d98082c95f8e1cfcc920f97bd097bd097c36b0b6fc9210c8dc29778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec95f8c965cc920e97bcf97c3598082c95f8e1cfcc920f97bd097bd097c36b0b6fc9210c8dc29778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c3598082c95f8c965cc920f97bd097bd097c35b0b6fc920fb07229778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c3598082c95f8c965cc920f97bd097bd097c35b0b6fc920fb07229778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c359801ec95f8c965cc920f97bd097bd097c35b0b6fc920fb07229778397bd097c36b0b6fc9274c91aa97b6b97bd19801ec9210c965cc920e97bcf97c359801ec95f8c965cc920f97bd097bd07f595b0b6fc920fb07229778397bd097c36b0b6fc9210c8dc29778397bd19801ec9210c9274c920e97b6b97bd19801ec95f8c965cc920f97bd07f5307f595b0b0bc920fb07227f0e397bd097c35b0b6fc9210c8dc29778397bd097c36b0b70c9274c91aa97b6b7f0e47f531b0723b0b6fb07217f0e37f1487f595b0b0bb0b6fb07227f0e397bd097c35b0b6fc9210c8dc29778397bd097c36b0b6fc9274c91aa97b6b7f0e47f531b0723b0b6fb07217f0e27f1487f595b0b0bb0b6fb07227f0e397bd07f595b0b0bc920fb07229778397bd097c36b0b6fc9274c91aa97b6b7f0e47f531b0723b0b6fb07217f0e27f1487f595b0b0bb0b6fb07227f0e397bd07f595b0b0bc920fb07229778397bd097c36b0b6fc9210c91aa97b6b7f0e47f149b0723b0787b07217f0e27f0e47f531b0b0bb0b6fb07227f0e397bd07f595b0b0bc920fb07229778397bd097c36b0b6fc9210c8dc2977837f0e37f149b0723b0787b07217f07e7f0e47f531b0723b0b6fb07227f0e37f5307f595b0b0bc920fb07227f0e397bd097c35b0b6fc9210c8dc2977837f0e37f14998082b0787b07217f07e7f0e47f531b0723b0b6fb07217f0e37f1487f595b0b0bb0b6fb07227f0e397bd097c35b0b6fc9210c8dc2977837f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e27f1487f531b0b0bb0b6fb07227f0e397bd097c35b0b6fc920fb0722977837f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e27f1487f531b0b0bb0b6fb07227f0e397bd07f595b0b0bc920fb0722977837f0e37f14998082b0787b06bd7f07e7f0e47f149b0723b0787b07217f0e27f0e47f531b0b0bb0b6fb07227f0e397bd07f595b0b0bc920fb0722977837f0e37f14898082b0723b02d57ec967f0e37f14998082b0787b07217f07e7f0e47f531b0723b0b6fb07227f0e37f1487f595b0b0bb0b6fb07227f0e37f0e37f14898082b0723b02d57ec967f0e37f14998082b0787b07217f07e7f0e47f531b0723b0b6fb07227f0e37f1487f595b0b0bb0b6fb07227f0e37f0e37f14898082b0723b02d57ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e37f1487f595b0b0bb0b6fb07227f0e37f0e37f14898082b072297c357ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e27f1487f531b0b0bb0b6fb07227f0e37f0e37f14898082b072297c357ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e27f1487f531b0b0bb0b6fb07227f0e37f0e366aa89801eb072297c357ec967f0e37f14998082b0723b06bd7f07e7f0e37f14998083b0787b07217f0e27f0e47f531b0723b0b6fb07227f0e37f0e366aa89801eb072297c357ec967f0e37f14998082b0723b02d57f07e7f0e37f14998082b0787b07217f07e7f0e47f531b0723b0b6fb07227f0e36665b66aa89801e9808297c35665f67f0e37f14898082b0723b02d57ec967f0e37f14998082b0787b07217f07e7f0e47f531b0723b0b6fb07227f0e36665b66a449801e9808297c35665f67f0e37f14898082b0723b02d57ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e36665b66a449801e9808297c35665f67f0e37f14898082b072297c357ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e26665b66a449801e9808297c35665f67f0e37f1489801eb072297c357ec967f0e37f14998082b0787b06bd7f07e7f0e47f531b0723b0b6fb07217f0e27f1487f531b0b0bb0b6fb0722';
      const c = parseInt('0x' + s.substr((y-1900)*30 + (n-1)*5, 5)).toString();
      const d = [c[0], c.substr(1,2), c[3], c.substr(4,2)];
      return parseInt(d[n>d.length?d.length-1:n-1]) || 0;
    },
    convert(y,m,d) {
      let i, leap=0, temp=0, offset = (Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000;
      for(i=1900; i<2101 && offset>0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset<0) { offset += temp; i--; }
      const year=i, month=i;
      let isLeap=false; leap = this.info[i-1900]&0xf;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i===(leap+1) && !isLeap) { --i; isLeap=true; temp = (this.info[year-1900]&0x10000)?30:29; }
        else { temp = (this.info[year-1900]&(0x10000>>i))?30:29; }
        if(isLeap && i===(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset===0 && leap>0 && i===leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset+=temp; i--; }
      const day = offset+1;
      const term = this.getTerm(y, m*2-1)===d ? this.terms[m*2-2] : (this.getTerm(y, m*2)===d ? this.terms[m*2-1] : "");
      const astro = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座";
      return { 
        txt: `${this.gan[(year-4)%10]}${this.zhi[(year-4)%12]}(${this.animals[(year-4)%12]})年 ${isLeap?"闰":""}${["正","二","三","四","五","六","七","八","九","十","冬","腊"][i-1]}月${day===10?"初十":day===20?"二十":day===30?"三十":["初","十","廿","卅"][Math.floor(day/10)]+["日","一","二","三","四","五","六","七","八","九","十"][day%10]} ${term} ${astro}`,
        l2s: (m,d) => { try {
           // 极简版农历转公历，仅用于节日
           let off=0; for(let j=1900;j<y;j++) off+=this.lYearDays(j);
           let lp=this.info[y-1900]&0xf; for(let j=1;j<m;j++) off+=((this.info[y-1900]&(0x10000>>j))?30:29);
           if(lp>0&&lp<m) off+=(this.info[y-1900]&0x10000?30:29);
           const t=new Date((off+d-31)*86400000+Date.UTC(1900,1,30));
           return this.toYmd(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate());
        } catch(e){return ""} }
      };
    },
    lYearDays(y) { let i,s=348; for(i=0x8000;i>0x8;i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+(this.info[y-1900]&0xf?((this.info[y-1900]&0x10000)?30:29):0); }
  };

  // ========== 3. 业务逻辑 (黄历 & 节日) ==========
  const getFests = (year) => {
    const l = Lunar.convert(year,1,1); // 初始化农历对象
    const qm = Lunar.toYmd(year, 4, Lunar.getTerm(year, 7));
    const list = [
      // 法定
      ["元旦",`${year}-01-01`], ["寒假",`${year}-01-31`], ["春节",l.l2s(1,1)], ["清明",qm], ["劳动",`${year}-05-01`], ["端午",l.l2s(5,5)], ["国庆",`${year}-10-01`], ["中秋",l.l2s(8,15)],
      // 节气 (取最近4个)
      ...Array.from({length:24},(_,i)=>[Lunar.terms[i], Lunar.toYmd(year, Math.floor(i/2)+1, Lunar.getTerm(year, i+1))])
    ];
    return list;
  };

  const getAlmanac = async () => {
    // 默认开启，若需关闭请在参数中设置 show_almanac=false
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${curYear}/${curYear}${String(curMonth).padStart(2,'0')}.json`;
    const json = await $.get(url);
    const dayData = (json?.days || []).find(it => {
      // 🌟 核心匹配逻辑：优先 Number 匹配，忽略 01 和 1 的区别
      return Number(it.day) === curDate || (it.date && it.date === todayStr);
    });

    if (!dayData) return "";
    const yi = dayData.yi || dayData.Yi || "";
    const ji = dayData.ji || dayData.Ji || "";
    const cs = dayData.chongsha || dayData.ChongSha || "";
    
    return [cs, yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(Boolean).join("\n");
  };

  // ========== 4. 执行与输出 ==========
  try {
    const lunarObj = Lunar.convert(curYear, curMonth, curDate);
    const almanac = await getAlmanac();
    
    // 合并今明两年节日，过滤过期，取前 3 个
    const fests = [...getFests(curYear), ...getFests(curYear+1)]
      .map(([n, d]) => { const diff = dateDiff(d); return diff===0 ? `🎉${n}` : (diff>0 ? `${n} ${diff}天` : null) })
      .filter(Boolean).slice(0, 3).join(" , ");

    // 每日通知
    const arg = typeof $argument!="undefined" ? Object.fromEntries(new URLSearchParams($argument.replace(/,/g,'&'))) : {};
    if ($.notify && $.store && new Date().getHours()>=7 && fests.includes("🎉")) {
      const k = `notified_${todayStr}`;
      if ($.store.read(k) !== "1") { $.store.write("1", k); $.notify.post("今日节日提醒", "", fests); }
    }

    $done({
      title: `${curYear}年${curMonth}月${curDate}日 星期${"日一二三四五六"[now.getDay()]}`,
      content: [lunarObj.txt, almanac, fests].filter(Boolean).join("\n\n"),
      icon: "calendar", "icon-color": "#FF9800"
    });
  } catch (e) {
    $done({ title: "黄历加载失败", content: "请检查网络或日志", icon: "exclamationmark.triangle" });
  }
})();
