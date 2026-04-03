import os
import datetime

TODAY = datetime.date.today().strftime("%Y-%m-%d")
OUT = "Egern/Module"
os.makedirs(OUT, exist_ok=True)


def write(filename, lines):
    path = os.path.join(OUT, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[OK] {filename}")


# ── 高德地图模块 ──────────────────────────────────────────────
write("AmapAdBlock.yaml", [
    "#!name=高德地图去广告",
    "#!desc=屏蔽开屏/搜索/首页/路线/附近/打车/消息推广",
    "#!author=jnlaoshu",
    "#!category=AdBlock",
    f"#!date={TODAY}",
    "",
    "[Rule]",
    "# ── 广告域名直接拦截 ──",
    "DOMAIN,amap-aos-info-nogw.amap.com,REJECT",
    "DOMAIN,free-aos-cdn-image.amap.com,REJECT",
    "DOMAIN,optimus-ads.amap.com,REJECT",
    "DOMAIN-SUFFIX,v.smtcdns.com,REJECT",
    "",
    "[Rewrite]",
    "# ── 开屏广告 ──",
    r"^https?://.*\.amap\.com/ws/(valueadded|aos)/alimama/splash_screen - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/frogserver/aocs/updatable - reject-dict",
    "# ── 我的页面推广 ──",
    r"^https?://.*\.amap\.com/ws/shield/dsp/profile/index/nodefaas - reject-dict",
    "# ── 搜索热词 & 场景推荐 ──",
    r"^https?://.*\.amap\.com/ws/shield/search/new_hotword - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/scene/recommend - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/search_poi/tips_adv - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/search/nearbyrec_smart - reject-dict",
    "# ── 路线规划推广 ──",
    r"^https?://.*\.amap\.com/ws/faas/amap-navigation/(card-service-route-plan|card-service-car-end|main-page) - reject-dict",
    "# ── 打车推广 ──",
    r"^https?://.*\.amap\.com/ws/promotion-web/resource - reject-dict",
    r"^https?://m5-zb\.amap\.com/ws/promotion-web/resource - reject-dict",
    "# ── 消息中心 ──",
    r"^https?://(.*\.amap\.com|sns\.amap\.com)/ws/msgbox/pull - reject-dict",
    "# ── 打车订单推广 ──",
    r"^https?://m5-zb\.amap\.com/ws/boss/order_web/\w+_information - reject-dict",
    r"^https?://m5-zb\.amap\.com/ws/sharedtrip/taxi/order_detail_car_tips - reject-dict",
    "# ── 天气推广 ──",
    r"^https?://.*\.amap\.com/ws/valueadded/weather - reject-dict",
    "",
    "[MITM]",
    "hostname = *.amap.com, m5-zb.amap.com, sns.amap.com",
])


# ── 百度地图模块 ──────────────────────────────────────────────
write("BaiduMapAdBlock.yaml", [
    "#!name=百度地图去广告",
    "#!desc=屏蔽开屏/搜索/营销/个人中心/消息/活动推广",
    "#!author=jnlaoshu",
    "#!category=AdBlock",
    f"#!date={TODAY}",
    "",
    "[Rule]",
    "# ── 广告域名直接拦截 ──",
    "# 180.76.76.200 为 IP，如需拦截请启用下行：",
    "# IP-CIDR,180.76.76.200/32,REJECT",
    "DOMAIN,dss0.bdstatic.com,REJECT",
    "DOMAIN,tb1.bdstatic.com,REJECT",
    "DOMAIN,tb2.bdstatic.com,REJECT",
    "",
    "[Rewrite]",
    "# ── 开屏 & 首页推广 ──",
    r"^https?://newclient\.map\.baidu\.com/client/phpui2/\?qt=ads - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/phpui.*qt=hw - reject-dict",
    "# ── 跨界营销 & 活动 ──",
    r"^https?://newclient\.map\.baidu\.com/client/crossmarketing - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/operation/activity - reject-dict",
    "# ── 个人中心推广 ──",
    r"^https?://newclient\.map\.baidu\.com/client/usersystem/home/dynamic - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/skin/center/recommend - reject-dict",
    "# ── 消息中心 ──",
    r"^https?://newclient\.map\.baidu\.com/client/msgcenter/pull - reject-dict",
    "# ── 首页小横条 ──",
    r"^https?://newclient\.map\.baidu\.com/client/noticebar/get - reject-dict",
    "# ── 悬赏推广 ──",
    r"^https?://newclient\.map\.baidu\.com/contributor-bus/bounty/tips - reject-dict",
    "",
    "[MITM]",
    "hostname = newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com",
])


# ── 合集模块 ──────────────────────────────────────────────────
write("MapAdBlock.yaml", [
    "#!name=地图去广告合集",
    "#!desc=高德 + 百度地图广告清理",
    "#!author=jnlaoshu",
    "#!category=AdBlock",
    f"#!date={TODAY}",
    "",
    "[Rule]",
    "DOMAIN,amap-aos-info-nogw.amap.com,REJECT",
    "DOMAIN,free-aos-cdn-image.amap.com,REJECT",
    "DOMAIN,optimus-ads.amap.com,REJECT",
    "DOMAIN-SUFFIX,v.smtcdns.com,REJECT",
    "DOMAIN,dss0.bdstatic.com,REJECT",
    "DOMAIN,tb1.bdstatic.com,REJECT",
    "DOMAIN,tb2.bdstatic.com,REJECT",
    "",
    "[Rewrite]",
    "# ── 高德地图 ──",
    r"^https?://.*\.amap\.com/ws/(valueadded|aos)/alimama/splash_screen - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/frogserver/aocs/updatable - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/dsp/profile/index/nodefaas - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/search/new_hotword - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/scene/recommend - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/search_poi/tips_adv - reject-dict",
    r"^https?://.*\.amap\.com/ws/shield/search/nearbyrec_smart - reject-dict",
    r"^https?://.*\.amap\.com/ws/faas/amap-navigation/(card-service-route-plan|card-service-car-end|main-page) - reject-dict",
    r"^https?://.*\.amap\.com/ws/promotion-web/resource - reject-dict",
    r"^https?://m5-zb\.amap\.com/ws/promotion-web/resource - reject-dict",
    r"^https?://(.*\.amap\.com|sns\.amap\.com)/ws/msgbox/pull - reject-dict",
    r"^https?://m5-zb\.amap\.com/ws/boss/order_web/\w+_information - reject-dict",
    r"^https?://m5-zb\.amap\.com/ws/sharedtrip/taxi/order_detail_car_tips - reject-dict",
    r"^https?://.*\.amap\.com/ws/valueadded/weather - reject-dict",
    "# ── 百度地图 ──",
    r"^https?://newclient\.map\.baidu\.com/client/phpui2/\?qt=ads - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/phpui.*qt=hw - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/crossmarketing - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/operation/activity - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/usersystem/home/dynamic - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/skin/center/recommend - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/msgcenter/pull - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/client/noticebar/get - reject-dict",
    r"^https?://newclient\.map\.baidu\.com/contributor-bus/bounty/tips - reject-dict",
    "",
    "[MITM]",
    "hostname = *.amap.com, m5-zb.amap.com, sns.amap.com, newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com",
])
