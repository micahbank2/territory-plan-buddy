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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      opportunities: {
        Row: {
          close_date: string
          created_at: string
          id: string
          name: string
          notes: string
          point_of_contact: string
          potential_value: number | null
          products: string
          prospect_id: string | null
          stage: string
          territory_id: string
          type: string
          user_id: string
        }
        Insert: {
          close_date?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          point_of_contact?: string
          potential_value?: number | null
          products?: string
          prospect_id?: string | null
          stage?: string
          territory_id: string
          type?: string
          user_id: string
        }
        Update: {
          close_date?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          point_of_contact?: string
          potential_value?: number | null
          products?: string
          prospect_id?: string | null
          stage?: string
          territory_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          email: string
          id: string
          name: string
          notes: string
          phone: string
          prospect_id: string
          relationship_strength: string | null
          role: string | null
          title: string
          user_id: string
        }
        Insert: {
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          prospect_id: string
          relationship_strength?: string | null
          role?: string | null
          title?: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          prospect_id?: string
          relationship_strength?: string | null
          role?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interactions: {
        Row: {
          date: string
          id: string
          notes: string
          prospect_id: string
          type: string
          user_id: string
        }
        Insert: {
          date?: string
          id?: string
          notes?: string
          prospect_id: string
          type?: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          notes?: string
          prospect_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_notes: {
        Row: {
          id: string
          prospect_id: string
          text: string
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          prospect_id: string
          text?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          prospect_id?: string
          text?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_notes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_signals: {
        Row: {
          created_at: string
          description: string
          id: string
          opportunity_type: string
          prospect_id: string
          relevance: string
          signal_type: string
          source: string
          territory_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          opportunity_type?: string
          prospect_id: string
          relevance?: string
          signal_type?: string
          source?: string
          territory_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          opportunity_type?: string
          prospect_id?: string
          relevance?: string
          signal_type?: string
          source?: string
          territory_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_signals_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_signals_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_tasks: {
        Row: {
          due_date: string
          id: string
          prospect_id: string
          text: string
          user_id: string
        }
        Insert: {
          due_date?: string
          id?: string
          prospect_id: string
          text?: string
          user_id: string
        }
        Update: {
          due_date?: string
          id?: string
          prospect_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          ai_readiness_data: Json | null
          ai_readiness_grade: string | null
          ai_readiness_score: number | null
          ai_readiness_updated_at: string | null
          competitor: string
          contact_email: string
          contact_name: string
          created_at: string
          custom_logo: string | null
          estimated_revenue: number | null
          id: string
          industry: string
          last_modified: string
          last_touched: string | null
          location_count: number | null
          location_notes: string
          name: string
          notes: string
          outreach: string
          priority: string
          status: string
          territory_id: string | null
          tier: string
          transition_owner: string
          user_id: string
          website: string
        }
        Insert: {
          ai_readiness_data?: Json | null
          ai_readiness_grade?: string | null
          ai_readiness_score?: number | null
          ai_readiness_updated_at?: string | null
          competitor?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          custom_logo?: string | null
          estimated_revenue?: number | null
          id?: string
          industry?: string
          last_modified?: string
          last_touched?: string | null
          location_count?: number | null
          location_notes?: string
          name: string
          notes?: string
          outreach?: string
          priority?: string
          status?: string
          territory_id?: string | null
          tier?: string
          transition_owner?: string
          user_id: string
          website?: string
        }
        Update: {
          ai_readiness_data?: Json | null
          ai_readiness_grade?: string | null
          ai_readiness_score?: number | null
          ai_readiness_updated_at?: string | null
          competitor?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          custom_logo?: string | null
          estimated_revenue?: number | null
          id?: string
          industry?: string
          last_modified?: string
          last_touched?: string | null
          location_count?: number | null
          location_notes?: string
          name?: string
          notes?: string
          outreach?: string
          priority?: string
          status?: string
          territory_id?: string | null
          tier?: string
          transition_owner?: string
          user_id?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          public_access: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          public_access?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          public_access?: string
        }
        Relationships: []
      }
      territory_members: {
        Row: {
          created_at: string
          id: string
          role: string
          territory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          territory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          territory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_members_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_territory: { Args: { _user_id: string }; Returns: string }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      is_territory_public: { Args: { _territory_id: string }; Returns: string }
      user_can_access_territory: {
        Args: { _territory_id: string }
        Returns: boolean
      }
      user_can_edit_territory: {
        Args: { _territory_id: string }
        Returns: boolean
      }
      user_is_territory_owner: {
        Args: { _territory_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
