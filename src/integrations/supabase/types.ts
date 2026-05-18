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
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      astro_charts: {
        Row: {
          ascendant: number | null
          aspects: Json
          birth_data_id: string | null
          created_at: string
          engine: string
          houses: Json
          id: string
          midheaven: number | null
          planets: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          ascendant?: number | null
          aspects?: Json
          birth_data_id?: string | null
          created_at?: string
          engine?: string
          houses?: Json
          id?: string
          midheaven?: number | null
          planets?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          ascendant?: number | null
          aspects?: Json
          birth_data_id?: string | null
          created_at?: string
          engine?: string
          houses?: Json
          id?: string
          midheaven?: number | null
          planets?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "astro_charts_birth_data_id_fkey"
            columns: ["birth_data_id"]
            isOneToOne: false
            referencedRelation: "birth_data"
            referencedColumns: ["id"]
          },
        ]
      }
      birth_data: {
        Row: {
          birth_date: string
          birth_time: string | null
          city: string
          country: string | null
          created_at: string
          full_name: string
          id: string
          is_primary: boolean
          latitude: number | null
          longitude: number | null
          time_unknown: boolean
          timezone: string | null
          user_id: string
        }
        Insert: {
          birth_date: string
          birth_time?: string | null
          city: string
          country?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          time_unknown?: boolean
          timezone?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string
          birth_time?: string | null
          city?: string
          country?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          time_unknown?: boolean
          timezone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_favorites: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mercado_pago_settings: {
        Row: {
          access_token: string | null
          enabled: boolean
          environment: string
          id: boolean
          public_key: string | null
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          enabled?: boolean
          environment?: string
          id?: boolean
          public_key?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          enabled?: boolean
          environment?: string
          id?: boolean
          public_key?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          date: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          date: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          phone_e164: string | null
          timezone: string
          trigger_favorites: boolean
          trigger_masters: boolean
          trigger_moon: boolean
          trigger_peak: boolean
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          phone_e164?: string | null
          timezone?: string
          trigger_favorites?: boolean
          trigger_masters?: boolean
          trigger_moon?: boolean
          trigger_peak?: boolean
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          phone_e164?: string | null
          timezone?: string
          trigger_favorites?: boolean
          trigger_masters?: boolean
          trigger_moon?: boolean
          trigger_peak?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      numerology_reports: {
        Row: {
          birth_date: string
          birthday: number | null
          created_at: string
          destiny: number | null
          details: Json | null
          expression: number | null
          full_name: string
          id: string
          life_path: number | null
          personality: number | null
          soul_urge: number | null
          user_id: string
        }
        Insert: {
          birth_date: string
          birthday?: number | null
          created_at?: string
          destiny?: number | null
          details?: Json | null
          expression?: number | null
          full_name: string
          id?: string
          life_path?: number | null
          personality?: number | null
          soul_urge?: number | null
          user_id: string
        }
        Update: {
          birth_date?: string
          birthday?: number | null
          created_at?: string
          destiny?: number | null
          details?: Json | null
          expression?: number | null
          full_name?: string
          id?: string
          life_path?: number | null
          personality?: number | null
          soul_urge?: number | null
          user_id?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          init_point: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          product_id: string
          product_kind: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          product_id: string
          product_kind: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          product_id?: string
          product_kind?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_branding: {
        Row: {
          created_at: string
          display_name: string | null
          enabled: boolean
          enabled_career: boolean
          enabled_love: boolean
          enabled_personality: boolean
          enabled_spiritual: boolean
          footer_enabled: boolean
          footer_name: string | null
          footer_phone: string | null
          footer_site: string | null
          logo_height: number
          logo_path: string | null
          logo_width: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          enabled_career?: boolean
          enabled_love?: boolean
          enabled_personality?: boolean
          enabled_spiritual?: boolean
          footer_enabled?: boolean
          footer_name?: string | null
          footer_phone?: string | null
          footer_site?: string | null
          logo_height?: number
          logo_path?: string | null
          logo_width?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          enabled_career?: boolean
          enabled_love?: boolean
          enabled_personality?: boolean
          enabled_spiritual?: boolean
          footer_enabled?: boolean
          footer_name?: string | null
          footer_phone?: string | null
          footer_site?: string | null
          logo_height?: number
          logo_path?: string | null
          logo_width?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_model: string | null
          created_at: string
          id: string
          kind: string
          storage_path: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          id?: string
          kind: string
          storage_path: string
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          id?: string
          kind?: string
          storage_path?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      twilio_settings: {
        Row: {
          account_sid: string | null
          auth_token: string | null
          enabled: boolean
          id: boolean
          messaging_service_sid: string | null
          sms_from: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_from: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token?: string | null
          enabled?: boolean
          id?: boolean
          messaging_service_sid?: string | null
          sms_from?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_from?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token?: string | null
          enabled?: boolean
          id?: boolean
          messaging_service_sid?: string | null
          sms_from?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_from?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_provider: string
          astrology_api_key: string | null
          astrology_api_user_id: string | null
          custom_ai_key: string | null
          custom_ai_model: string | null
          language: string
          preferred_engine: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider?: string
          astrology_api_key?: string | null
          astrology_api_user_id?: string | null
          custom_ai_key?: string | null
          custom_ai_model?: string | null
          language?: string
          preferred_engine?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider?: string
          astrology_api_key?: string | null
          astrology_api_user_id?: string | null
          custom_ai_key?: string | null
          custom_ai_model?: string | null
          language?: string
          preferred_engine?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          addon_id: string
          created_at: string
          current_period_end: string | null
          id: string
          mp_preapproval_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          mp_preapproval_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_credits: {
        Args: {
          _amount: number
          _kind: string
          _reference?: string
          _user_id: string
        }
        Returns: number
      }
      consume_credits: {
        Args: {
          _amount: number
          _kind: string
          _reference?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
