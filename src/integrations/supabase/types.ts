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
      affiliate_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_badge_awards: {
        Row: {
          affiliate_id: string
          awarded_at: string
          badge_id: string
          context: Json | null
          id: string
        }
        Insert: {
          affiliate_id: string
          awarded_at?: string
          badge_id: string
          context?: Json | null
          id?: string
        }
        Update: {
          affiliate_id?: string
          awarded_at?: string
          badge_id?: string
          context?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_badge_awards_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "affiliate_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_badges: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          name: string
          points_reward: number
          rarity: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points_reward?: number
          rarity?: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points_reward?: number
          rarity?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          affiliate_id: string
          bank_name: string
          branch: string
          created_at: string
          holder_doc: string
          holder_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type: string
          affiliate_id: string
          bank_name: string
          branch: string
          created_at?: string
          holder_doc: string
          holder_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          affiliate_id?: string
          bank_name?: string
          branch?: string
          created_at?: string
          holder_doc?: string
          holder_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_bank_accounts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          value: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          value: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          value?: Json
        }
        Relationships: []
      }
      affiliate_campaigns: {
        Row: {
          active: boolean
          bonus_cents: number | null
          created_at: string
          description: string | null
          ends_at: string | null
          goal_cents: number | null
          id: string
          metadata: Json
          name: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bonus_cents?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number | null
          id?: string
          metadata?: Json
          name: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bonus_cents?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          goal_cents?: number | null
          id?: string
          metadata?: Json
          name?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_checkout_providers: {
        Row: {
          created_at: string
          credentials: Json
          currency: string
          enabled: boolean
          fee_fixed_cents: number
          fee_percent: number
          id: string
          label: string
          metadata: Json
          provider: string
          sandbox: boolean
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          credentials?: Json
          currency?: string
          enabled?: boolean
          fee_fixed_cents?: number
          fee_percent?: number
          id?: string
          label: string
          metadata?: Json
          provider: string
          sandbox?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          credentials?: Json
          currency?: string
          enabled?: boolean
          fee_fixed_cents?: number
          fee_percent?: number
          id?: string
          label?: string
          metadata?: Json
          provider?: string
          sandbox?: boolean
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      affiliate_checkout_sessions: {
        Row: {
          affiliate_id: string | null
          amount_cents: number
          campaign_id: string | null
          checkout_url: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
          id: string
          metadata: Json
          paid_at: string | null
          product_id: string | null
          provider: string
          provider_ref: string | null
          session_token: string | null
          status: string
          updated_at: string
          utm: Json
        }
        Insert: {
          affiliate_id?: string | null
          amount_cents: number
          campaign_id?: string | null
          checkout_url?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          product_id?: string | null
          provider: string
          provider_ref?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          utm?: Json
        }
        Update: {
          affiliate_id?: string | null
          amount_cents?: number
          campaign_id?: string | null
          checkout_url?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          product_id?: string | null
          provider?: string
          provider_ref?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          utm?: Json
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_checkout_sessions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_checkout_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_checkout_sessions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "affiliate_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_checkout_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          browser: string | null
          city: string | null
          country: string | null
          device: string | null
          id: string
          ip: string | null
          landed_at: string
          landing_url: string | null
          link_id: string | null
          os: string | null
          referrer: string | null
          region: string | null
          session_token: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          affiliate_id: string
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          ip?: string | null
          landed_at?: string
          landing_url?: string | null
          link_id?: string | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_token?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          affiliate_id?: string
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          ip?: string | null
          landed_at?: string
          landing_url?: string | null
          link_id?: string | null
          os?: string | null
          referrer?: string | null
          region?: string | null
          session_token?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_overrides: {
        Row: {
          active: boolean
          affiliate_id: string | null
          amount_cents: number | null
          created_at: string
          ends_at: string | null
          id: string
          kind: string
          notes: string | null
          priority: number
          product_id: string | null
          rate_percent: number | null
          recurrence_limit: number | null
          scope: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          amount_cents?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind: string
          notes?: string | null
          priority?: number
          product_id?: string | null
          rate_percent?: number | null
          recurrence_limit?: number | null
          scope: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          amount_cents?: number | null
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          priority?: number
          product_id?: string | null
          rate_percent?: number | null
          recurrence_limit?: number | null
          scope?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commission_overrides_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commission_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_rules: {
        Row: {
          active: boolean
          affiliate_id: string | null
          created_at: string
          id: string
          kind: string
          lifetime: boolean
          metadata: Json
          model: string
          name: string
          priority: number
          recurrence_limit: number | null
          scope: string
          scope_ref: string | null
          tier_enabled: boolean
          tier_metric: string | null
          tier_period: string | null
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          created_at?: string
          id?: string
          kind: string
          lifetime?: boolean
          metadata?: Json
          model?: string
          name: string
          priority?: number
          recurrence_limit?: number | null
          scope: string
          scope_ref?: string | null
          tier_enabled?: boolean
          tier_metric?: string | null
          tier_period?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          lifetime?: boolean
          metadata?: Json
          model?: string
          name?: string
          priority?: number
          recurrence_limit?: number | null
          scope?: string
          scope_ref?: string | null
          tier_enabled?: boolean
          tier_metric?: string | null
          tier_period?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commission_rules_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_tiers: {
        Row: {
          active: boolean
          affiliate_id: string | null
          amount_cents: number | null
          created_at: string
          id: string
          max_count: number | null
          max_volume_cents: number | null
          min_count: number | null
          min_volume_cents: number
          period: string
          priority: number
          product_id: string | null
          rate_percent: number | null
          rule_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          amount_cents?: number | null
          created_at?: string
          id?: string
          max_count?: number | null
          max_volume_cents?: number | null
          min_count?: number | null
          min_volume_cents?: number
          period?: string
          priority?: number
          product_id?: string | null
          rate_percent?: number | null
          rule_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          amount_cents?: number | null
          created_at?: string
          id?: string
          max_count?: number | null
          max_volume_cents?: number | null
          min_count?: number | null
          min_volume_cents?: number
          period?: string
          priority?: number
          product_id?: string | null
          rate_percent?: number | null
          rule_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commission_tiers_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commission_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commission_tiers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount_cents: number
          available_at: string | null
          created_at: string
          id: string
          metadata: Json
          order_id: string | null
          rate: number | null
          status: Database["public"]["Enums"]["affiliate_commission_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents?: number
          available_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          rate?: number | null
          status?: Database["public"]["Enums"]["affiliate_commission_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          available_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          rate?: number | null
          status?: Database["public"]["Enums"]["affiliate_commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "affiliate_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          id: string
          metadata: Json
          occurred_at: string
          reference: string | null
          session_id: string | null
          type: Database["public"]["Enums"]["affiliate_conversion_type"]
          value_cents: number
        }
        Insert: {
          affiliate_id: string
          id?: string
          metadata?: Json
          occurred_at?: string
          reference?: string | null
          session_id?: string | null
          type: Database["public"]["Enums"]["affiliate_conversion_type"]
          value_cents?: number
        }
        Update: {
          affiliate_id?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          reference?: string | null
          session_id?: string | null
          type?: Database["public"]["Enums"]["affiliate_conversion_type"]
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_cookie_consents: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          policy_version: string | null
          preferences: Json
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          policy_version?: string | null
          preferences?: Json
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          policy_version?: string | null
          preferences?: Json
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_coupons: {
        Row: {
          active: boolean
          affiliate_id: string | null
          code: string
          created_at: string
          discount_cents: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          metadata: Json
          updated_at: string
          uses: number
        }
        Insert: {
          active?: boolean
          affiliate_id?: string | null
          code: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          metadata?: Json
          updated_at?: string
          uses?: number
        }
        Update: {
          active?: boolean
          affiliate_id?: string | null
          code?: string
          created_at?: string
          discount_cents?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          metadata?: Json
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_event_queue: {
        Row: {
          attempts: number
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          priority: number
          processed_at: string | null
          scheduled_for: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          processed_at?: string | null
          scheduled_for?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          processed_at?: string | null
          scheduled_for?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_fraud_flags: {
        Row: {
          affiliate_id: string | null
          commission_id: string | null
          created_at: string
          evidence: Json
          id: string
          order_id: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          commission_id?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          order_id?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          commission_id?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          order_id?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_fraud_flags_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_fraud_flags_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_fraud_flags_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "affiliate_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_fraud_scores: {
        Row: {
          action_taken: string | null
          affiliate_id: string | null
          ai_reasoning: string | null
          click_id: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          score: number
          session_id: string | null
          signals: Json
        }
        Insert: {
          action_taken?: string | null
          affiliate_id?: string | null
          ai_reasoning?: string | null
          click_id?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          score?: number
          session_id?: string | null
          signals?: Json
        }
        Update: {
          action_taken?: string | null
          affiliate_id?: string | null
          ai_reasoning?: string | null
          click_id?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          score?: number
          session_id?: string | null
          signals?: Json
        }
        Relationships: []
      }
      affiliate_goals: {
        Row: {
          affiliate_id: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          reward: string | null
          target_cents: number | null
          target_conversions: number | null
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          reward?: string | null
          target_cents?: number | null
          target_conversions?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          reward?: string | null
          target_cents?: number | null
          target_conversions?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_goals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_leaderboard_snapshots: {
        Row: {
          created_at: string
          id: string
          metric: string
          period: string
          period_end: string
          period_start: string
          rankings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metric?: string
          period: string
          period_end: string
          period_start: string
          rankings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          period?: string
          period_end?: string
          period_start?: string
          rankings?: Json
        }
        Relationships: []
      }
      affiliate_ledger: {
        Row: {
          affiliate_id: string
          amount_cents: number
          balance_after_cents: number
          created_at: string
          description: string | null
          direction: string
          entry_type: string
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          description?: string | null
          direction: string
          entry_type: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          description?: string | null
          direction?: string
          entry_type?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_ledger_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_levels: {
        Row: {
          active: boolean
          color: string | null
          commission_bonus_bps: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          min_conversions: number
          min_points: number
          min_revenue_cents: number
          name: string
          perks: Json
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          commission_bonus_bps?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_conversions?: number
          min_points?: number
          min_revenue_cents?: number
          name: string
          perks?: Json
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          commission_bonus_bps?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          min_conversions?: number
          min_points?: number
          min_revenue_cents?: number
          name?: string
          perks?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          active: boolean
          affiliate_id: string
          created_at: string
          destination_url: string
          id: string
          label: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliate_id: string
          created_at?: string
          destination_url: string
          id?: string
          label?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliate_id?: string
          created_at?: string
          destination_url?: string
          id?: string
          label?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_materials: {
        Row: {
          active: boolean
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          tags: string[]
          thumb_url: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          tags?: string[]
          thumb_url?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          tags?: string[]
          thumb_url?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      affiliate_medal_awards: {
        Row: {
          affiliate_id: string
          awarded_at: string
          id: string
          medal_id: string
        }
        Insert: {
          affiliate_id: string
          awarded_at?: string
          id?: string
          medal_id: string
        }
        Update: {
          affiliate_id?: string
          awarded_at?: string
          id?: string
          medal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_medal_awards_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_medal_awards_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "affiliate_medals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_medals: {
        Row: {
          active: boolean
          code: string
          created_at: string
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          name: string
          tier: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          tier?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          tier?: string
        }
        Relationships: []
      }
      affiliate_messages: {
        Row: {
          affiliate_id: string
          body: string
          created_at: string
          from_admin: boolean
          id: string
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          affiliate_id: string
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          affiliate_id?: string
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_messages_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_mission_progress: {
        Row: {
          affiliate_id: string
          claimed_at: string | null
          completed_at: string | null
          current_value: number
          id: string
          mission_id: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          claimed_at?: string | null
          completed_at?: string | null
          current_value?: number
          id?: string
          mission_id: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          claimed_at?: string | null
          completed_at?: string | null
          current_value?: number
          id?: string
          mission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_mission_progress_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "affiliate_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_missions: {
        Row: {
          active: boolean
          badge_id: string | null
          bonus_cents: number
          created_at: string
          description: string | null
          ends_at: string
          goal_metric: string
          goal_value: number
          id: string
          mission_type: string
          points_reward: number
          slug: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_id?: string | null
          bonus_cents?: number
          created_at?: string
          description?: string | null
          ends_at: string
          goal_metric: string
          goal_value: number
          id?: string
          mission_type?: string
          points_reward?: number
          slug: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_id?: string | null
          bonus_cents?: number
          created_at?: string
          description?: string | null
          ends_at?: string
          goal_metric?: string
          goal_value?: number
          id?: string
          mission_type?: string
          points_reward?: number
          slug?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_missions_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "affiliate_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notification_dispatches: {
        Row: {
          affiliate_id: string | null
          channel: string
          created_at: string
          error: string | null
          event_key: string
          id: string
          payload: Json
          response: Json | null
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          channel: string
          created_at?: string
          error?: string | null
          event_key: string
          id?: string
          payload?: Json
          response?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          event_key?: string
          id?: string
          payload?: Json
          response?: Json | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notification_dispatches_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_notification_dispatches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "affiliate_notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notification_rules: {
        Row: {
          cooldown_seconds: number
          created_at: string
          enabled: boolean
          event_key: string
          filters: Json
          id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          event_key: string
          filters?: Json
          id?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          enabled?: boolean
          event_key?: string
          filters?: Json
          id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notification_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "affiliate_notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_notification_templates: {
        Row: {
          action_url: string | null
          body: string
          channel: string
          created_at: string
          enabled: boolean
          icon_url: string | null
          id: string
          name: string
          slug: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          action_url?: string | null
          body: string
          channel: string
          created_at?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          action_url?: string | null
          body?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      affiliate_notifications: {
        Row: {
          affiliate_id: string | null
          body: string | null
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          to_admin: boolean
        }
        Insert: {
          affiliate_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          to_admin?: boolean
        }
        Update: {
          affiliate_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          to_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_notifications_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_orders: {
        Row: {
          affiliate_id: string
          amount_cents: number
          created_at: string
          customer_ref: string | null
          id: string
          metadata: Json
          occurred_at: string
          order_ref: string
          session_id: string | null
          status: Database["public"]["Enums"]["affiliate_order_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents?: number
          created_at?: string
          customer_ref?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          order_ref: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["affiliate_order_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          created_at?: string
          customer_ref?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          order_ref?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["affiliate_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_outbound_webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          error: string | null
          event_key: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error?: string | null
          event_key: string
          id?: string
          payload: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error?: string | null
          event_key?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_outbound_webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "affiliate_outbound_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_outbound_webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          headers: Json
          id: string
          last_error: string | null
          last_success_at: string | null
          name: string
          secret: string
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          headers?: Json
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          name: string
          secret: string
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          headers?: Json
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          name?: string
          secret?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_payout_batch_items: {
        Row: {
          affiliate_id: string
          amount_cents: number
          batch_id: string
          created_at: string
          external_ref: string | null
          fee_cents: number
          id: string
          net_cents: number
          notes: string | null
          receipt_url: string | null
          status: string
          updated_at: string
          withdraw_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          batch_id: string
          created_at?: string
          external_ref?: string | null
          fee_cents?: number
          id?: string
          net_cents: number
          notes?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          withdraw_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          batch_id?: string
          created_at?: string
          external_ref?: string | null
          fee_cents?: number
          id?: string
          net_cents?: number
          notes?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          withdraw_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payout_batch_items_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payout_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payout_batch_items_withdraw_id_fkey"
            columns: ["withdraw_id"]
            isOneToOne: false
            referencedRelation: "affiliate_withdraws"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payout_batches: {
        Row: {
          batch_code: string
          created_at: string
          created_by: string | null
          fee_cents: number
          id: string
          items_count: number
          method: string
          notes: string | null
          processed_at: string | null
          reference: string | null
          scheduled_for: string | null
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          created_by?: string | null
          fee_cents?: number
          id?: string
          items_count?: number
          method: string
          notes?: string | null
          processed_at?: string | null
          reference?: string | null
          scheduled_for?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          created_by?: string | null
          fee_cents?: number
          id?: string
          items_count?: number
          method?: string
          notes?: string | null
          processed_at?: string | null
          reference?: string | null
          scheduled_for?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_pix_keys: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          key_type: string
          key_value: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          key_type: string
          key_value: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          key_type?: string
          key_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_pix_keys_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_pixels: {
        Row: {
          access_token: string | null
          active: boolean
          api_secret: string | null
          created_at: string
          event_map: Json
          id: string
          label: string | null
          measurement_id: string | null
          pixel_id: string
          provider: string
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          active?: boolean
          api_secret?: string | null
          created_at?: string
          event_map?: Json
          id?: string
          label?: string | null
          measurement_id?: string | null
          pixel_id: string
          provider: string
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          active?: boolean
          api_secret?: string | null
          created_at?: string
          event_map?: Json
          id?: string
          label?: string | null
          measurement_id?: string | null
          pixel_id?: string
          provider?: string
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_points: {
        Row: {
          affiliate_id: string
          level_id: string | null
          points: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          level_id?: string | null
          points?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          level_id?: string | null
          points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_points_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_points_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "affiliate_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_points_ledger: {
        Row: {
          affiliate_id: string
          created_at: string
          delta: number
          id: string
          metadata: Json | null
          reason: string
          reference: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          delta: number
          id?: string
          metadata?: Json | null
          reason: string
          reference?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json | null
          reason?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_points_ledger_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_processing_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          job: string
          last_error: string | null
          payload: Json
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          job: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          job?: string
          last_error?: string | null
          payload?: Json
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_products: {
        Row: {
          active: boolean
          category: string | null
          commission_fixed_cents: number | null
          commission_rate: number | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          price_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          commission_fixed_cents?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          price_cents?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          commission_fixed_cents?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_profiles: {
        Row: {
          affiliate_code: string
          api_key_hash: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          cpf: string
          created_at: string
          default_commission_rate: number | null
          document_url: string | null
          email: string
          full_name: string
          id: string
          last_login_ip: string | null
          metadata: Json
          notify_email: boolean
          notify_push: boolean
          notify_toast: boolean
          push_subscription: Json | null
          rejection_reason: string | null
          signup_ip: string | null
          status: Database["public"]["Enums"]["affiliate_status"]
          theme: string
          token_hash: string | null
          updated_at: string
          user_id: string
          whatsapp: string
          whatsapp_verified_at: string | null
        }
        Insert: {
          affiliate_code: string
          api_key_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          cpf: string
          created_at?: string
          default_commission_rate?: number | null
          document_url?: string | null
          email: string
          full_name: string
          id?: string
          last_login_ip?: string | null
          metadata?: Json
          notify_email?: boolean
          notify_push?: boolean
          notify_toast?: boolean
          push_subscription?: Json | null
          rejection_reason?: string | null
          signup_ip?: string | null
          status?: Database["public"]["Enums"]["affiliate_status"]
          theme?: string
          token_hash?: string | null
          updated_at?: string
          user_id: string
          whatsapp: string
          whatsapp_verified_at?: string | null
        }
        Update: {
          affiliate_code?: string
          api_key_hash?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          cpf?: string
          created_at?: string
          default_commission_rate?: number | null
          document_url?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_ip?: string | null
          metadata?: Json
          notify_email?: boolean
          notify_push?: boolean
          notify_toast?: boolean
          push_subscription?: Json | null
          rejection_reason?: string | null
          signup_ip?: string | null
          status?: Database["public"]["Enums"]["affiliate_status"]
          theme?: string
          token_hash?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string
          whatsapp_verified_at?: string | null
        }
        Relationships: []
      }
      affiliate_push_subscriptions: {
        Row: {
          affiliate_id: string
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_push_subscriptions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_rate_limits: {
        Row: {
          bucket_key: string
          created_at: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      affiliate_roi_snapshots: {
        Row: {
          ad_spend_cents: number
          affiliate_id: string | null
          clicks: number
          commission_cents: number
          conversions: number
          created_at: string
          cvr: number
          epc_cents: number
          id: string
          period_end: string
          period_start: string
          product_id: string | null
          revenue_cents: number
          roas: number
        }
        Insert: {
          ad_spend_cents?: number
          affiliate_id?: string | null
          clicks?: number
          commission_cents?: number
          conversions?: number
          created_at?: string
          cvr?: number
          epc_cents?: number
          id?: string
          period_end: string
          period_start: string
          product_id?: string | null
          revenue_cents?: number
          roas?: number
        }
        Update: {
          ad_spend_cents?: number
          affiliate_id?: string | null
          clicks?: number
          commission_cents?: number
          conversions?: number
          created_at?: string
          cvr?: number
          epc_cents?: number
          id?: string
          period_end?: string
          period_start?: string
          product_id?: string | null
          revenue_cents?: number
          roas?: number
        }
        Relationships: []
      }
      affiliate_sessions: {
        Row: {
          affiliate_id: string
          fingerprint: string | null
          first_click_id: string | null
          first_seen: string
          id: string
          last_seen: string
          metadata: Json
          session_token: string
        }
        Insert: {
          affiliate_id: string
          fingerprint?: string | null
          first_click_id?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          metadata?: Json
          session_token: string
        }
        Update: {
          affiliate_id?: string
          fingerprint?: string | null
          first_click_id?: string | null
          first_seen?: string
          id?: string
          last_seen?: string
          metadata?: Json
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sessions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sessions_first_click_id_fkey"
            columns: ["first_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          antifraud_block_self: boolean
          antifraud_block_vpn: boolean
          antifraud_same_card: boolean
          antifraud_same_cpf: boolean
          antifraud_same_ip: boolean
          attribution_custom_weights: Json | null
          attribution_model: string
          auto_approve: boolean
          auto_notify_email: boolean
          auto_notify_push: boolean
          auto_notify_whatsapp: boolean
          commission_model: string
          cookie_lifetime_days: number
          cookie_lifetime_lifetime: boolean
          cookie_window_days: number
          default_commission_rate: number
          hold_days: number
          id: string
          mercadopago_enabled: boolean
          metadata: Json
          min_withdraw_cents: number
          payout_batch_day: number
          payout_batch_min_cents: number
          paypal_enabled: boolean
          pix_fee_cents: number
          reconciliation_enabled: boolean
          ted_fee_cents: number
          updated_at: string
        }
        Insert: {
          antifraud_block_self?: boolean
          antifraud_block_vpn?: boolean
          antifraud_same_card?: boolean
          antifraud_same_cpf?: boolean
          antifraud_same_ip?: boolean
          attribution_custom_weights?: Json | null
          attribution_model?: string
          auto_approve?: boolean
          auto_notify_email?: boolean
          auto_notify_push?: boolean
          auto_notify_whatsapp?: boolean
          commission_model?: string
          cookie_lifetime_days?: number
          cookie_lifetime_lifetime?: boolean
          cookie_window_days?: number
          default_commission_rate?: number
          hold_days?: number
          id?: string
          mercadopago_enabled?: boolean
          metadata?: Json
          min_withdraw_cents?: number
          payout_batch_day?: number
          payout_batch_min_cents?: number
          paypal_enabled?: boolean
          pix_fee_cents?: number
          reconciliation_enabled?: boolean
          ted_fee_cents?: number
          updated_at?: string
        }
        Update: {
          antifraud_block_self?: boolean
          antifraud_block_vpn?: boolean
          antifraud_same_card?: boolean
          antifraud_same_cpf?: boolean
          antifraud_same_ip?: boolean
          attribution_custom_weights?: Json | null
          attribution_model?: string
          auto_approve?: boolean
          auto_notify_email?: boolean
          auto_notify_push?: boolean
          auto_notify_whatsapp?: boolean
          commission_model?: string
          cookie_lifetime_days?: number
          cookie_lifetime_lifetime?: boolean
          cookie_window_days?: number
          default_commission_rate?: number
          hold_days?: number
          id?: string
          mercadopago_enabled?: boolean
          metadata?: Json
          min_withdraw_cents?: number
          payout_batch_day?: number
          payout_batch_min_cents?: number
          paypal_enabled?: boolean
          pix_fee_cents?: number
          reconciliation_enabled?: boolean
          ted_fee_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_touchpoints: {
        Row: {
          affiliate_id: string | null
          affiliate_link_id: string | null
          created_at: string
          id: string
          occurred_at: string
          session_id: string | null
          touch_type: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          session_id?: string | null
          touch_type?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          session_id?: string | null
          touch_type?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_touchpoints_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_touchpoints_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_touchpoints_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_tracking_events: {
        Row: {
          created_at: string
          currency: string | null
          event_category: string | null
          event_name: string
          id: string
          occurred_at: string
          page_title: string | null
          page_url: string | null
          properties: Json
          session_id: string
          value_cents: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          event_category?: string | null
          event_name: string
          id?: string
          occurred_at?: string
          page_title?: string | null
          page_url?: string | null
          properties?: Json
          session_id: string
          value_cents?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          event_category?: string | null
          event_name?: string
          id?: string
          occurred_at?: string
          page_title?: string | null
          page_url?: string | null
          properties?: Json
          session_id?: string
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_tracking_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_tracking_sessions: {
        Row: {
          affiliate_id: string | null
          affiliate_link_id: string | null
          browser: string | null
          city: string | null
          conversion_order_id: string | null
          converted: boolean
          country: string | null
          created_at: string
          device_type: string | null
          epik: string | null
          fbclid: string | null
          first_seen_at: string
          gclid: string | null
          id: string
          ip: string | null
          landing_url: string | null
          language: string | null
          last_seen_at: string
          li_fat_id: string | null
          max_scroll_pct: number
          msclkid: string | null
          os: string | null
          page_views: number
          referrer: string | null
          region: string | null
          screen_resolution: string | null
          session_key: string
          time_on_site_seconds: number
          ttclid: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          browser?: string | null
          city?: string | null
          conversion_order_id?: string | null
          converted?: boolean
          country?: string | null
          created_at?: string
          device_type?: string | null
          epik?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          language?: string | null
          last_seen_at?: string
          li_fat_id?: string | null
          max_scroll_pct?: number
          msclkid?: string | null
          os?: string | null
          page_views?: number
          referrer?: string | null
          region?: string | null
          screen_resolution?: string | null
          session_key: string
          time_on_site_seconds?: number
          ttclid?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          affiliate_id?: string | null
          affiliate_link_id?: string | null
          browser?: string | null
          city?: string | null
          conversion_order_id?: string | null
          converted?: boolean
          country?: string | null
          created_at?: string
          device_type?: string | null
          epik?: string | null
          fbclid?: string | null
          first_seen_at?: string
          gclid?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          language?: string | null
          last_seen_at?: string
          li_fat_id?: string | null
          max_scroll_pct?: number
          msclkid?: string | null
          os?: string | null
          page_views?: number
          referrer?: string | null
          region?: string | null
          screen_resolution?: string | null
          session_key?: string
          time_on_site_seconds?: number
          ttclid?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_tracking_sessions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_tracking_sessions_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_tracking_sessions_conversion_order_id_fkey"
            columns: ["conversion_order_id"]
            isOneToOne: false
            referencedRelation: "affiliate_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["affiliate_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["affiliate_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["affiliate_role"]
          user_id?: string
        }
        Relationships: []
      }
      affiliate_verification_codes: {
        Row: {
          affiliate_id: string
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          affiliate_id: string
          attempts?: number
          channel?: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
        }
        Update: {
          affiliate_id?: string
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_verification_codes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          external_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_withdraws: {
        Row: {
          affiliate_id: string
          amount_cents: number
          bank_account_id: string | null
          created_at: string
          id: string
          method: string
          notes: string | null
          pix_key_id: string | null
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["affiliate_withdraw_status"]
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_cents: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          pix_key_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["affiliate_withdraw_status"]
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_cents?: number
          bank_account_id?: string | null
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          pix_key_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["affiliate_withdraw_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdraws_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_withdraws_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "affiliate_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_withdraws_pix_key_id_fkey"
            columns: ["pix_key_id"]
            isOneToOne: false
            referencedRelation: "affiliate_pix_keys"
            referencedColumns: ["id"]
          },
        ]
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
      crm_followup_history: {
        Row: {
          attempt_number: number
          body: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          metadata: Json
          recipient_email: string
          status: string
          subject: string | null
          trigger_type: string
        }
        Insert: {
          attempt_number?: number
          body?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          recipient_email: string
          status: string
          subject?: string | null
          trigger_type?: string
        }
        Update: {
          attempt_number?: number
          body?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          recipient_email?: string
          status?: string
          subject?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
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
      crm_followup_template_versions: {
        Row: {
          body_template: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          subject_template: string
        }
        Insert: {
          body_template: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          subject_template: string
        }
        Update: {
          body_template?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          subject_template?: string
        }
        Relationships: []
      }
      crm_lead_status_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          note: string | null
          source: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          note?: string | null
          source?: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          note?: string | null
          source?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
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
      crm_status_automations: {
        Row: {
          created_at: string
          email_body: string
          email_enabled: boolean
          email_subject: string
          status: string
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_message: string
        }
        Insert: {
          created_at?: string
          email_body?: string
          email_enabled?: boolean
          email_subject?: string
          status: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_message?: string
        }
        Update: {
          created_at?: string
          email_body?: string
          email_enabled?: boolean
          email_subject?: string
          status?: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_message?: string
        }
        Relationships: []
      }
      db_sync_state: {
        Row: {
          last_error: string | null
          last_max_updated_at: string | null
          last_strategy: string | null
          last_sync_at: string
          rows_synced: number | null
          table_name: string
        }
        Insert: {
          last_error?: string | null
          last_max_updated_at?: string | null
          last_strategy?: string | null
          last_sync_at?: string
          rows_synced?: number | null
          table_name: string
        }
        Update: {
          last_error?: string | null
          last_max_updated_at?: string | null
          last_strategy?: string | null
          last_sync_at?: string
          rows_synced?: number | null
          table_name?: string
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
      horoscope_free_leads: {
        Row: {
          activated_at: string | null
          activation_code: string
          birth_date: string | null
          city: string | null
          confirmation_attempts: number
          confirmation_error: string | null
          confirmation_sent_at: string | null
          consent_at: string | null
          consent_ip: string | null
          consent_marketing: boolean
          consent_text: string | null
          consent_user_agent: string | null
          created_at: string
          email: string
          expiry_reminder_sent_at: string | null
          full_name: string
          id: string
          last_confirmation_attempt_at: string | null
          last_retry_at: string | null
          last_sent_on: string | null
          phone_e164: string
          retry_count: number
          source: string | null
          status: string
          sun_sign: string | null
          timezone: string
          trial_days: number
          trial_ends_on: string | null
          trial_starts_on: string | null
          unsubscribed_at: string | null
          updated_at: string
          utm: Json | null
        }
        Insert: {
          activated_at?: string | null
          activation_code: string
          birth_date?: string | null
          city?: string | null
          confirmation_attempts?: number
          confirmation_error?: string | null
          confirmation_sent_at?: string | null
          consent_at?: string | null
          consent_ip?: string | null
          consent_marketing?: boolean
          consent_text?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email: string
          expiry_reminder_sent_at?: string | null
          full_name: string
          id?: string
          last_confirmation_attempt_at?: string | null
          last_retry_at?: string | null
          last_sent_on?: string | null
          phone_e164: string
          retry_count?: number
          source?: string | null
          status?: string
          sun_sign?: string | null
          timezone?: string
          trial_days?: number
          trial_ends_on?: string | null
          trial_starts_on?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          activated_at?: string | null
          activation_code?: string
          birth_date?: string | null
          city?: string | null
          confirmation_attempts?: number
          confirmation_error?: string | null
          confirmation_sent_at?: string | null
          consent_at?: string | null
          consent_ip?: string | null
          consent_marketing?: boolean
          consent_text?: string | null
          consent_user_agent?: string | null
          created_at?: string
          email?: string
          expiry_reminder_sent_at?: string | null
          full_name?: string
          id?: string
          last_confirmation_attempt_at?: string | null
          last_retry_at?: string | null
          last_sent_on?: string | null
          phone_e164?: string
          retry_count?: number
          source?: string | null
          status?: string
          sun_sign?: string | null
          timezone?: string
          trial_days?: number
          trial_ends_on?: string | null
          trial_starts_on?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Relationships: []
      }
      horoscope_landing_settings: {
        Row: {
          activation_keyword: string
          confirmation_reply: string
          consent_text: string
          cta_button_label: string
          enabled: boolean
          expiry_reminder_minutes_before: number
          expiry_reminder_template: string
          hero_subtitle: string
          hero_title: string
          id: boolean
          max_retries: number
          retry_after_minutes: number
          send_local_hour: number
          send_local_minute: number
          success_message: string
          trial_days: number
          trial_end_link: string
          trial_end_message: string
          updated_at: string
          whatsapp_number_e164: string
        }
        Insert: {
          activation_keyword?: string
          confirmation_reply?: string
          consent_text?: string
          cta_button_label?: string
          enabled?: boolean
          expiry_reminder_minutes_before?: number
          expiry_reminder_template?: string
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          max_retries?: number
          retry_after_minutes?: number
          send_local_hour?: number
          send_local_minute?: number
          success_message?: string
          trial_days?: number
          trial_end_link?: string
          trial_end_message?: string
          updated_at?: string
          whatsapp_number_e164?: string
        }
        Update: {
          activation_keyword?: string
          confirmation_reply?: string
          consent_text?: string
          cta_button_label?: string
          enabled?: boolean
          expiry_reminder_minutes_before?: number
          expiry_reminder_template?: string
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          max_retries?: number
          retry_after_minutes?: number
          send_local_hour?: number
          send_local_minute?: number
          success_message?: string
          trial_days?: number
          trial_end_link?: string
          trial_end_message?: string
          updated_at?: string
          whatsapp_number_e164?: string
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
      horoscope_paid_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          phone_e164: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          phone_e164?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          phone_e164?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horoscope_paid_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "horoscope_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      horoscope_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          features: Json
          id: string
          interval_months: number
          is_active: boolean
          is_featured: boolean
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval_months: number
          is_active?: boolean
          is_featured?: boolean
          name: string
          price_cents: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval_months?: number
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      horoscope_subscriptions: {
        Row: {
          attempt_count: number
          channel_email: boolean
          channel_whatsapp: boolean
          client_profile_id: string | null
          created_at: string
          email: string | null
          enabled: boolean
          frequency: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_sent_on: string | null
          next_retry_at: string | null
          phone_e164: string | null
          send_hour_utc: number
          send_local_hour: number
          send_local_minute: number
          send_weekday: number | null
          sun_sign: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          channel_email?: boolean
          channel_whatsapp?: boolean
          client_profile_id?: string | null
          created_at?: string
          email?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_sent_on?: string | null
          next_retry_at?: string | null
          phone_e164?: string | null
          send_hour_utc?: number
          send_local_hour?: number
          send_local_minute?: number
          send_weekday?: number | null
          sun_sign?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          channel_email?: boolean
          channel_whatsapp?: boolean
          client_profile_id?: string | null
          created_at?: string
          email?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_sent_on?: string | null
          next_retry_at?: string | null
          phone_e164?: string | null
          send_hour_utc?: number
          send_local_hour?: number
          send_local_minute?: number
          send_weekday?: number | null
          sun_sign?: string | null
          timezone?: string
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
      mp_webhook_logs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          event_type: string | null
          headers: Json | null
          id: string
          metadata_kind: string | null
          method: string
          mp_status: string | null
          order_id: string | null
          payment_id: string | null
          received_at: string
          request_payload: Json | null
          response_body: Json | null
          response_status: number | null
          result: Json | null
          url: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          metadata_kind?: string | null
          method: string
          mp_status?: string | null
          order_id?: string | null
          payment_id?: string | null
          received_at?: string
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          result?: Json | null
          url: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          metadata_kind?: string | null
          method?: string
          mp_status?: string | null
          order_id?: string | null
          payment_id?: string | null
          received_at?: string
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          result?: Json | null
          url?: string
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
          hero_image_height: number | null
          hero_image_url: string | null
          hero_image_width: number | null
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
          hero_image_height?: number | null
          hero_image_url?: string | null
          hero_image_width?: number | null
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
          hero_image_height?: number | null
          hero_image_url?: string | null
          hero_image_width?: number | null
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
          whatsapp_sent_at: string | null
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
          whatsapp_sent_at?: string | null
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
          whatsapp_sent_at?: string | null
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
      pwa_install_events: {
        Row: {
          created_at: string
          event: string
          hint_mode: string | null
          id: string
          path: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          hint_mode?: string | null
          id?: string
          path: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          hint_mode?: string | null
          id?: string
          path?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      report_illustrations: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          image_data: string | null
          mime: string
          prompt: string
          report_kind: string | null
          storage_path: string | null
          theme: string
          title: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_data?: string | null
          mime?: string
          prompt: string
          report_kind?: string | null
          storage_path?: string | null
          theme: string
          title?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_data?: string | null
          mime?: string
          prompt?: string
          report_kind?: string | null
          storage_path?: string | null
          theme?: string
          title?: string | null
          updated_at?: string
          usage_count?: number
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
      short_links: {
        Row: {
          clicks: number
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          slug: string
          target_url: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          slug: string
          target_url: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          slug?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "product_orders"
            referencedColumns: ["id"]
          },
        ]
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
          alert_email: string | null
          alert_whatsapp: string | null
          credit_value_cents: number
          id: string
          mp_webhook_logs_retention_days: number
          updated_at: string | null
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_whatsapp?: string | null
          credit_value_cents?: number
          id?: string
          mp_webhook_logs_retention_days?: number
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_whatsapp?: string | null
          credit_value_cents?: number
          id?: string
          mp_webhook_logs_retention_days?: number
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
          ai_provider_order: string[]
          ai_providers_config: Json
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
          ai_provider_order?: string[]
          ai_providers_config?: Json
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
          ai_provider_order?: string[]
          ai_providers_config?: Json
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
      affiliate_check_rate_limit: {
        Args: { _bucket: string; _limit: number; _window_seconds?: number }
        Returns: boolean
      }
      cleanup_mp_webhook_logs: { Args: never; Returns: number }
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
      current_affiliate_id: { Args: never; Returns: string }
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
      has_affiliate_role: {
        Args: {
          _role: Database["public"]["Enums"]["affiliate_role"]
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
      affiliate_commission_status: "pending" | "approved" | "paid" | "canceled"
      affiliate_conversion_type: "signup" | "lead" | "checkout" | "order"
      affiliate_order_status: "pending" | "paid" | "refunded" | "canceled"
      affiliate_role: "affiliate_admin" | "affiliate"
      affiliate_status: "pending" | "approved" | "rejected" | "suspended"
      affiliate_withdraw_status:
        | "requested"
        | "processing"
        | "paid"
        | "rejected"
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
      affiliate_commission_status: ["pending", "approved", "paid", "canceled"],
      affiliate_conversion_type: ["signup", "lead", "checkout", "order"],
      affiliate_order_status: ["pending", "paid", "refunded", "canceled"],
      affiliate_role: ["affiliate_admin", "affiliate"],
      affiliate_status: ["pending", "approved", "rejected", "suspended"],
      affiliate_withdraw_status: [
        "requested",
        "processing",
        "paid",
        "rejected",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
