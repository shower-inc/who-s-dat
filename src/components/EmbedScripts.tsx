'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

type Props = {
  content: string
}

export function EmbedScripts({ content }: Props) {
  const [hasTikTok, setHasTikTok] = useState(false)
  const [hasInstagram, setHasInstagram] = useState(false)

  useEffect(() => {
    // コンテンツ内のembedを検出
    setHasTikTok(content.includes('tiktok-embed') || content.includes('tiktok.com'))
    setHasInstagram(content.includes('instagram-media') || content.includes('instagram.com/embed'))
  }, [content])

  return (
    <>
      {hasTikTok && (
        <Script
          src="https://www.tiktok.com/embed.js"
          strategy="lazyOnload"
          onLoad={() => {
            // TikTok embeds need to be processed after script loads
            if (typeof window !== 'undefined' && (window as unknown as { tiktokEmbed?: { init: () => void } }).tiktokEmbed) {
              (window as unknown as { tiktokEmbed: { init: () => void } }).tiktokEmbed.init()
            }
          }}
        />
      )}
      {hasInstagram && (
        <Script
          src="https://www.instagram.com/embed.js"
          strategy="lazyOnload"
          onLoad={() => {
            // Instagram embeds need to be processed after script loads
            if (typeof window !== 'undefined' && (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm) {
              (window as unknown as { instgrm: { Embeds: { process: () => void } } }).instgrm.Embeds.process()
            }
          }}
        />
      )}
    </>
  )
}
