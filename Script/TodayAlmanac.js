/*
 * 今日黄历&节假日倒数 (V43.0 破釜沉舟重写版)
 * -------------------------------------------
 * 🎯 核心目标：不惜一切代价，必须显示出百度万年历的宜忌
 * 🛠 重构逻辑：
 * 1. 弃用复杂的日期格式匹配，改为暴力匹配 "day" 字段
 * 2. 引入双保险机制：百度官方接口 (主) + 51240万年历 (备)
 * 3. 强制 UI 统一：所有数据源均清洗为 "宜/忌" 文字图标格式
 * -------------------------------------------
 */
(async () => {
  // ============================================
  // 1. 基础环境 (UTC+8 硬编码，防止系统时区干扰)
  // ============================================
  const getNow = () => {
    // 强制增加8小时偏移
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

  // ============================================
  // 2. 数据获取 (暴力直连 + 智能清洗)
  // ============================================
  const getAlmanac = async () => {
    if (typeof $httpClient === "undefined") return { yi: "", ji: "" };

    // [方案A] 百度官方 PC 接口 (最全，最稳)
    const fetchBaidu = () => {
      return new Promise(resolve => {
        const url = `https://sp0.baidu.com/8aQDcjqpAAV3otqbppnN2DJv/api.php?query=${N.y}年${N.m}月&resource_id=39043&ie=utf8&oe=utf8&format=json&tn=wisetpl&t=${Date.now()}`;
        $httpClient.get({
          url: url,
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "Referer": "https://www.baidu.com/"
          }
        }, (error, response, data) => {
          if (error || !data) return resolve(null);
          try {
            const json = JSON.parse(data);
            if (json.data && json.data[0] && json.data[0].almanac) {
              const list = json.data[0].almanac;
              // 🔥 暴力匹配：只要 list 里有一项的 day 字段等于今天的日期，就认定是它
              // 百度返回的 day 是字符串 "1", "16" 等
              const todayItem = list.find(item => parseInt(item.day) === N.d);
              if (todayItem) {
                return resolve({
                  yi: (todayItem.suit || "").replace(/\./g, " ").trim(),
                  ji: (todayItem.avoid || "").replace(/\./g, " ").trim()
                });
              }
            }
            resolve(null);
          } catch (e) { resolve(null); }
        });
      });
    };

    // [方案B] 备用源 (GitHub JSON)
    const fetchGithub = () => {
      return new Promise(resolve => {
        const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${N.y}/${N.y}${P(N.m)}.json`;
        $httpClient.get({ url: url, timeout: 5000 }, (error, response, data) => {
          if (error || !data) return resolve(null);
          try {
            // GitHub 源可能有多层结构，直接转字符串搜日期 (最暴力的方法)
            // 目标指纹: "2026-01-16" 或 "day": 16
            const json = JSON.parse(data);
            let target = null;
            
            // 简单递归查找
            const find = (obj) => {
              if (target || !obj || typeof obj !== 'object') return;
              // 匹配特征
              if ((obj.yi || obj.suit) && (obj.day == N.d || obj.date?.includes(`${N.y}-${P(N.m)}-${P(N.d)}`))) {
                target = obj;
                return;
              }
              Object.values(obj).forEach(find);
            };
            find(json);

            if (target) {
              return resolve({
                yi: (target.yi || target.suit || "").replace(/\./g, " "),
                ji: (target.ji || target.avoid || "").replace(/\./g, " ")
              });
            }
            resolve(null);
          } catch (e) { resolve(null); }
        });
      });
    };

    // 优先执行百度，失败则执行 GitHub
    let res = await fetchBaidu();
    if (!res) {
      console.log("⚠️ 百度接口无响应，切换备用源");
      res = await fetchGithub();
    }
    return res || { yi: "诸事不宜", ji: "诸事不宜" }; // 最终兜底
  };

  // ============================================
  // 3. 农历算法 (V26 稳定版核心 - 查表法)
  // ============================================
  const Lunar = {
    info: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520,0x0dd45],
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"], monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lDays(y) { let i, s=348; for(i=0x8000; i>0x8; i>>=1) s+=(this.info[y-1900]&i)?1:0; return s+((this.info[y-1900]&0xf)?((this.info[y-1900]&0x10000)?30:29):0); },
    mDays(y, m) { return (this.info[y-1900] & (0x10000 >> m)) ? 30 : 29; },
    getTerm(y, n) { return new Date((31556925974.7 * (y - 1900) + [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1] * 60000) + Date.UTC(1900, 0, 6, 2, 5)).getUTCDate(); },
    convert(y, m, d) {
      let offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      let i, temp=0;
      for(i=1900; i<2101 && offset>0; i++) { temp=this.lDays(i); offset-=temp; }
      if(offset<0) { offset+=temp; i--; }
      const lYear=i; let leap=this.info[i-1900]&0xf, isLeap=false;
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
        gz: this.gan[(lYear-4)%10]+this.zhi[(lYear-4)%12], 
        ani: this.ani[(lYear-4)%12],
        cn: `${isLeap?"闰":""}${this.monStr[i-1]}月${lDay==10?"初十":lDay==20?"二十":lDay==30?"三十":["初","十","廿","卅"][Math.floor(lDay/10)]+this.nStr[lDay%10]}`,
        term, astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    },
    l2s(y,m,d) { try { let off=0; for(let i=1900;i<y;i++) off+=this.lDays(i); let lp=this.info[y-1900]&0xf; for(let i=1;i<m;i++) off+=this.mDays(y,i); if(lp>0 && lp<m) off+=((this.info[y-1900]&0x10000)?30:29); return new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000); } catch(e){return null;} }
  };

  // ============================================
  // 4. 节日与排序
  // ============================================
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
      // 高考置顶逻辑：倒数 200 天内置顶
      if(n==="高考" && diff>0 && diff<=200) k=-9999;
      return { n, diff, k };
    }).filter(i => i && i.diff >= -1).sort((a,b)=>a.k-b.k).slice(0,3).map(i=>i.diff===0?`🎉${i.n}`:`${i.n} ${i.diff}天`).join(" , ");
  };

  // ============================================
  // 5. 执行渲染
  // ============================================
  try {
    const obj = Lunar.convert(N.y, N.m, N.d);
    const almanac = await getAlmanac();
    
    // UI 还原: 宜/忌 纯文字图标
    const yiStr = almanac.yi ? `宜 ${almanac.yi}` : "";
    const jiStr = almanac.ji ? `忌 ${almanac.ji}` : "";
    // 去除空行
    const almText = [yiStr, jiStr].filter(Boolean).join("\n");
    
    const [f1, f2] = [getFests(N.y), getFests(N.y+1)];
    const festText = [
      merge([...f1.legal, ...f2.legal]), 
      merge([...f1.term, ...f2.term]),
      merge([...f1.folk, ...f2.folk]), 
      merge([...f1.intl, ...f2.intl])
    ].filter(Boolean).join("\n");

    $done({
      title: `${N.y}年${P(N.m)}月${P(N.d)}日 星期${WEEK[N.w]} ${obj.astro}`,
      content: `${obj.gz}(${obj.ani})年 ${obj.cn} ${obj.term||""}\n${almText}\n\n${festText}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    console.log("脚本错误: " + e.message);
    $done({ title: "脚本错误", content: "请查看日志修复" });
  }
})();
