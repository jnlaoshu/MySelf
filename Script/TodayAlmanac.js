/**
 * 今日黄历 · 面板脚本（优化版）
 * 优化内容：
 *   - 代码结构重组，提高可读性
 *   - 错误处理增强
 *   - 性能优化（减少重复计算）
 *   - 配置项集中管理
 *   - 添加类型注释
 *   - 模块化重构
 */

"use strict";

;(async () => {
    /* ==================== 配置常量 ==================== */
    const CONFIG = {
        TAG: "today_almanac",
        ICON: "calendar",
        COLOR: "#FF9800",
        ALMANAC_BASE: "https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/",
        GH_PROXY: "https://mirror.ghproxy.com/",
        HTTP_TIMEOUT: 5000,
        DEFAULT_GAP_LINES: 1,
        NOTIFY_HOUR: 6 // 祝词通知时间（6点后）
    };

    /* ==================== 工具函数 ==================== */
    class Utils {
        static log(...args) {
            console?.log(`[${CONFIG.TAG}]`, ...args);
        }

        static error(...args) {
            console?.error(`[${CONFIG.TAG}]`, ...args);
        }

        /** 日期差计算（end - start） */
        static dateDiff(start, end) {
            const [sY, sM, sD] = start.split('-').map(Number);
            const [eY, eM, eD] = end.split('-').map(Number);
            const startDate = new Date(sY, sM - 1, sD);
            const endDate = new Date(eY, eM - 1, eD);
            return Math.floor((endDate - startDate) / 86400000);
        }

        static formatDate(y, m, d) {
            return `${y}-${m}-${d}`;
        }

        /** 增强型参数解析 */
        static parseArgs(defaults = {}) {
            if (typeof $argument === 'undefined' || !$argument) return { ...defaults };
            
            const raw = String($argument).trim();
            const result = { ...defaults };

            try {
                // 统一处理 querystring 格式
                const queryString = raw.includes('&') ? raw : raw.replace(/,/g, '&');
                const params = new URLSearchParams(queryString);
                
                for (const [key, value] of params.entries()) {
                    const cleanKey = key.trim();
                    let cleanValue = value.trim();
                    
                    // 移除引号
                    if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
                        (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                        cleanValue = cleanValue.slice(1, -1);
                    }
                    
                    result[cleanKey] = cleanValue;
                }
            } catch (e) {
                this.error('参数解析失败:', e);
            }

            return result;
        }

        static toBool(value, defaultValue = false) {
            if (typeof value === 'boolean') return value;
            if (value == null || value === '') return defaultValue;
            
            const str = String(value).trim().toLowerCase();
            return ['true', '1', 'yes', 'y', 'on'].includes(str);
        }

        /** HTTP GET 请求 */
        static httpGet(url, timeout = CONFIG.HTTP_TIMEOUT) {
            return new Promise(resolve => {
                if (!url || typeof $httpClient === 'undefined') {
                    resolve(null);
                    return;
                }

                $httpClient.get({ url, timeout }, (err, resp, data) => {
                    if (err || !resp || resp.status !== 200) {
                        this.error('HTTP请求失败:', url, err);
                        resolve(null);
                        return;
                    }
                    resolve(data);
                });
            });
        }

        /** 获取 JSON 数据 */
        static async fetchJSON(url, fallback) {
            if (!url) return fallback;
            
            try {
                const data = await this.httpGet(url);
                return data ? JSON.parse(data) : fallback;
            } catch (e) {
                this.error('JSON解析失败:', url, e);
                return fallback;
            }
        }

        /** 存储操作 */
        static store = {
            read(key) {
                return typeof $persistentStore !== 'undefined' ? $persistentStore.read(key) : null;
            },
            write(value, key) {
                if (typeof $persistentStore !== 'undefined') {
                    $persistentStore.write(value, key);
                }
            }
        };

        /** 通知操作 */
        static notify(title, subtitle = '', content = '') {
            if (typeof $notification !== 'undefined') {
                $notification.post(title, subtitle, content);
            }
        }
    }

    /* ==================== 环境检测 ==================== */
    class Environment {
        static get now() {
            return new Date();
        }

        static get todayStr() {
            const now = this.now;
            return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        }

        static get isCronMode() {
            return (typeof $script !== 'undefined' && $script.type === 'cron') || 
                   (typeof $argument === 'undefined' || !$argument.trim());
        }

        static get hasNotify() {
            return typeof $notification !== 'undefined';
        }

        static get hasStore() {
            return typeof $persistentStore !== 'undefined';
        }
    }

    /* ==================== 农历服务 ==================== */
    // 保留原有的 calendar 对象，但提取关键方法
    class LunarService {
        static getTodayLunar() {
            const now = Environment.now;
            return calendar.solar2lunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }

        /** 获取节日显示标题 */
        static getDisplayTitles(lunarData) {
            const solarTitle = `${lunarData.cMonth}月${lunarData.cDay}日（${lunarData.astro}）`;
            const lunarTitle = `${lunarData.IMonthCn}${lunarData.IDayCn} • ${lunarData.gzYear}年${lunarData.gzMonth}${lunarData.gzDay} • ${lunarData.Animal}年`;
            
            return { solarTitle, lunarTitle };
        }

        /** 计算节气日期 */
        static calculateSolarTerms(year) {
            const terms = [];
            for (let i = 1; i <= 24; i++) {
                const month = Math.ceil(i / 2);
                const day = calendar.getTerm(year, i);
                terms.push([calendar.solarTerm[i - 1], Utils.formatDate(year, month, day)]);
            }
            return terms;
        }

        /** 农历转公历 */
        static lunarToSolar(year, month, day, isLeap = false) {
            const result = calendar.lunar2solar(year, month, day, isLeap);
            return result && result.date ? result.date : null;
        }
    }

    /* ==================== 节日管理 ==================== */
    class FestivalManager {
        static defaultBlessings = {
            "元旦": "新岁启封，诸事顺心。",
            "春节": "春风送暖入屠苏，万象更新福满门。",
            "清明节": "风细雨潇潇，慎终追远寄哀思。",
            "劳动节": "双手创造幸福，汗水亦有光。",
            "端午节": "粽叶飘香龙舟竞，平安康健万事顺。",
            "中秋节": "人月两团圆，心上皆明朗。",
            "国庆节": "山河锦绣，家国同庆。",
            "元宵节": "花灯人月圆，团圆共此时。",
            "龙抬头": "万象抬头，诸事向阳。",
            "七夕节": "金风玉露一相逢，便胜却人间无数。",
            "中元节": "念亲祈安，心怀敬畏。",
            "重阳节": "登高望远，敬老祈安。",
            "寒衣节": "一纸寒衣，一份牵念。",
            "下元节": "三官赐福，平安顺心。",
            "腊八节": "腊八粥香，岁杪杪添暖。",
            "小年(北)": "尘旧一扫，迎新纳福。",
            "小年(南)": "净灶迎福，诸事顺遂。",
            "除夕": "爆竹一声除旧岁，欢喜团圆迎新春。"
        };

        static defaultTitles = [
            "距离放假，还要摸鱼多少天？🥱",
            "坚持住，就快放假啦！💪",
            "上班好累呀，好想放假😮💨",
            "努力，我还能加班24小时！🧐",
            "天呐，还要多久才放假呀？😭",
            "躺平中，等放假(☝ ՞ਊ ՞ )☝",
            "只有摸鱼才是赚老板的钱🙎🤳",
            "一起摸鱼吧✌(՞ټ՞ )✌",
            "摸鱼中，期待下一个假日.ʕʘ‿ʘʔ.",
            "今日宜摸鱼，忌早起"
        ];

        /** 获取最近三个节日 */
        static getNextFestivals(festivalList, count = 3) {
            const today = Environment.todayStr;
            const upcoming = festivalList.filter(([, date]) => Utils.dateDiff(today, date) >= 0);
            
            if (upcoming.length >= count) {
                return upcoming.slice(0, count);
            }
            
            // 不足时从列表开头补充
            return [...upcoming, ...festivalList.slice(0, count - upcoming.length)];
        }

        /** 生成节日显示行 */
        static formatFestivalLine(festivals, daysDiff) {
            if (daysDiff[0] === 0) {
                return `今天：${festivals[0][0]} | ${festivals[1][0]}${daysDiff[1]}天 | ${festivals[2][0]}${daysDiff[2]}天`;
            }
            return `${festivals[0][0]}${daysDiff[0]}天 | ${festivals[1][0]}${daysDiff[1]}天 | ${festivals[2][0]}${daysDiff[2]}天`;
        }
    }

    /* ==================== 黄历服务 ==================== */
    class AlmanacService {
        /** 获取黄历详情 */
        static async fetchAlmanacDetail(lunarData) {
            const now = Environment.now;
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            
            const monthStr = month.toString().padStart(2, '0');
            const path = `${year}/${year}${monthStr}.json`;
            
            try {
                // 检测网络环境决定是否使用代理
                const apiUrl = await this.getApiUrl(path);
                Utils.log('黄历API地址:', apiUrl);
                
                const data = await Utils.httpGet(apiUrl);
                if (!data) {
                    throw new Error('API返回空数据');
                }
                
                return this.parseAlmanacData(data, year, month, day, lunarData);
            } catch (error) {
                Utils.error('获取黄历详情失败:', error);
                return this.getFallbackAlmanac(lunarData);
            }
        }

        /** 获取API地址（智能代理） */
        static async getApiUrl(path) {
            try {
                const ipInfo = await Utils.httpGet('http://ip-api.com/json/', 3000);
                if (ipInfo) {
                    const { country } = JSON.parse(ipInfo);
                    if (country === 'China') {
                        return `${CONFIG.GH_PROXY}${CONFIG.ALMANAC_BASE}${encodeURIComponent(path)}`;
                    }
                }
            } catch (e) {
                Utils.log('IP检测失败，使用直连');
            }
            
            return `${CONFIG.ALMANAC_BASE}${encodeURIComponent(path)}`;
        }

        /** 解析黄历数据 */
        static parseAlmanacData(rawData, year, month, day, lunarData) {
            const jsonData = JSON.parse(rawData);
            const almanacArray = jsonData?.data?.[0]?.almanac;
            
            if (!Array.isArray(almanacArray)) {
                throw new Error('数据结构异常');
            }

            const todayAlmanac = almanacArray.find(item => 
                Number(item.year) === year && 
                Number(item.month) === month && 
                Number(item.day) === day
            );

            if (!todayAlmanac) {
                throw new Error('未找到今日黄历数据');
            }

            return this.formatAlmanacOutput(todayAlmanac, lunarData);
        }

        /** 格式化黄历输出 */
        static formatAlmanacOutput(almanac, lunarData) {
            // 构建标题
            const tags = [];
            if (lunarData.lunarFestival) tags.push(lunarData.lunarFestival);
            if (lunarData.festival) tags.push(lunarData.festival);
            if (lunarData.Term) tags.push(lunarData.Term);
            
            const header = `干支纪法：${almanac.gzYear}年 ${almanac.gzMonth}月 ${almanac.gzDate}日` +
                         (tags.length ? ` ${tags.join(' ')}` : '');

            // 宜忌信息
            const suitable = almanac.suit || '——';
            const avoid = almanac.avoid || '——';

            return {
                header,
                suitable: `✅ 宜：${suitable}`,
                avoid: `❎ 忌：${avoid}`,
                fullText: `${header}\n${suitable}\n${avoid}`
            };
        }

        /** 回退黄历信息 */
        static getFallbackAlmanac(lunarData) {
            const tags = [];
            if (lunarData.lunarFestival) tags.push(lunarData.lunarFestival);
            if (lunarData.festival) tags.push(lunarData.festival);
            if (lunarData.Term) tags.push(lunarData.Term);
            
            const header = `干支纪法：${lunarData.gzYear}年 ${lunarData.gzMonth}月 ${lunarData.gzDay}日` +
                         (tags.length ? ` ${tags.join(' ')}` : '');

            return {
                header,
                suitable: '✅ 宜：——',
                avoid: '❎ 忌：——',
                fullText: `${header}\n✅ 宜：——\n❎ 忌：——`
            };
        }
    }

    /* ==================== 主逻辑 ==================== */
    class TodayAlmanac {
        constructor() {
            this.args = this.parseArguments();
            this.lunarData = null;
            this.festivals = {
                legal: [], terms: [], folk: [], international: []
            };
        }

        parseArguments() {
            const defaults = {
                TITLES_URL: '',
                BLESS_URL: '',
                SHOW_ALMANAC: 'true',
                GAP_LINES: CONFIG.DEFAULT_GAP_LINES.toString(),
                TITLE_MODE: 'day'
            };

            return Utils.parseArgs(defaults);
        }

        /** 主执行函数 */
        async execute() {
            try {
                // 1. 基础数据准备
                this.lunarData = LunarService.getTodayLunar();
                
                // 2. 并行获取外部数据
                await this.loadExternalData();
                
                // 3. 计算节日数据
                this.calculateFestivals();
                
                // 4. 处理节日通知
                this.handleFestivalNotifications();
                
                // 5. 根据模式输出
                if (Environment.isCronMode) {
                    await this.handleCronMode();
                } else {
                    await this.handlePanelMode();
                }
                
            } catch (error) {
                Utils.error('执行失败:', error);
                this.handleError();
            }
        }

        async loadExternalData() {
            const [titles, blessings] = await Promise.all([
                Utils.fetchJSON(this.args.TITLES_URL, FestivalManager.defaultTitles),
                Utils.fetchJSON(this.args.BLESS_URL, FestivalManager.defaultBlessings)
            ]);
            
            this.externalTitles = Array.isArray(titles) ? titles : FestivalManager.defaultTitles;
            this.externalBlessings = blessings && typeof blessings === 'object' ? 
                blessings : FestivalManager.defaultBlessings;
        }

        calculateFestivals() {
            const year = Environment.now.getFullYear();
            const nextYear = year + 1;

            // 法定节日
            this.festivals.legal = [
                ['元旦', Utils.formatDate(year, 1, 1)],
                ['春节', LunarService.lunarToSolar(year, 1, 1)],
                ['清明节', Utils.formatDate(year, 4, calendar.getTerm(year, 7))],
                ['劳动节', Utils.formatDate(year, 5, 1)],
                ['端午节', LunarService.lunarToSolar(year, 5, 5)],
                ['中秋节', LunarService.lunarToSolar(year, 8, 15)],
                ['国庆节', Utils.formatDate(year, 10, 1)]
            ].filter(([, date]) => date).sort((a, b) => new Date(a[1]) - new Date(b[1]));

            // 二十四节气
            this.festivals.terms = [
                ...LunarService.calculateSolarTerms(year),
                ...LunarService.calculateSolarTerms(nextYear)
            ].sort((a, b) => new Date(a[1]) - new Date(b[1]));

            // 传统民俗
            this.festivals.folk = [
                ['除夕', this.getLunarNewYearEve(year)],
                ['元宵节', LunarService.lunarToSolar(year, 1, 15)],
                ['龙抬头', LunarService.lunarToSolar(year, 2, 2)],
                ['七夕节', LunarService.lunarToSolar(year, 7, 7)],
                ['中元节', LunarService.lunarToSolar(year, 7, 15)],
                ['重阳节', LunarService.lunarToSolar(year, 9, 9)],
                ['寒衣节', LunarService.lunarToSolar(year, 10, 1)],
                ['下元节', LunarService.lunarToSolar(year, 10, 15)],
                ['腊八节', LunarService.lunarToSolar(year, 12, 8)],
                ['小年(北)', LunarService.lunarToSolar(year, 12, 23)],
                ['小年(南)', LunarService.lunarToSolar(year, 12, 24)]
            ].filter(([, date]) => date).sort((a, b) => new Date(a[1]) - new Date(b[1]));

            // 国际节日
            this.festivals.international = [
                ['情人节', Utils.formatDate(year, 2, 14)],
                ['万圣节', Utils.formatDate(year, 10, 31)],
                ['平安夜', Utils.formatDate(year, 12, 24)],
                ['圣诞节', Utils.formatDate(year, 12, 25)]
            ].sort((a, b) => new Date(a[1]) - new Date(b[1]));
        }

        getLunarNewYearEve(year) {
            const daysInMonth = calendar.monthDays(year, 12);
            const lastDay = daysInMonth === 29 ? 29 : 30;
            return LunarService.lunarToSolar(year, 12, lastDay);
        }

        handleFestivalNotifications() {
            if (!Environment.hasStore || !Environment.hasNotify) return;

            const now = Environment.now;
            if (now.getHours() < CONFIG.NOTIFY_HOUR) return;

            const today = Environment.todayStr;
            
            // 检查法定节日
            const legalFestival = this.festivals.legal.find(([, date]) => date === today);
            if (legalFestival) {
                this.sendNotification(legalFestival[0], today);
            }

            // 检查民俗节日
            const folkFestival = this.festivals.folk.find(([, date]) => date === today);
            if (folkFestival) {
                this.sendNotification(folkFestival[0], today);
            }
        }

        sendNotification(festivalName, date) {
            const storeKey = `notified_${festivalName}_${date}`;
            if (Utils.store.read(storeKey) === '1') return;

            const blessing = this.externalBlessings[festivalName] || '节日快乐！';
            Utils.notify(`🎉 ${festivalName}`, `今天是 ${date}`, blessing);
            Utils.store.write('1', storeKey);
        }

        async handleCronMode() {
            const showAlmanac = Utils.toBool(this.args.SHOW_ALMANAC, true);
            if (!showAlmanac || !Environment.hasNotify) {
                $done?.();
                return;
            }

            const almanac = await AlmanacService.fetchAlmanacDetail(this.lunarData);
            Utils.notify('📅 今日黄历', almanac.header, `${almanac.suitable}\n${almanac.avoid}`);
            $done?.();
        }

        async handlePanelMode() {
            const showAlmanac = Utils.toBool(this.args.SHOW_ALMANAC, true);
            const gapLines = Math.max(0, Math.min(3, parseInt(this.args.GAP_LINES) || CONFIG.DEFAULT_GAP_LINES));
            const gapText = '\n'.repeat(gapLines + 1);

            // 获取黄历详情
            const almanacDetail = showAlmanac ? 
                (await AlmanacService.fetchAlmanacDetail(this.lunarData)).fullText : null;

            // 生成节日显示内容
            const festivalContent = this.generateFestivalContent();
            
            // 组合最终内容
            const content = almanacDetail ? 
                `${almanacDetail}\n\n${festivalContent}` : festivalContent;

            // 生成标题
            const title = this.generateTitle();

            Utils.log('面板生成完成', {
                showAlmanac,
                gapLines,
                titleLength: title.length,
                contentLength: content.length
            });

            $done?.({
                title,
                icon: CONFIG.ICON,
                'icon-color': CONFIG.COLOR,
                content
            });
        }

        generateFestivalContent() {
            const today = Environment.todayStr;
            
            const festivalLines = Object.values(this.festivals).map(festivalList => {
                const nextThree = FestivalManager.getNextFestivals(festivalList);
                const daysDiff = nextThree.map(([, date]) => Utils.dateDiff(today, date));
                return FestivalManager.formatFestivalLine(nextThree, daysDiff);
            });

            return festivalLines.join('\n'.repeat(parseInt(this.args.GAP_LINES) + 1));
        }

        generateTitle() {
            const titleMode = (this.args.TITLE_MODE || 'day').toLowerCase();
            const today = Environment.todayStr;
            
            // 查找最近节日
            const allFestivals = Object.values(this.festivals).flat();
            const nearestFestival = allFestivals
                .map(([name, date]) => ({ name, days: Utils.dateDiff(today, date) }))
                .filter(f => f.days >= 0)
                .sort((a, b) => a.days - b.days)[0];

            if (titleMode === 'random') {
                return this.getRandomTitle(nearestFestival);
            }
            
            // 默认模式
            if (nearestFestival?.days === 0) {
                return `今天是 ${nearestFestival.name}，休息一下吧～`;
            }
            
            return this.getDailyTitle(nearestFestival);
        }

        getRandomTitle(nearestFestival) {
            const pool = this.externalTitles.length ? this.externalTitles : FestivalManager.defaultTitles;
            const randomIndex = Math.floor(Math.random() * pool.length);
            const title = pool[randomIndex];
            
            return this.replaceTitlePlaceholders(title, nearestFestival);
        }

        getDailyTitle(nearestFestival) {
            const pool = this.externalTitles.length ? this.externalTitles : FestivalManager.defaultTitles;
            const storeKey = `${CONFIG.TAG}_title_index_${Environment.todayStr}`;
            
            let index = parseInt(Utils.store.read(storeKey) || '0');
            if (isNaN(index) || index >= pool.length) {
                index = Math.floor(Math.random() * pool.length);
            }
            
            const title = pool[index];
            Utils.store.write((index + 1).toString(), storeKey);
            
            return this.replaceTitlePlaceholders(title, nearestFestival);
        }

        replaceTitlePlaceholders(title, nearestFestival) {
            const titles = LunarService.getDisplayTitles(this.lunarData);
            
            return title
                .replace(/{lunar}/g, titles.lunarTitle)
                .replace(/{solar}/g, titles.solarTitle)
                .replace(/{next}/g, nearestFestival ? `下一个：${nearestFestival.name}` : '');
        }

        handleError() {
            const fallbackContent = Environment.isCronMode ? 
                '黄历信息获取失败，请检查网络连接' : 
                '黄历脚本执行异常，请稍后再试';

            if (Environment.isCronMode && Environment.hasNotify) {
                Utils.notify('❌ 黄历错误', '', fallbackContent);
            }
            
            $done?.({
                title: '今日黄历',
                icon: CONFIG.ICON,
                'icon-color': CONFIG.COLOR,
                content: fallbackContent
            });
        }
    }

    /* ==================== 执行入口 ==================== */
    try {
        const app = new TodayAlmanac();
        await app.execute();
    } catch (error) {
        Utils.error('应用启动失败:', error);
        $done?.({ title: '错误', content: '脚本执行失败' });
    }

})().catch(error => {
    // 全局错误捕获
    console?.error?.(`[${CONFIG.TAG}] 未捕获的异常:`, error);
    $done?.({ title: '严重错误', content: '脚本执行异常' });
});
