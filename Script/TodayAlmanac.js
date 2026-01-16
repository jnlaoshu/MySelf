/*
 * 今日黄历&节假日倒数
 * ✅ 功能：农历干支/生肖/星座/24节气/法定/民俗/国际节日+节日推送
 */
(async () => {
  // ========== 全局常量定义 & 不可变优化 - 根治变量篡改风险 ==========
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const hasNotify = typeof $notification !== "undefined";
  const hasHttpClient = typeof $httpClient !== "undefined";
  // 工具函数抽离-前置定义，根治 catch 中函数未定义的致命BUG
  const padStart2 = (n) => n.toString().padStart(2, '0');
  const todayDayStr = padStart2(curDate);
  const monthStr = padStart2(curMonth);
  // 节日数据缓存池 - 核心性能优化：一年只生成一次，避免重复计算
  const festDataCache = new Map();

  // ========== 工具函数 精修加固 + 性能优化 ==========
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  const parseArgs = () => {
    if (typeof $argument === "undefined" || !$argument || $argument.trim() === '') return {};
    const argStr = $argument.replace(/,/g, '&').trim();
    return Object.fromEntries(new URLSearchParams(argStr));
  };
  const args = parseArgs();
  const getConfig = (key, def = false) => {
    const val = args[key] ?? args[key.toLowerCase()] ?? def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  // ✅ 核心修复+优化：超时拉满10秒 + resp空值校验 + 统一返回格式，杜绝下游解构报错
  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) return resolve(null);
    $httpClient.get({ url, timeout: 10000 }, (err, resp, data) => {
      if (err || !resp || resp.status !== 200) resolve(null);
      else resolve(data);
    });
  });

  // ✅ 核心修复+优化：双层TRY/CATCH分离 + JSON解析强容错 + 结构兜底，解析失败不中断
  const fetchJson = async (url) => {
    try {
      const rawData = await httpGet(url);
      if (!rawData || rawData.length === 0) return { days: [] };
      try {
        const json = JSON.parse(rawData);
        return typeof json === 'object' && json !== null ? json : { days: [] };
      } catch { return { days: [] }; }
    } catch { return { days: [] }; }
  };

  // ✅ 新增修复：过滤负数天数，杜绝节日列表出现「-N天」的异常展示
  const calcDateDiff = (dateStr) => {
    if (!dateStr) return -1;
    const [y, m, d] = dateStr.split('-').map(Number).filter(n => !isNaN(n));
    if (y.length !== 3 || m <1 || d <1) return -1;
    const targetTime = new Date(y, m - 1, d).getTime();
    const todayTime = now.getTime();
    const diff = Math.floor((targetTime - todayTime) / 86400000);
    return diff < 0 ? -1 : diff;
  };

  // ========== 农历核心算法 完整保留 + 关键优化 ==========
  const LunarCal = Object.freeze({ // 冻结常量对象，内存优化+防止篡改，性能提升明显
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥",
    Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lYearDays(y) { let i, sum = 348; for(i = 0x8000; i > 0x8; i >>=1) sum += (this.lInfo[y-1900] & i) ?1:0; return sum + this.leapDays(y); },
    leapMonth(y) { return this.lInfo[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.lInfo[y-1900] & 0x10000) ?30:29 :0; },
    monthDays(y, m) { return (this.lInfo[y-1900] & (0x10000 >> m)) ?30:29; },
    solarDays(y, m) { return m===2 ? ((y%4===0&&y%100!==0||y%400===0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; },
    getTerm(y, n) { const t=this.sTermInfo[y-1900]||'',d=[];if(t&&t.length>0){for(let i=0;i<t.length;i+=5){const c=parseInt('0x'+t.substr(i,5)).toString();d.push(c[0],c.substr(1,2),c[3],c.substr(4,2))}}return parseInt(d[n-1]) || 0; },
    toChinaDay(d) { if(d===10)return"初十";if(d===20)return"二十";if(d===30)return"三十";return this.nStr2[Math.floor(d/10)] + this.nStr1[d%10]; },
    getAnimal(y) { return this.Animals[(y-4)%12]; },
    toGanZhi(o) { return this.Gan[o%10] + this.Zhi[o%12]; },
    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0;
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      const year = i; let isLeap = false; leap = this.leapMonth(i);
      for(i = 1; i <13 && offset>0; i++){
        if(leap>0 && i===(leap+1) && !isLeap){--i;isLeap=true;temp=this.leapDays(year);}else{temp=this.monthDays(year,i);}
        if(isLeap && i===(leap+1)) isLeap=false; offset -= temp;
      }
      if(offset===0 && leap>0 && i===leap+1) { if(isLeap) isLeap=false; else {isLeap=true;--i;} }
      if(offset<0) { offset += temp; i--; }
      const month = i, day = offset +1;
      const termId = this.getTerm(y, m*2-1) === d ? m*2-2 : (this.getTerm(y, m*2) === d ? m*2-1 : null);
      // ✅ 修复：替换废弃的 substr API 为 slice，兼容所有运行环境，杜绝报错
      const astroStr = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
      const cut = d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0;
      const astro = astroStr.slice(m*2 - cut, m*2 - cut + 2) + "座";
      return { lYear: year, lMonth: month, lDay: day, animal: this.getAnimal(year), monthCn: (leap === month && isLeap ? "闰" : "") + this.nStr3[month-1] + "月", dayCn: this.toChinaDay(day), gzYear: this.toGanZhi(year-4), term: termId !== null ? this.terms[termId] : null, astro };
    },
    lunar2solar(y, m, d) {
      let offset =0; for(let i=1900;i<y;i++) offset += this.lYearDays(i);
      let leap = this.leapMonth(y); for(let i=1;i<m;i++) offset += this.monthDays(y,i);
      if(leap>0 && leap<m) offset += this.leapDays(y);
      const t = new Date((offset + d -31)*86400000 + Date.UTC(1900,1,30));
      return { y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate() };
    }
  });

  // ========== 节日数据生成 核心性能优化 - 缓存复用 ==========
  const generateFestData = (year) => {
    if (festDataCache.has(year)) return festDataCache.get(year); // 缓存命中，直接返回
    const eve = LunarCal.monthDays(year,12) ===29 ?29:30;
    const lunar2Solar = (m,d)=>{const r=LunarCal.lunar2solar(year,m,d);return formatYmd(r.y,r.m,r.d);};
    const weekSpecDay = (m,n,w)=>{const d=new Date(year,m-1,1);const day=1+((w-d.getDay()+7)%7)+(n-1)*7;return formatYmd(year,m,Math.min(day,31));};
    const qmDay = LunarCal.getTerm(year,7);
    const festData = {
      legal: [["元旦",formatYmd(year,1,1)],["寒假",formatYmd(year,1,31)],["春节",lunar2Solar(1,1)],["开学",formatYmd(year,3,2)],["清明节",formatYmd(year,4,qmDay)],["春假",formatYmd(year,4,qmDay+1)],["劳动节",formatYmd(year,5,1)],["端午节",lunar2Solar(5,5)],["高考",formatYmd(year,6,7)],["暑假",formatYmd(year,7,4)],["中秋节",lunar2Solar(8,15)],["国庆节",formatYmd(year,10,1)],["秋假",weekSpecDay(11,2,3)]],
      folk: [["元宵节",lunar2Solar(1,15)],["龙抬头",lunar2Solar(2,2)],["七夕节",lunar2Solar(7,7)],["中元节",lunar2Solar(7,15)],["重阳节",lunar2Solar(9,9)],["寒衣节",lunar2Solar(10,1)],["下元节",lunar2Solar(10,15)],["腊八节",lunar2Solar(12,8)],["北方小年",lunar2Solar(12,23)],["南方小年",lunar2Solar(12,24)],["除夕",lunar2Solar(12,eve)]],
      intl: [["情人节",formatYmd(year,2,14)],["母亲节",weekSpecDay(5,2,0)],["父亲节",weekSpecDay(6,3,0)],["万圣节",formatYmd(year,10,31)],["平安夜",formatYmd(year,12,24)],["圣诞节",formatYmd(year,12,25)],["感恩节",weekSpecDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>{const m=Math.floor(i/2)+1,id=i+1;return [LunarCal.terms[i],formatYmd(year,m,LunarCal.getTerm(year,id))];})
    };
    festDataCache.set(year, festData); // 缓存存入，后续复用
    return festData;
  };

  // ✅✅✅ 核心中的核心：黄历宜忌获取 原修复逻辑保留 + 代码精简 + 健壮性加固 ✅✅✅
  const getLunarDesc = async () => {
    if (!getConfig('show_almanac', true)) return "";
    const apiUrl = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${curYear}/${curYear}${monthStr}.json`;
    const jsonData = await fetchJson(apiUrl);
    const dayList = jsonData?.days || [];
    
    // ✅ 保留原双条件精准匹配，根治匹配失败
    const todayData = dayList.find(item => item.day === todayDayStr || Number(item.day) === curDate);
    if (!todayData) return "";

    // ✅ 可选链+空值合并 精简兜底逻辑，杜绝undefined，过滤纯空内容，无任何硬编码兜底
    const contentList = [
      todayData.chongsha ?? "",
      todayData.baiji ?? "",
      todayData.xingxiu ?? "",
      todayData.yi ? `✅ 宜：${todayData.yi}` : "",
      todayData.ji ? `❎ 忌：${todayData.ji}` : ""
    ].filter(item => item && item.trim());
    
    return contentList.join("\n");
  };

  // ========== 公共业务逻辑 完整保留 + 逻辑优化 ==========
  const mergeFestList = (type, limit) => {
    const fThis = generateFestData(curYear)[type];
    const fNext = generateFestData(curYear+1)[type];
    // ✅ 优化：先过滤有效节日（天数>=0）再截取，减少遍历次数
    return [...fThis, ...fNext].filter(item => calcDateDiff(item[1]) >= 0).slice(0, limit);
  };
  
  const renderFestLine = (list) => list.map(([name, date]) => {
    const diff = calcDateDiff(date);
    return diff === 0 ? `🎉${name}` : `${name} ${diff}天`;
  }).filter(item => item).join(" , ");
  
  const getTodayFest = (list) => list.find(([_, date]) => calcDateDiff(date) === 0);

  // ========== 主逻辑执行 完整无删减 + 执行顺序优化 ==========
  const lunarNow = LunarCal.solar2lunar(curYear, curMonth, curDate);
  const lunarHeader = `${lunarNow.gzYear}(${lunarNow.animal})年 ${lunarNow.monthCn}${lunarNow.dayCn} ${lunarNow.term || ''}`.trim();
  const almanacTxt = await getLunarDesc();
  const blessMap = await fetchJson(args.BLESS_URL) || {};

  const legalFests = mergeFestList("legal",3);
  const folkFests = mergeFestList("folk",3);
  const intlFests = mergeFestList("intl",3);
  const termFests = mergeFestList("term",4);

  // ✅ 节日推送逻辑 加固：新增祝福兜底+时段校验，杜绝凌晨推送，保留原缓存防重复推送
  if (hasNotify && $store && now.getHours() >=6 && now.getHours() <=23) {
    const todayLegal = getTodayFest(legalFests);
    const todayFolk = getTodayFest(folkFests);
    const todayFest = todayLegal || todayFolk;
    if (todayFest) {
      const [name, date] = todayFest;
      const cacheKey = `timecard_pushed_${date}`;
      if ($store.read(cacheKey) !== "1") {
        $store.write("1", cacheKey);
        $notification.post(`🎉 今天是 ${name}`, "", blessMap[name] || "节日快乐，万事顺遂～");
      }
    }
  }

  // ========== 最终内容拼接 排版优化 + 无兜底 ==========
  const finalTitle = `${curYear}年${monthStr}月${todayDayStr}日 星期${weekCn[now.getDay()]} ${lunarNow.astro}`;
  const finalContent = [
    lunarHeader,
    almanacTxt,
    [renderFestLine(legalFests), renderFestLine(termFests), renderFestLine(folkFests), renderFestLine(intlFests)]
      .filter(Boolean).join("\n")
  ].filter(Boolean).join("\n\n");

  // ✅ 纯净输出，无任何兜底数据
  $done({ title: finalTitle, content: finalContent, icon: "calendar", "icon-color": "#FF9800" });

})().catch(error => {
  // ✅ 终极异常兜底：完整定义所有变量，打印完整错误堆栈，纯净空白输出，无任何兜底信息
  console.error(`【黄历脚本日志】运行异常:`, error);
  const now = new Date();
  const padStart2 = (n) => n.toString().padStart(2, '0');
  const y = now.getFullYear(), m = padStart2(now.getMonth()+1), d = padStart2(now.getDate());
  $done({ title: `${y}年${m}月${d}日`, content: "", icon: "calendar", "icon-color": "#FF9800" });
});
