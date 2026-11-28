import {
  escapeHtml,
  formatExamDuration,
  gradeIeltsExam,
  calculateIeltsGtBandScore,
  computeIeltsTypeStats,
  buildIeltsGeminiReviewPrompt,
  buildIeltsWrongOnlyGeminiPrompt,
  buildIeltsScoreSheetRowTsv,
  buildIeltsStructuredReviewRequest
} from "./app-helpers.js?v=20261128a";
import {
  renderInteractiveReadingPassage,
  getReadingMarksStorageKey,
  loadReadingMarks,
  saveReadingMarks
} from "./reading-scaffold.js?v=20261128a";
import { bi } from "./i18n.js?v=20261128a";

export const DEFAULT_IELTS_SHEET_ID = "";
export const IELTS_SHEET_ID_STORAGE_KEY = "ielts_custom_sheet_id_v1";
const IELTS_DATA_VERSION = "20261128a";
const IELTS_FONT_SCALE_STORAGE_KEY = "ielts_reading_font_scale_v1";
const IELTS_FONT_SCALE_MIN = 75;
const IELTS_FONT_SCALE_MAX = 160;
const IELTS_FONT_SCALE_STEP = 5;
const IELTS_AI_CONFIG_STORAGE_KEY = "ielts_ai_config_v1";

let ieltsStopwatchInterval = null;
let activeIeltsTimerState = null;
let activeIeltsSyncHandler = null;
const ieltsViewStateByKey = new Map();
const ieltsDetailCache = new Map();
const ieltsDetailPromiseCache = new Map();

function getIeltsViewKey(uid, testId) {
  return `${uid || "anon"}:${testId}`;
}

function getOrCreateViewState(uid, testId) {
  const key = getIeltsViewKey(uid, testId);
  if (!ieltsViewStateByKey.has(key)) {
    ieltsViewStateByKey.set(key, {
      activeSection: 1,
      wrongOnly: false,
      navCollapsed: false,
      activeQIdx: 0
    });
  }
  return ieltsViewStateByKey.get(key);
}

function clampIeltsFontPct(raw) {
  const n = Math.round(Number(raw) || 100);
  return Math.max(IELTS_FONT_SCALE_MIN, Math.min(IELTS_FONT_SCALE_MAX, n));
}

function loadSavedIeltsFontPct() {
  try {
    return clampIeltsFontPct(localStorage.getItem(IELTS_FONT_SCALE_STORAGE_KEY) || "100");
  } catch {
    return 100;
  }
}

function saveIeltsFontPct(pct) {
  try {
    localStorage.setItem(IELTS_FONT_SCALE_STORAGE_KEY, String(clampIeltsFontPct(pct)));
  } catch {
    // Ignore storage unavailability
  }
}

export function getSavedIeltsSheetId() {
  try {
    const custom = localStorage.getItem(IELTS_SHEET_ID_STORAGE_KEY) || "";
    return custom.trim() || DEFAULT_IELTS_SHEET_ID;
  } catch {
    return DEFAULT_IELTS_SHEET_ID;
  }
}

export function setSavedIeltsSheetId(raw) {
  const m = String(raw || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const cleanId = m ? m[1] : String(raw || "").trim();
  try {
    if (cleanId) {
      localStorage.setItem(IELTS_SHEET_ID_STORAGE_KEY, cleanId);
    } else {
      localStorage.removeItem(IELTS_SHEET_ID_STORAGE_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
  return cleanId;
}

export async function loadIeltsBank({ fetchRawTabFn = null } = {}) {
  const indexUrl = new URL(`./data/ielts/index.json?v=${IELTS_DATA_VERSION}`, import.meta.url).href;
  let tests = [];
  let questions = [];
  let sourceKind = "bundled";

  try {
    const res = await fetch(indexUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    tests = Array.isArray(data?.tests) ? data.tests.map(t => ({ ...t })) : [];
  } catch (err) {
    console.warn("Failed to load bundled IELTS index:", err?.message || err);
  }

  const sheetId = getSavedIeltsSheetId();
  if (sheetId && typeof fetchRawTabFn === "function") {
    try {
      const [remoteTests, remoteQs] = await Promise.all([
        fetchRawTabFn(sheetId, "IELTS_Tests", "&headers=1"),
        fetchRawTabFn(sheetId, "IELTS_Questions", "&headers=1")
      ]);
      if (Array.isArray(remoteTests) && remoteTests.length > 0 && Array.isArray(remoteQs)) {
        const cleanTests = remoteTests
          .filter(r => r && r.Test_ID && r.Test_ID !== "Test_ID")
          .map(r => ({
            ...r,
            Test_Num: Number(r.Test_Num || 0),
            XP: Number(r.XP || 60),
            Ready: String(r.Ready || "").toUpperCase() === "TRUE" ? "TRUE" : "FALSE"
          }))
          .sort((a, b) => a.Test_Num - b.Test_Num);
        const cleanQs = remoteQs
          .filter(q => q && q.Test_ID && q.Test_ID !== "Test_ID")
          .map(q => ({
            ...q,
            Section: Number(q.Section || 1),
            Q_Num: Number(q.Q_Num || 0)
          }));
        if (cleanTests.length > 0) {
          tests = cleanTests;
          questions = cleanQs;
          sourceKind = "google_sheet";
          ieltsDetailCache.clear();
          cleanTests.forEach(t => {
            const tQs = cleanQs
              .filter(q => q.Test_ID === t.Test_ID)
              .sort((a, b) => Number(a.Q_Num || 0) - Number(b.Q_Num || 0));
            if (String(t.Ready).toUpperCase() === "TRUE") {
              ieltsDetailCache.set(t.Test_ID, { testMeta: t, questions: tQs, sourceKind: "google_sheet" });
            }
          });
        }
      }
    } catch (err) {
      console.warn("IELTS remote sheet fetch failed; falling back to bundled dataset:", err?.message || err);
    }
  }

  return { tests, questions, sourceKind, sheetId };
}

/**
 * Load full passages & 40 questions for a single IELTS test on demand,
 * caching the parsed chunk in memory so opening subsequent screens stays instant.
 */
export async function loadIeltsTestDetail(testId, { bank = null, force = false } = {}) {
  const cleanId = String(testId || "").trim();
  if (!cleanId) return null;

  if (!force && ieltsDetailCache.has(cleanId)) {
    return ieltsDetailCache.get(cleanId);
  }
  if (!force && ieltsDetailPromiseCache.has(cleanId)) {
    return ieltsDetailPromiseCache.get(cleanId);
  }

  if (bank?.sourceKind === "google_sheet" && Array.isArray(bank.tests)) {
    const meta = bank.tests.find(t => t.Test_ID === cleanId);
    if (meta) {
      const qs = (Array.isArray(bank.questions) ? bank.questions : [])
        .filter(q => q.Test_ID === cleanId)
        .sort((a, b) => Number(a.Q_Num || 0) - Number(b.Q_Num || 0));
      const bundle = { testMeta: meta, questions: qs, sourceKind: "google_sheet" };
      ieltsDetailCache.set(cleanId, bundle);
      return bundle;
    }
  }

  const slug = cleanId.replace(/^ielts:/i, "");
  if (!/^[a-z0-9_-]+$/i.test(slug)) return null;

  const p = (async () => {
    const chunkUrl = new URL(`./data/ielts/${slug}.json?v=${IELTS_DATA_VERSION}`, import.meta.url).href;
    const res = await fetch(chunkUrl);
    if (!res.ok) {
      throw new Error(`無法載入試題檔案 (${slug}: HTTP ${res.status})`);
    }
    const payload = await res.json();
    const qs = (Array.isArray(payload?.questions) ? payload.questions : [])
      .map(q => ({ ...q, Section: Number(q.Section || 1), Q_Num: Number(q.Q_Num || 0) }))
      .sort((a, b) => a.Q_Num - b.Q_Num);
    const bundle = {
      testMeta: payload?.testMeta || null,
      questions: qs,
      sourceKind: "bundled"
    };
    if (bundle.testMeta) {
      ieltsDetailCache.set(cleanId, bundle);
    }
    return bundle;
  })();

  ieltsDetailPromiseCache.set(cleanId, p);
  try {
    return await p;
  } finally {
    if (ieltsDetailPromiseCache.get(cleanId) === p) {
      ieltsDetailPromiseCache.delete(cleanId);
    }
  }
}

function getIeltsTimerKey(uid, testId) {
  return `ielts_timer_v1:${uid || "anon"}:${testId}`;
}

function getIeltsGradedKey(uid, testId) {
  return `ielts_graded_v1:${uid || "anon"}:${testId}`;
}

function getIeltsFlagsKey(uid, testId) {
  return `ielts_flags_v1:${uid || "anon"}:${testId}`;
}

function getIeltsSyncMetaKey(uid, testId) {
  return `ielts_sync_meta_v1:${uid || "anon"}:${testId}`;
}

function getIeltsAiReviewKey(uid, testId) {
  return `ielts_ai_review_v1:${uid || "anon"}:${testId}`;
}

function loadIeltsAiReviewCache(uid, testId) {
  try {
    const raw = localStorage.getItem(getIeltsAiReviewKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveIeltsAiReviewCache(uid, testId, data) {
  try {
    if (!data) {
      localStorage.removeItem(getIeltsAiReviewKey(uid, testId));
    } else {
      localStorage.setItem(getIeltsAiReviewKey(uid, testId), JSON.stringify(data));
    }
  } catch {
    // Ignore storage unavailability
  }
}

function loadIeltsAiConfig() {
  try {
    const raw = localStorage.getItem(IELTS_AI_CONFIG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      apiKey: String(parsed?.apiKey || "").trim(),
      model: String(parsed?.model || "gemini-2.5-flash").trim() || "gemini-2.5-flash",
      backendUrl: String(parsed?.backendUrl || "").trim().replace(/\/+$/, ""),
      backendToken: String(parsed?.backendToken || "").trim(),
      autoLogSheet: Boolean(parsed?.autoLogSheet)
    };
  } catch {
    return { apiKey: "", model: "gemini-2.5-flash", backendUrl: "", backendToken: "", autoLogSheet: false };
  }
}

function saveIeltsAiConfig(cfg) {
  try {
    localStorage.setItem(IELTS_AI_CONFIG_STORAGE_KEY, JSON.stringify({
      apiKey: String(cfg?.apiKey || "").trim(),
      model: String(cfg?.model || "gemini-2.5-flash").trim() || "gemini-2.5-flash",
      backendUrl: String(cfg?.backendUrl || "").trim().replace(/\/+$/, ""),
      backendToken: String(cfg?.backendToken || "").trim(),
      autoLogSheet: Boolean(cfg?.autoLogSheet)
    }));
  } catch {
    // Ignore storage unavailability
  }
}

async function requestIeltsAiReview(reviewPayload, cfg) {
  if (cfg.backendUrl) {
    const headers = { "Content-Type": "application/json" };
    if (cfg.backendToken) headers.Authorization = `Bearer ${cfg.backendToken}`;
    const res = await fetch(`${cfg.backendUrl}/api/ielts/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...reviewPayload, autoLogSheet: Boolean(cfg.autoLogSheet) })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      throw new Error(body?.error || `Backend HTTP ${res.status}`);
    }
    return { review: body.review, sheetResult: body.sheetResult || null };
  }

  if (!cfg.apiKey) {
    throw new Error(bi("尚未設定 Gemini API Key 或後端 URL。", "No Gemini API Key or backend URL configured."));
  }

  if (!reviewPayload.wrongItems || reviewPayload.wrongItems.length === 0) {
    return {
      review: {
        overallSummary: bi(`本次 ${reviewPayload.testTitle} 全數答對（Band ${reviewPayload.band}）！`, `Perfect score on ${reviewPayload.testTitle} (Band ${reviewPayload.band})!`),
        explanations: [],
        sheetNote: "全對無錯題"
      },
      sheetResult: null
    };
  }

  const secBlocks = Object.entries(reviewPayload.sections || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([secNum, body]) => `[Section ${secNum}]\n${body}`)
    .join("\n\n");
  const qLines = reviewPayload.wrongItems.map(item => (
    `- Q${item.qNum} (S${item.section}, ${item.type}): ${item.question} | 我的答案=${item.userAnswer || "(未作答)"} | 正解=${item.acceptedAnswer}`
  ));

  const prompt = [
    "請擔任 IELTS General Training Reading 專業家教，只針對以下錯題／未答題提供繁體中文詳解。",
    `測驗：${reviewPayload.testTitle}｜得分：${reviewPayload.correctCount}/${reviewPayload.total}（Band ${reviewPayload.band}）｜耗時：${reviewPayload.durationLabel}`,
    "",
    "### 錯題明細",
    ...qLines,
    "",
    "### 對應文章原文",
    secBlocks,
    "",
    "請回傳嚴格 JSON：overallSummary（1-2句繁中總評與作答節奏建議）、explanations（每題含 qNum, evidence 英文原文證據短句, explanation 繁中詳解, mistakeReason 錯因標籤）、sheetNote（單行成績表錯題備註）。"
  ].join("\n");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || "gemini-2.5-flash")}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            overallSummary: { type: "STRING" },
            sheetNote: { type: "STRING" },
            explanations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  qNum: { type: "INTEGER" },
                  evidence: { type: "STRING" },
                  explanation: { type: "STRING" },
                  mistakeReason: { type: "STRING" }
                },
                required: ["qNum", "evidence", "explanation", "mistakeReason"]
              }
            }
          },
          required: ["overallSummary", "explanations", "sheetNote"]
        }
      }
    })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return { review: JSON.parse(text), sheetResult: null };
}

async function requestIeltsBackendScoreLog(reviewPayload, cfg) {
  if (!cfg.backendUrl) {
    throw new Error(bi("請先於設定中填入後端 URL（例如 http://127.0.0.1:8787）。", "Configure backend URL first."));
  }
  const headers = { "Content-Type": "application/json" };
  if (cfg.backendToken) headers.Authorization = `Bearer ${cfg.backendToken}`;
  const res = await fetch(`${cfg.backendUrl}/api/ielts/log-score`, {
    method: "POST",
    headers,
    body: JSON.stringify(reviewPayload)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || `Backend HTTP ${res.status}`);
  }
  return body;
}

function getQuizAnswersStorageKey(uid, testId) {
  return `quiz_progress:${uid || "anon"}:${testId}`;
}

export function loadIeltsSyncTimestamp(uid, testId) {
  try {
    const raw = localStorage.getItem(getIeltsSyncMetaKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    const ts = Math.trunc(Number(parsed?.clientUpdatedAt) || 0);
    return Math.max(0, Math.min(9999999999999, ts));
  } catch {
    return 0;
  }
}

export function saveIeltsSyncTimestamp(uid, testId, ts) {
  const cleanTs = Math.max(0, Math.min(9999999999999, Math.trunc(Number(ts) || 0)));
  try {
    localStorage.setItem(getIeltsSyncMetaKey(uid, testId), JSON.stringify({ clientUpdatedAt: cleanTs }));
  } catch {
    // Ignore storage unavailability
  }
  return cleanTs;
}

export function touchIeltsSyncTimestamp(uid, testId, ts = Date.now()) {
  const prev = loadIeltsSyncTimestamp(uid, testId);
  const next = Math.max(prev + 1, Math.trunc(Number(ts) || Date.now()));
  return saveIeltsSyncTimestamp(uid, testId, next);
}

function sanitizeSyncAnswersMap(rawMap) {
  const clean = {};
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) return clean;
  let count = 0;
  for (const [k, v] of Object.entries(rawMap)) {
    if (count >= 100) break;
    const key = String(k || "").trim();
    if (!/^\d{1,3}$/.test(key)) continue;
    const val = String(v ?? "").trim().slice(0, 200);
    if (!val) continue;
    clean[key] = val;
    count += 1;
  }
  return clean;
}

function readLocalAnswersRaw(uid, testId) {
  try {
    const raw = localStorage.getItem(getQuizAnswersStorageKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    return sanitizeSyncAnswersMap(parsed);
  } catch {
    return {};
  }
}

function writeLocalAnswersRaw(uid, testId, answersMap) {
  const clean = sanitizeSyncAnswersMap(answersMap);
  try {
    if (Object.keys(clean).length === 0) {
      localStorage.removeItem(getQuizAnswersStorageKey(uid, testId));
    } else {
      localStorage.setItem(getQuizAnswersStorageKey(uid, testId), JSON.stringify(clean));
    }
  } catch {
    // Ignore storage unavailability
  }
}

function flagsSetToFirestoreMap(flagSet) {
  const out = {};
  if (!flagSet) return out;
  const sorted = [...flagSet]
    .map(n => Math.trunc(Number(n)))
    .filter(n => Number.isFinite(n) && n >= 0 && n < 100)
    .sort((a, b) => a - b)
    .slice(0, 100);
  for (const n of sorted) {
    out[String(n)] = true;
  }
  return out;
}

function firestoreFlagsToSet(rawFlags) {
  const set = new Set();
  if (Array.isArray(rawFlags)) {
    rawFlags.forEach(n => {
      const idx = Math.trunc(Number(n));
      if (Number.isFinite(idx) && idx >= 0 && idx < 100) set.add(idx);
    });
  } else if (rawFlags && typeof rawFlags === "object") {
    Object.entries(rawFlags).forEach(([k, v]) => {
      if (v === true && /^\d{1,3}$/.test(k)) {
        const idx = Math.trunc(Number(k));
        if (idx >= 0 && idx < 100) set.add(idx);
      }
    });
  }
  return set;
}

function buildCompactGradedSummary(gradedObj, fallbackTotal = 40) {
  if (!gradedObj || typeof gradedObj !== "object" || !gradedObj.graded) return null;
  const total = Math.max(1, Math.min(100, Math.trunc(Number(gradedObj.total) || fallbackTotal || 40)));
  const correctCount = Math.max(0, Math.min(total, Math.trunc(Number(gradedObj.correctCount) || 0)));
  const accuracyPct = Math.max(0, Math.min(100, Math.trunc(
    Number.isFinite(Number(gradedObj.accuracyPct))
      ? Number(gradedObj.accuracyPct)
      : Math.round((correctCount / total) * 100)
  )));
  const bandStr = String(
    gradedObj.band
    || gradedObj.bandInfo?.band
    || calculateIeltsGtBandScore(correctCount, total).band
  ).trim().slice(0, 8) || "0.0";
  const elapsedSec = Math.max(0, Math.min(86400, Math.trunc(Number(gradedObj.elapsedSec) || 0)));
  const gradedAt = Math.max(0, Math.min(9999999999999, Math.trunc(Number(gradedObj.gradedAt) || Date.now())));
  return {
    graded: true,
    correctCount,
    total,
    accuracyPct,
    band: bandStr,
    elapsedSec,
    gradedAt
  };
}

function readAllSectionMarks(uid, testId) {
  const out = {};
  ["sec_1", "sec_2", "sec_3"].forEach(secKey => {
    const sk = getReadingMarksStorageKey(uid, testId, secKey);
    const m = loadReadingMarks(sk);
    if (Object.keys(m).length > 0) {
      out[secKey] = m;
    }
  });
  return out;
}

export function hasLocalIeltsProgress(uid, testId) {
  const answers = readLocalAnswersRaw(uid, testId);
  const flags = loadFlaggedSet(uid, testId);
  const timer = loadTimerSnapshot(uid, testId);
  const graded = loadGradedState(uid, testId);
  const marks = readAllSectionMarks(uid, testId);
  return Object.keys(answers).length > 0
    || flags.size > 0
    || timer.elapsedMs > 0
    || Boolean(graded)
    || Object.keys(marks).length > 0
    || loadIeltsSyncTimestamp(uid, testId) > 0;
}

/**
 * Snapshot all local IELTS test state (answers, flags, stopwatch, graded summary, marks)
 * into a schema-validated Firestore payload matching `users/{uid}/ieltsAttempts/{testId}`.
 */
export function readLocalIeltsAttemptPayload(uid, testId, fallbackTotal = 40) {
  const answers = readLocalAnswersRaw(uid, testId);
  const flags = flagsSetToFirestoreMap(loadFlaggedSet(uid, testId));
  const timer = loadTimerSnapshot(uid, testId);
  const gradedRaw = loadGradedState(uid, testId);
  const graded = buildCompactGradedSummary(gradedRaw, fallbackTotal);
  const marks = readAllSectionMarks(uid, testId);

  let clientUpdatedAt = loadIeltsSyncTimestamp(uid, testId);
  if (clientUpdatedAt === 0) {
    // Infer timestamp from legacy pre-cloud-sync local records if present
    let timerUpdatedAt = 0;
    try {
      const tParsed = JSON.parse(localStorage.getItem(getIeltsTimerKey(uid, testId)) || "null");
      timerUpdatedAt = Math.trunc(Number(tParsed?.updatedAt) || 0);
    } catch {}
    clientUpdatedAt = Math.max(
      0,
      Math.min(9999999999999, Math.trunc(Number(graded?.gradedAt || 0)), timerUpdatedAt)
    );
    if (clientUpdatedAt === 0 && hasLocalIeltsProgress(uid, testId)) {
      clientUpdatedAt = Date.now();
    }
    if (clientUpdatedAt > 0) {
      saveIeltsSyncTimestamp(uid, testId, clientUpdatedAt);
    }
  }

  return {
    testId,
    answers,
    flags,
    elapsedMs: Math.max(0, Math.min(86400000, Math.trunc(timer.elapsedMs || 0))),
    timerRunning: Boolean(graded ? false : timer.running),
    graded,
    marks,
    clientUpdatedAt
  };
}

/**
 * Hydrate localStorage from a newer Firestore `ieltsAttempts/{testId}` document.
 * Reconstructs full per-question results via `gradeIeltsExam` when graded is present.
 * Returns true if local state was updated from cloud.
 */
export function hydrateLocalIeltsAttemptPayload(uid, testId, questions, cloudDoc) {
  if (!cloudDoc || typeof cloudDoc !== "object") return false;
  const cloudTs = Math.max(0, Math.min(9999999999999, Math.trunc(Number(cloudDoc.clientUpdatedAt) || 0)));
  const localPayload = readLocalIeltsAttemptPayload(uid, testId, questions?.length || 40);
  const localTs = localPayload.clientUpdatedAt || 0;
  const hasLocal = hasLocalIeltsProgress(uid, testId);

  if (hasLocal && cloudTs <= localTs) {
    return false;
  }

  const nextAnswers = sanitizeSyncAnswersMap(cloudDoc.answers);
  writeLocalAnswersRaw(uid, testId, nextAnswers);

  const nextFlags = firestoreFlagsToSet(cloudDoc.flags);
  saveFlaggedSet(uid, testId, nextFlags);

  const nextElapsedMs = Math.max(0, Math.min(86400000, Math.trunc(Number(cloudDoc.elapsedMs) || 0)));
  const nextRunning = cloudDoc.graded ? false : Boolean(cloudDoc.timerRunning);
  saveTimerSnapshot(uid, testId, nextElapsedMs, nextRunning);

  if (cloudDoc.graded && cloudDoc.graded.graded) {
    const qList = Array.isArray(questions) ? questions : [];
    const recomputed = gradeIeltsExam(qList, nextAnswers);
    const compact = buildCompactGradedSummary(cloudDoc.graded, qList.length || 40);
    saveGradedState(uid, testId, {
      ...recomputed,
      graded: true,
      elapsedSec: compact.elapsedSec,
      gradedAt: compact.gradedAt,
      correctCount: qList.length > 0 ? recomputed.correctCount : compact.correctCount,
      total: qList.length > 0 ? recomputed.total : compact.total,
      accuracyPct: qList.length > 0 ? recomputed.accuracyPct : compact.accuracyPct
    });
  } else {
    saveGradedState(uid, testId, null);
  }

  const cloudMarks = (cloudDoc.marks && typeof cloudDoc.marks === "object") ? cloudDoc.marks : {};
  ["sec_1", "sec_2", "sec_3"].forEach(secKey => {
    const sk = getReadingMarksStorageKey(uid, testId, secKey);
    const secMarks = (cloudMarks[secKey] && typeof cloudMarks[secKey] === "object") ? cloudMarks[secKey] : {};
    const cleanMarks = {};
    Object.entries(secMarks).forEach(([k, v]) => {
      if (/^\d+$/.test(k) && v === "yellow") cleanMarks[k] = "yellow";
    });
    saveReadingMarks(sk, cleanMarks);
  });

  saveIeltsSyncTimestamp(uid, testId, cloudTs || Date.now());
  return true;
}

export function updateIeltsCloudSyncStatusUI(status = "idle", customLabel = "") {
  const pill = document.getElementById("ielts-cloud-sync-pill");
  if (!pill) return;
  pill.classList.remove("is-synced", "is-syncing", "is-error");
  if (status === "synced") {
    pill.classList.add("is-synced");
    pill.textContent = customLabel || bi("☁ 雲端已同步", "☁ Synced");
  } else if (status === "syncing") {
    pill.classList.add("is-syncing");
    pill.textContent = customLabel || bi("☁ 同步中…", "☁ Syncing…");
  } else if (status === "error") {
    pill.classList.add("is-error");
    pill.textContent = customLabel || bi("☁ 離線暫存", "☁ Cached locally");
  } else {
    pill.textContent = customLabel || bi("☁ 本機快取", "☁ Local cache");
  }
}

function loadFlaggedSet(uid, testId) {
  try {
    const raw = localStorage.getItem(getIeltsFlagsKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(n => Math.trunc(Number(n))).filter(n => Number.isFinite(n) && n >= 0));
  } catch {
    return new Set();
  }
}

function saveFlaggedSet(uid, testId, flagSet) {
  try {
    const arr = [...flagSet].sort((a, b) => a - b);
    if (arr.length === 0) {
      localStorage.removeItem(getIeltsFlagsKey(uid, testId));
    } else {
      localStorage.setItem(getIeltsFlagsKey(uid, testId), JSON.stringify(arr));
    }
  } catch {
    // Ignore storage unavailability
  }
}

function loadTimerSnapshot(uid, testId) {
  try {
    const raw = localStorage.getItem(getIeltsTimerKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { elapsedMs: 0, running: true };
    return {
      elapsedMs: Math.max(0, Math.trunc(Number(parsed.elapsedMs) || 0)),
      running: typeof parsed.running === "boolean" ? parsed.running : true
    };
  } catch {
    return { elapsedMs: 0, running: true };
  }
}

function saveTimerSnapshot(uid, testId, elapsedMs, running) {
  try {
    localStorage.setItem(getIeltsTimerKey(uid, testId), JSON.stringify({
      elapsedMs: Math.max(0, Math.trunc(elapsedMs)),
      running: Boolean(running),
      updatedAt: Date.now()
    }));
  } catch {
    // Ignore storage unavailability
  }
}

function loadGradedState(uid, testId) {
  try {
    const raw = localStorage.getItem(getIeltsGradedKey(uid, testId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && parsed.graded ? parsed : null;
  } catch {
    return null;
  }
}

function saveGradedState(uid, testId, data) {
  try {
    if (!data) {
      localStorage.removeItem(getIeltsGradedKey(uid, testId));
    } else {
      localStorage.setItem(getIeltsGradedKey(uid, testId), JSON.stringify(data));
    }
  } catch {
    // Ignore storage unavailability
  }
}

function formatClock(totalSec) {
  const s = Math.max(0, Math.trunc(totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(rem)}` : `${pad(mins)}:${pad(rem)}`;
}

export function stopIeltsExamTimer({ flushSync = true } = {}) {
  const prevSync = activeIeltsSyncHandler;
  const prevState = activeIeltsTimerState;
  if (activeIeltsTimerState) {
    flushActiveTimer();
    saveTimerSnapshot(
      activeIeltsTimerState.uid,
      activeIeltsTimerState.testId,
      activeIeltsTimerState.elapsedMs,
      activeIeltsTimerState.running
    );
    activeIeltsTimerState = null;
  }
  activeIeltsSyncHandler = null;
  if (ieltsStopwatchInterval) {
    clearInterval(ieltsStopwatchInterval);
    ieltsStopwatchInterval = null;
  }
  if (flushSync && prevSync && prevState && prevSync.testId === prevState.testId) {
    touchIeltsSyncTimestamp(prevState.uid, prevState.testId);
    prevSync.onStateSync?.(prevState.testId, { immediate: true, reason: "timer_stop" });
  }
}

export function flushIeltsCloudSyncOnHide() {
  if (!activeIeltsTimerState || !activeIeltsSyncHandler) return;
  flushActiveTimer();
  saveTimerSnapshot(
    activeIeltsTimerState.uid,
    activeIeltsTimerState.testId,
    activeIeltsTimerState.elapsedMs,
    activeIeltsTimerState.running
  );
  touchIeltsSyncTimestamp(activeIeltsTimerState.uid, activeIeltsTimerState.testId);
  activeIeltsSyncHandler.onStateSync?.(activeIeltsTimerState.testId, { immediate: true, reason: "page_hide" });
}

export function clearIeltsAttemptState(uid, testId) {
  stopIeltsExamTimer({ flushSync: false });
  saveGradedState(uid, testId, null);
  saveIeltsAiReviewCache(uid, testId, null);
  saveFlaggedSet(uid, testId, new Set());
  saveTimerSnapshot(uid, testId, 0, true);
  touchIeltsSyncTimestamp(uid, testId);
  ieltsViewStateByKey.delete(getIeltsViewKey(uid, testId));
}

function flushActiveTimer() {
  if (!activeIeltsTimerState || !activeIeltsTimerState.running) return;
  if (!activeIeltsTimerState.lastTickMs || document.hidden) {
    activeIeltsTimerState.lastTickMs = Date.now();
    return;
  }
  const now = Date.now();
  const delta = Math.max(0, Math.min(5000, now - activeIeltsTimerState.lastTickMs));
  activeIeltsTimerState.elapsedMs += delta;
  activeIeltsTimerState.lastTickMs = now;
}

function formatIeltsRubricHtml(rawPrompt) {
  const escaped = escapeHtml(String(rawPrompt || "").trim());
  const directives = [
    "NO MORE THAN THREE WORDS AND/OR A NUMBER",
    "NO MORE THAN TWO WORDS AND/OR A NUMBER",
    "NO MORE THAN THREE WORDS",
    "NO MORE THAN TWO WORDS",
    "ONE WORD ONLY AND/OR A NUMBER",
    "ONE WORD ONLY",
    "ONE OR TWO WORDS",
    "TRUE, FALSE, or NOT GIVEN",
    "TRUE / FALSE / NOT GIVEN",
    "YES, NO, or NOT GIVEN",
    "YES / NO / NOT GIVEN",
    "TWO letters"
  ];
  let formatted = escaped;
  for (const phrase of directives) {
    const safePhrase = escapeHtml(phrase);
    formatted = formatted.replaceAll(safePhrase, `<strong>${safePhrase}</strong>`);
  }
  return formatted;
}

function createIeltsQuestionSetBlock(groupPrompt) {
  const setEl = document.createElement("div");
  setEl.className = "ielts-question-set";

  const headerEl = document.createElement("div");
  headerEl.className = "ielts-set-header";

  const text = String(groupPrompt || "").trim();
  const colonIdx = text.indexOf(":");
  if (colonIdx > 0 && colonIdx < 30) {
    const titlePart = text.slice(0, colonIdx).trim();
    const instrPart = text.slice(colonIdx + 1).trim();
    headerEl.innerHTML = `
      <div class="ielts-set-title">${escapeHtml(titlePart)}</div>
      ${instrPart ? `<p class="ielts-set-instruction">${formatIeltsRubricHtml(instrPart)}</p>` : ""}
    `;
  } else {
    headerEl.innerHTML = `<p class="ielts-set-instruction">${formatIeltsRubricHtml(text)}</p>`;
  }

  const itemsEl = document.createElement("div");
  itemsEl.className = "ielts-set-items";
  setEl.append(headerEl, itemsEl);
  return { setEl, itemsEl };
}

function renderIeltsQuestionCard({
  q,
  idx,
  savedValue,
  gradedInfo,
  aiExplanation = null,
  isFlagged = false,
  onToggleFlag = null,
  onChange
}) {
  const card = document.createElement("div");
  card.className = "question-card ielts-question-card";
  card.dataset.index = String(idx);
  card.tabIndex = -1;

  if (gradedInfo) {
    card.classList.add(gradedInfo.isCorrect ? "correct" : "incorrect");
  } else if (String(savedValue || "").trim().length > 0) {
    card.classList.add("has-draft");
  }

  const qType = String(q.Type || "").toUpperCase();

  const topRow = document.createElement("div");
  topRow.className = "ielts-card-top";

  const badge = document.createElement("div");
  badge.className = "question-type-badge";
  badge.textContent = `Question ${q.Q_Num}`;

  const flagBtn = document.createElement("button");
  flagBtn.type = "button";
  flagBtn.className = "ielts-flag-btn";
  flagBtn.dataset.index = String(idx);
  flagBtn.setAttribute("aria-label", bi(`標記第 ${q.Q_Num} 題稍後檢查`, `Flag Question ${q.Q_Num} for review`));
  const syncFlagBtn = (flagged) => {
    flagBtn.setAttribute("aria-pressed", String(Boolean(flagged)));
    flagBtn.classList.toggle("is-flagged", Boolean(flagged));
    card.classList.toggle("is-flagged", Boolean(flagged));
    flagBtn.innerHTML = `<span aria-hidden="true">🚩</span><span>${flagged ? bi("已標記", "Flagged") : bi("標記", "Flag")}</span>`;
  };
  syncFlagBtn(isFlagged);
  flagBtn.addEventListener("click", () => {
    const nextFlag = Boolean(onToggleFlag?.(idx));
    syncFlagBtn(nextFlag);
  });

  topRow.append(badge, flagBtn);
  card.appendChild(topRow);

  const qText = document.createElement("div");
  qText.className = "question-text";
  qText.textContent = q.Question || "";
  card.appendChild(qText);

  const disabled = Boolean(gradedInfo);

  if (qType === "TFNG" || qType === "YNNG") {
    const vals = qType === "YNNG" ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
    const list = document.createElement("div");
    list.className = "options-list";
    vals.forEach(val => {
      const lbl = document.createElement("label");
      lbl.className = "option-label";
      lbl.dataset.value = val;
      if (gradedInfo && val === gradedInfo.primaryAnswer?.toUpperCase()) {
        lbl.classList.add("opt-correct");
      } else if (gradedInfo && !gradedInfo.isCorrect && val === String(savedValue || "").toUpperCase()) {
        lbl.classList.add("opt-incorrect");
      }
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = `q_${idx}`;
      inp.value = val;
      inp.checked = String(savedValue || "").toUpperCase() === val;
      inp.disabled = disabled;
      inp.addEventListener("change", (e) => {
        card.classList.add("has-draft");
        onChange(idx, e.target.value);
      });
      const span = document.createElement("span");
      span.textContent = val;
      lbl.append(inp, span);
      list.appendChild(lbl);
    });
    card.appendChild(list);
  } else if (qType === "MC") {
    const list = document.createElement("div");
    list.className = "options-list";
    const rawOpts = String(q.Options || "").split("|").filter(Boolean);
    rawOpts.forEach(item => {
      const [key, ...rest] = item.split("::");
      const optKey = String(key || "").trim();
      const optText = rest.join("::").trim();
      const lbl = document.createElement("label");
      lbl.className = "option-label";
      lbl.dataset.value = optKey;
      if (gradedInfo && optKey.toUpperCase() === gradedInfo.primaryAnswer?.toUpperCase()) {
        lbl.classList.add("opt-correct");
      } else if (gradedInfo && !gradedInfo.isCorrect && optKey.toUpperCase() === String(savedValue || "").toUpperCase()) {
        lbl.classList.add("opt-incorrect");
      }
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = `q_${idx}`;
      inp.value = optKey;
      inp.checked = String(savedValue || "").toUpperCase() === optKey.toUpperCase();
      inp.disabled = disabled;
      inp.addEventListener("change", (e) => {
        card.classList.add("has-draft");
        onChange(idx, e.target.value);
      });
      const span = document.createElement("span");
      span.innerHTML = `<strong>(${escapeHtml(optKey)})</strong> ${escapeHtml(optText)}`;
      lbl.append(inp, span);
      list.appendChild(lbl);
    });
    card.appendChild(list);
  } else if (qType === "CHOICE_PILLS" || qType === "MULTI2") {
    const opts = String(q.Options || "").split("|").map(s => s.trim()).filter(Boolean);
    const pillRow = document.createElement("div");
    pillRow.className = "ielts-choice-pills";
    const isMulti2 = qType === "MULTI2";

    const getSelectedTokens = (raw) => String(raw || "")
      .toUpperCase()
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    let selectedSet = new Set(getSelectedTokens(savedValue));

    const refreshPills = () => {
      pillRow.querySelectorAll(".ielts-pill-btn").forEach(btn => {
        const tok = btn.dataset.val.toUpperCase();
        const isPicked = selectedSet.has(tok);
        btn.classList.toggle("is-selected", isPicked);
        btn.setAttribute("aria-pressed", String(isPicked));
      });
    };

    opts.forEach(opt => {
      const tok = opt.toUpperCase();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ielts-pill-btn";
      btn.dataset.val = opt;
      btn.textContent = opt;
      btn.disabled = disabled;
      if (selectedSet.has(tok)) btn.classList.add("is-selected");
      btn.setAttribute("aria-pressed", String(selectedSet.has(tok)));

      if (!disabled) {
        btn.addEventListener("click", () => {
          if (isMulti2) {
            if (selectedSet.has(tok)) {
              selectedSet.delete(tok);
            } else {
              if (selectedSet.size >= 2) {
                const oldest = selectedSet.values().next().value;
                selectedSet.delete(oldest);
              }
              selectedSet.add(tok);
            }
            const joined = [...selectedSet].sort().join(",");
            card.classList.toggle("has-draft", selectedSet.size > 0);
            refreshPills();
            onChange(idx, joined);
          } else {
            selectedSet = new Set([tok]);
            card.classList.add("has-draft");
            refreshPills();
            onChange(idx, opt);
          }
        });
      }
      pillRow.appendChild(btn);
    });
    card.appendChild(pillRow);
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control ielts-blank-input";
    input.placeholder = bi("輸入單字或數字作答…", "Type your answer…");
    input.value = String(savedValue || "");
    input.disabled = disabled;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.addEventListener("input", (e) => {
      const v = e.target.value;
      card.classList.toggle("has-draft", v.trim().length > 0);
      onChange(idx, v);
    });
    card.appendChild(input);
  }

  if (gradedInfo) {
    const resultStrip = document.createElement("div");
    resultStrip.className = `ielts-answer-reveal ${gradedInfo.isCorrect ? "is-correct" : "is-wrong"}`;
    const userShow = gradedInfo.isAnswered ? escapeHtml(gradedInfo.userAnswer) : bi("(未作答)", "(Blank)");
    resultStrip.innerHTML = gradedInfo.isCorrect
      ? `<strong>✓ ${bi("答對", "Correct")}</strong> · ${bi("標準答案：", "Answer: ")}${escapeHtml(gradedInfo.acceptedDisplay)}`
      : `<strong>✗ ${bi("答錯", "Incorrect")}</strong> · ${bi("你的答案：", "Yours: ")}${userShow} ｜ ${bi("標準答案：", "Answer: ")}${escapeHtml(gradedInfo.acceptedDisplay)}`;
    card.appendChild(resultStrip);

    if (q.Audit_Note) {
      const note = document.createElement("div");
      note.className = "ielts-audit-note";
      note.textContent = `🛠 ${bi("題目檢視備註：", "Source audit note: ")}${q.Audit_Note}`;
      card.appendChild(note);
    }

    if (aiExplanation && !gradedInfo.isCorrect) {
      const aiBox = document.createElement("div");
      aiBox.className = "ielts-ai-explanation";
      aiBox.innerHTML = `
        <div class="ielts-ai-exp-head">
          <span>✨ ${bi("AI 錯題詳解", "AI Explanation")}</span>
          ${aiExplanation.mistakeReason ? `<span class="ielts-ai-reason-tag">${escapeHtml(aiExplanation.mistakeReason)}</span>` : ""}
        </div>
        ${aiExplanation.evidence ? `<blockquote class="ielts-ai-evidence">${escapeHtml(aiExplanation.evidence)}</blockquote>` : ""}
        <p class="ielts-ai-exp-body">${escapeHtml(aiExplanation.explanation || "")}</p>
      `;
      card.appendChild(aiBox);
    }
  }

  return card;
}

function buildIeltsAttemptHistoryDetails(historyList = [], fallbackTotal = 40) {
  const entries = Array.isArray(historyList) ? historyList : [];
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => (Number(b.gradedAt) || 0) - (Number(a.gradedAt) || 0));
  let bestBandNum = -1;
  let bestCorrect = -1;
  sorted.forEach(item => {
    const b = parseFloat(item.band) || 0;
    const c = Number(item.correctCount) || 0;
    if (b > bestBandNum || (b === bestBandNum && c > bestCorrect)) {
      bestBandNum = b;
      bestCorrect = c;
    }
  });
  const bestBandStr = bestBandNum >= 0 ? bestBandNum.toFixed(1) : "0.0";
  const bestItemTotal = Number(sorted[0]?.total || fallbackTotal || 40);

  const details = document.createElement("details");
  details.className = "ielts-history-details";
  details.id = "ielts-history-details";

  const summary = document.createElement("summary");
  summary.className = "ielts-history-summary";
  summary.innerHTML = `
    <span>📜 ${bi(`歷次作答紀錄（共 ${sorted.length} 次）`, `Attempt History (${sorted.length})`)}</span>
    <span class="ielts-history-summary-meta">${bi(`最佳 Band ${escapeHtml(bestBandStr)}（${bestCorrect}/${bestItemTotal}）`, `Best Band ${escapeHtml(bestBandStr)} (${bestCorrect}/${bestItemTotal})`)}</span>
  `;

  const wrap = document.createElement("div");
  wrap.className = "ielts-history-table-wrap";

  const table = document.createElement("table");
  table.className = "ielts-history-table";
  table.innerHTML = `
    <caption class="visually-hidden">${bi("IELTS 歷次練習成績紀錄", "IELTS Past Attempt History")}</caption>
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">${bi("交卷時間", "Submitted")}</th>
        <th scope="col">${bi("級分", "Band")}</th>
        <th scope="col">${bi("得分", "Score")}</th>
        <th scope="col">${bi("正確率", "Accuracy")}</th>
        <th scope="col">${bi("耗時", "Duration")}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  sorted.forEach((item, i) => {
    const attemptNo = sorted.length - i;
    const dt = item.gradedAt ? new Date(item.gradedAt) : null;
    const dateLabel = dt && !Number.isNaN(dt.getTime())
      ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
      : "—";
    const bandLabel = escapeHtml(String(item.band || calculateIeltsGtBandScore(item.correctCount, item.total).band));
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${attemptNo}</td>
      <td>${escapeHtml(dateLabel)}</td>
      <td><span class="ielts-history-band-badge">Band ${bandLabel}</span></td>
      <td>${Number(item.correctCount || 0)} / ${Number(item.total || fallbackTotal || 40)}</td>
      <td>${Number(item.accuracyPct || 0)}%</td>
      <td>${escapeHtml(formatExamDuration(Number(item.elapsedSec || 0)))}</td>
    `;
    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  details.append(summary, wrap);
  return details;
}

export function renderIeltsExamView({
  testMeta,
  questions,
  uid,
  loadSavedAnswers,
  saveAnswer,
  clearSavedAnswers,
  onRecordClick,
  onResetTelemetry,
  onStateSync = null,
  onAttemptGraded = null,
  onAttemptCleared = null,
  getAttemptHistory = null,
  getCloudSyncStatus = null,
  popoverEl
}) {
  stopIeltsExamTimer({ flushSync: false });

  const splitDefaultEl = document.getElementById("reading-split-default");
  const sectionedEl = document.getElementById("sectioned-quiz-container");
  const quizContainer = document.getElementById("quiz-container");
  const progressFill = document.getElementById("quiz-progress-fill");
  if (!sectionedEl) return;

  splitDefaultEl?.classList.add("hidden");
  sectionedEl.classList.remove("hidden");
  sectionedEl.classList.add("ielts-sectioned-exam");
  sectionedEl.innerHTML = "";
  if (quizContainer) quizContainer.innerHTML = "";

  const testId = testMeta.Test_ID;
  let answersMap = loadSavedAnswers(testId);
  let gradedState = loadGradedState(uid, testId);
  if (gradedState && (!Array.isArray(gradedState.results) || gradedState.results.length !== questions.length)) {
    const recomputed = gradeIeltsExam(questions, answersMap);
    gradedState = {
      ...recomputed,
      ...gradedState,
      results: recomputed.results,
      bandInfo: recomputed.bandInfo,
      typeStats: recomputed.typeStats
    };
  }
  const aiReviewData = gradedState ? loadIeltsAiReviewCache(uid, testId) : null;
  const aiExpByQNum = new Map();
  (Array.isArray(aiReviewData?.explanations) ? aiReviewData.explanations : []).forEach(exp => {
    const qn = Number(exp?.qNum || 0);
    if (qn > 0) aiExpByQNum.set(qn, exp);
  });

  const countAnswered = () => questions.reduce((acc, _, i) => (
    String(answersMap[String(i)] || "").trim().length > 0 ? acc + 1 : acc
  ), 0);

  const updateProgressBar = () => {
    if (!progressFill || questions.length === 0) return;
    const pct = Math.round((countAnswered() / questions.length) * 100);
    progressFill.style.width = `${pct}%`;
    progressFill.parentElement?.setAttribute("aria-valuenow", String(pct));
  };

  // Stopwatch Bar
  const timerSnapshot = gradedState
    ? { elapsedMs: (gradedState.elapsedSec || 0) * 1000, running: false }
    : loadTimerSnapshot(uid, testId);

  activeIeltsTimerState = {
    uid,
    testId,
    elapsedMs: timerSnapshot.elapsedMs,
    running: gradedState ? false : timerSnapshot.running,
    lastTickMs: Date.now()
  };

  const timerBar = document.createElement("div");
  timerBar.className = "ielts-timer-bar";
  timerBar.id = "ielts-timer-bar";

  const clockEl = document.createElement("span");
  clockEl.className = "ielts-timer-clock";
  clockEl.id = "ielts-timer-clock";

  const statusCountEl = document.createElement("span");
  statusCountEl.className = "ielts-answered-count";

  const toggleTimerBtn = document.createElement("button");
  toggleTimerBtn.type = "button";
  toggleTimerBtn.className = "btn btn-sm";

  const resetTimerBtn = document.createElement("button");
  resetTimerBtn.type = "button";
  resetTimerBtn.className = "btn btn-sm";
  resetTimerBtn.textContent = bi("↺ 碼表歸零", "↺ Reset Timer");

  const syncTimerDom = ({ tick = false } = {}) => {
    if (!activeIeltsTimerState) return;
    flushActiveTimer();
    const sec = Math.round(activeIeltsTimerState.elapsedMs / 1000);
    clockEl.textContent = `⏱ ${formatClock(sec)}`;
    statusCountEl.textContent = bi(`已填答 ${countAnswered()} / ${questions.length} 題`, `Answered ${countAnswered()} / ${questions.length}`);
    toggleTimerBtn.textContent = activeIeltsTimerState.running ? bi("⏸ 暫停碼表", "⏸ Pause") : bi("▶ 繼續計時", "▶ Resume");
    toggleTimerBtn.disabled = Boolean(gradedState);
    resetTimerBtn.disabled = Boolean(gradedState);
    saveTimerSnapshot(uid, testId, activeIeltsTimerState.elapsedMs, activeIeltsTimerState.running);
    if (tick && activeIeltsTimerState.running && activeIeltsSyncHandler) {
      activeIeltsSyncHandler.ticks += 1;
      if (activeIeltsSyncHandler.ticks % 15 === 0) {
        touchIeltsSyncTimestamp(uid, testId);
        activeIeltsSyncHandler.onStateSync?.(testId, { immediate: false, reason: "timer_tick" });
      }
    }
  };

  activeIeltsSyncHandler = { testId, onStateSync, ticks: 0 };

  toggleTimerBtn.addEventListener("click", () => {
    if (!activeIeltsTimerState || gradedState) return;
    flushActiveTimer();
    activeIeltsTimerState.running = !activeIeltsTimerState.running;
    activeIeltsTimerState.lastTickMs = Date.now();
    syncTimerDom();
    touchIeltsSyncTimestamp(uid, testId);
    onStateSync?.(testId, { immediate: true, reason: "timer_toggle" });
  });

  resetTimerBtn.addEventListener("click", () => {
    if (!activeIeltsTimerState || gradedState) return;
    activeIeltsTimerState.elapsedMs = 0;
    activeIeltsTimerState.lastTickMs = Date.now();
    syncTimerDom();
    touchIeltsSyncTimestamp(uid, testId);
    onStateSync?.(testId, { immediate: true, reason: "timer_reset" });
  });

  syncTimerDom();
  if (!gradedState) {
    ieltsStopwatchInterval = setInterval(() => syncTimerDom({ tick: true }), 1000);
  }

  const syncPillEl = document.createElement("span");
  syncPillEl.id = "ielts-cloud-sync-pill";
  syncPillEl.className = "ielts-cloud-sync-pill";

  const timerControls = document.createElement("div");
  timerControls.className = "ielts-timer-controls";

  // Reading font-size zoom controls (75% - 160%)
  const fontGroup = document.createElement("div");
  fontGroup.className = "ielts-font-zoom-group";
  fontGroup.id = "ielts-font-zoom-group";
  fontGroup.setAttribute("role", "group");
  fontGroup.setAttribute("aria-label", bi("閱讀文章字體大小縮放", "Reading passage font size"));

  const fontLabel = document.createElement("span");
  fontLabel.className = "ielts-font-zoom-label";
  fontLabel.textContent = bi("閱讀字體", "Text");

  const fontDecBtn = document.createElement("button");
  fontDecBtn.type = "button";
  fontDecBtn.id = "ielts-font-dec-btn";
  fontDecBtn.className = "btn btn-sm ielts-font-step-btn";
  fontDecBtn.textContent = "A−";
  fontDecBtn.setAttribute("aria-label", bi("縮小閱讀文章字體", "Decrease reading font size"));
  fontDecBtn.title = bi("縮小閱讀字體", "Smaller text");

  const fontSlider = document.createElement("input");
  fontSlider.type = "range";
  fontSlider.id = "ielts-font-slider";
  fontSlider.className = "ielts-font-slider";
  fontSlider.min = String(IELTS_FONT_SCALE_MIN);
  fontSlider.max = String(IELTS_FONT_SCALE_MAX);
  fontSlider.step = String(IELTS_FONT_SCALE_STEP);
  fontSlider.setAttribute("aria-label", bi("閱讀字體縮放比例（%）", "Reading font scale (%)"));

  const fontIncBtn = document.createElement("button");
  fontIncBtn.type = "button";
  fontIncBtn.id = "ielts-font-inc-btn";
  fontIncBtn.className = "btn btn-sm ielts-font-step-btn";
  fontIncBtn.textContent = "A+";
  fontIncBtn.setAttribute("aria-label", bi("放大閱讀文章字體", "Increase reading font size"));
  fontIncBtn.title = bi("放大閱讀字體", "Larger text");

  const fontResetBtn = document.createElement("button");
  fontResetBtn.type = "button";
  fontResetBtn.id = "ielts-font-reset-btn";
  fontResetBtn.className = "btn btn-sm ielts-font-pct-btn";
  fontResetBtn.title = bi("點擊重設為 100% 預設大小", "Reset to 100%");

  let currentFontPct = loadSavedIeltsFontPct();
  const applyFontPct = (nextPct, { persist = true } = {}) => {
    currentFontPct = clampIeltsFontPct(nextPct);
    sectionedEl.style.setProperty("--ielts-reading-scale", (currentFontPct / 100).toFixed(2));
    fontSlider.value = String(currentFontPct);
    fontResetBtn.textContent = `${currentFontPct}%`;
    fontDecBtn.disabled = currentFontPct <= IELTS_FONT_SCALE_MIN;
    fontIncBtn.disabled = currentFontPct >= IELTS_FONT_SCALE_MAX;
    if (persist) saveIeltsFontPct(currentFontPct);
  };

  fontDecBtn.addEventListener("click", () => applyFontPct(currentFontPct - IELTS_FONT_SCALE_STEP));
  fontIncBtn.addEventListener("click", () => applyFontPct(currentFontPct + IELTS_FONT_SCALE_STEP));
  fontResetBtn.addEventListener("click", () => applyFontPct(100));
  fontSlider.addEventListener("input", () => applyFontPct(fontSlider.value));
  applyFontPct(currentFontPct, { persist: false });

  fontGroup.append(fontLabel, fontDecBtn, fontSlider, fontIncBtn, fontResetBtn);

  const stopwatchPanel = document.createElement("div");
  stopwatchPanel.className = "ielts-timer-panel";
  stopwatchPanel.id = "ielts-timer-panel";
  timerControls.append(statusCountEl, toggleTimerBtn, resetTimerBtn, syncPillEl);
  stopwatchPanel.append(clockEl, timerControls);

  timerBar.append(fontGroup, stopwatchPanel);
  sectionedEl.appendChild(timerBar);
  updateIeltsCloudSyncStatusUI(getCloudSyncStatus?.(testId) || "idle");

  const flaggedSet = loadFlaggedSet(uid, testId);
  const viewState = getOrCreateViewState(uid, testId);
  if (!gradedState) {
    viewState.wrongOnly = false;
  }

  const sectionData = [1, 2, 3].map(secNum => {
    const secQs = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => Number(q.Section) === secNum);
    const secTitle = testMeta[`Section_${secNum}_Title`] || `Section ${secNum}`;
    const secBody = testMeta[`Section_${secNum}_Body`] || "";
    const secImg = testMeta[`Section_${secNum}_Image`] || "";
    if (!secBody && secQs.length === 0) return null;
    return { secNum, secQs, secTitle, secBody, secImg };
  }).filter(Boolean);

  const availableSections = sectionData.map(s => s.secNum);
  if (!availableSections.includes(viewState.activeSection)) {
    viewState.activeSection = availableSections[0] || 1;
  }

  const wrongIndices = gradedState
    ? questions.map((_, i) => i).filter(i => !gradedState.results?.[i]?.isCorrect)
    : [];
  const wrongOrBlankCount = wrongIndices.length;

  // Section Tabs + Post-Grade Review Filter Toolbar
  const toolbarEl = document.createElement("div");
  toolbarEl.className = "ielts-section-toolbar";
  toolbarEl.id = "ielts-section-toolbar";

  const tablistEl = document.createElement("div");
  tablistEl.className = "ielts-section-tabs";
  tablistEl.id = "ielts-section-tablist";
  tablistEl.setAttribute("role", "tablist");
  tablistEl.setAttribute("aria-label", bi("IELTS 測驗分區切換", "IELTS Exam Sections"));
  toolbarEl.appendChild(tablistEl);

  let filterAllBtn = null;
  let filterWrongBtn = null;
  if (gradedState) {
    const filterGroup = document.createElement("div");
    filterGroup.className = "ielts-review-filter";
    filterGroup.id = "ielts-review-filter";
    filterGroup.setAttribute("role", "group");
    filterGroup.setAttribute("aria-label", bi("錯題篩選", "Question filter"));

    filterAllBtn = document.createElement("button");
    filterAllBtn.type = "button";
    filterAllBtn.id = "ielts-filter-all-btn";
    filterAllBtn.className = "btn btn-sm ielts-filter-btn";
    filterAllBtn.textContent = bi(`全部 (${questions.length})`, `All (${questions.length})`);

    filterWrongBtn = document.createElement("button");
    filterWrongBtn.type = "button";
    filterWrongBtn.id = "ielts-filter-wrong-btn";
    filterWrongBtn.className = "btn btn-sm ielts-filter-btn is-wrong-filter";
    filterWrongBtn.textContent = bi(`只看錯題 / 未答 (${wrongOrBlankCount})`, `Wrong / Blank (${wrongOrBlankCount})`);

    filterGroup.append(filterAllBtn, filterWrongBtn);
    toolbarEl.appendChild(filterGroup);
  }
  sectionedEl.appendChild(toolbarEl);

  const panelsWrap = document.createElement("div");
  panelsWrap.className = "ielts-section-panels";
  panelsWrap.id = "ielts-section-panels";
  sectionedEl.appendChild(panelsWrap);

  const sectionUiMap = new Map();
  const questionUiMap = new Map();
  const navPillMap = new Map();

  // Build Sections 1, 2, 3 Tabpanels
  sectionData.forEach(({ secNum, secQs, secTitle, secBody, secImg }) => {
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.role = "tab";
    tabBtn.className = "ielts-section-tab";
    tabBtn.id = `ielts-tab-sec-${secNum}`;
    const isInitialActive = secNum === viewState.activeSection;
    tabBtn.setAttribute("aria-selected", String(isInitialActive));
    tabBtn.tabIndex = isInitialActive ? 0 : -1;

    const tabLabelSpan = document.createElement("span");
    tabLabelSpan.className = "ielts-tab-label";
    tabLabelSpan.textContent = `Section ${secNum}`;
    const tabCountSpan = document.createElement("span");
    tabCountSpan.className = "ielts-tab-count";
    tabBtn.append(tabLabelSpan, tabCountSpan);
    tablistEl.appendChild(tabBtn);

    // Tabpanel carries zero padding/margin/border so hidden="until-found" leaves no phantom strip
    const panelEl = document.createElement("section");
    panelEl.className = "ielts-section-panel";
    panelEl.id = `ielts-panel-sec-${secNum}`;
    panelEl.setAttribute("role", "tabpanel");
    panelEl.setAttribute("aria-labelledby", tabBtn.id);
    panelEl.dataset.section = String(secNum);
    panelEl.hidden = isInitialActive ? false : "until-found";

    const secBlock = document.createElement("div");
    secBlock.className = "ielts-section-panel-inner quiz-section-block";

    const heading = document.createElement("h3");
    heading.className = "quiz-section-heading";
    heading.textContent = `Section ${secNum}`;
    secBlock.appendChild(heading);

    const split = document.createElement("div");
    split.className = "ielts-split";

    const readingPane = document.createElement("article");
    readingPane.className = "reading-pane";

    const readingHeader = document.createElement("div");
    readingHeader.className = "reading-header";
    const rTitle = document.createElement("h4");
    rTitle.className = "reading-title";
    rTitle.textContent = `Section ${secNum} Passage`;
    const toolsSlot = document.createElement("div");
    toolsSlot.className = "reading-tools-slot";
    readingHeader.append(rTitle, toolsSlot);
    readingPane.appendChild(readingHeader);

    if (secImg) {
      const imgWrap = document.createElement("div");
      imgWrap.className = "ielts-diagram-box";
      const imgEl = document.createElement("img");
      imgEl.src = secImg;
      imgEl.alt = `${secTitle} Diagram`;
      imgEl.decoding = "async";
      imgWrap.appendChild(imgEl);
      readingPane.appendChild(imgWrap);
    }

    const bodyEl = document.createElement("div");
    bodyEl.className = "reading-body";
    readingPane.appendChild(bodyEl);

    const quizPane = document.createElement("div");
    quizPane.className = "quiz-pane ielts-quiz-pane";

    const emptyFilterNotice = document.createElement("div");
    emptyFilterNotice.className = "ielts-empty-filter-notice";
    emptyFilterNotice.hidden = true;
    quizPane.appendChild(emptyFilterNotice);

    const secSets = [];
    let currentSet = null;
    secQs.forEach(({ q, idx }) => {
      if (q.Group_Prompt || !currentSet) {
        currentSet = createIeltsQuestionSetBlock(
          q.Group_Prompt || `Questions ${q.Q_Num}`
        );
        currentSet.indices = [];
        secSets.push(currentSet);
        quizPane.appendChild(currentSet.setEl);
      }

      const gradedInfo = gradedState?.results?.[idx] || null;
      const card = renderIeltsQuestionCard({
        q,
        idx,
        savedValue: answersMap[String(idx)] || "",
        gradedInfo,
        aiExplanation: gradedInfo ? (aiExpByQNum.get(Number(q.Q_Num)) || null) : null,
        isFlagged: flaggedSet.has(idx),
        onToggleFlag: (qIdx) => {
          if (flaggedSet.has(qIdx)) {
            flaggedSet.delete(qIdx);
          } else {
            flaggedSet.add(qIdx);
          }
          saveFlaggedSet(uid, testId, flaggedSet);
          touchIeltsSyncTimestamp(uid, testId);
          syncNavAndTabs();
          onStateSync?.(testId, { immediate: false, reason: "flag" });
          return flaggedSet.has(qIdx);
        },
        onChange: (qIdx, val) => {
          answersMap[String(qIdx)] = val;
          saveAnswer(testId, qIdx, val);
          touchIeltsSyncTimestamp(uid, testId);
          if (String(val || "").trim().length > 0) {
            onRecordClick?.(testId, qIdx, val);
          }
          updateProgressBar();
          statusCountEl.textContent = bi(`已填答 ${countAnswered()} / ${questions.length} 題`, `Answered ${countAnswered()} / ${questions.length}`);
          syncNavAndTabs();
          onStateSync?.(testId, { immediate: false, reason: "answer" });
        }
      });
      currentSet.indices.push(idx);
      currentSet.itemsEl.appendChild(card);
      questionUiMap.set(idx, { card, secNum, q, setObj: currentSet });
    });

    split.append(readingPane, quizPane);
    secBlock.appendChild(split);
    panelEl.appendChild(secBlock);
    panelsWrap.appendChild(panelEl);

    sectionUiMap.set(secNum, {
      secNum,
      secQs,
      tabBtn,
      tabCountSpan,
      panelEl,
      secSets,
      emptyFilterNotice
    });

    renderInteractiveReadingPassage({
      bodyEl,
      toolsEl: toolsSlot,
      popoverEl,
      passageText: secBody,
      vocabRows: [],
      uid: uid || "guest",
      dateStr: testId,
      sectionKey: `sec_${secNum}`,
      preserveExisting: true,
      onMarksChange: () => {
        touchIeltsSyncTimestamp(uid, testId);
        onStateSync?.(testId, { immediate: false, reason: "marks" });
      }
    });
  });

  // Sticky Bottom Question Navigator (1-40 + Prev/Next + Flag / Status indicators)
  const navBar = document.createElement("nav");
  navBar.className = "ielts-question-nav-bar";
  navBar.id = "ielts-question-nav-bar";
  navBar.setAttribute("aria-label", bi("題號導覽與作答狀態", "IELTS Question Navigator"));

  const navHead = document.createElement("div");
  navHead.className = "ielts-nav-head";

  const navMeta = document.createElement("div");
  navMeta.className = "ielts-nav-meta";
  const navTitle = document.createElement("span");
  navTitle.className = "ielts-nav-title";
  navTitle.textContent = bi("題號導覽", "Questions");

  const navLegend = document.createElement("span");
  navLegend.className = "ielts-nav-legend";
  navLegend.innerHTML = gradedState
    ? `<span class="ielts-legend-chip is-correct"><span aria-hidden="true">✓</span> ${bi("答對", "Correct")}</span><span class="ielts-legend-chip is-wrong"><span aria-hidden="true">✗</span> ${bi("錯題 / 未答", "Wrong / Blank")}</span><span class="ielts-legend-chip is-flag"><span aria-hidden="true">🚩</span> ${bi("標記", "Flag")}</span>`
    : `<span class="ielts-legend-chip is-done"><span aria-hidden="true">●</span> ${bi("已答", "Answered")}</span><span class="ielts-legend-chip is-flag"><span aria-hidden="true">🚩</span> ${bi("標記複查", "Flagged")}</span>`;
  navMeta.append(navTitle, navLegend);

  const navControls = document.createElement("div");
  navControls.className = "ielts-nav-actions";

  const navPrevBtn = document.createElement("button");
  navPrevBtn.type = "button";
  navPrevBtn.id = "ielts-nav-prev-btn";
  navPrevBtn.className = "btn btn-sm ielts-nav-step-btn";
  navPrevBtn.textContent = bi("‹ 上一題", "‹ Prev");

  const navNextBtn = document.createElement("button");
  navNextBtn.type = "button";
  navNextBtn.id = "ielts-nav-next-btn";
  navNextBtn.className = "btn btn-sm ielts-nav-step-btn";
  navNextBtn.textContent = bi("下一題 ›", "Next ›");

  const navToggleBtn = document.createElement("button");
  navToggleBtn.type = "button";
  navToggleBtn.id = "ielts-nav-toggle-btn";
  navToggleBtn.className = "btn btn-sm ielts-nav-collapse-btn";

  navControls.append(navPrevBtn, navNextBtn, navToggleBtn);
  navHead.append(navMeta, navControls);

  const navPillsWrap = document.createElement("div");
  navPillsWrap.className = "ielts-nav-pills";
  navPillsWrap.id = "ielts-nav-pills";

  sectionData.forEach(({ secNum, secQs }) => {
    const groupEl = document.createElement("div");
    groupEl.className = "ielts-nav-sec-group";
    groupEl.dataset.section = String(secNum);

    const secTag = document.createElement("span");
    secTag.className = "ielts-nav-sec-tag";
    secTag.setAttribute("aria-hidden", "true");
    secTag.textContent = `S${secNum}`;
    groupEl.appendChild(secTag);

    secQs.forEach(({ q, idx }) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ielts-nav-pill";
      pill.id = `ielts-nav-pill-${idx}`;
      pill.dataset.index = String(idx);
      pill.dataset.section = String(secNum);

      const numSpan = document.createElement("span");
      numSpan.className = "ielts-nav-pill-num";
      numSpan.textContent = String(q.Q_Num);

      const markSpan = document.createElement("span");
      markSpan.className = "ielts-nav-pill-mark";
      markSpan.setAttribute("aria-hidden", "true");

      pill.append(numSpan, markSpan);
      pill.addEventListener("click", () => jumpToQuestion(idx));
      groupEl.appendChild(pill);
      navPillMap.set(idx, { pill, markSpan, secNum, q });
    });
    navPillsWrap.appendChild(groupEl);
  });

  navBar.append(navHead, navPillsWrap);

  const syncNavCollapse = () => {
    const collapsed = Boolean(viewState.navCollapsed);
    navPillsWrap.hidden = collapsed;
    navBar.classList.toggle("is-collapsed", collapsed);
    navToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    navToggleBtn.textContent = collapsed ? bi("展開題號 ▴", "Expand ▴") : bi("收合 ▾", "Collapse ▾");
  };
  syncNavCollapse();
  navToggleBtn.addEventListener("click", () => {
    viewState.navCollapsed = !viewState.navCollapsed;
    syncNavCollapse();
  });

  const syncNavAndTabs = () => {
    sectionUiMap.forEach((secObj) => {
      const { secNum, secQs, tabBtn, tabCountSpan } = secObj;
      const flagCount = secQs.reduce((n, { idx }) => n + (flaggedSet.has(idx) ? 1 : 0), 0);
      tabCountSpan.className = "ielts-tab-count";
      if (gradedState) {
        const rightCount = secQs.reduce((n, { idx }) => n + (gradedState.results?.[idx]?.isCorrect ? 1 : 0), 0);
        const perfect = rightCount === secQs.length;
        tabCountSpan.textContent = `${rightCount}/${secQs.length}`;
        tabCountSpan.classList.add(perfect ? "is-perfect" : "has-mistakes");
      } else {
        const ansCount = secQs.reduce((n, { idx }) => (
          String(answersMap[String(idx)] || "").trim().length > 0 ? n + 1 : n
        ), 0);
        tabCountSpan.textContent = flagCount > 0 ? `${ansCount}/${secQs.length} · 🚩${flagCount}` : `${ansCount}/${secQs.length}`;
      }
      tabBtn.setAttribute("aria-selected", String(secNum === viewState.activeSection));
      tabBtn.tabIndex = secNum === viewState.activeSection ? 0 : -1;
    });

    navPillMap.forEach((entry, idx) => {
      const { pill, markSpan, secNum, q } = entry;
      const isAnswered = String(answersMap[String(idx)] || "").trim().length > 0;
      const isFlagged = flaggedSet.has(idx);
      const gradedInfo = gradedState?.results?.[idx] || null;

      pill.classList.toggle("is-active-sec", secNum === viewState.activeSection);
      pill.classList.toggle("is-current", idx === viewState.activeQIdx);
      pill.classList.toggle("is-flagged", isFlagged);
      pill.classList.toggle("is-answered", !gradedInfo && isAnswered);
      pill.classList.toggle("is-correct", Boolean(gradedInfo && gradedInfo.isCorrect));
      pill.classList.toggle("is-wrong", Boolean(gradedInfo && !gradedInfo.isCorrect));

      const statusParts = [`Question ${q.Q_Num}`];
      let glyph = "";
      if (gradedInfo) {
        glyph = gradedInfo.isCorrect ? "✓" : "✗";
        statusParts.push(gradedInfo.isCorrect ? bi("答對", "Correct") : (gradedInfo.isAnswered ? bi("答錯", "Incorrect") : bi("未作答", "Blank")));
      } else if (isAnswered) {
        statusParts.push(bi("已填答", "Answered"));
      } else {
        statusParts.push(bi("未填答", "Unanswered"));
      }
      if (isFlagged) {
        glyph = `🚩${glyph}`;
        statusParts.push(bi("已標記", "Flagged"));
      }
      markSpan.textContent = glyph;
      pill.setAttribute("aria-label", statusParts.join(" · "));
    });
  };

  const preferAutoScroll = () => (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth"
  );

  const switchToSection = (secNum, { focusTab = false, scrollTop = false } = {}) => {
    if (!availableSections.includes(secNum)) return;
    viewState.activeSection = secNum;

    sectionUiMap.forEach((secObj) => {
      const isSelected = secObj.secNum === secNum;
      secObj.panelEl.hidden = isSelected ? false : "until-found";
      secObj.tabBtn.setAttribute("aria-selected", String(isSelected));
      secObj.tabBtn.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
        secObj.tabBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
        if (focusTab) secObj.tabBtn.focus({ preventScroll: true });
      }
    });

    syncNavAndTabs();
    if (scrollTop) {
      sectionUiMap.get(secNum)?.panelEl?.scrollIntoView({ behavior: preferAutoScroll(), block: "start" });
    }
  };

  const applyWrongOnlyFilter = (nextWrongOnly = viewState.wrongOnly) => {
    viewState.wrongOnly = Boolean(gradedState && nextWrongOnly);
    if (filterAllBtn) filterAllBtn.setAttribute("aria-pressed", String(!viewState.wrongOnly));
    if (filterWrongBtn) filterWrongBtn.setAttribute("aria-pressed", String(viewState.wrongOnly));
    filterAllBtn?.classList.toggle("is-active", !viewState.wrongOnly);
    filterWrongBtn?.classList.toggle("is-active", viewState.wrongOnly);

    sectionUiMap.forEach((secObj) => {
      let visibleInSec = 0;
      secObj.secSets.forEach((setObj) => {
        let visibleInSet = 0;
        setObj.indices.forEach((idx) => {
          const ui = questionUiMap.get(idx);
          const isCorrect = Boolean(gradedState?.results?.[idx]?.isCorrect);
          const shouldHide = Boolean(viewState.wrongOnly && isCorrect);
          if (ui?.card) ui.card.hidden = shouldHide;
          if (!shouldHide) {
            visibleInSet += 1;
            visibleInSec += 1;
          }
        });
        setObj.setEl.hidden = viewState.wrongOnly && visibleInSet === 0;
      });

      const notice = secObj.emptyFilterNotice;
      if (viewState.wrongOnly && visibleInSec === 0) {
        notice.hidden = false;
        notice.innerHTML = "";
        const msg = document.createElement("span");
        if (wrongOrBlankCount === 0) {
          msg.textContent = bi("🎉 恭喜！本回全數答對，沒有任何錯題。", "🎉 Perfect score! No mistakes or blanks in this test.");
          notice.appendChild(msg);
        } else {
          const firstOtherMistakeSec = availableSections.find(s =>
            s !== secObj.secNum && sectionUiMap.get(s)?.secQs.some(({ idx }) => !gradedState?.results?.[idx]?.isCorrect)
          );
          msg.textContent = bi(`✓ Section ${secObj.secNum} 題目已全數答對。`, `✓ All questions in Section ${secObj.secNum} are correct.`);
          notice.appendChild(msg);
          if (firstOtherMistakeSec) {
            const jumpSecBtn = document.createElement("button");
            jumpSecBtn.type = "button";
            jumpSecBtn.className = "btn btn-sm btn-primary";
            jumpSecBtn.textContent = bi(`前往有錯題的 Section ${firstOtherMistakeSec}`, `Go to Section ${firstOtherMistakeSec} mistakes`);
            jumpSecBtn.addEventListener("click", () => switchToSection(firstOtherMistakeSec, { scrollTop: true }));
            notice.appendChild(jumpSecBtn);
          }
        }
      } else {
        notice.hidden = true;
      }
    });
  };

  const jumpToQuestion = (idx) => {
    const ui = questionUiMap.get(idx);
    if (!ui) return;
    viewState.activeQIdx = idx;
    if (gradedState && viewState.wrongOnly && gradedState.results?.[idx]?.isCorrect) {
      applyWrongOnlyFilter(false);
    }
    if (viewState.activeSection !== ui.secNum) {
      switchToSection(ui.secNum, { focusTab: false, scrollTop: false });
    } else {
      syncNavAndTabs();
    }
    requestAnimationFrame(() => {
      ui.card.scrollIntoView({ behavior: preferAutoScroll(), block: "center" });
      ui.card.focus({ preventScroll: true });
      ui.card.classList.add("is-nav-target");
      setTimeout(() => ui.card.classList.remove("is-nav-target"), 1100);
    });
  };

  const stepQuestion = (delta) => {
    const pool = (gradedState && viewState.wrongOnly && wrongIndices.length > 0)
      ? wrongIndices
      : questions.map((_, i) => i);
    if (pool.length === 0) return;
    const curPos = pool.indexOf(viewState.activeQIdx);
    const nextPos = curPos === -1
      ? (delta > 0 ? 0 : pool.length - 1)
      : (curPos + delta + pool.length) % pool.length;
    jumpToQuestion(pool[nextPos]);
  };

  navPrevBtn.addEventListener("click", () => stepQuestion(-1));
  navNextBtn.addEventListener("click", () => stepQuestion(1));

  // Wire section tabs (click + roving tabindex arrow-key navigation per ARIA tabs pattern)
  sectionUiMap.forEach(({ secNum, tabBtn }) => {
    tabBtn.addEventListener("click", () => switchToSection(secNum, { focusTab: false, scrollTop: false }));
  });

  tablistEl.addEventListener("keydown", (e) => {
    const tabs = availableSections.map(s => sectionUiMap.get(s).tabBtn);
    const curIdx = tabs.indexOf(document.activeElement);
    if (curIdx === -1) return;
    let nextPos = null;
    if (e.key === "ArrowRight") nextPos = (curIdx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextPos = (curIdx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextPos = 0;
    else if (e.key === "End") nextPos = tabs.length - 1;
    if (nextPos !== null) {
      e.preventDefault();
      switchToSection(availableSections[nextPos], { focusTab: true, scrollTop: false });
    }
  });

  // Sync tab selection if browser Find-in-Page reveals a match in a hidden section panel
  panelsWrap.addEventListener("beforematch", (e) => {
    const matchedPanel = e.target?.closest?.(".ielts-section-panel");
    const matchedSec = Number(matchedPanel?.dataset?.section || 0);
    if (matchedSec && availableSections.includes(matchedSec)) {
      switchToSection(matchedSec, { focusTab: false, scrollTop: false });
    }
  });

  if (filterAllBtn && filterWrongBtn) {
    filterAllBtn.addEventListener("click", () => applyWrongOnlyFilter(false));
    filterWrongBtn.addEventListener("click", () => applyWrongOnlyFilter(true));
    applyWrongOnlyFilter(viewState.wrongOnly);
  }

  syncNavAndTabs();
  sectionedEl.appendChild(navBar);

  // Bottom Exam Submit / Graded Summary & Gemini Review Prompt Panel
  const footerCard = document.createElement("section");
  footerCard.className = "ielts-exam-footer-card";

  const rebuildView = () => {
    renderIeltsExamView({
      testMeta,
      questions,
      uid,
      loadSavedAnswers,
      saveAnswer,
      clearSavedAnswers,
      onRecordClick,
      onResetTelemetry,
      onStateSync,
      onAttemptGraded,
      onAttemptCleared,
      getAttemptHistory,
      getCloudSyncStatus,
      popoverEl
    });
  };

  if (!gradedState) {
    const row = document.createElement("div");
    row.className = "ielts-submit-row";

    const hint = document.createElement("p");
    hint.className = "form-hint";
    hint.textContent = bi(
      "作答過程中不會顯示對錯；按下交卷批改後即會鎖定碼表、換算官方 GT Band 級分、統計各題型表現並產生 Gemini 檢討 Prompt。",
      "Answers stay hidden while solving. Submit to stop timer, estimate GT Band score, analyze question types, and generate your Gemini prompt."
    );

    const btnWrap = document.createElement("div");
    btnWrap.className = "ielts-submit-buttons";

    const gradeBtn = document.createElement("button");
    gradeBtn.type = "button";
    gradeBtn.id = "ielts-grade-exam-btn";
    gradeBtn.className = "btn btn-primary";
    gradeBtn.textContent = bi("📝 交卷批改看成績", "📝 Submit & Grade");
    gradeBtn.addEventListener("click", () => {
      const answered = countAnswered();
      if (answered < questions.length) {
        const ok = window.confirm(
          bi(
            `目前尚有 ${questions.length - answered} 題未作答（已答 ${answered}/${questions.length} 題）。確定要現在交卷批改嗎？`,
            `${questions.length - answered} question(s) are unanswered (${answered}/${questions.length}). Submit and grade now?`
          )
        );
        if (!ok) return;
      }
      flushActiveTimer();
      const elapsedSec = Math.max(1, Math.round((activeIeltsTimerState?.elapsedMs || 0) / 1000));
      stopIeltsExamTimer({ flushSync: false });
      const graded = gradeIeltsExam(questions, answersMap);
      const gradedAt = Date.now();
      saveGradedState(uid, testId, {
        graded: true,
        elapsedSec,
        gradedAt,
        ...graded
      });
      touchIeltsSyncTimestamp(uid, testId, gradedAt);
      const compactSummary = buildCompactGradedSummary({
        graded: true,
        elapsedSec,
        gradedAt,
        ...graded
      }, questions.length);
      onAttemptGraded?.(testId, compactSummary);
      rebuildView();
      document.getElementById("ielts-result-card")?.scrollIntoView({ behavior: preferAutoScroll(), block: "nearest" });
    });

    const resetAttemptBtn = document.createElement("button");
    resetAttemptBtn.type = "button";
    resetAttemptBtn.className = "btn";
    resetAttemptBtn.textContent = bi("↺ 清空重寫", "↺ Clear Answers");
    resetAttemptBtn.addEventListener("click", () => {
      clearSavedAnswers(testId);
      clearIeltsAttemptState(uid, testId);
      onResetTelemetry?.(testId);
      onAttemptCleared?.(testId);
      rebuildView();
    });

    btnWrap.append(gradeBtn, resetAttemptBtn);
    row.append(hint, btnWrap);
    footerCard.appendChild(row);
    const preHistory = buildIeltsAttemptHistoryDetails(getAttemptHistory?.(testId) || [], questions.length);
    if (preHistory) {
      preHistory.style.marginTop = "0.85rem";
      footerCard.appendChild(preHistory);
    }
  } else {
    const resultCard = document.createElement("div");
    resultCard.className = "ielts-result-card";
    resultCard.id = "ielts-result-card";

    const elapsedSec = gradedState.elapsedSec || 0;
    const bandInfo = gradedState.bandInfo || calculateIeltsGtBandScore(gradedState.correctCount, gradedState.total);
    const typeStats = Array.isArray(gradedState.typeStats) && gradedState.typeStats.length > 0
      ? gradedState.typeStats
      : computeIeltsTypeStats(questions, gradedState);
    const promptText = buildIeltsGeminiReviewPrompt({
      testMeta,
      questions,
      gradeResult: gradedState,
      elapsedSec
    });

    const topStats = document.createElement("div");
    topStats.className = "ielts-result-stats";
    topStats.innerHTML = `
      <div class="ielts-stat-box is-band-box">
        <span class="ielts-stat-label">${bi("預估級分 (GT Reading)", "Estimated GT Band")}</span>
        <strong class="ielts-stat-value ielts-band-value" id="ielts-band-score-val">Band ${escapeHtml(bandInfo.band)}</strong>
        <span class="ielts-stat-sub">${escapeHtml(bi(bandInfo.labelZh, bandInfo.labelEn))}${bandInfo.isScaled ? ` · ${bandInfo.scaledOutOf40}/40` : ""}</span>
      </div>
      <div class="ielts-stat-box">
        <span class="ielts-stat-label">${bi("本次得分", "Score")}</span>
        <strong class="ielts-stat-value">${gradedState.correctCount} / ${gradedState.total}</strong>
        <span class="ielts-stat-sub">${bi(`正確率 ${gradedState.accuracyPct}%`, `${gradedState.accuracyPct}% accuracy`)}</span>
      </div>
      <div class="ielts-stat-box">
        <span class="ielts-stat-label">${bi("作答耗時", "Time Elapsed")}</span>
        <strong class="ielts-stat-value">${escapeHtml(formatExamDuration(elapsedSec))}</strong>
        <span class="ielts-stat-sub">${bi("已自動停止計時", "Stopwatch stopped")}</span>
      </div>
    `;

    // Question-Type Accuracy Breakdown Panel
    const breakdownBox = document.createElement("div");
    breakdownBox.className = "ielts-type-breakdown";
    breakdownBox.id = "ielts-type-breakdown";

    const bdTitle = document.createElement("div");
    bdTitle.className = "ielts-breakdown-title";
    bdTitle.textContent = bi("📊 各題型正確率分析", "📊 Accuracy by Question Type");
    breakdownBox.appendChild(bdTitle);

    const bdGrid = document.createElement("div");
    bdGrid.className = "ielts-breakdown-grid";
    typeStats.forEach((stat) => {
      const tierCls = stat.accuracyPct >= 80 ? "is-strong" : stat.accuracyPct >= 60 ? "is-mid" : "is-weak";
      const row = document.createElement("div");
      row.className = `ielts-type-row ${tierCls}${stat.isWeakest ? " is-weakest" : ""}`;
      row.innerHTML = `
        <div class="ielts-type-row-head">
          <span class="ielts-type-name">${escapeHtml(bi(stat.labelZh, stat.labelEn))}${stat.isWeakest ? `<span class="ielts-weak-pill">${bi("弱項複習", "Focus")}</span>` : ""}</span>
          <span class="ielts-type-score">${stat.correct} / ${stat.total} (${stat.accuracyPct}%)</span>
        </div>
        <div class="ielts-type-bar-track" aria-hidden="true">
          <div class="ielts-type-bar-fill" style="width: ${stat.accuracyPct}%"></div>
        </div>
      `;
      bdGrid.appendChild(row);
    });
    breakdownBox.appendChild(bdGrid);

    const actionRow = document.createElement("div");
    actionRow.className = "ielts-result-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.id = "ielts-copy-gemini-btn";
    copyBtn.className = "btn btn-primary";
    copyBtn.textContent = bi("📋 複製完整 Gemini Prompt", "📋 Copy Full Prompt");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(promptText);
        copyBtn.textContent = bi("✓ 已複製！可直接貼給 Gemini", "✓ Copied!");
        setTimeout(() => {
          copyBtn.textContent = bi("📋 複製完整 Gemini Prompt", "📋 Copy Full Prompt");
        }, 2500);
      } catch {
        const ta = document.querySelector("#ielts-result-card .ielts-prompt-textarea");
        if (ta) {
          document.querySelector("#ielts-result-card .ielts-prompt-details")?.setAttribute("open", "");
          ta.select();
          document.execCommand("copy");
          copyBtn.textContent = bi("✓ 已複製！可直接貼給 Gemini", "✓ Copied!");
        }
      }
    });

    const wrongOnlyPrompt = buildIeltsWrongOnlyGeminiPrompt({
      testMeta,
      questions,
      gradeResult: gradedState,
      elapsedSec
    });
    const copyWrongPromptBtn = document.createElement("button");
    copyWrongPromptBtn.type = "button";
    copyWrongPromptBtn.id = "ielts-copy-wrong-prompt-btn";
    copyWrongPromptBtn.className = "btn";
    copyWrongPromptBtn.textContent = bi("🎯 複製錯題精簡 Prompt", "🎯 Copy Wrong-Only Prompt");
    copyWrongPromptBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(wrongOnlyPrompt);
        copyWrongPromptBtn.textContent = bi("✓ 已複製錯題 Prompt！", "✓ Copied!");
        setTimeout(() => {
          copyWrongPromptBtn.textContent = bi("🎯 複製錯題精簡 Prompt", "🎯 Copy Wrong-Only Prompt");
        }, 2500);
      } catch {}
    });

    const tsvRowText = buildIeltsScoreSheetRowTsv({
      testMeta,
      questions,
      gradeResult: gradedState,
      elapsedSec,
      reviewedNote: aiReviewData?.sheetNote || ""
    });
    const copyTsvBtn = document.createElement("button");
    copyTsvBtn.type = "button";
    copyTsvBtn.id = "ielts-copy-tsv-btn";
    copyTsvBtn.className = "btn";
    copyTsvBtn.textContent = bi("📊 複製成績列（貼入 Sheet）", "📊 Copy Sheet Row (TSV)");
    copyTsvBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(tsvRowText);
        copyTsvBtn.textContent = bi("✓ 已複製成績列！", "✓ Row Copied!");
        setTimeout(() => {
          copyTsvBtn.textContent = bi("📊 複製成績列（貼入 Sheet）", "📊 Copy Sheet Row (TSV)");
        }, 2500);
      } catch {}
    });

    const aiReviewBtn = document.createElement("button");
    aiReviewBtn.type = "button";
    aiReviewBtn.id = "ielts-ai-review-btn";
    aiReviewBtn.className = "btn";
    aiReviewBtn.textContent = aiReviewData
      ? bi("✨ 重新生成 AI 錯題詳解", "✨ Refresh AI Explanations")
      : bi("✨ 一鍵 AI 錯題詳解", "✨ AI Explain Mistakes");

    if (wrongOrBlankCount > 0) {
      const reviewWrongBtn = document.createElement("button");
      reviewWrongBtn.type = "button";
      reviewWrongBtn.id = "ielts-jump-wrong-btn";
      reviewWrongBtn.className = "btn";
      reviewWrongBtn.textContent = bi(`🔍 只看 ${wrongOrBlankCount} 題錯題 / 未答`, `🔍 Review ${wrongOrBlankCount} Mistakes`);
      reviewWrongBtn.addEventListener("click", () => {
        applyWrongOnlyFilter(true);
        jumpToQuestion(wrongIndices[0]);
      });
      actionRow.appendChild(reviewWrongBtn);
    }

    const retakeBtn = document.createElement("button");
    retakeBtn.type = "button";
    retakeBtn.className = "btn";
    retakeBtn.textContent = bi("↺ 重新考試", "↺ Retake Test");
    retakeBtn.addEventListener("click", () => {
      clearSavedAnswers(testId);
      clearIeltsAttemptState(uid, testId);
      onResetTelemetry?.(testId);
      onAttemptCleared?.(testId);
      rebuildView();
      window.scrollTo({ top: 0, behavior: preferAutoScroll() });
    });

    actionRow.append(aiReviewBtn, copyWrongPromptBtn, copyTsvBtn, copyBtn, retakeBtn);

    let aiOverallCard = null;
    if (aiReviewData?.overallSummary) {
      aiOverallCard = document.createElement("div");
      aiOverallCard.className = "ielts-ai-overall-card";
      aiOverallCard.id = "ielts-ai-overall-card";
      aiOverallCard.innerHTML = `
        <div class="ielts-ai-exp-head"><span>✨ ${bi("AI 檢討總評", "AI Review Summary")}</span></div>
        <p class="ielts-ai-exp-body">${escapeHtml(aiReviewData.overallSummary)}</p>
      `;
    }

    const aiStatusMsg = document.createElement("p");
    aiStatusMsg.className = "form-hint ielts-ai-status-msg";
    aiStatusMsg.hidden = true;

    const aiCfg = loadIeltsAiConfig();
    const aiSettingsDetails = document.createElement("details");
    aiSettingsDetails.className = "ielts-ai-settings-details";
    aiSettingsDetails.id = "ielts-ai-settings-details";
    aiSettingsDetails.innerHTML = `
      <summary class="ielts-prompt-summary">⚙ ${bi("AI 詳解與試算表自動寫入設定（僅存於本機瀏覽器）", "AI Explanation & Sheet Logging Settings (Local Only)")}</summary>
      <div class="ielts-ai-settings-body">
        <label class="ielts-ai-field">
          <span>${bi("Gemini API Key（直連模式）", "Gemini API Key (Direct Mode)")}</span>
          <input type="password" id="ielts-ai-key-input" class="form-control" autocomplete="off" placeholder="AIza..." value="${escapeHtml(aiCfg.apiKey)}" />
        </label>
        <label class="ielts-ai-field">
          <span>${bi("選填：後端 API URL（例：http://127.0.0.1:8787）", "Optional: Backend URL (e.g. http://127.0.0.1:8787)")}</span>
          <input type="url" id="ielts-ai-backend-input" class="form-control" autocomplete="off" placeholder="http://127.0.0.1:8787" value="${escapeHtml(aiCfg.backendUrl)}" />
        </label>
        <label class="ielts-ai-field">
          <span>${bi("選填：後端 Bearer Token", "Optional: Backend Bearer Token")}</span>
          <input type="password" id="ielts-ai-token-input" class="form-control" autocomplete="off" value="${escapeHtml(aiCfg.backendToken)}" />
        </label>
        <label class="ielts-ai-check-row">
          <input type="checkbox" id="ielts-ai-autolog-input" ${aiCfg.autoLogSheet ? "checked" : ""} />
          <span>${bi("透過後端產出詳解時同時自動寫入 Google Sheet 成績表", "Also log score row to Google Sheet when using backend")}</span>
        </label>
        <div class="ielts-ai-settings-actions">
          <button type="button" id="ielts-ai-save-cfg-btn" class="btn btn-sm btn-primary">${bi("儲存設定", "Save Settings")}</button>
          <button type="button" id="ielts-log-sheet-btn" class="btn btn-sm">${bi("📤 透過後端寫入 Sheet", "📤 Log Score to Sheet")}</button>
        </div>
      </div>
    `;

    const readSettingsInputs = () => ({
      apiKey: aiSettingsDetails.querySelector("#ielts-ai-key-input")?.value || "",
      backendUrl: aiSettingsDetails.querySelector("#ielts-ai-backend-input")?.value || "",
      backendToken: aiSettingsDetails.querySelector("#ielts-ai-token-input")?.value || "",
      autoLogSheet: Boolean(aiSettingsDetails.querySelector("#ielts-ai-autolog-input")?.checked),
      model: aiCfg.model || "gemini-2.5-flash"
    });

    aiSettingsDetails.querySelector("#ielts-ai-save-cfg-btn")?.addEventListener("click", () => {
      const next = readSettingsInputs();
      saveIeltsAiConfig(next);
      aiStatusMsg.hidden = false;
      aiStatusMsg.textContent = bi("✓ AI 與後端設定已儲存至本機。", "✓ Saved locally.");
    });

    const structuredReqPayload = () => buildIeltsStructuredReviewRequest({
      testMeta,
      questions,
      gradeResult: gradedState,
      elapsedSec,
      autoLogSheet: readSettingsInputs().autoLogSheet
    });

    aiSettingsDetails.querySelector("#ielts-log-sheet-btn")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const cfg = readSettingsInputs();
      saveIeltsAiConfig(cfg);
      btn.disabled = true;
      aiStatusMsg.hidden = false;
      aiStatusMsg.textContent = bi("⏳ 正在透過後端寫入 Google Sheet…", "⏳ Writing score row to Google Sheet…");
      try {
        const req = structuredReqPayload();
        req.sheetNote = aiReviewData?.sheetNote || req.weakTypes;
        const out = await requestIeltsBackendScoreLog(req, cfg);
        aiStatusMsg.textContent = out.duplicate
          ? bi(`✓ 成績表已有此場紀錄（${out.sheetTitle}）。`, `✓ Already logged in ${out.sheetTitle}.`)
          : bi(`✓ 已成功寫入成績表：${out.sheetTitle} (${out.worksheet})`, `✓ Logged to ${out.sheetTitle} (${out.worksheet})`);
      } catch (err) {
        aiStatusMsg.textContent = `⚠ ${err?.message || err}`;
      } finally {
        btn.disabled = false;
      }
    });

    aiReviewBtn.addEventListener("click", async () => {
      const cfg = readSettingsInputs();
      if (!cfg.apiKey && !cfg.backendUrl) {
        aiSettingsDetails.open = true;
        aiStatusMsg.hidden = false;
        aiStatusMsg.textContent = bi(
          "請先填入個人 Gemini API Key 或後端 URL，再點「✨ 一鍵 AI 錯題詳解」（也可先直接用上方複製錯題精簡 Prompt）。",
          "Enter a Gemini API Key or backend URL first, or use Copy Wrong-Only Prompt above."
        );
        aiSettingsDetails.querySelector("#ielts-ai-key-input")?.focus();
        return;
      }
      saveIeltsAiConfig(cfg);
      aiReviewBtn.disabled = true;
      aiReviewBtn.textContent = bi("⏳ 生成詳解中…", "⏳ Generating…");
      aiStatusMsg.hidden = false;
      aiStatusMsg.textContent = bi("⏳ 正在分析錯題並比對原文證據…", "⏳ Analyzing mistakes against passages…");
      try {
        const { review, sheetResult } = await requestIeltsAiReview(structuredReqPayload(), cfg);
        saveIeltsAiReviewCache(uid, testId, { ...review, generatedAt: Date.now() });
        rebuildView();
        const postMsg = document.querySelector("#ielts-result-card .ielts-ai-status-msg");
        if (postMsg && sheetResult) {
          postMsg.hidden = false;
          postMsg.textContent = sheetResult.logged
            ? bi(`✓ 詳解已嵌入錯題卡，且成績已自動寫入 ${sheetResult.sheetTitle || "Google Sheet"}！`, "✓ Explanations added & score logged!")
            : bi(`✓ 詳解已嵌入錯題卡（Sheet 未自動寫入：${sheetResult.error || ""}）`, `✓ Explanations added (Sheet skipped: ${sheetResult.error || ""})`);
        }
      } catch (err) {
        aiStatusMsg.hidden = false;
        aiStatusMsg.textContent = `⚠ ${err?.message || err}`;
        aiReviewBtn.disabled = false;
        aiReviewBtn.textContent = aiReviewData
          ? bi("✨ 重新生成 AI 錯題詳解", "✨ Refresh AI Explanations")
          : bi("✨ 一鍵 AI 錯題詳解", "✨ AI Explain Mistakes");
      }
    });

    const detailsEl = document.createElement("details");
    detailsEl.className = "ielts-prompt-details";
    const summaryEl = document.createElement("summary");
    summaryEl.className = "ielts-prompt-summary";
    summaryEl.textContent = bi("▸ 預覽 Gemini 檢討 Prompt 內容（含原文、您的作答與正解）", "▸ Preview Full Gemini Review Prompt");
    const ta = document.createElement("textarea");
    ta.className = "form-control ielts-prompt-textarea";
    ta.readOnly = true;
    ta.rows = 12;
    ta.value = promptText;
    detailsEl.append(summaryEl, ta);

    const historyEl = buildIeltsAttemptHistoryDetails(getAttemptHistory?.(testId) || [], questions.length);
    resultCard.append(topStats, breakdownBox, actionRow, aiStatusMsg);
    if (aiOverallCard) resultCard.appendChild(aiOverallCard);
    if (historyEl) resultCard.appendChild(historyEl);
    resultCard.append(aiSettingsDetails, detailsEl);
    footerCard.appendChild(resultCard);
  }

  sectionedEl.appendChild(footerCard);
  updateProgressBar();
}
