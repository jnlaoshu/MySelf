/*
 * 今日黄历&节假日倒数 (V33.0 极速精简版)
 * 核心优化：代码体积减半，保留严格日期匹配，杜绝串号
 */
(async () => {
  // 1. 初始化环境 (强制 UTC+8)
  const now = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const P = n => (n < 10 ? '0' + n : n);
  const YMD = (y, m, d) => `${y}/${P(m)}/${P(d)}`;
  const KEY = `${Y}${P(M)}${P(D)}`; // 20260117

  // 2. 农历核心 (压缩版)
  const Lunar = {
    info: [0x4bd8,0x4ae0,0xa570,0x54d5,0xd260,0xd950,0x16554,0x56a0,0x9ad0,0x55d2,0x4ae0,0xa5b6,0xa4d0,0xd250,0x1d255,0xb540,0xd6a0,0xada2,0x95b0,0x14977,0x4970,0xa4b0,0xb4b5,0x6a50,0x6d40,0x1ab54,0x2b60,0x9570,0x52f2,0x4970,0x6566,0xd4a0,0xea50,0x6e95,0x5ad0,0x2b60,0x186e3,0x92e0,0x1c8d7,0xc950,0xd4a0,0x1d8a6,0xb550,0x56a0,0x1a5b4,0x25d0,0x92d0,0xd2b2,0xa950,0xb557,0x6ca0,0xb550,0x15355,0x4da0,0xa5b0,0x14573,0x52b0,0xa9a8,0xe950,0x6aa0,0xaea6,0xab50,0x4b60,0xaae4,0xa570,0x5260,0xf263,0xd950,0x5b57,0x56a0,0x96d0,0x4dd5,0x4ad0,0xa4d0,0xd4d4,0xd250,0xd558,0xb540,0xb6a0,0x195a6,0x95b0,0x49b0,0xa974,0xa4b0,0xb27a,0x6a50,0x6d40,0xaf46,0xab60,0x9570,0x4af5,0x4970,0x64b0,0x74a3,0xea50,0x6b58,0x5ac0,0xab60,0x96d5,0x92e0,0xc960,0xd954,0xd4a0,0xda50,0x7552,0x56a0,0xabb7,0x25d0,0x92d0,0xcab5,0xa950,0xb4a0,0xbaa4,0xad50,0x55d9,0x4ba0,0xa5b0,0x15176,0x52b0,0xa930,0x7954,0x6aa0,0xad50,0x5b52,0x4b60,0xa6e6,0xa4e0,0xd260,0xea65,0xd530,0x5aa0,0x76a3,0x96d0,0x4afb,0x4ad0,0xa4d0,0x1d0b6,0xd250,0xd520,0xdd45,0xb5a0,0x56d0,0x55b2,0x49b0,0xa577,0xa4b0,0xaa50,0x1b255,0x6d20,0xada0,0x14b63,0x9370,0x49f8,0x4970,0x64b0,0x168a6,0xea50,0x6b20,0x1a6c4,0xaae0,0x92e0,0xd2e3,0xc960,0xd557,0xd4a0,0xda50,0x5d55,0x56a0,0xa6d0,0x55d4,0x52d0,0xa9b8,0xa950,0xb4a0,0xb6a6,0xad50,0x55a0,0xaba4,0xa5b0,0x52b0,0xb273,0x6930,0x7337,0x6aa0,0xad50,0x14b55,0x4b60,0xa570,0x54e4,0xd160,0xe968,0xd520,0xdaa0,0x16aa6,0x56d0,0x4ae0,0xa9d4,0xa2d0,0xd150,0xf252,0xd520,0xdd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"], dayStr: ["初","十","廿","卅"],
    leap(y) { return this.info[y-1900] & 0xf },
    lDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i?1:0); return s+(this.leap(y)?((this.info[y-1900]&0x10000)?30:29):0) },
    mDays(y,m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29 },
    term(y,n) { return new Date((31556925974.7*(y-1900)+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000)+Date.UTC(1900,0,6,2,5)).getUTCDate() },
    toObj(y,m,d) {
      let o = (Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000, i, temp=0;
      for(i=1900; i<2101 && o>0; i++) { temp=this.lDays(i); o-=temp; }
      if(o<0) { o+=temp; i--; }
      let lY=i, lep=this.leap(i), isLep=false;
      for(i=1; i<13 && o>0; i++) {
        if(lep>0 && i==(lep+1) && !isLep) { --i; isLep=true; temp=((this.info[lY-1900]&0x10000)?30:29); }
        else temp=this.mDays(lY,i);
        if(isLep && i==(lep+1)) isLep=false; o-=temp;
      }
      if(o==0 && lep>0 && i==lep+1 && !isLep) { isLep=true; --i; }
      if(o<0) { o+=temp; i--; }
      const lD = o+1, tId = m*2-(d<this.term(y,m*2-1)?2:1);
      const cnD = lD===10?"初十":lD===20?"二十":lD===30?"三十":this.dayStr[Math.floor(lD/10)]+["日","一","二","三","四","五","六","七","八","九"][lD%10];
      return {
        gz: this.gan[(lY-4)%10]+this.zhi[(lY-4)%12], ani: this.ani[(lY-4)%12], cn: `${isLep?"闰":""}${this.monStr[i-1]}月${cnD}`,
        term: (this.term(y,tId+1)==d) ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][tId] : "",
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    },
    l2s(y,m,d) { // 农历转公历
      try { let o=0, lp=this.leap(y); for(let i=1900; i<y; i++) o+=this.lDays(i); for(let i=1; i<m; i++) o+=this.mDays(y,i); if(lp>0 && lp<m) o+=((this.info[y-1900]&0x10000)?30:29); return new Date(Date.UTC(1900,0,31)+(o+d-1)*86400000); } catch(e){return null;}
    }
  };

  // 3. 网络请求 (高效精准匹配)
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return {};
    const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`;
    return new Promise(r => $httpClient.get({ url, timeout: 5000 }, (e, _, d) => r(!e && d ? JSON.parse(d) : {})))
      .then(raw => {
        // A. 优先尝试直接 Key 命中 (最快)
        if (raw[KEY]) return raw[KEY];
        
        // B. 容错查找：遍历值，寻找包含当天日期的对象 (严格匹配，防止串号)
        // 支持格式: 2026-01-17, 2026/01/17, 2026-1-17, 2026/1/17, 20260117
        const targets = [`${Y}-${P(M)}-${P(D)}`, `${Y}/${P(M)}/${P(D)}`, `${Y}-${M}-${D}`, `${Y}/${M}/${D}`, KEY];
        return Object.values(raw).find(n => {
          if (!n || typeof n !== 'object') return false;
          const s = String(n.date || n.day || n.gregorian || "");
          return targets.some(t => s.includes(t));
        }) || {};
      }).catch(e => ({}));
  };

  // 4. 节日与倒数
  const getList = (y) => {
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?YMD(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const term = (n) => YMD(y, Math.floor((n-1)/2)+1, Lunar.term(y,n));
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return YMD(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    return [
      ["元旦",YMD(y,1,1)],["春节",l2s(1,1)],["元宵",l2s(1,15)],["清明",term(7)],["劳动",YMD(y,5,1)],["端午",l2s(5,5)],
      ["高考",YMD(y,6,7)],["中秋",l2s(8,15)],["国庆",YMD(y,10,1)],["七夕",l2s(7,7)],["除夕",l2s(12,Lunar.mDays(y,12)==29?29:30)],
      ["情人",YMD(y,2,14)],["妇女",YMD(y,3,8)],["儿童",YMD(y,6,1)],["圣诞",YMD(y,12,25)],["母亲",wDay(5,2,0)],["父亲",wDay(6,3,0)]
    ];
  };

  // 5. 渲染输出
  try {
    const obj = Lunar.toObj(Y, M, D);
    const api = await getAlmanac();
    const yi = api.yi || api.Yi || api.suit || "", ji = api.ji || api.Ji || api.avoid || "";
    const alm = [yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(Boolean).join("\n") || (api.date ? "暂无宜忌数据" : "");
    
    // 合并今明两年节日并排序
    const today = Date.UTC(Y, M-1, D);
    const fests = [...getList(Y), ...getList(Y+1)].map(([n, d]) => {
      const [yy, mm, dd] = d.split('/').map(Number);
      const diff = Math.round((Date.UTC(yy,mm-1,dd) - today)/86400000);
      return { n, diff, k: (n==="高考"&&diff>0&&diff<200)?-9999:diff };
    }).filter(i => i.diff >= 0).sort((a,b)=>a.k-b.k).slice(0, 4)
      .map(i => i.diff===0 ? `🎉 ${i.n}就在今天` : `${i.n} ${i.diff}天`).join(" , ");

    $done({
      title: `${Y}年${P(M)}月${P(D)}日 周${"日一二三四五六"[now.getDay()]} ${obj.astro}`,
      content: `${obj.gz}${obj.ani}年 ${obj.cn} ${obj.term||""}\n${alm}\n\n${fests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) { $done({ title: "黄历错误", content: e.message }); }
})();
