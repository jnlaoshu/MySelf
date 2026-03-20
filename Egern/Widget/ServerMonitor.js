/**
 * ==========================================
 * 📌 模块名称: 服务器监控 (Server Monitor)
 * ✨ 主要功能: 基于 SSH 直连的智能集群监控探针。支持 1-6 节点自动识别：多节点并发抓取，采用 8s 宽裕超时与底层防崩溃护盾，自动无缝变身紧凑列表模式并直显真实报错。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.20 08:15 (弱网自适应版)
 * ==========================================
 */

export default async function (ctx) {
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

  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

  const pctColor = (pct, lo, hi) => pct >= hi ? C.temp : pct >= lo ? C.disk : C.cpu;

  // 1. 扫描解析配置
  let servers = [];
  if (ctx.env) {
    for (let i = 1; i <= 6; i++) {
      const h = (ctx.env[`SSH${i}_HOST`] || '').trim();
      if (h) {
        servers.push({
          host: h,
          port: Number(ctx.env[`SSH${i}_PORT`] || 22),
          username: (ctx.env[`SSH${i}_USER`] || 'root').trim(),
          password: ctx.env[`SSH${i}_PWD`] || '',
          privateKey: (ctx.env[`SSH${i}_KEY`] || '').replace(/\\n/g, '\n'),
          name: (ctx.env[`SSH${i}_NAME`] || '').trim(),
          idx: i
        });
      }
    }
    // 兼容单参数
    if (servers.length === 0 && (ctx.env.SSH_HOST || ctx.env.host)) {
      servers.push({
        host: (ctx.env.SSH_HOST || ctx.env.host).trim(),
        port: Number(ctx.env.SSH_PORT || ctx.env.port || 22),
        username: (ctx.env.SSH_USER || ctx.env.username || 'root').trim(),
        password: ctx.env.SSH_PWD || ctx.env.password || '',
        privateKey: (ctx.env.SSH_KEY || ctx.env.privateKey || '').replace(/\\n/g, '\n'),
        name: (ctx.env.SSH_NAME || '').trim(),
        idx: 1
      });
    }
  }

  // 🛑 纯净拦截
  if (servers.length === 0) {
    return { type: 'widget', backgroundColor: C.bg, children: [] };
  }

  // 2. 核心抓取函数
  const fetchServer = async (srv) => {
    let d = { host: srv.host, customName: srv.name };
    let session = null;
    try {
      // 🔥 恢复到 8000 毫秒（8秒）：因为底层的 finally 已经保证了不会白屏，现在可以给 4G 网络充足的时间建立连接
      session = await ctx.ssh.connect({
        host: srv.host, port: srv.port, username: srv.username,
        ...(srv.privateKey ? { privateKey: srv.privateKey } : { password: srv.password }),
        timeout: 8000, 
      });

      const SEP = '<<SEP>>';
      const cmds = [
        'hostname -s 2>/dev/null || hostname',
        'cat /proc/loadavg',
        'cat /proc/uptime',
        'head -1 /proc/stat',
        'free -b',
        'df -B1 / | tail -1',
        'nproc',
        'uname -r',
        "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev",
        'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0',
        "awk '$3~/^(sd[a-z]|vd[a-z]|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/{r+=$6;w+=$10}END{print r*512,w*512}' /proc/diskstats 2>/dev/null || echo '0 0'"
      ];
      const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
      
      const p = stdout.split(SEP).map(s => s.trim());
      d.hostname = srv.name || p[0] || 'server';
      const la = (p[1] || '0 0 0').split(' ');
      d.load = [la[0], la[1], la[2]];
      
      let uptimeStr = "0秒";
      const upSec = parseFloat((p[2] || '0').split(' ')[0]);
      if (!isNaN(upSec) && upSec > 0) {
        const y = Math.floor(upSec / 31536000);
        const mo = Math.floor((upSec % 31536000) / 2592000);
        const days = Math.floor((upSec % 2592000) / 86400);
        const h = Math.floor((upSec % 86400) / 3600);
        const m = Math.floor((upSec % 3600) / 60);
        const s = Math.floor(upSec % 60);
        const parts = [];
        if (y > 0) parts.push(`${y}年`);
        if (mo > 0) parts.push(`${mo}月`);
        if (days > 0) parts.push(`${days}天`);
        if (h > 0) parts.push(`${h}时`);
        if (m > 0) parts.push(`${m}分`);
        if (s > 0) parts.push(`${s}秒`);
        uptimeStr = parts.join(''); 
      }
      d.uptimeStr = uptimeStr;

      const cpuNums = (p[3] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
      const cpuTotal = cpuNums.reduce((a, b) => a + b, 0);
      const cpuIdle = cpuNums[3] || 0;
      const cpuKey = `_cpu_n${srv.idx}`;
      const prevCpu = ctx.storage.getJSON(cpuKey);
      let cpuPct = 0;
      if (prevCpu && cpuTotal > prevCpu.t) {
        cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
      }
      ctx.storage.setJSON(cpuKey, { t: cpuTotal, i: cpuIdle });
      d.cpuPct = Math.max(0, Math.min(100, cpuPct));

      const memLine = (p[4] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
      const mm = memLine.split(/\s+/);
      d.memTotal = Number(mm[1]) || 1; 
      d.memUsed = Number(mm[2]) || 0;
      d.memPct = Math.round((d.memUsed / d.memTotal) * 100);

      const df = (p[5] || '').split(/\s+/);
      d.diskTotal = Number(df[1]) || 1; 
      d.diskUsed = Number(df[2]) || 0;
      d.diskPct = parseInt(df[4]) || 0;
      d.cores = parseInt(p[6]) || 1;

      const nn = (p[8] || '0 0').split(' ');
      const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
      const netKey = `_net_n${srv.idx}`;
      const prevNet = ctx.storage.getJSON(netKey);
      const now = Date.now();
      d.rxRate = 0; d.txRate = 0;
      if (prevNet && prevNet.ts) {
        const el = (now - prevNet.ts) / 1000;
        if (el > 0 && el < 3600) {
          d.rxRate = Math.max(0, (netRx - prevNet.rx) / el);
          d.txRate = Math.max(0, (netTx - prevNet.tx) / el);
        }
      }
      ctx.storage.setJSON(netKey, { rx: netRx, tx: netTx, ts: now });
      d.netRx = netRx; d.netTx = netTx;

      const tempRaw = parseInt(p[9]) || 0;
      d.temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;

    } catch (e) {
      // 获取真实报错原因，并精简显示
      const errStr = String(e.message || e);
      d.error = errStr.includes('timed out') ? '请求超时' : 
                errStr.includes('auth') ? '认证失败(密/钥误)' : 
                errStr.includes('connect') ? '拒绝连接/网络不通' : '连接异常';
      d.hostname = srv.name || srv.host;
    } finally {
      if (session) {
        try { await session.close(); } catch (err) {}
      }
    }
    return d;
  };

  const results = await Promise.all(servers.map(fetchServer));

  // ==========================================
  // 模式 A: 单台详情卡片
  // ==========================================
  if (results.length === 1) {
    const d = results[0];

    if (d.error) {
      return {
        type: 'widget', padding: 16, gap: 8, backgroundColor: C.bg,
        children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
            { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 22, height: 22 },
            { type: 'text', text: '连接失败', font: { size: 16, weight: 'heavy' }, textColor: C.text },
          ]},
          { type: 'text', text: d.error, font: { size: 11, family: 'Menlo' }, textColor: C.muted, maxLines: 3 },
        ],
      };
    }

    const bar = (pct, color) => ({
      type: 'stack', direction: 'row', height: 4, borderRadius: 2, backgroundColor: C.barBg,
      children: pct > 0
        ? [ { type: 'stack', flex: Math.max(1, pct), height: 4, borderRadius: 2, backgroundColor: color, children: [] }, ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : []), ]
        : [{ type: 'spacer' }],
    });

    const statCard = (icon, title, value, subtext, pct, color, bg) => ({
      type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
          { type: 'image', src: `sf-symbol:${icon}`, color: color, width: 12, height: 12 },
          { type: 'text', text: title, font: { size: 11, weight: 'bold' }, textColor: C.text },
          { type: 'spacer' },
          { type: 'text', text: value, font: { size: 13, weight: 'heavy', family: 'Menlo' }, textColor: color }
        ]},
        { type: 'spacer' }, 
        { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 4, children: [
          bar(pct, color),
          { type: 'text', text: subtext, font: { size: 9, family: 'Menlo' }, textColor: C.subText, maxLines: 1 }
        ]}
      ]
    });

    const netCard = (bg) => ({
      type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
          { type: 'image', src: 'sf-symbol:network', color: C.net, width: 12, height: 12 },
          { type: 'text', text: 'NET', font: { size: 11, weight: 'bold' }, textColor: C.text },
          { type: 'spacer' },
          { type: 'text', text: d.host, font: { size: 9, family: 'Menlo' }, textColor: C.subText, maxLines: 1 }
        ]},
        { type: 'spacer' }, 
        { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 1, children: [
          { type: 'stack', direction: 'row', children: [
            { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.net },
            { type: 'spacer' },
            { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.mem }
          ]},
          { type: 'stack', direction: 'row', children: [
            { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.subText },
            { type: 'spacer' },
            { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.subText }
          ]}
        ]}
      ]
    });

    const header = () => ({
      type: 'stack', direction: 'row', alignItems: 'center', gap: 0, padding: 0, children: [
        { type: 'image', src: 'sf-symbol:server.rack', color: C.text, width: 14, height: 14 },
        { type: 'spacer', length: 6 },
        { type: 'text', text: d.hostname, font: { size: 14, weight: 'heavy' }, textColor: C.text, maxLines: 1 },
        { type: 'spacer' },
        ...(d.temp > 0 ? [
          { type: 'image', src: 'sf-symbol:thermometer.medium', color: pctColor(d.temp, 60, 80), width: 11, height: 11 },
          { type: 'text', text: `${d.temp}°`, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.temp, 60, 80) },
          { type: 'spacer', length: 6 }
        ] : []),
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
          { type: 'image', src: 'sf-symbol:clock', color: C.disk, width: 11, height: 11 },
          { type: 'text', text: d.uptimeStr, font: { size: 10, weight: 'bold' }, textColor: C.disk, maxLines: 1 }
        ]}
      ],
    });

    return {
      type: 'widget', backgroundColor: C.bg, padding: [10, 14, 12, 14], 
      children: [
        header(),
        { type: 'spacer', length: 6 }, 
        { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [
          statCard('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}C | Ld: ${d.load[0]}`, d.cpuPct, C.cpu, C.cpuBg),
          statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg)
        ]},
        { type: 'spacer', length: 4 }, 
        { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [
          statCard('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg),
          netCard(C.netBg)
        ]}
      ]
    };
  }

  // ==========================================
  // 模式 B: 集群紧凑列表模式
  // ==========================================
  const headerRow = {
    type: 'stack', direction: 'row', alignItems: 'center', padding: [0, 0, 4, 0], children: [
      { type: 'image', src: 'sf-symbol:server.rack', color: C.text, width: 14, height: 14 },
      { type: 'spacer', length: 6 },
      { type: 'text', text: '集群监控', font: { size: 14, weight: 'heavy' }, textColor: C.text },
      { type: 'spacer' },
      { type: 'text', text: `${results.length} Nodes`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: C.muted }
    ]
  };

  const listRows = results.map(d => {
    // 🎯 直显真实报错
    if (d.error) {
      return {
        type: 'stack', direction: 'row', alignItems: 'center', height: 22, gap: 6, children: [
          { type: 'text', text: d.hostname, font: { size: 11, weight: 'bold' }, textColor: C.muted, flex: 1, maxLines: 1 },
          { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 11, height: 11 },
          { type: 'text', text: d.error, font: { size: 10 }, textColor: C.temp, maxLines: 1 }
        ]
      };
    }
    return {
      type: 'stack', direction: 'row', alignItems: 'center', height: 22, gap: 6, children: [
        { type: 'text', text: d.hostname, font: { size: 11, weight: 'bold' }, textColor: C.text, width: 65, maxLines: 1 },
        { type: 'stack', direction: 'row', alignItems: 'center', width: 45, gap: 2, children: [
          { type: 'text', text: 'C', font: { size: 9, weight: 'bold' }, textColor: C.subText },
          { type: 'text', text: `${d.cpuPct}%`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.cpuPct, 60, 80) }
        ]},
        { type: 'stack', direction: 'row', alignItems: 'center', width: 45, gap: 2, children: [
          { type: 'text', text: 'M', font: { size: 9, weight: 'bold' }, textColor: C.subText },
          { type: 'text', text: `${d.memPct}%`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.memPct, 70, 90) }
        ]},
        { type: 'spacer' },
        { type: 'stack', direction: 'column', alignItems: 'flex-end', children: [
          { type: 'text', text: `↓ ${fmtBytes(d.rxRate)}/s`, font: { size: 9, family: 'Menlo', weight: 'bold' }, textColor: C.net },
          { type: 'text', text: `↑ ${fmtBytes(d.txRate)}/s`, font: { size: 9, family: 'Menlo', weight: 'bold' }, textColor: C.mem }
        ]}
      ]
    };
  });

  return {
    type: 'widget', backgroundColor: C.bg, padding: [10, 14, 12, 14],
    children: [
      headerRow,
      { type: 'spacer', length: 6 },
      { type: 'stack', direction: 'column', flex: 1, justifyContent: 'flex-start', gap: 4, children: listRows }
    ]
  };
}
