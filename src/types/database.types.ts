/**
 * 與 Supabase `public` schema 對齊的型別（手動維護，請在雲端 Schema 變更後同步更新）。
 * 表：users, exp_logs, likes, alliances（雙人血盟）, conversations, chat_messages, blocks, reports, messages, notifications, ig_change_requests,
 *     admin_actions, moderator_permissions, system_settings, advertisements, ad_clicks, invitation_codes, invitation_code_uses, announcements,
 *     tavern_messages, tavern_bans, login_streaks, prize_pools, prize_items, prize_logs, user_rewards
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
          /** active / suspended / banned / pending */
          status: "pending" | "active" | "suspended" | "banned";
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
          /** 公會權限：member / moderator / master */
          role: "member" | "moderator" | "master";
          /** 信譽分（0-100，預設 100） */
          reputation_score: number;
          /** 活躍度：active 正常／resting 休息中／hidden 探索列表隱藏（pg_cron 依未簽到天數更新） */
          activity_status: "active" | "resting" | "hidden";
          /** 放逐原因 */
          ban_reason: string | null;
          /** 停權到期時間 */
          suspended_until: string | null;
          /** 管理備註 */
          notes: string | null;
          /** 每日心情內文 */
          mood: string | null;
          /** 心情最後更新時間（ISO）；超過 24h 前端可不顯示內容 */
          mood_at: string | null;
          /** 上次簽到時間（ISO）；24h 內不可再簽 */
          last_checkin_at: string | null;
          /** 付費幣（≥0） */
          premium_coins: number;
          /** 免費幣（≥0） */
          free_coins: number;
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
          status?: "pending" | "active" | "suspended" | "banned";
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
          role?: "member" | "moderator" | "master";
          reputation_score?: number;
          activity_status?: "active" | "resting" | "hidden";
          ban_reason?: string | null;
          suspended_until?: string | null;
          notes?: string | null;
          mood?: string | null;
          mood_at?: string | null;
          last_checkin_at?: string | null;
          premium_coins?: number;
          free_coins?: number;
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
          status?: "pending" | "active" | "suspended" | "banned";
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
          role?: "member" | "moderator" | "master";
          reputation_score?: number;
          activity_status?: "active" | "resting" | "hidden";
          ban_reason?: string | null;
          suspended_until?: string | null;
          notes?: string | null;
          mood?: string | null;
          mood_at?: string | null;
          last_checkin_at?: string | null;
          premium_coins?: number;
          free_coins?: number;
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
          /** 雲端欄名 `from_user`（按讚者 uuid） */
          from_user: string;
          /** 雲端欄名 `to_user`（被按讚者 uuid） */
          to_user: string;
        };
        Insert: {
          from_user: string;
          to_user: string;
        };
        Update: {
          from_user?: string;
          to_user?: string;
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
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          last_message: string | null;
          /** 最後一則聊天訊息發送者（列表「你：／對方：」預覽用） */
          last_message_sender_id: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          user_a: string;
          user_b: string;
          last_message?: string | null;
          last_message_sender_id?: string | null;
          last_message_at?: string;
        };
        Update: {
          last_message?: string | null;
          last_message_sender_id?: string | null;
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_a_fkey";
            columns: ["user_a"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_b_fkey";
            columns: ["user_b"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_last_message_sender_id_fkey";
            columns: ["last_message_sender_id"];
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
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string;
          conversation_id: string | null;
          reason: string;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          reported_user_id: string;
          conversation_id?: string | null;
          reason: string;
          description?: string | null;
        };
        Update: {
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          /** 通知類型 slug（例如 like、alliance_request、new_message） */
          type: string;
          from_user_id: string | null;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          from_user_id?: string | null;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          from_user_id?: string | null;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey";
            columns: ["from_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_actions: {
        Row: {
          id: string;
          admin_id: string;
          target_user_id: string | null;
          action_type: string;
          action_label: string | null;
          reason: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          target_user_id?: string | null;
          action_type: string;
          action_label?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          target_user_id?: string | null;
          action_type?: string;
          action_label?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey";
            columns: ["admin_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey";
            columns: ["target_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      moderator_permissions: {
        Row: {
          id: string;
          user_id: string;
          can_review_users: boolean;
          can_grant_exp: boolean;
          can_deduct_exp: boolean;
          can_handle_reports: boolean;
          can_manage_events: boolean;
          can_manage_announcements: boolean;
          can_manage_invitations: boolean;
          can_view_analytics: boolean;
          can_manage_ads: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          can_review_users?: boolean;
          can_grant_exp?: boolean;
          can_deduct_exp?: boolean;
          can_handle_reports?: boolean;
          can_manage_events?: boolean;
          can_manage_announcements?: boolean;
          can_manage_invitations?: boolean;
          can_view_analytics?: boolean;
          can_manage_ads?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          can_review_users?: boolean;
          can_grant_exp?: boolean;
          can_deduct_exp?: boolean;
          can_handle_reports?: boolean;
          can_manage_events?: boolean;
          can_manage_announcements?: boolean;
          can_manage_invitations?: boolean;
          can_view_analytics?: boolean;
          can_manage_ads?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderator_permissions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderator_permissions_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          value: string;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey";
            columns: ["updated_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      advertisements: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          link_url: string | null;
          position: "banner" | "card" | "announcement";
          weight: number;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          click_count: number;
          view_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          position: "banner" | "card" | "announcement";
          weight?: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          click_count?: number;
          view_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          position?: "banner" | "card" | "announcement";
          weight?: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          click_count?: number;
          view_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "advertisements_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ad_clicks: {
        Row: {
          id: string;
          ad_id: string;
          user_id: string | null;
          clicked_at: string;
        };
        Insert: {
          id?: string;
          ad_id: string;
          user_id?: string | null;
          clicked_at?: string;
        };
        Update: {
          ad_id?: string;
          user_id?: string | null;
          clicked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey";
            columns: ["ad_id"];
            referencedRelation: "advertisements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ad_clicks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          image_url: string | null;
          is_pinned: boolean;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          image_url?: string | null;
          is_pinned?: boolean;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          image_url?: string | null;
          is_pinned?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tavern_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          type: "text" | "emoji";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          type: "text" | "emoji";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tavern_messages_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tavern_bans: {
        Row: {
          id: string;
          user_id: string;
          banned_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          banned_by: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          banned_by?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tavern_bans_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tavern_bans_banned_by_fkey";
            columns: ["banned_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_codes: {
        Row: {
          id: string;
          code: string;
          created_by: string;
          used_by: string | null;
          used_at: string | null;
          expires_at: string | null;
          is_revoked: boolean;
          note: string | null;
          /** 允許使用人次上限（1 = 一次性） */
          max_uses: number;
          /** 已使用人次 */
          use_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          created_by: string;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string | null;
          is_revoked?: boolean;
          note?: string | null;
          max_uses?: number;
          use_count?: number;
          created_at?: string;
        };
        Update: {
          code?: string;
          created_by?: string;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string | null;
          is_revoked?: boolean;
          note?: string | null;
          max_uses?: number;
          use_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_codes_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitation_codes_used_by_fkey";
            columns: ["used_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_code_uses: {
        Row: {
          id: string;
          code_id: string;
          used_by: string;
          used_at: string;
        };
        Insert: {
          id?: string;
          code_id: string;
          used_by: string;
          used_at?: string;
        };
        Update: {
          code_id?: string;
          used_by?: string;
          used_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_code_uses_code_id_fkey";
            columns: ["code_id"];
            referencedRelation: "invitation_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitation_code_uses_used_by_fkey";
            columns: ["used_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          coin_type: "premium" | "free";
          amount: number;
          balance_after: number;
          source:
            | "checkin"
            | "loot_box"
            | "admin_grant"
            | "admin_deduct"
            | "shop_purchase"
            | "refund"
            | "convert_in"
            | "convert_out"
            | "topup";
          reference_id: string | null;
          note: string | null;
          operator_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          coin_type: "premium" | "free";
          amount: number;
          balance_after: number;
          source:
            | "checkin"
            | "loot_box"
            | "admin_grant"
            | "admin_deduct"
            | "shop_purchase"
            | "refund"
            | "convert_in"
            | "convert_out"
            | "topup";
          reference_id?: string | null;
          note?: string | null;
          operator_id?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          coin_type?: "premium" | "free";
          amount?: number;
          balance_after?: number;
          source?:
            | "checkin"
            | "loot_box"
            | "admin_grant"
            | "admin_deduct"
            | "shop_purchase"
            | "refund"
            | "convert_in"
            | "convert_out"
            | "topup";
          reference_id?: string | null;
          note?: string | null;
          operator_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      login_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_claim_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_claim_at?: string | null;
          created_at?: string;
        };
        Update: {
          current_streak?: number;
          longest_streak?: number;
          last_claim_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "login_streaks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_pools: {
        Row: {
          id: string;
          pool_type: string;
          label: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_type: string;
          label: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          pool_type?: string;
          label?: string;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      prize_items: {
        Row: {
          id: string;
          pool_id: string;
          reward_type: string;
          label: string;
          min_value: number | null;
          max_value: number | null;
          weight: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          reward_type: string;
          label: string;
          min_value?: number | null;
          max_value?: number | null;
          weight?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          reward_type?: string;
          label?: string;
          min_value?: number | null;
          max_value?: number | null;
          weight?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "prize_items_pool_id_fkey";
            columns: ["pool_id"];
            referencedRelation: "prize_pools";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_logs: {
        Row: {
          id: string;
          user_id: string;
          pool_id: string;
          item_id: string;
          pool_type: string;
          reward_type: string;
          reward_value: number | null;
          label: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pool_id: string;
          item_id: string;
          pool_type: string;
          reward_type: string;
          reward_value?: number | null;
          label: string;
          created_at?: string;
        };
        Update: {
          reward_value?: number | null;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prize_logs_pool_id_fkey";
            columns: ["pool_id"];
            referencedRelation: "prize_pools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prize_logs_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "prize_items";
            referencedColumns: ["id"];
          },
        ];
      };
      user_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_type: string;
          item_ref_id: string | null;
          label: string;
          is_equipped: boolean;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_type: string;
          item_ref_id?: string | null;
          label: string;
          is_equipped?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          reward_type?: string;
          item_ref_id?: string | null;
          label?: string;
          is_equipped?: boolean;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_rewards_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_rewards_item_ref_id_fkey";
            columns: ["item_ref_id"];
            referencedRelation: "prize_items";
            referencedColumns: ["id"];
          },
        ];
      };
      topup_orders: {
        Row: {
          id: string;
          user_id: string;
          amount_twd: number;
          premium_coins: number;
          status: "pending" | "paid" | "failed" | "refunded";
          payment_method: string | null;
          payment_ref: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_twd: number;
          premium_coins: number;
          status?: "pending" | "paid" | "failed" | "refunded";
          payment_method?: string | null;
          payment_ref?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          amount_twd?: number;
          premium_coins?: number;
          status?: "pending" | "paid" | "failed" | "refunded";
          payment_method?: string | null;
          payment_ref?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topup_orders_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_invitation_code: {
        Args: {
          p_code: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      get_coin_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
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
export type NotificationRow = PublicTables["notifications"]["Row"];
export type IgChangeRequestRow = PublicTables["ig_change_requests"]["Row"];
export type ConversationRow = PublicTables["conversations"]["Row"];
export type ChatMessageRow = PublicTables["chat_messages"]["Row"];
export type BlockRow = PublicTables["blocks"]["Row"];
export type ReportRow = PublicTables["reports"]["Row"];
export type AdminActionRow = PublicTables["admin_actions"]["Row"];
export type ModeratorPermissionRow = PublicTables["moderator_permissions"]["Row"];
export type SystemSettingRow = PublicTables["system_settings"]["Row"];
export type AdvertisementRow = PublicTables["advertisements"]["Row"];
export type AdClickRow = PublicTables["ad_clicks"]["Row"];
export type InvitationCodeRow = PublicTables["invitation_codes"]["Row"];
export type InvitationCodeUseRow = PublicTables["invitation_code_uses"]["Row"];
export type AnnouncementRow = PublicTables["announcements"]["Row"];
export type CoinTransactionRow = PublicTables["coin_transactions"]["Row"];
export type TopupOrderRow = PublicTables["topup_orders"]["Row"];
export type LoginStreakRow = PublicTables["login_streaks"]["Row"];
export type PrizePoolRow = PublicTables["prize_pools"]["Row"];
export type PrizeItemRow = PublicTables["prize_items"]["Row"];
export type PrizeLogRow = PublicTables["prize_logs"]["Row"];
export type UserRewardRow = PublicTables["user_rewards"]["Row"];

export type TavernMessageRow = PublicTables["tavern_messages"]["Row"];
export type TavernBanRow = PublicTables["tavern_bans"]["Row"];

export type TavernMessageDto = TavernMessageRow & {
  user: {
    id: string;
    nickname: string;
    avatar_url: string | null;
    level: number;
    role: string;
  };
};

/** 前端顯示用 DTO（含關聯用戶資料） */
export type InvitationCodeDto = InvitationCodeRow & {
  creator?: { id: string; nickname: string; avatar_url: string | null };
  user?: { id: string; nickname: string; avatar_url: string | null };
};

export type AnnouncementDto = AnnouncementRow & {
  creator?: { id: string; nickname: string; avatar_url: string | null };
};
