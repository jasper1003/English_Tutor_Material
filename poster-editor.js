import { bi } from "./i18n.js?v=20261125j";

/**
 * Wall Art Poster Customizer & Interactive 11:15 Portrait Cropper Controller
 */
export function createPosterCustomizer({
  getSavedPosterUrl,
  onSavePosterUrl,
  showFeedback,
  clearFeedback,
  translateAuthError
}) {
  const POSTER_CANON_W = 330;
  const POSTER_CANON_H = 450;
  const POSTER_MAX_DATA_URL_LEN = 120000;

  const posterDialog = document.getElementById("poster-dialog");
  const posterCropCanvas = document.getElementById("poster-crop-canvas");
  const posterFrameStage = document.getElementById("poster-frame-stage");
  const posterFileInput = document.getElementById("poster-file-input");
  const posterPickBtn = document.getElementById("poster-pick-btn");
  const posterZoomRange = document.getElementById("poster-zoom-range");
  const posterZoomValue = document.getElementById("poster-zoom-value");
  const posterRotateBtn = document.getElementById("poster-rotate-btn");
  const posterCenterBtn = document.getElementById("poster-center-btn");
  const posterResetBtn = document.getElementById("poster-reset-btn");
  const posterConfirmBtn = document.getElementById("poster-confirm-btn");
  const posterModePill = document.getElementById("poster-mode-pill");

  const cropState = {
    img: null,
    objectUrl: null,
    isSavedCustom: false,
    isNewDraft: false,
    zoom: 1,
    rotationDeg: 0,
    panX: 0,
    panY: 0,
    dragging: false,
    dragPointerId: null,
    lastClientX: 0,
    lastClientY: 0,
    busy: false
  };

  function cleanupPosterObjectUrl() {
    if (cropState.objectUrl) {
      URL.revokeObjectURL(cropState.objectUrl);
      cropState.objectUrl = null;
    }
  }

  function drawDefaultLandscapePoster(ctx, w, h) {
    const sx = w / 192;
    const sy = h / 256;
    const sky = ctx.createLinearGradient(0, 0, 0, 175 * sy);
    sky.addColorStop(0, "#fce7d2");
    sky.addColorStop(1, "#f7bfa0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#ff8552";
    ctx.beginPath();
    ctx.arc(96 * sx, 94 * sy, 34 * Math.min(sx, sy), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6d8da6";
    ctx.beginPath();
    ctx.moveTo(0, 185 * sy);
    ctx.lineTo(66 * sx, 122 * sy);
    ctx.lineTo(132 * sx, 176 * sy);
    ctx.lineTo(w, 134 * sy);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3f5d73";
    ctx.beginPath();
    ctx.moveTo(0, 206 * sy);
    ctx.lineTo(92 * sx, 152 * sy);
    ctx.lineTo(w, 196 * sy);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function getCropMetrics() {
    const img = cropState.img;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const rotQuarters = (((cropState.rotationDeg / 90) % 4) + 4) % 4;
    const effW = rotQuarters % 2 === 1 ? img.naturalHeight : img.naturalWidth;
    const effH = rotQuarters % 2 === 1 ? img.naturalWidth : img.naturalHeight;
    const baseScale = Math.max(POSTER_CANON_W / effW, POSTER_CANON_H / effH);
    const totalScale = baseScale * cropState.zoom;
    const maxPanX = Math.max(0, (effW * totalScale - POSTER_CANON_W) / 2);
    const maxPanY = Math.max(0, (effH * totalScale - POSTER_CANON_H) / 2);
    return { totalScale, maxPanX, maxPanY };
  }

  function clampCropPan() {
    const metrics = getCropMetrics();
    if (!metrics) {
      cropState.panX = 0;
      cropState.panY = 0;
      return;
    }
    cropState.panX = Math.max(-metrics.maxPanX, Math.min(metrics.maxPanX, cropState.panX));
    cropState.panY = Math.max(-metrics.maxPanY, Math.min(metrics.maxPanY, cropState.panY));
  }

  function renderCropToCtx(ctx, targetW, targetH, showGrid) {
    ctx.save();
    ctx.clearRect(0, 0, targetW, targetH);
    if (!cropState.img) {
      drawDefaultLandscapePoster(ctx, targetW, targetH);
      ctx.restore();
      return;
    }
    clampCropPan();
    const metrics = getCropMetrics();
    const img = cropState.img;
    const k = targetW / POSTER_CANON_W;

    ctx.fillStyle = "#faf5ed";
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.translate(targetW / 2 + cropState.panX * k, targetH / 2 + cropState.panY * k);
    ctx.rotate((cropState.rotationDeg * Math.PI) / 180);
    const drawScale = metrics.totalScale * k;
    ctx.drawImage(
      img,
      (-img.naturalWidth * drawScale) / 2,
      (-img.naturalHeight * drawScale) / 2,
      img.naturalWidth * drawScale,
      img.naturalHeight * drawScale
    );
    ctx.restore();

    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        const gx = Math.round((targetW * i) / 3) + 0.5;
        const gy = Math.round((targetH * i) / 3) + 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, targetH);
        ctx.moveTo(0, gy);
        ctx.lineTo(targetW, gy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function syncControlsUI() {
    const hasImg = Boolean(cropState.img);
    const busy = cropState.busy;
    posterZoomRange.value = String(Math.round(cropState.zoom * 100));
    posterZoomValue.textContent = `${cropState.zoom.toFixed(1)}×`;

    posterZoomRange.disabled = !hasImg || busy;
    posterRotateBtn.disabled = !hasImg || busy;
    posterCenterBtn.disabled = !hasImg || busy;
    posterPickBtn.disabled = busy;
    posterConfirmBtn.disabled = !hasImg || busy;
    posterResetBtn.disabled = busy || (!hasImg && !cropState.isSavedCustom);

    posterCropCanvas.classList.toggle("is-draggable", hasImg && !busy);
    posterCropCanvas.classList.toggle("is-dragging", cropState.dragging);

    if (cropState.isNewDraft) {
      posterModePill.textContent = bi("✂️ 裁切自訂照片中（確認後將掛上牆面）", "✂️ Cropping custom photo (confirm to hang)");
    } else if (hasImg && cropState.isSavedCustom) {
      posterModePill.textContent = bi("🖼️ 目前使用：你的自訂掛畫照片", "🖼️ Active: Your custom wall poster");
    } else {
      posterModePill.textContent = bi("🎨 目前顯示：預設山水畫", "🎨 Active: Default landscape painting");
    }

    const ctx = posterCropCanvas.getContext("2d");
    if (ctx) {
      renderCropToCtx(ctx, posterCropCanvas.width, posterCropCanvas.height, hasImg);
    }
  }

  function loadPreviewSrc(src, { objectUrl = null, isNewDraft = false, isSavedCustom = false } = {}) {
    cleanupPosterObjectUrl();
    cropState.objectUrl = objectUrl;
    if (!src) {
      cropState.img = null;
      cropState.isNewDraft = false;
      cropState.isSavedCustom = Boolean(isSavedCustom);
      cropState.zoom = 1;
      cropState.rotationDeg = 0;
      cropState.panX = 0;
      cropState.panY = 0;
      syncControlsUI();
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (cropState.objectUrl && objectUrl !== cropState.objectUrl) return;
      cropState.img = img;
      cropState.isNewDraft = isNewDraft;
      cropState.isSavedCustom = isSavedCustom;
      cropState.zoom = 1;
      cropState.rotationDeg = 0;
      cropState.panX = 0;
      cropState.panY = 0;
      syncControlsUI();
    };
    img.onerror = () => {
      cleanupPosterObjectUrl();
      showFeedback("poster-feedback", "error", bi(
        "無法讀取這張圖片檔案，請改選 JPG、PNG 或 WebP 格式的照片。",
        "Could not read this image. Please choose a JPG, PNG, or WebP file."
      ));
    };
    img.src = src;
  }

  function handleFileSelection(file) {
    if (!file) return;
    clearFeedback("poster-feedback");
    if (file.type && !file.type.startsWith("image/")) {
      showFeedback("poster-feedback", "error", bi(
        "請選擇圖片檔案（JPG、PNG、WebP 等）。",
        "Please select an image file (JPG, PNG, WebP, etc.)."
      ));
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    loadPreviewSrc(nextUrl, {
      objectUrl: nextUrl,
      isNewDraft: true,
      isSavedCustom: Boolean(getSavedPosterUrl())
    });
  }

  function exportCroppedDataUrl() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = POSTER_CANON_W;
    exportCanvas.height = POSTER_CANON_H;
    const ctx = exportCanvas.getContext("2d");
    renderCropToCtx(ctx, POSTER_CANON_W, POSTER_CANON_H, false);
    const qualities = [0.86, 0.74, 0.62, 0.5];
    let out = "";
    for (const q of qualities) {
      out = exportCanvas.toDataURL("image/jpeg", q);
      if (out.length <= POSTER_MAX_DATA_URL_LEN) return out;
    }
    if (out.length <= 145000) return out;
    throw new Error(bi(
      "裁切後照片體積過大，請換一張照片或稍微縮小再試。",
      "Cropped image is too large. Please pick another image or zoom slightly."
    ));
  }

  async function savePosterUrl(nextPosterUrl) {
    if (cropState.busy) return;
    cropState.busy = true;
    clearFeedback("poster-feedback");
    syncControlsUI();
    try {
      await onSavePosterUrl(nextPosterUrl);
      if (posterDialog.open) {
        posterDialog.close();
      }
    } catch (err) {
      showFeedback("poster-feedback", "error", err?.message || translateAuthError(err));
    } finally {
      cropState.busy = false;
      syncControlsUI();
    }
  }

  function openPosterCustomizer() {
    clearFeedback("poster-feedback");
    posterFileInput.value = "";
    const savedUrl = getSavedPosterUrl();
    if (savedUrl) {
      loadPreviewSrc(savedUrl, { isNewDraft: false, isSavedCustom: true });
    } else {
      loadPreviewSrc("", { isNewDraft: false, isSavedCustom: false });
    }
    if (!posterDialog.open) {
      posterDialog.showModal();
    }
  }

  posterPickBtn.addEventListener("click", () => {
    posterFileInput.value = "";
    posterFileInput.click();
  });

  posterFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  });

  posterFrameStage.addEventListener("dragover", (e) => {
    e.preventDefault();
    posterFrameStage.classList.add("is-dragover");
  });

  posterFrameStage.addEventListener("dragleave", () => {
    posterFrameStage.classList.remove("is-dragover");
  });

  posterFrameStage.addEventListener("drop", (e) => {
    e.preventDefault();
    posterFrameStage.classList.remove("is-dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelection(file);
  });

  posterZoomRange.addEventListener("input", () => {
    cropState.zoom = Math.max(1, Math.min(3.5, Number(posterZoomRange.value) / 100));
    syncControlsUI();
  });

  posterRotateBtn.addEventListener("click", () => {
    if (!cropState.img || cropState.busy) return;
    cropState.rotationDeg = (cropState.rotationDeg + 90) % 360;
    cropState.panX = 0;
    cropState.panY = 0;
    syncControlsUI();
  });

  posterCenterBtn.addEventListener("click", () => {
    if (!cropState.img || cropState.busy) return;
    cropState.zoom = 1;
    cropState.rotationDeg = 0;
    cropState.panX = 0;
    cropState.panY = 0;
    syncControlsUI();
  });

  posterCropCanvas.addEventListener("pointerdown", (e) => {
    if (!cropState.img || cropState.busy) return;
    cropState.dragging = true;
    cropState.dragPointerId = e.pointerId;
    cropState.lastClientX = e.clientX;
    cropState.lastClientY = e.clientY;
    posterCropCanvas.setPointerCapture?.(e.pointerId);
    syncControlsUI();
  });

  posterCropCanvas.addEventListener("pointermove", (e) => {
    if (!cropState.dragging || e.pointerId !== cropState.dragPointerId) return;
    const rect = posterCropCanvas.getBoundingClientRect();
    if (!rect.width) return;
    const scaleToCanon = POSTER_CANON_W / rect.width;
    cropState.panX += (e.clientX - cropState.lastClientX) * scaleToCanon;
    cropState.panY += (e.clientY - cropState.lastClientY) * scaleToCanon;
    cropState.lastClientX = e.clientX;
    cropState.lastClientY = e.clientY;
    const ctx = posterCropCanvas.getContext("2d");
    if (ctx) {
      renderCropToCtx(ctx, posterCropCanvas.width, posterCropCanvas.height, true);
    }
  });

  const endPosterDrag = (e) => {
    if (!cropState.dragging || (e && e.pointerId !== cropState.dragPointerId)) return;
    cropState.dragging = false;
    cropState.dragPointerId = null;
    syncControlsUI();
  };
  posterCropCanvas.addEventListener("pointerup", endPosterDrag);
  posterCropCanvas.addEventListener("pointercancel", endPosterDrag);

  posterCropCanvas.addEventListener("wheel", (e) => {
    if (!cropState.img || cropState.busy) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    cropState.zoom = Math.max(1, Math.min(3.5, Math.round((cropState.zoom + delta) * 50) / 50));
    syncControlsUI();
  }, { passive: false });

  posterConfirmBtn.addEventListener("click", async () => {
    if (!cropState.img || cropState.busy) return;
    try {
      const dataUrl = exportCroppedDataUrl();
      await savePosterUrl(dataUrl);
    } catch (err) {
      showFeedback("poster-feedback", "error", err?.message || bi("照片匯出失敗，請重試。", "Failed to export image. Please try again."));
    }
  });

  posterResetBtn.addEventListener("click", async () => {
    if (cropState.busy) return;
    if (getSavedPosterUrl()) {
      await savePosterUrl("");
    } else {
      loadPreviewSrc("", { isNewDraft: false, isSavedCustom: false });
      showFeedback("poster-feedback", "success", bi("已恢復為預設山水畫預覽。", "Restored default landscape preview."));
    }
  });

  return {
    openPosterCustomizer,
    cleanupPosterObjectUrl,
    refreshLanguage: syncControlsUI
  };
}
