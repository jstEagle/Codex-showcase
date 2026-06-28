export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          author: string
          maker: string
          category: string
          status: 'featured' | 'popular' | 'new' | 'review'
          body: Array<string>
          stack: Array<string>
          links: Json
          codex_history: Json
          artifact: Json
          cover_url: string | null
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description: string
          author: string
          maker: string
          category?: string
          status?: 'featured' | 'popular' | 'new' | 'review'
          body?: Array<string>
          stack?: Array<string>
          links?: Json
          codex_history?: Json
          artifact?: Json
          cover_url?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string
          author?: string
          maker?: string
          category?: string
          status?: 'featured' | 'popular' | 'new' | 'review'
          body?: Array<string>
          stack?: Array<string>
          links?: Json
          codex_history?: Json
          artifact?: Json
          cover_url?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          id: string
          artifact: Json
          submitter_name: string | null
          submitter_contact: string | null
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          artifact: Json
          submitter_name?: string | null
          submitter_contact?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          artifact?: Json
          submitter_name?: string | null
          submitter_contact?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
