/**
 * 节日倒数（集成黄历详情）
 * 第1行：最近3个【法定节假日】
 * 第2行：最近3个【二十四节气】
 * 第3行：最近3个【传统民俗（非法定）】
 * 第4行：最近3个【国际/洋节】
 * 正日 06:00 后单次祝词通知（法定+民俗）
 * 新增：顶部显示黄历详情（干支纪法+宜忌）
 *
 * 参数：
 *  - TITLES_URL: 标题库外链(JSON数组)
 *  - BLESS_URL : 祝词库外链(JSON对象)
 *  - SHOW_ALMANAC: 是否显示黄历详情(true/false)
 *  - GAP_LINES: 节日行之间空行数(0-3)
 *
 * 作者：ByteValley&IBL3ND | 版本：2025-11-20整合版
 */

(async () => {
  /* ========== 基础工具函数 ========== */
  const tnow = new Date();
  const todayStr = (d => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`)(tnow);
  const currentYear = tnow.getFullYear();
  const nextYear = currentYear + 1;

  // 日期差计算
  const dateDiff = (d1, d2) => {
    try {
      const a = new Date(d1.replace(/-/g, '/'));
      const b = new Date(d2.replace(/-/g, '/'));
      return Math.floor((b - a) / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  };

  // 格式化日期
  const fmtYMD = (y, m, d) => `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

  // HTTP请求工具
  const httpGet = (url, timeout = 5000) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);
      $httpClient.get(url, (err, resp, body) => {
        clearTimeout(timer);
        if (err) resolve(null);
        else resolve(body);
      });
    });
  };

  /* ========== 黄历详情相关（从2.yaml整合） ========== */
  const ALMANAC_BASE = "https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/";
  const GH_PROXY = "https://mirror.ghproxy.com/";

  const fetchAlmanacDetail = async (nowDate, lunarBase) => {
    const y = nowDate.getFullYear();
    const m = nowDate.getMonth() + 1;
    const d = nowDate.getDate();
    const mm = m < 10 ? "0" + m : String(m);

    const path = `${y}/${y}${mm}.json`;
    const pathEnc = encodeURIComponent(path);

    // 基础信息回退
    let header = `干支纪法：${lunarBase.gzYear}年 ${lunarBase.gzMonth}月 ${lunarBase.gzDay}日`;
    const tags = [];
    if (lunarBase.lunarFestival) tags.push(lunarBase.lunarFestival);
    if (lunarBase.festival) tags.push(lunarBase.festival);
    if (lunarBase.Term) tags.push(lunarBase.Term);
    if (tags.length) header += " " + tags.join(" ");

    let ji = "——";
    let yi = "——";

    try {
      // 地区判断（是否使用代理）
      let apiUrl = ALMANAC_BASE + pathEnc;
      const ipData = await httpGet("http://ip-api.com/json/", 3000);
      if (ipData) {
        const ipJson = JSON.parse(ipData);
        if (ipJson && ipJson.country === "China") {
          apiUrl = GH_PROXY + ALMANAC_BASE + pathEnc;
        }
      }

      // 获取黄历数据
      const data = await httpGet(apiUrl, 5000);
      if (data) {
        const almanac = JSON.parse(data);
        const key = `${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const item = almanac[key];
        if (item) {
          header = `干支纪法：${item.gzYear}年 ${item.gzMonth}月 ${item.gzDate}日`;
          yi = item.suit || yi;
          ji = item.avoid || ji;
        }
      }
    } catch (e) {
      console.log(`获取黄历失败: ${e.message}`);
    }

    return `${header}\n✅ 宜：${yi}\n❎ 忌：${ji}`;
  };

  /* ========== 农历转换工具 ========== */
  const calendar = {
    // ...（保留原1.yaml中的calendar实现）
    nStr1:["日","一","二","三","四","五","六","七","八","九","十"],
    nStr2:["初","十","廿","卅"],
    nStr3:["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    solarMonth: [31,28,31,30,31,30,31,31,30,31,30,31],
    Gan: ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"],
    Zhi: ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],
    Animals: ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"],
    festival:{'1-1':{title:'元旦节'},'2-14':{title:'情人节'},'5-1':{title:'劳动节'},'6-1':{title:'儿童节'},'9-10':{title:'教师节'},'10-1':{title:'国庆节'},'12-25':{title:'圣诞节'},'3-8':{title:'妇女节'},'3-12':{title:'植树节'},'4-1':{title:'愚人节'},'5-12':{title:'护士节'},'7-1':{title:'建党节'},'8-1':{title:'建军节'},'12-24':{title:'平安夜'}},
    lFestival:{'12-30':{title:'除夕'},'1-1':{title:'春节'},'1-15':{title:'元宵节'},'2-2':{title:'龙抬头'},'5-5':{title:'端午节'},'7-7':{title:'七夕节'},'7-15':{title:'中元节'},'8-15':{title:'中秋节'},'9-9':{title:'重阳节'},'10-1':{title:'寒衣节'},'10-15':{title:'下元节'},'12-8':{title:'腊八节'},'12-23':{title:'北方小年'},'12-24':{title:'南方小年'}},
    solarTerm:["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    
    lYearDays: function(y) {
      let i, sum = 348;
      for(i = 0x8000; i > 0x8; i >>= 1) {
        sum += ((this.lunarInfo[y-1900] & i) ? 1 : 0);
      }
      return (sum + this.leapDays(y));
    },
    
    leapMonth: function(y) {
      return (this.lunarInfo[y-1900] & 0xf);
    },
    
    leapDays: function(y) {
      if(this.leapMonth(y)) {
        return ((this.lunarInfo[y-1900] & 0x10000) ? 30 : 29);
      }
      return 0;
    },
    
    monthDays: function(y, m) {
      if(m > 12 || m < 1) { return -1; }
      return ((this.lunarInfo[y-1900] & (0x10000 >> m)) ? 30 : 29);
    },
    
    solarDays: function(y, m) {
      if(m > 12 || m < 1) { return -1; }
      const ms = m - 1;
      if(ms === 1) {
        return (((y%4 === 0) && (y%100 !== 0) || (y%400 === 0)) ? 29 : 28);
      } else {
        return (this.solarMonth[ms]);
      }
    },
    
    GanZhi: function(o) {
      return this.Gan[o%10] + this.Zhi[o%12];
    },
    
    toGanZhiYear: function(y) {
      let g = (y-3)%10, z = (y-3)%12;
      if(g === 0) g = 10;
      if(z === 0) z = 12;
      return this.Gan[g-1] + this.Zhi[z-1];
    },

    getTerm: function(y, n) {
      if(y < 1900 || y > 2100 || n < 1 || n > 24) { return -1; }
      const t = this.sTermInfo[y-1900];
      const d = [];
      for(let i=0; i<t.length; i+=5) {
        const chunk = parseInt('0x' + t.substr(i,5)).toString();
        d.push(chunk[0], chunk.substr(1,2), chunk[3], chunk.substr(4,2));
      }
      return parseInt(d[n-1]);
    },
    
    toChinaMonth: function(m) {
      if(m > 12 || m < 1) { return -1; }
      return this.nStr3[m-1] + "月";
    },
    
    toChinaDay: function(d) {
      let s;
      switch(d) {
        case 10: s = "初十"; break;
        case 20: s = "二十"; break;
        case 30: s = "三十"; break;
        default: s = this.nStr2[Math.floor(d/10)] + this.nStr1[d%10];
      }
      return s;
    },
    
    getAnimal: function(y) {
      return this.Animals[(y-4)%12];
    },
    
    toAstro: function(m, d) {
      const s = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
      const arr = [20,19,21,21,21,22,23,23,23,23,22,22];
      return s.substr(m*2 - (d < arr[m-1] ? 2 : 0), 2) + "座";
    },
    
    solar2lunar: function(Y, M, D) {
      try {
        let y = parseInt(Y), m = parseInt(M), d = parseInt(D);
        if(y < 1900 || y > 2100) return { date: `${Y}-${M}-${D}`, error: '年份超出范围' };
        // ...（保留原实现）
      } catch (e) {
        console.log(`阳历转阴历失败: ${e.message}`);
        return { date: `${Y}-${M}-${D}`, error: e.message };
      }
    },
    
    lunar2solar: function(y, m, d, isLeap) {
      try {
        // ...（保留原实现）
      } catch (e) {
        console.log(`阴历转阳历失败: ${e.message}`);
        return { date: `${y}-${m}-${d}`, error: e.message };
      }
    }
  };

  /* ========== 今日农历/阳历信息 ========== */
  const lunarNow = calendar.solar2lunar(tnow.getFullYear(), tnow.getMonth()+1, tnow.getDate());
  const titleSolar = `${lunarNow.cMonth || tnow.getMonth()+1}月${lunarNow.cDay || tnow.getDate()}日（${lunarNow.astro || '未知星座'}）`;
  const titleLunar = lunarNow.error 
    ? `${tnow.getFullYear()}年${tnow.getMonth()+1}月${tnow.getDate()}日`
    : `${lunarNow.IMonthCn}${lunarNow.IDayCn} • ${lunarNow.gzYear}年${lunarNow.gzMonth}${lunarNow.gzDay} • ${lunarNow.Animal}年`;

  /* ========== 日期工具函数 ========== */
  // ...（保留原1.yaml中的日期工具函数）

  /* ========== 节日列表生成 ========== */
  // ...（保留原1.yaml中的节日列表生成逻辑）

  /* ========== 参数解析（整合2.yaml的参数处理） ========== */
  const parseArgs = (defaults = {}) => {
    const args = {};
    try {
      const raw = $argument || "";
      raw.split('&').forEach(pair => {
        const [k, v] = pair.split('=').map(decodeURIComponent);
        if (k) args[k] = v;
      });
    } catch (e) {
      console.log(`参数解析失败: ${e.message}`);
    }
    return { ...defaults, ...args };
  };

  const ARG_DEFAULTS = {
    TITLES_URL: "",
    BLESS_URL: "",
    SHOW_ALMANAC: "true",
    GAP_LINES: "1"
  };
  const args = parseArgs(ARG_DEFAULTS);

  // 黄历显示控制
  const showAlmanac = args.SHOW_ALMANAC !== "false";
  // 行间距控制
  let gapLinesVal = parseInt(args.GAP_LINES || "1", 10);
  gapLinesVal = Math.min(Math.max(gapLinesVal, 0), 3);
  const gapBetween = "\n".repeat(gapLinesVal + 1);

  /* ========== 外链标题/祝词库 ========== */
  // ...（保留原1.yaml中的标题和祝词库逻辑）

  /* ========== 节日提醒 ========== */
  // ...（保留原1.yaml中的节日提醒逻辑）

  /* ========== 面板内容渲染 ========== */
  const render3 = (a0, a1, a2, d0, d1, d2) => {
    const formatDay = (day) => day === 0 ? '' : `${day}天`;
    return d0 === 0
      ? `今天：${a0[0]} | ${a1[0]}${formatDay(d1)} | ${a2[0]}${formatDay(d2)}`
      : `${a0[0]}${formatDay(d0)} | ${a1[0]}${formatDay(d1)} | ${a2[0]}${formatDay(d2)}`;
  };

  const lineLegal = render3(L3[0], L3[1], L3[2], dL0, dL1, dL2);
  const lineTerm  = render3(T3[0], T3[1], T3[2], dT0, dT1, dT2);
  const lineFolk = render3(F3[0], F3[1], F3[2], dF0, dF1, dF2);
  const lineIntl = render3(I3[0], I3[1], I3[2], dI0, dI1, dI2);

  // 整合黄历内容
  const almanacDetail = showAlmanac ? await fetchAlmanacDetail(tnow, lunarNow) : null;
  const blockFest = [lineLegal, lineTerm, lineFolk, lineIntl].join(gapBetween);
  const content = almanacDetail ? `${almanacDetail}\n\n${blockFest}` : blockFest;

  /* ========== 输出结果 ========== */
  $done({
    title: generateTitle(),
    content: content,
    icon: "calendar",
    "icon-color": "#FF9800"
  });
})().catch(e => {
  console.log(`执行失败: ${e.message}`);
  $done({
    title: "节日倒数",
    content: "脚本执行异常",
    icon: "calendar"
  });
});
