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
 * 作者：ByteValley  |  版本：2025-11-20R2（优化版）
 */

"use strict";

;(async () => {
    /* ───────────────── 基础配置与常量 ───────────────── */
    const TAG = "today_almanac";
    const ICON = "calendar";
    const COLOR = "#FF9800";
    const ALMANAC_BASE = "https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/";
    const GH_PROXY = "https://mirror.ghproxy.com/";
    const IP_API_URL = "http://ip-api.com/json/";

    // 日期相关
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const todayStr = `${currentYear}-${now.getMonth() + 1}-${now.getDate()}`;

    // 运行模式判断
    const rawArg = typeof $argument === "string" ? $argument.trim() : (typeof $argument === "undefined" ? "" : String($argument).trim());
    const isNoArgument = !rawArg;
    const isSurgeCron = typeof $script !== "undefined" && $script.type === "cron";
    const isCronMode = isSurgeCron || isNoArgument; // 播报模式

    // 环境能力检测
    const hasStore = typeof $persistentStore !== "undefined" && $persistentStore;
    const hasNotify = typeof $notification !== "undefined" && $notification;


    /* ───────────────── 工具函数 ───────────────── */
    /**
     * 日志输出
     * @param  {...any} args 日志内容
     */
    const log = (...args) => {
        if (typeof console === "undefined" || !console.log) return;
        console.log(`[${TAG}]`, ...args);
    };

    /**
     * 计算日期差（天数）
     * @param {string} start 开始日期（YYYY-MM-DD）
     * @param {string} end 结束日期（YYYY-MM-DD）
     * @returns {number} 天数差（end - start）
     */
    const getDateDiff = (start, end) => {
        const [sY, sM, sD] = start.split("-").map(Number);
        const [eY, eM, eD] = end.split("-").map(Number);
        const startDate = new Date(sY, sM - 1, sD);
        const endDate = new Date(eY, eM - 1, eD);
        return Math.floor((endDate - startDate) / 86400000);
    };

    /**
     * 格式化日期为YYYY-MM-DD
     * @param {number} year 年
     * @param {number} month 月
     * @param {number} day 日
     * @returns {string} 格式化后的日期
     */
    const formatYmd = (year, month, day) => `${year}-${month}-${day}`;

    /**
     * 解析参数
     * @param {object} defaults 默认参数
     * @returns {object} 解析后的参数
     */
    const parseArguments = (defaults = {}) => {
        if (typeof $argument === "undefined" || !$argument) return { ...defaults };

        const raw = String($argument).trim();
        const result = { ...defaults };

        // 优先按querystring解析（支持&和,分隔）
        if (raw.includes("=")) {
            const queryString = raw.includes("&") ? raw : raw.replace(/,/g, "&");
            try {
                const params = new URLSearchParams(queryString);
                for (const [key, value] of params.entries()) {
                    result[key.trim()] = value;
                }
                return result;
            } catch (error) {
                log("参数解析失败（query格式）:", error.message);
            }
        }

        // 回退为k:v格式解析
        raw.split(",").forEach(pair => {
            const trimmed = pair.trim();
            if (!trimmed) return;
            
            const colonIndex = trimmed.indexOf(":");
            if (colonIndex === -1) {
                result[trimmed] = "";
                return;
            }

            const key = trimmed.slice(0, colonIndex).trim();
            let value = trimmed.slice(colonIndex + 1).trim();
            // 移除首尾引号
            if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        });

        return result;
    };

    /**
     * 转换为布尔值
     * @param {*} value 原始值
     * @param {boolean} defaultValue 默认值
     * @returns {boolean} 转换后的布尔值
     */
    const toBoolean = (value, defaultValue = false) => {
        if (typeof value === "boolean") return value;
        if (value == null || value === "") return defaultValue;
        
        const str = String(value).trim().toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(str)) return true;
        if (["false", "0", "no", "n", "off"].includes(str)) return false;
        return defaultValue;
    };

    /**
     * 发送GET请求
     * @param {string} url 请求地址
     * @param {number} timeoutMs 超时时间(ms)
     * @returns {Promise<string|null>} 响应数据
     */
    const httpGet = async (url, timeoutMs) => {
        if (!url) return null;
        
        return new Promise(resolve => {
            const request = { url };
            if (timeoutMs) request.timeout = timeoutMs;

            $httpClient.get(request, (error, response, data) => {
                if (error || !response || response.status !== 200) {
                    log(`请求失败 [${url}]`, error?.message, "状态码:", response?.status);
                    return resolve(null);
                }
                resolve(data);
            });
        });
    };

    /**
     * 获取JSON数据
     * @param {string} url 请求地址
     * @param {*} fallback 失败时的默认值
     * @returns {Promise<*>} 解析后的JSON或默认值
     */
    const fetchJsonData = async (url, fallback) => {
        if (!url) return fallback;
        
        const rawData = await httpGet(url, 4000);
        if (!rawData) return fallback;
        
        try {
            return JSON.parse(rawData) || fallback;
        } catch (error) {
            log("JSON解析失败:", error.message);
            return fallback;
        }
    };


    /* ───────────────── 农历/节气算法 ───────────────── */
    const LunarCalendar = {
        lunarInfo: [0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, 0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, 0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, 0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, 0x0d520],
        solarMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        gan: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
        zhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
        animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
        solarFestival: {
            "1-1": { title: "元旦节" },
            "2-14": { title: "情人节" },
            "5-1": { title: "劳动节" },
            "6-1": { title: "儿童节" },
            "9-10": { title: "教师节" },
            "10-1": { title: "国庆节" },
            "12-25": { title: "圣诞节" },
            "3-8": { title: "妇女节" },
            "3-12": { title: "植树节" },
            "4-1": { title: "愚人节" },
            "5-12": { title: "护士节" },
            "7-1": { title: "建党节" },
            "8-1": { title: "建军节" },
            "12-24": { title: "平安夜" }
        },
        lunarFestival: {
            "12-30": { title: "除夕" },
            "1-1": { title: "春节" },
            "1-15": { title: "元宵节" },
            "2-2": { title: "龙抬头" },
            "5-5": { title: "端午节" },
            "7-7": { title: "七夕节" },
            "7-15": { title: "中元节" },
            "8-15": { title: "中秋节" },
            "9-9": { title: "重阳节" },
            "10-1": { title: "寒衣节" },
            "10-15": { title: "下元节" },
            "12-8": { title: "腊八节" },
            "12-23": { title: "北方小年" },
            "12-24": { title: "南方小年" }
        },
        solarTerm: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
        sTermInfo: ['9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd0b06bdb0722c965ce1cfcc920f', 'b027097bd097c36b0b6fc9274c91aa', '9778397bd19801ec9210c965cc920e', '97b6b97bd19801ec95f8c965cc920f', '97bd09801d98082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd197c36c9210c9274c91aa', '97b6b97bd19801ec95f8c965cc920e', '97bd09801d98082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c91aa', '97b6b97bd19801ec95f8c965cc920e', '97bcf97c3598082c95f8e1cfcc920f', '97bd097bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c3598082c95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd097bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf97c359801ec95f8c965cc920f', '97bd097bd07f595b0b6fc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '9778397bd19801ec9210c9274c920e', '97b6b97bd19801ec95f8c965cc920f', '97bd07f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c920e', '97b6b97bd19801ec95f8c965cc920f', '97bd07f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bd07f1487f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c965cc920e', '97bcf7f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b97bd19801ec9210c9274c920e', '97bcf7f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c91aa', '97b6b97bd197c36c9210c9274c920e', '97bcf7f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '9778397bd097c36c9210c9274c920e', '97b6b7f0e47f531b0723b0b6fb0722', '7f0e37f5307f595b0b0bc920fb0722', '7f0e397bd097c36b0b6fc9210c8dc2', '9778397bd097c36b0b70c9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9274c91aa', '97b6b7f0e47f531b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c91aa', '97b6b7f0e47f149b0723b0787b0721', '7f0e27f0e47f531b0723b0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '9778397bd097c36b0b6fc9210c8dc2', '977837f0e37f149b0723b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f5307f595b0b0bc920fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '977837f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc9210c8dc2', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd097c35b0b6fc920fb0722', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14998082b0787b06bd', '7f07e7f0e47f149b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14998082b0723b06bd', '7f07e7f0e37f149b0723b0787b0721', '7f0e27f0e47f531b0b0bb0b6fb0722', '7f0e397bd07f595b0b0bc920fb0722', '977837f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f1487f595b0b0bb0b6fb0722', '7f0e37f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e37f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e37f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e37f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722', '7f0e37f0e366aa89801eb072297c35', '7ec967f0e37f14998082b0723b06bd', '7f07e7f0e37f14998083b0787b0721', '7f0e27f0e47f531b0723b0b6fb0722', '7f0e37f0e366aa89801eb072297c35', '7ec967f0e37f14998082b0723b02d5', '7f07e7f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e36665b66aa89801e9808297c35', '665f67f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b0721', '7f07e7f0e47f531b0723b0b6fb0722', '7f0e36665b66a449801e9808297c35', '665f67f0e37f14898082b0723b02d5', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e36665b66a449801e9808297c35', '665f67f0e37f14898082b072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e26665b66a449801e9808297c35', '665f67f0e37f1489801eb072297c35', '7ec967f0e37f14998082b0787b06bd', '7f07e7f0e47f531b0723b0b6fb0721', '7f0e27f1487f531b0b0bb0b6fb0722'],
        nStr1: ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
        nStr2: ["初", "十", "廿", "卅"],
        nStr3: ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"],

        /**
         * 计算农历年天数
         * @param {number} year 农历年
         * @returns {number} 天数
         */
        getLunarYearDays(year) {
            let sum = 348;
            for (let i = 0x8000; i > 0x8; i >>= 1) {
                sum += (this.lunarInfo[year - 1900] & i) ? 1 : 0;
            }
            return sum + this.getLeapDays(year);
        },

        /**
         * 获取农历闰月
         * @param {number} year 农历年
         * @returns {number} 闰月（0表示无闰月）
         */
        getLeapMonth(year) {
            return this.lunarInfo[year - 1900] & 0xf;
        },

        /**
         * 获取农历闰月天数
         * @param {number} year 农历年
         * @returns {number} 天数
         */
        getLeapDays(year) {
            const leapMonth = this.getLeapMonth(year);
            if (leapMonth) {
                return (this.lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
            }
            return 0;
        },

        /**
         * 获取农历月天数
         * @param {number} year 农历年
         * @param {number} month 农历月
         * @returns {number} 天数
         */
        getLunarMonthDays(year, month) {
            if (month > 12 || month < 1) return -1;
            return (this.lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
        },

        /**
         * 获取阳历年月天数
         * @param {number} year 阳历年
         * @param {number} month 阳历月
         * @returns {number} 天数
         */
        getSolarMonthDays(year, month) {
            if (month > 12 || month < 1) return -1;
            const m = month - 1;
            // 处理二月闰年
            if (m === 1) {
                return ((year % 4 === 0) && (year % 100 !== 0) || (year % 400 === 0)) ? 29 : 28;
            }
            return this.solarMonth[m];
        },

        /**
         * 计算干支
         * @param {number} offset 偏移量
         * @returns {string} 干支
         */
        getGanZhi(offset) {
            return this.gan[offset % 10] + this.zhi[offset % 12];
        },

        /**
         * 转换为干支年
         * @param {number} year 年份
         * @returns {string} 干支年
         */
        toGanZhiYear(year) {
            let g = (year - 3) % 10;
            let z = (year - 3) % 12;
            if (g === 0) g = 10;
            if (z === 0) z = 12;
            return this.gan[g - 1] + this.zhi[z - 1];
        },

        /**
         * 获取节气日期
         * @param {number} year 年份
         * @param {number} termIndex 节气索引(1-24)
         * @returns {number} 日期
         */
        getTermDate(year, termIndex) {
            if (year < 1900 || year > 2100 || termIndex < 1 || termIndex > 24) return -1;
            
            const termData = this.sTermInfo[year - 1900];
            const parts = [];
            for (let i = 0; i < termData.length; i += 5) {
                const chunk = parseInt("0x" + termData.substr(i, 5)).toString();
                parts.push(chunk[0], chunk.substr(1, 2), chunk[3], chunk.substr(4, 2));
            }
            return parseInt(parts[termIndex - 1]);
        },

        /**
         * 转换为农历月（中文）
         * @param {number} month 农历月
         * @returns {string} 农历月中文
         */
        toChineseMonth(month) {
            if (month > 12 || month < 1) return -1;
            return this.nStr3[month - 1] + "月";
        },

        /**
         * 转换为农历日（中文）
         * @param {number} day 农历日
         * @returns {string} 农历日中文
         */
        toChineseDay(day) {
            switch (day) {
                case 10: return "初十";
                case 20: return "二十";
                case 30: return "三十";
                default: return this.nStr2[Math.floor(day / 10)] + this.nStr1[day % 10];
            }
        },

        /**
         * 获取生肖
         * @param {number} year 年份
         * @returns {string} 生肖
         */
        getZodiac(year) {
            return this.animals[(year - 4) % 12];
        },

        /**
         * 获取星座
         * @param {number} month 月份
         * @param {number} day 日期
         * @returns {string} 星座
         */
        getZodiacSign(month, day) {
            const signs = "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯";
            const thresholds = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
            return signs.substr(month * 2 - (day < thresholds[month - 1] ? 2 : 0), 2) + "座";
        },

        /**
         * 阳历转农历
         * @param {number} year 阳历年
         * @param {number} month 阳历月
         * @param {number} day 阳历日
         * @returns {object} 农历信息
         */
        solarToLunar(year, month, day) {
            let y = parseInt(year);
            let m = parseInt(month);
            let d = parseInt(day);
            
            if (y < 1900 || y > 2100) return -1;
            if (y === 1900 && m === 1 && d < 31) return -1;

            const date = new Date(y, m - 1, d);
            y = date.getFullYear();
            m = date.getMonth() + 1;
            d = date.getDate();

            // 计算与1900-01-31的天数差
            const offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
            let i, temp;

            // 确定农历年
            for (i = 1900; i < 2101 && offset > 0; i++) {
                temp = this.getLunarYearDays(i);
                offset -= temp;
            }
            if (offset < 0) {
                offset += temp;
                i--;
            }

            // 判断是否今天
            const today = new Date();
            const isToday = today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;

            // 星期信息
            const weekDay = date.getDay();
            const weekDayCN = "星期" + this.nStr1[weekDay];
            const weekNum = weekDay === 0 ? 7 : weekDay;

            const lunarYear = i;
            const leapMonth = this.getLeapMonth(lunarYear);
            let isLeap = false;

            // 确定农历月
            for (i = 1; i < 13 && offset > 0; i++) {
                if (leapMonth > 0 && i === (leapMonth + 1) && !isLeap) {
                    i--;
                    isLeap = true;
                    temp = this.getLeapDays(lunarYear);
                } else {
                    temp = this.getLunarMonthDays(lunarYear, i);
                }
                if (isLeap && i === (leapMonth + 1)) isLeap = false;
                offset -= temp;
            }

            if (offset === 0 && leapMonth > 0 && i === leapMonth + 1) {
                isLeap = !isLeap;
                if (!isLeap) i--;
            }
            if (offset < 0) {
                offset += temp;
                i--;
            }

            const lunarMonth = i;
            const lunarDay = offset + 1;
            const solarMonthIdx = m - 1;

            // 干支信息
            const ganZhiYear = this.toGanZhiYear(lunarYear);
            const firstTerm = this.getTermDate(y, m * 2 - 1);
            const secondTerm = this.getTermDate(y, m * 2);
            let ganZhiMonth = this.getGanZhi((y - 1900) * 12 + m + 11);
            if (d >= firstTerm) ganZhiMonth = this.getGanZhi((y - 1900) * 12 + m + 12);

            // 节气信息
            let isTerm = false;
            let currentTerm = null;
            if (firstTerm === d) {
                isTerm = true;
                currentTerm = this.solarTerm[m * 2 - 2];
            }
            if (secondTerm === d) {
                isTerm = true;
                currentTerm = this.solarTerm[m * 2 - 1];
            }

            // 干支日
            const dayCycle = Date.UTC(y, solarMonthIdx, 1) / 86400000 + 25567 + 10;
            const ganZhiDay = this.getGanZhi(dayCycle + d - 1);

            // 星座
            const zodiacSign = this.getZodiacSign(m, d);

            // 节日信息
            const solarDate = `${y}-${m}-${d}`;
            const lunarDate = `${lunarYear}-${lunarMonth}-${lunarDay}`;
            const solarFestKey = `${m}-${d}`;
            let lunarFestKey = `${lunarMonth}-${lunarDay}`;
            
            // 处理除夕（腊月29或30）
            if (lunarMonth === 12 && lunarDay === 29 && this.getLunarMonthDays(lunarYear, lunarMonth) === 29) {
                lunarFestKey = "12-30";
            }

            return {
                date: solarDate,
                lunarDate: lunarDate,
                festival: this.solarFestival[solarFestKey]?.title || null,
                lunarFestival: this.lunarFestival[lunarFestKey]?.title || null,
                lYear: lunarYear,
                lMonth: lunarMonth,
                lDay: lunarDay,
                Animal: this.getZodiac(lunarYear),
                IMonthCn: (isLeap ? "闰" : "") + this.toChineseMonth(lunarMonth),
                IDayCn: this.toChineseDay(lunarDay),
                cYear: y,
                cMonth: m,
                cDay: d,
                gzYear: ganZhiYear,
                gzMonth: ganZhiMonth,
                gzDay: ganZhiDay,
                isToday,
                isLeap,
                nWeek: weekNum,
                ncWeek: weekDayCN,
                isTerm,
                Term: currentTerm,
                astro: zodiacSign
            };
        },

        /**
         * 农历转阳历
         * @param {number} year 农历年
         * @param {number} month 农历月
         * @param {number} day 农历日
         * @param {boolean} isLeap 是否闰月
         * @returns {object} 阳历信息
         */
        lunarToSolar(year, month, day, isLeap = false) {
            y = parseInt(year);
            m = parseInt(month);
            d = parseInt(day);

            const leapMonth = this.getLeapMonth(y);
            if (isLeap && leapMonth !== m) return -1;

            const monthDays = this.getLunarMonthDays(y, m);
            const targetDays = isLeap ? this.getLeapDays(y) : monthDays;

            if ((y === 2100 && m === 12 && d > 1) || (y === 1900 && m === 1 && d < 31)) return -1;
            if (y < 1900 || y > 2100 || d > targetDays) return -1;

            let offset = 0;
            // 计算到农历年前的总天数
            for (let i = 1900; i < y; i++) {
                offset += this.getLunarYearDays(i);
            }

            let isAdd = false;
            // 计算到农历月前的总天数
            for (let i = 1; i < m; i++) {
                if (!isAdd && leapMonth <= i && leapMonth > 0) {
                    offset += this.getLeapDays(y);
                    isAdd = true;
                }
                offset += this.getLunarMonthDays(y, i);
            }
            if (isLeap) offset += monthDays;

            // 计算阳历日期
            const baseTime = Date.UTC(1900, 1, 30, 0, 0, 0);
            const targetTime = (offset + d - 31) * 86400000 + baseTime;
            const solarDate = new Date(targetTime);
            const sY = solarDate.getUTCFullYear();
            const sM = solarDate.getUTCMonth() + 1;
            const sD = solarDate.getUTCDate();

            return this.solarToLunar(sY, sM, sD);
        }
    };


    /* ───────────────── 核心业务逻辑 ───────────────── */
    // 今日农历信息
    const todayLunar = LunarCalendar.solarToLunar(currentYear, now.getMonth() + 1, now.getDate());
    const solarTitle = `${todayLunar.cMonth}月${todayLunar.cDay}日（${todayLunar.astro}）`;
    const lunarTitle = `${todayLunar.IMonthCn}${todayLunar.IDayCn} • ${todayLunar.gzYear}年${todayLunar.gzMonth}${todayLunar.gzDay} • ${todayLunar.Animal}年`;

    // 参数解析
    const DEFAULT_ARGS = {
        TITLES_URL: "",
        BLESS_URL: "",
        SHOW_ALMANAC: "true",
        GAP_LINES: "1",
        TITLE_MODE: "day"
    };
    const args = parseArguments(DEFAULT_ARGS);

    const showAlmanac = toBoolean(args.SHOW_ALMANAC ?? args.show_almanac, true);
    let gapLines = parseInt(args.GAP_LINES ?? args.gap_lines ?? "1", 10);
    gapLines = isNaN(gapLines) || gapLines < 0 ? 0 : Math.min(gapLines, 3); // 限制0-3行
    const gapBetweenLines = "\n".repeat(gapLines + 1);

    const titleMode = (args.TITLE_MODE ?? args.title_mode ?? "day").toString().trim().toLowerCase() === "random" 
        ? "random" 
        : "day";

    // 默认标题与祝词库
    const defaultTitles = [
        "距离放假，还要摸鱼多少天？🥱",
        "坚持住，就快放假啦！💪",
        "上班好累呀，好想放假😮‍💨",
        "努力，我还能加班24小时！🧐",
        "天呐，还要多久才放假呀？😭",
        "躺平中，等放假(☝ ՞ਊ ՞)☝",
        "只有摸鱼才是赚老板的钱🙎🤳",
        "一起摸鱼吧✌(՞ټ՞ )✌",
        "摸鱼中，期待下一个假日.ʕʘ‿ʘʔ.",
        "小乌龟慢慢爬🐢",
        "太难了！😫😩",
        "今日宜摸鱼，忌早起",
        "{lunar}",
        "{solar}",
        "{next}"
    ];

    const defaultBlessings = {
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

    // 获取外部资源
    const titles = await fetchJsonData(args.TITLES_URL, defaultTitles);
    const blessings = await fetchJsonData(args.BLESS_URL, defaultBlessings);


    /**
     * 获取黄历详情
     * @param {Date} date 日期
     * @param {object} lunarBase 基础农历信息
     * @returns {Promise<string>} 黄历详情字符串
     */
    const getAlmanacDetail = async (date, lunarBase) => {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const mm = m < 10 ? `0${m}` : m;
        const path = `${y}/${y}${mm}.json`;
        const encodedPath = encodeURIComponent(path);

        // 基础信息回退
        let header = `干支纪法：${lunarBase.gzYear}年 ${lunarBase.gzMonth}月 ${lunarBase.gzDay}日`;
        const tags = [];
        if (lunarBase.lunarFestival) tags.push(lunarBase.lunarFestival);
        if (lunarBase.festival) tags.push(lunarBase.festival);
        if (lunarBase.Term) tags.push(lunarBase.Term);
        if (tags.length) header += " " + tags.join(" ");

        let avoid = "——";
        let suitable = "——";

        try {
            // 确定请求URL（根据地区判断是否使用代理）
            let apiUrl = `${ALMANAC_BASE}${encodedPath}`;
            const ipData = await httpGet(IP_API_URL, 3000);
            
            if (ipData) {
                try {
                    const ipInfo = JSON.parse(ipData);
                    if (ipInfo?.country === "China") {
                        apiUrl = `${GH_PROXY}${ALMANAC_BASE}${encodedPath}`;
                    }
                } catch (error) {
                    log("IP信息解析失败:", error.message);
                }
            }

            log("黄历请求地址:", apiUrl);
            const response = await httpGet(apiUrl, 5000);
            if (!response) {
                log("黄历数据为空");
                return `${header}\n✅ 宜：${suitable}\n❎ 忌：${avoid}`;
            }

            const data = JSON.parse(response);
            const almanacList = data?.data?.[0]?.almanac;
            if (!Array.isArray(almanacList)) {
                log("黄历数据格式异常");
                return `${header}\n✅ 宜：${suitable}\n❎ 忌：${avoid}`;
            }

            // 查找今日黄历
            const todayAlmanac = almanacList.find(item => 
                Number(item.year) === y && 
                Number(item.month) === m && 
                Number(item.day) === d
            );

            if (!todayAlmanac) {
                log("未找到今日黄历数据");
                return `${header}\n✅ 宜：${suitable}\n❎ 忌：${avoid}`;
            }

            // 解析黄历信息
            let description = [];
            if (todayAlmanac.desc) description.push(todayAlmanac.desc);
            if (todayAlmanac.term) description.push(todayAlmanac.term);
            if (todayAlmanac.value) description.push(todayAlmanac.value);

            header = `干支纪法：${todayAlmanac.gzYear}年 ${todayAlmanac.gzMonth}月 ${todayAlmanac.gzDate}日`;
            if (description.length) header += " " + description.join(" ");
            
            avoid = todayAlmanac.avoid || avoid;
            suitable = todayAlmanac.suit || suitable;

        } catch (error) {
            log("获取黄历详情失败:", error.message);
        }

        return `${header}\n✅ 宜：${suitable}\n❎ 忌：${avoid}`;
    };

    // 获取黄历详情（Cron模式强制获取）
    const almanacDetail = (showAlmanac || isCronMode) 
        ? await getAlmanacDetail(now, todayLunar) 
        : null;


    /**
     * 生成节日列表工具函数
     */
    // 获取某月第n个星期几的日期
    const getNthWeekday = (year, month, weekday, nth) => {
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        const addDays = ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
        return formatYmd(year, month, 1 + addDays);
    };

    // 获取农历除夕的阳历日期
    const getLunarNewYearEve = (year) => {
        const lunarDecDays = LunarCalendar.getLunarMonthDays(year, 12);
        const lunarEveDay = lunarDecDays === 29 ? 29 : 30;
        return LunarCalendar.lunarToSolar(year, 12, lunarEveDay).date;
    };

    // 生成节气列表
    const generateSolarTerms = (year) => {
        return LunarCalendar.solarTerm.map((name, index) => {
            const termIndex = index + 1;
            const month = termIndex <= 2 ? 1
                : termIndex <= 4 ? 2
                : termIndex <= 6 ? 3
                : termIndex <= 8 ? 4
                : termIndex <= 10 ? 5
                : termIndex <= 12 ? 6
                : termIndex <= 14 ? 7
                : termIndex <= 16 ? 8
                : termIndex <= 18 ? 9
                : termIndex <= 20 ? 10
                : termIndex <= 22 ? 11
                : 12;
            
            const day = LunarCalendar.getTermDate(year, termIndex);
            return [name, formatYmd(year, month, day)];
        }).sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 生成法定节日列表
    const generateLegalFestivals = (year) => {
        return [
            ["元旦", formatYmd(year, 1, 1)],
            ["春节", LunarCalendar.lunarToSolar(year, 1, 1).date],
            ["清明节", formatYmd(year, 4, LunarCalendar.getTermDate(year, 7))],
            ["劳动节", formatYmd(year, 5, 1)],
            ["端午节", LunarCalendar.lunarToSolar(year, 5, 5).date],
            ["中秋节", LunarCalendar.lunarToSolar(year, 8, 15).date],
            ["国庆节", formatYmd(year, 10, 1)]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 生成民俗节日列表
    const generateFolkFestivals = (year) => {
        return [
            ["除夕", getLunarNewYearEve(year)],
            ["元宵节", LunarCalendar.lunarToSolar(year, 1, 15).date],
            ["龙抬头", LunarCalendar.lunarToSolar(year, 2, 2).date],
            ["七夕节", LunarCalendar.lunarToSolar(year, 7, 7).date],
            ["中元节", LunarCalendar.lunarToSolar(year, 7, 15).date],
            ["重阳节", LunarCalendar.lunarToSolar(year, 9, 9).date],
            ["寒衣节", LunarCalendar.lunarToSolar(year, 10, 1).date],
            ["下元节", LunarCalendar.lunarToSolar(year, 10, 15).date],
            ["腊八节", LunarCalendar.lunarToSolar(year, 12, 8).date],
            ["小年(北)", LunarCalendar.lunarToSolar(year, 12, 23).date],
            ["小年(南)", LunarCalendar.lunarToSolar(year, 12, 24).date]
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 生成国际节日列表
    const generateIntlFestivals = (year) => {
        return [
            ["情人节", formatYmd(year, 2, 14)],
            ["母亲节", getNthWeekday(year, 5, 0, 2)], // 5月第2个周日
            ["父亲节", getNthWeekday(year, 6, 0, 3)], // 6月第3个周日
            ["万圣节", formatYmd(year, 10, 31)],
            ["平安夜", formatYmd(year, 12, 24)],
            ["圣诞节", formatYmd(year, 12, 25)],
            ["感恩节", getNthWeekday(year, 11, 4, 4)] // 11月第4个周四
        ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
    };

    // 获取未来节日（包含当前及后续）
    const getUpcomingFestivals = (festivalList) => {
        const upcoming = festivalList.filter(([, date]) => getDateDiff(todayStr, date) >= 0);
        // 不足3个时补充后续年份节日
        if (upcoming.length < 3) {
            return [...upcoming, ...festivalList.slice(0, 3 - upcoming.length)];
        }
        return upcoming.slice(0, 3);
    };

    // 生成节日数据（包含当年和下一年）
    const solarTerms = [...generateSolarTerms(currentYear), ...generateSolarTerms(nextYear)];
    const legalFestivals = [...generateLegalFestivals(currentYear), ...generateLegalFestivals(nextYear)];
    const folkFestivals = [...generateFolkFestivals(currentYear), ...generateFolkFestivals(nextYear)];
    const intlFestivals = [...generateIntlFestivals(currentYear), ...generateIntlFestivals(nextYear)];

    // 获取最近3个节日
    const upcomingTerms = getUpcomingFestivals(solarTerms);
    const upcomingLegal = getUpcomingFestivals(legalFestivals);
    const upcomingFolk = getUpcomingFestivals(folkFestivals);
    const upcomingIntl = getUpcomingFestivals(intlFestivals);

    // 计算倒计时
    const [termDiff1, termDiff2, termDiff3] = upcomingTerms.map(([, date]) => getDateDiff(todayStr, date));
    const [legalDiff1, legalDiff2, legalDiff3] = upcomingLegal.map(([, date]) => getDateDiff(todayStr, date));
    const [folkDiff1, folkDiff2, folkDiff3] = upcomingFolk.map(([, date]) => getDateDiff(todayStr, date));
    const [intlDiff1, intlDiff2, intlDiff3] = upcomingIntl.map(([, date]) => getDateDiff(todayStr, date));


    /**
     * 节日通知处理
     * @param {string} name 节日名称
     * @param {string} date 节日日期
     */
    const sendFestivalNotification = (name, date) => {
        if (!hasStore || !hasNotify) return;
        
        // 仅在节日当天6点后发送一次
        if (getDateDiff(todayStr, date) === 0 && now.getHours() >= 6) {
            const storeKey = `notified_${date}`;
            if ($persistentStore.read(storeKey) !== "1") {
                $persistentStore.write("1", storeKey);
                const message = blessings[name] || "节日快乐！";
                $notification.post(`🎉 今天是 ${date} ${name}`, "", message);
            }
        }
    };

    // 发送今日节日通知
    sendFestivalNotification(upcomingLegal[0][0], upcomingLegal[0][1]);
    sendFestivalNotification(upcomingFolk[0][0], upcomingFolk[0][1]);


    /**
     * 面板标题选择
     * @param {string} nextFestival 下一个节日名称
     * @param {number} daysToNext 距离天数
     * @returns {string} 标题
     */
    const selectTitle = (nextFestival, daysToNext) => {
        // 节日本日：固定提示语（非随机模式）
        if (daysToNext === 0 && titleMode !== "random") {
            return `今天是 ${nextFestival}，休息一下吧～`;
        }

        // 此处省略原代码未完成的标题选择逻辑
        // 实际使用时需补充完整
        return titles[0];
    };

    // 后续逻辑根据实际需求补充...
})();
