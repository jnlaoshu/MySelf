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
 * 更新：2025.12.13 22:50
 */

(async () => {
  // ========================== 常量定义 ==========================
  const DEFAULT_TITLES = [
    "距离放假，还要摸鱼多少天",
    "{lunar}",
    "{solar}",
    "{next}"
  ];

  const DEFAULT_BLESS = {
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

  const DATE_FORMAT = {
    YEAR: new Date().getFullYear(),
    NEXT_YEAR: new Date().getFullYear() + 1,
    TODAY: new Date(),
    TODAY_STR: new Date().toISOString().split('T')[0] // 优化：使用ISO标准格式，避免手动拼接
  };

  // ========================== 工具函数模块 ==========================
  const Utils = {
    /**
     * 计算两个日期之间的天数差（格式：YYYY-MM-DD）
     * @param {string} start - 开始日期
     * @param {string} end - 结束日期
     * @returns {number} 天数差
     */
    dateDiff(start, end) {
      try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        // 优化：使用时间戳直接计算，避免手动拆分年月日
        const diffMs = endDate.getTime() - startDate.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      } catch (e) {
        console.error(`日期计算失败：${e.message}`);
        return 0;
      }
    },

    /**
     * 格式化年月日为 YYYY-MM-DD
     * @param {number} year - 年
     * @param {number} month - 月
     * @param {number} day - 日
     * @returns {string} 格式化后的日期
     */
    fmtYMD(year, month, day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    /**
     * 解析传入的参数（URLSearchParams格式）
     * @returns {Object} 解析后的参数对象
     */
    parseArgs() {
      try {
        if (!$argument) return {};
        const params = new URLSearchParams($argument);
        return Object.fromEntries(params.entries());
      } catch (e) {
        console.error(`参数解析失败：${e.message}`);
        return {};
      }
    },

    /**
     * HTTP GET请求封装
     * @param {string} url - 请求地址
     * @returns {Promise<string|null>} 响应数据
     */
    async httpGet(url) {
      return new Promise((resolve) => {
        $httpClient.get({ url, timeout: 8000 }, (err, resp, data) => {
          if (err || !resp || resp.status !== 200) {
            console.error(`请求失败：${url} | 错误：${err?.message || '状态码异常'}`);
            return resolve(null);
          }
          resolve(data);
        });
      });
    },

    /**
     * 获取JSON数据（带默认值）
     * @param {string} url - 请求地址
     * @param {any} fallback - 默认值
     * @returns {Promise<any>} 解析后的JSON数据
     */
    async fetchJson(url, fallback) {
      if (!url) return fallback;
      const rawData = await this.httpGet(url);
      if (!rawData) return fallback;
      try {
        return JSON.parse(rawData);
      } catch (e) {
        console.error(`JSON解析失败：${url} | 错误：${e.message}`);
        return fallback;
      }
    },

    /**
     * 获取某月第n个星期X的日期
     * @param {number} year - 年
     * @param {number} month - 月（1-12）
     * @param {number} weekday - 星期（0=周日，6=周六）
     * @param {number} n - 第n个
     * @returns {string} 格式化后的日期
     */
    nthWeekdayOfMonth(year, month, weekday, n) {
      try {
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        // 计算第一个目标星期的日期
        const delta = (weekday - firstWeekday + 7) % 7;
        let targetDay = 1 + delta + (n - 1) * 7;
        // 校验是否超出当月天数
        const maxDay = new Date(year, month, 0).getDate(); // 优化：获取当月最后一天
        targetDay = Math.min(targetDay, maxDay);
        return this.fmtYMD(year, month, targetDay);
      } catch (e) {
        console.error(`周序日期计算失败：${e.message}`);
        return this.fmtYMD(year, month, 1);
      }
    },

    /**
     * 格式化天数显示（0天显示为空，否则显示“X天”）
     * @param {number} day - 天数
     * @returns {string} 格式化后的字符串
     */
    formatDayText(day) {
      return day === 0 ? '' : `${day}天`;
    }
  };

  // ========================== 农历/节气算法模块 ==========================
  const LunarCalendar = {
    lunarInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    solarMonth: [31,28,31,30,31,30,31,31,30,31,30,31],
    Gan: ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"],
    Zhi: ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],
    Animals: ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"],
    festival:{'1-1':{title:'元旦节'},'2-14':{title:'情人节'},'5-1':{title:'劳动节'},'6-1':{title:'儿童节'},'9-10':{title:'教师节'},'10-1':{title:'国庆节'},'12-25':{title:'圣诞节'},'3-8':{title:'妇女节'},'3-12':{title:'植树节'},'4-1':{title:'愚人节'},'5-12':{title:'护士节'},'7-1':{title:'建党节'},'8-1':{title:'建军节'},'12-24':{title:'平安夜'}},
    lFestival:{'12-30':{title:'除夕'},'1-1':{title:'春节'},'1-15':{title:'元宵节'},'2-2':{title:'龙抬头'},'5-5':{title:'端午节'},'7-7':{title:'七夕节'},'7-15':{title:'中元节'},'8-15':{title:'中秋节'},'9-9':{title:'重阳节'},'10-1':{title:'寒衣节'},'10-15':{title:'下元节'},'12-8':{title:'腊八节'},'12-23':{title:'北方小年'},'12-24':{title:'南方小年'}},
    solarTerm:["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    sTermInfo:['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b02d5','7f07e7f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'],
    nStr1:["日","一","二","三","四","五","六","七","八","九","十"],
    nStr2:["初","十","廿","卅"],
    nStr3:["正","二","三","四","五","六","七","八","九","十","冬","腊"],

    // 农历年总天数
    lYearDays(y) {
      let sum = 348;
      for (let i = 0x8000; i > 0x8; i >>= 1) {
        sum += (this.lunarInfo[y - 1900] & i) ? 1 : 0;
      }
      return sum + this.leapDays(y);
    },

    // 闰月
    leapMonth(y) {
      return this.lunarInfo[y - 1900] & 0xf;
    },

    // 闰月天数
    leapDays(y) {
      return this.leapMonth(y) ? (this.lunarInfo[y - 1900] & 0x10000 ? 30 : 29) : 0;
    },

    // 农历月天数
    monthDays(y, m) {
      if (m > 12 || m < 1) return -1;
      return (this.lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
    },

    // 公历年月天数
    solarDays(y, m) {
      if (m > 12 || m < 1) return -1;
      const ms = m - 1;
      return ms === 1 
        ? ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28) 
        : this.solarMonth[ms];
    },

    // 干支
    GanZhi(o) {
      return this.Gan[o % 10] + this.Zhi[o % 12];
    },

    // 年干支
    toGanZhiYear(y) {
      let g = (y - 3) % 10, z = (y - 3) % 12;
      if (g === 0) g = 10;
      if (z === 0) z = 12;
      return this.Gan[g - 1] + this.Zhi[z - 1];
    },

    // 获取节气日期
    getTerm(y, n) {
      if (y < 1900 || y > 2100 || n < 1 || n > 24) return -1;
      const t = this.sTermInfo[y - 1900];
      const d = [];
      for (let i = 0; i < t.length; i += 5) {
        const chunk = parseInt('0x' + t.substr(i, 5)).toString();
        d.push(chunk[0], chunk.substr(1, 2), chunk[3], chunk.substr(4, 2));
      }
      return parseInt(d[n - 1]);
    },

    // 农历月中文
    toChinaMonth(m) {
      if (m > 12 || m < 1) return -1;
      return this.nStr3[m - 1] + "月";
    },

    // 农历日中文
    toChinaDay(d) {
      switch (d) {
        case 10: return "初十";
        case 20: return "二十";
        case 30: return "三十";
        default: return this.nStr2[Math.floor(d / 10)] + this.nStr1[d % 10];
      }
    },

    // 生肖
    getAnimal(y) {
      return this.Animals[(y - 4) % 12];
    },

    // 星座
    toAstro: function(m, d) {
      const s = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
      const arr = [20,19,21,21,21,22,23,23,23,23,22,22];
      return s.substr(m*2 - (d < arr[m-1] ? 2 : 0), 2) + "座";
    },

    // 阳历转阴历
    solar2lunar(Y, M, D) {
      try {
        let y = parseInt(Y), m = parseInt(M), d = parseInt(D);
        if (y < 1900 || y > 2100) return { date: `${Y}-${M}-${D}`, error: '年份超出范围' };
        if (y === 1900 && m === 1 && d < 31) return { date: `${Y}-${M}-${D}`, error: '日期超出范围' };

        const obj = Y ? new Date(y, m - 1, d) : new Date();
        y = obj.getFullYear();
        m = obj.getMonth() + 1;
        d = obj.getDate();

        const offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
        let i, temp;
        for (i = 1900; i < 2101 && offset > 0; i++) {
          temp = this.lYearDays(i);
          offset -= temp;
        }
        if (offset < 0) {
          offset += temp;
          i--;
        }

        const isTodayObj = new Date();
        const isToday = (isTodayObj.getFullYear() === y && isTodayObj.getMonth() + 1 === m && isTodayObj.getDate() === d);
        const nWeek = obj.getDay(), cWeek = this.nStr1[nWeek];
        const weekNum = nWeek === 0 ? 7 : nWeek;

        const year = i;
        const leap = this.leapMonth(i);
        let isLeap = false;
        for (i = 1; i < 13 && offset > 0; i++) {
          if (leap > 0 && i === (leap + 1) && !isLeap) {
            --i;
            isLeap = true;
            temp = this.leapDays(year);
          } else {
            temp = this.monthDays(year, i);
          }
          if (isLeap && i === (leap + 1)) isLeap = false;
          offset -= temp;
        }

        if (offset === 0 && leap > 0 && i === leap + 1) {
          isLeap = !isLeap;
          if (isLeap) --i;
        }

        if (offset < 0) {
          offset += temp;
          --i;
        }

        const month = i;
        const day = offset + 1;
        const sm = m - 1;
        const gzY = this.toGanZhiYear(year);
        const firstNode = this.getTerm(y, (m * 2 - 1));
        const secondNode = this.getTerm(y, (m * 2));

        let gzM = this.GanZhi((y - 1900) * 12 + m + 11);
        if (d >= firstNode) gzM = this.GanZhi((y - 1900) * 12 + m + 12);

        let isTerm = false, Term = null;
        if (firstNode === d) {
          isTerm = true;
          Term = this.solarTerm[m * 2 - 2];
        }
        if (secondNode === d) {
          isTerm = true;
          Term = this.solarTerm[m * 2 - 1];
        }

        const dayCyc = Date.UTC(y, sm, 1) / 86400000 + 25567 + 10;
        const gzD = this.GanZhi(dayCyc + d - 1);
        const astro = this.toAstro(m, d);
        const solarDate = `${y}-${m}-${d}`;
        const lunarDate = `${year}-${month}-${day}`;
        const festKey = `${m}-${d}`;
        let lfestKey = `${month}-${day}`;

        // 处理腊月29为除夕的情况
        if (month === 12 && day === 29 && this.monthDays(year, month) === 29) {
          lfestKey = '12-30';
        }

        return {
          date: solarDate,
          lunarDate: lunarDate,
          festival: this.festival[festKey]?.title || null,
          lunarFestival: this.lFestival[lfestKey]?.title || null,
          lYear: year,
          lMonth: month,
          lDay: day,
          Animal: this.getAnimal(year),
          IMonthCn: (isLeap ? "闰" : '') + this.toChinaMonth(month),
          IDayCn: this.toChinaDay(day),
          cYear: y,
          cMonth: m,
          cDay: d,
          gzYear: gzY,
          gzMonth: gzM,
          gzDay: gzD,
          isToday: isToday,
          isLeap: isLeap,
          nWeek: weekNum,
          ncWeek: `星期${cWeek}`,
          isTerm: isTerm,
          Term: Term,
          astro: astro
        };
      } catch (e) {
        console.error(`阳历转阴历失败：${e.message}`);
        return { date: `${Y}-${M}-${D}`, error: e.message };
      }
    },

    // 阴历转阳历
    lunar2solar(y, m, d, isLeap) {
      try {
        y = parseInt(y);
        m = parseInt(m);
        d = parseInt(d);
        isLeap = !!isLeap;

        const leapMonth = this.leapMonth(y);
        if (isLeap && leapMonth !== m) return { date: `${y}-${m}-${d}`, error: '闰月不匹配' };

        const day = this.monthDays(y, m);
        const _day = isLeap ? this.leapDays(y, m) : day;

        if ((y === 2100 && m === 12 && d > 1) || (y === 1900 && m === 1 && d < 31)) {
          return { date: `${y}-${m}-${d}`, error: '日期超出范围' };
        }
        if (y < 1900 || y > 2100 || d > _day) {
          return { date: `${y}-${m}-${d}`, error: '日期无效' };
        }

        let offset = 0;
        for (let i = 1900; i < y; i++) {
          offset += this.lYearDays(i);
        }

        let leap = 0, isAdd = false;
        for (let i = 1; i < m; i++) {
          leap = this.leapMonth(y);
          if (!isAdd && leap <= i && leap > 0) {
            offset += this.leapDays(y);
            isAdd = true;
          }
          offset += this.monthDays(y, i);
        }

        if (isLeap) {
          offset += day;
        }

        const strap = Date.UTC(1900, 1, 30, 0, 0, 0);
        const cal = new Date((offset + d - 31) * 86400000 + strap);
        const cY = cal.getUTCFullYear(), cM = cal.getUTCMonth() + 1, cD = cal.getUTCDate();

        return this.solar2lunar(cY, cM, cD);
      } catch (e) {
        console.error(`阴历转阳历失败：${e.message}`);
        return { date: `${y}-${m}-${d}`, error: e.message };
      }
    },

    // 获取农历除夕的阳历日期
    getLunarNewYearEveSolar(year) {
      try {
        const days12 = this.monthDays(year, 12);
        const lday = days12 === 29 ? 29 : 30;
        const result = this.lunar2solar(year, 12, lday);
        return result.date || Utils.fmtYMD(year, 12, 30);
      } catch (e) {
        console.error(`除夕日期计算失败：${e.message}`);
        return Utils.fmtYMD(year, 12, 30);
      }
    }
  };

  // ========================== 节日处理模块 ==========================
  const FestivalHandler = {
    /**
     * 获取节气列表
     * @param {number} year - 年份
     * @returns {Array<[string, string]>} 节气列表 [名称, 日期]
     */
    getSolarTerms(year) {
      const terms = [];
      for (let i = 1; i <= 24; i++) {
        // 优化：简化月份计算逻辑
        const month = Math.ceil(i / 2) || 1;
        const day = LunarCalendar.getTerm(year, i);
        if (day > 0) {
          terms.push([LunarCalendar.solarTerm[i - 1], Utils.fmtYMD(year, month, day)]);
        }
      }
      return terms.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    },

    /**
     * 获取法定节假日列表
     * @param {number} year - 年份
     * @returns {Array<[string, string]>} 法定节假日列表 [名称, 日期]
     */
    getLegalFestivals(year) {
      return [
        ["元旦", Utils.fmtYMD(year, 1, 1)],
        ["寒假", Utils.fmtYMD(year, 1, 31)], // 2026年寒假（成都义教段）
        ["春节", LunarCalendar.lunar2solar(year, 1, 1).date || Utils.fmtYMD(year, 1, 1)],
        ["开学", Utils.fmtYMD(year, 3, 2)], // 2026年春季开学（成都义教段）
        ["清明节", Utils.fmtYMD(year, 4, LunarCalendar.getTerm(year, 7) || 5)],
        ["春假", Utils.fmtYMD(year, 4, 7)], // 清明节后第1天（成都春假）
        ["劳动节", Utils.fmtYMD(year, 5, 1)],
        ["端午节", LunarCalendar.lunar2solar(year, 5, 5).date || Utils.fmtYMD(year, 5, 5)],
        ["暑假", Utils.fmtYMD(year, 7, 4)], // 2026年暑假（成都义教段）
        ["中秋节", LunarCalendar.lunar2solar(year, 8, 15).date || Utils.fmtYMD(year, 8, 15)],
        ["国庆节", Utils.fmtYMD(year, 10, 1)],
        ["秋假", Utils.nthWeekdayOfMonth(year, 11, 3, 2)] // 11月第2个周三（成都秋假）
      ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    },

    /**
     * 获取民俗节日列表
     * @param {number} year - 年份
     * @returns {Array<[string, string]>} 民俗节日列表 [名称, 日期]
     */
    getFolkFestivals(year) {
      return [
        ["除夕", LunarCalendar.getLunarNewYearEveSolar(year)],
        ["元宵节", LunarCalendar.lunar2solar(year, 1, 15).date || Utils.fmtYMD(year, 1, 15)],
        ["龙抬头", LunarCalendar.lunar2solar(year, 2, 2).date || Utils.fmtYMD(year, 2, 2)],
        ["七夕节", LunarCalendar.lunar2solar(year, 7, 7).date || Utils.fmtYMD(year, 7, 7)],
        ["中元节", LunarCalendar.lunar2solar(year, 7, 15).date || Utils.fmtYMD(year, 7, 15)],
        ["重阳节", LunarCalendar.lunar2solar(year, 9, 9).date || Utils.fmtYMD(year, 9, 9)],
        ["寒衣节", LunarCalendar.lunar2solar(year, 10, 1).date || Utils.fmtYMD(year, 10, 1)],
        ["下元节", LunarCalendar.lunar2solar(year, 10, 15).date || Utils.fmtYMD(year, 10, 15)],
        ["腊八节", LunarCalendar.lunar2solar(year, 12, 8).date || Utils.fmtYMD(year, 12, 8)],
        ["小年(北)", LunarCalendar.lunar2solar(year, 12, 23).date || Utils.fmtYMD(year, 12, 23)],
        ["小年(南)", LunarCalendar.lunar2solar(year, 12, 24).date || Utils.fmtYMD(year, 12, 24)]
      ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    },

    /**
     * 获取国际节日列表
     * @param {number} year - 年份
     * @returns {Array<[string, string]>} 国际节日列表 [名称, 日期]
     */
    getInternationalFestivals(year) {
      return [
        ["情人节", Utils.fmtYMD(year, 2, 14)],
        ["母亲节", Utils.nthWeekdayOfMonth(year, 5, 0, 2)], // 5月第2个周日
        ["父亲节", Utils.nthWeekdayOfMonth(year, 6, 0, 3)], // 6月第3个周日
        ["万圣节", Utils.fmtYMD(year, 10, 31)],
        ["平安夜", Utils.fmtYMD(year, 12, 24)],
        ["圣诞节", Utils.fmtYMD(year, 12, 25)],
        ["感恩节(美)", Utils.nthWeekdayOfMonth(year, 11, 4, 4)] // 11月第4个周四
      ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    },

    /**
     * 获取最近的3个节日/节气
     * @param {Array<[string, string]>} list - 节日/节气列表
     * @returns {Array<[string, string]>} 最近的3个
     */
    getNextThree(list) {
      try {
        // 过滤未来的日期（包含今天）
        const futureItems = list.filter(([_, date]) => Utils.dateDiff(DATE_FORMAT.TODAY_STR, date) >= 0);
        // 不足3个则补充下一年的（已提前合并，此处直接取列表开头）
        const result = futureItems.slice(0, 3);
        while (result.length < 3) {
          result.push(list[result.length] || ['未知', DATE_FORMAT.TODAY_STR]);
        }
        return result.slice(0, 3);
      } catch (e) {
        console.error(`获取最近节日失败：${e.message}`);
        return [['未知', DATE_FORMAT.TODAY_STR], ['未知', DATE_FORMAT.TODAY_STR], ['未知', DATE_FORMAT.TODAY_STR]];
      }
    },

    /**
     * 渲染节日行内容
     * @param {Array<[string, string]>} items - 3个节日项
     * @returns {string} 渲染后的字符串
     */
    renderFestivalLine(items) {
      const diffs = items.map(([_, date]) => Math.max(0, Utils.dateDiff(DATE_FORMAT.TODAY_STR, date)));
      const formatItem = (index) => {
        const [name] = items[index];
        const diff = diffs[index];
        return `${name}${Utils.formatDayText(diff)}`;
      };

      return diffs[0] === 0
        ? `今天：${formatItem(0)} | ${formatItem(1)} | ${formatItem(2)}`
        : `${formatItem(0)} | ${formatItem(1)} | ${formatItem(2)}`;
    },

    /**
     * 生成标题（支持占位符替换）
     * @param {string} nextName - 最近节日名称
     * @param {number} daysToNext - 距离天数
     * @param {string} lunarText - 农历文本
     * @param {string} solarText - 阳历文本
     * @param {Array<string>} titlesArr - 标题库
     * @returns {string} 生成的标题
     */
    generateTitle(nextName, daysToNext, lunarText, solarText, titlesArr) {
      try {
        if (daysToNext === 0) return `今天是 ${nextName || '节日'}，enjoy`;

        const pool = Array.isArray(titlesArr) && titlesArr.length ? titlesArr : DEFAULT_TITLES;
        const raw = pool[Math.floor(Math.random() * pool.length)] || '';

        return raw
          .replaceAll("{lunar}", lunarText)
          .replaceAll("{solar}", solarText)
          .replaceAll("{next}", nextName ? `下一个：${nextName}` : "");
      } catch (e) {
        console.error(`标题生成失败：${e.message}`);
        return `距离${nextName || '放假'}还有${daysToNext || '若干'}天`;
      }
    },

    /**
     * 节日提醒（仅法定+民俗，6点后单次）
     * @param {string} name - 节日名称
     * @param {string} date - 节日日期
     */
    notifyFestival(name, date) {
      try {
        if (!name || !date) return;

        const diff = Utils.dateDiff(DATE_FORMAT.TODAY_STR, date);
        if (diff === 0 && DATE_FORMAT.TODAY.getHours() >= 6) {
          const key = `timecardpushed_${date}`;
          if ($persistentStore?.read(key) !== "1") {
            $persistentStore?.write("1", key);
            const words = DEFAULT_BLESS[name] || "节日快乐！";
            $notification?.post(`🎉今天是 ${date} ${name}`, "", words);
          }
        }
      } catch (e) {
        console.error(`节日提醒失败：${e.message}`);
      }
    }
  };

  // ========================== 主逻辑执行 ==========================
  try {
    // 1. 初始化数据
    const args = Utils.parseArgs();
    const titlesArr = await Utils.fetchJson(args.TITLES_URL, DEFAULT_TITLES);
    const blessMap = await Utils.fetchJson(args.BLESS_URL, DEFAULT_BLESS);

    // 2. 获取农历/阳历信息
    const lunarNow = LunarCalendar.solar2lunar(
      DATE_FORMAT.TODAY.getFullYear(),
      DATE_FORMAT.TODAY.getMonth() + 1,
      DATE_FORMAT.TODAY.getDate()
    );

    const titleSolar = `${lunarNow.cMonth || DATE_FORMAT.TODAY.getMonth() + 1}月${lunarNow.cDay || DATE_FORMAT.TODAY.getDate()}日（${lunarNow.astro || '未知星座'}）`;
    const titleLunar = lunarNow.error
      ? `${DATE_FORMAT.TODAY.getFullYear()}年${DATE_FORMAT.TODAY.getMonth() + 1}月${DATE_FORMAT.TODAY.getDate()}日`
      : `${lunarNow.IMonthCn}${lunarNow.IDayCn} • ${lunarNow.gzYear}年${lunarNow.gzMonth}${lunarNow.gzDay} • ${lunarNow.Animal}年`;

    // 3. 生成节日/节气列表（合并当年和下一年）
    const TERMS = [...FestivalHandler.getSolarTerms(DATE_FORMAT.YEAR), ...FestivalHandler.getSolarTerms(DATE_FORMAT.NEXT_YEAR)];
    const LEGAL = [...FestivalHandler.getLegalFestivals(DATE_FORMAT.YEAR), ...FestivalHandler.getLegalFestivals(DATE_FORMAT.NEXT_YEAR)];
    const FOLK = [...FestivalHandler.getFolkFestivals(DATE_FORMAT.YEAR), ...FestivalHandler.getFolkFestivals(DATE_FORMAT.NEXT_YEAR)];
    const INTL = [...FestivalHandler.getInternationalFestivals(DATE_FORMAT.YEAR), ...FestivalHandler.getInternationalFestivals(DATE_FORMAT.NEXT_YEAR)];

    // 4. 获取最近的3个
    const T3 = FestivalHandler.getNextThree(TERMS);
    const L3 = FestivalHandler.getNextThree(LEGAL);
    const F3 = FestivalHandler.getNextThree(FOLK);
    const I3 = FestivalHandler.getNextThree(INTL);

    // 5. 渲染内容
    const lineLegal = FestivalHandler.renderFestivalLine(L3);
    const lineTerm = FestivalHandler.renderFestivalLine(T3);
    const lineFolk = FestivalHandler.renderFestivalLine(F3);
    const lineIntl = FestivalHandler.renderFestivalLine(I3);

    // 6. 找到最近的节日
    const getDiff = (item) => Math.max(0, Utils.dateDiff(DATE_FORMAT.TODAY_STR, item[1]));
    const nearestItems = [
      [L3[0], getDiff(L3[0])],
      [F3[0], getDiff(F3[0])],
      [I3[0], getDiff(I3[0])]
    ];
    const nearest = nearestItems.sort((a, b) => a[1] - b[1])[0];

    // 7. 执行节日提醒
    FestivalHandler.notifyFestival(L3[0][0], L3[0][1]);
    FestivalHandler.notifyFestival(F3[0][0], F3[0][1]);

    // 8. 输出结果
    $done({
      title: FestivalHandler.generateTitle(nearest[0][0], nearest[1], titleLunar, titleSolar, titlesArr),
      icon: "calendar",
      "icon-color": "#FF9800",
      content: `${lineLegal}\n${lineTerm}\n${lineFolk}\n${lineIntl}`
    });
  } catch (e) {
    console.error(`程序执行错误：${e.message}`);
    $done({
      title: "节日倒数出错",
      icon: "exclamationmark.triangle",
      "icon-color": "#FF3B30",
      content: `错误信息：${e.message}`
    });
  }
})();
