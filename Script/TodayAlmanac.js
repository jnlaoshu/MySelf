 // 今日黄历
 // 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 // 𝐅𝐫𝐨𝐦：https://github.com/ByteValley/NetTool/blob/main/Scripts/Panel/today_almanac.js
 // 𝐔𝐩𝐝𝐚𝐭𝐞：2025.12.13 10:00

/**
 * 今日黄历 · 面板脚本（集成 wnCalendar 黄历接口）
 *
 * 功能：
 *   · 面板顶部可选显示「今日黄历详情」（干支纪法 + 宜忌）
 *   · 4 行节日倒数：法定 / 二十四节气 / 传统民俗 / 国际洋节
 *   · 法定 + 民俗 正日 06:00 之后单次祝词通知
 *   · 若脚本“无参数调用”（通常为 Cron），则直接用系统通知播报今日黄历详情
 *
 * 参数（模块 argument）：
 *   TITLES_URL    标题库外链(JSON 数组，支持 {lunar} {solar} {next})
 *   BLESS_URL     祝词库外链(JSON 对象: 键=节日名, 值=祝词)
 *   SHOW_ALMANAC  是否在顶部附加今日黄历详情(true/false)
 *   GAP_LINES     节日行之间空行数(0=无空行,1=一行,2=两行…)
 *   TITLE_MODE    标题模式(day=当天固定, random=每次随机)
 *
 * 适配：Surge / Loon / Quantumult X / Stash / Egern（面板）
 *
 * 作者：ByteValley  |  版本：2025-11-20R1
 */

"use strict";

;(async () => {
    /* ───────────────── 基本常量 / 日时 ───────────────── */

    const TAG = "TodayAlmanac";
    const ICON = "calendar";
    const COLOR = "#FF9800";

    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;

    const todayStr = `${year}-${now.getMonth() + 1}-${now.getDate()}`;

    // 判断是否有参数传入（Panel 会传，Cron 那条通常不会）
    const RAW_ARG =
        typeof $argument === "string"
            ? $argument.trim()
            : (typeof $argument === "undefined" ? "" : String($argument).trim());

    const IS_NO_ARGUMENT = !RAW_ARG;
    const IS_SURGE_CRON =
        typeof $script !== "undefined" && $script.type === "cron";
    // 只要是 Surge Cron 或者完全没参数，就视为“播报模式”
    const IS_CRON = IS_SURGE_CRON || IS_NO_ARGUMENT;

    function log(...args) {
        if (typeof console === "undefined" || !console.log) return;
        console.log(`[${TAG}]`, ...args);
    }

    const hasStore = typeof $persistentStore !== "undefined" && $persistentStore;
    const hasNotify = typeof $notification !== "undefined" && $notification;

    /* ───────────────── 通用工具函数 ───────────────── */

    // 日期差：end - start（按天）
    const dateDiff = (start, end) => {
        const s = start.split("-");
        const e = end.split("-");
        const sd = new Date(+s[0], +s[1] - 1, +s[2]);
        const ed = new Date(+e[0], +e[1] - 1, +e[2]);
        return Math.floor((ed - sd) / 86400000);
    };

    const fmtYMD = (y, m, d) => `${y}-${m}-${d}`;

    // 参数解析：兼容
    //   · Surge 模块 arguments: k:v,k:v
    //   · querystring: a=1&b=2 或用逗号分隔的 k=v
    const parseArgs = (defaults = {}) => {
        if (typeof $argument === "undefined" || !$argument) return {...defaults};

        const raw = String($argument).trim();
        const out = {...defaults};

        // 优先按 querystring 解析（Egern / argument=a=1&b=2）
        if (raw.includes("=")) {
            const qs = raw.includes("&") ? raw : raw.replace(/,/g, "&");
            try {
                const usp = new URLSearchParams(qs);
                for (const [k, v] of usp.entries()) {
                    out[k.trim()] = v;
                }
                return out;
            } catch (e) {
                log("parseArgs as query failed:", String(e));
            }
        }

        // 回退为 Surge 模块 k:v 写法
        raw.split(",").forEach(pair => {
            const seg = pair.trim();
            if (!seg) return;
            const idx = seg.indexOf(":");
            if (idx === -1) {
                out[seg] = "";
                return;
            }
            const key = seg.slice(0, idx).trim();
            let val = seg.slice(idx + 1).trim();
            if (
                (val.startsWith("'") && val.endsWith("'")) ||
                (val.startsWith('"') && val.endsWith('"'))
            ) {
                val = val.slice(1, -1);
            }
            out[key] = val;
        });

        return out;
    };

    const toBool = (v, defVal = false) => {
        if (typeof v === "boolean") return v;
        if (v === null || v === undefined || v === "") return defVal;
        const s = String(v).trim().toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(s)) return true;
        if (["false", "0", "no", "n", "off"].includes(s)) return false;
        return defVal;
    };

    // 通用 GET（带超时，仅面板环境：Surge/Egern 等支持 $httpClient）
    const httpGet = (url, timeoutMs) => {
        return new Promise(resolve => {
            if (!url) return resolve(null);
            const req = {url};
            if (timeoutMs) req.timeout = timeoutMs;

            $httpClient.get(req, (err, resp, data) => {
                if (err || !resp || resp.status !== 200) {
                    log("httpGet fail:", url, "err:", err, "status:", resp && resp.status);
                    return resolve(null);
                }
                resolve(data);
            });
        });
    };

    const fetchJson = async (url, fallback) => {
        if (!url) return fallback;
        const raw = await httpGet(url, 4000);
        if (!raw) return fallback;
        try {
            const obj = JSON.parse(raw);
            return obj || fallback;
        } catch (e) {
            log("fetchJson parse error:", String(e));
            return fallback;
        }
    };

    /* ───────────────── 农历 / 节气算法（原版） ───────────────── */

    const calendar = {
        lunarInfo: [0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, 0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, 0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, 0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, 0x0d520],
        solarMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        Gan: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
        Zhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
        Animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
        festival: {
            "1-1": {title: "元旦节"},
            "2-14": {title: "情人节"},
            "5-1": {title: "劳动节"},
            "6-1": {title: "儿童节"},
            "9-10": {title: "教师节"},
            "10-1": {title: "国庆节"},
            "12-25": {title: "圣诞节"},
            "3-8": {title: "妇女节"},
            "3-12": {title: "植树节"},
            "4-1": {title: "愚人节"},
            "5-12": {title: "护士节"},
            "7-1": {title: "建党节"},
            "8-1": {title: "建军节"},
            "12-24": {title: "平安夜"}
        },
        lFestival: {
            "12-30": {title: "除夕"},
            "1-1": {title: "春节"},
            "1-15": {title: "元宵节"},
            "2-2": {title: "龙抬头"},
            "5-5": {title: "端午节"},
            "7-7": {title: "七夕节"},
            "7-15": {title: "中元节"},
            "8-15": {title: "中秋节"},
            "9-9": {title: "重阳节"},
            "10-1": {title: "寒衣节"},
            "10-15": {title: "下元节"},
            "12-8": {title: "腊八节"},
            "12-23": {title: "北方小年"},
            "12-24": {title: "南方小年"}
        },
        solarTerm: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
        sTermInfo: ['9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '9778397bd19801ec9210c965cc920e', '97b6b97bd19801ec95f8c965cc920f', '97bd09801d98082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd197c36c9210c9274c91aa', '97b6b97bd19801ec95f8c965cc920e', '97bd09801d98082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c91aa', '97b6b97bd19801ec95f8c965cc920e', '97bcf97c3598082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd097bd07f595b0b6fc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '9778397bd19801ec9210c9274c920e', '97b6b97bd19801ec95f8c965cc920f', '97bd07f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c920e', '97b6b97bd19801ec95f8c965cc920f', '97bd07f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bd07f1487f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c9274c920e', '97bcf7f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c91aa', '97b6b97bd197c36c9210c9274c920e', '97bcf7f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c920e', '97b6b7f0e47f531b0723b0b6fb0722', '7f0e37f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36b0b70c9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c91aa', '97b6b7f0e47f149b0723b0787b0721', '7f0e27f0e47f531b0723b0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '977837f0e37f149b0723b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f5307f595b0b0bc920fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '977837f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f149b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14998082b0723b06bd', '7f07e7f0e37f149b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e37f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e37f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e37f0e366aa89801eb072297c35', '7ec967f0e37f14998082b0723b06bd', '7f07e7f0e37f14998083b0787b0721', '7f0e27f0e47f531b0723b0b6fb0722', '7f0e37f0e366aa89801eb072297c35', '7ec967f0e37f14998082b0723b02d5', '7f07e7f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e36665b66aa89801e9808297c35', '665f67f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e36665b66a449801e9808297c35', '665f67f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e36665b66a449801e9808297c35', '665f67f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e26665b66a449801e9808297c35', '665f67f0e37f1489801eb072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722'],
        nStr1: ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
        nStr2: ["初", "十", "廿", "卅"],
        nStr3: ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"],

        lYearDays(y) {
            let i, sum = 348;
            for (i = 0x8000; i > 0x8; i >>= 1) {
                sum += (this.lunarInfo[y - 1900] & i) ? 1 : 0;
            }
            return sum + this.leapDays(y);
        },

        leapMonth(y) {
            return this.lunarInfo[y - 1900] & 0xf;
        },

        leapDays(y) {
            if (this.leapMonth(y)) {
                return (this.lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
            }
            return 0;
        },

        monthDays(y, m) {
            if (m > 12 || m < 1) return -1;
            return (this.lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
        },

        solarDays(y, m) {
            if (m > 12 || m < 1) return -1;
            const ms = m - 1;
            if (ms === 1) {
                return ((y % 4 === 0) && (y % 100 !== 0) || (y % 400 === 0)) ? 29 : 28;
            }
            return this.solarMonth[ms];
        },

        GanZhi(o) {
            return this.Gan[o % 10] + this.Zhi[o % 12];
        },

        toGanZhiYear(y) {
            let g = (y - 3) % 10;
            let z = (y - 3) % 12;
            if (g === 0) g = 10;
            if (z === 0) z = 12;
            return this.Gan[g - 1] + this.Zhi[z - 1];
        },

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

        toChinaMonth(m) {
            if (m > 12 || m < 1) return -1;
            return this.nStr3[m - 1] + "月";
        },

        toChinaDay(d) {
            let s;
            switch (d) {
                case 10:
                    s = "初十";
                    break;
                case 20:
                    s = "二十";
                    break;
                case 30:
                    s = "三十";
                    break;
                default:
                    s = this.nStr2[Math.floor(d / 10)] + this.nStr1[d % 10];
            }
            return s;
        },

        getAnimal(y) {
            return this.Animals[(y - 4) % 12];
        },

        toAstro(m, d) {
            const s = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
            const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
            return s.substr(m * 2 - (d < arr[m - 1] ? 2 : 0), 2) + "座";
        },

        solar2lunar(Y, M, D) {
            let y = parseInt(Y);
            let m = parseInt(M);
            let d = parseInt(D);
            if (y < 1900 || y > 2100) return -1;
            if (y === 1900 && m === 1 && d < 31) return -1;

            let obj = Y ? new Date(y, m - 1, d) : new Date();
            y = obj.getFullYear();
            m = obj.getMonth() + 1;
            d = obj.getDate();

            let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
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
            const isToday =
                isTodayObj.getFullYear() === y &&
                isTodayObj.getMonth() + 1 === m &&
                isTodayObj.getDate() === d;

            let nWeek = obj.getDay();
            let cWeek = this.nStr1[nWeek];
            if (nWeek === 0) nWeek = 7;

            const year = i;
            let leap = this.leapMonth(i);
            let isLeap = false;

            for (i = 1; i < 13 && offset > 0; i++) {
                if (leap > 0 && i === (leap + 1) && isLeap === false) {
                    --i;
                    isLeap = true;
                    temp = this.leapDays(year);
                } else {
                    temp = this.monthDays(year, i);
                }
                if (isLeap === true && i === (leap + 1)) isLeap = false;
                offset -= temp;
            }

            if (offset === 0 && leap > 0 && i === leap + 1) {
                if (isLeap) {
                    isLeap = false;
                } else {
                    isLeap = true;
                    --i;
                }
            }
            if (offset < 0) {
                offset += temp;
                --i;
            }

            const month = i;
            const day = offset + 1;
            const sm = m - 1;

            const gzY = this.toGanZhiYear(year);
            const firstNode = this.getTerm(y, m * 2 - 1);
            const secondNode = this.getTerm(y, m * 2);

            let gzM = this.GanZhi((y - 1900) * 12 + m + 11);
            if (d >= firstNode) gzM = this.GanZhi((y - 1900) * 12 + m + 12);

            let isTerm = false;
            let Term = null;
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

            const fest = this.festival;
            const lfest = this.lFestival;
            const festKey = `${m}-${d}`;
            let lfestKey = `${month}-${day}`;

            if (month === 12 && day === 29 && this.monthDays(year, month) === 29) {
                lfestKey = "12-30";
            }

            return {
                date: solarDate,
                lunarDate: lunarDate,
                festival: fest[festKey] ? fest[festKey].title : null,
                lunarFestival: lfest[lfestKey] ? lfest[lfestKey].title : null,
                lYear: year, lMonth: month, lDay: day,
                Animal: this.getAnimal(year),
                IMonthCn: (isLeap ? "闰" : "") + this.toChinaMonth(month),
                IDayCn: this.toChinaDay(day),
                cYear: y, cMonth: m, cDay: d,
                gzYear: gzY, gzMonth: gzM, gzDay: gzD,
                isToday, isLeap,
                nWeek, ncWeek: "星期" + cWeek,
                isTerm, Term,
                astro
            };
        },

        lunar2solar(y, m, d, isLeap) {
            y = parseInt(y);
            m = parseInt(m);
            d = parseInt(d);
            isLeap = !!isLeap;

            const leapMonth = this.leapMonth(y);
            if (isLeap && leapMonth !== m) return -1;

            const day = this.monthDays(y, m);
            const _day = isLeap ? this.leapDays(y, m) : day;

            if ((y === 2100 && m === 12 && d > 1) || (y === 1900 && m === 1 && d < 31)) return -1;
            if (y < 1900 || y > 2100 || d > _day) return -1;

            let offset = 0;
            for (let i = 1900; i < y; i++) {
                offset += this.lYearDays(i);
            }

            let leap = 0;
            let isAdd = false;
            for (let i = 1; i < m; i++) {
                leap = this.leapMonth(y);
                if (!isAdd) {
                    if (leap <= i && leap > 0) {
                        offset += this.leapDays(y);
                        isAdd = true;
                    }
                }
                offset += this.monthDays(y, i);
            }
            if (isLeap) offset += day;

            const strap = Date.UTC(1900, 1, 30, 0, 0, 0);
            const cal = new Date((offset + d - 31) * 86400000 + strap);
            const cY = cal.getUTCFullYear();
            const cM = cal.getUTCMonth() + 1;
            const cD = cal.getUTCDate();

            return this.solar2lunar(cY, cM, cD);
        }
    };

    /* ───────────────── 今日农历信息（标题占位 / 黄历回退） ───────────────── */

    const lunarNow = calendar.solar2lunar(year, now.getMonth() + 1, now.getDate());
    const titleSolar = `${lunarNow.cMonth}月${lunarNow.cDay}日（${lunarNow.astro}）`;
    const titleLunar =
        `${lunarNow.IMonthCn}${lunarNow.IDayCn} • ` +
        `${lunarNow.gzYear}年${lunarNow.gzMonth}${lunarNow.gzDay} • ${lunarNow.Animal}年`;

    /* ───────────────── 参数解析 ───────────────── */

    const ARG_DEFAULTS = {
        TITLES_URL: "",
        BLESS_URL: "",
        SHOW_ALMANAC: "true",
        GAP_LINES: "1",
        TITLE_MODE: "day"
    };

    const args = parseArgs(ARG_DEFAULTS);

    const showAlmanac = toBool(
        args.SHOW_ALMANAC ?? args.show_almanac,
        true
    );

    let gapLinesVal = parseInt(
        args.GAP_LINES ?? args.gap_lines ?? "1",
        10
    );
    if (isNaN(gapLinesVal) || gapLinesVal < 0) gapLinesVal = 0;
    if (gapLinesVal > 3) gapLinesVal = 3;

    const titleModeRaw =
        (args.TITLE_MODE ?? args.title_mode ?? "day").toString().trim().toLowerCase();
    const titleMode = (titleModeRaw === "random") ? "random" : "day";

    // 0 => "\n"；1 => "\n\n"；2 => "\n\n\n"
    const gapBetween = "\n".repeat(gapLinesVal + 1);

    /* ───────────────── 默认标题 / 祝词库 ───────────────── */

    const defaultTitles = [
        "距离放假，还要摸鱼多少天？",
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

    const titlesPromise = fetchJson(args.TITLES_URL, defaultTitles);
    const blessPromise = fetchJson(args.BLESS_URL, defaultBless);

    /* ───────────────── wnCalendar 黄历详情 ───────────────── */

    const ALMANAC_BASE = "https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/";
    const GH_PROXY = "https://mirror.ghproxy.com/";

    const fetchAlmanacDetail = async (nowDate, lunarBase) => {
        const y = nowDate.getFullYear();
        const m = nowDate.getMonth() + 1;
        const d = nowDate.getDate();
        const mm = m < 10 ? "0" + m : String(m);

        const path = `${y}/${y}${mm}.json`;
        const pathEnc = encodeURIComponent(path);

        // 本地可得的回退 header
        let header = `干支纪法：${lunarBase.gzYear}年 ${lunarBase.gzMonth}月 ${lunarBase.gzDay}日`;
        const tags = [];
        if (lunarBase.lunarFestival) tags.push(lunarBase.lunarFestival);
        if (lunarBase.festival) tags.push(lunarBase.festival);
        if (lunarBase.Term) tags.push(lunarBase.Term);
        if (tags.length) header += " " + tags.join(" ");

        let ji = "——";
        let yi = "——";

        try {
            // 先查 IP，判断是否在中国，决定是否走 ghproxy
            let apiUrl = ALMANAC_BASE + pathEnc;
            const ipData = await httpGet("http://ip-api.com/json/", 3000);
            if (ipData) {
                try {
                    const ipJson = JSON.parse(ipData);
                    if (ipJson && ipJson.country === "China") {
                        apiUrl = GH_PROXY + ALMANAC_BASE + pathEnc;
                    }
                } catch (e) {
                    log("ip-api parse error:", String(e));
                }
            }

            log("almanac api url:", apiUrl);
            const raw = await httpGet(apiUrl, 5000);
            if (!raw) {
                log("almanac http empty");
            } else {
                const json = JSON.parse(raw);
                const arr =
                    json &&
                    json.data &&
                    json.data[0] &&
                    Array.isArray(json.data[0].almanac)
                        ? json.data[0].almanac
                        : null;

                if (!arr) {
                    log("almanac structure unexpected");
                } else {
                    const item = arr.find(i =>
                        Number(i.year) === y &&
                        Number(i.month) === m &&
                        Number(i.day) === d
                    );
                    if (!item) {
                        log("almanac no item for today");
                    } else {
                        let desc = "";
                        if (item.desc) desc += item.desc;
                        if (item.term) desc += (desc ? " " : "") + item.term;
                        if (item.value) desc += (desc ? " " : "") + item.value;

                        header =
                            `干支纪法：${item.gzYear}年 ${item.gzMonth}月 ${item.gzDate}日` +
                            (desc ? " " + desc : "");

                        if (item.avoid) ji = item.avoid;
                        if (item.suit) yi = item.suit;
                    }
                }
            }
        } catch (e) {
            log("fetchAlmanacDetail error:", String(e));
        }

        const lineYi = `✅ 宜：${yi}`;
        const lineJi = `❎ 忌：${ji}`;
        const block = `${header}\n${lineYi}\n${lineJi}`;

        log("almanac block:", block.replace(/\n/g, "\\n"));
        return block;
    };

    // Cron 播报模式下，无论 SHOW_ALMANAC 设置如何，都要强制获取黄历详情
    const needAlmanac = showAlmanac || IS_CRON;
    const almanacPromise = needAlmanac
        ? fetchAlmanacDetail(now, lunarNow)
        : Promise.resolve(null);

    /* ───────────────── 构造节日集合 ───────────────── */

    const nthWeekdayOfMonth = (y, m, weekday, n) => {
        const first = new Date(y, m - 1, 1);
        const firstW = first.getDay();
        const add = ((weekday - firstW + 7) % 7) + (n - 1) * 7;
        return fmtYMD(y, m, 1 + add);
    };

    const lunarNewYearEveSolar = y => {
        const days12 = calendar.monthDays(y, 12);
        const lday = days12 === 29 ? 29 : 30;
        return calendar.lunar2solar(y, 12, lday).date;
    };

    const solarTerms = y => {
        const names = calendar.solarTerm;
        const out = [];
        for (let i = 1; i <= 24; i++) {
            const m =
                i <= 2 ? 1 :
                    i <= 4 ? 2 :
                        i <= 6 ? 3 :
                            i <= 8 ? 4 :
                                i <= 10 ? 5 :
                                    i <= 12 ? 6 :
                                        i <= 14 ? 7 :
                                            i <= 16 ? 8 :
                                                i <= 18 ? 9 :
                                                    i <= 20 ? 10 :
                                                        i <= 22 ? 11 : 12;
            const d = calendar.getTerm(y, i);
            out.push([names[i - 1], fmtYMD(y, m, d)]);
        }
        out.sort((a, b) => new Date(a[1]) - new Date(b[1]));
        return out;
    };

    const legalFest = y => {
        return [
            ["元旦", fmtYMD(y, 1, 1)],
            ["春节", calendar.lunar2solar(y, 1, 1).date],
            ["清明节", fmtYMD(y, 4, calendar.getTerm(y, 7))],
            ["劳动节", fmtYMD(y, 5, 1)],
            ["端午节", calendar.lunar2solar(y, 5, 5).date],
            ["中秋节", calendar.lunar2solar(y, 8, 15).date],
            ["国庆节", fmtYMD(y, 10, 1)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    const folkFest = y => {
        const base = [
            ["除夕", lunarNewYearEveSolar(y)],
            ["元宵节", calendar.lunar2solar(y, 1, 15).date],
            ["龙抬头", calendar.lunar2solar(y, 2, 2).date],
            ["七夕节", calendar.lunar2solar(y, 7, 7).date],
            ["中元节", calendar.lunar2solar(y, 7, 15).date],
            ["重阳节", calendar.lunar2solar(y, 9, 9).date],
            ["寒衣节", calendar.lunar2solar(y, 10, 1).date],
            ["下元节", calendar.lunar2solar(y, 10, 15).date],
            ["腊八节", calendar.lunar2solar(y, 12, 8).date],
            ["小年(北)", calendar.lunar2solar(y, 12, 23).date],
            ["小年(南)", calendar.lunar2solar(y, 12, 24).date]
        ];
        return base.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    const intlFest = y => {
        return [
            ["情人节", fmtYMD(y, 2, 14)],
            ["母亲节", nthWeekdayOfMonth(y, 5, 0, 2)],
            ["父亲节", nthWeekdayOfMonth(y, 6, 0, 3)],
            ["万圣节", fmtYMD(y, 10, 31)],
            ["平安夜", fmtYMD(y, 12, 24)],
            ["圣诞节", fmtYMD(y, 12, 25)],
            ["感恩节", nthWeekdayOfMonth(y, 11, 4, 4)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    const nextTrip = list => {
        const arr = list.filter(([, d]) => dateDiff(todayStr, d) >= 0);
        if (arr.length === 0) return list.slice(0, 3);
        const take = arr.slice(0, 3);
        if (take.length < 3) take.push(...list.slice(0, 3 - take.length));
        return take;
    };

    const TERMS = [...solarTerms(year), ...solarTerms(nextYear)];
    const LEGAL = [...legalFest(year), ...legalFest(nextYear)];
    const FOLK = [...folkFest(year), ...folkFest(nextYear)];
    const INTL = [...intlFest(year), ...intlFest(nextYear)];

    const T3 = nextTrip(TERMS);
    const L3 = nextTrip(LEGAL);
    const F3 = nextTrip(FOLK);
    const I3 = nextTrip(INTL);

    const [dT0, dT1, dT2] = T3.map(([, d]) => dateDiff(todayStr, d));
    const [dL0, dL1, dL2] = L3.map(([, d]) => dateDiff(todayStr, d));
    const [dF0, dF1, dF2] = F3.map(([, d]) => dateDiff(todayStr, d));
    const [dI0, dI1, dI2] = I3.map(([, d]) => dateDiff(todayStr, d));

    /* ───────────────── 等待外链标题 / 祝词 / 黄历详情 ───────────────── */

    const [titlesRaw, blessRaw, almanacDetail] = await Promise.all([
        titlesPromise,
        blessPromise,
        almanacPromise
    ]);

    const titlesArr = Array.isArray(titlesRaw) && titlesRaw.length ? titlesRaw : defaultTitles;
    const blessMap = blessRaw && typeof blessRaw === "object" ? blessRaw : defaultBless;

    /* ───────────────── 正日提醒（法定 + 民俗） ───────────────── */

    const notifyIfToday = (name, date) => {
        if (!hasStore || !hasNotify) return;
        if (dateDiff(todayStr, date) === 0 && now.getHours() >= 6) {
            const key = "timecardpushed_" + date;
            if ($persistentStore.read(key) !== "1") {
                $persistentStore.write("1", key);
                const words = blessMap[name] || "节日快乐！";
                $notification.post(`🎉 今天是 ${date} ${name}`, "", words);
            }
        }
    };

    notifyIfToday(L3[0][0], L3[0][1]);
    notifyIfToday(F3[0][0], F3[0][1]);

    /* ───────────────── 面板标题 ───────────────── */

    const pickTitle = (nextName, daysToNext) => {
        // 节日本日：除非强制 random，否则固定提示语
        if (daysToNext === 0 && titleMode !== "random") {
            return `今天是 ${nextName}，enjoy`;
        }

        const pool = titlesArr.length ? titlesArr : defaultTitles;
        if (!pool.length) return "今日黄历";

        let idx;

        if (titleMode === "random" || !hasStore) {
            idx = Math.floor(Math.random() * pool.length);
        } else {
            const key = `${TAG}_title_index_${todayStr}`;
            const saved = $persistentStore.read(key);
            const num = saved != null ? parseInt(saved, 10) : NaN;
            if (!isNaN(num) && num >= 0 && num < pool.length) {
                idx = num;
            } else {
                idx = Math.floor(Math.random() * pool.length);
                $persistentStore.write(String(idx), key);
            }
        }

        const raw = String(pool[idx] || "");

        return raw
            .replaceAll("{lunar}", titleLunar)
            .replaceAll("{solar}", titleSolar)
            .replaceAll("{next}", nextName ? `下一个：${nextName}` : "");
    };

    // 最近节日（法定 + 民俗 + 国际，不含节气）
    let nearest = [L3[0], dL0];
    if (dF0 < nearest[1]) nearest = [F3[0], dF0];
    if (dI0 < nearest[1]) nearest = [I3[0], dI0];

    /* ───────────────── 四行内容 ───────────────── */

    const render3 = (a0, a1, a2, d0, d1, d2) => {
        if (d0 === 0) {
            return `今天：${a0[0]} | ${a1[0]}${d1}天 | ${a2[0]}${d2}天`;
        }
        return `${a0[0]}${d0}天 | ${a1[0]}${d1}天 | ${a2[0]}${d2}天`;
    };

    const lineLegal = render3(L3[0], L3[1], L3[2], dL0, dL1, dL2);
    const lineTerm = render3(T3[0], T3[1], T3[2], dT0, dT1, dT2);
    const lineFolk = render3(F3[0], F3[1], F3[2], dF0, dF1, dF2);
    const lineIntl = render3(I3[0], I3[1], I3[2], dI0, dI1, dI2);

    const blockFest = [
        lineLegal,
        lineTerm,
        lineFolk,
        lineIntl
    ].join(gapBetween);

    const content = almanacDetail
        ? `${almanacDetail}\n\n${blockFest}`
        : blockFest;

    /* ───────────────── 播报模式（Cron / 无参数） ───────────────── */

    if (IS_CRON) {
        if (typeof $notification !== "undefined") {
            if (almanacDetail) {
                const lines = almanacDetail.split("\n");
                const headerLine = lines[0] || "";
                const yiLine = lines.find(l => l.startsWith("✅")) || "";
                const jiLine = lines.find(l => l.startsWith("❎")) || "";

                const body =
                    [yiLine, jiLine].filter(Boolean).join("\n") || almanacDetail;

                $notification.post(
                    "📅 今日黄历",
                    headerLine.replace(/^干支纪法[:：]?\s*/, ""),
                    body
                );
            } else {
                $notification.post(
                    "📅 今日黄历",
                    "",
                    "黄历详情获取失败，请稍后再试。"
                );
            }
        }
        $done();
        return;
    }

    /* ───────────────── 面板模式（有参数） ───────────────── */

    log(
        "done SHOW_ALMANAC =", showAlmanac,
        "TITLE_MODE =", titleMode,
        "content head =", content.split("\n").slice(0, 3).join("\\n")
    );

    $done({
        title: pickTitle(nearest[0][0], nearest[1]),
        icon: ICON,
        "icon-color": COLOR,
        content
    });

})().catch(e => {
    // 兜底异常处理，面板不至于挂掉
    const msg = e && e.stack || String(e);
    if (typeof console !== "undefined" && console.log) {
        console.log("[today_almanac] fatal error:", msg);
    }
    $done({
        title: "今日黄历",
        icon: "calendar",
        "icon-color": "#FF9800",
        content: "黄历脚本执行异常，请稍后再试。"
    });
});
