/**
 * ==========================================
 * 📌 模块名称: 服务器监控 (Server Monitor)
 * ✨ 主要功能: 通过 SSH 直连获取核心指标。深度适配系统 UI，采用等宽双列布局与卡片式交互设计，确保与上方组件视觉高度协调，打造清晰、严谨的运维看板。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.19 00:20
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
    const la = (p[1] || '0 0 0').split(' ');
    const uptime = (p[2] || '').replace(/^up\s+/, '').replace(/,\s*$/, '');
    const cpuNums = (p[3] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON('_cpu');
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    ctx.storage.setJSON('_cpu', { t: cpuTotal, i: cpuIdle });
    const mm = (p[4] || '').split('\n').find(l => /^Mem:/.test(l)).split(/\s+/);
    const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0, memPct = Math.round((memUsed / memTotal) * 100);
    const df = (p[5] || '').split(/\s+/), diskTotal = Number(df[1]) || 1, diskUsed = Number(df[2]) || 0, diskPct = parseInt(df[4]) || 0;
    const nn = (p[8] || '0 0').split(' ');
    const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON('_net'), now = Date.now();
    let rxRate = 0, txRate = 0;
    if (prevNet && prevNet.ts) { const el = (now - prevNet.ts) / 1000; if (el > 0 && el < 3600) { rxRate = Math.max(0, (netRx - prevNet.rx) / el); txRate = Math.max(0, (netTx - prevNet.tx) / el); } }
    ctx.storage.setJSON('_net', { rx: netRx, tx: netTx, ts: now });
    d = { hostname, uptime, cpuPct, cores: parseInt(p[6]) || 1, load: la[0], memUsed, memTotal, memPct, diskUsed, diskTotal, diskPct, rxRate, txRate, procs: parseInt(p[11]) || 0 };
  } catch (e) { d = { error: String(e.message || e) }; }

  const C = {
    bg: { light: '#FFFFFF', dark: '#1C1C1E' },
    card: { light: '#F5F5F7', dark: '#2C2C2E' },
    accent: { light: '#007AFF', dark: '#0A84FF' },
    text: { light: '#1D1D1F', dark: '#F5F5F7' },
    sub: { light: '#86868B', dark: '#98989D' }
  };

  const bar = (pct, color) => ({
    type: 'stack', direction: 'row', height: 3, backgroundColor: { light: '#E5E5EA', dark: '#3A3A3C' }, cornerRadius: 1.5,
    children: pct > 0 ? [{ type: 'stack', flex: pct, height: 3, backgroundColor: color, cornerRadius: 1.5, children: [] }, { type: 'spacer', flex: 100 - pct }] : [{ type: 'spacer' }]
  });

  const infoBox = (title, value, sub, pct, color) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: C.card, cornerRadius: 10, padding: 8, gap: 4,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', children: [
        { type: 'text', text: title, font: { size: 11, weight: 'bold' }, textColor: C.sub },
        { type: 'spacer' },
        { type: 'text', text: `${pct}%`, font: { size: 11, weight: 'semibold', family: 'Menlo' }, textColor: color }
      ]},
      { type: 'text', text: value, font: { size: 16, weight: 'heavy', family: 'Menlo' }, textColor: C.text },
      bar(pct, color),
      { type: 'text', text: sub, font: { size: 9, family: 'Menlo' }, textColor: C.sub, maxLines: 1 }
    ]
  });

  if (d.error) return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: 'Connection Failed', font: { size: 16, weight: 'bold' }, textColor: C.text }, { type: 'text', text: d.error, font: { size: 12 }, textColor: C.sub }] };

  return {
    type: 'widget', backgroundColor: C.bg, padding: 12,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', children: [
        { type: 'image', src: 'sf-symbol:server.rack', color: C.accent, width: 14, height: 14 },
        { type: 'spacer', length: 6 },
        { type: 'text', text: d.hostname, font: { size: 14, weight: 'heavy' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'text', text: d.uptime, font: { size: 10 }, textColor: C.sub }
      ]},
      { type: 'spacer', length: 10 },
      { type: 'stack', direction: 'row', gap: 10, children: [
        infoBox('CPU', `${d.cpuPct}%`, `${d.cores}C / Ld ${d.load}`, d.cpuPct, '#34C759'),
        infoBox('MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)}/${fmtBytes(d.memTotal)}`, d.memPct, C.accent)
      ]},
      { type: 'spacer', length: 10 },
      { type: 'stack', direction: 'row', gap: 10, children: [
        infoBox('DISK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)}/${fmtBytes(d.diskTotal)}`, d.diskPct, '#FF9500'),
        { type: 'stack', direction: 'column', flex: 1, backgroundColor: C.card, cornerRadius: 10, padding: 8, gap: 4, children: [
          { type: 'text', text: 'NETWORK', font: { size: 11, weight: 'bold' }, textColor: C.sub },
          { type: 'stack', direction: 'row', children: [
            { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: '#FF2D55' },
            { type: 'spacer' },
            { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: C.accent }
          ]},
          { type: 'spacer' },
          { type: 'text', text: `${d.procs} processes running`, font: { size: 9 }, textColor: C.sub }
        ]}
      ]}
    ]
  };
}
