/**
 * 與 Supabase `public` schema 對齊的型別（手動維護，請在雲端 Schema 變更後同步更新）。
 * 表：users, exp_logs, likes, alliances, messages
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          /** 冒險者暱稱（與雲端 `users.nickname` 欄位一致） */
          nickname: string;
          bio: string | null;
          avatar_url: string | null;
          /** active：正常；banned：已放逐（路由層強制登出） */
          status: "active" | "banned";
          /** 由 Trigger 依 exp_logs 聚合／規則維護 */
          total_exp: number;
          /** 由 Trigger 依 total_exp 與等級門檻維護 */
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          bio?: string | null;
          avatar_url?: string | null;
          status?: "active" | "banned";
          total_exp?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          bio?: string | null;
          avatar_url?: string | null;
          status?: "active" | "banned";
          total_exp?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exp_logs: {
        Row: {
          id: string;
          user_id: string;
          /** 本次變動經驗值（可正可負，依業務約定） */
          delta_exp: number;
          /** 事件類型，例如 daily_login、quest_complete */
          source: string;
          /**
           * 業務鍵；DB 上應有 UNIQUE 約束，同一 key 不可重複寫入 → 防重複領獎
           */
          unique_key: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          delta_exp: number;
          source: string;
          unique_key: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta_exp?: number;
          source?: string;
          unique_key?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exp_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_from_user_id_fkey";
            columns: ["from_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_to_user_id_fkey";
            columns: ["to_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      alliances: {
        Row: {
          id: string;
          name: string;
          motto: string | null;
          leader_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          motto?: string | null;
          leader_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          motto?: string | null;
          leader_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alliances_leader_id_fkey";
            columns: ["leader_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_receiver_id_fkey";
            columns: ["receiver_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PublicTables = Database["public"]["Tables"];

export type UserRow = PublicTables["users"]["Row"];
export type ExpLogRow = PublicTables["exp_logs"]["Row"];
export type LikeRow = PublicTables["likes"]["Row"];
export type AllianceRow = PublicTables["alliances"]["Row"];
export type MessageRow = PublicTables["messages"]["Row"];
