// SNSリンクカード生成ユーティリティ

export interface SocialCardData {
  platform: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'spotify'
  username: string
  url: string
  displayName?: string
}

// URLからSNS情報を抽出
export function parseSocialUrl(url: string): SocialCardData | null {
  // Instagram
  const instagramMatch = url.match(/instagram\.com\/([^/?]+)/)
  if (instagramMatch && !url.includes('/p/') && !url.includes('/reel/')) {
    return {
      platform: 'instagram',
      username: instagramMatch[1],
      url: `https://www.instagram.com/${instagramMatch[1]}/`,
    }
  }

  // Twitter/X
  const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^/?]+)/)
  if (twitterMatch && !['intent', 'share', 'search', 'hashtag'].includes(twitterMatch[1])) {
    return {
      platform: 'twitter',
      username: twitterMatch[1],
      url: `https://x.com/${twitterMatch[1]}`,
    }
  }

  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/@([^/?]+)/)
  if (tiktokMatch) {
    return {
      platform: 'tiktok',
      username: tiktokMatch[1],
      url: `https://www.tiktok.com/@${tiktokMatch[1]}`,
    }
  }

  // YouTube Channel
  const youtubeChannelMatch = url.match(/youtube\.com\/(?:@|channel\/|c\/)([^/?]+)/)
  if (youtubeChannelMatch) {
    const username = youtubeChannelMatch[1]
    const prefix = url.includes('/channel/') ? 'channel/' : url.includes('/c/') ? 'c/' : '@'
    return {
      platform: 'youtube',
      username: username.replace('@', ''),
      url: `https://www.youtube.com/${prefix}${username}`,
    }
  }

  // Spotify Artist
  const spotifyMatch = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/)
  if (spotifyMatch) {
    return {
      platform: 'spotify',
      username: spotifyMatch[1], // Artist ID
      url: url,
    }
  }

  return null
}

// プラットフォーム情報
const platformInfo = {
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  },
  twitter: {
    name: 'X',
    color: '#000000',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>`,
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
  },
}

// SNSリンクカードのHTMLを生成
export function generateSocialCardHtml(data: SocialCardData): string {
  const info = platformInfo[data.platform]
  const displayName = data.displayName || `@${data.username}`

  return `<div class="social-card" data-platform="${data.platform}" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #1e3a5f 0%, #152238 100%); border-radius: 12px; border: 1px solid rgba(184, 122, 255, 0.2); margin: 16px 0; text-decoration: none;">
  <a href="${data.url}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px; text-decoration: none; width: 100%;">
    <div style="width: 48px; height: 48px; background: ${info.color}; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <span style="width: 24px; height: 24px; color: white;">${info.icon}</span>
    </div>
    <div style="flex: 1; min-width: 0;">
      <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">${info.name}</div>
      <div style="font-size: 16px; font-weight: 600; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</div>
    </div>
    <svg style="width: 20px; height: 20px; color: #9ca3af; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
    </svg>
  </a>
</div>`
}

// アーティストリンクセクションのHTMLを生成
export interface ArtistLinks {
  artistName: string
  spotify?: string
  youtube?: string
  instagram?: string
  twitter?: string
  tiktok?: string
}

export function generateArtistLinksHtml(links: ArtistLinks): string {
  const cards: string[] = []

  // Spotifyリンク
  if (links.spotify) {
    cards.push(generateSocialCardHtml({
      platform: 'spotify',
      username: links.artistName,
      url: links.spotify,
      displayName: links.artistName,
    }))
  }

  // YouTubeチャンネル
  if (links.youtube) {
    cards.push(generateSocialCardHtml({
      platform: 'youtube',
      username: links.artistName,
      url: links.youtube,
      displayName: links.artistName,
    }))
  }

  // Instagram
  if (links.instagram) {
    const parsed = parseSocialUrl(links.instagram)
    if (parsed) {
      parsed.displayName = links.artistName
      cards.push(generateSocialCardHtml(parsed))
    }
  }

  // Twitter/X
  if (links.twitter) {
    const parsed = parseSocialUrl(links.twitter)
    if (parsed) {
      parsed.displayName = links.artistName
      cards.push(generateSocialCardHtml(parsed))
    }
  }

  // TikTok
  if (links.tiktok) {
    const parsed = parseSocialUrl(links.tiktok)
    if (parsed) {
      parsed.displayName = links.artistName
      cards.push(generateSocialCardHtml(parsed))
    }
  }

  if (cards.length === 0) return ''

  return `
<div style="margin-top: 32px;">
  <h3 style="font-size: 18px; font-weight: 600; color: #b87aff; margin-bottom: 16px;">Follow ${links.artistName}</h3>
  ${cards.join('\n')}
</div>`
}
