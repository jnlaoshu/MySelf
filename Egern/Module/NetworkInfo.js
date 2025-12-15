/*
网络信息
𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
更新：2025/12/15 09:00
*/
/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/
// 简易 HTTP GET 请求封装
const json = (url) => new Promise((resolve) => {
$httpClient.get({ url, headers: { 'User-Agent': 'Mozilla/5.0' } }, (err, resp, data) => {
try { resolve(err ? {} : JSON.parse(data)); } catch { resolve({}); }
});
});
// 运营商名称格式化
const fmtISP = (isp) => {
if (!isp) return "未知";
const s = isp.toLowerCase();
if (s.includes('mobile') || s.includes('cmcc')) return "中国移动";
if (s.includes('telecom') || s.includes('ctcc')) return "中国电信";
if (s.includes('unicom') || s.includes('cnc')) return "中国联通";
if (s.includes('cbn')) return "中国广电";
return isp.replace(/\s*(.*?)/g, "").trim(); // 去除括号内容
};
// 网络制式获取
const getRadio = (n) => {
const r = n?.["cellular-data"]?.radio || n?.cellular?.radio;
if (!r) return "未连接";
const map = { "LTE": "4G", "NR": "5G", "NRNSA": "5G" };
return map[r.toUpperCase().split(" ")[0]] || r;
};
(async () => {
try {
const n = $network || {};
// 并行请求：Local (ip.sb 含 ASN) / Node (ip-api 含中文位置)
const [local, node] = await Promise.all([
json('https://api.ip.sb/geoip'),
json('http://ip-api.com/json?lang=zh-CN')
]);
// 构建标题
const isp = fmtISP(local.isp || node.isp);
const netType = n.wifi?.ssid || getRadio(n);
const title = `${isp} | ${netType}`;

// 构建内容
const content = [];

// 1. 内网信息
if (n.v4?.primaryAddress) content.push(`内网 IPv4：${n.v4.primaryAddress}`);
if (n.v4?.routerAddress)  content.push(`内网路由：${n.v4.routerAddress}`);
if (n.v6?.primaryAddress) content.push(`内网 IPv6：${n.v6.primaryAddress}`);

// 2. 本地公网信息 (含 ASN)
const locIP = local.ip || "检测失败";
content.push(`本地 IPv4：${locIP}`);

if (local.asn) {
  const asnInfo = `AS${local.asn} ${local.asn_organization || ''}`.trim();
  content.push(`ASN 地址：${asnInfo}`);
}

// 3. 节点信息
if (node.query) {
  content.push(`节点 IPv4：${node.query}`);
  content.push(`节点位置：${node.country || ''} ${node.regionName || ''} ${node.city || ''}`.trim());
  content.push(`节点运营：${fmtISP(node.isp)}`);
} else {
  content.push(`节点 IPv4：检测失败`);
}

$done({
  title: title,
  content: content.join("\n"),
  icon: n.wifi?.ssid ? 'wifi' : 'simcard',
  'icon-color': n.wifi?.ssid ? '#005CAF' : '#F9BF45'
});
