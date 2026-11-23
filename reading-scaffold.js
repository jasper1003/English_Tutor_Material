import { escapeHtml, speakWord } from "./app-helpers.js?v=20261123h";
import { bi } from "./i18n.js?v=20261123h";

const HINTS_PREF_KEY = "reading_vocab_hints_on";
const VALID_MARK_VALUES = ["yellow", "mint", "blue"];

const IRREGULAR_FIRST_WORDS = {
  be: "am|is|are|was|were|been|being",
  come: "comes|came|coming",
  do: "does|did|done|doing",
  feel: "feels|felt|feeling",
  find: "finds|found|finding",
  get: "gets|got|gotten|getting",
  give: "gives|gave|given|giving",
  go: "goes|went|gone|going",
  have: "has|had|having",
  keep: "keeps|kept|keeping",
  know: "knows|knew|known|knowing",
  make: "makes|made|making",
  say: "says|said|saying",
  see: "sees|saw|seen|seeing",
  take: "takes|took|taken|taking",
  think: "thinks|thought|thinking"
};

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSingleWordPattern(rawWord) {
  const lower = rawWord.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(IRREGULAR_FIRST_WORDS, lower)) {
    return `(?:${escapeRegExp(rawWord)}|${IRREGULAR_FIRST_WORDS[lower]})`;
  }
  if (/^[a-z]+$/i.test(rawWord) && rawWord.length >= 3) {
    if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(rawWord)) {
      const stem = escapeRegExp(rawWord.slice(0, -1));
      return `(?:${stem}y|${stem}ies|${stem}ied|${stem}ying)`;
    }
    if (/[^eoy]e$/i.test(rawWord)) {
      const stem = escapeRegExp(rawWord.slice(0, -1));
      return `${stem}(?:e|es|ed|ing)`;
    }
    return `${escapeRegExp(rawWord)}(?:'s|s|es|ed|ing)?`;
  }
  return escapeRegExp(rawWord);
}

function buildVocabPatternCandidates(wordField) {
  const cleaned = String(wordField || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const rawVariants = cleaned.includes("/")
    ? cleaned.split("/").map(s => s.trim()).filter(Boolean)
    : [cleaned];

  const patterns = [];
  for (const variant of rawVariants) {
    if (/\.{2,}/.test(variant)) continue;
    const tokens = variant.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    if (tokens.length === 1) {
      const token = tokens[0].replace(/^['"]+|['"]+$/g, "");
      if (token.length < 2) continue;
      patterns.push({
        sortLen: token.length,
        regexText: `\\b${buildSingleWordPattern(token)}\\b`
      });
      continue;
    }

    const tokenPatterns = tokens.map((tok, idx) => {
      if (/^one's$/i.test(tok)) {
        return "(?:my|your|his|her|its|our|their|someone's|[a-z]+'s)";
      }
      if (idx === 0 && /^[a-z]+$/i.test(tok)) {
        return buildSingleWordPattern(tok);
      }
      return escapeRegExp(tok);
    });
    patterns.push({
      sortLen: variant.length + 10,
      regexText: `\\b${tokenPatterns.join("\\s+")}\\b`
    });
  }
  return patterns;
}

export function buildVocabMatcher(vocabRows = []) {
  const entries = [];
  vocabRows.forEach((row, vocabIdx) => {
    const candidates = buildVocabPatternCandidates(row?.Word);
    candidates.forEach(cand => {
      entries.push({
        vocabIdx,
        row,
        sortLen: cand.sortLen,
        regexText: cand.regexText
      });
    });
  });

  if (entries.length === 0) return null;

  // Match longer phrases first so multi-word idioms beat single-word matches
  entries.sort((a, b) => b.sortLen - a.sortLen);
  const combined = new RegExp(
    entries.map(e => `(${e.regexText})`).join("|"),
    "gi"
  );
  return { entries, regex: combined };
}

export function splitParagraphIntoSentences(paragraphText) {
  const text = String(paragraphText || "");
  if (!text) return [];

  const abbrRe = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|a\.m|p\.m)\.$/i;
  const spans = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    let endPunct = i;
    while (endPunct + 1 < text.length && /[.!?]/.test(text[endPunct + 1])) {
      endPunct++;
    }
    while (endPunct + 1 < text.length && /["”’)\]]/.test(text[endPunct + 1])) {
      endPunct++;
    }

    const upto = text.slice(start, endPunct + 1);
    if (ch === "." && (abbrRe.test(upto) || /\d\.\d/.test(text.slice(Math.max(0, i - 1), i + 2)))) {
      i = endPunct;
      continue;
    }

    let wsEnd = endPunct + 1;
    while (wsEnd < text.length && /\s/.test(text[wsEnd])) {
      wsEnd++;
    }
    const nextChar = text[wsEnd] || "";
    const isBoundary = wsEnd === text.length || (wsEnd > endPunct + 1 && /[A-Z0-9"“‘(\[]/.test(nextChar));
    if (isBoundary) {
      spans.push(text.slice(start, wsEnd));
      start = wsEnd;
      i = wsEnd - 1;
    } else {
      i = endPunct;
    }
  }

  if (start < text.length) {
    spans.push(text.slice(start));
  }
  return spans.filter(s => s.length > 0);
}

function loadReadingMarks(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const clean = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (/^\d+$/.test(k) && VALID_MARK_VALUES.includes(v)) {
        clean[k] = "yellow";
      }
    });
    return clean;
  } catch {
    return {};
  }
}

function saveReadingMarks(storageKey, marks) {
  try {
    const keys = Object.keys(marks);
    if (keys.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(marks));
    }
  } catch {
    // Ignore storage quota or private mode issues
  }
}

function readHintsEnabledPref() {
  try {
    return localStorage.getItem(HINTS_PREF_KEY) !== "false";
  } catch {
    return true;
  }
}

function saveHintsEnabledPref(enabled) {
  try {
    localStorage.setItem(HINTS_PREF_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

function installToolbarRovingFallback(toolbarEl) {
  if (!toolbarEl || "focusGroup" in HTMLElement.prototype) return;
  const getItems = () => Array.from(toolbarEl.querySelectorAll("button"));
  const items = getItems();
  items.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
  });

  toolbarEl.addEventListener("focusin", ({ target }) => {
    const list = getItems();
    if (!list.includes(target)) return;
    list.forEach(b => {
      b.tabIndex = b === target ? 0 : -1;
    });
  });

  toolbarEl.addEventListener("keydown", e => {
    const list = getItems();
    const curIdx = list.indexOf(document.activeElement);
    if (curIdx === -1 || list.length === 0) return;

    const rtl = getComputedStyle(toolbarEl).direction === "rtl";
    let nextIdx = -1;
    if (e.key === "ArrowRight") {
      nextIdx = (curIdx + (rtl ? -1 : 1) + list.length) % list.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (curIdx + (rtl ? 1 : -1) + list.length) % list.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = list.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    list.forEach((b, i) => {
      b.tabIndex = i === nextIdx ? 0 : -1;
    });
    list[nextIdx]?.focus();
  });
}

function supportsNativePopover(el) {
  return Boolean(el && typeof el.showPopover === "function" && typeof el.hidePopover === "function");
}

function isPopoverShown(el) {
  if (!el) return false;
  if (supportsNativePopover(el)) {
    try {
      return el.matches(":popover-open");
    } catch {
      return el.classList.contains("is-open");
    }
  }
  return el.classList.contains("is-open");
}

let activeScaffoldCleanup = null;

export function renderInteractiveReadingPassage({
  bodyEl,
  toolsEl,
  popoverEl,
  passageText,
  vocabRows = [],
  uid = "guest",
  dateStr = "default"
}) {
  activeScaffoldCleanup?.();
  activeScaffoldCleanup = null;

  if (!bodyEl) return;

  const storageKey = `reading_marks:${uid || "guest"}:${dateStr || "default"}`;
  let marks = loadReadingMarks(storageKey);
  let penEnabled = true;
  let hintsEnabled = readHintsEnabledPref();
  let activeChipEl = null;
  let closeTimer = null;

  const matcher = buildVocabMatcher(vocabRows);
  const paragraphs = String(passageText || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  bodyEl.innerHTML = "";
  bodyEl.dataset.vocabHints = hintsEnabled ? "on" : "off";
  bodyEl.dataset.penMode = penEnabled ? "yellow" : "off";

  let sentenceCounter = 0;
  paragraphs.forEach(paraText => {
    const pEl = document.createElement("p");
    pEl.className = "reading-paragraph";
    const sentences = splitParagraphIntoSentences(paraText);

    sentences.forEach(sentenceStr => {
      const sIdx = String(sentenceCounter++);
      const sentSpan = document.createElement("span");
      sentSpan.className = "reading-sentence";
      sentSpan.dataset.sentenceIdx = sIdx;
      if (marks[sIdx]) {
        sentSpan.dataset.mark = marks[sIdx];
      }

      if (!matcher) {
        sentSpan.appendChild(document.createTextNode(sentenceStr));
      } else {
        matcher.regex.lastIndex = 0;
        let lastPos = 0;
        let match;
        while ((match = matcher.regex.exec(sentenceStr)) !== null) {
          if (match.index > lastPos) {
            sentSpan.appendChild(document.createTextNode(sentenceStr.slice(lastPos, match.index)));
          }
          let matchedEntry = null;
          for (let g = 1; g < match.length; g++) {
            if (match[g] !== undefined) {
              matchedEntry = matcher.entries[g - 1];
              break;
            }
          }
          if (matchedEntry) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "reading-vocab-chip";
            chip.dataset.vocabIdx = String(matchedEntry.vocabIdx);
            chip.textContent = match[0];
            chip.setAttribute("aria-haspopup", "dialog");
            chip.setAttribute("aria-expanded", "false");
            sentSpan.appendChild(chip);
          } else {
            sentSpan.appendChild(document.createTextNode(match[0]));
          }
          lastPos = match.index + match[0].length;
        }
        if (lastPos < sentenceStr.length) {
          sentSpan.appendChild(document.createTextNode(sentenceStr.slice(lastPos)));
        }
      }
      pEl.appendChild(sentSpan);
    });

    bodyEl.appendChild(pEl);
  });

  const hidePopover = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (activeChipEl) {
      activeChipEl.setAttribute("aria-expanded", "false");
      activeChipEl = null;
    }
    if (!popoverEl) return;
    if (supportsNativePopover(popoverEl)) {
      if (isPopoverShown(popoverEl)) {
        try {
          popoverEl.hidePopover();
        } catch {
          // Ignore if already closed
        }
      }
    } else {
      popoverEl.classList.remove("is-open");
    }
  };

  const positionPopoverNear = chip => {
    if (!popoverEl || !chip) return;
    const rect = chip.getBoundingClientRect();
    const popW = Math.min(280, Math.max(210, popoverEl.offsetWidth || 250));
    const popH = popoverEl.offsetHeight || 110;
    const pad = 12;

    const placeBelow = rect.top < popH + 20 && (window.innerHeight - rect.bottom) >= popH + 16;
    const rawCenter = rect.left + rect.width / 2;
    const clampedLeft = Math.max(pad, Math.min(window.innerWidth - popW - pad, rawCenter - popW / 2));
    const arrowOffset = Math.max(16, Math.min(popW - 16, rawCenter - clampedLeft));

    popoverEl.style.width = `${popW}px`;
    popoverEl.style.left = `${Math.round(clampedLeft)}px`;
    popoverEl.style.setProperty("--arrow-x", `${Math.round(arrowOffset)}px`);

    if (placeBelow) {
      popoverEl.dataset.placement = "bottom";
      popoverEl.style.top = `${Math.round(rect.bottom + 9)}px`;
    } else {
      popoverEl.dataset.placement = "top";
      popoverEl.style.top = `${Math.round(Math.max(pad, rect.top - popH - 9))}px`;
    }
  };

  const showPopoverForChip = chip => {
    if (!popoverEl || !hintsEnabled) return;
    const idx = Number(chip.dataset.vocabIdx);
    const vocabItem = vocabRows[idx];
    if (!vocabItem) return;

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (activeChipEl && activeChipEl !== chip) {
      activeChipEl.setAttribute("aria-expanded", "false");
    }
    activeChipEl = chip;
    chip.setAttribute("aria-expanded", "true");

    popoverEl.innerHTML = `
      <span class="reading-popover-arrow" aria-hidden="true"></span>
      <div class="reading-popover-head">
        <div class="reading-popover-title-row">
          <strong class="reading-popover-word">${escapeHtml(vocabItem.Word || "")}</strong>
          ${vocabItem.POS ? `<span class="pos-badge">${escapeHtml(vocabItem.POS)}</span>` : ""}
        </div>
        <button type="button" class="reading-popover-speak" aria-label="${bi(`朗讀 ${escapeHtml(vocabItem.Word || "單字")}`, `Pronounce ${escapeHtml(vocabItem.Word || "word")}`)}">🔊</button>
      </div>
      <div class="reading-popover-meaning">${escapeHtml(vocabItem.Meaning || "")}</div>
    `;

    const speakBtn = popoverEl.querySelector(".reading-popover-speak");
    speakBtn?.addEventListener("click", e => {
      e.stopPropagation();
      speakWord(vocabItem.Word || "");
    });

    if (supportsNativePopover(popoverEl)) {
      if (!isPopoverShown(popoverEl)) {
        try {
          popoverEl.showPopover();
        } catch {
          // Ignore popover state error
        }
      }
    } else {
      popoverEl.classList.add("is-open");
    }
    positionPopoverNear(chip);
  };

  let statusEl = null;
  const announceStatus = msg => {
    if (statusEl) statusEl.textContent = msg;
  };

  if (toolsEl) {
    toolsEl.innerHTML = `
      <div class="reading-tools-bar" role="toolbar" focusgroup="toolbar wrap" aria-label="${bi("閱讀劃記與單字提示工具", "Reading highlighter and vocabulary hint tools")}" aria-controls="reading-body">
        <button type="button" class="reading-icon-btn" data-action="toggle-pen" aria-pressed="true" aria-label="${bi("黃色螢光筆畫線", "Yellow highlighter")}" title="${bi("黃色螢光筆（點擊句子畫線／取消）", "Yellow highlighter (click sentence to highlight/unhighlight)")}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 11-6 6v3h9l3-3"></path>
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
            <path d="M3 21h9" stroke="#eab308" stroke-width="2.6"></path>
          </svg>
        </button>
        <button type="button" class="reading-icon-btn" data-action="toggle-vocab" aria-pressed="${hintsEnabled ? "true" : "false"}" aria-label="${bi("切換核心單字提示", "Toggle core vocabulary hints")}" title="${bi("核心單字提示（開／關）", "Core vocabulary hints (On/Off)")}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
            <path d="M9 18h6"></path>
            <path d="M10 22h4"></path>
          </svg>
        </button>
        <span class="reading-tool-sep" role="separator" aria-orientation="vertical"></span>
        <button type="button" class="reading-icon-btn" data-action="clear-marks" aria-label="${bi("清除全部畫線", "Clear all highlights")}" title="${bi("清除全部畫線", "Clear all highlights")}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
            <path d="M22 21H7"></path>
            <path d="m5 11 9 9"></path>
          </svg>
        </button>
      </div>
      <span class="visually-hidden" id="reading-tools-status" role="status" aria-live="polite"></span>
    `;

    const toolbarEl = toolsEl.querySelector('[role="toolbar"]');
    statusEl = toolsEl.querySelector("#reading-tools-status");
    installToolbarRovingFallback(toolbarEl);

    const togglePenBtn = toolsEl.querySelector('[data-action="toggle-pen"]');
    togglePenBtn?.addEventListener("click", () => {
      penEnabled = !penEnabled;
      bodyEl.dataset.penMode = penEnabled ? "yellow" : "off";
      togglePenBtn.setAttribute("aria-pressed", String(penEnabled));
      announceStatus(penEnabled
        ? bi("已開啟黃色螢光筆", "Yellow highlighter enabled")
        : bi("已暫停螢光筆畫線", "Highlighter paused"));
    });

    const toggleVocabBtn = toolsEl.querySelector('[data-action="toggle-vocab"]');
    toggleVocabBtn?.addEventListener("click", () => {
      hintsEnabled = !hintsEnabled;
      saveHintsEnabledPref(hintsEnabled);
      bodyEl.dataset.vocabHints = hintsEnabled ? "on" : "off";
      toggleVocabBtn.setAttribute("aria-pressed", String(hintsEnabled));
      if (!hintsEnabled) hidePopover();
      announceStatus(hintsEnabled
        ? bi("已開啟核心單字提示", "Vocabulary hints enabled")
        : bi("已關閉核心單字提示", "Vocabulary hints hidden"));
    });

    const clearBtn = toolsEl.querySelector('[data-action="clear-marks"]');
    clearBtn?.addEventListener("click", () => {
      marks = {};
      saveReadingMarks(storageKey, marks);
      bodyEl.querySelectorAll(".reading-sentence[data-mark]").forEach(el => {
        el.removeAttribute("data-mark");
      });
      announceStatus(bi("已清除本篇所有證據畫線", "Cleared all highlights in this passage"));
    });
  }

  const onBodyClick = e => {
    const chip = e.target.closest(".reading-vocab-chip");
    if (chip && bodyEl.contains(chip)) {
      if (!hintsEnabled) return;
      e.stopPropagation();
      if (activeChipEl === chip && isPopoverShown(popoverEl)) {
        hidePopover();
      } else {
        showPopoverForChip(chip);
      }
      return;
    }

    if (!penEnabled) return;
    const sentence = e.target.closest(".reading-sentence");
    if (sentence && bodyEl.contains(sentence)) {
      hidePopover();
      const idx = sentence.dataset.sentenceIdx;
      if (!idx) return;
      if (marks[idx] === "yellow") {
        delete marks[idx];
        sentence.removeAttribute("data-mark");
      } else {
        marks[idx] = "yellow";
        sentence.dataset.mark = "yellow";
      }
      saveReadingMarks(storageKey, marks);
    }
  };

  const onChipPointerEnter = e => {
    if (!hintsEnabled) return;
    const chip = e.target.closest(".reading-vocab-chip");
    if (!chip || !bodyEl.contains(chip)) return;
    if (window.matchMedia("(hover: hover)").matches) {
      showPopoverForChip(chip);
    }
  };

  const onChipPointerLeave = e => {
    const chip = e.target.closest(".reading-vocab-chip");
    if (!chip || !bodyEl.contains(chip)) return;
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!popoverEl?.matches(":hover")) {
        hidePopover();
      }
    }, 180);
  };

  const onPopoverEnter = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const onPopoverLeave = () => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => hidePopover(), 140);
  };

  const onViewportChange = () => {
    if (activeChipEl && isPopoverShown(popoverEl)) {
      positionPopoverNear(activeChipEl);
    }
  };

  bodyEl.addEventListener("click", onBodyClick);
  bodyEl.addEventListener("mouseover", onChipPointerEnter);
  bodyEl.addEventListener("mouseout", onChipPointerLeave);
  popoverEl?.addEventListener("mouseenter", onPopoverEnter);
  popoverEl?.addEventListener("mouseleave", onPopoverLeave);
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);

  activeScaffoldCleanup = () => {
    hidePopover();
    bodyEl.removeEventListener("click", onBodyClick);
    bodyEl.removeEventListener("mouseover", onChipPointerEnter);
    bodyEl.removeEventListener("mouseout", onChipPointerLeave);
    popoverEl?.removeEventListener("mouseenter", onPopoverEnter);
    popoverEl?.removeEventListener("mouseleave", onPopoverLeave);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
  };
}

export function clearReadingScaffold() {
  activeScaffoldCleanup?.();
  activeScaffoldCleanup = null;
}
