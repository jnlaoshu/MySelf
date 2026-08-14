# 获取Cookie订阅 By laoshu
# 本签到脚本订阅仅适用于Loon定时签到脚本的Cookie获取.
# URL : https://raw.githubusercontent.com/jnlaoshu/Myself/master/Loon/Cookie.conf
# 您可以在使用后手动将其禁用，以免产生不必要的MITM.
# 使用方法:打开APP，顶部的配置 -> 脚本 -> 订阅脚本- > 点击右上角+号 -> 添加url链接 

# 爱奇艺会员签到   （ifac*.iqiyi.com）
http-request ^https?:\/\/iface(\d)?\.iqiyi\.com\/ script-path=https://raw.githubusercontent.com/NobyDa/Script/master/iQIYI-DailyBonus/iQIYI.js, tag=iqyi
# 爱奇艺   （passport.iqiyi.com）
http-request ^https:\/\/passport\.iqiyi\.com\/apis\/user\/info\.action script-path=https://raw.githubusercontent.com/NobyDa/Script/master/iQIYI-DailyBonus/iQIYI.js, tag=爱奇艺cookie

# 饿了么 (h5.ele.me)
http-request ^https:\/\/h5\.ele\.me\/restapi\/eus\/v\d\/current_user$ script-path=https://raw.githubusercontent.com/songyangzz/QuantumultX/master/elem/elemGetCookies.js, tag=elem
http-request ^https?:\/\/h5\.ele\.me\/restapi\/biz\.svip_scene\/svip\/engine\/queryTrafficSupply requires-body=1,script-path=https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/script/eleme/eleme_daily.js,tag=饿了么_获取cookie

# 飞客茶馆 www.flyertea.com
http-request ^https:\/\/www\.flyertea\.com\/source\/plugin\/mobile\/mobile\.php\?module=getdata&.* script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/flyertea/flyertea.cookie.js, tag=飞客茶馆

# 工银e生活 (By @barrymchen) icbc1.wlphp.com
http-request ^https:\/\/icbc1\.wlphp\.com:8444\/js\/api\/index\/signIn script-path=https://raw.githubusercontent.com/nzw9314/QuantumultX/master/Task/icbc_cookie.js,requires-body=true, tag=工银e生活

# 哈啰出行 gameapi.hellobike.com
http-request ^https:\/\/gameapi\.hellobike\.com\/api script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/hellobike/hellobike.js, requires-body=true, tag=哈啰出行

# 华住会 hweb-mbf.huazhu.com
http-request https:\/\/hweb-mbf\.huazhu\.com\/api\/signIn tag=华住会获取签到Cookie, script-path=https://raw.githubusercontent.com/evilbutcher/Quantumult_X/master/check_in/hzh/hzh.js, requires-body=true

# 京东  （api.m.jd.com,ms.jr.jd.com, me-api.jd.com）
http-request ^https:\/\/(api\.m|me-api|ms\.jr)\.jd\.com\/(client\.action\?functionId=signBean|user_new\/info\/GetJDUserInfoUnion\?|gw\/generic\/hy\/h5\/m\/appSign\?) tag=获取京东Cookie, requires-body=true, script-path=https://raw.githubusercontent.com/NobyDa/Script/master/JD-DailyBonus/JD_DailyBonus.js
# 芒果TV credits.bz.mgtv.com
http-request ^https:\/\/credits.bz.mgtv.com\/user\/creditsTake script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/mgtv/mgtv.cookie.js, tag=芒果tv

# 美团 （i.meituan.com）
http-request ^https:\/\/i.meituan.com\/evolve\/signin\/signpost\/ script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/meituan/meituan.cookie.js, , requires-body=true, tag=muantuan

# 美团外卖 promotion.waimai.meituan.com
http-request ^https:\/\/promotion.waimai.meituan.com\/playcenter\/signIn\/entry script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/wmmeituan/wmmeituan.cookie.js, tag=美团外卖
http-request ^https:\/\/promotion.waimai.meituan.com\/playcenter\/signIn\/doaction script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/wmmeituan/wmmeituan.cookie.js, requires-body=true,  tag=美团外卖

#去哪儿
http-request ^https:\/\/user.qunar.com\/webapi\/member\/signIndexV2.htm script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/qunar/qunar.cookie.js

#全民K歌
http-request ^https://node\.kg\.qq\.com/webapp/proxy? script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/qmkg/qmkg.cookie.js, requires-body=true, tag=全民K歌

# 苏宁易购 luckman.suning.com, passport.suning.com, sign.suning.com, gameapi.suning.com,
http-request ^https:\/\/passport.suning.com\/ids\/login$ script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/suning/suning.cookie.js, requires-body=true, tag=苏宁易购
http-request ^https:\/\/luckman.suning.com\/luck-web\/sign\/api\/clock_sign.do script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/suning/suning.cookie.js, tag=苏宁易购
http-request ^https:\/\/sign.suning.com\/sign-web\/m\/promotion\/sign\/doSign.do script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/suning/suning.cookie.js, tag=苏宁易购
http-request ^https:\/\/gameapi.suning.com\/sngame-web\/(api\/signin\/private\/customerSignOperation.do|gateway\/api\/queryPrize.do) script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/suning/suning.cookie.js, tag=苏宁易购

# 腾讯视频 (*.video.qq.com)
http-request ^https:\/\/access.video.qq.com\/user\/auth_refresh script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/videoqq/videoqq.cookie.js, tag=videoqq

# 网易新闻 *.m.163.com
http-request ^https:\/\/(.*?)c\.m\.163\.com\/uc\/api\/sign\/v3\/commit script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/neteasenews/neteasenews.cookie.js, requires-body=true, tag=网易新闻
# 网易云音乐 (music.163.com)
http-request ^https:\/\/music.163.com\/weapi\/user\/level script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/neteasemusic/neteasemusic.cookie.js, requires-body=true, tag=neteasemusic

# 威锋论坛 *.feng.com, 
http-request ^https:\/\/(www\.)?feng\.com\/?.? script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/feng/feng.cookie.js, tag=威锋论坛

# 喜马拉雅 113.96.156.178, *.ximalaya.com
http-request ^https?:\/\/.*\/mobile\-user\/(v1\/)?homePage\/.* script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/ximalaya/ximalaya.cookie.js,tag=喜马拉雅
http-request https://m.ximalaya.com/wechat/ script-path=https://raw.githubusercontent.com/nzw9314/QuantumultX/master/Task/xmly_wc.js, tag=微信喜马拉雅

# 携程旅行 m.ctrip.com*.ctrp.com
http-request https:\/\/m\.ctrip\.com\/restapi\/soa2\/14946\/json\/userBaseInfo script-path=https://raw.githubusercontent.com/iepngs/Script/master/ctrip/index.js, tag=携程旅行
http-request https:\/\/m\.ctrip\.com\/restapi\/soa2\/14946\/json\/userBaseInfo script-path=https://raw.githubusercontent.com/barrym-chen/Script/master/ctrip/ctrip_cookie.js, tag=携程旅行
http-request ^https:\/\/m\.ctrip\.com\/restapi\/soa2\/16575\/signin script-path=https://raw.githubusercontent.com/barrym-chen/Script/master/ctrip_wx/ct_cookie.js, tag=微信小程序-携程

# 有道云笔记 note.youdao.com
http-request ^https:\/\/note.youdao.com\/yws\/mapi\/user\?method=checkin script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/noteyoudao/noteyoudao.cookie.js, requires-body=true, tag=有道云笔记

# 招行信用卡公众号 (By @iNotification) weclub.ccc.cmbchina.com
http-request https://weclub\.ccc\.cmbchina.com/SCRMCustomActivityFront/checkin/request/get-home-data\.json\?activityCode=checkin script-path=https://raw.githubusercontent.com/nzw9314/QuantumultX/master/Task/cmbchina.js, tag=招行信用卡公众号

# 中国电信 wapside.189.cn:9001,e.189.cn,alipaymini.189.cn
http-request ^https:\/\/wapside.189.cn:9001\/jt-sign\/api\/home\/homeInfo script-path=https://raw.githubusercontent.com/chavyleung/scripts/master/10000/10000.cookie.js, requires-body=true, tag=中国电信
http-request ^https:\/\/wapside.189.cn:9001\/api\/exchange\/consume script-path=https://raw.githubusercontent.com/elecV2/QuantumultX-Tools/master/dianx/dianx.js, requires-body=true, tag=电信金豆换话费
http-request https:\/\/alipaymini\.189\.cn:8043\/treasureBox\/queryUserActivityInfo script-path=https://raw.githubusercontent.com/elecV2/QuantumultX-Tools/master/dianx/dxbox.js, requires-body=true, tag=电信整点开宝箱

hostname = ifac*.iqiyi.com,passport.iqiyi.com,h5.ele.me,www.flyertea.com, icbc1.wlphp.com,gameapi.hellobike.com,hweb-mbf.huazhu.com,api.m.jd.com,ms.jr.jd.com, me-api.jd.com,credits.bz.mgtv.com,i.meituan.com,promotion.waimai.meituan.com,user.qunar.com,node.kg.qq.com,luckman.suning.com, passport.suning.com, sign.suning.com, gameapi.suning.com,*.video.qq.com,*.m.163.com, music.163.com,*.feng.com,113.96.156.178, *.ximalaya.com,*.ctrp.com,note.youdao.com,weclub.ccc.cmbchina.com,wapside.189.cn:9001,e.189.cn,alipaymini.189.cn
