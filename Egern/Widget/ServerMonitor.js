/**

- ==========================================
- 📌 模块名称: 服务器监控 (Server Monitor)
- ✨ 主要功能: 通过 SSH 协议并发直连最多 6 台远端服务器，在桌面小组件中可视化渲染核心硬件指标。
- ```
          搭载严格 64 字符换行的标准 PEM 私钥重构引擎，Promise.allSettled 隔离单台超时，
  ```
- ```
          Storage 键按编号独立隔离，支持 Large（6台）/ Medium（3台）/ Small（第1台）自适应布局。
  ```
- 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
- ⏱️ 更新时间: 2026.03.22
- ==========================================
- 
- 环境变量（每台服务器一组，i = 1 ~ 6）：
- SSH_HOST_i   必填，IP 或域名
- SSH_PORT_i   选填，默认 22
- SSH_USER_i   选填，默认 root
- SSH_KEY_i    私钥（与 SSH_PWD_i 二选一，优先私钥）
- SSH_PWD_i    密码（与 SSH_KEY_i 二选一）
- SSH_NAME_i   显示名称，默认 Server i
  */

export default async function (ctx) {

// 🎯 私钥解析器：严格遵循标准 PEM 格式（每 64 字符换行）重构秘钥
const parsePrivateKey = (key) => {
if (!key) return “”;
let k = String(key).trim().replace(/\n/g, ‘\n’).replace(/\r/g, ‘’);

```
// 如果没有换行符，且包含 BEGIN 和 END，说明被 YAML 彻底压扁了
if (!k.includes('\n') && k.includes('-----BEGIN') && k.includes('-----END')) {
  const headerMatch = k.match(/-----BEGIN [A-Z ]+-----/);
  const footerMatch = k.match(/-----END [A-Z ]+-----/);

  if (headerMatch && footerMatch) {
    const header = headerMatch[0];
    const footer = footerMatch[0];
    // 提取中间的加密主体，并剔除所有空格
    let body = k.substring(k.indexOf(header) + header.length, k.indexOf(footer)).replace(/\s+/g, '');
    // 严格按照 PEM 规范，每 64 个字符切分换行
    let bodyLines = body.match(/.{1,64}/g)?.join('\n') || body;
    k = `${header}\n${bodyLines}\n${footer}\n`;
  }
}
return k;
```

};

// ── 调色板 ─────────────────────────────────────────────────────────
const C = {
bg:     { light: ‘#FFFFFF’, dark: ‘#1C1C1E’ },
barBg:  { light: ‘#E5E5EA’, dark: ‘#38383A’ },
sep:    { light: ‘#E5E5EA’, dark: ‘#2C2C2E’ },
text:   { light: ‘#000000’, dark: ‘#FFFFFF’ },
subText:{ light: ‘#666666’, dark: ‘#999999’ },
muted:  { light: ‘#8E8E93’, dark: ‘#8E8E93’ },
cpu:    { light: ‘#34C759’, dark: ‘#30D158’ },
mem:    { light: ‘#007AFF’, dark: ‘#0A84FF’ },
disk:   { light: ‘#FF9500’, dark: ‘#FF9F0A’ },
net:    { light: ‘#FF2D55’, dark: ‘#FF375F’ },
temp:   { light: ‘#FF3B30’, dark: ‘#FF453A’ },
cpuBg:  { light: ‘#EAF6ED’, dark: ‘#1A291E’ },
memBg:  { light: ‘#EBF4FA’, dark: ‘#1A2433’ },
dskBg:  { light: ‘#FDF1E3’, dark: ‘#33261A’ },
netBg:  { light: ‘#FCEAEF’, dark: ‘#331A20’ },
};

const pctColor = (pct, lo, hi) => pct >= hi ? C.temp : pct >= lo ? C.disk : C.cpu;

const fmtBytes = b => {
if (b >= 1e12) return (b / 1e12).toFixed(1) + ‘T’;
if (b >= 1e9)  return (b / 1e9).toFixed(1)  + ‘G’;
if (b >= 1e6)  return (b / 1e6).toFixed(1)  + ‘M’;
if (b >= 1e3)  return (b / 1e3).toFixed(0)  + ‘K’;
return Math.round(b) + ‘B’;
};

// ── 读取所有服务器配置，跳过未填写 HOST 的条目 ───────────────────
const servers = [];
for (let i = 1; i <= 6; i++) {
const host = String(ctx.env[`SSH_HOST_${i}`] || “”).trim();
if (!host) continue;
servers.push({
idx:        i,
host,
port:       Number(ctx.env[`SSH_PORT_${i}`]) || 22,
username:   String(ctx.env[`SSH_USER_${i}`]  || “root”).trim(),
password:   ctx.env[`SSH_PWD_${i}`]  || “”,
privateKey: parsePrivateKey(ctx.env[`SSH_KEY_${i}`] || “”),
name:       String(ctx.env[`SSH_NAME_${i}`]  || `Server ${i}`).trim(),
});
}

if (servers.length === 0) {
return { type: ‘widget’, backgroundColor: C.bg, children: [] };
}

// ── 单台采集函数 ────────────────────────────────────────────────────
const fetchOne = async (srv) => {
let session = null;
try {
session = await ctx.ssh.connect({
host: srv.host, port: srv.port, username: srv.username,
…(srv.privateKey ? { privateKey: srv.privateKey } : { password: srv.password }),
timeout: 8000,
});

```
  const SEP = '<<SEP>>';
  const cmds = [
    'cat /proc/loadavg',
    'cat /proc/uptime',
    'head -1 /proc/stat',
    'free -b',
    'df -B1 / | tail -1',
    'nproc',
    "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev",
    'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0',
    "awk '$3~/^(sd[a-z]|vd[a-z]|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/{r+=$6;w+=$10}END{print r*512,w*512}' /proc/diskstats 2>/dev/null || echo '0 0'"
  ];
  const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
  const p = stdout.split(SEP).map(s => s.trim());

  // Load / Uptime
  const la = (p[0] || '0 0 0').split(' ');
  let uptimeStr = "0秒";
  const upSec = parseFloat((p[1] || '0').split(' ')[0]);
  if (!isNaN(upSec) && upSec > 0) {
    const y = Math.floor(upSec / 31536000), mo = Math.floor((upSec % 31536000) / 2592000), days = Math.floor((upSec % 2592000) / 86400);
    const h = Math.floor((upSec % 86400) / 3600), m = Math.floor((upSec % 3600) / 60), s = Math.floor(upSec % 60);
    const parts = [];
    if (y > 0) parts.push(`${y}年`); if (mo > 0) parts.push(`${mo}月`); if (days > 0) parts.push(`${days}天`);
    if (h > 0) parts.push(`${h}时`); if (m > 0) parts.push(`${m}分`); if (s > 0) parts.push(`${s}秒`);
    uptimeStr = parts.join('');
  }

  // CPU（差值法，Storage 键带服务器编号隔离）
  const cpuNums = (p[2] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
  const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
  const prevCpu = ctx.storage.getJSON(`_cpu_${srv.idx}`);
  let cpuPct = 0;
  if (prevCpu && cpuTotal > prevCpu.t) {
    cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
  }
  ctx.storage.setJSON(`_cpu_${srv.idx}`, { t: cpuTotal, i: cpuIdle });

  // MEM
  const memLine = (p[3] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
  const mm = memLine.split(/\s+/);
  const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0;
  const memPct = Math.round((memUsed / memTotal) * 100);

  // Disk / Cores
  const df = (p[4] || '').split(/\s+/);
  const diskTotal = Number(df[1]) || 1, diskUsed = Number(df[2]) || 0;
  const diskPct = parseInt(df[4]) || 0;
  const cores = parseInt(p[5]) || 1;

  // NET（Storage 键带服务器编号隔离）
  const nn = (p[6] || '0 0').split(' ');
  const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
  const prevNet = ctx.storage.getJSON(`_net_${srv.idx}`), now = Date.now();
  let rxRate = 0, txRate = 0;
  if (prevNet && prevNet.ts) {
    const el = (now - prevNet.ts) / 1000;
    if (el > 0 && el < 3600) {
      rxRate = Math.max(0, (netRx - prevNet.rx) / el);
      txRate = Math.max(0, (netTx - prevNet.tx) / el);
    }
  }
  ctx.storage.setJSON(`_net_${srv.idx}`, { rx: netRx, tx: netTx, ts: now });

  // Temp
  const tempRaw = parseInt(p[7]) || 0;
  const temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;

  return {
    ok: true,
    name: srv.name, host: srv.host,
    cpuPct: Math.max(0, Math.min(100, cpuPct)), cores, load: la,
    memPct, memUsed, memTotal,
    diskPct, diskTotal, diskUsed,
    rxRate, txRate, netRx, netTx,
    temp, uptimeStr,
  };

} catch (e) {
  const errStr = String(e.message || e);
  // 🚀 解除屏蔽：将真实原生系统报错打印在屏幕上
  let error;
  if (errStr.includes('timed out'))                    error = '请求超时 (Timed Out)';
  else if (errStr.toLowerCase().includes('connect'))   error = '拒绝连接 (Connection Refused)';
  else                                                  error = errStr;
  return { ok: false, name: srv.name, host: srv.host, error };

} finally {
  if (session) { try { await session.close(); } catch (err) {} }
}
```

};

// ── 并发拉取，allSettled 保证单台失败不影响其余台 ─────────────────
const settled = await Promise.allSettled(servers.map(s => fetchOne(s)));
const data    = settled.map(r => r.status === ‘fulfilled’ ? r.value : { ok: false, name: ‘?’, host: ‘’, error: ‘内部错误’ });
const online  = data.filter(d => d.ok).length;

// ── 通用进度条 ──────────────────────────────────────────────────────
const bar = (pct, color) => ({
type: ‘stack’, direction: ‘row’, height: 4, borderRadius: 2, backgroundColor: C.barBg,
children: pct > 0
? [ { type: ‘stack’, flex: Math.max(1, pct), height: 4, borderRadius: 2, backgroundColor: color, children: [] },
…(pct < 100 ? [{ type: ‘spacer’, flex: 100 - pct }] : []) ]
: [{ type: ‘spacer’ }],
});

// ── Small / 单机版卡片组件（与原版一致）──────────────────────────
const statCard = (icon, title, value, subtext, pct, color, bg) => ({
type: ‘stack’, direction: ‘column’, flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
children: [
{ type: ‘stack’, direction: ‘row’, alignItems: ‘center’, height: 16, gap: 4, children: [
{ type: ‘image’, src: `sf-symbol:${icon}`, color, width: 12, height: 12 },
{ type: ‘text’, text: title, font: { size: 11, weight: ‘bold’ }, textColor: C.text },
{ type: ‘spacer’ },
{ type: ‘text’, text: value, font: { size: 13, weight: ‘heavy’, family: ‘Menlo’ }, textColor: color }
]},
{ type: ‘spacer’ },
{ type: ‘stack’, direction: ‘column’, height: 24, justifyContent: ‘flex-start’, gap: 4, children: [
bar(pct, color),
{ type: ‘text’, text: subtext, font: { size: 9, family: ‘Menlo’ }, textColor: C.subText, maxLines: 1 }
]}
]
});

const netCard = (d, bg) => ({
type: ‘stack’, direction: ‘column’, flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
children: [
{ type: ‘stack’, direction: ‘row’, alignItems: ‘center’, height: 16, gap: 4, children: [
{ type: ‘image’, src: ‘sf-symbol:network’, color: C.net, width: 12, height: 12 },
{ type: ‘text’, text: ‘NET’, font: { size: 11, weight: ‘bold’ }, textColor: C.text },
{ type: ‘spacer’ },
{ type: ‘text’, text: d.host, font: { size: 9, family: ‘Menlo’ }, textColor: C.subText, maxLines: 1 }
]},
{ type: ‘spacer’ },
{ type: ‘stack’, direction: ‘column’, height: 24, justifyContent: ‘flex-start’, gap: 1, children: [
{ type: ‘stack’, direction: ‘row’, children: [
{ type: ‘text’, text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: ‘bold’, family: ‘Menlo’ }, textColor: C.net },
{ type: ‘spacer’ },
{ type: ‘text’, text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: ‘bold’, family: ‘Menlo’ }, textColor: C.mem }
]},
{ type: ‘stack’, direction: ‘row’, children: [
{ type: ‘text’, text: `↓${fmtBytes(d.netRx)}`, font: { size: 8, family: ‘Menlo’ }, textColor: C.subText },
{ type: ‘spacer’ },
{ type: ‘text’, text: `↑${fmtBytes(d.netTx)}`, font: { size: 8, family: ‘Menlo’ }, textColor: C.subText }
]}
]}
]
});

// ── Small 专用 Header ───────────────────────────────────────────────
const headerSmall = (d) => ({
type: ‘stack’, direction: ‘row’, alignItems: ‘center’, gap: 0, padding: 0,
children: [
{ type: ‘image’, src: ‘sf-symbol:server.rack’, color: C.text, width: 14, height: 14 },
{ type: ‘spacer’, length: 6 },
{ type: ‘text’, text: d.name, font: { size: 14, weight: ‘heavy’ }, textColor: C.text, maxLines: 1 },
{ type: ‘spacer’ },
…(d.temp > 0 ? [
{ type: ‘image’, src: ‘sf-symbol:thermometer.medium’, color: pctColor(d.temp, 60, 80), width: 11, height: 11 },
{ type: ‘text’, text: `${d.temp}°`, font: { size: 11, weight: ‘bold’, family: ‘Menlo’ }, textColor: pctColor(d.temp, 60, 80) },
{ type: ‘spacer’, length: 6 }
] : []),
{ type: ‘stack’, direction: ‘row’, alignItems: ‘center’, gap: 2, children: [
{ type: ‘image’, src: ‘sf-symbol:clock’, color: C.disk, width: 11, height: 11 },
{ type: ‘text’, text: d.uptimeStr, font: { size: 10, weight: ‘bold’ }, textColor: C.disk, maxLines: 1 }
]}
],
});

// ── Large / Medium 顶部 Header ──────────────────────────────────────
const headerMulti = {
type: ‘stack’, direction: ‘row’, alignItems: ‘center’, gap: 6,
children: [
{ type: ‘image’, src: ‘sf-symbol:server.rack’, color: C.text, width: 14, height: 14 },
{ type: ‘spacer’, length: 2 },
{ type: ‘text’, text: ‘服务器监控’, font: { size: 14, weight: ‘heavy’ }, textColor: C.text },
{ type: ‘spacer’ },
{ type: ‘text’,
text: `${online}/${data.length} 在线`,
font: { size: 11, weight: ‘bold’ },
textColor: online === data.length ? C.cpu : online === 0 ? C.temp : C.disk },
]
};

// ── 分隔线 ──────────────────────────────────────────────────────────
const sepLine = { type: ‘stack’, height: 1, backgroundColor: C.sep };

// ── Large 版每台一行 ────────────────────────────────────────────────
const serverRowLarge = (d) => {
if (!d.ok) return {
type: ‘stack’, direction: ‘row’, alignItems: ‘center’, gap: 6,
children: [
{ type: ‘text’, text: d.name, font: { size: 12, weight: ‘heavy’ }, textColor: C.text, width: 70, maxLines: 1 },
{ type: ‘image’, src: ‘sf-symbol:exclamationmark.triangle.fill’, color: C.temp, width: 11, height: 11 },
{ type: ‘text’, text: d.error, font: { size: 10, family: ‘Menlo’ }, textColor: C.muted, maxLines: 1, flex: 1 },
]
};

```
const cpuC  = pctColor(d.cpuPct,  70, 90);
const memC  = pctColor(d.memPct,  80, 95);
const diskC = pctColor(d.diskPct, 80, 95);
const tmpC  = pctColor(d.temp,    60, 80);

const miniBar = (pct, color, w) => ({
  type: 'stack', direction: 'row', height: 3, borderRadius: 2, backgroundColor: C.barBg, width: w,
  children: pct > 0
    ? [ { type: 'stack', flex: Math.max(1, pct), height: 3, borderRadius: 2, backgroundColor: color },
        ...(pct < 100 ? [{ type: 'stack', flex: 100 - pct }] : []) ]
    : [{ type: 'spacer' }],
});

const metricCol = (label, pct, color, w) => ({
  type: 'stack', direction: 'column', width: w, gap: 2,
  children: [
    { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
      { type: 'text', text: label, font: { size: 9, weight: 'bold' }, textColor: C.subText },
      { type: 'text', text: `${pct}%`, font: { size: 11, weight: 'heavy', family: 'Menlo' }, textColor: color },
    ]},
    miniBar(pct, color, w - 8),
  ]
});

return {
  type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
  children: [
    // 名称 + 运行时长
    { type: 'stack', direction: 'column', width: 68, gap: 1, children: [
      { type: 'text', text: d.name,      font: { size: 12, weight: 'heavy' }, textColor: C.text, maxLines: 1 },
      { type: 'text', text: d.uptimeStr, font: { size: 9, family: 'Menlo' }, textColor: C.muted, maxLines: 1 },
    ]},
    // CPU / MEM / DSK 进度条
    metricCol('C', d.cpuPct,  cpuC,  46),
    metricCol('M', d.memPct,  memC,  46),
    metricCol('D', d.diskPct, diskC, 44),
    { type: 'spacer' },
    // 网速
    { type: 'stack', direction: 'column', gap: 1, alignItems: 'flex-end', children: [
      { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.net },
      { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.mem },
    ]},
    // 温度
    { type: 'stack', direction: 'row', alignItems: 'center', gap: 1, width: 34,
      children: d.temp > 0
        ? [ { type: 'image', src: 'sf-symbol:thermometer.medium', color: tmpC, width: 10, height: 10 },
            { type: 'text', text: `${d.temp}°`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: tmpC } ]
        : [] },
  ]
};
```

};

// ── Medium 版精简行 ─────────────────────────────────────────────────
const serverRowMedium = (d) => {
if (!d.ok) return {
type: ‘stack’, direction: ‘row’, alignItems: ‘center’, gap: 6,
children: [
{ type: ‘text’, text: d.name, font: { size: 12, weight: ‘heavy’ }, textColor: C.text, width: 62, maxLines: 1 },
{ type: ‘image’, src: ‘sf-symbol:exclamationmark.triangle.fill’, color: C.temp, width: 11, height: 11 },
{ type: ‘text’, text: d.error, font: { size: 10, family: ‘Menlo’ }, textColor: C.muted, maxLines: 1, flex: 1 },
]
};

```
const cpuC = pctColor(d.cpuPct, 70, 90);
const memC = pctColor(d.memPct, 80, 95);

const miniBar = (pct, color, w) => ({
  type: 'stack', direction: 'row', height: 3, borderRadius: 2, backgroundColor: C.barBg, width: w,
  children: pct > 0
    ? [ { type: 'stack', flex: Math.max(1, pct), height: 3, borderRadius: 2, backgroundColor: color },
        ...(pct < 100 ? [{ type: 'stack', flex: 100 - pct }] : []) ]
    : [{ type: 'spacer' }],
});

const metricCol = (label, pct, color, w) => ({
  type: 'stack', direction: 'column', width: w, gap: 2,
  children: [
    { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
      { type: 'text', text: label, font: { size: 9, weight: 'bold' }, textColor: C.subText },
      { type: 'text', text: `${pct}%`, font: { size: 11, weight: 'heavy', family: 'Menlo' }, textColor: color },
    ]},
    miniBar(pct, color, w - 8),
  ]
});

return {
  type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
  children: [
    { type: 'text', text: d.name, font: { size: 12, weight: 'heavy' }, textColor: C.text, width: 62, maxLines: 1 },
    metricCol('C', d.cpuPct, cpuC, 50),
    metricCol('M', d.memPct, memC, 50),
    { type: 'spacer' },
    { type: 'stack', direction: 'column', gap: 1, alignItems: 'flex-end', children: [
      { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.net },
      { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.mem },
    ]},
  ]
};
```

};

const interleave = (rows, sep) => rows.flatMap((r, i) => i < rows.length - 1 ? [r, sep] : [r]);

// ── systemLarge：全部 6 台 ────────────────────────────────────────
if (ctx.widgetFamily === ‘systemLarge’) {
return {
type: ‘widget’, backgroundColor: C.bg, padding: [10, 14, 12, 14],
children: [
headerMulti,
{ type: ‘spacer’, length: 8 },
{ type: ‘stack’, direction: ‘column’, flex: 1, gap: 5,
children: interleave(data.map(serverRowLarge), sepLine) },
{ type: ‘spacer’ },
]
};
}

// ── systemMedium：前 3 台 ─────────────────────────────────────────
if (ctx.widgetFamily === ‘systemMedium’) {
return {
type: ‘widget’, backgroundColor: C.bg, padding: [10, 14, 12, 14],
children: [
headerMulti,
{ type: ‘spacer’, length: 8 },
{ type: ‘stack’, direction: ‘column’, flex: 1, gap: 5,
children: interleave(data.slice(0, 3).map(serverRowMedium), sepLine) },
{ type: ‘spacer’ },
]
};
}

// ── systemSmall：第 1 台（与原单机版一致）─────────────────────────
if (ctx.widgetFamily === ‘systemSmall’) {
const d = data[0];
if (!d) return { type: ‘widget’, backgroundColor: C.bg, children: [] };

```
if (!d.ok) {
  return {
    type: 'widget', padding: 16, gap: 8, backgroundColor: C.bg,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
        { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 22, height: 22 },
        { type: 'text', text: '连接断开', font: { size: 16, weight: 'heavy' }, textColor: C.text },
      ]},
      { type: 'text', text: d.error, font: { size: 10, family: 'Menlo' }, textColor: C.muted, maxLines: 4 },
    ],
  };
}

const cpuC  = pctColor(d.cpuPct,  70, 90);
const memC  = pctColor(d.memPct,  80, 95);
const diskC = pctColor(d.diskPct, 80, 95);

return {
  type: 'widget', backgroundColor: C.bg, padding: [10, 14, 12, 14],
  children: [
    headerSmall(d),
    { type: 'spacer', length: 6 },
    { type: 'stack', direction: 'row', flex: 1, gap: 4,
      children: [ statCard('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}C | Ld: ${d.load[0]}`, d.cpuPct, cpuC, C.cpuBg),
                  statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, memC, C.memBg) ] },
    { type: 'spacer', length: 4 },
    { type: 'stack', direction: 'row', flex: 1, gap: 4,
      children: [ statCard('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, diskC, C.dskBg),
                  netCard(d, C.netBg) ] },
  ]
};
```

}

return {
type: ‘widget’, backgroundColor: C.bg, padding: 16,
children: [{ type: ‘text’, text: ‘请使用 Large / Medium / Small 组件。’, textColor: C.text }]
};
}