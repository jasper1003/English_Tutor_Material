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
  { title: "默默無名", emblem: "🪨", subtitle: "剛踏進接案江湖的新手繪師，連隔壁阿橘都還沒記住你" },
  { title: "初出茅廬", emblem: "🌱", subtitle: "順利熬過第一個月房租，開始有零星案主私訊問檔期" },
  { title: "略懂皮毛", emblem: "✏️", subtitle: "筆刷手感逐漸穩定，草稿不再被退件退到手軟" },
  { title: "小試牛刀", emblem: "🔪", subtitle: "連趕幾張急件也能準時交稿，累積第一批固定回頭客" },
  { title: "漸入佳境", emblem: "🎨", subtitle: "光影與配色突然開竅，甲方的修改意見少了一大半" },
  { title: "略有名氣", emblem: "🏮", subtitle: "設計圈開始聽過你的筆名，周末接案排程悄悄排滿" },
  { title: "小有名堂", emblem: "✨", subtitle: "作品截圖常被轉傳討論，小套房裡住著一位神秘畫手" },
  { title: "名聲初顯", emblem: "📜", subtitle: "商業插畫案主開始指名合作，不用再到處投履歷" },
  { title: "嶄露頭角", emblem: "⚔️", subtitle: "大型企劃點名邀約封面繪製，報價單底氣越來越足" },
  { title: "聲名鵲起", emblem: "🦅", subtitle: "每次發佈新作就衝上討論榜，收件匣每天塞滿合作信" },
  { title: "獨當一面", emblem: "🛡️", subtitle: "再刁鑽的高難度英語專題與畫風切換，都能單人完美過關" },
  { title: "名動一城", emblem: "🏯", subtitle: "整座城市的創意總監都收藏了你的電繪作品集" },
  { title: "爐火純青", emblem: "🔥", subtitle: "下筆如劍客出招乾脆俐落，每一條線都毫無猶豫" },
  { title: "登堂入室", emblem: "🏛️", subtitle: "畫技心法已修至上乘，隨手草圖都能拿去當展覽海報" },
  { title: "聲振林木", emblem: "🌩️", subtitle: "個展現場人潮擠爆巷口，創作氣場連房東都主動打招呼" },
  { title: "威震四方", emblem: "🐉", subtitle: "東西南北出版商齊聚租屋處樓下，只求排到你明年的檔期" },
  { title: "名滿江湖", emblem: "🌟", subtitle: "美術江湖人人傳頌的傳奇插畫宗師，筆落驚風雨" },
  { title: "一代宗師", emblem: "🥋", subtitle: "開創專屬流派畫風，無數新手畫師把你的圖當教材臨摹" },
  { title: "天下無雙", emblem: "👑", subtitle: "論速度、文意精準度與質感，江湖中已難逢對手" },
  { title: "武林盟主", emblem: "🏆", subtitle: "號令全城接案工作室，甲方見到你也要先雙手奉茶敬禮" },
  { title: "登峰造極", emblem: "⛰️", subtitle: "作品境界超越一般評審尺度，隨手一筆皆是藏品" },
  { title: "傲視群雄", emblem: "🦅", subtitle: "高處不勝寒，只剩手沖咖啡、黑膠與橘貓懂你的寂寞" },
  { title: "破碎虛空", emblem: "⚡", subtitle: "電繪筆彷彿發出金光，英文單字與靈感直接跨次元具現" },
  { title: "飛升成仙", emblem: "☁️", subtitle: "每月房租早已只是塵世小數字，你靠畫筆悟道成仙" },
  { title: "畫道聖尊", emblem: "🌀", subtitle: "美術館爭相典藏你用過的草稿紙與磨短的觸控筆芯" },
  { title: "超凡入聖", emblem: "🪽", subtitle: "萬千單字文法皆化作你的創作內力，心念一動便成神作" },
  { title: "萬古神話", emblem: "🌌", subtitle: "後世插畫史開篇第一章，只刻著你的名號與單人房號" },
  { title: "太古獨尊·無敵寂寞", emblem: "🪩", subtitle: "超越凡間段位的終極繪神！連宇宙星雲都照你的色票調色" }
];

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
