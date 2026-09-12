export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          place_id: string
          restrictions: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          place_id: string
          restrictions?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          place_id?: string
          restrictions?: string | null
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
          cover_photo_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_datetime: string | null
          id: string
          place_id: string
          poster_url: string | null
          price: string | null
          qr_code_url: string | null
          recurrence_rule: string | null
          restrictions: string | null
          start_datetime: string
          tag_id: string | null
          title: string
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_datetime?: string | null
          id?: string
          place_id: string
          poster_url?: string | null
          price?: string | null
          qr_code_url?: string | null
          recurrence_rule?: string | null
          restrictions?: string | null
          start_datetime: string
          tag_id?: string | null
          title: string
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_datetime?: string | null
          id?: string
          place_id?: string
          poster_url?: string | null
          price?: string | null
          qr_code_url?: string | null
          recurrence_rule?: string | null
          restrictions?: string | null
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
          zone_name: string | null
        }
        Insert: {
          close_time: string
          day_of_week: number
          id?: string
          open_time: string
          place_id: string
          zone_name?: string | null
        }
        Update: {
          close_time?: string
          day_of_week?: number
          id?: string
          open_time?: string
          place_id?: string
          zone_name?: string | null
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
          facebook_url: string | null
          id: string
          instagram_url: string | null
          lat: number
          lng: number
          name: string
          owner_id: string
          phone: string | null
          photo_urls: string[]
          qr_code_url: string | null
          urgent_message: string | null
          urgent_message_expires_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          lat: number
          lng: number
          name: string
          owner_id: string
          phone?: string | null
          photo_urls?: string[]
          qr_code_url?: string | null
          urgent_message?: string | null
          urgent_message_expires_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          lat?: number
          lng?: number
          name?: string
          owner_id?: string
          phone?: string | null
          photo_urls?: string[]
          qr_code_url?: string | null
          urgent_message?: string | null
          urgent_message_expires_at?: string | null
          website_url?: string | null
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
