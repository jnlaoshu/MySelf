/* =========================================================
 * 模块分类 · 服务检测（BoxJS / Surge / Loon / QuanX / Egern 兼容）
 * 修改自 · ByteValley (2025-11-28R1)
 * 功能 · 仅保留服务检测 (Service Detection Only)
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
    panelTitle: "服务检测 𝕏",
    runAt: "执行时间",
    region: "区域",
    unlocked: "已解锁",
    partialUnlocked: "部分解锁",
    notReachable: "不可达",
    timeout: "超时",
    fail: "检测失败",
    regionBlocked: "区域受限",
    nfFull: "已完整解锁",
    nfOriginals: "仅解锁自制剧",
    debug: "调试"
  },
  "zh-Hant": {
    panelTitle: "服務檢測 𝕏",
    runAt: "執行時間",
    region: "區域",
    unlocked: "已解鎖",
    partialUnlocked: "部分解鎖",
    notReachable: "不可達",
    timeout: "逾時",
    fail: "檢測失敗",
    regionBlocked: "區域受限",
    nfFull: "已完整解鎖",
    nfOriginals: "僅解鎖自製劇",
    debug: "除錯"
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
  try {
    if (typeof localStorage !== "undefined") {
      return {
        read: (k) => localStorage.getItem(k),
        write: (v, k) => localStorage.setItem(k, v)
      };
    }
  } catch (_) {}
  return {read: () => null, write: () => {}};
})();

// 模块分类 · 启动日志（BoxJS 读取侧）
const BOOT_DEBUG = [];
function bootLog(...args) {
  const line = "[NI][BOOT] " + args.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  BOOT_DEBUG.push(line);
  try { console.log(line); } catch (_) {}
}

// 模块分类 · 读取 BoxJS 设置
function readBoxSettings() {
  let raw;
  try { raw = KVStore.read("Panel"); } catch (e) { return {}; }
  if (raw === null || raw === undefined || raw === "") return {};

  let panel = raw;
  if (typeof raw === "string") {
    try { panel = JSON.parse(raw); } catch (e) { return {}; }
  }
  if (!panel || typeof panel !== "object") return {};

  if (panel.NetworkInfo && panel.NetworkInfo.Settings && typeof panel.NetworkInfo.Settings === "object") {
    return panel.NetworkInfo.Settings;
  }
  if (panel.Settings && typeof panel.Settings === "object") {
    return panel.Settings;
  }
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
  if (["0", "false", "off", "no", "n"].includes(s)) return false;
  return d;
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

  let argRaw;
  let hasArg = false;
  for (const k of argKeys) {
    if ($args && Object.prototype.hasOwnProperty.call($args, k)) {
      const v = $args[k];
      if (v !== undefined && v !== null && v !== "") {
        argRaw = v;
        hasArg = true;
        break;
      }
    }
  }

  let boxRaw;
  let hasBox = false;
  for (const bk of boxKeys) {
    const v = readBoxKey(bk);
    if (v !== undefined && v !== null && v !== "") {
      boxRaw = v;
      hasBox = true;
      break;
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
  Update: toNum(ENV("Update", 10), 10),
  Timeout: toNum(ENV("Timeout", 12), 12),
  BUDGET_SEC_RAW: ENV("BUDGET", 0),
  
  MASK_IP: toBool(ENV("MASK_IP", true), true), // 保留用于日志脱敏

  TW_FLAG_MODE: toNum(ENV("TW_FLAG_MODE", 1), 1),

  IconPreset: ENV("IconPreset", "globe"),
  Icon: ENV("Icon", ""),
  IconColor: ENV("IconColor", "#1E90FF"),

  SUBTITLE_STYLE: ENV("SUBTITLE_STYLE", "line"),
  SUBTITLE_MINIMAL: ENV("SUBTITLE_MINIMAL", false),
  GAP_LINES: ENV("GAP_LINES", 1),

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
    return (s && s !== "[]") ? s : null;
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
  LOG_TO_PANEL: toBool(ENV("LOG_TO_PANEL", false), false),
  LOG_PUSH: toBool(ENV("LOG_PUSH", true), true)
};

// 模块分类 · 子标题样式
const SUBTITLE_STYLES = Object.freeze({
  line: (s) => `——${s}——`,
  cnBracket: (s) => `【${s}】`,
  cnQuote: (s) => `「${s}」`,
  square: (s) => `[${s}]`,
  curly: (s) => `{${s}}`,
  angle: (s) => `《${s}》`,
  pipe: (s) => `║${s}║`,
  bullet: (s) => `·${s}·`,
  plain: (s) => `${s}`
});

function normalizeSubStyle(v) {
  const k = String(v ?? "line").trim();
  return SUBTITLE_STYLES[k] ? k : "line";
}

function makeSubTitleRenderer(styleKey, minimal = false) {
  const key = normalizeSubStyle(styleKey);
  const fn = SUBTITLE_STYLES[key] || SUBTITLE_STYLES.line;
  return minimal ? (s) => String(s) : (s) => fn(String(s));
}

function pushGroupTitle(parts, title) {
  for (let i = 0; i < CFG.GAP_LINES; i++) parts.push("");
  const render = makeSubTitleRenderer(CFG.SUBTITLE_STYLE, CFG.SUBTITLE_MINIMAL);
  parts.push(render(title));
}

CFG.SUBTITLE_STYLE = normalizeSubStyle(CFG.SUBTITLE_STYLE);
CFG.SUBTITLE_MINIMAL = toBool(CFG.SUBTITLE_MINIMAL, false);
CFG.GAP_LINES = Math.max(0, Math.min(2, toNum(CFG.GAP_LINES, 1)));

// 模块分类 · 图标
const ICON_PRESET_MAP = Object.freeze({
  wifi: "wifi.router",
  globe: "globe.asia.australia",
  dots: "dot.radiowaves.left.and.right",
  antenna: "antenna.radiowaves.left.and.right",
  point: "point.3.connected.trianglepath.dotted"
});
const ICON_NAME = (CFG.Icon || "").trim() || ICON_PRESET_MAP[String(CFG.IconPreset).trim()] || "globe.asia.australia";
const ICON_COLOR = CFG.IconColor;

// 模块分类 · 单项超时
const SD_LANG = (String(CFG.SD_LANG).toLowerCase() === "zh-hant") ? "zh-Hant" : "zh-Hans";
const SD_TIMEOUT_MS = (() => {
  const baseSec = Number(CFG.Timeout) || 8;
  const secRaw = Number(CFG.SD_TIMEOUT_SEC_RAW);
  const sec = (Number.isFinite(secRaw) && secRaw > 0) ? secRaw : baseSec;
  return Math.max(CONSTS.SD_MIN_TIMEOUT, sec * 1000);
})();

// 模块分类 · 脱敏策略
const MASK_IP = !!CFG.MASK_IP;
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

function budgetLeft() {
  return Math.max(0, DEADLINE - Date.now());
}

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
      new Promise((resolve) => {
        tmr = setTimeout(() => resolve(onTimeoutValue), lim);
      })
    ]);
  } finally {
    if (tmr) clearTimeout(tmr);
  }
}

// 模块分类 · 日志系统
const LOG_ON = !!CFG.LOG;
const LOG_TO_PANEL = !!CFG.LOG_TO_PANEL;
const LOG_PUSH = !!CFG.LOG_PUSH;
const LOG_LEVEL = CFG.LOG_LEVEL || "info";
const LOG_LEVELS = {debug: 10, info: 20, warn: 30, error: 40};
const LOG_THRESH = LOG_LEVELS[LOG_LEVEL] ?? 20;
const DEBUG_LINES = BOOT_DEBUG.slice();

function _maskMaybe(ip) {
  if (!ip) return "";
  if (!MASK_IP) return ip;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    const p = ip.split(".");
    return `${p[0]}.${p[1]}.*.*`;
  }
  if (/:/.test(ip)) {
    const p = ip.split(":");
    return [...p.slice(0, 4), "*", "*", "*", "*"].join(":");
  }
  return ip;
}

function log(level, ...args) {
  if (!LOG_ON) return;
  const L = LOG_LEVELS[level] ?? 20;
  if (L < LOG_THRESH) return;
  const msg = args.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  const line = `[NI][${level.toUpperCase()}] ${msg.join(" ")}`;
  try { console.log(line); } catch (_) {}
  DEBUG_LINES.push(line);
  if (DEBUG_LINES.length > CONSTS.LOG_RING_MAX) DEBUG_LINES.shift();
}

function logErrPush(title, body) {
  if (LOG_PUSH) $notification?.post?.(title, "", body);
  log("error", title, body);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function now() {
  const d = new Date();
  const MM = pad2(d.getMonth() + 1);
  const DD = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${MM}-${DD} ${hh}:${mm}:${ss}`;
}

// 模块分类 · JSON 安全解析
function safeJSON(s, d = {}) {
  try { return JSON.parse(s || ""); } catch { return d; }
}

// 模块分类 · HTTP
function httpCall(method, req, timeoutMs = null, capMs = null, logTag = "HTTP") {
  return new Promise((resolve, reject) => {
    if (typeof $httpClient === "undefined" || !$httpClient || (!$httpClient.get && !$httpClient.post)) {
      return reject(new Error("no-$httpClient"));
    }

    const base = (Number(CFG.Timeout) || 8) * 1000;
    let to = (timeoutMs == null) ? base : Number(timeoutMs);
    if (!Number.isFinite(to) || to <= 0) to = base;

    const cap = capMs == null ? 3500 : Number(capMs);
    const capped = capByBudget(Number.isFinite(cap) ? cap : 3500);
    to = Math.min(to, capped);

    if (budgetLeft() <= CONSTS.BUDGET_SOFT_GUARD_MS) {
      log("warn", `${logTag} skip (budget empty)`, req.url);
      return reject(new Error("budget-empty"));
    }

    const start = Date.now();
    let done = false;
    const wd = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("watchdog-timeout"));
    }, to + 220);

    const payload = Object.assign({}, req, {timeout: to});
    const fn = (String(method).toUpperCase() === "POST") ? $httpClient.post : $httpClient.get;

    fn(payload, (err, resp, body) => {
      if (done) return;
      done = true;
      clearTimeout(wd);
      const cost = Date.now() - start;
      if (err || !resp) {
        return reject(err || new Error("no-resp"));
      }
      const status = resp.status || resp.statusCode || 0;
      resolve({status, headers: resp.headers || {}, body, cost});
    });
  });
}

function httpGet(url, headers = {}, timeoutMs = null, followRedirect = false) {
  const req = {url, headers};
  if (followRedirect) req.followRedirect = true;
  return httpCall("GET", req, timeoutMs, 3500, "HTTP GET");
}

function httpPost(url, headers = {}, body = "", timeoutMs = null) {
  const req = {url, headers, body};
  return httpCall("POST", req, timeoutMs, 3500, "HTTP POST");
}

// 模块分类 · 服务清单与别名
const SD_I18N = ({
  "zh-Hans": {
    youTube: "YouTube", chatgpt_app: "ChatGPT", chatgpt: "ChatGPT Web",
    netflix: "Netflix", disney: "Disney+", huluUS: "Hulu(美)", huluJP: "Hulu(日)", hbo: "Max(HBO)"
  },
  "zh-Hant": {
    youTube: "YouTube", chatgpt_app: "ChatGPT", chatgpt: "ChatGPT Web",
    netflix: "Netflix", disney: "Disney+", huluUS: "Hulu(美)", huluJP: "Hulu(日)", hbo: "Max(HBO)"
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
  chatgpt_web: "chatgpt_web", "chatgpt-web": "chatgpt_web", "chatgpt web": "chatgpt_web",
  hulu: "hulu_us", 葫芦: "hulu_us", 葫蘆: "hulu_us", huluus: "hulu_us", hulujp: "hulu_jp",
  hbo: "hbo", max: "hbo"
};

function parseServices(raw) {
  if (raw == null) return [];
  let s = String(raw).trim();
  if (!s || s === "[]" || s === "{}" || /^null$/i.test(s) || /^undefined$/i.test(s)) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return normSvcList(arr);
  } catch (_) {}
  const parts = s.split(/[,，;|\/ 	
]+/);
  return normSvcList(parts);
}

function normSvcList(list) {
  const out = [];
  for (let x of list) {
    let k = String(x ?? "").trim().toLowerCase();
    if (!k) continue;
    k = SD_ALIAS[k] || k;
    if (!SD_TESTS_MAP[k]) continue;
    if (!out.includes(k)) out.push(k);
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
    const cps = [...cc].map((c) => 0x1F1E6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...cps);
  } catch (_) {
    return "";
  }
}

const SD_CC_NAME = ({
  "zh-Hans": {
    CN: "中国", TW: "台湾", HK: "中国香港", MO: "中国澳门", JP: "日本", KR: "韩国", US: "美国",
    SG: "新加坡", MY: "马来西亚", TH: "泰国", VN: "越南", PH: "菲律宾", ID: "印度尼西亚",
    IN: "印度", AU: "澳大利亚", NZ: "新西兰", CA: "加拿大", GB: "英国", DE: "德国", FR: "法国",
    NL: "荷兰", ES: "西班牙", IT: "意大利", BR: "巴西", AR: "阿根廷", MX: "墨西哥", RU: "俄罗斯"
  },
  "zh-Hant": {
    CN: "中國", TW: "台灣", HK: "中國香港", MO: "中國澳門", JP: "日本", KR: "南韓", US: "美國",
    SG: "新加坡", MY: "馬來西亞", TH: "泰國", VN: "越南", PH: "菲律賓", ID: "印尼",
    IN: "印度", AU: "澳洲", NZ: "紐西蘭", CA: "加拿大", GB: "英國", DE: "德國", FR: "法國",
    NL: "荷蘭", ES: "西班牙", IT: "義大利", BR: "巴西", AR: "阿根廷", MX: "墨西哥", RU: "俄羅斯"
  }
})[SD_LANG];

function sd_ccPretty(cc) {
  cc = (cc || "").toUpperCase();
  const flag = sd_flagFromCC(cc);
  const name = SD_CC_NAME[cc];
  if (!cc) return "—";
  if (SD_REGION_MODE === "flag") return flag || "—";
  if (SD_REGION_MODE === "abbr") return (flag || "") + cc;
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

  const unlockedShort = t("unlocked");
  const blockedText = t("notReachable");

  const isNetflix = /netflix/i.test(String(name));
  const stateTextLong = (st === "full") ? t("nfFull") : (st === "partial") ? t("nfOriginals") : blockedText;
  const stateTextShort = (st === "blocked") ? blockedText : unlockedShort;
  const showTag = (isNetflix && SD_STYLE === "text" && !SD_ARROW) ? "" : (tag || "");

  if (SD_STYLE === "text" && !SD_ARROW) {
    const left = `${name}: ${isNetflix ? stateTextLong : stateTextShort}`;
    const head = `${left}，${t("region")}: ${regionText}`;
    const tail = [showTag, (SD_SHOW_LAT && cost != null) ? `${cost}ms` : "", (SD_SHOW_HTTP && status > 0) ? `HTTP ${status}` : ""]
      .filter(Boolean).join(" ｜ ");
    return tail ? `${head} ｜ ${tail}` : head;
  }

  if (SD_STYLE === "text") {
    const left = `${name}: ${st === "full" ? t("unlocked") : st === "partial" ? t("partialUnlocked") : t("notReachable")}`;
    const head = SD_ARROW ? `${left} ➟ ${regionText}` : `${left} ｜ ${regionText}`;
    const tail = [showTag, (SD_SHOW_LAT && cost != null) ? `${cost}ms` : "", (SD_SHOW_HTTP && status > 0) ? `HTTP ${status}` : ""]
      .filter(Boolean).join(" ｜ ");
    return tail ? `${head} ｜ ${tail}` : head;
  }

  const head = SD_ARROW ? `${icon} ${name} ➟ ${regionText}` : `${icon} ${name} ｜ ${regionText}`;
  const tail = [showTag, (SD_SHOW_LAT && cost != null) ? `${cost}ms` : "", (SD_SHOW_HTTP && status > 0) ? `HTTP ${status}` : ""]
    .filter(Boolean).join(" ｜ ");
  return tail ? `${head} ｜ ${tail}` : head;
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

// 模块分类 · Netflix 检测
const SD_NF_ORIGINAL = "80018499";
const SD_NF_NONORIG = "81280792";
const sd_nfGet = (id) => sd_httpGet(`https://www.netflix.com/title/${id}`, {}, true);

// 模块分类 · 各服务检测
async function sd_testYouTube() {
  const r = await sd_httpGet("https://www.youtube.com/premium?hl=en", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.youTube, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  let cc = "US";
  try {
    let m = r.data.match(/"countryCode":"([A-Z]{2})"/);
    if (!m) m = r.data.match(/["']GL["']\s*:\s*["']([A-Z]{2})["']/);
    if (m) cc = m[1];
  } catch (_) {}
  return sd_renderLine({name: SD_I18N.youTube, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

async function sd_testChatGPTWeb() {
  const r = await sd_httpGet("https://chatgpt.com/cdn-cgi/trace", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.chatgpt, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  let cc = "";
  try {
    const m = r.data.match(/loc=([A-Z]{2})/);
    if (m) cc = m[1];
  } catch (_) {}
  return sd_renderLine({name: SD_I18N.chatgpt, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

async function sd_testChatGPTAppAPI() {
  const r = await sd_httpGet("https://api.openai.com/v1/models", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.chatgpt_app, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  let cc = "";
  try {
    const h = r.headers || {};
    cc = (h["cf-ipcountry"] || h["CF-IPCountry"] || h["Cf-IpCountry"] || "").toString().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) cc = "";
  } catch (_) {}
  if (!cc) cc = await sd_queryLandingCCMulti();
  return sd_renderLine({name: SD_I18N.chatgpt_app, ok: true, cc, cost: r.cost, status: r.status, tag: ""});
}

async function sd_testNetflix() {
  const r1 = await sd_nfGet(SD_NF_NONORIG);
  if (!r1.ok) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r1.cost, status: r1.status, tag: t("fail")});
  if (r1.status === 403) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r1.cost, status: r1.status, tag: t("regionBlocked")});
  if (r1.status === 404) {
    const r2 = await sd_nfGet(SD_NF_ORIGINAL);
    if (!r2.ok) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r2.cost, status: r2.status, tag: t("fail")});
    if (r2.status === 404) return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r2.cost, status: r2.status, tag: t("regionBlocked")});
    const cc = sd_parseNFRegion(r2) || "";
    return sd_renderLine({name: SD_I18N.netflix, ok: true, cc, cost: r2.cost, status: r2.status, tag: t("nfOriginals"), state: "partial"});
  }
  if (r1.status === 200) {
    const cc = sd_parseNFRegion(r1) || "";
    return sd_renderLine({name: SD_I18N.netflix, ok: true, cc, cost: r1.cost, status: r1.status, tag: t("nfFull"), state: "full"});
  }
  return sd_renderLine({name: SD_I18N.netflix, ok: false, cc: "", cost: r1.cost, status: r1.status, tag: `HTTP ${r1.status}`});
}

function sd_parseNFRegion(resp) {
  try {
    const xo = resp?.headers?.["x-originating-url"] || resp?.headers?.["X-Origining-URL"] || resp?.headers?.["X-Originating-URL"];
    if (xo) {
      const m = String(xo).match(/\/([A-Z]{2})(?:[-/]|$)/i);
      if (m) return m[1].toUpperCase();
    }
    const m2 = String(resp?.data || "").match(/"countryCode"\s*:\s*"([A-Z]{2})"/i);
    if (m2) return m2[1].toUpperCase();
  } catch (_) {}
  return "";
}

async function sd_testDisney() {
  const rHome = await sd_httpGet("https://www.disneyplus.com/", {"Accept-Language": "en"}, true);
  if (!rHome.ok || rHome.status !== 200 || /Sorry,\s*Disney\+\s*is\s*not\s*available/i.test(rHome.data || "")) {
    const tag = (!rHome.ok) ? t("timeout") : t("regionBlocked");
    return sd_renderLine({name: SD_I18N.disney, ok: false, cc: "", cost: rHome.cost, status: rHome.status, tag});
  }
  let homeCC = "";
  try {
    const m = rHome.data.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i) || rHome.data.match(/data-country=["']([A-Z]{2})["']/i);
    if (m) homeCC = m[1].toUpperCase();
  } catch (_) {}

  const headers = {
    "Accept-Language": "en",
    "Authorization": "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84",
    "Content-Type": "application/json",
    "User-Agent": SD_UA
  };
  const body = JSON.stringify({
    query: "mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }",
    variables: {
      input: {
        applicationRuntime: "chrome",
        attributes: {
          browserName: "chrome", browserVersion: "120.0.0.0", manufacturer: "apple", model: null,
          operatingSystem: "macintosh", operatingSystemVersion: "10.15.7", osDeviceIds: []
        },
        deviceFamily: "browser", deviceLanguage: "en", deviceProfile: "macosx"
      }
    }
  });

  const rBam = await sd_httpPost("https://disney.api.edge.bamgrid.com/graph/v1/device/graphql", headers, body);
  if (!rBam.ok || rBam.status !== 200) {
    const cc = homeCC || (await sd_queryLandingCCMulti()) || "";
    return sd_renderLine({name: SD_I18N.disney, ok: true, cc, cost: rHome.cost, status: rHome.status, tag: ""});
  }

  const d = safeJSON(rBam.data, {});
  if (d?.errors) {
    const cc = homeCC || (await sd_queryLandingCCMulti()) || "";
    return sd_renderLine({name: SD_I18N.disney, ok: true, cc, cost: rHome.cost, status: rHome.status, tag: ""});
  }
  const inLoc = d?.extensions?.sdk?.session?.inSupportedLocation;
  const bamCC = d?.extensions?.sdk?.session?.location?.countryCode;
  const blocked = (inLoc === false);
  const cc = blocked ? "" : ((bamCC || homeCC || (await sd_queryLandingCCMulti()) || "").toUpperCase());
  return sd_renderLine({
    name: SD_I18N.disney, ok: !blocked, cc,
    cost: Math.min(rHome.cost || 0, rBam.cost || 0) || (rBam.cost || rHome.cost || 0),
    status: rBam.status || rHome.status || 0,
    tag: blocked ? t("regionBlocked") : ""
  });
}

async function sd_testHuluUS() {
  const r = await sd_httpGet("https://www.hulu.com/", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.huluUS, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  const blocked = /not\s+available\s+in\s+your\s+region/i.test(r.data || "");
  return sd_renderLine({name: SD_I18N.huluUS, ok: !blocked, cc: blocked ? "" : "US", cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

async function sd_testHuluJP() {
  const r = await sd_httpGet("https://www.hulu.jp/", {"Accept-Language": "ja"}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.huluJP, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  const blocked = /ご利用いただけません|サービスをご利用いただけません|not available/i.test(r.data || "");
  return sd_renderLine({name: SD_I18N.huluJP, ok: !blocked, cc: blocked ? "" : "JP", cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

async function sd_testHBO() {
  const r = await sd_httpGet("https://www.max.com/", {}, true);
  if (!r.ok) return sd_renderLine({name: SD_I18N.hbo, ok: false, cc: "", cost: r.cost, status: r.status, tag: t("notReachable")});
  const blocked = /not\s+available\s+in\s+your\s+region|country\s+not\s+supported/i.test(r.data || "");
  let cc = "";
  try {
    const m = String(r.data || "").match(/"countryCode"\s*:\s*"([A-Z]{2})"/i);
    if (m) cc = m[1].toUpperCase();
  } catch (_) {}
  if (!cc) cc = await sd_queryLandingCCMulti();
  return sd_renderLine({name: SD_I18N.hbo, ok: !blocked, cc: blocked ? "" : cc, cost: r.cost, status: r.status, tag: blocked ? t("regionBlocked") : ""});
}

// 模块分类 · 多源地区兜底
async function sd_queryLandingCC() {
  const r = await sd_httpGet("http://ip-api.com/json", {}, true);
  if (r.ok && r.status === 200) {
    try {
      const j = safeJSON(r.data, {});
      return (j.countryCode || "").toUpperCase();
    } catch (_) { return ""; }
  }
  return "";
}

async function sd_queryLandingCCMulti() {
  let cc = await sd_queryLandingCC();
  if (cc) return cc;
  let r = await sd_httpGet("https://api.ip.sb/geoip", {}, true);
  if (r.ok && r.status === 200) {
    try { const j = safeJSON(r.data, {}); if (j.country_code) return j.country_code.toUpperCase(); } catch (_) {}
  }
  r = await sd_httpGet("https://ipinfo.io/json", {}, true);
  if (r.ok && r.status === 200) {
    try { const j = safeJSON(r.data, {}); if (j.country) return j.country.toUpperCase(); } catch (_) {}
  }
  return "";
}

// 模块分类 · 服务检测并发队列
async function runServiceChecks() {
  const order = selectServices();
  if (!order.length) return [];

  const conc = Math.max(1, Math.min(8, Number(CFG.SD_CONCURRENCY) || 6));
  const stageCap = Math.max(800, Math.min(5200, capByBudget(5200)));

  const results = new Array(order.length);
  let cursor = 0;
  let inflight = 0;
  let finished = 0;
  let doneFlag = false;

  const finish = () => { if (!doneFlag) doneFlag = true; };

  const tryLaunch = () => {
    while (!doneFlag && inflight < conc && cursor < order.length) {
      if (budgetLeft() <= 320) break;
      const idx = cursor++;
      const key = order[idx];
      const fn = SD_TESTS_MAP[key];
      if (!fn) {
        results[idx] = sd_renderLine({name: sd_nameOfKey(key), ok: false, cc: "", cost: 0, status: 0, tag: t("fail")});
        finished++;
        continue;
      }
      inflight++;
      Promise.resolve(fn())
        .then((line) => { results[idx] = line; })
        .catch(() => { results[idx] = sd_renderLine({name: sd_nameOfKey(key), ok: false, cc: "", cost: null, status: 0, tag: t("fail")}); })
        .finally(() => {
          inflight--;
          finished++;
          if (finished >= order.length) finish();
          else tryLaunch();
        });
    }
  };

  tryLaunch();

  await withTimeout(
    new Promise((r) => {
      const tick = () => {
        if (doneFlag || finished >= order.length || budgetLeft() <= 260) return r(true);
        setTimeout(tick, 30);
      };
      tick();
    }),
    stageCap,
    false
  );

  finish();
  for (let i = 0; i < results.length; i++) {
    if (!results[i]) {
      results[i] = sd_renderLine({name: sd_nameOfKey(order[i]), ok: false, cc: "", cost: null, status: 0, tag: t("timeout")});
    }
  }
  return results.filter(Boolean);
}

function zhHansToHantOnce(s) {
  if (!s) return s;
  const phraseMap = [
    ["网络", "網路"], ["蜂窝网络", "行動服務"], ["执行时间", "執行時間"],
    ["区域", "區域"], ["不可达", "不可達"], ["检测失败", "檢測失敗"], ["超时", "逾時"],
    ["区域受限", "區域受限"], ["已解锁", "已解鎖"], ["部分解锁", "部分解鎖"],
    ["已完整解锁", "已完整解鎖"], ["仅解锁自制剧", "僅解鎖自製劇"],
    ["中国香港", "中國香港"], ["中国澳门", "中國澳門"]
  ];
  for (const [hans, hant] of phraseMap) s = s.replace(new RegExp(hans, "g"), hant);
  const charMap = {"网": "網", "络": "絡", "运": "運", "营": "營", "达": "達", "检": "檢", "测": "測", "时": "時", "区": "區"};
  return s.replace(/[\u4E00-\u9FFF]/g, (ch) => charMap[ch] || ch);
}

function maybeTify(content) {
  return SD_LANG === "zh-Hant" ? zhHansToHantOnce(content) : content;
}

// 模块分类 · 主流程
log("info", "Start (Service Only)");
;(async () => {
  const sdLines = await runServiceChecks().catch((e) => {
    log("error", "ServiceChecks fail", String(e));
    return [];
  });

  const parts = [];
  parts.push(`${t("runAt")}: ${now()}`);
  
  if (sdLines.length) {
    pushGroupTitle(parts, "服务检测");
    parts.push(...sdLines);
  } else {
    parts.push(t("fail"));
  }

  if (LOG_TO_PANEL && DEBUG_LINES.length) {
    pushGroupTitle(parts, t("debug"));
    parts.push(DEBUG_LINES.slice(-CONSTS.DEBUG_TAIL_LINES).join("\n"));
  }

  const content = maybeTify(parts.join("\n"));
  $done({title: t("panelTitle"), content, icon: ICON_NAME, "icon-color": ICON_COLOR});
})().catch((err) => {
  const msg = String(err);
  logErrPush(t("panelTitle"), msg);
  $done({title: t("panelTitle"), content: maybeTify(msg), icon: ICON_NAME, "icon-color": ICON_COLOR});
});
