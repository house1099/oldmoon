/**
 * 與 Supabase `public` schema 對齊的型別（手動維護，請在雲端 Schema 變更後同步更新）。
 * 表：users, exp_logs, likes, alliances（雙人血盟）, messages, ig_change_requests
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
          nickname: string;
          /** 自介；雲端需有 `bio` 欄位（text, nullable） */
          bio: string | null;
          /** 興趣村莊用自白 */
          bio_village: string | null;
          /** 技能市集用自白 */
          bio_market: string | null;
          /** 核心價值觀三題答案 slug，順序對應問卷；雲端建議 `text[]` */
          core_values: string[] | null;
          /** 英文 slug，與問卷常數一致 */
          gender: string;
          region: string;
          orientation: string;
          /** 是否願意線下／實體聚會（尚未決定時以 false 表示未承諾實體） */
          offline_ok: boolean;
          avatar_url: string | null;
          /** active：正常；banned：已放逐（路由層強制登出） */
          status: "active" | "banned";
          /**
           * 累積經驗值（欄位名必為 `total_exp`，勿使用不存在的 `exp` 欄位）；由 Trigger／exp_logs 等規則維護。
           * 雲端建議 **`integer` 或 `bigint`（int4／int8）**；TypeScript 對應 **`number`**，可支撐數值成長。
           */
          total_exp: number;
          /**
           * 由 Trigger 依 total_exp 與等級門檻維護。
           * 雲端建議 **`integer`（int4）** 或 **`bigint`（int8）**；TypeScript 對應 **`number`**。
           */
          level: number;
          /** 最後上線／活躍時間（村莊排序用）；未上線可為 null */
          last_seen_at: string | null;
          /** 興趣 slug 或標籤列表（雲端須為 **`text[]`**，勿用單一 `text`） */
          interests: string[] | null;
          /** 可提供的技能／專長標籤（`text[]`）；市集「提供」優先於 `interests` */
          skills_offer: string[] | null;
          /** 想尋找的技能／共學標籤（`text[]`）；市集「想要」優先於 `interests` */
          skills_want: string[] | null;
          /** IG 帳號（註冊時寫入；不含 @ 亦可） */
          instagram_handle: string | null;
          /** 邀請碼（可為 null 待生成） */
          invite_code: string | null;
          /** 推薦人 user id（uuid） */
          invited_by: string | null;
          /** 是否在公會公開 IG（隱私開關） */
          ig_public: boolean;
          /** 公會權限：`member`（預設）／`admin`／`leader` */
          role: string;
          /** 每日心情內文 */
          mood: string | null;
          /** 心情最後更新時間（ISO）；超過 24h 前端可不顯示內容 */
          mood_at: string | null;
          /** 上次簽到時間（ISO）；24h 內不可再簽 */
          last_checkin_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          bio?: string | null;
          bio_village?: string | null;
          bio_market?: string | null;
          core_values?: string[];
          gender: string;
          region: string;
          orientation: string;
          offline_ok?: boolean;
          avatar_url?: string | null;
          status?: "active" | "banned";
          /** 累積經驗值，欄位名 `total_exp`（Postgres int4／int8 → TS `number`） */
          total_exp?: number;
          /** 等級（Postgres int4／int8 → TS `number`） */
          level?: number;
          last_seen_at?: string | null;
          interests?: string[] | null;
          skills_offer?: string[] | null;
          skills_want?: string[] | null;
          instagram_handle?: string | null;
          invite_code?: string | null;
          invited_by?: string | null;
          ig_public?: boolean;
          role?: string;
          mood?: string | null;
          mood_at?: string | null;
          last_checkin_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          bio?: string | null;
          bio_village?: string | null;
          bio_market?: string | null;
          core_values?: string[];
          gender?: string;
          region?: string;
          orientation?: string;
          offline_ok?: boolean;
          avatar_url?: string | null;
          status?: "active" | "banned";
          /** 累積經驗值，欄位名 `total_exp`（Postgres int4／int8 → TS `number`） */
          total_exp?: number;
          /** 等級（Postgres int4／int8 → TS `number`） */
          level?: number;
          last_seen_at?: string | null;
          interests?: string[] | null;
          skills_offer?: string[] | null;
          skills_want?: string[] | null;
          instagram_handle?: string | null;
          invite_code?: string | null;
          invited_by?: string | null;
          ig_public?: boolean;
          role?: string;
          mood?: string | null;
          mood_at?: string | null;
          last_checkin_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ig_change_requests: {
        Row: {
          id: string;
          user_id: string | null;
          old_handle: string | null;
          new_handle: string;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          old_handle?: string | null;
          new_handle: string;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          old_handle?: string | null;
          new_handle?: string;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ig_change_requests_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ig_change_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exp_logs: {
        Row: {
          id: string;
          user_id: string;
          /** 與 **`delta_exp`** 並存時之變動量（雲端 NOT NULL 時須一併寫入） */
          delta: number;
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
          /** 與 **`delta_exp`** 建議一併由程式寫入 **1**（簽到），避免 **23502 NOT NULL** */
          delta?: number;
          /** 省略時由資料庫 DEFAULT 補上；與 **`delta`** 併送時以程式值為準 */
          delta_exp?: number;
          source: string;
          unique_key: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta?: number;
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
          /** 雲端欄名 `from_user`（按讚者 uuid） */
          from_user: string;
          /** 雲端欄名 `to_user`（被按讚者 uuid） */
          to_user: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_from_user_fkey";
            columns: ["from_user"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_to_user_fkey";
            columns: ["to_user"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      /** 雙人血盟：`user_a`／`user_b` 為兩位使用者（無序對；查詢時兩向 OR） */
      alliances: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          status: "pending" | "accepted" | "dissolved";
          initiated_by: string;
          created_at: string;
        };
        Insert: {
          user_a: string;
          user_b: string;
          status?: string;
          initiated_by: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alliances_user_a_fkey";
            columns: ["user_a"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alliances_user_b_fkey";
            columns: ["user_b"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alliances_initiated_by_fkey";
            columns: ["initiated_by"];
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
export type IgChangeRequestRow = PublicTables["ig_change_requests"]["Row"];
