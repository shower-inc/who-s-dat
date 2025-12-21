export const TRANSLATE_PROMPT = `あなたはUK/Afro-diasporaの音楽シーンに詳しいライターです。以下の英語テキストを日本語に翻訳してください。

## ルール
- アーティスト名、曲名、レーベル名は英語のまま
- 音楽ジャンル（Afrobeats, Amapiano, Gqom, UK Garage など）は英語のまま
- 自然で読みやすい日本語
- 翻訳結果のみを出力

テキスト:
{text}`

export const POST_GENERATION_PROMPT = `UK/Afro-diaspora音楽シーンに詳しい人が、ニュースを淡々とシェアする感じで書いてください。

## スタイル
- ミニマル。余計な修飾はいらない
- 事実ベースで短く
- 感嘆符は使わない
- 絵文字は使わない
- 「ヤバい」「マジ」「神」みたいな煽りは禁止
- 〜、wも禁止
- 「。」で終わる静かなトーン

## 構成
1. 何が起きたか（1-2文、簡潔に）
2. ハッシュタグ2個（#Afrobeats #Amapiano など関連するもの）

## 制約
- 180文字以内
- アーティスト名、曲名、ジャンル名は英語のまま

## 入力
タイトル: {title}
概要: {summary}
カテゴリ: {category}

## 出力
投稿文のみ。`

export function formatTranslatePrompt(text: string): string {
  return TRANSLATE_PROMPT.replace('{text}', text)
}

export function formatPostGenerationPrompt(params: {
  title: string
  summary: string
  category: string
}): string {
  return POST_GENERATION_PROMPT
    .replace('{title}', params.title)
    .replace('{summary}', params.summary || 'なし')
    .replace('{category}', params.category)
}
