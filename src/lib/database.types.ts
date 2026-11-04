
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "dice_rolls": {
                  Row: {
                    "created_at": string,"hidden": boolean,"id": string,"modifier": number,"notation": string,"results": NonNullable<Json>,"roller_id": string | null,"room_id": string,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hidden"?: boolean,"id"?: string,"modifier"?: number,"notation": string,"results": NonNullable<Json>,"roller_id"?: string | null,"room_id": string,"total": number
                  }
                  Update: {
                    "created_at"?: string,"hidden"?: boolean,"id"?: string,"modifier"?: number,"notation"?: string,"results"?: NonNullable<Json>,"roller_id"?: string | null,"room_id"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dice_rolls_roller_id_fkey"
      columns: ["roller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dice_rolls_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"initiative_entries": {
                  Row: {
                    "created_at": string,"id": string,"is_current": boolean,"label": string,"position": number,"room_id": string,"token_id": string | null,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"label": string,"position"?: number,"room_id": string,"token_id"?: string | null,"value"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_current"?: boolean,"label"?: string,"position"?: number,"room_id"?: string,"token_id"?: string | null,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "initiative_entries_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "initiative_entries_token_id_fkey"
      columns: ["token_id"]
isOneToOne: false
      referencedRelation: "tokens"
      referencedColumns: ["id"]
    }
                  ]
                },"map_assets": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"owner_id": string,"size_bytes": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"owner_id": string,"size_bytes": number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"size_bytes"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "map_assets_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"map_chunks": {
                  Row: {
                    "cx": number,"cz": number,"document": NonNullable<Json>,"map_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cx": number,"cz": number,"document": NonNullable<Json>,"map_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cx"?: number,"cz"?: number,"document"?: NonNullable<Json>,"map_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "map_chunks_map_id_fkey"
      columns: ["map_id"]
isOneToOne: false
      referencedRelation: "maps"
      referencedColumns: ["id"]
    }
                  ]
                },"map_fog": {
                  Row: {
                    "covered": string,"enabled": boolean,"map_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "covered"?: string,"enabled"?: boolean,"map_id": string,"updated_at"?: string
                  }
                  Update: {
                    "covered"?: string,"enabled"?: boolean,"map_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "map_fog_map_id_fkey"
      columns: ["map_id"]
isOneToOne: true
      referencedRelation: "maps"
      referencedColumns: ["id"]
    }
                  ]
                },"maps": {
                  Row: {
                    "created_at": string,"depth": number,"document": NonNullable<Json>,"id": string,"name": string,"owner_id": string,"room_id": string | null,"schema_version": number,"sort_order": number,"updated_at": string,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"depth": number,"document"?: NonNullable<Json>,"id"?: string,"name": string,"owner_id": string,"room_id"?: string | null,"schema_version"?: number,"sort_order"?: number,"updated_at"?: string,"width": number
                  }
                  Update: {
                    "created_at"?: string,"depth"?: number,"document"?: NonNullable<Json>,"id"?: string,"name"?: string,"owner_id"?: string,"room_id"?: string | null,"schema_version"?: number,"sort_order"?: number,"updated_at"?: string,"width"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "maps_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maps_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"member_roles": {
                  Row: {
                    "code": string,"label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"label": string
                  }
                  Update: {
                    "code"?: string,"label"?: string
                  }
                  Relationships: [
                    
                  ]
                },"note_recipients": {
                  Row: {
                    "note_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "note_id": string,"user_id": string
                  }
                  Update: {
                    "note_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "note_recipients_note_id_fkey"
      columns: ["note_id"]
isOneToOne: false
      referencedRelation: "notes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "note_recipients_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"image_path": string | null,"room_id": string,"title": string,"to_all": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"room_id": string,"title": string,"to_all"?: boolean
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"image_path"?: string | null,"room_id"?: string,"title"?: string,"to_all"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name": string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"room_members": {
                  Row: {
                    "joined_at": string,"nickname": string,"role": string,"room_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"nickname": string,"role": string,"room_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"nickname"?: string,"role"?: string,"room_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_members_role_fkey"
      columns: ["role"]
isOneToOne: false
      referencedRelation: "member_roles"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "room_members_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "active_map_id": string | null,"created_at": string,"cutaway_lock": number | null,"id": string,"name": string,"owner_id": string,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_map_id"?: string | null,"created_at"?: string,"cutaway_lock"?: number | null,"id"?: string,"name": string,"owner_id": string,"slug"?: string,"updated_at"?: string
                  }
                  Update: {
                    "active_map_id"?: string | null,"created_at"?: string,"cutaway_lock"?: number | null,"id"?: string,"name"?: string,"owner_id"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_active_map_fk"
      columns: ["active_map_id"]
isOneToOne: false
      referencedRelation: "maps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rooms_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"token_kinds": {
                  Row: {
                    "code": string,"label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"label": string
                  }
                  Update: {
                    "code"?: string,"label"?: string
                  }
                  Relationships: [
                    
                  ]
                },"token_templates": {
                  Row: {
                    "color_primary": string | null,"color_secondary": string | null,"created_at": string,"hp_max": number | null,"id": string,"image_path": string | null,"kind": string,"model_key": string | null,"name": string,"owner_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"hp_max"?: number | null,"id"?: string,"image_path"?: string | null,"kind": string,"model_key"?: string | null,"name": string,"owner_id": string,"updated_at"?: string
                  }
                  Update: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"hp_max"?: number | null,"id"?: string,"image_path"?: string | null,"kind"?: string,"model_key"?: string | null,"name"?: string,"owner_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "token_templates_kind_fkey"
      columns: ["kind"]
isOneToOne: false
      referencedRelation: "token_kinds"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "token_templates_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tokens": {
                  Row: {
                    "color_primary": string | null,"color_secondary": string | null,"created_at": string,"elevation": number,"hidden": boolean,"hp_current": number | null,"hp_max": number | null,"id": string,"image_path": string | null,"kind": string,"map_id": string,"model_key": string | null,"name": string,"notes": string,"owner_id": string | null,"rotation": number,"scale": number,"updated_at": string,"x": number,"z": number
                  }
                  ComputedFields: never
                  Insert: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"elevation"?: number,"hidden"?: boolean,"hp_current"?: number | null,"hp_max"?: number | null,"id"?: string,"image_path"?: string | null,"kind": string,"map_id": string,"model_key"?: string | null,"name": string,"notes"?: string,"owner_id"?: string | null,"rotation"?: number,"scale"?: number,"updated_at"?: string,"x": number,"z": number
                  }
                  Update: {
                    "color_primary"?: string | null,"color_secondary"?: string | null,"created_at"?: string,"elevation"?: number,"hidden"?: boolean,"hp_current"?: number | null,"hp_max"?: number | null,"id"?: string,"image_path"?: string | null,"kind"?: string,"map_id"?: string,"model_key"?: string | null,"name"?: string,"notes"?: string,"owner_id"?: string | null,"rotation"?: number,"scale"?: number,"updated_at"?: string,"x"?: number,"z"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tokens_kind_fkey"
      columns: ["kind"]
isOneToOne: false
      referencedRelation: "token_kinds"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "tokens_map_id_fkey"
      columns: ["map_id"]
isOneToOne: false
      referencedRelation: "maps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tokens_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_edit_map":
{ Args: { "p_map": string }; Returns: boolean
                           },
"can_read_note":
{ Args: { "p_note": string }; Returns: boolean
                           },
"can_view_map":
{ Args: { "p_map": string }; Returns: boolean
                           },
"create_room":
{ Args: { "p_name": string,"p_nickname": string }; Returns: {
              "active_map_id": string | null,
"created_at": string,
"cutaway_lock": number | null,
"id": string,
"name": string,
"owner_id": string,
"slug": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rooms"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_room_preview":
{ Args: { "p_slug": string }; Returns: {
              "id": string,"name": string
            }[]
                           },
"is_cell_covered":
{ Args: { "p_map": string,"p_x": number,"p_z": number }; Returns: boolean
                           },
"is_registered":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_room_gm":
{ Args: { "p_room": string }; Returns: boolean
                           },
"is_room_member":
{ Args: { "p_room": string }; Returns: boolean
                           },
"join_room":
{ Args: { "p_nickname": string,"p_slug": string }; Returns: string
                           },
"note_room_id":
{ Args: { "p_note": string }; Returns: string
                           },
"room_id_from_topic":
{ Args: { "p_topic": string }; Returns: string
                           },
"save_map_v2":
{ Args: { "p_deletes"?: Json,"p_depth"?: number,"p_header": Json,"p_map_id": string,"p_upserts"?: Json,"p_width"?: number }; Returns: string
                           },
"send_note":
{ Args: { "p_body": string,"p_image_path"?: string,"p_recipient_ids"?: (string)[],"p_room_id": string,"p_title": string,"p_to_all"?: boolean }; Returns: {
              "author_id": string | null,
"body": string,
"created_at": string,
"id": string,
"image_path": string | null,
"room_id": string,
"title": string,
"to_all": boolean
            }
                          SetofOptions: {
        from: "*"
        to: "notes"
        isOneToOne: true
        isSetofReturn: false
      } },
"shares_room_with":
{ Args: { "p_user": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
