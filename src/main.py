#!/usr/bin/env python3
"""
JUSMINE - UK Afrobeats ニュース自動投稿ツール

RSS取得 → 翻訳 → Buffer経由でX投稿
"""
import argparse
import os
import sys
from pathlib import Path

# srcディレクトリをパスに追加
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from fetch_rss import fetch_all_sources, filter_recent, save_entries
from translate import translate_entries, save_translated
from post_buffer import post_entries, get_profiles


def main():
    parser = argparse.ArgumentParser(description="UK Afrobeats ニュース自動投稿")
    parser.add_argument("--category", default="uk_afrobeats", help="取得するカテゴリ")
    parser.add_argument("--limit", type=int, default=5, help="投稿数の上限")
    parser.add_argument("--dry-run", action="store_true", help="投稿せずに確認のみ")
    parser.add_argument("--skip-fetch", action="store_true", help="RSS取得をスキップ")
    parser.add_argument("--skip-translate", action="store_true", help="翻訳をスキップ")
    args = parser.parse_args()

    load_dotenv()

    print("=" * 50)
    print("JUSMINE - UK Afrobeats ニュース自動投稿")
    print("=" * 50)

    # 1. RSS取得
    if not args.skip_fetch:
        print("\n[1/3] RSS取得中...")
        entries = fetch_all_sources(args.category)
        entries = filter_recent(entries)[:args.limit]
        save_entries(entries)
        print(f"取得完了: {len(entries)}件")
    else:
        print("\n[1/3] RSS取得: スキップ")
        from fetch_rss import Path as FPath
        import json
        with open("data/entries.json", "r", encoding="utf-8") as f:
            entries = json.load(f)

    if not entries:
        print("新しいエントリがありません")
        return

    # 2. 翻訳
    if not args.skip_translate:
        print("\n[2/3] 翻訳中...")
        if not os.getenv("DEEPL_API_KEY"):
            print("警告: DEEPL_API_KEY が未設定です。翻訳をスキップします")
            translated = entries
        else:
            translated = translate_entries(entries)
            save_translated(translated)
            print("翻訳完了")
    else:
        print("\n[2/3] 翻訳: スキップ")
        import json
        with open("data/translated.json", "r", encoding="utf-8") as f:
            translated = json.load(f)

    # 3. 投稿
    print("\n[3/3] Buffer投稿...")
    if args.dry_run:
        print("(ドライラン: 投稿はスキップ)")
        for entry in translated:
            title = entry.get("title_ja", entry.get("title", ""))
            print(f"  - {title[:60]}...")
    else:
        if not os.getenv("BUFFER_ACCESS_TOKEN"):
            print("警告: BUFFER_ACCESS_TOKEN が未設定です")
            return
        post_entries(translated)

    print("\n完了!")


if __name__ == "__main__":
    main()
