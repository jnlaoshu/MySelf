/*
 * 今日黄历&节假日倒数 (V39.0 百度接口最终修正版)
 * ✅ 核心修复：回归 "按月查询" 策略，这是百度最稳定的数据源
 * ✅ 匹配修复：构建 "YYYY-M-D" (不补零) 专用指纹，精准锁定当天数据
 * ✅ 双重兜底：百度接口失效时，毫秒级切换 GitHub 源
 */
(async () => {
  // 1. 基础环境 (UTC+8)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (28800000));
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const P = n => n < 10 ? `0${n}` : n;
  const WEEK = "日一二三四五六";

  // 🔥 关键：百度专用日期指纹 (不补零，例如 2026-1-16)
  const BAIDU_KEY = `${Y}-${M}-${D}`;
  // 标准日期指纹 (GitHub用，例如 2026-01-16)
  const STD_KEY = `${Y}-${P(M)}-${P(D)}`;

  // 2. 网络请求：百度(主) -> GitHub(备)
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return {};

    // 🅰️ 方案 A: 百度万年历 (按月查询，结构最稳)
    const getBaidu = async () => {
      // 查询 "2026年1月"，获取整月数据
      const q = encodeURIComponent(`${Y}年${M}月`);
      const url = `https://sp0.baidu.com/8aQDcjqpAAV3otqbppnN2DJv/api.php?query=${q}&resource_id=39043&ie=utf8&oe=utf8&format=json&tn=wisetpl`;
      
      return new Promise(r => {
        $httpClient.get({ 
          url, timeout: 3000, 
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.baidu.com/"
          } 
        }, (e, _, d) => {
          if (e || !d) return r(null);
          try {
            const json = JSON.parse(d);
            // 百度结构: data[0].almanac 是一个数组
            if (json.data && json.data[0] && Array.isArray(json.data[0].almanac)) {
              // 🔥 核心匹配：在数组中找到 date 等于 "2026-1-16" 的那一项
              const item = json.data[0].almanac.find(i => i.date === BAIDU_KEY);
              if (item && item.suit) {
                return r({ 
                  // 清洗数据: "出行.嫁娶" -> "出行 嫁娶"
                  yi: item.suit.replace(/\./g, " "), 
                  ji: item.avoid.replace(/\./g, " "), 
                  src: "Baidu" 
                });
              }
            }
            r(null);
          } catch { r(null); }
        });
      });
    };

    // 🅱️ 方案 B: GitHub (静态兜底)
    const getGithub = async () => {
      const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`;
      return new Promise(r => {
        $httpClient.get({ url, timeout: 5000 }, (e, _, d) => {
          if(e || !d) return r({});
          try {
            // 简单递归查找
            let list = [];
            const scan = n => {
              if (Object(n) !== n) return;
              if (n.yi || n.suit) list.push(n);
              for (let k in n) scan(n[k]);
            };
            scan(JSON.parse(d));
            // 匹配标准格式 2026-01-16
            const item = list.find(i => (i.date && String(i.date).includes(STD_KEY)) || (i.day && parseInt(i.day) === D));
            if (item) return r({ yi: item.yi || item.suit, ji: item.ji || item.avoid, src: "GitHub" });
            r({});
          } catch { r({}); }
        });
      });
    };

    // 执行逻辑
    const baidu = await getBaidu();
    if (baidu) return baidu;
    console.log("⚠️ 百度接口未返回有效数据，切换至 GitHub");
    return await getGithub();
  };

  // 3. 农历核心 (V26 稳定算法)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lYearDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+this.leapDays(y); },
    leapMonth(y) { return this.info[y-1900] & 0xf; },
    leapDays(y) { return this.leapMonth(y) ? (this.info[y-1900] & 0x10000 ? 30 : 29) : 0; },
    monthDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    solarDays(y, m) { return m==2 ? ((y%4==0&&y%100!=0||y%400==0)?29:28) : [31,28,31,30,31,30,31,31,30,31,30,31][m-1]; },
    getTerm(y, n) { 
      return new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5)).getUTCDate();
    },
    convert(y, m, d) {
      let i, leap=0, temp=0, offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lYearDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i; leap=this.leapMonth(i); let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=this.leapDays(lYear); }
        else { temp=this.monthDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset+=temp; i--; }
      const lDay = offset+1;
      const term = this.getTerm(y, m*2-1)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-2] : (this.getTerm(y, m*2)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-1] : "");
      return { 
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lDay==10?"初十":lDay==20?"二十":lDay==30?"三十":["初","十","廿","卅"][Math.floor(lDay/10)]+this.nStr[lDay%10]}`,
        term: term, astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2 - (d < [20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0), 2) + "座"
      };
    },
    l2s(y,m,d) { try { let off=0; for(let i=1900;i<y;i++) off+=this.lYearDays(i); let lp=this.leapMonth(y); for(let i=1;i<m;i++) off+=this.monthDays(y,i); if(lp>0 && lp<m) off+=this.leapDays(y); return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;} }
  };

  // 4. 节日配置
  const getFests = (y) => {
    const YMD = (y, m, d) => `${y}/${P(m)}/${P(d)}`;
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?YMD(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const term = (n) => YMD(y, Math.floor((n-1)/2)+1, Lunar.getTerm(y,n));
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return YMD(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    return {
      legal: [["元旦",YMD(y,1,1)],["寒假",YMD(y,1,31)],["春节",l2s(1,1)],["开学",YMD(y,3,2)],["清明节",term(7)],["春假",YMD(y,4,29)],["劳动节",YMD(y,5,1)],["端午节",l2s(5,5)],["高考",YMD(y,6,7)],["暑假",YMD(y,7,4)],["中秋节",l2s(8,15)],["国庆节",YMD(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.monthDays(y,12)==29?29:30)]],
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
    const yi = api.yi || "";
    const ji = api.ji || "";
    const alm = [yi?`✅ 宜：${yi}`:"", ji?`❎ 忌：${ji}`:""].filter(s=>s&&s.trim()).join("\n");
    const [f1, f2] = [getFests(Y), getFests(Y+1)];
    
    $done({
      title: `${Y}年${P(M)}月${P(D)}日 星期${WEEK[now.getDay()]} ${obj.astro}`,
      content: `${obj.gz}(${obj.ani})年 ${obj.cn} ${obj.term||""}\n${alm}\n\n${[
        merge([...f1.legal, ...f2.legal]), merge([...f1.term, ...f2.term]),
        merge([...f1.folk, ...f2.folk]), merge([...f1.intl, ...f2.intl])
      ].filter(Boolean).join("\n")}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) { $done({ title: "脚本异常", content: e.message }); }
})();
