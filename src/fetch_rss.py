import feedparser
import json
from datetime import datetime, timedelta
from pathlib import Path


def load_sources(config_path: str = "config/sources.json") -> dict:
    """ソース設定を読み込む"""
    with open(config_path, "r") as f:
        return json.load(f)


def fetch_feed(url: str) -> list[dict]:
    """RSSフィードを取得してエントリを返す"""
    feed = feedparser.parse(url)
    entries = []

    for entry in feed.entries:
        entries.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": entry.get("summary", ""),
            "author": entry.get("author", ""),
        })

    return entries


def fetch_all_sources(category: str = "uk_afrobeats") -> list[dict]:
    """指定カテゴリの全ソースからエントリを取得"""
    sources = load_sources()
    all_entries = []

    if category not in sources:
        print(f"カテゴリ '{category}' が見つかりません")
        return []

    for source in sources[category]["sources"]:
        if not source.get("enabled", True):
            continue

        print(f"取得中: {source['name']}")
        entries = fetch_feed(source["url"])

        for entry in entries:
            entry["source"] = source["name"]
            entry["category"] = category

        all_entries.extend(entries)
        print(f"  -> {len(entries)}件取得")

    return all_entries


def filter_recent(entries: list[dict], hours: int = 24) -> list[dict]:
    """直近N時間のエントリのみフィルタ"""
    # YouTubeのRSSは日時形式が統一されてないので、とりあえず全部返す
    # 本番では published をパースしてフィルタする
    return entries[:10]  # 最新10件に制限


def save_entries(entries: list[dict], output_path: str = "data/entries.json"):
    """エントリをJSONで保存"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"保存完了: {output_path} ({len(entries)}件)")


if __name__ == "__main__":
    entries = fetch_all_sources("uk_afrobeats")
    recent = filter_recent(entries)
    save_entries(recent)

    print("\n--- 最新エントリ ---")
    for entry in recent[:5]:
        print(f"[{entry['source']}] {entry['title']}")
