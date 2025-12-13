/**
 * 节日倒数（4行：法定 | 节气 | 民俗 | 国际）· 可外链标题/祝词库
 * 第1行：最近3个【法定节假日】：元旦/春节/清明/劳动/端午/中秋/国庆+成都义教段特定日期
 * 第2行：最近3个【二十四节气】
 * 第3行：最近3个【传统民俗（非法定）】：除夕/元宵/龙抬头/七夕/中元/重阳/寒衣/下元/腊八/小年(南/北)…
 * 第4行：最近3个【国际/洋节】：情人节/母亲节/父亲节/万圣节/平安夜/圣诞节/感恩节(美) 等
 * 正日 06:00 后单次祝词通知（仅“节日类”，即法定+民俗；不对节气与国际）
 *
 * 参数（通过模块 argument 传入）：
 *  - TITLES_URL: 标题库外链(JSON数组)，支持占位符 {lunar} {solar} {next}
 *  - BLESS_URL : 祝词库外链(JSON对象，键为节日名，值为文案)
 *
 * 外链 JSON 示例：
 *   TITLES_URL（数组示例）:
 *     ["摸鱼使我快乐～","{lunar}","{solar}","下一站：{next}"]
 *   BLESS_URL（对象示例）:
 *     {"春节":"愿新岁顺遂无虞，家人皆安！","中秋节":"人月两团圆，心上皆明朗。","腊八节":"粥香暖岁末。"}
 * 更新：2025.12.13 22:00
  */

class FestivalCountdown {
  constructor() {
    this.tnow = new Date();
    this.currentYear = this.tnow.getFullYear();
    this.nextYear = this.currentYear + 1;
    this.todayStr = this.formatDate(this.tnow);
    
    this.args = this.parseArgs();
    this.calendar = new LunarCalendar();
  }

  /* ========== 基础工具函数 ========== */
  formatDate(date) {
    const d = date || this.tnow;
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  parseArgs() {
    try {
      if (!$argument) return {};
      const sp = new URLSearchParams($argument);
      return Object.fromEntries(sp.entries());
    } catch (e) {
      console.log(`解析参数失败: ${e.message}`);
      return {};
    }
  }

  async httpGet(url) {
    return new Promise((resolve) => {
      $httpClient.get({ url, timeout: 8000 }, (err, resp, data) => {
        if (err || !resp || resp.status !== 200) {
          console.log(`请求失败: ${url} | 错误: ${err?.message || '状态码异常'}`);
          return resolve(null);
        }
        resolve(data);
      });
    });
  }

  async fetchJson(url, fallback) {
    if (!url) return fallback;
    const raw = await this.httpGet(url);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.log(`JSON解析失败: ${url} | 错误: ${e.message}`);
      return fallback;
    }
  }

  /* ========== 日期计算函数 ========== */
  dateDiff(start, end) {
    try {
      const [sY, sM, sD] = start.split("-").map(Number);
      const [eY, eM, eD] = end.split("-").map(Number);
      const sd = new Date(sY, sM - 1, sD);
      const ed = new Date(eY, eM - 1, eD);
      return Math.floor((ed - sd) / 86400000);
    } catch (e) {
      return Infinity;
    }
  }

  fmtYMD(y, m, d) {
    return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
  }

  nthWeekdayOfMonth(year, month, weekday, n) {
    try {
      const first = new Date(year, month - 1, 1);
      const firstW = first.getDay();
      const add = ((weekday - firstW + 7) % 7) + (n - 1) * 7;
      const targetDay = 1 + add;
      const maxDay = this.calendar.solarDays(year, month);
      return this.fmtYMD(year, month, Math.min(targetDay, maxDay));
    } catch (e) {
      console.log(`计算周序日期失败: ${e.message}`);
      return this.fmtYMD(year, month, 1);
    }
  }

  /* ========== 节日数据生成 ========== */
getLegalFestivals(year) {
  // 获取清明节日期
  const qingmingDate = new Date(this.fmtYMD(year, 4, this.calendar.getTerm(year, 7) || 5));
  // 清明节后第一天（成都春假）
  const nextDay = new Date(qingmingDate);
  nextDay.setDate(qingmingDate.getDate() + 1);
  const springHoliday = this.fmtYMD(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate());
  
  // 11月第2个周三（成都秋假）
  const autumnHoliday = this.nthWeekdayOfMonth(year, 11, 3, 2); // 3表示周三，2表示第2个

  const festivals = [
    ["元旦", this.fmtYMD(year, 1, 1)],
    ["寒假", this.fmtYMD(year, 1, 31)],    // 2026年寒假
    ["春节", this.calendar.lunar2solar(year, 1, 1).date || this.fmtYMD(year, 1, 1)],
    ["开学", this.fmtYMD(year, 3, 2)],    // 2026年春季学期开学
    ["清明节", this.fmtYMD(year, 4, this.calendar.getTerm(year, 7) || 5)],
    ["春假", springHoliday], 
    ["劳动节", this.fmtYMD(year, 5, 1)],
    ["端午节", this.calendar.lunar2solar(year, 5, 5).date || this.fmtYMD(year, 5, 5)],
    ["暑假", this.fmtYMD(year, 7, 4)],    // 2026年暑假
    ["中秋节", this.calendar.lunar2solar(year, 8, 15).date || this.fmtYMD(year, 8, 15)],
    ["国庆节", this.fmtYMD(year, 10, 1)], 
    ["秋假", autumnHoliday]
  ];
  return festivals.sort((a, b) => new Date(a[1]) - new Date(b[1]));
}
 
  getFolkFestivals(year) {
    const lunarNewYearEveSolar = (year) => {
      try {
        const days12 = this.calendar.monthDays(year, 12);
        const lday = days12 === 29 ? 29 : 30;
        const result = this.calendar.lunar2solar(year, 12, lday);
        return result.date || this.fmtYMD(year, 12, 30);
      } catch (e) {
        return this.fmtYMD(year, 12, 30);
      }
    };

    const festivals = [
      ["除夕", lunarNewYearEveSolar(year)],
      ["元宵节", this.calendar.lunar2solar(year, 1, 15).date || this.fmtYMD(year, 1, 15)],
      ["龙抬头", this.calendar.lunar2solar(year, 2, 2).date || this.fmtYMD(year, 2, 2)],
      ["七夕节", this.calendar.lunar2solar(year, 7, 7).date || this.fmtYMD(year, 7, 7)],
      ["中元节", this.calendar.lunar2solar(year, 7, 15).date || this.fmtYMD(year, 7, 15)],
      ["重阳节", this.calendar.lunar2solar(year, 9, 9).date || this.fmtYMD(year, 9, 9)],
      ["寒衣节", this.calendar.lunar2solar(year, 10, 1).date || this.fmtYMD(year, 10, 1)],
      ["下元节", this.calendar.lunar2solar(year, 10, 15).date || this.fmtYMD(year, 10, 15)],
      ["腊八节", this.calendar.lunar2solar(year, 12, 8).date || this.fmtYMD(year, 12, 8)],
      ["小年(北)", this.calendar.lunar2solar(year, 12, 23).date || this.fmtYMD(year, 12, 23)],
      ["小年(南)", this.calendar.lunar2solar(year, 12, 24).date || this.fmtYMD(year, 12, 24)]
    ];
    return festivals.sort((a, b) => new Date(a[1]) - new Date(b[1]));
  }

  getInternationalFestivals(year) {
    const festivals = [
      ["情人节", this.fmtYMD(year, 2, 14)],
      ["母亲节", this.nthWeekdayOfMonth(year, 5, 0, 2)],   // 5月第2个周日
      ["父亲节", this.nthWeekdayOfMonth(year, 6, 0, 3)],   // 6月第3个周日
      ["万圣节", this.fmtYMD(year, 10, 31)],
      ["平安夜", this.fmtYMD(year, 12, 24)],
      ["圣诞节", this.fmtYMD(year, 12, 25)],
      ["感恩节(美)", this.nthWeekdayOfMonth(year, 11, 4, 4)] // 11月第4个周四
    ];
    return festivals.sort((a, b) => new Date(a[1]) - new Date(b[1]));
  }
  /* ========== 核心逻辑 ========== */
  getNextThree(items) {
    try {
      const futureItems = items.filter(([_, date]) => this.dateDiff(this.todayStr, date) >= 0);
      const result = futureItems.slice(0, 3);
      
      if (result.length < 3) {
        result.push(...items.slice(0, 3 - result.length));
      }
      
      return result.map(item => item || ['未知', this.todayStr]).slice(0, 3);
    } catch (e) {
      console.log(`获取最近节日失败: ${e.message}`);
      return Array(3).fill(['未知', this.todayStr]);
    }
  }

  renderLine(items, diffs) {
    const formatDay = (day) => day === 0 ? '' : `${day}天`;
    
    if (diffs[0] === 0) {
      return `今天：${items[0][0]} | ${items[1][0]}${formatDay(diffs[1])} | ${items[2][0]}${formatDay(diffs[2])}`;
    }
    
    return `${items[0][0]}${formatDay(diffs[0])} | ${items[1][0]}${formatDay(diffs[1])} | ${items[2][0]}${formatDay(diffs[2])}`;
  }

  async getTitlesAndBlessings() {
    const defaultTitles = [
      "距离放假，还要摸鱼多少天",
      "{lunar}",
      "{solar}",
      "{next}"
    ];
    
    const defaultBless = {
      "元旦": "新岁启封，诸事顺心。",
      "春节": "春风送暖入屠苏，万象更新福满门。",
      "清明节": "风细雨潇潇，慎终追远寄哀思。",
      "劳动节": "双手创造幸福，汗水亦有光。",
      "端午节": "粽叶飘香龙舟竞，平安康健万事顺。",
      "中秋节": "人月两团圆，心上皆明朗。",
      "国庆节": "山河锦绣，家国同庆。",
      "元宵节": "花灯人月圆，团圆共此时。",
      "龙抬头": "万象抬头，诸事向阳。",
      "中元节": "念亲祈安，心怀敬畏。",
      "重阳节": "登高望远，敬老祈安。",
      "寒衣节": "一纸寒衣，一份牵念。",
      "下元节": "三官赐福，平安顺心。",
      "腊八节": "腊八粥香，岁杪添暖。",
      "小年(北)": "尘旧一扫，迎新纳福。",
      "小年(南)": "净灶迎福，诸事顺遂。",
      "除夕": "爆竹一声除旧岁，欢喜团圆迎新春。"
    };
    
    const [titlesArr, blessMap] = await Promise.all([
      this.fetchJson(this.args.TITLES_URL, defaultTitles),
      this.fetchJson(this.args.BLESS_URL, defaultBless)
    ]);
    
    return { titlesArr, blessMap };
  }

  pickTitle(nextName, daysToNext, lunarInfo, solarInfo) {
    try {
      if (daysToNext === 0) return `今天是 ${nextName || '节日'}，enjoy`;
      
      const { titlesArr } = this;
      const pool = Array.isArray(titlesArr) && titlesArr.length ? titlesArr : this.defaultTitles;
      const raw = String(pool[Math.floor(Math.random() * pool.length)] || "");
      
      return raw
        .replaceAll("{lunar}", lunarInfo)
        .replaceAll("{solar}", solarInfo)
        .replaceAll("{next}", nextName ? `下一个：${nextName}` : "");
    } catch (e) {
      console.log(`生成标题失败: ${e.message}`);
      return `距离${nextName || '放假'}还有${daysToNext || '若干'}天`;
    }
  }

  notifyIfToday(name, date, blessMap) {
    try {
      if (!name || !date) return;
      
      const diff = this.dateDiff(this.todayStr, date);
      if (diff === 0 && this.tnow.getHours() >= 6) {
        const key = `timecardpushed_${date}`;
        if ($persistentStore?.read(key) !== "1") {
          $persistentStore?.write("1", key);
          const words = blessMap[name] || "节日快乐！";
          $notification?.post(`🎉今天是 ${date} ${name}`, "", words);
        }
      }
    } catch (e) {
      console.log(`节日提醒失败: ${e.message}`);
    }
  }

  /* ========== 主执行函数 ========== */
  async run() {
    try {
      // 获取农历信息
      const lunarNow = this.calendar.solar2lunar(
        this.tnow.getFullYear(),
        this.tnow.getMonth() + 1,
        this.tnow.getDate()
      );
      
      const titleSolar = `${lunarNow.cMonth || this.tnow.getMonth() + 1}月${lunarNow.cDay || this.tnow.getDate()}日（${lunarNow.astro || '未知星座'}）`;
      const titleLunar = lunarNow.error 
        ? `${this.tnow.getFullYear()}年${this.tnow.getMonth() + 1}月${this.tnow.getDate()}日`
        : `${lunarNow.IMonthCn}${lunarNow.IDayCn} • ${lunarNow.gzYear}年${lunarNow.gzMonth}${lunarNow.gzDay} • ${lunarNow.Animal}年`;

      // 生成节日数据
      const terms = [...this.getSolarTerms(this.currentYear), ...this.getSolarTerms(this.nextYear)];
      const legal = [...this.getLegalFestivals(this.currentYear), ...this.getLegalFestivals(this.nextYear)];
      const folk = [...this.getFolkFestivals(this.currentYear), ...this.getFolkFestivals(this.nextYear)];
      const intl = [...this.getInternationalFestivals(this.currentYear), ...this.getInternationalFestivals(this.nextYear)];

      // 获取最近三个节日
      const T3 = this.getNextThree(terms);
      const L3 = this.getNextThree(legal);
      const F3 = this.getNextThree(folk);
      const I3 = this.getNextThree(intl);

      // 计算天数差
      const calcDiff = (date) => Math.max(0, this.dateDiff(this.todayStr, date));
      const dT = T3.map(item => calcDiff(item[1]));
      const dL = L3.map(item => calcDiff(item[1]));
      const dF = F3.map(item => calcDiff(item[1]));
      const dI = I3.map(item => calcDiff(item[1]));

      // 获取外链数据
      const { titlesArr, blessMap } = await this.getTitlesAndBlessings();
      this.titlesArr = titlesArr;
      this.blessMap = blessMap;

      // 节日提醒
      this.notifyIfToday(L3[0][0], L3[0][1], blessMap);
      this.notifyIfToday(F3[0][0], F3[0][1], blessMap);

      // 找到最近的节日
      const candidates = [
        { item: L3[0], diff: dL[0] },
        { item: F3[0], diff: dF[0] },
        { item: I3[0], diff: dI[0] }
      ];
      const nearest = candidates.reduce((prev, curr) => 
        curr.diff < prev.diff ? curr : prev
      );

      // 生成标题
      const title = this.pickTitle(nearest.item[0], nearest.diff, titleLunar, titleSolar);

      // 生成内容
      const lines = [
        this.renderLine(L3, dL),
        this.renderLine(T3, dT),
        this.renderLine(F3, dF),
        this.renderLine(I3, dI)
      ];

      $done({
        title,
        icon: "calendar",
        "icon-color": "#FF9800",
        content: lines.join("\n")
      });

    } catch (error) {
      console.error(`程序执行错误: ${error.message}`);
      $done({
        title: "节日倒数出错",
        icon: "exclamationmark.triangle",
        "icon-color": "#FF3B30",
        content: `错误信息：${error.message}`
      });
    }
  }
}

// 执行
new FestivalCountdown().run();
