export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Content type for articles (コンテンツ種別)
export type ContentType = 'mv' | 'news' | 'interview' | 'live' | 'feature' | 'tune'

// Content type labels in Japanese
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  mv: 'MV',
  news: 'ニュース',
  interview: 'インタビュー',
  live: 'ライブ',
  feature: '特集',
  tune: 'TUNE',
}

// Content type icons (emoji)
export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  mv: '🎬',
  news: '📰',
  interview: '🎤',
  live: '🎪',
  feature: '📝',
  tune: '🎵',
}

// Content type list for iteration
export const CONTENT_TYPES: ContentType[] = [
  'mv',
  'news',
  'interview',
  'live',
  'feature',
  'tune',
]

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string
          name: string
          type: 'rss' | 'youtube'
          url: string
          category: string
          enabled: boolean
          thumbnail_url: string | null
          last_fetched_at: string | null
          fetch_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'rss' | 'youtube'
          url: string
          category: string
          enabled?: boolean
          thumbnail_url?: string | null
          last_fetched_at?: string | null
          fetch_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'rss' | 'youtube'
          url?: string
          category?: string
          enabled?: boolean
          thumbnail_url?: string | null
          last_fetched_at?: string | null
          fetch_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          source_id: string | null
          external_id: string | null
          title_original: string
          title_ja: string | null
          summary_original: string | null
          summary_ja: string | null
          link: string
          thumbnail_url: string | null
          author: string | null
          published_at: string | null
          fetched_at: string
          status: 'pending' | 'translating' | 'translated' | 'generating' | 'ready' | 'published' | 'scheduled' | 'posted' | 'skipped' | 'error'
          content_type: ContentType
          view_count: number | null
          like_count: number | null
          artist_id: string | null
          editor_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          title_original: string
          title_ja?: string | null
          summary_original?: string | null
          summary_ja?: string | null
          link: string
          thumbnail_url?: string | null
          author?: string | null
          published_at?: string | null
          fetched_at?: string
          status?: 'pending' | 'translating' | 'translated' | 'generating' | 'ready' | 'published' | 'scheduled' | 'posted' | 'skipped' | 'error'
          content_type?: ContentType
          view_count?: number | null
          like_count?: number | null
          artist_id?: string | null
          editor_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          external_id?: string | null
          title_original?: string
          title_ja?: string | null
          summary_original?: string | null
          summary_ja?: string | null
          link?: string
          thumbnail_url?: string | null
          author?: string | null
          published_at?: string | null
          fetched_at?: string
          status?: 'pending' | 'translating' | 'translated' | 'generating' | 'ready' | 'published' | 'scheduled' | 'posted' | 'skipped' | 'error'
          content_type?: ContentType
          view_count?: number | null
          like_count?: number | null
          artist_id?: string | null
          editor_note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          article_id: string | null
          content: string
          content_style: string
          llm_model: string | null
          llm_prompt_version: string | null
          platform: 'x' | 'note' | 'threads'
          buffer_update_id: string | null
          scheduled_at: string | null
          posted_at: string | null
          status: 'draft' | 'ready' | 'scheduled' | 'posted' | 'failed' | 'cancelled'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id?: string | null
          content: string
          content_style?: string
          llm_model?: string | null
          llm_prompt_version?: string | null
          platform?: 'x' | 'note' | 'threads'
          buffer_update_id?: string | null
          scheduled_at?: string | null
          posted_at?: string | null
          status?: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string | null
          content?: string
          content_style?: string
          llm_model?: string | null
          llm_prompt_version?: string | null
          platform?: 'x' | 'note' | 'threads'
          buffer_update_id?: string | null
          scheduled_at?: string | null
          posted_at?: string | null
          status?: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fetch_logs: {
        Row: {
          id: string
          source_id: string | null
          status: 'success' | 'error'
          articles_count: number
          error_message: string | null
          executed_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          status: 'success' | 'error'
          articles_count?: number
          error_message?: string | null
          executed_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          status?: 'success' | 'error'
          articles_count?: number
          error_message?: string | null
          executed_at?: string
        }
      }
      settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
      }
      artists: {
        Row: {
          id: string
          name: string
          name_ja: string | null
          origin: string | null
          genre: string | null
          description: string | null
          search_source: string | null
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ja?: string | null
          origin?: string | null
          genre?: string | null
          description?: string | null
          search_source?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ja?: string | null
          origin?: string | null
          genre?: string | null
          description?: string | null
          search_source?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          color: string
          description: string | null
          article_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          color?: string
          description?: string | null
          article_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          color?: string
          description?: string | null
          article_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          article_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          article_id?: string
          tag_id?: string
          created_at?: string
        }
      }
    }
  }
}

export type Source = Database['public']['Tables']['sources']['Row']
export type Article = Database['public']['Tables']['articles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type FetchLog = Database['public']['Tables']['fetch_logs']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type Artist = Database['public']['Tables']['artists']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type ArticleTag = Database['public']['Tables']['article_tags']['Row']

// Article with tags for display
export type ArticleWithTags = Article & {
  tags?: Tag[]
}
