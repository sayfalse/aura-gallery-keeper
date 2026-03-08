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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: string | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      album_photos: {
        Row: {
          added_at: string
          album_id: string
          id: string
          photo_id: string
          sort_order: number
        }
        Insert: {
          added_at?: string
          album_id: string
          id?: string
          photo_id: string
          sort_order?: number
        }
        Update: {
          added_at?: string
          album_id?: string
          id?: string
          photo_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          cover_photo_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_photo_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_photo_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author: string | null
          content: string
          created_at: string
          id: string
          telegram_message_id: number | null
          title: string | null
          type: string | null
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string
          id?: string
          telegram_message_id?: number | null
          title?: string | null
          type?: string | null
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string
          id?: string
          telegram_message_id?: number | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      browser_bookmarks: {
        Row: {
          created_at: string | null
          favicon_url: string | null
          folder: string | null
          id: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favicon_url?: string | null
          folder?: string | null
          id?: string
          title?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          favicon_url?: string | null
          folder?: string | null
          id?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      browser_downloads: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          status: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      browser_history: {
        Row: {
          favicon_url: string | null
          id: string
          title: string | null
          url: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          favicon_url?: string | null
          id?: string
          title?: string | null
          url: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          favicon_url?: string | null
          id?: string
          title?: string | null
          url?: string
          user_id?: string
          visited_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          avatar_color: string | null
          company: string | null
          created_at: string
          email: string | null
          favorite: boolean
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_color?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          favorite?: boolean
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_color?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          favorite?: boolean
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      drive_files: {
        Row: {
          created_at: string
          folder: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string
          reply_to: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          reply_to?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          reply_to?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      music_favorites: {
        Row: {
          album_name: string | null
          artist_name: string
          created_at: string
          duration: number | null
          id: string
          image_url: string | null
          song_id: string
          song_name: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_name?: string
          created_at?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          song_id: string
          song_name: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_name?: string
          created_at?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          song_id?: string
          song_name?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_history: {
        Row: {
          album_name: string | null
          artist_name: string
          duration: number | null
          id: string
          image_url: string | null
          played_at: string
          song_id: string
          song_name: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_name?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          played_at?: string
          song_id: string
          song_name: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_name?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          played_at?: string
          song_id?: string
          song_name?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      music_playlist_songs: {
        Row: {
          added_at: string
          album_name: string | null
          artist_name: string
          duration: number | null
          id: string
          image_url: string | null
          playlist_id: string
          song_id: string
          song_name: string
          sort_order: number | null
          source_url: string | null
        }
        Insert: {
          added_at?: string
          album_name?: string | null
          artist_name?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          playlist_id: string
          song_id: string
          song_name: string
          sort_order?: number | null
          source_url?: string | null
        }
        Update: {
          added_at?: string
          album_name?: string | null
          artist_name?: string
          duration?: number | null
          id?: string
          image_url?: string | null
          playlist_id?: string
          song_id?: string
          song_name?: string
          sort_order?: number | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          folder: string | null
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          album: string | null
          created_at: string
          deleted: boolean
          favorite: boolean
          id: string
          name: string
          size: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album?: string | null
          created_at?: string
          deleted?: boolean
          favorite?: boolean
          id?: string
          name: string
          size?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album?: string | null
          created_at?: string
          deleted?: boolean
          favorite?: boolean
          id?: string
          name?: string
          size?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pixel_ai_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pixel_ai_memories: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          memory_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          memory_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          memory_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id: string
          item_type: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_items: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          saved_by_recipient: boolean
          shared_by: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          saved_by_recipient?: boolean
          shared_by: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          saved_by_recipient?: boolean
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "sharing_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_connections: {
        Row: {
          auto_save: boolean
          auto_share: boolean
          connected_user_id: string
          created_at: string
          id: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_save?: boolean
          auto_share?: boolean
          connected_user_id: string
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_save?: boolean
          auto_share?: boolean
          connected_user_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_quotas: {
        Row: {
          created_at: string
          id: string
          quota_bytes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quota_bytes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quota_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_share_link_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_album: {
        Args: { _album_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
