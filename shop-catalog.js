export const SHOP_CATEGORIES = [
  { id: "all", label: "全部商品" },
  { id: "paint", label: "牆面粉刷" },
  { id: "decor", label: "生活家具" },
  { id: "gear", label: "接案設備" }
];

export const DEFAULT_WALL_COLOR = "#f3eadc";

export const SHOP_CATALOG = [
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
    id: "bed_lamp",
    name: "床邊暖光小夜燈",
    category: "decor",
    price: 180,
    icon: "🛏️",
    previewImage: "./assets/shop/bed_lamp.jpg",
    desc: "附小床頭櫃的圓潤小夜燈，放在房間裡可直接點擊開關。"
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
    id: "cozy_sofa",
    name: "雙人布藝沙發",
    category: "decor",
    price: 280,
    icon: "🛋️",
    previewImage: "./assets/shop/cozy_sofa.jpg",
    desc: "面向大門旁牆面的柔軟雙人沙發，累了隨時可以喘口氣。"
  },
  {
    id: "wall_tv",
    name: "壁掛平面小電視",
    category: "decor",
    price: 360,
    icon: "📺",
    previewImage: "./assets/shop/wall_tv.jpg",
    desc: "掛在玄關大門右側牆上，正好對著沙發的纖薄小電視。"
  }
];

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
