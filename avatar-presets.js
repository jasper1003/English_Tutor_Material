import { DEFAULT_SHIRT_STYLE, DEFAULT_PANTS_STYLE } from "./shop-catalog.js?v=20261128b";

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
