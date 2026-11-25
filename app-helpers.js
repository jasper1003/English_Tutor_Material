import { bi, isEn } from "./i18n.js?v=20261125i";
import { hasOwnedSofa } from "./shop-catalog.js?v=20261125i";

export const DEFAULT_TV_CHANNEL_VIDEOS = [
  { id: "n61ULEU7CO0", title: "Best of lofi hip hop — beats to relax / study to", author: "Lofi Girl" },
  { id: "5qap5aO4i9A", title: "lofi hip hop radio — beats to relax / study to", author: "Lofi Girl" },
  { id: "MBRqu0YOH14", title: "Optimistic Nihilism", author: "Kurzgesagt – In a Nutshell" },
  { id: "dGiQaabX3_o", title: "What Happened Before History? Human Origins", author: "Kurzgesagt – In a Nutshell" },
  { id: "UjtOGPJ0URM", title: "Why Alien Life Would be our Doom", author: "Kurzgesagt – In a Nutshell" },
  { id: "Hu4Yvq-g7_Y", title: "How to Get Your Brain to Focus", author: "TEDx Talks" },
  { id: "HAnw168huqA", title: "Think Fast, Talk Smart: Communication Techniques", author: "Stanford GSB" },
  { id: "LXb3EKWsInQ", title: "Costa Rica in 4K 60fps HDR", author: "Jacob + Katie Schwarz" },
  { id: "BHACKCNDMW8", title: "3 Hours of Amazing Nature Scenery & Music", author: "Cat Trumpet" },
  { id: "6v2L2UGZJAM", title: "Planet Earth: Amazing Nature Scenery", author: "Robert Revol" }
];

export const XP_RANK_LADDER = [
  { title: "默默無名", titleEn: "Total Unknown", emblem: "🪨", subtitle: "剛踏進接案江湖，連阿橘都還不認識你", subtitleEn: "Fresh in the studio—even Mochi's cat doesn't know you yet" },
  { title: "初出茅廬", titleEn: "Rookie Freelancer", emblem: "🌱", subtitle: "熬過首月房租，開始有人私訊問檔期", subtitleEn: "Survived first-month rent; DMs about commissions are trickling in" },
  { title: "略懂皮毛", titleEn: "Sketch Apprentice", emblem: "✏️", subtitle: "筆刷手感回穩，草稿不再狂被退件", subtitleEn: "Steady brushwork; fewer rough drafts sent back for revisions" },
  { title: "小試牛刀", titleEn: "Quick Responder", emblem: "🔪", subtitle: "急件準時交稿，累積第一批回頭客", subtitleEn: "Delivered rush gigs on time and earned your first repeat clients" },
  { title: "漸入佳境", titleEn: "Rising Colorist", emblem: "🎨", subtitle: "光影配色開竅，甲方修改少了一半", subtitleEn: "Lighting & palette clicked—client revisions cut in half" },
  { title: "略有名氣", titleEn: "Word-of-Mouth Pick", emblem: "🏮", subtitle: "設計圈傳開筆名，週末檔期悄悄排滿", subtitleEn: "Your pen name is spreading; weekend slots are quietly booked" },
  { title: "小有名堂", titleEn: "Studio Hidden Gem", emblem: "✨", subtitle: "新作常被轉傳，小套房藏著神秘畫手", subtitleEn: "New pieces keep getting reposted from your cozy rented studio" },
  { title: "名聲初顯", titleEn: "Client Favorite", emblem: "📜", subtitle: "商業案主指名合作，不用再到處投履歷", subtitleEn: "Commercial clients ask for you by name—no cold pitches needed" },
  { title: "嶄露頭角", titleEn: "Breakout Illustrator", emblem: "⚔️", subtitle: "大型企劃邀約不斷，報價更有底氣", subtitleEn: "Big campaign invites keep arriving, with confident rates to match" },
  { title: "聲名鵲起", titleEn: "Trending Creator", emblem: "🦅", subtitle: "新作一出衝熱搜，信箱天天塞滿合作", subtitleEn: "Every post trends; your inbox overflows with commission offers" },
  { title: "獨當一面", titleEn: "Lead Solo Pro", emblem: "🛡️", subtitle: "再刁鑽的英語專題，都能單人收工", subtitleEn: "Even the toughest English brief wraps smoothly in your hands" },
  { title: "名動一城", titleEn: "Citywide Icon", emblem: "🏯", subtitle: "全城創意總監都收藏了你的作品集", subtitleEn: "Creative directors across town have bookmarked your portfolio" },
  { title: "爐火純青", titleEn: "Master Craftsman", emblem: "🔥", subtitle: "下筆如劍客出招，線條乾脆毫無多餘", subtitleEn: "Clean, decisive strokes with zero hesitation" },
  { title: "登堂入室", titleEn: "Gallery Virtuoso", emblem: "🏛️", subtitle: "心法修至上乘，草圖都能直接當海報", subtitleEn: "Even your rough sketches look ready to frame on a gallery wall" },
  { title: "聲振林木", titleEn: "Acclaimed Luminary", emblem: "🌩️", subtitle: "展覽人潮擠爆，連房東都主動打招呼", subtitleEn: "Packed exhibitions—even your landlord greets you warmly now" },
  { title: "威震四方", titleEn: "Sought-After Auteur", emblem: "🐉", subtitle: "各地出版商樓下排隊，只求一張檔期", subtitleEn: "Publishers line up downstairs hoping to book a single slot" },
  { title: "名滿江湖", titleEn: "Renowned Grandmaster", emblem: "🌟", subtitle: "畫界人人傳頌的宗師，筆落驚風雨", subtitleEn: "A household name across the illustration scene" },
  { title: "一代宗師", titleEn: "Style Pioneer", emblem: "🥋", subtitle: "開創專屬畫風，無數新手臨摹你的筆法", subtitleEn: "Pioneered a signature look studied by newcomers everywhere" },
  { title: "天下無雙", titleEn: "Peerless Visionary", emblem: "👑", subtitle: "速度、語意與質感，當世已難逢對手", subtitleEn: "Speed, nuance, and polish—unmatched in the craft" },
  { title: "武林盟主", titleEn: "Guild Champion", emblem: "🏆", subtitle: "號令接案圈，甲方見你先雙手奉茶", subtitleEn: "Clients bring tea first before asking for your availability" },
  { title: "登峰造極", titleEn: "Peak Paragon", emblem: "⛰️", subtitle: "境界超越凡人尺度，隨手一筆皆藏品", subtitleEn: "Every casual doodle turns into a collector's piece" },
  { title: "傲視群雄", titleEn: "Sovereign Artist", emblem: "🦅", subtitle: "高處不勝寒，唯手沖、黑膠與阿橘相伴", subtitleEn: "At the summit with pour-over coffee, vinyl, and Ginger the cat" },
  { title: "破碎虛空", titleEn: "Stylus Ascendant", emblem: "⚡", subtitle: "電繪筆金光乍現，靈感跨次元具現", subtitleEn: "Your stylus sparks ideas across dimensions" },
  { title: "飛升成仙", titleEn: "Studio Immortal", emblem: "☁️", subtitle: "房租已成浮雲，你早靠畫筆悟道成仙", subtitleEn: "Monthly rent feels trivial—your art achieved enlightenment" },
  { title: "畫道聖尊", titleEn: "Artisan Saint", emblem: "🌀", subtitle: "美術館搶收你磨短的筆芯與草稿紙", subtitleEn: "Museums bid even for your worn nibs and scrap sketches" },
  { title: "超凡入聖", titleEn: "Transcendent Muse", emblem: "🪽", subtitle: "單字文法皆化內力，心念一動成神作", subtitleEn: "Vocabulary and craft fuse effortlessly into masterpieces" },
  { title: "萬古神話", titleEn: "Eternal Legend", emblem: "🌌", subtitle: "插畫史第一章，只寫著你的名號與房號", subtitleEn: "Chapter one of art history opens with your studio door number" },
  { title: "太古獨尊·無敵寂寞", titleEn: "Cosmic Zenith", emblem: "🪩", subtitle: "宇宙星雲都照你的色票調色", subtitleEn: "Even distant nebulae match your custom color swatches" }
];

export const DAY_NIGHT_KEYFRAMES = [
  { phase: 0.00, label: "日出清晨", labelEn: "Early Sunrise", sunColor: "#ffa56e", sunIntensity: 1.25, hemiSky: "#ffc29e", hemiGround: "#ba8b6c", hemiIntensity: 0.56, bg: "#dfc0ab", sky: "#f7a98f", darkness: 0.45 },
  { phase: 0.09, label: "清晨暖陽", labelEn: "Morning Sun", sunColor: "#ffe2b8", sunIntensity: 1.85, hemiSky: "#fff3df", hemiGround: "#c89974", hemiIntensity: 0.74, bg: "#eae0d2", sky: "#94d4fb", darkness: 0.14 },
  { phase: 0.25, label: "晴朗正午", labelEn: "Bright Noon", sunColor: "#fff6e3", sunIntensity: 2.15, hemiSky: "#fffaf2", hemiGround: "#cba07a", hemiIntensity: 0.84, bg: "#eee5d7", sky: "#7dd3fc", darkness: 0.00 },
  { phase: 0.37, label: "午後陽光", labelEn: "Afternoon Glow", sunColor: "#ffeed4", sunIntensity: 2.02, hemiSky: "#fff4e4", hemiGround: "#c79873", hemiIntensity: 0.78, bg: "#ebe1d3", sky: "#86cbf5", darkness: 0.06 },
  { phase: 0.46, label: "金黃夕陽", labelEn: "Golden Sunset", sunColor: "#ffb875", sunIntensity: 1.58, hemiSky: "#f8c79d", hemiGround: "#ad7a66", hemiIntensity: 0.63, bg: "#cfa393", sky: "#f69954", darkness: 0.38 },
  { phase: 0.52, label: "暮色微醺", labelEn: "Twilight Dusk", sunColor: "#e67c73", sunIntensity: 1.08, hemiSky: "#946f91", hemiGround: "#614957", hemiIntensity: 0.48, bg: "#524161", sky: "#ad5d7a", darkness: 0.68 },
  { phase: 0.60, label: "入夜藍調", labelEn: "Blue Hour Night", sunColor: "#8ca4e6", sunIntensity: 0.72, hemiSky: "#334268", hemiGround: "#30282b", hemiIntensity: 0.39, bg: "#192030", sky: "#19243b", darkness: 0.92 },
  { phase: 0.75, label: "靜謐深夜", labelEn: "Quiet Midnight", sunColor: "#7e9de3", sunIntensity: 0.62, hemiSky: "#243252", hemiGround: "#261f1e", hemiIntensity: 0.36, bg: "#111622", sky: "#0f172a", darkness: 1.00 },
  { phase: 0.90, label: "破曉前夕", labelEn: "Before Dawn", sunColor: "#94a8e4", sunIntensity: 0.70, hemiSky: "#384168", hemiGround: "#352b2d", hemiIntensity: 0.40, bg: "#21273c", sky: "#273154", darkness: 0.88 },
  { phase: 0.96, label: "黎明微光", labelEn: "First Light", sunColor: "#df937f", sunIntensity: 0.96, hemiSky: "#997282", hemiGround: "#74574e", hemiIntensity: 0.48, bg: "#785d6b", sky: "#c78b8e", darkness: 0.66 }
];

/**
 * Sample continuous C^1 smooth day-night outdoor lighting & sun arc at cycle phase [0, 1).
 * Uses cosine easing between cyclic keyframes so transitions never snap or jump.
 */
export function sampleDayNightCycle(rawPhase) {
  const n = DAY_NIGHT_KEYFRAMES.length;
  const p = ((Number(rawPhase) % 1) + 1) % 1;

  let idx = n - 1;
  for (let i = 0; i < n; i++) {
    if (p >= DAY_NIGHT_KEYFRAMES[i].phase) idx = i;
  }
  const nextIdx = (idx + 1) % n;
  const from = DAY_NIGHT_KEYFRAMES[idx];
  const to = DAY_NIGHT_KEYFRAMES[nextIdx];

  const startP = from.phase;
  const endP = nextIdx === 0 ? 1.0 : to.phase;
  const span = Math.max(1e-6, endP - startP);
  const rawK = Math.min(1, Math.max(0, (p - startP) / span));
  const alpha = 0.5 - 0.5 * Math.cos(Math.PI * rawK);

  const lerpNum = (a, b) => a + (b - a) * alpha;
  const orbit = p * Math.PI * 2;

  const activeFrame = rawK < 0.5 ? from : to;
  return {
    phase: p,
    isNight: p >= 0.5,
    label: isEn() ? (activeFrame.labelEn || activeFrame.label) : activeFrame.label,
    from,
    to,
    alpha,
    sunIntensity: lerpNum(from.sunIntensity, to.sunIntensity),
    hemiIntensity: lerpNum(from.hemiIntensity, to.hemiIntensity),
    darkness: lerpNum(from.darkness, to.darkness),
    sunX: Math.cos(orbit) * 8.5,
    sunY: 8.0 + Math.sin(orbit) * 4.2,
    sunZ: -7.5
  };
}

export function calculateShopPurchaseXp(price) {
  const safePrice = Math.max(0, Math.trunc(Number(price) || 0));
  return Math.round(safePrice * 0.2);
}

export function calculateShopResalePrice(price) {
  const safePrice = Math.max(0, Math.trunc(Number(price) || 0));
  return Math.max(0, Math.floor(safePrice / 2));
}

/**
 * Determine whether a lesson date is completed strictly from explicit Firestore maps
 * (no automatic historical date cutoff).
 */
export function isLessonCompletedFromMaps(approvedMap, overridesMap, dateStr) {
  return Boolean(approvedMap?.[dateStr] || overridesMap?.[dateStr]);
}

/**
 * Extract an 11-character YouTube video ID from a URL or raw ID.
 * Returns null if the input is not a recognized YouTube video reference.
 */
export function parseYouTubeVideoId(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const idPattern = /^[A-Za-z0-9_-]{11}$/;
  if (idPattern.test(text)) return text;

  const candidateUrl = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(candidateUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let extracted = "";
    if (host === "youtu.be") {
      extracted = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (
      host === "youtube.com"
      || host === "m.youtube.com"
      || host === "music.youtube.com"
      || host === "youtube-nocookie.com"
    ) {
      const vParam = parsed.searchParams.get("v");
      if (vParam) {
        extracted = vParam.trim();
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2 && ["shorts", "live", "embed", "v"].includes(parts[0])) {
          extracted = parts[1];
        }
      }
    }
    return idPattern.test(extracted) ? extracted : null;
  } catch {
    return null;
  }
}

export function resolveXpProgress(totalXp, xpPerLevel = 100) {
  const safeTotal = Math.max(0, Math.trunc(Number(totalXp) || 0));
  const safeStep = Math.max(10, Math.min(10000, Math.trunc(Number(xpPerLevel) || 100)));
  const level = Math.floor(safeTotal / safeStep) + 1;
  const rankIndex = Math.min(XP_RANK_LADDER.length - 1, level - 1);
  const nextIndex = Math.min(XP_RANK_LADDER.length - 1, level);
  const rank = XP_RANK_LADDER[rankIndex];
  const nextRank = XP_RANK_LADDER[nextIndex];
  const xpIntoLevel = safeTotal % safeStep;
  const xpToNextLevel = safeStep - xpIntoLevel;
  const progressPct = Math.round((xpIntoLevel / safeStep) * 1000) / 10;
  const en = isEn();
  return {
    totalXp: safeTotal,
    xpPerLevel: safeStep,
    level,
    rankIndex,
    title: en ? (rank.titleEn || rank.title) : rank.title,
    emblem: rank.emblem,
    subtitle: en ? (rank.subtitleEn || rank.subtitle) : rank.subtitle,
    nextTitle: en ? (nextRank.titleEn || nextRank.title) : nextRank.title,
    xpIntoLevel,
    xpToNextLevel,
    progressPct,
    isMaxNamedRank: rankIndex >= XP_RANK_LADDER.length - 1
  };
}

export function sanitizeBoolMap(obj) {
  const map = {};
  if (obj && typeof obj === "object") {
    Object.entries(obj).slice(0, 500).forEach(([k, v]) => {
      if (typeof k === "string" && k) map[k] = Boolean(v);
    });
  }
  return map;
}

export function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getNextMonthFirstEpoch(fromMs = Date.now()) {
  const d = new Date(fromMs);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

export function speakWord(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  // 清理單字文本（拿掉省略號、括號等，只朗讀真實英文詞彙）
  const cleaned = text
    .replace(/\.{2,}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/one's/gi, "someone's")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return;
  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.lang = "en-US";
  utter.rate = 0.88; // 稍微放慢語速，讓國中生聽清細部發音
  window.speechSynthesis.speak(utter);
}

/* 原生輕量 Canvas 紙花（Confetti）動畫系統 */
let confettiParticles = [];
let confettiAnimationId = null;

function getConfettiCanvas() {
  let canvas = document.getElementById("confetti-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    document.body.appendChild(canvas);
  }
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  return canvas;
}

export function launchConfetti(originX, originY, count = 25) {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 4 + Math.random() * 7;
    confettiParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.015
    });
  }
  if (!confettiAnimationId) {
    runConfettiLoop();
  }
}

export function launchFullCelebration() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  launchConfetti(w * 0.25, h * 0.4, 50);
  launchConfetti(w * 0.75, h * 0.4, 50);
}

function runConfettiLoop() {
  const canvas = getConfettiCanvas();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiParticles = confettiParticles.filter(p => p.alpha > 0);

  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25; // 重力
    p.vx *= 0.98; // 阻力
    p.rotation += p.rotationSpeed;
    p.alpha -= p.decay;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });

  if (confettiParticles.length > 0) {
    confettiAnimationId = requestAnimationFrame(runConfettiLoop);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiAnimationId = null;
  }
}

export function isSafeImageUrl(url) {
  if (!url) return false;
  const trimmed = String(url).trim();
  return /^https?:\/\/.+/i.test(trimmed) || /^images\/[a-zA-Z0-9._\-\/]+$/.test(trimmed);
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function showFeedback(elementId, type, message) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = message;
  box.className = `feedback-banner is-${type}`;
}

export function clearFeedback(elementId) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = "";
  box.className = "feedback-banner hidden";
}

export function translateAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/operation-not-allowed":
      return bi(
        "此登入方式尚未在 Firebase Console 啟用，請至 Authentication → Sign-in method 開啟。",
        "This sign-in method isn't enabled in Firebase Console yet."
      );
    case "auth/unauthorized-domain":
      return bi(
        `目前網域（${window.location.hostname || "localhost"}）尚未加入 Firebase 授權網域，請至 Authentication → Settings → Authorized domains 新增。`,
        `Domain (${window.location.hostname || "localhost"}) is not listed in Firebase Authorized domains.`
      );
    case "auth/invalid-email":
      return bi("電子郵件格式不正確，請檢查後再試。", "Please enter a valid email address.");
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return bi("電子郵件或密碼不正確，請再確認一次。", "Incorrect email or password.");
    case "auth/email-already-in-use":
      return bi(
        "此電子郵件已註冊過，請切換至「登入帳號」或使用 Google 登入。",
        "This email is already registered. Switch to Sign In or use Google."
      );
    case "auth/weak-password":
      return bi("密碼強度不足，請設定至少 6 個字元。", "Password is too weak (at least 6 characters).");
    case "auth/too-many-requests":
      return bi("嘗試次數過多，請稍候再試。", "Too many attempts. Please wait a moment and try again.");
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return bi("已取消 Google 登入視窗，若要繼續請重新點擊。", "Google sign-in popup was closed. Click again to continue.");
    case "auth/popup-blocked":
      return bi("瀏覽器封鎖了登入彈跳視窗，請允許彈跳視窗後再試。", "Sign-in popup was blocked by your browser. Please allow popups.");
    case "auth/requires-recent-login":
      return bi("為了帳號安全，請先重新驗證或重新登入後再變更密碼。", "Please sign in again before changing your password.");
    case "auth/network-request-failed":
      return bi("網路連線異常，請檢查網路狀態後重試。", "Network error. Please check your connection and try again.");
    case "permission-denied":
      return bi("權限不足，無法存取該資料。", "Permission denied.");
    default:
      return err?.message
        ? bi(`操作失敗：${err.message}`, `Action failed: ${err.message}`)
        : bi("操作失敗，請稍後再試。", "Action failed. Please try again later.");
  }
}

export function hashString32(input) {
  const str = String(input ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createSeededRng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function nextRand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CHARACTER_PERSONAS = [
  {
    id: "gamer_owl",
    label: "夜貓電玩宅",
    labelEn: "Night-Owl Gamer",
    preferred: ["gaming", "phone", "sofa_tv", "watch_tv", "coffee_break", "eat"],
    nightSleepWeight: 1,
    idleMinSec: 72,
    idleSpanSec: 36,
    thoughtMinSec: 6.5,
    thoughtSpanSec: 6.0,
    walkSpeedScale: 1.05,
    energyRate: 1.12,
    signatureThoughts: [
      "Frame rate is buttery smooth today—one more round!",
      "Alright {name}, clear one quest first, snack second.",
      "Do my keyboards glow brighter at midnight? Yes, definitely!",
      "Secret shortcut unlocked—my reflexes are sharp tonight!"
    ],
    thoughtsByActivity: {
      gaming: [
        "No lag, clean combo—{name} is on fire!",
        "Boss stage incoming! Hands steady on the controller!"
      ],
      phone: [
        "Checking new indie game trailers on my feed!",
        "Wait, that pixel art shader is crazy good!"
      ],
      coffee_break: [
        "Midnight caffeine buff activated!",
        "One cup of dark roast keeps my reaction speed high."
      ]
    }
  },
  {
    id: "cozy_homebody",
    label: "慵懶居家派",
    labelEn: "Cozy Homebody",
    preferred: ["sofa_tv", "sofa_read", "pet_cat", "sleep", "eat", "listen_vinyl"],
    nightSleepWeight: 4,
    idleMinSec: 112,
    idleSpanSec: 44,
    thoughtMinSec: 11.2,
    thoughtSpanSec: 8.8,
    walkSpeedScale: 0.85,
    energyRate: 0.84,
    signatureThoughts: [
      "Zero rush today... soft pillows win every argument.",
      "Honestly, {name}, staying cozy inside is an underrated art.",
      "Soft socks, warm blanket, gentle breeze—pure peace.",
      "Let's move slowly and savor every quiet minute."
    ],
    thoughtsByActivity: {
      sofa_read: [
        "Nothing beats curling up with a gentle chapter.",
        "I could nap right on this cushion anytime..."
      ],
      pet_cat: [
        "Stay right here, kitty—nobody needs to go anywhere.",
        "Warm fluffy fur beats any alarm clock."
      ],
      sleep: [
        "Five more minutes turns into thirty... zzZ...",
        "Best studio corner? Definitely this soft bed!"
      ]
    }
  },
  {
    id: "fitness_sprinter",
    label: "自律元氣派",
    labelEn: "Disciplined Sprinter",
    preferred: ["exercise", "wash", "water_plant", "water_floor_plant", "eat", "check_coat"],
    nightSleepWeight: 2,
    idleMinSec: 64,
    idleSpanSec: 32,
    thoughtMinSec: 7.4,
    thoughtSpanSec: 6.2,
    walkSpeedScale: 1.16,
    energyRate: 1.2,
    signatureThoughts: [
      "Posture check! Shoulders back, {name}, deep breath!",
      "Hydrate, stretch, crush the next drawing sprint!",
      "Movement wakes up my brain faster than coffee!",
      "Clean room, clear mind—every habit counts!"
    ],
    thoughtsByActivity: {
      exercise: [
        "Keep the core tight—{name} never skips warm-ups!",
        "Twenty clean reps before checking the tablet again!"
      ],
      eat: [
        "Good protein and warm veggies keep stamina steady!",
        "Fueling up right so I can draw strong all evening."
      ],
      wash: [
        "Splash cold water, towel dry, full reset!"
      ]
    }
  },
  {
    id: "art_dreamer",
    label: "浪漫靈感家",
    labelEn: "Artistic Dreamer",
    preferred: ["admire_poster", "listen_vinyl", "read", "sofa_read", "water_floor_plant", "coffee_break"],
    nightSleepWeight: 2,
    idleMinSec: 92,
    idleSpanSec: 40,
    thoughtMinSec: 9.6,
    thoughtSpanSec: 8.2,
    walkSpeedScale: 0.93,
    energyRate: 0.92,
    signatureThoughts: [
      "Notice how afternoon shadows turn lavender along that wall?",
      "Ooh, that melody sounds like a pastel sunset, {name}.",
      "Every tiny corner in this studio holds a color palette.",
      "Daydreaming counts as creative research, right?"
    ],
    thoughtsByActivity: {
      admire_poster: [
        "That brush texture still gives me butterflies!",
        "Warm ochre beside slate blue—{name}, remember that pairing!"
      ],
      listen_vinyl: [
        "Analog warmth softens every thought in the room.",
        "I paint better whenever jazz vinyl is spinning."
      ],
      read: [
        "Just one sketchbook page can spark ten new scenes."
      ]
    }
  },
  {
    id: "caffeine_crafter",
    label: "咖啡因畫師",
    labelEn: "Caffeine Crafter",
    preferred: ["coffee_break", "read", "water_plant", "phone", "gaming", "listen_vinyl"],
    nightSleepWeight: 1,
    idleMinSec: 78,
    idleSpanSec: 36,
    thoughtMinSec: 8.0,
    thoughtSpanSec: 7.0,
    walkSpeedScale: 1.09,
    energyRate: 1.07,
    signatureThoughts: [
      "Deadline countdown keeps {name} weirdly sharp!",
      "Step 1: pour coffee. Step 2: fix layer masks. Step 3: thrive!",
      "Organized brushes equal calm mornings!",
      "Maybe I should test a bolder shadow tone next piece."
    ],
    thoughtsByActivity: {
      coffee_break: [
        "Second pour-over of the shift—now we're talking!",
        "Steady hand for pouring, steady hand for line art!"
      ],
      work: [
        "Layers labeled, values balanced—{name} stays pro!",
        "One crisp highlight right on the rim... perfection."
      ],
      water_plant: [
        "Both this desk plant and I need fresh hydration today."
      ]
    }
  },
  {
    id: "curious_spark",
    label: "好奇觀察家",
    labelEn: "Curious Observer",
    preferred: ["pet_cat", "watch_hamster", "check_coat", "admire_poster", "watch_tv", "eat", "toilet"],
    nightSleepWeight: 2,
    idleMinSec: 68,
    idleSpanSec: 34,
    thoughtMinSec: 6.8,
    thoughtSpanSec: 6.4,
    walkSpeedScale: 1.07,
    energyRate: 1.14,
    signatureThoughts: [
      "Wait—did I leave my favorite pen by the sofa again?",
      "Hey! Has anyone ever noticed how cozy this room sounds, {name}?",
      "Always discovering fun little details around the house!",
      "Hmm, should I rearrange the rug next weekend?"
    ],
    thoughtsByActivity: {
      check_coat: [
        "Pocket check: sketchbook, mints, spare stylus nibs!",
        "Maybe a quick breeze outside will spark a weird idea."
      ],
      watch_tv: [
        "Wait, pause! That documentary narrator has the coolest facts!"
      ],
      floor_stand: [
        "Standing right here gives {name} the best room view!"
      ]
    }
  }
];

export function listAvailableRoomActivities(ownedItems = {}, isNightTime = false) {
  const owned = ownedItems || {};
  const hasSofa = hasOwnedSofa(owned);
  const readActivity = hasSofa ? "sofa_read" : "read";
  const activities = ["phone", "exercise", readActivity, "eat", "gaming"];
  if (isNightTime) {
    activities.push("sleep");
  }
  if (hasSofa && owned.wall_tv) {
    activities.push("sofa_tv");
  } else if (owned.wall_tv) {
    activities.push("watch_tv");
  }
  if (owned.desk_plant) activities.push("water_plant");
  if (owned.wall_poster) activities.push("admire_poster");
  if (owned.coat_rack) activities.push("check_coat");
  if (owned.coffee_bar) activities.push("coffee_break");
  if (owned.vinyl_player) activities.push("listen_vinyl");
  if (owned.orange_cat) activities.push("pet_cat");
  if (owned.hamster_cage) activities.push("watch_hamster");
  if (owned.floor_plant) activities.push("water_floor_plant");
  return activities;
}

export function buildCharacterPersona(characterId, avatarCfg = {}, ownedItems = {}) {
  const rawId = String(characterId || avatarCfg?.name || "self").trim() || "self";
  const seed = hashString32(rawId);
  const rng = createSeededRng(seed ^ 0x517cc1b7);
  const archetype = CHARACTER_PERSONAS[seed % CHARACTER_PERSONAS.length];
  const allPool = listAvailableRoomActivities(ownedItems, false);
  const personalSpotId = allPool[Math.floor(rng() * allPool.length)] || archetype.preferred[0];
  const displayName = String(avatarCfg?.name || bi("繪師", "Artist")).trim() || bi("繪師", "Artist");

  const speedJitter = 0.96 + rng() * 0.08;
  const energyJitter = 0.94 + rng() * 0.12;
  const thoughtJitter = (rng() - 0.5) * 2.2;

  const formatLine = (line) => String(line || "").replace(/\{name\}/g, displayName);

  const thoughtsByActivity = {};
  for (const [k, lines] of Object.entries(archetype.thoughtsByActivity || {})) {
    thoughtsByActivity[k] = lines.map(formatLine);
  }

  return {
    id: archetype.id,
    label: isEn() ? (archetype.labelEn || archetype.label) : archetype.label,
    characterId: rawId,
    seed,
    displayName,
    preferred: [...archetype.preferred],
    personalSpotId,
    nightSleepWeight: archetype.nightSleepWeight,
    idleMinSec: Math.round(archetype.idleMinSec * (0.9 + rng() * 0.2)),
    idleSpanSec: archetype.idleSpanSec,
    thoughtMinSec: Math.max(5.5, archetype.thoughtMinSec + thoughtJitter),
    thoughtSpanSec: archetype.thoughtSpanSec,
    walkSpeedScale: Number((archetype.walkSpeedScale * speedJitter).toFixed(3)),
    energyRate: Number((archetype.energyRate * energyJitter).toFixed(3)),
    animPhaseOffset: Number((rng() * 120).toFixed(2)),
    signatureThoughts: archetype.signatureThoughts.map(formatLine),
    thoughtsByActivity
  };
}

export function pickPersonaWeightedActivity(
  persona,
  ownedItems = {},
  isNightTime = false,
  excludeActivityId = null,
  randFn = Math.random
) {
  const pool = listAvailableRoomActivities(ownedItems, isNightTime);
  const filtered = pool.filter(id => id !== excludeActivityId);
  const candidates = filtered.length > 0 ? filtered : pool;

  const preferredSet = new Set(persona?.preferred || []);
  const personalId = persona?.personalSpotId || "";
  const nightSleepW = Number(persona?.nightSleepWeight) || 2;

  const weighted = candidates.map(id => {
    let weight = 1;
    if (preferredSet.has(id)) weight += 2.2;
    if (id === personalId) weight += 1.6;
    if (id === "sofa_tv") weight += 1.4;
    if (id === "sleep") {
      weight = isNightTime ? (weight + nightSleepW) : 0.4;
    }
    return { id, weight };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return candidates[0] || "phone";
  let roll = randFn() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.id;
  }
  return weighted[weighted.length - 1].id;
}

export function evaluateProfileRentMood(
  profile,
  role = "student",
  { monthlyRentClams = 600, starterClams = 500, monthKey = "", nowMs = Date.now(), fallbackDueAt = nowMs + 86400000 * 30 } = {}
) {
  const dueAt = Number(profile?.nextRentDueAt || fallbackDueAt);
  const msLeft = dueAt - nowMs;
  const isDue = msLeft <= 0;
  const clams = Math.max(0, Math.trunc(Number(profile?.clams ?? starterClams)));
  const isSuperAdmin = role === "super_admin";
  const hasRentAlert = Boolean(isDue && !isSuperAdmin);
  const daysLeft = isDue ? 0 : Math.max(1, Math.ceil(msLeft / 86400000));
  const paidThisMonth = Boolean(profile?.lastRentPaidMonth && monthKey && profile.lastRentPaidMonth === monthKey);
  const deficit = Math.max(0, monthlyRentClams - clams);
  const status = (!isSuperAdmin && (isDue || (daysLeft <= 5 && deficit > 0)))
    ? "urgent"
    : (paidThisMonth && daysLeft >= 20)
    ? "paid"
    : "chill";
  return { status, isDue, hasRentAlert, daysLeft, msLeft, deficit, paidThisMonth, clams, isSuperAdmin };
}

const VALID_NAV_SCREENS = new Set(["room", "desktop", "lesson", "onboarding"]);
const VALID_NAV_MODALS = new Set(["shop", "finance", "settings", "poster", "tv", "adminReview", "trackChooser"]);
const VALID_FINANCE_FILTERS = new Set(["all", "expense", "income"]);
const VALID_WORK_TRACKS = new Set(["student", "ielts"]);

export function normalizeSavedNavState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const screen = VALID_NAV_SCREENS.has(raw.screen) ? raw.screen : "room";
  const lessonDate = (screen === "lesson" && typeof raw.lessonDate === "string" && raw.lessonDate.trim())
    ? raw.lessonDate.trim()
    : null;
  const modal = VALID_NAV_MODALS.has(raw.modal) ? raw.modal : null;
  const shopCategory = (typeof raw.shopCategory === "string" && raw.shopCategory.trim())
    ? raw.shopCategory.trim()
    : "all";
  const financeMonth = (typeof raw.financeMonth === "string" && /^\d{4}-\d{2}$/.test(raw.financeMonth.trim()))
    ? raw.financeMonth.trim()
    : "";
  const workTrack = VALID_WORK_TRACKS.has(raw.workTrack) ? raw.workTrack : "student";
  const scrollRaw = Math.trunc(Number(raw.scrollY));
  return {
    screen: (screen === "lesson" && !lessonDate) ? "desktop" : screen,
    lessonDate,
    workTrack,
    isEditingAvatar: screen === "onboarding" ? Boolean(raw.isEditingAvatar) : false,
    modal,
    shopCategory,
    shopResellOnly: Boolean(raw.shopResellOnly),
    financeFilter: VALID_FINANCE_FILTERS.has(raw.financeFilter) ? raw.financeFilter : "all",
    financeMonth,
    spectatingUid: (typeof raw.spectatingUid === "string" && raw.spectatingUid.trim()) ? raw.spectatingUid.trim() : null,
    reviewStudentUid: (typeof raw.reviewStudentUid === "string" && raw.reviewStudentUid.trim()) ? raw.reviewStudentUid.trim() : null,
    scrollY: Number.isFinite(scrollRaw) && scrollRaw > 0 ? scrollRaw : 0
  };
}

/**
 * Determine which unit index on the Quest Map represents the user's latest progress frontier.
 */
export function resolveQuestProgressTargetIndex({
  lessons = [],
  completedDates = null,
  isSubmittedFn = null,
  hasEarnedXpFn = null,
  hasSavedAnswersFn = null,
  lastVisitedDate = "",
  role = "student",
  totalXp = 0,
  defaultLessonXp = 40
} = {}) {
  const total = Array.isArray(lessons) ? lessons.length : 0;
  if (total === 0) return -1;

  const completed = completedDates instanceof Set ? completedDates : new Set();
  let highestDoneIdx = -1;
  let highestSavedIdx = -1;

  for (let i = 0; i < total; i++) {
    const dateStr = lessons[i]?.Date || "";
    const hasDone =
      completed.has(dateStr) ||
      Boolean(isSubmittedFn?.(dateStr)) ||
      Boolean(hasEarnedXpFn?.(dateStr));
    if (hasDone) highestDoneIdx = i;

    if (Boolean(hasSavedAnswersFn?.(dateStr))) {
      highestSavedIdx = i;
    }
  }

  if (highestSavedIdx > highestDoneIdx) {
    return highestSavedIdx;
  }
  if (highestDoneIdx >= 0) {
    return Math.min(highestDoneIdx + 1, total - 1);
  }

  if (lastVisitedDate) {
    const visitedIdx = lessons.findIndex(l => l?.Date === lastVisitedDate);
    if (visitedIdx >= 0) return visitedIdx;
  }

  if (role === "super_admin" || role === "admin") {
    return total - 1;
  }

  const safeXp = Number(totalXp || 0);
  const unitXp = Math.max(1, Number(defaultLessonXp || 40));
  if (safeXp >= unitXp) {
    return Math.min(Math.floor(safeXp / unitXp), total - 1);
  }

  return 0;
}

/**
 * Format duration in seconds concisely for the teacher review panel.
 */
export function formatExamDuration(rawSec) {
  const sec = Math.max(0, Math.trunc(Number(rawSec) || 0));
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  if (hours > 0) {
    return bi(`${hours}時 ${mins}分 ${remSec}秒`, `${hours}h ${mins}m ${remSec}s`);
  }
  if (mins > 0) {
    return bi(`${mins}分 ${remSec}秒`, `${mins}m ${remSec}s`);
  }
  return bi(`${remSec}秒`, `${remSec}s`);
}

/**
 * Sanitize and classify a student's submission telemetry for the teacher review dialog.
 */
export function evaluateSubmissionMetrics(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const firstTryTotal = Math.max(0, Math.min(1000, Math.trunc(Number(raw.firstTryTotal) || 0)));
  const firstTryCorrect = Math.max(0, Math.min(firstTryTotal, Math.trunc(Number(raw.firstTryCorrect) || 0)));
  const totalClicks = Math.max(0, Math.min(50000, Math.trunc(Number(raw.totalClicks) || 0)));
  const elapsedSec = Math.max(0, Math.min(86400, Math.trunc(Number(raw.elapsedSec) || 0)));
  const retryCount = Math.max(0, Math.min(1000, Math.trunc(Number(raw.retryCount) || 0)));
  const submittedAt = Math.max(0, Math.trunc(Number(raw.submittedAt) || 0));

  const firstTryPct = firstTryTotal > 0 ? Math.round((firstTryCorrect / firstTryTotal) * 100) : null;
  const clicksPerQuestion = firstTryTotal > 0 ? Math.round((totalClicks / firstTryTotal) * 100) / 100 : 0;
  const secPerQuestion = firstTryTotal > 0 ? Math.round((elapsedSec / firstTryTotal) * 10) / 10 : 0;

  let level = "good";
  let badgeText = bi("🟢 作答正常", "🟢 Normal Pace");
  let summaryHint = bi("首次作答率與作答節奏正常，可安心驗收發放英蚌。", "First-try accuracy and pacing look solid for approval.");

  if (firstTryTotal === 0) {
    level = "neutral";
    badgeText = bi("📋 閱讀單元", "📋 Reading Unit");
    summaryHint = bi("本單元無選擇題記錄，僅統計停留與完成時間。", "No quiz items recorded; showing active study time.");
  } else if ((firstTryTotal >= 3 && secPerQuestion < 4) || (firstTryPct < 55 && clicksPerQuestion >= 1.8)) {
    level = "alert";
    badgeText = bi("🔴 疑似速通", "🔴 Speedrun Alert");
    summaryHint = secPerQuestion < 4
      ? bi(`平均每題僅 ${secPerQuestion} 秒，作答時間偏短，建議檢視或退回確認。`, `Only ${secPerQuestion}s per question on average; consider requesting revision.`)
      : bi(`首次答對率僅 ${firstTryPct}% 且每題平均點擊 ${clicksPerQuestion} 次，疑似連續試錯猜答案。`, `First-try accuracy ${firstTryPct}% with ${clicksPerQuestion} clicks/question suggests trial-and-error guessing.`);
  } else if (firstTryPct < 75 || clicksPerQuestion > 1.6 || retryCount >= 3) {
    level = "caution";
    badgeText = bi("🟡 建議留意", "🟡 Needs Check");
    summaryHint = bi("首次答對率略低或嘗試／重考次數較多，建議確認學生理解後再發放。", "Lower first-try accuracy or multiple retries; verify comprehension before paying.");
  }

  return {
    firstTryCorrect,
    firstTryTotal,
    firstTryPct,
    totalClicks,
    elapsedSec,
    retryCount,
    submittedAt,
    clicksPerQuestion,
    secPerQuestion,
    durationText: formatExamDuration(elapsedSec),
    level,
    badgeText,
    summaryHint
  };
}

const IELTS_UK_TO_US_MAP = {
  aluminium: "aluminum",
  analyse: "analyze",
  analysed: "analyzed",
  apologise: "apologize",
  apologised: "apologized",
  behaviour: "behavior",
  behaviours: "behaviors",
  cancelled: "canceled",
  catalogue: "catalog",
  catalogues: "catalogs",
  centre: "center",
  centres: "centers",
  cheque: "check",
  cheques: "checks",
  colour: "color",
  colours: "colors",
  defence: "defense",
  dialogue: "dialog",
  dialogues: "dialogs",
  favour: "favor",
  favourite: "favorite",
  favourites: "favorites",
  fibre: "fiber",
  fibres: "fibers",
  grey: "gray",
  honour: "honor",
  humour: "humor",
  jewellery: "jewelry",
  kilometre: "kilometer",
  kilometres: "kilometers",
  labour: "labor",
  licence: "license",
  litre: "liter",
  litres: "liters",
  metre: "meter",
  metres: "meters",
  neighbour: "neighbor",
  neighbours: "neighbors",
  organisation: "organization",
  organisations: "organizations",
  organise: "organize",
  organised: "organized",
  practise: "practice",
  practised: "practiced",
  programme: "program",
  programmes: "programs",
  pyjamas: "pajamas",
  recognise: "recognize",
  recognised: "recognized",
  rumour: "rumor",
  theatre: "theater",
  theatres: "theaters",
  travelled: "traveled",
  travelling: "traveling"
};

const IELTS_SMALL_NUM_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
];
const IELTS_TENS_WORDS = {
  20: "twenty", 30: "thirty", 40: "forty", 50: "fifty",
  60: "sixty", 70: "seventy", 80: "eighty", 90: "ninety"
};

function intToSimpleIeltsWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999000) return null;
  if (n < 20) return IELTS_SMALL_NUM_WORDS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const rem = n % 10;
    return rem === 0 ? IELTS_TENS_WORDS[tens] : `${IELTS_TENS_WORDS[tens]} ${IELTS_SMALL_NUM_WORDS[rem]}`;
  }
  if (n < 1000 && n % 100 === 0) {
    return `${IELTS_SMALL_NUM_WORDS[n / 100]} hundred`;
  }
  if (n >= 1000 && n % 1000 === 0) {
    const k = n / 1000;
    const prefix = intToSimpleIeltsWords(k);
    return prefix ? `${prefix} thousand` : null;
  }
  return null;
}

const IELTS_WORDS_TO_INT = new Map();
for (let i = 0; i <= 99; i += 1) {
  const w = intToSimpleIeltsWords(i);
  if (w) IELTS_WORDS_TO_INT.set(w, i);
}
for (let k = 1; k <= 999; k += 1) {
  const n = k * 1000;
  const w = intToSimpleIeltsWords(n);
  if (w) IELTS_WORDS_TO_INT.set(w, n);
}

const IELTS_CURRENCY_UNITS = {
  $: { singular: "dollar", plural: "dollars" },
  "£": { singular: "pound", plural: "pounds" },
  "€": { singular: "euro", plural: "euros" }
};

/**
 * Normalize an IELTS text/option response per official IELTS marking conventions
 * (case-insensitive, standard thousands commas stripped while rejecting "." separators,
 * leading currency symbol spacing, UK/US spelling unification).
 */
export function normalizeIeltsAnswer(raw) {
  let out = String(raw || "")
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/([$£€])\s+/g, "$1")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  // Official IELTS accepts standard English thousands commas (50,000 === 50000),
  // whereas European period separators (50.000) remain distinct and wrong.
  let prev;
  do {
    prev = out;
    out = out.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
  } while (out !== prev);

  // Unify UK and US standard spellings (IELTS accepts both)
  out = out.replace(/\b[a-z]+\b/g, w => IELTS_UK_TO_US_MAP[w] || w);
  return out;
}

/**
 * Expand a canonical IELTS answer candidate with equivalent official IELTS formats:
 * - Leading currency symbol <-> number + dollar(s)/pound(s)/euro(s)
 * - Simple whole-number digits <-> English number words (e.g. 5 <-> five, 50000 <-> fifty thousand)
 */
function expandIeltsAcceptedVariants(rawCandidate) {
  const norm = normalizeIeltsAnswer(rawCandidate);
  if (!norm) return [];
  const variants = new Set([norm]);

  // 1. Symbol currency -> word currency (e.g. "$50,000" -> "50000 dollars", "fifty thousand dollars")
  const curSymMatch = norm.match(/^([$£€])(\d+(?:\.\d+)?)$/);
  if (curSymMatch) {
    const sym = curSymMatch[1];
    const numStr = curSymMatch[2];
    const unitMeta = IELTS_CURRENCY_UNITS[sym];
    if (unitMeta) {
      const unitWord = Number(numStr) === 1 ? unitMeta.singular : unitMeta.plural;
      variants.add(`${numStr} ${unitWord}`);
      if (/^\d+$/.test(numStr)) {
        const asWords = intToSimpleIeltsWords(Number(numStr));
        if (asWords) variants.add(`${asWords} ${unitWord}`);
      }
    }
  }

  // 2. Word currency -> symbol & word/digit forms (e.g. "50000 dollars" <-> "$50000" <-> "fifty thousand dollars")
  const curWordMatch = norm.match(/^(.+?)\s+(dollars?|pounds?|euros?)$/);
  if (curWordMatch) {
    const qtyRaw = curWordMatch[1].trim();
    const unitTok = curWordMatch[2];
    const sym = unitTok.startsWith("dollar") ? "$" : unitTok.startsWith("pound") ? "£" : "€";
    const unitMeta = IELTS_CURRENCY_UNITS[sym];
    if (/^\d+(?:\.\d+)?$/.test(qtyRaw)) {
      variants.add(`${sym}${qtyRaw}`);
      if (/^\d+$/.test(qtyRaw)) {
        const asWords = intToSimpleIeltsWords(Number(qtyRaw));
        const unitWord = Number(qtyRaw) === 1 ? unitMeta.singular : unitMeta.plural;
        if (asWords) variants.add(`${asWords} ${unitWord}`);
      }
    } else if (IELTS_WORDS_TO_INT.has(qtyRaw.replace(/-/g, " "))) {
      const n = IELTS_WORDS_TO_INT.get(qtyRaw.replace(/-/g, " "));
      const unitWord = n === 1 ? unitMeta.singular : unitMeta.plural;
      variants.add(`${sym}${n}`);
      variants.add(`${n} ${unitWord}`);
    }
  }

  // 3. Standalone small/round numbers or short phrases starting/ending with simple numerals (e.g. "4 weeks" <-> "four weeks")
  const normNoNumHyphen = norm.replace(/-/g, " ");
  if (/^\d+$/.test(norm)) {
    const w = intToSimpleIeltsWords(Number(norm));
    if (w) variants.add(w);
  } else if (IELTS_WORDS_TO_INT.has(normNoNumHyphen)) {
    variants.add(String(IELTS_WORDS_TO_INT.get(normNoNumHyphen)));
  } else {
    const leadNum = norm.match(/^(\d+)\s+(.+)$/);
    if (leadNum) {
      const w = intToSimpleIeltsWords(Number(leadNum[1]));
      if (w) variants.add(`${w} ${leadNum[2]}`);
    } else {
      for (const [wordForm, intVal] of IELTS_WORDS_TO_INT.entries()) {
        if (normNoNumHyphen.startsWith(`${wordForm} `)) {
          variants.add(`${intVal} ${normNoNumHyphen.slice(wordForm.length + 1)}`);
          break;
        }
      }
    }
  }

  return Array.from(variants);
}

function parseMultiLetterTokens(raw) {
  return [...new Set(
    String(raw || "")
      .toUpperCase()
      .split(/[\s,&]+|\band\b/i)
      .map(s => s.trim())
      .filter(s => /^[A-Z0-9]+$/.test(s))
  )].sort();
}

/**
 * Grade an entire IELTS GT Reading attempt with support for:
 * - multiple accepted variants (`|`)
 * - unordered pairs via `Order_Group` (prevents double-dipping identical letters)
 * - two-letter MULTI2 items (`A,B` / `B AND A`)
 */
export function gradeIeltsExam(questions = [], userAnswersMap = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const answers = (userAnswersMap && typeof userAnswersMap === "object") ? userAnswersMap : {};

  // Pre-seed pools for unordered paired questions (e.g., Q6 & Q7 accepting D or I in either order)
  const orderGroupPools = new Map();
  list.forEach((q, idx) => {
    const grp = String(q?.Order_Group || "").trim();
    if (!grp || orderGroupPools.has(grp)) return;
    const pool = String(q?.Answer || "")
      .split("|")
      .map(v => normalizeIeltsAnswer(v))
      .filter(Boolean);
    orderGroupPools.set(grp, pool);
  });

  const results = [];
  let correctCount = 0;

  list.forEach((q, idx) => {
    const key = String(idx);
    const rawUser = String(answers[key] || "").trim();
    const qType = String(q?.Type || "").trim().toUpperCase();
    const acceptedRawList = String(q?.Answer || "")
      .split("|")
      .map(s => s.trim())
      .filter(Boolean);
    const primaryAnswer = acceptedRawList[0] || "";
    const orderGrp = String(q?.Order_Group || "").trim();

    let isCorrect = false;
    if (rawUser) {
      if (qType === "MULTI2") {
        const userTokens = parseMultiLetterTokens(rawUser);
        isCorrect = acceptedRawList.some(cand => {
          const expectedTokens = parseMultiLetterTokens(cand);
          return expectedTokens.length > 0 &&
            userTokens.length === expectedTokens.length &&
            userTokens.every((tok, ti) => tok === expectedTokens[ti]);
        });
      } else if (orderGrp && orderGroupPools.has(orderGrp)) {
        const pool = orderGroupPools.get(orderGrp);
        const normUser = normalizeIeltsAnswer(rawUser);
        const matchIdx = pool.indexOf(normUser);
        if (matchIdx !== -1) {
          pool.splice(matchIdx, 1);
          isCorrect = true;
        }
      } else {
        const normUser = normalizeIeltsAnswer(rawUser);
        isCorrect = acceptedRawList.some(cand => expandIeltsAcceptedVariants(cand).includes(normUser));
      }
    }

    if (isCorrect) correctCount += 1;

    results.push({
      index: idx,
      qNum: Number(q?.Q_Num || idx + 1),
      isCorrect,
      isAnswered: rawUser.length > 0,
      userAnswer: rawUser,
      primaryAnswer,
      acceptedDisplay: acceptedRawList.join(" / ")
    });
  });

  const total = list.length;
  const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { total, correctCount, accuracyPct, results };
}

/**
 * Format a copy-ready Gemini review prompt including passages, question breakdown,
 * user vs official answers, timing, and score log instructions.
 */
export function buildIeltsGeminiReviewPrompt({
  testMeta = {},
  questions = [],
  gradeResult = null,
  elapsedSec = 0,
  scoreSheetUrl = "https://docs.google.com/spreadsheets/d/1cfru4X_afjJH15CeG6My7DZbneDbW6jETrMER9P4HH0/edit"
} = {}) {
  const result = gradeResult || gradeIeltsExam(questions, {});
  const durationLabel = formatExamDuration(elapsedSec);
  const testTitle = testMeta.Title || `IELTS GT Reading Test ${testMeta.Test_Num || ""}`;
  const todayIso = new Date().toISOString().slice(0, 10);

  const lines = [
    "請幫我擔任雅思（IELTS General Training Reading）專業家教，根據以下我的實戰作答紀錄進行分析與檢討：",
    "",
    "### 一、測驗基本紀錄",
    `- 測驗名稱：${testTitle}`,
    `- 測驗日期：${todayIso}`,
    `- 作答得分：${result.correctCount} / ${result.total} 題（正確率 ${result.accuracyPct}%）`,
    `- 作答耗時：${durationLabel}（${Math.max(0, Math.trunc(elapsedSec))} 秒）`,
    "",
    "### 二、每題作答明細（題目 / 我的答案 / 正確答案 / 結果）"
  ];

  questions.forEach((q, idx) => {
    const r = result.results[idx] || {};
    const statusTag = !r.isAnswered ? "[— 未作答]" : r.isCorrect ? "[✓ 正確]" : "[✗ 錯題]";
    const userDisplay = r.isAnswered ? r.userAnswer : "(空白)";
    const qText = String(q?.Question || "").replace(/\s+/g, " ").trim();
    lines.push(
      `Q${r.qNum || idx + 1} (${q?.Type || "Q"}) ${statusTag} ${qText}\n  - 我的答案：${userDisplay} ｜ 標準答案：${r.acceptedDisplay || r.primaryAnswer}`
    );
  });

  lines.push("", "### 三、文章原文（請直接從以下原文擷取證據講解錯題）");
  [1, 2, 3].forEach(secNum => {
    const secTitle = testMeta[`Section_${secNum}_Title`];
    const secBody = testMeta[`Section_${secNum}_Body`];
    if (secTitle || secBody) {
      lines.push(`\n[Section ${secNum}] ${secTitle || ""}\n${String(secBody || "").trim()}`);
    }
  });

  lines.push(
    "",
    "### 四、請你幫我完成以下任務",
    "1. **Band Score 落點分析**：依 IELTS General Training Reading 官方標準（40題對題換算）估算本次 Band Score，並評估本次作答耗時相對於正式考試 60 分鐘的節奏分配建議。",
    "2. **錯題深度檢討（詳解）**：針對每一題 `[✗ 錯題]` 與 `[— 未作答]`，引用上方原文關鍵句指出正確解答與思考路徑，並說明我寫錯的原因（例如同義替換沒認出、True/False vs Not Given 混淆、單複數／字數限制等）。",
    "3. **弱點題型統計與下次調整方向**：點出我這次表現最弱的題型與下次練習重點。",
    `4. **產生 Google Sheet 紀錄列**：整理一列可直接複製貼上到我個人成績紀錄表（${scoreSheetUrl}）的表格列（包含日期、Test 編號、對題數、耗時、預估 Band、本次錯題重點摘要），並協助／指引寫入該紀錄表。`
  );

  return lines.join("\n");
}
