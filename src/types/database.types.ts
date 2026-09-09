export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          place_id: string
          tag_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          place_id: string
          tag_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          place_id?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_datetime: string | null
          id: string
          place_id: string
          price: string | null
          recurrence_rule: string | null
          start_datetime: string
          tag_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          id?: string
          place_id: string
          price?: string | null
          recurrence_rule?: string | null
          start_datetime: string
          tag_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          id?: string
          place_id?: string
          price?: string | null
          recurrence_rule?: string | null
          start_datetime?: string
          tag_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_hours: {
        Row: {
          close_time: string
          day_of_week: number
          id: string
          open_time: string
          place_id: string
        }
        Insert: {
          close_time: string
          day_of_week: number
          id?: string
          open_time: string
          place_id: string
        }
        Update: {
          close_time?: string
          day_of_week?: number
          id?: string
          open_time?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_tags: {
        Row: {
          place_id: string
          tag_id: string
        }
        Insert: {
          place_id: string
          tag_id: string
        }
        Update: {
          place_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_tags_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          cover_photo_url: string | null
          created_at: string
          description: string | null
          id: string
          lat: number
          lng: number
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_all: {
        Args: { search_query: string }
        Returns: {
          cover_photo_url: string
          id: string
          lat: number
          lng: number
          place_id: string
          result_type: string
          similarity: number
          subtitle: string
          title: string
        }[]
      }
      search_tags: {
        Args: { search_query: string }
        Returns: {
          id: string
          label: string
          similarity: number
          slug: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]
