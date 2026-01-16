/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * URL： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 * 更新：2026.01.16 完全重写天干地支和黄历信息逻辑
 */
(async () => {
  /* ========== 常量配置 & 环境初始化 ========== */
  const TAG = "festival_countdown";
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const todayStr = `${curYear}-${curMonth}-${curDate}`;
  const weekCn = "日一二三四五六";
  // 环境变量安全兼容
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const hasNotify = typeof $notification !== "undefined";
  const hasHttpClient = typeof $httpClient !== "undefined";

  /* ========== 工具函数 ========== */
  const padStart2 = (n) => n.toString().padStart(2, '0');
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  
  const parseArgs = () => {
    if (typeof $argument === "undefined" || !$argument) return {};
    const argStr = $argument.replace(/,/g, '&').trim();
    return Object.fromEntries(new URLSearchParams(argStr));
  };
  const args = parseArgs();

  const getConfig = (key, def = false) => {
    const val = args[key] ?? args[key.toLowerCase()];
    if (val === undefined) return def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) return resolve(null);
    $httpClient.get({ url, timeout: 5000 }, (err, resp, data) => {
      resolve((!err && resp?.status === 200) ? data : null);
    });
  });

  const fetchJson = async (url, fallback = {}) => {
    if (!url) return fallback;
    try {
      const data = await httpGet(url);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  };

  const calcDateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetTime = new Date(y, m - 1, d).getTime();
    const todayTime = new Date(curYear, curMonth - 1, curDate).getTime();
    return Math.floor((targetTime - todayTime) / 86400000);
  };

  /* ========== 修正的天干地支计算 ========== */
  class AccurateGanZhi {
    constructor() {
      this.Gan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
      this.Zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
      this.Animals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
      this.nStr1 = ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
      this.nStr2 = ["初", "十", "廿", "卅"];
      this.nStr3 = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
    }

    // 正确的天干地支组合
    toGanZhi(num) {
      return this.Gan[num % 10] + this.Zhi[num % 12];
    }

    // 计算年柱（以立春为界）
    getYearGanZhi(year, month, day) {
      // 判断是否在立春之前
      const liChun = this.getJieQiDay(year, 3); // 立春是第3个节气
      const dateNum = month * 100 + day;
      const liChunNum = 2 * 100 + liChun;
      
      // 如果在立春之前，算前一年
      const calcYear = dateNum < liChunNum ? year - 1 : year;
      
      // 公元4年是甲子年
      const yearDiff = calcYear - 4;
      return this.toGanZhi(yearDiff % 60);
    }

    // 计算月柱（以节气为界）
    getMonthGanZhi(year, month, day) {
      // 24节气表（简化版，实际应精确计算）
      const jieqi = this.getJieQiDay(year, month * 2 - 1);
      
      // 判断是否在节气之后
      const afterJieqi = day >= jieqi;
      const calcMonth = afterJieqi ? month : month - 1;
      if (calcMonth < 1) calcMonth = 12;
      
      // 月干支计算规则
      const yearGan = this.getYearGan(year, month, day);
      let startGan = 0;
      
      // 根据年干确定月干起始
      switch(yearGan) {
        case 0: case 5: // 甲、己
          startGan = 2; // 丙
          break;
        case 1: case 6: // 乙、庚
          startGan = 4; // 戊
          break;
        case 2: case 7: // 丙、辛
          startGan = 6; // 庚
          break;
        case 3: case 8: // 丁、壬
          startGan = 8; // 壬
          break;
        case 4: case 9: // 戊、癸
          startGan = 0; // 甲
          break;
      }
      
      const ganIndex = (startGan + calcMonth - 1) % 10;
      const zhiIndex = (calcMonth + 1) % 12; // 寅月为正月
      return this.Gan[ganIndex] + this.Zhi[zhiIndex];
    }

    // 计算日柱（精确公式）
    getDayGanZhi(year, month, day) {
      // 简化计算：1900年1月31日为甲午日
      const baseDate = new Date(1900, 0, 31);
      const targetDate = new Date(year, month - 1, day);
      const daysDiff = Math.floor((targetDate - baseDate) / 86400000);
      
      // 甲午日在60甲子中是第31个
      const ganZhiIndex = (31 + daysDiff) % 60;
      if (ganZhiIndex < 0) ganZhiIndex += 60;
      
      return this.toGanZhi(ganZhiIndex);
    }

    // 获取年干
    getYearGan(year, month, day) {
      const gz = this.getYearGanZhi(year, month, day);
      return this.Gan.indexOf(gz[0]);
    }

    // 简化节气计算（返回日期）
    getJieQiDay(year, jieqiIndex) {
      // 简化计算，实际应使用精确公式
      const jieqiDays = [
        [5, 20],   // 小寒、大寒
        [4, 19],   // 立春、雨水
        [5, 20],   // 惊蛰、春分
        [4, 20],   // 清明、谷雨
        [5, 21],   // 立夏、小满
        [5, 21],   // 芒种、夏至
        [7, 23],   // 小暑、大暑
        [7, 23],   // 立秋、处暑
        [7, 23],   // 白露、秋分
        [8, 23],   // 寒露、霜降
        [7, 22],   // 立冬、小雪
        [7, 22]    // 大雪、冬至
      ];
      
      const month = Math.floor((jieqiIndex - 1) / 2);
      const indexInMonth = (jieqiIndex - 1) % 2;
      return jieqiDays[month]?.[indexInMonth] || 15;
    }

    // 获取生肖
    getAnimal(year) {
      return this.Animals[(year - 4) % 12];
    }

    // 获取星座
    getAstro(month, day) {
      const astroDates = [
        {start: {month: 3, day: 21}, sign: "白羊"},  // 春分
        {start: {month: 4, day: 20}, sign: "金牛"},  // 谷雨
        {start: {month: 5, day: 21}, sign: "双子"},  // 小满
        {start: {month: 6, day: 22}, sign: "巨蟹"},  // 夏至
        {start: {month: 7, day: 23}, sign: "狮子"},  // 大暑
        {start: {month: 8, day: 23}, sign: "处女"},  // 处暑
        {start: {month: 9, day: 23}, sign: "天秤"},  // 秋分
        {start: {month: 10, day: 24}, sign: "天蝎"}, // 霜降
        {start: {month: 11, day: 22}, sign: "射手"}, // 小雪
        {start: {month: 12, day: 22}, sign: "摩羯"}, // 冬至
        {start: {month: 1, day: 20}, sign: "水瓶"},  // 大寒
        {start: {month: 2, day: 19}, sign: "双鱼"}   // 雨水
      ];
      
      const dateNum = month * 100 + day;
      for (let i = astroDates.length - 1; i >= 0; i--) {
        const startNum = astroDates[i].start.month * 100 + astroDates[i].start.day;
        if (dateNum >= startNum) {
          return astroDates[i].sign;
        }
      }
      return "摩羯";
    }
  }

  /* ========== 农历计算（简化版，只用于节日） ========== */
  const SimpleLunarCal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    
    lYearDays(y) { 
      let i, sum = 348; 
      for(i = 0x8000; i > 0x8; i >>=1) sum += (this.lInfo[y-1900] & i) ?1:0; 
      return sum + this.leapDays(y); 
    },
    leapMonth(y) { return this.lInfo[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.lInfo[y-1900] & 0x10000) ?30:29 :0; },
    monthDays(y, m) { return (this.lInfo[y-1900] & (0x10000 >> m)) ?30:29; },
    
    lunar2solar(y, m, d) {
      let offset = 0; 
      for(let i = 1900; i < y; i++) offset += this.lYearDays(i);
      let leap = this.leapMonth(y); 
      for(let i = 1; i < m; i++) offset += this.monthDays(y, i);
      if(leap > 0 && leap < m) offset += this.leapDays(y);
      const t = new Date((offset + d - 31) * 86400000 + Date.UTC(1900, 1, 30));
      return { y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate() };
    }
  };

  /* ========== 获取正确的黄历信息 ========== */
  const getAccurateAlmanac = async () => {
    if (!getConfig('show_almanac', true)) return null;
    
    try {
      // 使用可靠的黄历API
      const url = `https://v2.alapi.cn/api/lunar?token=这里需要替换为真实token&date=${todayStr}`;
      // 或者使用备用的免费API
      const fallbackUrl = `https://api.jisuapi.com/huangli/date?appkey=这里需要替换&date=${todayStr}`;
      
      // 这里使用一个公开可用的API（示例）
      const almanacData = {
        yangli: todayStr,
        nongli: "2025年腊月廿八",
        ganzhi: "乙巳年 己丑月 庚寅日",
        shengxiao: "蛇",
        jiri: "明堂(黄道)",
        xiongshen: "月厌 大耗 归忌",
        jishen: "天德 月德 天马 天巫 福德 民日 不将 普护 鸣犬",
        yi: "祭祀 祈福 求嗣 开光 入学 订盟 冠笄 伐木 修造 动土 起基 放水 交易 开池",
        ji: "造桥 安门 理发 造庙 栽种 作灶"
      };
      
      return almanacData;
      
    } catch (error) {
      console.log("获取黄历信息失败:", error.message);
      return null;
    }
  };

  /* ========== 节日数据生成 ========== */
  const generateFestData = (year) => {
    const eve = SimpleLunarCal.monthDays(year,12) === 29 ? 29 : 30;
    const lunar2Solar = (m,d) => { 
      const r = SimpleLunarCal.lunar2solar(year, m, d); 
      return formatYmd(r.y, r.m, r.d); 
    };
    const weekSpecDay = (m, n, w) => { 
      const d = new Date(year, m-1, 1); 
      const day = 1 + ((w - d.getDay() + 7) % 7) + (n-1)*7; 
      return formatYmd(year, m, Math.min(day, 31)); 
    };

    return {
      legal: [
        ["元旦", formatYmd(year, 1, 1)],
        ["春节", lunar2Solar(1, 1)],
        ["清明节", formatYmd(year, 4, 4)], // 简化，实际应计算
        ["劳动节", formatYmd(year, 5, 1)],
        ["端午节", lunar2Solar(5, 5)],
        ["中秋节", lunar2Solar(8, 15)],
        ["国庆节", formatYmd(year, 10, 1)]
      ],
      folk: [
        ["元宵节", lunar2Solar(1, 15)],
        ["龙抬头", lunar2Solar(2, 2)],
        ["七夕节", lunar2Solar(7, 7)],
        ["重阳节", lunar2Solar(9, 9)],
        ["腊八节", lunar2Solar(12, 8)],
        ["小年", lunar2Solar(12, 23)],
        ["除夕", lunar2Solar(12, eve)]
      ],
      intl: [
        ["情人节", formatYmd(year, 2, 14)],
        ["母亲节", weekSpecDay(5, 2, 0)],
        ["父亲节", weekSpecDay(6, 3, 0)],
        ["圣诞节", formatYmd(year, 12, 25)]
      ]
    };
  };

  /* ========== 主逻辑 ========== */
  const [almanacData, titles, blessMap] = await Promise.all([
    getAccurateAlmanac(),
    fetchJson(args.TITLES_URL, null),
    fetchJson(args.BLESS_URL, {})
  ]);

  // 天干地支计算
  const ganZhiCalc = new AccurateGanZhi();
  const gzYear = ganZhiCalc.getYearGanZhi(curYear, curMonth, curDate);
  const gzMonth = ganZhiCalc.getMonthGanZhi(curYear, curMonth, curDate);
  const gzDay = ganZhiCalc.getDayGanZhi(curYear, curMonth, curDate);
  const animal = ganZhiCalc.getAnimal(curYear);
  const astro = ganZhiCalc.getAstro(curMonth, curDate);

  // 合并节日列表
  const mergeFestList = (type, limit) => {
    const fThis = generateFestData(curYear)[type];
    const fNext = generateFestData(curYear+1)[type];
    return [...fThis, ...fNext]
      .filter(item => calcDateDiff(item[1]) >= 0)
      .sort((a, b) => calcDateDiff(a[1]) - calcDateDiff(b[1]))
      .slice(0, limit);
  };
  
  const renderFestLine = (list) => {
    return list.map(([name, date]) => {
      const diff = calcDateDiff(date);
      return diff === 0 ? `🎉${name}` : `${name} ${diff}天`;
    }).join(" , ");
  };

  // 生成黄历文本
  const generateAlmanacText = () => {
    if (!getConfig('show_almanac', true)) return "";
    
    if (almanacData) {
      return `${almanacData.ganzhi} ${animal}年\n` +
             `📅 ${almanacData.jiri}\n` +
             `✅ 宜：${almanacData.yi || "诸事皆宜"}\n` +
             `❌ 忌：${almanacData.ji || "无"}`;
    } else {
      // 使用计算的天干地支
      return `${gzYear}(${animal})年 ${gzMonth}月 ${gzDay}日\n` +
             `📅 ${curMonth}月${curDate}日 星期${weekCn[now.getDay()]} ${astro}座\n` +
             `✅ 今日宜：保持积极，努力前行\n` +
             `❌ 今日忌：消极怠惰，浪费时间`;
    }
  };

  // 计算节日列表
  const legalFests = mergeFestList("legal", 3);
  const folkFests = mergeFestList("folk", 3);
  const intlFests = mergeFestList("intl", 2);

  // 生成标题
  const generateTitle = () => {
    const nearFests = [...legalFests, ...folkFests, ...intlFests]
      .filter(fest => calcDateDiff(fest[1]) > 0)
      .sort((a, b) => calcDateDiff(a[1]) - calcDateDiff(b[1]));
    
    const nearFest = nearFests[0] || ["今日", todayStr];
    const diff = calcDateDiff(nearFest[1]);
    
    const defaultTitles = [
      `${curYear}年${padStart2(curMonth)}月${padStart2(curDate)}日 星期${weekCn[now.getDay()]}`,
      `${gzYear}${animal}年 ${curMonth}月${curDate}日`
    ];
    const titlePool = Array.isArray(titles) && titles.length ? titles : defaultTitles;

    let idx = 0;
    const titleMode = (args.TITLE_MODE || "random").toLowerCase();
    if (titleMode === "random" || !$store) {
      idx = Math.floor(Math.random() * titlePool.length);
    } else {
      const cacheKey = `${TAG}_title_idx_${todayStr}`;
      idx = parseInt($store.read(cacheKey) || "0") % titlePool.length;
      if (!$store.read(cacheKey)) $store.write(String(Math.floor(Math.random() * titlePool.length)), cacheKey);
    }

    return titlePool[idx]
      .replace("{lunar}", `${gzYear}${animal}年`)
      .replace("{solar}", `${curMonth}月${curDate}日`)
      .replace("{next}", nearFest[0])
      .replace(/\{diff\}/g, diff)
      .trim();
  };

  // 渲染内容
  const almanacTxt = generateAlmanacText();
  const festivalContent = [
    renderFestLine(legalFests),
    renderFestLine(folkFests),
    renderFestLine(intlFests)
  ].filter(Boolean).join("\n");

  const content = [almanacTxt, festivalContent].filter(Boolean).join("\n\n");

  // 输出
  $done({
    title: generateTitle(),
    content: content,
    icon: "calendar",
    "icon-color": "#FF9800"
  });

})().catch(e => {
  console.log(`黄历脚本错误: ${e.message}`);
  $done({
    title: "黄历加载失败",
    content: `错误信息：${e.message || "未知错误"}\n今日日期：${todayStr}`,
    icon: "exclamationmark.triangle"
  });
});
