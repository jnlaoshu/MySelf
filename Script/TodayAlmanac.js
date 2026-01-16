/*
 * 今日黄历&节假日倒数 (V33.0 百度接口专版)
 * ✅ 核心升级：替换为 [百度万年历官方接口]，数据源极其稳定，永不断更
 * ✅ 适配：完美解析百度 API 数据结构，精准显示 "宜/忌"
 * ✅ 保留：高精度农历算法 + 高考置顶 + 智能排序 + 经典布局
 */
(async () => {
  // 1. 基础环境 (UTC+8)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (28800000));
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const P = n => n < 10 ? `0${n}` : n;
  const YMD = (y, m, d) => `${y}/${P(m)}/${P(d)}`;
  
  // 匹配指纹 (百度通常返回不补零的格式: 2026-1-16)
  const MATCH = {
    s: `${Y}-${M}-${D}`,      // 2026-1-16 (百度格式)
    s2: `${Y}-${P(M)}-${P(D)}`, // 2026-01-16 (标准格式)
    d: D
  };
  const WEEK = "日一二三四五六";

  // 2. 网络请求 (百度万年历 API)
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return {};
    // 百度官方接口 query=2026年1月
    const url = `https://sp0.baidu.com/8aQDcjqpAAV3otqbppnN2DJv/api.php?query=${Y}年${M}月&resource_id=39043&ie=utf8&oe=utf8&format=json&tn=wisetpl`;
    
    return new Promise(r => {
      $httpClient.get({ url, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } }, (e, _, d) => r(!e && d ? JSON.parse(d) : {}));
    }).then(res => {
      // 解析百度数据结构: data[0].almanac
      if (!res.data || !res.data[0] || !res.data[0].almanac) return {};
      const list = res.data[0].almanac;
      
      // 查找当天数据
      return list.find(i => {
        // 百度 date 字段通常是 "2026-1-16"
        if (i.date === MATCH.s || i.date === MATCH.s2) return true;
        // 容错匹配 Day
        if (i.day && parseInt(i.day) === MATCH.d) return true;
        return false;
      }) || {};
    }).catch(() => ({}));
  };

  // 3. 农历核心 (查表法 1900-2100)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    bit(y,n){ return (this.info[y-1900] & n) ? 1 : 0 },
    lDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=this.bit(y,i); return s + (this.leap(y) ? ((this.info[y-1900]&0x10000)?30:29) : 0) },
    leap(y) { return this.info[y-1900] & 0xf },
    mDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29 },
    term(y, n) { return new Date((31556925974.7*(y-1900)+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000)+Date.UTC(1900,0,6,2,5)).getUTCDate() },
    convert(y, m, d) {
      let offset = (Date.UTC(y,m-1,d) - Date.UTC(1900,0,31))/86400000, i, temp=0;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i, leap=this.leap(i); let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=((this.info[lYear-1900]&0x10000)?30:29); }
        else { temp=this.mDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) if(isLeap) isLeap=false; else { isLeap=true; --i; }
      if(offset<0) { offset+=temp; i--; }
      const lD = offset+1, tId = m*2-(d<this.term(y,m*2-1)?2:1);
      return {
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lD==10?"初十":lD==20?"二十":lD==30?"三十":["初","十","廿","卅"][Math.floor(lD/10)]+this.nStr[lD%10]}`,
        term: (this.term(y,tId+1)==d) ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][tId] : "",
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    },
    l2s(y,m,d) {
      try { let off=0, lp=this.leap(y); for(let i=1900; i<y; i++) off+=this.lDays(i); for(let i=1; i<m; i++) off+=this.mDays(y,i); if(lp>0 && lp<m) off+=((this.info[y-1900]&0x10000)?30:29); return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;}
    }
  };

  // 4. 节日配置
  const getFests = (y) => {
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?YMD(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const term = (n) => YMD(y, Math.floor((n-1)/2)+1, Lunar.term(y,n));
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return YMD(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    return {
      legal: [["元旦",YMD(y,1,1)],["寒假",YMD(y,1,31)],["春节",l2s(1,1)],["开学",YMD(y,3,2)],["清明节",term(7)],["春假",YMD(y,4,29)],["劳动节",YMD(y,5,1)],["端午节",l2s(5,5)],["高考",YMD(y,6,7)],["暑假",YMD(y,7,4)],["中秋节",l2s(8,15)],["国庆节",YMD(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.mDays(y,12)==29?29:30)]],
      intl: [["情人节",YMD(y,2,14)],["妇女节",YMD(y,3,8)],["母亲节",wDay(5,2,0)],["儿童节",YMD(y,6,1)],["父亲节",wDay(6,3,0)],["万圣节",YMD(y,10,31)],["平安夜",YMD(y,12,24)],["圣诞节",YMD(y,12,25)],["感恩节",wDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>[["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][i], term(i+1)])
    };
  };

  const merge = (list) => {
    const today = Date.UTC(Y, M-1, D);
    return list.map(([n, d]) => {
      if (!d) return null;
      const [yy, mm, dd] = d.split('/').map(Number);
      const diff = Math.round((Date.UTC(yy,mm-1,dd) - today)/86400000);
      let k = diff; if(n==="高考" && diff>0 && diff<=200) k=-9999;
      return { n, diff, k };
    }).filter(i => i && i.diff >= -1).sort((a,b)=>a.k-b.k).slice(0,3).map(i=>i.diff===0?`🎉${i.n}`:`${i.n} ${i.diff}天`).join(" , ");
  };

  // 5. 渲染
  try {
    const obj = Lunar.convert(Y, M, D);
    const api = await getAlmanac();
    // 百度返回 Key: suit(宜), avoid(忌). chong/baiji 百度可能没有，做容错
    const yi = api.suit || api.yi || api.Yi || "";
    const ji = api.avoid || api.ji || api.Ji || "";
    // 如果百度没有冲煞，就留空 (百度接口有时候确实不返回这个)
    const chong = api.chong || api.chongsha || ""; 
    const bai = api.baiji || "";
    const alm = [chong, bai, yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(s=>s&&s.trim()).join("\n");
    const [f1, f2] = [getFests(Y), getFests(Y+1)];
    
    $done({
      title: `${Y}年${P(M)}月${P(D)}日 星期${WEEK[now.getDay()]} ${obj.astro}`,
      content: `${obj.gz}(${obj.ani})年 ${obj.cn} ${obj.term||""}\n${alm}\n\n${[
        merge([...f1.legal, ...f2.legal]), merge([...f1.term, ...f2.term]),
        merge([...f1.folk, ...f2.folk]), merge([...f1.intl, ...f2.intl])
      ].filter(Boolean).join("\n")}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) { $done({ title: "黄历异常", content: "请检查网络或日志" }); }
})();
