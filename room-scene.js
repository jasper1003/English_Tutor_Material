import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { bi, isEn } from "./i18n.js?v=20261123g";
import {
  DEFAULT_FLOOR_STYLE,
  DEFAULT_DESK_STYLE,
  DEFAULT_BED_SHEET,
  DEFAULT_RUG_STYLE,
  DEFAULT_SHIRT_STYLE,
  DEFAULT_PANTS_STYLE,
  resolveFloorStyle,
  resolveDeskStyle,
  resolveBedSheetStyle,
  resolveRugStyle,
  resolveShirtStyle,
  resolvePantsStyle
} from "./shop-catalog.js?v=20261123g";
import {
  sampleDayNightCycle,
  buildCharacterPersona,
  pickPersonaWeightedActivity,
  createSeededRng
} from "./app-helpers.js?v=20261123g";
import {
  GRID_STEP,
  GRID_CELLS,
  WALL_NAMES,
  PLACEABLE_FURNITURE_META,
  DEFAULT_FURNITURE_LAYOUT,
  getPlaceableFurnitureName,
  getCompanionPlaceableIds,
  isFloorCellReserved,
  isWallCellReserved,
  canPlaceFloorItem,
  canPlaceWallItem,
  findFirstValidPlacement,
  resolveEffectiveLayout,
  normalizePendingParcels,
  floorPlacementToWorld,
  wallPlacementToLocal,
  getFloorFootprintWorldBox,
  getRotatedDims
} from "./room-grid.js?v=20261123g";

const DAY_CYCLE_MS = 30 * 60 * 1000; // Real 30 minutes = 24 game hours (15 min day + 15 min night)
const POST_WORK_COOLDOWN_SEC = 13;
const IDLE_MIN_SEC = 105; // ~2 minutes calm autonomous activity duration
const IDLE_SPAN_SEC = 35;
const COMMANDED_SLEEP_SEC = 300;  // 5 minutes sleep when clicked
const COMMANDED_WASH_SEC = 10;    // 10 seconds hand wash
const COMMANDED_TOILET_SEC = 15;  // 15 seconds toilet use

// Per-activity English thought library aligned with the student's Google Sheet curriculum (>= 6 lines each)
export const THOUGHT_BANK = {
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
  ],
  sofa_read: [
    "This soft sofa is the best choice I made!",
    "Reading on the sofa feels so peaceful.",
    "Let me take it easy with a good book.",
    "Such a simple and relaxing afternoon.",
    "I really admire the story in this book!",
    "Time flies when I explore a new story."
  ],
  watch_tv: [
    "Ooh, what is on this channel right now?",
    "Buying this TV was worth every penny!",
    "This video is so bright and interesting!",
    "Wait, let me take a closer look at that!",
    "Next goal: save up for a soft sofa too!",
    "Fun shows help me cool down after work."
  ],
  sofa_tv: [
    "TV plus a soft sofa? Best combo ever!",
    "Time to take it easy and enjoy a video!",
    "This show is actually pretty exciting.",
    "Lying back after finishing a project feels great!",
    "Nothing beats relaxing right here at home.",
    "Let's discover something cool to watch next."
  ],
  water_plant: [
    "Grow strong and green, little plant!",
    "Remember to water my desk plant regularly.",
    "Plants always make my desk look bright!",
    "A little water goes a long way.",
    "Look! Fresh green leaves make me smile.",
    "Taking care of green things feels peaceful."
  ],
  admire_poster: [
    "I really admire the warm colors here!",
    "That art print makes the whole wall better.",
    "Great framing—it gives me a good idea!",
    "Art on the wall feels just like a gallery.",
    "Simple shapes, yet so unique and bright!",
    "Okay, I feel inspired to draw again!"
  ],
  check_coat: [
    "Gotta grab my tote bag before going out.",
    "This knit scarf feels super soft today.",
    "Where did I put my favorite cap? Oh, right here!",
    "Everything by the door is neat and ready.",
    "Maybe I'll take a short walk outside later.",
    "A tidy coat rack saves so much time!"
  ],
  coffee_break: [
    "Nothing beats fresh pour-over coffee!",
    "Ooh, that dark roast aroma is heavenly.",
    "One warm cup of coffee wakes up my creativity.",
    "I'll take it easy and sip slowly first.",
    "Careful, the gooseneck kettle is still hot!",
    "Coffee time means fresh ideas are coming!"
  ],
  listen_vinyl: [
    "This warm vinyl crackle sounds amazing!",
    "Nothing like classic jazz while taking a break.",
    "Music always puts me in a better mood.",
    "Should I flip this record to side B next?",
    "Warm bass and lo-fi beats fill the studio!",
    "Listening to records helps me slow down."
  ],
  pet_cat: [
    "Aww, such a fluffy orange purr machine!",
    "Who's the sweetest studio assistant? You are!",
    "Look at those tiny paws—my heart is melting!",
    "Giving chin scratches makes me so happy.",
    "Taking a break to pet the cat is essential.",
    "Purring right next to me is pure magic!"
  ],
  watch_hamster: [
    "Look at Mochi sprinting on that tiny wooden wheel!",
    "Tiny cheeks full of sunflower seeds—so cute!",
    "Keep running, little hamster! Faster than my deadline!",
    "Having a hamster right beside my desk boosts my mood.",
    "Careful not to tumble off the wheel, little puffball!",
    "Wait—did you just stash another seed in the corner?"
  ],
  water_floor_plant: [
    "Big shiny leaves make the room feel alive!",
    "Let's wipe the dust off these green leaves.",
    "Growing taller every week, little fiddle fig!",
    "Plants really brighten up this bedroom corner.",
    "A sip of water and plenty of sunlight for you.",
    "Caring for indoor plants feels so peaceful."
  ],
  smart_toilet: [
    "Whoa, a heated toilet seat feels like heaven!",
    "This smart bidet was worth every single clam!",
    "Warm water and cozy seat—so high-tech!",
    "That glowing nightlight inside the bath is neat!",
    "Upgrade complete: total five-star comfort!",
    "Clean, warm, and surprisingly relaxing!"
  ],
  floor_stand: [
    "Nice angle to look around my studio!",
    "I really like how cozy this room feels.",
    "Hmm, what should I upgrade in this corner next?",
    "Taking a short stroll helps refresh my mind!",
    "Plenty of open floor space right here.",
    "Walking around the room gives me fresh ideas!"
  ],
  rent_urgent: [
    "Rent is due soon! Back to the MacBook! 💸",
    "Landlord is waiting... time to finish a case!",
    "Uh oh—need more clams before rent day! 🥺",
    "Less daydreaming, more drawing! Rent waits for nobody!",
    "Gotta grind one more English unit to cover rent!"
  ],
  rent_paid: [
    "Rent paid! That weight off my shoulders feels amazing!",
    "Safe for another month! Time to celebrate at home! 🎉",
    "Landlord is happy, and this cozy studio is still mine!",
    "Paid on time—now extra clams go straight to new decor!",
    "Nothing beats living stress-free inside my own workspace!"
  ],
  work_celebrate: [
    "Case submitted! Time to take it easy and unwind! 🎉",
    "Boom! Another illustration quest wrapped up cleanly!",
    "Reward & XP incoming! Off-work life starts right now! ✨",
    "Time to stretch, celebrate, and enjoy my cozy room!",
    "Hard work pays off—let's relax a little!"
  ],
  dolby_atmos: [
    "Whoa!! True Dolby Atmos surround sound fills the whole room!",
    "Feel that deep bass rumble right under the cozy rug!",
    "TV + sofa + Atmos speakers = private cinema night! 🎬",
    "Crisp 3D sound coming from above and behind the sofa!",
    "Saving up for this surround setup was worth every clam!"
  ]
};

export const SKIN_TONES = [
  { id: "porcelain", label: "白皙暖調", labelEn: "Warm Fair", hex: "#f9dcc4" },
  { id: "peach", label: "自然杏桃", labelEn: "Natural Peach", hex: "#f1c29b" },
  { id: "honey", label: "小麥暖棕", labelEn: "Warm Honey", hex: "#d99b66" },
  { id: "caramel", label: "焦糖健康", labelEn: "Caramel Tan", hex: "#a96e44" },
  { id: "espresso", label: "深栗棕", labelEn: "Deep Espresso", hex: "#6f442a" }
];

export const BODY_BUILDS = [
  { id: "slim", label: "修長輕盈", labelEn: "Slim", hint: "肩線較窄、身形修長", hintEn: "Narrower shoulders, slender frame" },
  { id: "balanced", label: "勻稱標準", labelEn: "Balanced", hint: "肩腰比例自然均衡", hintEn: "Natural balanced proportions" },
  { id: "athletic", label: "結實寬肩", labelEn: "Athletic", hint: "肩背較厚實、線條立體", hintEn: "Broader shoulders, defined build" }
];

export const HAIR_STYLES = [
  { id: "short", label: "俐落短髮", labelEn: "Neat Short" },
  { id: "parted", label: "微卷旁分", labelEn: "Soft Side Part" },
  { id: "bob", label: "圓潤齊短髮", labelEn: "Classic Bob" },
  { id: "bun", label: "丸子紮髮", labelEn: "Top Bun" },
  { id: "long", label: "及肩長髮", labelEn: "Shoulder-Length" },
  { id: "ponytail", label: "元氣高馬尾", labelEn: "High Ponytail" },
  { id: "wolf", label: "層次狼尾剪", labelEn: "Layered Wolf Cut" },
  { id: "curly", label: "蓬鬆捲髮", labelEn: "Fluffy Curls" },
  { id: "undercut", label: "率性背梳", labelEn: "Slick Undercut" }
];

export const HAIR_COLORS = [
  { id: "ink", label: "墨黑", labelEn: "Jet Black", hex: "#1f2430" },
  { id: "espresso", label: "深棕", labelEn: "Dark Brown", hex: "#4a3225" },
  { id: "caramel", label: "奶茶棕", labelEn: "Milk Tea", hex: "#8c5b3b" },
  { id: "honey", label: "亞麻金", labelEn: "Honey Blonde", hex: "#c69850" },
  { id: "ash", label: "霧灰", labelEn: "Ash Gray", hex: "#6c768a" },
  { id: "plum", label: "酒紅棕", labelEn: "Plum Brown", hex: "#6b2f3f" },
  { id: "indigo", label: "午夜藍黑", labelEn: "Midnight Indigo", hex: "#26334d" }
];

export const OUTFIT_COLORS = [
  { id: "terracotta", label: "暖陶橘", labelEn: "Terracotta", hex: "#d96b43" },
  { id: "sage", label: "鼠尾草綠", labelEn: "Sage Green", hex: "#5a8f7b" },
  { id: "cobalt", label: "靛藍", labelEn: "Cobalt Blue", hex: "#3b6fd8" },
  { id: "mustard", label: "芥末黃", labelEn: "Mustard", hex: "#d9a036" },
  { id: "charcoal", label: "炭墨灰", labelEn: "Charcoal", hex: "#384152" }
];

export const DEFAULT_AVATAR = {
  name: "",
  build: "balanced",
  skinTone: "peach",
  hairStyle: "short",
  hairColor: "ink",
  outfitColor: "terracotta",
  shirtStyle: DEFAULT_SHIRT_STYLE,
  pantsStyle: DEFAULT_PANTS_STYLE
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


function makeRefScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 160, 240);

  // Pastel Pantone swatches grid
  const swatches = ["#f4a261", "#6b9080", "#e76f51", "#38bdf8", "#a78bfa", "#f472b6"];
  swatches.forEach((c, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    ctx.fillStyle = c;
    ctx.fillRect(14 + col * 68, 18 + row * 48, 60, 38);
  });
  // Brief lines & color wheel bar
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(14, 172, 132, 48);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(22, 184, 88, 6);
  ctx.fillRect(22, 198, 110, 6);
  ctx.fillStyle = "#fb923c";
  ctx.fillRect(22, 208, 64, 5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorPatternTexture(preset) {
  if (typeof document === "undefined") return null;
  const style = preset || resolveFloorStyle(DEFAULT_FLOOR_STYLE);
  const pattern = style.pattern || "wood_plank";
  const base = style.baseColor || "#d8a774";
  const accent = style.accentColor || "#c4905c";
  const detail = style.detailColor || "#b87f4a";

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rng = createSeededRng(`floor:${style.id || pattern}`);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  if (pattern === "wood_plank") {
    const rows = 4;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (size * 0.5);
      for (let k = -1; k <= 1; k++) {
        const px = offset + k * size;
        ctx.fillStyle = base;
        ctx.globalAlpha = 1;
        ctx.fillRect(px, y, size, rowH);
        // Subtle plank shade difference
        ctx.fillStyle = rng() > 0.5 ? accent : detail;
        ctx.globalAlpha = 0.08 + rng() * 0.12;
        ctx.fillRect(px, y, size, rowH);
        // Fine horizontal wood grain streaks
        ctx.strokeStyle = detail;
        ctx.lineWidth = 1.6;
        for (let g = 0; g < 6; g++) {
          ctx.globalAlpha = 0.14 + rng() * 0.14;
          const gy = y + 10 + (g + rng() * 0.5) * ((rowH - 18) / 6);
          ctx.beginPath();
          ctx.moveTo(px + 8, gy);
          ctx.bezierCurveTo(px + size * 0.35, gy + (rng() - 0.5) * 6, px + size * 0.65, gy + (rng() - 0.5) * 6, px + size - 8, gy);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(px, y, size, rowH);
      }
    }
  } else if (pattern === "herringbone") {
    const w = 64;
    const l = 192;
    ctx.save();
    for (let gx = -2; gx < 12; gx++) {
      for (let gy = -2; gy < 12; gy++) {
        const cx = gx * w + (gy % 2) * (w * 0.5);
        const cy = gy * w;
        const horizontal = (gx + gy) % 2 === 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(horizontal ? Math.PI / 4 : -Math.PI / 4);
        ctx.fillStyle = base;
        ctx.globalAlpha = 1;
        ctx.fillRect(-l * 0.5, -w * 0.5, l, w);
        ctx.fillStyle = (gx + gy) % 3 === 0 ? accent : detail;
        ctx.globalAlpha = 0.18 + rng() * 0.16;
        ctx.fillRect(-l * 0.5, -w * 0.5, l, w);
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.2;
        ctx.strokeRect(-l * 0.5, -w * 0.5, l, w);
        ctx.restore();
      }
    }
    ctx.restore();
  } else if (pattern === "tatami") {
    const mats = [
      { x: 0, y: 0, w: size * 0.5, h: size, vertical: true },
      { x: size * 0.5, y: 0, w: size * 0.5, h: size * 0.5, vertical: false },
      { x: size * 0.5, y: size * 0.5, w: size * 0.5, h: size * 0.5, vertical: false }
    ];
    mats.forEach((m, idx) => {
      ctx.fillStyle = base;
      ctx.globalAlpha = 1;
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.fillStyle = detail;
      ctx.globalAlpha = idx === 1 ? 0.14 : 0.06;
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.strokeStyle = detail;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.34;
      const step = 6;
      if (m.vertical) {
        for (let yy = m.y + 4; yy < m.y + m.h - 4; yy += step) {
          ctx.beginPath();
          ctx.moveTo(m.x + 12, yy);
          ctx.lineTo(m.x + m.w - 12, yy);
          ctx.stroke();
        }
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(m.x, m.y, 12, m.h);
        ctx.fillRect(m.x + m.w - 12, m.y, 12, m.h);
      } else {
        for (let xx = m.x + 4; xx < m.x + m.w - 4; xx += step) {
          ctx.beginPath();
          ctx.moveTo(xx, m.y + 12);
          ctx.lineTo(xx, m.y + m.h - 12);
          ctx.stroke();
        }
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(m.x, m.y, m.w, 12);
        ctx.fillRect(m.x, m.y + m.h - 12, m.w, 12);
      }
      ctx.strokeStyle = "#334155";
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.strokeRect(m.x, m.y, m.w, m.h);
    });
  } else if (pattern === "marble") {
    // Large square marble slabs with organic veining
    const tile = size / 2;
    for (let v = 0; v < 9; v++) {
      const startX = rng() * size;
      const startY = rng() * size;
      ctx.strokeStyle = v % 2 === 0 ? accent : detail;
      ctx.lineWidth = v % 3 === 0 ? 3.2 : 1.5;
      ctx.globalAlpha = v % 3 === 0 ? 0.48 : 0.3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX;
      let cy = startY;
      for (let s = 0; s < 5; s++) {
        const nx = cx + 45 + rng() * 65;
        const ny = cy + (rng() - 0.5) * 90;
        ctx.quadraticCurveTo(cx + 25, cy + (rng() - 0.5) * 45, nx, ny);
        cx = nx;
        cy = ny;
      }
      ctx.stroke();
    }
    ctx.strokeStyle = detail;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2.5;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.strokeRect(c * tile, r * tile, tile, tile);
      }
    }
  } else if (pattern === "terrazzo") {
    const chipColors = [accent, detail, "#e6b86a", "#8d99ae", "#d8c7b2"];
    for (let i = 0; i < 190; i++) {
      const cx = rng() * size;
      const cy = rng() * size;
      const rad = 5 + rng() * 14;
      const sides = 3 + Math.floor(rng() * 4);
      ctx.fillStyle = chipColors[Math.floor(rng() * chipColors.length)];
      ctx.globalAlpha = 0.65 + rng() * 0.28;
      ctx.beginPath();
      for (let k = 0; k < sides; k++) {
        const ang = (k / sides) * Math.PI * 2 + rng() * 0.45;
        const rr = rad * (0.55 + rng() * 0.55);
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = detail;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  } else if (pattern === "slate") {
    const rows = 4;
    const cols = 2;
    const cellW = size / cols;
    const cellH = size / rows;
    for (let r = 0; r < rows; r++) {
      const shift = (r % 2) * (cellW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cellW + shift;
        const y = r * cellH;
        ctx.fillStyle = base;
        ctx.globalAlpha = 1;
        ctx.fillRect(x, y, cellW, cellH);
        ctx.fillStyle = rng() > 0.5 ? accent : detail;
        ctx.globalAlpha = 0.14 + rng() * 0.2;
        ctx.fillRect(x, y, cellW, cellH);
        // Subtle mineral texture flecks
        ctx.fillStyle = detail;
        for (let m = 0; m < 10; m++) {
          ctx.globalAlpha = 0.08 + rng() * 0.12;
          ctx.fillRect(x + rng() * (cellW - 14), y + rng() * (cellH - 8), 8 + rng() * 24, 3 + rng() * 6);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 3.2;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
  } else if (pattern === "checker") {
    const cells = 4;
    const cell = size / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? base : accent;
        ctx.globalAlpha = 1;
        ctx.fillRect(c * cell, r * cell, cell, cell);
        ctx.strokeStyle = detail;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(c * cell, r * cell, cell, cell);
      }
    }
  } else if (pattern === "hexagon") {
    ctx.fillStyle = detail;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, size, size);
    const radius = 44;
    const dx = Math.sqrt(3) * radius;
    const dy = 1.5 * radius;
    for (let row = -1; row < 10; row++) {
      for (let col = -1; col < 10; col++) {
        const cx = col * dx + (row % 2 ? dx * 0.5 : 0);
        const cy = row * dy;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i + Math.PI / 6;
          const px = cx + Math.cos(ang) * (radius - 2.6);
          const py = cy + Math.sin(ang) * (radius - 2.6);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = ((row + col) % 3 === 0) ? accent : base;
        ctx.globalAlpha = 0.92 + (rng() - 0.5) * 0.1;
        ctx.fill();
      }
    }
  } else if (pattern === "moroccan") {
    const cells = 2;
    const cell = size / cells;
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const cx = c * cell + cell * 0.5;
        const cy = r * cell + cell * 0.5;
        ctx.fillStyle = base;
        ctx.globalAlpha = 1;
        ctx.fillRect(c * cell, r * cell, cell, cell);
        // 8-point Moroccan geometric star medallion
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = detail;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-cell * 0.25, -cell * 0.25, cell * 0.5, cell * 0.5);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(-cell * 0.24, -cell * 0.24, cell * 0.48, cell * 0.48);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(0, 0, cell * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, cell * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Corner diamonds connecting tiles
        ctx.strokeStyle = detail;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 3;
        ctx.strokeRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  const rep = pattern === "marble" ? 3 : pattern === "tatami" ? 3 : 4;
  tex.repeat.set(rep, rep);
  tex.needsUpdate = true;
  return tex;
}

function createDeskTopTexture(preset) {
  if (typeof document === "undefined") return null;
  const style = preset || resolveDeskStyle(DEFAULT_DESK_STYLE);
  if (!style || style.id === DEFAULT_DESK_STYLE) return null;
  const pattern = style.pattern || "wood";
  const base = style.topColor || "#cfa072";
  const grain = style.grainColor || "#bc8b5b";
  const detail = style.detailColor || "#d9b084";

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rng = createSeededRng(`desk:${style.id}`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  if (pattern === "wood") {
    ctx.strokeStyle = grain;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 28; i++) {
      ctx.globalAlpha = 0.14 + rng() * 0.16;
      const y = (i / 28) * size + (rng() - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.35, y + (rng() - 0.5) * 10, size * 0.7, y + (rng() - 0.5) * 10, size, y);
      ctx.stroke();
    }
    ctx.strokeStyle = detail;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = 0.12 + rng() * 0.1;
      const y = rng() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (rng() - 0.5) * 4);
      ctx.stroke();
    }
  } else if (pattern === "marble") {
    for (let v = 0; v < 7; v++) {
      const startX = rng() * size;
      const startY = rng() * size;
      ctx.strokeStyle = v % 2 === 0 ? grain : detail;
      ctx.lineWidth = v % 3 === 0 ? 2.4 : 1.2;
      ctx.globalAlpha = v % 3 === 0 ? 0.52 : 0.34;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX;
      let cy = startY;
      for (let s = 0; s < 4; s++) {
        const nx = cx + 32 + rng() * 44;
        const ny = cy + (rng() - 0.5) * 52;
        ctx.quadraticCurveTo(cx + 18, cy + (rng() - 0.5) * 28, nx, ny);
        cx = nx;
        cy = ny;
      }
      ctx.stroke();
    }
  } else if (pattern === "terrazzo") {
    const chipColors = [grain, detail, "#e9c46a", "#8d99ae", "#f4f1ea"];
    for (let i = 0; i < 85; i++) {
      const cx = rng() * size;
      const cy = rng() * size;
      const rad = 3 + rng() * 7;
      const sides = 3 + Math.floor(rng() * 3);
      ctx.fillStyle = chipColors[Math.floor(rng() * chipColors.length)];
      ctx.globalAlpha = 0.62 + rng() * 0.3;
      ctx.beginPath();
      for (let k = 0; k < sides; k++) {
        const ang = (k / sides) * Math.PI * 2 + rng() * 0.5;
        const rr = rad * (0.6 + rng() * 0.5);
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (pattern === "brushed") {
    for (let y = 0; y < size; y += 2) {
      ctx.strokeStyle = rng() > 0.5 ? grain : detail;
      ctx.globalAlpha = 0.1 + rng() * 0.14;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (pattern === "matte") {
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 2 === 0 ? grain : detail;
      ctx.globalAlpha = 0.06 + rng() * 0.08;
      ctx.fillRect(rng() * size, rng() * size, 2 + rng() * 4, 1 + rng() * 2);
    }
  }

  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  return tex;
}

function headRadiusAlongDir(dx, dy, dz) {
  // Exact ray distance to RoundedBoxGeometry(0.46, 0.44, 0.44, 6, 0.17)
  let lo = 0.16;
  let hi = 0.32;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) * 0.5;
    const qx = Math.max(Math.abs(mid * dx) - 0.06, 0);
    const qy = Math.max(Math.abs(mid * dy) - 0.05, 0);
    const qz = Math.max(Math.abs(mid * dz) - 0.05, 0);
    if (Math.hypot(qx, qy, qz) - 0.17 < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

/**
 * Generates a single seamless, gap-free 3D hair shell conforming smoothly around the head
 * with a clean forehead hairline, sculpted crown volume, and closed inward-tucked hem.
 */
function buildSculptedScalpGeometry({
  getAlphaMax,
  getOffset,
  getHangDrop = () => 0,
  getHangOutward = () => 0
}) {
  const U = 56;
  const V_SKULL = 18;
  const V_HANG = 8;
  const V_CAP = V_SKULL + V_HANG;
  const V_TOTAL = V_CAP + 2; // 2 inward-tuck rings for solid closed hem rim
  const cols = U + 1;

  const positions = new Float32Array(cols * (V_TOTAL + 1) * 3);
  const uvs = new Float32Array(cols * (V_TOTAL + 1) * 2);
  const indices = [];

  for (let i = 0; i <= U; i++) {
    const u = i / U;
    const theta = u * Math.PI * 2;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    const alphaMax = getAlphaMax(theta, sinT, cosT);
    const hangDrop = Math.max(0, getHangDrop(theta, sinT, cosT));
    const hangOutward = getHangOutward(theta, sinT, cosT);

    // Compute anchor point at the bottom of the skull wrap (v = V_SKULL)
    const sa = Math.sin(alphaMax);
    const ca = Math.cos(alphaMax);
    const adx = sa * sinT;
    const ady = ca;
    const adz = sa * cosT;
    const rAnchor = headRadiusAlongDir(adx, ady, adz) + getOffset(theta, alphaMax, 1, sinT, cosT);
    const anchorX = adx * rAnchor;
    const anchorY = ady * rAnchor;
    const anchorZ = adz * rAnchor;

    for (let j = 0; j <= V_TOTAL; j++) {
      let px = 0;
      let py = 0;
      let pz = 0;

      if (j <= V_SKULL) {
        const s = j / V_SKULL;
        const alpha = s * alphaMax;
        const salpha = Math.sin(alpha);
        const dx = salpha * sinT;
        const dy = Math.cos(alpha);
        const dz = salpha * cosT;
        const rBase = headRadiusAlongDir(dx, dy, dz);
        const r = rBase + getOffset(theta, alpha, s, sinT, cosT);
        px = dx * r;
        py = dy * r;
        pz = dz * r;
      } else if (j <= V_CAP) {
        const h = (j - V_SKULL) / V_HANG;
        // Soft natural bell/curtain curve while draping downward
        const curveOut = Math.sin(h * Math.PI * 0.72) * hangOutward;
        const taper = 1 - Math.pow(h, 2.2) * (hangDrop > 0.18 ? 0.08 : 0.04);
        px = (anchorX + sinT * curveOut) * taper;
        py = anchorY - h * hangDrop;
        pz = anchorZ + cosT * curveOut;
      } else {
        // Inward-tucked closed bottom lip (zero hollow seams from below)
        const rimStep = (j - V_CAP) / 2;
        const h = 1;
        const curveOut = Math.sin(h * Math.PI * 0.72) * hangOutward;
        const taper = 1 - (hangDrop > 0.18 ? 0.08 : 0.04);
        const outerX = (anchorX + sinT * curveOut) * taper;
        const outerY = anchorY - hangDrop;
        const outerZ = anchorZ + cosT * curveOut;
        const tuckScale = rimStep === 0.5 ? 0.90 : 0.78;
        px = outerX * tuckScale;
        py = outerY + (rimStep === 0.5 ? -0.008 : 0.012);
        pz = outerZ * tuckScale;
      }

      const vIdx = (j * cols + i);
      positions[vIdx * 3] = px;
      positions[vIdx * 3 + 1] = py;
      positions[vIdx * 3 + 2] = pz;
      uvs[vIdx * 2] = u;
      uvs[vIdx * 2 + 1] = j / V_TOTAL;
    }
  }

  for (let j = 0; j < V_TOTAL; j++) {
    for (let i = 0; i < U; i++) {
      const a = j * cols + i;
      const b = (j + 1) * cols + i;
      const c = (j + 1) * cols + (i + 1);
      const d = j * cols + (i + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Blend seam vertex normals between i=0 and i=U so shading is 100% seamless across theta=0
  const norm = geo.attributes.normal;
  for (let j = 0; j <= V_TOTAL; j++) {
    const i0 = j * cols;
    const iU = j * cols + U;
    const nx = norm.getX(i0) + norm.getX(iU);
    const ny = norm.getY(i0) + norm.getY(iU);
    const nz = norm.getZ(i0) + norm.getZ(iU);
    const len = Math.hypot(nx, ny, nz) || 1;
    norm.setXYZ(i0, nx / len, ny / len, nz / len);
    norm.setXYZ(iU, nx / len, ny / len, nz / len);
  }
  norm.needsUpdate = true;
  return geo;
}

const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function buildCharacterHairGroup(style, hairMat, accentMat) {
  const hair = new THREE.Group();
  const addShadowed = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    hair.add(mesh);
    return mesh;
  };
  const addScalpMesh = (spec) => addShadowed(new THREE.Mesh(buildSculptedScalpGeometry(spec), hairMat));
  const addLock = (r, len, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 10, 14), hairMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    return addShadowed(m);
  };
  const addPuff = (r, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), hairMat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    return addShadowed(m);
  };

  if (style === "bob") {
    // Seamless silky chin-length rounded bob with full brow-skimming straight bangs (齊瀏海)
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.15, 0.52, cosT);
        const sideToBack = 0.585 * Math.PI;
        // Full straight bangs curving smoothly just above the eyebrows (y ~ +0.068), tapering seamlessly at temples
        const frontBang = 0.408 * Math.PI - Math.pow(sinT, 4) * 0.012;
        return THREE.MathUtils.lerp(sideToBack, frontBang, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        const crownPlump = Math.sin(s * Math.PI * 0.85) * 0.018;
        const bangLoft = smoothstep(0.25, 0.9, cosT) * Math.sin(s * Math.PI * 0.9) * 0.014;
        const sideFullness = (1 - smoothstep(0.3, 0.85, cosT)) * 0.016 * Math.pow(s, 0.7);
        return 0.022 + crownPlump + bangLoft + sideFullness;
      },
      getHangDrop: (t, sinT, cosT) => {
        const mask = 1 - smoothstep(-0.08, 0.52, cosT);
        return mask * 0.118;
      },
      getHangOutward: (t, sinT, cosT) => {
        const mask = 1 - smoothstep(-0.08, 0.52, cosT);
        return mask * 0.024;
      }
    });
  } else if (style === "parted") {
    // Natural 7:3 diagonal side-parted crop with sculptural sweeping wave
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.2, 0.7, cosT);
        // Smooth asymmetric 7:3 wave sweeping over forehead from left part to right brow
        const sweep = smoothstep(-0.35, 0.55, sinT);
        const partWave = THREE.MathUtils.lerp(0.325 * Math.PI, 0.415 * Math.PI, sweep) - Math.pow(Math.max(0, Math.abs(sinT) - 0.65), 2) * 0.08;
        const sideEarNotch = Math.exp(-Math.pow((cosT + 0.05) / 0.32, 2)) * 0.065 * Math.abs(sinT);
        const backNape = 0.63 * Math.PI - sideEarNotch;
        return THREE.MathUtils.lerp(backNape, partWave, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        const sweepVol = (cosT > 0 ? smoothstep(-0.3, 0.6, sinT) * 0.020 : 0) * Math.sin(s * Math.PI * 0.92);
        return 0.022 + Math.sin(s * Math.PI * 0.82) * 0.016 + sweepVol;
      }
    });
  } else if (style === "bun") {
    // Pulled-up artist top bun + soft hairline & temple wisps + scrunchy
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.25, 0.65, cosT);
        const sideEarNotch = Math.exp(-Math.pow((cosT + 0.04) / 0.34, 2)) * 0.075 * Math.abs(sinT);
        const curtainArch = 0.338 * Math.PI + (1 - Math.cos(sinT * 2.2)) * 0.022;
        const backLine = 0.59 * Math.PI - sideEarNotch;
        return THREE.MathUtils.lerp(backLine, curtainArch, frontMask);
      },
      getOffset: (t, alpha, s) => 0.020 + Math.sin(s * Math.PI) * 0.010
    });
    // High tousled bun seated cleanly into crown + scrunchy
    addPuff(0.125, 0, 0.292, -0.105, 1.08, 0.94, 1.04);
    addPuff(0.068, -0.055, 0.278, -0.128);
    addPuff(0.066, 0.058, 0.285, -0.088);
    const scrunchy = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.022, 12, 24), accentMat);
    scrunchy.position.set(0, 0.228, -0.094);
    scrunchy.rotation.x = Math.PI / 2 - 0.35;
    hair.add(scrunchy);
  } else if (style === "long") {
    // Silky flowing long hair with soft center-parted curtain bangs
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.15, 0.65, cosT);
        // Gentle center-parted curtain fringe framing temples cleanly above brows
        const centerPart = 0.332 * Math.PI + smoothstep(0.05, 0.65, Math.abs(sinT)) * 0.068;
        const backSides = 0.57 * Math.PI;
        return THREE.MathUtils.lerp(backSides, centerPart, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        const curtainLoft = smoothstep(0.2, 0.85, cosT) * Math.sin(s * Math.PI) * 0.012;
        const sideVolume = (1 - smoothstep(0.25, 0.8, cosT)) * 0.016 * Math.pow(s, 0.7);
        return 0.022 + Math.sin(s * Math.PI * 0.85) * 0.015 + curtainLoft + sideVolume;
      },
      getHangDrop: (t, sinT, cosT) => {
        const backDrop = (1 - smoothstep(-0.4, 0.22, cosT)) * 0.34;
        const sideDrop = (1 - smoothstep(-0.1, 0.52, cosT)) * 0.14;
        return Math.max(backDrop, sideDrop);
      },
      getHangOutward: (t, sinT, cosT) => {
        const mask = 1 - smoothstep(-0.1, 0.5, cosT);
        return mask * 0.024;
      }
    });
  } else if (style === "ponytail") {
    // Sleek pulled-back crown + lively curved high ponytail
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.25, 0.65, cosT);
        const sideEarNotch = Math.exp(-Math.pow((cosT + 0.04) / 0.34, 2)) * 0.075 * Math.abs(sinT);
        const frontLine = 0.342 * Math.PI + smoothstep(0.1, 0.6, Math.abs(sinT)) * 0.022;
        const backLine = 0.60 * Math.PI - sideEarNotch;
        return THREE.MathUtils.lerp(backLine, frontLine, frontMask);
      },
      getOffset: (t, alpha, s) => 0.020 + Math.sin(s * Math.PI) * 0.010
    });
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.018, 10, 20), accentMat);
    tie.position.set(0, 0.125, -0.238);
    tie.rotation.x = 0.48;
    hair.add(tie);
    addLock(0.074, 0.14, 0, 0.092, -0.292, -0.68, 0, 0);
    addLock(0.064, 0.22, 0, -0.078, -0.342, -0.18, 0, 0);
    addLock(0.040, 0.10, 0, -0.232, -0.348, 0.15, 0, 0);
  } else if (style === "wolf") {
    // Trendy feathered wolf cut: tousled crown, curtain bangs & flared collar-length back tail
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.18, 0.68, cosT);
        const bangCurtain = 0.355 * Math.PI + smoothstep(0.05, 0.58, Math.abs(sinT)) * 0.055;
        const sideEarNotch = Math.exp(-Math.pow((cosT - 0.1) / 0.32, 2)) * 0.045 * Math.abs(sinT);
        return THREE.MathUtils.lerp(0.58 * Math.PI - sideEarNotch, bangCurtain, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        const bangLoft = smoothstep(0.25, 0.85, cosT) * Math.sin(s * Math.PI) * 0.015;
        return 0.024 + Math.sin(s * Math.PI * 0.85) * 0.018 + bangLoft;
      },
      getHangDrop: (t, sinT, cosT) => {
        const backMask = 1 - smoothstep(-0.35, 0.2, cosT);
        return backMask * 0.18;
      },
      getHangOutward: (t, sinT, cosT) => {
        const backMask = 1 - smoothstep(-0.35, 0.2, cosT);
        return backMask * 0.044;
      }
    });
  } else if (style === "curly") {
    // Seamless curly base cap + sculpted fluffy curl cluster cleanly framing upper forehead
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.2, 0.68, cosT);
        const frontLine = 0.345 * Math.PI;
        const backLine = 0.62 * Math.PI;
        return THREE.MathUtils.lerp(backLine, frontLine, frontMask);
      },
      getOffset: (t, alpha, s) => 0.022 + Math.sin(s * Math.PI) * 0.014
    });
    const curlCoords = [
      // Top crown puffs
      [0, 0.258, 0.01, 0.110], [-0.11, 0.238, 0.02, 0.100], [0.11, 0.238, 0.02, 0.100],
      [-0.08, 0.246, -0.11, 0.108], [0.08, 0.246, -0.11, 0.108],
      // Soft curly fringe framing forehead just above eyebrows
      [-0.148, 0.148, 0.145, 0.082], [-0.062, 0.165, 0.172, 0.088], [0, 0.170, 0.178, 0.090],
      [0.062, 0.165, 0.172, 0.088], [0.148, 0.148, 0.145, 0.082],
      // Side & back curls
      [-0.225, 0.085, 0.04, 0.086], [-0.232, -0.01, -0.04, 0.084], [-0.215, 0.08, -0.12, 0.090],
      [0.225, 0.085, 0.04, 0.086], [0.232, -0.01, -0.04, 0.084], [0.215, 0.08, -0.12, 0.090],
      [-0.13, -0.025, -0.212, 0.094], [0, -0.02, -0.232, 0.100], [0.13, -0.025, -0.212, 0.094],
      [-0.10, -0.115, -0.195, 0.082], [0, -0.12, -0.205, 0.086], [0.10, -0.115, -0.195, 0.082]
    ];
    curlCoords.forEach(([cx, cy, cz, cr]) => addPuff(cr, cx, cy, cz));
  } else if (style === "undercut") {
    // Sleek close-cropped tapered sides showing ears + smooth swept-back pompadour wave
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.2, 0.65, cosT);
        const sideEarNotch = Math.exp(-Math.pow((cosT + 0.04) / 0.35, 2)) * 0.08 * Math.abs(sinT);
        const frontLine = 0.305 * Math.PI;
        const backLine = 0.56 * Math.PI - sideEarNotch;
        return THREE.MathUtils.lerp(backLine, frontLine, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        // Broad rounded pompadour crest sweeping smoothly up from forehead across crown
        const sideRoll = Math.exp(-Math.pow(sinT / 0.68, 2));
        const frontToCrown = Math.sin(smoothstep(0.02, 0.34 * Math.PI, alpha) * Math.PI) * (cosT > -0.35 ? 1 : 0.45);
        return 0.016 + sideRoll * frontToCrown * 0.048;
      }
    });
  } else {
    // Default "short" (俐落短髮): natural forward textured crop framing forehead & ears cleanly
    addScalpMesh({
      getAlphaMax: (t, sinT, cosT) => {
        const frontMask = smoothstep(-0.2, 0.7, cosT);
        const sideEarNotch = Math.exp(-Math.pow((cosT + 0.04) / 0.32, 2)) * 0.072 * Math.abs(sinT);
        const frontCrop = 0.365 * Math.PI + Math.cos(sinT * 7) * 0.012;
        const backLine = 0.61 * Math.PI - sideEarNotch;
        return THREE.MathUtils.lerp(backLine, frontCrop, frontMask);
      },
      getOffset: (t, alpha, s, sinT, cosT) => {
        const frontLoft = smoothstep(0.25, 0.88, cosT) * Math.sin(s * Math.PI) * 0.012;
        return 0.022 + Math.sin(s * Math.PI * 0.85) * 0.015 + frontLoft;
      }
    });
  }

  return hair;
}

function createCharacterRig(config) {
  const cfg = { ...DEFAULT_AVATAR, ...(config || {}) };
  const shirtPreset = resolveShirtStyle(cfg.shirtStyle);
  const pantsPreset = resolvePantsStyle(cfg.pantsStyle);

  const skinMat = makeMat(findHex(SKIN_TONES, cfg.skinTone, "#f1c29b"), 0.58);
  const hairMat = makeMat(findHex(HAIR_COLORS, cfg.hairColor, "#1f2430"), 0.78);
  const baseShirtHex = shirtPreset.shirtColor || findHex(OUTFIT_COLORS, cfg.outfitColor, "#d96b43");
  const sleeveHex = shirtPreset.sleeveColor || baseShirtHex;
  const shirtMat = makeMat(baseShirtHex, 0.78);
  const sleeveMat = sleeveHex === baseShirtHex ? shirtMat : makeMat(sleeveHex, 0.78);
  const pantsMat = makeMat(pantsPreset.pantsColor || "#374151", 0.85);
  const shoeMat = makeMat(pantsPreset.shoeColor || "#f8fafc", 0.65);
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
  const cuffMat = pantsPreset.cuffColor ? makeMat(pantsPreset.cuffColor, 0.84) : null;

  [leftLegPivot, rightLegPivot].forEach(pivot => {
    if (pantsPreset.isShorts) {
      const shortsLeg = new THREE.Mesh(
        new THREE.CapsuleGeometry(dims.limbR * 1.06, 0.16, 8, 12),
        pantsMat
      );
      shortsLeg.position.set(0, -0.14, 0);
      shortsLeg.castShadow = true;
      pivot.add(shortsLeg);

      const lowerCalf = new THREE.Mesh(
        new THREE.CapsuleGeometry(dims.limbR * 0.80, 0.16, 8, 12),
        skinMat
      );
      lowerCalf.position.set(0, -0.32, 0);
      lowerCalf.castShadow = true;
      pivot.add(lowerCalf);
    } else {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(dims.limbR, 0.34, 8, 12),
        pantsMat
      );
      leg.position.set(0, -0.22, 0);
      leg.castShadow = true;
      pivot.add(leg);

      if (cuffMat) {
        const cuff = new THREE.Mesh(
          new THREE.CylinderGeometry(dims.limbR * 1.07, dims.limbR * 1.07, 0.055, 14),
          cuffMat
        );
        cuff.position.set(0, -0.39, 0);
        cuff.castShadow = true;
        pivot.add(cuff);
      }
    }

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

  if (pantsPreset.beltColor) {
    const beltMat = makeMat(pantsPreset.beltColor, 0.68);
    const belt = new THREE.Mesh(
      new RoundedBoxGeometry(dims.hipW + 0.016, 0.046, dims.torsoD * 0.96 + 0.016, 2, 0.016),
      beltMat
    );
    belt.position.set(0, -0.175, 0);
    torsoGroup.add(belt);
  }

  if (dims.chestBump) {
    const contour = new THREE.Mesh(
      new RoundedBoxGeometry(dims.shoulderW * 0.82, 0.16, 0.08, 4, 0.04),
      shirtMat
    );
    contour.position.set(0, 0.06, dims.torsoD * 0.45);
    torsoGroup.add(contour);
  }

  const chestZ = dims.torsoD * 0.5 + (dims.chestBump ? 0.012 : 0.002);
  if (shirtPreset.collarColor) {
    const collarMat = makeMat(shirtPreset.collarColor, 0.82);
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.112, 0.022, 8, 20),
      collarMat
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.256, 0.004);
    torsoGroup.add(collarRing);
  }
  if (shirtPreset.detailType === "pocket" && shirtPreset.detailColor) {
    const pocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.088, 0.092, 0.022, 2, 0.008),
      makeMat(shirtPreset.detailColor, 0.82)
    );
    pocket.position.set(0.088, 0.065, chestZ);
    torsoGroup.add(pocket);
  } else if (shirtPreset.detailType === "cardigan" && shirtPreset.detailColor) {
    const innerTee = new THREE.Mesh(
      new RoundedBoxGeometry(0.125, 0.42, 0.024, 3, 0.01),
      makeMat(shirtPreset.detailColor, 0.84)
    );
    innerTee.position.set(0, -0.015, chestZ);
    torsoGroup.add(innerTee);
  } else if (shirtPreset.detailType === "stripe" && shirtPreset.detailColor) {
    const band = new THREE.Mesh(
      new RoundedBoxGeometry(dims.shoulderW + 0.008, 0.082, dims.torsoD + 0.012, 4, 0.03),
      makeMat(shirtPreset.detailColor, 0.8)
    );
    band.position.set(0, 0.05, 0);
    torsoGroup.add(band);
  } else if (shirtPreset.detailType === "hoodie" && shirtPreset.detailColor) {
    const cordMat = makeMat(shirtPreset.detailColor, 0.82);
    const hoodLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.038, 8, 20),
      shirtMat
    );
    hoodLip.rotation.x = Math.PI / 2 - 0.16;
    hoodLip.position.set(0, 0.242, -0.024);
    torsoGroup.add(hoodLip);
    [-0.045, 0.045].forEach(dx => {
      const cord = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.085, 4, 6), cordMat);
      cord.position.set(dx, 0.135, chestZ + 0.006);
      torsoGroup.add(cord);
    });
  }

  body.add(torsoGroup);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-(dims.shoulderW / 2 + 0.06), 0.98, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(dims.shoulderW / 2 + 0.06, 0.98, 0);

  [leftArmPivot, rightArmPivot].forEach(pivot => {
    const sleeve = new THREE.Mesh(
      new THREE.CapsuleGeometry(dims.limbR * 0.92, 0.22, 8, 12),
      sleeveMat
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

  const coffeeProp = new THREE.Group();
  const mugBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.05, 0.1, 12),
    makeMat("#fff7ed", 0.45)
  );
  const mugCoffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.046, 0.015, 12),
    makeMat("#4a2c18", 0.25)
  );
  mugCoffee.position.y = 0.045;
  coffeeProp.add(mugBody, mugCoffee);
  coffeeProp.position.set(0, -0.43, 0.08);
  coffeeProp.visible = false;
  rightArmPivot.add(coffeeProp);

  // PS5 DualSense style two-tone controller held with both hands during "gaming"
  const shoulderX = dims.shoulderW / 2 + 0.06;
  const controllerGripRz = Math.asin(Math.min(0.75, Math.max(0.1, (shoulderX - 0.102) / 0.425)));
  const controllerProp = new THREE.Group();
  const psWhiteMat = makeMat("#f8fafc", 0.35, 0.08);
  const psDarkMat = makeMat("#18181b", 0.45, 0.15);
  const psGripDarkMat = makeMat("#1e293b", 0.52, 0.1);
  const psGlowMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });

  const psBridge = new THREE.Mesh(new RoundedBoxGeometry(0.175, 0.036, 0.095, 3, 0.015), psWhiteMat);
  const psCenterPlate = new THREE.Mesh(new RoundedBoxGeometry(0.145, 0.038, 0.068, 2, 0.01), psDarkMat);
  psCenterPlate.position.set(0, -0.002, 0.018);

  const psTouchpad = new THREE.Mesh(new RoundedBoxGeometry(0.084, 0.012, 0.05, 2, 0.005), psWhiteMat);
  psTouchpad.position.set(0, 0.019, -0.016);
  const psLightL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.013, 0.044), psGlowMat);
  psLightL.position.set(-0.045, 0.019, -0.016);
  const psLightR = psLightL.clone();
  psLightR.position.x = 0.045;

  const psStickL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.016, 12), psGripDarkMat);
  psStickL.position.set(-0.036, 0.022, 0.022);
  const psStickR = psStickL.clone();
  psStickR.position.x = 0.036;

  const psDpad = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.008, 0.03, 2, 0.003), makeMat("#cbd5e1", 0.4));
  psDpad.position.set(-0.064, 0.02, -0.012);
  const psButtons = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.008, 12), psGlowMat);
  psButtons.position.set(0.064, 0.02, -0.012);

  const psGripGeo = new THREE.CapsuleGeometry(0.026, 0.095, 6, 10);
  const psGripL = new THREE.Mesh(psGripGeo, psWhiteMat);
  psGripL.position.set(-0.098, -0.012, 0.022);
  psGripL.rotation.set(0.42, 0, -0.26);
  const psGripR = new THREE.Mesh(psGripGeo, psWhiteMat);
  psGripR.position.set(0.098, -0.012, 0.022);
  psGripR.rotation.set(0.42, 0, 0.26);

  controllerProp.add(
    psBridge, psCenterPlate, psTouchpad, psLightL, psLightR,
    psStickL, psStickR, psDpad, psButtons, psGripL, psGripR
  );
  controllerProp.position.set(0, 0.785, 0.34);
  controllerProp.rotation.set(-0.46, 0, 0);
  controllerProp.visible = false;
  body.add(controllerProp);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.092, 0.14, 16),
    skinMat
  );
  neck.position.set(0, 1.09, -0.01);
  neck.castShadow = true;
  body.add(neck);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.025, 10, 22),
    shirtMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.258, 0.005);
  torsoGroup.add(collar);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.32, 0);

  const head = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.44, 0.44, 6, 0.17), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Subtle stylized figurine ears
  [-0.224, 0.224].forEach(ex => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skinMat);
    ear.scale.set(0.48, 0.92, 0.72);
    ear.position.set(ex, -0.024, -0.015);
    ear.castShadow = true;
    headGroup.add(ear);
  });

  const catchlightMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.031, 12, 12), eyeMat);
  leftEye.position.set(-0.09, -0.012, 0.212);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.031, 12, 12), eyeMat);
  rightEye.position.set(0.09, -0.012, 0.212);
  const leftCatch = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), catchlightMat);
  leftCatch.position.set(-0.08, -0.002, 0.237);
  const rightCatch = leftCatch.clone();
  rightCatch.position.x = 0.10;
  headGroup.add(leftEye, rightEye, leftCatch, rightCatch);

  const browL = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.036, 4, 8), hairMat);
  browL.rotation.z = Math.PI / 2 + 0.06;
  browL.position.set(-0.09, 0.042, 0.219);
  const browR = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.036, 4, 8), hairMat);
  browR.rotation.z = Math.PI / 2 - 0.06;
  browR.position.set(0.09, 0.042, 0.219);
  headGroup.add(browL, browR);

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), blushMat);
  cheekL.scale.set(1.2, 0.6, 0.4);
  cheekL.position.set(-0.14, -0.072, 0.196);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.14;
  headGroup.add(cheekL, cheekR);

  const hairGroup = buildCharacterHairGroup(cfg.hairStyle, hairMat, shirtMat);
  headGroup.add(hairGroup);

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
    coffeeProp,
    controllerProp,
    controllerGripRz,
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
      dom.setPointerCapture?.(e.pointerId);
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

  renderIfPaused() {
    if (this.paused && !this.disposed && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  pause() {
    const wasRunning = !this.paused;
    this.paused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (wasRunning) {
      this.renderIfPaused();
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
    this.onArcLampToggle = options.onArcLampToggle || (() => {});
    this.onVinylToggle = options.onVinylToggle || (() => {});
    this.onOpenTv = options.onOpenTv || (() => {});
    this.onOpenPoster = options.onOpenPoster || (() => {});
    this.onActivityChange = options.onActivityChange || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onHoverChange = options.onHoverChange || (() => {});
    this.onSaveLayout = options.onSaveLayout || (() => {});
    this.onEditModeChange = options.onEditModeChange || (() => {});
    this.onZoomChange = options.onZoomChange || (() => {});
    this.usesSharedTvIframe = Boolean(options.usesSharedTvIframe);

    this.disposed = false;
    this.paused = false;
    this.animFrameId = null;
    this.lastFrameTime = performance.now();

    // Camera quarter 0..3 (rotated by 90 deg) & free zoom factor
    this.targetQuarter = ((options.cameraQuarter ?? 0) % 4 + 4) % 4;
    this.currentAngle = this.targetQuarter * (Math.PI / 2) + Math.PI / 4;
    this.minCameraZoom = 0.6;
    this.maxCameraZoom = 2.2;
    const initZoom = Number(options.cameraZoom);
    this.targetCameraZoom = Number.isFinite(initZoom)
      ? THREE.MathUtils.clamp(initZoom, this.minCameraZoom, this.maxCameraZoom)
      : 1.0;
    this.cameraZoom = this.targetCameraZoom;

    this.deskLampOn = Boolean(options.deskLampOn ?? true);
    this.bedLampOn = Boolean(options.bedLampOn ?? false);
    this.arcLampBrassOn = Boolean(options.arcLampBrassOn ?? true);
    this.arcLampBlackOn = Boolean(options.arcLampBlackOn ?? true);
    this.vinylOn = Boolean(options.vinylOn ?? false);
    this.wallColorHex = options.wallColor || "#f3eadc";
    this.floorStyleId = options.floorStyle || DEFAULT_FLOOR_STYLE;
    this.deskStyleId = options.deskStyle || DEFAULT_DESK_STYLE;
    this.floorSurfaceMesh = null;
    this.floorSurfaceTex = null;
    this.deskTopMat = null;
    this.deskTopMesh = null;
    this.deskLegMat = null;
    this.deskTopTex = null;
    this.bedSheetId = options.bedSheet || DEFAULT_BED_SHEET;
    this.rugStyleId = options.rugStyle || DEFAULT_RUG_STYLE;
    this.posterImageDataUrl = typeof options.posterImage === "string" ? options.posterImage.trim() : "";
    this.posterLoadSeq = 0;
    this.customPosterTex = null;
    this.defaultPosterTex = null;
    this.posterArtMesh = null;
    this.ownedItems = { ...(options.ownedItems || {}) };
    this.avatarConfig = {
      ...DEFAULT_AVATAR,
      ...(options.avatar || {}),
      shirtStyle: options.shirtStyle || options.avatar?.shirtStyle || DEFAULT_SHIRT_STYLE,
      pantsStyle: options.pantsStyle || options.avatar?.pantsStyle || DEFAULT_PANTS_STYLE
    };
    this.activeCharacterId = String(options.characterId || this.avatarConfig.name || "self").trim() || "self";
    this.spectating = Boolean(options.spectating);
    this.furnitureLayout = (options.furnitureLayout && typeof options.furnitureLayout === "object")
      ? { ...options.furnitureLayout }
      : {};
    this.pendingParcels = normalizePendingParcels(options.pendingParcels, this.ownedItems);
    this.editMode = false;
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewRot = 0;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editDragging = false;
    this.editDragMoved = false;
    this.editDragPending = null;
    this.editDragOffset = { wall: null, x: 0, z: 0, coord: 0 };
    this.editItemDirty = false;
    this._editSuppressNextClick = false;
    this._editPointerDownHandled = false;
    this.editActiveParcelRoot = null;
    this.editParcelQueue = [];
    this.editHiddenCompanions = new Set();
    this.editParcelRollbackLayout = null;
    this.layoutDirty = false;
    this.movableGroups = {};
    this.tvHostWallName = "west";
    this.posterHostWallName = "north";
    this.characterStates = new Map();
    this.customThoughts = Array.isArray(options.customThoughts) ? [...options.customThoughts] : [];
    this.persona = buildCharacterPersona(this.activeCharacterId, this.avatarConfig, this.ownedItems);

    // Room bounds & obstacle-free routing anchors
    this.deskWorkAnchor = new THREE.Vector3(-0.25, 0, -2.32);
    this.deskExitAnchor = new THREE.Vector3(-0.25, 0, -1.60);
    this.bedSideAnchor = new THREE.Vector3(1.48, 0, 2.05);
    this.sofaFrontAnchor = new THREE.Vector3(-2.48, 0, -0.35);
    this.sofaCorridorWest = new THREE.Vector3(-2.48, 0, 0.88);
    this.sofaCorridorEast = new THREE.Vector3(-0.95, 0, 0.88);
    this.bathOutsideAnchor = new THREE.Vector3(2.05, 0, -1.15);
    this.bathInsideAnchor = new THREE.Vector3(2.05, 0, -2.05);
    this.toiletApproachAnchor = new THREE.Vector3(3.32, 0, -2.52);
    this.centerAnchor = new THREE.Vector3(0.55, 0, -0.35);

    this.chillSpots = [
      { id: "phone", label: "在床邊滑手機放鬆中", labelEn: "Scrolling phone by the bed", pos: new THREE.Vector3(1.94, 0, 1.95), rotY: -Math.PI / 2 },
      { id: "exercise", label: "做伏地挺身保持體力", labelEn: "Doing push-ups to stay fit", pos: new THREE.Vector3(-0.55, 0, 0.72), rotY: -0.6 },
      { id: "read", label: "在書桌翻閱靈感畫冊", labelEn: "Flipping through artbooks at the desk", pos: new THREE.Vector3(-0.2, 0, -2.02), rotY: Math.PI },
      { id: "eat", label: "享用熱食補充靈感", labelEn: "Enjoying a warm snack", pos: new THREE.Vector3(0.85, 0, 2.45), rotY: -2.2 },
      { id: "gaming", label: "偷玩方塊沙盒遊戲", labelEn: "Sneaking a quick voxel game", pos: new THREE.Vector3(-0.2, 0, -2.02), rotY: Math.PI },
      // Parallel along the bed (+Z is headboard/pillow at 2.83; charBody rotation.x=-PI/2 + root rotY=PI puts head at +Z)
      { id: "sleep", label: "在床上休息睡眠中", labelEn: "Sleeping peacefully in bed", pos: new THREE.Vector3(2.65, 0, 1.48), rotY: Math.PI }
    ];

    this.actionSpots = {
      wash: { id: "wash", label: "洗手台洗手中", labelEn: "Washing hands at the sink", pos: new THREE.Vector3(2.22, 0, -2.92), rotY: Math.PI },
      toilet: { id: "toilet", label: "使用洗手間中", labelEn: "Using the restroom", pos: new THREE.Vector3(3.32, 0, -3.16), rotY: 0 },
      sofa_read: { id: "sofa_read", label: "躺在沙發看書放鬆中", labelEn: "Reading a book on the sofa", pos: new THREE.Vector3(-1.78, 0, -0.35), rotY: -Math.PI / 2 },
      sofa_tv: { id: "sofa_tv", label: "躺在沙發看電視中", labelEn: "Watching TV on the sofa", pos: new THREE.Vector3(-1.78, 0, -0.35), rotY: -Math.PI / 2 },
      watch_tv: { id: "watch_tv", label: "站在電視前看節目中", labelEn: "Watching a show on TV", pos: new THREE.Vector3(-2.78, 0, -0.35), rotY: -Math.PI / 2 },
      water_plant: { id: "water_plant", label: "照顧桌上小盆栽中", labelEn: "Tending the desk Monstera", pos: new THREE.Vector3(0.95, 0, -2.12), rotY: Math.PI },
      admire_poster: { id: "admire_poster", label: "欣賞北牆插畫掛畫找靈感", labelEn: "Admiring wall art for inspiration", pos: new THREE.Vector3(-2.72, 0, -2.95), rotY: Math.PI },
      check_coat: { id: "check_coat", label: "在門旁整理外套與隨身帆布袋", labelEn: "Checking coat & tote by the door", pos: new THREE.Vector3(-2.78, 0, 3.12), rotY: -Math.PI * 0.65 },
      coffee_break: { id: "coffee_break", label: "在手沖吧台泡一杯熱美式咖啡", labelEn: "Brewing pour-over coffee", pos: new THREE.Vector3(-2.62, 0, -2.28), rotY: -Math.PI / 2 },
      listen_vinyl: { id: "listen_vinyl", label: "播放黑膠唱片跟著音樂搖擺中", labelEn: "Vibing to vinyl records", pos: new THREE.Vector3(-0.75, 0, 2.75), rotY: 0 },
      pet_cat: { id: "pet_cat", label: "蹲下來摸摸橘貓室友「阿橘」", labelEn: "Petting Ginger the tabby cat", pos: new THREE.Vector3(0.95, 0, 2.82), rotY: 0 },
      watch_hamster: { id: "watch_hamster", label: "在書桌左邊看倉鼠「麻糬」跑滾輪", labelEn: "Watching Mochi run on his wheel", pos: new THREE.Vector3(-1.82, 0, -2.28), rotY: Math.PI },
      water_floor_plant: { id: "water_floor_plant", label: "替琴葉榕落地盆栽擦葉澆水中", labelEn: "Watering the fiddle-leaf fig", pos: new THREE.Vector3(2.75, 0, -0.55), rotY: Math.PI / 2 }
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
    this.lastSignatureThought = "";
    this.rentMood = { status: "chill", daysLeft: 30, deficit: 0, paidThisMonth: false };
    this.postCelebrateSpot = null;
    this.thoughtBank = {};
    this.rebuildThoughtBank();
    this.walkWaypoints = [];
    this.walkCallback = null;
    this.targetActivityId = null;
    this.toiletLidAngle = 0;

    // Interactive hover/raycast
    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2(-99, -99);
    this.hoveredTarget = null;
    this.allInteractTargets = [];
    this.tvActiveVideoId = null;
    this.tvSuspended = false;

    this.initScene();
    this.buildLights();
    this.buildRoomShell();
    this.buildFurniture();
    this.buildGridVisuals();
    this.registerMovableFurniture();
    this.buildCharacter(this.avatarConfig);
    this.applyPendingParcels(this.pendingParcels);
    this.applyFurnitureLayout(this.furnitureLayout);
    this.placeCharacterAtIdleStart();
    this.bindEvents();
    this.updateCameraTransform(true);
    this.animate();
  }

  addInteractive(mesh, interactType, movableId = null) {
    mesh.userData.interactType = interactType;
    if (movableId) mesh.userData.movableId = movableId;
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
    this.camera.zoom = this.cameraZoom;
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.container.innerHTML = "";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.position = "relative";
    this.renderer.domElement.style.zIndex = "1";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "manipulation";
    this.container.appendChild(this.renderer.domElement);

    // Live 3D-aligned YouTube screen overlay projected onto the West-wall TV
    this.tvOverlayWrap = document.createElement("div");
    this.tvOverlayWrap.className = "room-tv-overlay";
    this.tvOverlayWrap.style.display = "none";
    if (!this.usesSharedTvIframe) {
      this.tvOverlayIframe = document.createElement("iframe");
      this.tvOverlayIframe.className = "room-tv-overlay-iframe";
      this.tvOverlayIframe.title = bi("房間牆上電視 YouTube 即時播放", "Studio Wall TV YouTube Player");
      this.tvOverlayIframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      this.tvOverlayIframe.referrerPolicy = "strict-origin-when-cross-origin";
      this.tvOverlayIframe.allowFullscreen = true;
      this.tvOverlayWrap.appendChild(this.tvOverlayIframe);
    } else {
      this.tvOverlayIframe = null;
    }
    this.container.appendChild(this.tvOverlayWrap);

    // Floating character name + thought bubble HTML overlay inside container
    this.nameTagEl = document.createElement("div");
    this.nameTagEl.className = "room-char-nametag";
    this.container.appendChild(this.nameTagEl);

    this.bubbleEl = document.createElement("div");
    this.bubbleEl.className = "room-char-bubble hidden";
    this.container.appendChild(this.bubbleEl);

    // Floating entrance parcel arrival pill (clickable to unbox new furniture!)
    this.parcelBadgeEl = document.createElement("button");
    this.parcelBadgeEl.type = "button";
    this.parcelBadgeEl.className = "room-parcel-badge hidden";
    this.parcelBadgeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.spectating) this.openNextParcelBox();
    });
    this.container.appendChild(this.parcelBadgeEl);
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

    // Lights attached dynamically to movable furniture groups once constructed
    this.deskLampLight = new THREE.PointLight("#ffbe6b", 2.8, 7.2, 1.6);
    this.deskLampLight.castShadow = true;
    this.deskLampLight.shadow.mapSize.set(512, 512);
    this.deskLampLight.shadow.bias = -0.002;

    this.screenGlowLight = new THREE.PointLight("#7cc4ff", 0.75, 3.2, 1.8);

    this.bedLampLight = new THREE.PointLight("#ffb86c", 0, 5.2, 1.8);

    this.arcLampBrassLight = new THREE.PointLight("#ffd699", 0, 5.8, 1.7);

    this.arcLampBlackLight = new THREE.PointLight("#ffe4b8", 0, 6.2, 1.65);

    this.tvGlowLight = new THREE.PointLight("#7dd3fc", 0, 6.4, 1.65);
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
    this.floorMesh = floor;
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hoveredFloorPoint = null;
    this.walkRippleActive = false;
    this.walkRippleAge = 0;
    this.roomGroup.add(floor);

    // Subtle floor hover indicator & click-to-move ripple marker
    this.walkHoverRingMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.walkHoverRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 28), this.walkHoverRingMat);
    this.walkHoverRing.rotation.x = -Math.PI / 2;
    this.walkHoverRing.position.set(0, 0.042, 0);
    this.roomGroup.add(this.walkHoverRing);

    this.walkTargetRingMat = new THREE.MeshBasicMaterial({
      color: "#fbbf24",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.walkTargetRing = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.23, 28), this.walkTargetRingMat);
    this.walkTargetRing.rotation.x = -Math.PI / 2;
    this.walkTargetRing.position.set(0, 0.044, 0);
    this.roomGroup.add(this.walkTargetRing);

    // Floor surface overlay mesh with crisp procedural CanvasTexture (wood, stone, tile patterns)
    const floorSurfaceMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.62,
      metalness: 0.04
    });
    const floorSurface = new THREE.Mesh(new THREE.PlaneGeometry(8.12, 8.12), floorSurfaceMat);
    floorSurface.rotation.x = -Math.PI / 2;
    floorSurface.position.set(0, 0.0015, 0);
    floorSurface.receiveShadow = true;
    this.floorSurfaceMesh = floorSurface;
    this.roomGroup.add(floorSurface);
    this.applyFloorStyleVisuals();

    // Perimeter Wall System with auto-cutaway on the 2 front-most walls per camera angle!
    this.wallMat = makeMat(this.wallColorHex, 0.78);
    const trimMat = makeMat("#e5d7c3", 0.65);

    this.walls = [
      this.createNorthWall(this.wallMat, trimMat), // window wall (-Z)
      this.createEastWall(this.wallMat, trimMat),  // (+X)
      this.createSouthWall(this.wallMat, trimMat), // (+Z)
      this.createWestWall(this.wallMat, trimMat)   // door wall (-X)
    ];
    this.wallsMap = Object.fromEntries(this.walls.map(w => [w.name, w]));
    this.westWallUpperGroup = this.wallsMap.west.upperGroup;

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
    const defaultTex = makePosterTexture();
    const posterArt = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.9),
      new THREE.MeshBasicMaterial({ map: defaultTex })
    );
    posterArt.position.z = 0.025;
    posterGroup.add(posterArt);
    this.defaultPosterTex = defaultTex;
    this.posterArtMesh = posterArt;
    posterGroup.visible = Boolean(this.ownedItems.wall_poster);
    this.wallPosterGroup = posterGroup;
    upperGroup.add(posterGroup);
    [frameOuter, matBoard, posterArt].forEach(m => this.addInteractive(m, "poster", "wall_poster"));
    if (this.posterImageDataUrl) {
      const savedUrl = this.posterImageDataUrl;
      this.posterImageDataUrl = "";
      this.setPosterImage(savedUrl);
    }

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
    this.tvScreenMesh = tvScreen;
    tvGroup.add(tvScreen);
    this.tvLedMat = new THREE.MeshBasicMaterial({ color: "#475569" });
    const tvLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 8),
      this.tvLedMat
    );
    tvLed.position.set(0.58, -0.39, 0.03);
    tvGroup.add(tvLed);
    const tvShelf = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.06, 0.24, 2, 0.02), makeMat("#9c6b45", 0.55));
    tvShelf.position.set(0, -0.56, 0.11);
    tvShelf.castShadow = true;
    tvGroup.add(tvShelf);
    tvGroup.visible = Boolean(this.ownedItems.wall_tv);
    this.wallTvGroup = tvGroup;
    if (this.tvGlowLight) {
      this.tvGlowLight.position.set(0, 0, 0.62);
      tvGroup.add(this.tvGlowLight);
    }
    upperGroup.add(tvGroup);
    [tvChassis, tvScreen, tvShelf].forEach(m => this.addInteractive(m, "tv", "wall_tv"));

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
    this.buildShopDecorItems();
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

    [[-0.72, -0.24], [0.72, -0.24], [-0.72, 0.40], [0.72, 0.40]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 10), sofaLegMat);
      leg.position.set(lx, 0.07, lz);
      leg.castShadow = true;
      sofaGroup.add(leg);
    });

    const sofaBase = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.24, 0.84, 4, 0.06), sofaFabricMat);
    sofaBase.position.set(0, 0.24, 0.08);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    sofaGroup.add(sofaBase);

    [-0.36, 0.36].forEach(cx => {
      const seat = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.14, 0.68, 4, 0.06), cushionMat);
      seat.position.set(cx, 0.4, 0.13);
      seat.castShadow = true;
      seat.receiveShadow = true;
      sofaGroup.add(seat);
    });

    const backrest = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.52, 0.2, 4, 0.07), sofaFabricMat);
    backrest.position.set(0, 0.56, -0.24);
    backrest.rotation.x = -0.08;
    backrest.castShadow = true;
    sofaGroup.add(backrest);

    [-0.77, 0.77].forEach(ax => {
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.38, 0.84, 4, 0.06), sofaFabricMat);
      arm.position.set(ax, 0.44, 0.08);
      arm.castShadow = true;
      sofaGroup.add(arm);
    });

    [-0.44, 0.44].forEach((px, idx) => {
      const throwPillow = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.24, 0.12, 3, 0.04), pillowAccentMat);
      throwPillow.position.set(px, 0.58, -0.07);
      throwPillow.rotation.set(-0.22, idx === 0 ? 0.25 : -0.25, 0);
      throwPillow.castShadow = true;
      sofaGroup.add(throwPillow);
    });

    sofaGroup.visible = Boolean(this.ownedItems.cozy_sofa);
    this.sofaGroup = sofaGroup;
    this.furnitureGroup.add(sofaGroup);
    sofaGroup.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "sofa", "cozy_sofa");
    });

    // 2. Shop item: Bedside Nightstand + Clickable Warm Night Lamp beside Bed Headboard
    const bedLampGroup = new THREE.Group();
    bedLampGroup.position.set(1.75, 0, 3.25);

    const standMat = makeMat("#b98456", 0.55);
    const standBody = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.46, 4, 0.05), standMat);
    standBody.position.set(0, 0.25, 0);
    standBody.castShadow = true;
    standBody.receiveShadow = true;
    bedLampGroup.add(standBody);

    const drawerFront = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.16, 0.03, 2, 0.01), makeMat("#cfa072", 0.5));
    drawerFront.position.set(0, 0.34, 0.225);
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

    if (this.bedLampLight) {
      this.bedLampLight.position.set(0, 0.96, 0);
      bedLampGroup.add(this.bedLampLight);
    }

    [standBody, nBase, nStem, nShade, nBulb].forEach(m => this.addInteractive(m, "bedLamp", "bed_lamp"));
    bedLampGroup.visible = Boolean(this.ownedItems.bed_lamp);
    this.bedLampGroup = bedLampGroup;
    this.furnitureGroup.add(bedLampGroup);
  }

  buildShopDecorItems() {
    // 1. Coat Rack beside the entrance door (SW corner)
    const coatRack = new THREE.Group();
    coatRack.position.set(-3.48, 0, 3.38);

    const walnutMat = makeMat("#8a5837", 0.56);
    const rackBaseMat = makeMat("#ede8df", 0.42);
    const crBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 20), rackBaseMat);
    crBase.position.y = 0.025;
    crBase.castShadow = true;
    crBase.receiveShadow = true;
    coatRack.add(crBase);

    const crPole = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 1.72, 14), walnutMat);
    crPole.position.y = 0.88;
    crPole.castShadow = true;
    coatRack.add(crPole);

    const pegs = [
      { y: 1.56, rotY: 0.4 },
      { y: 1.44, rotY: 2.2 },
      { y: 1.32, rotY: -1.1 },
      { y: 1.18, rotY: 1.1 }
    ];
    pegs.forEach(p => {
      const pegPivot = new THREE.Group();
      pegPivot.position.y = p.y;
      pegPivot.rotation.y = p.rotY;
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.19, 10), walnutMat);
      peg.rotation.z = -0.55;
      peg.position.set(0.08, 0.06, 0);
      peg.castShadow = true;
      pegPivot.add(peg);
      coatRack.add(pegPivot);
    });

    // Hanging sage-green tote bag + cream scarf + caramel cap
    const toteMat = makeMat("#84a98c", 0.85);
    const toteBag = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.28, 0.08, 3, 0.025), toteMat);
    toteBag.position.set(0.14, 1.02, 0.08);
    toteBag.rotation.y = 0.45;
    toteBag.castShadow = true;
    coatRack.add(toteBag);

    const scarfMat = makeMat("#f5efe2", 0.9);
    const scarf = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.44, 0.07, 3, 0.03), scarfMat);
    scarf.position.set(-0.12, 1.18, 0.09);
    scarf.rotation.set(0.05, 0.3, 0.08);
    scarf.castShadow = true;
    coatRack.add(scarf);

    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      makeMat("#c98a55", 0.72)
    );
    capDome.position.set(0.08, 1.65, -0.08);
    capDome.rotation.z = -0.22;
    capDome.castShadow = true;
    coatRack.add(capDome);

    coatRack.visible = Boolean(this.ownedItems.coat_rack);
    this.coatRackGroup = coatRack;
    this.furnitureGroup.add(coatRack);
    coatRack.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "coatRack", "coat_rack");
    });

    // 2. Floor Fiddle-Leaf Fig in Woven Basket (East side between bath & bed)
    const floorPlant = new THREE.Group();
    floorPlant.position.set(3.52, 0, -0.55);

    const woodStandMat = makeMat("#b98456", 0.58);
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach(([lx, lz]) => {
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.28, 10), woodStandMat);
      sLeg.position.set(lx, 0.14, lz);
      sLeg.castShadow = true;
      floorPlant.add(sLeg);
    });

    const basketMat = makeMat("#c89f6d", 0.85);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.34, 18), basketMat);
    basket.position.y = 0.3;
    basket.castShadow = true;
    floorPlant.add(basket);

    const fpSoil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), makeMat("#4a3728", 0.95));
    fpSoil.position.y = 0.465;
    floorPlant.add(fpSoil);

    const trunkMat = makeMat("#6d4c3d", 0.8);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.036, 0.92, 10), trunkMat);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    floorPlant.add(trunk);

    const fiddleMat = makeMat("#3b7a4a", 0.42);
    const leafSpecs = [
      [0, 1.38, 0, 0.18, 0.2, 0, 0.15],
      [-0.18, 1.24, 0.12, 0.52, 0.6, 0.55, 0.14],
      [0.2, 1.18, 0.1, 0.48, -0.45, -0.52, 0.14],
      [-0.16, 1.04, -0.14, -0.45, 0.4, 0.48, 0.13],
      [0.18, 0.95, -0.12, -0.42, -0.3, -0.45, 0.13],
      [-0.22, 0.84, 0.04, 0.25, 0.2, 0.72, 0.12]
    ];
    leafSpecs.forEach(([lx, ly, lz, rx, ry, rz, size]) => {
      const fLeaf = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), fiddleMat);
      fLeaf.scale.set(0.95, 1.48, 0.22);
      fLeaf.position.set(lx, ly, lz);
      fLeaf.rotation.set(rx, ry, rz);
      fLeaf.castShadow = true;
      floorPlant.add(fLeaf);
    });

    floorPlant.visible = Boolean(this.ownedItems.floor_plant);
    this.floorPlantGroup = floorPlant;
    this.furnitureGroup.add(floorPlant);
    floorPlant.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "floorPlant", "floor_plant");
    });

    // 2b. Shop item: Brass Dome Arc Floor Lamp (weighted dark marble base + slender brushed brass arch + glowing dome shade)
    const arcBrass = new THREE.Group();
    const brassMarbleMat = makeMat("#1f2530", 0.32, 0.25);
    const brassMetalMat = makeMat("#d4af68", 0.24, 0.78);
    const arcBrassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.21, 0.045, 24), brassMarbleMat);
    arcBrassBase.position.set(0, 0.0225, -0.06);
    arcBrassBase.castShadow = true;
    arcBrassBase.receiveShadow = true;
    arcBrass.add(arcBrassBase);

    const arcBrassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.04, 14), brassMetalMat);
    arcBrassCollar.position.set(0, 0.06, -0.06);
    arcBrass.add(arcBrassCollar);

    const brassCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, -0.06),
      new THREE.Vector3(0, 0.96, -0.06),
      new THREE.Vector3(0, 1.48, 0.02),
      new THREE.Vector3(0, 1.56, 0.23),
      new THREE.Vector3(0, 1.42, 0.35)
    ]);
    const arcBrassStem = new THREE.Mesh(new THREE.TubeGeometry(brassCurve, 26, 0.019, 10, false), brassMetalMat);
    arcBrassStem.castShadow = true;
    arcBrass.add(arcBrassStem);

    const arcBrassSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.045, 14), brassMetalMat);
    arcBrassSocket.position.set(0, 1.42, 0.35);
    arcBrass.add(arcBrassSocket);

    const brassDomeMat = new THREE.MeshStandardMaterial({
      color: "#d4af68",
      roughness: 0.24,
      metalness: 0.78,
      side: THREE.DoubleSide
    });
    const arcBrassDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.205, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.54),
      brassDomeMat
    );
    arcBrassDome.position.set(0, 1.24, 0.35);
    arcBrassDome.castShadow = true;
    arcBrass.add(arcBrassDome);

    this.arcLampBrassDiffMat = new THREE.MeshStandardMaterial({
      color: "#fff7dc",
      emissive: "#ffc978",
      emissiveIntensity: this.arcLampBrassOn ? 1.15 : 0.0,
      roughness: 0.3
    });
    const arcBrassDiffuser = new THREE.Mesh(new THREE.CircleGeometry(0.19, 22), this.arcLampBrassDiffMat);
    arcBrassDiffuser.rotation.x = Math.PI / 2;
    arcBrassDiffuser.position.set(0, 1.225, 0.35);
    arcBrass.add(arcBrassDiffuser);

    const arcBrassBulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), this.arcLampBrassDiffMat);
    arcBrassBulb.position.set(0, 1.27, 0.35);
    arcBrass.add(arcBrassBulb);

    if (this.arcLampBrassLight) {
      this.arcLampBrassLight.position.set(0, 1.14, 0.35);
      arcBrass.add(this.arcLampBrassLight);
    }

    arcBrass.visible = Boolean(this.ownedItems.arc_lamp_brass);
    this.arcLampBrassGroup = arcBrass;
    this.furnitureGroup.add(arcBrass);
    arcBrass.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "arcLampBrass", "arc_lamp_brass");
    });
    this.arcLampBrassDiffuser = arcBrassDiffuser;
    this.arcLampBrassBulb = arcBrassBulb;
    this.arcLampBrassDiffMat = arcBrassDiffuser.material;
    this.arcLampBrassBulbMat = arcBrassBulb.material;

    // 2c. Shop item: Matte Black Drum Arc Floor Lamp (wide flat disc base + tall sweeping black arch + tapered drum shade)
    const arcBlack = new THREE.Group();
    const blackBaseMat = makeMat("#141820", 0.42, 0.45);
    const blackPoleMat = makeMat("#181d26", 0.35, 0.52);
    const arcBlackBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.024, 24), blackBaseMat);
    arcBlackBase.position.set(0, 0.012, -0.05);
    arcBlackBase.castShadow = true;
    arcBlackBase.receiveShadow = true;
    arcBlack.add(arcBlackBase);

    const blackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.024, -0.17),
      new THREE.Vector3(0, 1.12, -0.15),
      new THREE.Vector3(0, 1.78, 0.03),
      new THREE.Vector3(0, 1.88, 0.26),
      new THREE.Vector3(0, 1.72, 0.40)
    ]);
    const arcBlackStem = new THREE.Mesh(new THREE.TubeGeometry(blackCurve, 28, 0.018, 10, false), blackPoleMat);
    arcBlackStem.castShadow = true;
    arcBlack.add(arcBlackStem);

    const blackShadeMat = new THREE.MeshStandardMaterial({
      color: "#151922",
      roughness: 0.30,
      metalness: 0.28,
      side: THREE.DoubleSide
    });
    const arcBlackShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.21, 0.28, 24, 1, true),
      blackShadeMat
    );
    arcBlackShade.position.set(0, 1.56, 0.40);
    arcBlackShade.castShadow = true;
    arcBlack.add(arcBlackShade);

    const arcBlackShadeCap = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), blackShadeMat);
    arcBlackShadeCap.rotation.x = -Math.PI / 2;
    arcBlackShadeCap.position.set(0, 1.70, 0.40);
    arcBlack.add(arcBlackShadeCap);

    this.arcLampBlackDiffMat = new THREE.MeshStandardMaterial({
      color: "#fff8e6",
      emissive: "#ffd58a",
      emissiveIntensity: this.arcLampBlackOn ? 1.2 : 0.0,
      roughness: 0.28,
      side: THREE.DoubleSide
    });
    const arcBlackInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.154, 0.204, 0.26, 20, 1, true),
      this.arcLampBlackDiffMat
    );
    arcBlackInner.position.set(0, 1.555, 0.40);
    arcBlack.add(arcBlackInner);

    const arcBlackBottom = new THREE.Mesh(new THREE.CircleGeometry(0.202, 24), this.arcLampBlackDiffMat);
    arcBlackBottom.rotation.x = Math.PI / 2;
    arcBlackBottom.position.set(0, 1.43, 0.40);
    arcBlack.add(arcBlackBottom);

    if (this.arcLampBlackLight) {
      this.arcLampBlackLight.position.set(0, 1.35, 0.40);
      arcBlack.add(this.arcLampBlackLight);
    }

    arcBlack.visible = Boolean(this.ownedItems.arc_lamp_black);
    this.arcLampBlackGroup = arcBlack;
    this.furnitureGroup.add(arcBlack);
    arcBlack.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "arcLampBlack", "arc_lamp_black");
    });
    this.arcLampBlackBottom = arcBlackBottom;
    this.arcLampBlackInner = arcBlackInner;
    this.arcLampBlackDiffMat = arcBlackBottom.material;
    this.arcLampBlackInnerMat = arcBlackInner.material;

    // 3. Coffee Bar Station (West wall north of TV)
    const coffeeBar = new THREE.Group();
    coffeeBar.position.set(-3.48, 0, -2.28);
    coffeeBar.rotation.y = Math.PI / 2;

    const cbCab = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.74, 0.52, 4, 0.05), walnutMat);
    cbCab.position.y = 0.43;
    cbCab.castShadow = true;
    cbCab.receiveShadow = true;
    coffeeBar.add(cbCab);

    [[-0.38, -0.18], [0.38, -0.18], [-0.38, 0.18], [0.38, 0.18]].forEach(([lx, lz]) => {
      const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.08, 10), walnutMat);
      cLeg.position.set(lx, 0.04, lz);
      coffeeBar.add(cLeg);
    });

    const machineBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.36, 0.28, 3, 0.04),
      makeMat("#8fa893", 0.38, 0.12)
    );
    machineBody.position.set(-0.22, 0.98, -0.04);
    machineBody.castShadow = true;
    coffeeBar.add(machineBody);

    const dripTray = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.03, 0.16, 2, 0.01),
      makeMat("#cbd5e1", 0.25, 0.75)
    );
    dripTray.position.set(-0.22, 0.815, 0.11);
    coffeeBar.add(dripTray);

    const kettle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.08, 0.16, 14),
      makeMat("#c97343", 0.28, 0.65)
    );
    kettle.position.set(0.26, 0.88, -0.06);
    kettle.castShadow = true;
    coffeeBar.add(kettle);

    const barMug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.048, 0.095, 14),
      makeMat("#fff8ee", 0.35)
    );
    barMug.position.set(0.06, 0.848, 0.1);
    coffeeBar.add(barMug);

    coffeeBar.visible = Boolean(this.ownedItems.coffee_bar);
    this.coffeeBarGroup = coffeeBar;
    this.furnitureGroup.add(coffeeBar);
    coffeeBar.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "coffeeBar", "coffee_bar");
    });

    // 4. Mid-century Vinyl Turntable & Record Console (South wall)
    const vinylGroup = new THREE.Group();
    vinylGroup.position.set(-0.75, 0, 3.55);
    vinylGroup.rotation.y = Math.PI;

    const consoleCab = new THREE.Mesh(new RoundedBoxGeometry(1.36, 0.56, 0.48, 4, 0.05), walnutMat);
    consoleCab.position.y = 0.38;
    consoleCab.castShadow = true;
    consoleCab.receiveShadow = true;
    vinylGroup.add(consoleCab);

    [[-0.56, -0.16], [0.56, -0.16], [-0.56, 0.16], [0.56, 0.16]].forEach(([lx, lz]) => {
      const vLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.12, 10), walnutMat);
      vLeg.position.set(lx, 0.06, lz);
      vinylGroup.add(vLeg);
    });

    const cubbyDark = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.32, 0.44, 2, 0.02), makeMat("#3b271c", 0.85));
    cubbyDark.position.set(0, 0.34, 0.03);
    vinylGroup.add(cubbyDark);

    // Colorful LP spines in lower cubby
    const spineColors = ["#e76f51", "#f4a261", "#2a9d8f", "#60a5fa", "#e9c46a", "#a78bfa", "#f472b6"];
    spineColors.forEach((hex, idx) => {
      const lp = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.34), makeMat(hex, 0.65));
      lp.position.set(-0.46 + idx * 0.045, 0.34, 0.08);
      vinylGroup.add(lp);
    });

    // Two stereo speakers flanking turntable
    [-0.5, 0.5].forEach(sx => {
      const spk = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.3, 0.24, 3, 0.03), walnutMat);
      spk.position.set(sx, 0.81, 0);
      spk.castShadow = true;
      vinylGroup.add(spk);

      const spkGrill = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.25, 0.02, 2, 0.01), makeMat("#dfd3be", 0.9));
      spkGrill.position.set(sx, 0.81, 0.12);
      vinylGroup.add(spkGrill);
    });

    const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.08, 0.38, 3, 0.02), makeMat("#6e4429", 0.45));
    plinth.position.set(0, 0.7, 0);
    plinth.castShadow = true;
    vinylGroup.add(plinth);

    const discGroup = new THREE.Group();
    discGroup.position.set(-0.04, 0.75, 0);
    const lpDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24), makeMat("#111827", 0.22, 0.45));
    const lpLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.014, 16), makeMat("#e76f51", 0.5));
    const lpStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.014), makeMat("#475569", 0.4));
    discGroup.add(lpDisc, lpLabel, lpStripe);
    this.vinylDiscGroup = discGroup;
    vinylGroup.add(discGroup);

    const toneArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), makeMat("#eab308", 0.25, 0.85));
    toneArm.rotation.x = Math.PI / 2;
    toneArm.rotation.z = 0.28;
    toneArm.position.set(0.18, 0.76, -0.04);
    vinylGroup.add(toneArm);

    this.vinylLedMat = new THREE.MeshBasicMaterial({ color: this.vinylOn ? "#fbbf24" : "#475569" });
    const vinylLed = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), this.vinylLedMat);
    vinylLed.position.set(0.22, 0.745, 0.14);
    vinylGroup.add(vinylLed);

    vinylGroup.visible = Boolean(this.ownedItems.vinyl_player);
    this.vinylPlayerGroup = vinylGroup;
    this.furnitureGroup.add(vinylGroup);
    vinylGroup.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "vinyl", "vinyl_player");
    });

    // 5. Orange Tabby Cat Roommate + Fleece Pet Bed (South corner near bed)
    const catGroup = new THREE.Group();
    catGroup.position.set(1.00, 0, 3.50);
    catGroup.rotation.y = Math.PI;
    const catVisual = new THREE.Group();
    catVisual.rotation.y = -Math.PI * 0.15;
    catGroup.add(catVisual);

    const rimMat = makeMat("#d97757", 0.86);
    const fleeceMat = makeMat("#faf3e8", 0.96);
    const petBedRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 12, 24), rimMat);
    petBedRim.rotation.x = Math.PI / 2;
    petBedRim.position.y = 0.09;
    petBedRim.castShadow = true;
    catVisual.add(petBedRim);

    const petCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.08, 22), fleeceMat);
    petCushion.position.y = 0.05;
    petCushion.receiveShadow = true;
    catVisual.add(petCushion);

    const catMat = makeMat("#ed8936", 0.76);
    const stripeMat = makeMat("#c05621", 0.82);
    const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), catMat);
    catBody.scale.set(1.22, 0.72, 1.0);
    catBody.position.set(0.02, 0.16, 0.02);
    catBody.castShadow = true;
    this.catBodyMesh = catBody;
    catVisual.add(catBody);

    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 14), catMat);
    catHead.position.set(-0.14, 0.25, -0.06);
    catHead.castShadow = true;
    catVisual.add(catHead);

    [-0.07, 0.07].forEach(ex => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.08, 4), catMat);
      ear.position.set(-0.14 + ex * 0.7, 0.36, -0.06 + ex * 0.55);
      ear.rotation.z = -ex * 1.4;
      catVisual.add(ear);
    });

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), makeMat("#fffaf0", 0.85));
    muzzle.scale.set(1.1, 0.7, 0.8);
    muzzle.position.set(-0.22, 0.22, -0.1);
    catVisual.add(muzzle);

    const cStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), stripeMat);
    cStripe.position.set(0.04, 0.28, 0.02);
    catVisual.add(cStripe);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.18, 0.16, 0.06);
    const catTail = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.18, 6, 8), catMat);
    catTail.rotation.z = Math.PI / 2 - 0.35;
    catTail.position.set(0.09, 0.04, 0);
    tailPivot.add(catTail);
    this.catTailPivot = tailPivot;
    catVisual.add(tailPivot);

    catGroup.visible = Boolean(this.ownedItems.orange_cat);
    this.orangeCatGroup = catGroup;
    this.furnitureGroup.add(catGroup);
    catVisual.traverse(m => {
      if (m.isMesh) this.addInteractive(m, "cat", "orange_cat");
    });

    // 6. Unlocked Combo Cinema Upgrade: Two independently movable floor groups (dolby_atmos front console + dolby_atmos_rear towers)
    const frontAtmosGroup = new THREE.Group();
    const rearAtmosGroup = new THREE.Group();
    const chassisMat = makeMat("#313b4d", 0.36, 0.45);
    const grilleMat = makeMat("#161d29", 0.88, 0.08);
    const titaniumMat = makeMat("#94a3b8", 0.28, 0.72);
    const oakConsoleMat = makeMat("#6e4f3a", 0.56, 0.08);
    const copperConeMat = makeMat("#d49a6a", 0.35, 0.62);
    this.atmosLedMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });

    // 6a. Sleek Titanium & Walnut Acoustic Stand (3x1 floor footprint, facing +Z)
    const shelfDeck = new THREE.Mesh(new RoundedBoxGeometry(1.38, 0.042, 0.36, 3, 0.014), oakConsoleMat);
    shelfDeck.position.set(0, 0.405, 0);
    shelfDeck.castShadow = true;
    shelfDeck.receiveShadow = true;
    frontAtmosGroup.add(shelfDeck);
    [-0.60, 0.16, 0.62].forEach(lx => {
      [-0.13, 0.13].forEach(lz => {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.038, 0.384, 0.038, 2, 0.01), titaniumMat);
        leg.position.set(lx, 0.192, lz);
        leg.castShadow = true;
        frontAtmosGroup.add(leg);
      });
    });

    // Upward-firing Soundbar centered on top acoustic deck
    const soundbar = new THREE.Group();
    soundbar.position.set(0, 0.47, 0.05);
    const sbBody = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.088, 0.13, 3, 0.025), chassisMat);
    sbBody.castShadow = true;
    soundbar.add(sbBody);
    const sbFrontGrille = new THREE.Mesh(new RoundedBoxGeometry(0.91, 0.066, 0.02, 2, 0.01), grilleMat);
    sbFrontGrille.position.set(0, 0, 0.058);
    soundbar.add(sbFrontGrille);
    [-0.34, 0.34].forEach(upX => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.022, 0.036, 16), copperConeMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(upX, 0.046, -0.01);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), grilleMat);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(upX, 0.0455, -0.01);
      soundbar.add(ring, cone);
    });
    const sbLed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.01), this.atmosLedMat);
    sbLed.position.set(0, 0.045, 0.06);
    soundbar.add(sbLed);
    frontAtmosGroup.add(soundbar);

    // 6b. Wireless Floor Subwoofer tucked neatly under right bay (on floor y = 0)
    const subGroup = new THREE.Group();
    subGroup.position.set(0.39, 0, 0.01);
    const subBox = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.35, 0.32, 4, 0.045), chassisMat);
    subBox.position.y = 0.185;
    subBox.castShadow = true;
    subBox.receiveShadow = true;
    subGroup.add(subBox);
    const subRing = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.016, 12, 24), copperConeMat);
    subRing.position.set(0, 0.185, 0.162);
    const subCone = new THREE.Mesh(new THREE.CircleGeometry(0.088, 22), grilleMat);
    subCone.position.set(0, 0.185, 0.164);
    const subLed = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), this.atmosLedMat);
    subLed.position.set(0.10, 0.32, 0.164);
    subGroup.add(subRing, subCone, subLed);
    frontAtmosGroup.add(subGroup);

    // 6c. Twin Angled Front Atmos Height Speakers seated cleanly atop acoustic deck
    [-0.57, 0.57].forEach(mx => {
      const heightMod = new THREE.Group();
      heightMod.position.set(mx, 0.53, -0.05);
      heightMod.rotation.x = -0.32;
      const modBox = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.21, 0.13, 3, 0.024), chassisMat);
      modBox.castShadow = true;
      const modGrille = new THREE.Mesh(new RoundedBoxGeometry(0.135, 0.165, 0.018, 2, 0.01), grilleMat);
      modGrille.position.z = 0.061;
      const modTrim = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.052, 18), copperConeMat);
      modTrim.position.set(0, 0.01, 0.072);
      const modLed = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.01), this.atmosLedMat);
      modLed.position.set(0, -0.078, 0.068);
      heightMod.add(modBox, modGrille, modTrim, modLed);
      frontAtmosGroup.add(heightMod);
    });

    // 6d. Twin Rear Surround Satellite Towers (independently movable 3x1 floor pair, facing +Z)
    const rearCableBridge = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.012, 0.04), titaniumMat);
    rearCableBridge.position.set(0, 0.006, 0);
    rearCableBridge.receiveShadow = true;
    rearAtmosGroup.add(rearCableBridge);
    [
      [-0.54, 0, 0.28],
      [0.54, 0, -0.28]
    ].forEach(([tx, tz, ry]) => {
      const tower = new THREE.Group();
      tower.position.set(tx, 0, tz);
      tower.rotation.y = ry;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.024, 18), titaniumMat);
      base.position.y = 0.012;
      base.receiveShadow = true;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.86, 10), titaniumMat);
      pole.position.y = 0.44;
      pole.castShadow = true;
      const head = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.24, 0.12, 3, 0.025), chassisMat);
      head.position.y = 0.94;
      head.castShadow = true;
      const headGrille = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.2, 0.016, 2, 0.01), grilleMat);
      headGrille.position.set(0, 0.94, 0.056);
      const headTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.01), copperConeMat);
      headTrim.position.set(0, 1.05, 0.058);
      tower.add(base, pole, head, headGrille, headTrim);
      rearAtmosGroup.add(tower);
    });

    frontAtmosGroup.visible = Boolean(this.ownedItems.dolby_atmos && !this.pendingParcels?.dolby_atmos);
    rearAtmosGroup.visible = Boolean(this.ownedItems.dolby_atmos && !this.pendingParcels?.dolby_atmos);
    this.atmosFrontGroup = frontAtmosGroup;
    this.atmosWallGroup = frontAtmosGroup;
    this.dolbyAtmosGroup = rearAtmosGroup;
    this.furnitureGroup.add(frontAtmosGroup, rearAtmosGroup);
    frontAtmosGroup.traverse(obj => {
      if (obj.isMesh && obj.material !== this.atmosLedMat) {
        this.addInteractive(obj, "atmos", "dolby_atmos");
      }
    });
    rearAtmosGroup.traverse(obj => {
      if (obj.isMesh && obj.material !== this.atmosLedMat) {
        this.addInteractive(obj, "atmos", "dolby_atmos_rear");
      }
    });

    // 7. Two-Drawer Oak Side Table + Aligned Acrylic Hamster Cage & Wheel (immediately left of the desk)
    const HAMSTER_TABLE_TOP_Y = 0.78;
    this.hamsterTableTopY = HAMSTER_TABLE_TOP_Y;

    const hamsterSet = new THREE.Group();
    hamsterSet.position.set(-1.82, 0, -3.05);

    const oakFrameMat = makeMat("#c8986b", 0.52);
    const oakDrawerMat = makeMat("#eddcc4", 0.56);
    const knobBrassMat = makeMat("#d4a459", 0.3, 0.75);
    const darkLegMat = makeMat("#4b5563", 0.45, 0.3);

    // 4 tapered legs resting cleanly on floor (y = 0..0.22)
    [[-0.31, -0.26], [0.31, -0.26], [-0.31, 0.26], [0.31, 0.26]].forEach(([lx, lz]) => {
      const hLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.22, 10), darkLegMat);
      hLeg.position.set(lx, 0.11, lz);
      hLeg.castShadow = true;
      hamsterSet.add(hLeg);
    });

    // Drawer cabinet body (y = 0.22..0.73)
    const hCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.51, 0.68, 3, 0.03), oakFrameMat);
    hCabinet.position.set(0, 0.475, 0);
    hCabinet.castShadow = true;
    hCabinet.receiveShadow = true;
    hamsterSet.add(hCabinet);

    // Two cream drawer fronts + brass knobs facing +Z
    [0.36, 0.59].forEach(dy => {
      const dPanel = new THREE.Mesh(new RoundedBoxGeometry(0.60, 0.19, 0.03, 2, 0.014), oakDrawerMat);
      dPanel.position.set(0, dy, 0.34);
      hamsterSet.add(dPanel);

      const dKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), knobBrassMat);
      dKnob.position.set(0, dy, 0.365);
      hamsterSet.add(dKnob);
    });

    // Tabletop slab whose exact top face is HAMSTER_TABLE_TOP_Y (0.755 + 0.05/2 = 0.780)
    const hTableTop = new THREE.Mesh(new RoundedBoxGeometry(0.80, 0.05, 0.76, 3, 0.018), oakFrameMat);
    hTableTop.position.set(0, HAMSTER_TABLE_TOP_Y - 0.025, 0);
    hTableTop.castShadow = true;
    hTableTop.receiveShadow = true;
    hamsterSet.add(hTableTop);

    // Cage group sits flush at local y = 0 -> world y = HAMSTER_TABLE_TOP_Y (0.780)
    const cageRoot = new THREE.Group();
    cageRoot.position.set(0, HAMSTER_TABLE_TOP_Y, 0);
    this.hamsterCageSubGroup = cageRoot;

    // Bottom plastic tray: height 0.14 centered at y = 0.070 -> bottom sits strictly at y = 0.000
    const trayMat = makeMat("#88a894", 0.55);
    const cageTray = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.14, 0.50, 3, 0.022), trayMat);
    cageTray.position.set(0, 0.07, 0);
    cageTray.castShadow = true;
    cageTray.receiveShadow = true;
    cageRoot.add(cageTray);

    // Cozy pale wood-shaving bedding bed inside tray
    const bedding = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.035, 0.44, 2, 0.012),
      makeMat("#ead8be", 0.92)
    );
    bedding.position.set(0, 0.128, 0);
    cageRoot.add(bedding);

    // Transparent acrylic enclosure walls + oak/silver top rim & slim vertical corner posts
    const glassMat = new THREE.MeshStandardMaterial({
      color: "#e8f4f8",
      transparent: true,
      opacity: 0.22,
      roughness: 0.12,
      metalness: 0.05,
      depthWrite: false
    });
    const cageGlass = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.46), glassMat);
    cageGlass.position.set(0, 0.31, 0);
    cageRoot.add(cageGlass);

    [[-0.285, -0.225], [0.285, -0.225], [-0.285, 0.225], [0.285, 0.225]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.36, 0.026, 2, 0.008), oakFrameMat);
      post.position.set(px, 0.31, pz);
      post.castShadow = true;
      cageRoot.add(post);
    });

    const cageRoofRim = new THREE.Mesh(new RoundedBoxGeometry(0.60, 0.028, 0.48, 3, 0.01), oakFrameMat);
    cageRoofRim.position.set(0, 0.484, 0);
    cageRoofRim.castShadow = true;
    cageRoot.add(cageRoofRim);

    // Wire bars across the top roof grille
    const wireMat = makeMat("#cbd5e1", 0.35, 0.72);
    for (let i = -3; i <= 3; i++) {
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.44, 6), wireMat);
      topBar.rotation.x = Math.PI / 2;
      topBar.position.set(i * 0.07, 0.486, 0);
      cageRoot.add(topBar);
    }

    // Wooden Hideout Hut + Tiny Seed Dish + Pastel Water Bottle inside cage
    const hideout = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.16, 3, 0.025), oakFrameMat);
    hideout.position.set(0.16, 0.195, -0.10);
    hideout.castShadow = true;
    cageRoot.add(hideout);

    const hideDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 12), makeMat("#3e2c23", 0.9));
    hideDoor.rotation.x = Math.PI / 2;
    hideDoor.position.set(0.16, 0.175, -0.02);
    cageRoot.add(hideDoor);

    const seedBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.032, 14), makeMat("#f59e0b", 0.45));
    seedBowl.position.set(0.15, 0.156, 0.11);
    cageRoot.add(seedBowl);

    const seedsHeap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), makeMat("#92400e", 0.85));
    seedsHeap.scale.set(1.1, 0.48, 1.1);
    seedsHeap.position.set(0.15, 0.168, 0.11);
    cageRoot.add(seedsHeap);

    const waterBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.13, 12), makeMat("#7dd3fc", 0.3));
    waterBottle.position.set(0.255, 0.34, -0.06);
    cageRoot.add(waterBottle);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.055, 8), wireMat);
    spout.rotation.z = 0.65;
    spout.position.set(0.23, 0.255, -0.06);
    cageRoot.add(spout);

    // Exercise Wheel Assembly (back-left inside cage)
    const wheelStand = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.16, 0.05, 2, 0.008), trayMat);
    wheelStand.position.set(-0.13, 0.21, -0.05);
    cageRoot.add(wheelStand);

    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(-0.13, 0.29, -0.01);
    const wheelRimMat = makeMat("#e07a5f", 0.55);
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.015, 10, 24), wheelRimMat);
    wheelPivot.add(wheelRim);
    const wheelRimBack = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 8, 24), wheelRimMat);
    wheelRimBack.position.z = -0.045;
    wheelPivot.add(wheelRimBack);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.008), makeMat("#f4e8d6", 0.6));
      spoke.rotation.z = (s * Math.PI) / 4;
      spoke.position.z = -0.045;
      wheelPivot.add(spoke);
    }
    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), knobBrassMat);
    wheelHub.rotation.x = Math.PI / 2;
    wheelHub.position.z = -0.025;
    wheelPivot.add(wheelHub);
    this.hamsterWheelPivot = wheelPivot;
    cageRoot.add(wheelPivot);

    // Adorable Pudding/Golden Hamster "Mochi" inside the wheel
    const hamsterPivot = new THREE.Group();
    hamsterPivot.position.set(-0.13, 0.215, -0.02);
    const hamFurMat = makeMat("#ecc17e", 0.78);
    const hamCreamMat = makeMat("#fff8eb", 0.84);
    const hamEyeMat = makeMat("#1e293b", 0.18);
    const hamPinkMat = makeMat("#f48c8c", 0.75);

    const hamBody = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), hamFurMat);
    hamBody.scale.set(1.22, 0.92, 0.94);
    hamBody.castShadow = true;
    hamsterPivot.add(hamBody);

    const hamBelly = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), hamCreamMat);
    hamBelly.scale.set(1.05, 0.78, 0.82);
    hamBelly.position.set(0.008, -0.012, 0.012);
    hamsterPivot.add(hamBelly);

    const hamHead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), hamFurMat);
    hamHead.position.set(0.042, 0.022, 0.006);
    hamsterPivot.add(hamHead);

    [-0.022, 0.022].forEach(ez => {
      const hEar = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), hamPinkMat);
      hEar.position.set(0.028, 0.056, ez);
      hamsterPivot.add(hEar);

      const hEye = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), hamEyeMat);
      hEye.position.set(0.072, 0.030, ez * 0.85);
      hamsterPivot.add(hEye);
    });

    const hNose = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), hamPinkMat);
    hNose.position.set(0.080, 0.020, 0.006);
    hamsterPivot.add(hNose);

    this.hamsterBodyMesh = hamsterPivot;
    cageRoot.add(hamsterPivot);
    hamsterSet.add(cageRoot);

    hamsterSet.visible = Boolean(this.ownedItems.hamster_cage);
    this.hamsterCageGroup = hamsterSet;
    this.furnitureGroup.add(hamsterSet);
    hamsterSet.traverse(obj => {
      if (obj.isMesh && obj.material !== glassMat) {
        this.addInteractive(obj, "hamster", "hamster_cage");
      }
    });
  }

  buildDoormat() {
    const matMesh = new THREE.Mesh(
      new RoundedBoxGeometry(0.85, 0.04, 1.28, 2, 0.02),
      makeMat("#7d9b76", 0.92)
    );
    matMesh.position.set(-3.36, 0.02, 2.05);
    matMesh.receiveShadow = true;
    this.furnitureGroup.add(matMesh);

    this.buildDoormatParcels();
  }

  buildDoormatParcels() {
    const parcelGroup = new THREE.Group();
    parcelGroup.position.set(-3.36, 0.04, 2.05);

    const kraftMat = makeMat("#c89a64", 0.85);
    const kraftDarkMat = makeMat("#b3834f", 0.88);
    const tapeMat = makeMat("#f2e4cb", 0.72);
    const labelMat = makeMat("#fffaf0", 0.8);
    const inkMat = makeMat("#4a3728", 0.9);

    const makeBoxMesh = (bw, bh, bd, px, py, pz, ry = 0) => {
      const box = new THREE.Group();
      box.position.set(px, py + bh / 2, pz);
      box.rotation.y = ry;
      const body = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, bd, 2, 0.015), kraftMat);
      body.castShadow = true;
      body.receiveShadow = true;
      const seam = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.004, 0.008, bd * 0.24), tapeMat);
      seam.position.y = bh * 0.5 + 0.001;
      const tapeFront = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.22, bh * 0.32, bd + 0.004), tapeMat);
      tapeFront.position.y = bh * 0.34;
      const lbl = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.34, bh * 0.28, 0.006), labelMat);
      lbl.position.set(-bw * 0.16, 0, bd * 0.5 + 0.003);
      const line1 = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.22, bh * 0.04, 0.006), inkMat);
      line1.position.set(-bw * 0.16, bh * 0.04, bd * 0.5 + 0.005);
      const flapShadow = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, 0.006, 0.012), kraftDarkMat);
      flapShadow.position.y = bh * 0.5 + 0.002;
      box.add(body, seam, tapeFront, lbl, line1, flapShadow);
      box.traverse(m => {
        if (m.isMesh) this.addInteractive(m, "parcel");
      });
      return box;
    };

    this.parcelBox1 = makeBoxMesh(0.46, 0.32, 0.40, 0, 0, 0, 0.08);
    this.parcelBox2 = makeBoxMesh(0.38, 0.26, 0.34, 0.04, 0.32, -0.03, -0.14);
    this.parcelBox3 = makeBoxMesh(0.32, 0.24, 0.28, -0.22, 0, 0.28, 0.22);

    parcelGroup.add(this.parcelBox1, this.parcelBox2, this.parcelBox3);
    parcelGroup.visible = false;
    this.parcelGroup = parcelGroup;
    this.furnitureGroup.add(parcelGroup);
  }

  buildCozyRug() {
    this.rugGroup = new THREE.Group();
    this.rugGroup.position.set(-0.55, 0, 0.72);
    this.furnitureGroup.add(this.rugGroup);
    this.rebuildRugMeshes();
  }

  rebuildRugMeshes() {
    if (!this.rugGroup) return;
    while (this.rugGroup.children.length > 0) {
      const child = this.rugGroup.children.pop();
      this.rugGroup.remove(child);
    }

    const style = resolveRugStyle(this.rugStyleId);
    const baseMat = makeMat(style.baseColor, 0.95);
    const accentMat = makeMat(style.accentColor, 0.93);

    if (style.pattern === "round") {
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.032, 36), baseMat);
      outer.position.y = 0.016;
      outer.receiveShadow = true;
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.036, 32), accentMat);
      inner.position.y = 0.018;
      inner.receiveShadow = true;
      this.rugGroup.add(outer, inner);
      return;
    }

    const rug = new THREE.Mesh(new RoundedBoxGeometry(2.65, 0.03, 2.25, 3, 0.015), baseMat);
    rug.position.y = 0.015;
    rug.receiveShadow = true;
    this.rugGroup.add(rug);

    if (style.pattern === "checker") {
      const cols = 5;
      const rows = 4;
      const tileW = 0.48;
      const tileD = 0.5;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if ((c + r) % 2 === 1) {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(tileW, 0.008, tileD), accentMat);
            tile.position.set((c - (cols - 1) / 2) * tileW, 0.031, (r - (rows - 1) / 2) * tileD);
            tile.receiveShadow = true;
            this.rugGroup.add(tile);
          }
        }
      }
      return;
    }

    if (style.pattern === "nordic") {
      [-0.78, 0.78].forEach(zPos => {
        const line = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.008, 0.09), accentMat);
        line.position.set(0, 0.032, zPos);
        line.receiveShadow = true;
        this.rugGroup.add(line);
      });
      const diamond = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.008, 0.75), accentMat);
      diamond.position.y = 0.032;
      diamond.rotation.y = Math.PI / 4;
      diamond.receiveShadow = true;
      this.rugGroup.add(diamond);
      return;
    }

    if (style.pattern === "boho") {
      const inner = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.034, 1.8, 3, 0.015), accentMat);
      inner.position.y = 0.017;
      inner.receiveShadow = true;
      const centerPatch = new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.038, 1.05, 2, 0.012), baseMat);
      centerPatch.position.y = 0.019;
      centerPatch.receiveShadow = true;
      this.rugGroup.add(inner, centerPatch);
      for (let i = -1.1; i <= 1.11; i += 0.22) {
        [-1.18, 1.18].forEach(zEdge => {
          const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.14), accentMat);
          tassel.position.set(i, 0.008, zEdge);
          this.rugGroup.add(tassel);
        });
      }
      return;
    }

    // Default classic border
    const innerStripe = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.034, 1.85, 3, 0.015), accentMat);
    innerStripe.position.y = 0.017;
    innerStripe.receiveShadow = true;
    this.rugGroup.add(innerStripe);
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

    // Cute rounded porcelain toilet + Upgradeable Japanese Smart Bidet Toilet
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

    // Inner recessed bowl opening visible when lid lifts up
    const basicBowlOpening = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.14, 0.014, 20),
      makeMat("#bae6fd", 0.18, 0.1)
    );
    basicBowlOpening.scale.set(1, 1, 1.18);
    basicBowlOpening.position.set(0, 0.468, 0.14);
    toilet.add(basicBowlOpening);

    const basicLidPivot = new THREE.Group();
    basicLidPivot.position.set(0, 0.49, -0.05);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.06, 0.52, 3, 0.03), makeMat("#ffffff", 0.18));
    lid.position.set(0, 0, 0.17);
    lid.castShadow = true;
    basicLidPivot.add(lid);
    this.basicToiletLidPivot = basicLidPivot;
    toilet.add(basicLidPivot);

    const tank = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.56, 0.24, 4, 0.07), ceramicMat);
    tank.position.set(0, 0.58, -0.2);
    tank.castShadow = true;
    toilet.add(tank);

    const flushBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), chromeMat);
    flushBtn.position.set(0, 0.87, -0.2);
    toilet.add(flushBtn);

    toilet.visible = !this.ownedItems.smart_toilet;
    this.basicToiletGroup = toilet;
    bathGroup.add(toilet);
    [ped, bowl, basicBowlOpening, lid, tank, flushBtn].forEach(m => this.addInteractive(m, "toilet"));

    // Smart Tankless Bidet Toilet upgrade
    const smartToilet = new THREE.Group();
    smartToilet.position.set(3.32, 0, -3.35);

    const smartBase = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.38, 0.72, 4, 0.14), ceramicMat);
    smartBase.position.set(0, 0.2, 0.02);
    smartBase.castShadow = true;
    smartToilet.add(smartBase);

    const smartRimGlow = new THREE.Mesh(
      new RoundedBoxGeometry(0.51, 0.035, 0.73, 3, 0.015),
      makeMat("#67e8f9", 0.25, 0.05, { emissive: "#38bdf8", emissiveIntensity: 0.75 })
    );
    smartRimGlow.position.set(0, 0.4, 0.02);
    smartToilet.add(smartRimGlow);

    const smartBowlOpening = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.14, 0.014, 20),
      makeMat("#bae6fd", 0.16, 0.1)
    );
    smartBowlOpening.scale.set(1, 1, 1.24);
    smartBowlOpening.position.set(0, 0.415, 0.08);
    smartToilet.add(smartBowlOpening);

    const smartLidPivot = new THREE.Group();
    smartLidPivot.position.set(0, 0.45, -0.22);
    const smartLid = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.07, 0.68, 4, 0.035), makeMat("#ffffff", 0.14));
    smartLid.position.set(0, 0, 0.24);
    smartLid.castShadow = true;
    smartLidPivot.add(smartLid);
    this.smartToiletLidPivot = smartLidPivot;
    smartToilet.add(smartLidPivot);

    const smartChrome = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.025, 0.05, 2, 0.01), chromeMat);
    smartChrome.position.set(0, 0.49, -0.22);
    smartToilet.add(smartChrome);

    const bidetPanel = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.04, 0.28, 2, 0.015), makeMat("#e2e8f0", 0.35));
    bidetPanel.position.set(-0.31, 0.42, 0.02);
    bidetPanel.castShadow = true;
    smartToilet.add(bidetPanel);

    const bidetLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.012, 0.16),
      new THREE.MeshBasicMaterial({ color: "#2dd4bf" })
    );
    bidetLed.position.set(-0.31, 0.445, 0.02);
    smartToilet.add(bidetLed);

    smartToilet.visible = Boolean(this.ownedItems.smart_toilet);
    this.smartToiletGroup = smartToilet;
    bathGroup.add(smartToilet);
    [smartBase, smartBowlOpening, smartLid, bidetPanel].forEach(m => this.addInteractive(m, "toilet"));

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
    bedGroup.position.set(3.00, 0, 2.25);
    this.bedGroup = bedGroup;
    this.furnitureGroup.add(bedGroup);

    const preset = resolveBedSheetStyle(this.bedSheetId);
    const woodMat = makeMat("#b98456", 0.58);
    this.bedSheetMat = makeMat(preset.sheetColor, 0.86);
    this.bedBlanketMat = makeMat(preset.blanketColor, 0.88);
    this.bedPillowMat = makeMat(preset.pillowColor, 0.9);
    const sheetMat = this.bedSheetMat;
    const blanketMat = this.bedBlanketMat;
    const pillowMat = this.bedPillowMat;

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

    [frame, headboard, mattress, blanket, pillow].forEach(m => this.addInteractive(m, "bed", "single_bed"));
    // Rebind after addInteractive() because addInteractive clones per-mesh materials for hover glow
    this.bedSheetMat = mattress.material;
    this.bedBlanketMat = blanket.material;
    this.bedPillowMat = pillow.material;
  }

  buildWorkDeskAndMac() {
    const deskRoot = new THREE.Group();
    deskRoot.position.set(-0.25, 0, -2.75);
    this.deskRootGroup = deskRoot;
    this.furnitureGroup.add(deskRoot);

    const workArea = new THREE.Group();
    workArea.position.set(0, 0, -0.19);
    deskRoot.add(workArea);

    const deskWood = makeMat("#cfa072", 0.52);
    const deskLegMat = makeMat("#4b5563", 0.45, 0.3);

    // Desk tabletop (rounded modern minimalist desk)
    const tableTop = new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.11, 1.12, 4, 0.045), deskWood);
    tableTop.position.set(0, 0.92, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    workArea.add(tableTop);
    // Assign deskTopMat AFTER addInteractive() because addInteractive clones mesh.material for hover glow!
    this.addInteractive(tableTop, "computer", "work_desk");
    this.deskTopMesh = tableTop;
    this.deskTopMat = tableTop.material;
    this.deskLegMat = deskLegMat;
    this.applyDeskStyleVisuals();

    if (this.deskLampLight) {
      this.deskLampLight.position.set(-0.85, 1.55, 0.10);
      workArea.add(this.deskLampLight);
    }
    if (this.screenGlowLight) {
      this.screenGlowLight.position.set(0, 1.48, 0.20);
      workArea.add(this.screenGlowLight);
    }

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
    const rgbMat = makeMat("#38bdf8", 0.2, 0.1, { emissive: "#ec4899", emissiveIntensity: 0.9 });
    this.coolRgbStripMat = rgbMat;
    const rgbStrip = new THREE.Mesh(
      new RoundedBoxGeometry(0.49, 0.008, 0.176, 1, 0.003),
      rgbMat
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

    // Shop item: Secondary Vertical Reference Monitor right beside iMac
    const dualGroup = new THREE.Group();
    dualGroup.position.set(0.68, 0.975, -0.22);
    dualGroup.rotation.y = -0.28;

    const dmBase = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.025, 0.16, 2, 0.01), aluMat);
    dmBase.position.set(0, 0.012, -0.02);
    dualGroup.add(dmBase);

    const dmPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 10), aluMat);
    dmPole.position.set(0, 0.22, -0.04);
    dualGroup.add(dmPole);

    const dmFrame = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.56, 0.04, 3, 0.02), bezelMat);
    dmFrame.position.set(0, 0.46, 0.02);
    dmFrame.castShadow = true;
    dualGroup.add(dmFrame);

    const dmScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.51),
      new THREE.MeshBasicMaterial({ map: makeRefScreenTexture() })
    );
    dmScreen.position.set(0, 0.46, 0.042);
    dualGroup.add(dmScreen);

    dualGroup.visible = Boolean(this.ownedItems.dual_monitor);
    this.dualMonitorGroup = dualGroup;
    workArea.add(dualGroup);
    [dmFrame, dmScreen].forEach(m => this.addInteractive(m, "computer"));

    // Shop item: Cute Desk Monstera Plant on back-right corner of desk
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0.98, 0.975, -0.28);
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
    plantGroup.children.forEach(m => this.addInteractive(m, "plant"));

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

    // Hover highlight ring around desk setup (child of deskRoot so it moves & rotates with desk)
    const ringGeo = new THREE.RingGeometry(0.95, 1.06, 36);
    this.workHoverRingMat = new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    const hoverRing = new THREE.Mesh(ringGeo, this.workHoverRingMat);
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.position.set(0, 0.02, 0.18);
    deskRoot.add(hoverRing);

    // Cozy Swivel Desk Chair (child of deskRoot)
    const chair = new THREE.Group();
    chair.position.set(0, 0, 0.43);
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

    chair.visible = !this.ownedItems.ergo_chair;
    this.chairGroup = chair;
    deskRoot.add(chair);
    this.addInteractive(chairSeat, "computer", "work_desk");
    this.addInteractive(chairBack, "computer", "work_desk");

    // Shop item: Ergonomic Studio Artist High-Back Chair (child of deskRoot)
    const ergoChair = new THREE.Group();
    ergoChair.position.set(0, 0, 0.43);
    const ergoMeshMat = makeMat("#4a6580", 0.72);
    const ergoLeatherMat = makeMat("#c98a55", 0.65);

    const eBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 5), chairMetal);
    eBase.position.y = 0.04;
    ergoChair.add(eBase);
    const ePole = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.42, 12), chairMetal);
    ePole.position.y = 0.24;
    ergoChair.add(ePole);

    const eSeat = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.14, 0.6, 4, 0.05), ergoLeatherMat);
    eSeat.position.set(0, 0.48, 0);
    eSeat.castShadow = true;
    ergoChair.add(eSeat);

    const eBack = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.68, 0.11, 4, 0.05), ergoMeshMat);
    eBack.position.set(0, 0.84, 0.26);
    eBack.rotation.x = 0.09;
    eBack.castShadow = true;
    ergoChair.add(eBack);

    const eHeadrest = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.17, 0.1, 3, 0.04), ergoLeatherMat);
    eHeadrest.position.set(0, 1.24, 0.29);
    eHeadrest.castShadow = true;
    ergoChair.add(eHeadrest);

    [-0.36, 0.36].forEach(ax => {
      const armPost = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.22, 0.06, 2, 0.015), chairMetal);
      armPost.position.set(ax, 0.56, 0);
      const armPad = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.05, 0.34, 2, 0.02), ergoMeshMat);
      armPad.position.set(ax, 0.68, -0.02);
      armPad.castShadow = true;
      ergoChair.add(armPost, armPad);
    });

    ergoChair.visible = Boolean(this.ownedItems.ergo_chair);
    this.ergoChairGroup = ergoChair;
    deskRoot.add(ergoChair);
    [eSeat, eBack, eHeadrest].forEach(m => this.addInteractive(m, "computer", "work_desk"));

    // Propagate movableId "work_desk" across all desk, chair, ergoChair, monitor, lamp, and plant meshes inside deskRoot
    deskRoot.traverse(obj => {
      if (obj.isMesh && !obj.userData.movableId) {
        obj.userData.movableId = "work_desk";
      }
    });
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
    this.coffeeProp = rig.coffeeProp;
    this.controllerProp = rig.controllerProp;
    this.controllerGripRz = rig.controllerGripRz ?? 0.46;

    this.roomGroup.add(this.charRoot);

    this.nameTagEl.textContent = (this.avatarConfig.name || bi("接案繪師", "Artist")).trim();
    if (this.charState === "WORKING") {
      this.charRoot.position.copy(this.deskWorkAnchor);
      this.charRoot.rotation.y = (this.deskRootGroup?.rotation.y || 0) + Math.PI;
    }
  }

  getSpotLabel(spot) {
    if (!spot) return "";
    return isEn() ? (spot.labelEn || spot.label) : spot.label;
  }

  refreshLanguage() {
    if (this.tvOverlayIframe) {
      this.tvOverlayIframe.title = bi("房間牆上電視 YouTube 即時播放", "Studio Wall TV YouTube Player");
    }
    if (this.nameTagEl) {
      this.nameTagEl.textContent = (this.avatarConfig.name || bi("接案繪師", "Artist")).trim();
    }
    this.updateParcelVisuals();
    if (this.editMode) {
      this.notifyEditModeState();
    }
    if (this.charState === "WORKING") {
      this.onActivityChange(bi("專心創作接案中", "Working on a commission"));
    } else {
      const spot = this.getActivitySpotById(this.currentActivity);
      if (spot) this.onActivityChange(this.getSpotLabel(spot));
    }
  }

  getActivitySpotById(activityId) {
    return this.chillSpots.find(s => s.id === activityId)
      || this.actionSpots[activityId]
      || this.chillSpots[0];
  }

  getSeededActivityRng(extraSalt = 0) {
    const timeBucket = Math.floor(Date.now() / 180000);
    const seed = ((this.persona?.seed || 1) ^ Math.imul(timeBucket, 0x9e3779b1) ^ extraSalt) >>> 0;
    return createSeededRng(seed);
  }

  getPlacedOwnedItems() {
    const rawOwned = this.ownedItems || {};
    const pending = this.pendingParcels || {};
    const placed = {};
    for (const [key, val] of Object.entries(rawOwned)) {
      if (val && !pending[key]) {
        placed[key] = val;
      }
    }
    return placed;
  }

  placeCharacterAtIdleStart(isNightTime = ((Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS) >= 0.5) {
    this.hideAllProps();
    const rng = this.getSeededActivityRng(0x3c6ef372);
    const startActivityId = pickPersonaWeightedActivity(
      this.persona,
      this.getPlacedOwnedItems(),
      isNightTime,
      null,
      rng
    );
    const startSpot = this.getActivitySpotById(startActivityId);
    const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
    const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
    const fullDur = minSec + rng() * spanSec;

    this.charState = "IDLE";
    this.targetActivityId = null;
    this.walkWaypoints = [];
    this.walkCallback = null;
    this.postCelebrateSpot = null;
    this.charRoot.position.copy(startSpot.pos);
    this.charRoot.rotation.y = startSpot.rotY;
    this.currentActivity = startSpot.id;
    this.activityTimer = Math.max(12, Math.round(fullDur * (0.25 + rng() * 0.72)));
    this.thoughtCooldown = 0.8 + rng() * 3.8;
    this.updateToiletLid(1);
    this.onActivityChange(this.getSpotLabel(startSpot));
  }

  exportCharacterRuntimeState() {
    return {
      charState: this.charState,
      currentActivity: this.currentActivity,
      targetActivityId: this.targetActivityId,
      activityTimer: this.activityTimer,
      postWorkCooldown: this.postWorkCooldown,
      thoughtCooldown: this.thoughtCooldown,
      postCelebrateSpotId: this.postCelebrateSpot?.id || null,
      walkWaypoints: (this.walkWaypoints || []).map(pt => pt.clone()),
      pos: this.charRoot ? this.charRoot.position.clone() : this.chillSpots[0].pos.clone(),
      rotY: this.charRoot ? this.charRoot.rotation.y : 0,
      toiletLidAngle: this.toiletLidAngle || 0,
      thoughtBags: Object.fromEntries(
        Object.entries(this.thoughtBags || {}).map(([k, v]) => [k, [...v]])
      ),
      lastThoughtByActivity: { ...(this.lastThoughtByActivity || {}) },
      lastSignatureThought: this.lastSignatureThought || "",
      rentMood: { ...(this.rentMood || {}) },
      savedAtMs: Date.now()
    };
  }

  applyCharacterRuntimeState(saved, isNightTime = ((Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS) >= 0.5) {
    if (!saved) {
      this.placeCharacterAtIdleStart(isNightTime);
      return;
    }
    this.hideAllProps();
    this.thoughtBags = Object.fromEntries(
      Object.entries(saved.thoughtBags || {}).map(([k, v]) => [k, [...v]])
    );
    this.lastThoughtByActivity = { ...(saved.lastThoughtByActivity || {}) };
    this.lastSignatureThought = saved.lastSignatureThought || "";
    this.rentMood = { ...(saved.rentMood || { status: "chill", daysLeft: 30, deficit: 0, paidThisMonth: false }) };
    this.postCelebrateSpot = saved.postCelebrateSpotId ? this.getActivitySpotById(saved.postCelebrateSpotId) : null;

    let elapsedSec = Math.min(1800, Math.max(0, (Date.now() - (saved.savedAtMs || Date.now())) / 1000));
    this.charState = saved.charState || "IDLE";
    this.currentActivity = saved.currentActivity || "phone";
    this.targetActivityId = saved.targetActivityId || null;
    this.activityTimer = Number.isFinite(saved.activityTimer) ? saved.activityTimer : IDLE_MIN_SEC;
    this.postWorkCooldown = Number.isFinite(saved.postWorkCooldown) ? saved.postWorkCooldown : 0;
    this.thoughtCooldown = Number.isFinite(saved.thoughtCooldown) ? saved.thoughtCooldown : 2.0;
    this.toiletLidAngle = Number.isFinite(saved.toiletLidAngle) ? saved.toiletLidAngle : 0;
    this.walkWaypoints = (saved.walkWaypoints || []).map(pt => pt.clone());
    this.walkCallback = null;

    if (this.charRoot && saved.pos) {
      this.charRoot.position.copy(saved.pos);
      this.charRoot.rotation.y = Number.isFinite(saved.rotY) ? saved.rotY : 0;
    }

    // Advance character simulation silently while viewer was away in another room
    if (elapsedSec > 1.5) {
      if (this.charState === "WALK_TO_WORK") {
        this.charRoot.position.copy(this.deskWorkAnchor);
        this.charRoot.rotation.y = (this.deskRootGroup?.rotation.y || 0) + Math.PI;
        this.charState = "WORKING";
        this.postWorkCooldown = Math.max(0, POST_WORK_COOLDOWN_SEC - Math.min(elapsedSec, 6));
        this.walkWaypoints = [];
        elapsedSec = Math.max(0, elapsedSec - 3);
      } else if (this.charState === "WALK_TO_ACTIVITY") {
        const spot = this.getActivitySpotById(this.targetActivityId);
        this.charState = "IDLE";
        this.currentActivity = spot.id;
        this.targetActivityId = null;
        this.walkWaypoints = [];
        this.charRoot.position.copy(spot.pos);
        this.charRoot.rotation.y = spot.rotY;
        const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
        const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
        this.activityTimer = minSec + Math.random() * spanSec;
        elapsedSec = Math.max(0, elapsedSec - 3);
      }

      if (this.charState === "WORKING") {
        if (this.postWorkCooldown > 0 && elapsedSec >= this.postWorkCooldown) {
          elapsedSec -= this.postWorkCooldown;
          this.postWorkCooldown = 0;
          const nextId = pickPersonaWeightedActivity(this.persona, this.getPlacedOwnedItems(), isNightTime, null);
          const nextSpot = this.getActivitySpotById(nextId);
          this.charState = "IDLE";
          this.currentActivity = nextSpot.id;
          this.charRoot.position.copy(nextSpot.pos);
          this.charRoot.rotation.y = nextSpot.rotY;
          const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
          const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
          this.activityTimer = minSec + Math.random() * spanSec;
        } else {
          this.postWorkCooldown = Math.max(0, this.postWorkCooldown - elapsedSec);
          elapsedSec = 0;
        }
      }

      let safetyRolls = 0;
      while (this.charState === "IDLE" && elapsedSec >= this.activityTimer && safetyRolls < 8) {
        elapsedSec -= Math.max(1, this.activityTimer);
        const nextId = (this.currentActivity === "work_celebrate" && this.postCelebrateSpot)
          ? this.postCelebrateSpot.id
          : pickPersonaWeightedActivity(this.persona, this.getPlacedOwnedItems(), isNightTime, this.currentActivity);
        this.postCelebrateSpot = null;
        const nextSpot = this.getActivitySpotById(nextId);
        this.currentActivity = nextSpot.id;
        this.charRoot.position.copy(nextSpot.pos);
        this.charRoot.rotation.y = nextSpot.rotY;
        const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
        const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
        this.activityTimer = minSec + Math.random() * spanSec;
        safetyRolls += 1;
      }
      if (this.charState === "IDLE") {
        this.activityTimer = Math.max(8, this.activityTimer - elapsedSec);
      }
    }

    // Rebuild walk callback if restored mid-walk
    if (this.charState === "WALK_TO_ACTIVITY" && this.targetActivityId) {
      const targetSpot = this.getActivitySpotById(this.targetActivityId);
      this.walkCallback = () => {
        this.charState = "IDLE";
        this.currentActivity = targetSpot.id;
        this.targetActivityId = null;
        const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
        const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
        this.activityTimer = minSec + Math.random() * spanSec;
        this.thoughtCooldown = 1.0 + Math.random() * 2.4;
        this.charRoot.position.copy(targetSpot.pos);
        this.charRoot.rotation.y = targetSpot.rotY;
        this.onActivityChange(this.getSpotLabel(targetSpot));
      };
    } else if (this.charState === "WALK_TO_WORK") {
      this.walkCallback = () => {
        this.enterWorkingPose();
        this.onEnterWork();
      };
    }

    this.thoughtCooldown = Math.max(0.8, Math.min(this.thoughtCooldown, 4.5));
    this.updateToiletLid(1);
    const activeSpot = this.getActivitySpotById(this.currentActivity);
    this.onActivityChange(this.charState === "WORKING" ? bi("專心創作接案中", "Working on a commission") : this.getSpotLabel(activeSpot));
  }

  setCharacterProfileContext({
    characterId,
    avatar,
    shirtStyle,
    pantsStyle,
    ownedItems,
    furnitureLayout,
    pendingParcels,
    customThoughts,
    spectating = false,
    rentMood = null
  } = {}) {
    const nextId = String(characterId || avatar?.name || this.activeCharacterId || "self").trim() || "self";
    this.spectating = Boolean(spectating);
    if (this.spectating && this.editMode) {
      this.exitFurnitureEditMode({ commit: false });
    }
    const isSwitching = nextId !== this.activeCharacterId;

    if (isSwitching) {
      this.characterStates.set(this.activeCharacterId, this.exportCharacterRuntimeState());
      this.hideBubble();
      this.hideAllProps();
      this.walkWaypoints = [];
      this.walkCallback = null;
      this.targetActivityId = null;
      this.activeCharacterId = nextId;
    }

    if (Array.isArray(customThoughts) && customThoughts !== this._lastCustomThoughtsRef) {
      this._lastCustomThoughtsRef = customThoughts;
      this.customThoughts = [...customThoughts];
    }
    this.ownedItems = { ...(ownedItems || this.ownedItems || {}) };
    if (pendingParcels !== undefined) {
      this.pendingParcels = normalizePendingParcels(pendingParcels, this.ownedItems);
    }
    if (furnitureLayout !== undefined && furnitureLayout && typeof furnitureLayout === "object") {
      this.furnitureLayout = { ...furnitureLayout };
    }
    this.applyOwnedItems(this.ownedItems);
    this.applyPendingParcels(this.pendingParcels);
    this.applyFurnitureLayout(this.furnitureLayout);
    const targetAvatar = {
      ...DEFAULT_AVATAR,
      ...(avatar || this.avatarConfig || {}),
      shirtStyle: shirtStyle || avatar?.shirtStyle || DEFAULT_SHIRT_STYLE,
      pantsStyle: pantsStyle || avatar?.pantsStyle || DEFAULT_PANTS_STYLE
    };
    this.persona = buildCharacterPersona(nextId, targetAvatar, this.ownedItems);

    if (isSwitching) {
      this.rebuildThoughtBank();
      this.buildCharacter(targetAvatar);
      const isNightTime = ((Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS) >= 0.5;
      if (this.characterStates.has(nextId)) {
        this.applyCharacterRuntimeState(this.characterStates.get(nextId), isNightTime);
      } else {
        this.placeCharacterAtIdleStart(isNightTime);
      }
      if (rentMood) {
        this.setRentMood(rentMood, { silent: true });
      }
    } else {
      this.updateAvatarConfig(targetAvatar);
      if (Array.isArray(customThoughts) && customThoughts === this._lastCustomThoughtsRef && !this._customThoughtsAppliedOnce) {
        this._customThoughtsAppliedOnce = true;
        this.rebuildThoughtBank();
      }
      if (rentMood) {
        this.setRentMood(rentMood);
      }
    }
    this.renderIfPaused();
  }

  updateAvatarConfig(nextConfig) {
    const prevPos = this.charRoot ? this.charRoot.position.clone() : this.chillSpots[0].pos.clone();
    const prevRot = this.charRoot ? this.charRoot.rotation.y : 0;
    const mergedCfg = {
      ...DEFAULT_AVATAR,
      ...(this.avatarConfig || {}),
      ...(nextConfig || {})
    };
    this.buildCharacter(mergedCfg);
    this.charRoot.position.copy(prevPos);
    this.charRoot.rotation.y = prevRot;
  }

  setShirtStyle(shirtStyleId) {
    const nextId = shirtStyleId || DEFAULT_SHIRT_STYLE;
    if (this.avatarConfig?.shirtStyle === nextId) return;
    this.updateAvatarConfig({ shirtStyle: nextId });
    this.renderIfPaused();
  }

  setPantsStyle(pantsStyleId) {
    const nextId = pantsStyleId || DEFAULT_PANTS_STYLE;
    if (this.avatarConfig?.pantsStyle === nextId) return;
    this.updateAvatarConfig({ pantsStyle: nextId });
    this.renderIfPaused();
  }

  setDeskLamp(isOn) {
    this.deskLampOn = Boolean(isOn);
    if (this.lampBulbMat) {
      this.lampBulbMat.emissiveIntensity = this.deskLampOn ? 1.6 : 0.0;
    }
    this.renderIfPaused();
  }

  setBedLamp(isOn) {
    this.bedLampOn = Boolean(isOn);
    if (this.bedLampBulbMat) {
      this.bedLampBulbMat.emissiveIntensity = this.bedLampOn ? 1.5 : 0.0;
    }
    if (this.bedLampShadeMat) {
      this.bedLampShadeMat.emissiveIntensity = this.bedLampOn ? 0.55 : 0.0;
    }
    this.renderIfPaused();
  }

  setArcLampBrass(isOn) {
    this.arcLampBrassOn = Boolean(isOn);
    const val = this.arcLampBrassOn ? 1.15 : 0.0;
    if (this.arcLampBrassDiffMat) this.arcLampBrassDiffMat.emissiveIntensity = val;
    if (this.arcLampBrassBulbMat) this.arcLampBrassBulbMat.emissiveIntensity = val;
    if (this.arcLampBrassDiffuser?.userData) this.arcLampBrassDiffuser.userData.baseEmissiveIntensity = val;
    if (this.arcLampBrassBulb?.userData) this.arcLampBrassBulb.userData.baseEmissiveIntensity = val;
    this.renderIfPaused();
  }

  setArcLampBlack(isOn) {
    this.arcLampBlackOn = Boolean(isOn);
    const val = this.arcLampBlackOn ? 1.2 : 0.0;
    if (this.arcLampBlackDiffMat) this.arcLampBlackDiffMat.emissiveIntensity = val;
    if (this.arcLampBlackInnerMat) this.arcLampBlackInnerMat.emissiveIntensity = val;
    if (this.arcLampBlackBottom?.userData) this.arcLampBlackBottom.userData.baseEmissiveIntensity = val;
    if (this.arcLampBlackInner?.userData) this.arcLampBlackInner.userData.baseEmissiveIntensity = val;
    this.renderIfPaused();
  }

  setWallColor(hex) {
    if (!hex) return;
    this.wallColorHex = hex;
    if (this.wallMat) {
      this.wallMat.color.set(hex);
    }
    this.renderIfPaused();
  }

  setBedSheet(bedSheetId) {
    this.bedSheetId = bedSheetId || DEFAULT_BED_SHEET;
    const preset = resolveBedSheetStyle(this.bedSheetId);
    if (this.bedSheetMat) this.bedSheetMat.color.set(preset.sheetColor);
    if (this.bedBlanketMat) this.bedBlanketMat.color.set(preset.blanketColor);
    if (this.bedPillowMat) this.bedPillowMat.color.set(preset.pillowColor);
    this.renderIfPaused();
  }

  setRugStyle(rugStyleId) {
    const nextId = rugStyleId || DEFAULT_RUG_STYLE;
    if (this.rugStyleId === nextId && this.rugGroup?.children?.length > 0) return;
    this.rugStyleId = nextId;
    this.rebuildRugMeshes();
    this.renderIfPaused();
  }

  applyFloorStyleVisuals() {
    const preset = resolveFloorStyle(this.floorStyleId);
    if (this.floorMesh?.material) {
      this.floorMesh.material.color.set(preset.baseColor || "#d8a774");
      this.floorMesh.material.roughness = preset.roughness ?? 0.62;
      this.floorMesh.material.metalness = preset.metalness ?? 0.04;
      this.floorMesh.material.needsUpdate = true;
    }
    const surfaceMat = this.floorSurfaceMesh?.material;
    if (!surfaceMat) return;
    if (this.floorSurfaceTex) {
      this.floorSurfaceTex.dispose();
      this.floorSurfaceTex = null;
    }
    const tex = createFloorPatternTexture(preset);
    if (tex) {
      this.floorSurfaceTex = tex;
      surfaceMat.map = tex;
      surfaceMat.color.set("#ffffff");
    } else {
      surfaceMat.map = null;
      surfaceMat.color.set(preset.baseColor || "#d8a774");
    }
    surfaceMat.roughness = preset.roughness ?? 0.62;
    surfaceMat.metalness = preset.metalness ?? 0.04;
    surfaceMat.needsUpdate = true;
  }

  setFloorStyle(floorStyleId) {
    const nextId = floorStyleId || DEFAULT_FLOOR_STYLE;
    if (this.floorStyleId === nextId && this.floorSurfaceTex) return;
    this.floorStyleId = nextId;
    this.applyFloorStyleVisuals();
    this.renderIfPaused();
  }

  applyDeskStyleVisuals() {
    const preset = resolveDeskStyle(this.deskStyleId);
    if (this.deskTopMat) {
      if (this.deskTopTex) {
        this.deskTopTex.dispose();
        this.deskTopTex = null;
      }
      const tex = createDeskTopTexture(preset);
      if (tex) {
        this.deskTopTex = tex;
        this.deskTopMat.map = tex;
        this.deskTopMat.color.set("#ffffff");
      } else {
        this.deskTopMat.map = null;
        this.deskTopMat.color.set(preset.topColor || "#cfa072");
      }
      this.deskTopMat.roughness = preset.roughness ?? 0.52;
      this.deskTopMat.metalness = preset.metalness ?? 0.02;
      this.deskTopMat.needsUpdate = true;
    }
    if (this.deskLegMat) {
      this.deskLegMat.color.set(preset.legColor || "#4b5563");
      this.deskLegMat.roughness = preset.legRoughness ?? 0.45;
      this.deskLegMat.metalness = preset.legMetalness ?? 0.30;
      this.deskLegMat.needsUpdate = true;
    }
  }

  setDeskStyle(deskStyleId) {
    const nextId = deskStyleId || DEFAULT_DESK_STYLE;
    if (this.deskStyleId === nextId && (nextId === DEFAULT_DESK_STYLE || this.deskTopTex)) return;
    this.deskStyleId = nextId;
    this.applyDeskStyleVisuals();
    this.renderIfPaused();
  }

  setVinylOn(isOn) {
    this.vinylOn = Boolean(isOn);
    if (this.vinylLedMat) {
      this.vinylLedMat.color.set(this.vinylOn ? "#fbbf24" : "#475569");
    }
    this.renderIfPaused();
  }

  handleSoldItemCleanup(itemId) {
    if (!itemId) return;
    if (itemId === "bed_lamp") this.setBedLamp(false);
    if (itemId === "arc_lamp_brass") this.setArcLampBrass(false);
    if (itemId === "arc_lamp_black") this.setArcLampBlack(false);
    if (itemId === "vinyl_player") this.setVinylOn(false);
    const affectedActivities = {
      hamster_cage: ["watch_hamster"],
      cozy_sofa: ["sofa_read", "sofa_tv"],
      wall_tv: ["watch_tv", "sofa_tv", "dolby_atmos"],
      dolby_atmos: ["dolby_atmos"],
      coffee_bar: ["coffee_break"],
      vinyl_player: ["listen_vinyl"],
      orange_cat: ["pet_cat"],
      coat_rack: ["check_coat"],
      floor_plant: ["water_floor_plant"],
      wall_poster: ["admire_poster"],
      desk_plant: ["water_plant"]
    }[itemId] || [];
    if (affectedActivities.includes(this.currentActivity) || affectedActivities.includes(this.targetActivityId)) {
      this.placeCharacterAtIdleStart();
    }
    this.renderIfPaused();
  }

  setPosterImage(dataUrl) {
    const nextUrl = typeof dataUrl === "string" ? dataUrl.trim() : "";
    const hasCustomApplied = Boolean(this.customPosterTex && this.posterArtMesh?.material?.map === this.customPosterTex);
    const hasDefaultApplied = Boolean(this.defaultPosterTex && this.posterArtMesh?.material?.map === this.defaultPosterTex);
    if (nextUrl === this.posterImageDataUrl && ((nextUrl && hasCustomApplied) || (!nextUrl && hasDefaultApplied))) {
      return;
    }
    this.posterImageDataUrl = nextUrl;
    const seq = ++this.posterLoadSeq;

    if (!nextUrl) {
      if (this.posterArtMesh && this.defaultPosterTex) {
        this.posterArtMesh.material.map = this.defaultPosterTex;
        this.posterArtMesh.material.needsUpdate = true;
      }
      if (this.customPosterTex) {
        this.customPosterTex.dispose();
        this.customPosterTex = null;
      }
      this.renderIfPaused();
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (this.disposed || seq !== this.posterLoadSeq || !this.posterArtMesh) return;
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const oldCustom = this.customPosterTex;
      this.customPosterTex = tex;
      this.posterArtMesh.material.map = tex;
      this.posterArtMesh.material.needsUpdate = true;
      if (oldCustom) oldCustom.dispose();
      this.renderIfPaused();
    };
    img.onerror = () => {
      if (this.disposed || seq !== this.posterLoadSeq || !this.posterArtMesh) return;
      if (this.defaultPosterTex) {
        this.posterArtMesh.material.map = this.defaultPosterTex;
        this.posterArtMesh.material.needsUpdate = true;
      }
      if (this.customPosterTex) {
        this.customPosterTex.dispose();
        this.customPosterTex = null;
      }
      this.renderIfPaused();
    };
    img.src = nextUrl;
  }

  admirePoster() {
    this.commandActivity(this.actionSpots.admire_poster, 12);
  }

  applyOwnedItems(ownedItems = {}) {
    this.ownedItems = { ...(ownedItems || {}) };
    this.pendingParcels = normalizePendingParcels(this.pendingParcels, this.ownedItems);
    const activePlaced = (id) => Boolean(this.ownedItems[id]) && !this.pendingParcels[id];
    const editingThis = (id) => Boolean(this.editMode && this.editSelectedId === id);

    if (this.wallPosterGroup) this.wallPosterGroup.visible = activePlaced("wall_poster") || editingThis("wall_poster");
    if (this.wallTvGroup) this.wallTvGroup.visible = activePlaced("wall_tv") || editingThis("wall_tv");
    if (this.sofaGroup) this.sofaGroup.visible = activePlaced("cozy_sofa") || editingThis("cozy_sofa");
    const atmosPlaced = Boolean(this.ownedItems.dolby_atmos) && !this.pendingParcels.dolby_atmos;
    if (this.atmosFrontGroup) {
      this.atmosFrontGroup.visible = (atmosPlaced && !this.editHiddenCompanions?.has("dolby_atmos"))
        || editingThis("dolby_atmos");
    }
    if (this.dolbyAtmosGroup) {
      this.dolbyAtmosGroup.visible = (atmosPlaced && !this.editHiddenCompanions?.has("dolby_atmos_rear"))
        || editingThis("dolby_atmos_rear");
    }
    if (this.bedLampGroup) this.bedLampGroup.visible = activePlaced("bed_lamp") || editingThis("bed_lamp");
    if (this.deskPlantGroup) this.deskPlantGroup.visible = Boolean(this.ownedItems.desk_plant);
    if (this.coolKeyboardGroup) this.coolKeyboardGroup.visible = Boolean(this.ownedItems.cool_keyboard);
    if (this.basicKeyboard) this.basicKeyboard.visible = !this.ownedItems.cool_keyboard;
    if (this.coatRackGroup) this.coatRackGroup.visible = activePlaced("coat_rack") || editingThis("coat_rack");
    if (this.floorPlantGroup) this.floorPlantGroup.visible = activePlaced("floor_plant") || editingThis("floor_plant");
    if (this.arcLampBrassGroup) this.arcLampBrassGroup.visible = activePlaced("arc_lamp_brass") || editingThis("arc_lamp_brass");
    if (this.arcLampBlackGroup) this.arcLampBlackGroup.visible = activePlaced("arc_lamp_black") || editingThis("arc_lamp_black");
    if (this.coffeeBarGroup) this.coffeeBarGroup.visible = activePlaced("coffee_bar") || editingThis("coffee_bar");
    if (this.vinylPlayerGroup) this.vinylPlayerGroup.visible = activePlaced("vinyl_player") || editingThis("vinyl_player");
    if (this.orangeCatGroup) this.orangeCatGroup.visible = activePlaced("orange_cat") || editingThis("orange_cat");
    if (this.hamsterCageGroup) this.hamsterCageGroup.visible = activePlaced("hamster_cage") || editingThis("hamster_cage");
    if (this.smartToiletGroup) this.smartToiletGroup.visible = Boolean(this.ownedItems.smart_toilet);
    if (this.basicToiletGroup) this.basicToiletGroup.visible = !this.ownedItems.smart_toilet;
    if (this.dualMonitorGroup) this.dualMonitorGroup.visible = Boolean(this.ownedItems.dual_monitor);
    if (this.ergoChairGroup) this.ergoChairGroup.visible = Boolean(this.ownedItems.ergo_chair);
    if (this.chairGroup) this.chairGroup.visible = !this.ownedItems.ergo_chair;
    this.updateParcelVisuals();
    this.renderIfPaused();
  }

  registerMovableFurniture() {
    this.movableGroups = {
      work_desk: this.deskRootGroup,
      single_bed: this.bedGroup,
      hamster_cage: this.hamsterCageGroup,
      coffee_bar: this.coffeeBarGroup,
      cozy_sofa: this.sofaGroup,
      coat_rack: this.coatRackGroup,
      vinyl_player: this.vinylPlayerGroup,
      orange_cat: this.orangeCatGroup,
      bed_lamp: this.bedLampGroup,
      floor_plant: this.floorPlantGroup,
      arc_lamp_brass: this.arcLampBrassGroup,
      arc_lamp_black: this.arcLampBlackGroup,
      wall_poster: this.wallPosterGroup,
      wall_tv: this.wallTvGroup,
      dolby_atmos: this.atmosFrontGroup,
      dolby_atmos_rear: this.dolbyAtmosGroup
    };
  }

  buildGridVisuals() {
    // 1. Floor 16x16 grid overlay (visible during Edit Mode)
    const floorGrid = new THREE.Group();
    floorGrid.visible = false;

    const linePts = [];
    for (let i = 0; i <= GRID_CELLS; i++) {
      const coord = -4.0 + i * GRID_STEP;
      linePts.push(-4.0, 0.045, coord, 4.0, 0.045, coord);
      linePts.push(coord, 0.045, -4.0, coord, 0.045, 4.0);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: "#334155", transparent: true, opacity: 0.32 });
    floorGrid.add(new THREE.LineSegments(lineGeo, lineMat));

    const reservedCellMat = new THREE.MeshBasicMaterial({
      color: "#ef4444",
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide
    });
    const cellGeo = new THREE.PlaneGeometry(GRID_STEP * 0.94, GRID_STEP * 0.94);
    for (let gx = 0; gx < GRID_CELLS; gx++) {
      for (let gz = 0; gz < GRID_CELLS; gz++) {
        if (!isFloorCellReserved(gx, gz)) continue;
        const m = new THREE.Mesh(cellGeo, reservedCellMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(-4.0 + (gx + 0.5) * GRID_STEP, 0.042, -4.0 + (gz + 0.5) * GRID_STEP);
        floorGrid.add(m);
      }
    }
    this.floorGridGroup = floorGrid;
    this.roomGroup.add(floorGrid);

    // 2. Wall placement grids mapped cleanly to each wall's upperGroup so cutaways work automatically
    this.wallGridPanels = {};
    const wallLineMat = new THREE.LineBasicMaterial({ color: "#2563eb", transparent: true, opacity: 0.36 });
    const wallBlockedMat = new THREE.MeshBasicMaterial({
      color: "#ef4444",
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const wallSlotGeo = new THREE.PlaneGeometry(GRID_STEP * 0.92, 1.35);

    WALL_NAMES.forEach(wallName => {
      const hostWall = this.wallsMap?.[wallName];
      if (!hostWall) return;
      const wg = new THREE.Group();
      wg.visible = false;
      const pts = [];
      for (let pos = 0; pos <= GRID_CELLS; pos++) {
        const off = -4.0 + pos * GRID_STEP;
        if (wallName === "north") pts.push(off, 0.95, -3.96, off, 2.45, -3.96);
        else if (wallName === "south") pts.push(off, 0.95, 3.96, off, 2.45, 3.96);
        else if (wallName === "west") pts.push(-3.96, 0.95, off, -3.96, 2.45, off);
        else pts.push(3.96, 0.95, off, 3.96, 2.45, off);
      }
      [0.95, 1.45, 1.95, 2.45].forEach(hy => {
        if (wallName === "north") pts.push(-4.0, hy, -3.96, 4.0, hy, -3.96);
        else if (wallName === "south") pts.push(-4.0, hy, 3.96, 4.0, hy, 3.96);
        else if (wallName === "west") pts.push(-3.96, hy, -4.0, -3.96, hy, 4.0);
        else pts.push(3.96, hy, -4.0, 3.96, hy, 4.0);
      });
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      wg.add(new THREE.LineSegments(wGeo, wallLineMat));

      for (let pos = 0; pos < GRID_CELLS; pos++) {
        if (!isWallCellReserved(wallName, pos)) continue;
        const wPos = wallPlacementToLocal("coat_rack", wallName, pos, 1.7);
        const bm = new THREE.Mesh(wallSlotGeo, wallBlockedMat);
        bm.position.set(wPos.x - wPos.normalX * 0.015, 1.7, wPos.z - wPos.normalZ * 0.015);
        bm.rotation.y = wPos.rotY;
        wg.add(bm);
      }

      this.wallGridPanels[wallName] = wg;
      hostWall.upperGroup.add(wg);
    });

    // 3. Footprint Ghost Pad + Wireframe Box for active furniture placement
    this.editPreviewMat = new THREE.MeshBasicMaterial({
      color: "#22c55e",
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    this.editPreviewOutlineMat = new THREE.LineBasicMaterial({ color: "#16a34a" });
    this.editPreviewGroup = new THREE.Group();
    this.editPreviewGroup.visible = false;
    this.editPreviewPad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.editPreviewMat);
    this.editPreviewPad.rotation.x = -Math.PI / 2;
    this.editPreviewBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.9, 1)),
      this.editPreviewOutlineMat
    );
    this.editPreviewBox.position.y = 0.45;
    this.editPreviewHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.9, 1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.editPreviewHitBox.position.y = 0.45;
    this.editPreviewGroup.add(this.editPreviewPad, this.editPreviewBox, this.editPreviewHitBox);
    this.roomGroup.add(this.editPreviewGroup);

    // Subtle ground highlight planes along inside of perimeter walls for wall raycasting
    this.wallPlanes = {
      north: new THREE.Plane(new THREE.Vector3(0, 0, 1), 3.98),
      east: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 3.98),
      south: new THREE.Plane(new THREE.Vector3(0, 0, -1), 3.98),
      west: new THREE.Plane(new THREE.Vector3(1, 0, 0), 3.98)
    };
  }

  updateParcelVisuals() {
    const count = Object.keys(this.pendingParcels || {}).length;
    if (this.parcelGroup) {
      this.parcelGroup.visible = count > 0;
      if (this.parcelBox1) this.parcelBox1.visible = count >= 1;
      if (this.parcelBox2) this.parcelBox2.visible = count >= 2;
      if (this.parcelBox3) this.parcelBox3.visible = count >= 3;
    }
    if (this.parcelBadgeEl) {
      if (count > 0 && !this.spectating && !this.editMode) {
        this.parcelBadgeEl.textContent = count > 1
          ? bi(`📦 貨到了！點擊拆箱擺放 (${count})`, `📦 Delivered! Click to Unbox (${count})`)
          : bi("📦 貨到了！點擊開箱擺放", "📦 Delivered! Click to Unbox");
        this.parcelBadgeEl.classList.remove("hidden");
      } else if (count > 0 && this.spectating) {
        this.parcelBadgeEl.textContent = bi(`📦 ${count} 件待拆包裹`, `📦 ${count} Unopened Parcel(s)`);
        this.parcelBadgeEl.classList.remove("hidden");
      } else {
        this.parcelBadgeEl.classList.add("hidden");
      }
    }
  }

  applyPendingParcels(rawPending = {}) {
    this.pendingParcels = normalizePendingParcels(rawPending, this.ownedItems);
    this.applyOwnedItems(this.ownedItems);
  }

  setOwnedAndParcels(ownedItems = {}, rawPending = {}) {
    this.ownedItems = { ...(ownedItems || {}) };
    this.pendingParcels = normalizePendingParcels(rawPending, this.ownedItems);
    this.applyOwnedItems(this.ownedItems);
  }

  applyFurnitureLayout(rawLayout = {}) {
    this.furnitureLayout = (rawLayout && typeof rawLayout === "object")
      ? { ...rawLayout }
      : {};
    const effective = resolveEffectiveLayout(this.ownedItems, this.furnitureLayout, this.pendingParcels);
    this.effectiveLayout = effective;

    for (const [id, group] of Object.entries(this.movableGroups || {})) {
      if (!group) continue;
      if (this.editMode && this.editSelectedId === id && this.editPreviewEntry) continue;
      const entry = effective[id] || DEFAULT_FURNITURE_LAYOUT[id];
      if (!entry) continue;
      if (entry.surface === "wall") {
        const wallY = id === "wall_poster" ? 1.92 : 1.56;
        const wPos = wallPlacementToLocal(id, entry.wall, entry.pos, wallY);
        const targetParent = this.wallsMap?.[entry.wall]?.upperGroup;
        if (targetParent && group.parent !== targetParent) {
          group.parent?.remove(group);
          targetParent.add(group);
        }
        group.position.set(wPos.x, wPos.y, wPos.z);
        group.rotation.y = wPos.rotY;
        if (id === "wall_tv") this.tvHostWallName = entry.wall;
        if (id === "wall_poster") this.posterHostWallName = entry.wall;
      } else {
        const w = floorPlacementToWorld(id, entry.gx, entry.gz, entry.rot);
        group.position.set(w.x, 0, w.z);
        group.rotation.y = w.rotY;
      }
    }

    this.syncDynamicLayoutAnchors();
    this.renderIfPaused();
  }

  syncDynamicLayoutAnchors() {
    const insidePt = (x, z) => new THREE.Vector3(
      THREE.MathUtils.clamp(x, -3.55, 3.55),
      0,
      THREE.MathUtils.clamp(z, -3.55, 3.55)
    );
    const localToWorld = (group, lx, lz) => {
      if (!group) return insidePt(lx, lz);
      group.updateWorldMatrix(true, false);
      const v = new THREE.Vector3(lx, 0, lz);
      group.localToWorld(v);
      return insidePt(v.x, v.z);
    };
    const pickSafeSideSpot = (group, candidates, rotOffset) => {
      for (const [lx, lz, extraRot] of candidates) {
        const wp = group ? (() => {
          group.updateWorldMatrix(true, false);
          const v = new THREE.Vector3(lx, 0, lz);
          group.localToWorld(v);
          return v;
        })() : new THREE.Vector3(lx, 0, lz);
        if (Math.abs(wp.x) <= 3.55 && Math.abs(wp.z) <= 3.55) {
          const clamped = this.clampWalkableFloorPoint(wp);
          if (clamped.distanceTo(wp) < 0.35) {
            return { pos: clamped, rotY: (group?.rotation.y || 0) + (extraRot ?? rotOffset) };
          }
        }
      }
      const fallback = this.clampWalkableFloorPoint(localToWorld(group, candidates[0][0], candidates[0][1]));
      return { pos: fallback, rotY: (group?.rotation.y || 0) + (candidates[0][2] ?? rotOffset) };
    };

    // Desk anchors
    if (this.deskRootGroup) {
      const workWorld = localToWorld(this.deskRootGroup, 0, 0.43);
      const exitWorld = this.clampWalkableFloorPoint(localToWorld(this.deskRootGroup, 0, 1.15));
      const plantWorld = pickSafeSideSpot(this.deskRootGroup, [[0.98, 0.58, Math.PI], [0, 1.15, Math.PI]], Math.PI);
      const deskRot = this.deskRootGroup.rotation.y + Math.PI;
      this.deskWorkAnchor.copy(workWorld);
      this.deskExitAnchor.copy(exitWorld);
      const readSpot = this.chillSpots.find(s => s.id === "read");
      const gameSpot = this.chillSpots.find(s => s.id === "gaming");
      if (readSpot) { readSpot.pos.copy(workWorld); readSpot.rotY = deskRot; }
      if (gameSpot) { gameSpot.pos.copy(workWorld); gameSpot.rotY = deskRot; }
      this.actionSpots.water_plant.pos.copy(plantWorld.pos);
      this.actionSpots.water_plant.rotY = plantWorld.rotY;
    }

    // Bed anchors
    if (this.bedGroup) {
      const bedRot = this.bedGroup.rotation.y;
      const sidePick = pickSafeSideSpot(this.bedGroup, [
        [-1.22, 0, -Math.PI / 2],
        [1.22, 0, Math.PI / 2],
        [0, -1.55, Math.PI]
      ], -Math.PI / 2);
      this.bedSideAnchor.copy(sidePick.pos);
      const sleepSpot = this.chillSpots.find(s => s.id === "sleep");
      if (sleepSpot) {
        sleepSpot.pos.copy(localToWorld(this.bedGroup, 0, -0.57));
        sleepSpot.rotY = bedRot + Math.PI;
      }
      const phoneSpot = this.chillSpots.find(s => s.id === "phone");
      if (phoneSpot) {
        const useRightSide = sidePick.pos.distanceTo(localToWorld(this.bedGroup, 1.22, 0)) < 0.6;
        phoneSpot.pos.copy(localToWorld(this.bedGroup, useRightSide ? 0.71 : -0.71, -0.10));
        phoneSpot.rotY = bedRot + (useRightSide ? Math.PI / 2 : -Math.PI / 2);
      }
    }

    // Sofa anchors
    if (this.sofaGroup) {
      const sofaRot = this.sofaGroup.rotation.y;
      const sofaSeatWorld = localToWorld(this.sofaGroup, 0, 0.08);
      this.sofaFrontAnchor.copy(this.clampWalkableFloorPoint(localToWorld(this.sofaGroup, 0, 0.84)));
      this.actionSpots.sofa_read.pos.copy(sofaSeatWorld);
      this.actionSpots.sofa_read.rotY = sofaRot;
      this.actionSpots.sofa_tv.pos.copy(sofaSeatWorld);
      this.actionSpots.sofa_tv.rotY = sofaRot;
    }

    // Floor decor spots
    if (this.hamsterCageGroup) {
      const p = pickSafeSideSpot(this.hamsterCageGroup, [[0, 0.76, Math.PI], [0.76, 0, -Math.PI / 2], [-0.76, 0, Math.PI / 2], [0, -0.76, 0]], Math.PI);
      this.actionSpots.watch_hamster.pos.copy(p.pos);
      this.actionSpots.watch_hamster.rotY = p.rotY;
    }
    if (this.coffeeBarGroup) {
      const p = pickSafeSideSpot(this.coffeeBarGroup, [[0, 0.62, Math.PI], [0, -0.62, 0], [0.75, 0, -Math.PI / 2]], Math.PI);
      this.actionSpots.coffee_break.pos.copy(p.pos);
      this.actionSpots.coffee_break.rotY = p.rotY;
    }
    if (this.vinylPlayerGroup) {
      const p = pickSafeSideSpot(this.vinylPlayerGroup, [[0, 0.65, Math.PI], [0, -0.65, 0]], Math.PI);
      this.actionSpots.listen_vinyl.pos.copy(p.pos);
      this.actionSpots.listen_vinyl.rotY = p.rotY;
    }
    if (this.orangeCatGroup) {
      const p = pickSafeSideSpot(this.orangeCatGroup, [[0, 0.68, Math.PI], [-0.68, 0, Math.PI / 2], [0.68, 0, -Math.PI / 2]], Math.PI);
      this.actionSpots.pet_cat.pos.copy(p.pos);
      this.actionSpots.pet_cat.rotY = p.rotY;
    }
    if (this.coatRackGroup) {
      const p = pickSafeSideSpot(this.coatRackGroup, [[0, 0.62, Math.PI], [0.62, 0, -Math.PI / 2], [-0.62, 0, Math.PI / 2], [0, -0.62, 0]], Math.PI);
      this.actionSpots.check_coat.pos.copy(p.pos);
      this.actionSpots.check_coat.rotY = p.rotY;
    }
    if (this.floorPlantGroup) {
      const p = pickSafeSideSpot(this.floorPlantGroup, [[-0.68, 0, Math.PI / 2], [0, 0.68, Math.PI], [0.68, 0, -Math.PI / 2], [0, -0.68, 0]], Math.PI / 2);
      this.actionSpots.water_floor_plant.pos.copy(p.pos);
      this.actionSpots.water_floor_plant.rotY = p.rotY;
    }

    // Wall item approach spots
    const eff = this.effectiveLayout || resolveEffectiveLayout(this.ownedItems, this.furnitureLayout, this.pendingParcels);
    const tvEntry = eff.wall_tv || DEFAULT_FURNITURE_LAYOUT.wall_tv;
    if (tvEntry) {
      const wp = wallPlacementToLocal("wall_tv", tvEntry.wall, tvEntry.pos, 1.56);
      const stand = this.clampWalkableFloorPoint(new THREE.Vector3(wp.x + wp.normalX * 1.15, 0, wp.z + wp.normalZ * 1.15));
      this.actionSpots.watch_tv.pos.copy(stand);
      this.actionSpots.watch_tv.rotY = Math.atan2(-wp.normalX, -wp.normalZ);
    }
    const postEntry = eff.wall_poster || DEFAULT_FURNITURE_LAYOUT.wall_poster;
    if (postEntry) {
      const wp = wallPlacementToLocal("wall_poster", postEntry.wall, postEntry.pos, 1.92);
      const stand = this.clampWalkableFloorPoint(new THREE.Vector3(wp.x + wp.normalX * 0.95, 0, wp.z + wp.normalZ * 0.95));
      this.actionSpots.admire_poster.pos.copy(stand);
      this.actionSpots.admire_poster.rotY = Math.atan2(-wp.normalX, -wp.normalZ);
    }

    // Clamp open-floor chill spots away from relocated furniture obstacles
    const exerciseSpot = this.chillSpots.find(s => s.id === "exercise");
    if (exerciseSpot) {
      exerciseSpot.pos.copy(this.clampWalkableFloorPoint(new THREE.Vector3(-0.55, 0, 0.72)));
    }
    const eatSpot = this.chillSpots.find(s => s.id === "eat");
    if (eatSpot) {
      eatSpot.pos.copy(this.clampWalkableFloorPoint(new THREE.Vector3(0.85, 0, 2.45)));
    }
  }

  openNextParcelBox() {
    if (this.spectating) return false;
    const ids = Object.keys(this.pendingParcels || {});
    if (ids.length === 0) return false;
    const nextId = ids[0];
    this.enterFurnitureEditMode({ itemId: nextId, fromParcel: true });
    return true;
  }

  ensureWallVisibleInCamera(wallName) {
    const visibleQuartersByWall = {
      north: [0, 3],
      east: [2, 3],
      south: [1, 2],
      west: [0, 1]
    };
    const allowed = visibleQuartersByWall[wallName];
    if (!allowed) return;
    const curQ = ((this.targetQuarter % 4) + 4) % 4;
    if (allowed.includes(curQ)) return;
    const dist = q => Math.min((q - curQ + 4) % 4, (curQ - q + 4) % 4);
    const nextQ = allowed.slice().sort((a, b) => dist(a) - dist(b))[0];
    this.targetQuarter = nextQ;
    this.updateCameraTransform(true);
    this.updateGridOverlayVisibility();
    this.renderIfPaused();
  }

  resetEditDragState() {
    this.editDragging = false;
    this.editDragMoved = false;
    this.editDragPending = null;
    this.editDragOffset = { wall: null, x: 0, z: 0, coord: 0 };
    this._editSuppressNextClick = false;
    this._editPointerDownHandled = false;
  }

  resetEditParcelSession() {
    this.editActiveParcelRoot = null;
    this.editParcelQueue = [];
    this.editHiddenCompanions = new Set();
    this.editParcelRollbackLayout = null;
  }

  enterFurnitureEditMode({ itemId = null, fromParcel = false } = {}) {
    if (this.spectating) return;
    this.editMode = true;
    this.layoutDirty = false;
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.resetEditDragState();
    this.resetEditParcelSession();
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.touchAction = "none";
    }
    this.updateParcelVisuals();
    if (itemId && fromParcel) {
      const units = getCompanionPlaceableIds(itemId);
      const queue = units.length > 0 ? [...units] : [itemId];
      const firstUnit = queue.shift();
      this.editActiveParcelRoot = itemId;
      this.editParcelQueue = queue;
      this.editHiddenCompanions = new Set(queue);
      this.editParcelRollbackLayout = { ...this.furnitureLayout };
      this.selectFurnitureForPlacement(firstUnit, { fromParcel: true, parcelRootId: itemId });
    } else if (itemId && PLACEABLE_FURNITURE_META[itemId]) {
      this.selectFurnitureForPlacement(itemId, { fromParcel });
    } else {
      this.updateGridOverlayVisibility();
      this.notifyEditModeState();
    }
    this.renderIfPaused();
  }

  exitFurnitureEditMode({ commit = true } = {}) {
    const incompleteParcel = Boolean(this.editActiveParcelRoot && this.editParcelQueue?.length > 0);
    if (commit && !incompleteParcel && this.editSelectedId && this.editPreviewEntry && this.editCanPlace && (this.editItemDirty || this.editHoldingFromParcel)) {
      const parcelRoot = this.editActiveParcelRoot
        || PLACEABLE_FURNITURE_META[this.editSelectedId]?.companionParcelKey
        || this.editSelectedId;
      this.furnitureLayout = {
        ...this.furnitureLayout,
        [this.editSelectedId]: { ...this.editPreviewEntry }
      };
      delete this.pendingParcels[parcelRoot];
      this.layoutDirty = true;
    } else if (this.editHoldingFromParcel || this.editActiveParcelRoot) {
      // Unfinished parcel (or queued multi-unit parcel) returned gently back into entrance box
      if (this.editParcelRollbackLayout) {
        this.furnitureLayout = { ...this.editParcelRollbackLayout };
      }
      const parcelRoot = this.editActiveParcelRoot
        || PLACEABLE_FURNITURE_META[this.editSelectedId]?.companionParcelKey
        || this.editSelectedId;
      if (parcelRoot) {
        this.pendingParcels[parcelRoot] = true;
      }
    }
    this.editMode = false;
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.resetEditDragState();
    this.resetEditParcelSession();
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.touchAction = "manipulation";
      this.renderer.domElement.style.cursor = "default";
    }
    if (this.editPreviewGroup) this.editPreviewGroup.visible = false;
    this.updateGridOverlayVisibility();
    this.applyOwnedItems(this.ownedItems);
    this.applyFurnitureLayout(this.furnitureLayout);
    // Safely keep idle character inside current updated bounds
    if (this.charState === "IDLE" && this.currentActivity && this.charRoot) {
      if (this.currentActivity === "floor_stand") {
        this.charRoot.position.copy(this.clampWalkableFloorPoint(this.charRoot.position));
      } else {
        const curSpot = this.getActivitySpotById(this.currentActivity);
        if (curSpot) {
          this.charRoot.position.copy(curSpot.pos);
          this.charRoot.rotation.y = curSpot.rotY;
        }
      }
    }
    if (commit && this.layoutDirty) {
      this.layoutDirty = false;
      this.onSaveLayout({
        furnitureLayout: { ...this.furnitureLayout },
        pendingParcels: { ...this.pendingParcels }
      });
    }
    this.notifyEditModeState();
    this.renderIfPaused();
  }

  selectFurnitureForPlacement(itemId, { fromParcel = false, parcelRootId = null } = {}) {
    const meta = PLACEABLE_FURNITURE_META[itemId];
    if (!meta || !this.editMode) return false;
    const ownerKey = meta.ownerKey || itemId;
    if (!meta.starter && this.ownedItems?.[ownerKey] !== true) return false;

    this.editDragging = false;
    this.editDragMoved = false;
    this.editDragPending = null;
    this.editDragOffset = { wall: null, x: 0, z: 0, coord: 0 };
    this.editItemDirty = false;
    this.editSelectedId = itemId;
    this.editHoldingFromParcel = Boolean(fromParcel);
    if (this.editHiddenCompanions) {
      this.editHiddenCompanions.delete(itemId);
    }
    if (this.editHoldingFromParcel && !this.editActiveParcelRoot) {
      this.editActiveParcelRoot = parcelRootId || meta.companionParcelKey || itemId;
    }

    const excludes = this.editHiddenCompanions?.size ? [...this.editHiddenCompanions] : null;
    const eff = resolveEffectiveLayout(this.ownedItems, this.furnitureLayout, this.pendingParcels);
    let startEntry = (!this.editHoldingFromParcel && eff[itemId])
      || findFirstValidPlacement(itemId, this.ownedItems, this.furnitureLayout, this.pendingParcels, excludes);
    if (!startEntry) {
      startEntry = { ...DEFAULT_FURNITURE_LAYOUT[itemId] };
    }
    this.editPreviewRot = startEntry.rot ?? 0;
    this.editPreviewEntry = { ...startEntry };
    if (this.editHoldingFromParcel) {
      const parcelRoot = this.editActiveParcelRoot || meta.companionParcelKey || itemId;
      delete this.pendingParcels[parcelRoot];
    }
    this.applyOwnedItems(this.ownedItems);
    if (meta.surface === "wall" && startEntry.wall) {
      this.ensureWallVisibleInCamera(startEntry.wall);
    }
    this.updateGridOverlayVisibility();
    this.updateEditPreviewMesh();
    this.notifyEditModeState(meta.name);
    this.renderIfPaused();
    return true;
  }

  rotateEditingFurniture(delta = 1) {
    if (!this.editMode || !this.editSelectedId) return;
    const meta = PLACEABLE_FURNITURE_META[this.editSelectedId];
    if (!meta) return;
    if (meta.surface === "wall") {
      // Cycle visible or all walls smoothly clockwise/counter-clockwise when holding wall item
      const curWall = this.editPreviewEntry?.wall || "north";
      const idx = WALL_NAMES.indexOf(curWall);
      const nextWall = WALL_NAMES[(idx + (delta >= 0 ? 1 : 3)) % WALL_NAMES.length];
      let nextPos = this.editPreviewEntry?.pos ?? 2;
      if (nextPos + meta.gridW > GRID_CELLS) nextPos = GRID_CELLS - meta.gridW;
      if (!canPlaceWallItem(this.editSelectedId, nextWall, nextPos, this.ownedItems, this.furnitureLayout, this.pendingParcels, this.editHiddenCompanions?.size ? [...this.editHiddenCompanions] : null)) {
        for (let p = 0; p <= GRID_CELLS - meta.gridW; p++) {
          if (canPlaceWallItem(this.editSelectedId, nextWall, p, this.ownedItems, this.furnitureLayout, this.pendingParcels, this.editHiddenCompanions?.size ? [...this.editHiddenCompanions] : null)) {
            nextPos = p;
            break;
          }
        }
      }
      this.editPreviewEntry = { surface: "wall", wall: nextWall, pos: nextPos };
      this.ensureWallVisibleInCamera(nextWall);
    } else {
      this.editPreviewRot = ((this.editPreviewRot + (delta >= 0 ? 1 : 3)) % 4 + 4) % 4;
      const curGx = this.editPreviewEntry?.gx ?? 0;
      const curGz = this.editPreviewEntry?.gz ?? 0;
      const { w, d } = getRotatedDims(this.editSelectedId, this.editPreviewRot);
      this.editPreviewEntry = {
        surface: "floor",
        gx: THREE.MathUtils.clamp(curGx, 0, Math.max(0, GRID_CELLS - w)),
        gz: THREE.MathUtils.clamp(curGz, 0, Math.max(0, GRID_CELLS - d)),
        rot: this.editPreviewRot
      };
    }
    this.editItemDirty = true;
    this.updateEditPreviewMesh();
    this.notifyEditModeState(meta.name);
    this.renderIfPaused();
  }

  putEditingParcelBack() {
    if (!this.editMode || !this.editSelectedId) return;
    if (this.editHoldingFromParcel) {
      const parcelRoot = this.editActiveParcelRoot
        || PLACEABLE_FURNITURE_META[this.editSelectedId]?.companionParcelKey
        || this.editSelectedId;
      if (this.editParcelRollbackLayout) {
        this.furnitureLayout = { ...this.editParcelRollbackLayout };
      }
      this.pendingParcels[parcelRoot] = true;
    }
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.resetEditParcelSession();
    this.exitFurnitureEditMode({ commit: true });
  }

  cancelEditingFurniture() {
    if (!this.editMode) return false;
    if (!this.editSelectedId) {
      this.exitFurnitureEditMode({ commit: true });
      return true;
    }
    if (this.editHoldingFromParcel) {
      this.putEditingParcelBack();
      return true;
    }
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.resetEditDragState();
    if (this.editPreviewGroup) this.editPreviewGroup.visible = false;
    this.applyFurnitureLayout(this.furnitureLayout);
    this.updateGridOverlayVisibility();
    this.notifyEditModeState();
    this.renderIfPaused();
    return true;
  }

  resetFurnitureLayout() {
    if (this.spectating) return;
    this.furnitureLayout = {};
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.layoutDirty = false;
    this.resetEditDragState();
    this.applyOwnedItems(this.ownedItems);
    this.applyFurnitureLayout(this.furnitureLayout);
    this.updateGridOverlayVisibility();
    this.updateEditPreviewMesh();
    this.onSaveLayout({
      furnitureLayout: {},
      pendingParcels: { ...this.pendingParcels }
    });
    this.notifyEditModeState();
    this.renderIfPaused();
  }

  updateGridOverlayVisibility() {
    const showFloor = Boolean(
      this.editMode
      && (!this.editSelectedId || PLACEABLE_FURNITURE_META[this.editSelectedId]?.surface === "floor")
    );
    const showWall = Boolean(
      this.editMode
      && this.editSelectedId
      && PLACEABLE_FURNITURE_META[this.editSelectedId]?.surface === "wall"
    );
    if (this.floorGridGroup) this.floorGridGroup.visible = showFloor;
    if (this.wallGridPanels) {
      WALL_NAMES.forEach(wName => {
        const panel = this.wallGridPanels[wName];
        const wallObj = this.wallsMap?.[wName];
        if (panel) panel.visible = Boolean(showWall && (wallObj ? wallObj.upperGroup.visible : true));
      });
    }
  }

  updateEditPreviewMesh() {
    if (!this.editMode || !this.editSelectedId || !this.editPreviewEntry) {
      if (this.editPreviewGroup) this.editPreviewGroup.visible = false;
      return;
    }
    const id = this.editSelectedId;
    const meta = PLACEABLE_FURNITURE_META[id];
    const entry = this.editPreviewEntry;
    const group = this.movableGroups?.[id];

    const excludes = this.editHiddenCompanions?.size ? [...this.editHiddenCompanions] : null;
    if (meta.surface === "wall") {
      this.editCanPlace = canPlaceWallItem(
        id,
        entry.wall,
        entry.pos,
        this.ownedItems,
        this.furnitureLayout,
        this.pendingParcels,
        excludes
      );
      const wallY = id === "wall_poster" ? 1.92 : 1.56;
      const wPos = wallPlacementToLocal(id, entry.wall, entry.pos, wallY);
      if (group) {
        const targetParent = this.wallsMap?.[entry.wall]?.upperGroup;
        if (targetParent && group.parent !== targetParent) {
          group.parent?.remove(group);
          targetParent.add(group);
        }
        group.visible = true;
        group.position.set(wPos.x, wPos.y, wPos.z);
        group.rotation.y = wPos.rotY;
      }
      if (id === "wall_tv") {
        this.tvHostWallName = entry.wall;
        this.updateTvScreenOverlay();
      }
      this.editPreviewGroup.visible = true;
      this.editPreviewGroup.position.set(wPos.x + wPos.normalX * 0.04, wallY, wPos.z + wPos.normalZ * 0.04);
      this.editPreviewGroup.rotation.y = wPos.rotY;
      this.editPreviewPad.rotation.set(0, 0, 0);
      this.editPreviewPad.position.set(0, 0, 0.02);
      this.editPreviewPad.scale.set(meta.gridW * GRID_STEP, id === "wall_tv" ? 0.96 : 1.24, 1);
      this.editPreviewBox.position.set(0, 0, 0.04);
      this.editPreviewBox.scale.set(meta.gridW * GRID_STEP, id === "wall_tv" ? 0.96 : 1.24, 0.16);
    } else {
      this.editCanPlace = canPlaceFloorItem(
        id,
        entry.gx,
        entry.gz,
        entry.rot,
        this.ownedItems,
        this.furnitureLayout,
        this.pendingParcels,
        excludes
      );
      const w = floorPlacementToWorld(id, entry.gx, entry.gz, entry.rot);
      if (group) {
        group.visible = true;
        group.position.set(w.x, 0.05, w.z);
        group.rotation.y = w.rotY;
      }
      this.editPreviewGroup.visible = true;
      this.editPreviewGroup.position.set(w.x, 0.049, w.z);
      this.editPreviewGroup.rotation.y = 0;
      this.editPreviewPad.rotation.set(-Math.PI / 2, 0, 0);
      this.editPreviewPad.position.set(0, 0, 0);
      this.editPreviewPad.scale.set(w.w * GRID_STEP * 0.97, w.d * GRID_STEP * 0.97, 1);
      this.editPreviewBox.position.set(0, 0.45, 0);
      this.editPreviewBox.scale.set(w.w * GRID_STEP * 0.97, 1.0, w.d * GRID_STEP * 0.97);
    }

    if (this.editPreviewHitBox) {
      this.editPreviewHitBox.position.copy(this.editPreviewBox.position);
      this.editPreviewHitBox.scale.copy(this.editPreviewBox.scale);
    }

    const col = this.editCanPlace ? 0x22c55e : 0xef4444;
    const outlineCol = this.editCanPlace ? 0x16a34a : 0xdc2626;
    this.editPreviewMat.color.setHex(col);
    this.editPreviewOutlineMat.color.setHex(outlineCol);
  }

  commitActiveFurniturePlacement() {
    if (!this.editMode || !this.editSelectedId || !this.editPreviewEntry || !this.editCanPlace) {
      return false;
    }
    const id = this.editSelectedId;
    const wasParcel = this.editHoldingFromParcel;
    const parcelRoot = this.editActiveParcelRoot
      || PLACEABLE_FURNITURE_META[id]?.companionParcelKey
      || id;
    this.furnitureLayout = {
      ...this.furnitureLayout,
      [id]: { ...this.editPreviewEntry }
    };
    this.layoutDirty = false;
    this.editSelectedId = null;
    this.editHoldingFromParcel = false;
    this.editPreviewEntry = null;
    this.editCanPlace = false;
    this.editItemDirty = false;
    this.editDragging = false;
    this.editDragMoved = false;
    this.editDragPending = null;
    this.editDragOffset = { wall: null, x: 0, z: 0, coord: 0 };
    if (this.editPreviewGroup) this.editPreviewGroup.visible = false;

    if (wasParcel && this.editParcelQueue?.length > 0) {
      const nextUnitId = this.editParcelQueue.shift();
      this.applyOwnedItems(this.ownedItems);
      this.applyFurnitureLayout(this.furnitureLayout);
      this.selectFurnitureForPlacement(nextUnitId, { fromParcel: true, parcelRootId: parcelRoot });
      return true;
    }

    if (wasParcel) {
      delete this.pendingParcels[parcelRoot];
    }
    this.resetEditParcelSession();
    this.applyOwnedItems(this.ownedItems);
    this.applyFurnitureLayout(this.furnitureLayout);
    this.updateGridOverlayVisibility();
    this.onSaveLayout({
      furnitureLayout: { ...this.furnitureLayout },
      pendingParcels: { ...this.pendingParcels }
    });

    if (wasParcel && Object.keys(this.pendingParcels).length === 0) {
      // Automatically return cleanly to room play right after placing the newly unboxed item
      this.exitFurnitureEditMode({ commit: false });
    } else if (wasParcel && Object.keys(this.pendingParcels).length > 0) {
      this.openNextParcelBox();
    } else {
      this.notifyEditModeState();
    }
    this.renderIfPaused();
    return true;
  }

  notifyEditModeState(hoverName = "") {
    const meta = this.editSelectedId ? PLACEABLE_FURNITURE_META[this.editSelectedId] : null;
    this.onEditModeChange({
      active: this.editMode,
      selectedId: this.editSelectedId,
      selectedName: this.editSelectedId ? getPlaceableFurnitureName(this.editSelectedId) : "",
      surface: meta?.surface || "floor",
      gridDims: meta
        ? (meta.surface === "wall"
            ? bi(`${meta.gridW} 格牆面`, `${meta.gridW} wall cells`)
            : bi(`${meta.gridW}×${meta.gridD} 格地面`, `${meta.gridW}×${meta.gridD} floor cells`))
        : "",
      canPlace: this.editCanPlace,
      fromParcel: this.editHoldingFromParcel,
      pendingParcelCount: Object.keys(this.pendingParcels || {}).length,
      hoverName
    });
  }

  getEditRaycastHit() {
    const movableHits = this.raycaster.intersectObjects(this.allInteractTargets, false);
    const visibleMovableHit = movableHits.find(h => {
      if (!h.object?.userData?.movableId) return false;
      let obj = h.object;
      while (obj) {
        if (!obj.visible) return false;
        obj = obj.parent;
      }
      return true;
    }) || null;

    let hitActivePreview = false;
    if (this.editSelectedId && this.editPreviewGroup?.visible) {
      const previewTargets = [this.editPreviewHitBox, this.editPreviewPad].filter(Boolean);
      const pHits = this.raycaster.intersectObjects(previewTargets, false);
      hitActivePreview = pHits.length > 0;
    }
    return {
      movableId: visibleMovableHit?.object?.userData?.movableId || null,
      interactType: visibleMovableHit?.object?.userData?.interactType || null,
      hitActivePreview
    };
  }

  startEditDragPending(e, itemId) {
    const meta = PLACEABLE_FURNITURE_META[itemId];
    const entry = this.editPreviewEntry;
    let offset = { wall: null, x: 0, z: 0, coord: 0 };
    if (meta && entry) {
      if (meta.surface === "wall") {
        const wallName = entry.wall;
        const plane = this.wallPlanes?.[wallName];
        const wHit = new THREE.Vector3();
        if (plane && this.raycaster.ray.intersectPlane(plane, wHit)) {
          const hitCoord = (wallName === "north" || wallName === "south") ? wHit.x : wHit.z;
          const curCoord = -4.0 + (entry.pos + meta.gridW * 0.5) * GRID_STEP;
          offset = {
            wall: wallName,
            coord: THREE.MathUtils.clamp(curCoord - hitCoord, -1.5, 1.5),
            x: 0,
            z: 0
          };
        }
      } else {
        const fHit = new THREE.Vector3();
        if (this.floorPlane && this.raycaster.ray.intersectPlane(this.floorPlane, fHit)) {
          const w = floorPlacementToWorld(itemId, entry.gx, entry.gz, entry.rot);
          offset = {
            wall: null,
            coord: 0,
            x: THREE.MathUtils.clamp(w.x - fHit.x, -2.5, 2.5),
            z: THREE.MathUtils.clamp(w.z - fHit.z, -2.5, 2.5)
          };
        }
      }
    }
    this.editDragOffset = offset;
    this.editDragMoved = false;
    this.editDragging = false;
    this.editDragPending = {
      id: itemId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      clickedEmpty: false
    };
    try {
      this.renderer?.domElement?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore unsupported synthetic pointer capture
    }
  }

  raycastEditGridTarget(useDragOffset = true) {
    if (!this.editMode || !this.editSelectedId) return false;
    const meta = PLACEABLE_FURNITURE_META[this.editSelectedId];
    if (!meta) return false;
    const prev = this.editPreviewEntry;

    if (meta.surface === "wall") {
      let bestWall = null;
      let bestDist = Infinity;
      let bestHit = null;
      for (const wallName of WALL_NAMES) {
        if (!this.wallsMap?.[wallName]?.upperGroup?.visible) continue;
        const plane = this.wallPlanes?.[wallName];
        if (!plane) continue;
        const pt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, pt)) {
          const coord = (wallName === "north" || wallName === "south") ? pt.x : pt.z;
          if (coord >= -4.2 && coord <= 4.2 && pt.y >= 0.4 && pt.y <= 3.1) {
            const d = pt.distanceTo(this.camera.position);
            if (d < bestDist) {
              bestDist = d;
              bestWall = wallName;
              bestHit = pt;
            }
          }
        }
      }
      if (bestWall && bestHit) {
        const coord = (bestWall === "north" || bestWall === "south") ? bestHit.x : bestHit.z;
        const wallOffset = (useDragOffset && bestWall === this.editDragOffset?.wall)
          ? (this.editDragOffset.coord || 0)
          : 0;
        const rawPos = Math.round((coord + wallOffset + 4.0) / GRID_STEP - meta.gridW * 0.5);
        const clampedPos = THREE.MathUtils.clamp(rawPos, 0, GRID_CELLS - meta.gridW);
        if (!prev || prev.wall !== bestWall || prev.pos !== clampedPos) {
          this.editItemDirty = true;
        }
        this.editPreviewEntry = { surface: "wall", wall: bestWall, pos: clampedPos };
        this.updateEditPreviewMesh();
        this.notifyEditModeState(meta.name);
        return true;
      }
      return false;
    }

    const pt = new THREE.Vector3();
    if (this.floorPlane && this.raycaster.ray.intersectPlane(this.floorPlane, pt)) {
      const offX = useDragOffset ? (this.editDragOffset?.x || 0) : 0;
      const offZ = useDragOffset ? (this.editDragOffset?.z || 0) : 0;
      const { w, d } = getRotatedDims(this.editSelectedId, this.editPreviewRot);
      const rawGx = Math.round(((pt.x + offX) + 4.0) / GRID_STEP - w * 0.5);
      const rawGz = Math.round(((pt.z + offZ) + 4.0) / GRID_STEP - d * 0.5);
      const gx = THREE.MathUtils.clamp(rawGx, 0, Math.max(0, GRID_CELLS - w));
      const gz = THREE.MathUtils.clamp(rawGz, 0, Math.max(0, GRID_CELLS - d));
      if (!prev || prev.gx !== gx || prev.gz !== gz || prev.rot !== this.editPreviewRot) {
        this.editItemDirty = true;
      }
      this.editPreviewEntry = { surface: "floor", gx, gz, rot: this.editPreviewRot };
      this.updateEditPreviewMesh();
      this.notifyEditModeState(meta.name);
      return true;
    }
    return false;
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

  setCameraZoom(zoom, { instant = false } = {}) {
    const numeric = Number(zoom);
    const nextZoom = THREE.MathUtils.clamp(
      Number.isFinite(numeric) ? numeric : 1.0,
      this.minCameraZoom,
      this.maxCameraZoom
    );
    this.targetCameraZoom = Math.round(nextZoom * 100) / 100;
    if ((instant || this.paused) && this.camera) {
      this.cameraZoom = this.targetCameraZoom;
      this.camera.zoom = this.cameraZoom;
      this.camera.updateProjectionMatrix();
      this.updateOverlayPositions();
      this.renderIfPaused();
    }
    this.onZoomChange(this.targetCameraZoom);
    return this.targetCameraZoom;
  }

  adjustCameraZoom(delta = 0.15) {
    return this.setCameraZoom(this.targetCameraZoom + delta, { instant: true });
  }

  resetCameraZoom() {
    return this.setCameraZoom(1.0, { instant: true });
  }

  getCameraZoom() {
    return this.targetCameraZoom;
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
      this.showBubble(bi("💡 靈感來了！", "💡 Inspiration struck!"), 1600);
    }

    // Immediate snappy walk straight to desk chair
    this.charState = "WALK_TO_WORK";
    this.currentActivity = "walking";
    this.targetActivityId = null;
    this.hideBubble();
    this.onActivityChange(bi("快步前往書桌準備接案...", "Heading to desk to start working..."));
    this.postCelebrateSpot = null;
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
    if (this.isOnSofa(this.charRoot.position)) {
      this.charRoot.position.copy(this.sofaFrontAnchor);
    }

    this.walkWaypoints = this.buildPathTo("work", this.deskWorkAnchor);
    this.walkCallback = () => {
      this.enterWorkingPose();
      this.onEnterWork();
    };
  }

  pickCelebrateLeisureSpot() {
    const owned = this.getPlacedOwnedItems();
    const options = [];
    if (owned.orange_cat) options.push(this.actionSpots.pet_cat);
    if (owned.hamster_cage) options.push(this.actionSpots.watch_hamster);
    if (owned.cozy_sofa && owned.wall_tv) options.push(this.actionSpots.sofa_tv);
    if (owned.vinyl_player) options.push(this.actionSpots.listen_vinyl);
    if (owned.coffee_bar) options.push(this.actionSpots.coffee_break);
    if (owned.wall_tv && !owned.cozy_sofa) options.push(this.actionSpots.watch_tv);
    if (owned.cozy_sofa) options.push(this.actionSpots.sofa_read);
    const gamingSpot = this.chillSpots.find(s => s.id === "gaming");
    const eatSpot = this.chillSpots.find(s => s.id === "eat");
    if (gamingSpot) options.push(gamingSpot);
    if (eatSpot) options.push(eatSpot);
    return options[Math.floor(Math.random() * options.length)] || this.chillSpots[0];
  }

  setRentMood(mood = {}, { silent = false } = {}) {
    const prevStatus = this.rentMood?.status || "chill";
    const status = String(mood.status || "chill");
    this.rentMood = {
      status,
      daysLeft: Number.isFinite(Number(mood.daysLeft)) ? Number(mood.daysLeft) : 30,
      deficit: Math.max(0, Math.trunc(Number(mood.deficit) || 0)),
      paidThisMonth: Boolean(mood.paidThisMonth)
    };
    if (silent) return;
    if (status === "urgent" && prevStatus !== "urgent" && this.charState === "IDLE" && this.currentActivity !== "sleep") {
      this.showBubble(this.pickRandomThought("rent_urgent"), 4800);
      this.thoughtCooldown = 7;
    } else if (status === "paid" && prevStatus === "urgent" && this.charState === "IDLE" && this.currentActivity !== "sleep") {
      this.showBubble(this.pickRandomThought("rent_paid"), 4600);
      this.thoughtCooldown = 7;
    }
  }

  returnFromWork(celebrationType = "none") {
    this.hideAllProps();
    this.postCelebrateSpot = null;
    if (this.macScreenMat) {
      this.macScreenMat.map = this.artScreenTex;
      this.macScreenMat.needsUpdate = true;
    }
    this.walkWaypoints = [];
    this.walkCallback = null;
    this.targetActivityId = null;
    this.toiletLidAngle = 0;

    if (celebrationType === "submitted" || celebrationType === "approved") {
      this.postCelebrateSpot = this.pickCelebrateLeisureSpot();
      this.charState = "IDLE";
      this.currentActivity = "work_celebrate";
      this.activityTimer = 2.6;
      this.thoughtCooldown = 12;
      this.charRoot.position.copy(this.deskExitAnchor);
      this.charRoot.rotation.y = -0.25;
      const activityMsg = celebrationType === "approved"
        ? bi("🎉 甲方驗收發薪！歡呼一下準備開啟下班耍廢時間！", "🎉 Client approved payout! Cheering & off-work break!")
        : bi("🎉 完成交稿啦！舉手歡呼準備下班放鬆一下！", "🎉 Submitted! Cheering & unwinding after work!");
      const bubbleMsg = celebrationType === "approved"
        ? "Case approved!! Clams & XP earned! 🎉✨"
        : "Case submitted! Off-work time!! 🎉";
      this.onActivityChange(activityMsg);
      this.showBubble(bubbleMsg, 4600);
      return;
    }

    // Character remains sitting and working at the Mac for ~13 seconds before getting up
    this.charState = "WORKING";
    this.postWorkCooldown = POST_WORK_COOLDOWN_SEC;
    this.thoughtCooldown = 1.4 + Math.random() * 1.6;
    this.charRoot.position.copy(this.deskWorkAnchor);
    this.charRoot.rotation.y = (this.deskRootGroup?.rotation.y || 0) + Math.PI;
    this.onActivityChange(bi("正在電繪板前收尾創作（稍後休息）", "Finishing artwork on tablet (break soon)"));
  }

  enterWorkingPose() {
    this.charState = "WORKING";
    this.postWorkCooldown = POST_WORK_COOLDOWN_SEC;
    this.thoughtCooldown = 1.4 + Math.random() * 1.6;
    this.charRoot.position.copy(this.deskWorkAnchor);
    this.charRoot.rotation.y = (this.deskRootGroup?.rotation.y || 0) + Math.PI;
    this.onActivityChange(bi("專心創作接案中", "Working on a commission"));
  }

  rebuildThoughtBank() {
    this.thoughtBank = Object.fromEntries(
      Object.entries(THOUGHT_BANK).map(([k, v]) => [k, [...v]])
    );
    if (Array.isArray(this.customThoughts) && this.customThoughts.length > 0) {
      this.applyCustomThoughts(this.customThoughts, { record: false });
    }
    const personaLines = this.persona?.thoughtsByActivity || {};
    for (const [activity, lines] of Object.entries(personaLines)) {
      if (!Array.isArray(lines) || lines.length === 0) continue;
      const existing = this.thoughtBank[activity] || [];
      this.thoughtBank[activity] = [...new Set([...lines, ...existing])];
    }
    this.thoughtBags = {};
    this.lastThoughtByActivity = {};
  }

  applyCustomThoughts(rows = [], { record = true } = {}) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    if (record) {
      this.customThoughts = [...rows];
    }
    const grouped = {};
    for (const row of rows) {
      const activity = String(row?.activity || "").trim();
      const text = String(row?.text || "").trim();
      if (!activity || !text) continue;
      const enabledRaw = String(row?.enabled ?? "true").trim().toLowerCase();
      if (["false", "0", "no", "off", "停用"].includes(enabledRaw)) continue;
      if (!grouped[activity]) grouped[activity] = [];
      grouped[activity].push(text);
    }
    const personaLines = this.persona?.thoughtsByActivity || {};
    for (const [activity, lines] of Object.entries(grouped)) {
      if (lines.length > 0) {
        const extra = Array.isArray(personaLines[activity]) ? personaLines[activity] : [];
        this.thoughtBank[activity] = [...new Set([...extra, ...lines])];
        if (this.thoughtBags) {
          delete this.thoughtBags[activity];
        }
      }
    }
  }

  pickRandomThought(activityKey) {
    let resolvedKey = (activityKey === "toilet" && this.ownedItems?.smart_toilet)
      ? "smart_toilet"
      : activityKey;
    if (resolvedKey === "sofa_tv" && this.ownedItems?.dolby_atmos && Math.random() < 0.55) {
      resolvedKey = "dolby_atmos";
    }
    const sigLines = this.persona?.signatureThoughts;
    if (
      Array.isArray(sigLines)
      && sigLines.length > 0
      && !["sleep", "rent_urgent", "rent_paid", "work_celebrate", "dolby_atmos"].includes(resolvedKey)
      && Math.random() < 0.24
    ) {
      const candidates = sigLines.filter(line => line !== this.lastSignatureThought);
      const pickPool = candidates.length > 0 ? candidates : sigLines;
      const sigLine = pickPool[Math.floor(Math.random() * pickPool.length)];
      this.lastSignatureThought = sigLine;
      return sigLine;
    }
    const bank = this.thoughtBank?.[resolvedKey] || THOUGHT_BANK[resolvedKey];
    if (!bank || bank.length === 0) return "";
    let bag = this.thoughtBags[resolvedKey];
    if (!bag || bag.length === 0) {
      bag = [...bank];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const prevLine = this.lastThoughtByActivity[resolvedKey];
      if (bag.length > 1 && bag[bag.length - 1] === prevLine) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      this.thoughtBags[resolvedKey] = bag;
    }
    const chosen = bag.pop();
    this.lastThoughtByActivity[resolvedKey] = chosen;
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
    if (this.coffeeProp) this.coffeeProp.visible = false;
    if (this.controllerProp) this.controllerProp.visible = false;
  }

  isInBathroom(pos = this.charRoot?.position) {
    if (!pos) return false;
    return pos.x > 1.50 && pos.z < -1.50;
  }

  isOnBed(pos = this.charRoot?.position) {
    if (!pos) return false;
    if (this.bedGroup) {
      this.bedGroup.updateWorldMatrix(true, false);
      const local = pos.clone();
      this.bedGroup.worldToLocal(local);
      return Math.abs(local.x) <= 0.92 && Math.abs(local.z) <= 1.28;
    }
    return pos.x >= 1.75 && pos.x <= 3.55 && pos.z >= 0.75 && pos.z <= 3.35;
  }

  isOnSofa(pos = this.charRoot?.position) {
    if (!pos) return false;
    if (this.sofaGroup) {
      this.sofaGroup.updateWorldMatrix(true, false);
      const local = pos.clone();
      this.sofaGroup.worldToLocal(local);
      return Math.abs(local.x) <= 0.95 && Math.abs(local.z) <= 0.52;
    }
    return pos.x >= -2.26 && pos.x <= -1.25 && pos.z >= -1.25 && pos.z <= 0.55;
  }

  isNearDesk(pos = this.charRoot?.position) {
    if (!pos) return false;
    if (this.deskRootGroup) {
      this.deskRootGroup.updateWorldMatrix(true, false);
      const local = pos.clone();
      this.deskRootGroup.worldToLocal(local);
      return Math.abs(local.x) <= 1.4 && local.z >= -0.9 && local.z <= 1.25;
    }
    return pos.z < -1.7 && pos.x < 1.3 && pos.x > -1.6;
  }

  clampWalkableFloorPoint(rawPt) {
    let x = THREE.MathUtils.clamp(rawPt.x, -3.55, 3.55);
    let z = THREE.MathUtils.clamp(rawPt.z, -3.55, 3.55);

    // Fixed bathroom walls/fixtures + dynamic grid blockers for every placed floor furniture item
    const blockers = [
      { minX: 1.32, maxX: 1.74, minZ: -3.95, maxZ: -2.28 }, // Bath frosted West partition
      { minX: 2.38, maxX: 3.95, minZ: -1.72, maxZ: -1.30 }, // Bath frosted South partition
      { minX: 1.80, maxX: 2.66, minZ: -3.95, maxZ: -3.02 }, // Sink
      { minX: 2.88, maxX: 3.88, minZ: -3.95, maxZ: -2.84 }  // Toilet
    ];
    const eff = this.effectiveLayout || resolveEffectiveLayout(this.ownedItems, this.furnitureLayout, this.pendingParcels);
    for (const [id, entry] of Object.entries(eff)) {
      if (entry.surface !== "floor") continue;
      if (this.editMode && this.editSelectedId === id) continue;
      const box = getFloorFootprintWorldBox(id, entry);
      if (!box) continue;
      const pad = 0.08;
      blockers.push({
        minX: box.minX - pad,
        maxX: box.maxX + pad,
        minZ: box.minZ - pad,
        maxZ: box.maxZ + pad
      });
    }

    for (let pass = 0; pass < 2; pass++) {
      for (const b of blockers) {
        if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) {
          const candidates = [
            { nx: b.minX, nz: z, d: Math.abs(x - b.minX) },
            { nx: b.maxX, nz: z, d: Math.abs(b.maxX - x) },
            { nx: x, nz: b.minZ, d: Math.abs(z - b.minZ) },
            { nx: x, nz: b.maxZ, d: Math.abs(b.maxZ - z) }
          ].sort((a, c) => a.d - c.d);
          x = THREE.MathUtils.clamp(candidates[0].nx, -3.55, 3.55);
          z = THREE.MathUtils.clamp(candidates[0].nz, -3.55, 3.55);
        }
      }
    }
    return new THREE.Vector3(x, 0, z);
  }

  walkToFloorPoint(rawPt) {
    if (!rawPt || !this.charRoot) return;
    const dest = this.clampWalkableFloorPoint(rawPt);
    if (this.walkTargetRing && this.walkTargetRingMat) {
      this.walkTargetRing.position.set(dest.x, 0.044, dest.z);
      this.walkTargetRing.scale.set(1, 1, 1);
      this.walkTargetRingMat.opacity = 0.85;
      this.walkRippleActive = true;
      this.walkRippleAge = 0;
    }

    const dx = dest.x - this.charRoot.position.x;
    const dz = dest.z - this.charRoot.position.z;
    const rotY = (Math.hypot(dx, dz) > 0.08)
      ? Math.atan2(dx, dz)
      : this.charRoot.rotation.y;

    this.commandActivity({
      id: "floor_stand",
      label: "走到指定地板位置中",
      labelEn: "Walking to selected floor spot",
      pos: dest,
      rotY
    }, 52);
  }

  buildPathTo(spotId, targetPos) {
    const rawWaypoints = [];
    const curPos = this.charRoot.position.clone();
    const currentlyInBath = this.isInBathroom(curPos);
    const currentlyOnBed = this.isOnBed(curPos);
    const currentlyOnSofa = this.isOnSofa(curPos);
    const currentlyNearDesk = this.isNearDesk(curPos);
    const currentlyNearToilet = currentlyInBath && curPos.x > 2.85 && curPos.z < -2.45;

    if (curPos.distanceTo(targetPos) < 0.25) {
      return [targetPos.clone()];
    }

    const targetInBath = spotId === "wash" || spotId === "toilet" || this.isInBathroom(targetPos);
    const targetOnBed = spotId === "sleep" || spotId === "phone";
    const targetOnSofa = spotId === "sofa_read" || spotId === "sofa_tv";
    const targetNearDesk = spotId === "work" || spotId === "gaming" || spotId === "water_plant" || spotId === "read";

    // 1. Exit any enclosed or furniture-occupied zone cleanly based on 3D coords
    if (currentlyOnBed && !targetOnBed) {
      rawWaypoints.push(this.bedSideAnchor.clone());
    } else if (currentlyOnSofa && !targetOnSofa) {
      rawWaypoints.push(this.sofaFrontAnchor.clone());
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

    // Determine effective entry anchor for cross-room routing
    let entryPt = targetPos;
    if (targetInBath && !currentlyInBath) entryPt = this.bathOutsideAnchor;
    else if (targetNearDesk && !currentlyNearDesk) entryPt = this.deskExitAnchor;
    else if (targetOnBed && !currentlyOnBed) entryPt = this.bedSideAnchor;
    else if (targetOnSofa && !currentlyOnSofa) entryPt = this.sofaFrontAnchor;

    // 2. Route safely around default sofa position (-2.26..-1.25, -1.25..0.55) only when sofa is placed there
    const startPt = rawWaypoints.length > 0 ? rawWaypoints[rawWaypoints.length - 1] : curPos;
    const isWestSofaSide = (p) => p.x < -1.9 && p.z > -1.4 && p.z < 0.72;
    const isEastInterior = (p) => p.x > -1.45 && p.z < 2.6;
    const sofaBlocking = Boolean(
      this.sofaGroup?.visible
      && !this.pendingParcels?.cozy_sofa
      && this.sofaGroup.position.distanceTo(new THREE.Vector3(-1.78, 0, -0.35)) < 0.75
    );
    if (sofaBlocking && isWestSofaSide(startPt) && isEastInterior(entryPt)) {
      rawWaypoints.push(this.sofaCorridorWest.clone());
      rawWaypoints.push(this.sofaCorridorEast.clone());
    } else if (sofaBlocking && isEastInterior(startPt) && isWestSofaSide(entryPt)) {
      rawWaypoints.push(this.sofaCorridorEast.clone());
      rawWaypoints.push(this.sofaCorridorWest.clone());
    }

    // 3. Route across open room hub when crossing long diagonal spans
    if (!(currentlyInBath && targetInBath) && !(currentlyOnBed && targetOnBed) && !(currentlyOnSofa && targetOnSofa)) {
      const fromPt = rawWaypoints.length > 0 ? rawWaypoints[rawWaypoints.length - 1] : curPos;
      if (
        fromPt.distanceTo(entryPt) > 2.5 &&
        fromPt.distanceTo(this.centerAnchor) > 0.6 &&
        entryPt.distanceTo(this.centerAnchor) > 0.6 &&
        !isWestSofaSide(fromPt) &&
        !isWestSofaSide(entryPt)
      ) {
        rawWaypoints.push(this.centerAnchor.clone());
      }
    }

    // 4. Enter target zone cleanly
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
    } else if (targetOnSofa && !currentlyOnSofa) {
      rawWaypoints.push(this.sofaFrontAnchor.clone());
    }

    // 5. Deduplicate consecutive points near curPos / each other, then append final target
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
    const isSofaTarget = spot.id === "sofa_read" || spot.id === "sofa_tv";
    if (!isBedTarget && this.isOnBed(this.charRoot.position)) {
      this.charRoot.position.copy(this.bedSideAnchor);
    }
    if (!isSofaTarget && this.isOnSofa(this.charRoot.position)) {
      this.charRoot.position.copy(this.sofaFrontAnchor);
    }

    let walkDest = spot.pos;
    if (isBedTarget && !this.isOnBed(this.charRoot.position)) {
      walkDest = this.bedSideAnchor;
    } else if (isSofaTarget && !this.isOnSofa(this.charRoot.position)) {
      walkDest = this.sofaFrontAnchor;
    }

    this.charState = "WALK_TO_ACTIVITY";
    this.currentActivity = "walking";
    this.targetActivityId = spot.id;
    this.hideBubble();
    this.walkWaypoints = this.buildPathTo(spot.id, walkDest);
    this.walkCallback = () => {
      this.charState = "IDLE";
      this.currentActivity = spot.id;
      this.targetActivityId = null;
      this.activityTimer = durationSec;
      this.thoughtCooldown = 1.2 + Math.random() * 2.2;
      this.charRoot.position.copy(spot.pos);
      this.charRoot.rotation.y = spot.rotY;
      this.onActivityChange(this.getSpotLabel(spot));
    };
  }

  getNextIdleDurationSec() {
    const minSec = this.persona?.idleMinSec ?? IDLE_MIN_SEC;
    const spanSec = this.persona?.idleSpanSec ?? IDLE_SPAN_SEC;
    return minSec + Math.random() * spanSec;
  }

  getNextThoughtCooldownSec(baseBonus = 0) {
    const minSec = this.persona?.thoughtMinSec ?? 8.5;
    const spanSec = this.persona?.thoughtSpanSec ?? 7.5;
    return minSec + baseBonus + Math.random() * spanSec;
  }

  pickNextIdleActivity(isNightTime) {
    const chosenId = pickPersonaWeightedActivity(
      this.persona,
      this.getPlacedOwnedItems(),
      isNightTime,
      this.currentActivity,
      Math.random
    );
    const spot = this.getActivitySpotById(chosenId);
    this.commandActivity(spot, this.getNextIdleDurationSec());
  }

  updateDayNightLighting() {
    const now = Date.now();
    // 0.0 -> 0.5 is 15-min Day; 0.5 -> 1.0 is 15-min Night (continuous C^1 cycle)
    const phase = (now % DAY_CYCLE_MS) / DAY_CYCLE_MS;
    const sample = sampleDayNightCycle(phase);
    const { from, to, alpha, isNight } = sample;

    if (!this._tmpColorA) {
      this._tmpColorA = new THREE.Color();
      this._tmpColorB = new THREE.Color();
    }
    const blendColorTo = (hexA, hexB, targetColor) => {
      this._tmpColorA.set(hexA);
      this._tmpColorB.set(hexB);
      targetColor.copy(this._tmpColorA).lerp(this._tmpColorB, alpha);
    };

    blendColorTo(from.sunColor, to.sunColor, this.sunLight.color);
    this.sunLight.intensity = sample.sunIntensity;
    blendColorTo(from.hemiSky, to.hemiSky, this.hemiLight.color);
    blendColorTo(from.hemiGround, to.hemiGround, this.hemiLight.groundColor);
    this.hemiLight.intensity = sample.hemiIntensity;
    blendColorTo(from.bg, to.bg, this.scene.background);

    if (this.windowSkyMat) {
      blendColorTo(from.sky, to.sky, this.windowSkyMat.color);
    }

    // Continuous smooth 24h orbital sun/moon light sweep (zero shadow jumps)
    this.sunLight.position.set(sample.sunX, sample.sunY, sample.sunZ);

    // Warm desk lamp & bed lamp smoothly grow richer as outdoor ambient darkness rises
    if (this.deskLampLight) {
      const deskIntensity = THREE.MathUtils.lerp(2.3, 5.0, sample.darkness);
      this.deskLampLight.intensity = this.deskLampOn ? deskIntensity : 0;
    }
    if (this.bedLampLight) {
      const lampOwned = Boolean(this.bedLampGroup?.visible);
      const bedIntensity = THREE.MathUtils.lerp(1.0, 2.6, sample.darkness);
      this.bedLampLight.intensity = (lampOwned && this.bedLampOn) ? bedIntensity : 0;
    }
    if (this.arcLampBrassLight) {
      const brassOwned = Boolean(this.arcLampBrassGroup?.visible);
      const brassIntensity = THREE.MathUtils.lerp(1.1, 3.0, sample.darkness);
      this.arcLampBrassLight.intensity = (brassOwned && this.arcLampBrassOn) ? brassIntensity : 0;
    }
    if (this.arcLampBlackLight) {
      const blackOwned = Boolean(this.arcLampBlackGroup?.visible);
      const blackIntensity = THREE.MathUtils.lerp(1.1, 3.1, sample.darkness);
      this.arcLampBlackLight.intensity = (blackOwned && this.arcLampBlackOn) ? blackIntensity : 0;
    }

    // Map 0..1 phase to 24h clock starting at 06:00 sunrise
    const totalMinutes = Math.floor(((phase + 0.25) % 1.0) * 1440);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    this.onTimeUpdate({ clockText: `${hh}:${mm}`, label: sample.label, isNight });
    return isNight;
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

    if (Math.abs(this.targetCameraZoom - this.cameraZoom) > 0.001) {
      this.cameraZoom = instant
        ? this.targetCameraZoom
        : (this.cameraZoom + (this.targetCameraZoom - this.cameraZoom) * 0.22);
      if (Math.abs(this.targetCameraZoom - this.cameraZoom) <= 0.001) {
        this.cameraZoom = this.targetCameraZoom;
      }
      if (this.camera) {
        this.camera.zoom = this.cameraZoom;
        this.camera.updateProjectionMatrix();
      }
    }

    // Cutaway Auto-Invisibility: hide the 2 perimeter walls facing closest to camera
    const camDir = new THREE.Vector3(camX, 0, camZ).normalize();
    const wallEditActive = Boolean(
      this.editMode
      && this.editSelectedId
      && PLACEABLE_FURNITURE_META[this.editSelectedId]?.surface === "wall"
    );
    this.walls.forEach(w => {
      const facingCamera = w.normal.dot(camDir) > 0.05;
      w.upperGroup.visible = !facingCamera;
      if (this.wallGridPanels?.[w.name]) {
        this.wallGridPanels[w.name].visible = Boolean(wallEditActive && w.upperGroup.visible);
      }
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

  updateToiletLid(dt) {
    const toiletSpotPos = this.actionSpots?.toilet?.pos;
    const isApproachingToilet = Boolean(
      this.charState === "WALK_TO_ACTIVITY"
      && this.targetActivityId === "toilet"
      && toiletSpotPos
      && this.charRoot?.position
      && this.charRoot.position.distanceTo(toiletSpotPos) < 1.15
    );
    const shouldOpen = this.currentActivity === "toilet" || isApproachingToilet;
    const targetAngle = shouldOpen ? -Math.PI * 0.46 : 0;
    const step = 1 - Math.exp(-10 * Math.max(0.001, dt || 0.016));
    this.toiletLidAngle += (targetAngle - this.toiletLidAngle) * step;
    if (Math.abs(targetAngle - this.toiletLidAngle) < 0.004) {
      this.toiletLidAngle = targetAngle;
    }
    if (this.basicToiletLidPivot) {
      this.basicToiletLidPivot.rotation.x = this.toiletLidAngle;
    }
    if (this.smartToiletLidPivot) {
      this.smartToiletLidPivot.rotation.x = this.toiletLidAngle;
    }
  }

  updateCharacter(dt, rawElapsedSec, isNightTime) {
    const elapsedSec = (rawElapsedSec + (this.persona?.animPhaseOffset || 0)) * (this.persona?.energyRate || 1.0);
    this.resetLimbs();
    this.updateToiletLid(dt);

    if (this.charState === "WALK_TO_WORK" || this.charState === "WALK_TO_ACTIVITY") {
      const target = this.walkWaypoints[0];
      if (!target) {
        this.walkCallback?.();
        return;
      }
      const delta = target.clone().sub(this.charRoot.position);
      delta.y = 0;
      const dist = delta.length();
      const baseSpeed = this.charState === "WALK_TO_WORK" ? 7.2 : 3.2;
      const speed = baseSpeed * (this.persona?.walkSpeedScale || 1.0);

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
        this.thoughtCooldown = this.getNextThoughtCooldownSec();
      }
      return;
    }

    // IDLE autonomous activities
    this.activityTimer -= dt;
    if (this.activityTimer <= 0) {
      if (this.currentActivity === "work_celebrate" && this.postCelebrateSpot) {
        const nextSpot = this.postCelebrateSpot;
        this.postCelebrateSpot = null;
        this.commandActivity(nextSpot, this.getNextIdleDurationSec());
        return;
      }
      this.pickNextIdleActivity(isNightTime);
      return;
    }

    this.thoughtCooldown -= dt;
    if (this.thoughtCooldown <= 0) {
      let thoughtKey = this.currentActivity;
      if (
        this.rentMood?.status === "urgent"
        && this.currentActivity !== "sleep"
        && this.currentActivity !== "work_celebrate"
        && Math.random() < 0.48
      ) {
        thoughtKey = "rent_urgent";
      } else if (
        this.rentMood?.status === "paid"
        && (this.currentActivity === "floor_stand" || this.currentActivity === "coffee_break")
        && Math.random() < 0.4
      ) {
        thoughtKey = "rent_paid";
      }
      this.showBubble(this.pickRandomThought(thoughtKey), 4200);
      this.thoughtCooldown = this.getNextThoughtCooldownSec(1.0);
    }

    switch (this.currentActivity) {
      case "gaming": {
        if (this.controllerProp) this.controllerProp.visible = true;
        const tilt = Math.sin(elapsedSec * 7.5) * 0.06;
        const roll = Math.cos(elapsedSec * 5.2) * 0.07;
        this.charBody.position.set(0, -0.22, -0.04);
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.set(-1.05 + tilt + roll * 0.5, 0, this.controllerGripRz);
        this.rightArmPivot.rotation.set(-1.05 + tilt - roll * 0.5, 0, -this.controllerGripRz);
        if (this.controllerProp) {
          this.controllerProp.position.set(0, 0.785 - tilt * 0.18, 0.34);
          this.controllerProp.rotation.set(-0.46 + tilt, 0, roll);
        }
        this.headGroup.rotation.x = 0.1 + Math.sin(elapsedSec * 2.2) * 0.03;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 3.5) * 0.1;
        break;
      }
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
        // Sitting comfortably in desk chair reading a book at the desk
        this.bookProp.visible = true;
        this.charBody.position.set(0, -0.22, -0.04);
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.x = -0.68;
        this.rightArmPivot.rotation.x = -0.72;
        this.headGroup.rotation.x = 0.28 + Math.sin(elapsedSec * 1.5) * 0.04;
        break;
      case "sofa_read":
        // Leaning back cozily on sofa holding a book
        this.bookProp.visible = true;
        this.charBody.position.set(0, 0.05, 0.06);
        this.charBody.rotation.x = -0.22;
        this.leftLegPivot.rotation.x = -Math.PI / 2.2;
        this.rightLegPivot.rotation.x = -Math.PI / 2.2;
        this.leftArmPivot.rotation.x = -0.62;
        this.rightArmPivot.rotation.x = -0.68;
        this.headGroup.rotation.x = 0.32 + Math.sin(elapsedSec * 1.4) * 0.03;
        break;
      case "sofa_tv":
        // Reclining comfortably on sofa watching TV across the room
        this.charBody.position.set(0, 0.1, -0.02);
        this.charBody.rotation.x = -0.46;
        this.leftLegPivot.rotation.x = -1.16;
        this.rightLegPivot.rotation.x = -1.24;
        this.leftArmPivot.rotation.z = -0.18;
        this.rightArmPivot.rotation.x = -0.45;
        this.rightArmPivot.rotation.z = 0.14;
        this.headGroup.rotation.x = 0.28 + Math.sin(elapsedSec * 1.5) * 0.03;
        break;
      case "watch_tv":
        // Standing cheerfully facing TV
        this.leftArmPivot.rotation.x = -0.25;
        this.rightArmPivot.rotation.x = -0.35;
        this.headGroup.rotation.x = -0.06 + Math.sin(elapsedSec * 1.8) * 0.03;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 1.2) * 0.05;
        break;
      case "water_plant":
        // Gently tending/watering desk plant
        this.torsoGroup.rotation.x = 0.14;
        this.rightArmPivot.rotation.x = -1.05 + Math.sin(elapsedSec * 4.2) * 0.14;
        this.rightArmPivot.rotation.z = 0.16;
        this.headGroup.rotation.x = 0.18;
        break;
      case "admire_poster":
        // Looking up thoughtfully at framed wall poster
        this.leftArmPivot.rotation.x = -0.35;
        this.rightArmPivot.rotation.x = -1.12;
        this.rightArmPivot.rotation.z = 0.26;
        this.headGroup.rotation.x = -0.18 + Math.sin(elapsedSec * 1.1) * 0.03;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 0.9) * 0.08;
        break;
      case "check_coat":
        // Checking tote bag / scarf / cap by the door coat rack
        this.leftArmPivot.rotation.x = -0.45;
        this.rightArmPivot.rotation.x = -0.95 + Math.sin(elapsedSec * 2.4) * 0.14;
        this.rightArmPivot.rotation.z = 0.2;
        this.headGroup.rotation.x = -0.05;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 1.4) * 0.12;
        break;
      case "coffee_break":
        // Holding warm coffee mug and taking gentle sips
        this.coffeeProp.visible = true;
        this.leftArmPivot.rotation.x = -0.22;
        this.rightArmPivot.rotation.x = -0.82 + Math.max(0, Math.sin(elapsedSec * 2.2)) * -0.42;
        this.headGroup.rotation.x = 0.12;
        break;
      case "listen_vinyl":
        // Bobbing gently to warm vinyl turntable beats
        this.torsoGroup.rotation.z = Math.sin(elapsedSec * 4.2) * 0.07;
        this.leftArmPivot.rotation.x = -0.45 + Math.sin(elapsedSec * 4.2) * 0.18;
        this.rightArmPivot.rotation.x = -0.45 - Math.sin(elapsedSec * 4.2) * 0.18;
        this.headGroup.rotation.z = Math.sin(elapsedSec * 4.2) * 0.08;
        this.headGroup.rotation.x = Math.abs(Math.sin(elapsedSec * 4.2)) * 0.08;
        break;
      case "pet_cat":
        // Bending gently to pet the cozy orange tabby cat
        this.torsoGroup.rotation.x = 0.38;
        this.leftArmPivot.rotation.x = -0.85;
        this.rightArmPivot.rotation.x = -0.98 + Math.sin(elapsedSec * 5.2) * 0.16;
        this.rightArmPivot.rotation.y = Math.cos(elapsedSec * 4.0) * 0.12;
        this.headGroup.rotation.x = 0.34;
        break;
      case "watch_hamster":
        // Leaning lightly at drawer side-table height watching Mochi sprint in the cage
        this.torsoGroup.rotation.x = 0.18;
        this.leftArmPivot.rotation.x = -0.62;
        this.rightArmPivot.rotation.x = -0.66 + Math.sin(elapsedSec * 3.0) * 0.08;
        this.headGroup.rotation.x = 0.24 + Math.sin(elapsedSec * 2.1) * 0.04;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 1.4) * 0.07;
        break;
      case "water_floor_plant":
        // Caring for / wiping glossy fiddle-leaf fig leaves
        this.torsoGroup.rotation.x = 0.12;
        this.rightArmPivot.rotation.x = -1.12 + Math.sin(elapsedSec * 3.6) * 0.16;
        this.rightArmPivot.rotation.z = 0.18;
        this.headGroup.rotation.x = 0.05 + Math.sin(elapsedSec * 1.5) * 0.05;
        break;
      case "eat":
        this.snackProp.visible = true;
        this.rightArmPivot.rotation.x = -0.85 + Math.max(0, Math.sin(elapsedSec * 3.2)) * -0.45;
        this.headGroup.rotation.x = 0.15;
        break;
      case "work_celebrate": {
        // Energetic double-arm fist pump celebrating task submission / reward payout!
        const jump = Math.abs(Math.sin(elapsedSec * 7.2));
        this.charBody.position.set(0, jump * 0.16, 0);
        this.torsoGroup.rotation.x = -0.06;
        this.leftLegPivot.rotation.x = -jump * 0.18;
        this.rightLegPivot.rotation.x = jump * 0.12;
        this.leftArmPivot.rotation.x = -2.45 + Math.sin(elapsedSec * 14) * 0.28;
        this.leftArmPivot.rotation.z = -0.35;
        this.rightArmPivot.rotation.x = -2.45 - Math.sin(elapsedSec * 14) * 0.28;
        this.rightArmPivot.rotation.z = 0.35;
        this.headGroup.rotation.x = -0.14;
        this.headGroup.rotation.y = Math.sin(elapsedSec * 5) * 0.15;
        break;
      }
      case "floor_stand": {
        // Calm relaxed standing stance (or nervously pacing head when rent is urgent)
        const urgent = this.rentMood?.status === "urgent";
        this.torsoGroup.rotation.y = Math.sin(elapsedSec * (urgent ? 2.4 : 0.9)) * (urgent ? 0.08 : 0.04);
        this.leftArmPivot.rotation.z = urgent ? -0.14 : -0.06;
        this.rightArmPivot.rotation.z = urgent ? 0.14 : 0.06;
        this.headGroup.rotation.y = Math.sin(elapsedSec * (urgent ? 3.2 : 1.1)) * (urgent ? 0.22 : 0.14);
        this.headGroup.rotation.x = Math.sin(elapsedSec * 1.6) * 0.03 + (urgent ? 0.08 : 0);
        break;
      }
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
    if (this.parcelBadgeEl && !this.parcelBadgeEl.classList.contains("hidden")) {
      const parcelWorld = new THREE.Vector3(-3.36, 0.72, 2.05);
      parcelWorld.project(this.camera);
      const px = (parcelWorld.x * 0.5 + 0.5) * width;
      const py = (-parcelWorld.y * 0.5 + 0.5) * height;
      this.parcelBadgeEl.style.transform = `translate(${px}px, ${py}px) translate(-50%, -100%)`;
    }
    this.updateTvScreenOverlay();
  }

  getTvOverlayMountEl() {
    return this.tvOverlayWrap || null;
  }

  setTvPlayback({ videoId = null, suspended = false } = {}) {
    const cleanId = videoId ? String(videoId).trim() : "";
    this.tvActiveVideoId = cleanId || null;
    this.tvSuspended = Boolean(suspended);

    if (this.tvLedMat) {
      this.tvLedMat.color.setHex(this.tvActiveVideoId ? 0x34d399 : 0x475569);
    }

    if (!this.tvActiveVideoId || this.tvSuspended) {
      if (this.tvOverlayWrap) this.tvOverlayWrap.style.display = "none";
      if (!this.usesSharedTvIframe && this.tvOverlayIframe && this.tvOverlayIframe.getAttribute("src")) {
        this.tvOverlayIframe.removeAttribute("src");
      }
      if (!this.tvActiveVideoId && this.tvGlowLight) {
        this.tvGlowLight.intensity = 0;
      }
      this.renderIfPaused();
      return;
    }

    if (!this.usesSharedTvIframe && this.tvOverlayIframe) {
      const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.tvActiveVideoId)}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`;
      if (this.tvOverlayIframe.getAttribute("src") !== embedUrl) {
        this.tvOverlayIframe.src = embedUrl;
      }
    }
    this.updateTvScreenOverlay();
  }

  updateTvScreenOverlay() {
    if (!this.tvOverlayWrap || !this.tvScreenMesh || !this.camera) return;
    const hostUpper = this.wallsMap?.[this.tvHostWallName || "west"]?.upperGroup || this.westWallUpperGroup;
    const canShow = Boolean(
      this.tvActiveVideoId
      && !this.tvSuspended
      && this.ownedItems?.wall_tv
      && !this.pendingParcels?.wall_tv
      && this.wallTvGroup?.visible
      && hostUpper?.visible
    );
    if (!canShow) {
      this.tvOverlayWrap.style.display = "none";
      return;
    }

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 560;
    this.tvScreenMesh.updateWorldMatrix(true, false);
    this.camera.updateMatrixWorld();

    const projectLocal = (lx, ly, lz) => {
      const v = new THREE.Vector3(lx, ly, lz);
      this.tvScreenMesh.localToWorld(v);
      v.project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * width,
        y: (-v.y * 0.5 + 0.5) * height
      };
    };

    const tl = projectLocal(-0.66, 0.37, 0.002);
    const tr = projectLocal(0.66, 0.37, 0.002);
    const bl = projectLocal(-0.66, -0.37, 0.002);

    const domW = 528;
    const domH = 296;
    const ax = (tr.x - tl.x) / domW;
    const ay = (tr.y - tl.y) / domW;
    const bx = (bl.x - tl.x) / domH;
    const by = (bl.y - tl.y) / domH;
    const det = ax * by - ay * bx;

    if (Math.abs(det) < 1e-4) {
      this.tvOverlayWrap.style.display = "none";
      return;
    }

    this.tvOverlayWrap.style.display = "block";
    this.tvOverlayWrap.style.transform = `matrix(${ax.toFixed(6)}, ${ay.toFixed(6)}, ${bx.toFixed(6)}, ${by.toFixed(6)}, ${tl.x.toFixed(2)}, ${tl.y.toFixed(2)})`;
  }

  bindEvents() {
    const dom = this.renderer.domElement;

    this.onPointerMove = (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      // Furniture Edit Mode: drag selected item to move across grid (hovering never moves furniture)
      if (this.editMode) {
        if (this.walkHoverRingMat) this.walkHoverRingMat.opacity = 0;
        this.hoveredFloorPoint = null;

        if (this.editDragPending && !this.editDragPending.clickedEmpty && this.editSelectedId) {
          if (e.pointerId === undefined || this.editDragPending.pointerId === undefined || e.pointerId === this.editDragPending.pointerId) {
            const distPx = Math.hypot(
              e.clientX - this.editDragPending.startX,
              e.clientY - this.editDragPending.startY
            );
            if (!this.editDragging && distPx >= 6) {
              this.editDragging = true;
              this.editDragMoved = true;
            }
            if (this.editDragging) {
              this.raycastEditGridTarget(true);
              dom.style.cursor = this.editCanPlace ? "grabbing" : "not-allowed";
              const dragName = getPlaceableFurnitureName(this.editSelectedId);
              this.onHoverChange(
                this.editCanPlace
                  ? bi(
                      `拖曳移動「${dragName}」中，放開後可按 ← / → 鍵旋轉或確認放置`,
                      `Dragging "${dragName}" — release to rotate (← / →) or place`
                    )
                  : bi(
                      "目前格位重疊或受限，請拖往綠色網格或放開後按 ← / → 轉向",
                      "Blocked slot — drag to green cells or release to rotate (← / →)"
                    )
              );
              return;
            }
          }
        }

        const { movableId, interactType, hitActivePreview } = this.getEditRaycastHit();
        if (this.editSelectedId) {
          const selName = getPlaceableFurnitureName(this.editSelectedId);
          if (hitActivePreview || movableId === this.editSelectedId) {
            this.hoveredTarget = interactType || this.hoveredTarget;
            dom.style.cursor = "grab";
            this.onHoverChange(bi(
              `按住並拖曳「${selName}」移動位置，或按 ← / → 鍵／按鈕旋轉`,
              `Hold and drag "${selName}" to move, or press ← / → to rotate`
            ));
          } else if (movableId && !this.editHoldingFromParcel) {
            this.hoveredTarget = interactType;
            dom.style.cursor = "grab";
            const mSwitchName = getPlaceableFurnitureName(movableId);
            this.onHoverChange(bi(
              `點擊切換選取「${mSwitchName}」`,
              `Click to switch selection to "${mSwitchName}"`
            ));
          } else {
            this.hoveredTarget = null;
            dom.style.cursor = "default";
            this.onHoverChange(bi(
              `已選取「${selName}」：拖曳家具改位置，按 ← / → 鍵旋轉`,
              `Selected "${selName}": drag to move, ← / → to rotate`
            ));
          }
          return;
        }
        if (movableId) {
          this.hoveredTarget = interactType;
          dom.style.cursor = "grab";
          const mName = getPlaceableFurnitureName(movableId);
          this.onHoverChange(bi(
            `點擊選取「${mName}」，拖曳移動或按 ← / → 旋轉`,
            `Click to select "${mName}", drag to move or ← / → to rotate`
          ));
          return;
        }
        this.hoveredTarget = null;
        dom.style.cursor = "default";
        this.onHoverChange(bi(
          "點擊房間內的任何家具即可依網格選取、拖曳與旋轉",
          "Click any furniture piece in the room to select, drag, and rotate"
        ));
        return;
      }

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
        this.hoveredFloorPoint = null;
        if (this.walkHoverRingMat) this.walkHoverRingMat.opacity = 0;
        dom.style.cursor = "pointer";
        if (type === "parcel") {
          this.onHoverChange(this.spectating
            ? bi("貨到了（唯讀參觀中）", "Parcel delivered (read-only spectating)")
            : bi("📦 貨到了！點擊打開紙箱並在網格中擺放新家具", "📦 Delivered! Click box to unbox & place furniture"));
        } else if (type === "lamp") {
          this.onHoverChange(bi("點擊開關檯燈", "Click to toggle desk lamp"));
        } else if (type === "bedLamp") {
          this.onHoverChange(bi("點擊開關床邊小夜燈", "Click to toggle bedside lamp"));
        } else if (type === "arcLampBrass") {
          this.onHoverChange(bi("點擊開關黃銅穹頂釣魚落地燈", "Click to toggle brass arc floor lamp"));
        } else if (type === "arcLampBlack") {
          this.onHoverChange(bi("點擊開關極簡霧黑釣魚落地燈", "Click to toggle black arc floor lamp"));
        } else if (type === "tv") {
          this.onHoverChange(
            this.tvActiveVideoId
              ? bi("點擊打開電視頁面（更換 YouTube 影片或關掉電視）", "Click to open TV (switch channel or power off)")
              : bi("點擊打開電視，選擇要觀看的 YouTube 影片", "Click to turn on TV & pick a YouTube video")
          );
        } else if (type === "atmos") {
          this.onHoverChange(bi("點擊啟動 Dolby Atmos 沉浸式劇院音效", "Click to test Dolby Atmos surround sound"));
        } else if (type === "vinyl") {
          this.onHoverChange(bi("點擊開關黑膠唱片機與聽音樂", "Click to toggle vinyl turntable & music"));
        } else if (type === "coffeeBar") {
          this.onHoverChange(bi("點擊沖一杯手沖熱美式咖啡", "Click to brew pour-over coffee"));
        } else if (type === "cat") {
          this.onHoverChange(bi("點擊摸摸橘貓室友「阿橘」", "Click to pet Ginger the cat"));
        } else if (type === "hamster") {
          this.onHoverChange(bi("點擊看看書桌旁的布丁倉鼠「麻糬」", "Click to watch Mochi the hamster"));
        } else if (type === "poster") {
          this.onHoverChange(bi("點擊更換掛畫圖案／裁切自訂照片", "Click to customize framed wall poster"));
        } else if (type === "computer") {
          this.onHoverChange(bi("點擊電腦／電繪板開始接案學習", "Click computer/tablet to open freelance quests"));
        } else {
          // Silent discovery for bed / sink / toilet / sofa / plant / coatRack / floorPlant
          this.onHoverChange("");
        }
        return;
      }

      if (this.hoveredTarget !== null) {
        this.hoveredTarget = null;
        this.onHoverChange("");
      }

      // Check floor click-to-move hover inside interior bounds
      const hitPt = new THREE.Vector3();
      const hitFloor = this.floorPlane && this.raycaster.ray.intersectPlane(this.floorPlane, hitPt);
      if (hitFloor && Math.abs(hitPt.x) <= 3.9 && Math.abs(hitPt.z) <= 3.9) {
        const snapped = this.clampWalkableFloorPoint(hitPt);
        this.hoveredFloorPoint = snapped;
        if (this.walkHoverRing && this.walkHoverRingMat) {
          this.walkHoverRing.position.set(snapped.x, 0.042, snapped.z);
          this.walkHoverRingMat.opacity = 0.42;
        }
        dom.style.cursor = "pointer";
      } else {
        this.hoveredFloorPoint = null;
        if (this.walkHoverRingMat) this.walkHoverRingMat.opacity = 0;
        dom.style.cursor = "default";
      }
    };

    this.onEditPointerDown = (e) => {
      if (!this.editMode) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      const { movableId, hitActivePreview } = this.getEditRaycastHit();
      const hitSelected = Boolean(
        this.editSelectedId
        && (hitActivePreview || movableId === this.editSelectedId)
      );

      this._editPointerDownHandled = false;
      this._editSuppressNextClick = false;

      if (hitSelected) {
        this._editPointerDownHandled = true;
        this.startEditDragPending(e, this.editSelectedId);
        return;
      }

      if (movableId) {
        this._editPointerDownHandled = true;
        if (this.editSelectedId && this.editSelectedId !== movableId) {
          if (this.editHoldingFromParcel) {
            // Keep focus on unboxed parcel until placed or put back in box
            return;
          }
          if (this.editItemDirty && this.editCanPlace) {
            this.commitActiveFurniturePlacement();
          } else {
            this.editSelectedId = null;
            this.editPreviewEntry = null;
            this.editCanPlace = false;
            this.editItemDirty = false;
            this.applyFurnitureLayout(this.furnitureLayout);
          }
        }
        this.selectFurnitureForPlacement(movableId, { fromParcel: false });
        this.startEditDragPending(e, movableId);
        return;
      }

      this.editDragPending = {
        id: null,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        clickedEmpty: true
      };
    };

    this.onEditWindowPointerMove = (e) => {
      if (this.editMode && this.editDragPending && !this.editDragPending.clickedEmpty && e.target !== dom) {
        this.onPointerMove(e);
      }
    };

    this.onEditPointerUp = (e) => {
      if (this.editDragPending) {
        const pid = this.editDragPending.pointerId;
        if (pid !== undefined) {
          try {
            if (dom.hasPointerCapture?.(pid)) dom.releasePointerCapture(pid);
          } catch {
            // Ignore
          }
        }
      }
      if (this.editDragMoved) {
        this._editSuppressNextClick = true;
      }
      this.editDragging = false;
      this.editDragMoved = false;
      this.editDragPending = null;
      this.editDragOffset = { wall: null, x: 0, z: 0, coord: 0 };
      if (this.editMode && this.editSelectedId) {
        dom.style.cursor = "grab";
      }
    };

    this.onClick = (e) => {
      if (this.editMode) {
        if (this._editSuppressNextClick) {
          this._editSuppressNextClick = false;
          this._editPointerDownHandled = false;
          return;
        }
        if (this._editPointerDownHandled) {
          this._editPointerDownHandled = false;
          return;
        }
        // Fallback for synthetic clicks without pointerdown or clicks on empty canvas to finish item
        const rect = dom.getBoundingClientRect();
        this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.camera.updateMatrixWorld();
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        const { movableId, hitActivePreview } = this.getEditRaycastHit();
        if (!this.editSelectedId && movableId) {
          this.selectFurnitureForPlacement(movableId, { fromParcel: false });
          return;
        }
        if (this.editSelectedId && !hitActivePreview && movableId !== this.editSelectedId && !this.editHoldingFromParcel) {
          if (this.editItemDirty && this.editCanPlace) {
            this.commitActiveFurniturePlacement();
          } else {
            this.editSelectedId = null;
            this.editPreviewEntry = null;
            this.editCanPlace = false;
            this.editItemDirty = false;
            if (this.editPreviewGroup) this.editPreviewGroup.visible = false;
            this.applyFurnitureLayout(this.furnitureLayout);
            this.updateGridOverlayVisibility();
            this.notifyEditModeState();
            this.renderIfPaused();
          }
        }
        return;
      }

      this.onPointerMove(e);
      if (this.hoveredTarget === "parcel") {
        if (!this.spectating) this.openNextParcelBox();
      } else if (this.hoveredTarget === "lamp") {
        this.setDeskLamp(!this.deskLampOn);
        this.onLampToggle(this.deskLampOn);
      } else if (this.hoveredTarget === "bedLamp") {
        this.setBedLamp(!this.bedLampOn);
        this.onBedLampToggle(this.bedLampOn);
      } else if (this.hoveredTarget === "arcLampBrass") {
        this.setArcLampBrass(!this.arcLampBrassOn);
        this.onArcLampToggle("arc_lamp_brass", this.arcLampBrassOn);
      } else if (this.hoveredTarget === "arcLampBlack") {
        this.setArcLampBlack(!this.arcLampBlackOn);
        this.onArcLampToggle("arc_lamp_black", this.arcLampBlackOn);
      } else if (this.hoveredTarget === "computer") {
        if (!this.spectating) this.goToWork();
      } else if (this.hoveredTarget === "tv") {
        if (!this.spectating) {
          const spot = this.getPlacedOwnedItems().cozy_sofa ? this.actionSpots.sofa_tv : this.actionSpots.watch_tv;
          this.commandActivity(spot, 180);
          this.onOpenTv();
        }
      } else if (this.hoveredTarget === "atmos") {
        this.playAtmosChime();
        const spot = this.getPlacedOwnedItems().cozy_sofa ? this.actionSpots.sofa_tv : this.actionSpots.watch_tv;
        this.commandActivity(spot, 180);
        this.showBubble(this.pickRandomThought("dolby_atmos"), 4600);
        this.thoughtCooldown = 10;
      } else if (this.hoveredTarget === "vinyl") {
        this.setVinylOn(!this.vinylOn);
        this.onVinylToggle(this.vinylOn);
        if (this.vinylOn) {
          this.commandActivity(this.actionSpots.listen_vinyl, 45);
        }
      } else if (this.hoveredTarget === "coffeeBar") {
        this.commandActivity(this.actionSpots.coffee_break, 30);
      } else if (this.hoveredTarget === "cat") {
        this.commandActivity(this.actionSpots.pet_cat, 25);
      } else if (this.hoveredTarget === "hamster") {
        this.commandActivity(this.actionSpots.watch_hamster, 30);
        this.showBubble(this.pickRandomThought("watch_hamster"), 4200);
        this.thoughtCooldown = 10;
      } else if (this.hoveredTarget === "coatRack") {
        this.commandActivity(this.actionSpots.check_coat, 16);
      } else if (this.hoveredTarget === "floorPlant") {
        this.commandActivity(this.actionSpots.water_floor_plant, 14);
      } else if (this.hoveredTarget === "sofa") {
        const spot = (this.ownedItems.wall_tv && Math.random() < 0.5)
          ? this.actionSpots.sofa_tv
          : this.actionSpots.sofa_read;
        this.commandActivity(spot, 180);
      } else if (this.hoveredTarget === "plant") {
        this.commandActivity(this.actionSpots.water_plant, 10);
      } else if (this.hoveredTarget === "poster") {
        if (!this.spectating) this.onOpenPoster();
      } else if (this.hoveredTarget === "bed") {
        const sleepSpot = this.chillSpots.find(s => s.id === "sleep");
        this.commandActivity(sleepSpot, COMMANDED_SLEEP_SEC);
      } else if (this.hoveredTarget === "sink") {
        this.commandActivity(this.actionSpots.wash, COMMANDED_WASH_SEC);
      } else if (this.hoveredTarget === "toilet") {
        this.commandActivity(this.actionSpots.toilet, COMMANDED_TOILET_SEC);
      } else if (this.hoveredFloorPoint) {
        this.walkToFloorPoint(this.hoveredFloorPoint);
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
      this.camera.zoom = this.cameraZoom;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.updateOverlayPositions();
      this.renderIfPaused();
    };

    this.onWheel = (e) => {
      if (this.disposed) return;
      e.preventDefault();
      const step = THREE.MathUtils.clamp(-e.deltaY * 0.0018, -0.18, 0.18);
      this.setCameraZoom(this.targetCameraZoom * (1 + step), { instant: true });
    };

    this.onPointerLeave = () => {
      if (this.editDragging) return;
      this.hoveredFloorPoint = null;
      if (this.walkHoverRingMat) this.walkHoverRingMat.opacity = 0;
      if (this.hoveredTarget !== null) {
        this.hoveredTarget = null;
        this.onHoverChange("");
      }
      dom.style.cursor = "default";
    };

    this.onEditKeyDown = (e) => {
      if (!this.editMode) return;
      const activeTag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
      if (e.key === "ArrowLeft") {
        if (!this.editSelectedId) return;
        e.preventDefault();
        this.rotateEditingFurniture(-1);
      } else if (e.key === "ArrowRight") {
        if (!this.editSelectedId) return;
        e.preventDefault();
        this.rotateEditingFurniture(1);
      } else if (e.key === "Enter" && activeTag !== "BUTTON") {
        if (this.editSelectedId && this.editCanPlace) {
          e.preventDefault();
          this.commitActiveFurniturePlacement();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.cancelEditingFurniture();
      }
    };

    dom.addEventListener("pointerdown", this.onEditPointerDown);
    dom.addEventListener("pointermove", this.onPointerMove);
    dom.addEventListener("pointerleave", this.onPointerLeave);
    dom.addEventListener("click", this.onClick);
    dom.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointermove", this.onEditWindowPointerMove);
    window.addEventListener("pointerup", this.onEditPointerUp);
    window.addEventListener("pointercancel", this.onEditPointerUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onEditKeyDown);
  }

  renderIfPaused() {
    if (this.paused && !this.disposed && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
      this.updateOverlayPositions();
    }
  }

  pause() {
    const wasRunning = !this.paused;
    this.paused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (wasRunning) {
      this.renderIfPaused();
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

    // Subtle RGB rainbow breathing on upgraded mechanical keyboard
    if (this.coolRgbStripMat && this.coolKeyboardGroup?.visible) {
      const hue = (elapsedSec * 0.14) % 1;
      this.coolRgbStripMat.emissive.setHSL(hue, 0.85, 0.55);
    }

    // Spin vinyl record when player is on or character is listening
    if (this.vinylDiscGroup && this.vinylPlayerGroup?.visible) {
      if (this.vinylOn || this.currentActivity === "listen_vinyl") {
        this.vinylDiscGroup.rotation.y += dt * 1.9;
      }
    }

    // Subtle doormat parcel bob when waiting to be opened
    if (this.parcelGroup?.visible) {
      this.parcelGroup.position.y = 0.04 + Math.abs(Math.sin(elapsedSec * 2.2)) * 0.018;
    }

    // Gentle wagging tail + breathing on orange tabby cat
    if (this.orangeCatGroup?.visible) {
      if (this.catTailPivot) {
        this.catTailPivot.rotation.y = Math.sin(elapsedSec * 2.6) * 0.28;
      }
      if (this.catBodyMesh) {
        const breath = 1 + Math.sin(elapsedSec * 1.9) * 0.035;
        this.catBodyMesh.scale.set(1.22, 0.72 * breath, 1.0 * breath);
      }
    }

    // Energetic hamster Mochi running inside wheel on drawer side table
    if (this.hamsterCageGroup?.visible) {
      const sprintCycle = (elapsedSec % 11) < 8.5;
      if (this.hamsterWheelPivot) {
        if (sprintCycle) {
          this.hamsterWheelPivot.rotation.z -= dt * 7.5;
        } else {
          this.hamsterWheelPivot.rotation.z -= dt * 0.4 * Math.cos(elapsedSec * 3);
        }
      }
      if (this.hamsterBodyMesh) {
        if (sprintCycle) {
          this.hamsterBodyMesh.position.y = 0.215 + Math.abs(Math.sin(elapsedSec * 18)) * 0.012;
          this.hamsterBodyMesh.rotation.z = 0.14 + Math.sin(elapsedSec * 18) * 0.08;
          this.hamsterBodyMesh.rotation.y = Math.sin(elapsedSec * 5) * 0.05;
        } else {
          this.hamsterBodyMesh.position.y = 0.212;
          this.hamsterBodyMesh.rotation.z = 0;
          this.hamsterBodyMesh.rotation.y = Math.sin(elapsedSec * 4.2) * 0.35;
        }
      }
    }

    // Dynamic cinema light bounce emitted onto room when TV is playing YouTube
    if (this.tvGlowLight) {
      const tvPlaying = Boolean(this.tvActiveVideoId && this.ownedItems?.wall_tv);
      if (!tvPlaying) {
        this.tvGlowLight.intensity = 0;
      } else {
        const wave = (Math.sin(elapsedSec * 2.1) + 1) * 0.5;
        const warmth = (Math.cos(elapsedSec * 0.9) + 1) * 0.5;
        this.tvGlowLight.intensity = 1.25 + wave * 0.55;
        this.tvGlowLight.color.setHex(0x7dd3fc).lerp(new THREE.Color(0xfde68a), warmth * 0.42);
      }
    }

    // Subtle Dolby Atmos soundbar LED pulse (active boost during cinema / vinyl / TV time)
    if (this.atmosLedMat && this.dolbyAtmosGroup?.visible) {
      const cinemaActive = Boolean(this.tvActiveVideoId) || this.currentActivity === "sofa_tv" || this.vinylOn || this.currentActivity === "listen_vinyl";
      const k = (Math.sin(elapsedSec * (cinemaActive ? 3.2 : 1.3)) + 1) * 0.5;
      this.atmosLedMat.color.setHex(cinemaActive ? 0x38bdf8 : 0x0ea5e9).lerp(
        new THREE.Color(cinemaActive ? 0xfbbf24 : 0x64748b),
        cinemaActive ? k * 0.45 : k * 0.25
      );
    }

    // Subtle hover-only highlight ring under desk setup
    if (this.workHoverRingMat) {
      const targetOpacity = this.hoveredTarget === "computer" ? 0.36 : 0;
      this.workHoverRingMat.opacity += (targetOpacity - this.workHoverRingMat.opacity) * 0.18;
    }

    // Expanding pulse ripple when floor location is clicked
    if (this.walkRippleActive && this.walkTargetRing && this.walkTargetRingMat) {
      this.walkRippleAge += dt;
      const p = Math.min(1, this.walkRippleAge / 0.72);
      const scale = 1 + p * 1.45;
      this.walkTargetRing.scale.set(scale, scale, 1);
      this.walkTargetRingMat.opacity = (1 - p) * 0.82;
      if (p >= 1) {
        this.walkRippleActive = false;
        this.walkTargetRingMat.opacity = 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.updateOverlayPositions();
  };

  playAtmosChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Warm spatial chord sweep (deep sub + shimmering harmonic fifth)
      [65.41, 130.81, 196.0, 261.63, 392.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.08 : 0.035, now + idx * 0.045 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.72);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.75);
      });
      setTimeout(() => ctx.close().catch(() => {}), 950);
    } catch {
      // Ignore Web Audio restrictions
    }
  }

  dispose() {
    this.disposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener("pointerdown", this.onEditPointerDown);
      dom.removeEventListener("pointermove", this.onPointerMove);
      dom.removeEventListener("pointerleave", this.onPointerLeave);
      dom.removeEventListener("click", this.onClick);
      dom.removeEventListener("wheel", this.onWheel);
    }
    window.removeEventListener("pointermove", this.onEditWindowPointerMove);
    window.removeEventListener("pointerup", this.onEditPointerUp);
    window.removeEventListener("pointercancel", this.onEditPointerUp);
    window.removeEventListener("resize", this.onResize);
    if (this.onEditKeyDown) {
      window.removeEventListener("keydown", this.onEditKeyDown);
    }
    clearTimeout(this.bubbleTimer);
    if (this.customPosterTex) {
      this.customPosterTex.dispose();
      this.customPosterTex = null;
    }
    if (this.defaultPosterTex) {
      this.defaultPosterTex.dispose();
      this.defaultPosterTex = null;
    }
    if (this.floorSurfaceTex) {
      this.floorSurfaceTex.dispose();
      this.floorSurfaceTex = null;
    }
    if (this.deskTopTex) {
      this.deskTopTex.dispose();
      this.deskTopTex = null;
    }
    this.renderer?.dispose();
  }
}
