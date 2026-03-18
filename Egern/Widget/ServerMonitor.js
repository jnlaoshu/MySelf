/**
 * ==========================================
 * 📌 模块名称: 服务器监控 (Server Monitor)
 * ✨ 主要功能: 基于 SSH 直连协议，实时获取并测算远端主机的 CPU 负载、物理内存与 Swap 占用、磁盘存储利用率、网络实时上下行速率与历史吞吐总量、以及系统持续运行时长，内建防阻断容错机制。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.19 06:50
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
    if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB';
    if (b >= 1e9)  return (b / 1e9).toFixed(2) + ' GB';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + ' MB';
    if (b >= 1e3)  return (b / 1e3).toFixed(1) + ' KB';
    return Math.round(b) + ' B';
  };

  const fmtSpeed = b => {
    if (b >= 1e9)  return (b / 1e9).toFixed(2) + ' GB/s';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + ' MB/s';
    if (b >= 1e3)  return (b / 1e3).toFixed(1) + ' KB/s';
    return Math.round(b) + ' B/s';
  };

  let d;
  try {
    const { host, username, password, privateKey, port } = ctx.env;
    const session = await ctx.ssh.connect({ host, port: Number(port || 22), username, ...(privateKey ? { privateKey } : { password }), timeout: 8000 });
    const SEP = '<<SEP>>';
    const cmds = ['hostname -s 2>/dev/null || hostname', 'cat /proc/loadavg', 'uptime -p 2>/dev/null || uptime', 'head -1 /proc/stat', 'free -b', 'df -B1 / | tail -1', 'nproc', 'uname -r', "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev", 'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0', "awk '$3~/^(sd[a-z]|vd[a-z]|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/{r+=$6;w+=$10}END{print r*512,w*512}' /proc/diskstats 2>/dev/null || echo '0 0'"];
    const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
    await session.close();
    
    const p = stdout.split(SEP).map(s => s.trim());
    const hostname = customName || p[0] || 'server';
    
    let uptimeRaw = (p[2] || '').replace(/^up\s+/, '').replace(/,\s*$/, '');
    let uptime = uptimeRaw
      .replace(/years?/g, 'y')
      .replace(/weeks?/g, 'w')
      .replace(/days?/g, 'd')
      .replace(/hours?/g, 'h')
      .replace(/minutes?|mins?/g, 'm')
      .replace(/seconds?|secs?/g, 's')
      .replace(/,\s*/g, ' ')
      .replace(/\s+/g, ' ');
    uptime = uptime.replace(/(\d+):(\d+)/, (match, h, m) => `${Number(h)} h ${Number(m)} m`);
    
    const cpuNums = (p[3] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON('_cpu');
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    ctx.storage.setJSON('_cpu', { t: cpuTotal, i: cpuIdle });
    
    const freeOut = (p[4] || '').split('\n');
    const mm = (freeOut.find(l => /^Mem:/.test(l)) || '').split(/\s+/);
    const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0, memPct = Math.round((memUsed / memTotal) * 100);
    const sm = (freeOut.find(l => /^Swap:/.test(l)) || '').split(/\s+/);
    const swapTotal = Number(sm[1]) || 0, swapUsed = Number(sm[2]) || 0;
    const swapPct = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0;

    const df = (p[5] || '').split(/\s+/), diskPct = parseInt(df[4]) || 0;
    const nn = (p[8] || '0 0').split(' ');
    const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON('_net'), now = Date.now();
    let rxRate = 0, txRate = 0;
    if (prevNet && prevNet.ts) { const el = (now - prevNet.ts) / 1000; if (el > 0 && el < 3600) { rxRate = Math.max(0, (netRx - prevNet.rx) / el); txRate = Math.max(0, (netTx - prevNet.tx) / el); } }
    ctx.storage.setJSON('_net', { rx: netRx, tx: netTx, ts: now });
    
    d = { hostname, uptime, cpuPct, memPct, swapPct, diskPct, rxRate, txRate, netRx, netTx };
  } catch (e) { d = { error: String(e.message || e) }; }

  const C = {
    bg: { light: '#FFFFFF', dark: '#1C1C1E' },
    text: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#8E8E93', dark: '#8E8E93' },
    cpuBg: { light: '#F2FBF5', dark: '#1A291E' },
    cpuFg: { light: '#34C759', dark: '#32D74B' },
    memBg: { light: '#F0F8FF', dark: '#1A2433' },
    memFg: { light: '#007AFF', dark: '#0A84FF' },
    swapBg: { light: '#F4F0FF', dark: '#241C33' },
    swapFg: { light: '#AF52DE', dark: '#BF5AF2' },
    dskBg: { light: '#FFF9F0', dark: '#33261A' },
    dskFg: { light: '#FF9500', dark: '#FF9F0A' },
    netBg: { light: '#FFF0F3', dark: '#331A20' },
    netFg: { light: '#FF2D55', dark: '#FF375F' },
    trafBg: { light: '#F0F4FF', dark: '#1A2033' },
    trafFg: { light: '#5856D6', dark: '#5E5CE6' }
  };

  const topBox = (val, label, bg, fg) => ({
    type: 'stack', direction: 'column', flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: bg, cornerRadius: 8, padding: [12, 0], gap: 4,
    children: [
      { type: 'text', text: val, font: { size: 18, weight: 'heavy', family: 'Menlo' }, textColor: fg },
      { type: 'text', text: label, font: { size: 10, weight: 'bold' }, textColor: C.sub }
    ]
  });

  const bottomBox = (title, val1, val2, bg, fg) => ({
    type: 'stack', direction: 'column', flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: bg, cornerRadius: 8, padding: [12, 0], gap: 4,
    children: [
      { type: 'text', text: title, font: { size: 10, weight: 'bold' }, textColor: fg },
      { type: 'text', text: val1, font: { size: 11, weight: 'heavy', family: 'Menlo' }, textColor: C.text },
      { type: 'text', text: val2, font: { size: 11, weight: 'heavy', family: 'Menlo' }, textColor: C.text }
    ]
  });

  if (d.error) return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: 'Error', font: { size: 16, weight: 'bold' }, textColor: C.text }, { type: 'text', text: d.error, font: { size: 11 }, textColor: C.sub }] };

  return {
    type: 'widget', backgroundColor: C.bg, padding: [14, 14],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', children: [
        { type: 'text', text: d.hostname, font: { size: 15, weight: 'heavy' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'image', src: 'sf-symbol:clock', color: C.dskFg, width: 12, height: 12 },
        { type: 'spacer', length: 4 },
        { type: 'text', text: d.uptime, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: C.dskFg }
      ]},
      { type: 'spacer', length: 12 },
      { type: 'stack', direction: 'row', gap: 4, children: [
        topBox(`${d.cpuPct}%`, 'CPU', C.cpuBg, C.cpuFg),
        topBox(`${d.memPct}%`, 'Mem', C.memBg, C.memFg),
        topBox(`${d.swapPct}%`, 'Swap', C.swapBg, C.swapFg),
        topBox(`${d.diskPct}%`, 'Disk', C.dskBg, C.dskFg)
      ]},
      { type: 'spacer', length: 4 },
      { type: 'stack', direction: 'row', gap: 4, children: [
        bottomBox('Net Speed', `↑ ${fmtSpeed(d.txRate)}`, `↓ ${fmtSpeed(d.rxRate)}`, C.netBg, C.netFg),
        bottomBox('Total Traffic', `↑ ${fmtBytes(d.netTx)}`, `↓ ${fmtBytes(d.netRx)}`, C.trafBg, C.trafFg)
      ]}
    ]
  };
}
