/*
 * 今日黄历&节假日倒数 (V46.0 最终解决方案)
 * -------------------------------------------
 * 🚫 废弃：移除了 GitHub 数据源 (因数据不准确)
 * ✅ 主力：接入 [2345万年历] 官方接口 (数据与百度一致，且抗拦截能力极强)
 * ✅ 备用：保留 [百度搜索] 接口作为兜底
 * 🎨 UI：严格执行 "宜 嫁娶..." / "忌 安葬..." 纯文字风格
 * -------------------------------------------
 */
(async () => {
  // 1. 基础环境 (UTC+8)
  const getNow = () => {
    const d = new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000) + (28800000));
    return {
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      d: d.getDate(),
      w: d.getDay()
    };
  };
  
  const N = getNow();
  const P = n => n < 10 ? `0${n}` : n;
  const WEEK = "日一二三四五六";
  const YMD_NUM = `${N.y}${P(N.m)}${P(N.d)}`; // 20260116

  // 2. 网络请求：2345万年历 (主) -> 百度 (备)
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return null;

    // 清洗函数：去除标点
    const clean = (str) => (str || "").replace(/[.、]/g, " ").trim();

    // [方案A] 2345万年历 (极高成功率)
    // 2345的数据源非常标准，与百度几乎无异，且接口开放
    const fetch2345 = () => {
      return new Promise(r => {
        $httpClient.get({
          url: `https://tools.2345.com/frame/api/GetLunarInfo?date=${YMD_NUM}`,
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "Referer": "https://tools.2345.com/"
          }
        }, (e, _, d) => {
          if (e || !d) return r(null);
          try {
            // 2345 返回格式是 var lunarInfo={...}; 需要截取
            let jsonStr = d.trim();
            if (jsonStr.indexOf("var lunarInfo=") !== -1) {
              jsonStr = jsonStr.replace("var lunarInfo=", "").replace(";", "");
            }
            const json = JSON.parse(jsonStr);
            if (json && json.yi && json.ji) {
              return r({ yi: clean(json.yi), ji: clean(json.ji) });
            }
            r(null);
          } catch { r(null); }
        });
      });
    };

    // [方案B] 百度官方 (备用)
    const fetchBaidu = () => {
      const q = encodeURIComponent(`${N.y}年${N.m}月${N.d}日`);
      return new Promise(r => {
        $httpClient.get({
          url: `https://sp0.baidu.com/8aQDcjqpAAV3otqbppnN2DJv/api.php?query=${q}&resource_id=39043&ie=utf8&oe=utf8&format=json&tn=wisetpl`,
          headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" }
        }, (e, _, d) => {
          try {
            const json = JSON.parse(d);
            const item = json?.data?.[0]?.almanac?.[0] || json?.data?.[0];
            if (item && item.suit && item.avoid) {
              return r({ yi: clean(item.suit), ji: clean(item.avoid) });
            }
            r(null);
          } catch { r(null); }
        });
      });
    };

    // 优先 2345，失败切百度
    let res = await fetch2345();
    if (!res) {
      console.log("⚠️ 2345接口未响应，尝试百度");
      res = await fetchBaidu();
    }
    return res;
  };

  // 3. 农历核心 (V26 稳定查表法)
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+((this.info[y-1900]&0xf)?((this.info[y-1900]&0x10000)?30:29):0); },
    mDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    getTerm(y, n) { return new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5)).getUTCDate(); },
    convert(y, m, d) {
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      let i, leap=0, temp=0;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i; leap=this.info[i-1900]&0xf; let isLeap=false;
      for(i=1; i<13 && offset>0; i++) {
        if(leap>0 && i==(leap+1) && !isLeap) { --i; isLeap=true; temp=((this.info[lYear-1900]&0x10000)?30:29); }
        else { temp=this.mDays(lYear,i); }
        if(isLeap && i==(leap+1)) isLeap=false; offset-=temp;
      }
      if(offset==0 && leap>0 && i==leap+1) { if(isLeap) isLeap=false; else { isLeap=true; --i; } }
      if(offset<0) { offset+=temp; i--; }
      const lDay = offset+1;
      const term = this.getTerm(y, m*2-1)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-2] : (this.getTerm(y, m*2)==d ? ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][m*2-1] : "");
      return { 
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lDay==10?"初十":lDay==20?"二十":lDay==30?"三十":["初","十","廿","卅"][Math.floor(lDay/10)]+this.nStr[lDay%10]}`,
        term, astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    },
    l2s(y,m,d) { try { let off=0; for(let i=1900;i<y;i++) off+=this.lDays(i); let lp=this.info[y-1900]&0xf; for(let i=1;i<m;i++) off+=this.mDays(y,i); if(lp>0 && lp<m) off+=((this.info[y-1900]&0x10000)?30:29); return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;} }
  };

  // 4. 节日与排序
  const getFests = (y) => {
    const fmt = (y,m,d) => `${y}/${P(m)}/${P(d)}`;
    const l2s = (m,d) => { const r=Lunar.l2s(y,m,d); return r?fmt(r.getUTCFullYear(),r.getUTCMonth()+1,r.getUTCDate()):""; };
    const term = (n) => fmt(y, Math.floor((n-1)/2)+1, Lunar.getTerm(y,n));
    const wDay = (m,n,w) => { const f=new Date(Date.UTC(y,m-1,1)), d=f.getUTCDay(), x=w-d; return fmt(y,m,1+(x<0?x+7:x)+(n-1)*7); };
    
    return {
      legal: [["元旦",fmt(y,1,1)],["寒假",fmt(y,1,31)],["春节",l2s(1,1)],["开学",fmt(y,3,2)],["清明节",term(7)],["春假",fmt(y,4,29)],["劳动节",fmt(y,5,1)],["端午节",l2s(5,5)],["高考",fmt(y,6,7)],["暑假",fmt(y,7,4)],["中秋节",l2s(8,15)],["国庆节",fmt(y,10,1)],["秋假",wDay(11,2,3)]],
      folk: [["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["寒衣节",l2s(10,1)],["下元节",l2s(10,15)],["腊八节",l2s(12,8)],["北方小年",l2s(12,23)],["除夕",l2s(12,Lunar.mDays(y,12)==29?29:30)]],
      intl: [["情人节",fmt(y,2,14)],["妇女节",fmt(y,3,8)],["母亲节",wDay(5,2,0)],["儿童节",fmt(y,6,1)],["父亲节",wDay(6,3,0)],["万圣节",fmt(y,10,31)],["平安夜",fmt(y,12,24)],["圣诞节",fmt(y,12,25)],["感恩节",wDay(11,4,4)]],
      term: Array.from({length:24},(_,i)=>[["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"][i], term(i+1)])
    };
  };

  const merge = (list) => {
    const today = Date.UTC(N.y, N.m-1, N.d);
    return list.map(([n, d]) => {
      if (!d) return null;
      const [yy, mm, dd] = d.split('/').map(Number);
      const diff = Math.round((Date.UTC(yy,mm-1,dd) - today)/86400000);
      let k = diff; 
      if(n==="高考" && diff>0 && diff<=200) k=-9999;
      return { n, diff, k };
    }).filter(i => i && i.diff >= -1).sort((a,b)=>a.k-b.k).slice(0,3).map(i=>i.diff===0?`🎉${i.n}`:`${i.n} ${i.diff}天`).join(" , ");
  };

  // 5. 渲染
  try {
    const obj = Lunar.convert(N.y, N.m, N.d);
    const almanac = await getAlmanac();
    
    // UI: 如果获取不到数据，显示“暂无数据”
    const yiStr = almanac && almanac.yi ? `宜 ${almanac.yi}` : "宜 暂无数据";
    const jiStr = almanac && almanac.ji ? `忌 ${almanac.ji}` : "忌 暂无数据";
    const almText = [yiStr, jiStr].join("\n");
    
    const [f1, f2] = [getFests(N.y), getFests(N.y+1)];
    const showFests = [
        merge([...f1.legal, ...f2.legal]), merge([...f1.term, ...f2.term]),
        merge([...f1.folk, ...f2.folk]), merge([...f1.intl, ...f2.intl])
    ].filter(Boolean).join("\n");

    $done({
      title: `${N.y}年${P(N.m)}月${P(N.d)}日 星期${WEEK[N.w]} ${obj.astro}`,
      content: `${obj.gz}(${obj.ani})年 ${obj.cn} ${obj.term||""}\n${almText}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "脚本异常", content: "请检查网络日志" });
  }
})();
