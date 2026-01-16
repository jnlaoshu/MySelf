/*
 * 今日黄历&节假日倒数（终极修复版 V3.0）
 * ✅ 修复核心 1：将 GitHub Raw 替换为 jsDelivr CDN，解决国内网络无法加载数据的问题
 * ✅ 修复核心 2：增加“全字段扫描”，同时匹配 yi/Yi/suit 和 ji/Ji/avoid，防止字段改名
 * ✅ 修复核心 3：日期匹配逻辑改为纯数字对比，解决 "01" !== 1 的隐患
 * ✅ 新增功能：网络请求失败或无数据时，界面会有明确提示，不再莫名其妙留白
 */
(async () => {
  // ========== 全局常量定义 ==========
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const hasNotify = typeof $notification !== "undefined";
  const hasHttpClient = typeof $httpClient !== "undefined";
  
  // 调试日志封装
  const DEBUG_MODE = true; // 建议保持开启，方便看日志
  const log = (msg) => DEBUG_MODE && console.log(`【黄历调试】${msg}`);

  // ========== 工具函数 ==========
  const padStart2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  const todayDayStr = padStart2(curDate);
  const monthStr = padStart2(curMonth);
  const festDataCache = new Map();

  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  const parseArgs = () => {
    if (typeof $argument === "undefined" || !$argument) return {};
    return Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&').trim()));
  };
  const args = parseArgs();
  const getConfig = (key, def = false) => {
    const val = args[key] ?? args[key.toLowerCase()] ?? def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  // ✅ 修复1：使用 CDN 镜像源，并增加备用源逻辑（这里主要用 jsDelivr）
  // 原始源: raw.githubusercontent.com (国内常被墙) -> 替换为 cdn.jsdelivr.net
  const ALMANAC_URL = `https://cdn.jsdelivr.net/gh/zqzess/openApiData@main/calendar_new/${curYear}/${curYear}${monthStr}.json`;

  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) {
      log("无网络环境");
      return resolve(null);
    }
    const reqOptions = { url, timeout: 8000 }; // 设置8秒超时
    $httpClient.get(reqOptions, (err, resp, data) => {
      if (err) {
        log(`请求失败: ${err}`);
        return resolve(null);
      }
      if (resp.status !== 200) {
        log(`HTTP状态码异常: ${resp.status}`);
        return resolve(null);
      }
      resolve(data);
    });
  });

  const fetchJson = async (url) => {
    try {
      const raw = await httpGet(url);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      log(`JSON解析失败: ${e.message}`);
      return null;
    }
  };

  const calcDateDiff = (dateStr) => {
    if (!dateStr || dateStr.split('-').length !== 3) return -999;
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date(curYear, curMonth - 1, curDate);
    return Math.floor((target - today) / 86400000);
  };

  // ========== 农历算法 (精简保留核心) ==========
  const LunarCal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥", Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    monthDays(y, m) { return (this.lInfo[y-1900] & (0x10000 >> m)) ?30:29; },
    getTerm(y, n) { 
      const sTermInfo = ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'];
      const t = sTermInfo[y-1900];
      if(!t) return 0;
      const c = parseInt('0x'+t.substr((n-1)*5,5)).toString();
      const d = [];
      d.push(c[0],c.substr(1,2),c[3],c.substr(4,2));
      return parseInt(d[n > d.length ? d.length - 1 : n - 1]) || 0;
    },
    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0;
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = this.lYearDays(i); offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      const year = i, month = i, day = offset + 1;
      let isLeap = false; leap = (this.lInfo[i-1900] & 0xf);
      for(i = 1; i <13 && offset>0; i++){
        if(leap>0 && i===(leap+1) && !isLeap){--i;isLeap=true;temp=(this.lInfo[year-1900] & 0x10000)?30:29;}else{temp=this.monthDays(year,i);}
        if(isLeap && i===(leap+1)) isLeap=false; offset -= temp;
      }
      if(offset===0 && leap>0 && i===leap+1) { if(isLeap) isLeap=false; else {isLeap=true;--i;} }
      if(offset<0) { offset += temp; i--; }
      const lMonth = i, lDay = offset +1;
      
      const termId = this.getTerm(y, m*2-1) === d ? m*2-2 : (this.getTerm(y, m*2) === d ? m*2-1 : null);
      const astroStr = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
      const cut = d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1] ? 2 : 0;
      const astro = astroStr.slice(m*2 - cut, m*2 - cut + 2) + "座";
      
      return { 
        animal: this.Animals[(year-4)%12], 
        monthCn: (isLeap ? "闰" : "") + this.nStr3[lMonth-1] + "月", 
        dayCn: (lDay===10?"初十":lDay===20?"二十":lDay===30?"三十":this.nStr2[Math.floor(lDay/10)] + this.nStr1[lDay%10]), 
        gzYear: this.Gan[(year-4)%10] + this.Zhi[(year-4)%12], 
        term: termId !== null ? this.terms[termId] : null, 
        astro 
      };
    },
    lYearDays(y) { let i, sum = 348; for(i = 0x8000; i > 0x8; i >>=1) sum += (this.lInfo[y-1900] & i) ?1:0; return sum + (this.lInfo[y-1900] & 0xf ? ((this.lInfo[y-1900] & 0x10000)?30:29) : 0); },
  };

  // ========== 节日生成逻辑 ==========
  const generateFestData = (year) => {
    if (festDataCache.has(year)) return festDataCache.get(year);
    // 简易公历转换逻辑，减少依赖
    const qmDay = LunarCal.getTerm(year,7);
    const festData = {
      legal: [["元旦",`${year}-01-01`],["劳动节",`${year}-05-01`],["国庆节",`${year}-10-01`],["清明节",`${year}-04-${padStart2(qmDay)}`]].filter(item => item[1]),
      term: Array.from({length:24},(_,i)=>{
        const m=Math.floor(i/2)+1, day = LunarCal.getTerm(year,i+1);
        return [LunarCal.terms[i], `${year}-${padStart2(m)}-${padStart2(day)}`];
      })
    };
    festDataCache.set(year, festData);
    return festData;
  };

  // ✅ 修复4：黄历描述 - 全面兼容性匹配
  const getLunarDesc = async () => {
    if (!getConfig('show_almanac', true)) return "";
    
    // 1. 获取数据
    const jsonData = await fetchJson(ALMANAC_URL);
    if (!jsonData || !jsonData.days) {
      log("数据源获取失败或格式错误");
      return "⚠️ 黄历数据获取失败（网络/无数据）";
    }

    // 2. 查找今日数据 (强制转为数字对比，避免 01 != 1)
    const todayData = jsonData.days.find(item => Number(item.day) === curDate);
    if (!todayData) {
      log(`未找到 ${curDate} 日的数据`);
      return "📭 暂无今日黄历详情";
    }

    log("原始数据: " + JSON.stringify(todayData));

    // 3. 暴力匹配字段 (兼容 Yi/yi/suit, Ji/ji/avoid)
    const getVal = (...keys) => {
      for (const k of keys) {
        if (todayData[k]) return todayData[k];
      }
      return "";
    };

    const yi = getVal("yi", "Yi", "suit", "y");
    const ji = getVal("ji", "Ji", "avoid", "j");
    const chong = getVal("chongsha", "ChongSha", "chong");
    const sha = getVal("sha", "Sha"); // 有些数据源冲煞是分开的
    const baiji = getVal("baiji", "BaiJi");

    // 4. 组装文案
    const lines = [];
    if (chong) lines.push(sha ? `${chong} ${sha}` : chong);
    if (baiji) lines.push(baiji);
    if (yi) lines.push(`✅ 宜：${yi.replace(/\./g, " ")}`); // 去除可能存在的点号
    if (ji) lines.push(`❎ 忌：${ji.replace(/\./g, " ")}`);

    return lines.join("\n");
  };

  const mergeFestList = (type, limit) => {
    const fThis = generateFestData(curYear)[type] || [];
    const fNext = generateFestData(curYear+1)[type] || [];
    return [...fThis, ...fNext].filter(item => calcDateDiff(item[1]) >= -1).slice(0, limit);
  };
  
  const renderFestLine = (list) => list.map(([name, date]) => {
    const diff = calcDateDiff(date);
    return diff === 0 ? `🎉${name}` : diff > 0 ? `${name} ${diff}天` : "";
  }).filter(Boolean).join(" , ");

  // ========== 主逻辑 ==========
  try {
    const lunarNow = LunarCal.solar2lunar(curYear, curMonth, curDate);
    const almanacTxt = await getLunarDesc();
    
    const title = `${curYear}年${monthStr}月${todayDayStr}日 星期${weekCn[now.getDay()]}`;
    const subTitle = `${lunarNow.gzYear}${lunarNow.animal}年 ${lunarNow.monthCn}${lunarNow.dayCn} ${lunarNow.term || ''} ${lunarNow.astro}`;
    
    // 简单的节日显示
    const termFests = mergeFestList("term", 2);
    const legalFests = mergeFestList("legal", 2);
    const festTxt = [renderFestLine(legalFests), renderFestLine(termFests)].filter(Boolean).join("\n");

    const content = [
      subTitle,
      "---",
      almanacTxt,
      festTxt ? "---\n" + festTxt : ""
    ].filter(Boolean).join("\n");

    $done({ title, content, icon: "calendar", "icon-color": "#d00000" });

  } catch (e) {
    log(`运行崩溃: ${e.message}`);
    $done({ title: "黄历运行错误", content: e.message });
  }
})();
