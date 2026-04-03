import os
import datetime

TODAY = datetime.date.today().strftime("%Y-%m-%d")
OUT = "Egern/Module"
os.makedirs(OUT, exist_ok=True)

AMAP_JS = "https://raw.githubusercontent.com/ddgksf2013/Scripts/master/amap.js"
BDMAP_JS = os.environ.get(
    "BDMAP_JS",
    "https://ddgksf2013.top/scripts/bdmap.ads.js"
)


def write(filename, lines):
    path = os.path.join(OUT, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"[OK] {filename}")


# ── 高德地图模块 ──────────────────────────────────────────────
write("AmapAdBlock.yaml", [
    "#!name=高德地图去广告",
    "#!desc=屏蔽开屏/搜索/首页/路线/附近/打车/消息推广",
    "#!author=ddgksf2013（Egern 适配：jnlaoshu）",
    "#!category=AdBlock",
    f"#!date={TODAY}",
    "",
    "[Rule]",
    "DOMAIN,amap-aos-info-nogw.amap.com,REJECT",
    "DOMAIN,free-aos-cdn-image.amap.com,REJECT",
    "DOMAIN,optimus-ads.amap.com,REJECT",
    "DOMAIN-SUFFIX,v.smtcdns.com,REJECT",
    "",
    "[Script]",
    "# ── 开屏广告 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/(valueadded|aos)/alimama/splash_screen script-path={AMAP_JS}, requires-body=true, tag=高德_开屏",
    "# ── 我的页面 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/dsp/profile/index/nodefaas script-path={AMAP_JS}, requires-body=true, tag=高德_我的页面",
    "# ── 搜索热词 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/search/new_hotword script-path={AMAP_JS}, requires-body=true, tag=高德_搜索热词",
    "# ── 场景推荐 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/scene/recommend script-path={AMAP_JS}, requires-body=true, tag=高德_场景推荐",
    "# ── 路线规划 & 首页 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/faas/amap-navigation/(card-service-route-plan|main-page) script-path={AMAP_JS}, requires-body=true, tag=高德_路线首页",
    "# ── 附近推荐 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/search/nearbyrec_smart script-path={AMAP_JS}, requires-body=true, tag=高德_附近",
    "# ── 打车推广 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/promotion-web/resource script-path={AMAP_JS}, requires-body=true, tag=高德_打车",
    "# ── 消息中心 ──",
    f"http-response ^https?://(.*\\.amap\\.com|sns\\.amap\\.com)/ws/msgbox/pull script-path={AMAP_JS}, requires-body=true, tag=高德_消息",
    "# ── FROG 推广位 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/frogserver/aocs/updatable script-path={AMAP_JS}, requires-body=true, tag=高德_推广位",
    "",
    "[MITM]",
    "hostname = *.amap.com, m5-zb.amap.com, sns.amap.com",
])


# ── 百度地图模块 ──────────────────────────────────────────────
write("BaiduMapAdBlock.yaml", [
    "#!name=百度地图去广告",
    "#!desc=屏蔽开屏/搜索/营销/个人中心/消息/活动推广",
    "#!author=ddgksf2013（Egern 适配：jnlaoshu）",
    "#!category=AdBlock",
    f"#!date={TODAY}",
    "",
    "[Rule]",
    "# 180.76.76.200 是 IP 地址，DOMAIN 规则不适用，如需拦截请改用：",
    "# IP-CIDR,180.76.76.200/32,REJECT",
    "DOMAIN,dss0.bdstatic.com,REJECT",
    "DOMAIN,tb1.bdstatic.com,REJECT",
    "DOMAIN,tb2.bdstatic.com,REJECT",
    "",
    "[Script]",
    "# ── 开屏 & 首页推广 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/phpui2/\\?qt=ads script-path={BDMAP_JS}, requires-body=true, tag=百度_开屏",
    "# ── 搜索推广词 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/phpui.*qt=hw script-path={BDMAP_JS}, requires-body=true, tag=百度_搜索",
    "# ── 跨界营销 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/crossmarketing script-path={BDMAP_JS}, requires-body=true, tag=百度_营销",
    "# ── 个人中心 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/usersystem/home/dynamic script-path={BDMAP_JS}, requires-body=true, tag=百度_个人中心",
    "# ── 消息中心 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/msgcenter/pull script-path={BDMAP_JS}, requires-body=true, tag=百度_消息",
    "# ── 首页小横条 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/noticebar/get script-path={BDMAP_JS}, requires-body=true, tag=百度_横条",
    "# ── 活动推广 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/operation/activity script-path={BDMAP_JS}, requires-body=true, tag=百度_活动",
    "",
    "[MITM]",
    "hostname = newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com",
])


# ── 合集模块 ──────────────────────────────────────────────────
write("MapAdBlock.yaml", [
    "#!name=地图去广告合集",
    "#!desc=高德 + 百度地图广告清理",
    "#!author=ddgksf2013（Egern 适配：jnlaoshu）",
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
    "[Script]",
    "# ── 高德地图 ──",
    f"http-response ^https?://.*\\.amap\\.com/ws/(valueadded|aos)/alimama/splash_screen script-path={AMAP_JS}, requires-body=true, tag=高德_开屏",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/dsp/profile/index/nodefaas script-path={AMAP_JS}, requires-body=true, tag=高德_我的页面",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/search/new_hotword script-path={AMAP_JS}, requires-body=true, tag=高德_搜索热词",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/scene/recommend script-path={AMAP_JS}, requires-body=true, tag=高德_场景推荐",
    f"http-response ^https?://.*\\.amap\\.com/ws/faas/amap-navigation/(card-service-route-plan|main-page) script-path={AMAP_JS}, requires-body=true, tag=高德_路线首页",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/search/nearbyrec_smart script-path={AMAP_JS}, requires-body=true, tag=高德_附近",
    f"http-response ^https?://.*\\.amap\\.com/ws/promotion-web/resource script-path={AMAP_JS}, requires-body=true, tag=高德_打车",
    f"http-response ^https?://(.*\\.amap\\.com|sns\\.amap\\.com)/ws/msgbox/pull script-path={AMAP_JS}, requires-body=true, tag=高德_消息",
    f"http-response ^https?://.*\\.amap\\.com/ws/shield/frogserver/aocs/updatable script-path={AMAP_JS}, requires-body=true, tag=高德_推广位",
    "# ── 百度地图 ──",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/phpui2/\\?qt=ads script-path={BDMAP_JS}, requires-body=true, tag=百度_开屏",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/phpui.*qt=hw script-path={BDMAP_JS}, requires-body=true, tag=百度_搜索",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/crossmarketing script-path={BDMAP_JS}, requires-body=true, tag=百度_营销",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/usersystem/home/dynamic script-path={BDMAP_JS}, requires-body=true, tag=百度_个人中心",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/msgcenter/pull script-path={BDMAP_JS}, requires-body=true, tag=百度_消息",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/client/noticebar/get script-path={BDMAP_JS}, requires-body=true, tag=百度_横条",
    f"http-response ^https?://newclient\\.map\\.baidu\\.com/operation/activity script-path={BDMAP_JS}, requires-body=true, tag=百度_活动",
    "",
    "[MITM]",
    "hostname = *.amap.com, m5-zb.amap.com, sns.amap.com, newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com",
])
