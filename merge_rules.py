import requests
import yaml
import os
from datetime import datetime

# ================= 配置区域 =================
# 输出文件的完整路径
OUTPUT_FILE = "Egern/Rule/AdRule.yaml"

# 规则源
URLS = {
    "Repcz_AdGuard": "https://raw.githubusercontent.com/Repcz/Tool/refs/heads/X/Egern/Rules/AdGuardChinese.yaml",
    "AdRules": "https://raw.githubusercontent.com/Cats-Team/AdRules/refs/heads/main/adrules.list",
    "AntiAD": "https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-surge.txt"
}
# ===========================================

unique_domains = set()

def fetch_text(url):
    try:
        print(f"Downloading {url}...")
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def parse_repcz(content):
    if not content: return
    try:
        data = yaml.safe_load(content)
        if isinstance(data, dict) and 'payload' in data:
            for domain in data['payload']:
                unique_domains.add(domain.strip())
            print(f"  - Repcz: Parsed {len(data['payload'])} domains")
    except Exception as e:
        print(f"  - Repcz Error: {e}")

def parse_adrules(content):
    if not content: return
    count = 0
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('!') or line.startswith('['): continue
        
        domain = ""
        if line.startswith('||') and line.endswith('^'):
            domain = line[2:-1]
        elif line.startswith('||'):
            domain = line[2:]
            
        if domain and '/' not in domain and '*' not in domain:
            unique_domains.add(domain)
            count += 1
    print(f"  - AdRules: Parsed {count} domains")

def parse_anti_ad(content):
    if not content: return
    count = 0
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('//'): continue
        
        parts = line.split(',')
        if len(parts) >= 2:
            domain = parts[1].strip()
            if '.' in domain:
                unique_domains.add(domain)
                count += 1
    print(f"  - Anti-AD: Parsed {count} domains")

def main():
    # 1. 下载并解析
    parse_repcz(fetch_text(URLS["Repcz_AdGuard"]))
    parse_adrules(fetch_text(URLS["AdRules"]))
    parse_anti_ad(fetch_text(URLS["AntiAD"]))

    # 2. 排序
    sorted_domains = sorted(list(unique_domains))
    print(f"Total unique domains: {len(sorted_domains)}")

    # 3. 准备输出数据
    output_data = {"payload": sorted_domains}

    # 4. 确保目录存在
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    # 5. 写入文件
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"# Egern AdRule (Merged)\n")
            f.write(f"# Total Domains: {len(sorted_domains)}\n")
            f.write(f"# Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"# Sources: Repcz, AdRules, Anti-AD\n\n")
            yaml.dump(output_data, f, default_flow_style=False, allow_unicode=True)
        print(f"Success! Saved to {OUTPUT_FILE}")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    main()
