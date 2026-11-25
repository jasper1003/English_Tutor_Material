import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  linkWithCredential,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  FreelancerRoomScene,
  AvatarPreviewScene,
  SKIN_TONES,
  BODY_BUILDS,
  HAIR_STYLES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  DEFAULT_AVATAR
} from "./room-scene.js?v=20261125k";
import {
  SHOP_CATEGORIES,
  SHOP_CATALOG,
  DEFAULT_WALL_COLOR,
  DEFAULT_FLOOR_STYLE,
  DEFAULT_DESK_STYLE,
  DEFAULT_BED_SHEET,
  DEFAULT_RUG_STYLE,
  DEFAULT_SHIRT_STYLE,
  DEFAULT_PANTS_STYLE,
  DESK_STYLE_PRESETS,
  BED_SHEET_PRESETS,
  RUG_STYLE_PRESETS,
  SHIRT_STYLE_PRESETS,
  PANTS_STYLE_PRESETS,
  applyRemoteShopConfig,
  getShopCategoryLabel,
  getShopItem,
  getShopItemName,
  getShopItemDesc,
  getMissingShopPrerequisites,
  isSellableShopItem,
  getBlockingDependentOwnedItems,
  normalizeOwnedItems
} from "./shop-catalog.js?v=20261125k";
import {
  PLACEABLE_FURNITURE_META,
  getCompanionPlaceableIds,
  isShopParcelItem,
  computeRoomGridStats,
  checkShopItemGridAvailability,
  normalizePendingParcels
} from "./room-grid.js?v=20261125k";
import {
  DEFAULT_TV_CHANNEL_VIDEOS,
  XP_RANK_LADDER,
  buildCharacterPersona,
  calculateShopPurchaseXp,
  calculateShopResalePrice,
  evaluateProfileRentMood,
  isLessonCompletedFromMaps,
  parseYouTubeVideoId,
  resolveXpProgress,
  sanitizeBoolMap,
  getMonthKey,
  getNextMonthFirstEpoch,
  speakWord,
  launchConfetti,
  launchFullCelebration,
  isSafeImageUrl,
  escapeHtml,
  showFeedback,
  clearFeedback,
  translateAuthError,
  normalizeSavedNavState,
  resolveQuestProgressTargetIndex,
  evaluateSubmissionMetrics,
  formatExamDuration,
  gradeIeltsExam
} from "./app-helpers.js?v=20261125k";
import { createPosterCustomizer } from "./poster-editor.js?v=20261125k";
import { renderInteractiveReadingPassage, clearReadingScaffold } from "./reading-scaffold.js?v=20261125k";
import {
  isEn,
  bi,
  getUiLanguage,
  setUiLanguage,
  applyStaticDomTranslations
} from "./i18n.js?v=20261125k";

applyStaticDomTranslations();

if (window.location.search) {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("date");
  window.history.replaceState({}, "", cleanUrl);
}

const firebaseConfig = {
  projectId: "tutor-material-automation",
  appId: "1:866845120684:web:cbc6325c58e0bbae2c6709",
  storageBucket: "tutor-material-automation.firebasestorage.app",
  apiKey: "AIzaSyAR06eOPaJrD4MhYIRJki_KE01yiDQSUHA",
  authDomain: "tutor-material-automation.firebaseapp.com",
  messagingSenderId: "866845120684",
  measurementId: "G-N0R0TQVNJV"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestoreDb = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const SUPER_ADMIN_EMAIL = "jasper931003@gmail.com";
const SPREADSHEET_ID = "1DrKwyy-L9g_nHFBFJ0joLfsDE64vBb1ymjtKiaNQJ5U";
let UNIT_REWARD_CLAMS = 200;
let STARTER_CLAMS = 100;
let MONTHLY_RENT_CLAMS = 100;
let DEFAULT_LESSON_XP = 40;
let XP_PER_LEVEL = 100;
let pendingThoughtRows = null;

let db = {
  lessons: [],
  vocab: [],
  quiz: []
};

let currentUser = null;
let currentRole = "student"; // "super_admin" | "admin" | "student"
let currentUserProfile = null;
let userCompletionOverrides = {};
let userSubmittedLessons = {};
let userApprovedLessons = {};
let userXpAwardedLessons = {};
let pendingSignUpName = "";
let authResolved = false;
let sheetsLoaded = false;
let sheetsDetailsLoaded = false;
let sheetsStage2Promise = null;
let sheetsError = null;
let authSessionNonce = 0;

let currentScreen = "loading"; // "auth" | "onboarding" | "room" | "desktop" | "lesson"
let activeLessonDate = null;
let activeLessonSyncCommission = null;
let pendingWorkCelebration = null; // null | "submitted" | "approved"
let lastKnownXpRankIndex = null;
let hasInitializedXpBaseline = false;
let pendingRankUpToast = null;
let rankUpToastTimer = null;
let toastPriorFocusEl = null;
let roomScene = null;
let avatarPreviewScene = null;
let isEditingAvatarFromRoom = false;
let activeTvVideo = null;
let tvPowerOffRequested = false;
let spectatingStudentUid = null;
const NAV_STATE_STORAGE_PREFIX = "studio_nav_state_v1:";
let isRestoringNavState = false;
let restoredNavSessionKey = "";
let pendingRestoreSpectateUid = null;
let activeWorkTrack = "student"; // "student" | "ielts"
let ieltsBank = { tests: [], questions: [], sourceKind: "bundled", sheetId: "", loaded: false };
let ieltsLoadPromise = null;
let ieltsModuleCache = null;

function isAdminRole() {
  return currentRole === "super_admin" || currentRole === "admin";
}

function isIeltsLessonId(id) {
  return String(id || "").startsWith("ielts:");
}

async function getIeltsModule() {
  if (!ieltsModuleCache) {
    ieltsModuleCache = await import("./ielts-exam.js?v=20261125k");
  }
  return ieltsModuleCache;
}

async function ensureIeltsBankLoaded({ force = false } = {}) {
  if (!isAdminRole()) return null;
  if (ieltsBank.loaded && !force) return ieltsBank;
  if (ieltsLoadPromise && !force) return ieltsLoadPromise;
  ieltsLoadPromise = (async () => {
    const mod = await getIeltsModule();
    const res = await mod.loadIeltsBank({
      fetchRawTabFn: (sid, tab, extra) => fetchRawSheetTabById(sid, tab, extra)
    });
    ieltsBank = {
      tests: res.tests || [],
      questions: res.questions || [],
      sourceKind: res.sourceKind || "bundled",
      sheetId: res.sheetId || "",
      loaded: true
    };
    return ieltsBank;
  })();
  try {
    return await ieltsLoadPromise;
  } finally {
    ieltsLoadPromise = null;
  }
}

function stopIeltsTimerIfLoaded() {
  try {
    ieltsModuleCache?.stopIeltsExamTimer?.();
  } catch {
    // Ignore timer cleanup errors
  }
}

function openTrackChooserDialog() {
  if (!isAdminRole()) {
    activeWorkTrack = "student";
    openWorkDesktop({ track: "student" });
    return;
  }
  const dlg = document.getElementById("track-chooser-dialog");
  if (!dlg) {
    openWorkDesktop({ track: activeWorkTrack });
    return;
  }
  if (!dlg.open) dlg.showModal();
  saveNavState();
}

async function enterWorkTrack(track) {
  const targetTrack = (track === "ielts" && isAdminRole()) ? "ielts" : "student";
  activeWorkTrack = targetTrack;
  const dlg = document.getElementById("track-chooser-dialog");
  if (dlg?.open) dlg.close();
  if (targetTrack === "ielts") {
    await ensureIeltsBankLoaded();
  }
  await openWorkDesktop({ track: targetTrack });
}

function findLessonAnyTrack(dateStr) {
  const stuMatch = db.lessons.find(l => l.Date === dateStr);
  if (stuMatch) return stuMatch;
  if (isIeltsLessonId(dateStr) && ieltsBank.loaded) {
    const t = ieltsBank.tests.find(x => x.Test_ID === dateStr);
    if (t) {
      return {
        ...t,
        Date: t.Test_ID,
        Grammar_Focus: t.Topics || "",
        XP: t.XP ?? 60
      };
    }
  }
  return null;
}

function getActiveOpenModalKey() {
  if (document.getElementById("shop-dialog")?.open) return "shop";
  if (document.getElementById("finance-dialog")?.open) return "finance";
  if (document.getElementById("settings-dialog")?.open) return "settings";
  if (document.getElementById("poster-dialog")?.open) return "poster";
  if (document.getElementById("tv-dialog")?.open) return "tv";
  if (document.getElementById("admin-review-dialog")?.open) return "adminReview";
  if (document.getElementById("track-chooser-dialog")?.open && isAdminRole()) return "trackChooser";
  return null;
}

function loadSavedNavState(uid) {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`${NAV_STATE_STORAGE_PREFIX}${uid}`);
    if (!raw) return null;
    return normalizeSavedNavState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveNavState() {
  if (isRestoringNavState || !currentUser?.uid) return;
  if (!["room", "desktop", "lesson", "onboarding"].includes(currentScreen)) return;
  if (currentScreen === "onboarding" && !isEditingAvatarFromRoom && !currentUserProfile?.avatar) {
    return;
  }
  const snapshot = {
    screen: currentScreen,
    lessonDate: currentScreen === "lesson" ? (activeLessonDate || null) : null,
    workTrack: isAdminRole() ? activeWorkTrack : "student",
    isEditingAvatar: currentScreen === "onboarding" ? Boolean(isEditingAvatarFromRoom) : false,
    modal: getActiveOpenModalKey(),
    shopCategory: activeShopCategory || "all",
    shopResellOnly: Boolean(shopResellFilterOnly),
    financeFilter: activeFinanceFilter || "all",
    financeMonth: activeFinanceMonth || "",
    spectatingUid: spectatingStudentUid || null,
    reviewStudentUid: document.getElementById("review-student-select")?.value || null,
    scrollY: (currentScreen === "lesson" || currentScreen === "desktop")
      ? Math.max(0, Math.round(window.scrollY || 0))
      : 0,
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(`${NAV_STATE_STORAGE_PREFIX}${currentUser.uid}`, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota or private mode issues
  }
}

function clearSavedNavState(uid) {
  if (!uid) return;
  try {
    localStorage.removeItem(`${NAV_STATE_STORAGE_PREFIX}${uid}`);
  } catch {
    // Ignore storage unavailability
  }
}

window.addEventListener("beforeunload", saveNavState);

function sync3dSceneLifecycle() {
  const blocked = document.hidden || Boolean(document.querySelector("dialog[open]"));
  if (roomScene) {
    if (currentScreen === "room" && !blocked) {
      roomScene.resume();
    } else {
      roomScene.pause();
    }
  }
  if (avatarPreviewScene) {
    if (currentScreen === "onboarding" && !blocked) {
      avatarPreviewScene.resume();
    } else {
      avatarPreviewScene.pause();
    }
  }
}

const SHEETS_FETCH_TIMEOUT_MS = 12000;
const SHEETS_FETCH_MAX_ATTEMPTS = 3;

async function fetchRawSheetTab(sheetName, extraParams = "") {
  return fetchRawSheetTabById(SPREADSHEET_ID, sheetName, extraParams);
}

async function fetchRawSheetTabById(sheetId, sheetName, extraParams = "") {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${extraParams}&sheet=${encodeURIComponent(sheetName)}`;
  let lastErr = null;
  let text = "";

  for (let attempt = 0; attempt < SHEETS_FETCH_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SHEETS_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const err = new Error(`無法讀取工作表：${sheetName} (HTTP ${res.status})`);
        if (!retryable || attempt === SHEETS_FETCH_MAX_ATTEMPTS - 1) throw err;
        lastErr = err;
      } else {
        text = await res.text();
        lastErr = null;
        break;
      }
    } catch (err) {
      lastErr = err?.name === "AbortError"
        ? new Error(`讀取工作表逾時：${sheetName}`)
        : err;
      if (attempt === SHEETS_FETCH_MAX_ATTEMPTS - 1) break;
    } finally {
      clearTimeout(timer);
    }
    const jitterMs = 350 * (attempt + 1) + Math.floor(Math.random() * 350);
    await new Promise(resolve => setTimeout(resolve, jitterMs));
  }

  if (lastErr) throw lastErr;
  const startIdx = text.indexOf("{");
  const endIdx = text.lastIndexOf("}");
  if (startIdx === -1 || endIdx <= startIdx) {
    throw new Error(`工作表 ${sheetName} 回傳格式異常`);
  }
  const jsonStr = text.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);

  if (data.status === "error") {
    throw new Error(`工作表 ${sheetName} 讀取錯誤：${data.errors.map(e => e.message).join(", ")}`);
  }

  let cols = data.table.cols.map(c => (c.label || "").trim());
  let rows = data.table.rows || [];

  if (cols.every(c => !c) && rows.length > 0) {
    const headerRow = rows[0]?.c || [];
    cols = cols.map((_, idx) => {
      const cell = headerRow[idx];
      if (!cell) return "";
      const val = (cell.f !== undefined && cell.f !== null) ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : "");
      return val.trim();
    });
    rows = rows.slice(1);
  }

  return rows.map(row => {
    const obj = {};
    cols.forEach((colName, idx) => {
      if (!colName) return;
      const cell = row.c[idx];
      let val = "";
      if (cell) {
        val = (cell.f !== undefined && cell.f !== null) ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : "");
      }
      obj[colName] = val.trim();
    });
    return obj;
  });
}

async function fetchSheetTab(sheetName) {
  const rows = await fetchRawSheetTab(sheetName, "&headers=1");
  return rows.filter(item => item.Date && item.Date !== "Date");
}

async function fetchOptionalSheetTab(sheetName) {
  try {
    return await fetchRawSheetTab(sheetName, "&headers=1");
  } catch {
    return [];
  }
}

const LOCKED_NODES_AHEAD = 4;
const WAVE_OFFSETS_PX = [0, -76, -108, -76, 0, 76, 108, 76];
let questResizeObserver = null;

function isLessonCompleted(dateStr) {
  return isLessonCompletedFromMaps(userApprovedLessons, userCompletionOverrides, dateStr);
}

function isLessonSubmitted(dateStr) {
  if (isLessonCompleted(dateStr)) return false;
  return Boolean(userSubmittedLessons[dateStr]);
}

function hasEarnedLessonXp(dateStr) {
  return Boolean(userXpAwardedLessons[dateStr]);
}

function getCompletedLessons(lessonsList = db.lessons) {
  const completed = new Set();
  (lessonsList || []).forEach(l => {
    const key = l?.Date || l?.Test_ID;
    if (key && isLessonCompleted(key)) {
      completed.add(key);
    }
  });
  return completed;
}

function getLessonXp(lesson) {
  if (!lesson) return DEFAULT_LESSON_XP;
  const raw = lesson.XP ?? lesson.xp;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return DEFAULT_LESSON_XP;
  }
  const parsed = Math.trunc(Number(raw));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10000 ? parsed : DEFAULT_LESSON_XP;
}

function getTotalEarnedXp() {
  return Math.max(0, Math.trunc(Number(currentUserProfile?.xp ?? 0)));
}

let rankUpToastWired = false;
function initRankUpToastEvents() {
  if (rankUpToastWired) return;
  rankUpToastWired = true;
  const toastEl = document.getElementById("rankup-toast");
  if (!toastEl) return;

  const scheduleHide = () => {
    clearTimeout(rankUpToastTimer);
    rankUpToastTimer = setTimeout(() => {
      const focusedInside = toastEl.contains(document.activeElement);
      if (!focusedInside && !toastEl.matches(":hover")) {
        dismissRankUpToast(false);
      }
    }, 6000);
  };

  toastEl.addEventListener("mouseenter", () => clearTimeout(rankUpToastTimer));
  toastEl.addEventListener("mouseleave", scheduleHide);
  toastEl.addEventListener("focusin", () => clearTimeout(rankUpToastTimer));
  toastEl.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!toastEl.contains(document.activeElement)) scheduleHide();
    }, 50);
  });
  toastEl.addEventListener("toggle", e => {
    if (e.newState === "closed") {
      clearTimeout(rankUpToastTimer);
      toastEl.classList.remove("is-open");
      if (toastPriorFocusEl && document.contains(toastPriorFocusEl)) {
        toastPriorFocusEl.focus({ preventScroll: true });
        toastPriorFocusEl = null;
      }
    }
  });

  document.querySelectorAll("dialog").forEach(dlg => {
    dlg.addEventListener("close", () => {
      setTimeout(flushPendingRankUpToast, 120);
    });
  });
}

function dismissRankUpToast(restoreFocus = false) {
  clearTimeout(rankUpToastTimer);
  const toastEl = document.getElementById("rankup-toast");
  if (!toastEl) return;
  const hadFocus = toastEl.contains(document.activeElement);
  if (typeof toastEl.hidePopover === "function") {
    try {
      if (toastEl.matches(":popover-open")) toastEl.hidePopover();
    } catch {
      toastEl.classList.remove("is-open");
    }
  } else {
    toastEl.classList.remove("is-open");
  }
  if ((restoreFocus || hadFocus) && toastPriorFocusEl && document.contains(toastPriorFocusEl)) {
    toastPriorFocusEl.focus({ preventScroll: true });
    toastPriorFocusEl = null;
  }
}

function showRankUpToast(prevProgress, nextProgress) {
  initRankUpToastEvents();
  if (document.querySelector("dialog[open]")) {
    pendingRankUpToast = { prevProgress, nextProgress };
    return;
  }
  const toastEl = document.getElementById("rankup-toast");
  const bodyEl = document.getElementById("rankup-toast-body");
  const liveEl = document.getElementById("toast-live-announcer");
  if (!toastEl || !bodyEl) return;

  toastPriorFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const prevTitle = prevProgress
    ? (isEn() ? (prevProgress.titleEn || prevProgress.title) : prevProgress.title)
    : "";
  const prevLabel = prevTitle ? `${prevTitle} → ` : "";
  bodyEl.innerHTML = `
    <div><strong>${escapeHtml(nextProgress.emblem)} ${bi("聲望晉升！", "Rank Up!")} ${escapeHtml(prevLabel)}Lv.${nextProgress.level}【${escapeHtml(nextProgress.title)}】</strong></div>
    <div>${escapeHtml(nextProgress.subtitle)}</div>
  `;

  if (typeof toastEl.showPopover === "function") {
    try {
      if (!toastEl.matches(":popover-open")) toastEl.showPopover();
    } catch {
      toastEl.classList.add("is-open");
    }
  } else {
    toastEl.classList.add("is-open");
  }

  const spokenText = isEn()
    ? `Artist rank up! Level ${nextProgress.level}, ${nextProgress.title}. ${nextProgress.subtitle}`
    : `繪師聲望升級，${nextProgress.level}級稱號，${nextProgress.title}。${nextProgress.subtitle}`;
  if (typeof navigator.ariaNotify === "function") {
    navigator.ariaNotify(spokenText);
  } else if (liveEl) {
    liveEl.textContent = spokenText;
  }

  clearTimeout(rankUpToastTimer);
  rankUpToastTimer = setTimeout(() => {
    if (!toastEl.contains(document.activeElement) && !toastEl.matches(":hover")) {
      dismissRankUpToast(false);
    }
  }, 6500);
}

function flushPendingRankUpToast() {
  if (!pendingRankUpToast || document.querySelector("dialog[open]")) return;
  const { prevProgress, nextProgress } = pendingRankUpToast;
  pendingRankUpToast = null;
  launchFullCelebration();
  showRankUpToast(prevProgress, nextProgress);
}

function syncXpProgressUI({ allowCelebrate = false, overrideXp = null } = {}) {
  initRankUpToastEvents();
  const isSpectatingPreview = overrideXp !== null;
  const totalXp = isSpectatingPreview
    ? Math.max(0, Math.trunc(Number(overrideXp) || 0))
    : getTotalEarnedXp();
  const progress = resolveXpProgress(totalXp, XP_PER_LEVEL);

  const roomEmblemEl = document.getElementById("room-xp-emblem");
  const roomLevelEl = document.getElementById("room-xp-level");
  const roomTitleEl = document.getElementById("room-xp-title");
  const roomNumEl = document.getElementById("room-xp-num");
  const roomSubEl = document.getElementById("room-xp-sub");
  const roomFillEl = document.getElementById("room-xp-fill");
  const roomPillEl = document.getElementById("room-xp-pill");

  if (roomEmblemEl) roomEmblemEl.textContent = progress.emblem;
  if (roomLevelEl) roomLevelEl.textContent = `Lv.${progress.level}`;
  if (roomTitleEl) roomTitleEl.textContent = progress.title;
  if (roomNumEl) roomNumEl.textContent = `${progress.xpIntoLevel}/${progress.xpPerLevel}`;
  if (roomSubEl) roomSubEl.textContent = progress.subtitle;
  if (roomFillEl) roomFillEl.style.width = `${progress.progressPct}%`;
  if (roomPillEl) {
    roomPillEl.title = bi(
      `累積 ${progress.totalXp} XP · ${progress.subtitle}（再 +${progress.xpToNextLevel} XP → Lv.${progress.level + 1} ${progress.nextTitle}）`,
      `Total ${progress.totalXp} XP · ${progress.subtitle} (+${progress.xpToNextLevel} XP → Lv.${progress.level + 1} ${progress.nextTitle})`
    );
  }

  const bannerEl = document.getElementById("home-xp-banner");
  if (bannerEl && !isSpectatingPreview) {
    const nextHint = progress.isMaxNamedRank && progress.level >= XP_RANK_LADDER.length
      ? bi(`總計 ${progress.totalXp} XP · 最高段位`, `Total ${progress.totalXp} XP · Max Rank`)
      : `→ Lv.${progress.level + 1} ${escapeHtml(progress.nextTitle)} (+${progress.xpToNextLevel} XP)`;
    bannerEl.innerHTML = `
      <div class="home-xp-rank-col">
        <div class="home-xp-emblem" aria-hidden="true">${escapeHtml(progress.emblem)}</div>
        <div>
          <div class="home-xp-title-row">
            <span class="home-xp-level-pill">Lv.${progress.level}</span>
            <strong class="home-xp-title-text">${escapeHtml(progress.title)}</strong>
          </div>
          <p class="home-xp-sub">${escapeHtml(progress.subtitle)}</p>
        </div>
      </div>
      <div class="home-xp-meter-col">
        <div class="home-xp-meter-meta">
          <span>${bi(`總計 ${progress.totalXp} XP`, `Total ${progress.totalXp} XP`)}</span>
          <span>${progress.xpIntoLevel}/${progress.xpPerLevel}</span>
        </div>
        <div class="home-xp-bar-track" role="progressbar" aria-label="${bi("繪師聲望升級進度", "Artist XP progress")}" aria-valuemin="0" aria-valuemax="${progress.xpPerLevel}" aria-valuenow="${progress.xpIntoLevel}">
          <div class="home-xp-bar-fill" style="width: ${progress.progressPct}%;"></div>
        </div>
        <div class="form-hint" style="margin: 0; font-size: 0.76rem;">${nextHint}</div>
      </div>
    `;
  }

  if (!isSpectatingPreview && currentUser && currentUserProfile && authResolved) {
    if (!hasInitializedXpBaseline) {
      hasInitializedXpBaseline = true;
      lastKnownXpRankIndex = progress.rankIndex;
    } else if (lastKnownXpRankIndex !== null && progress.rankIndex > lastKnownXpRankIndex) {
      const prevRank = XP_RANK_LADDER[lastKnownXpRankIndex] || null;
      lastKnownXpRankIndex = progress.rankIndex;
      if (allowCelebrate) {
        if (!document.querySelector("dialog[open]")) {
          launchFullCelebration();
        }
        showRankUpToast(prevRank, progress);
      }
    } else {
      lastKnownXpRankIndex = progress.rankIndex;
    }
  }

  return progress;
}

function sanitizeSubmissionMetricsMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) return {};
  const out = {};
  for (const [k, v] of Object.entries(rawMap)) {
    if (!k || !v || typeof v !== "object" || Array.isArray(v)) continue;
    const firstTryTotal = Math.max(0, Math.min(1000, Math.trunc(Number(v.firstTryTotal) || 0)));
    const firstTryCorrect = Math.max(0, Math.min(firstTryTotal, Math.trunc(Number(v.firstTryCorrect) || 0)));
    out[String(k).slice(0, 32)] = {
      firstTryCorrect,
      firstTryTotal,
      totalClicks: Math.max(0, Math.min(50000, Math.trunc(Number(v.totalClicks) || 0))),
      elapsedSec: Math.max(0, Math.min(86400, Math.trunc(Number(v.elapsedSec) || 0))),
      retryCount: Math.max(0, Math.min(1000, Math.trunc(Number(v.retryCount) || 0))),
      submittedAt: Math.max(0, Math.trunc(Number(v.submittedAt) || 0))
    };
  }
  return out;
}

async function setLessonSubmitted(dateStr, nextSubmitted) {
  if (!currentUser || isLessonCompleted(dateStr)) return { submitted: false, xpGranted: 0 };
  const targetSubmitted = Boolean(nextSubmitted);
  const metricSnapshot = targetSubmitted ? buildSubmissionMetricSnapshot(dateStr) : null;
  const userRef = doc(firestoreDb, "users", currentUser.uid);

  const result = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? (snap.data() || {}) : {};
    const submittedMap = sanitizeBoolMap(data.submittedLessons);
    const xpAwardedMap = sanitizeBoolMap(data.xpAwardedLessons);
    const metricsMap = sanitizeSubmissionMetricsMap(data.submissionMetrics);
    submittedMap[dateStr] = targetSubmitted;

    const patch = {
      submittedLessons: submittedMap,
      updatedAt: serverTimestamp()
    };

    if (targetSubmitted && metricSnapshot) {
      metricsMap[dateStr] = metricSnapshot;
      patch.submissionMetrics = metricsMap;
    }

    let xpGranted = 0;
    let nextXp = Math.max(0, Math.trunc(Number(data.xp ?? currentUserProfile?.xp ?? 0)));
    if (targetSubmitted && !xpAwardedMap[dateStr]) {
      const lessonMeta = findLessonAnyTrack(dateStr);
      const unitXp = Math.max(0, Math.min(1000, getLessonXp(lessonMeta)));
      if (unitXp > 0) {
        xpAwardedMap[dateStr] = true;
        nextXp = Math.min(10000000, nextXp + unitXp);
        xpGranted = unitXp;
        patch.xp = nextXp;
        patch.xpAwardedLessons = xpAwardedMap;
      }
    }

    tx.update(userRef, patch);
    return { submitted: targetSubmitted, submittedMap, xpAwardedMap, metricsMap, nextXp, xpGranted };
  });

  userSubmittedLessons = result.submittedMap;
  userXpAwardedLessons = result.xpAwardedMap;
  if (currentUserProfile) {
    currentUserProfile.submittedLessons = result.submittedMap;
    currentUserProfile.xpAwardedLessons = result.xpAwardedMap;
    currentUserProfile.submissionMetrics = result.metricsMap;
    currentUserProfile.xp = result.nextXp;
  }
  if (result.xpGranted > 0) {
    syncXpProgressUI({ allowCelebrate: true });
  }
  return result;
}

function getRoleLabel(role) {
  if (role === "super_admin") return bi("超級管理員", "Super Admin");
  if (role === "admin") return bi("管理員", "Admin");
  return bi("學生", "Student");
}

function getRoleBadgeClass(role) {
  if (role === "super_admin") return "role-badge is-super-admin";
  if (role === "admin") return "role-badge is-admin";
  return "role-badge is-student";
}

function formatDisplayName(user, profileData) {
  const fromProfile = (profileData?.displayName || "").trim();
  if (fromProfile) return fromProfile;
  const fromAuth = (user?.displayName || "").trim();
  if (fromAuth) return fromAuth;
  const email = (user?.email || "").trim();
  return email ? email.split("@")[0] : bi("使用者", "User");
}

async function resolveUserRole(user) {
  const emailLower = (user.email || "").trim().toLowerCase();
  if (!emailLower || !user.emailVerified) {
    return "student";
  }
  if (emailLower === SUPER_ADMIN_EMAIL) {
    return "super_admin";
  }
  try {
    const adminSnap = await getDoc(doc(firestoreDb, "admins", emailLower));
    return adminSnap.exists() ? "admin" : "student";
  } catch {
    return "student";
  }
}

function formatRentCountdown(msRemaining, compact = false) {
  if (msRemaining <= 0) {
    return compact
      ? bi("已到期", "Due")
      : bi(`已到期（應繳 ${MONTHLY_RENT_CLAMS} 英蚌）`, `Overdue (${MONTHLY_RENT_CLAMS} Clams due)`);
  }
  const days = Math.max(1, Math.ceil(msRemaining / 86400000));
  return compact
    ? bi(`剩 ${days} 天`, `${days}d left`)
    : bi(`${days} 天`, `${days} day(s)`);
}

function buildTransactionPayload(txData) {
  if (!txData) return null;
  const safeAmount = Math.trunc(Number(txData.amount) || 0);
  if (safeAmount === 0) return null;
  return {
    type: String(txData.type || (safeAmount > 0 ? "income" : "purchase")),
    category: String(txData.category || "decor"),
    title: String(txData.title || "帳務紀錄").slice(0, 120),
    amount: safeAmount,
    monthKey: String(txData.monthKey || getMonthKey()),
    createdAt: serverTimestamp()
  };
}

function queueLedgerTransaction(tx, targetUid, txData) {
  const payload = buildTransactionPayload(txData);
  if (!tx || !targetUid || !payload) return;
  const txRef = doc(collection(firestoreDb, "users", targetUid, "transactions"));
  tx.set(txRef, payload);
}

async function loadOrCreateUserProfile(user) {
  const userRef = doc(firestoreDb, "users", user.uid);
  const snap = await getDoc(userRef);
  const normalizedEmail = (user.email || "").trim().toLowerCase();

  if (snap.exists()) {
    const data = snap.data() || {};
    const migrationPatch = {};
    if (!("clams" in data)) migrationPatch.clams = STARTER_CLAMS;
    if (!("totalEarnedClams" in data)) migrationPatch.totalEarnedClams = 0;
    if (!("xp" in data)) migrationPatch.xp = 0;
    if (!("xpAwardedLessons" in data)) migrationPatch.xpAwardedLessons = {};
    if (!("approvedLessons" in data)) migrationPatch.approvedLessons = {};
    if (!("submittedLessons" in data)) migrationPatch.submittedLessons = {};
    if (!("roomState" in data) || !data.roomState) {
      migrationPatch.roomState = {
        cameraQuarter: 0,
        deskLampOn: true,
        bedLampOn: false,
        wallColor: "#f3eadc"
      };
    }
    if (!("nextRentDueAt" in data)) migrationPatch.nextRentDueAt = getNextMonthFirstEpoch();
    if (!("lastRentPaidMonth" in data)) migrationPatch.lastRentPaidMonth = "";

    if (Object.keys(migrationPatch).length > 0) {
      migrationPatch.updatedAt = serverTimestamp();
      await updateDoc(userRef, migrationPatch);
      Object.assign(data, migrationPatch);
    }

    return {
      data,
      overrides: sanitizeBoolMap(data.completionOverrides),
      submitted: sanitizeBoolMap(data.submittedLessons),
      approved: sanitizeBoolMap(data.approvedLessons),
      xpAwarded: sanitizeBoolMap(data.xpAwardedLessons)
    };
  }

  const initialName = (pendingSignUpName || user.displayName || normalizedEmail.split("@")[0] || "").trim().slice(0, 80);
  pendingSignUpName = "";
  const initialDoc = {
    email: normalizedEmail,
    displayName: initialName,
    completionOverrides: {},
    submittedLessons: {},
    approvedLessons: {},
    clams: STARTER_CLAMS,
    totalEarnedClams: 0,
    xp: 0,
    xpAwardedLessons: {},
    avatar: null,
    ownedItems: {},
    nextRentDueAt: getNextMonthFirstEpoch(),
    lastRentPaidMonth: "",
    roomState: {
      cameraQuarter: 0,
      deskLampOn: true,
      bedLampOn: false,
      wallColor: DEFAULT_WALL_COLOR,
      introStorySeen: false
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(userRef, initialDoc);
  return {
    data: { ...initialDoc, displayName: initialName },
    overrides: {},
    submitted: {},
    approved: {},
    xpAwarded: {}
  };
}

function updateHeaderAccountUI(user, role, displayName, clams = currentUserProfile?.clams ?? STARTER_CLAMS) {
  const accountEl = document.getElementById("header-account");
  const badgeEl = document.getElementById("header-role-badge");
  const nameEl = document.getElementById("header-user-name");
  const clamsEl = document.getElementById("header-clams-count");
  const walletChip = document.getElementById("header-wallet-chip");

  if (!user) {
    accountEl.classList.add("hidden");
    walletChip?.classList.remove("is-admin-action");
    return;
  }

  badgeEl.textContent = getRoleLabel(role);
  badgeEl.className = getRoleBadgeClass(role);
  nameEl.textContent = displayName || user.email || bi("帳號", "Account");
  clamsEl.textContent = role === "super_admin"
    ? "∞"
    : String(Math.max(0, Math.trunc(Number(clams ?? STARTER_CLAMS))));

  const isTeacher = role === "super_admin" || role === "admin";
  if (walletChip) {
    walletChip.classList.toggle("is-admin-action", isTeacher);
    walletChip.title = isTeacher
      ? bi("點擊開啟案主驗收與發款台", "Click to open Client Review & Payout Desk")
      : bi("目前持有的英蚌餘額", "Current Clam Balance");
    walletChip.setAttribute("aria-label", isTeacher
      ? bi("開啟案主驗收與發款台", "Open Client Review & Payout Desk")
      : bi("目前持有的英蚌餘額", "Current Clam Balance"));
  }
  accountEl.classList.remove("hidden");
}

function hideAllPrimaryScreens() {
  if (roomScene?.editMode) {
    roomScene.exitFurnitureEditMode({ commit: true });
  }
  const zoomPanel = document.getElementById("room-zoom-panel");
  const zoomToggleBtn = document.getElementById("room-zoom-toggle-btn");
  if (zoomPanel) zoomPanel.classList.add("hidden");
  if (zoomToggleBtn) {
    zoomToggleBtn.classList.remove("is-active");
    zoomToggleBtn.setAttribute("aria-expanded", "false");
  }
  closeIntroStoryBanner({ markSeen: false });
  ["error-view", "auth-view", "onboarding-view", "room-view", "home-view", "lesson-view"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById("lesson-actions").style.display = "none";
  clearReadingScaffold();
  if (typeof stopRoomTvPlayback === "function" && currentScreen !== "room") {
    stopRoomTvPlayback();
  }
  roomScene?.pause();
  avatarPreviewScene?.pause();
}

function showOnboardingScreen(isEditing = false) {
  isEditingAvatarFromRoom = isEditing;
  currentScreen = "onboarding";
  hideAllPrimaryScreens();
  populateOnboardingForm(currentUserProfile?.avatar || null, isEditing);
  document.getElementById("onboarding-view").classList.remove("hidden");

  const stageEl = document.getElementById("avatar-preview-stage");
  const baseValues = readAvatarFormValues();
  const currentValues = {
    ...baseValues,
    shirtStyle: isEditing ? (currentUserProfile?.roomState?.shirtStyle || DEFAULT_SHIRT_STYLE) : DEFAULT_SHIRT_STYLE,
    pantsStyle: isEditing ? (currentUserProfile?.roomState?.pantsStyle || DEFAULT_PANTS_STYLE) : DEFAULT_PANTS_STYLE
  };
  if (!avatarPreviewScene) {
    avatarPreviewScene = new AvatarPreviewScene(stageEl, currentValues);
  } else {
    avatarPreviewScene.updateAvatar(currentValues);
  }
  sync3dSceneLifecycle();
  if (isEditing) saveNavState();
}

function syncEditModeToolbarUI(state = null) {
  const toolbar = document.getElementById("room-edit-toolbar");
  const layoutBtn = document.getElementById("room-edit-layout-btn");
  const statusEl = document.getElementById("room-edit-status-text");
  const actionsEl = document.getElementById("room-edit-actions");
  const confirmBtn = document.getElementById("edit-confirm-item-btn");
  const cancelBtn = document.getElementById("edit-cancel-item-btn");

  const active = Boolean(state?.active && !spectatingStudentUid);
  toolbar?.classList.toggle("hidden", !active);
  layoutBtn?.classList.toggle("is-active", active);
  if (layoutBtn) {
    layoutBtn.title = active
      ? bi("結束編輯家具擺設", "Finish Editing Layout")
      : bi("編輯家具擺設（網格移動與旋轉）", "Edit Furniture Layout (Grid Move & Rotate)");
  }
  if (active) {
    closeIntroStoryBanner({ markSeen: false });
  }
  if (!active) return;

  const hasSelected = Boolean(state?.selectedId);
  actionsEl?.classList.toggle("hidden", !hasSelected);
  if (confirmBtn) {
    confirmBtn.disabled = !state?.canPlace;
    confirmBtn.title = bi("確認將目前家具放置在此網格位置 (快捷鍵 Enter)", "Place furniture here (Enter)");
  }
  if (cancelBtn) {
    cancelBtn.title = state?.fromParcel
      ? bi("取消放置並放回門口紙箱 (快捷鍵 Esc)", "Cancel and return parcel to doorway (Esc)")
      : bi("取消修改，回到原本狀態 (快捷鍵 Esc)", "Cancel edit and revert (Esc)");
  }

  if (statusEl) {
    if (hasSelected) {
      const dimsNote = state.gridDims ? ` · ${state.gridDims}` : "";
      const validNote = state.canPlace
        ? bi("✅ 綠格可放置（拖曳改位置・按 ←/→ 旋轉）", "✅ Valid green cells (Drag to move · ←/→ to rotate)")
        : bi("⚠️ 空間衝突，拖曳至綠格或按 ←/→ 轉向", "⚠️ Blocked — drag to green cells or ←/→ to rotate");
      statusEl.textContent = `${state.fromParcel ? bi("📦 拆箱擺放", "📦 Unboxing") : bi("已選取", "Selected")}: ${state.selectedName}${dimsNote}（${validNote}）`;
    } else {
      statusEl.textContent = bi("點擊傢俱以編輯傢俱位置", "Click any furniture piece to move or rotate");
    }
  }
}

const INTRO_STORY_SEEN_KEY_PREFIX = "room_intro_story_seen_v1:";
let introStoryActive = false;
let introStoryPreviewMode = false;
let introStoryIndex = 0;
let introStorySteps = [];

function getLocalIntroStorySeen(uid) {
  if (!uid) return false;
  try {
    return localStorage.getItem(`${INTRO_STORY_SEEN_KEY_PREFIX}${uid}`) === "1";
  } catch {
    return false;
  }
}

function setLocalIntroStorySeen(uid, seen) {
  if (!uid) return;
  try {
    const key = `${INTRO_STORY_SEEN_KEY_PREFIX}${uid}`;
    if (seen) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // Ignore storage unavailability
  }
}

function buildIntroStorySteps(profile = currentUserProfile) {
  const artistName = String(profile?.avatar?.name || profile?.displayName || bi("你", "you")).trim() || bi("你", "you");
  const rentAmount = Math.max(1, Math.trunc(Number(MONTHLY_RENT_CLAMS || 300)));
  return [
    {
      speaker: bi("🏠 搬入第一天", "🏠 Moving-In Day"),
      text: bi(
        "總算搬進這間屬於自己的單人租屋處了！雖然家具還很陽春，但從今天開始，這裡就是你的接案小天地。",
        "You finally moved into your own studio apartment! The room is still simple, but starting today, this is your freelance art headquarters."
      )
    },
    {
      speaker: bi(`🎨 ${artistName}的獨白`, `🎨 ${artistName}'s Note`),
      text: bi(
        `作為剛起步的外包接案繪師，一個人在外租屋處處都要花錢——每個月還得準時繳 ${rentAmount} 英蚌房租。`,
        `Living on your own as a rookie freelance illustrator isn't cheap—every month, ${rentAmount} Clams of rent comes due like clockwork.`
      )
    },
    {
      speaker: bi(`🎨 ${artistName}的獨白`, `🎨 ${artistName}'s Note`),
      text: bi(
        "只要完成任務並通過驗收，就能賺進報酬「英蚌」與繪師聲望經驗。",
        "Finish quests and pass client review to earn Clams and XP."
      )
    },
    {
      speaker: bi("💻 準備開工", "💻 Time to Work"),
      text: bi(
        "房租、生活開銷和想添購的房間家具，全都要靠接案賺錢來支撐——現在就點擊房內的電腦桌，打開工作台開始接第一筆案子吧！",
        "Rent, daily bills, and dream studio upgrades all depend on your craft—click the desk computer anytime to open your quest board and take your first gig!"
      )
    }
  ];
}

function renderIntroStoryStep() {
  const step = introStorySteps[introStoryIndex];
  if (!step) return;
  const speakerEl = document.getElementById("room-story-speaker");
  const stepEl = document.getElementById("room-story-step");
  const textEl = document.getElementById("room-story-text");
  const dotsEl = document.getElementById("room-story-dots");
  const nextBtn = document.getElementById("room-story-next-btn");

  if (speakerEl) speakerEl.textContent = step.speaker;
  if (stepEl) stepEl.textContent = `${introStoryIndex + 1} / ${introStorySteps.length}`;
  if (textEl) textEl.textContent = step.text;
  if (dotsEl) {
    const dots = introStorySteps.map((_, idx) => {
      const dot = document.createElement("span");
      dot.className = `room-story-dot${idx === introStoryIndex ? " is-active" : ""}`;
      return dot;
    });
    dotsEl.replaceChildren(...dots);
  }
  if (nextBtn) {
    const isLast = introStoryIndex >= introStorySteps.length - 1;
    nextBtn.textContent = isLast
      ? bi("✓ 開始接案生活", "✓ Start Freelancing")
      : bi("下一步 ▸", "Next ▸");
  }
}

function openIntroStoryBanner({ preview = false, profile = currentUserProfile } = {}) {
  const banner = document.getElementById("room-story-banner");
  if (!banner) return;
  const zoomPanel = document.getElementById("room-zoom-panel");
  const zoomToggleBtn = document.getElementById("room-zoom-toggle-btn");
  if (zoomPanel) zoomPanel.classList.add("hidden");
  if (zoomToggleBtn) {
    zoomToggleBtn.classList.remove("is-active");
    zoomToggleBtn.setAttribute("aria-expanded", "false");
  }
  introStorySteps = buildIntroStorySteps(profile);
  introStoryActive = true;
  introStoryPreviewMode = Boolean(preview);
  introStoryIndex = 0;
  renderIntroStoryStep();
  banner.classList.remove("hidden");
}

function closeIntroStoryBanner({ markSeen = false } = {}) {
  const banner = document.getElementById("room-story-banner");
  const wasPreview = introStoryPreviewMode;
  introStoryActive = false;
  introStoryPreviewMode = false;
  introStoryIndex = 0;
  if (banner) banner.classList.add("hidden");

  if (markSeen && !wasPreview && currentUser && currentUserProfile && !spectatingStudentUid) {
    setLocalIntroStorySeen(currentUser.uid, true);
    persistRoomState({ introStorySeen: true });
  }
}

function advanceIntroStoryBanner() {
  if (!introStoryActive) return;
  if (introStoryIndex < introStorySteps.length - 1) {
    introStoryIndex += 1;
    renderIntroStoryStep();
  } else {
    closeIntroStoryBanner({ markSeen: true });
  }
}

function shouldAutoShowIntroStory() {
  if (!currentUser || !currentUserProfile) return false;
  if (currentScreen !== "room" || spectatingStudentUid || roomScene?.editMode) return false;
  if (!currentUserProfile.avatar) return false;
  if (currentUserProfile.roomState?.introStorySeen !== false) return false;
  if (getLocalIntroStorySeen(currentUser.uid)) return false;
  return true;
}

function maybeShowIntroStoryBanner() {
  if (shouldAutoShowIntroStory() && !introStoryActive) {
    openIntroStoryBanner({ preview: false, profile: currentUserProfile });
  }
}

const ROOM_ZOOM_STORAGE_KEY = "room_camera_zoom_v1";

function loadSavedCameraZoom() {
  try {
    const raw = Number(localStorage.getItem(ROOM_ZOOM_STORAGE_KEY));
    if (Number.isFinite(raw) && raw >= 0.6 && raw <= 2.2) return raw;
  } catch {
    // Ignore storage unavailability
  }
  return 1.0;
}

const ARC_LAMP_STORAGE_PREFIX = "room_arc_lamps_v1:";

function loadSavedArcLampStates(uid) {
  const defaults = {
    arc_lamp_brass: true,
    arc_lamp_black: true,
    lamp_paper_lantern: true,
    lamp_uplighter_duo: true,
    lamp_tripod_linen: true,
    lamp_globe_opal: true,
    lamp_edison_cage: true,
    lamp_mushroom_pleated: true
  };
  if (!uid) return defaults;
  try {
    const raw = localStorage.getItem(`${ARC_LAMP_STORAGE_PREFIX}${uid}`);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const out = { ...defaults };
    Object.keys(defaults).forEach(k => {
      if (typeof parsed?.[k] === "boolean") out[k] = parsed[k];
    });
    return out;
  } catch {
    return defaults;
  }
}

function saveArcLampState(uid, lampId, isOn) {
  if (!uid || !lampId) return;
  try {
    const prev = loadSavedArcLampStates(uid);
    prev[lampId] = Boolean(isOn);
    localStorage.setItem(`${ARC_LAMP_STORAGE_PREFIX}${uid}`, JSON.stringify(prev));
  } catch {
    // Ignore storage unavailability
  }
}

function saveCameraZoom(zoom) {
  try {
    localStorage.setItem(ROOM_ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Ignore storage unavailability
  }
}

function syncRoomZoomUI(zoom = null) {
  const val = Number.isFinite(Number(zoom))
    ? Number(zoom)
    : (roomScene?.getCameraZoom?.() ?? loadSavedCameraZoom());
  const clamped = Math.min(2.2, Math.max(0.6, Math.round(val * 100) / 100));
  const pct = Math.round(clamped * 100);
  const sliderEl = document.getElementById("room-zoom-slider");
  const resetBtn = document.getElementById("room-zoom-reset-btn");
  const outBtn = document.getElementById("room-zoom-out-btn");
  const inBtn = document.getElementById("room-zoom-in-btn");
  if (sliderEl) sliderEl.value = String(pct);
  if (resetBtn) resetBtn.textContent = `${pct}%`;
  if (outBtn) outBtn.disabled = clamped <= 0.601;
  if (inBtn) inBtn.disabled = clamped >= 2.199;
}

function syncRoomHUD() {
  const isSpectating = Boolean(spectatingStudentUid);
  const spectateBar = document.getElementById("room-spectate-bar");
  const visitOthersBtn = document.getElementById("room-visit-others-btn");
  const shopBtn = document.getElementById("room-shop-btn");
  const layoutBtn = document.getElementById("room-edit-layout-btn");
  const avatarBtn = document.getElementById("room-edit-avatar-btn");
  const financeBtn = document.getElementById("room-finance-btn");
  const isAdminUser = currentRole === "super_admin" || currentRole === "admin";

  spectateBar?.classList.toggle("hidden", !isSpectating);
  visitOthersBtn?.classList.toggle("hidden", isSpectating || !isAdminUser);
  shopBtn?.classList.toggle("hidden", isSpectating);
  layoutBtn?.classList.toggle("hidden", isSpectating);
  avatarBtn?.classList.toggle("hidden", isSpectating);
  financeBtn?.classList.toggle("hidden", isSpectating);
  if (isSpectating) {
    syncEditModeToolbarUI({ active: false });
  }

  if (isSpectating) {
    const stu = cachedStudents.find(s => s.uid === spectatingStudentUid);
    syncXpProgressUI({ allowCelebrate: false, overrideXp: stu?.xp ?? 0 });
  } else {
    syncXpProgressUI({ allowCelebrate: false });
  }
}

const ROOM_STATE_FLUSH_DELAY_MS = 380;
let pendingRoomStatePatch = null;
let roomStateFlushTimer = null;
let roomStateWriteChain = Promise.resolve(true);

function buildMergedRoomState(baseState, patch) {
  return {
    ...(baseState || {
      cameraQuarter: 0,
      deskLampOn: true,
      bedLampOn: false,
      wallColor: "#f3eadc"
    }),
    ...patch
  };
}

async function flushPendingRoomState() {
  if (roomStateFlushTimer) {
    clearTimeout(roomStateFlushTimer);
    roomStateFlushTimer = null;
  }
  const patch = pendingRoomStatePatch;
  pendingRoomStatePatch = null;
  if (!patch || !currentUser || !currentUserProfile || spectatingStudentUid) return true;

  const targetUid = currentUser.uid;
  const writePromise = roomStateWriteChain.then(async () => {
    if (!currentUser || currentUser.uid !== targetUid || spectatingStudentUid) return false;
    const latestState = buildMergedRoomState(currentUserProfile?.roomState, patch);
    if (currentUserProfile) currentUserProfile.roomState = latestState;
    try {
      await updateDoc(doc(firestoreDb, "users", targetUid), {
        roomState: latestState,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error("Failed to save roomState:", err);
      return false;
    }
  });
  roomStateWriteChain = writePromise.catch(() => false);
  return writePromise;
}

function persistRoomState(patch, { immediate = false } = {}) {
  if (!currentUser || !currentUserProfile || spectatingStudentUid) return Promise.resolve(false);
  pendingRoomStatePatch = {
    ...(pendingRoomStatePatch || {}),
    ...patch
  };
  currentUserProfile.roomState = buildMergedRoomState(currentUserProfile.roomState, patch);
  if (immediate || Object.prototype.hasOwnProperty.call(patch, "furnitureLayout") || Object.prototype.hasOwnProperty.call(patch, "pendingParcels")) {
    return flushPendingRoomState();
  }
  if (roomStateFlushTimer) clearTimeout(roomStateFlushTimer);
  roomStateFlushTimer = setTimeout(() => {
    flushPendingRoomState();
  }, ROOM_STATE_FLUSH_DELAY_MS);
  return Promise.resolve(true);
}

window.addEventListener("beforeunload", () => {
  if (pendingRoomStatePatch) {
    flushPendingRoomState();
  }
});

function applyProfileToRoomScene(profile, { fromWorkDesktop = false, preserveCamera = false } = {}) {
  const wrap = document.getElementById("room-canvas-wrap");
  const rs = profile?.roomState || {};
  const owned = normalizeOwnedItems(profile?.ownedItems);
  const avatarCfg = profile?.avatar || {
    ...DEFAULT_AVATAR,
    name: profile?.displayName || (profile?.email ? profile.email.split("@")[0] : bi("繪師", "Artist"))
  };
  const isSpectatingTarget = Boolean(spectatingStudentUid);
  const targetCharacterId = String(profile?.uid || currentUser?.uid || avatarCfg.name || "self").trim() || "self";
  const targetRole = isSpectatingTarget ? (profile?.role || "student") : currentRole;
  const rentMood = evaluateProfileRentMood(profile, targetRole, {
    monthlyRentClams: MONTHLY_RENT_CLAMS,
    starterClams: STARTER_CLAMS,
    monthKey: getMonthKey(),
    fallbackDueAt: getNextMonthFirstEpoch()
  });

  const pendingParcels = normalizePendingParcels(rs.pendingParcels, owned);
  const furnitureLayout = (rs.furnitureLayout && typeof rs.furnitureLayout === "object")
    ? { ...rs.furnitureLayout }
    : {};
  const arcLampStates = loadSavedArcLampStates(targetCharacterId);

  if (!roomScene) {
    roomScene = new FreelancerRoomScene(wrap, {
      characterId: targetCharacterId,
      spectating: isSpectatingTarget,
      avatar: avatarCfg,
      shirtStyle: rs.shirtStyle || DEFAULT_SHIRT_STYLE,
      pantsStyle: rs.pantsStyle || DEFAULT_PANTS_STYLE,
      cameraQuarter: Number.isInteger(rs.cameraQuarter) ? rs.cameraQuarter : 0,
      deskLampOn: typeof rs.deskLampOn === "boolean" ? rs.deskLampOn : true,
      bedLampOn: typeof rs.bedLampOn === "boolean" ? rs.bedLampOn : false,
      arcLampBrassOn: arcLampStates.arc_lamp_brass,
      arcLampBlackOn: arcLampStates.arc_lamp_black,
      floorLampStates: arcLampStates,
      vinylOn: typeof rs.vinylOn === "boolean" ? rs.vinylOn : false,
      wallColor: rs.wallColor || DEFAULT_WALL_COLOR,
      floorStyle: rs.floorStyle || DEFAULT_FLOOR_STYLE,
      deskStyle: getActiveRoomStyle(rs, "deskStyle", DEFAULT_DESK_STYLE),
      bedSheet: rs.bedSheet || DEFAULT_BED_SHEET,
      rugStyle: rs.rugStyle || DEFAULT_RUG_STYLE,
      posterImage: rs.posterImage || "",
      ownedItems: owned,
      furnitureLayout,
      pendingParcels,
      customThoughts: pendingThoughtRows,
      usesSharedTvIframe: true,
      onEnterWork: () => {
        if (spectatingStudentUid) return;
        if (isAdminRole()) {
          openTrackChooserDialog();
        } else {
          activeWorkTrack = "student";
          openWorkDesktop({ track: "student" });
        }
      },
      onLampToggle: (isOn) => {
        persistRoomState({ deskLampOn: isOn });
      },
      onBedLampToggle: (isOn) => {
        persistRoomState({ bedLampOn: isOn });
      },
      onArcLampToggle: (lampId, isOn) => {
        if (!spectatingStudentUid && currentUser?.uid) {
          saveArcLampState(currentUser.uid, lampId, isOn);
        }
      },
      onVinylToggle: (isOn) => {
        persistRoomState({ vinylOn: isOn });
      },
      onSaveLayout: ({ furnitureLayout: nextLayout, pendingParcels: nextParcels }) => {
        persistRoomState({
          furnitureLayout: nextLayout || {},
          pendingParcels: nextParcels || {}
        });
      },
      onEditModeChange: (editState) => {
        syncEditModeToolbarUI(editState);
      },
      cameraZoom: loadSavedCameraZoom(),
      onZoomChange: (zoom) => {
        saveCameraZoom(zoom);
        syncRoomZoomUI(zoom);
      },
      onOpenTv: () => {
        if (spectatingStudentUid) return;
        openTvPlayer();
      },
      onOpenPoster: () => {
        if (spectatingStudentUid) return;
        openPosterCustomizer();
      },
      onTimeUpdate: ({ clockText }) => {
        document.getElementById("room-clock-pill").textContent = `🕒 ${clockText}`;
      }
    });
    roomScene.setRentMood(rentMood, { silent: true });
  } else {
    roomScene.setCharacterProfileContext({
      characterId: targetCharacterId,
      avatar: avatarCfg,
      shirtStyle: rs.shirtStyle || DEFAULT_SHIRT_STYLE,
      pantsStyle: rs.pantsStyle || DEFAULT_PANTS_STYLE,
      ownedItems: owned,
      furnitureLayout,
      pendingParcels,
      customThoughts: pendingThoughtRows,
      spectating: isSpectatingTarget,
      rentMood
    });
    roomScene.setDeskLamp(typeof rs.deskLampOn === "boolean" ? rs.deskLampOn : true);
    roomScene.setBedLamp(typeof rs.bedLampOn === "boolean" ? rs.bedLampOn : false);
    roomScene.setArcLampBrass(arcLampStates.arc_lamp_brass);
    roomScene.setArcLampBlack(arcLampStates.arc_lamp_black);
    roomScene.setFloorLampStates?.(arcLampStates);
    roomScene.setVinylOn(typeof rs.vinylOn === "boolean" ? rs.vinylOn : false);
    roomScene.setWallColor(rs.wallColor || DEFAULT_WALL_COLOR);
    roomScene.setFloorStyle(rs.floorStyle || DEFAULT_FLOOR_STYLE);
    roomScene.setDeskStyle(getActiveRoomStyle(rs, "deskStyle", DEFAULT_DESK_STYLE));
    roomScene.setBedSheet(rs.bedSheet || DEFAULT_BED_SHEET);
    roomScene.setRugStyle(rs.rugStyle || DEFAULT_RUG_STYLE);
    roomScene.setPosterImage(rs.posterImage || "");
    if (!preserveCamera && Number.isInteger(rs.cameraQuarter)) {
      roomScene.setQuarter(rs.cameraQuarter);
    }
    const celebration = (!spectatingStudentUid && fromWorkDesktop) ? (pendingWorkCelebration || "none") : "none";
    if (!spectatingStudentUid && fromWorkDesktop) {
      pendingWorkCelebration = null;
      roomScene.returnFromWork(celebration);
    }
  }
}

function populateSpectateStudentSelect(selectedUid) {
  const selEl = document.getElementById("spectate-student-select");
  if (!selEl) return;
  const list = cachedStudents.filter(s => s.uid !== currentUser?.uid);
  const candidates = list.length > 0 ? list : cachedStudents;
  selEl.innerHTML = "";
  if (candidates.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = bi("尚無其他玩家帳號", "No other accounts yet");
    selEl.appendChild(opt);
    return;
  }
  candidates.forEach(stu => {
    const opt = document.createElement("option");
    opt.value = stu.uid;
    const labelName = stu.avatar?.name || stu.displayName || stu.email || bi("繪師", "Artist");
    const lv = resolveXpProgress(stu.xp ?? 0, XP_PER_LEVEL).level;
    const owned = normalizeOwnedItems(stu.ownedItems);
    const itemCount = Object.values(owned).filter(Boolean).length;
    const persona = buildCharacterPersona(stu.uid, stu.avatar || { name: labelName }, owned);
    opt.textContent = bi(
      `${labelName}（${persona.label}）· Lv.${lv} · ${itemCount}件`,
      `${labelName} (${persona.label}) · Lv.${lv} · ${itemCount} items`
    );
    selEl.appendChild(opt);
  });
  if (selectedUid && candidates.some(s => s.uid === selectedUid)) {
    selEl.value = selectedUid;
  }
}

function spectateStudentRoom(targetUid, { preserveCamera = false } = {}) {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  const targetStu = cachedStudents.find(s => s.uid === targetUid);
  if (!targetStu) return;

  if (adminReviewDialog.open) adminReviewDialog.close();
  stopRoomTvPlayback();
  spectatingStudentUid = targetStu.uid;

  currentScreen = "room";
  activeLessonDate = null;
  activeLessonSyncCommission = null;
  hideAllPrimaryScreens();
  document.getElementById("room-view").classList.remove("hidden");

  applyProfileToRoomScene(targetStu, { preserveCamera });
  populateSpectateStudentSelect(targetStu.uid);
  sync3dSceneLifecycle();
  syncRoomHUD();
  saveNavState();
}

function exitSpectateRoom() {
  spectatingStudentUid = null;
  enterRoomView(false);
}

function stopAllListeningAudio() {
  document.querySelectorAll(".listening-audio-el").forEach(audioEl => {
    try {
      if (!audioEl.paused) audioEl.pause();
    } catch {
      // Ignore media pause failure on detached elements
    }
  });
}

function enterRoomView(fromWorkDesktop = false) {
  spectatingStudentUid = null;
  if (!currentUser || !currentUserProfile?.avatar) {
    if (currentUser) showOnboardingScreen(false);
    return;
  }

  stopAllListeningAudio();
  stopIeltsTimerIfLoaded();
  flushLessonActiveElapsedTime({ pause: true });
  currentScreen = "room";
  activeLessonDate = null;
  activeLessonSyncCommission = null;
  hideAllPrimaryScreens();
  const roomView = document.getElementById("room-view");
  roomView.classList.remove("hidden");

  applyProfileToRoomScene(currentUserProfile, { fromWorkDesktop });

  sync3dSceneLifecycle();
  syncRoomHUD();
  updateRentCountdownUI();
  maybeShowIntroStoryBanner();
  saveNavState();
}

const LAST_VISITED_LESSON_STORAGE_PREFIX = "quest_last_lesson_v1:";

function saveLastVisitedLessonDate(dateStr) {
  if (!currentUser?.uid || !dateStr) return;
  try {
    localStorage.setItem(`${LAST_VISITED_LESSON_STORAGE_PREFIX}${currentUser.uid}`, String(dateStr));
  } catch {
    // Ignore storage quota or private mode issues
  }
}

function loadLastVisitedLessonDate() {
  if (!currentUser?.uid) return "";
  try {
    return localStorage.getItem(`${LAST_VISITED_LESSON_STORAGE_PREFIX}${currentUser.uid}`) || "";
  } catch {
    return "";
  }
}

function resolveHomeQuestProgressIndex(completedSet) {
  return resolveQuestProgressTargetIndex({
    lessons: db.lessons,
    completedDates: completedSet,
    isSubmittedFn: isLessonSubmitted,
    hasEarnedXpFn: hasEarnedLessonXp,
    hasSavedAnswersFn: (dateStr) => Object.keys(loadSavedQuizAnswers(dateStr)).length > 0,
    lastVisitedDate: loadLastVisitedLessonDate(),
    role: currentRole,
    totalXp: currentUserProfile?.xp ?? 0,
    defaultLessonXp: DEFAULT_LESSON_XP
  });
}

function scrollQuestStepIntoCenter(stepEl) {
  if (!stepEl) return;
  const rect = stepEl.getBoundingClientRect();
  const headerEl = document.querySelector(".header");
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
  const availableHeight = Math.max(240, window.innerHeight - headerHeight);
  const targetTop = Math.max(
    0,
    Math.round(window.scrollY + rect.top - headerHeight - (availableHeight - rect.height) / 2)
  );
  window.scrollTo({ top: targetTop, behavior: "auto" });
}

async function openWorkDesktop({ restoreScrollY = null, track = null } = {}) {
  if (!currentUser || !sheetsLoaded) return;
  if (track === "ielts" || track === "student") {
    activeWorkTrack = (track === "ielts" && isAdminRole()) ? "ielts" : "student";
  } else if (activeWorkTrack === "ielts" && !isAdminRole()) {
    activeWorkTrack = "student";
  }
  if (activeWorkTrack === "ielts" && isAdminRole() && !ieltsBank.loaded) {
    await ensureIeltsBankLoaded();
  }
  stopAllListeningAudio();
  stopIeltsTimerIfLoaded();
  flushLessonActiveElapsedTime({ pause: true });
  currentScreen = "desktop";
  activeLessonDate = null;
  activeLessonSyncCommission = null;
  hideAllPrimaryScreens();
  const hasSavedScroll = Number.isFinite(restoreScrollY) && restoreScrollY > 0;
  renderHome({ scrollToLatest: !hasSavedScroll });
  if (hasSavedScroll) {
    requestAnimationFrame(() => window.scrollTo(0, restoreScrollY));
  }
  saveNavState();
}

async function openLesson(dateStr, { force = false, restoreScrollY = null } = {}) {
  if (!currentUser || !sheetsLoaded) return false;
  if (!force && currentScreen !== "desktop" && currentScreen !== "lesson") return false;

  if (isIeltsLessonId(dateStr)) {
    if (!isAdminRole()) {
      activeWorkTrack = "student";
      await openWorkDesktop({ track: "student" });
      return false;
    }
    activeWorkTrack = "ielts";
    await ensureIeltsBankLoaded();
    const ieltsTest = ieltsBank.tests.find(t => t.Test_ID === dateStr);
    if (!ieltsTest || String(ieltsTest.Ready || "").toUpperCase() !== "TRUE") {
      await openWorkDesktop({ track: "ielts" });
      return false;
    }
    currentScreen = "lesson";
    activeLessonDate = dateStr;
    saveLastVisitedLessonDate(dateStr);
    startOrResumeLessonTimer(dateStr);
    await renderLesson(dateStr);
    if (Number.isFinite(restoreScrollY) && restoreScrollY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, restoreScrollY));
    } else if (!force) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    saveNavState();
    return true;
  }

  activeWorkTrack = "student";
  const lesson = db.lessons.find(l => l.Date === dateStr);
  if (!lesson) {
    await openWorkDesktop({ track: "student" });
    return false;
  }
  if (!sheetsDetailsLoaded && sheetsStage2Promise) {
    try {
      await sheetsStage2Promise;
    } catch (err) {
      alert(bi(`無法載入單元單字與測驗資料：${err?.message || err}`, `Failed to load lesson vocabulary & quiz: ${err?.message || err}`));
      return false;
    }
  }
  currentScreen = "lesson";
  activeLessonDate = dateStr;
  saveLastVisitedLessonDate(dateStr);
  startOrResumeLessonTimer(dateStr);
  await renderLesson(dateStr);
  if (Number.isFinite(restoreScrollY) && restoreScrollY > 0) {
    requestAnimationFrame(() => window.scrollTo(0, restoreScrollY));
  } else if (!force) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  saveNavState();
  return true;
}

function restoreOpenModalFromNav(saved) {
  const owned = normalizeOwnedItems(currentUserProfile?.ownedItems);
  const modal = saved?.modal;
  if (!modal) return;
  if (modal === "shop") {
    pendingSellItemId = null;
    clearFeedback("shop-feedback");
    renderShopDialog();
    if (!shopDialog.open) shopDialog.showModal();
  } else if (modal === "finance") {
    clearFeedback("finance-feedback");
    renderFinanceDialog();
    if (!financeDialog.open) financeDialog.showModal();
    updateRentCountdownUI();
  } else if (modal === "settings") {
    populateSettingsDialog();
    if (!settingsDialog.open) settingsDialog.showModal();
  } else if (modal === "poster" && owned.wall_poster) {
    openPosterCustomizer();
  } else if (modal === "tv" && owned.wall_tv) {
    openTvModalPlayer();
  } else if (modal === "adminReview" && isAdminRole()) {
    if (!adminReviewDialog.open) adminReviewDialog.showModal();
    if (cachedStudents.length > 0) {
      syncCachedStudentsSnapshot(cachedStudents, saved.reviewStudentUid || null);
    }
    loadStudentsForReview(saved.reviewStudentUid || null);
  } else if (modal === "trackChooser" && isAdminRole()) {
    const dlg = document.getElementById("track-chooser-dialog");
    if (dlg && !dlg.open) dlg.showModal();
  }
}

async function restoreSavedNavStateOrDefault() {
  if (!currentUser?.uid) return;
  const sessionKey = `${currentUser.uid}:${authSessionNonce}`;
  if (restoredNavSessionKey === sessionKey) return;
  restoredNavSessionKey = sessionKey;

  const saved = loadSavedNavState(currentUser.uid);
  if (!saved) {
    enterRoomView(false);
    return;
  }

  isRestoringNavState = true;
  try {
    activeWorkTrack = (saved.workTrack === "ielts" && isAdminRole()) ? "ielts" : "student";
    if (SHOP_CATEGORIES.some(c => c.id === saved.shopCategory)) {
      activeShopCategory = saved.shopCategory;
    }
    shopResellFilterOnly = Boolean(saved.shopResellOnly);
    activeFinanceFilter = saved.financeFilter || "all";
    if (saved.financeMonth) {
      activeFinanceMonth = saved.financeMonth;
    }

    if (saved.screen === "lesson" && saved.lessonDate && isIeltsLessonId(saved.lessonDate)) {
      if (isAdminRole()) {
        await ensureIeltsBankLoaded();
        const readyMatch = ieltsBank.tests.some(
          t => t.Test_ID === saved.lessonDate && String(t.Ready || "").toUpperCase() === "TRUE"
        );
        if (readyMatch) {
          await openLesson(saved.lessonDate, { force: true, restoreScrollY: saved.scrollY });
        } else {
          await openWorkDesktop({ track: "ielts", restoreScrollY: saved.scrollY });
        }
      } else {
        activeWorkTrack = "student";
        enterRoomView(false);
      }
    } else if (saved.screen === "lesson" && saved.lessonDate && db.lessons.some(l => l.Date === saved.lessonDate)) {
      await openLesson(saved.lessonDate, { force: true, restoreScrollY: saved.scrollY });
    } else if (saved.screen === "desktop") {
      if (activeWorkTrack === "ielts" && isAdminRole()) {
        await ensureIeltsBankLoaded();
      }
      await openWorkDesktop({ track: activeWorkTrack, restoreScrollY: saved.scrollY });
    } else if (saved.screen === "onboarding" && saved.isEditingAvatar) {
      showOnboardingScreen(true);
    } else {
      enterRoomView(false);
      if (saved.spectatingUid && isAdminRole()) {
        if (cachedStudents.some(s => s.uid === saved.spectatingUid)) {
          spectateStudentRoom(saved.spectatingUid);
        } else {
          pendingRestoreSpectateUid = saved.spectatingUid;
        }
      }
    }
    restoreOpenModalFromNav(saved);
  } finally {
    isRestoringNavState = false;
    saveNavState();
  }
}

function renderAppState() {
  const loadingEl = document.getElementById("loading-view");
  const errorEl = document.getElementById("error-view");
  const authEl = document.getElementById("auth-view");

  if (!authResolved || (!sheetsLoaded && !sheetsError)) {
    loadingEl.classList.remove("hidden");
    return;
  }

  loadingEl.classList.add("hidden");

  if (!currentUser) {
    if (roomScene) {
      roomScene.dispose();
      roomScene = null;
    }
    if (avatarPreviewScene) {
      avatarPreviewScene.dispose();
      avatarPreviewScene = null;
    }
    hideAllPrimaryScreens();
    updateHeaderAccountUI(null);
    authEl.classList.remove("hidden");
    return;
  }

  authEl.classList.add("hidden");

  if (sheetsError) {
    hideAllPrimaryScreens();
    errorEl.textContent = bi(
      `載入失敗：${sheetsError.message}。請確認 Google 試算表已設為「知道連結的使用者皆可檢視」，且分頁名稱為 Lessons、Vocab、Quiz。`,
      `Load error: ${sheetsError.message}. Verify the Google Sheet is shared as "Anyone with the link can view" with tabs Lessons, Vocab, and Quiz.`
    );
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");

  // Strip legacy ?date=... params so the 3D apartment remains the sole gateway
  if (window.location.search) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = "";
    window.history.replaceState({}, "", cleanUrl);
  }

  if (!currentUserProfile?.avatar) {
    showOnboardingScreen(false);
  } else {
    restoreSavedNavStateOrDefault();
  }
}

function applyRemoteSettings(rows = []) {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const key = String(row?.key || "").trim();
    const val = Math.trunc(Number(row?.value));
    if (!key || !Number.isFinite(val)) continue;
    if (key === "unit_reward_clams" && val >= 1 && val <= 10000) {
      UNIT_REWARD_CLAMS = val;
    } else if (key === "starter_clams" && val >= 0 && val <= 1000) {
      STARTER_CLAMS = val;
    } else if (key === "monthly_rent_clams" && val >= 1 && val <= 10000) {
      MONTHLY_RENT_CLAMS = val;
    } else if (key === "default_lesson_xp" && val >= 0 && val <= 10000) {
      DEFAULT_LESSON_XP = val;
    } else if (key === "xp_per_level" && val >= 10 && val <= 10000) {
      XP_PER_LEVEL = val;
    }
  }
  const homeRewardHint = document.getElementById("home-reward-hint");
  if (homeRewardHint && activeWorkTrack !== "ielts") {
    homeRewardHint.textContent = bi(
      `完成任務即可自動獲得對應 XP；送交甲方老師驗收通過後，每單元再領 +${UNIT_REWARD_CLAMS} 英蚌報酬`,
      `Earn XP automatically as you finish quests, plus +${UNIT_REWARD_CLAMS} Clams after client review!`
    );
  }
  syncXpProgressUI({ allowCelebrate: false });
}

function applyRemoteTvVideos(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const list = [];
  for (const row of rows) {
    const rawId = String(row?.id || "").trim();
    const id = parseYouTubeVideoId(rawId) || rawId;
    const title = String(row?.title || "").trim();
    if (!id || !title || id.length > 32) continue;
    const enabledRaw = String(row?.enabled ?? "true").trim().toLowerCase();
    if (["false", "0", "no", "off", "停用"].includes(enabledRaw)) continue;
    list.push({
      id,
      title,
      author: String(row?.author || "").trim() || "YouTube"
    });
  }
  if (list.length > 0) {
    TV_CHANNEL_VIDEOS = list;
    if (typeof renderTvChannelList === "function" && tvDialog?.open) {
      renderTvChannelList();
    }
  }
}

const SHEETS_CACHE_KEY = `sheets_cache_v2:${SPREADSHEET_ID}`;
const SHEETS_FRESH_TTL_MS = 45000;
let latestSheetSnapshot = {
  lessons: [],
  vocab: [],
  quiz: [],
  shopRows: [],
  settingRows: [],
  tvRows: [],
  thoughtRows: []
};

function computeSheetStageDigest(parts) {
  try {
    return JSON.stringify(parts);
  } catch {
    return "";
  }
}

function readSheetsCache() {
  try {
    const raw = localStorage.getItem(SHEETS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.lessons) || parsed.lessons.length === 0) return null;
    if (!Array.isArray(parsed.vocab) || !Array.isArray(parsed.quiz)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSheetsCache(snapshot) {
  try {
    localStorage.setItem(SHEETS_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      ...snapshot
    }));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

function applySheetCore(lessons, shopRows, settingRows) {
  db.lessons = [...lessons].sort((a, b) => a.Date.localeCompare(b.Date));
  applyRemoteSettings(settingRows);
  applyRemoteShopConfig(shopRows);
  latestSheetSnapshot = { ...latestSheetSnapshot, lessons, shopRows, settingRows };
}

function applySheetDetails(vocab, quiz, tvRows, thoughtRows) {
  db.vocab = vocab;
  db.quiz = quiz;
  applyRemoteTvVideos(tvRows);
  if (Array.isArray(thoughtRows) && thoughtRows.length > 0) {
    pendingThoughtRows = thoughtRows;
    roomScene?.applyCustomThoughts(thoughtRows);
  }
  latestSheetSnapshot = { ...latestSheetSnapshot, vocab, quiz, tvRows, thoughtRows };
}

function refreshLiveSheetViews() {
  updateRentCountdownUI();
  if (currentScreen === "desktop") renderHome();
  if (shopDialog?.open) renderShopDialog();
  if (financeDialog?.open) renderFinanceDialog();
}

async function loadSheets() {
  const cached = readSheetsCache();
  let prevCoreDigest = "";
  let prevDetailsDigest = "";
  if (cached) {
    applySheetCore(cached.lessons, cached.shopRows || [], cached.settingRows || []);
    applySheetDetails(cached.vocab, cached.quiz, cached.tvRows || [], cached.thoughtRows || []);
    prevCoreDigest = computeSheetStageDigest([cached.lessons, cached.shopRows || [], cached.settingRows || []]);
    prevDetailsDigest = computeSheetStageDigest([cached.vocab, cached.quiz, cached.tvRows || [], cached.thoughtRows || []]);
    sheetsLoaded = true;
    sheetsDetailsLoaded = true;
    sheetsError = null;
    renderAppState();

    const cacheAgeMs = Date.now() - Number(cached.ts || 0);
    if (Number.isFinite(cacheAgeMs) && cacheAgeMs >= 0 && cacheAgeMs < SHEETS_FRESH_TTL_MS) {
      sheetsStage2Promise = Promise.resolve();
      return;
    }
  }

  // Run Stage 1 (small metadata) before Stage 2 (vocab/quiz) so all users don't burst 7 concurrent Sheet calls at t=0
  const stage1Promise = Promise.all([
    fetchSheetTab("Lessons"),
    fetchOptionalSheetTab("Shop"),
    fetchOptionalSheetTab("Settings")
  ]);

  const stage2Promise = stage1Promise
    .catch(() => null)
    .then(() => Promise.all([
      fetchSheetTab("Vocab"),
      fetchSheetTab("Quiz"),
      fetchOptionalSheetTab("TV_Videos"),
      fetchOptionalSheetTab("Room_Thoughts")
    ]));
  sheetsStage2Promise = stage2Promise;

  try {
    const [lessons, shopRows, settingRows] = await stage1Promise;
    const wasLoaded = sheetsLoaded;
    const nextCoreDigest = computeSheetStageDigest([lessons, shopRows, settingRows]);
    if (!wasLoaded || nextCoreDigest !== prevCoreDigest) {
      applySheetCore(lessons, shopRows, settingRows);
      prevCoreDigest = nextCoreDigest;
      sheetsLoaded = true;
      sheetsError = null;
      if (!wasLoaded) {
        renderAppState();
      } else {
        refreshLiveSheetViews();
      }
    }
  } catch (err) {
    if (!sheetsLoaded) {
      sheetsError = err;
      renderAppState();
      return;
    }
    console.warn("Stage 1 sheet refresh failed (using cached data):", err?.message || err);
  }

  try {
    const [vocab, quiz, tvRows, thoughtRows] = await stage2Promise;
    const nextDetailsDigest = computeSheetStageDigest([vocab, quiz, tvRows, thoughtRows]);
    const detailsChanged = !sheetsDetailsLoaded || nextDetailsDigest !== prevDetailsDigest;
    applySheetDetails(vocab, quiz, tvRows, thoughtRows);
    sheetsDetailsLoaded = true;
    writeSheetsCache(latestSheetSnapshot);
    if (detailsChanged) {
      if (currentScreen === "desktop") {
        renderHome();
      } else if (currentScreen === "lesson" && activeLessonDate) {
        renderLesson(activeLessonDate);
      }
    }
  } catch (err) {
    if (!sheetsDetailsLoaded) {
      console.warn("Stage 2 sheet details failed:", err?.message || err);
      throw err;
    }
    console.warn("Stage 2 sheet refresh failed (using cached data):", err?.message || err);
  }
}

function drawQuestPath() {
  const mapEl = document.getElementById("quest-map");
  const svg = mapEl ? mapEl.querySelector(".map-path-svg") : null;
  if (!mapEl || !svg) return;

  const steps = Array.from(mapEl.querySelectorAll(".quest-step"));
  if (steps.length < 2) {
    svg.innerHTML = "";
    return;
  }

  const mapRect = mapEl.getBoundingClientRect();
  if (mapRect.width === 0 || mapRect.height === 0) return;

  svg.setAttribute("viewBox", `0 0 ${mapRect.width} ${mapRect.height}`);
  svg.style.inlineSize = `${mapRect.width}px`;
  svg.style.blockSize = `${mapRect.height}px`;

  const points = steps.map(step => {
    const circle = step.querySelector(".quest-node-circle");
    const r = circle.getBoundingClientRect();
    return {
      x: r.left - mapRect.left + r.width / 2,
      y: r.top - mapRect.top + r.height / 2,
      completed: step.classList.contains("is-completed"),
      locked: step.classList.contains("is-locked")
    };
  });

  const paths = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midY = (p1.y + p2.y) / 2;
    const d = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;

    let stroke = "var(--border-strong)";
    let width = 6;
    let dash = "";
    if (p1.completed && !p2.locked) {
      stroke = "#22c55e";
    } else if (p2.locked) {
      stroke = "var(--border-strong)";
      width = 5;
      dash = `stroke-dasharray="8 8"`;
    }

    paths.push(
      `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${dash} />`
    );
  }

  svg.innerHTML = paths.join("");
}

function buildUnlockedQuestStepElement({
  offsetX,
  unitLabel,
  circleText,
  badgeText,
  title,
  subtitle,
  metaHtml,
  isCompleted,
  isSubmitted,
  isCurrent,
  onOpen
}) {
  const step = document.createElement("div");
  step.className = `quest-step${isCompleted ? " is-completed" : isSubmitted ? " is-submitted" : ""}`;
  step.style.setProperty("--step-x", `${offsetX}px`);

  let circleIcon = circleText;
  if (isCompleted) {
    circleIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (isSubmitted) {
    circleIcon = "⏳";
  }

  const circleBtn = document.createElement("button");
  circleBtn.type = "button";
  circleBtn.className = `quest-node-circle${isCurrent ? " is-current" : ""}`;
  circleBtn.setAttribute("aria-label", `${unitLabel} ${title || ""}`);
  circleBtn.innerHTML = circleIcon;
  circleBtn.addEventListener("click", onOpen);

  const statusSuffix = isCompleted
    ? bi(" · 已驗收撥款", " · Approved & Paid")
    : isSubmitted
    ? bi(" · 待案主驗收", " · Pending Review")
    : "";

  const cardBtn = document.createElement("button");
  cardBtn.type = "button";
  cardBtn.className = "quest-node-card";
  cardBtn.style.textAlign = "center";
  cardBtn.innerHTML = `
    <div class="quest-node-top">
      <span class="quest-unit-tag">${escapeHtml(unitLabel)}${statusSuffix}</span>
      <span class="quest-node-date">${escapeHtml(badgeText)}</span>
    </div>
    <div class="quest-node-title">${escapeHtml(title || "Untitled Lesson")}</div>
    ${subtitle ? `<div class="quest-node-grammar">${escapeHtml(subtitle)}</div>` : ""}
    <div class="quest-node-meta">${metaHtml}</div>
  `;
  cardBtn.addEventListener("click", onOpen);

  step.append(circleBtn, cardBtn);
  return step;
}

function buildLockedQuestStepElement({ offsetX, fadeOpacity, labelText }) {
  const step = document.createElement("div");
  step.className = "quest-step is-locked";
  step.style.setProperty("--step-x", `${offsetX}px`);
  step.style.opacity = String(fadeOpacity);
  step.setAttribute("aria-disabled", "true");
  step.innerHTML = `
    <div class="quest-node-circle" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    </div>
    <div class="quest-node-card">
      <div class="quest-locked-label">${escapeHtml(labelText)}</div>
    </div>
  `;
  return step;
}

function renderHome({ scrollToLatest = false } = {}) {
  document.getElementById("lesson-view").classList.add("hidden");
  document.getElementById("lesson-actions").style.display = "none";
  const homeView = document.getElementById("home-view");
  const mapEl = document.getElementById("quest-map");
  mapEl.innerHTML = "";

  const isAdmin = isAdminRole();
  if (!isAdmin && activeWorkTrack === "ielts") {
    activeWorkTrack = "student";
  }

  const adminTrackControls = document.getElementById("admin-track-controls");
  const switchTrackBtn = document.getElementById("switch-work-track-btn");
  const linkIeltsSheetBtn = document.getElementById("link-ielts-sheet-btn");
  if (adminTrackControls) {
    adminTrackControls.classList.toggle("hidden", !isAdmin);
  }
  if (switchTrackBtn) {
    switchTrackBtn.textContent = activeWorkTrack === "ielts"
      ? bi("🔄 切回學生課程", "🔄 Student Track")
      : bi("📘 切換至雅思閱讀", "📘 IELTS GT Bank");
  }
  if (linkIeltsSheetBtn) {
    linkIeltsSheetBtn.classList.toggle("hidden", !(isAdmin && activeWorkTrack === "ielts"));
  }

  const pageTitleEl = document.getElementById("home-page-title");
  const homeHintEl = document.getElementById("home-reward-hint");
  syncXpProgressUI({ allowCelebrate: false });

  if (activeWorkTrack === "ielts") {
    if (pageTitleEl) {
      pageTitleEl.textContent = bi("IELTS General Reading 題庫", "IELTS General Reading Bank");
    }
    if (!ieltsBank.loaded) {
      mapEl.innerHTML = `<p style="color: var(--muted); text-align: center;">${bi("正在載入 IELTS General Reading 題庫…", "Loading IELTS General Reading bank…")}</p>`;
      homeView.classList.remove("hidden");
      ensureIeltsBankLoaded().then(() => {
        if (currentScreen === "desktop" && activeWorkTrack === "ielts") {
          renderHome({ scrollToLatest });
        }
      });
      return;
    }

    const ieltsItems = ieltsBank.tests.map(t => ({
      ...t,
      Date: t.Test_ID,
      Grammar_Focus: t.Topics || "",
      XP: t.XP ?? 60
    }));
    const readyItems = ieltsItems.filter(t => String(t.Ready).toUpperCase() === "TRUE");
    const completedSet = getCompletedLessons(readyItems);
    const completedRealCount = readyItems.filter(l => completedSet.has(l.Date)).length;
    document.getElementById("map-completed-count").textContent = bi(
      `已驗收 ${completedRealCount} / ${readyItems.length} 回`,
      `Approved: ${completedRealCount} / ${readyItems.length}`
    );

    if (homeHintEl) {
      const srcNote = ieltsBank.sourceKind === "google_sheet"
        ? bi(`已連結外部 Google Sheet · 第 1 批啟用 ${readyItems.length}/${ieltsItems.length} 回`, `Google Sheet synced · Batch 1: ${readyItems.length}/${ieltsItems.length} active`)
        : bi(`內建第 1 批（Test 1–${readyItems.length} 已啟用，共 ${ieltsItems.length} 回）· 內建碼表與 Gemini Prompt`, `Bundled Batch 1 (Tests 1–${readyItems.length} active of ${ieltsItems.length}) · Built-in stopwatch & Gemini prompt`);
      homeHintEl.textContent = `${srcNote} · +60 XP / +${UNIT_REWARD_CLAMS} ${bi("英蚌", "Clams")}`;
    }

    if (ieltsItems.length === 0) {
      mapEl.innerHTML = `<p style="color: var(--muted); text-align: center;">${bi("目前尚無 IELTS 測驗題庫資料。", "No IELTS tests available yet.")}</p>`;
      homeView.classList.remove("hidden");
      return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("map-path-svg");
    svg.setAttribute("aria-hidden", "true");
    mapEl.appendChild(svg);

    const targetReadyIdx = resolveQuestProgressTargetIndex({
      lessons: readyItems,
      completedDates: completedSet,
      isSubmittedFn: isLessonSubmitted,
      hasEarnedXpFn: hasEarnedLessonXp,
      hasSavedAnswersFn: (id) => Object.keys(loadSavedQuizAnswers(id)).length > 0,
      lastVisitedDate: loadLastVisitedLessonDate(),
      role: currentRole,
      totalXp: currentUserProfile?.xp ?? 0,
      defaultLessonXp: 60
    });
    const currentReadyId = readyItems[targetReadyIdx]?.Date || "";
    let currentProgressStep = null;
    let lastUnlockedStep = null;

    ieltsItems.forEach((item, idx) => {
      const num = item.Test_Num || idx + 1;
      const numLabel = String(num).padStart(2, "0");
      const unitLabel = `TEST ${numLabel}`;
      const offsetX = WAVE_OFFSETS_PX[idx % WAVE_OFFSETS_PX.length];
      const isReady = String(item.Ready).toUpperCase() === "TRUE";

      if (isReady) {
        const isCompleted = completedSet.has(item.Date);
        const isSubmitted = isLessonSubmitted(item.Date);
        const isCurrent = item.Date === currentReadyId;
        const lessonXp = getLessonXp(item);
        const xpAlreadyClaimed = hasEarnedLessonXp(item.Date);
        const xpBadgeHtml = isCompleted
          ? ""
          : xpAlreadyClaimed
          ? ` · <span class="quest-xp-pill">${bi("XP 已領 ✓", "XP Claimed ✓")}</span>`
          : ` · <span class="quest-xp-pill">+${lessonXp} XP</span>`;
        const metaHtml = `${bi("題數：40 題", "Questions: 40")}${xpBadgeHtml}${isCompleted ? "" : ` · <span class="quest-reward-pill">${bi(`報酬 +${UNIT_REWARD_CLAMS} 英蚌`, `Reward +${UNIT_REWARD_CLAMS} Clams`)}</span>`}`;

        const step = buildUnlockedQuestStepElement({
          offsetX,
          unitLabel,
          circleText: numLabel,
          badgeText: `GT-${numLabel}`,
          title: `IELTS GT Reading Test ${num}`,
          subtitle: "",
          metaHtml,
          isCompleted,
          isSubmitted,
          isCurrent,
          onOpen: () => openLesson(item.Date)
        });
        if (isCurrent) currentProgressStep = step;
        lastUnlockedStep = step;
        mapEl.appendChild(step);
      } else {
        const step = buildLockedQuestStepElement({
          offsetX,
          fadeOpacity: 0.56,
          labelText: `${unitLabel} · ${bi("待批次匯入", "Batch Pending")}`
        });
        mapEl.appendChild(step);
      }
    });

    homeView.classList.remove("hidden");
    requestAnimationFrame(() => {
      drawQuestPath();
      if (scrollToLatest) {
        const targetStep = currentProgressStep || lastUnlockedStep;
        if (targetStep) {
          scrollQuestStepIntoCenter(targetStep);
          saveNavState();
        }
      }
    });
    if (!questResizeObserver && "ResizeObserver" in window) {
      questResizeObserver = new ResizeObserver(() => drawQuestPath());
      questResizeObserver.observe(mapEl);
    }
    return;
  }

  // Default Student Curriculum Track
  if (pageTitleEl) {
    pageTitleEl.textContent = bi("接案工作台（英語任務）", "Freelance Desk (English Quests)");
  }
  const completedSet = getCompletedLessons();
  const completedRealCount = db.lessons.filter(l => completedSet.has(l.Date)).length;
  document.getElementById("map-completed-count").textContent = bi(`已驗收 ${completedRealCount} 關`, `Approved: ${completedRealCount}`);
  if (homeHintEl) {
    homeHintEl.textContent = bi(
      `完成任務即可自動獲得對應 XP；送交甲方老師驗收通過後，每單元再領 +${UNIT_REWARD_CLAMS} 英蚌報酬`,
      `Earn XP automatically as you finish quests, plus +${UNIT_REWARD_CLAMS} Clams after client review!`
    );
  }

  if (db.lessons.length === 0) {
    mapEl.innerHTML = `<p style="color: var(--muted); text-align: center;">${bi("目前試算表中尚無課程資料。", "No lessons available yet.")}</p>`;
    homeView.classList.remove("hidden");
    return;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("map-path-svg");
  svg.setAttribute("aria-hidden", "true");
  mapEl.appendChild(svg);

  const targetProgressIndex = resolveHomeQuestProgressIndex(completedSet);
  let currentProgressStep = null;
  let lastUnlockedStep = null;

  db.lessons.forEach((lesson, idx) => {
    const vocabCount = db.vocab.filter(v => v.Date === lesson.Date).length;
    const isCompleted = completedSet.has(lesson.Date);
    const isSubmitted = isLessonSubmitted(lesson.Date);
    const isCurrent = idx === targetProgressIndex;
    const unitLabel = `UNIT ${String(idx + 1).padStart(2, "0")}`;
    const offsetX = WAVE_OFFSETS_PX[idx % WAVE_OFFSETS_PX.length];
    const lessonXp = getLessonXp(lesson);
    const xpAlreadyClaimed = hasEarnedLessonXp(lesson.Date);
    const xpBadgeHtml = isCompleted
      ? ""
      : xpAlreadyClaimed
      ? ` · <span class="quest-xp-pill">${bi("XP 已領 ✓", "XP Claimed ✓")}</span>`
      : ` · <span class="quest-xp-pill">+${lessonXp} XP</span>`;
    const metaHtml = `${bi(`單字：${vocabCount} 個`, `Vocab: ${vocabCount}`)}${xpBadgeHtml}${isCompleted ? "" : ` · <span class="quest-reward-pill">${bi(`報酬 +${UNIT_REWARD_CLAMS} 英蚌`, `Reward +${UNIT_REWARD_CLAMS} Clams`)}</span>`}`;

    const step = buildUnlockedQuestStepElement({
      offsetX,
      unitLabel,
      circleText: String(idx + 1).padStart(2, "0"),
      badgeText: lesson.Date,
      title: lesson.Title || "Untitled Lesson",
      subtitle: lesson.Grammar_Focus || "",
      metaHtml,
      isCompleted,
      isSubmitted,
      isCurrent,
      onOpen: () => openLesson(lesson.Date)
    });
    if (isCurrent) currentProgressStep = step;
    lastUnlockedStep = step;
    mapEl.appendChild(step);
  });

  // 延伸未開放的鎖定關卡
  const totalVisibleSteps = Math.max(db.lessons.length + LOCKED_NODES_AHEAD, 6);
  const lockedCount = totalVisibleSteps - db.lessons.length;

  for (let j = 0; j < lockedCount; j++) {
    const idx = db.lessons.length + j;
    const unitLabel = `UNIT ${String(idx + 1).padStart(2, "0")}`;
    const step = buildLockedQuestStepElement({
      offsetX: WAVE_OFFSETS_PX[idx % WAVE_OFFSETS_PX.length],
      fadeOpacity: Math.max(0.45, 0.85 - j * 0.12),
      labelText: `${unitLabel} · ${bi("尚未發案解鎖", "Commission Locked")}`
    });
    mapEl.appendChild(step);
  }

  homeView.classList.remove("hidden");
  requestAnimationFrame(() => {
    drawQuestPath();
    if (scrollToLatest) {
      const targetStep = currentProgressStep || lastUnlockedStep;
      if (targetStep) {
        scrollQuestStepIntoCenter(targetStep);
        saveNavState();
      }
    }
  });

  if (!questResizeObserver && "ResizeObserver" in window) {
    questResizeObserver = new ResizeObserver(() => drawQuestPath());
    questResizeObserver.observe(mapEl);
  }
}

function getQuizTelemetryStorageKey(dateStr) {
  return `quiz_telemetry_v1:${currentUser?.uid || "anon"}:${dateStr}`;
}

function loadQuizTelemetry(dateStr) {
  const empty = { firstAnswers: {}, totalClicks: 0, elapsedMs: 0, retryCount: 0, updatedAt: 0 };
  if (!dateStr) return empty;
  try {
    const raw = localStorage.getItem(getQuizTelemetryStorageKey(dateStr));
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty;
    const firstAnswers = (parsed.firstAnswers && typeof parsed.firstAnswers === "object" && !Array.isArray(parsed.firstAnswers))
      ? { ...parsed.firstAnswers }
      : {};
    return {
      firstAnswers,
      totalClicks: Math.max(0, Math.trunc(Number(parsed.totalClicks) || 0)),
      elapsedMs: Math.max(0, Math.trunc(Number(parsed.elapsedMs) || 0)),
      retryCount: Math.max(0, Math.trunc(Number(parsed.retryCount) || 0)),
      updatedAt: Math.max(0, Math.trunc(Number(parsed.updatedAt) || 0))
    };
  } catch {
    return empty;
  }
}

function saveQuizTelemetry(dateStr, data) {
  if (!dateStr) return;
  try {
    localStorage.setItem(
      getQuizTelemetryStorageKey(dateStr),
      JSON.stringify({ ...data, updatedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota or private mode failures
  }
}

let activeLessonTimerDate = null;
let activeLessonTimerLastTickMs = 0;

function flushLessonActiveElapsedTime({ pause = false } = {}) {
  if (!activeLessonTimerDate || !activeLessonTimerLastTickMs) {
    if (pause) {
      activeLessonTimerDate = null;
      activeLessonTimerLastTickMs = 0;
    }
    return;
  }
  const now = Date.now();
  const delta = Math.min(60000, Math.max(0, now - activeLessonTimerLastTickMs));
  if (delta > 0) {
    const telemetry = loadQuizTelemetry(activeLessonTimerDate);
    telemetry.elapsedMs += delta;
    saveQuizTelemetry(activeLessonTimerDate, telemetry);
  }
  if (pause) {
    activeLessonTimerDate = null;
    activeLessonTimerLastTickMs = 0;
  } else {
    activeLessonTimerLastTickMs = now;
  }
}

function startOrResumeLessonTimer(dateStr) {
  if (!dateStr) return;
  if (activeLessonTimerDate && activeLessonTimerDate !== dateStr) {
    flushLessonActiveElapsedTime({ pause: true });
  }
  if (!document.hidden) {
    activeLessonTimerDate = dateStr;
    if (!activeLessonTimerLastTickMs) {
      activeLessonTimerLastTickMs = Date.now();
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    flushLessonActiveElapsedTime({ pause: true });
  } else if (currentScreen === "lesson" && activeLessonDate) {
    startOrResumeLessonTimer(activeLessonDate);
  }
});

window.addEventListener("beforeunload", () => {
  flushLessonActiveElapsedTime({ pause: true });
});

function recordQuizOptionAttempt(dateStr, qIdx, val) {
  flushLessonActiveElapsedTime();
  const telemetry = loadQuizTelemetry(dateStr);
  const key = String(qIdx);
  if (!Object.prototype.hasOwnProperty.call(telemetry.firstAnswers, key)) {
    telemetry.firstAnswers[key] = String(val || "").trim();
  }
  telemetry.totalClicks += 1;
  saveQuizTelemetry(dateStr, telemetry);
}

function resetQuizTelemetryForRetry(dateStr) {
  flushLessonActiveElapsedTime({ pause: true });
  const prev = loadQuizTelemetry(dateStr);
  const next = {
    firstAnswers: {},
    totalClicks: 0,
    elapsedMs: 0,
    retryCount: Math.min(1000, (prev.retryCount || 0) + 1),
    updatedAt: Date.now()
  };
  saveQuizTelemetry(dateStr, next);
  activeLessonTimerDate = dateStr;
  activeLessonTimerLastTickMs = document.hidden ? 0 : Date.now();
}

function syncTelemetryBaselineFromSavedAnswers(dateStr, savedAnswers) {
  if (!dateStr || !savedAnswers || typeof savedAnswers !== "object") return;
  const keys = Object.keys(savedAnswers);
  if (keys.length === 0) return;
  const telemetry = loadQuizTelemetry(dateStr);
  let dirty = false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(telemetry.firstAnswers, key) && savedAnswers[key]) {
      telemetry.firstAnswers[key] = String(savedAnswers[key]).trim();
      dirty = true;
    }
  }
  if (telemetry.totalClicks < keys.length) {
    telemetry.totalClicks = keys.length;
    dirty = true;
  }
  if (dirty) saveQuizTelemetry(dateStr, telemetry);
}

function buildSubmissionMetricSnapshot(dateStr) {
  flushLessonActiveElapsedTime();
  const telemetry = loadQuizTelemetry(dateStr);

  if (isIeltsLessonId(dateStr) && ieltsBank.loaded) {
    const ieltsQs = ieltsBank.questions
      .filter(q => q.Test_ID === dateStr)
      .sort((a, b) => Number(a.Q_Num || 0) - Number(b.Q_Num || 0));
    const gradedFirst = gradeIeltsExam(ieltsQs, telemetry.firstAnswers || {});
    let ieltsElapsedSec = Math.round(telemetry.elapsedMs / 1000);
    try {
      const gradedRaw = localStorage.getItem(`ielts_graded_v1:${currentUser?.uid || "anon"}:${dateStr}`);
      const gradedParsed = gradedRaw ? JSON.parse(gradedRaw) : null;
      if (gradedParsed && Number.isFinite(Number(gradedParsed.elapsedSec))) {
        ieltsElapsedSec = Math.max(ieltsElapsedSec, Math.trunc(Number(gradedParsed.elapsedSec)));
      }
      const timerRaw = localStorage.getItem(`ielts_timer_v1:${currentUser?.uid || "anon"}:${dateStr}`);
      const timerParsed = timerRaw ? JSON.parse(timerRaw) : null;
      if (timerParsed && Number.isFinite(Number(timerParsed.elapsedMs))) {
        ieltsElapsedSec = Math.max(ieltsElapsedSec, Math.round(Number(timerParsed.elapsedMs) / 1000));
      }
    } catch {
      // Ignore storage read issues
    }
    return {
      firstTryCorrect: gradedFirst.correctCount,
      firstTryTotal: ieltsQs.length,
      totalClicks: Math.max(0, Math.min(50000, Math.trunc(telemetry.totalClicks))),
      elapsedSec: Math.max(0, Math.min(86400, ieltsElapsedSec)),
      retryCount: Math.max(0, Math.min(1000, Math.trunc(telemetry.retryCount))),
      submittedAt: Date.now()
    };
  }

  const lessonQuiz = db.quiz.filter(q => q.Date === dateStr);
  const totalQuestions = lessonQuiz.length;
  let firstTryCorrect = 0;

  lessonQuiz.forEach((q, idx) => {
    const expected = String(q?.Answer || "").trim().toUpperCase();
    const firstPicked = String(telemetry.firstAnswers[String(idx)] || "").trim().toUpperCase();
    if (expected && firstPicked && firstPicked === expected) {
      firstTryCorrect += 1;
    }
  });

  return {
    firstTryCorrect,
    firstTryTotal: totalQuestions,
    totalClicks: Math.max(0, Math.min(50000, Math.trunc(telemetry.totalClicks))),
    elapsedSec: Math.max(0, Math.min(86400, Math.round(telemetry.elapsedMs / 1000))),
    retryCount: Math.max(0, Math.min(1000, Math.trunc(telemetry.retryCount))),
    submittedAt: Date.now()
  };
}

function getQuizStorageKey(dateStr) {
  return `quiz_progress:${currentUser?.uid || "anon"}:${dateStr}`;
}

function loadSavedQuizAnswers(dateStr) {
  try {
    const raw = localStorage.getItem(getQuizStorageKey(dateStr));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveQuizAnswer(dateStr, qIdx, val) {
  try {
    const next = loadSavedQuizAnswers(dateStr);
    next[String(qIdx)] = String(val || "").trim();
    localStorage.setItem(getQuizStorageKey(dateStr), JSON.stringify(next));
  } catch {
    // Ignore storage quota / private mode failures gracefully
  }
}

function clearSavedQuizAnswers(dateStr) {
  try {
    localStorage.removeItem(getQuizStorageKey(dateStr));
  } catch {}
}

function createLessonQuestionCard(q, idx, dateStr, lessonQuiz) {
  const qCard = document.createElement("div");
  qCard.className = "question-card";
  qCard.dataset.index = idx;

  const isTFNG = (q.Type || "").toUpperCase() === "TFNG";
  const typeLabel = isTFNG ? "TRUE / FALSE / NOT GIVEN" : "MULTIPLE CHOICE";

  let optionsHtml = "";
  if (isTFNG) {
    ["TRUE", "FALSE", "NOT GIVEN"].forEach(val => {
      optionsHtml += `
        <label class="option-label" data-value="${val}">
          <input type="radio" name="q_${idx}" value="${val}" />
          <span>${val}</span>
        </label>
      `;
    });
  } else {
    const opts = [
      { key: "A", text: q.Option_A },
      { key: "B", text: q.Option_B },
      { key: "C", text: q.Option_C },
      { key: "D", text: q.Option_D }
    ].filter(o => o.text !== undefined && o.text !== null && String(o.text).trim() !== "" && String(o.text).trim() !== "-");

    opts.forEach(o => {
      optionsHtml += `
        <label class="option-label" data-value="${o.key}">
          <input type="radio" name="q_${idx}" value="${o.key}" />
          <span><strong>(${o.key})</strong> ${escapeHtml(o.text)}</span>
        </label>
      `;
    });
  }

  const displayQuestionText = String(q.Question || "").replace(/^\[(?:單字|文法)[^\]]*\]\s*/, "");

  qCard.innerHTML = `
    <div class="question-type-badge">Question ${idx + 1} · ${typeLabel}</div>
    <div class="question-text">${escapeHtml(displayQuestionText)}</div>
    <div class="options-list">${optionsHtml}</div>
    <div id="feedback_pill_${idx}" style="margin-top: 10px;"></div>
    <details class="explanation-details" id="exp_${idx}">
      <summary class="explanation-summary">${bi("▸ 展開解析", "▸ Explanation")}</summary>
      <div class="explanation-content">
        <div><strong>${bi("正確答案：", "Answer: ")}</strong>${escapeHtml(q.Answer)}</div>
        <div style="margin-top: 4px;">${escapeHtml(q.Explanation || "")}</div>
      </div>
    </details>
  `;

  const radios = qCard.querySelectorAll(`input[name="q_${idx}"]`);
  radios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      saveQuizAnswer(dateStr, idx, e.target.value);
      recordQuizOptionAttempt(dateStr, idx, e.target.value);
      handleInstantQuizFeedback(idx, q, e.target.value, qCard, lessonQuiz);
    });
  });

  return qCard;
}

export function buildSectionedExamBlocks(passageText, lessonQuiz) {
  const normalized = String(passageText || "").replace(/<br\s*\/?>/gi, "\n");
  const markerRe = /【([^】]+)】/g;
  const matches = [...normalized.matchAll(markerRe)];
  if (matches.length < 2) return null;

  const rawSections = matches.map((m, i) => {
    const title = m[1].trim();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    let body = normalized.slice(start, end).trim();
    let audioSrc = "";
    const audioLineMatch = body.match(/^AUDIO:\s*(\S+)\s*\n?/i);
    if (audioLineMatch) {
      audioSrc = audioLineMatch[1].trim();
      body = body.slice(audioLineMatch[0].length).trim();
    }
    return { title, body, audioSrc };
  });

  const hasListening = rawSections.some(s => s.title.includes("聽力測驗") || Boolean(s.audioSrc));
  const partBase = hasListening ? 1 : 0;

  const parsedSections = rawSections.map((raw, i) => {
    const { title, body, audioSrc } = raw;
    let prefix = "";
    let sectionKey = `sec_${i}`;
    let headingZh = title;
    let headingEn = title;
    let isListening = false;

    if (title.includes("聽力測驗 A")) {
      prefix = "[聽力 A";
      isListening = true;
      sectionKey = "listening_a";
      headingZh = "第一大題（一）：聽力測驗 — 男女對話";
      headingEn = "Part 1A: Listening — Short Dialogue";
    } else if (title.includes("聽力測驗 B")) {
      prefix = "[聽力 B";
      isListening = true;
      sectionKey = "listening_b";
      headingZh = "第一大題（二）：聽力測驗 — 論說型短文";
      headingEn = "Part 1B: Listening — Expository Talk";
    } else if (title.includes("克漏字")) {
      prefix = "[克漏字";
      sectionKey = "cloze";
      headingZh = `第${partBase + 3}部分：克漏字測驗`;
      headingEn = `Part ${partBase + 3}: Cloze Passage`;
    } else if (title.includes("閱讀測驗 A")) {
      prefix = "[閱讀 A";
      sectionKey = "reading_a";
      headingZh = `第${partBase + 4}部分：閱讀測驗 A（人物對話）`;
      headingEn = `Part ${partBase + 4}: Reading A — Dialogue`;
    } else if (title.includes("閱讀測驗 B")) {
      prefix = "[閱讀 B";
      sectionKey = "reading_b";
      headingZh = `第${partBase + 5}部分：閱讀測驗 B（報導型文章）`;
      headingEn = `Part ${partBase + 5}: Reading B — News Report`;
    } else if (title.includes("閱讀測驗 C")) {
      prefix = "[閱讀 C";
      sectionKey = "reading_c";
      headingZh = `第${partBase + 6}部分：閱讀測驗 C（公告型文章）`;
      headingEn = `Part ${partBase + 6}: Reading C — Public Notice`;
    }
    return { title, body, audioSrc, isListening, prefix, sectionKey, headingZh, headingEn, items: [] };
  });

  const vocabStandalone = [];
  const grammarStandalone = [];
  const otherStandalone = [];

  lessonQuiz.forEach((q, idx) => {
    const text = String(q?.Question || "").trim();
    const matchedSection = parsedSections.find(sec => sec.prefix && text.startsWith(sec.prefix));
    if (matchedSection) {
      matchedSection.items.push({ q, idx });
    } else if (text.startsWith("[單字")) {
      vocabStandalone.push({ q, idx });
    } else if (text.startsWith("[文法")) {
      grammarStandalone.push({ q, idx });
    } else {
      otherStandalone.push({ q, idx });
    }
  });

  return {
    listeningSections: parsedSections.filter(sec => sec.isListening && (sec.items.length > 0 || sec.audioSrc)),
    standaloneGroups: [
      {
        id: "vocab_mc",
        headingZh: hasListening ? "第二大題：單字／片語填空選擇題" : "第一部分：單字／片語填空選擇題",
        headingEn: hasListening ? "Part 2: Vocabulary Multiple Choice" : "Part 1: Vocabulary Multiple Choice",
        items: vocabStandalone
      },
      {
        id: "grammar_mc",
        headingZh: hasListening ? "第三大題：文法選擇題" : "第二部分：文法選擇題",
        headingEn: hasListening ? "Part 3: Grammar Multiple Choice" : "Part 2: Grammar Multiple Choice",
        items: grammarStandalone
      },
      { id: "other_mc", headingZh: "綜合練習題", headingEn: "Practice Questions", items: otherStandalone }
    ].filter(g => g.items.length > 0),
    passageSections: parsedSections.filter(sec => !sec.isListening && (sec.items.length > 0 || sec.body.length > 0))
  };
}

export function renderListeningSectionCard(sec) {
  const pane = document.createElement("article");
  pane.className = "listening-pane";

  const header = document.createElement("div");
  header.className = "listening-header";
  const badge = document.createElement("span");
  badge.className = "listening-badge";
  badge.textContent = bi("🎧 聽力音檔", "🎧 LISTENING AUDIO");
  const titleEl = document.createElement("h4");
  titleEl.className = "listening-title";
  titleEl.textContent = sec.title;
  header.append(badge, titleEl);

  const playerBox = document.createElement("div");
  playerBox.className = "listening-player-box";

  const audioEl = document.createElement("audio");
  audioEl.className = "listening-audio-el";
  audioEl.controls = true;
  audioEl.preload = "metadata";
  if (sec.audioSrc) {
    audioEl.src = sec.audioSrc;
  }

  let activeRate = 1;
  const applyPlaybackRate = (rate) => {
    activeRate = rate;
    audioEl.defaultPlaybackRate = rate;
    audioEl.playbackRate = rate;
  };

  audioEl.addEventListener("loadedmetadata", () => {
    audioEl.playbackRate = activeRate;
  });
  audioEl.addEventListener("play", () => {
    audioEl.playbackRate = activeRate;
    document.querySelectorAll(".listening-audio-el").forEach(other => {
      if (other !== audioEl && !other.paused) {
        other.pause();
      }
    });
  });

  const speedRow = document.createElement("div");
  speedRow.className = "listening-speed-row";
  const speedLabel = document.createElement("span");
  speedLabel.className = "listening-speed-label";
  speedLabel.textContent = bi("播放倍速：", "Playback speed:");

  const speedGroup = document.createElement("div");
  speedGroup.className = "listening-speed-group";
  speedGroup.setAttribute("role", "group");
  speedGroup.setAttribute("aria-label", bi("音檔播放倍速", "Audio playback speed"));

  [
    { rate: 0.75, label: "0.75x" },
    { rate: 1, label: "1x" },
    { rate: 1.25, label: "1.25x" }
  ].forEach(({ rate, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `listening-speed-btn${rate === 1 ? " is-active" : ""}`;
    btn.dataset.rate = String(rate);
    btn.textContent = label;
    btn.setAttribute("aria-pressed", rate === 1 ? "true" : "false");
    btn.addEventListener("click", () => {
      applyPlaybackRate(rate);
      speedGroup.querySelectorAll(".listening-speed-btn").forEach(otherBtn => {
        const isSelf = otherBtn === btn;
        otherBtn.classList.toggle("is-active", isSelf);
        otherBtn.setAttribute("aria-pressed", isSelf ? "true" : "false");
      });
    });
    speedGroup.appendChild(btn);
  });

  speedRow.append(speedLabel, speedGroup);
  playerBox.append(audioEl, speedRow);

  const details = document.createElement("details");
  details.className = "listening-transcript-details";
  const summary = document.createElement("summary");
  summary.className = "listening-transcript-summary";
  summary.textContent = bi("▸ 展開聽力文字稿（點擊查看）", "▸ Listening Transcript (click to expand)");

  const transcriptBody = document.createElement("div");
  transcriptBody.className = "listening-transcript-body";

  String(sec.body || "")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const p = document.createElement("p");
      p.className = "listening-transcript-line";
      const spkMatch = line.match(/^([A-Z][a-zA-Z]+):\s*(.*)$/);
      if (spkMatch) {
        const spk = document.createElement("span");
        spk.className = "listening-transcript-speaker";
        spk.textContent = `${spkMatch[1]}:`;
        p.append(spk, document.createTextNode(spkMatch[2]));
      } else {
        p.textContent = line;
      }
      transcriptBody.appendChild(p);
    });

  details.append(summary, transcriptBody);
  pane.append(header, playerBox, details);
  return pane;
}

function resetLessonClearConfirmState() {
  const clearBtn = document.getElementById("clear-answers-btn");
  const confirmRow = document.getElementById("clear-answers-confirm-row");
  clearBtn?.classList.remove("is-armed");
  clearBtn?.setAttribute("aria-expanded", "false");
  confirmRow?.classList.add("hidden");
}

async function clearLessonAnswerRecords(dateStr) {
  if (!dateStr) return;
  clearSavedQuizAnswers(dateStr);
  resetQuizTelemetryForRetry(dateStr);
  if (isIeltsLessonId(dateStr)) {
    const ieltsMod = await getIeltsModule();
    ieltsMod.clearIeltsAttemptState(currentUser?.uid || "anon", dateStr);
  }
  resetLessonClearConfirmState();
  await renderLesson(dateStr);
}

async function renderLesson(dateStr) {
  resetLessonClearConfirmState();
  if (isIeltsLessonId(dateStr)) {
    if (!isAdminRole()) {
      activeWorkTrack = "student";
      return openWorkDesktop({ track: "student" });
    }
    await ensureIeltsBankLoaded();
    const ieltsTest = ieltsBank.tests.find(t => t.Test_ID === dateStr);
    if (!ieltsTest || String(ieltsTest.Ready || "").toUpperCase() !== "TRUE") {
      return openWorkDesktop({ track: "ielts" });
    }
    const ieltsMod = await getIeltsModule();
    const ieltsLesson = findLessonAnyTrack(dateStr);
    const ieltsQs = ieltsBank.questions
      .filter(q => q.Test_ID === dateStr)
      .sort((a, b) => Number(a.Q_Num || 0) - Number(b.Q_Num || 0));

    document.getElementById("home-view").classList.add("hidden");
    document.getElementById("lesson-actions").style.display = "flex";
    const lessonView = document.getElementById("lesson-view");

    document.getElementById("lesson-date-badge").textContent = `GT TEST ${String(ieltsTest.Test_Num).padStart(2, "0")}`;
    document.getElementById("lesson-title").textContent = `IELTS GT Reading Test ${ieltsTest.Test_Num}`;
    document.getElementById("lesson-grammar").textContent = "";
    document.getElementById("vocab-section")?.classList.add("hidden");
    document.getElementById("vocab-grid").innerHTML = "";

    const lessonXp = getLessonXp(ieltsLesson);
    const xpBadgeEl = document.getElementById("lesson-xp-badge");
    const syncIeltsXpBadge = () => {
      if (!xpBadgeEl) return;
      if (isLessonCompleted(dateStr)) {
        xpBadgeEl.textContent = bi("✓ 已驗收", "✓ Approved");
      } else if (hasEarnedLessonXp(dateStr)) {
        xpBadgeEl.textContent = bi("⚡ XP 已領", "⚡ XP Claimed");
      } else {
        xpBadgeEl.textContent = `⚡ +${lessonXp} XP`;
      }
    };
    syncIeltsXpBadge();

    stopAllListeningAudio();
    clearReadingScaffold();
    document.getElementById("quiz-container").innerHTML = "";

    ieltsMod.renderIeltsExamView({
      testMeta: ieltsTest,
      questions: ieltsQs,
      uid: currentUser?.uid || "anon",
      loadSavedAnswers: loadSavedQuizAnswers,
      saveAnswer: saveQuizAnswer,
      clearSavedAnswers: clearSavedQuizAnswers,
      onRecordClick: recordQuizOptionAttempt,
      onResetTelemetry: resetQuizTelemetryForRetry,
      popoverEl: document.getElementById("reading-vocab-popover")
    });

    const syncIeltsCommissionUI = () => {
      const statusEl = document.getElementById("lesson-complete-status");
      const submitBtn = document.getElementById("toggle-complete-btn");
      const approved = isLessonCompleted(dateStr);
      const submitted = isLessonSubmitted(dateStr);
      const xpClaimedHere = hasEarnedLessonXp(dateStr);
      syncIeltsXpBadge();

      submitBtn.classList.remove("is-completed", "is-submitted");
      if (approved) {
        statusEl.textContent = bi("✓ 已驗收發放英蚌（本回 IELTS 模考已完成結算）", "✓ Approved & Paid (IELTS practice settled)");
        statusEl.classList.add("is-completed");
        submitBtn.textContent = bi("已驗收完成 ✓", "Approved ✓");
        submitBtn.classList.add("is-completed");
        submitBtn.disabled = true;
      } else if (submitted) {
        statusEl.textContent = bi(
          `⏳ 已申請結算！${xpClaimedHere ? "經驗值 XP 已入帳，" : ""}可於右上角英蚌驗收台核發 +${UNIT_REWARD_CLAMS} 英蚌`,
          `⏳ Submitted! ${xpClaimedHere ? "XP credited—" : ""}approve via wallet panel for +${UNIT_REWARD_CLAMS} Clams`
        );
        statusEl.classList.remove("is-completed");
        submitBtn.textContent = bi("待驗收發款（點此收回）", "Pending Approval (Withdraw)");
        submitBtn.classList.add("is-submitted");
        submitBtn.disabled = false;
      } else {
        statusEl.textContent = bi(
          `完成交卷批改後按下完成任務，系統將自動發放 ${xpClaimedHere ? "（XP 已領）" : `+${lessonXp} XP 並`}申請 +${UNIT_REWARD_CLAMS} 英蚌`,
          `After grading your exam, submit to ${xpClaimedHere ? "request" : `claim +${lessonXp} XP & request`} +${UNIT_REWARD_CLAMS} Clams`
        );
        statusEl.classList.remove("is-completed");
        submitBtn.textContent = bi("完成任務並申請英蚌", "Submit & Claim Rewards");
        submitBtn.disabled = false;
      }
    };

    activeLessonSyncCommission = syncIeltsCommissionUI;
    syncIeltsCommissionUI();
    document.getElementById("toggle-complete-btn").onclick = async () => {
      if (isLessonCompleted(dateStr)) return;
      const submitBtn = document.getElementById("toggle-complete-btn");
      const targetSubmitted = !isLessonSubmitted(dateStr);
      submitBtn.disabled = true;
      try {
        await setLessonSubmitted(dateStr, targetSubmitted);
        syncIeltsCommissionUI();
        if (targetSubmitted) {
          pendingWorkCelebration = "submitted";
          launchFullCelebration();
        } else if (pendingWorkCelebration === "submitted") {
          pendingWorkCelebration = null;
        }
      } catch (err) {
        alert(translateAuthError(err));
      } finally {
        syncIeltsCommissionUI();
      }
    };

    lessonView.classList.remove("hidden");
    return;
  }

  stopIeltsTimerIfLoaded();

  const lesson = db.lessons.find(l => l.Date === dateStr);
  if (!lesson) return openWorkDesktop();

  document.getElementById("home-view").classList.add("hidden");
  document.getElementById("lesson-actions").style.display = "flex";
  const lessonView = document.getElementById("lesson-view");

  document.getElementById("lesson-date-badge").textContent = lesson.Date;
  document.getElementById("lesson-title").textContent = lesson.Title;
  document.getElementById("lesson-grammar").textContent = lesson.Grammar_Focus || "";

  const lessonVocab = db.vocab.filter(v => v.Date === dateStr);
  const vocabSection = document.getElementById("vocab-section");
  const vocabGrid = document.getElementById("vocab-grid");
  vocabGrid.innerHTML = "";

  if (lessonVocab.length === 0) {
    vocabSection.classList.add("hidden");
  } else {
    vocabSection.classList.remove("hidden");
    lessonVocab.forEach(v => {
      const imgUrl = isSafeImageUrl(v.Image_URL) ? v.Image_URL.trim() : "";
      const hasImage = Boolean(imgUrl);

      const card = document.createElement("button");
      card.type = "button";
      card.className = hasImage ? "flashcard has-image" : "flashcard";
      card.setAttribute("aria-pressed", "false");

      const frontImgHtml = hasImage
        ? `<img class="flashcard-img" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(v.Word)}" width="320" height="200" loading="lazy" />`
        : "";
      const backImgHtml = hasImage
        ? `<img class="flashcard-img" src="${escapeHtml(imgUrl)}" alt="" width="320" height="160" loading="lazy" fetchpriority="low" />`
        : "";

      card.innerHTML = `
        <div class="flashcard-inner">
          <div class="flashcard-front">
            ${frontImgHtml}
            <div class="flashcard-front-text">
              <div class="flashcard-word-row">
                <div class="flashcard-word">${escapeHtml(v.Word)}</div>
                <button type="button" class="pronounce-btn" aria-label="聆聽「${escapeHtml(v.Word)}」發音" title="發音（供輔助核對）">
                  <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
              </div>
              ${v.POS ? `<div class="flashcard-pos">(${escapeHtml(v.POS)})</div>` : ""}
            </div>
          </div>
          <div class="flashcard-back">
            ${backImgHtml}
            <div class="flashcard-back-body">
              <div class="flashcard-meaning">${escapeHtml(v.Meaning)}</div>
              <div class="flashcard-example">${escapeHtml(v.Example)}</div>
            </div>
          </div>
        </div>
      `;

      if (hasImage) {
        const imgs = card.querySelectorAll(".flashcard-img");
        imgs.forEach(img => {
          img.addEventListener("error", () => {
            imgs.forEach(el => el.remove());
            card.classList.remove("has-image");
          }, { once: true });
        });
      }

      const pronBtn = card.querySelector(".pronounce-btn");
      if (pronBtn) {
        pronBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          speakWord(v.Word);
        });
      }

      card.addEventListener("click", (e) => {
        if (e.target.closest(".pronounce-btn")) return;
        const flipped = card.classList.toggle("flipped");
        card.setAttribute("aria-pressed", String(flipped));
      });
      vocabGrid.appendChild(card);
    });
  }

  const lessonXp = getLessonXp(lesson);
  const xpBadgeEl = document.getElementById("lesson-xp-badge");
  const syncLessonXpBadge = () => {
    if (!xpBadgeEl) return;
    if (isLessonCompleted(dateStr)) {
      xpBadgeEl.textContent = bi("✓ 已驗收", "✓ Approved");
    } else if (hasEarnedLessonXp(dateStr)) {
      xpBadgeEl.textContent = bi("⚡ XP 已領", "⚡ XP Claimed");
    } else {
      xpBadgeEl.textContent = `⚡ +${lessonXp} XP`;
    }
  };
  syncLessonXpBadge();

  const lessonQuiz = db.quiz.filter(q => q.Date === dateStr);
  const splitDefaultEl = document.getElementById("reading-split-default");
  const sectionedEl = document.getElementById("sectioned-quiz-container");
  const quizContainer = document.getElementById("quiz-container");
  const progressFill = document.getElementById("quiz-progress-fill");
  const popoverEl = document.getElementById("reading-vocab-popover");

  stopAllListeningAudio();
  clearReadingScaffold();
  sectionedEl?.classList.remove("ielts-sectioned-exam");
  quizContainer.innerHTML = "";
  if (sectionedEl) sectionedEl.innerHTML = "";
  if (progressFill) {
    progressFill.style.width = "0%";
    const track = progressFill.parentElement;
    if (track) track.setAttribute("aria-valuenow", "0");
  }

  const sectionedExam = buildSectionedExamBlocks(lesson.Reading_Passage || "", lessonQuiz);
  if (sectionedExam && sectionedEl && splitDefaultEl) {
    splitDefaultEl.classList.add("hidden");
    sectionedEl.classList.remove("hidden");
    clearReadingScaffold();

    // 0. Listening sections FIRST at the very top (audio + speed controls + collapsed transcript paired with its MCQs)
    (sectionedExam.listeningSections || []).forEach(sec => {
      const secBlock = document.createElement("section");
      secBlock.className = "quiz-section-block quiz-listening-block";

      const heading = document.createElement("h3");
      heading.className = "quiz-section-heading";
      heading.textContent = bi(sec.headingZh, sec.headingEn);
      secBlock.appendChild(heading);

      const split = document.createElement("div");
      split.className = "ielts-split";

      const listeningPane = renderListeningSectionCard(sec);

      const quizPane = document.createElement("div");
      quizPane.className = "quiz-pane";
      sec.items.forEach(({ q, idx }) => {
        quizPane.appendChild(createLessonQuestionCard(q, idx, dateStr, lessonQuiz));
      });

      split.append(listeningPane, quizPane);
      secBlock.appendChild(split);
      sectionedEl.appendChild(secBlock);
    });

    // 1. Standalone Vocabulary & Grammar sections (no left reading passage alongside them!)
    sectionedExam.standaloneGroups.forEach(group => {
      const secBlock = document.createElement("section");
      secBlock.className = "quiz-section-block";

      const heading = document.createElement("h3");
      heading.className = "quiz-section-heading";
      heading.textContent = bi(group.headingZh, group.headingEn);
      secBlock.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "quiz-standalone-grid";
      group.items.forEach(({ q, idx }) => {
        grid.appendChild(createLessonQuestionCard(q, idx, dateStr, lessonQuiz));
      });
      secBlock.appendChild(grid);
      sectionedEl.appendChild(secBlock);
    });

    // 2. Paired Reading / Cloze blocks (each passage appears ONLY alongside its own questions!)
    sectionedExam.passageSections.forEach(sec => {
      const secBlock = document.createElement("section");
      secBlock.className = "quiz-section-block";

      const heading = document.createElement("h3");
      heading.className = "quiz-section-heading";
      heading.textContent = bi(sec.headingZh, sec.headingEn);
      secBlock.appendChild(heading);

      const split = document.createElement("div");
      split.className = "ielts-split";

      const readingPane = document.createElement("article");
      readingPane.className = "reading-pane";

      const readingHeader = document.createElement("div");
      readingHeader.className = "reading-header";
      const readingTitle = document.createElement("h4");
      readingTitle.className = "reading-title";
      readingTitle.textContent = sec.title;
      const toolsContainer = document.createElement("div");
      toolsContainer.className = "reading-tools-slot";
      readingHeader.append(readingTitle, toolsContainer);

      const bodyEl = document.createElement("div");
      bodyEl.className = "reading-body";
      readingPane.append(readingHeader, bodyEl);

      const quizPane = document.createElement("div");
      quizPane.className = "quiz-pane";
      sec.items.forEach(({ q, idx }) => {
        quizPane.appendChild(createLessonQuestionCard(q, idx, dateStr, lessonQuiz));
      });

      split.append(readingPane, quizPane);
      secBlock.appendChild(split);
      sectionedEl.appendChild(secBlock);

      renderInteractiveReadingPassage({
        bodyEl,
        toolsEl: toolsContainer,
        popoverEl,
        passageText: sec.body,
        vocabRows: lessonVocab,
        uid: currentUser?.uid || "guest",
        dateStr,
        sectionKey: sec.sectionKey,
        preserveExisting: true
      });
    });
  } else {
    if (sectionedEl) sectionedEl.classList.add("hidden");
    splitDefaultEl?.classList.remove("hidden");
    document.getElementById("reading-title").textContent = lesson.Reading_Title || "Reading Passage";
    renderInteractiveReadingPassage({
      bodyEl: document.getElementById("reading-body"),
      toolsEl: document.getElementById("reading-tools-container"),
      popoverEl,
      passageText: lesson.Reading_Passage || "",
      vocabRows: lessonVocab,
      uid: currentUser?.uid || "guest",
      dateStr
    });

    lessonQuiz.forEach((q, idx) => {
      quizContainer.appendChild(createLessonQuestionCard(q, idx, dateStr, lessonQuiz));
    });
  }

  // Hydrate previously selected quiz answers without triggering confetti bursts
  const quizScopeEl = document.getElementById("reading-quiz-section") || quizContainer;
  const savedAnswers = loadSavedQuizAnswers(dateStr);
  syncTelemetryBaselineFromSavedAnswers(dateStr, savedAnswers);
  lessonQuiz.forEach((q, idx) => {
    const savedVal = savedAnswers[String(idx)];
    if (!savedVal) return;
    const qCard = quizScopeEl.querySelector(`.question-card[data-index="${idx}"]`);
    const radio = qCard?.querySelector(`input[name="q_${idx}"][value="${CSS.escape(savedVal)}"]`);
    if (radio) {
      radio.checked = true;
      handleInstantQuizFeedback(idx, q, savedVal, qCard, lessonQuiz, { silent: true });
    }
  });

  const resetBtn = document.getElementById("reset-quiz-btn");
  if (resetBtn) {
    resetBtn.onclick = () => clearLessonAnswerRecords(dateStr);
  }

  const syncCommissionUI = () => {
    const statusEl = document.getElementById("lesson-complete-status");
    const submitBtn = document.getElementById("toggle-complete-btn");
    const approved = isLessonCompleted(dateStr);
    const submitted = isLessonSubmitted(dateStr);
    const xpClaimedHere = hasEarnedLessonXp(dateStr);
    const unitXp = getLessonXp(lesson);
    syncLessonXpBadge();

    submitBtn.classList.remove("is-completed", "is-submitted");
    if (approved) {
      statusEl.textContent = bi("✓ 甲方案主已驗收通過（已完成本單元任務）", "✓ Client approved (Commission complete)");
      statusEl.classList.add("is-completed");
      submitBtn.textContent = bi("已驗收完成 ✓", "Approved ✓");
      submitBtn.classList.add("is-completed");
      submitBtn.disabled = true;
    } else if (submitted) {
      statusEl.textContent = bi(
        `⏳ 已交稿！${xpClaimedHere ? "經驗值 XP 已自動入帳，" : ""}請等待甲方老師驗收後發放 +${UNIT_REWARD_CLAMS} 英蚌`,
        `⏳ Submitted! ${xpClaimedHere ? "XP credited—a" : "A"}waiting client review for +${UNIT_REWARD_CLAMS} Clams`
      );
      statusEl.classList.remove("is-completed");
      submitBtn.textContent = bi("待案主驗收中（點此可收回修改）", "Pending Review (Click to Withdraw)");
      submitBtn.classList.add("is-submitted");
      submitBtn.disabled = false;
    } else {
      statusEl.textContent = bi(
        `完成單字與閱讀練習後按下完成任務，系統將自動發放 ${xpClaimedHere ? "（XP 已領）" : `+${unitXp} XP 並`}申請 +${UNIT_REWARD_CLAMS} 英蚌`,
        `Finish vocab & reading, then submit to ${xpClaimedHere ? "request" : `claim +${unitXp} XP & request`} +${UNIT_REWARD_CLAMS} Clams`
      );
      statusEl.classList.remove("is-completed");
      submitBtn.textContent = bi("完成任務", "Submit Commission");
      submitBtn.disabled = false;
    }
  };

  activeLessonSyncCommission = syncCommissionUI;
  syncCommissionUI();
  document.getElementById("toggle-complete-btn").onclick = async () => {
    if (isLessonCompleted(dateStr)) return;
    const submitBtn = document.getElementById("toggle-complete-btn");
    const targetSubmitted = !isLessonSubmitted(dateStr);
    submitBtn.disabled = true;
    try {
      await setLessonSubmitted(dateStr, targetSubmitted);
      syncCommissionUI();
      if (targetSubmitted) {
        pendingWorkCelebration = "submitted";
        launchFullCelebration();
      } else if (pendingWorkCelebration === "submitted") {
        pendingWorkCelebration = null;
      }
    } catch (err) {
      alert(translateAuthError(err));
    } finally {
      syncCommissionUI();
    }
  };

  lessonView.classList.remove("hidden");
}

function handleInstantQuizFeedback(idx, q, selectedVal, qCard, allQuestions, { silent = false } = {}) {
  const userAns = (selectedVal || "").trim().toUpperCase();
  const rightAns = (q.Answer || "").trim().toUpperCase();
  const isCorrect = userAns === rightAns;

  const labels = qCard.querySelectorAll(".option-label");
  labels.forEach(lbl => {
    lbl.classList.remove("opt-correct", "opt-incorrect");
    const val = (lbl.dataset.value || "").trim().toUpperCase();
    if (isCorrect && val === rightAns) {
      lbl.classList.add("opt-correct");
    } else if (!isCorrect && val === userAns) {
      lbl.classList.add("opt-incorrect");
    }
  });

  qCard.classList.remove("correct", "incorrect");
  qCard.classList.add(isCorrect ? "correct" : "incorrect");

  const pillBox = document.getElementById(`feedback_pill_${idx}`);
  if (pillBox) {
    pillBox.innerHTML = isCorrect
      ? `<span class="feedback-pill correct">${bi("✓ 答對了！", "✓ Correct!")}</span>`
      : ""; // 答錯時不顯示任何文字，由老師口頭引導
  }

  // 注意：解析 details 保持關閉，絕不自動展開，完全由老師視教學需要手動點開
  const detailsEl = document.getElementById(`exp_${idx}`);
  if (detailsEl && !isCorrect) {
    detailsEl.removeAttribute("open");
  }

  // 答對時噴發局部微型彩帶慶祝
  if (isCorrect && !silent) {
    const rect = qCard.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top + 30, 26);
  }

  updateQuizProgress(allQuestions, { silent });
}

function updateQuizProgress(questions, { silent = false } = {}) {
  let answeredCount = 0;
  let correctCount = 0;

  questions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="q_${idx}"]:checked`);
    if (selected) {
      answeredCount++;
      if (selected.value.trim().toUpperCase() === (q.Answer || "").trim().toUpperCase()) {
        correctCount++;
      }
    }
  });

  // 極簡線條進度：純視覺線條推進，不顯示任何數字分母
  const progressFill = document.getElementById("quiz-progress-fill");
  if (progressFill && questions.length > 0) {
    const pct = Math.round((answeredCount / questions.length) * 100);
    progressFill.style.width = `${pct}%`;
    const track = progressFill.parentElement;
    if (track) track.setAttribute("aria-valuenow", String(pct));
  }

  // 全部答對時觸發大慶祝盛典
  if (!silent && answeredCount === questions.length && correctCount === questions.length) {
    launchFullCelebration();
  }
}

const settingsDialog = document.getElementById("settings-dialog");
const openSettingsBtn = document.getElementById("open-settings-btn");

function switchAuthMode(mode, { clearMsg = true } = {}) {
  const isSignin = mode === "signin";
  document.getElementById("tab-signin").setAttribute("aria-pressed", String(isSignin));
  document.getElementById("tab-signup").setAttribute("aria-pressed", String(!isSignin));
  document.getElementById("signin-form").classList.toggle("hidden", !isSignin);
  document.getElementById("signup-form").classList.toggle("hidden", isSignin);
  document.getElementById("auth-heading").textContent = isSignin
    ? bi("登入學習帳號", "Sign in to your account")
    : bi("建立學習帳號", "Create an account");
  if (clearMsg) clearFeedback("auth-feedback");
}

document.getElementById("tab-signin").addEventListener("click", () => switchAuthMode("signin"));
document.getElementById("tab-signup").addEventListener("click", () => switchAuthMode("signup"));

function syncPasswordToggleButtons() {
  document.querySelectorAll(".btn-toggle-pw").forEach(btn => {
    const target = document.getElementById(btn.dataset.target);
    const showing = target?.type === "text";
    btn.setAttribute("aria-pressed", String(showing));
    btn.textContent = showing ? bi("隱藏", "Hide") : bi("顯示", "Show");
    btn.setAttribute("aria-label", showing ? bi("隱藏密碼", "Hide password") : bi("顯示密碼", "Show password"));
  });
}

document.querySelectorAll(".btn-toggle-pw").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.type = target.type === "text" ? "password" : "text";
    syncPasswordToggleButtons();
  });
});

document.getElementById("google-signin-btn").addEventListener("click", async () => {
  const btn = document.getElementById("google-signin-btn");
  clearFeedback("auth-feedback");
  btn.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    showFeedback("auth-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("forgot-pw-btn").addEventListener("click", async () => {
  const emailInput = document.getElementById("signin-email");
  const email = emailInput.value.trim();
  clearFeedback("auth-feedback");
  if (!email || !emailInput.checkValidity()) {
    showFeedback(
      "auth-feedback",
      "info",
      bi(
        "請先在上方「電子郵件」欄位輸入您的信箱，再點擊忘記密碼。",
        "Enter your email address above first, then click Forgot password."
      )
    );
    emailInput.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showFeedback(
      "auth-feedback",
      "success",
      bi(
        `已寄出重設密碼信至 ${email}，請查收信件（若未看到可檢查垃圾信件匣）。`,
        `Password reset email sent to ${email}. Check your inbox (and spam folder).`
      )
    );
  } catch (err) {
    showFeedback("auth-feedback", "error", translateAuthError(err));
  }
});

document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearFeedback("auth-feedback");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const btn = document.getElementById("signin-submit-btn");
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;
  btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showFeedback("auth-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearFeedback("auth-feedback");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const btn = document.getElementById("signup-submit-btn");
  const name = document.getElementById("signup-name").value.trim().slice(0, 80);
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  btn.disabled = true;
  pendingSignUpName = name;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    try {
      await updateDoc(doc(firestoreDb, "users", cred.user.uid), {
        displayName: name,
        updatedAt: serverTimestamp()
      });
    } catch {
      // Profile doc will be initialized with pendingSignUpName / updated name
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Non-fatal if verification rate limit is hit
    }
  } catch (err) {
    pendingSignUpName = "";
    showFeedback("auth-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

function hasPasswordProvider(user) {
  return Boolean(user?.providerData?.some(p => p.providerId === "password"));
}

function renderVerificationRow(user) {
  const container = document.getElementById("settings-verified-row");
  container.innerHTML = "";

  if (user.emailVerified) {
    const badge = document.createElement("span");
    badge.className = "role-badge verified-badge";
    badge.textContent = bi("已完成驗證", "Verified");
    container.appendChild(badge);
    return;
  }

  const warnText = document.createElement("span");
  warnText.textContent = bi(
    "尚未驗證（驗證後才可啟用管理員授權）",
    "Not verified yet (required for admin permissions)"
  );
  warnText.className = "verify-warn-text";
  container.appendChild(warnText);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "btn btn-sm";
  sendBtn.textContent = bi("寄送驗證信", "Send Verification");
  sendBtn.addEventListener("click", async () => {
    sendBtn.disabled = true;
    try {
      await sendEmailVerification(currentUser);
      showFeedback(
        "settings-feedback",
        "success",
        bi(
          `已寄出驗證信至 ${currentUser.email}，點擊信中連結後請按「重新檢查」。`,
          `Verification email sent to ${currentUser.email}. Click the link inside, then click Check Again.`
        )
      );
    } catch (err) {
      showFeedback("settings-feedback", "error", translateAuthError(err));
    } finally {
      sendBtn.disabled = false;
    }
  });

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "btn btn-sm";
  refreshBtn.textContent = bi("重新檢查", "Check Again");
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    try {
      await currentUser.reload();
      currentRole = await resolveUserRole(currentUser);
      await currentUser.getIdToken(true);
      updateHeaderAccountUI(currentUser, currentRole, document.getElementById("settings-display-name").value.trim());
      await populateSettingsDialog();
      showFeedback(
        "settings-feedback",
        "info",
        currentUser.emailVerified
          ? bi("信箱已完成驗證！", "Email verified!")
          : bi("尚未偵測到驗證完成，請確認已點擊信中驗證連結。", "Not verified yet. Please confirm you clicked the email link.")
      );
    } catch (err) {
      showFeedback("settings-feedback", "error", translateAuthError(err));
    } finally {
      refreshBtn.disabled = false;
    }
  });

  container.appendChild(sendBtn);
  container.appendChild(refreshBtn);
}

async function loadAdminsList() {
  const listEl = document.getElementById("admin-list");
  listEl.innerHTML = `<li class="form-hint">${bi("正在載入管理員清單...", "Loading admins list...")}</li>`;
  try {
    const snap = await getDocs(query(collection(firestoreDb, "admins"), orderBy("email")));
    listEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<li class="form-hint">${bi("目前尚未新增其他管理員。", "No additional admins added yet.")}</li>`;
      return;
    }
    snap.forEach(docSnap => {
      const item = docSnap.data() || {};
      const emailLower = docSnap.id;
      const li = document.createElement("li");
      li.className = "admin-list-item";

      const span = document.createElement("span");
      span.textContent = item.email || emailLower;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-danger-outline btn-sm";
      removeBtn.textContent = bi("移除", "Remove");
      removeBtn.addEventListener("click", async () => {
        removeBtn.disabled = true;
        try {
          await deleteDoc(doc(firestoreDb, "admins", emailLower));
          showFeedback("settings-feedback", "success", bi(`已移除管理員：${emailLower}`, `Removed admin: ${emailLower}`));
          await loadAdminsList();
        } catch (err) {
          showFeedback("settings-feedback", "error", translateAuthError(err));
          removeBtn.disabled = false;
        }
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      listEl.appendChild(li);
    });
  } catch (err) {
    listEl.innerHTML = "";
    showFeedback("settings-feedback", "error", translateAuthError(err));
  }
}

async function populateSettingsDialog({ preserveFeedback = false } = {}) {
  if (!currentUser) return;
  if (!preserveFeedback) clearFeedback("settings-feedback");

  document.getElementById("settings-email").textContent = currentUser.email || "";
  const roleBadge = document.getElementById("settings-role-badge");
  roleBadge.textContent = getRoleLabel(currentRole);
  roleBadge.className = getRoleBadgeClass(currentRole);

  const curLang = getUiLanguage();
  const langRadio = document.querySelector(`input[name="uiLanguage"][value="${curLang}"]`);
  if (langRadio) langRadio.checked = true;

  const providerLabels = [];
  if (currentUser.providerData.some(p => p.providerId === "google.com")) providerLabels.push(bi("Google 登入", "Google"));
  if (hasPasswordProvider(currentUser)) providerLabels.push(bi("電子郵件密碼", "Email & Password"));
  document.getElementById("settings-providers").textContent = providerLabels.join(bi("、", ", ")) || bi("電子郵件", "Email");

  renderVerificationRow(currentUser);

  document.getElementById("settings-display-name").value = document.getElementById("header-user-name").textContent || "";

  const hasPw = hasPasswordProvider(currentUser);
  const currentPwGroup = document.getElementById("current-pw-group");
  const currentPwInput = document.getElementById("settings-current-pw");
  const pwDesc = document.getElementById("settings-password-desc");
  const savePwBtn = document.getElementById("save-password-btn");
  currentPwGroup.classList.toggle("hidden", !hasPw);
  currentPwInput.required = hasPw;
  currentPwInput.value = "";
  document.getElementById("settings-new-pw").value = "";

  if (hasPw) {
    pwDesc.textContent = bi("請輸入目前的密碼與新密碼以完成變更。", "Enter your current and new password to update.");
    savePwBtn.textContent = bi("更新密碼", "Update Password");
  } else {
    pwDesc.textContent = bi(
      "此帳號目前僅透過 Google 登入，可直接設定一組本機登入密碼。",
      "Currently signed in via Google only. You can set a password for email sign-in too."
    );
    savePwBtn.textContent = bi("設定帳號密碼", "Set Password");
  }

  const adminSection = document.getElementById("super-admin-section");
  const isSuperAdmin = currentRole === "super_admin";
  adminSection.classList.toggle("hidden", !isSuperAdmin);
  if (isSuperAdmin) {
    await loadAdminsList();
  }

  const av = currentUserProfile?.avatar;
  const avatarSummaryEl = document.getElementById("settings-avatar-summary");
  if (av?.name) {
    const buildObj = BODY_BUILDS.find(b => b.id === av.build);
    const hairObj = HAIR_STYLES.find(h => h.id === av.hairStyle);
    const buildLabel = buildObj ? (isEn() ? (buildObj.labelEn || buildObj.label) : buildObj.label) : av.build;
    const hairLabel = hairObj ? (isEn() ? (hairObj.labelEn || hairObj.label) : hairObj.label) : av.hairStyle;
    avatarSummaryEl.textContent = bi(
      `目前角色：「${av.name}」 · ${buildLabel} · ${hairLabel}`,
      `Current Artist: "${av.name}" · ${buildLabel} · ${hairLabel}`
    );
  } else {
    avatarSummaryEl.textContent = bi("尚未建立接案角色造型", "Character not created yet");
  }
}

const adminReviewDialog = document.getElementById("admin-review-dialog");
const openAdminReviewBtn = document.getElementById("header-wallet-chip");

function setupModalDialogFallbacks(dialogEl, openBtns, closeBtns, onCloseCb) {
  if (!dialogEl) return;
  if (!("commandForElement" in HTMLButtonElement.prototype)) {
    openBtns.forEach(btn => {
      btn?.addEventListener("click", () => {
        if (!dialogEl.open) dialogEl.showModal();
      });
    });
    closeBtns.forEach(btn => {
      btn?.addEventListener("click", () => dialogEl.close());
    });
  }
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (e) => {
      const r = dialogEl.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialogEl.addEventListener("pointerdown", (e) => { pressedOutside = outside(e); });
    dialogEl.addEventListener("pointerup", (e) => {
      if (pressedOutside && outside(e)) dialogEl.close();
    });
  }
  dialogEl.addEventListener("close", () => {
    dialogEl.returnValue = "";
    onCloseCb?.();
    sync3dSceneLifecycle();
  });
}

document.addEventListener("visibilitychange", sync3dSceneLifecycle);
const dialogOpenObserver = new MutationObserver(() => {
  sync3dSceneLifecycle();
  saveNavState();
});
document.querySelectorAll("dialog").forEach(dlg => {
  dialogOpenObserver.observe(dlg, { attributes: true, attributeFilter: ["open"] });
});

openSettingsBtn.addEventListener("click", () => {
  if (roomScene?.editMode) {
    roomScene.exitFurnitureEditMode({ commit: true });
  }
  populateSettingsDialog();
});

setupModalDialogFallbacks(
  settingsDialog,
  [openSettingsBtn],
  [document.getElementById("close-settings-btn"), document.getElementById("footer-close-settings-btn")],
  () => {
    document.getElementById("settings-current-pw").value = "";
    document.getElementById("settings-new-pw").value = "";
    clearFeedback("settings-feedback");
  }
);

setupModalDialogFallbacks(
  adminReviewDialog,
  [],
  [document.getElementById("close-admin-review-btn"), document.getElementById("footer-close-admin-review-btn")],
  () => {
    clearFeedback("admin-review-feedback");
    maybeShowIntroStoryBanner();
  }
);

setupModalDialogFallbacks(
  document.getElementById("shop-dialog"),
  [],
  [document.getElementById("close-shop-btn")],
  () => {
    clearFeedback("shop-feedback");
  }
);

setupModalDialogFallbacks(
  document.getElementById("tv-dialog"),
  [],
  [document.getElementById("close-tv-btn")]
);

setupModalDialogFallbacks(
  document.getElementById("track-chooser-dialog"),
  [],
  [document.getElementById("close-track-chooser-btn")]
);

document.getElementById("choose-track-student-btn")?.addEventListener("click", () => {
  enterWorkTrack("student");
});
document.getElementById("choose-track-ielts-btn")?.addEventListener("click", () => {
  enterWorkTrack("ielts");
});
document.getElementById("switch-work-track-btn")?.addEventListener("click", () => {
  enterWorkTrack(activeWorkTrack === "ielts" ? "student" : "ielts");
});
document.getElementById("link-ielts-sheet-btn")?.addEventListener("click", async () => {
  if (!isAdminRole()) return;
  const ieltsMod = await getIeltsModule();
  const currentId = ieltsMod.getSavedIeltsSheetId();
  const input = window.prompt(
    bi(
      "請貼上獨立存放 IELTS 考古題的 Google 試算表網址或 ID（須包含 IELTS_Tests 與 IELTS_Questions 分頁，並開啟「知道連結的使用者皆可檢視」；留空並確定可回復為內建題庫）：",
      "Paste the Google Sheet URL or ID for your IELTS bank (tabs: IELTS_Tests & IELTS_Questions, shared Anyone with link; leave blank to use bundled bank):"
    ),
    currentId
  );
  if (input === null) return;
  const savedId = ieltsMod.setSavedIeltsSheetId(input);
  await ensureIeltsBankLoaded({ force: true });
  if (currentScreen === "desktop") {
    renderHome({ scrollToLatest: false });
  }
  if (!savedId) {
    alert(bi("已清除外部連結，回復使用系統內建第 1 批 IELTS 題庫。", "Cleared external Sheet link; using bundled Batch 1 IELTS bank."));
  } else if (ieltsBank.sourceKind === "google_sheet") {
    alert(bi(`已成功同步外部 IELTS Google Sheet（共 ${ieltsBank.tests.length} 回）！`, `Synced remote IELTS Google Sheet (${ieltsBank.tests.length} tests)!`));
  } else {
    alert(bi("無法從該試算表讀取 IELTS_Tests / IELTS_Questions，請確認分頁名稱與檢視權限（目前已先保留內建題庫）。", "Could not read IELTS_Tests / IELTS_Questions from that Sheet. Check tab names & viewer permissions (falling back to bundled bank)."));
  }
});

setupModalDialogFallbacks(
  document.getElementById("poster-dialog"),
  [],
  [document.getElementById("close-poster-btn"), document.getElementById("footer-close-poster-btn")],
  () => {
    clearFeedback("poster-feedback");
    cleanupPosterObjectUrl?.();
  }
);

setupModalDialogFallbacks(
  document.getElementById("finance-dialog"),
  [],
  [document.getElementById("close-finance-btn"), document.getElementById("footer-close-finance-btn")],
  () => {
    clearFeedback("finance-feedback");
  }
);

document.getElementById("edit-avatar-btn").addEventListener("click", () => {
  if (settingsDialog.open) settingsDialog.close();
  showOnboardingScreen(Boolean(currentUserProfile?.avatar));
});

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const form = e.currentTarget;
  clearFeedback("settings-feedback");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const btn = document.getElementById("save-profile-btn");
  const nextName = document.getElementById("settings-display-name").value.trim().slice(0, 80);
  btn.disabled = true;
  try {
    await updateProfile(currentUser, { displayName: nextName });
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
      displayName: nextName,
      updatedAt: serverTimestamp()
    });
    if (currentUserProfile) currentUserProfile.displayName = nextName;
    updateHeaderAccountUI(currentUser, currentRole, nextName, currentUserProfile?.clams ?? STARTER_CLAMS);
    showFeedback("settings-feedback", "success", bi("已更新顯示名稱！", "Display name updated!"));
  } catch (err) {
    showFeedback("settings-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("change-password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const form = e.currentTarget;
  clearFeedback("settings-feedback");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const btn = document.getElementById("save-password-btn");
  const currentPw = document.getElementById("settings-current-pw").value;
  const newPw = document.getElementById("settings-new-pw").value;
  const hasPw = hasPasswordProvider(currentUser);

  btn.disabled = true;
  try {
    if (hasPw) {
      const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPw);
      showFeedback("settings-feedback", "success", bi("密碼已更新！下次可使用新密碼登入。", "Password updated! Use your new password next time you sign in."));
    } else {
      const cred = EmailAuthProvider.credential(currentUser.email, newPw);
      try {
        await linkWithCredential(currentUser, cred);
      } catch (linkErr) {
        if (linkErr?.code === "auth/requires-recent-login") {
          await reauthenticateWithPopup(currentUser, googleProvider);
          await linkWithCredential(currentUser, cred);
        } else {
          throw linkErr;
        }
      }
      await populateSettingsDialog();
      showFeedback("settings-feedback", "success", bi(
        "已為帳號設定密碼！現在同時支援 Google 與電子郵件密碼登入。",
        "Password set! You can now sign in with either Google or email/password."
      ));
    }
    document.getElementById("settings-current-pw").value = "";
    document.getElementById("settings-new-pw").value = "";
  } catch (err) {
    showFeedback("settings-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("settings-reset-pw-btn").addEventListener("click", async () => {
  if (!currentUser?.email) return;
  clearFeedback("settings-feedback");
  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    showFeedback("settings-feedback", "success", bi(`已寄送密碼重設信至 ${currentUser.email}。`, `Password reset email sent to ${currentUser.email}.`));
  } catch (err) {
    showFeedback("settings-feedback", "error", translateAuthError(err));
  }
});

document.getElementById("add-admin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || currentRole !== "super_admin") return;
  const form = e.currentTarget;
  clearFeedback("settings-feedback");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const input = document.getElementById("admin-email-input");
  const emailLower = input.value.trim().toLowerCase();
  if (emailLower === SUPER_ADMIN_EMAIL) {
    showFeedback("settings-feedback", "info", bi("此信箱已為系統超級管理員，無需另外新增。", "This email is already the Super Admin."));
    return;
  }

  const btn = document.getElementById("add-admin-btn");
  btn.disabled = true;
  try {
    await setDoc(doc(firestoreDb, "admins", emailLower), {
      email: emailLower,
      addedBy: currentUser.uid,
      addedAt: serverTimestamp()
    });
    input.value = "";
    showFeedback("settings-feedback", "success", bi(`已將 ${emailLower} 加入管理員名單。`, `Added ${emailLower} as an admin.`));
    await loadAdminsList();
  } catch (err) {
    showFeedback("settings-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  const btn = document.getElementById("logout-btn");
  btn.disabled = true;
  try {
    if (settingsDialog.open) settingsDialog.close();
    clearSavedNavState(currentUser?.uid);
    await signOut(auth);
  } finally {
    btn.disabled = false;
  }
});

// Accessible :user-invalid ARIA sync & progressive fallback
(function setupAccessibleFormValidation() {
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(id => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  };

  const announcer = document.createElement("div");
  announcer.setAttribute("aria-live", "polite");
  announcer.classList.add("visually-hidden");
  document.body.append(announcer);
  let announceTimer;
  let announcedField;

  const spokenText = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  };

  const announceError = (el) => {
    const error = document.getElementById(el.dataset.error);
    if (!error) return;
    const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : "";
    clearTimeout(announceTimer);
    announcer.textContent = "";
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + spokenText(error);
    }, 500);
  };

  const dirtyState = new WeakMap();
  const supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  const flagged = new WeakSet();
  const announced = new WeakSet();

  const isFieldInvalid = (el) => {
    if (supportsUserInvalid) return el.matches(":user-invalid");
    return el.classList.contains("user-invalid-fallback");
  };

  const syncAria = (el, announce = false) => {
    if (!el.matches?.("input, select, textarea")) return;
    if (el.type === "radio") return;
    const invalid = isFieldInvalid(el);
    if (invalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute("aria-invalid", "true");
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute("aria-invalid") !== "true") {
      el.setAttribute("aria-invalid", "false");
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = "";
      }
    }
  };

  document.querySelectorAll("form input.form-control").forEach(el => syncAria(el));

  document.addEventListener("blur", (e) => {
    const el = e.target;
    if (!supportsUserInvalid && el.matches?.("input.form-control")) {
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(el, state);
      if (state.hasInteracted) {
        el.classList.toggle("user-invalid-fallback", !el.validity.valid);
      }
    }
    syncAria(el, true);
  }, true);

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!supportsUserInvalid && el.matches?.("input.form-control")) {
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(el, state);
      if (state.hasBlurred) {
        el.classList.toggle("user-invalid-fallback", !el.validity.valid);
      }
    }
    if (el.hasAttribute?.("aria-invalid")) syncAria(el);
  });

  document.addEventListener("invalid", (e) => {
    if (!supportsUserInvalid && e.target.matches?.("input.form-control")) {
      dirtyState.set(e.target, { hasInteracted: true, hasBlurred: true });
      e.target.classList.add("user-invalid-fallback");
    }
    announced.add(e.target);
    syncAria(e.target);
  }, true);
})();

// Sun & Moon Dark Mode Toggle (two-state override aligned with system preference)
(function setupThemeToggle() {
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  const themeToggleInput = document.getElementById("theme-toggle-input");
  const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function getSystemScheme() {
    return darkMediaQuery.matches ? "dark" : "light";
  }

  function getEffectiveScheme() {
    const content = colorSchemeMeta?.getAttribute("content");
    if (content === "dark" || content === "light") return content;
    return getSystemScheme();
  }

  function syncThemeToggleUI() {
    if (!themeToggleInput) return;
    const isDark = getEffectiveScheme() === "dark";
    themeToggleInput.checked = isDark;
    themeToggleInput.setAttribute(
      "aria-label",
      isDark
        ? bi("深色背景已開啟，點擊切換為淺色背景", "Dark mode active; click to switch to light")
        : bi("淺色背景已開啟，點擊切換為深色背景", "Light mode active; click to switch to dark")
    );
  }
  window.addEventListener("ui-language-change", syncThemeToggleUI);

  themeToggleInput?.addEventListener("change", () => {
    const currentlyRendered = getEffectiveScheme();
    const target = currentlyRendered === "dark" ? "light" : "dark";
    const systemScheme = getSystemScheme();

    try {
      if (target === systemScheme) {
        localStorage.removeItem("color-scheme");
        colorSchemeMeta.setAttribute("content", "light dark");
      } else {
        localStorage.setItem("color-scheme", target);
        colorSchemeMeta.setAttribute("content", target);
      }
    } catch {
      colorSchemeMeta.setAttribute("content", target);
    }
    syncThemeToggleUI();
  });

  darkMediaQuery.addEventListener("change", () => {
    syncThemeToggleUI();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "color-scheme") {
      const val = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "light dark";
      colorSchemeMeta.setAttribute("content", val);
      syncThemeToggleUI();
    }
  });

  syncThemeToggleUI();
})();

function renderOptionChoices(containerId, items, radioName, selectedId, isSwatch = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  items.forEach(item => {
    const label = document.createElement("label");
    label.className = isSwatch ? "swatch-card" : "choice-card";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = radioName;
    radio.value = item.id;
    radio.className = "visually-hidden";
    radio.checked = item.id === selectedId;
    label.appendChild(radio);

    if (isSwatch) {
      const dot = document.createElement("span");
      dot.className = "swatch-dot";
      dot.style.background = item.hex;
      label.appendChild(dot);

      const textSpan = document.createElement("span");
      textSpan.textContent = isEn() ? (item.labelEn || item.label) : item.label;
      label.appendChild(textSpan);
    } else {
      const titleRow = document.createElement("span");
      titleRow.className = "choice-card-title";
      const displayLabel = isEn() ? (item.labelEn || item.label) : item.label;
      titleRow.innerHTML = `<span>${escapeHtml(displayLabel)}</span><span class="choice-check" aria-hidden="true">✓</span>`;
      label.appendChild(titleRow);
      const displayHint = isEn() ? (item.hintEn || item.hint) : item.hint;
      if (displayHint) {
        const sub = document.createElement("span");
        sub.className = "choice-card-sub";
        sub.textContent = displayHint;
        label.appendChild(sub);
      }
    }
    container.appendChild(label);
  });
}

function readAvatarFormValues() {
  const getChecked = (radioName, fallback) =>
    document.querySelector(`input[name="${radioName}"]:checked`)?.value || fallback;

  return {
    name: document.getElementById("avatar-name-input").value.trim(),
    build: getChecked("avatarBuild", "balanced"),
    skinTone: getChecked("avatarSkin", "peach"),
    hairStyle: getChecked("avatarHairStyle", "short"),
    hairColor: getChecked("avatarHairColor", "ink"),
    outfitColor: getChecked("avatarOutfit", "terracotta")
  };
}

function syncLiveAvatarPreview() {
  const cfg = readAvatarFormValues();
  const baseShirtColor = currentUserProfile?.avatar?.outfitColor;
  const activeShirtStyle = (isEditingAvatarFromRoom && cfg.outfitColor === baseShirtColor)
    ? (currentUserProfile?.roomState?.shirtStyle || DEFAULT_SHIRT_STYLE)
    : DEFAULT_SHIRT_STYLE;
  const activePantsStyle = isEditingAvatarFromRoom
    ? (currentUserProfile?.roomState?.pantsStyle || DEFAULT_PANTS_STYLE)
    : DEFAULT_PANTS_STYLE;
  document.getElementById("avatar-preview-name").textContent = cfg.name || bi("接案繪師", "Freelance Artist");
  if (avatarPreviewScene) {
    avatarPreviewScene.updateAvatar({
      ...cfg,
      shirtStyle: activeShirtStyle,
      pantsStyle: activePantsStyle
    });
  }
}

function populateOnboardingForm(existingAvatar, isEditing = false) {
  const cfg = { ...DEFAULT_AVATAR, ...(existingAvatar || {}) };
  const nameInput = document.getElementById("avatar-name-input");
  const countEl = document.getElementById("avatar-name-count");
  const cancelBtn = document.getElementById("cancel-avatar-edit-btn");
  const saveBtn = document.getElementById("save-avatar-btn");
  const titleEl = document.getElementById("onboarding-title");
  const subtitleEl = document.getElementById("onboarding-subtitle");

  clearFeedback("onboarding-feedback");
  nameInput.value = cfg.name || "";
  countEl.textContent = bi(
    `${[...nameInput.value.trim()].length} / 8 字`,
    `${[...nameInput.value.trim()].length} / 8 chars`
  );
  document.getElementById("avatar-preview-name").textContent = cfg.name || bi("接案繪師", "Freelance Artist");
  cancelBtn.classList.toggle("hidden", !isEditing);
  if (subtitleEl) {
    // Intro onboarding instruction is shown only on initial character creation after signup
    subtitleEl.classList.toggle("hidden", Boolean(isEditing));
  }
  titleEl.textContent = isEditing
    ? bi("調整角色造型與名字", "Customize Character Look & Name")
    : bi("建立你的接案繪師角色", "Create Your Freelance Illustrator");
  saveBtn.textContent = isEditing
    ? bi("儲存變更並回到房間", "Save Changes & Return to Studio")
    : bi("入住單人租屋處", "Move Into Studio Apartment");

  renderOptionChoices("avatar-build-choices", BODY_BUILDS, "avatarBuild", cfg.build, false);
  renderOptionChoices("avatar-skin-choices", SKIN_TONES, "avatarSkin", cfg.skinTone, true);
  renderOptionChoices("avatar-hairstyle-choices", HAIR_STYLES, "avatarHairStyle", cfg.hairStyle, false);
  renderOptionChoices("avatar-haircolor-choices", HAIR_COLORS, "avatarHairColor", cfg.hairColor, true);
  renderOptionChoices("avatar-outfit-choices", OUTFIT_COLORS, "avatarOutfit", cfg.outfitColor, true);
  syncAvatarOutfitShopNote(isEditing);
}

function syncAvatarOutfitShopNote(isEditing = false) {
  const noteEl = document.getElementById("avatar-outfit-shop-note");
  if (!noteEl) return;
  const equippedShopShirt = currentUserProfile?.roomState?.shirtStyle || DEFAULT_SHIRT_STYLE;
  const wearingShopTop = Boolean(isEditing && equippedShopShirt && equippedShopShirt !== DEFAULT_SHIRT_STYLE);
  noteEl.classList.toggle("hidden", !wearingShopTop);
  if (wearingShopTop) {
    const shirtItem = getShopItem(equippedShopShirt);
    const shirtName = shirtItem ? getShopItemName(shirtItem) : equippedShopShirt;
    noteEl.textContent = bi(
      `👕 目前穿著商店上衣「${shirtName}」；此基本配色只套用於「基本素色上衣」，如需改回素色可至商店切換。`,
      `👕 Wearing Studio Shop top "${shirtName}"; this color only changes the Basic Top (swap back anytime in Shop).`
    );
  }
}

document.getElementById("avatar-name-input").addEventListener("input", (e) => {
  const input = e.currentTarget;
  const trimmed = input.value.trim();
  const charCount = [...trimmed].length;
  document.getElementById("avatar-name-count").textContent = bi(`${charCount} / 8 字`, `${charCount} / 8 chars`);
  document.getElementById("avatar-preview-name").textContent = trimmed || bi("接案繪師", "Freelance Artist");
  if (charCount > 8) {
    input.setCustomValidity(bi("角色名稱最多只能輸入 8 個字元。", "Character name can be at most 8 characters."));
  } else if (charCount === 0) {
    input.setCustomValidity(bi("請輸入角色名稱。", "Please enter a character name."));
  } else {
    input.setCustomValidity("");
  }
});

document.getElementById("avatar-form").addEventListener("change", (e) => {
  if (e.target.matches('input[type="radio"]')) {
    syncLiveAvatarPreview();
  }
});

document.getElementById("cancel-avatar-edit-btn").addEventListener("click", () => {
  enterRoomView(false);
});

document.getElementById("avatar-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  clearFeedback("onboarding-feedback");

  const nameInput = document.getElementById("avatar-name-input");
  const rawName = nameInput.value.trim();
  const chars = [...rawName];
  if (chars.length < 1 || chars.length > 8) {
    nameInput.setCustomValidity(bi(
      "角色名稱需為 1 到 8 個字元（中文／英文皆以字數計算）。",
      "Character name must be 1 to 8 characters."
    ));
    nameInput.reportValidity();
    return;
  }
  nameInput.setCustomValidity("");

  const avatarPayload = readAvatarFormValues();

  const btn = document.getElementById("save-avatar-btn");
  btn.disabled = true;
  try {
    const updatePatch = {
      avatar: avatarPayload,
      updatedAt: serverTimestamp()
    };
    const prevOutfit = currentUserProfile?.avatar?.outfitColor;
    const prevShirtStyle = currentUserProfile?.roomState?.shirtStyle;
    if (
      isEditingAvatarFromRoom
      && prevOutfit
      && avatarPayload.outfitColor !== prevOutfit
      && prevShirtStyle
      && prevShirtStyle !== DEFAULT_SHIRT_STYLE
    ) {
      const nextRoomState = {
        ...(currentUserProfile?.roomState || {}),
        shirtStyle: DEFAULT_SHIRT_STYLE
      };
      updatePatch.roomState = nextRoomState;
      if (currentUserProfile) currentUserProfile.roomState = nextRoomState;
    }
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), updatePatch);
    if (currentUserProfile) currentUserProfile.avatar = avatarPayload;
    enterRoomView(false);
  } catch (err) {
    showFeedback("onboarding-feedback", "error", translateAuthError(err));
  } finally {
    btn.disabled = false;
  }
});

// Room HUD interactions
document.getElementById("room-rot-left-btn").addEventListener("click", () => {
  if (!roomScene) return;
  const q = roomScene.rotateLeft();
  syncRoomHUD();
  persistRoomState({ cameraQuarter: q });
});

document.getElementById("room-rot-right-btn").addEventListener("click", () => {
  if (!roomScene) return;
  const q = roomScene.rotateRight();
  syncRoomHUD();
  persistRoomState({ cameraQuarter: q });
});

const shopDialog = document.getElementById("shop-dialog");
let activeShopCategory = "all";
let shopPurchaseBusy = false;
let pendingSellItemId = null;
let shopResellFilterOnly = false;

function buildTextilePreviewSvg(item) {
  if (item.sheetStyle) {
    const s = item.sheetStyle;
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <!-- Floor shadow -->
        <ellipse cx="122" cy="144" rx="74" ry="24" fill="#d6c5b0" opacity="0.55" />
        <!-- Wooden Headboard -->
        <polygon points="122,42 184,70 184,104 122,76" fill="#a87448" />
        <polygon points="116,46 122,42 122,76 116,80" fill="#8f5f39" />
        <!-- Wooden Frame Base -->
        <polygon points="56,112 124,145 184,114 118,82" fill="#b98456" />
        <polygon points="56,112 124,145 124,154 56,121" fill="#9c6b45" />
        <polygon points="124,145 184,114 184,123 124,154" fill="#835736" />
        <!-- Plump Fitted Sheet / Mattress -->
        <polygon points="60,104 124,135 180,106 118,76" fill="${s.sheetColor}" stroke="#e2d9cc" stroke-width="1" />
        <polygon points="60,104 124,135 124,144 60,113" fill="${s.sheetColor}" />
        <polygon points="124,135 180,106 180,115 124,144" fill="${s.sheetColor}" opacity="0.92" />
        <!-- Folded Duvet Blanket -->
        <polygon points="58,105 112,131 154,110 100,84" fill="${s.blanketColor}" />
        <polygon points="58,105 112,131 112,141 58,115" fill="${s.blanketColor}" />
        <polygon points="112,131 154,110 154,120 112,141" fill="${s.blanketColor}" opacity="0.88" />
        <!-- Fluffy Pillow -->
        <ellipse cx="144" cy="92" rx="22" ry="11" transform="rotate(24 144 92)" fill="${s.pillowColor}" stroke="#dfd6c8" stroke-width="1.2" />
      </svg>
    `;
  }
  if (item.rugStyle) {
    const r = item.rugStyle;
    let rugDrawing = "";
    if (r.pattern === "round") {
      rugDrawing = `
        <ellipse cx="120" cy="112" rx="68" ry="36" fill="${r.baseColor}" stroke="#4e6e56" stroke-width="1.4" />
        <ellipse cx="120" cy="112" rx="46" ry="24" fill="${r.accentColor}" />
      `;
    } else if (r.pattern === "checker") {
      rugDrawing = `
        <polygon points="120,66 192,108 120,150 48,108" fill="${r.baseColor}" stroke="#cfc2ae" stroke-width="1.2" />
        <polygon points="120,76 144,90 120,104 96,90" fill="${r.accentColor}" />
        <polygon points="96,90 120,104 96,118 72,104" fill="${r.accentColor}" />
        <polygon points="144,90 168,104 144,118 120,104" fill="${r.accentColor}" />
        <polygon points="120,104 144,118 120,132 96,118" fill="${r.accentColor}" />
      `;
    } else if (r.pattern === "nordic") {
      rugDrawing = `
        <polygon points="120,66 192,108 120,150 48,108" fill="${r.baseColor}" stroke="#cbd5e1" stroke-width="1.2" />
        <polygon points="120,90 148,108 120,126 92,108" fill="${r.accentColor}" />
        <line x1="74" y1="93" x2="104" y2="76" stroke="${r.accentColor}" stroke-width="3.2" stroke-linecap="round" />
        <line x1="136" y1="139" x2="166" y2="122" stroke="${r.accentColor}" stroke-width="3.2" stroke-linecap="round" />
      `;
    } else {
      rugDrawing = `
        <polygon points="120,66 192,108 120,150 48,108" fill="${r.baseColor}" />
        <polygon points="120,76 176,108 120,140 64,108" fill="${r.accentColor}" />
        <polygon points="120,86 158,108 120,130 82,108" fill="${r.baseColor}" />
        <line x1="56" y1="115" x2="48" y2="119" stroke="${r.accentColor}" stroke-width="2.2" />
        <line x1="72" y1="124" x2="64" y2="128" stroke="${r.accentColor}" stroke-width="2.2" />
        <line x1="88" y1="133" x2="80" y2="137" stroke="${r.accentColor}" stroke-width="2.2" />
        <line x1="104" y1="142" x2="96" y2="146" stroke="${r.accentColor}" stroke-width="2.2" />
      `;
    }
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <!-- Wood Floor Surface -->
        <polygon points="120,38 220,96 120,164 20,96" fill="#d8a774" />
        <line x1="45" y1="81" x2="145" y2="148" stroke="#c4905c" stroke-width="1" opacity="0.65" />
        <line x1="75" y1="64" x2="175" y2="130" stroke="#c4905c" stroke-width="1" opacity="0.65" />
        <line x1="105" y1="47" x2="205" y2="112" stroke="#c4905c" stroke-width="1" opacity="0.65" />
        ${rugDrawing}
      </svg>
    `;
  }
  if (item.shirtStyle) {
    const sh = item.shirtStyle;
    const bodyCol = sh.shirtColor || "#d96b43";
    const sleeveCol = sh.sleeveColor || bodyCol;
    const collarCol = sh.collarColor || "#f5f1e6";
    const detCol = sh.detailColor || collarCol;
    let detailSvg = "";
    if (sh.detailType === "pocket") {
      detailSvg = `<rect x="131" y="76" width="16" height="18" rx="3" fill="${detCol}" stroke="rgba(15,23,42,0.12)" stroke-width="1" />`;
    } else if (sh.detailType === "cardigan") {
      detailSvg = `<rect x="108" y="54" width="24" height="90" rx="3" fill="${detCol}" stroke="rgba(15,23,42,0.1)" stroke-width="1" />`;
    } else if (sh.detailType === "stripe") {
      detailSvg = `<rect x="82" y="84" width="76" height="16" fill="${detCol}" />`;
    } else if (sh.detailType === "hoodie") {
      detailSvg = `
        <path d="M98,49 Q120,33 142,49" fill="none" stroke="${bodyCol}" stroke-width="8" stroke-linecap="round" />
        <line x1="112" y1="62" x2="112" y2="86" stroke="${detCol}" stroke-width="2.6" stroke-linecap="round" />
        <line x1="128" y1="62" x2="128" y2="84" stroke="${detCol}" stroke-width="2.6" stroke-linecap="round" />
      `;
    }
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <!-- Wooden Hanger -->
        <path d="M120,25 C120,18 127,18 127,23 C127,27 120,28 120,33" fill="none" stroke="#8d6241" stroke-width="2.6" stroke-linecap="round" />
        <path d="M74,55 L120,35 L166,55" fill="none" stroke="#9c6b45" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Sleeves -->
        <polygon points="82,48 52,70 64,92 86,78" fill="${sleeveCol}" stroke="rgba(15,23,42,0.1)" stroke-width="1.2" />
        <polygon points="158,48 188,70 176,92 154,78" fill="${sleeveCol}" stroke="rgba(15,23,42,0.1)" stroke-width="1.2" />
        <!-- Shirt Body -->
        <path d="M82,48 L104,48 Q120,62 136,48 L158,48 L158,144 Q120,147 82,144 Z" fill="${bodyCol}" stroke="rgba(15,23,42,0.1)" stroke-width="1.2" />
        <!-- Collar -->
        <path d="M101,48 Q120,65 139,48" fill="none" stroke="${collarCol}" stroke-width="5.5" stroke-linecap="round" />
        ${detailSvg}
      </svg>
    `;
  }
  if (item.pantsStyle) {
    const pt = item.pantsStyle;
    const pCol = pt.pantsColor || "#374151";
    const beltCol = pt.beltColor || pCol;
    const legH = pt.isShorts ? 104 : 152;
    const cuffSvg = (!pt.isShorts && pt.cuffColor)
      ? `
        <rect x="82" y="142" width="32" height="11" rx="2" fill="${pt.cuffColor}" />
        <rect x="126" y="142" width="32" height="11" rx="2" fill="${pt.cuffColor}" />
      `
      : "";
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <!-- Pants Legs -->
        <path d="M82,34 L158,34 L158,${legH} L126,${legH} L120,76 L114,${legH} L82,${legH} Z" fill="${pCol}" stroke="rgba(15,23,42,0.12)" stroke-width="1.3" stroke-linejoin="round" />
        <!-- Waistband & Belt -->
        <rect x="82" y="28" width="76" height="10" rx="2.5" fill="${beltCol}" stroke="rgba(15,23,42,0.12)" stroke-width="1" />
        <rect x="115" y="28" width="10" height="10" rx="1.5" fill="none" stroke="#f5f0e6" stroke-width="1.4" opacity="0.8" />
        <!-- Pocket Seam Accent -->
        <path d="M83,50 Q94,52 98,39" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.4" />
        <path d="M157,50 Q146,52 142,39" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.4" />
        ${cuffSvg}
      </svg>
    `;
  }
  if (item.floorStyle) {
    const fl = item.floorStyle;
    const base = fl.baseColor || "#d8a774";
    const accent = fl.accentColor || "#c4905c";
    const detail = fl.detailColor || "#b87f4a";
    let patternSvg = "";
    if (fl.pattern === "wood_plank") {
      patternSvg = `
        <line x1="36" y1="79" x2="136" y2="145" stroke="${accent}" stroke-width="1.6" opacity="0.7" />
        <line x1="58" y1="65" x2="158" y2="131" stroke="${accent}" stroke-width="1.6" opacity="0.7" />
        <line x1="80" y1="50" x2="180" y2="116" stroke="${accent}" stroke-width="1.6" opacity="0.7" />
        <line x1="102" y1="36" x2="202" y2="102" stroke="${accent}" stroke-width="1.6" opacity="0.7" />
        <line x1="90" y1="78" x2="112" y2="63" stroke="${detail}" stroke-width="1.2" opacity="0.6" />
        <line x1="145" y1="112" x2="167" y2="97" stroke="${detail}" stroke-width="1.2" opacity="0.6" />
      `;
    } else if (fl.pattern === "herringbone") {
      patternSvg = `
        <path d="M55,70 L95,96 L135,70 M75,92 L115,118 L155,92 M95,114 L135,140 L175,114 M40,94 L80,120 L120,94" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linejoin="round" opacity="0.82" />
        <path d="M75,56 L115,82 L155,56 M100,82 L140,108 L180,82" fill="none" stroke="${detail}" stroke-width="2" stroke-linejoin="round" opacity="0.65" />
      `;
    } else if (fl.pattern === "tatami") {
      patternSvg = `
        <polygon points="120,24 170,57 120,90 70,57" fill="${base}" stroke="${detail}" stroke-width="1.2" />
        <polygon points="70,57 120,90 70,123 20,90" fill="${detail}" fill-opacity="0.22" />
        <line x1="70" y1="57" x2="170" y2="123" stroke="${accent}" stroke-width="4.5" />
        <line x1="120" y1="24" x2="70" y2="57" stroke="${accent}" stroke-width="4" />
        <line x1="120" y1="90" x2="220" y2="90" stroke="${accent}" stroke-width="3.5" opacity="0.9" />
      `;
    } else if (fl.pattern === "marble") {
      patternSvg = `
        <path d="M44,82 Q92,98 134,58 T194,88" fill="none" stroke="${accent}" stroke-width="2.2" opacity="0.65" />
        <path d="M62,112 Q115,96 155,126 T205,104" fill="none" stroke="${detail}" stroke-width="1.8" opacity="0.8" />
        <line x1="70" y1="57" x2="170" y2="123" stroke="${detail}" stroke-width="1.2" opacity="0.65" />
        <line x1="170" y1="57" x2="70" y2="123" stroke="${detail}" stroke-width="1.2" opacity="0.65" />
      `;
    } else if (fl.pattern === "terrazzo") {
      patternSvg = `
        <polygon points="92,58 102,54 99,64" fill="${accent}" />
        <polygon points="132,68 144,74 134,82" fill="${detail}" />
        <polygon points="74,88 86,84 82,95" fill="#e6b86a" />
        <polygon points="116,96 128,92 124,104" fill="${accent}" />
        <polygon points="154,90 166,86 162,98" fill="${detail}" />
        <polygon points="98,116 110,112 106,123" fill="#8d99ae" />
        <polygon points="134,120 144,116 141,126" fill="${accent}" />
        <circle cx="118" cy="74" r="4" fill="#d97706" opacity="0.7" />
        <circle cx="88" cy="103" r="3.5" fill="${detail}" opacity="0.8" />
      `;
    } else if (fl.pattern === "slate") {
      patternSvg = `
        <line x1="45" y1="73" x2="145" y2="139" stroke="${accent}" stroke-width="2" />
        <line x1="95" y1="40" x2="195" y2="106" stroke="${accent}" stroke-width="2" />
        <line x1="145" y1="40" x2="45" y2="106" stroke="${accent}" stroke-width="2" />
        <line x1="195" y1="73" x2="95" y2="139" stroke="${accent}" stroke-width="2" />
        <polygon points="95,73 145,40 195,73 145,106" fill="${detail}" fill-opacity="0.28" />
      `;
    } else if (fl.pattern === "checker") {
      patternSvg = `
        <polygon points="120,24 170,57 120,90 70,57" fill="${accent}" />
        <polygon points="70,57 120,90 70,123 20,90" fill="${base}" />
        <polygon points="170,57 220,90 170,123 120,90" fill="${base}" />
        <polygon points="120,90 170,123 120,156 70,123" fill="${accent}" />
      `;
    } else if (fl.pattern === "hexagon") {
      patternSvg = `
        <polygon points="120,56 144,70 144,96 120,110 96,96 96,70" fill="${accent}" stroke="${detail}" stroke-width="2.4" />
        <polygon points="72,82 96,96 96,122 72,136 48,122 48,96" fill="${base}" stroke="${detail}" stroke-width="2.4" />
        <polygon points="168,82 192,96 192,122 168,136 144,122 144,96" fill="${base}" stroke="${detail}" stroke-width="2.4" />
        <polygon points="120,110 144,124 144,150 120,164 96,150 96,124" fill="${accent}" stroke="${detail}" stroke-width="2.4" />
      `;
    } else if (fl.pattern === "moroccan") {
      patternSvg = `
        <rect x="98" y="68" width="44" height="44" fill="${detail}" opacity="0.78" />
        <rect x="98" y="68" width="44" height="44" transform="rotate(45 120 90)" fill="${accent}" opacity="0.9" />
        <circle cx="120" cy="90" r="9" fill="${base}" stroke="${accent}" stroke-width="2.2" />
        <rect x="46" y="76" width="22" height="22" transform="rotate(45 57 87)" fill="${detail}" opacity="0.6" />
        <rect x="172" y="76" width="22" height="22" transform="rotate(45 183 87)" fill="${detail}" opacity="0.6" />
      `;
    }
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
          <clipPath id="clip-${item.id}">
            <polygon points="120,24 220,90 120,156 20,90" />
          </clipPath>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <polygon points="20,90 120,156 120,166 20,100" fill="${accent}" opacity="0.92" />
        <polygon points="120,156 220,90 220,100 120,166" fill="${accent}" opacity="0.72" />
        <polygon points="120,24 220,90 120,156 20,90" fill="${base}" />
        <g clip-path="url(#clip-${item.id})">
          ${patternSvg}
        </g>
        <polygon points="120,24 220,90 120,156 20,90" fill="none" stroke="rgba(15,23,42,0.14)" stroke-width="1.2" />
      </svg>
    `;
  }
  if (item.deskStyle) {
    const ds = item.deskStyle;
    const topCol = ds.topColor || "#cfa072";
    const grainCol = ds.grainColor || "#bc8b5b";
    const detailCol = ds.detailColor || "#d9b084";
    const legCol = ds.legColor || "#4b5563";
    let surfaceSvg = "";
    if (ds.pattern === "wood" || ds.pattern === "brushed") {
      surfaceSvg = `
        <line x1="60" y1="68" x2="152" y2="108" stroke="${grainCol}" stroke-width="1.4" opacity="0.58" />
        <line x1="78" y1="60" x2="170" y2="100" stroke="${grainCol}" stroke-width="1.4" opacity="0.58" />
        <line x1="96" y1="52" x2="188" y2="92" stroke="${detailCol}" stroke-width="1.1" opacity="0.55" />
      `;
    } else if (ds.pattern === "marble") {
      surfaceSvg = `
        <path d="M58,74 Q110,82 146,56 T186,84" fill="none" stroke="${grainCol}" stroke-width="1.8" opacity="0.68" />
        <path d="M84,96 Q130,86 168,104" fill="none" stroke="${detailCol}" stroke-width="1.4" opacity="0.72" />
      `;
    } else if (ds.pattern === "terrazzo") {
      surfaceSvg = `
        <polygon points="88,68 96,65 93,73" fill="${grainCol}" />
        <polygon points="126,64 134,68 128,74" fill="${detailCol}" />
        <polygon points="108,84 116,80 113,89" fill="${grainCol}" />
        <polygon points="146,82 155,79 152,88" fill="${detailCol}" />
        <polygon points="74,80 82,78 79,86" fill="#e9c46a" />
      `;
    }
    return `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
          <clipPath id="clip-${item.id}">
            <polygon points="44,74 118,42 196,76 122,108" />
          </clipPath>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <!-- Floor shadow -->
        <ellipse cx="120" cy="144" rx="74" ry="18" fill="#d6c5b0" opacity="0.48" />
        <!-- 4 Cylindrical Legs matching 3D desk design -->
        <rect x="115" y="76" width="7" height="52" rx="3" fill="${legCol}" opacity="0.82" />
        <rect x="52" y="80" width="7" height="58" rx="3" fill="${legCol}" />
        <rect x="181" y="82" width="7" height="58" rx="3" fill="${legCol}" />
        <rect x="119" y="108" width="7" height="56" rx="3" fill="${legCol}" />
        <!-- Rounded Minimalist Tabletop -->
        <polygon points="44,74 122,108 122,118 44,84" fill="${topCol}" />
        <polygon points="44,74 122,108 122,118 44,84" fill="#0f172a" fill-opacity="0.08" />
        <polygon points="122,108 196,76 196,86 122,118" fill="${topCol}" />
        <polygon points="122,108 196,76 196,86 122,118" fill="#0f172a" fill-opacity="0.16" />
        <polygon points="44,74 118,42 196,76 122,108" fill="${topCol}" />
        <g clip-path="url(#clip-${item.id})">
          ${surfaceSvg}
        </g>
        <polygon points="44,74 118,42 196,76 122,108" fill="none" stroke="rgba(15,23,42,0.12)" stroke-width="1" />
      </svg>
    `;
  }
  return "";
}

const LEGACY_ROOM_STYLE_KINDS = new Set([
  "bedSheet",
  "rugStyle",
  "shirtStyle",
  "pantsStyle"
]);

function getActiveRoomStyle(roomState, kind, fallback = "default") {
  if (!kind) return fallback;
  return roomState?.[kind] || roomState?.customStyles?.[kind] || fallback;
}

function withRoomStyleUpdate(prevRoomState, kind, nextId) {
  const baseState = (prevRoomState && typeof prevRoomState === "object")
    ? { ...prevRoomState }
    : {
        cameraQuarter: 0,
        deskLampOn: true,
        bedLampOn: false,
        wallColor: DEFAULT_WALL_COLOR
      };
  if (!kind) return baseState;
  if (LEGACY_ROOM_STYLE_KINDS.has(kind)) {
    baseState[kind] = nextId;
    return baseState;
  }
  // Future customizer categories store into extensible roomState.customStyles
  // (only keeping non-default owned IDs so Firestore rules stay future-proof without schema edits).
  const prevCustom = (baseState.customStyles && typeof baseState.customStyles === "object" && !Array.isArray(baseState.customStyles))
    ? { ...baseState.customStyles }
    : {};
  if (!nextId || nextId === "default") {
    delete prevCustom[kind];
  } else {
    prevCustom[kind] = nextId;
  }
  baseState.customStyles = prevCustom;
  return baseState;
}

async function equipShopTextile(textileKind, nextId, triggerBtn = null) {
  if (!currentUser || !currentUserProfile || shopPurchaseBusy) return;
  if (typeof textileKind !== "string" || !textileKind.trim()) return;
  clearFeedback("shop-feedback");
  shopPurchaseBusy = true;
  const prevBtnText = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = bi("切換中...", "Switching...");
  }
  try {
    const nextRoomState = withRoomStyleUpdate(currentUserProfile.roomState, textileKind, nextId);
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
      roomState: nextRoomState,
      updatedAt: serverTimestamp()
    });
    currentUserProfile.roomState = nextRoomState;
    if (textileKind === "bedSheet") {
      roomScene?.setBedSheet(nextId);
    } else if (textileKind === "deskStyle") {
      roomScene?.setDeskStyle(nextId);
    } else if (textileKind === "rugStyle") {
      roomScene?.setRugStyle(nextId);
    } else if (textileKind === "shirtStyle") {
      roomScene?.setShirtStyle(nextId);
    } else if (textileKind === "pantsStyle") {
      roomScene?.setPantsStyle(nextId);
    }
    const defaultLabels = {
      bedSheet: bi("經典海鹽藍床組", "Sea-Salt Blue Bedding"),
      deskStyle: bi("經典原木蜂蜜桌", "Classic Honey Wood Desk"),
      rugStyle: bi("奶油燕麥原味地毯", "Oatmeal Cream Rug"),
      shirtStyle: bi("基本素色上衣", "Basic Studio Top"),
      pantsStyle: bi("經典深灰長褲", "Classic Charcoal Trousers")
    };
    const nextItem = getShopItem(nextId);
    const label = nextId === "default"
      ? (defaultLabels[textileKind] || nextId)
      : (nextItem ? getShopItemName(nextItem) : nextId);
    showFeedback("shop-feedback", "success", bi(`已免費切換為「${label}」！`, `Switched to "${label}" for free!`));
    renderShopDialog();
  } catch (err) {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = prevBtnText;
    }
    showFeedback("shop-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    shopPurchaseBusy = false;
  }
}

function buildOwnedShopSections(activeCatalog, owned) {
  const defaultGroups = [
    {
      id: "owned_shirt",
      titleZh: "👕 上衣穿搭",
      titleEn: "👕 Tops",
      category: "shirt",
      defaultItem: {
        id: "builtin_default_shirt",
        styleId: DEFAULT_SHIRT_STYLE,
        isBuiltinDefault: true,
        textileKind: "shirtStyle",
        name: "基本素色上衣",
        nameEn: "Basic Studio Top",
        desc: "主角的預設素色穿搭上衣，可隨時免費換穿。",
        descEn: "Default studio top matching your avatar's base color. Always free to swap.",
        shirtStyle: {
          ...SHIRT_STYLE_PRESETS.default,
          shirtColor: currentUserProfile?.avatar?.outfitColor || "#d96b43"
        }
      }
    },
    {
      id: "owned_pants",
      titleZh: "👖 褲款下著",
      titleEn: "👖 Bottoms",
      category: "pants",
      defaultItem: {
        id: "builtin_default_pants",
        styleId: DEFAULT_PANTS_STYLE,
        isBuiltinDefault: true,
        textileKind: "pantsStyle",
        name: "經典深灰長褲",
        nameEn: "Classic Charcoal Trousers",
        desc: "百搭耐看的預設深灰工作長褲，可隨時免費換穿。",
        descEn: "Classic everyday charcoal trousers. Always free to swap.",
        pantsStyle: PANTS_STYLE_PRESETS.default
      }
    },
    {
      id: "owned_bed",
      titleZh: "🛏️ 床單顏色",
      titleEn: "🛏️ Bedding",
      category: "textile",
      textileKind: "bedSheet",
      defaultItem: {
        id: "builtin_default_bed",
        styleId: DEFAULT_BED_SHEET,
        isBuiltinDefault: true,
        textileKind: "bedSheet",
        name: "經典海鹽藍床組",
        nameEn: "Sea-Salt Blue Bedding",
        desc: "溫暖清爽的預設海鹽藍被單與枕頭組合，可隨時免費換回。",
        descEn: "Default sea-salt blue blanket & cream sheets. Always free to restore.",
        sheetStyle: BED_SHEET_PRESETS.default
      }
    },
    {
      id: "owned_rug",
      titleZh: "🧶 地毯樣式",
      titleEn: "🧶 Rugs",
      category: "textile",
      textileKind: "rugStyle",
      defaultItem: {
        id: "builtin_default_rug",
        styleId: DEFAULT_RUG_STYLE,
        isBuiltinDefault: true,
        textileKind: "rugStyle",
        name: "奶油燕麥原味地毯",
        nameEn: "Oatmeal Cream Rug",
        desc: "房間預設的編織奶油燕麥地毯，可隨時免費換回。",
        descEn: "Default woven oatmeal studio rug. Always free to restore.",
        rugStyle: RUG_STYLE_PRESETS.default
      }
    },
    {
      id: "owned_desk",
      titleZh: "🪑 書桌材質",
      titleEn: "🪑 Desk Materials",
      category: "desk",
      defaultItem: {
        id: "builtin_default_desk",
        styleId: DEFAULT_DESK_STYLE,
        isBuiltinDefault: true,
        textileKind: "deskStyle",
        name: "經典原木蜂蜜桌",
        nameEn: "Classic Honey Wood Desk",
        desc: "工作室預設的溫潤原木桌面搭配消光深灰桌腳，可隨時免費換回。",
        descEn: "Default honey-oak tabletop with matte charcoal legs. Always free to restore.",
        deskStyle: DESK_STYLE_PRESETS.default
      }
    },
    {
      id: "owned_decor",
      titleZh: "🛋️ 生活家具與擺設",
      titleEn: "🛋️ Furniture & Decor",
      category: "decor"
    },
    {
      id: "owned_gear",
      titleZh: "⌨️ 接案設備",
      titleEn: "⌨️ Studio Gear",
      category: "gear"
    }
  ];

  const sections = [];
  defaultGroups.forEach(group => {
    const ownedInGroup = activeCatalog.filter(item =>
      !item.consumable
      && Boolean(owned[item.id])
      && item.category === group.category
      && (!group.textileKind || item.textileKind === group.textileKind)
    );
    const sectionItems = group.defaultItem
      ? [group.defaultItem, ...ownedInGroup]
      : ownedInGroup;
    if (sectionItems.length > 0) {
      sections.push({
        id: group.id,
        title: bi(group.titleZh, group.titleEn),
        items: sectionItems
      });
    }
  });
  return sections;
}

function createShopItemCard(item, ctx) {
  const {
    isSuperAdmin,
    clams,
    owned,
    activeWallColor,
    activeFloorStyle,
    activeLayout,
    activeParcels,
    roomState
  } = ctx;

  const styleTargetId = item.styleId || item.id;
  const isBuiltinDefault = Boolean(item.isBuiltinDefault);
  const isPaint = Boolean(item.consumable && item.wallColor);
  const isFloor = Boolean(item.consumable && item.floorStyle);
  const isTextile = !isFloor && Boolean(item.textileKind);
  const isDesk = item.textileKind === "deskStyle";
  const isApparel = item.textileKind === "shirtStyle" || item.textileKind === "pantsStyle";
  const isActivePaint = isPaint && item.wallColor.toLowerCase() === activeWallColor;
  const itemFloorTarget = item.floorStyleId || item.id;
  const isActiveFloor = isFloor && (
    activeFloorStyle === itemFloorTarget
    || (itemFloorTarget === DEFAULT_FLOOR_STYLE && activeFloorStyle === "floor_honey_oak")
  );
  const isPermanentOwned = isBuiltinDefault || (!isPaint && !isFloor && Boolean(owned[item.id]));
  const isActiveTextile = isTextile && (
    getActiveRoomStyle(roomState, item.textileKind) === styleTargetId
  );
  const missingPrereqs = isPermanentOwned ? [] : getMissingShopPrerequisites(item, owned);
  const isLocked = missingPrereqs.length > 0;
  const isInParcel = Boolean(!isBuiltinDefault && isPermanentOwned && activeParcels[item.id]);
  const gridMeta = PLACEABLE_FURNITURE_META[item.id] || null;
  const gridAvail = (!isPaint && !isFloor && !isTextile && !isPermanentOwned && gridMeta)
    ? checkShopItemGridAvailability(item.id, owned, activeLayout, activeParcels)
    : { ok: true, placeable: false, neededCells: 0, reason: "" };

  const card = document.createElement("div");
  card.className = `shop-item-card${(isActivePaint || isActiveFloor || (isTextile ? isActiveTextile : isPermanentOwned)) ? " is-owned" : ""}${isLocked ? " is-locked" : ""}`;

  const previewBox = document.createElement("div");
  previewBox.className = "shop-item-preview";
  if (item.previewImage) {
    const img = document.createElement("img");
    img.src = `${item.previewImage}?v=20261125k`;
    img.alt = getShopItemName(item);
    img.loading = "lazy";
    previewBox.appendChild(img);
  } else if (item.wallColor) {
    previewBox.innerHTML = `
      <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
        <defs>
          <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f2ea" />
            <stop offset="100%" stop-color="#e9e0d3" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="url(#bg-${item.id})" />
        <polygon points="120,118 205,154 120,175 35,154" fill="#d8a774" />
        <polygon points="35,44 120,16 120,118 35,154" fill="${item.wallColor}" />
        <polygon points="120,16 205,44 205,154 120,118" fill="${item.wallColor}" fill-opacity="0.88" />
        <polygon points="120,16 205,44 205,154 120,118" fill="#0f172a" fill-opacity="0.09" />
        <polygon points="35,142 120,108 120,118 35,154" fill="#e5d7c3" />
        <polygon points="120,108 205,142 205,154 120,118" fill="#d7c5ac" />
        <ellipse cx="146" cy="144" rx="19" ry="7" fill="#94a3b8" />
        <path d="M127,122 L127,144 A19,7 0 0,0 165,144 L165,122 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.2" />
        <ellipse cx="146" cy="122" rx="19" ry="7" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
        <ellipse cx="146" cy="122" rx="14.5" ry="4.8" fill="${item.wallColor}" />
        <rect x="86" y="76" width="32" height="12" rx="5" transform="rotate(-18 102 82)" fill="${item.wallColor}" stroke="#64748b" stroke-width="1.4" />
        <path d="M106,89 L114,104 L106,120" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round" />
      </svg>
    `;
  } else if (item.sheetStyle || item.rugStyle || item.shirtStyle || item.pantsStyle || item.floorStyle || item.deskStyle) {
    previewBox.innerHTML = buildTextilePreviewSvg(item);
  }
  if (isLocked) {
    const lockBadge = document.createElement("span");
    lockBadge.className = "shop-lock-badge";
    lockBadge.textContent = bi("🔒 組合解鎖", "🔒 Bundle Unlock");
    previewBox.appendChild(lockBadge);
  }

  const head = document.createElement("div");
  head.className = "shop-item-head";

  const iconBox = document.createElement("div");
  iconBox.className = "shop-item-icon";
  const swatchHex = item.wallColor
    || item.floorStyle?.baseColor
    || item.deskStyle?.topColor
    || item.sheetStyle?.blanketColor
    || item.rugStyle?.baseColor
    || item.shirtStyle?.shirtColor
    || item.pantsStyle?.pantsColor;
  if (swatchHex) {
    const dot = document.createElement("span");
    dot.className = "shop-item-swatch";
    dot.style.background = swatchHex;
    iconBox.appendChild(dot);
  } else {
    iconBox.textContent = item.icon || "🎁";
  }

  const itemTitleText = getShopItemName(item);
  const meta = document.createElement("div");
  const title = document.createElement("div");
  title.className = "shop-item-name";
  title.textContent = itemTitleText;
  const priceEl = document.createElement("div");
  priceEl.className = "shop-item-price";
  const xpReward = isBuiltinDefault ? 0 : calculateShopPurchaseXp(item.price);
  const resalePrice = (!isBuiltinDefault && isSellableShopItem(item)) ? calculateShopResalePrice(item.price) : 0;
  const xpSuffix = xpReward > 0 ? ` · +${xpReward} XP` : "";
  const unitClams = bi("英蚌", "Clams");
  priceEl.textContent = isBuiltinDefault
    ? bi("系統預設款式（可隨時免費換回）", "Built-in Default (Free to Swap)")
    : isPaint
      ? bi(
          `${item.price} 英蚌${isActivePaint ? "" : xpSuffix}（每次重刷計費）`,
          `${item.price} Clams${isActivePaint ? "" : xpSuffix} (per repaint)`
        )
      : isFloor
        ? bi(
            `${item.price} 英蚌${isActiveFloor ? "" : xpSuffix}（每次重鋪計費）`,
            `${item.price} Clams${isActiveFloor ? "" : xpSuffix} (per re-lay)`
          )
        : (isTextile && isPermanentOwned)
          ? bi(`${item.price} 英蚌（已購，免費更換）`, `${item.price} Clams (owned · free swap)`)
          : isPermanentOwned
            ? (isSellableShopItem(item)
              ? bi(`原價 ${item.price} 英蚌 · 二手價 ${resalePrice} 英蚌`, `Orig ${item.price} ${unitClams} · Resale ${resalePrice} ${unitClams}`)
              : `${item.price} ${unitClams}`)
            : `${item.price} ${unitClams}${xpSuffix}`;
  meta.append(title, priceEl);
  head.append(iconBox, meta);

  const desc = document.createElement("div");
  desc.className = "shop-item-desc";
  desc.textContent = getShopItemDesc(item);

  let gridBadgeEl = null;
  if (gridMeta) {
    const companions = getCompanionPlaceableIds(item.id);
    const totalGridCells = companions.reduce((sum, cid) => {
      const cm = PLACEABLE_FURNITURE_META[cid];
      if (!cm) return sum;
      return sum + (cm.surface === "wall" ? cm.gridW : cm.gridW * cm.gridD);
    }, 0) || (gridMeta.surface === "wall" ? gridMeta.gridW : gridMeta.gridW * gridMeta.gridD);
    gridBadgeEl = document.createElement("div");
    gridBadgeEl.className = `shop-grid-badge${(!isPermanentOwned && !gridAvail.ok) ? " is-full" : ""}`;
    gridBadgeEl.textContent = gridMeta.surface === "wall"
      ? bi(`🧱 佔用 ${gridMeta.gridW} 格牆面網格`, `🧱 Uses ${gridMeta.gridW} wall grid cell(s)`)
      : (companions.length > 1
        ? bi(
            `📐 佔用 ${companions.length} 組共 ${totalGridCells} 格地面（各可獨立拖曳旋轉）`,
            `📐 ${companions.length} pieces (${totalGridCells} floor cells, moved independently)`
          )
        : bi(
            `📐 佔用 ${gridMeta.gridW}×${gridMeta.gridD}（${gridMeta.gridW * gridMeta.gridD} 格地面）`,
            `📐 ${gridMeta.gridW}×${gridMeta.gridD} (${gridMeta.gridW * gridMeta.gridD} floor cells)`
          ));
  }

  const actionBtn = document.createElement("button");
  actionBtn.type = "button";
  actionBtn.className = "btn";
  actionBtn.style.width = "100%";
  let actionNode = actionBtn;

  if (isActivePaint) {
    actionBtn.textContent = bi("目前牆色 ✓", "Current Wall ✓");
    actionBtn.disabled = true;
  } else if (isActiveFloor) {
    actionBtn.textContent = bi("目前地板 ✓", "Current Floor ✓");
    actionBtn.disabled = true;
  } else if (isActiveTextile) {
    actionBtn.textContent = isApparel
      ? bi("目前穿著中 ✓", "Wearing ✓")
      : bi("目前使用中 ✓", "Equipped ✓");
    actionBtn.disabled = true;
  } else if (isTextile && isPermanentOwned) {
    actionBtn.classList.add("btn-primary");
    actionBtn.textContent = isBuiltinDefault
      ? (isApparel
        ? bi("換回預設（免費）", "Wear Default (Free)")
        : isDesk
          ? bi("換回預設桌面（免費）", "Restore Default Desk (Free)")
          : bi("換回預設（免費）", "Restore Default (Free)"))
      : (isApparel
        ? bi("換穿這件（免費）", "Wear This (Free)")
        : isDesk
          ? bi("換用這款桌面（免費）", "Use This Desk (Free)")
          : bi("套用更換（免費）", "Equip (Free)"));
    actionBtn.onclick = () => equipShopTextile(item.textileKind, styleTargetId, actionBtn);
  } else if (isPermanentOwned && isSellableShopItem(item)) {
    const blockingDeps = getBlockingDependentOwnedItems(item.id, owned);
    if (blockingDeps.length > 0) {
      const depNames = blockingDeps.map(d => getShopItemName(d)).join(bi("」「", ", "));
      actionBtn.textContent = bi(
        `已擺進房間（需先賣出「${depNames}」）`,
        `In Room (Sell "${depNames}" first)`
      );
      actionBtn.disabled = true;
    } else if (pendingSellItemId === item.id) {
      const confirmRow = document.createElement("div");
      confirmRow.className = "shop-sell-row";
      const confirmSellBtn = document.createElement("button");
      confirmSellBtn.type = "button";
      confirmSellBtn.className = "btn shop-sell-confirm-btn";
      confirmSellBtn.textContent = bi(`確認賣出（+${resalePrice} 英蚌）`, `Confirm Sell (+${resalePrice})`);
      confirmSellBtn.onclick = () => sellShopItem(item.id, confirmSellBtn);
      const keepBtn = document.createElement("button");
      keepBtn.type = "button";
      keepBtn.className = "btn";
      keepBtn.textContent = bi("保留", "Keep");
      keepBtn.onclick = () => {
        pendingSellItemId = null;
        renderShopDialog();
      };
      confirmRow.append(confirmSellBtn, keepBtn);
      actionNode = confirmRow;
    } else {
      actionBtn.className = "btn shop-sell-btn";
      actionBtn.textContent = isInParcel
        ? bi(`📦 待拆包裹 · 二手賣出（+${resalePrice} 英蚌）`, `📦 Unopened · Sell Half-Price (+${resalePrice})`)
        : bi(`♻️ 二手賣出（+${resalePrice} 英蚌）`, `♻️ Sell Used (+${resalePrice} Clams)`);
      actionBtn.title = bi(
        `按定價的一半（${resalePrice} 英蚌）回收此家具並釋放空間`,
        `Sell for half price (${resalePrice} Clams) & free up grid space`
      );
      actionBtn.onclick = () => {
        clearFeedback("shop-feedback");
        pendingSellItemId = item.id;
        renderShopDialog();
      };
    }
  } else if (isInParcel) {
    actionBtn.textContent = bi("📦 包裹已送達門口（待拆箱擺放）", "📦 Parcel Waiting at Doorway");
    actionBtn.disabled = true;
  } else if (isPermanentOwned) {
    actionBtn.textContent = bi("已擺進房間 ✓", "Placed in Studio ✓");
    actionBtn.disabled = true;
  } else if (isLocked) {
    actionBtn.textContent = bi(
      `🔒 需先購買：${missingPrereqs.map(p => p.name).join(" ＋ ")}`,
      `🔒 Requires: ${missingPrereqs.map(p => p.name).join(" + ")}`
    );
    actionBtn.disabled = true;
  } else if (gridAvail.placeable && !gridAvail.ok) {
    actionBtn.textContent = bi(`空間不夠（需 ${gridAvail.neededCells} 格）`, `No Space (Needs ${gridAvail.neededCells})`);
    actionBtn.onclick = () => {
      showFeedback(
        "shop-feedback",
        "error",
        bi(
          `${gridAvail.reason}（可於下方點選「二手賣出」家具以回收原價一半英蚌並釋放空間）`,
          `${gridAvail.reason} (You can sell existing furniture below for 50% Clams to free space.)`
        )
      );
    };
  } else if (!isSuperAdmin && clams < item.price) {
    actionBtn.textContent = bi(`還差 ${item.price - clams} 英蚌`, `Need ${item.price - clams} more Clams`);
    actionBtn.disabled = true;
  } else {
    actionBtn.classList.add("btn-primary");
    actionBtn.textContent = isPaint
      ? bi("購買並重新粉刷", "Buy & Repaint")
      : isFloor
        ? bi("購買並重鋪地板", "Buy & Re-lay Floor")
        : isDesk
          ? bi("購買並立刻換桌", "Buy & Apply Desk")
          : isApparel
            ? bi("購買並立刻換穿", "Buy & Wear")
            : isTextile
              ? bi("購買並立刻換上", "Buy & Equip")
              : isShopParcelItem(item.id)
                ? bi("購買", "Buy")
                : bi("購買並放進房間", "Buy & Place in Studio");
    actionBtn.onclick = () => purchaseShopItem(item.id, actionBtn);
  }

  if (gridBadgeEl) {
    card.append(previewBox, head, gridBadgeEl, desc, actionNode);
  } else {
    card.append(previewBox, head, desc, actionNode);
  }
  return card;
}

function renderShopDialog() {
  const balanceEl = document.getElementById("shop-clams-balance");
  const tabsEl = document.getElementById("shop-tabs");
  const gridEl = document.getElementById("shop-grid");
  const dialogBodyEl = gridEl.closest(".dialog-body");
  const prevScrollTop = dialogBodyEl ? dialogBodyEl.scrollTop : 0;
  const isSuperAdmin = currentRole === "super_admin";
  const clams = Math.max(0, Math.trunc(Number(currentUserProfile?.clams ?? STARTER_CLAMS)));
  const owned = normalizeOwnedItems(currentUserProfile?.ownedItems);
  const activeWallColor = (currentUserProfile?.roomState?.wallColor || DEFAULT_WALL_COLOR).toLowerCase();
  const activeFloorStyle = currentUserProfile?.roomState?.floorStyle || DEFAULT_FLOOR_STYLE;
  const activeLayout = currentUserProfile?.roomState?.furnitureLayout || {};
  const activeParcels = normalizePendingParcels(currentUserProfile?.roomState?.pendingParcels, owned);
  const gridStats = computeRoomGridStats(owned, activeLayout, activeParcels);

  const activeCatalog = SHOP_CATALOG.filter(item => item.enabled !== false);
  const resellableCount = activeCatalog.filter(it => Boolean(owned[it.id]) && isSellableShopItem(it)).length;
  if (resellableCount === 0) shopResellFilterOnly = false;

  const capacityEl = document.getElementById("shop-grid-capacity-bar");
  if (capacityEl) {
    const parcelNote = Object.keys(activeParcels).length > 0
      ? `<span>${bi(`📦 門口待領包裹：<strong>${Object.keys(activeParcels).length}</strong> 箱（含預扣格數）`, `📦 Unopened door parcels: <strong>${Object.keys(activeParcels).length}</strong> (cells reserved)`)}</span>`
      : "";
    capacityEl.innerHTML = `
      <span>${bi(`📐 剩餘地面網格：<strong class="${gridStats.floorRemaining < 8 ? "is-low" : ""}">${gridStats.floorRemaining}</strong> / ${gridStats.floorTotal} 格`, `📐 Floor grid left: <strong class="${gridStats.floorRemaining < 8 ? "is-low" : ""}">${gridStats.floorRemaining}</strong> / ${gridStats.floorTotal}`)}</span>
      <span>${bi(`🧱 剩餘牆面網格：<strong class="${gridStats.wallRemaining < 3 ? "is-low" : ""}">${gridStats.wallRemaining}</strong> / ${gridStats.wallTotal} 格`, `🧱 Wall grid left: <strong class="${gridStats.wallRemaining < 3 ? "is-low" : ""}">${gridStats.wallRemaining}</strong> / ${gridStats.wallTotal}`)}</span>
      ${parcelNote}
    `;
    if (resellableCount > 0) {
      const resellBtn = document.createElement("button");
      resellBtn.type = "button";
      resellBtn.id = "shop-resell-filter-btn";
      resellBtn.className = `btn shop-resell-filter-btn${shopResellFilterOnly ? " is-active" : ""}`;
      resellBtn.textContent = shopResellFilterOnly
        ? bi("✕ 顯示全部商品", "✕ Show All Items")
        : bi(`♻️ 查看可轉售家具 (${resellableCount})`, `♻️ Resellable Items (${resellableCount})`);
      resellBtn.onclick = () => {
        shopResellFilterOnly = !shopResellFilterOnly;
        pendingSellItemId = null;
        if (shopResellFilterOnly) activeShopCategory = "all";
        renderShopDialog();
        if (dialogBodyEl) dialogBodyEl.scrollTop = 0;
      };
      capacityEl.appendChild(resellBtn);
    }
  }

  balanceEl.textContent = isSuperAdmin ? "∞" : String(clams);
  tabsEl.innerHTML = "";
  SHOP_CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `shop-tab-btn${(!shopResellFilterOnly && cat.id === activeShopCategory) ? " is-active" : ""}`;
    btn.textContent = getShopCategoryLabel(cat);
    btn.onclick = () => {
      activeShopCategory = cat.id;
      shopResellFilterOnly = false;
      pendingSellItemId = null;
      renderShopDialog();
      if (dialogBodyEl) dialogBodyEl.scrollTop = 0;
    };
    tabsEl.appendChild(btn);
  });

  const cardCtx = {
    isSuperAdmin,
    clams,
    owned,
    activeWallColor,
    activeFloorStyle,
    activeLayout,
    activeParcels,
    roomState: currentUserProfile?.roomState
  };

  gridEl.innerHTML = "";
  const isOwnedGroupedView = !shopResellFilterOnly && activeShopCategory === "owned";
  gridEl.classList.toggle("is-grouped", isOwnedGroupedView);

  if (isOwnedGroupedView) {
    const sections = buildOwnedShopSections(activeCatalog, owned);
    sections.forEach(sec => {
      const sectionEl = document.createElement("section");
      sectionEl.className = "shop-owned-section";
      sectionEl.dataset.sectionId = sec.id;

      const headerEl = document.createElement("div");
      headerEl.className = "shop-owned-section-header";

      const headingEl = document.createElement("h3");
      headingEl.className = "shop-owned-section-title";
      headingEl.textContent = sec.title;

      const countEl = document.createElement("span");
      countEl.className = "shop-owned-section-count";
      countEl.textContent = bi(`共 ${sec.items.length} 款`, `${sec.items.length}`);

      headerEl.append(headingEl, countEl);

      const subGridEl = document.createElement("div");
      subGridEl.className = "shop-grid";
      sec.items.forEach(item => {
        subGridEl.appendChild(createShopItemCard(item, cardCtx));
      });

      sectionEl.append(headerEl, subGridEl);
      gridEl.appendChild(sectionEl);
    });
  } else {
    const visibleItems = shopResellFilterOnly
      ? activeCatalog.filter(item => Boolean(owned[item.id]) && isSellableShopItem(item))
      : (activeShopCategory === "all"
        ? activeCatalog
        : activeCatalog.filter(item => item.category === activeShopCategory));
    visibleItems.forEach(item => {
      gridEl.appendChild(createShopItemCard(item, cardCtx));
    });
  }

  if (dialogBodyEl) {
    dialogBodyEl.scrollTop = prevScrollTop;
  }
  saveNavState();
}

async function purchaseShopItem(itemId, triggerBtn = null) {
  if (!currentUser || shopPurchaseBusy) return;
  const item = getShopItem(itemId);
  if (!item || item.price <= 0 || item.enabled === false) return;

  clearFeedback("shop-feedback");
  shopPurchaseBusy = true;
  const prevBtnText = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = bi("購買中...", "Buying...");
  }
  const localizedItemName = getShopItemName(item);
  try {
    const userRef = doc(firestoreDb, "users", currentUser.uid);
    const result = await runTransaction(firestoreDb, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error(bi("找不到使用者檔案。", "User profile not found."));
      const data = snap.data() || {};
      const isSuperAdmin = currentRole === "super_admin";
      const currentClams = Math.trunc(Number(data.clams ?? STARTER_CLAMS));
      const prevOwned = (data.ownedItems && typeof data.ownedItems === "object" && !Array.isArray(data.ownedItems))
        ? { ...data.ownedItems }
        : {};
      const prevRoomState = (data.roomState && typeof data.roomState === "object")
        ? { ...data.roomState }
        : { cameraQuarter: 0, deskLampOn: true, bedLampOn: false, wallColor: DEFAULT_WALL_COLOR };

      if (item.consumable && item.wallColor) {
        if ((prevRoomState.wallColor || DEFAULT_WALL_COLOR).toLowerCase() === item.wallColor.toLowerCase()) {
          return { unchanged: true, nextClams: currentClams, nextOwned: prevOwned, nextRoomState: prevRoomState };
        }
        if (!isSuperAdmin && currentClams < item.price) {
          throw new Error(bi("英蚌餘額不足，先去電腦完成接案學習賺錢吧！", "Not enough Clams! Complete quests at your desk to earn more."));
        }
        const nextClams = isSuperAdmin ? currentClams : (currentClams - item.price);
        const currentXp = Math.max(0, Math.trunc(Number(data.xp ?? 0)));
        const xpGain = calculateShopPurchaseXp(item.price);
        const nextXp = Math.min(10000000, currentXp + xpGain);
        const nextRoomState = { ...prevRoomState, wallColor: item.wallColor };
        tx.update(userRef, {
          clams: nextClams,
          xp: nextXp,
          roomState: nextRoomState,
          updatedAt: serverTimestamp()
        });
        if (item.price > 0) {
          queueLedgerTransaction(tx, currentUser.uid, {
            type: "purchase",
            category: item.category,
            title: `${bi("重刷牆面", "Wall Repaint")}: ${localizedItemName}`,
            amount: -item.price
          });
        }
        return { unchanged: false, nextClams, nextXp, xpGranted: xpGain, nextOwned: prevOwned, nextRoomState };
      }

      if (item.consumable && item.floorStyle) {
        const targetFloorId = item.floorStyleId || item.id;
        const prevFloor = prevRoomState.floorStyle || DEFAULT_FLOOR_STYLE;
        if (prevFloor === targetFloorId || (targetFloorId === DEFAULT_FLOOR_STYLE && prevFloor === "floor_honey_oak")) {
          return { unchanged: true, nextClams: currentClams, nextOwned: prevOwned, nextRoomState: prevRoomState };
        }
        if (!isSuperAdmin && currentClams < item.price) {
          throw new Error(bi("英蚌餘額不足，先去電腦完成接案學習賺錢吧！", "Not enough Clams! Complete quests at your desk to earn more."));
        }
        const nextClams = isSuperAdmin ? currentClams : (currentClams - item.price);
        const currentXp = Math.max(0, Math.trunc(Number(data.xp ?? 0)));
        const xpGain = calculateShopPurchaseXp(item.price);
        const nextXp = Math.min(10000000, currentXp + xpGain);
        const nextRoomState = { ...prevRoomState, floorStyle: targetFloorId };
        tx.update(userRef, {
          clams: nextClams,
          xp: nextXp,
          roomState: nextRoomState,
          updatedAt: serverTimestamp()
        });
        if (item.price > 0) {
          queueLedgerTransaction(tx, currentUser.uid, {
            type: "purchase",
            category: item.category,
            title: `${bi("重鋪地板", "Floor Re-lay")}: ${localizedItemName}`,
            amount: -item.price
          });
        }
        return { unchanged: false, nextClams, nextXp, xpGranted: xpGain, nextOwned: prevOwned, nextRoomState };
      }

      if (prevOwned[item.id] === true) {
        return { unchanged: true, nextClams: currentClams, nextXp: Math.max(0, Math.trunc(Number(data.xp ?? 0))), xpGranted: 0, nextOwned: prevOwned, nextRoomState: prevRoomState };
      }
      const missingPrereqs = getMissingShopPrerequisites(item, prevOwned);
      if (missingPrereqs.length > 0) {
        throw new Error(bi(
          `需先購買「${missingPrereqs.map(p => p.name).join("」與「")}」才能解鎖此商品！`,
          `Purchase "${missingPrereqs.map(p => p.name).join('" & "')}" first to unlock this!`
        ));
      }
      const prevParcels = normalizePendingParcels(prevRoomState.pendingParcels, prevOwned);
      const gridCheck = checkShopItemGridAvailability(
        item.id,
        prevOwned,
        prevRoomState.furnitureLayout,
        prevParcels
      );
      if (!gridCheck.ok) {
        throw new Error(gridCheck.reason);
      }
      if (!isSuperAdmin && currentClams < item.price) {
        throw new Error(bi("英蚌餘額不足，先去電腦完成接案學習賺錢吧！", "Not enough Clams! Complete quests at your desk to earn more."));
      }

      const nextClams = isSuperAdmin ? currentClams : (currentClams - item.price);
      const currentXp = Math.max(0, Math.trunc(Number(data.xp ?? 0)));
      const xpGain = calculateShopPurchaseXp(item.price);
      const nextXp = Math.min(10000000, currentXp + xpGain);
      const nextOwned = { ...prevOwned, [item.id]: true };
      let nextRoomState = { ...prevRoomState };
      let shouldUpdateRoomState = false;
      if (isShopParcelItem(item.id)) {
        nextRoomState.pendingParcels = { ...prevParcels, [item.id]: true };
        shouldUpdateRoomState = true;
      }
      if (item.id === "bed_lamp") {
        nextRoomState.bedLampOn = true;
        shouldUpdateRoomState = true;
      } else if (typeof item.textileKind === "string" && item.textileKind.trim()) {
        nextRoomState = withRoomStyleUpdate(nextRoomState, item.textileKind.trim(), item.id);
        shouldUpdateRoomState = true;
      }

      const patch = {
        clams: nextClams,
        xp: nextXp,
        ownedItems: nextOwned,
        updatedAt: serverTimestamp()
      };
      if (shouldUpdateRoomState) {
        patch.roomState = nextRoomState;
      }
      tx.update(userRef, patch);
      if (item.price > 0) {
        const ledgerPrefix = item.textileKind === "deskStyle"
          ? bi("購入書桌材質", "Bought Desk Finish")
          : item.textileKind === "shirtStyle"
            ? bi("購入上衣", "Bought Top")
            : item.textileKind === "pantsStyle"
              ? bi("購入褲子", "Bought Bottoms")
              : item.textileKind
                ? bi("購入織品", "Bought Textile")
                : bi("購買家具", "Bought Furniture");
        queueLedgerTransaction(tx, currentUser.uid, {
          type: "purchase",
          category: item.category,
          title: `${ledgerPrefix}: ${localizedItemName}`,
          amount: -item.price
        });
      }
      return { unchanged: false, nextClams, nextXp, xpGranted: xpGain, nextOwned, nextRoomState };
    });

    if (result.unchanged) {
      renderShopDialog();
      return;
    }

    if (currentUserProfile) {
      currentUserProfile.clams = result.nextClams;
      currentUserProfile.xp = result.nextXp;
      currentUserProfile.ownedItems = result.nextOwned;
      currentUserProfile.roomState = result.nextRoomState;
    }
    updateHeaderAccountUI(
      currentUser,
      currentRole,
      currentUserProfile?.displayName || resolveFallbackName(currentUser),
      result.nextClams
    );
    syncXpProgressUI({ allowCelebrate: true });
    const normalizedOwned = normalizeOwnedItems(result.nextOwned);
    if (result.nextRoomState?.pendingParcels) {
      roomScene?.setOwnedAndParcels(normalizedOwned, result.nextRoomState.pendingParcels);
    } else {
      roomScene?.applyOwnedItems(normalizedOwned);
    }
    const xpMsg = result.xpGranted > 0 ? bi(`，獲得 +${result.xpGranted} XP`, `, +${result.xpGranted} XP`) : "";
    if (item.wallColor) {
      roomScene?.setWallColor(item.wallColor);
      const feeNote = currentRole === "super_admin"
        ? bi("超級管理員測試免扣款", "Super Admin test mode: no deduction")
        : bi(`扣除粉刷費 ${item.price} 英蚌`, `-${item.price} Clams`);
      showFeedback("shop-feedback", "success", bi(
        `已重新粉刷為「${localizedItemName}」（${feeNote}${xpMsg}）！`,
        `Repainted walls to "${localizedItemName}" (${feeNote}${xpMsg})!`
      ));
    } else if (item.consumable && item.floorStyle) {
      roomScene?.setFloorStyle(result.nextRoomState?.floorStyle || item.floorStyleId || item.id);
      const feeNote = currentRole === "super_admin"
        ? bi("超級管理員測試免扣款", "Super Admin test mode: no deduction")
        : bi(`扣除材料與鋪設費 ${item.price} 英蚌`, `-${item.price} Clams`);
      showFeedback("shop-feedback", "success", bi(
        `已重鋪為「${localizedItemName}」（${feeNote}${xpMsg}）！`,
        `Re-laid floor to "${localizedItemName}" (${feeNote}${xpMsg})!`
      ));
    } else if (item.textileKind === "bedSheet") {
      roomScene?.setBedSheet(item.id);
      showFeedback("shop-feedback", "success", bi(
        `已購入「${localizedItemName}」並立即換上${xpMsg}！`,
        `Purchased & equipped "${localizedItemName}"${xpMsg}!`
      ));
    } else if (item.textileKind === "rugStyle") {
      roomScene?.setRugStyle(item.id);
      showFeedback("shop-feedback", "success", bi(
        `已購入「${localizedItemName}」並立即鋪好${xpMsg}！`,
        `Purchased & laid down "${localizedItemName}"${xpMsg}!`
      ));
    } else if (item.textileKind === "deskStyle") {
      roomScene?.setDeskStyle(item.id);
      showFeedback("shop-feedback", "success", bi(
        `已購入「${localizedItemName}」並立刻換上新書桌材質${xpMsg}！`,
        `Purchased & applied "${localizedItemName}"${xpMsg}!`
      ));
    } else if (item.textileKind === "shirtStyle") {
      roomScene?.setShirtStyle(item.id);
      showFeedback("shop-feedback", "success", bi(
        `已購入「${localizedItemName}」並立刻換穿${xpMsg}！`,
        `Purchased & put on "${localizedItemName}"${xpMsg}!`
      ));
    } else if (item.textileKind === "pantsStyle") {
      roomScene?.setPantsStyle(item.id);
      showFeedback("shop-feedback", "success", bi(
        `已購入「${localizedItemName}」並立刻換穿${xpMsg}！`,
        `Purchased & put on "${localizedItemName}"${xpMsg}!`
      ));
    } else if (isShopParcelItem(item.id)) {
      if (item.id === "bed_lamp") {
        roomScene?.setBedLamp(true);
      }
      showFeedback("shop-feedback", "success", bi(
        `已購買「${localizedItemName}」${xpMsg}！📦 包裹已送到門口地毯，關閉商店點擊箱子即可拆開並自由擺放！`,
        `Bought "${localizedItemName}"${xpMsg}! 📦 Delivered to your doorway mat—close shop and click the parcel to unbox & place!`
      ));
    } else {
      showFeedback("shop-feedback", "success", bi(
        `已購買「${localizedItemName}」並直接放進租屋處${xpMsg}！`,
        `Bought "${localizedItemName}" and placed it in your studio${xpMsg}!`
      ));
    }
    renderShopDialog();
  } catch (err) {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = prevBtnText;
    }
    showFeedback("shop-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    shopPurchaseBusy = false;
  }
}

async function sellShopItem(itemId, triggerBtn = null) {
  if (!currentUser || shopPurchaseBusy) return;
  const item = getShopItem(itemId);
  if (!item || !isSellableShopItem(item)) return;

  clearFeedback("shop-feedback");
  shopPurchaseBusy = true;
  const prevBtnText = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = bi("賣出中...", "Selling...");
  }
  const localizedSellName = getShopItemName(item);
  try {
    const userRef = doc(firestoreDb, "users", currentUser.uid);
    const result = await runTransaction(firestoreDb, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) {
        throw new Error(bi("找不到帳號資料，請重新整理後再試。", "Account data not found. Refresh and try again."));
      }
      const data = snap.data();
      const prevOwned = (data.ownedItems && typeof data.ownedItems === "object")
        ? { ...data.ownedItems }
        : {};
      if (prevOwned[item.id] !== true) {
        return { unchanged: true };
      }
      const blockingDeps = getBlockingDependentOwnedItems(item.id, prevOwned);
      if (blockingDeps.length > 0) {
        const depNames = blockingDeps.map(d => getShopItemName(d)).join(bi("」「", ", "));
        throw new Error(bi(
          `需先賣出相依家具「${depNames}」，才能賣出此商品！`,
          `Sell dependent item(s) "${depNames}" first before selling this!`
        ));
      }

      const resalePrice = calculateShopResalePrice(item.price);
      const currentClams = Math.max(0, Math.trunc(Number(data.clams ?? STARTER_CLAMS)));
      const nextClams = Math.min(10000000, currentClams + resalePrice);
      const nextOwned = { ...prevOwned };
      delete nextOwned[item.id];

      const prevRoomState = (data.roomState && typeof data.roomState === "object")
        ? { ...data.roomState }
        : { cameraQuarter: 0, deskLampOn: true, bedLampOn: false, wallColor: DEFAULT_WALL_COLOR };
      const nextRoomState = { ...prevRoomState };
      let shouldUpdateRoomState = false;

      if (prevRoomState.pendingParcels && typeof prevRoomState.pendingParcels === "object") {
        const nextParcels = normalizePendingParcels(prevRoomState.pendingParcels, prevOwned);
        if (nextParcels[item.id]) {
          delete nextParcels[item.id];
          nextRoomState.pendingParcels = nextParcels;
          shouldUpdateRoomState = true;
        }
      }
      if (prevRoomState.furnitureLayout && typeof prevRoomState.furnitureLayout === "object") {
        const nextLayout = { ...prevRoomState.furnitureLayout };
        const companionIds = getCompanionPlaceableIds(item.id);
        const idsToRemove = companionIds.length > 0 ? companionIds : [item.id];
        let layoutChanged = false;
        idsToRemove.forEach(uid => {
          if (uid in nextLayout) {
            delete nextLayout[uid];
            layoutChanged = true;
          }
        });
        if (layoutChanged) {
          nextRoomState.furnitureLayout = nextLayout;
          shouldUpdateRoomState = true;
        }
      }
      if (item.id === "bed_lamp" && prevRoomState.bedLampOn) {
        nextRoomState.bedLampOn = false;
        shouldUpdateRoomState = true;
      } else if (item.id === "vinyl_player" && prevRoomState.vinylOn) {
        nextRoomState.vinylOn = false;
        shouldUpdateRoomState = true;
      }

      const patch = {
        clams: nextClams,
        ownedItems: nextOwned,
        updatedAt: serverTimestamp()
      };
      if (shouldUpdateRoomState) {
        patch.roomState = nextRoomState;
      }
      tx.update(userRef, patch);
      if (resalePrice > 0) {
        queueLedgerTransaction(tx, currentUser.uid, {
          type: "resale",
          category: item.category,
          title: `${bi("二手賣出", "Resale")}: ${localizedSellName}`,
          amount: resalePrice
        });
      }
      return { unchanged: false, resalePrice, nextClams, nextOwned, nextRoomState };
    });

    pendingSellItemId = null;
    if (result.unchanged) {
      renderShopDialog();
      return;
    }

    if (currentUserProfile) {
      currentUserProfile.clams = result.nextClams;
      currentUserProfile.ownedItems = result.nextOwned;
      currentUserProfile.roomState = result.nextRoomState;
    }
    updateHeaderAccountUI(
      currentUser,
      currentRole,
      currentUserProfile?.displayName || resolveFallbackName(currentUser),
      result.nextClams
    );
    const normalizedOwned = normalizeOwnedItems(result.nextOwned);
    roomScene?.applyFurnitureLayout(result.nextRoomState?.furnitureLayout || {});
    roomScene?.setOwnedAndParcels(normalizedOwned, result.nextRoomState?.pendingParcels || {});
    if (item.id === "wall_tv" && typeof stopRoomTvPlayback === "function") {
      stopRoomTvPlayback();
    }
    roomScene?.handleSoldItemCleanup(item.id);

    const freedUnits = getCompanionPlaceableIds(item.id);
    const freedCells = freedUnits.reduce((sum, uid) => {
      const m = PLACEABLE_FURNITURE_META[uid];
      if (!m) return sum;
      return sum + (m.surface === "wall" ? m.gridW : m.gridW * m.gridD);
    }, 0);
    const freedNote = freedCells > 0
      ? bi(
          `並釋放 ${freedCells} 格${PLACEABLE_FURNITURE_META[freedUnits[0]]?.surface === "wall" ? "牆面" : "地面"}空間`,
          `freed ${freedCells} ${PLACEABLE_FURNITURE_META[freedUnits[0]]?.surface === "wall" ? "wall" : "floor"} cell(s)`
        )
      : "";
    showFeedback(
      "shop-feedback",
      "success",
      bi(
        `已二手賣出「${localizedSellName}」，回收原價一半 +${result.resalePrice} 英蚌${freedNote ? `（${freedNote}）` : ""}！`,
        `Sold "${localizedSellName}" for +${result.resalePrice} Clams (50% value)${freedNote ? ` (${freedNote})` : ""}!`
      )
    );
    renderShopDialog();
  } catch (err) {
    pendingSellItemId = null;
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = prevBtnText;
    }
    showFeedback("shop-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    shopPurchaseBusy = false;
  }
}

// Guest YouTube TV Player (No login required; overridden by Google Sheet TV_Videos tab)
const TV_CUSTOM_STORAGE_KEY = "room_tv_custom_videos_v1";
let TV_CHANNEL_VIDEOS = [...DEFAULT_TV_CHANNEL_VIDEOS];
const tvDialog = document.getElementById("tv-dialog");
const tvFrameWrap = tvDialog?.querySelector(".tv-frame-wrap");
const tvIframe = document.getElementById("tv-youtube-iframe");
let lastTvVideoId = null;
let tvLoadedVideoId = null;
let tvPlaybackSec = 0;
let tvPlayerPaused = false;
let tvHandshakeAcked = false;
let customTvVideos = readCustomTvVideos();

function moveElementPreservingState(targetParent, node) {
  if (!targetParent || !node) return false;
  if (node.parentElement === targetParent) return true;
  if ("moveBefore" in Element.prototype) {
    try {
      targetParent.moveBefore(node, null);
      return true;
    } catch {
      // Fall back to standard reparenting below
    }
  }
  targetParent.appendChild(node);
  return false;
}

function buildTvEmbedUrl(videoId, { startSec = 0, autoplay = true } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    rel: "0",
    playsinline: "1",
    enablejsapi: "1"
  });
  const startInt = Math.max(0, Math.floor(Number(startSec) || 0));
  if (startInt > 0) {
    params.set("start", String(startInt));
  }
  if (typeof window !== "undefined" && window.location?.origin?.startsWith("http")) {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function sendYouTubeListeningHandshake() {
  if (!tvIframe?.contentWindow || !tvIframe.getAttribute("src")) return;
  ["https://www.youtube-nocookie.com", "https://www.youtube.com"].forEach(targetOrigin => {
    try {
      tvIframe.contentWindow.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        targetOrigin
      );
      tvIframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        targetOrigin
      );
    } catch {
      // Ignore cross-origin postMessage errors before frame is ready
    }
  });
}

function loadTvIframeVideo(chosen, { forceReload = false } = {}) {
  if (!chosen?.id || !tvIframe) return;
  const sameVideo = tvLoadedVideoId === chosen.id;
  if (!forceReload && sameVideo && tvIframe.getAttribute("src")) {
    return;
  }
  const startSec = sameVideo ? tvPlaybackSec : 0;
  const shouldAutoplay = sameVideo ? !tvPlayerPaused : true;
  if (!sameVideo) {
    tvPlaybackSec = 0;
    tvPlayerPaused = false;
  }
  tvLoadedVideoId = chosen.id;
  tvHandshakeAcked = false;
  tvIframe.src = buildTvEmbedUrl(chosen.id, { startSec, autoplay: shouldAutoplay });
}

if (tvIframe) {
  tvIframe.addEventListener("load", () => {
    if (!tvIframe.getAttribute("src")) return;
    sendYouTubeListeningHandshake();
    setTimeout(() => {
      if (!tvHandshakeAcked) sendYouTubeListeningHandshake();
    }, 450);
    setTimeout(() => {
      if (!tvHandshakeAcked) sendYouTubeListeningHandshake();
    }, 1300);
  });
}

window.addEventListener("message", (event) => {
  if (!tvIframe?.contentWindow || event.source !== tvIframe.contentWindow) return;
  if (event.origin !== "https://www.youtube-nocookie.com" && event.origin !== "https://www.youtube.com") {
    return;
  }
  if (typeof event.data !== "string") return;
  try {
    const payload = JSON.parse(event.data);
    if (!payload || typeof payload !== "object") return;
    if (payload.event === "onReady" || payload.event === "initialDelivery" || payload.event === "infoDelivery") {
      tvHandshakeAcked = true;
    }
    const info = payload.info;
    if (info && typeof info === "object") {
      if (typeof info.currentTime === "number" && Number.isFinite(info.currentTime) && info.currentTime >= 0) {
        tvPlaybackSec = info.currentTime;
      }
      if (typeof info.playerState === "number") {
        tvPlayerPaused = info.playerState === 2;
      }
    }
  } catch {
    // Ignore non-JSON postMessage payloads
  }
});

function readCustomTvVideos() {
  try {
    const raw = localStorage.getItem(TV_CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => {
        const id = parseYouTubeVideoId(item?.id);
        if (!id) return null;
        return {
          id,
          title: String(item?.title || "").trim() || bi(`YouTube 影片 (${id})`, `YouTube Video (${id})`),
          author: String(item?.author || "").trim() || bi("自訂 YouTube", "Custom YouTube"),
          isCustom: true
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function writeCustomTvVideos(list) {
  try {
    localStorage.setItem(TV_CUSTOM_STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    // Ignore storage quota errors
  }
}

function getAllTvChannels() {
  const seen = new Set();
  const merged = [];
  for (const v of customTvVideos) {
    if (v?.id && !seen.has(v.id)) {
      seen.add(v.id);
      merged.push({ ...v, isCustom: true });
    }
  }
  for (const v of TV_CHANNEL_VIDEOS) {
    if (v?.id && !seen.has(v.id)) {
      seen.add(v.id);
      merged.push(v);
    }
  }
  return merged;
}

function pickNextTvChannel() {
  const allChannels = getAllTvChannels();
  const pool = allChannels.filter(v => v.id !== lastTvVideoId);
  const chosen = pool[Math.floor(Math.random() * pool.length)] || allChannels[0] || TV_CHANNEL_VIDEOS[0];
  lastTvVideoId = chosen?.id || null;
  return chosen;
}

function syncRoomTvRemoteUI() {
  const remoteEl = document.getElementById("room-tv-remote");
  const titleEl = document.getElementById("room-tv-remote-title");
  if (!remoteEl) return;
  const visible = Boolean(activeTvVideo && currentScreen === "room");
  remoteEl.classList.toggle("hidden", !visible);
  if (visible && titleEl && activeTvVideo) {
    titleEl.textContent = `📺 ${activeTvVideo.title}`;
    titleEl.title = `${activeTvVideo.author} · ${activeTvVideo.title}`;
  }
}

function clearTvCustomFeedback() {
  const box = document.getElementById("tv-custom-feedback");
  if (!box) return;
  box.replaceChildren();
  box.classList.add("hidden");
}

function showTvCustomFeedback(message, searchQuery = "") {
  const box = document.getElementById("tv-custom-feedback");
  if (!box) return;
  box.replaceChildren();
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  box.appendChild(msgSpan);
  if (searchQuery) {
    const link = document.createElement("a");
    link.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = bi(`在 YouTube 搜尋「${searchQuery}」↗`, `Search "${searchQuery}" on YouTube ↗`);
    box.appendChild(link);
  }
  box.classList.remove("hidden");
}

function updateTvHeaderAndExternalLink(chosen) {
  if (!chosen) return;
  const captionEl = document.getElementById("tv-channel-caption");
  const linkEl = document.getElementById("tv-external-link");
  if (captionEl) captionEl.textContent = `${chosen.author} · ${chosen.title}`;
  if (linkEl) linkEl.href = `https://www.youtube.com/watch?v=${encodeURIComponent(chosen.id)}`;
}

function renderTvChannelList() {
  const listEl = document.getElementById("tv-channel-list");
  const countEl = document.getElementById("tv-channel-count");
  if (!listEl) return;
  const channels = getAllTvChannels();
  if (countEl) countEl.textContent = bi(`${channels.length} 部`, `${channels.length} videos`);
  listEl.replaceChildren();

  channels.forEach(video => {
    const isActive = activeTvVideo?.id === video.id;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `tv-channel-card${isActive ? " is-active" : ""}`;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", String(isActive));

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "tv-channel-thumb-wrap";
    const img = document.createElement("img");
    img.className = "tv-channel-thumb";
    img.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/mqdefault.jpg`;
    img.alt = "";
    img.loading = "lazy";
    thumbWrap.appendChild(img);

    if (isActive) {
      const liveBadge = document.createElement("span");
      liveBadge.className = "tv-channel-live-badge";
      liveBadge.textContent = bi("▶ 播放中", "▶ Playing");
      thumbWrap.appendChild(liveBadge);
    }

    if (video.isCustom) {
      const removeBtn = document.createElement("span");
      removeBtn.className = "tv-channel-remove-btn";
      removeBtn.setAttribute("role", "button");
      removeBtn.setAttribute("tabindex", "0");
      removeBtn.setAttribute("aria-label", bi(`移除自訂影片 ${video.title}`, `Remove custom video ${video.title}`));
      removeBtn.title = bi("從清單移除", "Remove from list");
      removeBtn.textContent = "✕";
      const removeHandler = (e) => {
        e.stopPropagation();
        customTvVideos = customTvVideos.filter(item => item.id !== video.id);
        writeCustomTvVideos(customTvVideos);
        renderTvChannelList();
      };
      removeBtn.addEventListener("click", removeHandler);
      removeBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          removeHandler(e);
        }
      });
      thumbWrap.appendChild(removeBtn);
    }

    const meta = document.createElement("div");
    meta.className = "tv-channel-meta";
    const titleEl = document.createElement("div");
    titleEl.className = "tv-channel-title";
    titleEl.textContent = video.title;
    const authorEl = document.createElement("div");
    authorEl.className = "tv-channel-author";
    authorEl.textContent = video.author;
    meta.append(titleEl, authorEl);

    card.append(thumbWrap, meta);
    card.addEventListener("click", () => {
      clearTvCustomFeedback();
      selectTvVideo(video);
    });
    listEl.appendChild(card);
  });
}

function stopRoomTvPlayback() {
  activeTvVideo = null;
  tvPowerOffRequested = false;
  tvLoadedVideoId = null;
  tvPlaybackSec = 0;
  tvPlayerPaused = false;
  tvHandshakeAcked = false;
  if (tvFrameWrap && tvIframe && tvIframe.parentElement !== tvFrameWrap) {
    moveElementPreservingState(tvFrameWrap, tvIframe);
  }
  if (tvIframe && tvIframe.getAttribute("src")) {
    tvIframe.removeAttribute("src");
  }
  roomScene?.setTvPlayback({ videoId: null, suspended: false });
  syncRoomTvRemoteUI();
}

function applyTvModalContent(chosen, { forceReload = false } = {}) {
  if (!chosen) return;
  updateTvHeaderAndExternalLink(chosen);
  loadTvIframeVideo(chosen, { forceReload });
}

function selectTvVideo(chosen) {
  if (!chosen?.id) return;
  const changedVideo = activeTvVideo?.id !== chosen.id;
  activeTvVideo = chosen;
  lastTvVideoId = chosen.id;
  if (changedVideo) {
    tvPlaybackSec = 0;
    tvPlayerPaused = false;
  }
  if (tvDialog.open) {
    const atomic = moveElementPreservingState(tvFrameWrap, tvIframe);
    applyTvModalContent(chosen, { forceReload: !atomic || changedVideo });
    renderTvChannelList();
  } else {
    const roomMount = roomScene?.getTvOverlayMountEl();
    const atomic = roomMount ? moveElementPreservingState(roomMount, tvIframe) : false;
    loadTvIframeVideo(chosen, { forceReload: !atomic || changedVideo });
    roomScene?.setTvPlayback({ videoId: chosen.id, suspended: false });
  }
  syncRoomTvRemoteUI();
}

async function enrichCustomVideoMetadata(videoId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const res = await fetch(oembedUrl, { signal: controller.signal });
    if (!res.ok) return;
    const meta = await res.json();
    const title = String(meta?.title || "").trim();
    const author = String(meta?.author_name || "").trim();
    if (!title && !author) return;

    let changed = false;
    customTvVideos = customTvVideos.map(item => {
      if (item.id !== videoId) return item;
      changed = true;
      return {
        ...item,
        title: title || item.title,
        author: author || item.author
      };
    });
    if (changed) writeCustomTvVideos(customTvVideos);

    if (activeTvVideo?.id === videoId) {
      activeTvVideo = {
        ...activeTvVideo,
        title: title || activeTvVideo.title,
        author: author || activeTvVideo.author
      };
      updateTvHeaderAndExternalLink(activeTvVideo);
      syncRoomTvRemoteUI();
    }
    if (tvDialog.open) {
      renderTvChannelList();
    }
  } catch {
    // Ignore oEmbed failure / offline fallback
  } finally {
    clearTimeout(timer);
  }
}

function openTvModalPlayer() {
  tvPowerOffRequested = false;
  clearTvCustomFeedback();
  if (!activeTvVideo) {
    activeTvVideo = pickNextTvChannel();
  }
  roomScene?.setTvPlayback({ videoId: activeTvVideo.id, suspended: true });
  if (!tvDialog.open) {
    tvDialog.showModal();
  }
  const atomic = moveElementPreservingState(tvFrameWrap, tvIframe);
  applyTvModalContent(activeTvVideo, { forceReload: !atomic });
  renderTvChannelList();
  syncRoomTvRemoteUI();
}

function openTvPlayer() {
  openTvModalPlayer();
}

function shuffleTvChannel() {
  clearTvCustomFeedback();
  const chosen = pickNextTvChannel();
  selectTvVideo(chosen);
}

document.getElementById("tv-custom-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputEl = document.getElementById("tv-custom-url-input");
  const raw = inputEl?.value.trim() || "";
  if (!raw) {
    clearTvCustomFeedback();
    return;
  }
  const videoId = parseYouTubeVideoId(raw);
  if (!videoId) {
    showTvCustomFeedback(
      bi("請貼上有效的 YouTube 網址或 11 碼影片 ID，或點右側直接搜尋：", "Paste a valid YouTube URL or 11-char video ID, or search directly:"),
      raw
    );
    return;
  }

  clearTvCustomFeedback();
  if (inputEl) inputEl.value = "";

  const existing = getAllTvChannels().find(v => v.id === videoId);
  if (existing) {
    selectTvVideo(existing);
    if (existing.isCustom && (existing.author === "自訂 YouTube" || existing.author === "Custom YouTube")) {
      enrichCustomVideoMetadata(videoId);
    }
    return;
  }

  const customEntry = {
    id: videoId,
    title: bi(`自訂影片 (${videoId})`, `Custom Video (${videoId})`),
    author: bi("自訂 YouTube", "Custom YouTube"),
    isCustom: true
  };
  customTvVideos = [customEntry, ...customTvVideos.filter(v => v.id !== videoId)].slice(0, 12);
  writeCustomTvVideos(customTvVideos);
  selectTvVideo(customEntry);
  enrichCustomVideoMetadata(videoId);
});

document.getElementById("tv-search-yt-btn")?.addEventListener("click", () => {
  const raw = document.getElementById("tv-custom-url-input")?.value.trim() || "";
  const url = raw
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}`
    : "https://www.youtube.com/";
  window.open(url, "_blank", "noopener,noreferrer");
});

document.getElementById("tv-shuffle-btn").addEventListener("click", shuffleTvChannel);
document.getElementById("room-tv-shuffle-btn").addEventListener("click", shuffleTvChannel);
document.getElementById("room-tv-expand-btn").addEventListener("click", openTvModalPlayer);
document.getElementById("room-tv-power-btn").addEventListener("click", stopRoomTvPlayback);
document.getElementById("tv-minimize-room-btn").addEventListener("click", () => {
  tvPowerOffRequested = false;
  if (tvDialog.open) tvDialog.close();
});
document.getElementById("footer-close-tv-btn").addEventListener("click", () => {
  tvPowerOffRequested = true;
  if (tvDialog.open) tvDialog.close();
});
tvDialog.addEventListener("close", () => {
  clearTvCustomFeedback();
  if (tvPowerOffRequested) {
    stopRoomTvPlayback();
    return;
  }
  if (activeTvVideo && currentScreen === "room") {
    const roomMount = roomScene?.getTvOverlayMountEl();
    if (roomMount) {
      const atomic = moveElementPreservingState(roomMount, tvIframe);
      roomScene.setTvPlayback({ videoId: activeTvVideo.id, suspended: false });
      if (!atomic) {
        loadTvIframeVideo(activeTvVideo, { forceReload: true });
      }
    } else {
      roomScene?.setTvPlayback({ videoId: activeTvVideo.id, suspended: false });
    }
    syncRoomTvRemoteUI();
    return;
  }
  if (tvIframe && tvIframe.getAttribute("src")) {
    tvIframe.removeAttribute("src");
  }
  tvLoadedVideoId = null;
});

// Wall Art Poster Customizer & Interactive Cropper
async function savePosterCustomization(nextPosterUrl) {
  if (!currentUser || !currentUserProfile || spectatingStudentUid) return;
  const nextRoomState = {
    ...(currentUserProfile.roomState || {
      cameraQuarter: 0,
      deskLampOn: true,
      bedLampOn: false,
      wallColor: DEFAULT_WALL_COLOR,
      floorStyle: DEFAULT_FLOOR_STYLE,
      bedSheet: DEFAULT_BED_SHEET,
      rugStyle: DEFAULT_RUG_STYLE,
      vinylOn: false
    }),
    posterImage: nextPosterUrl
  };
  await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
    roomState: nextRoomState,
    updatedAt: serverTimestamp()
  });
  currentUserProfile.roomState = nextRoomState;
  roomScene?.setPosterImage(nextPosterUrl);
  roomScene?.admirePoster();
}

const { openPosterCustomizer, cleanupPosterObjectUrl } = createPosterCustomizer({
  getSavedPosterUrl: () => (
    typeof currentUserProfile?.roomState?.posterImage === "string"
      ? currentUserProfile.roomState.posterImage.trim()
      : ""
  ),
  onSavePosterUrl: savePosterCustomization,
  showFeedback,
  clearFeedback,
  translateAuthError
});

document.getElementById("room-shop-btn").addEventListener("click", () => {
  if (spectatingStudentUid) return;
  if (roomScene?.editMode) {
    roomScene.exitFurnitureEditMode({ commit: true });
  }
  pendingSellItemId = null;
  shopResellFilterOnly = false;
  clearFeedback("shop-feedback");
  renderShopDialog();
  shopDialog.showModal();
});

// Simple Monthly Financial Report & Rent Countdown Controller
const financeDialog = document.getElementById("finance-dialog");
let cachedTransactions = [];
let unsubscribeTransactionsRealtime = null;
let activeFinanceFilter = "all"; // "all" | "expense" | "income"
let activeFinanceMonth = getMonthKey();
let rentActionBusy = false;

const AUTO_RENT_FAILURE_COOLDOWN_MS = 30000;
let lastRentCountdownBadgeText = "";
let lastRentBtnLabel = "";
let nextAutoRentRetryAt = 0;

function updateRentCountdownUI() {
  const btn = document.getElementById("room-finance-btn");
  const msgBadgeEl = document.getElementById("room-rent-msg-badge");
  const badge = document.getElementById("finance-countdown-badge");
  const payBtn = document.getElementById("finance-pay-rent-btn");
  const testBtn = document.getElementById("finance-test-rent-btn");
  const profile = currentUserProfile;
  const {
    status: rentMoodStatus,
    isDue,
    hasRentAlert,
    daysLeft,
    msLeft,
    deficit: rentDeficit,
    paidThisMonth,
    clams,
    isSuperAdmin
  } = evaluateProfileRentMood(profile, currentRole, {
    monthlyRentClams: MONTHLY_RENT_CLAMS,
    starterClams: STARTER_CLAMS,
    monthKey: getMonthKey(),
    fallbackDueAt: getNextMonthFirstEpoch()
  });
  if (!spectatingStudentUid) {
    roomScene?.setRentMood({
      status: rentMoodStatus,
      daysLeft,
      deficit: rentDeficit,
      paidThisMonth
    });
  }

  if (btn) {
    btn.classList.toggle("is-rent-alert", hasRentAlert);
    const nextLabel = hasRentAlert
      ? bi(`記帳（1 則待繳房租通知，應繳 ${MONTHLY_RENT_CLAMS} 英蚌）`, `Ledger (1 rent notice: ${MONTHLY_RENT_CLAMS} Clams due)`)
      : bi("記帳", "Ledger");
    if (nextLabel !== lastRentBtnLabel) {
      btn.setAttribute("aria-label", nextLabel);
      lastRentBtnLabel = nextLabel;
    }
  }
  if (msgBadgeEl) {
    msgBadgeEl.classList.toggle("hidden", !hasRentAlert);
  }

  if (financeDialog.open) {
    if (badge) {
      const nextBadgeText = isDue
        ? bi(`⚠️ 本期房租 ${MONTHLY_RENT_CLAMS} 英蚌已到期`, `⚠️ Rent Due: ${MONTHLY_RENT_CLAMS} Clams`)
        : bi(`⏳ 距下次繳租：${formatRentCountdown(msLeft, false)}`, `⏳ Next rent in: ${formatRentCountdown(msLeft, false)}`);
      if (nextBadgeText !== lastRentCountdownBadgeText) {
        badge.textContent = nextBadgeText;
        lastRentCountdownBadgeText = nextBadgeText;
      }
    }
    if (payBtn) {
      payBtn.classList.toggle("hidden", !isDue || isSuperAdmin);
      payBtn.textContent = bi(`🏠 立即繳納本期房租（${MONTHLY_RENT_CLAMS} 英蚌）`, `🏠 Pay Monthly Rent (${MONTHLY_RENT_CLAMS} Clams)`);
      payBtn.disabled = rentActionBusy || (!isSuperAdmin && clams < MONTHLY_RENT_CLAMS);
    }
    if (testBtn) {
      testBtn.classList.toggle("hidden", !isSuperAdmin);
      testBtn.textContent = bi(`🧪 測試模擬繳一期房租（-${MONTHLY_RENT_CLAMS}）`, `🧪 Simulate Monthly Rent (-${MONTHLY_RENT_CLAMS})`);
      testBtn.disabled = rentActionBusy;
    }
  }
}

function renderFinanceDialog() {
  const profile = currentUserProfile || {};
  const isSuperAdmin = currentRole === "super_admin";
  const clams = Math.max(0, Math.trunc(Number(profile.clams ?? STARTER_CLAMS)));
  const currentMonth = getMonthKey();

  const financeSubtitleEl = document.getElementById("finance-dialog-subtitle");
  if (financeSubtitleEl) {
    financeSubtitleEl.textContent = bi(
      `看懂每月賺了多少、花了多少，記得先留住每月 ${MONTHLY_RENT_CLAMS} 英蚌的房租喔！`,
      `Track monthly earnings and spending—remember to reserve ${MONTHLY_RENT_CLAMS} Clams for rent!`
    );
  }
  const rentHeroTitleEl = document.getElementById("finance-rent-hero-title");
  if (rentHeroTitleEl) {
    rentHeroTitleEl.textContent = bi(
      `🏠 每月房租預算：${MONTHLY_RENT_CLAMS} 英蚌／月`,
      `🏠 Monthly Rent Budget: ${MONTHLY_RENT_CLAMS} Clams / mo`
    );
  }
  const financeFooterNoteEl = document.getElementById("finance-footer-note");
  if (financeFooterNoteEl) {
    financeFooterNoteEl.textContent = bi(
      `只租不買提醒：每月 1 號結算一次房租（${MONTHLY_RENT_CLAMS} 英蚌）`,
      `Tenant note: Monthly rent (${MONTHLY_RENT_CLAMS} Clams) is billed on the 1st of each month.`
    );
  }

  // Budget progress bar & friendly status message
  const budgetMsgEl = document.getElementById("finance-rent-budget-msg");
  const fillEl = document.getElementById("finance-budget-fill");
  const ratio = isSuperAdmin ? 100 : Math.min(100, Math.round((clams / MONTHLY_RENT_CLAMS) * 100));
  if (fillEl) {
    fillEl.style.width = `${ratio}%`;
    fillEl.classList.toggle("is-low", !isSuperAdmin && clams < MONTHLY_RENT_CLAMS);
  }
  if (budgetMsgEl) {
    if (isSuperAdmin) {
      budgetMsgEl.textContent = bi(
        "超級管理員測試模式（∞ 無限英蚌，仍完整紀錄支出與模擬繳租）。",
        "Super Admin test mode (∞ Clams; spending and simulated rent are still logged)."
      );
    } else if (clams >= MONTHLY_RENT_CLAMS) {
      budgetMsgEl.textContent = bi(
        `✓ 本月房租預算已達標！預留 ${MONTHLY_RENT_CLAMS} 英蚌房租後，還可放心花費 ${clams - MONTHLY_RENT_CLAMS} 英蚌。`,
        `✓ Rent covered! After reserving ${MONTHLY_RENT_CLAMS} Clams, you have ${clams - MONTHLY_RENT_CLAMS} Clams left to spend.`
      );
    } else {
      budgetMsgEl.textContent = bi(
        `⚠️ 目前還差 ${MONTHLY_RENT_CLAMS - clams} 英蚌才夠繳下月房租，建議先去電腦接案賺錢喔！`,
        `⚠️ Short by ${MONTHLY_RENT_CLAMS - clams} Clams for next rent—complete quests at your desk!`
      );
    }
  }

  const landlordNoteEl = document.getElementById("finance-landlord-note");
  if (landlordNoteEl) {
    const dueAt = Number(profile.nextRentDueAt || getNextMonthFirstEpoch());
    const msLeft = dueAt - Date.now();
    const isDue = msLeft <= 0;
    const daysLeft = isDue ? 0 : Math.max(1, Math.ceil(msLeft / 86400000));
    const deficit = Math.max(0, MONTHLY_RENT_CLAMS - clams);
    const paidThisMonth = Boolean(profile.lastRentPaidMonth && profile.lastRentPaidMonth === currentMonth);

    landlordNoteEl.className = "finance-landlord-note";
    let noteIcon = "✉️";
    let noteTitle = bi("房東陳伯伯的小紙條", "Note from Landlord Uncle Chen");
    let noteBody = "";

    if (isSuperAdmin) {
      noteIcon = "🕶️";
      noteTitle = bi("房東陳伯伯（對大股東敬禮）", "Landlord Uncle Chen (Saluting the Owner)");
      noteBody = bi(
        "「管理員大大好！這棟樓的財務報表您隨時檢閱，房租只是順手測一下流程而已～」",
        "\"Welcome, Admin! Feel free to review the ledger and test the rent flow anytime.\""
      );
    } else if (isDue && deficit > 0) {
      landlordNoteEl.classList.add("is-urgent");
      noteIcon = "🧧";
      noteTitle = bi("🚨 房東急件催租字條（已到期且餘額不足）", "🚨 Urgent Rent Notice (Overdue & Short)");
      noteBody = bi(
        `「門縫收到通知了嗎？本月房租 ${MONTHLY_RENT_CLAMS} 英蚌已到期，還差 ${deficit} 英蚌！快回電腦接一個英語單元交稿賺錢，不然橘貓也要看著你嘆氣啦！」`,
        `"Rent (${MONTHLY_RENT_CLAMS} Clams) is due and you're short by ${deficit}! Finish a quest on your Mac right away!"`
      );
    } else if (isDue) {
      landlordNoteEl.classList.add("is-urgent");
      noteIcon = "🚪";
      noteTitle = bi("🏠 房東通知：本月房租可以結算囉！", "🏠 Landlord Notice: Rent Ready to Pay!");
      noteBody = bi(
        `「早安呀小畫師～本月 ${MONTHLY_RENT_CLAMS} 英蚌房租已到期，我看你存摺裡現金夠了，按上方按鈕就能輕鬆入帳！」`,
        `"Morning, artist! This month's ${MONTHLY_RENT_CLAMS} Clams rent is due, and your balance covers it—click above to settle up!"`
      );
    } else if (deficit > 0 && daysLeft <= 7) {
      landlordNoteEl.classList.add("is-tight");
      noteIcon = "⏳";
      noteTitle = bi(`⚠️ 房東溫馨倒數通知（剩 ${daysLeft} 天）`, `⚠️ Friendly Rent Reminder (${daysLeft}d left)`);
      noteBody = bi(
        `「再過 ${daysLeft} 天就要繳下期 ${MONTHLY_RENT_CLAMS} 英蚌房租囉！你現在還缺 ${deficit} 英蚌，趕緊打開 MacBook 完成一單英語委託最安心！」`,
        `"${daysLeft} day(s) until ${MONTHLY_RENT_CLAMS} Clams rent is due! You still need ${deficit} more Clams—knock out one quick commission!"`
      );
    } else if (paidThisMonth) {
      landlordNoteEl.classList.add("is-paid");
      noteIcon = "🥳";
      noteTitle = bi("✨ 房東點讚回執：本月房租準時收訖", "✨ Landlord Receipt: Paid on Time!");
      noteBody = bi(
        `「這麼準時的接案租客真是少見！距離下次繳租還有 ${daysLeft} 天，多餘的 ${clams} 英蚌可以去生活商店挑家具犒賞自己～」`,
        `"Promptest illustrator tenant ever! ${daysLeft} day(s) until next rent—treat yourself at the Studio Shop!"`
      );
    } else if (deficit > 0) {
      landlordNoteEl.classList.add("is-tight");
      noteIcon = "📒";
      noteTitle = bi(`💡 房東鄰居關心（距繳租 ${daysLeft} 天）`, `💡 Friendly Reminder (${daysLeft}d until rent)`);
      noteBody = bi(
        `「先存好下期房租（還差 ${deficit} 英蚌）再逛家具店，是最穩健的接案生存法則喔！」`,
        `"Save up the ${deficit} Clams needed for next rent before furniture shopping—smartest freelance habit!"`
      );
    } else {
      noteIcon = "☕";
      noteTitle = bi(`🌞 房東的祝福（預算已就緒，距繳租剩 ${daysLeft} 天）`, `🌞 Landlord's Note (Budget Ready · ${daysLeft}d left)`);
      noteBody = bi(
        `「房租 ${MONTHLY_RENT_CLAMS} 英蚌都預留妥當啦，剩下的 ${clams - MONTHLY_RENT_CLAMS} 英蚌祝你在工作室創作愉快！」`,
        `"Rent (${MONTHLY_RENT_CLAMS} Clams) is safely reserved! Enjoy spending your extra ${clams - MONTHLY_RENT_CLAMS} Clams on your studio!"`
      );
    }

    landlordNoteEl.innerHTML = `
      <span class="finance-landlord-icon" aria-hidden="true">${noteIcon}</span>
      <div class="finance-landlord-copy">
        <strong>${escapeHtml(noteTitle)}</strong>
        <span>${escapeHtml(noteBody)}</span>
      </div>
    `;
  }

  // Month selector options
  const monthSet = new Set([currentMonth]);
  cachedTransactions.forEach(tx => {
    if (tx.monthKey) monthSet.add(tx.monthKey);
  });
  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  const monthSelect = document.getElementById("finance-month-select");
  if (!sortedMonths.includes(activeFinanceMonth) && activeFinanceMonth !== "all") {
    activeFinanceMonth = currentMonth;
  }
  monthSelect.innerHTML = "";
  sortedMonths.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m === currentMonth ? bi(`${m}（本月）`, `${m} (This Month)`) : m;
    monthSelect.appendChild(opt);
  });
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = bi("全部歷史月份", "All Months");
  monthSelect.appendChild(allOpt);
  monthSelect.value = activeFinanceMonth;

  // Type filter tabs
  const tabsEl = document.getElementById("finance-type-tabs");
  tabsEl.innerHTML = "";
  [
    { id: "all", label: bi("全部明細", "All") },
    { id: "expense", label: bi("只看支出", "Expenses") },
    { id: "income", label: bi("只看收入", "Income") }
  ].forEach(tab => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `shop-tab-btn${activeFinanceFilter === tab.id ? " is-active" : ""}`;
    b.textContent = tab.label;
    b.onclick = () => {
      activeFinanceFilter = tab.id;
      renderFinanceDialog();
      saveNavState();
    };
    tabsEl.appendChild(b);
  });

  const monthScoped = activeFinanceMonth === "all"
    ? cachedTransactions
    : cachedTransactions.filter(tx => tx.monthKey === activeFinanceMonth);

  const incomeSum = monthScoped
    .filter(tx => tx.amount > 0)
    .reduce((acc, tx) => acc + tx.amount, 0);
  const recordedExpenseSum = monthScoped
    .filter(tx => tx.amount < 0)
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);

  // Include current month's unpaid 100 clam rent as monthly budget in total expense view
  const hasPaidRentInSelectedMonth = activeFinanceMonth !== "all" &&
    monthScoped.some(tx => tx.type === "rent");
  const showUnpaidRentBudget = activeFinanceMonth === currentMonth && !hasPaidRentInSelectedMonth;
  const totalExpenseWithBudget = recordedExpenseSum + (showUnpaidRentBudget ? MONTHLY_RENT_CLAMS : 0);

  const unitClamWord = bi("英蚌", "Clams");
  const scopeLabel = activeFinanceMonth === "all"
    ? bi("累積總", "Total ")
    : (activeFinanceMonth === currentMonth ? bi("本月", "Monthly ") : `${activeFinanceMonth} `);
  document.getElementById("finance-income-label").textContent = bi(`💵 ${scopeLabel}收入`, `💵 ${scopeLabel}Income`);
  document.getElementById("finance-income-val").textContent = `+${incomeSum} ${unitClamWord}`;
  document.getElementById("finance-expense-label").textContent = bi(
    `💸 ${scopeLabel}${showUnpaidRentBudget ? "花費＋房租預算" : "總支出"}`,
    `💸 ${scopeLabel}${showUnpaidRentBudget ? "Spending + Rent Budget" : "Expenses"}`
  );
  document.getElementById("finance-expense-val").textContent = `-${totalExpenseWithBudget} ${unitClamWord}`;
  document.getElementById("finance-expense-sub").textContent = showUnpaidRentBudget
    ? bi(
        `已實際支出 ${recordedExpenseSum} ＋ 本月房租預算 ${MONTHLY_RENT_CLAMS}`,
        `Spent ${recordedExpenseSum} + Rent budget ${MONTHLY_RENT_CLAMS}`
      )
    : bi("紀錄支出合計（含已繳房租與購買家具）", "Recorded total spending (rent + purchases)");

  document.getElementById("finance-balance-val").textContent = isSuperAdmin ? `∞ ${unitClamWord}` : `${clams} ${unitClamWord}`;
  document.getElementById("finance-free-cash-sub").textContent = isSuperAdmin
    ? bi("超級管理員測試無限額度", "Super Admin unlimited balance")
    : bi(
        `扣掉 ${MONTHLY_RENT_CLAMS} 房租後可自由花費：${Math.max(0, clams - MONTHLY_RENT_CLAMS)} 英蚌`,
        `Spendable after ${MONTHLY_RENT_CLAMS} rent: ${Math.max(0, clams - MONTHLY_RENT_CLAMS)} Clams`
      );

  const listEl = document.getElementById("finance-tx-list");
  listEl.innerHTML = "";

  if (showUnpaidRentBudget && (activeFinanceFilter === "all" || activeFinanceFilter === "expense")) {
    const budgetRow = document.createElement("div");
    budgetRow.className = "finance-tx-row is-budget-row";
    budgetRow.innerHTML = `
      <div class="finance-tx-meta">
        <span class="finance-tx-title">${bi(
          `🏠 ${escapeHtml(currentMonth)} 每月房租預算（每月 1 號繳納）`,
          `🏠 ${escapeHtml(currentMonth)} Monthly Rent Budget (Due 1st)`
        )}</span>
        <span class="finance-tx-sub">${bi(
          "固定生活必要支出 · 尚未扣款（預先計入本月預算）",
          "Fixed living expense · Upcoming (reserved in budget)"
        )}</span>
      </div>
      <span class="finance-tx-amount is-budget">-${MONTHLY_RENT_CLAMS} ${bi("英蚌（預算）", "Clams (Budget)")}</span>
    `;
    listEl.appendChild(budgetRow);
  }

  const filteredList = monthScoped.filter(tx => {
    if (activeFinanceFilter === "income") return tx.amount > 0;
    if (activeFinanceFilter === "expense") return tx.amount < 0;
    return true;
  });

  if (filteredList.length === 0 && !(showUnpaidRentBudget && activeFinanceFilter !== "income")) {
    const emptyEl = document.createElement("p");
    emptyEl.className = "form-hint";
    emptyEl.textContent = bi(
      "這個分類與月份目前還沒有收支紀錄；去商店買東西、完成接案或繳交房租後就會記錄在這裡！",
      "No transactions in this filter yet—shop, finish gigs, or pay rent to see logs here!"
    );
    listEl.appendChild(emptyEl);
  } else {
    filteredList.forEach(tx => {
      const row = document.createElement("div");
      row.className = "finance-tx-row";
      const isIn = tx.amount > 0;
      const icon = tx.type === "rent"
        ? "🏠"
        : tx.type === "income"
          ? "📋"
          : tx.type === "resale"
            ? "♻️"
            : tx.type === "bonus"
              ? "🌟"
              : tx.category === "paint"
                ? "🎨"
                : tx.category === "floor"
                  ? "🪵"
                  : tx.category === "desk"
                    ? "🪑"
                    : tx.category === "textile"
                    ? "🛏️"
                    : tx.category === "gear"
                      ? "⌨️"
                      : "🛋️";
      const dateText = tx.createdAt?.toDate
        ? tx.createdAt.toDate().toLocaleString(isEn() ? "en-US" : "zh-TW", { hour12: false })
        : (tx.monthKey || "");
      row.innerHTML = `
        <div class="finance-tx-meta">
          <span class="finance-tx-title">${icon} ${escapeHtml(tx.title || bi("收支項目", "Transaction"))}</span>
          <span class="finance-tx-sub">${escapeHtml(dateText)}</span>
        </div>
        <span class="finance-tx-amount ${isIn ? "is-in" : "is-out"}">${isIn ? "+" : ""}${tx.amount} ${unitClamWord}</span>
      `;
      listEl.appendChild(row);
    });
  }

  updateRentCountdownUI();
}

async function payMonthlyRent({ isTestDemo = false } = {}) {
  if (!currentUser || rentActionBusy) return;
  const isSuperAdmin = currentRole === "super_admin";
  if (isTestDemo && !isSuperAdmin) return;

  rentActionBusy = true;
  clearFeedback("finance-feedback");
  updateRentCountdownUI();
  try {
    const userRef = doc(firestoreDb, "users", currentUser.uid);
    const monthStr = getMonthKey();
    const result = await runTransaction(firestoreDb, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error(bi("找不到使用者檔案。", "User profile not found."));
      const data = snap.data() || {};
      const curClams = Math.trunc(Number(data.clams ?? STARTER_CLAMS));
      const curDue = Number(data.nextRentDueAt || Date.now());
      if (!isTestDemo && !isSuperAdmin && curClams < MONTHLY_RENT_CLAMS) {
        throw new Error(bi(
          `餘額不足 ${MONTHLY_RENT_CLAMS} 英蚌，先接案賺錢再來繳租吧！`,
          `Not enough Clams (${MONTHLY_RENT_CLAMS} needed). Complete quests to pay rent!`
        ));
      }
      const nextClams = (isTestDemo || isSuperAdmin) ? curClams : (curClams - MONTHLY_RENT_CLAMS);
      const nextDue = getNextMonthFirstEpoch(Math.max(Date.now(), curDue) + 60000);
      tx.update(userRef, {
        clams: nextClams,
        nextRentDueAt: nextDue,
        lastRentPaidMonth: monthStr,
        updatedAt: serverTimestamp()
      });
      queueLedgerTransaction(tx, currentUser.uid, {
        type: "rent",
        category: "rent",
        title: isTestDemo
          ? bi("測試模擬繳交每月房租", "Simulated monthly rent test")
          : bi(`繳交每月租屋處房租（${monthStr}）`, `Monthly Studio Rent (${monthStr})`),
        amount: -MONTHLY_RENT_CLAMS,
        monthKey: monthStr
      });
      return { nextClams, nextDue, monthStr };
    });

    if (currentUserProfile) {
      currentUserProfile.clams = result.nextClams;
      currentUserProfile.nextRentDueAt = result.nextDue;
      currentUserProfile.lastRentPaidMonth = result.monthStr;
    }

    updateHeaderAccountUI(
      currentUser,
      currentRole,
      currentUserProfile?.displayName || resolveFallbackName(currentUser),
      result.nextClams
    );
    const note = isTestDemo
      ? bi(`已模擬記帳一期 -${MONTHLY_RENT_CLAMS} 英蚌房租並推進下期倒數！`, `Simulated -${MONTHLY_RENT_CLAMS} Clams rent log and advanced next due date!`)
      : bi(`已成功繳納 ${result.monthStr} 房租 ${MONTHLY_RENT_CLAMS} 英蚌！`, `Paid ${result.monthStr} rent (${MONTHLY_RENT_CLAMS} Clams)!`);
    showFeedback("finance-feedback", "success", note);
    roomScene?.showBubble("Paid my monthly rent! 🏠", 3600);
    renderFinanceDialog();
  } catch (err) {
    showFeedback("finance-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    rentActionBusy = false;
    updateRentCountdownUI();
  }
}

async function maybeCollectMonthlyRent() {
  if (!currentUser || !currentUserProfile || rentActionBusy) return;
  if (currentRole === "super_admin") return;
  const now = Date.now();
  if (now < nextAutoRentRetryAt) return;
  const dueAt = Number(currentUserProfile.nextRentDueAt || 0);
  if (!dueAt || now < dueAt) return;
  const clams = Math.trunc(Number(currentUserProfile.clams ?? STARTER_CLAMS));
  if (clams >= MONTHLY_RENT_CLAMS) {
    try {
      await payMonthlyRent({ isTestDemo: false });
      const stillDue = Number(currentUserProfile?.nextRentDueAt || 0) <= Date.now();
      if (stillDue) {
        nextAutoRentRetryAt = Date.now() + AUTO_RENT_FAILURE_COOLDOWN_MS;
      }
    } catch {
      nextAutoRentRetryAt = Date.now() + AUTO_RENT_FAILURE_COOLDOWN_MS;
    }
  }
}

function startTransactionsRealtimeListener(uid, nonce) {
  if (unsubscribeTransactionsRealtime) {
    unsubscribeTransactionsRealtime();
    unsubscribeTransactionsRealtime = null;
  }
  const q = query(
    collection(firestoreDb, "users", uid, "transactions"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  unsubscribeTransactionsRealtime = onSnapshot(q, (snap) => {
    if (nonce !== authSessionNonce) return;
    const rows = [];
    snap.forEach(d => rows.push({ id: d.id, ...(d.data() || {}) }));
    cachedTransactions = rows;
    if (financeDialog.open) {
      renderFinanceDialog();
    }
  }, (err) => {
    console.warn("Transactions realtime listener warning:", err?.message || err);
  });
}

document.getElementById("room-finance-btn").addEventListener("click", () => {
  if (spectatingStudentUid) return;
  if (roomScene?.editMode) roomScene.exitFurnitureEditMode({ commit: true });
  clearFeedback("finance-feedback");
  renderFinanceDialog();
  if (!financeDialog.open) financeDialog.showModal();
  updateRentCountdownUI();
});
document.getElementById("finance-month-select").addEventListener("change", (e) => {
  activeFinanceMonth = e.currentTarget.value;
  renderFinanceDialog();
  saveNavState();
});
document.getElementById("finance-pay-rent-btn").addEventListener("click", () => {
  payMonthlyRent({ isTestDemo: false });
});
document.getElementById("finance-test-rent-btn").addEventListener("click", () => {
  payMonthlyRent({ isTestDemo: true });
});

let lessonTimerTickCounter = 0;

setInterval(() => {
  if (document.hidden || !currentUser || !currentUserProfile) return;
  if (currentScreen === "room" || financeDialog.open) {
    updateRentCountdownUI();
  }
  lessonTimerTickCounter = (lessonTimerTickCounter + 1) % 5;
  if (lessonTimerTickCounter === 0 && currentScreen === "lesson" && activeLessonDate) {
    startOrResumeLessonTimer(activeLessonDate);
    flushLessonActiveElapsedTime();
  }
  maybeCollectMonthlyRent();
}, 1000);

document.getElementById("room-edit-layout-btn")?.addEventListener("click", () => {
  if (spectatingStudentUid || !roomScene) return;
  if (roomScene.editMode) {
    roomScene.exitFurnitureEditMode({ commit: true });
  } else {
    roomScene.enterFurnitureEditMode();
  }
});

document.getElementById("room-zoom-toggle-btn")?.addEventListener("click", () => {
  const panel = document.getElementById("room-zoom-panel");
  const toggleBtn = document.getElementById("room-zoom-toggle-btn");
  if (!panel || !toggleBtn) return;
  const opening = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !opening);
  toggleBtn.classList.toggle("is-active", opening);
  toggleBtn.setAttribute("aria-expanded", String(opening));
  syncRoomZoomUI();
});

document.getElementById("room-zoom-out-btn")?.addEventListener("click", () => {
  roomScene?.adjustCameraZoom(-0.15);
});

document.getElementById("room-zoom-in-btn")?.addEventListener("click", () => {
  roomScene?.adjustCameraZoom(0.15);
});

document.getElementById("room-zoom-slider")?.addEventListener("input", (e) => {
  const pct = Number(e.target.value);
  if (Number.isFinite(pct)) {
    roomScene?.setCameraZoom(pct / 100, { instant: true });
  }
});

document.getElementById("room-zoom-reset-btn")?.addEventListener("click", () => {
  roomScene?.resetCameraZoom();
});

syncRoomZoomUI();

document.getElementById("room-story-next-btn")?.addEventListener("click", () => {
  advanceIntroStoryBanner();
});

document.getElementById("room-story-text")?.addEventListener("click", () => {
  advanceIntroStoryBanner();
});

document.getElementById("room-story-skip-btn")?.addEventListener("click", () => {
  closeIntroStoryBanner({ markSeen: true });
});

document.addEventListener("keydown", (e) => {
  if (!introStoryActive || currentScreen !== "room") return;
  if (document.querySelector("dialog[open]")) return;
  const tag = e.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (e.key === "Escape") {
    e.preventDefault();
    closeIntroStoryBanner({ markSeen: true });
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    advanceIntroStoryBanner();
    return;
  }
  if ((e.key === "Enter" || e.key === " ") && tag !== "BUTTON") {
    e.preventDefault();
    advanceIntroStoryBanner();
  }
});

document.getElementById("edit-rotate-left-btn")?.addEventListener("click", () => {
  roomScene?.rotateEditingFurniture(-1);
});

document.getElementById("edit-rotate-right-btn")?.addEventListener("click", () => {
  roomScene?.rotateEditingFurniture(1);
});

document.getElementById("edit-confirm-item-btn")?.addEventListener("click", () => {
  if (!roomScene?.editMode) return;
  if (roomScene.editSelectedId) {
    roomScene.commitActiveFurniturePlacement();
  }
});

document.getElementById("edit-cancel-item-btn")?.addEventListener("click", () => {
  roomScene?.cancelEditingFurniture();
});

document.getElementById("room-edit-avatar-btn").addEventListener("click", () => {
  if (spectatingStudentUid) return;
  showOnboardingScreen(true);
});

window.addEventListener("keydown", (e) => {
  if (currentScreen !== "room" || !roomScene) return;
  const trackChooserEl = document.getElementById("track-chooser-dialog");
  if (settingsDialog.open || adminReviewDialog.open || shopDialog.open || tvDialog.open || financeDialog.open || trackChooserEl?.open) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (e.key === "q" || e.key === "Q") {
    const q = roomScene.rotateLeft();
    syncRoomHUD();
    persistRoomState({ cameraQuarter: q });
  } else if (e.key === "e" || e.key === "E") {
    const q = roomScene.rotateRight();
    syncRoomHUD();
    persistRoomState({ cameraQuarter: q });
  }
});

// Teacher Client Approval & Clam Reward Controller
let cachedStudents = [];
let unsubscribeUserRealtime = null;
let unsubscribeAdminQueueRealtime = null;
let lastAdminPendingTotal = -1;
let lastAdminReviewSig = "";
let lastSpectatedVisualSig = "";
let lastUserProgressSig = "";
let lastUserRoomVisualSig = "";
let lastUserDialogSig = "";
let lastUserHeaderSig = "";

function stopRealtimeListeners() {
  if (unsubscribeUserRealtime) {
    unsubscribeUserRealtime();
    unsubscribeUserRealtime = null;
  }
  if (unsubscribeAdminQueueRealtime) {
    unsubscribeAdminQueueRealtime();
    unsubscribeAdminQueueRealtime = null;
  }
  if (unsubscribeTransactionsRealtime) {
    unsubscribeTransactionsRealtime();
    unsubscribeTransactionsRealtime = null;
  }
  cachedStudents = [];
  cachedTransactions = [];
  lastAdminPendingTotal = -1;
  lastAdminReviewSig = "";
  lastSpectatedVisualSig = "";
  lastUserProgressSig = "";
  lastUserRoomVisualSig = "";
  lastUserDialogSig = "";
  lastUserHeaderSig = "";
  const badge = document.getElementById("admin-pending-badge");
  if (badge) {
    badge.textContent = "0";
    badge.classList.add("hidden");
  }
}

function syncCachedStudentsSnapshot(docsList, preserveUid = null) {
  cachedStudents = docsList;

  // Update live pending badge on header button only when count changes
  let totalPending = 0;
  cachedStudents.forEach(stu => {
    const approved = stu.approvedLessons || {};
    const overrides = stu.completionOverrides || {};
    const submitted = stu.submittedLessons || {};
    Object.keys(submitted).forEach(dateKey => {
      if (submitted[dateKey] && !approved[dateKey] && !overrides[dateKey]) {
        totalPending += 1;
      }
    });
  });

  if (totalPending !== lastAdminPendingTotal) {
    lastAdminPendingTotal = totalPending;
    const pendingBadge = document.getElementById("admin-pending-badge");
    if (pendingBadge) {
      pendingBadge.textContent = String(totalPending);
      pendingBadge.classList.toggle("hidden", totalPending <= 0);
    }
  }

  if (pendingRestoreSpectateUid && currentScreen === "room" && !getActiveOpenModalKey()) {
    const restoreUid = pendingRestoreSpectateUid;
    pendingRestoreSpectateUid = null;
    if (cachedStudents.some(s => s.uid === restoreUid)) {
      spectateStudentRoom(restoreUid);
      return;
    }
  }

  if (spectatingStudentUid && currentScreen === "room") {
    const liveStu = cachedStudents.find(s => s.uid === spectatingStudentUid);
    if (liveStu) {
      const nextSpectatedSig = JSON.stringify({
        avatar: liveStu.avatar || null,
        ownedItems: liveStu.ownedItems || null,
        roomState: liveStu.roomState || null,
        xp: liveStu.xp ?? 0
      });
      if (nextSpectatedSig !== lastSpectatedVisualSig) {
        lastSpectatedVisualSig = nextSpectatedSig;
        populateSpectateStudentSelect(spectatingStudentUid);
        if (roomScene) {
          applyProfileToRoomScene(liveStu, { preserveCamera: true });
          syncRoomHUD();
        }
      }
    }
  } else {
    lastSpectatedVisualSig = "";
  }

  if (!adminReviewDialog.open) return;

  const selectEl = document.getElementById("review-student-select");
  const summaryEl = document.getElementById("review-student-summary");
  const listEl = document.getElementById("review-lessons-list");
  const targetUid = preserveUid || selectEl.value;

  // Ignore unrelated room-only writes from other online students while admin reviews submissions
  const reviewSig = JSON.stringify(
    cachedStudents.map(stu => ([
      stu.uid,
      stu.displayName || "",
      stu.email || "",
      stu.avatar?.name || "",
      stu.clams ?? STARTER_CLAMS,
      stu.xp ?? 0,
      stu.approvedLessons || {},
      stu.completionOverrides || {},
      stu.submittedLessons || {},
      stu.submissionMetrics || {}
    ]))
  );
  if (!preserveUid && reviewSig === lastAdminReviewSig && selectEl.options.length > 0 && selectEl.value) {
    return;
  }
  lastAdminReviewSig = reviewSig;

  renderPendingReviewQueue();

  selectEl.innerHTML = "";
  if (cachedStudents.length === 0) {
    selectEl.innerHTML = `<option value="">${bi("尚無註冊帳號", "No registered accounts")}</option>`;
    summaryEl.textContent = bi("目前還沒有學生帳號註冊。", "No student accounts registered yet.");
    listEl.innerHTML = "";
    return;
  }

  cachedStudents.forEach(stu => {
    const opt = document.createElement("option");
    opt.value = stu.uid;
    const charName = stu.avatar?.name ? ` [${stu.avatar.name}]` : "";
    const approved = stu.approvedLessons || {};
    const overrides = stu.completionOverrides || {};
    const submitted = stu.submittedLessons || {};
    const pendingCount = Object.keys(submitted).filter(d => submitted[d] && !approved[d] && !overrides[d]).length;
    const pendingTag = pendingCount > 0 ? bi(` · 🔔${pendingCount}待驗收`, ` · 🔔${pendingCount} pending`) : "";
    const selfTag = (stu.email || "").toLowerCase() === SUPER_ADMIN_EMAIL ? bi(" ★測試帳號", " ★Test Admin") : "";
    opt.textContent = `${stu.displayName || stu.email}${charName}${selfTag} (${stu.email}) — ${stu.clams ?? STARTER_CLAMS} ${bi("英蚌", "Clams")}${pendingTag}`;
    selectEl.appendChild(opt);
  });

  const preferred = targetUid && cachedStudents.some(s => s.uid === targetUid)
    ? targetUid
    : (cachedStudents.find(s => {
        const sub = s.submittedLessons || {};
        const app = s.approvedLessons || {};
        const ov = s.completionOverrides || {};
        return Object.keys(sub).some(d => sub[d] && !app[d] && !ov[d]);
      })?.uid || cachedStudents[0].uid);

  selectEl.value = preferred;
  renderSelectedStudentReview();
}

const expandedReviewRowKeys = new Set();

function createReviewMetricTile(label, valueText, subText) {
  const tile = document.createElement("div");
  tile.className = "review-metric-tile";

  const lbl = document.createElement("span");
  lbl.className = "review-metric-label";
  lbl.textContent = label;

  const val = document.createElement("strong");
  val.className = "review-metric-value";
  val.textContent = valueText;

  const sub = document.createElement("span");
  sub.className = "review-metric-sub";
  sub.textContent = subText;

  tile.append(lbl, val, sub);
  return tile;
}

export function buildAdminSubmissionReviewRow({
  rowKey,
  stu,
  dateStr,
  headingText,
  sublineText,
  isPending = false,
  isApproved = false,
  highlightPending = false,
  metricRaw = null,
  onApprove = null,
  onReject = null
}) {
  const row = document.createElement("div");
  row.className = `admin-review-row${highlightPending ? " is-pending-row" : ""}`;
  row.dataset.reviewKey = rowKey;

  const metrics = evaluateSubmissionMetrics(metricRaw);

  const head = document.createElement("div");
  head.className = "admin-review-row-head";

  const meta = document.createElement("div");
  meta.className = "admin-review-meta";

  const titleLine = document.createElement("div");
  titleLine.className = "admin-review-title-line";
  const titleStrong = document.createElement("strong");
  titleStrong.textContent = headingText;
  titleLine.appendChild(titleStrong);

  if (metrics && (isPending || isApproved)) {
    const signalPill = document.createElement("span");
    signalPill.className = `review-signal-pill is-${metrics.level}`;
    signalPill.textContent = metrics.badgeText;
    titleLine.appendChild(signalPill);
  }

  const subSpan = document.createElement("span");
  subSpan.className = "form-hint";
  subSpan.textContent = sublineText;
  meta.append(titleLine, subSpan);

  const actionsEl = document.createElement("div");
  actionsEl.className = "admin-review-actions";

  if (isApproved) {
    const tag = document.createElement("span");
    tag.className = "role-badge verified-badge";
    tag.textContent = bi("已驗收通過 ✓", "Approved ✓");
    actionsEl.appendChild(tag);
  }

  const hasDrawer = isPending || Boolean(metrics);
  let toggleBtn = null;
  let drawerShell = null;

  const createActionControls = (isDrawerFooter) => {
    const rewardInput = document.createElement("input");
    rewardInput.type = "number";
    rewardInput.className = "reward-input-sm";
    rewardInput.value = String(UNIT_REWARD_CLAMS);
    rewardInput.min = "0";
    rewardInput.max = "100000";
    rewardInput.setAttribute("aria-label", bi(`${dateStr} 驗收報酬英蚌`, `Payout Clams for ${dateStr}`));

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "btn btn-primary btn-sm";
    approveBtn.textContent = isDrawerFooter
      ? bi("✓ 確定沒問題，驗收發錢", "✓ Confirm & Pay")
      : bi("驗收並撥款", "Approve & Pay");
    approveBtn.addEventListener("click", async () => {
      approveBtn.disabled = true;
      clearFeedback("admin-review-feedback");
      try {
        await onApprove?.(rewardInput.value, { approveBtn });
        expandedReviewRowKeys.delete(rowKey);
      } catch (err) {
        showFeedback("admin-review-feedback", "error", translateAuthError(err));
        approveBtn.disabled = false;
      }
    });

    const controls = [rewardInput, approveBtn];
    if (isPending && onReject) {
      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "btn btn-sm";
      rejectBtn.textContent = bi("↩ 退回修改", "↩ Request Revision");
      rejectBtn.addEventListener("click", async () => {
        rejectBtn.disabled = true;
        clearFeedback("admin-review-feedback");
        try {
          await onReject?.({ rejectBtn });
          expandedReviewRowKeys.delete(rowKey);
        } catch (err) {
          showFeedback("admin-review-feedback", "error", translateAuthError(err));
          rejectBtn.disabled = false;
        }
      });
      controls.push(rejectBtn);
    }
    return controls;
  };

  if (hasDrawer) {
    const isInitiallyOpen = expandedReviewRowKeys.has(rowKey);
    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-sm review-toggle-btn";
    toggleBtn.setAttribute("aria-expanded", isInitiallyOpen ? "true" : "false");
    toggleBtn.innerHTML = `<span>${isPending ? bi("🔍 審核數據", "🔍 Audit Details") : bi("📊 作答數據", "📊 Exam Stats")}</span><span class="review-chevron" aria-hidden="true">▾</span>`;

    drawerShell = document.createElement("div");
    drawerShell.className = `review-drawer-shell${isInitiallyOpen ? " is-open" : ""}`;
    drawerShell.setAttribute("aria-hidden", isInitiallyOpen ? "false" : "true");

    const drawerInner = document.createElement("div");
    drawerInner.className = "review-drawer-inner";

    const drawerCard = document.createElement("div");
    drawerCard.className = "review-drawer-card";

    if (metrics) {
      const grid = document.createElement("div");
      grid.className = "review-metrics-grid";

      const accVal = metrics.firstTryPct !== null ? `${metrics.firstTryPct}%` : "—";
      const accSub = metrics.firstTryTotal > 0
        ? bi(`${metrics.firstTryCorrect} / ${metrics.firstTryTotal} 題一次對`, `${metrics.firstTryCorrect} / ${metrics.firstTryTotal} first-try`)
        : bi("無選擇題", "No quiz items");
      const clickSub = metrics.firstTryTotal > 0
        ? bi(`平均 ${metrics.clicksPerQuestion} 次/題`, `${metrics.clicksPerQuestion} / question`)
        : bi("僅紀錄互動", "Interaction count");
      const timeSub = metrics.firstTryTotal > 0
        ? bi(`約 ${metrics.secPerQuestion} 秒/題`, `~${metrics.secPerQuestion}s / question`)
        : bi("主動停留時間", "Active study time");
      const retrySub = metrics.retryCount === 0
        ? bi("首次直接送出", "First submission")
        : bi(`按下重考 ${metrics.retryCount} 次`, `Reset ${metrics.retryCount} time(s)`);

      grid.append(
        createReviewMetricTile(bi("首次答對率", "First-Try Accuracy"), accVal, accSub),
        createReviewMetricTile(bi("總點擊次數", "Total Clicks"), bi(`${metrics.totalClicks} 次`, `${metrics.totalClicks}`), clickSub),
        createReviewMetricTile(bi("作答耗時", "Time Spent"), metrics.durationText, timeSub),
        createReviewMetricTile(bi("重考次數", "Retries"), bi(`${metrics.retryCount} 次`, `${metrics.retryCount}`), retrySub)
      );

      const noteEl = document.createElement("div");
      noteEl.className = `review-audit-note${metrics.level === "alert" ? " is-alert" : metrics.level === "caution" ? " is-caution" : ""}`;
      noteEl.textContent = metrics.summaryHint;

      drawerCard.append(grid, noteEl);
    } else {
      const legacyNote = document.createElement("div");
      legacyNote.className = "review-audit-note";
      legacyNote.textContent = bi("此為早期交稿紀錄，尚未寫入作答統計數據。", "Legacy submission recorded prior to exam telemetry.");
      drawerCard.appendChild(legacyNote);
    }

    if (isPending && !isApproved) {
      const footer = document.createElement("div");
      footer.className = "review-drawer-footer";

      const labelHint = document.createElement("span");
      labelHint.className = "form-hint";
      labelHint.textContent = bi("確認審核無誤後輸入獎勵金額並撥款：", "Verify metrics and confirm payout:");

      const btnGroup = document.createElement("div");
      btnGroup.className = "admin-review-actions";
      btnGroup.append(...createActionControls(true));

      footer.append(labelHint, btnGroup);
      drawerCard.appendChild(footer);
    }

    drawerInner.appendChild(drawerCard);
    drawerShell.appendChild(drawerInner);

    toggleBtn.addEventListener("click", () => {
      const willOpen = !drawerShell.classList.contains("is-open");
      drawerShell.classList.toggle("is-open", willOpen);
      drawerShell.setAttribute("aria-hidden", willOpen ? "false" : "true");
      toggleBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) {
        expandedReviewRowKeys.add(rowKey);
      } else {
        expandedReviewRowKeys.delete(rowKey);
      }
    });

    actionsEl.appendChild(toggleBtn);
  } else if (!isApproved) {
    actionsEl.append(...createActionControls(false));
  }

  head.append(meta, actionsEl);
  row.appendChild(head);
  if (drawerShell) {
    row.appendChild(drawerShell);
  }
  return row;
}

function renderPendingReviewQueue() {
  const queueEl = document.getElementById("review-pending-queue");
  if (!queueEl) return;
  queueEl.innerHTML = "";

  const pendingEntries = [];
  cachedStudents.forEach(stu => {
    const approved = stu.approvedLessons || {};
    const overrides = stu.completionOverrides || {};
    const submitted = stu.submittedLessons || {};
    const metricsMap = stu.submissionMetrics || {};
    Object.keys(submitted).forEach(dateKey => {
      if (submitted[dateKey] && !approved[dateKey] && !overrides[dateKey]) {
        const lessonMeta = findLessonAnyTrack(dateKey);
        const defaultTitle = isIeltsLessonId(dateKey)
          ? dateKey.replace(/^ielts:/i, "IELTS ").toUpperCase()
          : bi("英語單元任務", "English Quest");
        pendingEntries.push({
          stu,
          dateStr: dateKey,
          title: lessonMeta?.Title || defaultTitle,
          metricRaw: metricsMap[dateKey] || null
        });
      }
    });
  });

  pendingEntries.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  if (pendingEntries.length === 0) {
    const emptyEl = document.createElement("p");
    emptyEl.className = "form-hint";
    emptyEl.textContent = bi("目前沒有尚未驗收的待處理交稿。", "No pending submissions awaiting review.");
    queueEl.appendChild(emptyEl);
    return;
  }

  pendingEntries.forEach(({ stu, dateStr, title, metricRaw }) => {
    const stuLabel = stu.avatar?.name
      ? `${stu.displayName || stu.email} [${stu.avatar.name}]`
      : (stu.displayName || stu.email);

    const row = buildAdminSubmissionReviewRow({
      rowKey: `pending:${stu.uid}:${dateStr}`,
      stu,
      dateStr,
      headingText: `🔔 ${stuLabel} — ${dateStr} · ${title}`,
      sublineText: `${stu.email || ""} ｜ ${bi("目前餘額", "Balance:")} ${Math.trunc(Number(stu.clams ?? STARTER_CLAMS))} ${bi("英蚌", "Clams")}`,
      isPending: true,
      isApproved: false,
      highlightPending: true,
      metricRaw,
      onApprove: async (clamVal) => {
        const res = await approveStudentLesson(stu.uid, dateStr, clamVal);
        const xpNote = res.xpGranted > 0 ? bi(`與 +${res.xpGranted} XP`, ` & +${res.xpGranted} XP`) : "";
        showFeedback(
          "admin-review-feedback",
          "success",
          res.alreadyApproved
            ? bi(`${stuLabel} 的 ${dateStr} 已是驗收狀態。`, `${stuLabel}'s ${dateStr} is already approved.`)
            : bi(
                `已驗收 ${stuLabel}（${dateStr}）並即時發放 ${clamVal} 英蚌${xpNote}！`,
                `Approved ${stuLabel} (${dateStr}) and awarded ${clamVal} Clams${xpNote}!`
              )
        );
        await loadStudentsForReview(stu.uid);
      },
      onReject: async () => {
        await rejectStudentSubmission(stu.uid, dateStr);
        showFeedback("admin-review-feedback", "info", bi(`已退回 ${stuLabel} 的 ${dateStr} 交稿。`, `Returned ${stuLabel}'s ${dateStr} submission.`));
        await loadStudentsForReview(stu.uid);
      }
    });
    queueEl.appendChild(row);
  });
}

function startUserRealtimeListener(uid, nonce) {
  if (unsubscribeUserRealtime) {
    unsubscribeUserRealtime();
    unsubscribeUserRealtime = null;
  }
  unsubscribeUserRealtime = onSnapshot(doc(firestoreDb, "users", uid), (snap) => {
    if (nonce !== authSessionNonce || !snap.exists()) return;
    const data = snap.data() || {};
    const prevApproved = { ...userApprovedLessons };
    const nextApproved = sanitizeBoolMap(data.approvedLessons);
    const newlyApproved = Object.keys(nextApproved).some(k => nextApproved[k] && !prevApproved[k]);

    currentUserProfile = data;
    userCompletionOverrides = sanitizeBoolMap(data.completionOverrides);
    userSubmittedLessons = sanitizeBoolMap(data.submittedLessons);
    userApprovedLessons = nextApproved;
    userXpAwardedLessons = sanitizeBoolMap(data.xpAwardedLessons);

    if (newlyApproved && (currentScreen === "desktop" || currentScreen === "lesson")) {
      pendingWorkCelebration = "approved";
    }

    const displayName = formatDisplayName(currentUser, data);
    const headerSig = JSON.stringify([displayName, currentRole, data.clams ?? STARTER_CLAMS, data.xp ?? 0]);
    if (headerSig !== lastUserHeaderSig) {
      lastUserHeaderSig = headerSig;
      updateHeaderAccountUI(currentUser, currentRole, displayName, data.clams ?? STARTER_CLAMS);
      syncXpProgressUI({ allowCelebrate: true });
    }

    const rs = data.roomState || {};
    const nextOwned = normalizeOwnedItems(data.ownedItems);
    if (roomScene && !spectatingStudentUid) {
      const roomVisualSig = JSON.stringify({
        wallColor: rs.wallColor || DEFAULT_WALL_COLOR,
        floorStyle: rs.floorStyle || DEFAULT_FLOOR_STYLE,
        deskStyle: getActiveRoomStyle(rs, "deskStyle", DEFAULT_DESK_STYLE),
        bedSheet: rs.bedSheet || DEFAULT_BED_SHEET,
        rugStyle: rs.rugStyle || DEFAULT_RUG_STYLE,
        shirtStyle: rs.shirtStyle || DEFAULT_SHIRT_STYLE,
        pantsStyle: rs.pantsStyle || DEFAULT_PANTS_STYLE,
        posterImage: rs.posterImage || "",
        vinylOn: Boolean(rs.vinylOn ?? false),
        ownedItems: nextOwned,
        pendingParcels: rs.pendingParcels || {},
        furnitureLayout: rs.furnitureLayout || {}
      });
      if (roomVisualSig !== lastUserRoomVisualSig) {
        lastUserRoomVisualSig = roomVisualSig;
        roomScene.setWallColor(rs.wallColor || DEFAULT_WALL_COLOR);
        roomScene.setFloorStyle(rs.floorStyle || DEFAULT_FLOOR_STYLE);
        roomScene.setDeskStyle(getActiveRoomStyle(rs, "deskStyle", DEFAULT_DESK_STYLE));
        roomScene.setBedSheet(rs.bedSheet || DEFAULT_BED_SHEET);
        roomScene.setRugStyle(rs.rugStyle || DEFAULT_RUG_STYLE);
        roomScene.setShirtStyle(rs.shirtStyle || DEFAULT_SHIRT_STYLE);
        roomScene.setPantsStyle(rs.pantsStyle || DEFAULT_PANTS_STYLE);
        roomScene.setPosterImage(rs.posterImage || "");
        roomScene.setVinylOn(Boolean(rs.vinylOn ?? false));
        if (!roomScene.editMode) {
          roomScene.setOwnedAndParcels(nextOwned, rs.pendingParcels || {});
          roomScene.applyFurnitureLayout(rs.furnitureLayout || {});
        } else {
          roomScene.applyOwnedItems(nextOwned);
        }
      }
    }

    const dialogSig = JSON.stringify([
      data.clams ?? STARTER_CLAMS,
      data.xp ?? 0,
      nextOwned,
      rs.wallColor || "",
      rs.floorStyle || "",
      rs.bedSheet || "",
      rs.rugStyle || "",
      rs.shirtStyle || "",
      rs.pantsStyle || "",
      rs.customStyles || null,
      rs.pendingParcels || null,
      data.nextRentDueAt || 0,
      data.lastRentPaidMonth || ""
    ]);
    if (dialogSig !== lastUserDialogSig) {
      lastUserDialogSig = dialogSig;
      if (shopDialog.open) renderShopDialog();
      if (financeDialog.open) renderFinanceDialog();
      if (!spectatingStudentUid) updateRentCountdownUI();
    }

    const progressSig = JSON.stringify([
      userCompletionOverrides,
      userSubmittedLessons,
      userApprovedLessons,
      userXpAwardedLessons,
      data.xp ?? 0
    ]);
    if (progressSig !== lastUserProgressSig) {
      lastUserProgressSig = progressSig;
      if (currentScreen === "desktop") {
        renderHome();
      } else if (currentScreen === "lesson" && activeLessonDate) {
        activeLessonSyncCommission?.();
      }
    }
  }, (err) => {
    console.warn("User realtime listener warning:", err?.message || err);
  });
}

function startAdminQueueRealtimeListener(nonce) {
  if (unsubscribeAdminQueueRealtime) {
    unsubscribeAdminQueueRealtime();
    unsubscribeAdminQueueRealtime = null;
  }
  const q = query(collection(firestoreDb, "users"), orderBy("email"));
  unsubscribeAdminQueueRealtime = onSnapshot(q, (snap) => {
    if (nonce !== authSessionNonce) return;
    const list = [];
    snap.forEach(docSnap => {
      list.push({ uid: docSnap.id, ...(docSnap.data() || {}) });
    });
    syncCachedStudentsSnapshot(list);
  }, (err) => {
    console.warn("Admin queue realtime listener warning:", err?.message || err);
  });
}

async function loadStudentsForReview(preserveUid = null) {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  const selectEl = document.getElementById("review-student-select");
  const listEl = document.getElementById("review-lessons-list");
  const summaryEl = document.getElementById("review-student-summary");
  if (cachedStudents.length === 0) {
    selectEl.innerHTML = `<option value="">${bi("正在讀取學生名單...", "Loading illustrators...")}</option>`;
    listEl.innerHTML = "";
  }

  try {
    const snap = await getDocs(query(collection(firestoreDb, "users"), orderBy("email")));
    const list = [];
    snap.forEach(docSnap => {
      list.push({ uid: docSnap.id, ...(docSnap.data() || {}) });
    });
    syncCachedStudentsSnapshot(list, preserveUid);
  } catch (err) {
    selectEl.innerHTML = `<option value="">${bi("讀取失敗", "Load failed")}</option>`;
    summaryEl.textContent = bi("無法讀取名單，請確認網路或管理員權限。", "Unable to load list. Check your network or admin permissions.");
    showFeedback("admin-review-feedback", "error", translateAuthError(err));
  }
}

async function approveStudentLesson(studentUid, dateStr, rewardAmount, xpAmount) {
  const safeReward = Math.max(0, Math.min(100000, Math.trunc(Number(rewardAmount) || 0)));
  let lessonMeta = findLessonAnyTrack(dateStr);
  if (!lessonMeta && isIeltsLessonId(dateStr) && isAdminRole()) {
    await ensureIeltsBankLoaded();
    lessonMeta = findLessonAnyTrack(dateStr);
  }
  const fallbackXp = isIeltsLessonId(dateStr) ? 60 : DEFAULT_LESSON_XP;
  const resolvedXp = xpAmount !== undefined && xpAmount !== null
    ? xpAmount
    : (lessonMeta ? getLessonXp(lessonMeta) : fallbackXp);
  const safeXp = Math.max(0, Math.min(10000, Math.trunc(Number(resolvedXp) || 0)));
  const stuRef = doc(firestoreDb, "users", studentUid);

  const result = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(stuRef);
    if (!snap.exists()) throw new Error(bi("找不到該學生帳號資料。", "Student account not found."));
    const data = snap.data() || {};
    const approvedMap = sanitizeBoolMap(data.approvedLessons);
    const submittedMap = sanitizeBoolMap(data.submittedLessons);
    const xpAwardedMap = sanitizeBoolMap(data.xpAwardedLessons);

    if (approvedMap[dateStr]) {
      return {
        alreadyApproved: true,
        nextClams: data.clams ?? STARTER_CLAMS,
        nextXp: Math.max(0, Math.trunc(Number(data.xp ?? 0))),
        xpGranted: 0
      };
    }

    const currentClams = Math.trunc(Number(data.clams ?? STARTER_CLAMS));
    const currentTotal = Math.trunc(Number(data.totalEarnedClams ?? 0));
    const currentXp = Math.max(0, Math.trunc(Number(data.xp ?? 0)));
    const nextClams = currentClams + safeReward;
    const nextTotal = currentTotal + safeReward;
    const xpGranted = xpAwardedMap[dateStr] ? 0 : safeXp;
    const nextXp = Math.min(10000000, currentXp + xpGranted);
    if (xpGranted > 0) {
      xpAwardedMap[dateStr] = true;
    }

    approvedMap[dateStr] = true;
    submittedMap[dateStr] = false;

    tx.update(stuRef, {
      approvedLessons: approvedMap,
      submittedLessons: submittedMap,
      clams: nextClams,
      totalEarnedClams: nextTotal,
      xp: nextXp,
      xpAwardedLessons: xpAwardedMap,
      updatedAt: serverTimestamp()
    });
    if (safeReward > 0) {
      queueLedgerTransaction(tx, studentUid, {
        type: "income",
        category: "lesson",
        title: bi(`單元驗收撥款（${dateStr}）`, `Quest Payout (${dateStr})`),
        amount: safeReward
      });
    }

    return {
      alreadyApproved: false,
      nextClams,
      nextTotal,
      nextXp,
      xpGranted,
      approvedMap,
      submittedMap,
      xpAwardedMap
    };
  });

  if (studentUid === currentUser?.uid && !result.alreadyApproved) {
    userApprovedLessons = result.approvedMap;
    userSubmittedLessons = result.submittedMap;
    userXpAwardedLessons = result.xpAwardedMap;
    if (currentUserProfile) {
      currentUserProfile.clams = result.nextClams;
      currentUserProfile.totalEarnedClams = result.nextTotal;
      currentUserProfile.xp = result.nextXp;
      currentUserProfile.approvedLessons = result.approvedMap;
      currentUserProfile.submittedLessons = result.submittedMap;
      currentUserProfile.xpAwardedLessons = result.xpAwardedMap;
    }
    updateHeaderAccountUI(
      currentUser,
      currentRole,
      formatDisplayName(currentUser, currentUserProfile),
      result.nextClams
    );
    if (currentScreen === "desktop" || currentScreen === "lesson") {
      pendingWorkCelebration = "approved";
    }
    syncXpProgressUI({ allowCelebrate: true });
    if (currentScreen === "desktop") renderHome();
    if (currentScreen === "lesson" && activeLessonDate) activeLessonSyncCommission?.();
  }

  return result;
}

async function rejectStudentSubmission(studentUid, dateStr) {
  const stuRef = doc(firestoreDb, "users", studentUid);
  await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(stuRef);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const submittedMap = sanitizeBoolMap(data.submittedLessons);
    submittedMap[dateStr] = false;
    tx.update(stuRef, {
      submittedLessons: submittedMap,
      updatedAt: serverTimestamp()
    });
  });
}

async function grantManualBonus(studentUid, bonusAmount) {
  const parsed = Math.trunc(Number(bonusAmount) || 0);
  const clampedDelta = Math.max(-50000, Math.min(100000, parsed));
  if (clampedDelta === 0) throw new Error(bi("請輸入非零的英蚌數量。", "Please enter a non-zero Clam amount."));
  const stuRef = doc(firestoreDb, "users", studentUid);
  const nextClams = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(stuRef);
    if (!snap.exists()) throw new Error(bi("找不到該學生帳號資料。", "Student account not found."));
    const data = snap.data() || {};
    const prevC = Math.trunc(Number(data.clams ?? STARTER_CLAMS));
    const prevT = Math.trunc(Number(data.totalEarnedClams ?? 0));
    const nextC = Math.max(0, Math.min(10000000, prevC + clampedDelta));
    const nextT = clampedDelta > 0 ? Math.min(10000000, prevT + clampedDelta) : prevT;
    tx.update(stuRef, {
      clams: nextC,
      totalEarnedClams: nextT,
      updatedAt: serverTimestamp()
    });
    const deltaApplied = nextC - prevC;
    if (deltaApplied !== 0) {
      queueLedgerTransaction(tx, studentUid, {
        type: deltaApplied > 0 ? "bonus" : "adjustment",
        category: deltaApplied > 0 ? "bonus" : "adjustment",
        title: deltaApplied > 0
          ? bi("課堂獎勵／老師加碼發放", "Class Bonus / Client Bonus")
          : bi("管理員餘額更正調整", "Admin Balance Adjustment"),
        amount: deltaApplied
      });
    }
    return { nextC, nextT, deltaApplied };
  });

  if (studentUid === currentUser?.uid && currentUserProfile) {
    currentUserProfile.clams = nextClams.nextC;
    currentUserProfile.totalEarnedClams = nextClams.nextT;
    updateHeaderAccountUI(
      currentUser,
      currentRole,
      formatDisplayName(currentUser, currentUserProfile),
      nextClams.nextC
    );
  }
  return nextClams;
}

function renderSelectedStudentReview() {
  const selectEl = document.getElementById("review-student-select");
  const summaryEl = document.getElementById("review-student-summary");
  const listEl = document.getElementById("review-lessons-list");
  const stu = cachedStudents.find(s => s.uid === selectEl.value);
  listEl.innerHTML = "";
  if (!stu) return;

  const clams = Math.trunc(Number(stu.clams ?? STARTER_CLAMS));
  const totalEarned = Math.trunc(Number(stu.totalEarnedClams ?? 0));
  const stuXp = Math.max(0, Math.trunc(Number(stu.xp ?? 0)));
  const stuProgress = resolveXpProgress(stuXp, XP_PER_LEVEL);
  const ownedCount = Object.values(stu.ownedItems || {}).filter(Boolean).length;
  summaryEl.textContent = bi(
    `Lv.${stuProgress.level} ${stuProgress.title}（${stuXp} XP）｜ 餘額：${clams} 英蚌 ｜ 累積收入：${totalEarned} 英蚌 ｜ 角色：${stu.avatar?.name || "尚未建立"} ｜ 已購物件：${ownedCount} 件`,
    `Lv.${stuProgress.level} ${stuProgress.title} (${stuXp} XP) | Balance: ${clams} Clams | Earned: ${totalEarned} Clams | Artist: ${stu.avatar?.name || "Not set"} | Owned: ${ownedCount}`
  );

  // Direct Clam Payout / Adjustment row
  const bonusRow = document.createElement("div");
  bonusRow.className = "admin-review-row";
  bonusRow.innerHTML = `
    <div class="admin-review-meta">
      <strong>${bi("💰 直接發放／調整英蚌", "💰 Direct Clam Payout / Adjust")}</strong>
      <span class="form-hint">${bi("點下方快捷按鈕直接匯款，或輸入正負數字進行獎金加碼／更正", "Use quick buttons or enter a positive/negative adjustment")}</span>
      <div class="quick-clam-chips" style="margin-top: 0.25rem;">
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="50">+50</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="100">+100</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="200">+200</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="500">+500</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="-50">-50</button>
      </div>
    </div>
    <div class="admin-review-actions">
      <input type="number" class="reward-input-sm" id="manual-bonus-input" value="200" min="-50000" max="100000" aria-label="${bi("發放或調整英蚌數量", "Clam payout amount")}" />
      <button type="button" class="btn btn-primary btn-sm" id="send-bonus-btn">${bi("立即發放", "Send")}</button>
    </div>
  `;
  const sendPayout = async (amount, triggerBtn) => {
    if (triggerBtn) triggerBtn.disabled = true;
    clearFeedback("admin-review-feedback");
    try {
      const res = await grantManualBonus(stu.uid, amount);
      const targetName = stu.avatar?.name || stu.displayName || stu.email;
      const msg = res.deltaApplied >= 0
        ? bi(`已發放 +${res.deltaApplied} 英蚌給 ${targetName}！（目前餘額 ${res.nextC} 英蚌）`, `Sent +${res.deltaApplied} Clams to ${targetName} (Balance: ${res.nextC} Clams)!`)
        : bi(`已調整 ${res.deltaApplied} 英蚌給 ${targetName}！（目前餘額 ${res.nextC} 英蚌）`, `Adjusted ${res.deltaApplied} Clams for ${targetName} (Balance: ${res.nextC} Clams)!`);
      showFeedback("admin-review-feedback", "success", msg);
      await loadStudentsForReview(stu.uid);
    } catch (err) {
      showFeedback("admin-review-feedback", "error", err?.message || translateAuthError(err));
      if (triggerBtn) triggerBtn.disabled = false;
    }
  };
  bonusRow.querySelector("#send-bonus-btn").addEventListener("click", (e) => {
    const val = bonusRow.querySelector("#manual-bonus-input").value;
    sendPayout(val, e.currentTarget);
  });
  bonusRow.querySelectorAll(".quick-payout-btn").forEach(qBtn => {
    qBtn.addEventListener("click", (e) => {
      sendPayout(Number(qBtn.dataset.amt), e.currentTarget);
    });
  });
  listEl.appendChild(bonusRow);

  const approved = stu.approvedLessons || {};
  const overrides = stu.completionOverrides || {};
  const submitted = stu.submittedLessons || {};
  const metricsMap = stu.submissionMetrics || {};

  // Sort all lessons (and any ready/recorded IELTS tests for admins): pending first, then unapproved, then approved
  const combinedMap = new Map();
  db.lessons.forEach(l => {
    if (l?.Date) combinedMap.set(l.Date, l);
  });
  const isTargetAdminAccount = (stu.email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL || stu.uid === currentUser?.uid;
  if (isTargetAdminAccount && ieltsBank.loaded) {
    ieltsBank.tests
      .filter(t => String(t.Ready).toUpperCase() === "TRUE")
      .forEach(t => {
        if (!combinedMap.has(t.Test_ID)) {
          combinedMap.set(t.Test_ID, {
            Date: t.Test_ID,
            Title: t.Title || t.Test_ID,
            XP: t.XP ?? 60
          });
        }
      });
  }
  [
    ...Object.keys(submitted),
    ...Object.keys(approved),
    ...Object.keys(overrides),
    ...Object.keys(metricsMap)
  ].forEach(key => {
    if (isIeltsLessonId(key) && !combinedMap.has(key)) {
      const meta = findLessonAnyTrack(key);
      combinedMap.set(key, {
        Date: key,
        Title: meta?.Title || key.replace(/^ielts:/i, "IELTS ").toUpperCase(),
        XP: meta?.XP ?? 60
      });
    }
  });

  const activeLessons = Array.from(combinedMap.values())
    .sort((a, b) => {
      const sa = submitted[a.Date] && !approved[a.Date] ? 0 : (approved[a.Date] || overrides[a.Date] ? 2 : 1);
      const sb = submitted[b.Date] && !approved[b.Date] ? 0 : (approved[b.Date] || overrides[b.Date] ? 2 : 1);
      if (sa !== sb) return sa - sb;
      return b.Date.localeCompare(a.Date);
    });

  if (activeLessons.length === 0) {
    const emptyNote = document.createElement("p");
    emptyNote.className = "form-hint";
    emptyNote.textContent = bi("尚無待驗收的近況課程。", "No lessons available for review.");
    listEl.appendChild(emptyNote);
    return;
  }

  activeLessons.forEach(lesson => {
    const isApproved = Boolean(approved[lesson.Date] || overrides[lesson.Date]);
    const isPending = !isApproved && Boolean(submitted[lesson.Date]);
    const statusText = isApproved
      ? bi("✓ 已驗收並撥款", "✓ Approved & Paid")
      : isPending
      ? bi("🔔 學生已提交作品，等待您驗收！", "🔔 Submitted — awaiting your review!")
      : bi("尚未交稿（老師亦可直接現場結算）", "Not submitted yet (can still approve manually)");

    const row = buildAdminSubmissionReviewRow({
      rowKey: `student:${stu.uid}:${lesson.Date}`,
      stu,
      dateStr: lesson.Date,
      headingText: `${lesson.Date} · ${lesson.Title || "Untitled"}`,
      sublineText: statusText,
      isPending,
      isApproved,
      highlightPending: isPending,
      metricRaw: metricsMap[lesson.Date] || null,
      onApprove: async (clamVal) => {
        const res = await approveStudentLesson(stu.uid, lesson.Date, clamVal);
        const xpNote = res.xpGranted > 0 ? bi(`與 +${res.xpGranted} XP`, ` & +${res.xpGranted} XP`) : "";
        showFeedback(
          "admin-review-feedback",
          "success",
          res.alreadyApproved
            ? bi(`${lesson.Date} 已是驗收狀態。`, `${lesson.Date} is already approved.`)
            : bi(
                `已驗收 ${lesson.Date} 並撥款 ${clamVal} 英蚌${xpNote}！`,
                `Approved ${lesson.Date} and awarded ${clamVal} Clams${xpNote}!`
              )
        );
        await loadStudentsForReview(stu.uid);
      },
      onReject: async () => {
        await rejectStudentSubmission(stu.uid, lesson.Date);
        showFeedback("admin-review-feedback", "info", bi(`已退回 ${lesson.Date} 請繪師修改再交。`, `Returned ${lesson.Date} for revision.`));
        await loadStudentsForReview(stu.uid);
      }
    });

    listEl.appendChild(row);
  });
}

openAdminReviewBtn?.addEventListener("click", () => {
  if (!isAdminRole()) return;
  if (!adminReviewDialog.open) {
    adminReviewDialog.showModal();
  }
  if (cachedStudents.length > 0) {
    syncCachedStudentsSnapshot(cachedStudents);
  }
  if (!ieltsBank.loaded) {
    ensureIeltsBankLoaded().then(() => {
      if (adminReviewDialog.open) {
        renderPendingReviewQueue();
        renderSelectedStudentReview();
      }
    });
  }
  loadStudentsForReview();
});
document.getElementById("refresh-review-btn").addEventListener("click", () => {
  if (isAdminRole() && !ieltsBank.loaded) {
    ensureIeltsBankLoaded().then(() => {
      if (adminReviewDialog.open) {
        renderPendingReviewQueue();
        renderSelectedStudentReview();
      }
    });
  }
  loadStudentsForReview(document.getElementById("review-student-select").value);
});
document.getElementById("admin-preview-story-btn")?.addEventListener("click", () => {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  clearFeedback("admin-review-feedback");
  if (!currentUserProfile?.avatar) {
    showFeedback(
      "admin-review-feedback",
      "error",
      bi("請先建立並保存自己的角色外觀，才能在房間內預覽開場故事橫幅。", "Create your character look first to preview the intro banner.")
    );
    return;
  }
  if (adminReviewDialog.open) adminReviewDialog.close();
  enterRoomView(false);
  openIntroStoryBanner({ preview: true, profile: currentUserProfile });
});
document.getElementById("admin-reset-my-story-btn")?.addEventListener("click", async (e) => {
  if (currentRole !== "super_admin" && currentRole !== "admin" || !currentUser) return;
  const btn = e.currentTarget;
  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = bi("重置中…", "Resetting…");
  clearFeedback("admin-review-feedback");
  try {
    setLocalIntroStorySeen(currentUser.uid, false);
    const saved = await persistRoomState({ introStorySeen: false });
    if (!saved) {
      throw new Error(bi("寫入 Firestore 失敗，請確認安全規則已部署。", "Firestore write failed; confirm rules are deployed."));
    }
    showFeedback(
      "admin-review-feedback",
      "success",
      bi(
        "已將目前帳號的開場劇情狀態重置為「尚未觀看」！關閉驗收台回到房間（或重新整理頁面）即可實測首次進房自動出現；看完或按「跳過」後便不會再出現。",
        "Intro story state reset to unseen! Close this dialog (or refresh) in your studio to test the first-entry trigger; once completed or skipped, it won't reappear."
      )
    );
  } catch (err) {
    showFeedback("admin-review-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
});
document.getElementById("admin-reset-all-lessons-btn")?.addEventListener("click", async (e) => {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  const btn = e.currentTarget;
  const confirmMsg = bi(
    "確定要將所有玩家帳號的所有關卡完成狀態、交稿紀錄與單關 XP 領取標記全部歸零嗎？\n（會保留大家現有的英蚌餘額、家具與等級，重新完成每單元可再度獲得英蚌與經驗值）",
    "Reset all completed quests, submissions, and per-quest XP flags for EVERY account?\n(Existing Clams, furniture, and XP levels are kept; quests can be replayed for new rewards.)"
  );
  if (!window.confirm(confirmMsg)) {
    return;
  }
  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = bi("歸零處理中…", "Resetting…");
  clearFeedback("admin-review-feedback");
  try {
    const snap = await getDocs(collection(firestoreDb, "users"));
    const targets = snap.docs.filter(docSnap => {
      const d = docSnap.data() || {};
      return (
        Object.keys(d.approvedLessons || {}).length > 0
        || Object.keys(d.submittedLessons || {}).length > 0
        || Object.keys(d.completionOverrides || {}).length > 0
        || Object.keys(d.xpAwardedLessons || {}).length > 0
        || Object.keys(d.submissionMetrics || {}).length > 0
      );
    });
    for (let i = 0; i < targets.length; i += 400) {
      const batch = writeBatch(firestoreDb);
      targets.slice(i, i + 400).forEach(docSnap => {
        batch.update(docSnap.ref, {
          approvedLessons: {},
          submittedLessons: {},
          completionOverrides: {},
          xpAwardedLessons: {},
          submissionMetrics: {},
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
    if (currentUser && currentUserProfile) {
      userApprovedLessons = {};
      userSubmittedLessons = {};
      userCompletionOverrides = {};
      userXpAwardedLessons = {};
      currentUserProfile.approvedLessons = {};
      currentUserProfile.submittedLessons = {};
      currentUserProfile.completionOverrides = {};
      currentUserProfile.xpAwardedLessons = {};
      currentUserProfile.submissionMetrics = {};
      if (currentScreen === "desktop") renderHome();
      if (currentScreen === "lesson" && activeLessonDate) activeLessonSyncCommission?.();
    }
    await loadStudentsForReview(document.getElementById("review-student-select").value);
    showFeedback(
      "admin-review-feedback",
      "success",
      targets.length > 0
        ? bi(
            `已將 ${targets.length} 位玩家的所有關卡完成狀態歸零！重新完成單元一樣可領取英蚌與 XP。`,
            `Reset quest progress for ${targets.length} player(s)! Quests can now be replayed.`
          )
        : bi("所有玩家的關卡完成狀態原本就都已歸零囉！", "All players' quest progress is already at zero!")
    );
  } catch (err) {
    showFeedback("admin-review-feedback", "error", err?.message || translateAuthError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
});

function refreshAllLocalizedViews() {
  applyStaticDomTranslations();
  syncPasswordToggleButtons();
  const authIsSignup = !document.getElementById("signup-form")?.classList.contains("hidden");
  switchAuthMode(authIsSignup ? "signup" : "signin", { clearMsg: false });

  if (currentUser && currentUserProfile) {
    const displayName = formatDisplayName(currentUser, currentUserProfile);
    updateHeaderAccountUI(currentUser, currentRole, displayName, currentUserProfile.clams ?? STARTER_CLAMS);
    syncXpProgressUI({ allowCelebrate: false });
    syncRoomHUD();
    syncRoomZoomUI();
    updateRentCountdownUI();
    if (introStoryActive) {
      introStorySteps = buildIntroStorySteps(currentUserProfile);
      renderIntroStoryStep();
    }
    if (spectatingStudentUid) {
      populateSpectateStudentSelect(spectatingStudentUid);
    }
    roomScene?.refreshLanguage?.();
    posterCustomizer?.refreshLanguage?.();
    if (roomScene?.editMode) {
      roomScene.notifyEditModeState?.();
    }
    if (currentScreen === "desktop") {
      renderHome();
    } else if (currentScreen === "lesson" && activeLessonDate) {
      renderLesson(activeLessonDate);
    } else if (currentScreen === "onboarding") {
      const currentDraft = readAvatarFormValues();
      populateOnboardingForm(currentDraft, isEditingAvatarFromRoom);
    }
    if (settingsDialog?.open) {
      populateSettingsDialog({ preserveFeedback: true });
    }
    if (shopDialog?.open) {
      renderShopDialog();
    }
    if (financeDialog?.open) {
      renderFinanceDialog();
    }
    if (tvDialog?.open) {
      renderTvChannelList();
    }
    if (adminReviewDialog?.open) {
      syncCachedStudentsSnapshot(cachedStudents, document.getElementById("review-student-select")?.value);
    }
  }
}

document.getElementById("settings-lang-choices")?.addEventListener("change", (e) => {
  const input = e.target;
  if (input?.name !== "uiLanguage") return;
  setUiLanguage(input.value);
  refreshAllLocalizedViews();
  showFeedback(
    "settings-feedback",
    "success",
    bi("介面語言已切換為繁體中文！", "Interface language switched to English!")
  );
});

document.getElementById("auth-lang-toggle-btn")?.addEventListener("click", () => {
  const next = isEn() ? "zh-Hant" : "en";
  setUiLanguage(next);
  refreshAllLocalizedViews();
});
document.getElementById("review-student-select").addEventListener("change", () => {
  clearFeedback("admin-review-feedback");
  renderSelectedStudentReview();
  saveNavState();
});

document.getElementById("admin-visit-room-btn")?.addEventListener("click", () => {
  const targetUid = document.getElementById("review-student-select")?.value;
  if (!targetUid) return;
  spectateStudentRoom(targetUid);
});

document.getElementById("room-visit-others-btn")?.addEventListener("click", () => {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  if (roomScene?.editMode) roomScene.exitFurnitureEditMode({ commit: true });
  const others = cachedStudents.filter(s => s.uid !== currentUser?.uid);
  const target = others[0] || cachedStudents[0];
  if (target) {
    spectateStudentRoom(target.uid);
  } else if (adminReviewDialog) {
    adminReviewDialog.showModal();
    loadStudentsForReview();
  }
});

document.getElementById("spectate-student-select")?.addEventListener("change", (e) => {
  if (e.target.value) spectateStudentRoom(e.target.value, { preserveCamera: true });
});

const cycleSpectateStudent = (dir) => {
  const others = cachedStudents.filter(s => s.uid !== currentUser?.uid);
  const pool = others.length > 0 ? others : cachedStudents;
  if (pool.length === 0) return;
  const curIdx = pool.findIndex(s => s.uid === spectatingStudentUid);
  const nextIdx = curIdx < 0 ? 0 : (curIdx + dir + pool.length) % pool.length;
  spectateStudentRoom(pool[nextIdx].uid, { preserveCamera: true });
};
document.getElementById("spectate-prev-btn")?.addEventListener("click", () => cycleSpectateStudent(-1));
document.getElementById("spectate-next-btn")?.addEventListener("click", () => cycleSpectateStudent(1));
document.getElementById("spectate-exit-btn")?.addEventListener("click", exitSpectateRoom);

document.getElementById("home-btn").addEventListener("click", () => {
  if (currentUser && currentUserProfile?.avatar) {
    enterRoomView(currentScreen === "desktop" || currentScreen === "lesson");
  }
});
document.getElementById("clear-answers-btn")?.addEventListener("click", () => {
  const clearBtn = document.getElementById("clear-answers-btn");
  const confirmRow = document.getElementById("clear-answers-confirm-row");
  if (!clearBtn || !confirmRow) return;
  const arming = confirmRow.classList.contains("hidden");
  confirmRow.classList.toggle("hidden", !arming);
  clearBtn.classList.toggle("is-armed", arming);
  clearBtn.setAttribute("aria-expanded", arming ? "true" : "false");
});
document.getElementById("cancel-clear-answers-btn")?.addEventListener("click", () => {
  resetLessonClearConfirmState();
});
document.getElementById("confirm-clear-answers-btn")?.addEventListener("click", () => {
  clearLessonAnswerRecords(activeLessonDate);
});

document.getElementById("back-btn").addEventListener("click", () => openWorkDesktop());
document.getElementById("back-room-btn").addEventListener("click", () => enterRoomView(true));
document.getElementById("map-back-room-btn").addEventListener("click", () => enterRoomView(true));

onAuthStateChanged(auth, async (user) => {
  const nonce = ++authSessionNonce;
  spectatingStudentUid = null;
  stopRealtimeListeners();
  currentUser = user;
  currentUserProfile = null;
  userCompletionOverrides = {};
  userSubmittedLessons = {};
  userApprovedLessons = {};
  userXpAwardedLessons = {};
  pendingWorkCelebration = null;
  lastKnownXpRankIndex = null;
  hasInitializedXpBaseline = false;
  pendingRankUpToast = null;
  dismissRankUpToast(false);
  currentRole = "student";
  activeWorkTrack = "student";
  stopIeltsTimerIfLoaded();

  if (!user) {
    restoredNavSessionKey = "";
    pendingRestoreSpectateUid = null;
    authResolved = true;
    syncXpProgressUI({ allowCelebrate: false });
    renderAppState();
    return;
  }

  try {
    const [role, profileResult] = await Promise.all([
      resolveUserRole(user),
      loadOrCreateUserProfile(user)
    ]);
    if (nonce !== authSessionNonce) return;
    currentRole = role;
    currentUserProfile = profileResult.data;
    userCompletionOverrides = profileResult.overrides || {};
    userSubmittedLessons = profileResult.submitted || {};
    userApprovedLessons = profileResult.approved || {};
    userXpAwardedLessons = profileResult.xpAwarded || {};
    const displayName = formatDisplayName(user, profileResult.data);
    updateHeaderAccountUI(user, role, displayName, profileResult.data?.clams ?? STARTER_CLAMS);
    startUserRealtimeListener(user.uid, nonce);
    startTransactionsRealtimeListener(user.uid, nonce);
    updateRentCountdownUI();
    maybeCollectMonthlyRent();
    if (role === "super_admin" || role === "admin") {
      startAdminQueueRealtimeListener(nonce);
    }
  } catch (err) {
    if (nonce !== authSessionNonce) return;
    console.error("Failed to load user profile/role:", err);
    updateHeaderAccountUI(user, "student", formatDisplayName(user, null), STARTER_CLAMS);
  } finally {
    if (nonce === authSessionNonce) {
      authResolved = true;
      renderAppState();
      syncRoomHUD();
    }
  }
});

loadSheets();
