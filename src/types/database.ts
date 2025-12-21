export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          view_count: number | null
          like_count: number | null
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
          view_count?: number | null
          like_count?: number | null
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
          view_count?: number | null
          like_count?: number | null
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
    }
  }
}

export type Source = Database['public']['Tables']['sources']['Row']
export type Article = Database['public']['Tables']['articles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type FetchLog = Database['public']['Tables']['fetch_logs']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
