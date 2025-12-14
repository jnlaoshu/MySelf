/* =========================================================
 * 模块分类 · 服务检测纯净版
 * 优化说明 · 移除本地/入口/落地IP检测，仅保留流媒体/AI服务解锁检测
 * ========================================================= */

// 模块分类 · 常量
const CONSTS = Object.freeze({
  SD_MIN_TIMEOUT: 2000,
  LOG_RING_MAX: 140,
  DEBUG_TAIL_LINES: 18,
  BUDGET_HARD_MS: 10000,
  BUDGET_SOFT_GUARD_MS: 260
});

// 模块分类 · 语言包
const SD_STR = {
  "zh-Hans": {
    panelTitle: "服务检测",
    runAt: "检测时间",
    policy: "节点策略",
    unlocked: "已解锁",
    partialUnlocked: "部分解锁",
    notReachable: "不可达",
    timeout: "超时",
    fail: "失败",
    regionBlocked: "区域限制",
    nfFull: "完整解锁",
    nfOriginals: "仅自制剧",
    debug: "调试",
    region: "地区"
  },
  "zh-Hant": {
    panelTitle: "服務檢測",
    runAt: "檢測時間",
    policy: "節點策略",
    unlocked: "已解鎖",
    partialUnlocked: "部分解鎖",
    notReachable: "不可達",
    timeout: "逾時",
    fail: "失敗",
    regionBlocked: "區域限制",
    nfFull: "完整解鎖",
    nfOriginals: "僅自製劇",
    debug: "除錯",
    region: "地區"
  }
};

function t(key, ...args) {
  const lang = (typeof SD_LANG === "string" ? SD_LANG : "zh-Hans");
  const pack = SD_STR[lang] || SD_STR["zh-Hans"];
  const v = pack[key];
  if (typeof v === "function") return v(...args);
  return v != null ? v : key;
}

// 模块分类 · KV 存储适配
const KVStore = (() => {
  if (typeof $prefs !== "undefined" && $prefs.valueForKey) {
    return {
      read: (k) => $prefs.valueForKey(k),
      write: (v, k) => $prefs.setValueForKey(v, k)
    };
  }
  if (typeof $persistentStore !== "undefined" && $persistentStore.read) {
    return {
      read: (k) => $persistentStore.read(k),
      write: (v, k) => $persistentStore.write(v, k)
    };
  }
  return {read: () => null, write: () => {}};
})();

// 模块分类 · 读取 BoxJS 设置
function readBoxSettings() {
  let raw;
  try { raw = KVStore.read("Panel"); } catch (e) { return {}; }
  if (!raw) return {};
  let panel = raw;
  if (typeof raw === "string") {
    try { panel = JSON.parse(raw); } catch (e) { return {}; }
  }
  if (!panel || typeof panel !== "object") return {};
  if (panel.NetworkInfo && panel.NetworkInfo.Settings) return panel.NetworkInfo.Settings;
  if (panel.Settings) return panel.Settings;
  return {};
}

const BOX = readBoxSettings();
function readBoxKey(key) {
  if (!BOX || typeof BOX !== "object") return undefined;
  if (!Object.prototype.hasOwnProperty.call(BOX, key)) return undefined;
  const v = BOX[key];
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

// 模块分类 · 参数解析
function parseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    return raw.split("&").reduce((acc, kv) => {
      if (!kv) return acc;
      const [k, v = ""] = kv.split("=");
      const key = decodeURIComponent(k || "");
      acc[key] = decodeURIComponent(String(v).replace(/\+/g, "%20"));
      return acc;
    }, {});
  }
  return {};
}

const $args = parseArgs(typeof $argument !== "undefined" ? $argument : undefined);

function readArgRaw(name) {
  try {
    if (typeof $argument === "string") {
      const re = new RegExp(`(?:^|&)${name}=([^&]*)`);
      const m = $argument.match(re);
      if (m) return decodeURIComponent(String(m[1]).replace(/\+/g, "%20"));
    }
  } catch (_) {}
  return undefined;
}

// 模块分类 · 小工具
const toBool = (v, d = false) => {
  if (v == null || v === "") return d;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "on", "yes", "y"].includes(s)) return true;
  return ["0", "false", "off", "no", "n"].includes(s) ? false : d;
};

const toNum = (v, d) => {
  if (v == null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// 模块分类 · 参数优先级
function ENV(key, defVal, opt = {}) {
  const typeHint = typeof defVal;
  const argKeys = [key].concat(opt.argAlias || []);
  const boxKeys = [key].concat(opt.boxAlias || []);

  let argRaw, hasArg = false;
  for (const k of argKeys) {
    if ($args && Object.prototype.hasOwnProperty.call($args, k)) {
      const v = $args[k];
      if (v !== undefined && v !== null && v !== "") {
        argRaw = v; hasArg = true; break;
      }
    }
  }

  let boxRaw, hasBox = false;
  for (const bk of boxKeys) {
    const v = readBoxKey(bk);
    if (v !== undefined && v !== null && v !== "") {
      boxRaw = v; hasBox = true; break;
    }
  }

  const convert = (val) => {
    if (typeHint === "number") return toNum(val, defVal);
    if (typeHint === "boolean") return toBool(val, defVal);
    return val;
  };

  if (hasArg) return convert(argRaw);
  if (hasBox) return convert(boxRaw);
  return defVal;
}

// 模块分类 · 统一配置对象
const CFG = {
  Timeout: toNum(ENV("Timeout", 12), 12),
  BUDGET_SEC_RAW: ENV("BUDGET", 0),
  TW_FLAG_MODE: toNum(ENV("TW_FLAG_MODE", 1), 1), // 0=CN, 1=TW, 2=WS
  
  IconPreset: ENV("IconPreset", "gamecontroller"), // 改默认为游戏手柄/服务类图标
  Icon: ENV("Icon", ""),
  IconColor: ENV("IconColor", "#FF2D55"),

  SD_STYLE: ENV("SD_STYLE", "icon"),
  SD_REGION_MODE: ENV("SD_REGION_MODE", "full"),
  SD_ICON_THEME: ENV("SD_ICON_THEME", "check"),
  SD_ARROW: toBool(ENV("SD_ARROW", true), true),
  SD_SHOW_LAT: toBool(ENV("SD_SHOW_LAT", true), true),
  SD_SHOW_HTTP: toBool(ENV("SD_SHOW_HTTP", true), true),
  SD_LANG: ENV("SD_LANG", "zh-Hans"),

  SD_TIMEOUT_SEC_RAW: ENV("SD_TIMEOUT", 0),
  SD_CONCURRENCY: toNum(ENV("SD_CONCURRENCY", 6), 6),

  SERVICES_BOX_CHECKED_RAW: (() => {
    const v = readBoxKey("SERVICES");
    if (v == null) return null;
    if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
    const s = String(v).trim();
    return (!s || s === "[]") ? null : s;
  })(),
  SERVICES_BOX_TEXT: (() => {
    const v = readBoxKey("SERVICES_TEXT");
    return v != null ? String(v).trim() : "";
  })(),
  SERVICES_ARG_TEXT: (() => {
    let v = $args.SERVICES;
    if (Array.isArray(v)) return JSON.stringify(v);
    if (v == null || v === "") v = readArgRaw("SERVICES");
    return v != null ? String(v).trim() : "";
  })(),

  LOG: toBool(ENV("LOG", true), true),
  LOG_LEVEL: (ENV("LOG_LEVEL", "info") + "").toLowerCase(),
  LOG_TO_PANEL: toBool(ENV("LOG_TO_PANEL", false), false)
};

// 模块分类 · 图标
const ICON_PRESET_MAP = Object.freeze({
  wifi: "wifi.router",
  globe: "globe.asia.australia",
  gamecontroller: "gamecontroller.fill",
  play: "play.tv.fill",
  bolt: "bolt.fill"
});
const ICON_NAME = (CFG.Icon || "").trim() || ICON_PRESET_MAP[String(CFG.IconPreset).trim()] || "gamecontroller.fill";
const ICON_COLOR = CFG.IconColor;

// 模块分类 · 单项超时
const SD_LANG = (String(CFG.SD_LANG).toLowerCase() === "zh-hant") ? "zh-Hant" : "zh-Hans";
const SD_TIMEOUT_MS = (() => {
  const baseSec = Number(CFG.Timeout) || 8;
  const secRaw = Number(CFG.SD_TIMEOUT_SEC_RAW);
  const sec = (Number.isFinite(secRaw) && secRaw > 0) ? secRaw : baseSec;
  return Math.max(CONSTS.SD_MIN_TIMEOUT, sec * 1000);
})();

const TW_FLAG_MODE = Number(CFG.TW_FLAG_MODE) || 0;

// 模块分类 · 服务样式
const SD_STYLE = (String(CFG.SD_STYLE).toLowerCase() === "text") ? "text" : "icon";
const SD_SHOW_LAT = !!CFG.SD_SHOW_LAT;
const SD_SHOW_HTTP = !!CFG.SD_SHOW_HTTP;
const SD_REGION_MODE = ["full", "abbr", "flag"].includes(String(CFG.SD_REGION_MODE)) ? CFG.SD_REGION_MODE : "full";
const SD_ICON_THEME = ["lock", "circle", "check"].includes(String(CFG.SD_ICON_THEME)) ? CFG.SD_ICON_THEME : "check";
const SD_ARROW = !!CFG.SD_ARROW;

const SD_ICONS = (() => {
  switch (SD_ICON_THEME) {
    case "lock": return {full: "🔓", partial: "🔐", blocked: "🔒"};
    case "circle": return {full: "⭕️", partial: "⛔️", blocked: "🚫"};
    default: return {full: "✅", partial: "❇️", blocked: "❎"};
  }
})();

// 模块分类 · 预算系统
const BUDGET_MS = (() => {
  const raw = Number(CFG.BUDGET_SEC_RAW);
  const base = Math.max(1, Number(CFG.Timeout) || 8) * 1000;
  if (Number.isFinite(raw) && raw > 0) return Math.max(3500, raw * 1000);
  return Math.min(CONSTS.BUDGET_HARD_MS, Math.max(5500, base));
})();
const DEADLINE = Date.now() + BUDGET_MS;

function budgetLeft() { return Math.max(0, DEADLINE - Date.now()); }

function capByBudget(capMs, floorMs = 220) {
  const left = budgetLeft();
  if (left <= CONSTS.BUDGET_SOFT_GUARD_MS) return Math.max(120, floorMs);
  const room = Math.max(120, left - CONSTS.BUDGET_SOFT_GUARD_MS);
  return Math.max(120, Math.min(Number(capMs) || room, room));
}

async function withTimeout(promise, ms, onTimeoutValue) {
  const lim = Math.max(120, Number(ms) || 0);
  let tmr;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((resolve) => { tmr = setTimeout(() => resolve(onTimeoutValue), lim); })
    ]);
  } finally {
    if (tmr) clearTimeout(tmr);
  }
}

// 模块分类 · 日志系统
const LOG_ON = !!CFG.LOG;
const LOG_LEVEL = CFG.LOG_LEVEL || "info";
const LOG_LEVELS = {debug: 10, info: 20, warn: 30, error: 40};
const LOG_THRESH = LOG_LEVELS[LOG_LEVEL] ?? 20;
const DEBUG_LINES = [];

function log(level, ...args) {
  if (!LOG_ON) return;
  const L = LOG_LEVELS[level] ?? 20;
  if (L < LOG_THRESH) return;
  const msg = args.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  const line = `[SD][${level.toUpperCase()}] ${msg.join(" ")}`;
  try { console.log(line); } catch (_) {}
  DEBUG_LINES.push(line);
  if (DEBUG_LINES.length > CONSTS.LOG_RING_MAX) DEBUG_LINES.shift();
}

function pad2(n) { return String(n).padStart(2, "0"); }
function now() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// 模块分类 · JSON 安全解析
function safeJSON(s, d = {}) {
  try { return JSON.parse(s || ""); } catch { return d; }
}

// 模块分类 · HTTP
function httpCall(method, req, timeoutMs = null, capMs = null) {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient === "undefined" || !$httpClient) return reject(new Error("no-$httpClient"));

    const base = (Number(CFG.Timeout) || 8) * 1000;
    let to = (timeoutMs == null) ? base : Number(timeoutMs);
    const capped = capByBudget(capMs == null ? 3500 : Number(capMs));
    to = Math.min(to, capped);

    if (budgetLeft() <= CONSTS.BUDGET_SOFT_GUARD_MS) return reject(new Error("budget-empty"));

    const start = Date.now();
    const payload = Object.assign({}, req, {timeout: to});
    const fn = (String(method).toUpperCase() === "POST") ? $httpClient.post : $httpClient.get;

    fn(payload, (err, resp, body) => {
      const cost = Date.now() - start;
      if (err || !resp) return reject(err || new Error("no-resp"));
      resolve({status: resp.status || resp.statusCode || 0, headers: resp.headers || {}, body, cost});
    });
  });
}

function httpGet(url, headers = {}, timeoutMs = null, followRedirect = false) {
  const req = {url, headers};
  if (followRedirect) req.followRedirect = true;
  return httpCall("GET", req, timeoutMs, 3500);
}

function httpPost(url, headers = {}, body = "", timeoutMs = null) {
  return httpCall("POST", {url, headers, body}, timeoutMs, 3500);
}

function httpAPI(path = "/v1/requests/recent") {
  return new Promise((res) => {
    if (typeof $httpAPI === "function") {
      $httpAPI("GET", path, null, (x) => res(x));
    } else {
      res({});
    }
  });
}

// 模块分类 · 服务清单与别名
const SD_I18N = ({
  "zh-Hans": {
    youTube: "YouTube", chatgpt_app: "ChatGPT", chatgpt: "ChatGPT Web", netflix: "Netflix",
    disney: "Disney+", huluUS: "Hulu(美)", huluJP: "Hulu(日)", hbo: "Max(HBO)"
  },
  "zh-Hant": {
    youTube: "YouTube", chatgpt_app: "ChatGPT", chatgpt: "ChatGPT Web", netflix: "Netflix",
    disney: "Disney+", huluUS: "Hulu(美)", huluJP: "Hulu(日)", hbo: "Max(HBO)"
  }
})[SD_LANG];

const SD_TESTS_MAP = {
  youtube: () => sd_testYouTube(),
  netflix: () => sd_testNetflix(),
  disney: () => sd_testDisney(),
  chatgpt_web: () => sd_testChatGPTWeb(),
  chatgpt_app: () => sd_testChatGPTAppAPI(),
  hulu_us: () => sd_testHuluUS(),
  hulu_jp: () => sd_testHuluJP(),
  hbo: () => sd_testHBO()
};
const SD_DEFAULT_ORDER = Object.keys(SD_TESTS_MAP);

const SD_ALIAS = {
  yt: "youtube", youtube: "youtube", "youtube premium": "youtube", 油管: "youtube",
  nf: "netflix", netflix: "netflix", 奈飞: "netflix", 奈飛: "netflix",
  disney: "disney", "disney+": "disney", 迪士尼: "disney",
  chatgpt: "chatgpt_app", gpt: "chatgpt_app", openai: "chatgpt_app",
  chatgpt_web: "chatgpt_web",
  hulu: "hulu_us", 葫芦: "hulu_us", hbo: "hbo", max: "hbo"
};

function parseServices(raw) {
  if (raw == null) return [];
  let s = String(raw).trim();
  if (!s || s === "[]" || s === "{}" || /^null|undefined$/i.test(s)) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return normSvcList(arr);
  } catch (_) {}
  return normSvcList(s.split(/[,\uFF0C;|\/ \t\r\n]+/));
}

function normSvcList(list) {
  const out = [];
  for (let x of list) {
    let k = String(x ?? "").trim().toLowerCase();
    if (!k) continue;
    k = SD_ALIAS[k] || k;
    if (SD_TESTS_MAP[k] && !out.includes(k)) out.push(k);
  }
  return out;
}

function selectServices() {
  const argList = parseServices(CFG.SERVICES_ARG_TEXT);
  if (argList.length > 0) return argList;
  const boxCheckedList = parseServices(CFG.SERVICES_BOX_CHECKED_RAW);
  if (boxCheckedList.length > 0) return boxCheckedList;
  const boxTextList = parseServices(CFG.SERVICES_BOX_TEXT);
  if (boxTextList.length > 0) return boxTextList;
  return SD_DEFAULT_ORDER.slice();
}

// 模块分类 · 服务检测 HTTP
const SD_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SD_BASE_HEADERS = {"User-Agent": SD_UA, "Accept-Language": "en"};

function sd_httpGet(url, headers = {}, followRedirect = true) {
  const start = Date.now();
  return httpGet(url, {...SD_BASE_HEADERS, ...headers}, SD_TIMEOUT_MS, followRedirect)
    .then((r) => ({ok: true, status: r.status, cost: Date.now() - start, headers: r.headers || {}, data: r.body || ""}))
    .catch((e) => ({ok: false, status: 0, cost: Date.now() - start, headers: {}, data: "", err: String(e || "")}));
}

function sd_httpPost(url, headers = {}, body = "") {
  const start = Date.now();
  return httpPost(url, {...SD_BASE_HEADERS, ...headers}, body, SD_TIMEOUT_MS)
    .then((r) => ({ok: true, status: r.status, cost: Date.now() - start, headers: r.headers || {}, data: r.body || ""}))
    .catch((e) => ({ok: false, status: 0, cost: Date.now() - start, headers: {}, data: "", err: String(e || "")}));
}

// 模块分类 · 地区渲染
function sd_flagFromCC(cc) {
  cc = (cc || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  if (cc === "TW") {
    if (TW_FLAG_MODE === 0) return "🇨🇳";
    if (TW_FLAG_MODE === 2) return "🇼🇸";
  }
  try {
    return String.fromCodePoint(...[...cc].map((c) => 0x1F1E6 + (c.charCodeAt(0) - 65)));
  } catch (_) { return ""; }
}

const SD_CC_NAME = ({
  "zh-Hans": {
    CN: "中国", TW: "台湾", HK: "中国香港", MO: "中国澳门", JP: "日本", KR: "韩国", US: "美国",
    SG: "新加坡", GB: "英国", DE: "德国", FR: "法国", NL: "荷兰"
  },
  "zh-Hant": {
    CN: "中國", TW: "台灣", HK: "中國香港", MO: "中國澳門", JP: "日本", KR: "南韓", US: "美國",
    SG: "新加坡", GB: "英國", DE: "德國", FR: "法國", NL: "荷蘭"
  }
})[SD_LANG];

function sd_ccPretty(cc) {
  cc = (cc || "").toUpperCase();
  const flag = sd_flagFromCC(cc);
  if (!cc) return "—";
  if (SD_REGION_MODE === "flag") return flag || "—";
  if (SD_REGION_MODE === "abbr") return (flag || "") + cc;
  const name = SD_CC_NAME[cc];
  if (flag && name) return `${flag} ${cc} | ${name}`;
  if (flag) return `${flag} ${cc}`;
  return cc;
}

const isPartial = (tag) => /自制|自製|original/i.test(String(tag || "")) || /部分/i.test(String(tag || ""));

function sd_renderLine({name, ok, cc, cost, status, tag, state}) {
  const st = state ? state : (ok ? (isPartial(tag) ? "partial" : "full") : "blocked");
  const icon = SD_ICONS[st];
  const regionChunk = cc ? sd_ccPretty(cc) : "";
  const regionText = regionChunk || "-";
  const stateTextLong = (st === "full") ? t("nfFull") : (st === "partial") ? t("nfOriginals") : t("notReachable");
  const showTag = (/netflix/i.test(name) && SD_STYLE === "text" && !SD_ARROW) ? "" : (tag || "");

  const extras = [showTag, (SD_SHOW_LAT && cost != null) ? `${cost}ms` : "", (SD_SHOW_HTTP && status > 0) ? `HTTP ${status}` : ""]
    .filter(Boolean).join(" ｜ ");

  if (SD_STYLE === "text") {
    const left = SD_ARROW 
      ? `${name}: ${st === "full" ? t("unlocked") : stateTextLong} ➟ ${regionText}`
      : `${name}: ${st === "full" ? t("unlocked") : stateTextLong} ｜ ${regionText}`;
    return extras ? `${left} ｜ ${extras}` : left;
  }

  const head = SD_ARROW ? `${icon} ${name} ➟ ${regionText}` : `${icon} ${name} ｜ ${regionText}`;
  return extras ? `${head} ｜ ${extras}` : head;
}

function sd_nameOfKey(key) {
  switch (key) {
    case "youtube": return SD_I18N.youTube;
    case "netflix": return SD_I18N.netflix;
    case "disney": return SD_I18N.disney;
    case "hulu_us": return SD_I18N.huluUS;
    case "hulu_jp": return SD_I18N.huluJP;
    case "hbo": return SD_I18N.hbo;
    case "chatgpt_web": return SD_I18N.chatgpt;
    case "chatgpt_app": return SD_I18N.chatgpt_app;
    default: return key;
  }
}

// 模块分类 · 具体检测逻辑
async function sd_queryLandingCCMulti() {
  const urls = ["http://ip-api.com/json", "https://api.ip.sb/geoip", "https://ipinfo.io/json"];
  for (const u of urls) {
    const r = await sd_httpGet(u, {}, true);
    if (r.ok) {
      const j = safeJSON(r.data, {});
      const c = j.countryCode || j.country_code || j.country || j.country_iso;
      if (c) return c.toUpperCase();
    }
  }
  return "";
}

async function sd_testYouTube() {
  const r = await sd_httpGet("https://www.youtube.com/premium?hl=en", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.youTube, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("fail")});
  let cc = "US";
  const m = r.data.match(/"countryCode":"([A-Z]{2})"/);
  if (m) cc = m[1];
  return sd_renderLine({name: SD_I18N.youTube, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

async function sd_testChatGPTWeb() {
  const r = await sd_httpGet("https://chatgpt.com/cdn-cgi/trace", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.chatgpt, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("fail")});
  let cc = "";
  const m = r.data.match(/loc=([A-Z]{2})/);
  if (m) cc = m[1];
  return sd_renderLine({name: SD_I18N.chatgpt, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

async function sd_testChatGPTAppAPI() {
  const r = await sd_httpGet("https://api.openai.com/v1/models", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.chatgpt_app, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("fail")});
  let cc = (r.headers["cf-ipcountry"] || r.headers["CF-IPCountry"] || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) cc = await sd_queryLandingCCMulti();
  return sd_renderLine({name: SD_I18N.chatgpt_app, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

const sd_nfGet = (id) => sd_httpGet(`https://www.netflix.com/title/${id}`, {}, true);
async function sd_testNetflix() {
  const r1 = await sd_nfGet("81280792"); // Non-Original
  if (!r1.ok) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r1.cost, status: r1.status, tag: t("fail")});
  
  const getCC = (resp) => {
    const u = resp.headers["x-originating-url"] || resp.headers["X-Originating-URL"];
    if (u) { const m = u.match(/\/([A-Z]{2})(?:[-/]|$)/i); if(m) return m[1].toUpperCase(); }
    const m2 = resp.data.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i);
    return m2 ? m2[1].toUpperCase() : "";
  };

  if (r1.status === 403 || r1.status === 404) {
    const r2 = await sd_nfGet("80018499"); // Original
    if (!r2.ok) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r2.cost, status: r2.status, tag: t("fail")});
    if (r2.status === 404) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r2.cost, status: r2.status, tag: t("regionBlocked")});
    return sd_renderLine({name: SD_I18N.netflix, ok: true, cc: getCC(r2), cost: r2.cost, status: r2.status, tag: t("nfOriginals"), state: "partial"});
  }
  return sd_renderLine({name: SD_I18N.netflix, ok: true, cc: getCC(r1), cost: r1.cost, status: r1.status, tag: t("nfFull"), state: "full"});
}

async function sd_testDisney() {
  const rHome = await sd_httpGet("https://www.disneyplus.com/", {}, true);
  if (!rHome.ok || rHome.status !== 200) return sd_renderLine({name: SD_I18N.disney, ok: false, cc: "", cost: rHome.cost, status: rHome.status, tag: t("regionBlocked")});
  
  let cc = (rHome.data.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i) || [])[1];
  if (!cc) cc = await sd_queryLandingCCMulti();
  return sd_renderLine({name: SD_I18N.disney, ok: true, cc: cc ? cc.toUpperCase() : "", cost: rHome.cost, status: rHome.status, tag: ""});
}

async function sd_testHuluUS() {
  const r = await sd_httpGet("https://www.hulu.com/", {}, true);
  const blocked = !r.ok || /not\s+available\s+in\s+your\s+region/i.test(r.data);
  return sd_renderLine({name: SD_I18N.huluUS, ok: !blocked, cc: blocked ? "" : "US", cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

async function sd_testHuluJP() {
  const r = await sd_httpGet("https://www.hulu.jp/", {"Accept-Language": "ja"}, true);
  const blocked = !r.ok || /not available/i.test(r.data);
  return sd_renderLine({name: SD_I18N.huluJP, ok: !blocked, cc: blocked ? "" : "JP", cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

async function sd_testHBO() {
  const r = await sd_httpGet("https://www.max.com/", {}, true);
  const blocked = !r.ok || /not\s+available/i.test(r.data);
  let cc = (r.data.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i) || [])[1];
  if (!cc && !blocked) cc = await sd_queryLandingCCMulti();
  return sd_renderLine({name: SD_I18N.hbo, ok: !blocked, cc: blocked ? "" : cc, cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

// 模块分类 · 服务检测并发队列
async function runServiceChecks() {
  const order = selectServices();
  if (!order.length) return [];
  const conc = Math.max(1, Math.min(8, Number(CFG.SD_CONCURRENCY) || 6));
  
  const results = new Array(order.length);
  let cursor = 0, inflight = 0, finished = 0, doneFlag = false;

  const tryLaunch = () => {
    while (!doneFlag && inflight < conc && cursor < order.length) {
      if (budgetLeft() <= 320) break;
      const idx = cursor++;
      const key = order[idx];
      const fn = SD_TESTS_MAP[key];
      if (!fn) { results[idx] = null; finished++; continue; }

      inflight++;
      Promise.resolve(fn()).then(l => results[idx] = l).catch(() => results[idx] = null)
        .finally(() => { inflight--; finished++; if (finished >= order.length) doneFlag = true; else tryLaunch(); });
    }
  };
  tryLaunch();

  await withTimeout(new Promise(r => {
    const t = setInterval(() => { if (doneFlag || budgetLeft() <= 200) { clearInterval(t); r(); } }, 50);
  }), 5500, false);

  for (let i = 0; i < results.length; i++) {
    if (!results[i]) results[i] = sd_renderLine({name: sd_nameOfKey(order[i]), ok: false, cc: "", cost: null, status: 0, tag: t("timeout")});
  }
  return results.filter(Boolean);
}

// 模块分类 · 简繁 (zh-Hant)
function maybeTify(content) {
  if (SD_LANG !== "zh-Hant" || !content) return content;
  return content.replace(/网络/g, "網路").replace(/节点/g, "節點").replace(/解锁/g, "解鎖").replace(/时间/g, "時間")
    .replace(/中国/g, "中國").replace(/检测/g, "檢測").replace(/失败/g, "失敗").replace(/区域/g, "區域");
}

// 模块分类 · 主流程
;(async () => {
  log("info", "Start Service Check Only");
  
  // 并行获取策略名和服务检测结果
  const [policyData, sdLines] = await Promise.all([
    httpAPI("/v1/requests/recent").then(d => {
      const rs = d?.requests || [];
      const hit = rs.find(i => i.policyName && i.URL && !/^http:\/\/(127|192|10)/.test(i.URL));
      return hit ? hit.policyName : "";
    }).catch(() => ""),
    runServiceChecks().catch(() => [])
  ]);

  const currentTime = now();
  const parts = [];
  // 仅显示节点策略，时间已移至标题
  if (policyData) parts.push(`${t("policy")}: ${policyData}`);
  if (policyData) parts.push(""); // 如果有策略名，增加留白
  
  if (sdLines.length) parts.push(...sdLines);
  else parts.push("无服务检测配置或检测失败");

  if (CFG.LOG_TO_PANEL && DEBUG_LINES.length) {
    parts.push(""); parts.push("—— DEBUG ——");
    parts.push(DEBUG_LINES.slice(-5).join("\n"));
  }

  $done({
    title: `${t("panelTitle")} (${currentTime})`,
    content: maybeTify(parts.join("\n")),
    icon: ICON_NAME,
    "icon-color": ICON_COLOR
  });
})().catch((err) => {
  $done({title: t("panelTitle"), content: String(err), icon: ICON_NAME, "icon-color": ICON_COLOR});
});
