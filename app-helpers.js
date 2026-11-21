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
  { title: "默默無名", emblem: "🪨", subtitle: "剛踏進接案江湖，連阿橘都還不認識你" },
  { title: "初出茅廬", emblem: "🌱", subtitle: "熬過首月房租，開始有人私訊問檔期" },
  { title: "略懂皮毛", emblem: "✏️", subtitle: "筆刷手感回穩，草稿不再狂被退件" },
  { title: "小試牛刀", emblem: "🔪", subtitle: "急件準時交稿，累積第一批回頭客" },
  { title: "漸入佳境", emblem: "🎨", subtitle: "光影配色開竅，甲方修改少了一半" },
  { title: "略有名氣", emblem: "🏮", subtitle: "設計圈傳開筆名，週末檔期悄悄排滿" },
  { title: "小有名堂", emblem: "✨", subtitle: "新作常被轉傳，小套房藏著神秘畫手" },
  { title: "名聲初顯", emblem: "📜", subtitle: "商業案主指名合作，不用再到處投履歷" },
  { title: "嶄露頭角", emblem: "⚔️", subtitle: "大型企劃邀約不斷，報價更有底氣" },
  { title: "聲名鵲起", emblem: "🦅", subtitle: "新作一出衝熱搜，信箱天天塞滿合作" },
  { title: "獨當一面", emblem: "🛡️", subtitle: "再刁鑽的英語專題，都能單人收工" },
  { title: "名動一城", emblem: "🏯", subtitle: "全城創意總監都收藏了你的作品集" },
  { title: "爐火純青", emblem: "🔥", subtitle: "下筆如劍客出招，線條乾脆毫無多餘" },
  { title: "登堂入室", emblem: "🏛️", subtitle: "心法修至上乘，草圖都能直接當海報" },
  { title: "聲振林木", emblem: "🌩️", subtitle: "展覽人潮擠爆，連房東都主動打招呼" },
  { title: "威震四方", emblem: "🐉", subtitle: "各地出版商樓下排隊，只求一張檔期" },
  { title: "名滿江湖", emblem: "🌟", subtitle: "畫界人人傳頌的宗師，筆落驚風雨" },
  { title: "一代宗師", emblem: "🥋", subtitle: "開創專屬畫風，無數新手臨摹你的筆法" },
  { title: "天下無雙", emblem: "👑", subtitle: "速度、語意與質感，當世已難逢對手" },
  { title: "武林盟主", emblem: "🏆", subtitle: "號令接案圈，甲方見你先雙手奉茶" },
  { title: "登峰造極", emblem: "⛰️", subtitle: "境界超越凡人尺度，隨手一筆皆藏品" },
  { title: "傲視群雄", emblem: "🦅", subtitle: "高處不勝寒，唯手沖、黑膠與阿橘相伴" },
  { title: "破碎虛空", emblem: "⚡", subtitle: "電繪筆金光乍現，靈感跨次元具現" },
  { title: "飛升成仙", emblem: "☁️", subtitle: "房租已成浮雲，你早靠畫筆悟道成仙" },
  { title: "畫道聖尊", emblem: "🌀", subtitle: "美術館搶收你磨短的筆芯與草稿紙" },
  { title: "超凡入聖", emblem: "🪽", subtitle: "單字文法皆化內力，心念一動成神作" },
  { title: "萬古神話", emblem: "🌌", subtitle: "插畫史第一章，只寫著你的名號與房號" },
  { title: "太古獨尊·無敵寂寞", emblem: "🪩", subtitle: "宇宙星雲都照你的色票調色" }
];

export function calculateShopPurchaseXp(price) {
  const safePrice = Math.max(0, Math.trunc(Number(price) || 0));
  return Math.round(safePrice * 0.2);
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
  return {
    totalXp: safeTotal,
    xpPerLevel: safeStep,
    level,
    rankIndex,
    title: rank.title,
    emblem: rank.emblem,
    subtitle: rank.subtitle,
    nextTitle: nextRank.title,
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
      return "此登入方式尚未在 Firebase Console 啟用，請至 Authentication → Sign-in method 開啟。";
    case "auth/unauthorized-domain":
      return `目前網域（${window.location.hostname || "localhost"}）尚未加入 Firebase 授權網域，請至 Authentication → Settings → Authorized domains 新增。`;
    case "auth/invalid-email":
      return "電子郵件格式不正確，請檢查後再試。";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "電子郵件或密碼不正確，請再確認一次。";
    case "auth/email-already-in-use":
      return "此電子郵件已註冊過，請切換至「登入帳號」或使用 Google 登入。";
    case "auth/weak-password":
      return "密碼強度不足，請設定至少 6 個字元。";
    case "auth/too-many-requests":
      return "嘗試次數過多，請稍候再試。";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "已取消 Google 登入視窗，若要繼續請重新點擊。";
    case "auth/popup-blocked":
      return "瀏覽器封鎖了登入彈跳視窗，請允許彈跳視窗後再試。";
    case "auth/requires-recent-login":
      return "為了帳號安全，請先重新驗證或重新登入後再變更密碼。";
    case "auth/network-request-failed":
      return "網路連線異常，請檢查網路狀態後重試。";
    case "permission-denied":
      return "權限不足，無法存取該資料。";
    default:
      return err?.message ? `操作失敗：${err.message}` : "操作失敗，請稍後再試。";
  }
}
