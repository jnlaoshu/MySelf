import requests
import yaml
import re
import os

# 配置
URLS = {
    "Repcz_AdGuard": "https://raw.githubusercontent.com/Repcz/Tool/refs/heads/X/Egern/Rules/AdGuardChinese.yaml",
    "AdRules": "https://raw.githubusercontent.com/Cats-Team/AdRules/refs/heads/main/adrules.list",
    "AntiAD": "https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-surge.txt"
}
OUTPUT_FILE = "AdRule.yaml"

# 全局去重集合
unique_domains = set()

def fetch_text(url):
    """通用下载函数"""
    try:
        print(f"Downloading {url}...")
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

def parse_repcz(content):
    """解析 Repcz (YAML)"""
    if not content: return
    try:
        data = yaml.safe_load(content)
        if isinstance(data, dict) and 'payload' in data:
            count = 0
            for domain in data['payload']:
                d = domain.strip()
                if d:
                    unique_domains.add(d)
                    count += 1
            print(f"  - Extracted from Repcz: {count}")
    except Exception as e:
        print(f"  - Error parsing Repcz YAML: {e}")

def parse_adrules(content):
    """解析 AdRules (AdBlock List)"""
    if not content: return
    count = 0
    lines = content.splitlines()
    for line in lines:
        line = line.strip()
        # 忽略注释和空行
        if not line or line.startswith('!') or line.startswith('['):
            continue
        
        domain = ""
        # 匹配 ||example.com^ 格式
        if line.startswith('||') and line.endswith('^'):
            domain = line[2:-1]
        # 匹配 ||example.com 格式
        elif line.startswith('||'):
            domain = line[2:]
        
        # 简单过滤：不包含路径(/)和通配符(*)的才视为纯域名规则
        if domain and '/' not in domain and '*' not in domain:
            unique_domains.add(domain)
            count += 1
    print(f"  - Extracted from AdRules: {count}")

def parse_anti_ad(content):
    """解析 Anti-AD (Surge Rule List)"""
    if not content: return
    count = 0
    lines = content.splitlines()
    for line in lines:
        line = line.strip()
        # 忽略注释
        if not line or line.startswith('#') or line.startswith('//'):
            continue
        
        # 格式通常为: DOMAIN-SUFFIX,example.com,REJECT
        parts = line.split(',')
        if len(parts) >= 2:
            # 取第二部分作为域名
            domain = parts[1].strip()
            if domain and '.' in domain: # 确保看起来像个域名
                unique_domains.add(domain)
                count += 1
    print(f"  - Extracted from Anti-AD: {count}")

def main():
    # 1. 下载并解析
    parse_repcz(fetch_text(URLS["Repcz_AdGuard"]))
    parse_adrules(fetch_text(URLS["AdRules"]))
    parse_anti_ad(fetch_text(URLS["AntiAD"]))

    # 2. 排序
    sorted_domains = sorted(list(unique_domains))
    print(f"Total unique domains: {len(sorted_domains)}")

    # 3. 构造 Egern YAML 结构
    output_data = {
        "payload": sorted_domains
    }
    
    # 4. 写入文件
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"# Egern AdRule (Merged)\n")
            f.write(f"# Total Domains: {len(sorted_domains)}\n")
            f.write(f"# Sources: Repcz, AdRules, Anti-AD\n")
            f.write(f"# Updated: {pd.Timestamp.now().strftime('%Y-%m-%d') if 'pd' in globals() else 'GitHub Actions'}\n\n")
            
            # 使用 PyYAML 转储，同时允许 unicode (显示中文注释等如果不乱码的话)
            yaml.dump(output_data, f, default_flow_style=False, allow_unicode=True)
            
        print(f"Success! Saved to {OUTPUT_FILE}")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    main()
