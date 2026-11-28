#!/usr/bin/env node
/**
 * Zero-dependency production integrity & regression suite for English_Tutor_Material.
 * Runs locally and in GitHub Actions CI before any live GitHub Pages deployment.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// Shim minimal browser globals so ESM modules that read location/navigator/localStorage safely load in Node
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { origin: "https://example.invalid", search: "", href: "https://example.invalid/" } };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    documentElement: { lang: "zh-Hant" },
    querySelectorAll: () => [],
    getElementById: () => null
  };
}
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k)
  };
}

// 1. JS syntax verification across every script + Service Worker
const jsFiles = fs.readdirSync(ROOT_DIR)
  .filter((name) => name.endsWith(".js"))
  .sort();
assert.ok(jsFiles.length >= 10, `Expected >= 10 JS modules in root, got ${jsFiles.length}`);
for (const file of jsFiles) {
  execFileSync(process.execPath, ["--check", path.join(ROOT_DIR, file)], { stdio: "pipe" });
}
console.log(`[PASS] Syntax verified for ${jsFiles.length} JS modules & sw.js`);

// 2. Cache-buster version alignment check (sw.js <-> index.html <-> ielts-exam.js)
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
const swSrc = fs.readFileSync(path.join(ROOT_DIR, "sw.js"), "utf8");
const ieltsSrc = fs.readFileSync(path.join(ROOT_DIR, "ielts-exam.js"), "utf8");
const swVerMatch = swSrc.match(/const CACHE_VERSION = "([^"]+)";/);
assert.ok(swVerMatch, "sw.js must define CACHE_VERSION");
const activeVersion = swVerMatch[1];
assert.ok(indexHtml.includes(`./styles.css?v=${activeVersion}`), `index.html styles.css must match version ${activeVersion}`);
assert.ok(indexHtml.includes(`./app-main.js?v=${activeVersion}`), `index.html app-main.js must match version ${activeVersion}`);
assert.ok(ieltsSrc.includes(`const IELTS_DATA_VERSION = "${activeVersion}";`), `ielts-exam.js must match version ${activeVersion}`);
assert.ok(indexHtml.includes('rel="preconnect"'), "index.html must include preconnect resource hints");
console.log(`[PASS] Cache version & resource hints aligned (${activeVersion})`);

// 3. Curriculum CDN, Learned Index, App Config, and IELTS manifests + disk asset validation
const curriculumIndex = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/curriculum/index.json"), "utf8"));
const learnedIndex = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/curriculum/learned_index.json"), "utf8"));
const appConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/config/app-config.json"), "utf8"));
const ieltsIndex = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/ielts/index.json"), "utf8"));

assert.ok(Array.isArray(curriculumIndex.lessons) && curriculumIndex.lessons.length >= 28, "Expected >= 28 student lessons in curriculum index");
assert.ok(curriculumIndex.lessons.length < 450, `Lesson count (${curriculumIndex.lessons.length}) approaching 500 Firestore map ceiling; shard user progress maps`);

let totalVocabCount = 0;
let totalQuizCount = 0;
let checkedAudioCount = 0;
let checkedVocabImgCount = 0;
const seenDates = new Set();

for (const entry of curriculumIndex.lessons) {
  assert.ok(entry.Date && /^[A-Za-z0-9_-]{1,64}$/.test(entry.Date), `Unsafe lesson Date key: ${entry.Date}`);
  assert.ok(!seenDates.has(entry.Date), `Duplicate lesson Date in index: ${entry.Date}`);
  seenDates.add(entry.Date);
  assert.equal("Reading_Passage" in entry, false, `Manifest entry ${entry.Date} must omit Reading_Passage`);
  assert.ok(entry.hash, `Manifest entry ${entry.Date} must include content hash`);

  const unitPath = path.join(ROOT_DIR, "data/curriculum/units", `${entry.Date}.json`);
  assert.ok(fs.existsSync(unitPath), `Missing unit chunk JSON: ${unitPath}`);
  const unitData = JSON.parse(fs.readFileSync(unitPath, "utf8"));
  assert.equal(unitData.date, entry.Date);
  assert.equal(unitData.vocab.length, entry.vocabCount);
  assert.equal(unitData.quiz.length, entry.quizCount);

  totalVocabCount += unitData.vocab.length;
  totalQuizCount += unitData.quiz.length;

  for (const v of unitData.vocab) {
    const imgRel = String(v.Image_URL || "").trim();
    if (imgRel && !imgRel.startsWith("http")) {
      const diskPath = path.resolve(ROOT_DIR, imgRel);
      assert.ok(diskPath.startsWith(ROOT_DIR) && fs.existsSync(diskPath), `Missing vocab image for ${entry.Date}/${v.Word}: ${imgRel}`);
      checkedVocabImgCount += 1;
    }
  }

  const passage = String(unitData.lesson?.Reading_Passage || "");
  for (const line of passage.split(/<br>|[\r\n]+/i)) {
    const m = line.trim().match(/^AUDIO:\s*(.+)$/i);
    if (m) {
      const audioRel = m[1].trim();
      if (audioRel && !audioRel.startsWith("http")) {
        const audioDiskPath = path.resolve(ROOT_DIR, audioRel);
        assert.ok(audioDiskPath.startsWith(ROOT_DIR) && fs.existsSync(audioDiskPath), `Missing listening audio for ${entry.Date}: ${audioRel}`);
        checkedAudioCount += 1;
      }
    }
  }
}

assert.equal(learnedIndex.totalLessons, curriculumIndex.lessons.length, "learned_index.json lesson count mismatch");
assert.equal(learnedIndex.totalVocab, totalVocabCount, "learned_index.json vocab count mismatch");

assert.ok(Array.isArray(appConfig.shopRows) && appConfig.shopRows.length >= 60, "app-config.json missing shopRows");
for (const row of appConfig.shopRows) {
  const previewRel = String(row.previewImage || "").trim();
  if (previewRel && !previewRel.startsWith("http")) {
    const previewPath = path.resolve(ROOT_DIR, previewRel);
    assert.ok(previewPath.startsWith(ROOT_DIR) && fs.existsSync(previewPath), `Missing shop preview image: ${previewRel}`);
  }
}
assert.ok(Array.isArray(appConfig.settingRows) && appConfig.settingRows.length >= 5, "app-config.json missing settingRows");
assert.ok(Array.isArray(appConfig.tvRows) && appConfig.tvRows.length >= 10, "app-config.json missing tvRows");
assert.ok(Array.isArray(appConfig.thoughtRows) && appConfig.thoughtRows.length >= 100, "app-config.json missing thoughtRows");

assert.ok(Array.isArray(ieltsIndex.tests) && ieltsIndex.tests.length >= 10, "IELTS index missing tests");
for (const testMeta of ieltsIndex.tests) {
  if (String(testMeta.Ready || "").toUpperCase() !== "TRUE") continue;
  const slug = String(testMeta.Test_ID || "").replace(/^ielts:/i, "");
  const chunkPath = path.join(ROOT_DIR, "data/ielts", `${slug}.json`);
  assert.ok(fs.existsSync(chunkPath), `Missing ready IELTS chunk: ${chunkPath}`);
  const chunk = JSON.parse(fs.readFileSync(chunkPath, "utf8"));
  assert.equal(chunk.questions?.length, 40, `Expected 40 questions in ${slug}.json`);
  for (const secKey of ["Section_1_Image", "Section_2_Image", "Section_3_Image"]) {
    const rel = String(chunk.testMeta?.[secKey] || "").trim();
    if (rel && !rel.startsWith("http")) {
      assert.ok(fs.existsSync(path.resolve(ROOT_DIR, rel)), `Missing IELTS section image: ${rel}`);
    }
  }
}
console.log(
  `[PASS] Verified ${curriculumIndex.lessons.length} student units (${totalVocabCount} vocab, ${totalQuizCount} quiz, `
  + `${checkedVocabImgCount} images, ${checkedAudioCount} audio tracks), config, and IELTS chunks`
);

// 4. Core pure module logic checks
const helpers = await import(path.join(ROOT_DIR, "app-helpers.js"));
const shop = await import(path.join(ROOT_DIR, "shop-catalog.js"));
const grid = await import(path.join(ROOT_DIR, "room-grid.js"));
const presets = await import(path.join(ROOT_DIR, "avatar-presets.js"));

assert.ok(Array.isArray(presets.SKIN_TONES) && presets.SKIN_TONES.length >= 5 && presets.DEFAULT_AVATAR.build === "balanced");
assert.equal(helpers.resolveXpProgress(0, 100).level, 1);
assert.equal(helpers.resolveXpProgress(2700, 100).isMaxNamedRank, true);
assert.equal(helpers.calculateShopPurchaseXp(200), 40);
assert.equal(helpers.calculateShopResalePrice(200) > 0, true);
assert.equal(helpers.toReviewQueueDocId("uid123", "ielts:gt-001"), "uid123__ielts_gt-001");
assert.equal(helpers.isSafeCurriculumUnitId("../bad"), false);
assert.equal(helpers.translateAuthError({ code: "client-offline" }).includes("離線"), true);
assert.equal(helpers.translateAuthError({ code: "resource-exhausted" }).includes("流量"), true);

const merged = helpers.buildMergedPendingReviewItems(
  [{ uid: "u1", email: "a@x.com", lessonDate: "2026-11-24", submittedAt: 200 }],
  [{ uid: "u1", email: "a@x.com", submittedLessons: { "2026-11-24": true }, approvedLessons: { "2026-11-24": true } }]
);
assert.equal(merged.length, 0, "Approved submissions must not appear in pending queue");

const walkPath = grid.findShortestWalkPath({ x: -1.8, z: -1.8 }, { x: 1.8, z: 1.8 }, [{ minX: -0.4, maxX: 0.4, minZ: -0.4, maxZ: 0.4 }]);
assert.ok(walkPath.length >= 2, "Room walk pathfinder must steer around obstacle");
assert.ok(shop.SHOP_CATALOG.length >= 60, "Shop catalog must load cleanly");

console.log("[PASS] Pure logic regression checks passed");
