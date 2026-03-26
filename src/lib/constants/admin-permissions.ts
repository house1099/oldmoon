export const PERMISSION_LABELS: Record<string, string> = {
  can_review_users:         '審核用戶',
  can_grant_exp:            '發放 EXP',
  can_deduct_exp:           '扣除 EXP',
  can_handle_reports:       '處理檢舉',
  can_manage_events:        '管理活動',
  can_manage_announcements: '管理公告',
  can_manage_invitations:   '管理邀請碼',
  can_view_analytics:       '查看統計',
  can_manage_ads:           '管理廣告',
}

export const DEFAULT_MODERATOR_PERMISSIONS = {
  can_review_users:         true,
  can_grant_exp:            false,
  can_deduct_exp:           false,
  can_handle_reports:       true,
  can_manage_events:        false,
  can_manage_announcements: false,
  can_manage_invitations:   false,
  can_view_analytics:       false,
  can_manage_ads:           false,
}

export const SYSTEM_SETTING_LABELS: Record<string, string> = {
  registration_open:        '開放新用戶註冊',
  daily_checkin_exp:        '每日簽到 EXP',
  invitation_expire_days:   '邀請碼有效天數',
  maintenance_mode:         '維護模式',
  max_report_before_review: '自動審查檢舉門檻',
  new_user_default_exp:     '新用戶初始 EXP',
  like_require_mutual:      '需互讚才能申請血盟',
}

export const ADMIN_ROLES = ['master', 'moderator'] as const
export const MASTER_ONLY_ROLES = ['master'] as const
