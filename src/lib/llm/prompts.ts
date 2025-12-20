export const TRANSLATE_PROMPT = `あなたは音楽ブログのライターです。以下の英語テキストを自然な日本語に翻訳してください。

ルール:
- アーティスト名、曲名、レーベル名などの固有名詞は英語のまま残す
- 音楽ジャンル名（Afrobeats, Amapiano, Gqom など）は英語のまま残す
- 自然で読みやすい日本語にする
- 翻訳結果のみを出力する（説明や注釈は不要）

テキスト:
{text}`

export const POST_GENERATION_PROMPT = `あなたは音楽に詳しい人が、自分のタイムラインで自然につぶやくような文章を書きます。

以下の音楽ニュースを、X（Twitter）への投稿用に日本語で書いてください。

## ルール
- 200文字以内（リンクは別途付与されます）
- 自然な日本語で、過剰な装飾は避ける
- 「！」は1つまで。「〜」「w」は使わない
- 「ヤバい」「マジで」「神」など媚びた表現は禁止
- アーティスト名、曲名、レーベル名は英語のまま
- 音楽ジャンル名（Afrobeats, Amapiano など）は英語のまま
- 絵文字は使わない
- 淡々と、でも興味は伝わるように
- ハッシュタグは最後に2個

## 入力
タイトル: {title}
翻訳済みタイトル: {title_ja}
概要: {summary}
ソース: {source}
カテゴリ: {category}

## 出力
投稿文のみを出力してください。`

export function formatTranslatePrompt(text: string): string {
  return TRANSLATE_PROMPT.replace('{text}', text)
}

export function formatPostGenerationPrompt(params: {
  title: string
  title_ja: string
  summary: string
  source: string
  category: string
}): string {
  return POST_GENERATION_PROMPT
    .replace('{title}', params.title)
    .replace('{title_ja}', params.title_ja)
    .replace('{summary}', params.summary || 'なし')
    .replace('{source}', params.source)
    .replace('{category}', params.category)
}
