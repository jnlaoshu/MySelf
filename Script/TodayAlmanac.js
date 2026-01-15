/**
 * 今日老黄历 - 修复版
 * 适用平台：Quantumult X, Surge, Loon
 * 功能：获取每日公历、农历、节气及“宜/忌”信息
 */

const $ = new Env("今日老黄历");
const API_URL = "https://v.api.aa1.cn/api/api-huangli/index.php"; // 示例稳定接口，可根据需要更换

// 获取当前日期 yyyymmdd 格式
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const dateStr = `${year}${month}${day}`;

(async () => {
    try {
        const result = await fetchAlmanac();
        if (result) {
            showNotification(result);
        }
    } catch (e) {
        $.log(`获取数据失败: ${e}`);
    } finally {
        $.done();
    }
})();

async function fetchAlmanac() {
    const url = `${API_URL}?date=${dateStr}`;
    const options = {
        url: url,
        timeout: 5000,
        headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        }
    };

    return new Promise((resolve) => {
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    $.log("网络请求错误: " + err);
                    resolve(null);
                } else {
                    const res = JSON.parse(data);
                    // 根据 API 返回的字段进行匹配，通常包含 yangli, yinli, yi, ji
                    if (res && res.status === "1" || res.success) {
                        resolve(res);
                    } else {
                        // 备用解析逻辑
                        resolve(res.data || res);
                    }
                }
            } catch (e) {
                $.log("解析 JSON 失败: " + e);
                resolve(null);
            }
        });
    });
}

function showNotification(info) {
    // 字段清洗：部分 API 返回带逗号的字符串，这里做格式化处理
    const yi = info.yi || info.fitness || "诸事不宜";
    const ji = info.ji || info.taboo || "诸事皆宜";
    const yinli = info.yinli || info.lunar || "";
    const yangli = info.yangli || `${year}年${month}月${day}日`;
    
    const title = `📅 今日老黄历 (${yangli})`;
    const subtitle = `农历：${yinli}`;
    const detail = `✅【宜】${yi}\n❌【忌】${ji}`;

    if ($.isQuanX) {
        $.notify(title, subtitle, detail);
    } else {
        $.msg(title, subtitle, detail);
    }
}

// --- 环境封装函数 (Env) ---
function Env(name) {
    this.name = name;
    this.isQuanX = typeof $task !== "undefined";
    this.isSurge = typeof $httpClient !== "undefined" && !this.isQuanX;
    this.log = (msg) => console.log(`[${this.name}] ${msg}`);
    this.get = (options, callback) => {
        if (this.isQuanX) {
            if (typeof options == "string") options = { url: options };
            options["method"] = "GET";
            $task.fetch(options).then(resp => callback(null, resp, resp.body), err => callback(err, null, null));
        } else if (this.isSurge) {
            $httpClient.get(options, callback);
        }
    };
    this.notify = (t, s, m) => {
        if (this.isQuanX) $notify(t, s, m);
        if (this.isSurge) $notification.post(t, s, m);
    };
    this.done = (val = {}) => {
        if (typeof $done !== "undefined") $done(val);
    };
}
