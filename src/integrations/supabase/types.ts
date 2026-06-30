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
      addon_settings: {
        Row: {
          addon_id: string
          description: string | null
          enabled: boolean
          features: Json
          name: string | null
          price_cents: number | null
          prompt: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          addon_id: string
          description?: string | null
          enabled?: boolean
          features?: Json
          name?: string | null
          price_cents?: number | null
          prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          addon_id?: string
          description?: string | null
          enabled?: boolean
          features?: Json
          name?: string | null
          price_cents?: number | null
          prompt?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
          client_profile_id: string | null
          created_at: string
          engine: string
          forecast: Json | null
          forecast_generated_at: string | null
          houses: Json
          id: string
          midheaven: number | null
          planets: Json
          storage_path: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          ascendant?: number | null
          aspects?: Json
          birth_data_id?: string | null
          client_profile_id?: string | null
          created_at?: string
          engine?: string
          forecast?: Json | null
          forecast_generated_at?: string | null
          houses?: Json
          id?: string
          midheaven?: number | null
          planets?: Json
          storage_path?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          ascendant?: number | null
          aspects?: Json
          birth_data_id?: string | null
          client_profile_id?: string | null
          created_at?: string
          engine?: string
          forecast?: Json | null
          forecast_generated_at?: string | null
          houses?: Json
          id?: string
          midheaven?: number | null
          planets?: Json
          storage_path?: string | null
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
          {
            foreignKeyName: "astro_charts_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
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
      client_profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string
          birth_time: string | null
          city: string
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string | null
          tags: string[]
          time_unknown: boolean
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          birth_time?: string | null
          city: string
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          time_unknown?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          birth_time?: string | null
          city?: string
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          time_unknown?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_costs: {
        Row: {
          action: string
          amount: number
          description: string | null
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          amount: number
          description?: string | null
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          amount?: number
          description?: string | null
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          id: string
          kind: string
          reference: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          kind: string
          reference?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          kind?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_followup_settings: {
        Row: {
          body_template: string
          created_at: string
          days_after_last_email: number
          days_after_lead: number
          enabled: boolean
          id: string
          max_followups: number
          subject_template: string
          updated_at: string
        }
        Insert: {
          body_template?: string
          created_at?: string
          days_after_last_email?: number
          days_after_lead?: number
          enabled?: boolean
          id?: string
          max_followups?: number
          subject_template?: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          days_after_last_email?: number
          days_after_lead?: number
          enabled?: boolean
          id?: string
          max_followups?: number
          subject_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          converted_order_id: string | null
          converted_user_id: string | null
          created_at: string
          customer_data: Json
          email: string
          followup_count: number
          followup_paused: boolean
          full_name: string | null
          id: string
          landing_id: string | null
          landing_slug: string | null
          last_contact_at: string | null
          last_followup_at: string | null
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          converted_order_id?: string | null
          converted_user_id?: string | null
          created_at?: string
          customer_data?: Json
          email: string
          followup_count?: number
          followup_paused?: boolean
          full_name?: string | null
          id?: string
          landing_id?: string | null
          landing_slug?: string | null
          last_contact_at?: string | null
          last_followup_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          converted_order_id?: string | null
          converted_user_id?: string | null
          created_at?: string
          customer_data?: Json
          email?: string
          followup_count?: number
          followup_paused?: boolean
          full_name?: string | null
          id?: string
          landing_id?: string | null
          landing_slug?: string | null
          last_contact_at?: string | null
          last_followup_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      evolution_settings: {
        Row: {
          base_url: string | null
          enabled: boolean
          global_api_key: string | null
          id: boolean
          instance_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_url?: string | null
          enabled?: boolean
          global_api_key?: string | null
          id?: boolean
          instance_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_url?: string | null
          enabled?: boolean
          global_api_key?: string | null
          id?: boolean
          instance_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      horoscope_log: {
        Row: {
          channel: string
          created_at: string
          date: string
          detail: string | null
          id: string
          sign: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          date: string
          detail?: string | null
          id?: string
          sign?: string | null
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          date?: string
          detail?: string | null
          id?: string
          sign?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      horoscope_subscriptions: {
        Row: {
          channel_email: boolean
          channel_whatsapp: boolean
          client_profile_id: string | null
          created_at: string
          email: string | null
          enabled: boolean
          frequency: string
          id: string
          last_sent_on: string | null
          phone_e164: string | null
          send_hour_utc: number
          send_local_hour: number
          send_weekday: number | null
          sun_sign: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_whatsapp?: boolean
          client_profile_id?: string | null
          created_at?: string
          email?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_on?: string | null
          phone_e164?: string | null
          send_hour_utc?: number
          send_local_hour?: number
          send_weekday?: number | null
          sun_sign?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_whatsapp?: boolean
          client_profile_id?: string | null
          created_at?: string
          email?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_on?: string | null
          phone_e164?: string | null
          send_hour_utc?: number
          send_local_hour?: number
          send_weekday?: number | null
          sun_sign?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horoscope_subscriptions_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kabbalah_meditations: {
        Row: {
          ai_model: string | null
          client_profile_id: string | null
          created_at: string
          duration_min: number
          id: string
          intention: string | null
          script: string
          sefirah: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          client_profile_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          intention?: string | null
          script: string
          sefirah: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          client_profile_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          intention?: string | null
          script?: string
          sefirah?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kabbalah_meditations_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_packages: {
        Row: {
          anchor: string | null
          created_at: string
          credits_per_month: number
          cta_label: string
          enabled: boolean
          featured: boolean
          features: Json
          id: string
          included_addons: Json
          name: string
          price_cents: number
          price_label: string | null
          slug: string
          sort_order: number
          sub_label: string
          updated_at: string
        }
        Insert: {
          anchor?: string | null
          created_at?: string
          credits_per_month?: number
          cta_label?: string
          enabled?: boolean
          featured?: boolean
          features?: Json
          id?: string
          included_addons?: Json
          name: string
          price_cents?: number
          price_label?: string | null
          slug: string
          sort_order?: number
          sub_label?: string
          updated_at?: string
        }
        Update: {
          anchor?: string | null
          created_at?: string
          credits_per_month?: number
          cta_label?: string
          enabled?: boolean
          featured?: boolean
          features?: Json
          id?: string
          included_addons?: Json
          name?: string
          price_cents?: number
          price_label?: string | null
          slug?: string
          sort_order?: number
          sub_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_messages: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          id: string
          services: string[]
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          body: string
          created_at?: string
          enabled?: boolean
          id?: string
          services?: string[]
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          id?: string
          services?: string[]
          title?: string
          updated_at?: string
          weight?: number
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
          client_profile_id: string | null
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
          client_profile_id?: string | null
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
          client_profile_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "numerology_reports_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          body_font_size: number
          body_text_color: string
          cover_accent_color: string
          cover_bg_color: string
          cover_image_path: string | null
          cover_title_position: string
          created_at: string
          display_name: string | null
          enabled: boolean
          enabled_astrology: boolean
          enabled_career: boolean
          enabled_energy_calendar: boolean
          enabled_kabbalah: boolean
          enabled_kabbalah_numerology: boolean
          enabled_love: boolean
          enabled_numerology: boolean
          enabled_personality: boolean
          enabled_spiritual: boolean
          enabled_tarot: boolean
          enabled_weekly: boolean
          font_family: string
          footer_bg_color: string
          footer_enabled: boolean
          footer_name: string | null
          footer_phone: string | null
          footer_site: string | null
          frame_style: string
          header_bg_color: string
          header_text_color: string
          heading_text_color: string
          line_height: number
          logo_height: number
          logo_path: string | null
          logo_width: number
          page_bg_color: string
          page_bg_image_path: string | null
          page_margin: number
          updated_at: string
          user_id: string
          watermark_image_path: string | null
          watermark_opacity: number
        }
        Insert: {
          body_font_size?: number
          body_text_color?: string
          cover_accent_color?: string
          cover_bg_color?: string
          cover_image_path?: string | null
          cover_title_position?: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          enabled_astrology?: boolean
          enabled_career?: boolean
          enabled_energy_calendar?: boolean
          enabled_kabbalah?: boolean
          enabled_kabbalah_numerology?: boolean
          enabled_love?: boolean
          enabled_numerology?: boolean
          enabled_personality?: boolean
          enabled_spiritual?: boolean
          enabled_tarot?: boolean
          enabled_weekly?: boolean
          font_family?: string
          footer_bg_color?: string
          footer_enabled?: boolean
          footer_name?: string | null
          footer_phone?: string | null
          footer_site?: string | null
          frame_style?: string
          header_bg_color?: string
          header_text_color?: string
          heading_text_color?: string
          line_height?: number
          logo_height?: number
          logo_path?: string | null
          logo_width?: number
          page_bg_color?: string
          page_bg_image_path?: string | null
          page_margin?: number
          updated_at?: string
          user_id: string
          watermark_image_path?: string | null
          watermark_opacity?: number
        }
        Update: {
          body_font_size?: number
          body_text_color?: string
          cover_accent_color?: string
          cover_bg_color?: string
          cover_image_path?: string | null
          cover_title_position?: string
          created_at?: string
          display_name?: string | null
          enabled?: boolean
          enabled_astrology?: boolean
          enabled_career?: boolean
          enabled_energy_calendar?: boolean
          enabled_kabbalah?: boolean
          enabled_kabbalah_numerology?: boolean
          enabled_love?: boolean
          enabled_numerology?: boolean
          enabled_personality?: boolean
          enabled_spiritual?: boolean
          enabled_tarot?: boolean
          enabled_weekly?: boolean
          font_family?: string
          footer_bg_color?: string
          footer_enabled?: boolean
          footer_name?: string | null
          footer_phone?: string | null
          footer_site?: string | null
          frame_style?: string
          header_bg_color?: string
          header_text_color?: string
          heading_text_color?: string
          line_height?: number
          logo_height?: number
          logo_path?: string | null
          logo_width?: number
          page_bg_color?: string
          page_bg_image_path?: string | null
          page_margin?: number
          updated_at?: string
          user_id?: string
          watermark_image_path?: string | null
          watermark_opacity?: number
        }
        Relationships: []
      }
      pending_plan_selections: {
        Row: {
          created_at: string
          email: string
          id: string
          plan_slug: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          plan_slug: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          plan_slug?: string
        }
        Relationships: []
      }
      product_dispatch_settings: {
        Row: {
          auto_enabled: boolean
          delay_minutes: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_enabled?: boolean
          delay_minutes?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_enabled?: boolean
          delay_minutes?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      product_landings: {
        Row: {
          active: boolean
          benefits: Json
          created_at: string
          created_by: string | null
          cta_text: string
          delivery_email_subject: string | null
          delivery_email_template: string | null
          delivery_whatsapp_template: string | null
          description: string | null
          hero_image_url: string | null
          id: string
          price_cents: number
          report_type: string
          required_fields: Json
          seo_description: string | null
          seo_title: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefits?: Json
          created_at?: string
          created_by?: string | null
          cta_text?: string
          delivery_email_subject?: string | null
          delivery_email_template?: string | null
          delivery_whatsapp_template?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          price_cents: number
          report_type: string
          required_fields?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefits?: Json
          created_at?: string
          created_by?: string | null
          cta_text?: string
          delivery_email_subject?: string | null
          delivery_email_template?: string | null
          delivery_whatsapp_template?: string | null
          description?: string | null
          hero_image_url?: string | null
          id?: string
          price_cents?: number
          report_type?: string
          required_fields?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_orders: {
        Row: {
          access_token: string
          amount_cents: number
          created_at: string
          customer_data: Json
          delivered_at: string | null
          dispatch_attempts: number
          email_sent_at: string | null
          error_message: string | null
          guest_email: string | null
          id: string
          landing_id: string
          lead_id: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          report_id: string | null
          status: string
          updated_at: string
          user_id: string | null
          viewed_by_admin: boolean
        }
        Insert: {
          access_token?: string
          amount_cents: number
          created_at?: string
          customer_data?: Json
          delivered_at?: string | null
          dispatch_attempts?: number
          email_sent_at?: string | null
          error_message?: string | null
          guest_email?: string | null
          id?: string
          landing_id: string
          lead_id?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          viewed_by_admin?: boolean
        }
        Update: {
          access_token?: string
          amount_cents?: number
          created_at?: string
          customer_data?: Json
          delivered_at?: string | null
          dispatch_attempts?: number
          email_sent_at?: string | null
          error_message?: string | null
          guest_email?: string | null
          id?: string
          landing_id?: string
          lead_id?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          report_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          viewed_by_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "product_landings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_client_profile_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_client_profile_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_client_profile_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_client_profile_id_fkey"
            columns: ["active_client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_settings: {
        Row: {
          background_color: string
          created_at: string
          description: string
          display: string
          enabled: boolean
          icon_512_url: string
          icon_url: string
          id: string
          name: string
          orientation: string
          short_name: string
          start_url: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          description?: string
          display?: string
          enabled?: boolean
          icon_512_url?: string
          icon_url?: string
          id?: string
          name?: string
          orientation?: string
          short_name?: string
          start_url?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          description?: string
          display?: string
          enabled?: boolean
          icon_512_url?: string
          icon_url?: string
          id?: string
          name?: string
          orientation?: string
          short_name?: string
          start_url?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_model: string | null
          client_profile_id: string | null
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
          client_profile_id?: string | null
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
          client_profile_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          storage_path?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      smtp_settings: {
        Row: {
          created_at: string
          enabled: boolean
          from_email: string
          from_name: string
          host: string
          id: string
          password: string
          port: number
          provider: string
          reply_to: string | null
          secure: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          credit_value_cents: number
          id: string
          updated_at: string | null
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          credit_value_cents?: number
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          credit_value_cents?: number
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      tarot_readings: {
        Row: {
          ai_model: string | null
          cards: Json
          client_profile_id: string | null
          created_at: string
          id: string
          interpretation: string
          question: string | null
          spread: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          cards?: Json
          client_profile_id?: string | null
          created_at?: string
          id?: string
          interpretation: string
          question?: string | null
          spread: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          cards?: Json
          client_profile_id?: string | null
          created_at?: string
          id?: string
          interpretation?: string
          question?: string | null
          spread?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarot_readings_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_section_guides: {
        Row: {
          created_at: string
          id: string
          section_key: string
          seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_key: string
          seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_key?: string
          seen_at?: string
          updated_at?: string
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
      admin_cron_status: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          last_http_error: string
          last_http_status: number
          last_return_message: string
          last_run_ended: string
          last_run_started: string
          last_status: string
          schedule: string
        }[]
      }
      admin_run_cron_job_now: {
        Args: { p_jobid: number }
        Returns: {
          return_message: string
          status: string
        }[]
      }
      admin_update_cron_job: {
        Args: {
          p_active?: boolean
          p_command?: string
          p_jobid: number
          p_schedule?: string
        }
        Returns: undefined
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
      count_unviewed_orders: { Args: never; Returns: number }
      get_public_enums: {
        Args: never
        Returns: {
          enum_label: string
          type_name: string
        }[]
      }
      get_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_table_structure: {
        Args: { t_name: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
          is_primary_key: boolean
        }[]
      }
      has_active_addon: {
        Args: { _addon_id: string; _user_id: string }
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
