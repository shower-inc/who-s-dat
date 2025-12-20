import requests
import os
import json
from datetime import datetime, timedelta


BUFFER_API_BASE = "https://api.bufferapp.com/1"


def get_access_token() -> str:
    """Buffer Access Tokenを取得"""
    token = os.getenv("BUFFER_ACCESS_TOKEN")
    if not token:
        raise ValueError("BUFFER_ACCESS_TOKEN 環境変数が設定されていません")
    return token


def get_profiles() -> list[dict]:
    """連携済みのソーシャルプロファイルを取得"""
    token = get_access_token()
    response = requests.get(
        f"{BUFFER_API_BASE}/profiles.json",
        params={"access_token": token}
    )
    response.raise_for_status()
    return response.json()


def create_update(profile_id: str, text: str, link: str = None, scheduled_at: datetime = None) -> dict:
    """投稿をスケジュール"""
    token = get_access_token()

    data = {
        "access_token": token,
        "profile_ids[]": profile_id,
        "text": text,
    }

    if link:
        data["media[link]"] = link

    if scheduled_at:
        data["scheduled_at"] = int(scheduled_at.timestamp())

    response = requests.post(
        f"{BUFFER_API_BASE}/updates/create.json",
        data=data
    )
    response.raise_for_status()
    return response.json()


def format_post(entry: dict) -> str:
    """エントリを投稿用テキストに整形"""
    title_ja = entry.get("title_ja", entry.get("title", ""))
    source = entry.get("source", "")
    link = entry.get("link", "")

    # 280文字制限を考慮（リンク約23文字分）
    max_title_len = 200
    if len(title_ja) > max_title_len:
        title_ja = title_ja[:max_title_len] + "..."

    post = f"{title_ja}\n\n[{source}]\n{link}"
    return post


def post_entries(entries: list[dict], profile_id: str = None):
    """翻訳済みエントリをBufferに投稿"""
    if profile_id is None:
        profiles = get_profiles()
        if not profiles:
            raise ValueError("連携済みプロファイルがありません")
        # 最初のX(Twitter)プロファイルを使用
        x_profiles = [p for p in profiles if p.get("service") == "twitter"]
        if not x_profiles:
            raise ValueError("X(Twitter)プロファイルがありません")
        profile_id = x_profiles[0]["id"]
        print(f"使用プロファイル: {x_profiles[0].get('formatted_username', profile_id)}")

    scheduled_time = datetime.now() + timedelta(hours=1)

    for i, entry in enumerate(entries):
        text = format_post(entry)
        print(f"投稿スケジュール中: {i+1}/{len(entries)}")
        print(f"  {text[:50]}...")

        result = create_update(
            profile_id=profile_id,
            text=text,
            scheduled_at=scheduled_time
        )

        if result.get("success"):
            print(f"  -> 成功: {scheduled_time.strftime('%Y-%m-%d %H:%M')}")
        else:
            print(f"  -> 失敗: {result}")

        # 1時間ごとにスケジュール
        scheduled_time += timedelta(hours=1)


def load_translated(input_path: str = "data/translated.json") -> list[dict]:
    """翻訳済みエントリを読み込む"""
    with open(input_path, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    # プロファイル一覧を表示
    print("--- 連携済みプロファイル ---")
    profiles = get_profiles()
    for p in profiles:
        print(f"  [{p['service']}] {p.get('formatted_username', p['id'])}")

    # 投稿するか確認
    entries = load_translated()
    print(f"\n{len(entries)}件の投稿をスケジュールしますか？ (y/n)")
    if input().strip().lower() == "y":
        post_entries(entries)
    else:
        print("キャンセルしました")
