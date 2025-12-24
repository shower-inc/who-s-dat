'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  content: string
  className?: string
}

// URLからYouTube video IDを抽出
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// URLからSpotify IDとタイプを抽出
function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|artist|playlist|episode)\/([a-zA-Z0-9]+)/)
  if (match) {
    return { type: match[1], id: match[2] }
  }
  return null
}

// HTMLコンテンツ内のプレーンなURLを埋め込みに変換
function processEmbeds(container: HTMLElement) {
  // すべてのリンクを取得
  const links = container.querySelectorAll('a[href]')

  links.forEach((link) => {
    const anchor = link as HTMLAnchorElement
    const url = anchor.href
    const text = anchor.textContent || ''

    // リンクテキストがURL自体の場合のみ変換（説明テキストがある場合は変換しない）
    const isPlainUrl = text.includes('youtube.com') ||
                       text.includes('youtu.be') ||
                       text.includes('spotify.com') ||
                       text.includes('soundcloud.com') ||
                       text.includes('bandcamp.com') ||
                       text.includes('tiktok.com')

    if (!isPlainUrl) return

    // YouTube
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) {
      const wrapper = document.createElement('div')
      wrapper.className = 'my-6 aspect-video rounded-lg overflow-hidden'
      wrapper.innerHTML = `<iframe
        src="https://www.youtube.com/embed/${youtubeId}"
        title="YouTube video"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="w-full h-full"
      ></iframe>`

      // 親要素がpタグの場合は置換、それ以外は前に挿入
      const parent = anchor.parentElement
      if (parent?.tagName === 'P') {
        parent.replaceWith(wrapper)
      } else {
        anchor.replaceWith(wrapper)
      }
      return
    }

    // Spotify
    const spotifyInfo = extractSpotifyInfo(url)
    if (spotifyInfo) {
      const wrapper = document.createElement('div')
      wrapper.className = 'my-6'
      const height = spotifyInfo.type === 'track' ? '152' : '352'
      wrapper.innerHTML = `<iframe
        src="https://open.spotify.com/embed/${spotifyInfo.type}/${spotifyInfo.id}?utm_source=generator&theme=0"
        width="100%"
        height="${height}"
        frameBorder="0"
        allowfullscreen=""
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style="border-radius: 12px;"
      ></iframe>`

      const parent = anchor.parentElement
      if (parent?.tagName === 'P') {
        parent.replaceWith(wrapper)
      } else {
        anchor.replaceWith(wrapper)
      }
      return
    }
  })
}

export function ArticleContent({ content, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [processedContent, setProcessedContent] = useState(content)

  useEffect(() => {
    if (containerRef.current) {
      // DOMが更新された後に埋め込み処理を実行
      const timer = setTimeout(() => {
        if (containerRef.current) {
          processEmbeds(containerRef.current)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}
