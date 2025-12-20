import deepl
import os
import json
from pathlib import Path


def get_translator() -> deepl.Translator:
    """DeepL Translatorを取得"""
    api_key = os.getenv("DEEPL_API_KEY")
    if not api_key:
        raise ValueError("DEEPL_API_KEY 環境変数が設定されていません")
    return deepl.Translator(api_key)


def translate_text(text: str, translator: deepl.Translator = None) -> str:
    """英語テキストを日本語に翻訳"""
    if not text:
        return ""

    if translator is None:
        translator = get_translator()

    result = translator.translate_text(text, target_lang="JA")
    return result.text


def translate_entry(entry: dict, translator: deepl.Translator = None) -> dict:
    """エントリのタイトルとサマリーを翻訳"""
    if translator is None:
        translator = get_translator()

    translated = entry.copy()
    translated["title_ja"] = translate_text(entry.get("title", ""), translator)
    translated["summary_ja"] = translate_text(entry.get("summary", ""), translator)

    return translated


def translate_entries(entries: list[dict]) -> list[dict]:
    """複数エントリを翻訳"""
    translator = get_translator()
    translated = []

    for i, entry in enumerate(entries):
        print(f"翻訳中: {i+1}/{len(entries)} - {entry.get('title', '')[:50]}")
        translated.append(translate_entry(entry, translator))

    return translated


def load_entries(input_path: str = "data/entries.json") -> list[dict]:
    """エントリを読み込む"""
    with open(input_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_translated(entries: list[dict], output_path: str = "data/translated.json"):
    """翻訳済みエントリを保存"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"保存完了: {output_path}")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    entries = load_entries()
    translated = translate_entries(entries)
    save_translated(translated)

    print("\n--- 翻訳結果サンプル ---")
    for entry in translated[:3]:
        print(f"[{entry['source']}]")
        print(f"  EN: {entry['title']}")
        print(f"  JA: {entry['title_ja']}")
        print()
