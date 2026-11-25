export const LANG_STORAGE_KEY = "ui_language_v1";

export const UI_LANGUAGES = [
  { id: "zh-Hant", label: "繁體中文", langTag: "zh-Hant" },
  { id: "en", label: "English", langTag: "en" }
];

export function normalizeUiLanguage(raw) {
  return String(raw || "").trim().toLowerCase().startsWith("en") ? "en" : "zh-Hant";
}

export function getUiLanguage() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "zh-Hant";
  }
  try {
    if (typeof window.localStorage !== "undefined") {
      return normalizeUiLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
    }
  } catch {
    // Ignore storage unavailability (private mode / restricted context)
  }
  return "zh-Hant";
}

export function isEn() {
  return getUiLanguage() === "en";
}

export function bi(zhText, enText) {
  return isEn() ? enText : zhText;
}

export function applyDocumentLangAttribute(lang = getUiLanguage()) {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.lang = normalizeUiLanguage(lang);
}

const STATIC_DOM_TRANSLATIONS = [
  // Header & navigation
  { selector: "#back-btn", zh: "← 返回地圖", en: "← Back to Map" },
  { selector: "#back-room-btn", zh: "🏠 回到租屋處", en: "🏠 Back to Studio" },
  {
    selector: "label.theme-switch",
    titleZh: "切換淺色／深色背景",
    titleEn: "Toggle light / dark theme"
  },
  {
    selector: "#theme-toggle-input",
    ariaLabelZh: "切換深色背景模式",
    ariaLabelEn: "Toggle dark mode"
  },
  { selector: ".clams-unit-label", all: true, zh: "英蚌", en: "Clams" },
  {
    selector: "#open-settings-btn",
    ariaLabelZh: "開啟帳號與個人設定",
    ariaLabelEn: "Open account & settings"
  },
  { selector: "#open-settings-btn span", zh: "設定", en: "Settings" },
  {
    selector: "#loading-view",
    zh: "正在同步帳號狀態與教案資料庫...",
    en: "Syncing account status and lesson database..."
  },

  // Auth view
  { selector: "#google-signin-btn span", zh: "使用 Google 帳號快速登入", en: "Continue with Google" },
  { selector: "#auth-divider-text", zh: "或使用電子郵件", en: "or use email" },
  {
    selector: "#auth-tabs-group",
    ariaLabelZh: "登入或註冊模式切換",
    ariaLabelEn: "Sign in or create account"
  },
  { selector: "#tab-signin", zh: "登入帳號", en: "Sign In" },
  { selector: "#tab-signup", zh: "註冊新帳號", en: "Create Account" },
  {
    selector: "#signin-form",
    ariaLabelZh: "電子郵件登入表單",
    ariaLabelEn: "Email sign-in form"
  },
  { selector: "#signin-email-label-text", zh: "電子郵件", en: "Email" },
  {
    selector: "#signin-email-error",
    zh: "錯誤：請輸入有效的電子郵件格式（例如 name@example.com）。",
    en: "Error: Please enter a valid email address (e.g. name@example.com)."
  },
  { selector: "#signin-pw-label-text", zh: "密碼", en: "Password" },
  { selector: "#forgot-pw-btn", zh: "忘記密碼？", en: "Forgot password?" },
  { selector: "#signin-password-error", zh: "錯誤：請輸入登入密碼。", en: "Error: Please enter your password." },
  { selector: "#signin-submit-btn", zh: "登入", en: "Sign In" },
  {
    selector: "#signup-form",
    ariaLabelZh: "建立新帳號表單",
    ariaLabelEn: "Create account form"
  },
  { selector: "#signup-name-label-text", zh: "顯示名稱", en: "Display Name" },
  { selector: "#signup-name-hint", zh: "例如：Vic 或自己的英文／中文名字", en: "e.g. Vic or your preferred name" },
  { selector: "#signup-name-error", zh: "錯誤：請輸入您的顯示名稱。", en: "Error: Please enter your display name." },
  { selector: "#signup-email-label-text", zh: "電子郵件", en: "Email" },
  {
    selector: "#signup-email-error",
    zh: "錯誤：請輸入有效的電子郵件格式（例如 name@example.com）。",
    en: "Error: Please enter a valid email address (e.g. name@example.com)."
  },
  { selector: "#signup-pw-label-text", zh: "設定密碼", en: "Password" },
  {
    selector: "#signup-pw-hint",
    zh: "至少 6 個字元，可使用英文字母、數字或符號",
    en: "At least 6 characters (letters, numbers, or symbols)"
  },
  { selector: "#signup-pw-error", zh: "錯誤：密碼長度需至少 6 個字元。", en: "Error: Password must be at least 6 characters." },
  { selector: "#signup-submit-btn", zh: "建立帳號", en: "Create Account" },

  // Settings dialog
  { selector: "#settings-dialog-title", zh: "帳號與個人設定", en: "Account & Settings" },
  { selector: "#close-settings-btn", ariaLabelZh: "關閉設定視窗", ariaLabelEn: "Close settings" },
  { selector: "#settings-overview-heading", zh: "帳號資訊", en: "Account Info" },
  { selector: "#settings-key-email", zh: "電子郵件", en: "Email" },
  { selector: "#settings-key-role", zh: "帳號身分", en: "Role" },
  { selector: "#settings-key-providers", zh: "登入方式", en: "Sign-in Method" },
  { selector: "#settings-key-verified", zh: "信箱驗證", en: "Verification" },
  { selector: "#settings-lang-heading", zh: "介面語言 / Language", en: "Interface Language / 介面語言" },
  {
    selector: "#settings-lang-hint",
    zh: "可隨時切換繁體中文或英文介面（英語閱讀與測驗題目維持英文原文）。",
    en: "Switch between Traditional Chinese and English anytime (reading passages and quizzes stay in English)."
  },
  { selector: "#settings-profile-heading", zh: "顯示名稱", en: "Display Name" },
  { selector: "#settings-display-name-label-text", zh: "名稱", en: "Name" },
  { selector: "#save-profile-btn", zh: "儲存名稱", en: "Save Name" },
  { selector: "#settings-name-error", zh: "錯誤：顯示名稱不能為空白。", en: "Error: Display name cannot be empty." },
  { selector: "#settings-password-heading", zh: "變更或設定密碼", en: "Change or Set Password" },
  { selector: "#settings-reset-pw-btn", zh: "寄送重設密碼信", en: "Send reset email" },
  { selector: "#settings-current-pw-label-text", zh: "目前密碼", en: "Current Password" },
  { selector: "#settings-current-pw-error", zh: "錯誤：請輸入目前密碼。", en: "Error: Please enter your current password." },
  { selector: "#settings-new-pw-label-text", zh: "新密碼", en: "New Password" },
  {
    selector: "#settings-new-pw-hint",
    zh: "至少 6 個字元，更新後可用此信箱與新密碼直接登入",
    en: "At least 6 characters; use with your email to sign in later"
  },
  { selector: "#settings-new-pw-error", zh: "錯誤：新密碼長度需至少 6 個字元。", en: "Error: New password must be at least 6 characters." },
  { selector: "#settings-avatar-heading", zh: "繪師角色外觀與名字", en: "Artist Appearance & Name" },
  { selector: "#edit-avatar-btn", zh: "調整角色造型／名字", en: "Edit Look / Name" },
  { selector: "#super-admin-heading", zh: "管理員權限管理（超級管理員專屬）", en: "Admin Access (Super Admin Only)" },
  {
    selector: "#super-admin-desc",
    zh: "新增其他管理員信箱。對方以已驗證的該信箱登入後，將自動具備管理員身分。",
    en: "Add another admin email. Once verified and signed in, they gain admin permissions automatically."
  },
  { selector: "#admin-email-label-text", zh: "新增管理員電子郵件", en: "Add Admin Email" },
  { selector: "#add-admin-btn", zh: "新增管理員", en: "Add Admin" },
  { selector: "#admin-email-error", zh: "錯誤：請輸入有效的電子郵件格式。", en: "Error: Please enter a valid email address." },
  { selector: "#admin-list", ariaLabelZh: "現有管理員清單", ariaLabelEn: "Current admins list" },
  { selector: "#logout-btn", zh: "登出目前帳號", en: "Sign Out" },
  { selector: "#footer-close-settings-btn", zh: "完成", en: "Done" },

  // Admin review dialog
  { selector: "#admin-review-title", zh: "📋 甲方案主驗收台（發放英蚌）", en: "📋 Client Review Desk (Award Clams)" },
  { selector: "#close-admin-review-btn", ariaLabelZh: "關閉驗收視窗", ariaLabelEn: "Close review dialog" },
  {
    selector: "#admin-pending-heading",
    zh: "🔔 待驗收發款佇列（學生點擊「完成任務」會即時出現在這裡）",
    en: "🔔 Pending Approval Queue (submissions appear here in real time)"
  },
  {
    selector: "#admin-select-student-label",
    zh: "選擇指定繪師（直接發錢／調整餘額、悄悄參觀房間或檢視課程）",
    en: "Select Illustrator (award/adjust clams, spectate studio, or inspect lessons)"
  },
  {
    selector: "#admin-visit-room-btn",
    zh: "👀 參觀房間",
    en: "👀 Visit Studio",
    titleZh: "悄悄參觀該玩家的租屋處佈置（唯讀模式，對方不會察覺）",
    titleEn: "Silently inspect this illustrator's studio (read-only mode)"
  },
  { selector: "#refresh-review-btn", zh: "重新整理名單", en: "Refresh List" },
  {
    selector: "#admin-preview-story-btn",
    zh: "🎬 測試開場故事",
    en: "🎬 Preview Intro Story",
    titleZh: "在自己房間立即重播視覺小說開場故事橫幅（不更動帳號已讀狀態）",
    titleEn: "Replay the visual-novel intro banner in your studio (does not change saved status)"
  },
  {
    selector: "#admin-reset-my-story-btn",
    zh: "🔁 重置自身開場狀態",
    en: "🔁 Reset My Intro State",
    titleZh: "將目前管理員帳號重置為「尚未看過開場故事」，可實測創帳後只顯示一次與重整不再出現",
    titleEn: "Reset your own introStorySeen flag to false to test first-login trigger & persistence"
  },
  { selector: "#admin-reset-all-lessons-btn", zh: "🔄 全部玩家關卡歸零", en: "🔄 Reset All Progress" },
  { selector: "#footer-close-admin-review-btn", zh: "關閉", en: "Close" },

  // Shop dialog
  { selector: "#shop-dialog-title", zh: "🛒 租屋生活商店", en: "🛒 Studio Living Shop" },
  { selector: "#shop-wallet-pill", ariaLabelZh: "目前英蚌餘額", ariaLabelEn: "Current clam balance" },
  { selector: "#close-shop-btn", ariaLabelZh: "關閉商店", ariaLabelEn: "Close shop" },
  { selector: "#shop-tabs", ariaLabelZh: "商店分類", ariaLabelEn: "Shop categories" },

  // TV dialog
  { selector: "#tv-dialog-title", zh: "📺 房間電視", en: "📺 Studio TV" },
  {
    selector: "#close-tv-btn",
    titleZh: "回到房間（電視繼續播放）",
    titleEn: "Back to studio (keep TV playing)",
    ariaLabelZh: "回到房間（電視繼續播放）",
    ariaLabelEn: "Back to studio (keep TV playing)"
  },
  { selector: "#tv-youtube-iframe", titleZh: "房間電視 YouTube 播放", ariaLabelZh: "房間電視 YouTube 播放", titleEn: "Studio TV YouTube Player" },
  {
    selector: "#tv-custom-url-input",
    placeholderZh: "貼上 YouTube 網址或影片 ID…",
    placeholderEn: "Paste YouTube URL or video ID…",
    ariaLabelZh: "貼上 YouTube 網址或影片 ID",
    ariaLabelEn: "Paste YouTube URL or video ID"
  },
  {
    selector: "#tv-play-custom-btn",
    zh: "▶ 播放",
    en: "▶ Play",
    titleZh: "播放輸入的 YouTube 影片",
    titleEn: "Play entered YouTube video"
  },
  {
    selector: "#tv-search-yt-btn",
    titleZh: "前往 YouTube 搜尋影片",
    titleEn: "Search videos on YouTube",
    ariaLabelZh: "前往 YouTube 搜尋影片",
    ariaLabelEn: "Search videos on YouTube"
  },
  { selector: "#tv-channel-heading-label", zh: "📺 選擇頻道", en: "📺 Channels" },
  { selector: "#tv-channel-list", ariaLabelZh: "選擇 YouTube 觀看內容", ariaLabelEn: "Select YouTube channel" },
  {
    selector: "#tv-shuffle-btn",
    zh: "🔀 換台",
    en: "🔀 Shuffle",
    titleZh: "隨機換台",
    titleEn: "Random channel",
    ariaLabelZh: "隨機換一部影片",
    ariaLabelEn: "Play random video"
  },
  { selector: "#tv-minimize-room-btn", zh: "📺 回房間繼續看", en: "📺 Watch in Studio" },
  { selector: "#footer-close-tv-btn", zh: "⏻ 關掉電視", en: "⏻ Power Off" },

  // Poster dialog
  { selector: "#poster-dialog-title", zh: "🖼️ 更換房間掛畫圖案", en: "🖼️ Customize Wall Poster" },
  {
    selector: "#poster-dialog-subtitle",
    zh: "可匯入自己的照片並自由裁切構圖，或隨時取消恢復預設山水畫",
    en: "Import and crop your own photo, or restore the default landscape painting anytime"
  },
  { selector: "#close-poster-btn", ariaLabelZh: "關閉掛畫設定", ariaLabelEn: "Close poster editor" },
  {
    selector: "#poster-frame-stage",
    titleZh: "可直接拖曳圖片檔案到此處匯入",
    titleEn: "Drag and drop an image file here"
  },
  { selector: "#poster-crop-canvas", ariaLabelZh: "掛畫預覽與裁切框", ariaLabelEn: "Poster preview and crop frame" },
  { selector: "#poster-pick-btn", zh: "📂 匯入照片", en: "📂 Choose Photo" },
  {
    selector: "#poster-upload-hint",
    zh: "支援拖曳照片到畫框，拖曳畫面與滑桿裁切（11:15 直幅）",
    en: "Drag & drop an image, pan and zoom to crop (11:15 portrait)"
  },
  { selector: "#poster-zoom-label-text", zh: "縮放", en: "Zoom" },
  { selector: "#poster-rotate-btn", zh: "↻ 旋轉 90°", en: "↻ Rotate 90°" },
  { selector: "#poster-center-btn", zh: "置中重設", en: "Center Reset" },
  { selector: "#poster-reset-btn", zh: "🎨 取消照片／變回山水畫", en: "🎨 Reset to Default Art" },
  { selector: "#footer-close-poster-btn", zh: "取消", en: "Cancel" },
  { selector: "#poster-confirm-btn", zh: "✅ 確認掛上牆面", en: "✅ Hang on Wall" },

  // Finance dialog
  { selector: "#finance-dialog-title span", zh: "記帳", en: "Ledger" },
  { selector: "#close-finance-btn", ariaLabelZh: "關閉記帳", ariaLabelEn: "Close ledger" },
  { selector: "#finance-hero-card", ariaLabelZh: "每月房租固定預算與倒數", ariaLabelEn: "Monthly rent budget and countdown" },
  { selector: "#finance-landlord-note", ariaLabelZh: "房東來信小紙條", ariaLabelEn: "Landlord's note" },
  { selector: "#finance-kpi-grid", ariaLabelZh: "財務重點摘要", ariaLabelEn: "Financial summary" },
  { selector: "#finance-income-label", zh: "💵 本月總收入", en: "💵 Monthly Income" },
  { selector: "#finance-income-sub", zh: "接案驗收與獎金收入", en: "Commissions & bonus payouts" },
  { selector: "#finance-expense-label", zh: "💸 本月花費＋房租預算", en: "💸 Spending + Rent Budget" },
  { selector: "#finance-balance-label", zh: "💰 目前手上餘額", en: "💰 Current Balance" },
  { selector: "#finance-type-tabs", ariaLabelZh: "收支篩選", ariaLabelEn: "Filter transactions" },
  { selector: "#finance-month-select", ariaLabelZh: "篩選月份", ariaLabelEn: "Filter month" },
  { selector: "#footer-close-finance-btn", zh: "看完了", en: "Close" },

  // Onboarding
  {
    selector: "#onboarding-subtitle",
    zh: "在入住單人租屋處之前，幫這位靠畫畫接案維持生活的主角取個名字並設定外觀吧！\n角色造型可在日後繼續更改。",
    en: "Before moving into your studio apartment, name and customize your freelance illustrator!\nYou can continue changing your character's look later."
  },
  { selector: "#onboarding-preview-aside", ariaLabelZh: "角色即時 3D 預覽", ariaLabelEn: "Live 3D character preview" },
  { selector: "#onboarding-drag-hint", zh: "↔ 左右拖曳檢視", en: "↔ Drag left/right to rotate" },
  {
    selector: "#avatar-name-label",
    zh: "角色名稱（中／英文皆可，最多 8 字元）",
    en: "Character Name (up to 8 characters)"
  },
  { selector: "#avatar-name-input", placeholderZh: "例如：阿維、Vic", placeholderEn: "e.g. Vic, Mochi" },
  { selector: "#avatar-name-error", zh: "錯誤：請輸入 1 到 8 個字元的角色名稱。", en: "Error: Enter a name between 1 and 8 characters." },
  { selector: "#avatar-build-label", zh: "身形輪廓特徵", en: "Body Build" },
  { selector: "#avatar-skin-label", zh: "膚色", en: "Skin Tone" },
  { selector: "#avatar-hairstyle-label", zh: "髮型", en: "Hairstyle" },
  { selector: "#avatar-haircolor-label", zh: "髮色", en: "Hair Color" },
  { selector: "#avatar-outfit-label", zh: "居家上衣配色", en: "Top Color" },
  { selector: "#cancel-avatar-edit-btn", zh: "取消返回房間", en: "Cancel & Back to Studio" },

  // Room view HUD & controls
  { selector: "#room-view", ariaLabelZh: "接案繪師單人租屋處", ariaLabelEn: "Freelance Illustrator Studio Apartment" },
  {
    selector: "#room-spectate-badge",
    zh: "👁️ 參觀中",
    en: "👁️ Spectating",
    titleZh: "唯讀參觀模式，對方不會收到任何通知",
    titleEn: "Read-only spectate mode; the resident is not notified"
  },
  { selector: "#spectate-prev-btn", ariaLabelZh: "上一位玩家房間", ariaLabelEn: "Previous studio", titleZh: "上一位玩家", titleEn: "Previous" },
  { selector: "#spectate-student-select", ariaLabelZh: "切換要參觀的玩家房間", ariaLabelEn: "Switch studio to spectate" },
  { selector: "#spectate-next-btn", ariaLabelZh: "下一位玩家房間", ariaLabelEn: "Next studio", titleZh: "下一位玩家", titleEn: "Next" },
  {
    selector: "#spectate-exit-btn",
    zh: "🏠 回自己房間",
    en: "🏠 My Studio",
    titleZh: "回到自己的房間",
    titleEn: "Return to your own studio"
  },
  { selector: "#room-rot-left-btn", ariaLabelZh: "向左旋轉 90 度", ariaLabelEn: "Rotate camera 90° left" },
  { selector: "#room-rot-right-btn", ariaLabelZh: "向右旋轉 90 度", ariaLabelEn: "Rotate camera 90° right" },
  { selector: "#room-edit-toolbar", ariaLabelZh: "家具網格編輯工具列", ariaLabelEn: "Furniture grid edit toolbar" },
  { selector: "#edit-rotate-left-btn", zh: "↺ 左轉 (←)", en: "↺ Left (←)", titleZh: "向左轉 90° (快捷鍵 ←)", titleEn: "Rotate 90° left (←)" },
  { selector: "#edit-rotate-right-btn", zh: "↻ 右轉 (→)", en: "↻ Right (→)", titleZh: "向右轉 90° (快捷鍵 →)", titleEn: "Rotate 90° right (→)" },
  { selector: "#edit-confirm-item-btn", zh: "✓ 確認放置", en: "✓ Place Here" },
  { selector: "#edit-cancel-item-btn", zh: "✕ 取消", en: "✕ Cancel" },
  { selector: "#room-finance-label", zh: "記帳", en: "Ledger" },
  {
    selector: "#room-tv-remote",
    ariaLabelZh: "房間電視遙控器",
    ariaLabelEn: "Studio TV remote"
  },
  { selector: "#room-tv-shuffle-btn", ariaLabelZh: "隨機換台", ariaLabelEn: "Shuffle TV channel", titleZh: "隨機換台", titleEn: "Shuffle" },
  { selector: "#room-tv-expand-btn", ariaLabelZh: "放大觀看電視", ariaLabelEn: "Expand TV player", titleZh: "放大觀看", titleEn: "Expand" },
  { selector: "#room-tv-power-btn", ariaLabelZh: "關閉房間電視", ariaLabelEn: "Power off studio TV", titleZh: "關掉電視", titleEn: "Power Off" },
  {
    selector: "#room-visit-others-btn",
    ariaLabelZh: "悄悄參觀其他玩家房間",
    ariaLabelEn: "Spectate other studios",
    titleZh: "悄悄參觀其他玩家房間（僅管理員可見）",
    titleEn: "Spectate other studios (admin only)"
  },
  { selector: "#room-shop-btn", ariaLabelZh: "生活商店", ariaLabelEn: "Studio Shop", titleZh: "生活商店", titleEn: "Studio Shop" },
  {
    selector: "#room-zoom-toggle-btn",
    ariaLabelZh: "調整房間檢視比例（自由縮放）",
    ariaLabelEn: "Adjust room zoom scale",
    titleZh: "自由縮放檢視房間",
    titleEn: "Zoom Room View"
  },
  { selector: "#room-zoom-panel", ariaLabelZh: "房間檢視縮放控制", ariaLabelEn: "Room zoom controls" },
  { selector: "#room-zoom-out-btn", ariaLabelZh: "縮小房間檢視", ariaLabelEn: "Zoom out", titleZh: "縮小檢視", titleEn: "Zoom Out" },
  { selector: "#room-zoom-slider", ariaLabelZh: "房間縮放比例（%）", ariaLabelEn: "Room zoom scale (%)" },
  { selector: "#room-zoom-in-btn", ariaLabelZh: "放大房間檢視", ariaLabelEn: "Zoom in", titleZh: "放大檢視", titleEn: "Zoom In" },
  { selector: "#room-zoom-reset-btn", titleZh: "重設為 100% 預設比例", titleEn: "Reset to 100%" },
  { selector: "#room-edit-layout-btn", ariaLabelZh: "編輯家具位置", ariaLabelEn: "Edit furniture layout" },
  { selector: "#room-edit-avatar-btn", ariaLabelZh: "調整角色外觀", ariaLabelEn: "Customize character", titleZh: "調整角色外觀", titleEn: "Customize Character" },
  { selector: "#room-story-banner", ariaLabelZh: "接案繪師開場故事背景", ariaLabelEn: "Studio intro story" },
  { selector: "#room-story-skip-btn", zh: "跳過", en: "Skip" },

  // Home work desktop & lesson view
  { selector: "#home-page-title", zh: "接案工作台（英語任務）", en: "Freelance Desk (English Quests)" },
  { selector: "#link-ielts-sheet-btn", zh: "🔗 連結 IELTS 試算表", en: "🔗 Link IELTS Sheet", titleZh: "連結獨立存放 IELTS 考古題的 Google 試算表 ID", titleEn: "Link external Google Sheet ID for IELTS practice bank" },
  { selector: "#track-chooser-title", zh: "選擇題庫", en: "Select Question Bank" },
  { selector: "#close-track-chooser-btn", ariaLabelZh: "關閉選擇視窗", ariaLabelEn: "Close track chooser" },
  { selector: "#track-chooser-subtitle", zh: "請選擇要開啟的工作題庫：", en: "Choose a question bank to open:" },
  { selector: "#choose-track-student-btn .track-choice-text strong", zh: "學生英文課程", en: "Student Curriculum" },
  { selector: "#choose-track-student-btn .track-choice-text span", zh: "單元任務、單字與聽讀測驗", en: "Unit quests, vocabulary & quizzes" },
  { selector: "#choose-track-ielts-btn .track-choice-text strong", zh: "IELTS General Reading", en: "IELTS General Reading" },
  { selector: "#choose-track-ielts-btn .track-choice-text span", zh: "雅思考古閱讀測驗", en: "General Training reading mock tests" },
  { selector: "#map-back-room-btn", zh: "🏠 離開電腦回到租屋處", en: "🏠 Leave Desk & Back to Studio" },
  { selector: "#home-xp-banner", ariaLabelZh: "繪師聲望與經驗值進度", ariaLabelEn: "Artist reputation & XP progress" },
  { selector: "#quiz-progress-track", ariaLabelZh: "測驗進度", ariaLabelEn: "Quiz progress" },
  { selector: "#reset-quiz-btn", zh: "重新作答", en: "Reset Quiz" },
  { selector: "#toast-region", ariaLabelZh: "通知中心", ariaLabelEn: "Notifications" },
  { selector: "#rankup-toast-close-btn", ariaLabelZh: "關閉升級通知", ariaLabelEn: "Close rank-up notification" },
  { selector: "#reading-vocab-popover", ariaLabelZh: "單字解釋卡片", ariaLabelEn: "Vocabulary card" }
];

export function applyStaticDomTranslations(root = typeof document !== "undefined" ? document : null) {
  if (!root) return;
  const en = isEn();
  applyDocumentLangAttribute(en ? "en" : "zh-Hant");

  for (const entry of STATIC_DOM_TRANSLATIONS) {
    const els = entry.all
      ? Array.from(root.querySelectorAll(entry.selector))
      : [root.querySelector(entry.selector)].filter(Boolean);
    for (const el of els) {
      if ("zh" in entry && "en" in entry) {
        el.textContent = en ? entry.en : entry.zh;
      }
      if ("titleZh" in entry && "titleEn" in entry) {
        el.title = en ? entry.titleEn : entry.titleZh;
      }
      if ("ariaLabelZh" in entry && "ariaLabelEn" in entry) {
        el.setAttribute("aria-label", en ? entry.ariaLabelEn : entry.ariaLabelZh);
      }
      if ("placeholderZh" in entry && "placeholderEn" in entry) {
        el.setAttribute("placeholder", en ? entry.placeholderEn : entry.placeholderZh);
      }
    }
  }

  // Sync auth-view quick language toggle pill if present
  const authLangBtn = root.getElementById?.("auth-lang-toggle-btn");
  if (authLangBtn) {
    authLangBtn.textContent = en ? "🌐 繁體中文" : "🌐 English";
    authLangBtn.setAttribute("aria-label", en ? "Switch to Traditional Chinese" : "切換為英文介面");
  }

  // Sync settings radio selection if present
  const checkedRadio = root.querySelector?.(`input[name="uiLanguage"][value="${en ? "en" : "zh-Hant"}"]`);
  if (checkedRadio) checkedRadio.checked = true;
}

export function setUiLanguage(lang) {
  const normalized = normalizeUiLanguage(lang);
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(LANG_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage unavailability
    }
  }
  applyDocumentLangAttribute(normalized);
  if (typeof window !== "undefined") {
    applyStaticDomTranslations(document);
    window.dispatchEvent(new CustomEvent("ui-language-change", { detail: { lang: normalized } }));
  }
  return normalized;
}
