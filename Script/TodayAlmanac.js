/*
 * 今日黄历&节假日倒数（V5.0 深度排查版）
 * 专为代理环境优化，修复字段匹配极其严格的问题
 * ✅ 修复：增加 User-Agent 头，防止 GitHub 拦截脚本请求
 * ✅ 修复：使用松散匹配 (==) 兼容 "16" 和 16
 * ✅ 修复：同时扫描 date 和 day 字段，防止数据源格式变更
 */
(async () => {
  // ========== 1. 环境与时间 ==========
  // 强制北京时间
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
  
  // 补零函数
  const padStart2 = (n) => (n < 10 ? `0${n}` : `${n}`);
  const todayDayStr = padStart2(curDate);
  const monthStr = padStart2(curMonth);
  const fullDateStr = `${curYear}-${monthStr}-${todayDayStr}`; // 2026-01-16

  const hasHttpClient = typeof $httpClient !== "undefined";
  
  // 调试日志
  const log = (msg) => console.log(`[黄历] ${msg}`);

  // ========== 2. 网络请求 (带UA伪装) ==========
  // 既然您有代理，我们优先用 GitHub Raw，保证数据是最新的
  const DATA_URL = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${curYear}/${curYear}${monthStr}.json`;

  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) return resolve(null);
    
    const options = {
      url: url,
      timeout: 10000,
      headers: {
        // 关键修复：模拟浏览器，防止被服务端当做机器人拦截
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
      }
    };

    $httpClient.get(options, (err, resp, data) => {
      if (err) {
        log(`请求失败: ${err}`);
        return resolve(null);
      }
      if (resp.status !== 200) {
        log(`HTTP状态码错误: ${resp.status}`);
        return resolve(null);
      }
      log(`数据获取成功，长度: ${data.length}`);
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

  // ========== 3. 核心：宜忌获取 (松散匹配) ==========
  const getLunarDesc = async () => {
    // 拉取数据
    const jsonData = await fetchJson(DATA_URL);
    
    if (!jsonData || !jsonData.days || !Array.isArray(jsonData.days)) {
      log("数据源格式错误或为空");
      return "⚠️ 无法获取今日黄历数据";
    }

    log(`正在匹配日期: ${fullDateStr} 或 day: ${curDate}`);

    // 🔍 暴力匹配逻辑
    const todayData = jsonData.days.find(item => {
      // 1. 尝试匹配完整日期 (YYYY-MM-DD)
      if (item.date && item.date === fullDateStr) return true;
      
      // 2. 尝试匹配 day 字段 (松散匹配，允许 "16" == 16)
      // 使用正则去除可能存在的首位0，确保 01 和 1 能匹配
      if (item.day) {
        const itemDayNum = parseInt(item.day, 10);
        if (itemDayNum === curDate) return true;
      }

      return false;
    });

    if (!todayData) {
      log("未在数据源中找到今天的数据");
      return "📭 数据源缺失今日详情";
    }

    // 提取字段 (兼容大小写)
    const getVal = (...keys) => {
      for (const k of keys) {
        if (todayData[k]) return todayData[k];
      }
      return "";
    };

    const yi = getVal("yi", "Yi", "suit", "y");
    const ji = getVal("ji", "Ji", "avoid", "j");
    const chong = getVal("chongsha", "ChongSha", "chong");
    const baiji = getVal("baiji", "BaiJi");

    const contentList = [
      chong,
      baiji,
      yi ? `✅ 宜：${yi.replace(/\.$/, "")}` : "", // 去除末尾句号
      ji ? `❎ 忌：${ji.replace(/\.$/, "")}` : ""
    ].filter(item => item && item.trim());
    
    return contentList.join("\n");
  };

  // ========== 4. 农历与节日算法 (保持原版) ==========
  const LunarCal = Object.freeze({
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo: ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722'],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥", Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1: "日一二三四五六七八九十", nStr2: ["初","十","廿","卅"], nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    monthDays(y, m) { return (this.lInfo[y-1900] & (0x10000 >> m)) ?30:29; },
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

  // ========== 5. 节日列表处理 (含倒数日) ==========
  const calcDateDiff = (dateStr) => {
    if (!dateStr) return -999;
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor((new Date(y, m - 1, d) - new Date(curYear, curMonth - 1, curDate)) / 86400000);
  };

  const getFests = (year) => {
    const l2s = (m, d) => { try { const r = LunarCal.lunar2solar(year, m, d); return formatYmd(r.y, r.m, r.d); } catch (e) { return ""; } };
    const qm = LunarCal.getTerm(year, 7);
    return [
      ["元旦", `${year}-01-01`], ["春节", l2s(1, 1)], ["元宵", l2s(1, 15)], ["清明", formatYmd(year, 4, qm)],
      ["劳动", `${year}-05-01`], ["端午", l2s(5, 5)], ["七夕", l2s(7, 7)], ["中元", l2s(7, 15)],
      ["中秋", l2s(8, 15)], ["国庆", `${year}-10-01`], ["重阳", l2s(9, 9)], ["腊八", l2s(12, 8)], ["除夕", l2s(12, LunarCal.monthDays(year, 12) === 29 ? 29 : 30)]
    ].filter(i => i[1]);
  };

  const mergeFestList = () => {
    const list = [...getFests(curYear), ...getFests(curYear + 1)];
    return list.map(([n, d]) => {
      const diff = calcDateDiff(d);
      return diff === 0 ? `🎉${n}` : (diff > 0 && diff <= 365 ? `${n} ${diff}天` : null);
    }).filter(Boolean).slice(0, 4).join(" , ");
  };

  // ========== 6. 主逻辑执行 ==========
  try {
    const lunarNow = LunarCal.solar2lunar(curYear, curMonth, curDate);
    const lunarHeader = `${lunarNow.gzYear}(${lunarNow.animal})年 ${lunarNow.monthCn}${lunarNow.dayCn} ${lunarNow.term || ''}`.trim();
    
    // 获取宜忌
    const almanacTxt = await getLunarDesc();
    
    // 获取节日
    const festTxt = mergeFestList();

    const finalTitle = `${curYear}年${monthStr}月${todayDayStr}日 星期${weekCn[now.getDay()]} ${lunarNow.astro}`;
    const finalContent = [
      lunarHeader,
      almanacTxt,
      festTxt
    ].filter(Boolean).join("\n\n"); // 增加间距美观

    $done({ title: finalTitle, content: finalContent, icon: "calendar", "icon-color": "#d00000" });
  } catch (e) {
    log(`脚本崩溃: ${e.message}`);
    $done({ title: "脚本错误", content: e.message });
  }
})();
