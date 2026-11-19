export const SHOP_CATEGORIES = [
  { id: "all", label: "全部商品" },
  { id: "paint", label: "牆面粉刷" },
  { id: "textile", label: "床單地毯" },
  { id: "decor", label: "生活家具" },
  { id: "gear", label: "接案設備" }
];

export const DEFAULT_WALL_COLOR = "#f3eadc";
export const DEFAULT_BED_SHEET = "default";
export const DEFAULT_RUG_STYLE = "default";

export const BED_SHEET_PRESETS = {
  default: {
    id: "default",
    name: "經典海鹽藍床組",
    blanketColor: "#6d8da6",
    sheetColor: "#f5f0e8",
    pillowColor: "#fff9f0"
  },
  sheet_terracotta: {
    id: "sheet_terracotta",
    name: "焦糖暖橘純棉床組",
    blanketColor: "#d97757",
    sheetColor: "#fdf4ec",
    pillowColor: "#f7e0cb"
  },
  sheet_sage: {
    id: "sheet_sage",
    name: "鼠尾草森綠床組",
    blanketColor: "#6b9080",
    sheetColor: "#f2f6f1",
    pillowColor: "#d8e7de"
  },
  sheet_sakura: {
    id: "sheet_sakura",
    name: "柔霧櫻花粉床組",
    blanketColor: "#dd8ea4",
    sheetColor: "#fdf4f6",
    pillowColor: "#f7dce3"
  },
  sheet_midnight: {
    id: "sheet_midnight",
    name: "星空深海藍床組",
    blanketColor: "#334e68",
    sheetColor: "#edf2f7",
    pillowColor: "#bcccdc"
  }
};

export const RUG_STYLE_PRESETS = {
  default: {
    id: "default",
    name: "奶油燕麥原味地毯",
    pattern: "classic",
    baseColor: "#ebe1d2",
    accentColor: "#dfcbb5"
  },
  rug_nordic: {
    id: "rug_nordic",
    name: "北歐菱格米灰地毯",
    pattern: "nordic",
    baseColor: "#edeae4",
    accentColor: "#5c6773"
  },
  rug_terracotta: {
    id: "rug_terracotta",
    name: "波希米亞編織流蘇毯",
    pattern: "boho",
    baseColor: "#d88366",
    accentColor: "#f4d7c4"
  },
  rug_moss: {
    id: "rug_moss",
    name: "森系圓形軟絨地毯",
    pattern: "round",
    baseColor: "#6e9377",
    accentColor: "#92b499"
  },
  rug_checkered: {
    id: "rug_checkered",
    name: "復古奶咖棋盤格地毯",
    pattern: "checker",
    baseColor: "#f2ece1",
    accentColor: "#8c6950"
  }
};

export const DEFAULT_SHOP_CATALOG = [
  {
    id: "wall_oat",
    name: "燕麥奶油牆面",
    category: "paint",
    consumable: true,
    price: 80,
    wallColor: "#f3eadc",
    icon: "🎨",
    desc: "溫暖奶油白油漆與粉刷工錢，每次換色皆需重新付費施作。"
  },
  {
    id: "wall_sage",
    name: "鼠尾草淺綠牆面",
    category: "paint",
    consumable: true,
    price: 100,
    wallColor: "#cdd9ce",
    icon: "🌿",
    desc: "莫蘭迪淺綠油漆與粉刷工錢，每次重新粉刷皆需再次購買。"
  },
  {
    id: "wall_mist",
    name: "晨霧微藍牆面",
    category: "paint",
    consumable: true,
    price: 100,
    wallColor: "#d4dfea",
    icon: "☁️",
    desc: "霧面藍灰油漆與粉刷工錢，每次重新粉刷皆需再次購買。"
  },
  {
    id: "wall_blush",
    name: "暖陶藕粉牆面",
    category: "paint",
    consumable: true,
    price: 120,
    wallColor: "#ead6d2",
    icon: "🌷",
    desc: "奶油藕粉油漆與粉刷工錢，每次重新粉刷皆需再次購買。"
  },
  {
    id: "wall_lavender",
    name: "靜謐灰紫牆面",
    category: "paint",
    consumable: true,
    price: 120,
    wallColor: "#ddd6e8",
    icon: "🪻",
    desc: "淡雅薰衣灰紫油漆與粉刷工錢，每次重新粉刷皆需再次購買。"
  },
  {
    id: "sheet_terracotta",
    name: "焦糖暖橘純棉床組",
    category: "textile",
    textileKind: "bedSheet",
    price: 90,
    icon: "🛏️",
    sheetStyle: BED_SHEET_PRESETS.sheet_terracotta,
    desc: "水洗暖橘被套搭配奶油床包，購買後可永久免費隨時換洗。"
  },
  {
    id: "sheet_sage",
    name: "鼠尾草森綠床組",
    category: "textile",
    textileKind: "bedSheet",
    price: 90,
    icon: "🌿",
    sheetStyle: BED_SHEET_PRESETS.sheet_sage,
    desc: "清新自然森林綠棉被與淺綠枕套，睡起來格外放鬆安心。"
  },
  {
    id: "sheet_sakura",
    name: "柔霧櫻花粉床組",
    category: "textile",
    textileKind: "bedSheet",
    price: 100,
    icon: "🌸",
    sheetStyle: BED_SHEET_PRESETS.sheet_sakura,
    desc: "溫柔低飽和玫瑰櫻花粉床單，讓臥室角落瞬間柔和可愛。"
  },
  {
    id: "sheet_midnight",
    name: "星空深海藍床組",
    category: "textile",
    textileKind: "bedSheet",
    price: 110,
    icon: "🌌",
    sheetStyle: BED_SHEET_PRESETS.sheet_midnight,
    desc: "沉穩耐看的午夜海藍絲絨被組，夜晚休息更有質感氛圍。"
  },
  {
    id: "rug_nordic",
    name: "北歐菱格米灰地毯",
    category: "textile",
    textileKind: "rugStyle",
    price: 110,
    icon: "🧶",
    rugStyle: RUG_STYLE_PRESETS.rug_nordic,
    desc: "簡約幾何線條編織短絨毯，踩起來清爽俐落，購入後可自由替換。"
  },
  {
    id: "rug_terracotta",
    name: "波希米亞編織流蘇毯",
    category: "textile",
    textileKind: "rugStyle",
    price: 130,
    icon: "🏜️",
    rugStyle: RUG_STYLE_PRESETS.rug_terracotta,
    desc: "暖陶紅橘搭配奶白滾邊與小流蘇，替房間增添異國溫馨氣息。"
  },
  {
    id: "rug_moss",
    name: "森系圓形軟絨地毯",
    category: "textile",
    textileKind: "rugStyle",
    price: 140,
    icon: "🟢",
    rugStyle: RUG_STYLE_PRESETS.rug_moss,
    desc: "厚實軟綿的草地綠圓形毛毯，做運動或坐在地上伸展最舒適。"
  },
  {
    id: "rug_checkered",
    name: "復古奶咖棋盤格地毯",
    category: "textile",
    textileKind: "rugStyle",
    price: 150,
    icon: "🏁",
    rugStyle: RUG_STYLE_PRESETS.rug_checkered,
    desc: "經典奶霜×焦糖可可格紋設計毯，咖啡廳感瞬間拉滿。"
  },
  {
    id: "desk_plant",
    name: "桌上小盆栽",
    category: "decor",
    price: 120,
    icon: "🪴",
    previewImage: "./assets/shop/desk_plant.jpg",
    desc: "擺在書桌右上角的龜背芋陶土小盆栽，增添生氣。"
  },
  {
    id: "wall_poster",
    name: "插畫海報掛畫",
    category: "decor",
    price: 150,
    icon: "🖼️",
    previewImage: "./assets/shop/wall_poster.jpg",
    desc: "木框裱褙的暖日風景掛畫，裝飾北側空白牆面。"
  },
  {
    id: "coat_rack",
    name: "門旁直立式掛衣架",
    category: "decor",
    price: 160,
    icon: "🧥",
    previewImage: "./assets/shop/coat_rack.jpg",
    desc: "擺在玄關大門旁的原木直立掛衣架，可掛帆布袋、圍巾與帽子。"
  },
  {
    id: "bed_lamp",
    name: "床邊暖光小夜燈",
    category: "decor",
    price: 180,
    icon: "🛏️",
    previewImage: "./assets/shop/bed_lamp.jpg",
    desc: "附小床頭櫃的圓潤小夜燈，放在房間裡可直接點擊開關。"
  },
  {
    id: "floor_plant",
    name: "琴葉榕編織落地盆栽",
    category: "decor",
    price: 190,
    icon: "🌿",
    previewImage: "./assets/shop/floor_plant.jpg",
    desc: "擺在浴室與床尾之間的藤編籃大型琴葉榕，房間綠意滿分。"
  },
  {
    id: "cool_keyboard",
    name: "炫彩機械鍵盤",
    category: "gear",
    price: 240,
    icon: "⌨️",
    previewImage: "./assets/shop/cool_keyboard.jpg",
    desc: "替書桌換上發光 RGB 客製機械鍵盤，接案手感更順。"
  },
  {
    id: "coffee_bar",
    name: "文青手沖咖啡吧台",
    category: "decor",
    price: 240,
    icon: "☕",
    previewImage: "./assets/shop/coffee_bar.jpg",
    desc: "靠西北牆角的小巧木質咖啡吧台與手沖壺，隨時泡杯熱美式提神。"
  },
  {
    id: "ergo_chair",
    name: "雲感人體工學繪師椅",
    category: "gear",
    price: 250,
    icon: "💺",
    previewImage: "./assets/shop/ergo_chair.jpg",
    desc: "將書桌椅升級成透氣護腰高背工學椅，久坐畫圖與寫作更舒適。"
  },
  {
    id: "vinyl_player",
    name: "復古黑膠唱片音響櫃",
    category: "decor",
    price: 260,
    icon: "🎵",
    previewImage: "./assets/shop/vinyl_player.jpg",
    desc: "靠南牆的胡桃木音響矮櫃與黑膠唱盤，點擊可切換旋轉聽音樂。"
  },
  {
    id: "cozy_sofa",
    name: "雙人布藝沙發",
    category: "decor",
    price: 280,
    icon: "🛋️",
    previewImage: "./assets/shop/cozy_sofa.jpg",
    desc: "面向大門旁牆面的柔軟雙人沙發，累了隨時可以喘口氣。"
  },
  {
    id: "smart_toilet",
    name: "全自動免治馬桶",
    category: "decor",
    price: 320,
    icon: "🚽",
    previewImage: "./assets/shop/smart_toilet.jpg",
    desc: "把浴室馬桶升級成日式恆溫免治座墊＋夜燈款，如廁體驗大進化。"
  },
  {
    id: "dual_monitor",
    name: "色彩校準副螢幕工作站",
    category: "gear",
    price: 340,
    icon: "🖥️",
    previewImage: "./assets/shop/dual_monitor.jpg",
    desc: "在 iMac 旁加裝直立色彩參考副螢幕，接案繪圖看參考圖更專業。"
  },
  {
    id: "wall_tv",
    name: "壁掛平面小電視",
    category: "decor",
    price: 360,
    icon: "📺",
    previewImage: "./assets/shop/wall_tv.jpg",
    desc: "掛在玄關大門右側牆上，正好對著沙發的纖薄小電視。"
  },
  {
    id: "orange_cat",
    name: "橘貓室友「阿橘」與貓窩",
    category: "decor",
    price: 420,
    icon: "🐈",
    previewImage: "./assets/shop/orange_cat.jpg",
    desc: "領養一隻會搖尾巴的可愛肥橘貓住在暖烘烘貓窩裡，可走去摸摸牠！"
  }
];

export const SHOP_CATALOG = DEFAULT_SHOP_CATALOG.map(item => ({ ...item, enabled: true }));

function parseSheetBool(raw, defaultValue = true) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return defaultValue;
  const norm = String(raw).trim().toLowerCase();
  if (["false", "0", "no", "off", "停用", "下架"].includes(norm)) return false;
  if (["true", "1", "yes", "on", "啟用", "上架"].includes(norm)) return true;
  return defaultValue;
}

/**
 * Merge live Google Sheet rows (`Shop` tab) over built-in catalog defaults.
 * Preserves local preview images, textile/sheet style presets, and falls back
 * gracefully if the sheet tab is absent or leaves optional cells empty.
 */
export function applyRemoteShopConfig(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return SHOP_CATALOG;

  const validCats = new Set(["paint", "textile", "decor", "gear"]);
  const baseById = new Map(DEFAULT_SHOP_CATALOG.map(item => [item.id, item]));
  const overrides = new Map();
  const extraOrder = [];

  for (const row of rows) {
    const id = String(row?.id || "").trim();
    if (!id) continue;
    const base = baseById.get(id);
    const parsedPrice = Math.trunc(Number(row.price));
    const safePrice = Number.isFinite(parsedPrice) && parsedPrice >= 1 && parsedPrice <= 10000
      ? parsedPrice
      : (base?.price ?? 0);
    if (safePrice <= 0) continue;

    const category = validCats.has(String(row.category || "").trim())
      ? String(row.category).trim()
      : (base?.category || "");
    if (!category) continue;

    const rawWallColor = String(row.wallColor || "").trim();
    const wallColor = /^#[0-9a-f]{6}$/i.test(rawWallColor) ? rawWallColor : base?.wallColor;

    // Only built-in items or custom consumable wall paints can be registered dynamically
    if (!base && !(category === "paint" && wallColor)) continue;

    const merged = {
      ...(base || {}),
      id,
      name: String(row.name || "").trim() || base?.name || id,
      category,
      price: safePrice,
      enabled: parseSheetBool(row.enabled, true),
      consumable: base ? Boolean(base.consumable) : parseSheetBool(row.consumable, category === "paint"),
      icon: String(row.icon || "").trim() || base?.icon || (category === "paint" ? "🎨" : "🎁"),
      desc: String(row.desc || "").trim() || base?.desc || ""
    };
    if (wallColor) merged.wallColor = wallColor;
    const previewImg = String(row.previewImage || "").trim();
    if (previewImg) merged.previewImage = previewImg;

    overrides.set(id, merged);
    if (!base) extraOrder.push(merged);
  }

  const nextList = [
    ...DEFAULT_SHOP_CATALOG.map(item => overrides.get(item.id) || { ...item, enabled: true }),
    ...extraOrder
  ];
  SHOP_CATALOG.splice(0, SHOP_CATALOG.length, ...nextList);
  return SHOP_CATALOG;
}

export function getShopItem(itemId) {
  return SHOP_CATALOG.find(item => item.id === itemId) || null;
}

export function normalizeOwnedItems(raw) {
  const result = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, val] of Object.entries(raw)) {
      if (val === true) result[key] = true;
    }
  }
  return result;
}

export function resolveBedSheetStyle(bedSheetId) {
  return BED_SHEET_PRESETS[bedSheetId] || BED_SHEET_PRESETS[DEFAULT_BED_SHEET];
}

export function resolveRugStyle(rugStyleId) {
  return RUG_STYLE_PRESETS[rugStyleId] || RUG_STYLE_PRESETS[DEFAULT_RUG_STYLE];
}
