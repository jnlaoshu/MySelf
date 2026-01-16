/*
 * 今日黄历&节假日倒数（V11.0 全局扫描修复版）
 * ✅ 修复核心：不再猜测 data.days，而是遍历整个 JSON 寻找包含黄历特征的数组
 * ✅ 兼容修复：支持 "以日期为Key" 的非数组结构 (Map-like Object)
 * ✅ 匹配增强：日期匹配增加 yyyyMMdd 纯数字格式兼容
 */
(async () => {
  // ========== 1. 环境与时间 ==========
  const getBjDate = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 8));
  };

  const now = getBjDate();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  
  const padStart2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  
  const todayDayStr = padStart2(curDate);
  const monthStr = padStart2(curMonth);
  // 准备多种日期格式用于匹配
  const matchers = {
    fullDate: `${curYear}-${monthStr}-${todayDayStr}`, // 2026-01-16
    shortDate: `${curYear}-${curMonth}-${curDate}`,    // 2026-1-16
    numberDate: parseInt(`${curYear}${monthStr}${todayDayStr}`), // 20260116
    dayNum: curDate // 16
  };

  const hasHttpClient = typeof $httpClient !== "undefined";
  const log = (msg) => console.log(`[黄历] ${msg}`);
  const festDataCache = new Map();

  // ========== 2. 网络请求 (双路径探测) ==========
  const BASE_URL = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new`;

  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) return resolve({ error: "无网络环境" });
    const options = {
      url: url,
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" }
    };
    $httpClient.get(options, (err, resp, data) => {
      if (err) return resolve({ error: "请求失败" });
      if (resp.status !== 200) return resolve({ error: `HTTP ${resp.status}`, status: resp.status });
      resolve({ data, status: 200 });
    });
  });

  const fetchDeepData = async () => {
    // 路径A: 年份/月份.json
    const pathA = `${BASE_URL}/${curYear}/${curYear}${monthStr}.json`;
    let res = await httpGet(pathA);

    // 路径B: 月份.json (备用)
    if (res.status === 404) {
      log(`⚠️ 路径A (/${curYear}/...) 404，切换路径B...`);
      res = await httpGet(`${BASE_URL}/${curYear}${monthStr}.json`);
    }

    if (res.error || !res.data) return { error: res.error || "无数据返回" };
    try {
      return { json: JSON.parse(res.data) };
    } catch (e) {
      return { error: "JSON解析异常" };
    }
  };

  // ========== 3. 智能数据提取 (Omni-Finder) ==========
  const findValidList = (obj) => {
    if (!obj) return [];
    
    // 1. 如果本身就是数组
    if (Array.isArray(obj)) return obj;

    // 2. 常见字段探测
    if (Array.isArray(obj.days)) return obj.days;
    if (obj.data && Array.isArray(obj.data.days)) return obj.data.days;
    if (obj.data && Array.isArray(obj.data)) return obj.data;

    // 3. 暴力扫描：寻找任何看起来像数据的数组
    for (let key in obj) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0) {
        // 检查数组特征：包含日期相关字段
        const sample = val[0];
        if (sample && (sample.day || sample.date || sample.yi || sample.suit || sample.year)) {
          log(`✅ 自动发现数据数组，字段名: [${key}]`);
          return val;
        }
      }
    }

    // 4. 对象转数组 (应对 {"2026-01-01": {...}} 结构)
    const possibleList = Object.values(obj).filter(item => typeof item === 'object');
    if (possibleList.length >= 28) { // 如果对象数量像是一个月的天数
       log(`✅ 检测到对象Map结构，已转换为数组`);
       return possibleList;
    }

    return [];
  };

  // ========== 4. 宜忌获取 (逻辑主入口) ==========
  const getLunarDesc = async () => {
    const result = await fetchDeepData();
    if (result.error) return `⚠️ ${result.error}`;

    const rawJson = result.json;
    
    // 🔥 使用全能提取器寻找数据
    const list = findValidList(rawJson);

    if (list.length === 0) {
      log(`❌ 数据源解析为空。顶级Keys: ${Object.keys(rawJson).join(", ")}`);
      return "⚠️ 解析失败: 未找到有效数据数组";
    }

    // 🔍 匹配今日数据
    let target = list.find(item => {
      // 字符串日期匹配
      if (item.date === matchers.fullDate) return true;
      if (item.date === matchers.shortDate) return true;
      // 数字日期匹配
      if (item.date && parseInt(item.date) === matchers.numberDate) return true;
      // Day 匹配
      if (item.day !== undefined && parseInt(item.day) === matchers.dayNum) return true;
      return false;
    });

    // 索引兜底
    if (!target && list[curDate - 1]) {
      log("⚠️ 使用索引兜底匹配");
      target = list[curDate - 1];
    }

    if (!target) {
      log(`❌ 无法匹配日期 ${matchers.fullDate}。列表长度: ${list.length}`);
      return "📭 暂无今日宜忌";
    }

    // 打印成功抓到的数据，方便调试
    // log(`✅ 匹配成功: ${JSON.stringify(target)}`);

    const getV = (...keys) => {
      for (const k of keys) if (target[k]) return target[k];
      return "";
    };

    const yi = getV("yi", "Yi", "suit", "y", "Ys");
    const ji = getV("ji", "Ji", "avoid", "j", "Js");
    const chong = getV("chongsha", "ChongSha", "chong");
    const baiji = getV("baiji", "BaiJi");

    return [
      chong, 
      baiji, 
      yi ? `✅ 宜：${yi.replace(/[.。,，]+$/, "")}` : "", 
      ji ? `❎ 忌：${ji.replace(/[.。,，]+$/, "")}` : ""
    ].filter(Boolean).join("\n");
  };

  // ========== 5. 农历与节日算法 (保持不变) ==========
  const LunarCal = Object.freeze({
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥", Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    monthDays(y, m) { return (this.lInfo[y-1900] & (0x10000 >> m)) ?30:29; },
    leapMonth(y) { return this.lInfo[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.lInfo[y-1900] & 0x10000) ?30:29 :0; },
    lYearDays(y) { let i, sum = 348; for(i = 0x8000; i > 0x8; i >>=1) sum += (this.lInfo[y-1900] & i) ?1:0; return sum + this.leapDays(y); },
    solarDays(y, m) { return m===2 ? ((y%4===0&&y%100!==0||y%400===0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; },
    getTerm(y, n) { 
      const t=this.sTermInfo[y-1900]||'',d=[];if(t&&t.length>0){for(let i=0;i<t.length;i+=5){const c=parseInt('0x'+t.substr(i,5)).toString();d.push(c[0],c.substr(1,2),c[3],c.substr(4,2))}}return parseInt(d[n-1]) || 0; 
    },
    toChinaDay(d) { if(d===10)return"初十";if(d===20)return"二十";if(d===30)return"三十";return this.nStr2[Math.floor(d/10)] + this.nStr1[d%10]; },
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
      const lMonth = i, lDay = offset +1;
      const termId = this.getTerm(y, m*2-1) === d ? m*2-2 : (this.getTerm(y, m*2) === d ? m*2-1 : null);
      const astro = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".slice(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0), m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0) + 2) + "座";
      return { 
        animal: this.Animals[(year-4)%12], 
        monthCn: (isLeap ? "闰" : "") + this.nStr3[lMonth-1] + "月", 
        dayCn: this.toChinaDay(lDay), 
        gzYear: this.toGanZhi(year-4), 
        term: termId !== null ? this.terms[termId] : null, 
        astro 
      };
    },
    lunar2solar(y, m, d) {
      let offset =0; for(let i=1900;i<y;i++) offset += this.lYearDays(i);
      let leap = this.leapMonth(y); for(let i=1;i<m;i++) offset += this.monthDays(y,i);
      if(leap>0 && leap<m) offset += this.leapDays(y);
      const t = new Date((offset + d -31)*86400000 + Date.UTC(1900,1,30));
      return { y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate() };
    }
  });

  // ========== 6. 节日列表处理 (完整版) ==========
  const calcDateDiff = (dateStr) => {
    if (!dateStr) return -999;
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor((new Date(y, m - 1, d) - new Date(curYear, curMonth - 1, curDate)) / 86400000);
  };

  const generateFestData = (year) => {
    if (festDataCache.has(year)) return festDataCache.get(year);
    const eve = LunarCal.monthDays(year,12) ===29 ?29:30;
    const l2s = (m,d)=>{ try { const r = LunarCal.lunar2solar(year,m,d); return formatYmd(r.y,r.m,r.d); } catch (e) { return ""; } };
    const weekSpecDay = (m,n,w)=>{
      try {
        const d=new Date(year,m-1,1);
        const day=1+((w-d.getDay()+7)%7)+(n-1)*7;
        return formatYmd(year,m,Math.min(day, LunarCal.solarDays(year, m)));
      } catch (e) { return ""; }
    };
    const qmDay = LunarCal.getTerm(year,7);
    
    const festData = {
      legal: [["元旦",formatYmd(year,1,1)],["寒假",formatYmd(year,1,31)],["春节",l2s(1,1)],["开学",formatYmd(year,3,2)],["清明节",formatYmd(year,4,qmDay)],["春假",formatYmd(year,4,qmDay+1)],["劳动节",formatYmd(year,5,1)],["端午节",l2s(5,5)],["高考",formatYmd(year,6,7)],["暑假",formatYmd(year,7,4)],["中秋节",l2s(8,15)],["国庆节",formatYmd(year,10,1)],["秋假",weekSpecDay(11,2,3)]].filter(item => item[1]),
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["南方小年",l2s(12,24)],["除夕",l2s(12,eve)]].filter(item => item[1]),
      intl: [["情人节",formatYmd(year,2,14)],["母亲节",weekSpecDay(5,2,0)],["父亲节",weekSpecDay(6,3,0)],["万圣节",formatYmd(year,10,31)],["平安夜",formatYmd(year,12,24)],["圣诞节",formatYmd(year,12,25)],["感恩节",weekSpecDay(11,4,4)]].filter(item => item[1]),
      term: Array.from({length:24},(_,i)=>{
        const m=Math.floor(i/2)+1,id=i+1;
        const day = LunarCal.getTerm(year,id);
        const date = day ? formatYmd(year,m,day) : "";
        return [LunarCal.terms[i], date];
      }).filter(item => item[1])
    };
    festDataCache.set(year, festData);
    return festData;
  };

  const mergeFestList = (type, limit) => {
    const fThis = generateFestData(curYear)[type];
    const fNext = generateFestData(curYear+1)[type];
    return [...fThis, ...fNext]
      .filter(item => calcDateDiff(item[1]) >= -1)
      .slice(0, limit)
      .map(([name, date]) => {
        const diff = calcDateDiff(date);
        return diff === 0 ? `🎉${name}` : `${name} ${diff}天`;
      }).join(" , ");
  };

  // ========== 7. 主逻辑执行 ==========
  try {
    const lunarNow = LunarCal.solar2lunar(curYear, curMonth, curDate);
    const lunarHeader = `${lunarNow.gzYear}(${lunarNow.animal})年 ${lunarNow.monthCn}${lunarNow.dayCn} ${lunarNow.term || ''}`.trim();
    
    // 获取宜忌 (如果报错，UI会直接显示原因)
    const almanacTxt = await getLunarDesc();
    
    const legalFests = mergeFestList("legal", 3);
    const termFests = mergeFestList("term", 4);
    const folkFests = mergeFestList("folk", 3);
    const intlFests = mergeFestList("intl", 3);

    const finalTitle = `${curYear}年${monthStr}月${todayDayStr}日 星期${weekCn[now.getDay()]} ${lunarNow.astro}`;
    const finalContent = [
      lunarHeader,
      almanacTxt,
      [legalFests, termFests, folkFests, intlFests].filter(Boolean).join("\n") 
    ].filter(Boolean).join("\n\n");

    $done({ title: finalTitle, content: finalContent, icon: "calendar", "icon-color": "#d00000" });
  } catch (e) {
    log(`脚本崩溃: ${e.message}`);
    $done({ title: "脚本错误", content: e.message });
  }
})();
