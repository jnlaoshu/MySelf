/**
 * ==========================================
 * 📌 模块名称: 服务器监控 (Server Monitor)
 * ✨ 主要功能: 通过 SSH 协议直连远端服务器，在桌面小组件中可视化渲染核心硬件指标。极简单机版，搭载严格 64 字符换行的标准 PEM 私钥重构引擎，及原生透明的底层错误捕获机制。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.20 17:45
 * ==========================================
 */

export default async function (ctx) {
  // 🎯 终极私钥解析器：严格遵循标准 PEM 格式（每 64 字符换行）重构秘钥
  const parsePrivateKey = (key) => {
    if (!key) return "";
    let k = String(key).trim().replace(/\\n/g, '\n').replace(/\\r/g, '');
    
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
  };

  const host = String(ctx.env.SSH_HOST || ctx.env.host || "").trim();
  const port = Number(ctx.env.SSH_PORT || ctx.env.port) || 22;
  const username = String(ctx.env.SSH_USER || ctx.env.username || "").trim() || "root";
  const password = ctx.env.SSH_PWD || ctx.env.password || "";
  const privateKey = parsePrivateKey(ctx.env.SSH_KEY || ctx.env.privateKey);
  const customName = String(ctx.env.SSH_NAME || "").trim() || "Oracle";

  const C = {
    bg: { light: '#FFFFFF', dark: '#1C1C1E' },
    barBg: { light: '#E5E5EA', dark: '#38383A' },
    text: { light: '#000000', dark: '#FFFFFF' },
    subText: { light: '#666666', dark: '#999999' }, 
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    cpu: { light: '#34C759', dark: '#30D158' },
    mem: { light: '#007AFF', dark: '#0A84FF' },
    disk: { light: '#FF9500', dark: '#FF9F0A' },
    net: { light: '#FF2D55', dark: '#FF375F' },
    temp: { light: '#FF3B30', dark: '#FF453A' },
    cpuBg: { light: '#EAF6ED', dark: '#1A291E' }, 
    memBg: { light: '#EBF4FA', dark: '#1A2433' }, 
    dskBg: { light: '#FDF1E3', dark: '#33261A' }, 
    netBg: { light: '#FCEAEF', dark: '#331A20' }, 
  };

  if (!host) return { type: 'widget', backgroundColor: C.bg, children: [] };

  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

  let d = { host, hostname: customName };
  let session = null;

  try {
    session = await ctx.ssh.connect({
      host, port, username,
      ...(privateKey ? { privateKey } : { password }),
      timeout: 8000,
    });

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
    const la = (p[0] || '0 0 0').split(' ');
    d.load = [la[0], la[1], la[2]];
    
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
    d.uptimeStr = uptimeStr;

    const cpuNums = (p[2] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON('_cpu');
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) {
      cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    }
    ctx.storage.setJSON('_cpu', { t: cpuTotal, i: cpuIdle });
    d.cpuPct = Math.max(0, Math.min(100, cpuPct));

    const memLine = (p[3] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
    const mm = memLine.split(/\s+/);
    d.memTotal = Number(mm[1]) || 1; d.memUsed = Number(mm[2]) || 0;
    d.memPct = Math.round((d.memUsed / d.memTotal) * 100);

    const df = (p[4] || '').split(/\s+/);
    d.diskTotal = Number(df[1]) || 1; d.diskUsed = Number(df[2]) || 0;
    d.diskPct = parseInt(df[4]) || 0; d.cores = parseInt(p[5]) || 1;

    const nn = (p[6] || '0 0').split(' '), netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON('_net'), now = Date.now();
    d.rxRate = 0; d.txRate = 0;
    if (prevNet && prevNet.ts) {
      const el = (now - prevNet.ts) / 1000;
      if (el > 0 && el < 3600) { d.rxRate = Math.max(0, (netRx - prevNet.rx) / el); d.txRate = Math.max(0, (netTx - prevNet.tx) / el); }
    }
    ctx.storage.setJSON('_net', { rx: netRx, tx: netTx, ts: now });
    d.netRx = netRx; d.netTx = netTx;

    const tempRaw = parseInt(p[7]) || 0; 
    d.temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;

  } catch (e) {
    const errStr = String(e.message || e);
    // 🚀 解除屏蔽：将真实原声系统报错打印在屏幕上
    if (errStr.includes('timed out')) d.error = '请求超时 (Timed Out)';
    else if (errStr.toLowerCase().includes('connect')) d.error = '拒绝连接 (Connection Refused)';
    else d.error = errStr; // 把其他所有错误（包括解析错误、算法不支持等）原样吐出！
  } finally {
    if (session) { try { await session.close(); } catch (err) {} }
  }

  const pctColor = (pct, lo, hi) => pct >= hi ? C.temp : pct >= lo ? C.disk : C.cpu;

  if (d.error) {
    return {
      type: 'widget', padding: 16, gap: 8, backgroundColor: C.bg,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
          { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 22, height: 22 },
          { type: 'text', text: '连接断开', font: { size: 16, weight: 'heavy' }, textColor: C.text },
        ]},
        // 使用 Menlo 等宽字体完整展示真实报错，支持 4 行显示
        { type: 'text', text: d.error, font: { size: 10, family: 'Menlo' }, textColor: C.muted, maxLines: 4 },
      ],
    };
  }

  const bar = (pct, color) => ({
    type: 'stack', direction: 'row', height: 4, borderRadius: 2, backgroundColor: C.barBg,
    children: pct > 0 ? [ { type: 'stack', flex: Math.max(1, pct), height: 4, borderRadius: 2, backgroundColor: color, children: [] }, ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : []), ] : [{ type: 'spacer' }],
  });

  const statCard = (icon, title, value, subtext, pct, color, bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
        { type: 'image', src: `sf-symbol:${icon}`, color: color, width: 12, height: 12 }, { type: 'text', text: title, font: { size: 11, weight: 'bold' }, textColor: C.text },
        { type: 'spacer' }, { type: 'text', text: value, font: { size: 13, weight: 'heavy', family: 'Menlo' }, textColor: color }
      ]}, { type: 'spacer' }, 
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 4, children: [ bar(pct, color), { type: 'text', text: subtext, font: { size: 9, family: 'Menlo' }, textColor: C.subText, maxLines: 1 } ]}
    ]
  });

  const netCard = (bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
        { type: 'image', src: 'sf-symbol:network', color: C.net, width: 12, height: 12 }, { type: 'text', text: 'NET', font: { size: 11, weight: 'bold' }, textColor: C.text },
        { type: 'spacer' }, { type: 'text', text: host, font: { size: 9, family: 'Menlo' }, textColor: C.subText, maxLines: 1 }
      ]}, { type: 'spacer' }, 
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 1, children: [
        { type: 'stack', direction: 'row', children: [ { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.net }, { type: 'spacer' }, { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.mem } ]},
        { type: 'stack', direction: 'row', children: [ { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.subText }, { type: 'spacer' }, { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.subText } ]}
      ]}
    ]
  });

  const header = () => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 0, padding: 0, children: [
      { type: 'image', src: 'sf-symbol:server.rack', color: C.text, width: 14, height: 14 }, { type: 'spacer', length: 6 },
      { type: 'text', text: d.hostname, font: { size: 14, weight: 'heavy' }, textColor: C.text, maxLines: 1 }, { type: 'spacer' },
      ...(d.temp > 0 ? [ { type: 'image', src: 'sf-symbol:thermometer.medium', color: pctColor(d.temp, 60, 80), width: 11, height: 11 }, { type: 'text', text: `${d.temp}°`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.temp, 60, 80) }, { type: 'spacer', length: 6 } ] : []),
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [ { type: 'image', src: 'sf-symbol:clock', color: C.disk, width: 11, height: 11 }, { type: 'text', text: d.uptimeStr, font: { size: 10, weight: 'bold' }, textColor: C.disk, maxLines: 1 } ]}
    ],
  });

  if (ctx.widgetFamily === 'systemMedium') {
    return {
      type: 'widget', backgroundColor: C.bg, padding: [10, 14, 12, 14], 
      children: [
        header(), { type: 'spacer', length: 6 }, 
        { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [ statCard('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}C | Ld: ${d.load[0]}`, d.cpuPct, C.cpu, C.cpuBg), statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg) ]}, { type: 'spacer', length: 4 }, 
        { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [ statCard('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg), netCard(C.netBg) ]}
      ]
    };
  }

  if (ctx.widgetFamily === 'systemSmall') {
    return {
      type: 'widget', backgroundColor: C.bg, padding: 12, gap: 6,
      children: [ header(), statCard('cpu', 'CPU', `${d.cpuPct}%`, `Ld: ${d.load[0]}`, d.cpuPct, C.cpu, C.cpuBg), statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)}`, d.memPct, C.mem, C.memBg) ],
    };
  }

  return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: '请使用 Medium 或 Small 组件。', textColor: C.text }] };
}
