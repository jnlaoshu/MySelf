import pytest
from merge_rules import unique_domains, parse_repcz, parse_adrules, parse_anti_ad

@pytest.fixture(autouse=True)
def clear_domains():
    unique_domains.clear()

def test_parse_repcz():
    content = "payload:\n  - google.com\n  - apple.com\n"
    parse_repcz(content)
    assert unique_domains == {"google.com", "apple.com"}

    unique_domains.clear()
    parse_repcz("payload: not-a-list")
    assert unique_domains == set()

def test_parse_adrules():
    content = "||google.com^\n||apple.com\n||facebook.com^$third-party\n! Comment\n"
    parse_adrules(content)
    assert unique_domains == {"google.com", "apple.com", "facebook.com"}

def test_parse_anti_ad():
    content = "DOMAIN,google.com,REJECT\nDOMAIN-SUFFIX,apple.com,REJECT\nIP-CIDR,127.0.0.1/8,REJECT\n"
    parse_anti_ad(content)
    assert unique_domains == {"google.com", "apple.com"}
