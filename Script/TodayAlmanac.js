/**
 * 节日倒数与黄历整合工具
 * 功能：节日倒数（法定/节气/民俗/国际）+ 黄历详情 + 节日提醒
 * 参数：
 *  - TITLES_URL: 标题库外链(JSON数组)，支持占位符 {lunar} {solar} {next}
 *  - BLESS_URL : 祝词库外链(JSON对象)
 *  - SHOW_ALMANAC: 是否显示黄历详情(true/false，默认true)
 *  - GAP_LINES: 节日行间隔行数(0-3，默认1)
 *  - TITLE_MODE: 标题模式(day=固定, random=随机，默认day)
 * 作者：整合版 | 基于ByteValley&IBL3ND原代码优化
 */

// ========== 环境兼容：模拟 Surge/QX 专属 API（Node.js 环境下生效） ==========
if (typeof $done === "undefined") {
    // 模拟 $done：输出结果到控制台，并结束进程
    global.$done = (result) => {
        console.log("[最终输出]", JSON.stringify(result, null, 2));
        process.exit(0);
    };
}

if (typeof $argument === "undefined") {
    // 模拟参数（可自定义测试参数）
    global.$argument = "SHOW_ALMANAC=true,GAP_LINES=1,TITLE_MODE=day";
}

if (typeof $script === "undefined") {
    // 模拟 $script（Cron 模式默认 false）
    global.$script = { type: "manual" };
}

if (typeof $persistentStore === "undefined") {
    // 模拟持久化存储（Node.js 中用内存临时存储）
    const store = {};
    global.$persistentStore = {
        read: (key) => store[key] || "",
        write: (value, key) => { store[key] = value; }
    };
}

if (typeof $notification === "undefined") {
    // 模拟通知：输出到控制台
    global.$notification = {
        post: (title, subtitle, body) => {
            console.log(`[通知] 标题：${title} | 副标题：${subtitle} | 内容：${body}`);
        }
    };
}

if (typeof $httpClient === "undefined") {
    // 模拟 $httpClient：Node.js 中用内置 http/https 模块实现
    const http = require("http");
    const https = require("https");
    const URL = require("url");
    global.$httpClient = {
        get: (req, callback) => {
            const urlObj = URL.parse(req.url);
            const client = urlObj.protocol === "https:" ? https : http;
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.path,
                method: "GET",
                timeout: req.timeout || 8000
            };
            const reqObj = client.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    callback(null, { status: res.statusCode }, data);
                });
            });
            reqObj.on("error", (err) => callback(err));
            reqObj.on("timeout", () => {
                reqObj.destroy();
                callback(new Error("Request timeout"));
            });
            reqObj.end();
        }
    };
}

/* ========== 全局工具函数 - 日志输出（移到外层，解决作用域问题） ========== */
const TAG = "festival_almanac";
const log = (...args) => {
    if (typeof console !== "undefined" && console.log) {
        console.log(`[${TAG}]`, ...args);
    }
};

(async () => {
    /* ========== 基础常量与环境判断 ========== */
    const ICON = "calendar";
    const COLOR = "#FF9800";
    const tnow = new Date();
    const todayStr = `${tnow.getFullYear()}-${tnow.getMonth() + 1}-${tnow.getDate()}`;
    const currentYear = tnow.getFullYear();
    const nextYear = currentYear + 1;

    // 环境判断
    const RAW_ARG = typeof $argument === "string" ? $argument.trim() : "";
    const IS_SURGE_CRON = typeof $script !== "undefined" && $script.type === "cron";
    const IS_CRON = IS_SURGE_CRON || !RAW_ARG; // 无参数或Cron模式视为播报模式
    const hasStore = typeof $persistentStore !== "undefined" && $persistentStore;
    const hasNotify = typeof $notification !== "undefined" && $notification;

    /* ========== 工具函数 ========== */
    // 布尔值解析
    const toBool = (s, defVal) => {
        if (["true", "1", "yes", "y", "on"].includes(s)) return true;
        if (["false", "0", "no", "n", "off"].includes(s)) return false;
        return defVal;
    };

    // 日期差计算（end - start，单位天）
    const dateDiff = (start, end) => {
        try {
            const [sY, sM, sD] = start.split("-").map(Number);
            const [eY, eM, eD] = end.split("-").map(Number);
            const sd = new Date(sY, sM - 1, sD);
            const ed = new Date(eY, eM - 1, eD);
            return Math.floor((ed - sd) / 86400000);
        } catch (e) {
            log(`日期差计算错误: ${e.message}`);
            return 0;
        }
    };

    // 日期格式化
    const fmtYMD = (y, m, d) => `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

    // 参数解析
    const parseArgs = (defaults = {}) => {
        try {
            if (!$argument) return { ...defaults };
            const argStr = $argument.replace(/,/g, '&');
            const sp = new URLSearchParams(argStr);
            const args = Object.fromEntries(sp.entries());
            return { ...defaults, ...args };
        } catch (e) {
            log(`参数解析失败: ${e.message}`);
            return { ...defaults };
        }
    };

    // HTTP GET请求
    const httpGet = (url, timeoutMs = 8000) => {
        return new Promise(resolve => {
            if (!url) return resolve(null);
            const req = { url, timeout: timeoutMs };
            $httpClient.get(req, (err, resp, data) => {
                if (err || !resp || resp.status !== 200) {
                    log(`请求失败: ${url} | 错误: ${err?.message || resp?.status}`);
                    return resolve(null);
                }
                resolve(data);
            });
        });
    };

    // JSON数据获取
    const fetchJson = async (url, fallback) => {
        if (!url) return fallback;
        const raw = await httpGet(url, 4000);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw) || fallback;
        } catch (e) {
            log(`JSON解析失败: ${url} | 错误: ${e.message}`);
            return fallback;
        }
    };

    /* ========== 农历/节气核心算法 ========== */
    const calendar = {
        solarMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        Gan: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
        Zhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
        Animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
        festival: {
            "1-1": { title: "元旦节" }, "2-14": { title: "情人节" }, "3-8": { title: "妇女节" },
            "3-12": { title: "植树节" }, "4-1": { title: "愚人节" }, "5-1": { title: "劳动节" },
            "5-12": { title: "护士节" }, "6-1": { title: "儿童节" }, "7-1": { title: "建党节" },
            "8-1": { title: "建军节" }, "9-10": { title: "教师节" }, "10-1": { title: "国庆节" },
            "12-24": { title: "平安夜" }, "12-25": { title: "圣诞节" }
        },
        lFestival: {
            "1-1": { title: "春节" }, "1-15": { title: "元宵节" }, "2-2": { title: "龙抬头" },
            "5-5": { title: "端午节" }, "7-7": { title: "七夕节" }, "7-15": { title: "中元节" },
            "8-15": { title: "中秋节" }, "9-9": { title: "重阳节" }, "10-1": { title: "寒衣节" },
            "10-15": { title: "下元节" }, "12-8": { title: "腊八节" }, "12-23": { title: "北方小年" },
            "12-24": { title: "南方小年" }, "12-30": { title: "除夕" }
        },
        solarTerm: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
        nStr1: ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
        nStr2: ["初", "十", "廿", "卅"],
        nStr3: ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"],

        // 农历年天数（补充默认lunarInfo，避免Node.js运行报错）
        lunarInfo: new Array(201).fill(0), // 占位，实际使用需替换完整农历数据
        // 节气数据（补充默认sTermInfo，避免Node.js运行报错）
        sTermInfo: new Array(201).fill("0"), // 占位，实际使用需替换完整节气数据

        // 农历年天数
        lYearDays(y) {
            let sum = 348;
            for (let i = 0x8000; i > 0x8; i >>= 1) {
                sum += (this.lunarInfo[y - 1900] & i) ? 1 : 0;
            }
            return sum + this.leapDays(y);
        },

        // 闰月判断
        leapMonth(y) {
            return this.lunarInfo[y - 1900] & 0xf;
        },

        // 闰月天数
        leapDays(y) {
            return this.leapMonth(y) ? (this.lunarInfo[y - 1900] & 0x10000) ? 30 : 29 : 0;
        },

        // 农历月天数
        monthDays(y, m) {
            if (m < 1 || m > 12) return -1;
            return (this.lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
        },

        // 阳历月天数
        solarDays(y, m) {
            if (m < 1 || m > 12) return -1;
            const ms = m - 1;
            return ms === 1 ? (y % 4 === 0 && y % 100 !== 0 || y % 400 === 0) ? 29 : 28 : this.solarMonth[ms];
        },

        // 干支计算
        GanZhi(o) {
            return this.Gan[o % 10] + this.Zhi[o % 12];
        },

        // 年干支
        toGanZhiYear(y) {
            let g = (y - 3) % 10;
            let z = (y - 3) % 12;
            return this.Gan[g < 1 ? 9 : g - 1] + this.Zhi[z < 1 ? 11 : z - 1];
        },

        // 节气获取
        getTerm(y, n) {
            if (y < 1900 || y > 2100 || n < 1 || n > 24) return -1;
            const t = this.sTermInfo[y - 1900];
            const d = [];
            for (let i = 0; i < t.length; i += 5) {
                const chunk = parseInt("0x" + t.substr(i, 5)).toString();
                d.push(chunk[0], chunk.substr(1, 2), chunk[3], chunk.substr(4, 2));
            }
            return parseInt(d[n - 1]);
        },

        // 农历月转中文
        toChinaMonth(m) {
            return m < 1 || m > 12 ? -1 : this.nStr3[m - 1] + "月";
        },

        // 农历日转中文
        toChinaDay(d) {
            switch (d) {
                case 10: return "初十";
                case 20: return "二十";
                case 30: return "三十";
                default: return this.nStr2[Math.floor(d / 10)] + this.nStr1[d % 10];
            }
        },

        // 生肖获取
        getAnimal(y) {
            return this.Animals[(y - 4) % 12];
        },

        // 星座获取
        toAstro(m, d) {
            const s = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
            const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
            return s.substr(m * 2 - (d < arr[m - 1] ? 2 : 0), 2) + "座";
        },

        // 阳历转农历
        solar2lunar(Y, M, D) {
            try {
                let y = parseInt(Y), m = parseInt(M), d = parseInt(D);
                const isToday = `${y}-${m}-${d}` === todayStr;
                let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
                let leap = 0, temp = 0;

                for (let i = 1900; i < 2101 && offset > 0; i++) {
                    const days = this.lYearDays(i);
                    offset -= days;
                }
                if (offset < 0) {
                    offset += this.lYearDays(--y);
                }

                const leapMonth = this.leapMonth(y);
                leap = 0;

                for (let i = 1; i < 13 && offset > 0; i++) {
                    if (leapMonth > 0 && i === leapMonth + 1 && leap === 0) {
                        i--;
                        leap = 1;
                        const days = this.leapDays(y);
                        offset -= days;
                    } else {
                        const days = this.monthDays(y, i);
                        offset -= days;
                    }
                    if (leap === 1) {
                        leap = 0;
                        i++;
                    }
                }

                if (offset < 0) {
                    offset += this.monthDays(y, --i);
                }
                const isLeap = leapMonth > 0 && i === leapMonth + 1 && leap === 1 ? 1 : 0;
                const lunarM = i;
                const lunarD = offset + 1;
                const gzY = this.toGanZhiYear(y);
                const gzM = this.GanZhi(y * 12 + lunarM + 11);
                const gzD = this.GanZhi(y * 365 + Math.floor(this.lYearDays(y) / 2) + lunarD);
                const nWeek = new Date(Y, M - 1, D).getDay();
                const cWeek = this.nStr1[nWeek];
                const isTerm = this.solarTerm.includes(this.getTerm(y, this.solarTerm.indexOf(this.solarTerm.find(t => {
                    const termM = this.solarTerm.indexOf(t) < 2 ? 1 : Math.floor(this.solarTerm.indexOf(t) / 2) + 1;
                    const termD = this.getTerm(y, this.solarTerm.indexOf(t) + 1);
                    return termM === m && termD === d;
                })) + 1));
                const Term = isTerm ? this.solarTerm.find(t => {
                    const termM = this.solarTerm.indexOf(t) < 2 ? 1 : Math.floor(this.solarTerm.indexOf(t) / 2) + 1;
                    const termD = this.getTerm(y, this.solarTerm.indexOf(t) + 1);
                    return termM === m && termD === d;
                }) : "";
                const astro = this.toAstro(m, d);

                return {
                    lYear: y, lMonth: lunarM, lDay: lunarD,
                    Animal: this.getAnimal(y),
                    IMonthCn: (isLeap ? "闰" : "") + this.toChinaMonth(lunarM),
                    IDayCn: this.toChinaDay(lunarD),
                    cYear: Y, cMonth: m, cDay: d,
                    gzYear: gzY, gzMonth: gzM, gzDay: gzD,
                    isToday, isLeap, nWeek, ncWeek: "星期" + cWeek,
                    isTerm, Term, astro
                };
            } catch (e) {
                log(`阳历转阴历失败: ${e.message}`);
                return { date: `${Y}-${M}-${D}`, error: e.message };
            }
        },

        // 农历转阳历
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
                let leap = 0;
                for (let i = 1; i < m; i++) {
                    if (leapMonth > 0 && i === leapMonth && leap === 0) {
                        offset += this.leapDays(y);
                        leap = 1;
                    }
                    offset += this.monthDays(y, i);
                }
                if (isLeap) offset += this.leapDays(y, m);
                offset += d - 1;

                const target = new Date(1900, 0, 31);
                target.setDate(target.getDate() + offset);
                return {
                    date: fmtYMD(target.getFullYear(), target.getMonth() + 1, target.getDate())
                };
            } catch (e) {
                log(`阴历转阳历失败: ${e.message}`);
                return { date: `${y}-${m}-${d}`, error: e.message };
            }
        }
    };

    /* ========== 黄历详情获取 ========== */
    const fetchAlmanacDetail = async (solarDate, lunarDate) => {
        try {
            const [y, m, d] = solarDate.split("-").map(Number);
            const path = `/${y}/${m}/${d}`;
            const apiUrl = `https://wncal.wnstatic.com${path}`; // 示例接口，实际需替换

            const raw = await httpGet(apiUrl, 5000);
            if (!raw) return null;

            const json = JSON.parse(raw);
            const almanac = json.data?.[0]?.almanac?.find(
                item => item.year == y && item.month == m && item.day == d
            );
            if (!almanac) return null;

            let header = `干支：${almanac.gzYear}年 ${almanac.gzMonth}月 ${almanac.gzDate}日`;
            if (almanac.term) header += `  ${almanac.term}`;

            return `${header}\n✅ 宜：${almanac.suit || '无'}\n❎ 忌：${almanac.avoid || '无'}`;
        } catch (e) {
            log(`黄历获取失败: ${e.message}`);
            return null;
        }
    };

    /* ========== 日期工具函数 ========== */
    // 获取某月第n个星期X的日期
    const nthWeekdayOfMonth = (year, month, weekday, n) => {
        try {
            const first = new Date(year, month - 1, 1);
            const firstW = first.getDay();
            const add = ((weekday - firstW + 7) % 7) + (n - 1) * 7;
            const targetDay = 1 + add;
            const maxDay = calendar.solarDays(year, month);
            return fmtYMD(year, month, Math.min(targetDay, maxDay));
        } catch (e) {
            log(`周序日期计算失败: ${e.message}`);
            return fmtYMD(year, month, 1);
        }
    };

    // 获取农历除夕阳历日期
    const lunarNewYearEveSolar = (year) => {
        try {
            const days12 = calendar.monthDays(year, 12);
            const lday = days12 === 29 ? 29 : 30;
            const result = calendar.lunar2solar(year, 12, lday);
            return result.date || fmtYMD(year, 12, 30);
        } catch (e) {
            log(`除夕日期计算失败: ${e.message}`);
            return fmtYMD(year, 12, 30);
        }
    };

    /* ========== 节日列表生成 ========== */
    // 节气列表
    const solarTerms = (year) => {
        const names = calendar.solarTerm;
        const out = [];
        for (let i = 1; i <= 24; i++) {
            const month = i <= 2 ? 1 : i <= 4 ? 2 : i <= 6 ? 3 : i <= 8 ? 4 :
                i <= 10 ? 5 : i <= 12 ? 6 : i <= 14 ? 7 : i <= 16 ? 8 :
                i <= 18 ? 9 : i <= 20 ? 10 : i <= 22 ? 11 : 12;
            const day = calendar.getTerm(year, i);
            if (day > 0) {
                out.push([names[i - 1], fmtYMD(year, month, day)]);
            }
        }
        return out.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 法定节假日
    const legalFest = (year) => {
        return [
            ["元旦", fmtYMD(year, 1, 1)],
            ["春节", calendar.lunar2solar(year, 1, 1).date || fmtYMD(year, 1, 1)],
            ["清明节", fmtYMD(year, 4, calendar.getTerm(year, 7) || 5)],
            ["劳动节", fmtYMD(year, 5, 1)],
            ["端午节", calendar.lunar2solar(year, 5, 5).date || fmtYMD(year, 5, 5)],
            ["中秋节", calendar.lunar2solar(year, 8, 15).date || fmtYMD(year, 8, 15)],
            ["国庆节", fmtYMD(year, 10, 1)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 民俗节日（非法定）
    const folkFest = (year) => {
        return [
            ["除夕", lunarNewYearEveSolar(year)],
            ["元宵节", calendar.lunar2solar(year, 1, 15).date || fmtYMD(year, 1, 15)],
            ["龙抬头", calendar.lunar2solar(year, 2, 2).date || fmtYMD(year, 2, 2)],
            ["七夕节", calendar.lunar2solar(year, 7, 7).date || fmtYMD(year, 7, 7)],
            ["中元节", calendar.lunar2solar(year, 7, 15).date || fmtYMD(year, 7, 15)],
            ["重阳节", calendar.lunar2solar(year, 9, 9).date || fmtYMD(year, 9, 9)],
            ["腊八节", calendar.lunar2solar(year, 12, 8).date || fmtYMD(year, 12, 8)],
            ["北方小年", calendar.lunar2solar(year, 12, 23).date || fmtYMD(year, 12, 23)],
            ["南方小年", calendar.lunar2solar(year, 12, 24).date || fmtYMD(year, 12, 24)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 国际节日
    const intlFest = (year) => {
        return [
            ["情人节", fmtYMD(year, 2, 14)],
            ["妇女节", fmtYMD(year, 3, 8)],
            ["植树节", fmtYMD(year, 3, 12)],
            ["愚人节", fmtYMD(year, 4, 1)],
            ["护士节", fmtYMD(year, 5, 12)],
            ["儿童节", fmtYMD(year, 6, 1)],
            ["建党节", fmtYMD(year, 7, 1)],
            ["建军节", fmtYMD(year, 8, 1)],
            ["教师节", fmtYMD(year, 9, 10)],
            ["平安夜", fmtYMD(year, 12, 24)],
            ["圣诞节", fmtYMD(year, 12, 25)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    /* ========== 最近节日筛选 ========== */
    const nextTrip = (list) => {
        try {
            const filtered = list.filter(([_, date]) => dateDiff(todayStr, date) >= 0);
            filtered.sort((a, b) => dateDiff(todayStr, a[1]) - dateDiff(todayStr, b[1]));
            return filtered.slice(0, 3).map(item => item || ['未知', todayStr]);
        } catch (e) {
            log(`最近节日筛选失败: ${e.message}`);
            return [['未知', todayStr], ['未知', todayStr], ['未知', todayStr]];
        }
    };

    /* ========== 主逻辑执行 ========== */
    // 合并两年节日数据
    const TERMS = [...solarTerms(currentYear), ...solarTerms(nextYear)];
    const LEGAL = [...legalFest(currentYear), ...legalFest(nextYear)];
    const FOLK = [...folkFest(currentYear), ...folkFest(nextYear)];
    const INTL = [...intlFest(currentYear), ...intlFest(nextYear)];

    // 获取最近三个节日
    const T3 = nextTrip(TERMS);
    const L3 = nextTrip(LEGAL);
    const F3 = nextTrip(FOLK);
    const I3 = nextTrip(INTL);

    // 计算天数差
    const calcDiff = (date) => Math.max(0, dateDiff(todayStr, date));
    const [dT0, dT1, dT2] = [calcDiff(T3[0][1]), calcDiff(T3[1][1]), calcDiff(T3[2][1])];
    const [dL0, dL1, dL2] = [calcDiff(L3[0][1]), calcDiff(L3[1][1]), calcDiff(L3[2][1])];
    const [dF0, dF1, dF2] = [calcDiff(F3[0][1]), calcDiff(F3[1][1]), calcDiff(F3[2][1])];
    const [dI0, dI1, dI2] = [calcDiff(I3[0][1]), calcDiff(I3[1][1]), calcDiff(I3[2][1])];

    /* ========== 标题与祝词库 ========== */
    const args = parseArgs({
        TITLES_URL: "",
        BLESS_URL: "",
        SHOW_ALMANAC: "true",
        GAP_LINES: "1",
        TITLE_MODE: "day"
    });

    const defaultTitles = [
        "距离放假，还要摸鱼多少天？",
        "坚持住，就快放假啦！",
        "下一个节日：{next}",
        "{lunar} | {solar}"
    ];
    const defaultBless = {
        "元旦": "新岁启封，诸事顺心。",
        "春节": "春风送暖入屠苏，万象更新福满门。",
        "清明节": "风细雨潇潇，慎终追远寄哀思。",
        "劳动节": "双手创造幸福，汗水亦有光。",
        "端午节": "粽叶飘香龙舟竞，平安康健万事顺。",
        "中秋节": "人月两团圆，心上皆明朗。",
        "国庆节": "山河锦绣，家国同庆。",
        "元宵节": "花灯人月圆，团圆共此时。"
    };

    const titlesArr = await fetchJson(args.TITLES_URL, defaultTitles);
    const blessMap = await fetchJson(args.BLESS_URL, defaultBless);

    /* ========== 标题生成 ========== */
    const pickTitle = (nextName, daysToNext) => {
        try {
            if (daysToNext === 0) return `今天是 ${nextName || '节日'}，节日快乐！`;

            const pool = Array.isArray(titlesArr) && titlesArr.length ? titlesArr : defaultTitles;
            const lunarInfo = calendar.solar2lunar(...todayStr.split("-").map(Number));
            const titleLunar = `${lunarInfo.IMonthCn}${lunarInfo.IDayCn}`;
            const titleSolar = `${tnow.getMonth() + 1}月${tnow.getDate()}日`;

            let idx = 0;
            if (args.TITLE_MODE === "random") {
                idx = Math.floor(Math.random() * pool.length);
            } else {
                idx = (tnow.getDate() - 1) % pool.length;
            }

            return String(pool[idx] || "")
                .replaceAll("{lunar}", titleLunar)
                .replaceAll("{solar}", titleSolar)
                .replaceAll("{next}", nextName ? `下一个：${nextName}` : "");
        } catch (e) {
            log(`标题生成失败: ${e.message}`);
            return `距离${nextName || '节日'}还有${daysToNext || '若干'}天`;
        }
    };

    /* ========== 节日提醒 ========== */
    const notifyIfToday = (name, date) => {
        try {
            if (!name || !date || dateDiff(todayStr, date) !== 0 || tnow.getHours() < 6) return;

            const key = `pushed_${date}`;
            if (hasStore && $persistentStore.read(key) !== "1") {
                $persistentStore.write("1", key);
                if (hasNotify) {
                    const words = blessMap[name] || "节日快乐！";
                    $notification.post(`🎉 ${date} ${name}`, "", words);
                }
            }
        } catch (e) {
            log(`节日提醒失败: ${e.message}`);
        }
    };

    // 执行提醒
    notifyIfToday(L3[0][0], L3[0][1]);
    notifyIfToday(F3[0][0], F3[0][1]);

    /* ========== 黄历数据获取 ========== */
    const showAlmanac = toBool(args.SHOW_ALMANAC, true);
    const needAlmanac = showAlmanac || IS_CRON;
    const lunarNow = calendar.solar2lunar(...todayStr.split("-").map(Number));
    const almanacDetail = needAlmanac ? await fetchAlmanacDetail(todayStr, lunarNow) : null;

    /* ========== 内容渲染 ========== */
    const gapLinesVal = Math.min(3, Math.max(0, parseInt(args.GAP_LINES, 10) || 1));
    const gapBetween = "\n".repeat(gapLinesVal + 1);

    const render3 = (a0, a1, a2, d0, d1, d2) => {
        const formatDay = (day) => day === 0 ? '' : `${day}天`;
        return d0 === 0
            ? `今天：${a0[0]} | ${a1[0]}${formatDay(d1)} | ${a2[0]}${formatDay(d2)}`
            : `${a0[0]}${formatDay(d0)} | ${a1[0]}${formatDay(d1)} | ${a2[0]}${formatDay(d2)}`;
    };

    const lineLegal = render3(L3[0], L3[1], L3[2], dL0, dL1, dL2);
    const lineTerm = render3(T3[0], T3[1], T3[2], dT0, dT1, dT2);
    const lineFolk = render3(F3[0], F3[1], F3[2], dF0, dF1, dF2);
    const lineIntl = render3(I3[0], I3[1], I3[2], dI0, dI1, dI2);

    const blockFest = [lineLegal, lineTerm, lineFolk, lineIntl].join(gapBetween);
    const content = almanacDetail ? `${almanacDetail}\n\n${blockFest}` : blockFest;

    /* ========== 最近节日判断 ========== */
    let nearest = [L3[0], dL0];
    if (dF0 < nearest[1]) nearest = [F3[0], dF0];
    if (dI0 < nearest[1]) nearest = [I3[0], dI0];

    /* ========== 输出结果 ========== */
    $done({
        title: pickTitle(nearest[0][0], nearest[1]),
        icon: ICON,
        "icon-color": COLOR,
        content
    });

})().catch((e) => {
    log(`程序执行错误: ${e.message}`);
    $done({
        title: "节日黄历出错",
        icon: "exclamationmark.triangle",
        "icon-color": "#FF3B30",
        content: `错误信息：${e.message}`
    });
});
