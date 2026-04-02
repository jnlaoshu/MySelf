#!/usr/bin/env python3
"""
generate_map_modules.py
检测上游脚本更新，重新生成 Egern 地图去广告模块。
"""

import urllib.request
import urllib.error
import json
import datetime
import os
import sys
import hashlib

TODAY = datetime.date.today().strftime("%Y-%m-%d")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "Egern", "Module")
CACHE_FILE = os.path.join(os.path.dirname(__file__), ".upstream_hashes.json")

UPSTREAM = {
    "amap":  "https://raw.githubusercontent.com/ddgksf2013/Scripts/master/amap.js",
    "bdmap": "https://raw.githubusercontent.com/ddgksf2013/Scripts/master/bdmap.ads.js",
}

# ── 工具函数 ──────────────────────────────────────────────

def fetch_text(url, timeout=15):
    headers = {"User-Agent": "Mozilla/5.0"}
    token = os.environ.get("GITHUB_TOKEN")
    if token and "api.github.com" in url:
        headers["Authorization"] = f"Bearer {token}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8")
    except Exception as e:
        print(f"[WARN] 无法获取 {url}: {e}")
        return None

def sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()[:16]

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {}

def save_cache(data):
    with open(CACHE_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_latest_commit(owner, repo, path):
    """获取指定文件的最新 commit hash 和提交说明"""
    api = f"https://api.github.com/repos/{owner}/{repo}/commits?path={path}&per_page=1"
    content = fetch_text(api)
    if content:
        try:
            data = json.loads(content)
            sha = data[0]["sha"][:7]
            msg = data[0]["commit"]["message"].split("\n")[0]
            return sha, msg
        except Exception:
            pass
    return "unknown", ""

def check_upstream():
    """
    返回 (脚本内容是否有变化, 各脚本是否可访问, 新哈希字典, commit信息字典)
    """
    cache = load_cache()
    new_hashes = {}
    valid = {}
    changed = False
    commits = {}

    for key, url in UPSTREAM.items():
        content = fetch_text(url)
        if content is None:
            print(f"[ERROR] 脚本不可访问：{url}")
            valid[key] = False
            new_hashes[key] = cache.get(key, "")
            commits[key] = ("unknown", "fetch failed")
        else:
            valid[key] = True
            h = sha256(content)
            new_hashes[key] = h
            if cache.get(key) != h:
                print(f"[UPDATE] 检测到上游更新：{key}")
                changed = True
            else:
                print(f"[OK] 无变化：{key}")

        # 获取 commit 信息（仅对 GitHub raw 链接有效）
        if "raw.githubusercontent.com" in url:
            parts = url.replace("https://raw.githubusercontent.com/", "").split("/")
            # parts: owner / repo / branch / ...path
            owner_r, repo_r = parts[0], parts[1]
            file_path = "/".join(parts[3:])
            sha, msg = get_latest_commit(owner_r, repo_r, file_path)
            commits[key] = (sha, msg)
            print(f"[COMMIT] {key}: {sha} — {msg}")

    # 扫描辅助仓库（仅日志，不影响生成逻辑）
    scan_auxiliary_repos()

    return changed, valid, new_hashes, commits

def scan_auxiliary_repos():
    """扫描 fmz200/RuCu6 等仓库，记录新发现的地图相关脚本"""
    repos = [
        ("fmz200", "wool_scripts", "iCloud/Scripts"),
        ("RuCu6",  "QuanX",       "Scripts"),
    ]
    for owner, repo, path in repos:
        api = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        content = fetch_text(api)
        if not content:
            continue
        try:
            items = json.loads(content)
            for item in items:
                name = item.get("name", "").lower()
                if any(kw in name for kw in ["amap", "gaode", "baidu", "bdmap"]):
                    print(f"[SCAN] 发现相关脚本：{owner}/{repo} → {item['name']}")
                    print(f"       {item.get('download_url', '')}")
        except Exception:
            pass

# ── 模块模板 ──────────────────────────────────────────────

AMAP_MODULE = """\
#!name=高德地图去广告
#!desc=屏蔽开屏/搜索/首页/路线/附近/打车/消息推广（脚本源：ddgksf2013）
#!author=jnlaoshu
#!category=AdBlock
#!date=__DATE__
#!upstream-commit=amap.js@__AMAP_SHA__
#!source=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Egern/Module/AmapAdBlock.yaml

[Rule]
# ── 广告域名拦截 ──
DOMAIN,amap-aos-info-nogw.amap.com,REJECT
DOMAIN,free-aos-cdn-image.amap.com,REJECT
DOMAIN,optimus-ads.amap.com,REJECT
DOMAIN-SUFFIX,v.smtcdns.com,REJECT

[Rewrite]
# ── JQ 字段清理 ──
http-response-jq ^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_business\\/process\\/marketingOperationStructured\\? 'delpaths([["data","commonMaterial"],["data","tipsOperationLocation"],["data","resourcePlacement"]])'
http-response-jq ^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_poi\\/homepage\\? 'delpaths([["history_tags"]])'
http-response-jq ^https:\\/\\/m5-zb\\.amap\\.com\\/ws\\/sharedtrip\\/taxi\\/order_detail_car_tips\\? 'delpaths([["data","carTips","data","popupInfo"]])'

# ── Mock 空响应 ──
^https:\\/\\/m5\\.amap\\.com\\/ws\\/faas\\/amap-navigation\\/card-service-car-end - reject-dict
^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_poi\\/tips_adv - reject-dict
^https:\\/\\/m5-zb\\.amap\\.com\\/ws\\/boss\\/order_web\\/\\w{8}_information - reject-dict

[Script]
# ── 开屏广告 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/(valueadded|aos)\\/alimama\\/splash_screen script-path=__AMAP_JS__, requires-body=true, tag=高德_开屏
# ── 我的页面 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/dsp\\/profile\\/index\\/nodefaas script-path=__AMAP_JS__, requires-body=true, tag=高德_我的页面
# ── 搜索热词 & 场景推荐 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/search\\/new_hotword script-path=__AMAP_JS__, requires-body=true, tag=高德_搜索热词
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/scene\\/recommend script-path=__AMAP_JS__, requires-body=true, tag=高德_场景推荐
# ── 路线规划 & 首页 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/faas\\/amap-navigation\\/(card-service-route-plan|main-page) script-path=__AMAP_JS__, requires-body=true, tag=高德_路线首页
# ── 附近推荐 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/search\\/nearbyrec_smart script-path=__AMAP_JS__, requires-body=true, tag=高德_附近
# ── 打车推广 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/promotion-web\\/resource script-path=__AMAP_JS__, requires-body=true, tag=高德_打车
# ── 消息中心 ──
http-response ^https?:\\/\\/(.*\\.amap\\.com|sns\\.amap\\.com)\\/ws\\/msgbox\\/pull script-path=__AMAP_JS__, requires-body=true, tag=高德_消息
# ── FROG 推广位 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/frogserver\\/aocs\\/updatable script-path=__AMAP_JS__, requires-body=true, tag=高德_推广位

[MITM]
hostname = *.amap.com, m5-zb.amap.com, sns.amap.com
"""

BDMAP_MODULE = """\
#!name=百度地图去广告
#!desc=屏蔽开屏/搜索/营销/个人中心/消息/活动推广（脚本源：ddgksf2013）
#!author=jnlaoshu
#!category=AdBlock
#!date=__DATE__
#!upstream-commit=bdmap.ads.js@__BDMAP_SHA__
#!source=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Egern/Module/BaiduMapAdBlock.yaml

[Rule]
# ── 广告域名拦截 ──
# 注：180.76.76.200 为纯 IP，DOMAIN 规则不适用，改用 IP-CIDR
DOMAIN,dss0.bdstatic.com,REJECT
DOMAIN,tb1.bdstatic.com,REJECT
DOMAIN,tb2.bdstatic.com,REJECT
IP-CIDR,180.76.76.200/32,REJECT,no-resolve

[Rewrite]
# ── JQ 字段清理 ──
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/usercenter\\/mine\\/page 'del(.data.sport_card, .data.gold, .data.gold_coin_card, .data.shop, .data.usersystem_b_banner)'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/living\\/nearby\\/hot-words\\? '.Result.data=[]'
http-response-jq ^https?:\\/\\/.*map\\.baidu\\.com\\/.*govui\\/rich_content '.data.posts.content=[]'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/voice\\/pack\\/list 'del(.data.recommand_list)'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/noticebar\\/get\\? 'del(.content.multi_data)'

# ── Mock 空响应 ──
^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/contributor-bus\\/bounty\\/tips - reject-dict
^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/skin\\/center\\/recommend - reject-dict

[Script]
# ── 开屏 & 首页推广 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/phpui2\\/\\?qt=ads script-path=__BDMAP_JS__, requires-body=true, tag=百度_开屏
# ── 搜索推广词 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/phpui.*qt=hw script-path=__BDMAP_JS__, requires-body=true, tag=百度_搜索
# ── 跨界营销 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/crossmarketing script-path=__BDMAP_JS__, requires-body=true, tag=百度_营销
# ── 个人中心动态 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/usersystem\\/home\\/dynamic script-path=__BDMAP_JS__, requires-body=true, tag=百度_个人中心
# ── 消息中心 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/msgcenter\\/pull script-path=__BDMAP_JS__, requires-body=true, tag=百度_消息
# ── 首页小横条 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/noticebar\\/get script-path=__BDMAP_JS__, requires-body=true, tag=百度_横条
# ── 活动推广 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/operation\\/activity script-path=__BDMAP_JS__, requires-body=true, tag=百度_活动

[MITM]
hostname = newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com
"""

COMBINED_MODULE = """\
#!name=地图去广告合集（高德 + 百度）
#!desc=高德地图 + 百度地图广告拦截合集（脚本源：ddgksf2013）
#!author=jnlaoshu
#!category=AdBlock
#!date=__DATE__
#!upstream-commit=amap.js@__AMAP_SHA__ bdmap.ads.js@__BDMAP_SHA__
#!source=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Egern/Module/MapAdBlock.yaml

# ════════════════════════════════════════
# 高德地图
# ════════════════════════════════════════

[Rule]
DOMAIN,amap-aos-info-nogw.amap.com,REJECT
DOMAIN,free-aos-cdn-image.amap.com,REJECT
DOMAIN,optimus-ads.amap.com,REJECT
DOMAIN-SUFFIX,v.smtcdns.com,REJECT
DOMAIN,dss0.bdstatic.com,REJECT
DOMAIN,tb1.bdstatic.com,REJECT
DOMAIN,tb2.bdstatic.com,REJECT
IP-CIDR,180.76.76.200/32,REJECT,no-resolve

[Rewrite]
# ── 高德 JQ ──
http-response-jq ^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_business\\/process\\/marketingOperationStructured\\? 'delpaths([["data","commonMaterial"],["data","tipsOperationLocation"],["data","resourcePlacement"]])'
http-response-jq ^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_poi\\/homepage\\? 'delpaths([["history_tags"]])'
http-response-jq ^https:\\/\\/m5-zb\\.amap\\.com\\/ws\\/sharedtrip\\/taxi\\/order_detail_car_tips\\? 'delpaths([["data","carTips","data","popupInfo"]])'
^https:\\/\\/m5\\.amap\\.com\\/ws\\/faas\\/amap-navigation\\/card-service-car-end - reject-dict
^https:\\/\\/m5\\.amap\\.com\\/ws\\/shield\\/search_poi\\/tips_adv - reject-dict
^https:\\/\\/m5-zb\\.amap\\.com\\/ws\\/boss\\/order_web\\/\\w{8}_information - reject-dict

# ── 百度 JQ ──
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/usercenter\\/mine\\/page 'del(.data.sport_card, .data.gold, .data.gold_coin_card, .data.shop, .data.usersystem_b_banner)'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/living\\/nearby\\/hot-words\\? '.Result.data=[]'
http-response-jq ^https?:\\/\\/.*map\\.baidu\\.com\\/.*govui\\/rich_content '.data.posts.content=[]'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/voice\\/pack\\/list 'del(.data.recommand_list)'
http-response-jq ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/noticebar\\/get\\? 'del(.content.multi_data)'
^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/contributor-bus\\/bounty\\/tips - reject-dict
^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/skin\\/center\\/recommend - reject-dict

[Script]
# ── 高德脚本 ──
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/(valueadded|aos)\\/alimama\\/splash_screen script-path=__AMAP_JS__, requires-body=true, tag=高德_开屏
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/dsp\\/profile\\/index\\/nodefaas script-path=__AMAP_JS__, requires-body=true, tag=高德_我的页面
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/search\\/new_hotword script-path=__AMAP_JS__, requires-body=true, tag=高德_搜索热词
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/scene\\/recommend script-path=__AMAP_JS__, requires-body=true, tag=高德_场景推荐
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/faas\\/amap-navigation\\/(card-service-route-plan|main-page) script-path=__AMAP_JS__, requires-body=true, tag=高德_路线首页
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/search\\/nearbyrec_smart script-path=__AMAP_JS__, requires-body=true, tag=高德_附近
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/promotion-web\\/resource script-path=__AMAP_JS__, requires-body=true, tag=高德_打车
http-response ^https?:\\/\\/(.*\\.amap\\.com|sns\\.amap\\.com)\\/ws\\/msgbox\\/pull script-path=__AMAP_JS__, requires-body=true, tag=高德_消息
http-response ^https?:\\/\\/.*\\.amap\\.com\\/ws\\/shield\\/frogserver\\/aocs\\/updatable script-path=__AMAP_JS__, requires-body=true, tag=高德_推广位

# ── 百度脚本 ──
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/phpui2\\/\\?qt=ads script-path=__BDMAP_JS__, requires-body=true, tag=百度_开屏
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/phpui.*qt=hw script-path=__BDMAP_JS__, requires-body=true, tag=百度_搜索
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/crossmarketing script-path=__BDMAP_JS__, requires-body=true, tag=百度_营销
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/usersystem\\/home\\/dynamic script-path=__BDMAP_JS__, requires-body=true, tag=百度_个人中心
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/msgcenter\\/pull script-path=__BDMAP_JS__, requires-body=true, tag=百度_消息
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/client\\/noticebar\\/get script-path=__BDMAP_JS__, requires-body=true, tag=百度_横条
http-response ^https?:\\/\\/newclient\\.map\\.baidu\\.com\\/operation\\/activity script-path=__BDMAP_JS__, requires-body=true, tag=百度_活动

[MITM]
hostname = *.amap.com, m5-zb.amap.com, sns.amap.com, newclient.map.baidu.com, *.map.baidu.com, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, httpdns.baidubce.com
"""

# ── 主逻辑 ──────────────────────────────────────────────

def render(template, amap_js, bdmap_js, amap_sha, bdmap_sha):
    return (template
            .replace("__DATE__",     TODAY)
            .replace("__AMAP_JS__",  amap_js)
            .replace("__BDMAP_JS__", bdmap_js)
            .replace("__AMAP_SHA__", amap_sha)
            .replace("__BDMAP_SHA__", bdmap_sha))

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[WRITE] {path}")

def main():
    changed, valid, new_hashes, commits = check_upstream()

    any_invalid = not valid.get("amap") or not valid.get("bdmap")
    if any_invalid:
        # 写入失败标记，供 workflow 读取
        with open("/tmp/script_invalid", "w") as f:
            f.write("1")
        print("[ERROR] 至少一个上游脚本不可访问，将触发 Issue 告警")

    amap_js   = UPSTREAM["amap"]
    bdmap_js  = UPSTREAM["bdmap"]
    amap_sha  = commits.get("amap",  ("unknown",))[0]
    bdmap_sha = commits.get("bdmap", ("unknown",))[0]

    write(os.path.join(OUTPUT_DIR, "AmapAdBlock.yaml"),
          render(AMAP_MODULE, amap_js, bdmap_js, amap_sha, bdmap_sha))
    write(os.path.join(OUTPUT_DIR, "BaiduMapAdBlock.yaml"),
          render(BDMAP_MODULE, amap_js, bdmap_js, amap_sha, bdmap_sha))
    write(os.path.join(OUTPUT_DIR, "MapAdBlock.yaml"),
          render(COMBINED_MODULE, amap_js, bdmap_js, amap_sha, bdmap_sha))

    save_cache(new_hashes)

    # 写入 commit message 供 workflow 使用
    with open("/tmp/commit_msg.txt", "w") as f:
        if changed:
            f.write(f"chore: sync upstream scripts [{TODAY}]\n\n")
            f.write(f"amap.js@{amap_sha}  bdmap.ads.js@{bdmap_sha}\n")
        else:
            f.write(f"chore: date update [{TODAY}]\n")

    print(f"[DONE] 上游变化：{'是' if changed else '否'}")

if __name__ == "__main__":
    main()
