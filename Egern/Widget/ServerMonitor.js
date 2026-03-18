/**
 * ==========================================
 * 📌 模块名称: 服务器监控 (Server Monitor)
 * ✨ 主要功能: 基于 SSH 协议直连服务器，实时抓取并解析 CPU 负载、内存占用、磁盘容量、网络 I/O 速率、系统运行时间及核心温度等底层硬件指标，内置网络超时与异常断连的捕捉及反馈机制。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.19 06:15
 * ==========================================
 */

export default async function (ctx) {
  if (ctx.env) {
    ctx.env.host = ctx.env.SSH_HOST || ctx.env.host || "";
    ctx.env.username = ctx.env.SSH_USER || ctx.env.username || "root";
    ctx.env.password = ctx.env.SSH_PWD || ctx.env.password || "";
    ctx.env.privateKey = ctx.env.SSH_KEY || ctx.env.privateKey || "";
    ctx.env.port = ctx.env.SSH_PORT || ctx.env.port || 22;
  }
  const customName = (ctx.env.SSH_NAME || "").trim();

  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

  let d;
  try {
    const { host, username, password, privateKey, port } = ctx.env;
    const session = await ctx.ssh.connect({ host, port: Number(port || 22), username, ...(privateKey ? { privateKey } : { password }), timeout: 8000 });
    const SEP = '<<SEP>>';
    const cmds = ['hostname -s 2>/dev/null || hostname', 'cat /proc/loadavg', 'uptime -p 2>/dev/null || uptime', 'head -1 /proc/stat', 'free -b', 'df -B1 / | tail -1', 'nproc', 'uname -r', "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev", 'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0', "awk '$3~/^(sd[a-z]|vd[a-z]|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/{r+=$6;w+=$10}END{print r*512,w*512}' /proc/diskstats 2>/dev/null || echo '0 0'", "ls /proc 2>/dev/null | grep -c '^[0-9]' || echo 0"];
    const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
    await session.close();
    const p = stdout.split(SEP).map(s => s.trim());
    const hostname = customName || p[0] || 'server';
    const uptime = (p[2] || '').replace(/^up\s+/, '').replace(/,\s*$/, '');
    const cpuNums = (p[3] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON('_cpu');
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    ctx.storage.setJSON('_cpu', { t: cpuTotal, i: cpuIdle });
    const mm = (p[4] || '').split('\n').find(l => /^Mem:/.test(l)).split(/\s+/);
    const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0, memPct = Math.round((memUsed / memTotal) * 100);
    const df = (p[5] || '').split(/\s+/), diskPct = parseInt(df[4]) || 0;
    const nn = (p[8] || '0 0').split(' ');
    const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON('_net'), now = Date.now();
    let rxRate = 0, txRate = 0;
    if (prevNet && prevNet.ts) { const el = (now - prevNet.ts) / 1000; if (el > 0 && el < 3600) { rxRate = Math.max(0, (netRx - prevNet.rx) / el); txRate = Math.max(0, (netTx - prevNet.tx) / el); } }
    ctx.storage.setJSON('_net', { rx: netRx, tx: netTx, ts: now });
    d = { hostname, uptime, cpuPct, memPct, diskPct, rxRate, txRate };
  } catch (e) { d = { error: String(e.message || e) }; }

  const C = {
    bg: { light: '#FFFFFF', dark: '#1C1C1E' },
    card: { light: '#F2F2F7', dark: '#2C2C2E' },
    text: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#8E8E93', dark: '#8E8E93' }
  };

  const bar = (pct, color) => ({
    type: 'stack', direction: 'row', height: 2.5, backgroundColor: { light: '#E5E5EA', dark: '#3A3A3C' }, cornerRadius: 1.25,
    children: pct > 0 ? [{ type: 'stack', flex: pct, height: 2.5, backgroundColor: color, cornerRadius: 1.25, children: [] }, { type: 'spacer', flex: 100 - pct }] : [{ type: 'spacer' }]
  });

  const gridBox = (label, value, pct, color) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: C.card, cornerRadius: 12, padding: [10, 8], gap: 4, alignItems: 'center',
    children: [
      { type: 'text', text: label, font: { size: 10, weight: 'semibold' }, textColor: C.sub },
      { type: 'text', text: value, font: { size: 15, weight: 'heavy', family: 'Menlo' }, textColor: C.text },
      { type: 'spacer', length: 2 },
      bar(pct, color)
    ]
  });

  if (d.error) return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: 'Error', font: { size: 16, weight: 'bold' }, textColor: C.text }, { type: 'text', text: d.error, font: { size: 11 }, textColor: C.sub }] };

  return {
    type: 'widget', backgroundColor: C.bg, padding: [12, 14],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', children: [
        { type: 'text', text: d.hostname, font: { size: 13, weight: 'heavy' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'text', text: d.uptime, font: { size: 10 }, textColor: C.sub }
      ]},
      { type: 'spacer', length: 12 },
      { type: 'stack', direction: 'row', gap: 2, children: [
        gridBox('CPU', `${d.cpuPct}%`, d.cpuPct, '#34C759'),
        gridBox('MEM', `${d.memPct}%`, d.memPct, '#007AFF')
      ]},
      { type: 'spacer', length: 2 },
      { type: 'stack', direction: 'row', gap: 2, children: [
        gridBox('DISK', `${d.diskPct}%`, d.diskPct, '#FF9500'),
        { type: 'stack', direction: 'column', flex: 1, backgroundColor: C.card, cornerRadius: 12, padding: [10, 8], gap: 4, alignItems: 'center', children: [
          { type: 'text', text: 'NET', font: { size: 10, weight: 'semibold' }, textColor: C.sub },
          { type: 'stack', direction: 'row', gap: 4, children: [
             { type: 'text', text: `↓${fmtBytes(d.rxRate)}`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: '#FF2D55' },
             { type: 'text', text: `↑${fmtBytes(d.txRate)}`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: '#AF52DE' }
          ]},
          { type: 'spacer', length: 2 },
          { type: 'stack', height: 2.5, children: [{ type: 'spacer' }] } 
        ]}
      ]}
    ]
  };
}
