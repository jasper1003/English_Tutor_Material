import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const DAY_CYCLE_MS = 30 * 60 * 1000; // Real 30 minutes = 24 game hours (15 min day + 15 min night)
const POST_WORK_COOLDOWN_SEC = 13;
const IDLE_MIN_SEC = 105; // ~2 minutes calm autonomous activity duration
const IDLE_SPAN_SEC = 35;
const COMMANDED_SLEEP_SEC = 300;  // 5 minutes sleep when clicked
const COMMANDED_WASH_SEC = 10;    // 10 seconds hand wash
const COMMANDED_TOILET_SEC = 15;  // 15 seconds toilet use

// Per-activity English thought library aligned with the student's Google Sheet curriculum (>= 6 lines each)
const THOUGHT_BANK = {
  phone: [
    "This page is so cool!",
    "I want to buy a TV...",
    "Look! That new app is easy to use.",
    "Ooh, a new message from my boss!",
    "Let's take a look at this fun video.",
    "Whoa, that jacket costs an arm and a leg!",
    "What a nice comment on my post!",
    "Should I order ramen? I can't make up my mind."
  ],
  exercise: [
    "One, two, three... never give up!",
    "Exercising regularly makes me feel better.",
    "This is an important daily activity!",
    "Take it easy—two more on the floor!",
    "Whew! Time to cool down for a second.",
    "Ten push-ups? A piece of cake!",
    "It's not hard at all when I stay calm."
  ],
  read: [
    "I love this simple and unique art style.",
    "I see! That makes total sense now.",
    "I really admire those bright colors.",
    "What an interesting article to explore!",
    "Reading at home feels so peaceful.",
    "Don't judge a book by its cover!",
    "Every page helps me discover a good idea."
  ],
  eat: [
    "Mmm! This tastes so good!",
    "I'm glad I didn't miss out on dinner.",
    "Wait... remember to do the dishes later!",
    "Warm food is worth every penny.",
    "In fact, cooking at home saves money.",
    "It's still hot—let it cool down a bit.",
    "Dinner is ready! Plenty of energy now."
  ],
  gaming: [
    "This block game is so exciting!",
    "Let's assemble a simple house here.",
    "Wait, did I just run out of wood?",
    "Easy! Fixing this wall is a piece of cake.",
    "Time to explore that mysterious cave!",
    "Good choice! That was a smart move.",
    "Okay, almost time to turn off the screen."
  ],
  sleep: [
    "Time to call it a day... zzz...",
    "So peaceful and quiet tonight...",
    "Rest well today, work better tomorrow...",
    "Hope I don't sleepwalk tonight...",
    "Zzz... dreaming of a warm vacation...",
    "Take it easy... five more minutes...",
    "Zzz... good night, whole world..."
  ],
  wash: [
    "Wash with soap—clean and safe!",
    "Cool water helps me wake right up.",
    "Time to wipe my hands dry.",
    "Washing hands regularly is so important!",
    "Phew, my hands feel fresh again.",
    "Soap, water, dry—good to go!"
  ],
  toilet: [
    "Just a quiet moment to take it easy.",
    "Wait... remember to sweep the floor later.",
    "Should I mop the floor before dinner?",
    "Let's hold on and take a quick break.",
    "Maybe paint the wall light green? Good idea!",
    "Okay, back to my room soon."
  ],
  work: [
    "Almost ready to deliver this project!",
    "Hope my boss and I are on the same page.",
    "Let me compare these two bright colors.",
    "Pay attention to the little details!",
    "In fact, I really enjoy this career.",
    "Just one more touch—looking better!",
    "Done! Time to share my work."
  ]
};

export const SKIN_TONES = [
  { id: "porcelain", label: "白皙暖調", hex: "#f9dcc4" },
  { id: "peach", label: "自然杏桃", hex: "#f1c29b" },
  { id: "honey", label: "小麥暖棕", hex: "#d99b66" },
  { id: "caramel", label: "焦糖健康", hex: "#a96e44" },
  { id: "espresso", label: "深栗棕", hex: "#6f442a" }
];

export const BODY_BUILDS = [
  { id: "slim", label: "修長輕盈", hint: "肩線較窄、身形修長" },
  { id: "balanced", label: "勻稱標準", hint: "肩腰比例自然均衡" },
  { id: "athletic", label: "結實寬肩", hint: "肩背較厚實、線條立體" }
];

export const HAIR_STYLES = [
  { id: "short", label: "俐落短髮" },
  { id: "parted", label: "微卷旁分" },
  { id: "bob", label: "圓潤齊短髮" },
  { id: "bun", label: "丸子紮髮" },
  { id: "long", label: "及肩長髮" }
];

export const HAIR_COLORS = [
  { id: "ink", label: "墨黑", hex: "#1f2430" },
  { id: "espresso", label: "深棕", hex: "#4a3225" },
  { id: "caramel", label: "奶茶棕", hex: "#8c5b3b" },
  { id: "ash", label: "霧灰", hex: "#6c768a" },
  { id: "plum", label: "酒紅棕", hex: "#6b2f3f" }
];

export const OUTFIT_COLORS = [
  { id: "terracotta", label: "暖陶橘", hex: "#d96b43" },
  { id: "sage", label: "鼠尾草綠", hex: "#5a8f7b" },
  { id: "cobalt", label: "靛藍", hex: "#3b6fd8" },
  { id: "mustard", label: "芥末黃", hex: "#d9a036" },
  { id: "charcoal", label: "炭墨灰", hex: "#384152" }
];

export const DEFAULT_AVATAR = {
  name: "",
  build: "balanced",
  skinTone: "peach",
  hairStyle: "short",
  hairColor: "ink",
  outfitColor: "terracotta"
};

function findHex(list, id, fallback) {
  const item = list.find(entry => entry.id === id);
  return item ? item.hex : fallback;
}

function lerpColor(c1, c2, alpha) {
  return c1.clone().lerp(c2, THREE.MathUtils.clamp(alpha, 0, 1));
}

function makeMat(hex, roughness = 0.65, metalness = 0.04, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness,
    metalness,
    ...extras
  });
}

function makeDeskScreenTexture(mode = "art") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");

  if (mode === "game") {
    // Blocky sandbox game screen
    ctx.fillStyle = "#5cb8ff";
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = "#4aa944";
    ctx.fillRect(0, 108, 256, 16);
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(0, 124, 256, 36);
    ctx.fillStyle = "#2f7a2c";
    ctx.fillRect(42, 46, 36, 36);
    ctx.fillStyle = "#6c4829";
    ctx.fillRect(55, 82, 10, 26);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(150, 24, 48, 14);
    ctx.fillRect(28, 18, 36, 12);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(184, 92, 18, 16);
  } else {
    // Cozy illustration studio UI screen
    ctx.fillStyle = "#1c2233";
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = "#283046";
    ctx.fillRect(0, 0, 256, 20);
    ctx.fillStyle = "#ff5f57";
    ctx.beginPath(); ctx.arc(12, 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#febc2e";
    ctx.beginPath(); ctx.arc(24, 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#28c840";
    ctx.beginPath(); ctx.arc(36, 10, 4, 0, Math.PI * 2); ctx.fill();

    // Left tool bar
    ctx.fillStyle = "#232a3d";
    ctx.fillRect(6, 26, 26, 126);
    // Art canvas
    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(40, 28, 162, 120);
    ctx.fillStyle = "#fb923c";
    ctx.beginPath(); ctx.arc(98, 72, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(126, 56, 52, 60);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(54, 108, 134, 24);
    // Right palette
    ctx.fillStyle = "#232a3d";
    ctx.fillRect(210, 26, 38, 126);
    ["#f97316", "#facc15", "#34d399", "#60a5fa", "#c084fc"].forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(218, 36 + i * 20, 22, 14);
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePosterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, 175);
  sky.addColorStop(0, "#fce7d2");
  sky.addColorStop(1, "#f7bfa0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 192, 256);

  ctx.fillStyle = "#ff8552";
  ctx.beginPath();
  ctx.arc(96, 94, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d8da6";
  ctx.beginPath();
  ctx.moveTo(0, 185);
  ctx.lineTo(66, 122);
  ctx.lineTo(132, 176);
  ctx.lineTo(192, 134);
  ctx.lineTo(192, 256);
  ctx.lineTo(0, 256);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3f5d73";
  ctx.beginPath();
  ctx.moveTo(0, 206);
  ctx.lineTo(92, 152);
  ctx.lineTo(192, 196);
  ctx.lineTo(192, 256);
  ctx.lineTo(0, 256);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeTvScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 256, 144);
  bg.addColorStop(0, "#1e293b");
  bg.addColorStop(0.55, "#334155");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 144);

  const cards = ["#fb923c", "#38bdf8", "#34d399", "#f472b6"];
  cards.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.fillRect(22 + idx * 54, 42, 44, 56);
  });
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(22, 22, 92, 8);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(22, 112, 156, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCharacterRig(config) {
  const cfg = { ...DEFAULT_AVATAR, ...(config || {}) };

  const skinMat = makeMat(findHex(SKIN_TONES, cfg.skinTone, "#f1c29b"), 0.58);
  const hairMat = makeMat(findHex(HAIR_COLORS, cfg.hairColor, "#1f2430"), 0.72);
  const shirtMat = makeMat(findHex(OUTFIT_COLORS, cfg.outfitColor, "#d96b43"), 0.78);
  const pantsMat = makeMat("#374151", 0.85);
  const shoeMat = makeMat("#f8fafc", 0.65);
  const eyeMat = makeMat("#1e293b", 0.2);
  const blushMat = makeMat("#f48c8c", 0.8);

  // Non-binary physical silhouette traits via build selector ("slim" | "balanced" | "athletic")
  const dims = {
    slim:     { shoulderW: 0.42, torsoD: 0.25, hipW: 0.40, limbR: 0.072, chestBump: true },
    balanced: { shoulderW: 0.48, torsoD: 0.28, hipW: 0.43, limbR: 0.082, chestBump: false },
    athletic: { shoulderW: 0.56, torsoD: 0.31, hipW: 0.44, limbR: 0.092, chestBump: false }
  }[cfg.build] || { shoulderW: 0.48, torsoD: 0.28, hipW: 0.43, limbR: 0.082, chestBump: false };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.11, 0.52, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.11, 0.52, 0);

  [leftLegPivot, rightLegPivot].forEach(pivot => {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(dims.limbR, 0.34, 8, 12),
      pantsMat
    );
    leg.position.set(0, -0.22, 0);
    leg.castShadow = true;
    pivot.add(leg);

    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.1, 0.23, 3, 0.04), shoeMat);
    shoe.position.set(0, -0.46, 0.04);
    shoe.castShadow = true;
    pivot.add(shoe);
    body.add(pivot);
  });

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.78, 0);

  const torso = new THREE.Mesh(
    new RoundedBoxGeometry(dims.shoulderW, 0.54, dims.torsoD, 5, 0.11),
    shirtMat
  );
  torso.castShadow = true;
  torsoGroup.add(torso);

  const hips = new THREE.Mesh(
    new RoundedBoxGeometry(dims.hipW, 0.18, dims.torsoD * 0.96, 4, 0.07),
    pantsMat
  );
  hips.position.set(0, -0.25, 0);
  hips.castShadow = true;
  torsoGroup.add(hips);

  if (dims.chestBump) {
    const contour = new THREE.Mesh(
      new RoundedBoxGeometry(dims.shoulderW * 0.82, 0.16, 0.08, 4, 0.04),
      shirtMat
    );
    contour.position.set(0, 0.06, dims.torsoD * 0.45);
    torsoGroup.add(contour);
  }

  body.add(torsoGroup);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-(dims.shoulderW / 2 + 0.06), 0.98, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(dims.shoulderW / 2 + 0.06, 0.98, 0);

  [leftArmPivot, rightArmPivot].forEach(pivot => {
    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(dims.limbR * 0.92, 0.22, 8, 12),
      shirtMat
    );
    sleeve.position.set(0, -0.14, 0);
    sleeve.castShadow = true;
    pivot.add(sleeve);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(dims.limbR * 0.78, 0.16, 8, 12),
      skinMat
    );
    forearm.position.set(0, -0.32, 0);
    forearm.castShadow = true;
    pivot.add(forearm);
    body.add(pivot);
  });

  const phoneProp = new THREE.Group();
  const phoneBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.095, 0.16, 0.018, 2, 0.008),
    makeMat("#1e293b", 0.3, 0.35)
  );
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.078, 0.136),
    new THREE.MeshBasicMaterial({ color: "#93c5fd" })
  );
  phoneScreen.position.z = 0.01;
  phoneProp.add(phoneBody, phoneScreen);
  phoneProp.position.set(-0.04, -0.4, 0.06);
  phoneProp.rotation.set(-Math.PI / 2 + 0.45, 0.18, 0);
  phoneProp.visible = false;
  rightArmPivot.add(phoneProp);

  const bookProp = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.05, 0.3, 2, 0.015),
    makeMat("#f97316", 0.7)
  );
  bookProp.position.set(-0.1, -0.42, 0.14);
  bookProp.visible = false;
  rightArmPivot.add(bookProp);

  const snackProp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.06, 0.11, 14),
    makeMat("#fef3c7", 0.5)
  );
  snackProp.position.set(0, -0.44, 0.08);
  snackProp.visible = false;
  rightArmPivot.add(snackProp);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.32, 0);

  const head = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.44, 0.44, 6, 0.17), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeMat);
  leftEye.position.set(-0.09, -0.01, 0.21);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), eyeMat);
  rightEye.position.set(0.09, -0.01, 0.21);
  headGroup.add(leftEye, rightEye);

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), blushMat);
  cheekL.scale.set(1.2, 0.6, 0.4);
  cheekL.position.set(-0.14, -0.07, 0.195);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.14;
  headGroup.add(cheekL, cheekR);

  const hairCap = new THREE.Mesh(new RoundedBoxGeometry(0.49, 0.24, 0.47, 5, 0.12), hairMat);
  hairCap.position.set(0, 0.14, -0.01);
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  const hairBack = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.34, 0.16, 4, 0.08), hairMat);
  hairBack.position.set(0, 0.04, -0.17);
  hairBack.castShadow = true;
  headGroup.add(hairBack);

  if (cfg.hairStyle === "parted") {
    const bang = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.11, 0.15, 4, 0.05), hairMat);
    bang.position.set(0.06, 0.15, 0.18);
    bang.rotation.z = -0.18;
    headGroup.add(bang);
  } else if (cfg.hairStyle === "bob") {
    const sideL = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.36, 0.32, 4, 0.05), hairMat);
    sideL.position.set(-0.22, -0.01, -0.02);
    const sideR = sideL.clone();
    sideR.position.x = 0.22;
    headGroup.add(sideL, sideR);
  } else if (cfg.hairStyle === "bun") {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), hairMat);
    bun.position.set(0, 0.29, -0.14);
    bun.castShadow = true;
    headGroup.add(bun);
  } else if (cfg.hairStyle === "long") {
    const longTail = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.48, 0.14, 4, 0.06), hairMat);
    longTail.position.set(0, -0.16, -0.19);
    longTail.castShadow = true;
    headGroup.add(longTail);
  }

  body.add(headGroup);

  return {
    root,
    body,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    torsoGroup,
    headGroup,
    phoneProp,
    bookProp,
    snackProp,
    config: cfg
  };
}

export class AvatarPreviewScene {
  constructor(container, initialConfig = DEFAULT_AVATAR) {
    this.container = container;
    this.disposed = false;
    this.paused = false;
    this.animFrameId = null;
    this.targetRotY = 0.28;
    this.currentRotY = 0.28;
    this.isDragging = false;
    this.lastPointerX = 0;

    this.initScene();
    this.updateAvatar(initialConfig);
    this.bindEvents();
    this.animate();
  }

  initScene() {
    const w = Math.max(240, this.container.clientWidth || 300);
    const h = Math.max(260, this.container.clientHeight || 320);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 30);
    this.camera.position.set(0, 1.38, 3.35);
    this.camera.lookAt(0, 0.85, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.container.innerHTML = "";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.cursor = "grab";
    this.container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight("#fff7eb", "#b08b6f", 0.95);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight("#fff1d6", 1.9);
    key.position.set(2.5, 4.2, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.001;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight("#ffd9b3", 0.75);
    rim.position.set(-2.8, 2.2, -2.5);
    this.scene.add(rim);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.12, 32),
      makeMat("#e6d8c5", 0.65)
    );
    pedestal.position.set(0, -0.06, 0);
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
  }

  updateAvatar(config) {
    if (this.rig) {
      this.scene.remove(this.rig.root);
    }
    this.rig = createCharacterRig(config);
    this.rig.root.rotation.y = this.currentRotY;
    this.scene.add(this.rig.root);
  }

  rotateBy(deltaRad) {
    this.targetRotY += deltaRad;
  }

  bindEvents() {
    const dom = this.renderer.domElement;
    this.onPointerDown = (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      dom.style.cursor = "grabbing";
    };
    this.onPointerMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.targetRotY += dx * 0.012;
    };
    this.onPointerUp = () => {
      this.isDragging = false;
      dom.style.cursor = "grab";
    };
    this.onResize = () => {
      if (this.disposed) return;
      const w = Math.max(240, this.container.clientWidth || 300);
      const h = Math.max(260, this.container.clientHeight || 320);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    dom.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
  }

  pause() {
    this.paused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  resume() {
    if (this.disposed) return;
    const wasPaused = this.paused;
    this.paused = false;
    this.onResize();
    if (wasPaused || !this.animFrameId) this.animate();
  }

  animate = () => {
    if (this.disposed || this.paused) return;
    this.animFrameId = requestAnimationFrame(this.animate);
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.14;
    if (this.rig) {
      this.rig.root.rotation.y = this.currentRotY;
      const t = performance.now() / 1000;
      this.rig.body.position.y = Math.sin(t * 2.2) * 0.015;
      this.rig.leftArmPivot.rotation.z = -0.05;
      this.rig.rightArmPivot.rotation.z = 0.05;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const dom = this.renderer?.domElement;
    if (dom) dom.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("resize", this.onResize);
    this.renderer?.dispose();
  }
}

export class FreelancerRoomScene {
  constructor(container, options = {}) {
    this.container = container;
    this.onEnterWork = options.onEnterWork || (() => {});
    this.onLampToggle = options.onLampToggle || (() => {});
    this.onBedLampToggle = options.onBedLampToggle || (() => {});
    this.onActivityChange = options.onActivityChange || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onHoverChange = options.onHoverChange || (() => {});

    this.disposed = false;
    this.paused = false;
    this.animFrameId = null;
    this.lastFrameTime = performance.now();

    // Camera quarter 0..3 (rotated by 90 deg)
    this.targetQuarter = ((options.cameraQuarter ?? 0) % 4 + 4) % 4;
    this.currentAngle = this.targetQuarter * (Math.PI / 2) + Math.PI / 4;

    this.deskLampOn = Boolean(options.deskLampOn ?? true);
    this.bedLampOn = Boolean(options.bedLampOn ?? false);
    this.wallColorHex = options.wallColor || "#f3eadc";
    this.ownedItems = { ...(options.ownedItems || {}) };
    this.avatarConfig = { ...DEFAULT_AVATAR, ...(options.avatar || {}) };

    // Room bounds & obstacle-free routing anchors
    this.deskWorkAnchor = new THREE.Vector3(-0.2, 0, -2.02);
    this.deskExitAnchor = new THREE.Vector3(-0.2, 0, -1.45);
    this.bedSideAnchor = new THREE.Vector3(1.48, 0, 2.05);
    this.bathOutsideAnchor = new THREE.Vector3(2.05, 0, -1.15);
    this.bathInsideAnchor = new THREE.Vector3(2.05, 0, -2.05);
    this.toiletApproachAnchor = new THREE.Vector3(3.32, 0, -2.52);
    this.centerAnchor = new THREE.Vector3(0.55, 0, -0.35);

    this.chillSpots = [
      { id: "phone", label: "在床邊滑手機放鬆中", pos: new THREE.Vector3(1.94, 0, 1.95), rotY: -Math.PI / 2 },
      { id: "exercise", label: "做伏地挺身保持體力", pos: new THREE.Vector3(-0.55, 0, 0.72), rotY: -0.6 },
      { id: "read", label: "翻閱靈感畫冊", pos: new THREE.Vector3(-0.85, 0, 1.45), rotY: 0.7 },
      { id: "eat", label: "享用熱食補充靈感", pos: new THREE.Vector3(0.85, 0, 2.45), rotY: -2.2 },
      { id: "gaming", label: "偷玩方塊沙盒遊戲", pos: new THREE.Vector3(-0.2, 0, -2.02), rotY: Math.PI },
      // Parallel along the bed (+Z is headboard/pillow at 2.83; charBody rotation.x=-PI/2 + root rotY=PI puts head at +Z)
      { id: "sleep", label: "在床上休息睡眠中", pos: new THREE.Vector3(2.65, 0, 1.48), rotY: Math.PI }
    ];

    this.actionSpots = {
      wash: { id: "wash", label: "洗手台洗手中", pos: new THREE.Vector3(2.22, 0, -2.92), rotY: Math.PI },
      toilet: { id: "toilet", label: "使用洗手間中", pos: new THREE.Vector3(3.32, 0, -3.16), rotY: 0 }
    };

    // Character AI state machine:
    // "IDLE" | "WALK_TO_ACTIVITY" | "WALK_TO_WORK" | "WORKING"
    this.charState = "IDLE";
    this.currentActivity = "phone";
    this.activityTimer = IDLE_MIN_SEC;
    this.postWorkCooldown = 0;
    this.thoughtCooldown = 2.0;
    this.thoughtBags = {};
    this.lastThoughtByActivity = {};
    this.walkWaypoints = [];
    this.walkCallback = null;

    // Interactive hover/raycast
    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2(-99, -99);
    this.hoveredTarget = null;
    this.allInteractTargets = [];

    this.initScene();
    this.buildLights();
    this.buildRoomShell();
    this.buildFurniture();
    this.buildCharacter(this.avatarConfig);
    this.placeCharacterAtIdleStart();
    this.bindEvents();
    this.updateCameraTransform(true);
    this.animate();
  }

  addInteractive(mesh, interactType) {
    mesh.userData.interactType = interactType;
    if (mesh.material && "emissive" in mesh.material && mesh.material !== this.lampBulbMat) {
      mesh.material = mesh.material.clone();
      mesh.userData.baseEmissive = mesh.material.emissive.clone();
      mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity;
      mesh.userData.hoverGlow = 0;
    }
    this.allInteractTargets.push(mesh);
  }

  initScene() {
    const width = Math.max(320, this.container.clientWidth || 800);
    const height = Math.max(320, this.container.clientHeight || 560);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#e8dfd1");

    const aspect = width / height;
    const viewSize = 6.35;
    this.baseViewSize = viewSize;
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      60
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.container.innerHTML = "";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.container.appendChild(this.renderer.domElement);

    // Floating character name + thought bubble HTML overlay inside container
    this.nameTagEl = document.createElement("div");
    this.nameTagEl.className = "room-char-nametag";
    this.container.appendChild(this.nameTagEl);

    this.bubbleEl = document.createElement("div");
    this.bubbleEl.className = "room-char-bubble hidden";
    this.container.appendChild(this.bubbleEl);
  }

  buildLights() {
    this.hemiLight = new THREE.HemisphereLight("#fff3e0", "#c99b78", 0.72);
    this.scene.add(this.hemiLight);

    // Key directional Sun/Moon light casting soft shadows through the north window & across studio
    this.sunLight = new THREE.DirectionalLight("#fff1d6", 2.05);
    this.sunLight.position.set(5.5, 9.5, -6.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 28;
    const d = 7.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Gentle warm ambient fill so shadow undersides look creamy like UE5 Lumen GI
    this.bounceLight = new THREE.DirectionalLight("#ffe4c4", 0.42);
    this.bounceLight.position.set(-6, 4, 6);
    this.scene.add(this.bounceLight);

    // Desk lamp warm tungsten PointLight
    this.deskLampLight = new THREE.PointLight("#ffbe6b", 2.8, 7.2, 1.6);
    this.deskLampLight.position.set(-1.05, 1.55, -2.95);
    this.deskLampLight.castShadow = true;
    this.deskLampLight.shadow.mapSize.set(512, 512);
    this.deskLampLight.shadow.bias = -0.002;
    this.scene.add(this.deskLampLight);

    // Monitor soft cool bounce onto face
    this.screenGlowLight = new THREE.PointLight("#7cc4ff", 0.75, 3.2, 1.8);
    this.screenGlowLight.position.set(-0.2, 1.48, -2.85);
    this.scene.add(this.screenGlowLight);

    // Optional shop-bought bedside night lamp PointLight
    this.bedLampLight = new THREE.PointLight("#ffb86c", 0, 5.2, 1.8);
    this.bedLampLight.position.set(1.46, 0.96, 3.12);
    this.scene.add(this.bedLampLight);
  }

  buildRoomShell() {
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    // Thick slab base under floor for clean Game Dev Tycoon diorama edge
    const baseMat = makeMat("#8a684e", 0.85);
    const slab = new THREE.Mesh(new RoundedBoxGeometry(8.56, 0.42, 8.56, 3, 0.06), baseMat);
    slab.position.set(0, -0.22, 0);
    slab.receiveShadow = true;
    this.roomGroup.add(slab);

    // Honey-oak warm floor planks
    const floorMat = makeMat("#d8a774", 0.62, 0.04);
    const floor = new THREE.Mesh(new RoundedBoxGeometry(8.2, 0.08, 8.2, 2, 0.03), floorMat);
    floor.position.set(0, -0.04, 0);
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Subtle wooden plank grooves
    const plankLineMat = makeMat("#c4905c", 0.72);
    for (let i = -3.2; i <= 3.2; i += 0.8) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.005, 0.025), plankLineMat);
      strip.position.set(0, 0.002, i);
      strip.receiveShadow = true;
      this.roomGroup.add(strip);
    }

    // Perimeter Wall System with auto-cutaway on the 2 front-most walls per camera angle!
    this.wallMat = makeMat(this.wallColorHex, 0.78);
    const trimMat = makeMat("#e5d7c3", 0.65);

    this.walls = [
      this.createNorthWall(this.wallMat, trimMat), // window wall (-Z)
      this.createEastWall(this.wallMat, trimMat),  // (+X)
      this.createSouthWall(this.wallMat, trimMat), // (+Z)
      this.createWestWall(this.wallMat, trimMat)   // door wall (-X)
    ];

    this.walls.forEach(w => {
      this.roomGroup.add(w.baseboard);
      this.roomGroup.add(w.upperGroup);
    });
  }

  createNorthWall(wallMat, trimMat) {
    // Wall along z = -4.12, outward normal (0, 0, -1). Includes a large picture window centered at x = -0.25!
    const upperGroup = new THREE.Group();
    const h = 3.15;

    // Left segment: x from -4.24 to -1.45 (width 2.79)
    const leftSeg = new THREE.Mesh(new RoundedBoxGeometry(2.79, h, 0.24, 2, 0.04), wallMat);
    leftSeg.position.set(-2.845, h / 2, -4.12);
    leftSeg.castShadow = true;
    leftSeg.receiveShadow = true;
    upperGroup.add(leftSeg);

    // Right segment: x from +0.95 to +4.24 (width 3.29)
    const rightSeg = new THREE.Mesh(new RoundedBoxGeometry(3.29, h, 0.24, 2, 0.04), wallMat);
    rightSeg.position.set(2.595, h / 2, -4.12);
    rightSeg.castShadow = true;
    rightSeg.receiveShadow = true;
    upperGroup.add(rightSeg);

    // Below window sill: x from -1.45 to +0.95 (width 2.4), height 1.05
    const bottomSeg = new THREE.Mesh(new RoundedBoxGeometry(2.44, 1.05, 0.24, 2, 0.04), wallMat);
    bottomSeg.position.set(-0.25, 0.525, -4.12);
    bottomSeg.castShadow = true;
    bottomSeg.receiveShadow = true;
    upperGroup.add(bottomSeg);

    // Header lintel above window: height 0.55 (y = 2.6..3.15)
    const topSeg = new THREE.Mesh(new RoundedBoxGeometry(2.44, 0.55, 0.24, 2, 0.04), wallMat);
    topSeg.position.set(-0.25, 2.875, -4.12);
    topSeg.castShadow = true;
    topSeg.receiveShadow = true;
    upperGroup.add(topSeg);

    // Window frame & sill
    const frameMat = makeMat("#8b6447", 0.52);
    const sill = new THREE.Mesh(new RoundedBoxGeometry(2.56, 0.1, 0.36, 2, 0.03), frameMat);
    sill.position.set(-0.25, 1.08, -4.08);
    sill.castShadow = true;
    sill.receiveShadow = true;
    upperGroup.add(sill);

    const mullionV = new THREE.Mesh(new RoundedBoxGeometry(0.07, 1.56, 0.14, 2, 0.02), frameMat);
    mullionV.position.set(-0.25, 1.85, -4.12);
    mullionV.castShadow = true;
    upperGroup.add(mullionV);

    // Window sky backdrop plane right behind window opening (shows sunrise/day/sunset/stars!)
    this.windowSkyMat = new THREE.MeshBasicMaterial({ color: "#87cefa" });
    const skyBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.58), this.windowSkyMat);
    skyBackdrop.position.set(-0.25, 1.84, -4.23);
    upperGroup.add(skyBackdrop);

    // Glass pane with soft sheen
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: "#d8f0ff",
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      metalness: 0.05
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 1.5), glassMat);
    glass.position.set(-0.25, 1.84, -4.11);
    upperGroup.add(glass);

    // Shop item: Wall Art Poster mounted on blank North wall left of window
    const posterGroup = new THREE.Group();
    posterGroup.position.set(-2.72, 1.92, -3.99);
    const frameOuter = new THREE.Mesh(new RoundedBoxGeometry(0.92, 1.18, 0.04, 2, 0.015), makeMat("#7a553a", 0.52));
    frameOuter.castShadow = true;
    posterGroup.add(frameOuter);
    const matBoard = new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.06, 0.045, 2, 0.01), makeMat("#faf5ed", 0.85));
    posterGroup.add(matBoard);
    const posterArt = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.9),
      new THREE.MeshBasicMaterial({ map: makePosterTexture() })
    );
    posterArt.position.z = 0.025;
    posterGroup.add(posterArt);
    posterGroup.visible = Boolean(this.ownedItems.wall_poster);
    this.wallPosterGroup = posterGroup;
    upperGroup.add(posterGroup);

    // Low floor baseboard always left visible during cutaway
    const baseboard = new THREE.Mesh(new RoundedBoxGeometry(8.48, 0.14, 0.24, 2, 0.03), trimMat);
    baseboard.position.set(0, 0.07, -4.12);
    baseboard.receiveShadow = true;

    return { name: "north", normal: new THREE.Vector3(0, 0, -1), upperGroup, baseboard };
  }

  createSouthWall(wallMat, trimMat) {
    const upperGroup = new THREE.Group();
    const h = 3.15;
    const wall = new THREE.Mesh(new RoundedBoxGeometry(8.48, h, 0.24, 2, 0.04), wallMat);
    wall.position.set(0, h / 2, 4.12);
    wall.castShadow = true;
    wall.receiveShadow = true;
    upperGroup.add(wall);

    const baseboard = new THREE.Mesh(new RoundedBoxGeometry(8.48, 0.14, 0.24, 2, 0.03), trimMat);
    baseboard.position.set(0, 0.07, 4.12);
    baseboard.receiveShadow = true;

    return { name: "south", normal: new THREE.Vector3(0, 0, 1), upperGroup, baseboard };
  }

  createEastWall(wallMat, trimMat) {
    const upperGroup = new THREE.Group();
    const h = 3.15;
    const wall = new THREE.Mesh(new RoundedBoxGeometry(0.24, h, 8.24, 2, 0.04), wallMat);
    wall.position.set(4.12, h / 2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    upperGroup.add(wall);

    const baseboard = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.14, 8.24, 2, 0.03), trimMat);
    baseboard.position.set(4.12, 0.07, 0);
    baseboard.receiveShadow = true;

    return { name: "east", normal: new THREE.Vector3(1, 0, 0), upperGroup, baseboard };
  }

  createWestWall(wallMat, trimMat) {
    const upperGroup = new THREE.Group();
    const h = 3.15;
    const wall = new THREE.Mesh(new RoundedBoxGeometry(0.24, h, 8.24, 2, 0.04), wallMat);
    wall.position.set(-4.12, h / 2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    upperGroup.add(wall);

    // Apartment entrance door attached to West wall around z = 2.05
    const doorFrameMat = makeMat("#7a553a", 0.55);
    const doorPanelMat = makeMat("#a97851", 0.58);
    const brassMat = makeMat("#eab308", 0.25, 0.85);

    const doorFrame = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.36, 1.32, 2, 0.03), doorFrameMat);
    doorFrame.position.set(-3.98, 1.18, 2.05);
    doorFrame.castShadow = true;
    upperGroup.add(doorFrame);

    const doorLeaf = new THREE.Mesh(new RoundedBoxGeometry(0.16, 2.24, 1.14, 2, 0.03), doorPanelMat);
    doorLeaf.position.set(-3.96, 1.12, 2.05);
    doorLeaf.receiveShadow = true;
    upperGroup.add(doorLeaf);

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), brassMat);
    handle.position.set(-3.86, 1.05, 1.62);
    upperGroup.add(handle);

    // Shop item: Wall-mounted flat TV on the wall to the right of the door (-Z side of West wall)
    const tvGroup = new THREE.Group();
    tvGroup.position.set(-3.98, 1.56, -0.35);
    tvGroup.rotation.y = Math.PI / 2;
    const tvChassis = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.86, 0.055, 3, 0.02), makeMat("#1e2430", 0.35, 0.2));
    tvChassis.castShadow = true;
    tvGroup.add(tvChassis);
    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 0.74),
      new THREE.MeshBasicMaterial({ map: makeTvScreenTexture() })
    );
    tvScreen.position.z = 0.03;
    tvGroup.add(tvScreen);
    const tvLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 8),
      new THREE.MeshBasicMaterial({ color: "#34d399" })
    );
    tvLed.position.set(0.58, -0.39, 0.03);
    tvGroup.add(tvLed);
    const tvShelf = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.06, 0.24, 2, 0.02), makeMat("#9c6b45", 0.55));
    tvShelf.position.set(0, -0.56, 0.11);
    tvShelf.castShadow = true;
    tvGroup.add(tvShelf);
    tvGroup.visible = Boolean(this.ownedItems.wall_tv);
    this.wallTvGroup = tvGroup;
    upperGroup.add(tvGroup);

    const baseboard = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.14, 8.24, 2, 0.03), trimMat);
    baseboard.position.set(-4.12, 0.07, 0);
    baseboard.receiveShadow = true;

    return { name: "west", normal: new THREE.Vector3(-1, 0, 0), upperGroup, baseboard };
  }

  buildFurniture() {
    this.furnitureGroup = new THREE.Group();
    this.roomGroup.add(this.furnitureGroup);

    this.buildDoormat();
    this.buildCozyRug();
    this.buildBathroomCorner();
    this.buildSingleBed();
    this.buildWorkDeskAndMac();
    this.buildShopSofaAndBedLamp();
  }

  buildShopSofaAndBedLamp() {
    // 1. Shop item: Cozy Two-Seater Sofa facing the West-wall TV (-X)
    const sofaGroup = new THREE.Group();
    sofaGroup.position.set(-1.78, 0, -0.35);
    sofaGroup.rotation.y = -Math.PI / 2;

    const sofaLegMat = makeMat("#8b5a3c", 0.55);
    const sofaFabricMat = makeMat("#8da399", 0.88);
    const cushionMat = makeMat("#a2b8ae", 0.86);
    const pillowAccentMat = makeMat("#e07a5f", 0.84);

    [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 10), sofaLegMat);
      leg.position.set(lx, 0.07, lz);
      leg.castShadow = true;
      sofaGroup.add(leg);
    });

    const sofaBase = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.24, 0.84, 4, 0.06), sofaFabricMat);
    sofaBase.position.set(0, 0.24, 0);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    sofaGroup.add(sofaBase);

    [-0.36, 0.36].forEach(cx => {
      const seat = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.68, 4, 0.06), cushionMat);
      seat.position.set(cx, 0.4, 0.05);
      seat.castShadow = true;
      seat.receiveShadow = true;
      sofaGroup.add(seat);
    });

    const backrest = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.52, 0.2, 4, 0.07), sofaFabricMat);
    backrest.position.set(0, 0.56, -0.32);
    backrest.rotation.x = -0.08;
    backrest.castShadow = true;
    sofaGroup.add(backrest);

    [-0.77, 0.77].forEach(ax => {
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.38, 0.84, 4, 0.06), sofaFabricMat);
      arm.position.set(ax, 0.44, 0);
      arm.castShadow = true;
      sofaGroup.add(arm);
    });

    [-0.44, 0.44].forEach((px, idx) => {
      const throwPillow = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.24, 0.12, 3, 0.04), pillowAccentMat);
      throwPillow.position.set(px, 0.58, -0.15);
      throwPillow.rotation.set(-0.22, idx === 0 ? 0.25 : -0.25, 0);
      throwPillow.castShadow = true;
      sofaGroup.add(throwPillow);
    });

    sofaGroup.visible = Boolean(this.ownedItems.cozy_sofa);
    this.sofaGroup = sofaGroup;
    this.furnitureGroup.add(sofaGroup);

    // 2. Shop item: Bedside Nightstand + Clickable Warm Night Lamp beside Bed Headboard
    const bedLampGroup = new THREE.Group();
    bedLampGroup.position.set(1.46, 0, 3.12);

    const standMat = makeMat("#b98456", 0.55);
    const standBody = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.46, 4, 0.05), standMat);
    standBody.position.set(0, 0.25, 0);
    standBody.castShadow = true;
    standBody.receiveShadow = true;
    bedLampGroup.add(standBody);

    const drawerFront = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.16, 0.03, 2, 0.01), makeMat("#cfa072", 0.5));
    drawerFront.position.set(0, 0.34, -0.225);
    bedLampGroup.add(drawerFront);

    const nBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.05, 16), makeMat("#e2e8f0", 0.35));
    nBase.position.set(0, 0.525, 0);
    bedLampGroup.add(nBase);

    const nStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 12), makeMat("#d97757", 0.45));
    nStem.position.set(0, 0.62, 0);
    bedLampGroup.add(nStem);

    this.bedLampShadeMat = new THREE.MeshStandardMaterial({
      color: "#fde68a",
      emissive: "#ffb347",
      emissiveIntensity: this.bedLampOn ? 0.55 : 0.0,
      roughness: 0.45
    });
    const nShade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.18, 18), this.bedLampShadeMat);
    nShade.position.set(0, 0.77, 0);
    nShade.castShadow = true;
    bedLampGroup.add(nShade);

    this.bedLampBulbMat = new THREE.MeshStandardMaterial({
      color: "#fff7d6",
      emissive: "#ffb347",
      emissiveIntensity: this.bedLampOn ? 1.5 : 0.0,
      roughness: 0.2
    });
    const nBulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), this.bedLampBulbMat);
    nBulb.position.set(0, 0.72, 0);
    bedLampGroup.add(nBulb);

    [standBody, nBase, nStem, nShade, nBulb].forEach(m => this.addInteractive(m, "bedLamp"));
    bedLampGroup.visible = Boolean(this.ownedItems.bed_lamp);
    this.bedLampGroup = bedLampGroup;
    this.furnitureGroup.add(bedLampGroup);
  }

  buildDoormat() {
    const matMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.85, 0.04, 1.28, 2, 0.02),
      makeMat("#7d9b76", 0.92)
    );
    matMesh.position.set(-3.36, 0.02, 2.05);
    matMesh.receiveShadow = true;
    this.furnitureGroup.add(matMesh);
  }

  buildCozyRug() {
    const rug = new THREE.Mesh(
      new RoundedBoxGeometry(2.65, 0.03, 2.25, 3, 0.015),
      makeMat("#ebe1d2", 0.95)
    );
    rug.position.set(-0.55, 0.015, 0.72);
    rug.receiveShadow = true;
    this.furnitureGroup.add(rug);

    const innerStripe = new THREE.Mesh(
      new RoundedBoxGeometry(2.25, 0.034, 1.85, 3, 0.015),
      makeMat("#dfcbb5", 0.95)
    );
    innerStripe.position.set(-0.55, 0.017, 0.72);
    innerStripe.receiveShadow = true;
    this.furnitureGroup.add(innerStripe);
  }

  buildBathroomCorner() {
    const bathGroup = new THREE.Group();
    this.furnitureGroup.add(bathGroup);

    // Ceramic tile zone in Northeast corner (+X, -Z)
    const tileMat = makeMat("#e5ecf2", 0.35, 0.05);
    const tileFloor = new THREE.Mesh(new RoundedBoxGeometry(2.45, 0.028, 2.45, 2, 0.012), tileMat);
    tileFloor.position.set(2.76, 0.014, -2.76);
    tileFloor.receiveShadow = true;
    bathGroup.add(tileFloor);

    // Low frosted partition walls (never block isometric overview!)
    const partFrameMat = makeMat("#9fb0c4", 0.4, 0.25);
    const frostedMat = new THREE.MeshPhysicalMaterial({
      color: "#d8e9f5",
      roughness: 0.38,
      transparent: true,
      opacity: 0.62
    });

    // West divider panel with open doorway toward bottom
    const westPart = new THREE.Mesh(new RoundedBoxGeometry(0.1, 1.18, 1.55, 2, 0.03), frostedMat);
    westPart.position.set(1.52, 0.59, -3.22);
    westPart.castShadow = true;
    bathGroup.add(westPart);

    const westCap = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.06, 1.57, 2, 0.02), partFrameMat);
    westCap.position.set(1.52, 1.19, -3.22);
    bathGroup.add(westCap);

    // South divider panel (partial privacy screen)
    const southPart = new THREE.Mesh(new RoundedBoxGeometry(1.45, 1.18, 0.1, 2, 0.03), frostedMat);
    southPart.position.set(3.26, 0.59, -1.52);
    southPart.castShadow = true;
    bathGroup.add(southPart);

    const southCap = new THREE.Mesh(new RoundedBoxGeometry(1.47, 0.06, 0.12, 2, 0.02), partFrameMat);
    southCap.position.set(3.26, 1.19, -1.52);
    bathGroup.add(southCap);

    // Cute rounded porcelain toilet
    const ceramicMat = makeMat("#f8fafc", 0.22, 0.04);
    const chromeMat = makeMat("#cbd5e1", 0.2, 0.85);
    const toilet = new THREE.Group();
    toilet.position.set(3.32, 0, -3.35);

    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.34, 20), ceramicMat);
    ped.position.set(0, 0.17, 0.06);
    ped.castShadow = true;
    toilet.add(ped);

    const bowl = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.18, 0.58, 4, 0.08), ceramicMat);
    bowl.position.set(0, 0.38, 0.12);
    bowl.castShadow = true;
    toilet.add(bowl);

    const lid = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.06, 0.52, 3, 0.03), makeMat("#ffffff", 0.18));
    lid.position.set(0, 0.49, 0.12);
    lid.castShadow = true;
    toilet.add(lid);

    const tank = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.56, 0.24, 4, 0.07), ceramicMat);
    tank.position.set(0, 0.58, -0.2);
    tank.castShadow = true;
    toilet.add(tank);

    const flushBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), chromeMat);
    flushBtn.position.set(0, 0.87, -0.2);
    toilet.add(flushBtn);

    bathGroup.add(toilet);
    [ped, bowl, lid, tank, flushBtn].forEach(m => this.addInteractive(m, "toilet"));

    // Compact corner wash basin
    const sinkGroup = new THREE.Group();
    sinkGroup.position.set(2.22, 0, -3.45);
    const sinkPed = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.68, 16), ceramicMat);
    sinkPed.position.set(0, 0.34, 0);
    sinkPed.castShadow = true;
    sinkGroup.add(sinkPed);

    const basin = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.18, 0.48, 4, 0.07), ceramicMat);
    basin.position.set(0, 0.72, 0.04);
    basin.castShadow = true;
    sinkGroup.add(basin);

    const faucet = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.16, 0.12, 2, 0.02), chromeMat);
    faucet.position.set(0, 0.86, -0.1);
    sinkGroup.add(faucet);

    bathGroup.add(sinkGroup);
    [sinkPed, basin, faucet].forEach(m => this.addInteractive(m, "sink"));
  }

  buildSingleBed() {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(2.65, 0, 2.05);
    this.furnitureGroup.add(bedGroup);

    const woodMat = makeMat("#b98456", 0.58);
    const sheetMat = makeMat("#f5f0e8", 0.86);
    const blanketMat = makeMat("#6d8da6", 0.88);
    const pillowMat = makeMat("#fff9f0", 0.9);

    // Wooden bed frame
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.28, 2.52, 4, 0.07), woodMat);
    frame.position.set(0, 0.22, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    bedGroup.add(frame);

    // Rounded headboard (+Z side)
    const headboard = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.85, 0.16, 4, 0.06), woodMat);
    headboard.position.set(0, 0.48, 1.2);
    headboard.castShadow = true;
    bedGroup.add(headboard);

    // Legs
    [[-0.68, -1.1], [0.68, -1.1], [-0.68, 1.1], [0.68, 1.1]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12), woodMat);
      leg.position.set(lx, 0.07, lz);
      leg.castShadow = true;
      bedGroup.add(leg);
    });

    // Plump mattress
    const mattress = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.24, 2.32, 5, 0.09), sheetMat);
    mattress.position.set(0, 0.42, -0.02);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bedGroup.add(mattress);

    // Folded soft blanket
    const blanket = new THREE.Mesh(new RoundedBoxGeometry(1.54, 0.2, 1.48, 5, 0.09), blanketMat);
    blanket.position.set(0, 0.47, -0.45);
    blanket.castShadow = true;
    blanket.receiveShadow = true;
    bedGroup.add(blanket);

    // Fluffy pillow
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.18, 0.52, 5, 0.08), pillowMat);
    pillow.position.set(0, 0.57, 0.78);
    pillow.rotation.x = -0.12;
    pillow.castShadow = true;
    bedGroup.add(pillow);

    [frame, headboard, mattress, blanket, pillow].forEach(m => this.addInteractive(m, "bed"));
  }

  buildWorkDeskAndMac() {
    const workArea = new THREE.Group();
    workArea.position.set(-0.2, 0, -3.05);
    this.furnitureGroup.add(workArea);

    const deskWood = makeMat("#cfa072", 0.52);
    const deskLegMat = makeMat("#4b5563", 0.45, 0.3);

    // Desk tabletop (rounded modern minimalist desk)
    const tableTop = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.11, 1.12, 4, 0.045), deskWood);
    tableTop.position.set(0, 0.92, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    workArea.add(tableTop);
    this.addInteractive(tableTop, "computer");

    // 4 clean legs
    [[-1.02, -0.44], [1.02, -0.44], [-1.02, 0.44], [1.02, 0.44]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.9, 14), deskLegMat);
      leg.position.set(lx, 0.45, lz);
      leg.castShadow = true;
      workArea.add(leg);
    });

    // Mac-like sleek silver desktop monitor
    const aluMat = makeMat("#d6dbe3", 0.28, 0.72);
    const bezelMat = makeMat("#1e2430", 0.35, 0.1);

    const standFoot = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.03, 0.26, 3, 0.015), aluMat);
    standFoot.position.set(0, 0.99, -0.2);
    standFoot.castShadow = true;
    workArea.add(standFoot);

    const standNeck = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.24, 0.04, 2, 0.015), aluMat);
    standNeck.position.set(0, 1.12, -0.24);
    standNeck.rotation.x = -0.15;
    workArea.add(standNeck);

    const macChassis = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.64, 0.05, 4, 0.025), aluMat);
    macChassis.position.set(0, 1.46, -0.2);
    macChassis.castShadow = true;
    workArea.add(macChassis);
    this.addInteractive(macChassis, "computer");

    const macBezel = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.56, 0.055, 3, 0.02), bezelMat);
    macBezel.position.set(0, 1.47, -0.195);
    workArea.add(macBezel);
    this.addInteractive(macBezel, "computer");

    this.artScreenTex = makeDeskScreenTexture("art");
    this.gameScreenTex = makeDeskScreenTexture("game");
    this.macScreenMat = new THREE.MeshBasicMaterial({ map: this.artScreenTex });
    const macDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), this.macScreenMat);
    macDisplay.position.set(0, 1.475, -0.165);
    workArea.add(macDisplay);
    this.addInteractive(macDisplay, "computer");

    // Compact rounded Mac keyboard + Shop Mechanical RGB Keyboard + mouse
    const keyMat = makeMat("#eef2f6", 0.45);
    const keyboard = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.025, 0.16, 2, 0.01), keyMat);
    keyboard.position.set(-0.08, 0.99, 0.12);
    keyboard.castShadow = true;
    keyboard.visible = !this.ownedItems.cool_keyboard;
    this.basicKeyboard = keyboard;
    workArea.add(keyboard);
    this.addInteractive(keyboard, "computer");

    const coolKb = new THREE.Group();
    coolKb.position.set(-0.08, 0.992, 0.12);
    const kbCase = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.028, 0.17, 2, 0.01), makeMat("#1e293b", 0.35, 0.2));
    kbCase.castShadow = true;
    coolKb.add(kbCase);
    const rgbStrip = new THREE.Mesh(
      new RoundedBoxGeometry(0.49, 0.008, 0.176, 1, 0.003),
      makeMat("#38bdf8", 0.2, 0.1, { emissive: "#ec4899", emissiveIntensity: 0.9 })
    );
    rgbStrip.position.y = -0.006;
    coolKb.add(rgbStrip);
    const keycapBed = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.014, 0.13, 2, 0.005), makeMat("#e2e8f0", 0.4));
    keycapBed.position.y = 0.014;
    coolKb.add(keycapBed);
    const keyAccent = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 0.016, 0.04, 1, 0.004),
      makeMat("#38bdf8", 0.3, 0.1, { emissive: "#38bdf8", emissiveIntensity: 0.35 })
    );
    keyAccent.position.set(-0.14, 0.015, -0.02);
    coolKb.add(keyAccent);
    coolKb.visible = Boolean(this.ownedItems.cool_keyboard);
    this.coolKeyboardGroup = coolKb;
    workArea.add(coolKb);
    [kbCase, keycapBed, keyAccent].forEach(m => this.addInteractive(m, "computer"));

    // Shop item: Cute Desk Monstera Plant on back-right corner of desk
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0.88, 0.975, -0.24);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.16, 16), makeMat("#d97757", 0.65));
    pot.position.y = 0.08;
    pot.castShadow = true;
    plantGroup.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.02, 14), makeMat("#5c4033", 0.95));
    soil.position.y = 0.155;
    plantGroup.add(soil);
    const leafMat = makeMat("#4d8c57", 0.45);
    [
      [0, 0.25, 0, 0.15, 0.25, 0],
      [-0.06, 0.22, 0.05, 0.42, 0.4, 0.48],
      [0.07, 0.23, 0.04, 0.35, -0.3, -0.52],
      [-0.04, 0.23, -0.06, -0.45, 0.2, 0.4],
      [0.05, 0.21, -0.06, -0.38, -0.25, -0.42]
    ].forEach(([lx, ly, lz, rx, ry, rz]) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), leafMat);
      leaf.scale.set(0.9, 1.45, 0.28);
      leaf.position.set(lx, ly, lz);
      leaf.rotation.set(rx, ry, rz);
      leaf.castShadow = true;
      plantGroup.add(leaf);
    });
    plantGroup.visible = Boolean(this.ownedItems.desk_plant);
    this.deskPlantGroup = plantGroup;
    workArea.add(plantGroup);

    const mouse = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.028, 0.12, 3, 0.014), keyMat);
    mouse.position.set(0.26, 0.99, 0.12);
    workArea.add(mouse);

    // Drawing Tablet + Stylus (電繪板!)
    const tabletMat = makeMat("#2a3242", 0.38, 0.15);
    const tabletScreenMat = makeMat("#3b4a66", 0.25);
    const tablet = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.032, 0.34, 3, 0.016), tabletMat);
    tablet.position.set(0.56, 1.0, 0.2);
    tablet.rotation.x = 0.12;
    tablet.rotation.y = -0.22;
    tablet.castShadow = true;
    workArea.add(tablet);
    this.addInteractive(tablet, "computer");

    const tabletActiveArea = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.01, 0.26, 2, 0.004), tabletScreenMat);
    tabletActiveArea.position.set(0.56, 1.02, 0.2);
    tabletActiveArea.rotation.x = 0.12;
    tabletActiveArea.rotation.y = -0.22;
    workArea.add(tabletActiveArea);
    this.addInteractive(tabletActiveArea, "computer");

    const stylus = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10), makeMat("#f59e0b", 0.4));
    stylus.position.set(0.86, 1.0, 0.24);
    stylus.rotation.z = Math.PI / 2;
    stylus.rotation.y = 0.35;
    workArea.add(stylus);

    // Cozy toggleable Desk Lamp on left edge of desk
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.88, 0.97, -0.15);
    const lampBaseMat = makeMat("#d97757", 0.42);
    const lampShadeMat = makeMat("#f59e0b", 0.4);
    this.lampBulbMat = new THREE.MeshStandardMaterial({
      color: "#fff3c4",
      emissive: "#ffb347",
      emissiveIntensity: this.deskLampOn ? 1.6 : 0.0,
      roughness: 0.2
    });

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 18), lampBaseMat);
    lampBase.position.set(0, 0.025, 0);
    lampBase.castShadow = true;
    lampGroup.add(lampBase);

    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12), makeMat("#64748b", 0.3, 0.6));
    lampArm.position.set(-0.04, 0.22, 0);
    lampArm.rotation.z = -0.2;
    lampGroup.add(lampArm);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 20), lampShadeMat);
    lampShade.position.set(0.05, 0.43, 0);
    lampShade.rotation.z = -0.5;
    lampShade.castShadow = true;
    lampGroup.add(lampShade);

    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), this.lampBulbMat);
    lampBulb.position.set(0.08, 0.38, 0);
    lampGroup.add(lampBulb);

    workArea.add(lampGroup);
    [lampBase, lampArm, lampShade, lampBulb].forEach(m => this.addInteractive(m, "lamp"));

    // Hover highlight ring around desk setup
    const ringGeo = new THREE.RingGeometry(0.95, 1.06, 36);
    this.workHoverRingMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    const hoverRing = new THREE.Mesh(ringGeo, this.workHoverRingMat);
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.position.set(-0.2, 0.02, -2.55);
    this.roomGroup.add(hoverRing);

    // Cozy Swivel Desk Chair
    const chair = new THREE.Group();
    chair.position.set(-0.2, 0, -2.02);
    const chairFabric = makeMat("#5b738f", 0.8);
    const chairMetal = makeMat("#475569", 0.35, 0.6);

    const chairSeat = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.58, 4, 0.05), chairFabric);
    chairSeat.position.set(0, 0.48, 0);
    chairSeat.castShadow = true;
    chair.add(chairSeat);

    const chairBack = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.56, 0.11, 4, 0.05), chairFabric);
    chairBack.position.set(0, 0.78, 0.25);
    chairBack.rotation.x = 0.08;
    chairBack.castShadow = true;
    chair.add(chairBack);

    const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12), chairMetal);
    chairPole.position.set(0, 0.24, 0);
    chair.add(chairPole);

    const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 16), chairMetal);
    chairBase.position.set(0, 0.04, 0);
    chair.add(chairBase);

    this.chairGroup = chair;
    this.furnitureGroup.add(chair);
    this.addInteractive(chairSeat, "computer");
    this.addInteractive(chairBack, "computer");
  }

  buildCharacter(config) {
    if (this.charRoot) {
      this.roomGroup.remove(this.charRoot);
    }

    const rig = createCharacterRig(config);
    this.avatarConfig = rig.config;
    this.charRoot = rig.root;
    this.charBody = rig.body;
    this.leftLegPivot = rig.leftLegPivot;
    this.rightLegPivot = rig.rightLegPivot;
    this.leftArmPivot = rig.leftArmPivot;
    this.rightArmPivot = rig.rightArmPivot;
    this.torsoGroup = rig.torsoGroup;
    this.headGroup = rig.headGroup;
    this.phoneProp = rig.phoneProp;
    this.bookProp = rig.bookProp;
    this.snackProp = rig.snackProp;

    this.roomGroup.add(this.charRoot);

    this.nameTagEl.textContent = (this.avatarConfig.name || "接案繪師").trim();
    if (this.charState === "WORKING") {
      this.charRoot.position.copy(this.deskWorkAnchor);
      this.charRoot.rotation.y = Math.PI;
    }
  }

  placeCharacterAtIdleStart() {
    const startSpot = this.chillSpots[0];
    this.charRoot.position.copy(startSpot.pos);
    this.charRoot.rotation.y = startSpot.rotY;
    this.currentActivity = startSpot.id;
    this.thoughtCooldown = 1.6 + Math.random() * 1.8;
    this.onActivityChange(startSpot.label);
  }

  updateAvatarConfig(nextConfig) {
    const prevPos = this.charRoot ? this.charRoot.position.clone() : this.chillSpots[0].pos.clone();
    const prevRot = this.charRoot ? this.charRoot.rotation.y : 0;
    this.buildCharacter(nextConfig);
    this.charRoot.position.copy(prevPos);
    this.charRoot.rotation.y = prevRot;
  }

  setDeskLamp(isOn) {
    this.deskLampOn = Boolean(isOn);
    if (this.lampBulbMat) {
      this.lampBulbMat.emissiveIntensity = this.deskLampOn ? 1.6 : 0.0;
    }
  }

  setBedLamp(isOn) {
    this.bedLampOn = Boolean(isOn);
    if (this.bedLampBulbMat) {
      this.bedLampBulbMat.emissiveIntensity = this.bedLampOn ? 1.5 : 0.0;
    }
    if (this.bedLampShadeMat) {
      this.bedLampShadeMat.emissiveIntensity = this.bedLampOn ? 0.55 : 0.0;
    }
  }

  setWallColor(hex) {
    if (!hex) return;
    this.wallColorHex = hex;
    if (this.wallMat) {
      this.wallMat.color.set(hex);
    }
  }

  applyOwnedItems(ownedItems = {}) {
    this.ownedItems = { ...(ownedItems || {}) };
    if (this.wallPosterGroup) this.wallPosterGroup.visible = Boolean(this.ownedItems.wall_poster);
    if (this.wallTvGroup) this.wallTvGroup.visible = Boolean(this.ownedItems.wall_tv);
    if (this.sofaGroup) this.sofaGroup.visible = Boolean(this.ownedItems.cozy_sofa);
    if (this.bedLampGroup) this.bedLampGroup.visible = Boolean(this.ownedItems.bed_lamp);
    if (this.deskPlantGroup) this.deskPlantGroup.visible = Boolean(this.ownedItems.desk_plant);
    if (this.coolKeyboardGroup) this.coolKeyboardGroup.visible = Boolean(this.ownedItems.cool_keyboard);
    if (this.basicKeyboard) this.basicKeyboard.visible = !this.ownedItems.cool_keyboard;
  }

  setQuarter(quarter) {
    this.targetQuarter = ((quarter % 4) + 4) % 4;
  }

  rotateLeft() {
    this.setQuarter(this.targetQuarter - 1);
    return this.targetQuarter;
  }

  rotateRight() {
    this.setQuarter(this.targetQuarter + 1);
    return this.targetQuarter;
  }

  // Triggered when clicking the computer/desk (or pressing keyboard shortcut)
  goToWork() {
    if (this.charState === "WALK_TO_WORK") return;
    const isNightSleeping = this.currentActivity === "sleep";

    if (this.charState === "WORKING") {
      this.onEnterWork();
      return;
    }

    this.hideAllProps();
    if (this.macScreenMat) {
      this.macScreenMat.map = this.artScreenTex;
      this.macScreenMat.needsUpdate = true;
    }

    if (isNightSleeping) {
      this.showBubble("💡 靈感來了！", 1600);
    }

    // Immediate snappy walk straight to desk chair
    this.charState = "WALK_TO_WORK";
    this.currentActivity = "walking";
    this.hideBubble();
    this.onActivityChange("快步前往書桌準備接案...");
    const dist = this.charRoot.position.distanceTo(this.deskWorkAnchor);
    if (dist < 0.35 && this.isNearDesk(this.charRoot.position)) {
      this.charRoot.position.copy(this.deskWorkAnchor);
      this.enterWorkingPose();
      this.onEnterWork();
      return;
    }

    if (this.isOnBed(this.charRoot.position)) {
      this.charRoot.position.copy(this.bedSideAnchor);
    }

    this.walkWaypoints = this.buildPathTo("work", this.deskWorkAnchor);
    this.walkCallback = () => {
      this.enterWorkingPose();
      this.onEnterWork();
    };
  }

  returnFromWork() {
    // Character remains sitting and working at the Mac for ~13 seconds before getting up
    this.hideAllProps();
    if (this.macScreenMat) {
      this.macScreenMat.map = this.artScreenTex;
      this.macScreenMat.needsUpdate = true;
    }
    this.charState = "WORKING";
    this.postWorkCooldown = POST_WORK_COOLDOWN_SEC;
    this.thoughtCooldown = 1.4 + Math.random() * 1.6;
    this.charRoot.position.copy(this.deskWorkAnchor);
    this.charRoot.rotation.y = Math.PI;
    this.onActivityChange("正在電繪板前收尾創作（稍後休息）");
  }

  enterWorkingPose() {
    this.charState = "WORKING";
    this.postWorkCooldown = POST_WORK_COOLDOWN_SEC;
    this.thoughtCooldown = 1.4 + Math.random() * 1.6;
    this.charRoot.position.copy(this.deskWorkAnchor);
    this.charRoot.rotation.y = Math.PI;
    this.onActivityChange("專心創作接案中");
  }

  pickRandomThought(activityKey) {
    const bank = THOUGHT_BANK[activityKey];
    if (!bank || bank.length === 0) return "";
    let bag = this.thoughtBags[activityKey];
    if (!bag || bag.length === 0) {
      bag = [...bank];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const prevLine = this.lastThoughtByActivity[activityKey];
      if (bag.length > 1 && bag[bag.length - 1] === prevLine) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      this.thoughtBags[activityKey] = bag;
    }
    const chosen = bag.pop();
    this.lastThoughtByActivity[activityKey] = chosen;
    return chosen;
  }

  hideBubble() {
    clearTimeout(this.bubbleTimer);
    if (this.bubbleEl) this.bubbleEl.classList.add("hidden");
  }

  showBubble(text, durationMs = 4200) {
    if (!this.bubbleEl || !text) return;
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.remove("hidden");
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      this.bubbleEl.classList.add("hidden");
    }, durationMs);
  }

  hideAllProps() {
    if (this.phoneProp) this.phoneProp.visible = false;
    if (this.bookProp) this.bookProp.visible = false;
    if (this.snackProp) this.snackProp.visible = false;
  }

  isInBathroom(pos = this.charRoot?.position) {
    if (!pos) return false;
    return pos.x > 1.50 && pos.z < -1.50;
  }

  isOnBed(pos = this.charRoot?.position) {
    if (!pos) return false;
    return pos.x >= 1.75 && pos.x <= 3.55 && pos.z >= 0.75 && pos.z <= 3.35;
  }

  isNearDesk(pos = this.charRoot?.position) {
    if (!pos) return false;
    return pos.z < -1.7 && pos.x < 1.3;
  }

  buildPathTo(spotId, targetPos) {
    const rawWaypoints = [];
    const curPos = this.charRoot.position.clone();
    const currentlyInBath = this.isInBathroom(curPos);
    const currentlyOnBed = this.isOnBed(curPos);
    const currentlyNearDesk = this.isNearDesk(curPos);
    const currentlyNearToilet = currentlyInBath && curPos.x > 2.85 && curPos.z < -2.45;

    if (curPos.distanceTo(targetPos) < 0.25) {
      return [targetPos.clone()];
    }

    const targetInBath = spotId === "wash" || spotId === "toilet";
    const targetOnBed = spotId === "sleep" || spotId === "phone";
    const targetNearDesk = spotId === "work" || spotId === "gaming";

    // 1. Exit any enclosed or furniture-occupied zone cleanly based on 3D coords
    if (currentlyOnBed && !targetOnBed) {
      rawWaypoints.push(this.bedSideAnchor.clone());
    } else if (currentlyInBath && !targetInBath) {
      if (currentlyNearToilet) {
        rawWaypoints.push(this.toiletApproachAnchor.clone());
      }
      rawWaypoints.push(this.bathInsideAnchor.clone());
      rawWaypoints.push(this.bathOutsideAnchor.clone());
    } else if (currentlyInBath && targetInBath && currentlyNearToilet && spotId !== "toilet") {
      rawWaypoints.push(this.toiletApproachAnchor.clone());
    } else if (currentlyNearDesk && !targetNearDesk) {
      rawWaypoints.push(this.deskExitAnchor.clone());
    }

    // 2. Route across open room hub when crossing between opposite corners
    if (!(currentlyInBath && targetInBath) && !(currentlyOnBed && targetOnBed)) {
      const fromPt = rawWaypoints.length > 0 ? rawWaypoints[rawWaypoints.length - 1] : curPos;
      let entryPt = targetPos;
      if (targetInBath && !currentlyInBath) entryPt = this.bathOutsideAnchor;
      else if (targetNearDesk && !currentlyNearDesk) entryPt = this.deskExitAnchor;
      else if (targetOnBed && !currentlyOnBed) entryPt = this.bedSideAnchor;

      if (
        fromPt.distanceTo(entryPt) > 2.5 &&
        fromPt.distanceTo(this.centerAnchor) > 0.6 &&
        entryPt.distanceTo(this.centerAnchor) > 0.6
      ) {
        rawWaypoints.push(this.centerAnchor.clone());
      }
    }

    // 3. Enter target zone cleanly
    if (targetInBath && !currentlyInBath) {
      rawWaypoints.push(this.bathOutsideAnchor.clone());
      rawWaypoints.push(this.bathInsideAnchor.clone());
    }
    if (spotId === "toilet" && !currentlyNearToilet) {
      rawWaypoints.push(this.toiletApproachAnchor.clone());
    } else if (targetNearDesk && !currentlyNearDesk) {
      rawWaypoints.push(this.deskExitAnchor.clone());
    } else if (targetOnBed && !currentlyOnBed) {
      rawWaypoints.push(this.bedSideAnchor.clone());
    }

    // 4. Deduplicate consecutive points near curPos / each other, then append final target
    const waypoints = [];
    let prev = curPos;
    for (const wp of rawWaypoints) {
      if (wp.distanceTo(prev) >= 0.25) {
        waypoints.push(wp);
        prev = wp;
      }
    }
    if (waypoints.length === 0 || targetPos.distanceTo(prev) >= 0.15) {
      waypoints.push(targetPos.clone());
    } else {
      waypoints[waypoints.length - 1].copy(targetPos);
    }
    return waypoints;
  }

  commandActivity(spot, durationSec) {
    if (!spot) return;
    this.hideAllProps();
    this.postWorkCooldown = 0;

    if (this.macScreenMat) {
      this.macScreenMat.map = spot.id === "gaming" ? this.gameScreenTex : this.artScreenTex;
      this.macScreenMat.needsUpdate = true;
    }

    const isBedTarget = spot.id === "sleep" || spot.id === "phone";
    if (!isBedTarget && this.isOnBed(this.charRoot.position)) {
      this.charRoot.position.copy(this.bedSideAnchor);
    }

    const walkDest = (isBedTarget && !this.isOnBed(this.charRoot.position))
      ? this.bedSideAnchor
      : spot.pos;

    this.charState = "WALK_TO_ACTIVITY";
    this.currentActivity = "walking";
    this.hideBubble();
    this.walkWaypoints = this.buildPathTo(spot.id, walkDest);
    this.walkCallback = () => {
      this.charState = "IDLE";
      this.currentActivity = spot.id;
      this.activityTimer = durationSec;
      this.thoughtCooldown = 1.2 + Math.random() * 2.2;
      this.charRoot.position.copy(spot.pos);
      this.charRoot.rotation.y = spot.rotY;
      this.onActivityChange(spot.label);
    };
  }

  pickNextIdleActivity(isNightTime) {
    const candidates = isNightTime
      ? ["sleep", "sleep", "phone", "gaming", "read"]
      : ["phone", "exercise", "read", "eat", "gaming"];

    const choices = candidates.filter(id => id !== this.currentActivity);
    const chosenId = choices[Math.floor(Math.random() * choices.length)] || "phone";
    const spot = this.chillSpots.find(s => s.id === chosenId) || this.chillSpots[0];

    this.commandActivity(spot, IDLE_MIN_SEC + Math.random() * IDLE_SPAN_SEC);
  }

  updateDayNightLighting() {
    const now = Date.now();
    // 0.0 -> 0.5 is 15-min Day; 0.5 -> 1.0 is 15-min Night
    const phase = (now % DAY_CYCLE_MS) / DAY_CYCLE_MS;
    const isDay = phase < 0.5;

    let sunColor, sunIntensity, hemiSky, hemiGround, hemiIntensity, bgHex, windowSkyHex, orbColor, label;

    if (phase < 0.08) {
      // Sunrise (06:00 -> 08:00)
      const k = phase / 0.08;
      sunColor = lerpColor(new THREE.Color("#ff8e53"), new THREE.Color("#ffdca8"), k);
      sunIntensity = THREE.MathUtils.lerp(1.2, 2.0, k);
      hemiSky = lerpColor(new THREE.Color("#ffb88c"), new THREE.Color("#fff5e6"), k);
      hemiGround = new THREE.Color("#c99875");
      hemiIntensity = THREE.MathUtils.lerp(0.55, 0.78, k);
      bgHex = lerpColor(new THREE.Color("#e8cbb8"), new THREE.Color("#ece3d5"), k);
      windowSkyHex = lerpColor(new THREE.Color("#fda4af"), new THREE.Color("#93c5fd"), k);
      orbColor = new THREE.Color("#fde047");
      label = "日出清晨";
    } else if (phase < 0.40) {
      // Bright Noon / Warm Afternoon
      sunColor = new THREE.Color("#fff3db");
      sunIntensity = 2.15;
      hemiSky = new THREE.Color("#fff8ee");
      hemiGround = new THREE.Color("#c99a74");
      hemiIntensity = 0.82;
      bgHex = new THREE.Color("#ece3d5");
      windowSkyHex = new THREE.Color("#7dd3fc");
      orbColor = new THREE.Color("#fef08a");
      label = "晴朗正午";
    } else if (phase < 0.52) {
      // Golden Hour / Sunset
      const k = (phase - 0.40) / 0.12;
      sunColor = lerpColor(new THREE.Color("#fff0cf"), new THREE.Color("#ff7b47"), k);
      sunIntensity = THREE.MathUtils.lerp(2.1, 1.4, k);
      hemiSky = lerpColor(new THREE.Color("#fff3e0"), new THREE.Color("#d98b82"), k);
      hemiGround = lerpColor(new THREE.Color("#c99a74"), new THREE.Color("#785563"), k);
      hemiIntensity = THREE.MathUtils.lerp(0.78, 0.5, k);
      bgHex = lerpColor(new THREE.Color("#ece3d5"), new THREE.Color("#3b3048"), k);
      windowSkyHex = lerpColor(new THREE.Color("#7dd3fc"), new THREE.Color("#f97316"), k);
      orbColor = new THREE.Color("#fb923c");
      label = "夕陽日落";
    } else if (phase < 0.58) {
      // Dusk Twilight
      const k = (phase - 0.52) / 0.06;
      sunColor = lerpColor(new THREE.Color("#ff7b47"), new THREE.Color("#7896e0"), k);
      sunIntensity = THREE.MathUtils.lerp(1.3, 0.65, k);
      hemiSky = lerpColor(new THREE.Color("#88698c"), new THREE.Color("#293452"), k);
      hemiGround = new THREE.Color("#352d3c");
      hemiIntensity = THREE.MathUtils.lerp(0.45, 0.34, k);
      bgHex = lerpColor(new THREE.Color("#3b3048"), new THREE.Color("#141926"), k);
      windowSkyHex = lerpColor(new THREE.Color("#9333ea"), new THREE.Color("#1e293b"), k);
      orbColor = new THREE.Color("#e2e8f0");
      label = "暮色黃昏";
    } else if (phase < 0.94) {
      // Cozy Night
      sunColor = new THREE.Color("#8aa8eb");
      sunIntensity = 0.62;
      hemiSky = new THREE.Color("#263352");
      hemiGround = new THREE.Color("#2a2220");
      hemiIntensity = 0.36;
      bgHex = new THREE.Color("#111622");
      windowSkyHex = new THREE.Color("#0f172a");
      orbColor = new THREE.Color("#fef9c3");
      label = "靜謐夜晚";
    } else {
      // Pre-dawn transition
      const k = (phase - 0.94) / 0.06;
      sunColor = lerpColor(new THREE.Color("#8aa8eb"), new THREE.Color("#ff8e53"), k);
      sunIntensity = THREE.MathUtils.lerp(0.65, 1.2, k);
      hemiSky = lerpColor(new THREE.Color("#263352"), new THREE.Color("#ffb88c"), k);
      hemiGround = lerpColor(new THREE.Color("#2a2220"), new THREE.Color("#c99875"), k);
      hemiIntensity = THREE.MathUtils.lerp(0.36, 0.55, k);
      bgHex = lerpColor(new THREE.Color("#111622"), new THREE.Color("#e8cbb8"), k);
      windowSkyHex = lerpColor(new THREE.Color("#0f172a"), new THREE.Color("#fda4af"), k);
      orbColor = new THREE.Color("#fde047");
      label = "黎明微光";
    }

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    this.hemiLight.color.copy(hemiSky);
    this.hemiLight.groundColor.copy(hemiGround);
    this.hemiLight.intensity = hemiIntensity;
    this.scene.background.copy(bgHex);

    if (this.windowSkyMat) this.windowSkyMat.color.copy(windowSkyHex);

    // Move key directional sun shadow across north window through the day
    const sunArc = isDay ? (phase / 0.5) * Math.PI : ((phase - 0.5) / 0.5) * Math.PI;
    this.sunLight.position.set(
      Math.cos(sunArc) * 8.5,
      5.5 + Math.sin(sunArc) * 6.5,
      -7.5
    );

    // Warm desk lamp shines brighter & cozier at sunset/night!
    if (this.deskLampLight) {
      const darknessBoost = isDay ? (phase > 0.4 ? (phase - 0.4) * 14 : 1.0) : 3.2;
      this.deskLampLight.intensity = this.deskLampOn ? 1.8 + darknessBoost : 0;
    }
    if (this.bedLampLight) {
      const lampOwned = Boolean(this.bedLampGroup?.visible);
      const bedBoost = isDay ? (phase > 0.4 ? (phase - 0.4) * 10 + 1.2 : 1.0) : 2.6;
      this.bedLampLight.intensity = (lampOwned && this.bedLampOn) ? bedBoost : 0;
    }

    // Map 0..1 phase to 24h clock starting at 06:00 sunrise
    const totalMinutes = Math.floor(((phase + 0.25) % 1.0) * 1440);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    this.onTimeUpdate({ clockText: `${hh}:${mm}`, label, isNight: !isDay });
    return !isDay;
  }

  updateCameraTransform(instant = false) {
    const targetAngle = this.targetQuarter * (Math.PI / 2) + Math.PI / 4;
    if (instant) {
      this.currentAngle = targetAngle;
    } else {
      // Shortest angular interpolation around Y
      let diff = targetAngle - this.currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.currentAngle += diff * 0.16;
    }

    const radius = 14.5;
    const camX = Math.sin(this.currentAngle) * radius;
    const camZ = Math.cos(this.currentAngle) * radius;
    this.camera.position.set(camX, 10.6, camZ);
    this.camera.lookAt(0, 0.95, 0);

    // Cutaway Auto-Invisibility: hide the 2 perimeter walls facing closest to camera
    const camDir = new THREE.Vector3(camX, 0, camZ).normalize();
    this.walls.forEach(w => {
      const facingCamera = w.normal.dot(camDir) > 0.05;
      w.upperGroup.visible = !facingCamera;
    });
  }

  resetLimbs() {
    this.charBody.position.set(0, 0, 0);
    this.charBody.rotation.set(0, 0, 0);
    this.torsoGroup.rotation.set(0, 0, 0);
    this.leftLegPivot.rotation.set(0, 0, 0);
    this.rightLegPivot.rotation.set(0, 0, 0);
    this.leftArmPivot.rotation.set(0, 0, 0);
    this.rightArmPivot.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
  }

  updateCharacter(dt, elapsedSec, isNightTime) {
    this.resetLimbs();

    if (this.charState === "WALK_TO_WORK" || this.charState === "WALK_TO_ACTIVITY") {
      const target = this.walkWaypoints[0];
      if (!target) {
        this.walkCallback?.();
        return;
      }
      const delta = target.clone().sub(this.charRoot.position);
      delta.y = 0;
      const dist = delta.length();
      const speed = this.charState === "WALK_TO_WORK" ? 7.2 : 3.2;

      if (dist <= speed * dt + 0.05) {
        this.charRoot.position.copy(target);
        this.walkWaypoints.shift();
        if (this.walkWaypoints.length === 0) {
          const cb = this.walkCallback;
          this.walkCallback = null;
          cb?.();
        }
        return;
      }

      delta.normalize();
      this.charRoot.position.addScaledVector(delta, speed * dt);
      const targetRot = Math.atan2(delta.x, delta.z);
      this.charRoot.rotation.y = targetRot;

      // Crisp bouncy jog cycle
      const swing = Math.sin(elapsedSec * 16) * 0.65;
      this.leftLegPivot.rotation.x = swing;
      this.rightLegPivot.rotation.x = -swing;
      this.leftArmPivot.rotation.x = -swing * 0.7;
      this.rightArmPivot.rotation.x = swing * 0.7;
      this.charBody.position.y = Math.abs(Math.sin(elapsedSec * 16)) * 0.07;
      return;
    }

    if (this.charState === "WORKING") {
      // Sitting in front of Mac & drawing tablet
      this.charBody.position.set(0, -0.22, -0.04);
      this.leftLegPivot.rotation.x = -Math.PI / 2.2;
      this.rightLegPivot.rotation.x = -Math.PI / 2.2;
      this.leftArmPivot.rotation.x = -0.75;
      this.rightArmPivot.rotation.x = -0.75 + Math.sin(elapsedSec * 8) * 0.12;
      this.rightArmPivot.rotation.y = Math.cos(elapsedSec * 5) * 0.14;
      this.headGroup.rotation.x = 0.08 + Math.sin(elapsedSec * 2) * 0.04;

      if (this.postWorkCooldown > 0) {
        this.postWorkCooldown -= dt;
        if (this.postWorkCooldown <= 0) {
          this.pickNextIdleActivity(isNightTime);
          return;
        }
      }
      this.thoughtCooldown -= dt;
      if (this.thoughtCooldown <= 0) {
        this.showBubble(this.pickRandomThought("work"), 4200);
        this.thoughtCooldown = 8 + Math.random() * 7;
      }
      return;
    }

    // IDLE autonomous activities
    this.activityTimer -= dt;
    if (this.activityTimer <= 0) {
      this.pickNextIdleActivity(isNightTime);
      return;
    }

    this.thoughtCooldown -= dt;
    if (this.thoughtCooldown <= 0) {
      this.showBubble(this.pickRandomThought(this.currentActivity), 4200);
      this.thoughtCooldown = 9 + Math.random() * 9;
    }

    switch (this.currentActivity) {
      case "gaming":
        this.charBody.position.set(0, -0.22, -0.04);
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.x = -0.8 + Math.sin(elapsedSec * 14) * 0.08;
        this.rightArmPivot.rotation.x = -0.8 + Math.cos(elapsedSec * 16) * 0.08;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 3.5) * 0.12;
        break;
      case "exercise": {
        // Horizontal push-ups on cozy floor rug
        const rep = (Math.sin(elapsedSec * 4.2) + 1) * 0.5;
        this.charBody.position.set(0, 0.14 + rep * 0.04, 0);
        this.charBody.rotation.x = Math.PI / 2 - (0.06 + rep * 0.18);
        this.leftArmPivot.rotation.x = -1.65 + rep * 0.28;
        this.rightArmPivot.rotation.x = -1.65 + rep * 0.28;
        this.leftArmPivot.rotation.z = -0.22;
        this.rightArmPivot.rotation.z = 0.22;
        this.headGroup.rotation.x = -0.55 - rep * 0.1;
        break;
      }
      case "sleep":
        // Lying flat & parallel along single bed (head at +Z pillow, facing ceiling)
        this.charBody.position.set(0, 0.76 + Math.sin(elapsedSec * 1.4) * 0.012, 0);
        this.charBody.rotation.x = -Math.PI / 2;
        this.leftArmPivot.rotation.z = 0.16;
        this.rightArmPivot.rotation.z = -0.16;
        this.headGroup.rotation.x = -0.14;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 1.1) * 0.06;
        break;
      case "wash":
        // Standing at sink rubbing hands gently under faucet
        this.charBody.position.set(0, 0, 0);
        this.torsoGroup.rotation.x = 0.12;
        this.leftArmPivot.rotation.x = -0.95 + Math.sin(elapsedSec * 10) * 0.12;
        this.rightArmPivot.rotation.x = -0.95 - Math.sin(elapsedSec * 10) * 0.12;
        this.leftArmPivot.rotation.z = -0.22;
        this.rightArmPivot.rotation.z = 0.22;
        this.headGroup.rotation.x = 0.22;
        break;
      case "toilet":
        // Sitting calmly on porcelain toilet facing +Z
        this.charBody.position.set(0, -0.05, 0);
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.x = -0.52;
        this.rightArmPivot.rotation.x = -0.52;
        this.headGroup.rotation.x = 0.12 + Math.sin(elapsedSec * 1.3) * 0.04;
        break;
      case "read":
        this.bookProp.visible = true;
        this.leftArmPivot.rotation.x = -0.65;
        this.rightArmPivot.rotation.x = -0.7;
        this.headGroup.rotation.x = 0.35 + Math.sin(elapsedSec * 1.5) * 0.04;
        break;
      case "eat":
        this.snackProp.visible = true;
        this.rightArmPivot.rotation.x = -0.85 + Math.max(0, Math.sin(elapsedSec * 3.2)) * -0.45;
        this.headGroup.rotation.x = 0.15;
        break;
      case "phone":
      default:
        // Sitting on the edge of the bed holding phone tilted up toward face
        this.phoneProp.visible = true;
        this.charBody.position.set(0, 0.14, 0);
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.x = -0.58;
        this.leftArmPivot.rotation.z = -0.18;
        this.rightArmPivot.rotation.x = -1.18;
        this.rightArmPivot.rotation.y = -0.15;
        this.rightArmPivot.rotation.z = 0.25;
        this.headGroup.rotation.x = 0.26 + Math.sin(elapsedSec * 2) * 0.03;
        break;
    }
  }

  updateOverlayPositions() {
    if (!this.charRoot || !this.nameTagEl) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 560;

    const headWorld = new THREE.Vector3();
    this.headGroup.getWorldPosition(headWorld);
    headWorld.y += 0.56;
    headWorld.project(this.camera);

    const x = (headWorld.x * 0.5 + 0.5) * width;
    const y = (-headWorld.y * 0.5 + 0.5) * height;
    this.nameTagEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;

    if (this.bubbleEl && !this.bubbleEl.classList.contains("hidden")) {
      this.bubbleEl.style.transform = `translate(${x}px, ${y - 30}px) translate(-50%, -100%)`;
    }
  }

  bindEvents() {
    const dom = this.renderer.domElement;

    this.onPointerMove = (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.allInteractTargets, false);
      const visibleHit = hits.find(h => {
        let obj = h.object;
        while (obj) {
          if (!obj.visible) return false;
          obj = obj.parent;
        }
        return true;
      });
      if (visibleHit) {
        const type = visibleHit.object.userData.interactType;
        this.hoveredTarget = type;
        dom.style.cursor = "pointer";
        if (type === "lamp") {
          this.onHoverChange("點擊開關檯燈");
        } else if (type === "bedLamp") {
          this.onHoverChange("點擊開關床邊小夜燈");
        } else if (type === "computer") {
          this.onHoverChange("點擊電腦／電繪板開始接案學習");
        } else {
          // Silent discovery for bed / sink / toilet (no action spoiler text)
          this.onHoverChange("");
        }
        return;
      }

      if (this.hoveredTarget !== null) {
        this.hoveredTarget = null;
        dom.style.cursor = "default";
        this.onHoverChange("");
      }
    };

    this.onClick = (e) => {
      this.onPointerMove(e);
      if (this.hoveredTarget === "lamp") {
        this.setDeskLamp(!this.deskLampOn);
        this.onLampToggle(this.deskLampOn);
      } else if (this.hoveredTarget === "bedLamp") {
        this.setBedLamp(!this.bedLampOn);
        this.onBedLampToggle(this.bedLampOn);
      } else if (this.hoveredTarget === "computer") {
        this.goToWork();
      } else if (this.hoveredTarget === "bed") {
        const sleepSpot = this.chillSpots.find(s => s.id === "sleep");
        this.commandActivity(sleepSpot, COMMANDED_SLEEP_SEC);
      } else if (this.hoveredTarget === "sink") {
        this.commandActivity(this.actionSpots.wash, COMMANDED_WASH_SEC);
      } else if (this.hoveredTarget === "toilet") {
        this.commandActivity(this.actionSpots.toilet, COMMANDED_TOILET_SEC);
      }
    };

    this.onResize = () => {
      if (this.disposed) return;
      const w = Math.max(320, this.container.clientWidth || 800);
      const h = Math.max(320, this.container.clientHeight || 560);
      const aspect = w / h;
      this.camera.left = -this.baseViewSize * aspect;
      this.camera.right = this.baseViewSize * aspect;
      this.camera.top = this.baseViewSize;
      this.camera.bottom = -this.baseViewSize;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    this.onPointerLeave = () => {
      if (this.hoveredTarget !== null) {
        this.hoveredTarget = null;
        dom.style.cursor = "default";
        this.onHoverChange("");
      }
    };

    dom.addEventListener("pointermove", this.onPointerMove);
    dom.addEventListener("pointerleave", this.onPointerLeave);
    dom.addEventListener("click", this.onClick);
    window.addEventListener("resize", this.onResize);
  }

  pause() {
    this.paused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  resume() {
    if (this.disposed) return;
    const wasPaused = this.paused;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.onResize();
    if (wasPaused || !this.animFrameId) {
      this.animate();
    }
  }

  updateInteractGlow() {
    const hoverColorHex = 0xffe2a8;
    for (const mesh of this.allInteractTargets) {
      const mat = mesh.material;
      if (!mat || !("emissive" in mat) || mat === this.lampBulbMat || mat === this.bedLampBulbMat) continue;
      const isHovered = Boolean(this.hoveredTarget && mesh.userData.interactType === this.hoveredTarget);
      const targetGlow = isHovered ? 1 : 0;
      const prevGlow = mesh.userData.hoverGlow || 0;
      const nextGlow = prevGlow + (targetGlow - prevGlow) * 0.22;
      mesh.userData.hoverGlow = nextGlow < 0.004 && !isHovered ? 0 : nextGlow;

      const baseEmissive = mesh.userData.baseEmissive;
      const baseIntensity = mesh.userData.baseEmissiveIntensity ?? 1;
      const g = mesh.userData.hoverGlow;

      if (g <= 0) {
        if (baseEmissive) mat.emissive.copy(baseEmissive);
        mat.emissiveIntensity = baseIntensity;
      } else {
        const hasBaseEmissive = baseEmissive && (baseEmissive.r + baseEmissive.g + baseEmissive.b) > 0.001;
        if (hasBaseEmissive) {
          mat.emissive.copy(baseEmissive).lerp(new THREE.Color(hoverColorHex), g * 0.45);
          mat.emissiveIntensity = THREE.MathUtils.lerp(baseIntensity, Math.max(baseIntensity, 0.2), g);
        } else {
          mat.emissive.setHex(hoverColorHex);
          mat.emissiveIntensity = g * 0.11;
        }
      }
    }
  }

  animate = () => {
    if (this.disposed || this.paused) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    const elapsedSec = now / 1000;

    const isNight = this.updateDayNightLighting();
    this.updateCameraTransform(false);
    this.updateCharacter(dt, elapsedSec, isNight);
    this.updateInteractGlow();

    // Subtle hover-only highlight ring under desk setup
    if (this.workHoverRingMat) {
      const targetOpacity = this.hoveredTarget === "computer" ? 0.36 : 0;
      this.workHoverRingMat.opacity += (targetOpacity - this.workHoverRingMat.opacity) * 0.18;
    }

    this.renderer.render(this.scene, this.camera);
    this.updateOverlayPositions();
  };

  dispose() {
    this.disposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener("pointermove", this.onPointerMove);
      dom.removeEventListener("pointerleave", this.onPointerLeave);
      dom.removeEventListener("click", this.onClick);
    }
    window.removeEventListener("resize", this.onResize);
    clearTimeout(this.bubbleTimer);
    this.renderer?.dispose();
  }
}
