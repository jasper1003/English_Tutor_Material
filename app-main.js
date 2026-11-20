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
} from "./room-scene.js?v=20261120g";
import {
  SHOP_CATEGORIES,
  SHOP_CATALOG,
  DEFAULT_WALL_COLOR,
  DEFAULT_BED_SHEET,
  DEFAULT_RUG_STYLE,
  applyRemoteShopConfig,
  getShopItem,
  getMissingShopPrerequisites,
  normalizeOwnedItems
} from "./shop-catalog.js?v=20261120e";
import {
  DEFAULT_TV_CHANNEL_VIDEOS,
  XP_RANK_LADDER,
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
  translateAuthError
} from "./app-helpers.js?v=20261119z";
import { createPosterCustomizer } from "./poster-editor.js?v=20261119y";
import { renderInteractiveReadingPassage, clearReadingScaffold } from "./reading-scaffold.js?v=20261120d";

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

async function fetchRawSheetTab(sheetName, extraParams = "") {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json${extraParams}&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法讀取工作表：${sheetName}`);
  const text = await res.text();
  const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const data = JSON.parse(jsonStr);

  if (data.status === "error") {
    throw new Error(`工作表 ${sheetName} 讀取錯誤：${data.errors.map(e => e.message).join(", ")}`);
  }

  const cols = data.table.cols.map(c => (c.label || "").trim());
  const rows = data.table.rows || [];

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
  const rows = await fetchRawSheetTab(sheetName);
  return rows.filter(item => item.Date);
}

async function fetchOptionalSheetTab(sheetName) {
  try {
    return await fetchRawSheetTab(sheetName, "&headers=1");
  } catch {
    return [];
  }
}

const DEFAULT_COMPLETED_BEFORE = "2026-10-28";
const LOCKED_NODES_AHEAD = 4;
const WAVE_OFFSETS_PX = [0, -76, -108, -76, 0, 76, 108, 76];
let questResizeObserver = null;

function isLessonCompleted(dateStr) {
  if (Object.prototype.hasOwnProperty.call(userApprovedLessons, dateStr)) {
    if (userApprovedLessons[dateStr]) return true;
  }
  if (Object.prototype.hasOwnProperty.call(userCompletionOverrides, dateStr)) {
    return Boolean(userCompletionOverrides[dateStr]);
  }
  // 歷史歸檔單元（早於 2026-10-28）預設自動標記為已驗收完成
  return dateStr < DEFAULT_COMPLETED_BEFORE;
}

function isLessonSubmitted(dateStr) {
  if (isLessonCompleted(dateStr)) return false;
  return Boolean(userSubmittedLessons[dateStr]);
}

function hasEarnedLessonXp(dateStr) {
  return Boolean(userXpAwardedLessons[dateStr]);
}

function getCompletedLessons() {
  const completed = new Set();
  db.lessons.forEach(l => {
    if (isLessonCompleted(l.Date)) {
      completed.add(l.Date);
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
  const prevLabel = prevProgress ? `${prevProgress.title} → ` : "";
  bodyEl.innerHTML = `
    <div><strong>${escapeHtml(nextProgress.emblem)} 聲望晉升！${escapeHtml(prevLabel)}Lv.${nextProgress.level}【${escapeHtml(nextProgress.title)}】</strong></div>
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

  const spokenText = `繪師聲望升級，${nextProgress.level}級稱號，${nextProgress.title}。${nextProgress.subtitle}`;
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

function syncXpProgressUI({ allowCelebrate = false } = {}) {
  initRankUpToastEvents();
  const totalXp = getTotalEarnedXp();
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
  if (roomNumEl) roomNumEl.textContent = `${progress.xpIntoLevel} / ${progress.xpPerLevel} XP`;
  if (roomSubEl) roomSubEl.textContent = progress.subtitle;
  if (roomFillEl) roomFillEl.style.width = `${progress.progressPct}%`;
  if (roomPillEl) {
    roomPillEl.title = `累積 ${progress.totalXp} XP · ${progress.subtitle}（再 ${progress.xpToNextLevel} XP 升至 Lv.${progress.level + 1} ${progress.nextTitle}）`;
  }

  const bannerEl = document.getElementById("home-xp-banner");
  if (bannerEl) {
    const nextHint = progress.isMaxNamedRank && progress.level >= XP_RANK_LADDER.length
      ? `累積總經驗：${progress.totalXp} XP · 已修至最高稱號，仍可繼續突破 Lv.${progress.level + 1}！`
      : `再獲 ${progress.xpToNextLevel} XP 升級 → Lv.${progress.level + 1}【${escapeHtml(progress.nextTitle)}】`;
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
          <span>繪師聲望條（總計 ${progress.totalXp} XP）</span>
          <span>${progress.xpIntoLevel} / ${progress.xpPerLevel} XP</span>
        </div>
        <div class="home-xp-bar-track" role="progressbar" aria-label="繪師聲望升級進度" aria-valuemin="0" aria-valuemax="${progress.xpPerLevel}" aria-valuenow="${progress.xpIntoLevel}">
          <div class="home-xp-bar-fill" style="width: ${progress.progressPct}%;"></div>
        </div>
        <div class="form-hint" style="margin: 0;">${nextHint}</div>
      </div>
    `;
  }

  if (currentUser && currentUserProfile && authResolved) {
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

async function setLessonSubmitted(dateStr, nextSubmitted) {
  if (!currentUser || isLessonCompleted(dateStr)) return { submitted: false, xpGranted: 0 };
  const targetSubmitted = Boolean(nextSubmitted);
  const userRef = doc(firestoreDb, "users", currentUser.uid);

  const result = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? (snap.data() || {}) : {};
    const submittedMap = sanitizeBoolMap(data.submittedLessons);
    const xpAwardedMap = sanitizeBoolMap(data.xpAwardedLessons);
    submittedMap[dateStr] = targetSubmitted;

    const patch = {
      submittedLessons: submittedMap,
      updatedAt: serverTimestamp()
    };

    let xpGranted = 0;
    let nextXp = Math.max(0, Math.trunc(Number(data.xp ?? currentUserProfile?.xp ?? 0)));
    if (targetSubmitted && !xpAwardedMap[dateStr]) {
      const lessonMeta = db.lessons.find(l => l.Date === dateStr);
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
    return { submitted: targetSubmitted, submittedMap, xpAwardedMap, nextXp, xpGranted };
  });

  userSubmittedLessons = result.submittedMap;
  userXpAwardedLessons = result.xpAwardedMap;
  if (currentUserProfile) {
    currentUserProfile.submittedLessons = result.submittedMap;
    currentUserProfile.xpAwardedLessons = result.xpAwardedMap;
    currentUserProfile.xp = result.nextXp;
  }
  if (result.xpGranted > 0) {
    syncXpProgressUI({ allowCelebrate: true });
  }
  return result;
}

function getRoleLabel(role) {
  if (role === "super_admin") return "超級管理員";
  if (role === "admin") return "管理員";
  return "學生";
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
  return email ? email.split("@")[0] : "使用者";
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
    return compact ? "已到期" : `已到期（應繳 ${MONTHLY_RENT_CLAMS} 英蚌）`;
  }
  const days = Math.max(1, Math.ceil(msRemaining / 86400000));
  return compact ? `剩 ${days} 天` : `${days} 天`;
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
      wallColor: DEFAULT_WALL_COLOR
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
  nameEl.textContent = displayName || user.email || "帳號";
  clamsEl.textContent = role === "super_admin"
    ? "∞"
    : String(Math.max(0, Math.trunc(Number(clams ?? STARTER_CLAMS))));

  const isTeacher = role === "super_admin" || role === "admin";
  if (walletChip) {
    walletChip.classList.toggle("is-admin-action", isTeacher);
    walletChip.title = isTeacher ? "點擊開啟案主驗收與發款台" : "目前持有的英蚌餘額";
    walletChip.setAttribute("aria-label", isTeacher ? "開啟案主驗收與發款台" : "目前持有的英蚌餘額");
  }
  accountEl.classList.remove("hidden");
}

function hideAllPrimaryScreens() {
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
  const currentValues = readAvatarFormValues();
  if (!avatarPreviewScene) {
    avatarPreviewScene = new AvatarPreviewScene(stageEl, currentValues);
  } else {
    avatarPreviewScene.updateAvatar(currentValues);
  }
  sync3dSceneLifecycle();
}

function syncRoomHUD() {
  syncXpProgressUI({ allowCelebrate: false });
}

async function persistRoomState(patch) {
  if (!currentUser || !currentUserProfile) return;
  const nextRoomState = {
    ...(currentUserProfile.roomState || {
      cameraQuarter: 0,
      deskLampOn: true,
      bedLampOn: false,
      wallColor: "#f3eadc"
    }),
    ...patch
  };
  currentUserProfile.roomState = nextRoomState;
  try {
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
      roomState: nextRoomState,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to save roomState:", err);
  }
}

function enterRoomView(fromWorkDesktop = false) {
  if (!currentUser || !currentUserProfile?.avatar) {
    if (currentUser) showOnboardingScreen(false);
    return;
  }

  currentScreen = "room";
  activeLessonDate = null;
  activeLessonSyncCommission = null;
  hideAllPrimaryScreens();
  const roomView = document.getElementById("room-view");
  roomView.classList.remove("hidden");

  const wrap = document.getElementById("room-canvas-wrap");
  const rs = currentUserProfile.roomState || {};
  const owned = normalizeOwnedItems(currentUserProfile.ownedItems);

  if (!roomScene) {
    roomScene = new FreelancerRoomScene(wrap, {
      avatar: currentUserProfile.avatar,
      cameraQuarter: Number.isInteger(rs.cameraQuarter) ? rs.cameraQuarter : 0,
      deskLampOn: typeof rs.deskLampOn === "boolean" ? rs.deskLampOn : true,
      bedLampOn: typeof rs.bedLampOn === "boolean" ? rs.bedLampOn : false,
      vinylOn: typeof rs.vinylOn === "boolean" ? rs.vinylOn : false,
      wallColor: rs.wallColor || DEFAULT_WALL_COLOR,
      bedSheet: rs.bedSheet || DEFAULT_BED_SHEET,
      rugStyle: rs.rugStyle || DEFAULT_RUG_STYLE,
      posterImage: rs.posterImage || "",
      ownedItems: owned,
      customThoughts: pendingThoughtRows,
      onEnterWork: () => {
        openWorkDesktop();
      },
      onLampToggle: (isOn) => {
        persistRoomState({ deskLampOn: isOn });
      },
      onBedLampToggle: (isOn) => {
        persistRoomState({ bedLampOn: isOn });
      },
      onVinylToggle: (isOn) => {
        persistRoomState({ vinylOn: isOn });
      },
      onOpenTv: () => {
        openTvPlayer();
      },
      onOpenPoster: () => {
        openPosterCustomizer();
      },
      onTimeUpdate: ({ clockText }) => {
        document.getElementById("room-clock-pill").textContent = `🕒 ${clockText}`;
      }
    });
  } else {
    roomScene.updateAvatarConfig(currentUserProfile.avatar);
    roomScene.setDeskLamp(typeof rs.deskLampOn === "boolean" ? rs.deskLampOn : true);
    roomScene.setBedLamp(typeof rs.bedLampOn === "boolean" ? rs.bedLampOn : false);
    roomScene.setVinylOn(typeof rs.vinylOn === "boolean" ? rs.vinylOn : false);
    roomScene.setWallColor(rs.wallColor || DEFAULT_WALL_COLOR);
    roomScene.setBedSheet(rs.bedSheet || DEFAULT_BED_SHEET);
    roomScene.setRugStyle(rs.rugStyle || DEFAULT_RUG_STYLE);
    roomScene.setPosterImage(rs.posterImage || "");
    roomScene.applyOwnedItems(owned);
    if (pendingThoughtRows) {
      roomScene.applyCustomThoughts(pendingThoughtRows);
    }
    if (Number.isInteger(rs.cameraQuarter)) roomScene.setQuarter(rs.cameraQuarter);
    const celebration = fromWorkDesktop ? (pendingWorkCelebration || "none") : "none";
    if (fromWorkDesktop) {
      pendingWorkCelebration = null;
      roomScene.returnFromWork(celebration);
    }
  }

  sync3dSceneLifecycle();
  syncRoomHUD();
  updateRentCountdownUI();
}

function openWorkDesktop() {
  if (!currentUser || !sheetsLoaded) return;
  currentScreen = "desktop";
  activeLessonDate = null;
  activeLessonSyncCommission = null;
  hideAllPrimaryScreens();
  renderHome();
}

async function openLesson(dateStr) {
  if (!currentUser || !sheetsLoaded) return;
  if (currentScreen !== "desktop" && currentScreen !== "lesson") return;
  const lesson = db.lessons.find(l => l.Date === dateStr);
  if (!lesson) return openWorkDesktop();
  if (!sheetsDetailsLoaded && sheetsStage2Promise) {
    try {
      await sheetsStage2Promise;
    } catch (err) {
      alert(`無法載入單元單字與測驗資料：${err?.message || err}`);
      return;
    }
  }
  currentScreen = "lesson";
  activeLessonDate = dateStr;
  renderLesson(dateStr);
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    errorEl.textContent = `載入失敗：${sheetsError.message}。請確認 Google 試算表已設為「知道連結的使用者皆可檢視」，且分頁名稱為 Lessons、Vocab、Quiz。`;
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
    enterRoomView(false);
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
  if (homeRewardHint) {
    homeRewardHint.textContent = `完成任務即可自動獲得對應 XP；送交甲方老師驗收通過後，每單元再領 +${UNIT_REWARD_CLAMS} 英蚌報酬`;
  }
  syncXpProgressUI({ allowCelebrate: false });
}

function applyRemoteTvVideos(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const list = [];
  for (const row of rows) {
    const id = String(row?.id || "").trim();
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
  }
}

const SHEETS_CACHE_KEY = `sheets_cache_v1:${SPREADSHEET_ID}`;
let latestSheetSnapshot = {
  lessons: [],
  vocab: [],
  quiz: [],
  shopRows: [],
  settingRows: [],
  tvRows: [],
  thoughtRows: []
};

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
  if (cached) {
    applySheetCore(cached.lessons, cached.shopRows || [], cached.settingRows || []);
    applySheetDetails(cached.vocab, cached.quiz, cached.tvRows || [], cached.thoughtRows || []);
    sheetsLoaded = true;
    sheetsDetailsLoaded = true;
    sheetsError = null;
    renderAppState();
  }

  const stage1Promise = Promise.all([
    fetchSheetTab("Lessons"),
    fetchOptionalSheetTab("Shop"),
    fetchOptionalSheetTab("Settings")
  ]);
  const stage2Promise = Promise.all([
    fetchSheetTab("Vocab"),
    fetchSheetTab("Quiz"),
    fetchOptionalSheetTab("TV_Videos"),
    fetchOptionalSheetTab("Room_Thoughts")
  ]);
  sheetsStage2Promise = stage2Promise;

  try {
    const [lessons, shopRows, settingRows] = await stage1Promise;
    const wasLoaded = sheetsLoaded;
    applySheetCore(lessons, shopRows, settingRows);
    sheetsLoaded = true;
    sheetsError = null;
    if (!wasLoaded) {
      renderAppState();
    } else {
      refreshLiveSheetViews();
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
    applySheetDetails(vocab, quiz, tvRows, thoughtRows);
    sheetsDetailsLoaded = true;
    writeSheetsCache(latestSheetSnapshot);
    if (currentScreen === "desktop") {
      renderHome();
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

function renderHome() {
  document.getElementById("lesson-view").classList.add("hidden");
  document.getElementById("lesson-actions").style.display = "none";
  const homeView = document.getElementById("home-view");
  const mapEl = document.getElementById("quest-map");
  mapEl.innerHTML = "";

  const completedSet = getCompletedLessons();
  const completedRealCount = db.lessons.filter(l => completedSet.has(l.Date)).length;
  document.getElementById("map-completed-count").textContent = `已驗收 ${completedRealCount} 關`;
  syncXpProgressUI({ allowCelebrate: false });

  if (db.lessons.length === 0) {
    mapEl.innerHTML = `<p style="color: var(--muted); text-align: center;">目前試算表中尚無課程資料。</p>`;
    homeView.classList.remove("hidden");
    return;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("map-path-svg");
  svg.setAttribute("aria-hidden", "true");
  mapEl.appendChild(svg);

  const firstUncompletedIndex = db.lessons.findIndex(l => !completedSet.has(l.Date));
  let currentProgressStep = null;
  let lastUnlockedStep = null;

  db.lessons.forEach((lesson, idx) => {
    const vocabCount = db.vocab.filter(v => v.Date === lesson.Date).length;
    const isCompleted = completedSet.has(lesson.Date);
    const isSubmitted = isLessonSubmitted(lesson.Date);
    const isCurrent = idx === firstUncompletedIndex;
    const unitLabel = `UNIT ${String(idx + 1).padStart(2, "0")}`;
    const offsetX = WAVE_OFFSETS_PX[idx % WAVE_OFFSETS_PX.length];

    const step = document.createElement("div");
    step.className = `quest-step${isCompleted ? " is-completed" : isSubmitted ? " is-submitted" : ""}`;
    step.style.setProperty("--step-x", `${offsetX}px`);
    if (isCurrent) currentProgressStep = step;
    lastUnlockedStep = step;

    let circleIcon = String(idx + 1).padStart(2, "0");
    if (isCompleted) {
      circleIcon = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (isSubmitted) {
      circleIcon = "⏳";
    }

    const circleBtn = document.createElement("button");
    circleBtn.type = "button";
    circleBtn.className = `quest-node-circle${isCurrent ? " is-current" : ""}`;
    circleBtn.setAttribute("aria-label", `${unitLabel} ${lesson.Title || ""}`);
    circleBtn.innerHTML = circleIcon;
    circleBtn.addEventListener("click", () => openLesson(lesson.Date));

    const statusSuffix = isCompleted
      ? " · 已驗收撥款"
      : isSubmitted
      ? " · 待案主驗收"
      : "";

    const cardBtn = document.createElement("button");
    cardBtn.type = "button";
    cardBtn.className = "quest-node-card";
    cardBtn.style.textAlign = "center";
    const lessonXp = getLessonXp(lesson);
    const xpAlreadyClaimed = hasEarnedLessonXp(lesson.Date);
    const xpBadgeHtml = isCompleted
      ? ""
      : xpAlreadyClaimed
      ? ` · <span class="quest-xp-pill">XP 已領 ✓</span>`
      : ` · <span class="quest-xp-pill">+${lessonXp} XP</span>`;
    cardBtn.innerHTML = `
      <div class="quest-node-top">
        <span class="quest-unit-tag">${unitLabel}${statusSuffix}</span>
        <span class="quest-node-date">${escapeHtml(lesson.Date)}</span>
      </div>
      <div class="quest-node-title">${escapeHtml(lesson.Title || "Untitled Lesson")}</div>
      ${lesson.Grammar_Focus ? `<div class="quest-node-grammar">${escapeHtml(lesson.Grammar_Focus)}</div>` : ""}
      <div class="quest-node-meta">
        單字：${vocabCount} 個${xpBadgeHtml}${isCompleted ? "" : ` · <span class="quest-reward-pill">報酬 +${UNIT_REWARD_CLAMS} 英蚌</span>`}
      </div>
    `;
    cardBtn.addEventListener("click", () => openLesson(lesson.Date));

    step.appendChild(circleBtn);
    step.appendChild(cardBtn);
    mapEl.appendChild(step);
  });

  // 延伸未開放的鎖定關卡
  const totalVisibleSteps = Math.max(db.lessons.length + LOCKED_NODES_AHEAD, 6);
  const lockedCount = totalVisibleSteps - db.lessons.length;

  for (let j = 0; j < lockedCount; j++) {
    const idx = db.lessons.length + j;
    const unitLabel = `UNIT ${String(idx + 1).padStart(2, "0")}`;
    const offsetX = WAVE_OFFSETS_PX[idx % WAVE_OFFSETS_PX.length];
    const fadeOpacity = Math.max(0.45, 0.85 - j * 0.12);

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
        <div class="quest-locked-label">${unitLabel} · 尚未發案解鎖</div>
      </div>
    `;
    mapEl.appendChild(step);
  }

  homeView.classList.remove("hidden");
  requestAnimationFrame(() => {
    drawQuestPath();
    const targetStep = currentProgressStep || lastUnlockedStep;
    if (targetStep) {
      targetStep.scrollIntoView({ behavior: "auto", block: "center" });
    }
  });

  if (!questResizeObserver && "ResizeObserver" in window) {
    questResizeObserver = new ResizeObserver(() => drawQuestPath());
    questResizeObserver.observe(mapEl);
  }
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

function renderLesson(dateStr) {
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
      xpBadgeEl.textContent = "✓ 已驗收";
    } else if (hasEarnedLessonXp(dateStr)) {
      xpBadgeEl.textContent = "⚡ XP 已領";
    } else {
      xpBadgeEl.textContent = `⚡ +${lessonXp} XP`;
    }
  };
  syncLessonXpBadge();

  const lessonQuiz = db.quiz.filter(q => q.Date === dateStr);
  document.getElementById("reading-title").textContent = lesson.Reading_Title || "Reading Passage";
  renderInteractiveReadingPassage({
    bodyEl: document.getElementById("reading-body"),
    toolsEl: document.getElementById("reading-tools-container"),
    popoverEl: document.getElementById("reading-vocab-popover"),
    passageText: lesson.Reading_Passage || "",
    vocabRows: lessonVocab,
    uid: currentUser?.uid || "guest",
    dateStr
  });

  const quizContainer = document.getElementById("quiz-container");
  const progressFill = document.getElementById("quiz-progress-fill");
  quizContainer.innerHTML = "";
  if (progressFill) {
    progressFill.style.width = "0%";
    const track = progressFill.parentElement;
    if (track) track.setAttribute("aria-valuenow", "0");
  }

  lessonQuiz.forEach((q, idx) => {
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
      ].filter(o => o.text && o.text !== "-");

      opts.forEach(o => {
        optionsHtml += `
          <label class="option-label" data-value="${o.key}">
            <input type="radio" name="q_${idx}" value="${o.key}" />
            <span><strong>(${o.key})</strong> ${escapeHtml(o.text)}</span>
          </label>
        `;
      });
    }

    qCard.innerHTML = `
      <div class="question-type-badge">Question ${idx + 1} · ${typeLabel}</div>
      <div class="question-text">${escapeHtml(q.Question)}</div>
      <div class="options-list">${optionsHtml}</div>
      <div id="feedback_pill_${idx}" style="margin-top: 10px;"></div>
      <details class="explanation-details" id="exp_${idx}">
        <summary class="explanation-summary">▸ 展開解析提示與證據（點擊查看）</summary>
        <div class="explanation-content">
          <div><strong>正確答案：</strong>${escapeHtml(q.Answer)}</div>
          <div style="margin-top: 4px;">${escapeHtml(q.Explanation || "")}</div>
        </div>
      </details>
    `;

    // 即時回饋：點選選項瞬間判定與微多巴胺慶祝
    const radios = qCard.querySelectorAll(`input[name="q_${idx}"]`);
    radios.forEach(radio => {
      radio.addEventListener("change", (e) => {
        saveQuizAnswer(dateStr, idx, e.target.value);
        handleInstantQuizFeedback(idx, q, e.target.value, qCard, lessonQuiz);
      });
    });

    quizContainer.appendChild(qCard);
  });

  // Hydrate previously selected quiz answers without triggering confetti bursts
  const savedAnswers = loadSavedQuizAnswers(dateStr);
  lessonQuiz.forEach((q, idx) => {
    const savedVal = savedAnswers[String(idx)];
    if (!savedVal) return;
    const qCard = quizContainer.querySelector(`.question-card[data-index="${idx}"]`);
    const radio = qCard?.querySelector(`input[name="q_${idx}"][value="${CSS.escape(savedVal)}"]`);
    if (radio) {
      radio.checked = true;
      handleInstantQuizFeedback(idx, q, savedVal, qCard, lessonQuiz, { silent: true });
    }
  });

  document.getElementById("reset-quiz-btn").onclick = () => {
    clearSavedQuizAnswers(dateStr);
    renderLesson(dateStr);
  };

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
      statusEl.textContent = "✓ 甲方案主已驗收通過（已完成本單元任務）";
      statusEl.classList.add("is-completed");
      submitBtn.textContent = "已驗收完成 ✓";
      submitBtn.classList.add("is-completed");
      submitBtn.disabled = true;
    } else if (submitted) {
      statusEl.textContent = `⏳ 已交稿！${xpClaimedHere ? "經驗值 XP 已自動入帳，" : ""}請等待甲方老師驗收後發放 +${UNIT_REWARD_CLAMS} 英蚌`;
      statusEl.classList.remove("is-completed");
      submitBtn.textContent = "待案主驗收中（點此可收回修改）";
      submitBtn.classList.add("is-submitted");
      submitBtn.disabled = false;
    } else {
      statusEl.textContent = `完成單字與閱讀練習後按下完成任務，系統將自動發放 ${xpClaimedHere ? "（XP 已領）" : `+${unitXp} XP 並`}申請 +${UNIT_REWARD_CLAMS} 英蚌`;
      statusEl.classList.remove("is-completed");
      submitBtn.textContent = "完成任務";
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
      ? `<span class="feedback-pill correct">✓ 答對了！</span>`
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

function switchAuthMode(mode) {
  const isSignin = mode === "signin";
  document.getElementById("tab-signin").setAttribute("aria-pressed", String(isSignin));
  document.getElementById("tab-signup").setAttribute("aria-pressed", String(!isSignin));
  document.getElementById("signin-form").classList.toggle("hidden", !isSignin);
  document.getElementById("signup-form").classList.toggle("hidden", isSignin);
  document.getElementById("auth-heading").textContent = isSignin ? "登入學習帳號" : "建立學習帳號";
  clearFeedback("auth-feedback");
}

document.getElementById("tab-signin").addEventListener("click", () => switchAuthMode("signin"));
document.getElementById("tab-signup").addEventListener("click", () => switchAuthMode("signup"));

document.querySelectorAll(".btn-toggle-pw").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const showing = target.type === "text";
    target.type = showing ? "password" : "text";
    btn.setAttribute("aria-pressed", String(!showing));
    btn.textContent = showing ? "顯示" : "隱藏";
    btn.setAttribute("aria-label", showing ? "顯示密碼" : "隱藏密碼");
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
    showFeedback("auth-feedback", "info", "請先在上方「電子郵件」欄位輸入您的信箱，再點擊忘記密碼。");
    emailInput.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showFeedback("auth-feedback", "success", `已寄出重設密碼信至 ${email}，請查收信件（若未看到可檢查垃圾信件匣）。`);
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
    badge.textContent = "已完成驗證";
    container.appendChild(badge);
    return;
  }

  const warnText = document.createElement("span");
  warnText.textContent = "尚未驗證（驗證後才可啟用管理員授權）";
  warnText.className = "verify-warn-text";
  container.appendChild(warnText);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "btn btn-sm";
  sendBtn.textContent = "寄送驗證信";
  sendBtn.addEventListener("click", async () => {
    sendBtn.disabled = true;
    try {
      await sendEmailVerification(currentUser);
      showFeedback("settings-feedback", "success", `已寄出驗證信至 ${currentUser.email}，點擊信中連結後請按「重新檢查」。`);
    } catch (err) {
      showFeedback("settings-feedback", "error", translateAuthError(err));
    } finally {
      sendBtn.disabled = false;
    }
  });

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "btn btn-sm";
  refreshBtn.textContent = "重新檢查";
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    try {
      await currentUser.reload();
      currentRole = await resolveUserRole(currentUser);
      await currentUser.getIdToken(true);
      updateHeaderAccountUI(currentUser, currentRole, document.getElementById("settings-display-name").value.trim());
      await populateSettingsDialog();
      showFeedback("settings-feedback", "info", currentUser.emailVerified ? "信箱已完成驗證！" : "尚未偵測到驗證完成，請確認已點擊信中驗證連結。");
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
  listEl.innerHTML = `<li class="form-hint">正在載入管理員清單...</li>`;
  try {
    const snap = await getDocs(query(collection(firestoreDb, "admins"), orderBy("email")));
    listEl.innerHTML = "";
    if (snap.empty) {
      listEl.innerHTML = `<li class="form-hint">目前尚未新增其他管理員。</li>`;
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
      removeBtn.textContent = "移除";
      removeBtn.addEventListener("click", async () => {
        removeBtn.disabled = true;
        try {
          await deleteDoc(doc(firestoreDb, "admins", emailLower));
          showFeedback("settings-feedback", "success", `已移除管理員：${emailLower}`);
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

async function populateSettingsDialog() {
  if (!currentUser) return;
  clearFeedback("settings-feedback");

  document.getElementById("settings-email").textContent = currentUser.email || "";
  const roleBadge = document.getElementById("settings-role-badge");
  roleBadge.textContent = getRoleLabel(currentRole);
  roleBadge.className = getRoleBadgeClass(currentRole);

  const providerLabels = [];
  if (currentUser.providerData.some(p => p.providerId === "google.com")) providerLabels.push("Google 登入");
  if (hasPasswordProvider(currentUser)) providerLabels.push("電子郵件密碼");
  document.getElementById("settings-providers").textContent = providerLabels.join("、") || "電子郵件";

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
    pwDesc.textContent = "請輸入目前的密碼與新密碼以完成變更。";
    savePwBtn.textContent = "更新密碼";
  } else {
    pwDesc.textContent = "此帳號目前僅透過 Google 登入，可直接設定一組本機登入密碼。";
    savePwBtn.textContent = "設定帳號密碼";
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
    avatarSummaryEl.textContent = `目前角色：「${av.name}」 · ${buildObj?.label || av.build} · ${hairObj?.label || av.hairStyle}`;
  } else {
    avatarSummaryEl.textContent = "尚未建立接案角色造型";
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
const dialogOpenObserver = new MutationObserver(sync3dSceneLifecycle);
document.querySelectorAll("dialog").forEach(dlg => {
  dialogOpenObserver.observe(dlg, { attributes: true, attributeFilter: ["open"] });
});

openSettingsBtn.addEventListener("click", () => {
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
    showFeedback("settings-feedback", "success", "已更新顯示名稱！");
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
      showFeedback("settings-feedback", "success", "密碼已更新！下次可使用新密碼登入。");
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
      showFeedback("settings-feedback", "success", "已為帳號設定密碼！現在同時支援 Google 與電子郵件密碼登入。");
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
    showFeedback("settings-feedback", "success", `已寄送密碼重設信至 ${currentUser.email}。`);
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
    showFeedback("settings-feedback", "info", "此信箱已為系統超級管理員，無需另外新增。");
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
    showFeedback("settings-feedback", "success", `已將 ${emailLower} 加入管理員名單。`);
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
      isDark ? "深色背景已開啟，點擊切換為淺色背景" : "淺色背景已開啟，點擊切換為深色背景"
    );
  }

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
      textSpan.textContent = item.label;
      label.appendChild(textSpan);
    } else {
      const titleRow = document.createElement("span");
      titleRow.className = "choice-card-title";
      titleRow.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="choice-check" aria-hidden="true">✓</span>`;
      label.appendChild(titleRow);
      if (item.hint) {
        const sub = document.createElement("span");
        sub.className = "choice-card-sub";
        sub.textContent = item.hint;
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
  document.getElementById("avatar-preview-name").textContent = cfg.name || "接案繪師";
  if (avatarPreviewScene) {
    avatarPreviewScene.updateAvatar(cfg);
  }
}

function populateOnboardingForm(existingAvatar, isEditing = false) {
  const cfg = { ...DEFAULT_AVATAR, ...(existingAvatar || {}) };
  const nameInput = document.getElementById("avatar-name-input");
  const countEl = document.getElementById("avatar-name-count");
  const cancelBtn = document.getElementById("cancel-avatar-edit-btn");
  const saveBtn = document.getElementById("save-avatar-btn");
  const titleEl = document.getElementById("onboarding-title");

  clearFeedback("onboarding-feedback");
  nameInput.value = cfg.name || "";
  countEl.textContent = `${[...nameInput.value.trim()].length} / 8 字`;
  document.getElementById("avatar-preview-name").textContent = cfg.name || "接案繪師";
  cancelBtn.classList.toggle("hidden", !isEditing);
  titleEl.textContent = isEditing ? "調整角色造型與名字" : "建立你的接案繪師角色";
  saveBtn.textContent = isEditing ? "儲存變更並回到房間" : "入住單人租屋處";

  renderOptionChoices("avatar-build-choices", BODY_BUILDS, "avatarBuild", cfg.build, false);
  renderOptionChoices("avatar-skin-choices", SKIN_TONES, "avatarSkin", cfg.skinTone, true);
  renderOptionChoices("avatar-hairstyle-choices", HAIR_STYLES, "avatarHairStyle", cfg.hairStyle, false);
  renderOptionChoices("avatar-haircolor-choices", HAIR_COLORS, "avatarHairColor", cfg.hairColor, true);
  renderOptionChoices("avatar-outfit-choices", OUTFIT_COLORS, "avatarOutfit", cfg.outfitColor, true);
}

document.getElementById("avatar-name-input").addEventListener("input", (e) => {
  const input = e.currentTarget;
  const trimmed = input.value.trim();
  const charCount = [...trimmed].length;
  document.getElementById("avatar-name-count").textContent = `${charCount} / 8 字`;
  document.getElementById("avatar-preview-name").textContent = trimmed || "接案繪師";
  if (charCount > 8) {
    input.setCustomValidity("角色名稱最多只能輸入 8 個字元。");
  } else if (charCount === 0) {
    input.setCustomValidity("請輸入角色名稱。");
  } else {
    input.setCustomValidity("");
  }
});

document.getElementById("avatar-form").addEventListener("change", (e) => {
  if (e.target.matches('input[type="radio"]')) {
    syncLiveAvatarPreview();
  }
});

document.getElementById("preview-rot-left").addEventListener("click", () => {
  avatarPreviewScene?.rotateBy(-Math.PI / 4);
});

document.getElementById("preview-rot-right").addEventListener("click", () => {
  avatarPreviewScene?.rotateBy(Math.PI / 4);
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
    nameInput.setCustomValidity("角色名稱需為 1 到 8 個字元（中文／英文皆以字數計算）。");
    nameInput.reportValidity();
    return;
  }
  nameInput.setCustomValidity("");

  const avatarPayload = readAvatarFormValues();

  const btn = document.getElementById("save-avatar-btn");
  btn.disabled = true;
  try {
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
      avatar: avatarPayload,
      updatedAt: serverTimestamp()
    });
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
  return "";
}

async function equipShopTextile(textileKind, nextId, triggerBtn = null) {
  if (!currentUser || !currentUserProfile || shopPurchaseBusy) return;
  if (textileKind !== "bedSheet" && textileKind !== "rugStyle") return;
  clearFeedback("shop-feedback");
  shopPurchaseBusy = true;
  const prevBtnText = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "切換中...";
  }
  try {
    const nextRoomState = {
      ...(currentUserProfile.roomState || {
        cameraQuarter: 0,
        deskLampOn: true,
        bedLampOn: false,
        wallColor: DEFAULT_WALL_COLOR
      }),
      [textileKind]: nextId
    };
    await updateDoc(doc(firestoreDb, "users", currentUser.uid), {
      roomState: nextRoomState,
      updatedAt: serverTimestamp()
    });
    currentUserProfile.roomState = nextRoomState;
    if (textileKind === "bedSheet") {
      roomScene?.setBedSheet(nextId);
    } else {
      roomScene?.setRugStyle(nextId);
    }
    const label = nextId === DEFAULT_BED_SHEET
      ? "經典海鹽藍床組"
      : nextId === DEFAULT_RUG_STYLE
        ? "奶油燕麥原味地毯"
        : (getShopItem(nextId)?.name || nextId);
    showFeedback("shop-feedback", "success", `已免費切換為「${label}」！`);
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

function renderShopDialog() {
  const balanceEl = document.getElementById("shop-clams-balance");
  const tabsEl = document.getElementById("shop-tabs");
  const textileBarEl = document.getElementById("shop-textile-bar");
  const gridEl = document.getElementById("shop-grid");
  const dialogBodyEl = gridEl.closest(".dialog-body");
  const prevScrollTop = dialogBodyEl ? dialogBodyEl.scrollTop : 0;
  const isSuperAdmin = currentRole === "super_admin";
  const clams = Math.max(0, Math.trunc(Number(currentUserProfile?.clams ?? STARTER_CLAMS)));
  const owned = normalizeOwnedItems(currentUserProfile?.ownedItems);
  const activeWallColor = (currentUserProfile?.roomState?.wallColor || DEFAULT_WALL_COLOR).toLowerCase();
  const activeBedSheet = currentUserProfile?.roomState?.bedSheet || DEFAULT_BED_SHEET;
  const activeRugStyle = currentUserProfile?.roomState?.rugStyle || DEFAULT_RUG_STYLE;

  balanceEl.textContent = isSuperAdmin ? "∞" : String(clams);
  tabsEl.innerHTML = "";
  SHOP_CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `shop-tab-btn${cat.id === activeShopCategory ? " is-active" : ""}`;
    btn.textContent = cat.label;
    btn.onclick = () => {
      activeShopCategory = cat.id;
      renderShopDialog();
      if (dialogBodyEl) dialogBodyEl.scrollTop = 0;
    };
    tabsEl.appendChild(btn);
  });

  const showResetBar = (activeShopCategory === "textile" || activeShopCategory === "all")
    && (activeBedSheet !== DEFAULT_BED_SHEET || activeRugStyle !== DEFAULT_RUG_STYLE);
  textileBarEl.innerHTML = "";
  textileBarEl.classList.toggle("hidden", !showResetBar);
  if (showResetBar) {
    const note = document.createElement("span");
    note.style.marginInlineEnd = "auto";
    note.textContent = "目前使用自訂織品中，可隨時換回預設：";
    textileBarEl.appendChild(note);
    if (activeBedSheet !== DEFAULT_BED_SHEET) {
      const resetSheetBtn = document.createElement("button");
      resetSheetBtn.type = "button";
      resetSheetBtn.className = "btn";
      resetSheetBtn.textContent = "換回經典海鹽藍床組";
      resetSheetBtn.onclick = () => equipShopTextile("bedSheet", DEFAULT_BED_SHEET, resetSheetBtn);
      textileBarEl.appendChild(resetSheetBtn);
    }
    if (activeRugStyle !== DEFAULT_RUG_STYLE) {
      const resetRugBtn = document.createElement("button");
      resetRugBtn.type = "button";
      resetRugBtn.className = "btn";
      resetRugBtn.textContent = "換回奶油燕麥地毯";
      resetRugBtn.onclick = () => equipShopTextile("rugStyle", DEFAULT_RUG_STYLE, resetRugBtn);
      textileBarEl.appendChild(resetRugBtn);
    }
  }

  gridEl.innerHTML = "";
  const activeCatalog = SHOP_CATALOG.filter(item => item.enabled !== false);
  const visibleItems = activeShopCategory === "all"
    ? activeCatalog
    : activeCatalog.filter(item => item.category === activeShopCategory);

  visibleItems.forEach(item => {
    const isPaint = Boolean(item.consumable && item.wallColor);
    const isTextile = Boolean(item.textileKind);
    const isActivePaint = isPaint && item.wallColor.toLowerCase() === activeWallColor;
    const isPermanentOwned = !isPaint && Boolean(owned[item.id]);
    const isActiveTextile = isTextile && (
      (item.textileKind === "bedSheet" && activeBedSheet === item.id) ||
      (item.textileKind === "rugStyle" && activeRugStyle === item.id)
    );
    const missingPrereqs = isPermanentOwned ? [] : getMissingShopPrerequisites(item, owned);
    const isLocked = missingPrereqs.length > 0;

    const card = document.createElement("div");
    card.className = `shop-item-card${(isActivePaint || (isTextile ? isActiveTextile : isPermanentOwned)) ? " is-owned" : ""}${isLocked ? " is-locked" : ""}`;

    const previewBox = document.createElement("div");
    previewBox.className = "shop-item-preview";
    if (item.previewImage) {
      const img = document.createElement("img");
      img.src = `${item.previewImage}?v=20261120e`;
      img.alt = item.name;
      img.loading = "lazy";
      previewBox.appendChild(img);
    } else if (item.wallColor) {
      // Isometric 3D wall corner + wooden floor + paint bucket preview in exact hex
      previewBox.innerHTML = `
        <svg class="shop-paint-preview-svg" viewBox="0 0 240 180" aria-hidden="true">
          <defs>
            <linearGradient id="bg-${item.id}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f7f2ea" />
              <stop offset="100%" stop-color="#e9e0d3" />
            </linearGradient>
          </defs>
          <rect width="240" height="180" fill="url(#bg-${item.id})" />
          <!-- Floor diamond -->
          <polygon points="120,118 205,154 120,175 35,154" fill="#d8a774" />
          <!-- Left wall face -->
          <polygon points="35,44 120,16 120,118 35,154" fill="${item.wallColor}" />
          <!-- Right wall face (slightly shaded for 3D depth) -->
          <polygon points="120,16 205,44 205,154 120,118" fill="${item.wallColor}" fill-opacity="0.88" />
          <polygon points="120,16 205,44 205,154 120,118" fill="#0f172a" fill-opacity="0.09" />
          <!-- Baseboards -->
          <polygon points="35,142 120,108 120,118 35,154" fill="#e5d7c3" />
          <polygon points="120,108 205,142 205,154 120,118" fill="#d7c5ac" />
          <!-- Paint bucket with exact swatch inside -->
          <ellipse cx="146" cy="144" rx="19" ry="7" fill="#94a3b8" />
          <path d="M127,122 L127,144 A19,7 0 0,0 165,144 L165,122 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.2" />
          <ellipse cx="146" cy="122" rx="19" ry="7" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
          <ellipse cx="146" cy="122" rx="14.5" ry="4.8" fill="${item.wallColor}" />
          <!-- Cute roller handle -->
          <rect x="86" y="76" width="32" height="12" rx="5" transform="rotate(-18 102 82)" fill="${item.wallColor}" stroke="#64748b" stroke-width="1.4" />
          <path d="M106,89 L114,104 L106,120" fill="none" stroke="#64748b" stroke-width="2.4" stroke-linecap="round" />
        </svg>
      `;
    } else if (item.sheetStyle || item.rugStyle) {
      previewBox.innerHTML = buildTextilePreviewSvg(item);
    }
    if (isLocked) {
      const lockBadge = document.createElement("span");
      lockBadge.className = "shop-lock-badge";
      lockBadge.textContent = "🔒 組合解鎖";
      previewBox.appendChild(lockBadge);
    }

    const head = document.createElement("div");
    head.className = "shop-item-head";

    const iconBox = document.createElement("div");
    iconBox.className = "shop-item-icon";
    const swatchHex = item.wallColor || item.sheetStyle?.blanketColor || item.rugStyle?.baseColor;
    if (swatchHex) {
      const dot = document.createElement("span");
      dot.className = "shop-item-swatch";
      dot.style.background = swatchHex;
      iconBox.appendChild(dot);
    } else {
      iconBox.textContent = item.icon || "🎁";
    }

    const meta = document.createElement("div");
    const title = document.createElement("div");
    title.className = "shop-item-name";
    title.textContent = item.name;
    const priceEl = document.createElement("div");
    priceEl.className = "shop-item-price";
    priceEl.textContent = isPaint
      ? `${item.price} 英蚌（每次重刷計費）`
      : (isTextile && isPermanentOwned)
        ? `${item.price} 英蚌（已購買，可免費更換）`
        : `${item.price} 英蚌`;
    meta.append(title, priceEl);
    head.append(iconBox, meta);

    const desc = document.createElement("div");
    desc.className = "shop-item-desc";
    desc.textContent = item.desc;

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "btn";
    actionBtn.style.width = "100%";

    if (isActivePaint) {
      actionBtn.textContent = "目前牆色 ✓";
      actionBtn.disabled = true;
    } else if (isActiveTextile) {
      actionBtn.textContent = "目前使用中 ✓";
      actionBtn.disabled = true;
    } else if (isTextile && isPermanentOwned) {
      actionBtn.classList.add("btn-primary");
      actionBtn.textContent = "套用更換（免費）";
      actionBtn.onclick = () => equipShopTextile(item.textileKind, item.id, actionBtn);
    } else if (isPermanentOwned) {
      actionBtn.textContent = "已擺進房間 ✓";
      actionBtn.disabled = true;
    } else if (isLocked) {
      actionBtn.textContent = `🔒 需先購買：${missingPrereqs.map(p => p.name).join(" ＋ ")}`;
      actionBtn.disabled = true;
    } else if (!isSuperAdmin && clams < item.price) {
      actionBtn.textContent = `還差 ${item.price - clams} 英蚌`;
      actionBtn.disabled = true;
    } else {
      actionBtn.classList.add("btn-primary");
      actionBtn.textContent = isPaint
        ? "購買並重新粉刷"
        : isTextile
          ? "購買並立刻換上"
          : "購買並放進房間";
      actionBtn.onclick = () => purchaseShopItem(item.id, actionBtn);
    }

    card.append(previewBox, head, desc, actionBtn);
    gridEl.appendChild(card);
  });
  if (dialogBodyEl) {
    dialogBodyEl.scrollTop = prevScrollTop;
  }
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
    triggerBtn.textContent = "購買中...";
  }
  try {
    const userRef = doc(firestoreDb, "users", currentUser.uid);
    const result = await runTransaction(firestoreDb, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error("找不到使用者檔案。");
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
          throw new Error("英蚌餘額不足，先去電腦完成接案學習賺錢吧！");
        }
        const nextClams = isSuperAdmin ? currentClams : (currentClams - item.price);
        const nextRoomState = { ...prevRoomState, wallColor: item.wallColor };
        tx.update(userRef, {
          clams: nextClams,
          roomState: nextRoomState,
          updatedAt: serverTimestamp()
        });
        if (item.price > 0) {
          queueLedgerTransaction(tx, currentUser.uid, {
            type: "purchase",
            category: item.category,
            title: `重刷牆面：${item.name}`,
            amount: -item.price
          });
        }
        return { unchanged: false, nextClams, nextOwned: prevOwned, nextRoomState };
      }

      if (prevOwned[item.id] === true) {
        return { unchanged: true, nextClams: currentClams, nextOwned: prevOwned, nextRoomState: prevRoomState };
      }
      const missingPrereqs = getMissingShopPrerequisites(item, prevOwned);
      if (missingPrereqs.length > 0) {
        throw new Error(`需先購買「${missingPrereqs.map(p => p.name).join("」與「")}」才能解鎖此商品！`);
      }
      if (!isSuperAdmin && currentClams < item.price) {
        throw new Error("英蚌餘額不足，先去電腦完成接案學習賺錢吧！");
      }

      const nextClams = isSuperAdmin ? currentClams : (currentClams - item.price);
      const nextOwned = { ...prevOwned, [item.id]: true };
      let nextRoomState = prevRoomState;
      let shouldUpdateRoomState = false;
      if (item.id === "bed_lamp") {
        nextRoomState = { ...prevRoomState, bedLampOn: true };
        shouldUpdateRoomState = true;
      } else if (item.textileKind === "bedSheet" || item.textileKind === "rugStyle") {
        nextRoomState = { ...prevRoomState, [item.textileKind]: item.id };
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
      if (item.price > 0) {
        queueLedgerTransaction(tx, currentUser.uid, {
          type: "purchase",
          category: item.category,
          title: item.textileKind ? `購入織品：${item.name}` : `購買家具：${item.name}`,
          amount: -item.price
        });
      }
      return { unchanged: false, nextClams, nextOwned, nextRoomState };
    });

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
    roomScene?.applyOwnedItems(normalizedOwned);
    if (item.wallColor) {
      roomScene?.setWallColor(item.wallColor);
      const feeNote = currentRole === "super_admin" ? "超級管理員測試免扣款" : `扣除粉刷費 ${item.price} 英蚌`;
      showFeedback("shop-feedback", "success", `已重新粉刷為「${item.name}」（${feeNote}）！`);
    } else if (item.textileKind === "bedSheet") {
      roomScene?.setBedSheet(item.id);
      showFeedback("shop-feedback", "success", `已購入「${item.name}」並立即換上！`);
    } else if (item.textileKind === "rugStyle") {
      roomScene?.setRugStyle(item.id);
      showFeedback("shop-feedback", "success", `已購入「${item.name}」並立即鋪好！`);
    } else {
      if (item.id === "bed_lamp") {
        roomScene?.setBedLamp(true);
      }
      showFeedback("shop-feedback", "success", `已購買「${item.name}」並直接放進租屋處！`);
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

// Guest YouTube TV Player (No login required; overridden by Google Sheet TV_Videos tab)
let TV_CHANNEL_VIDEOS = [...DEFAULT_TV_CHANNEL_VIDEOS];
const tvDialog = document.getElementById("tv-dialog");
const tvIframe = document.getElementById("tv-youtube-iframe");
let lastTvVideoId = null;

function pickNextTvChannel() {
  const pool = TV_CHANNEL_VIDEOS.filter(v => v.id !== lastTvVideoId);
  const chosen = pool[Math.floor(Math.random() * pool.length)] || TV_CHANNEL_VIDEOS[0];
  lastTvVideoId = chosen.id;
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

function stopRoomTvPlayback() {
  activeTvVideo = null;
  tvPowerOffRequested = false;
  const frameEl = document.getElementById("tv-youtube-iframe");
  if (frameEl && frameEl.getAttribute("src")) {
    frameEl.removeAttribute("src");
  }
  roomScene?.setTvPlayback({ videoId: null, suspended: false });
  syncRoomTvRemoteUI();
}

function applyTvModalContent(chosen) {
  if (!chosen) return;
  document.getElementById("tv-channel-caption").textContent = `${chosen.author} · ${chosen.title}`;
  document.getElementById("tv-external-link").href = `https://www.youtube.com/watch?v=${chosen.id}`;
  tvIframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(chosen.id)}?autoplay=1&rel=0&playsinline=1`;
}

function openTvModalPlayer() {
  if (!activeTvVideo) {
    activeTvVideo = pickNextTvChannel();
  }
  roomScene?.setTvPlayback({ videoId: activeTvVideo.id, suspended: true });
  applyTvModalContent(activeTvVideo);
  syncRoomTvRemoteUI();
  if (!tvDialog.open) {
    tvDialog.showModal();
  }
}

function openTvPlayer() {
  if (!activeTvVideo) {
    activeTvVideo = pickNextTvChannel();
    roomScene?.setTvPlayback({ videoId: activeTvVideo.id, suspended: false });
    syncRoomTvRemoteUI();
    return;
  }
  openTvModalPlayer();
}

function shuffleTvChannel() {
  const chosen = pickNextTvChannel();
  activeTvVideo = chosen;
  if (tvDialog.open) {
    applyTvModalContent(chosen);
  } else {
    roomScene?.setTvPlayback({ videoId: chosen.id, suspended: false });
  }
  syncRoomTvRemoteUI();
}

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
  tvIframe.removeAttribute("src");
  if (tvPowerOffRequested) {
    stopRoomTvPlayback();
    return;
  }
  if (activeTvVideo && currentScreen === "room") {
    roomScene?.setTvPlayback({ videoId: activeTvVideo.id, suspended: false });
    syncRoomTvRemoteUI();
  }
});

// Wall Art Poster Customizer & Interactive Cropper
async function savePosterCustomization(nextPosterUrl) {
  if (!currentUser || !currentUserProfile) return;
  const nextRoomState = {
    ...(currentUserProfile.roomState || {
      cameraQuarter: 0,
      deskLampOn: true,
      bedLampOn: false,
      wallColor: DEFAULT_WALL_COLOR,
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

function updateRentCountdownUI() {
  const btn = document.getElementById("room-finance-btn");
  const msgBadgeEl = document.getElementById("room-rent-msg-badge");
  const badge = document.getElementById("finance-countdown-badge");
  const payBtn = document.getElementById("finance-pay-rent-btn");
  const testBtn = document.getElementById("finance-test-rent-btn");
  const profile = currentUserProfile;
  const dueAt = Number(profile?.nextRentDueAt || getNextMonthFirstEpoch());
  const msLeft = dueAt - Date.now();
  const isDue = msLeft <= 0;
  const clams = Math.max(0, Math.trunc(Number(profile?.clams ?? STARTER_CLAMS)));
  const isSuperAdmin = currentRole === "super_admin";
  const hasRentAlert = Boolean(isDue && !isSuperAdmin);
  const daysLeft = isDue ? 0 : Math.max(1, Math.ceil(msLeft / 86400000));
  const paidThisMonth = Boolean(profile?.lastRentPaidMonth && profile.lastRentPaidMonth === getMonthKey());
  const rentDeficit = Math.max(0, MONTHLY_RENT_CLAMS - clams);
  const rentMoodStatus = (!isSuperAdmin && (isDue || (daysLeft <= 5 && rentDeficit > 0)))
    ? "urgent"
    : (paidThisMonth && daysLeft >= 20)
    ? "paid"
    : "chill";
  roomScene?.setRentMood({
    status: rentMoodStatus,
    daysLeft,
    deficit: rentDeficit,
    paidThisMonth
  });

  if (btn) {
    btn.classList.toggle("is-rent-alert", hasRentAlert);
    btn.setAttribute(
      "aria-label",
      hasRentAlert
        ? `記帳（1 則待繳房租通知，應繳 ${MONTHLY_RENT_CLAMS} 英蚌）`
        : "記帳"
    );
  }
  if (msgBadgeEl) {
    msgBadgeEl.classList.toggle("hidden", !hasRentAlert);
  }

  if (financeDialog.open) {
    if (badge) {
      badge.textContent = isDue
        ? `⚠️ 本期房租 ${MONTHLY_RENT_CLAMS} 英蚌已到期`
        : `⏳ 距下次繳租：${formatRentCountdown(msLeft, false)}`;
    }
    if (payBtn) {
      payBtn.classList.toggle("hidden", !isDue || isSuperAdmin);
      payBtn.disabled = rentActionBusy || (!isSuperAdmin && clams < MONTHLY_RENT_CLAMS);
    }
    if (testBtn) {
      testBtn.classList.toggle("hidden", !isSuperAdmin);
      testBtn.disabled = rentActionBusy;
    }
  }
}

function renderFinanceDialog() {
  const profile = currentUserProfile || {};
  const isSuperAdmin = currentRole === "super_admin";
  const clams = Math.max(0, Math.trunc(Number(profile.clams ?? STARTER_CLAMS)));
  const currentMonth = getMonthKey();

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
      budgetMsgEl.textContent = "超級管理員測試模式（∞ 無限英蚌，仍完整紀錄支出與模擬繳租）。";
    } else if (clams >= MONTHLY_RENT_CLAMS) {
      budgetMsgEl.textContent = `✓ 本月房租預算已達標！預留 ${MONTHLY_RENT_CLAMS} 英蚌房租後，還可放心花費 ${clams - MONTHLY_RENT_CLAMS} 英蚌。`;
    } else {
      budgetMsgEl.textContent = `⚠️ 目前還差 ${MONTHLY_RENT_CLAMS - clams} 英蚌才夠繳下月房租，建議先去電腦接案賺錢喔！`;
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
    let noteTitle = "房東陳伯伯的小紙條";
    let noteBody = "";

    if (isSuperAdmin) {
      noteIcon = "🕶️";
      noteTitle = "房東陳伯伯（對大股東敬禮）";
      noteBody = "「管理員大大好！這棟樓的財務報表您隨時檢閱，房租只是順手測一下流程而已～」";
    } else if (isDue && deficit > 0) {
      landlordNoteEl.classList.add("is-urgent");
      noteIcon = "🧧";
      noteTitle = "🚨 房東急件催租字條（已到期且餘額不足）";
      noteBody = `「門縫收到通知了嗎？本月房租 ${MONTHLY_RENT_CLAMS} 英蚌已到期，還差 ${deficit} 英蚌！快回電腦接一個英語單元交稿賺錢，不然橘貓也要看著你嘆氣啦！」`;
    } else if (isDue) {
      landlordNoteEl.classList.add("is-urgent");
      noteIcon = "🚪";
      noteTitle = "🏠 房東通知：本月房租可以結算囉！";
      noteBody = `「早安呀小畫師～本月 ${MONTHLY_RENT_CLAMS} 英蚌房租已到期，我看你存摺裡現金夠了，按上方按鈕就能輕鬆入帳！」`;
    } else if (deficit > 0 && daysLeft <= 7) {
      landlordNoteEl.classList.add("is-tight");
      noteIcon = "⏳";
      noteTitle = `⚠️ 房東溫馨倒數通知（剩 ${daysLeft} 天）`;
      noteBody = `「再過 ${daysLeft} 天就要繳下期 ${MONTHLY_RENT_CLAMS} 英蚌房租囉！你現在還缺 ${deficit} 英蚌，趕緊打開 MacBook 完成一單英語委託最安心！」`;
    } else if (paidThisMonth) {
      landlordNoteEl.classList.add("is-paid");
      noteIcon = "🥳";
      noteTitle = "✨ 房東點讚回執：本月房租準時收訖";
      noteBody = `「這麼準時的接案租客真是少見！距離下次繳租還有 ${daysLeft} 天，多餘的 ${clams} 英蚌可以去生活商店挑家具犒賞自己～」`;
    } else if (deficit > 0) {
      landlordNoteEl.classList.add("is-tight");
      noteIcon = "📒";
      noteTitle = `💡 房東鄰居關心（距繳租 ${daysLeft} 天）`;
      noteBody = `「先存好下期房租（還差 ${deficit} 英蚌）再逛家具店，是最穩健的接案生存法則喔！」`;
    } else {
      noteIcon = "☕";
      noteTitle = `🌞 房東的祝福（預算已就緒，距繳租剩 ${daysLeft} 天）`;
      noteBody = `「房租 ${MONTHLY_RENT_CLAMS} 英蚌都預留妥當啦，剩下的 ${clams - MONTHLY_RENT_CLAMS} 英蚌祝你在工作室創作愉快！」`;
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
    opt.textContent = m === currentMonth ? `${m}（本月）` : m;
    monthSelect.appendChild(opt);
  });
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "全部歷史月份";
  monthSelect.appendChild(allOpt);
  monthSelect.value = activeFinanceMonth;

  // Type filter tabs
  const tabsEl = document.getElementById("finance-type-tabs");
  tabsEl.innerHTML = "";
  [
    { id: "all", label: "全部明細" },
    { id: "expense", label: "只看支出" },
    { id: "income", label: "只看收入" }
  ].forEach(tab => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `shop-tab-btn${activeFinanceFilter === tab.id ? " is-active" : ""}`;
    b.textContent = tab.label;
    b.onclick = () => {
      activeFinanceFilter = tab.id;
      renderFinanceDialog();
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

  const scopeLabel = activeFinanceMonth === "all" ? "累積總" : (activeFinanceMonth === currentMonth ? "本月" : `${activeFinanceMonth} `);
  document.getElementById("finance-income-label").textContent = `💵 ${scopeLabel}收入`;
  document.getElementById("finance-income-val").textContent = `+${incomeSum} 英蚌`;
  document.getElementById("finance-expense-label").textContent = `💸 ${scopeLabel}${showUnpaidRentBudget ? "花費＋房租預算" : "總支出"}`;
  document.getElementById("finance-expense-val").textContent = `-${totalExpenseWithBudget} 英蚌`;
  document.getElementById("finance-expense-sub").textContent = showUnpaidRentBudget
    ? `已實際支出 ${recordedExpenseSum} ＋ 本月房租預算 ${MONTHLY_RENT_CLAMS}`
    : `紀錄支出合計（含已繳房租與購買家具）`;

  document.getElementById("finance-balance-val").textContent = isSuperAdmin ? "∞ 英蚌" : `${clams} 英蚌`;
  document.getElementById("finance-free-cash-sub").textContent = isSuperAdmin
    ? "超級管理員測試無限額度"
    : `扣掉 ${MONTHLY_RENT_CLAMS} 房租後可自由花費：${Math.max(0, clams - MONTHLY_RENT_CLAMS)} 英蚌`;

  const listEl = document.getElementById("finance-tx-list");
  listEl.innerHTML = "";

  if (showUnpaidRentBudget && (activeFinanceFilter === "all" || activeFinanceFilter === "expense")) {
    const budgetRow = document.createElement("div");
    budgetRow.className = "finance-tx-row is-budget-row";
    budgetRow.innerHTML = `
      <div class="finance-tx-meta">
        <span class="finance-tx-title">🏠 ${escapeHtml(currentMonth)} 每月房租預算（每月 1 號繳納）</span>
        <span class="finance-tx-sub">固定生活必要支出 · 尚未扣款（預先計入本月預算）</span>
      </div>
      <span class="finance-tx-amount is-budget">-${MONTHLY_RENT_CLAMS} 英蚌（預算）</span>
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
    emptyEl.textContent = "這個分類與月份目前還沒有收支紀錄；去商店買東西、完成接案或繳交房租後就會記錄在這裡！";
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
          : tx.type === "bonus"
            ? "🌟"
            : tx.category === "paint"
              ? "🎨"
              : tx.category === "textile"
                ? "🛏️"
                : tx.category === "gear"
                  ? "⌨️"
                  : "🛋️";
      const dateText = tx.createdAt?.toDate
        ? tx.createdAt.toDate().toLocaleString("zh-TW", { hour12: false })
        : (tx.monthKey || "");
      row.innerHTML = `
        <div class="finance-tx-meta">
          <span class="finance-tx-title">${icon} ${escapeHtml(tx.title || "收支項目")}</span>
          <span class="finance-tx-sub">${escapeHtml(dateText)}</span>
        </div>
        <span class="finance-tx-amount ${isIn ? "is-in" : "is-out"}">${isIn ? "+" : ""}${tx.amount} 英蚌</span>
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
      if (!snap.exists()) throw new Error("找不到使用者檔案。");
      const data = snap.data() || {};
      const curClams = Math.trunc(Number(data.clams ?? STARTER_CLAMS));
      const curDue = Number(data.nextRentDueAt || Date.now());
      if (!isTestDemo && !isSuperAdmin && curClams < MONTHLY_RENT_CLAMS) {
        throw new Error(`餘額不足 ${MONTHLY_RENT_CLAMS} 英蚌，先接案賺錢再來繳租吧！`);
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
        title: isTestDemo ? "測試模擬繳交每月房租" : `繳交每月租屋處房租（${monthStr}）`,
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
      ? "已模擬記帳一期 -100 英蚌房租並推進下期倒數！"
      : `已成功繳納 ${result.monthStr} 房租 ${MONTHLY_RENT_CLAMS} 英蚌！`;
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
  const dueAt = Number(currentUserProfile.nextRentDueAt || 0);
  if (!dueAt || Date.now() < dueAt) return;
  const clams = Math.trunc(Number(currentUserProfile.clams ?? STARTER_CLAMS));
  if (clams >= MONTHLY_RENT_CLAMS) {
    await payMonthlyRent({ isTestDemo: false });
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
  clearFeedback("finance-feedback");
  renderFinanceDialog();
  if (!financeDialog.open) financeDialog.showModal();
  updateRentCountdownUI();
});
document.getElementById("finance-month-select").addEventListener("change", (e) => {
  activeFinanceMonth = e.currentTarget.value;
  renderFinanceDialog();
});
document.getElementById("finance-pay-rent-btn").addEventListener("click", () => {
  payMonthlyRent({ isTestDemo: false });
});
document.getElementById("finance-test-rent-btn").addEventListener("click", () => {
  payMonthlyRent({ isTestDemo: true });
});

setInterval(() => {
  if (!currentUser || !currentUserProfile) return;
  updateRentCountdownUI();
  maybeCollectMonthlyRent();
}, 1000);

document.getElementById("room-edit-avatar-btn").addEventListener("click", () => {
  showOnboardingScreen(true);
});

window.addEventListener("keydown", (e) => {
  if (currentScreen !== "room" || !roomScene) return;
  if (settingsDialog.open || adminReviewDialog.open || shopDialog.open || tvDialog.open || financeDialog.open) return;
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
  const badge = document.getElementById("admin-pending-badge");
  if (badge) {
    badge.textContent = "0";
    badge.classList.add("hidden");
  }
}

function syncCachedStudentsSnapshot(docsList, preserveUid = null) {
  cachedStudents = docsList;

  // Update live pending badge on header button
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

  const pendingBadge = document.getElementById("admin-pending-badge");
  if (pendingBadge) {
    pendingBadge.textContent = String(totalPending);
    pendingBadge.classList.toggle("hidden", totalPending <= 0);
  }

  if (!adminReviewDialog.open) return;

  const selectEl = document.getElementById("review-student-select");
  const summaryEl = document.getElementById("review-student-summary");
  const listEl = document.getElementById("review-lessons-list");
  const targetUid = preserveUid || selectEl.value;

  renderPendingReviewQueue();

  selectEl.innerHTML = "";
  if (cachedStudents.length === 0) {
    selectEl.innerHTML = `<option value="">尚無註冊帳號</option>`;
    summaryEl.textContent = "目前還沒有學生帳號註冊。";
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
    const pendingTag = pendingCount > 0 ? ` · 🔔${pendingCount}待驗收` : "";
    const selfTag = (stu.email || "").toLowerCase() === SUPER_ADMIN_EMAIL ? " ★測試帳號" : "";
    opt.textContent = `${stu.displayName || stu.email}${charName}${selfTag} (${stu.email}) — ${stu.clams ?? STARTER_CLAMS} 英蚌${pendingTag}`;
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

function renderPendingReviewQueue() {
  const queueEl = document.getElementById("review-pending-queue");
  if (!queueEl) return;
  queueEl.innerHTML = "";

  const pendingEntries = [];
  cachedStudents.forEach(stu => {
    const approved = stu.approvedLessons || {};
    const overrides = stu.completionOverrides || {};
    const submitted = stu.submittedLessons || {};
    Object.keys(submitted).forEach(dateKey => {
      if (submitted[dateKey] && !approved[dateKey] && !overrides[dateKey]) {
        const lessonMeta = db.lessons.find(l => l.Date === dateKey);
        pendingEntries.push({
          stu,
          dateStr: dateKey,
          title: lessonMeta?.Title || "英語單元任務"
        });
      }
    });
  });

  pendingEntries.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  if (pendingEntries.length === 0) {
    const emptyEl = document.createElement("p");
    emptyEl.className = "form-hint";
    emptyEl.textContent = "目前沒有尚未驗收的待處理交稿。";
    queueEl.appendChild(emptyEl);
    return;
  }

  pendingEntries.forEach(({ stu, dateStr, title }) => {
    const row = document.createElement("div");
    row.className = "admin-review-row is-pending-row";
    const stuLabel = stu.avatar?.name
      ? `${stu.displayName || stu.email} [${stu.avatar.name}]`
      : (stu.displayName || stu.email);
    row.innerHTML = `
      <div class="admin-review-meta">
        <strong>🔔 ${escapeHtml(stuLabel)} — ${escapeHtml(dateStr)} · ${escapeHtml(title)}</strong>
        <span class="form-hint">${escapeHtml(stu.email || "")} ｜ 目前餘額 ${Math.trunc(Number(stu.clams ?? STARTER_CLAMS))} 英蚌</span>
      </div>
      <div class="admin-review-actions"></div>
    `;

    const actionsEl = row.querySelector(".admin-review-actions");
    const rewardInput = document.createElement("input");
    rewardInput.type = "number";
    rewardInput.className = "reward-input-sm";
    rewardInput.value = String(UNIT_REWARD_CLAMS);
    rewardInput.min = "0";
    rewardInput.max = "100000";
    rewardInput.setAttribute("aria-label", `${stuLabel} ${dateStr} 驗收報酬英蚌`);

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "btn btn-primary btn-sm";
    approveBtn.textContent = "✓ 驗收並發錢";
    approveBtn.addEventListener("click", async () => {
      approveBtn.disabled = true;
      clearFeedback("admin-review-feedback");
      try {
        const res = await approveStudentLesson(stu.uid, dateStr, rewardInput.value);
        const xpNote = res.xpGranted > 0 ? `與 +${res.xpGranted} XP` : "";
        showFeedback(
          "admin-review-feedback",
          "success",
          res.alreadyApproved
            ? `${stuLabel} 的 ${dateStr} 已是驗收狀態。`
            : `已驗收 ${stuLabel}（${dateStr}）並即時發放 ${rewardInput.value} 英蚌${xpNote}！`
        );
        await loadStudentsForReview(stu.uid);
      } catch (err) {
        showFeedback("admin-review-feedback", "error", translateAuthError(err));
        approveBtn.disabled = false;
      }
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "btn btn-sm";
    rejectBtn.textContent = "退回修改";
    rejectBtn.addEventListener("click", async () => {
      rejectBtn.disabled = true;
      clearFeedback("admin-review-feedback");
      try {
        await rejectStudentSubmission(stu.uid, dateStr);
        showFeedback("admin-review-feedback", "info", `已退回 ${stuLabel} 的 ${dateStr} 交稿。`);
        await loadStudentsForReview(stu.uid);
      } catch (err) {
        showFeedback("admin-review-feedback", "error", translateAuthError(err));
        rejectBtn.disabled = false;
      }
    });

    actionsEl.append(rewardInput, approveBtn, rejectBtn);
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
    updateHeaderAccountUI(currentUser, currentRole, displayName, data.clams ?? STARTER_CLAMS);
    syncXpProgressUI({ allowCelebrate: true });
    if (roomScene) {
      const rs = data.roomState || {};
      roomScene.setWallColor(rs.wallColor || DEFAULT_WALL_COLOR);
      roomScene.setBedSheet(rs.bedSheet || DEFAULT_BED_SHEET);
      roomScene.setRugStyle(rs.rugStyle || DEFAULT_RUG_STYLE);
      roomScene.setPosterImage(rs.posterImage || "");
      roomScene.setVinylOn(Boolean(rs.vinylOn ?? false));
      roomScene.applyOwnedItems(normalizeOwnedItems(data.ownedItems));
    }
    if (shopDialog.open) {
      renderShopDialog();
    }
    if (financeDialog.open) {
      renderFinanceDialog();
    }
    updateRentCountdownUI();
    if (currentScreen === "desktop") {
      renderHome();
    } else if (currentScreen === "lesson" && activeLessonDate) {
      activeLessonSyncCommission?.();
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
    selectEl.innerHTML = `<option value="">正在讀取學生名單...</option>`;
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
    selectEl.innerHTML = `<option value="">讀取失敗</option>`;
    summaryEl.textContent = "無法讀取名單，請確認網路或管理員權限。";
    showFeedback("admin-review-feedback", "error", translateAuthError(err));
  }
}

async function approveStudentLesson(studentUid, dateStr, rewardAmount, xpAmount) {
  const safeReward = Math.max(0, Math.min(100000, Math.trunc(Number(rewardAmount) || 0)));
  const lessonMeta = db.lessons.find(l => l.Date === dateStr);
  const resolvedXp = xpAmount !== undefined && xpAmount !== null ? xpAmount : getLessonXp(lessonMeta);
  const safeXp = Math.max(0, Math.min(10000, Math.trunc(Number(resolvedXp) || 0)));
  const stuRef = doc(firestoreDb, "users", studentUid);

  const result = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(stuRef);
    if (!snap.exists()) throw new Error("找不到該學生帳號資料。");
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
        title: `單元驗收撥款（${dateStr}）`,
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
  if (clampedDelta === 0) throw new Error("請輸入非零的英蚌數量。");
  const stuRef = doc(firestoreDb, "users", studentUid);
  const nextClams = await runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(stuRef);
    if (!snap.exists()) throw new Error("找不到該學生帳號資料。");
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
        title: deltaApplied > 0 ? "課堂獎勵／老師加碼發放" : "管理員餘額更正調整",
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
  summaryEl.textContent = `Lv.${stuProgress.level} ${stuProgress.title}（${stuXp} XP）｜ 餘額：${clams} 英蚌 ｜ 累積收入：${totalEarned} 英蚌 ｜ 角色：${stu.avatar?.name || "尚未建立"} ｜ 已購物件：${ownedCount} 件`;

  // Direct Clam Payout / Adjustment row
  const bonusRow = document.createElement("div");
  bonusRow.className = "admin-review-row";
  bonusRow.innerHTML = `
    <div class="admin-review-meta">
      <strong>💰 直接發放／調整英蚌</strong>
      <span class="form-hint">點下方快捷按鈕直接匯款，或輸入正負數字進行獎金加碼／更正</span>
      <div class="quick-clam-chips" style="margin-top: 0.25rem;">
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="50">+50</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="100">+100</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="200">+200</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="500">+500</button>
        <button type="button" class="btn btn-sm quick-payout-btn" data-amt="-50">-50</button>
      </div>
    </div>
    <div class="admin-review-actions">
      <input type="number" class="reward-input-sm" id="manual-bonus-input" value="200" min="-50000" max="100000" aria-label="發放或調整英蚌數量" />
      <button type="button" class="btn btn-primary btn-sm" id="send-bonus-btn">立即發放</button>
    </div>
  `;
  const sendPayout = async (amount, triggerBtn) => {
    if (triggerBtn) triggerBtn.disabled = true;
    clearFeedback("admin-review-feedback");
    try {
      const res = await grantManualBonus(stu.uid, amount);
      const verb = res.deltaApplied >= 0 ? `已發放 +${res.deltaApplied}` : `已調整 ${res.deltaApplied}`;
      showFeedback("admin-review-feedback", "success", `${verb} 英蚌給 ${stu.avatar?.name || stu.displayName || stu.email}！（目前餘額 ${res.nextC} 英蚌）`);
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

  // Sort lessons: pending submissions first, then unapproved >= 2026-10-28, then approved
  const activeLessons = [...db.lessons]
    .filter(l => l.Date >= DEFAULT_COMPLETED_BEFORE || submitted[l.Date] || approved[l.Date])
    .sort((a, b) => {
      const sa = submitted[a.Date] && !approved[a.Date] ? 0 : (approved[a.Date] || overrides[a.Date] ? 2 : 1);
      const sb = submitted[b.Date] && !approved[b.Date] ? 0 : (approved[b.Date] || overrides[b.Date] ? 2 : 1);
      if (sa !== sb) return sa - sb;
      return b.Date.localeCompare(a.Date);
    });

  if (activeLessons.length === 0) {
    const emptyNote = document.createElement("p");
    emptyNote.className = "form-hint";
    emptyNote.textContent = "尚無待驗收的近況課程。";
    listEl.appendChild(emptyNote);
    return;
  }

  activeLessons.forEach(lesson => {
    const isApproved = Boolean(approved[lesson.Date] || overrides[lesson.Date]);
    const isPending = !isApproved && Boolean(submitted[lesson.Date]);

    const row = document.createElement("div");
    row.className = "admin-review-row";
    row.innerHTML = `
      <div class="admin-review-meta">
        <strong>${escapeHtml(lesson.Date)} · ${escapeHtml(lesson.Title || "Untitled")}</strong>
        <span class="form-hint">${isApproved ? "✓ 已驗收並撥款" : isPending ? "🔔 學生已提交作品，等待您驗收！" : "尚未交稿（老師亦可直接現場結算）"}</span>
      </div>
      <div class="admin-review-actions"></div>
    `;

    const actionsEl = row.querySelector(".admin-review-actions");
    if (isApproved) {
      const tag = document.createElement("span");
      tag.className = "role-badge verified-badge";
      tag.textContent = "已驗收通過 ✓";
      actionsEl.appendChild(tag);
    } else {
      const rewardInput = document.createElement("input");
      rewardInput.type = "number";
      rewardInput.className = "reward-input-sm";
      rewardInput.value = String(UNIT_REWARD_CLAMS);
      rewardInput.min = "0";
      rewardInput.max = "100000";
      rewardInput.setAttribute("aria-label", `${lesson.Date} 驗收報酬英蚌`);

      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "btn btn-primary btn-sm";
      approveBtn.textContent = "驗收並撥款";
      approveBtn.addEventListener("click", async () => {
        approveBtn.disabled = true;
        clearFeedback("admin-review-feedback");
        try {
          const res = await approveStudentLesson(stu.uid, lesson.Date, rewardInput.value);
          const xpNote = res.xpGranted > 0 ? `與 +${res.xpGranted} XP` : "";
          showFeedback(
            "admin-review-feedback",
            "success",
            res.alreadyApproved
              ? `${lesson.Date} 已是驗收狀態。`
              : `已驗收 ${lesson.Date} 並撥款 ${rewardInput.value} 英蚌${xpNote}！`
          );
          await loadStudentsForReview(stu.uid);
        } catch (err) {
          showFeedback("admin-review-feedback", "error", translateAuthError(err));
          approveBtn.disabled = false;
        }
      });

      actionsEl.appendChild(rewardInput);
      actionsEl.appendChild(approveBtn);

      if (isPending) {
        const rejectBtn = document.createElement("button");
        rejectBtn.type = "button";
        rejectBtn.className = "btn btn-sm";
        rejectBtn.textContent = "退回修改";
        rejectBtn.addEventListener("click", async () => {
          rejectBtn.disabled = true;
          try {
            await rejectStudentSubmission(stu.uid, lesson.Date);
            showFeedback("admin-review-feedback", "info", `已退回 ${lesson.Date} 請繪師修改再交。`);
            await loadStudentsForReview(stu.uid);
          } catch (err) {
            showFeedback("admin-review-feedback", "error", translateAuthError(err));
            rejectBtn.disabled = false;
          }
        });
        actionsEl.appendChild(rejectBtn);
      }
    }

    listEl.appendChild(row);
  });
}

openAdminReviewBtn?.addEventListener("click", () => {
  if (currentRole !== "super_admin" && currentRole !== "admin") return;
  if (!adminReviewDialog.open) {
    adminReviewDialog.showModal();
  }
  if (cachedStudents.length > 0) {
    syncCachedStudentsSnapshot(cachedStudents);
  }
  loadStudentsForReview();
});
document.getElementById("refresh-review-btn").addEventListener("click", () => {
  loadStudentsForReview(document.getElementById("review-student-select").value);
});
document.getElementById("review-student-select").addEventListener("change", () => {
  clearFeedback("admin-review-feedback");
  renderSelectedStudentReview();
});

document.getElementById("home-btn").addEventListener("click", () => {
  if (currentUser && currentUserProfile?.avatar) {
    enterRoomView(currentScreen === "desktop" || currentScreen === "lesson");
  }
});
document.getElementById("back-btn").addEventListener("click", () => openWorkDesktop());
document.getElementById("back-room-btn").addEventListener("click", () => enterRoomView(true));
document.getElementById("map-back-room-btn").addEventListener("click", () => enterRoomView(true));

onAuthStateChanged(auth, async (user) => {
  const nonce = ++authSessionNonce;
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

  if (!user) {
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
      syncXpProgressUI({ allowCelebrate: false });
    }
  }
});

loadSheets();
