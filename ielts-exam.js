import {
  escapeHtml,
  formatExamDuration,
  gradeIeltsExam,
  buildIeltsGeminiReviewPrompt
} from "./app-helpers.js?v=20261125c";
import { renderInteractiveReadingPassage } from "./reading-scaffold.js?v=20261125c";
import { bi } from "./i18n.js?v=20261125c";

export const DEFAULT_IELTS_SHEET_ID = "";
export const IELTS_SHEET_ID_STORAGE_KEY = "ielts_custom_sheet_id_v1";

let ieltsStopwatchInterval = null;
let activeIeltsTimerState = null;

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
  const mod = await import("./ielts-gt-data.js?v=20261125c");
  let tests = Array.isArray(mod.IELTS_TESTS) ? mod.IELTS_TESTS.map(t => ({ ...t })) : [];
  let questions = Array.isArray(mod.IELTS_QUESTIONS) ? mod.IELTS_QUESTIONS.map(q => ({ ...q })) : [];
  let sourceKind = "bundled";

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
        }
      }
    } catch (err) {
      console.warn("IELTS remote sheet fetch failed; falling back to bundled dataset:", err?.message || err);
    }
  }

  return { tests, questions, sourceKind, sheetId };
}

function getIeltsTimerKey(uid, testId) {
  return `ielts_timer_v1:${uid || "anon"}:${testId}`;
}

function getIeltsGradedKey(uid, testId) {
  return `ielts_graded_v1:${uid || "anon"}:${testId}`;
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

export function stopIeltsExamTimer() {
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
  if (ieltsStopwatchInterval) {
    clearInterval(ieltsStopwatchInterval);
    ieltsStopwatchInterval = null;
  }
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

function renderIeltsQuestionCard({
  q,
  idx,
  savedValue,
  gradedInfo,
  onChange
}) {
  const card = document.createElement("div");
  card.className = "question-card ielts-question-card";
  card.dataset.index = String(idx);

  if (gradedInfo) {
    card.classList.add(gradedInfo.isCorrect ? "correct" : "incorrect");
  } else if (savedValue) {
    card.classList.add("has-draft");
  }

  const qType = String(q.Type || "").toUpperCase();

  const badge = document.createElement("div");
  badge.className = "question-type-badge";
  badge.textContent = `Question ${q.Q_Num}`;
  card.appendChild(badge);

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
  }

  return card;
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
  popoverEl
}) {
  stopIeltsExamTimer();

  const splitDefaultEl = document.getElementById("reading-split-default");
  const sectionedEl = document.getElementById("sectioned-quiz-container");
  const quizContainer = document.getElementById("quiz-container");
  const progressFill = document.getElementById("quiz-progress-fill");
  const resetQuizBtn = document.getElementById("reset-quiz-btn");
  if (!sectionedEl) return;

  splitDefaultEl?.classList.add("hidden");
  sectionedEl.classList.remove("hidden");
  sectionedEl.innerHTML = "";
  if (quizContainer) quizContainer.innerHTML = "";

  const testId = testMeta.Test_ID;
  let answersMap = loadSavedAnswers(testId);
  let gradedState = loadGradedState(uid, testId);

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

  const syncTimerDom = () => {
    if (!activeIeltsTimerState) return;
    flushActiveTimer();
    const sec = Math.round(activeIeltsTimerState.elapsedMs / 1000);
    clockEl.textContent = `⏱ ${formatClock(sec)}`;
    statusCountEl.textContent = bi(`已填答 ${countAnswered()} / ${questions.length} 題`, `Answered ${countAnswered()} / ${questions.length}`);
    toggleTimerBtn.textContent = activeIeltsTimerState.running ? bi("⏸ 暫停碼表", "⏸ Pause") : bi("▶ 繼續計時", "▶ Resume");
    toggleTimerBtn.disabled = Boolean(gradedState);
    resetTimerBtn.disabled = Boolean(gradedState);
    saveTimerSnapshot(uid, testId, activeIeltsTimerState.elapsedMs, activeIeltsTimerState.running);
  };

  toggleTimerBtn.addEventListener("click", () => {
    if (!activeIeltsTimerState || gradedState) return;
    flushActiveTimer();
    activeIeltsTimerState.running = !activeIeltsTimerState.running;
    activeIeltsTimerState.lastTickMs = Date.now();
    syncTimerDom();
  });

  resetTimerBtn.addEventListener("click", () => {
    if (!activeIeltsTimerState || gradedState) return;
    activeIeltsTimerState.elapsedMs = 0;
    activeIeltsTimerState.lastTickMs = Date.now();
    syncTimerDom();
  });

  syncTimerDom();
  if (!gradedState) {
    ieltsStopwatchInterval = setInterval(syncTimerDom, 1000);
  }

  const timerControls = document.createElement("div");
  timerControls.className = "ielts-timer-controls";
  timerControls.append(statusCountEl, toggleTimerBtn, resetTimerBtn);

  timerBar.append(clockEl, timerControls);
  sectionedEl.appendChild(timerBar);

  // Build Sections 1, 2, 3
  [1, 2, 3].forEach(secNum => {
    const secQs = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => Number(q.Section) === secNum);
    const secTitle = testMeta[`Section_${secNum}_Title`] || `Section ${secNum}`;
    const secBody = testMeta[`Section_${secNum}_Body`] || "";
    const secImg = testMeta[`Section_${secNum}_Image`] || "";
    if (!secBody && secQs.length === 0) return;

    const secBlock = document.createElement("section");
    secBlock.className = "quiz-section-block";

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
    quizPane.className = "quiz-pane";

    secQs.forEach(({ q, idx }) => {
      if (q.Group_Prompt) {
        const grpBanner = document.createElement("div");
        grpBanner.className = "ielts-group-prompt";
        grpBanner.textContent = q.Group_Prompt;
        quizPane.appendChild(grpBanner);
      }

      const gradedInfo = gradedState?.results?.[idx] || null;
      const card = renderIeltsQuestionCard({
        q,
        idx,
        savedValue: answersMap[String(idx)] || "",
        gradedInfo,
        onChange: (qIdx, val) => {
          answersMap[String(qIdx)] = val;
          saveAnswer(testId, qIdx, val);
          if (String(val || "").trim().length > 0) {
            onRecordClick?.(testId, qIdx, val);
          }
          updateProgressBar();
          statusCountEl.textContent = bi(`已填答 ${countAnswered()} / ${questions.length} 題`, `Answered ${countAnswered()} / ${questions.length}`);
        }
      });
      quizPane.appendChild(card);
    });

    split.append(readingPane, quizPane);
    secBlock.appendChild(split);
    sectionedEl.appendChild(secBlock);

    renderInteractiveReadingPassage({
      bodyEl,
      toolsEl: toolsSlot,
      popoverEl,
      passageText: secBody,
      vocabRows: [],
      uid: uid || "guest",
      dateStr: testId,
      sectionKey: `sec_${secNum}`,
      preserveExisting: true
    });
  });

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
      popoverEl
    });
  };

  if (!gradedState) {
    const row = document.createElement("div");
    row.className = "ielts-submit-row";

    const hint = document.createElement("p");
    hint.className = "form-hint";
    hint.textContent = bi(
      "作答過程中不會顯示對錯；按下交卷批改後即會鎖定碼表、公佈全部正解並產生 Gemini 檢討 Prompt。",
      "Answers stay hidden while solving. Submit to stop timer, view answers, and generate your Gemini review prompt."
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
      stopIeltsExamTimer();
      const graded = gradeIeltsExam(questions, answersMap);
      saveGradedState(uid, testId, {
        graded: true,
        elapsedSec,
        gradedAt: Date.now(),
        ...graded
      });
      rebuildView();
      footerCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    const resetAttemptBtn = document.createElement("button");
    resetAttemptBtn.type = "button";
    resetAttemptBtn.className = "btn";
    resetAttemptBtn.textContent = bi("↺ 清空重寫", "↺ Clear Answers");
    resetAttemptBtn.addEventListener("click", () => {
      clearSavedAnswers(testId);
      saveGradedState(uid, testId, null);
      saveTimerSnapshot(uid, testId, 0, true);
      onResetTelemetry?.(testId);
      rebuildView();
    });

    btnWrap.append(gradeBtn, resetAttemptBtn);
    row.append(hint, btnWrap);
    footerCard.appendChild(row);
  } else {
    const resultCard = document.createElement("div");
    resultCard.className = "ielts-result-card";
    resultCard.id = "ielts-result-card";

    const elapsedSec = gradedState.elapsedSec || 0;
    const promptText = buildIeltsGeminiReviewPrompt({
      testMeta,
      questions,
      gradeResult: gradedState,
      elapsedSec
    });

    const topStats = document.createElement("div");
    topStats.className = "ielts-result-stats";
    topStats.innerHTML = `
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

    const actionRow = document.createElement("div");
    actionRow.className = "ielts-result-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.id = "ielts-copy-gemini-btn";
    copyBtn.className = "btn btn-primary";
    copyBtn.textContent = bi("📋 一鍵複製給 Gemini 檢討 Prompt", "📋 Copy Gemini Review Prompt");
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(promptText);
        copyBtn.textContent = bi("✓ 已複製！可直接貼給 Gemini", "✓ Copied to Clipboard!");
        setTimeout(() => {
          copyBtn.textContent = bi("📋 一鍵複製給 Gemini 檢討 Prompt", "📋 Copy Gemini Review Prompt");
        }, 2500);
      } catch {
        const ta = footerCard.querySelector(".ielts-prompt-textarea");
        if (ta) {
          footerCard.querySelector(".ielts-prompt-details")?.setAttribute("open", "");
          ta.select();
          document.execCommand("copy");
          copyBtn.textContent = bi("✓ 已複製！可直接貼給 Gemini", "✓ Copied!");
        }
      }
    });

    const retakeBtn = document.createElement("button");
    retakeBtn.type = "button";
    retakeBtn.className = "btn";
    retakeBtn.textContent = bi("↺ 重新考試", "↺ Retake Test");
    retakeBtn.addEventListener("click", () => {
      clearSavedAnswers(testId);
      saveGradedState(uid, testId, null);
      saveTimerSnapshot(uid, testId, 0, true);
      onResetTelemetry?.(testId);
      rebuildView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    actionRow.append(copyBtn, retakeBtn);

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

    resultCard.append(topStats, actionRow, detailsEl);
    footerCard.appendChild(resultCard);
  }

  sectionedEl.appendChild(footerCard);
  updateProgressBar();

  if (resetQuizBtn) {
    resetQuizBtn.onclick = () => {
      clearSavedAnswers(testId);
      saveGradedState(uid, testId, null);
      saveTimerSnapshot(uid, testId, 0, true);
      onResetTelemetry?.(testId);
      rebuildView();
    };
  }
}
