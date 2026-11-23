import { bi, isEn } from "./i18n.js?v=20261123f";

export const SHOP_CATEGORIES = [
  { id: "all", label: "全部商品", labelEn: "All Items" },
  { id: "paint", label: "牆面粉刷", labelEn: "Wall Paint" },
  { id: "floor", label: "地板材質", labelEn: "Flooring" },
  { id: "desk", label: "書桌材質", labelEn: "Desk Materials" },
  { id: "textile", label: "床單地毯", labelEn: "Bedding & Rugs" },
  { id: "shirt", label: "上衣穿搭", labelEn: "Tops" },
  { id: "pants", label: "褲款下著", labelEn: "Bottoms" },
  { id: "decor", label: "生活家具", labelEn: "Furniture & Decor" },
  { id: "gear", label: "接案設備", labelEn: "Studio Gear" }
];

export const SHOP_CATALOG_EN = {
  wall_oat: { name: "Oat Cream Wall Paint", desc: "Warm cream paint & repaint labor (charged per repaint)." },
  wall_sage: { name: "Sage Green Wall Paint", desc: "Soft Morandi sage paint & labor (charged per repaint)." },
  wall_mist: { name: "Morning Mist Blue Paint", desc: "Matte blue-gray wall paint & labor (charged per repaint)." },
  wall_blush: { name: "Terracotta Blush Paint", desc: "Creamy blush terracotta paint & labor (charged per repaint)." },
  wall_lavender: { name: "Dusk Lavender Paint", desc: "Calming dusty lavender wall paint & labor (charged per repaint)." },
  floor_honey_oak: { name: "Classic Honey Oak Floor", desc: "Warm signature honey oak planks & re-laying labor (charged per re-lay)." },
  floor_ash_nordic: { name: "Nordic Pale Ash Wood", desc: "Airy Scandinavian bleached ash planks with delicate grain (charged per re-lay)." },
  floor_walnut_herringbone: { name: "Dark Walnut Herringbone", desc: "Rich walnut parquet laid in classic herringbone zigzag (charged per re-lay)." },
  floor_bamboo_tatami: { name: "Woven Bamboo Tatami", desc: "Calm Japanese tatami & hinoki bordered weave for serene focus (charged per re-lay)." },
  floor_carrara_marble: { name: "Carrara White Marble", desc: "Polished white marble slabs with natural soft gray veining (charged per re-lay)." },
  floor_terrazzo_warm: { name: "Italian Warm Terrazzo", desc: "Cream stone studded with terracotta, sage, and ochre flecks (charged per re-lay)." },
  floor_dark_slate: { name: "Charcoal Basalt Slate", desc: "Architectural matte dark stone tiles with rugged mineral texture (charged per re-lay)." },
  floor_checker_retro: { name: "Retro Cream & Cocoa Checker", desc: "Mid-century checkered ceramic tiles with crisp espresso contrast (charged per re-lay)." },
  floor_hex_terracotta: { name: "Mediterranean Hex Terracotta", desc: "Sun-baked clay hexagon tiles framed in creamy ivory mortar (charged per re-lay)." },
  floor_moroccan_star: { name: "Moroccan Geometric Tile", desc: "Handcrafted cobalt blue and ivory star-motif artisan tiles (charged per re-lay)." },
  desk_walnut_brass: { name: "Dark Walnut & Brushed Brass Desk", desc: "Rich walnut grain tabletop paired with champagne brass legs; swap anytime for free." },
  desk_ash_white: { name: "Nordic Ash & Crisp White Desk", desc: "Airy bleached ash tabletop on matte white cylindrical legs; swap anytime for free." },
  desk_matte_obsidian: { name: "Matte Obsidian & Titanium Desk", desc: "Sleek matte charcoal laminate top with dark titanium legs; swap anytime for free." },
  desk_carrara_marble: { name: "Carrara Marble & Gold Desk", desc: "Smooth Carrara marble tabletop with subtle grey veins & satin gold legs; swap anytime." },
  desk_terrazzo_mint: { name: "Mint Terrazzo & Cream Desk", desc: "Speckled sage-terrazzo tabletop paired with warm cream metal legs; swap anytime." },
  desk_brushed_alu: { name: "Brushed Aluminum Studio Desk", desc: "Anodized brushed silver aluminum tabletop with slate-silver legs; swap anytime." },
  desk_sakura_pastel: { name: "Morandi Rose & Champagne Desk", desc: "Soft satin blush-rose lacquer tabletop with light champagne legs; swap anytime." },
  sheet_terracotta: { name: "Warm Terracotta Bedding", desc: "Washed terracotta duvet with cream sheets. Free to swap anytime." },
  sheet_sage: { name: "Forest Sage Bedding", desc: "Fresh sage cotton quilt with soft green pillowcases for restful sleep." },
  sheet_sakura: { name: "Blush Sakura Bedding", desc: "Gentle sakura pink cotton bedding with airy cloud pillows." },
  sheet_midnight: { name: "Midnight Starlight Bedding", desc: "Deep indigo-navy bedding with subtle crescent embroidery." },
  rug_nordic: { name: "Nordic Diamond Woven Rug", desc: "Scandinavian oatmeal-gray geometric area rug with cozy texture." },
  rug_terracotta: { name: "Boho Tassel Loom Rug", desc: "Warm terracotta flatweave rug with braided fringe edges." },
  rug_moss: { name: "Moss Green Plush Round Rug", desc: "Fluffy moss-green circular rug that softens studio acoustics." },
  rug_checkered: { name: "Retro Mocha Checker Rug", desc: "Espresso & cream woven checkerboard rug for a vintage vibe." },
  shirt_linen_oat: { name: "Oatmeal Linen Shirt", desc: "Breathable natural oat linen button-down with a crisp white collar." },
  shirt_sage_tee: { name: "Sage Relaxed Cotton Tee", desc: "Oversized washed sage tee over a crisp cream base layer." },
  shirt_chambray_blue: { name: "Washed Chambray Shirt", desc: "Relaxed indigo-washed denim shirt with an easy studio feel." },
  shirt_sand_cardigan: { name: "Warm Sand Knit Cardigan", desc: "Cozy oat cardigan layered over a cream tee for long drawing sessions." },
  shirt_moss_raglan: { name: "Forest Raglan 3/4 Sleeve", desc: "Off-white body with deep forest green raglan sleeves & trim." },
  shirt_terracotta_knit: { name: "Terracotta Striped Knit", desc: "Warm terracotta knit sweater accented with a cream chest stripe." },
  shirt_mist_hoodie: { name: "Misty Blue Pullover Hoodie", desc: "Soft blue-gray cotton hoodie made for late-night sketching." },
  shirt_olive_chore: { name: "Olive Twill Chore Jacket", desc: "Structured olive canvas jacket paired with a clean beige tee." },
  shirt_espresso_waffle: { name: "Cocoa Waffle Long-Sleeve", desc: "Rich espresso waffle-knit top with a warm almond crew neck." },
  shirt_blush_linen: { name: "Dusty Rose Linen Top", desc: "Muted rose pure-cotton linen shirt that drapes softly." },
  pants_raw_denim: { name: "Raw Selvedge Denim", desc: "Classic dark-indigo jeans with clean cuffed hems." },
  pants_washed_denim: { name: "Sky Washed Jeans", desc: "Light indigo straight-fit denim that matches any earth-tone top." },
  pants_khaki_chino: { name: "Khaki Twill Chinos", desc: "Tailored cotton chinos paired with a slim dark-brown belt." },
  pants_olive_cargo: { name: "Olive Relaxed Cargo Pants", desc: "Easygoing olive utility trousers built for studio comfort." },
  pants_oat_linen: { name: "Oatmeal Linen Wide Trousers", desc: "Breezy drawstring linen pants with relaxed magazine flair." },
  pants_mocha_corduroy: { name: "Mocha Corduroy Trousers", desc: "Fine-wale mocha corduroy pants that feel cozy all afternoon." },
  pants_slate_sweatpants: { name: "Heathered Slate Joggers", desc: "Soft athletic cotton joggers made for stretching or sofa lounging." },
  pants_charcoal_pleated: { name: "Charcoal Pleated Slacks", desc: "Draped charcoal tailored trousers with effortless urban polish." },
  pants_sand_shorts: { name: "Sand Linen Knee Shorts", desc: "Breezy knee-length linen shorts for coffee breaks and errands." },
  pants_forest_shorts: { name: "Pine Outdoor Utility Shorts", desc: "Breathable pine-green shorts with cream drawstring ties." },
  desk_plant: { name: "Monstera Desk Plant", desc: "Cute terracotta Monstera pot for the corner of your work desk." },
  wall_poster: { name: "Framed Wall Poster", desc: "Wooden-framed landscape artwork (supports custom cropped photos!)." },
  coat_rack: { name: "Standing Coat Rack", desc: "Solid oak coat tree by the door for tote bags, scarves & caps." },
  bed_lamp: { name: "Warm Bedside Lamp", desc: "Glowing bedside lamp & mini nightstand; click to toggle." },
  floor_plant: { name: "Fiddle-Leaf Fig Planter", desc: "Woven-basket indoor fig tree bringing fresh greenery to your room." },
  arc_lamp_brass: { name: "Brass Dome Arc Floor Lamp", desc: "Dark marble base with slender brushed-brass arch & dome shade; click to toggle warm light." },
  arc_lamp_black: { name: "Matte Black Drum Arc Floor Lamp", desc: "Wide matte-black disc base, tall sweeping arch & drum shade; click to toggle glow." },
  cool_keyboard: { name: "RGB Mechanical Keyboard", desc: "Upgrade your desk setup with a glowing mechanical keyboard." },
  coffee_bar: { name: "Pour-Over Coffee Bar", desc: "Compact wooden brew station with gooseneck kettle for fresh fuel." },
  ergo_chair: { name: "Ergonomic Studio Chair", desc: "High-back breathable lumbar chair built for marathon commissions." },
  vinyl_player: { name: "Retro Vinyl Console", desc: "Walnut turntable cabinet along the wall; click to spin records." },
  cozy_sofa: { name: "Cozy Fabric Sofa", desc: "Plush two-seater fabric couch perfect for relaxing or watching TV." },
  smart_toilet: { name: "Smart Heated Bidet Toilet", desc: "Upgrades the bathroom fixture with warm seat & subtle nightlight." },
  dual_monitor: { name: "Color-Calibrated Dual Display", desc: "Adds a vertical color-reference display next to your iMac." },
  wall_tv: { name: "Wall-Mounted Smart TV", desc: "Slim smart TV on your wall—click anytime to watch YouTube." },
  hamster_cage: { name: "Mochi the Hamster & Side Table", desc: "Adds a two-drawer side table beside your desk with Mochi running happily in his wheel!" },
  orange_cat: { name: "Ginger Cat & Pet Bed", desc: "Adopt an adorable orange tabby roommate who lounges in his own bed." },
  dolby_atmos: { name: "Dolby Atmos Surround System", desc: "Unlocked with TV + Sofa! Includes a movable front soundbar/sub and rear towers." }
};

export function getShopCategoryLabel(cat) {
  if (!cat) return "";
  return isEn() ? (cat.labelEn || cat.label) : cat.label;
}

export function getShopItemName(item) {
  if (!item) return "";
  if (isEn()) {
    return item.nameEn || SHOP_CATALOG_EN[item.id]?.name || item.name || item.id;
  }
  return item.name || item.id;
}

export function getShopItemDesc(item) {
  if (!item) return "";
  if (isEn()) {
    return item.descEn || SHOP_CATALOG_EN[item.id]?.desc || item.desc || "";
  }
  return item.desc || "";
}

export const DEFAULT_WALL_COLOR = "#f3eadc";
export const DEFAULT_FLOOR_STYLE = "default";
export const DEFAULT_DESK_STYLE = "default";
export const DEFAULT_BED_SHEET = "default";
export const DEFAULT_RUG_STYLE = "default";
export const DEFAULT_SHIRT_STYLE = "default";
export const DEFAULT_PANTS_STYLE = "default";

export const FLOOR_STYLE_PRESETS = {
  default: {
    id: "default",
    name: "經典蜂蜜橡木地板",
    pattern: "wood_plank",
    baseColor: "#d8a774",
    accentColor: "#c4905c",
    detailColor: "#b87f4a",
    roughness: 0.62,
    metalness: 0.04
  },
  floor_ash_nordic: {
    id: "floor_ash_nordic",
    name: "北歐白蠟淺木紋地板",
    pattern: "wood_plank",
    baseColor: "#e6ddcf",
    accentColor: "#d2c5b2",
    detailColor: "#c5b6a0",
    roughness: 0.68,
    metalness: 0.03
  },
  floor_walnut_herringbone: {
    id: "floor_walnut_herringbone",
    name: "深胡桃木人字拼地板",
    pattern: "herringbone",
    baseColor: "#6d4c37",
    accentColor: "#533827",
    detailColor: "#85614a",
    roughness: 0.52,
    metalness: 0.06
  },
  floor_bamboo_tatami: {
    id: "floor_bamboo_tatami",
    name: "和風編織竹木／榻榻米席紋",
    pattern: "tatami",
    baseColor: "#c9be90",
    accentColor: "#4f6d52",
    detailColor: "#b1a575",
    roughness: 0.78,
    metalness: 0.02
  },
  floor_carrara_marble: {
    id: "floor_carrara_marble",
    name: "卡拉拉白雪花大理石",
    pattern: "marble",
    baseColor: "#f2f0ea",
    accentColor: "#b7bec7",
    detailColor: "#d8dde3",
    roughness: 0.24,
    metalness: 0.08
  },
  floor_terrazzo_warm: {
    id: "floor_terrazzo_warm",
    name: "義大利暖彩水磨石",
    pattern: "terrazzo",
    baseColor: "#ece5d9",
    accentColor: "#c96f4a",
    detailColor: "#5f7f6d",
    roughness: 0.36,
    metalness: 0.05
  },
  floor_dark_slate: {
    id: "floor_dark_slate",
    name: "曜石深灰板岩磚",
    pattern: "slate",
    baseColor: "#4b525c",
    accentColor: "#343942",
    detailColor: "#636b77",
    roughness: 0.74,
    metalness: 0.06
  },
  floor_checker_retro: {
    id: "floor_checker_retro",
    name: "復古奶油可可棋盤磚",
    pattern: "checker",
    baseColor: "#f0e8da",
    accentColor: "#5a4236",
    detailColor: "#cfc4b2",
    roughness: 0.42,
    metalness: 0.05
  },
  floor_hex_terracotta: {
    id: "floor_hex_terracotta",
    name: "地中海六角赤陶磚",
    pattern: "hexagon",
    baseColor: "#c77451",
    accentColor: "#d98d6b",
    detailColor: "#ebe2d3",
    roughness: 0.72,
    metalness: 0.03
  },
  floor_moroccan_star: {
    id: "floor_moroccan_star",
    name: "摩洛哥青花幾何花磚",
    pattern: "moroccan",
    baseColor: "#f3efe6",
    accentColor: "#385b8a",
    detailColor: "#7597bf",
    roughness: 0.46,
    metalness: 0.04
  }
};

export const DESK_STYLE_PRESETS = {
  default: {
    id: "default",
    name: "經典原木蜂蜜桌",
    pattern: "wood",
    topColor: "#cfa072",
    grainColor: "#bc8b5b",
    detailColor: "#d9b084",
    roughness: 0.52,
    metalness: 0.02,
    legColor: "#4b5563",
    legRoughness: 0.45,
    legMetalness: 0.30
  },
  desk_walnut_brass: {
    id: "desk_walnut_brass",
    name: "黑胡桃實木×香檳金腳",
    pattern: "wood",
    topColor: "#5f402e",
    grainColor: "#462c1e",
    detailColor: "#75513c",
    roughness: 0.48,
    metalness: 0.04,
    legColor: "#c7a467",
    legRoughness: 0.28,
    legMetalness: 0.68
  },
  desk_ash_white: {
    id: "desk_ash_white",
    name: "北歐白蠟木×純白腳",
    pattern: "wood",
    topColor: "#e8dfd1",
    grainColor: "#d3c6b4",
    detailColor: "#f0e9dd",
    roughness: 0.58,
    metalness: 0.02,
    legColor: "#e5e7eb",
    legRoughness: 0.42,
    legMetalness: 0.25
  },
  desk_matte_obsidian: {
    id: "desk_matte_obsidian",
    name: "極簡曜石霧黑×鈦灰腳",
    pattern: "matte",
    topColor: "#272b33",
    grainColor: "#1d2027",
    detailColor: "#363c48",
    roughness: 0.64,
    metalness: 0.14,
    legColor: "#3f4654",
    legRoughness: 0.35,
    legMetalness: 0.55
  },
  desk_carrara_marble: {
    id: "desk_carrara_marble",
    name: "雪花大理石×霧金桌腳",
    pattern: "marble",
    topColor: "#f3f1ec",
    grainColor: "#b8c0ca",
    detailColor: "#d8dde4",
    roughness: 0.22,
    metalness: 0.08,
    legColor: "#d1ae6c",
    legRoughness: 0.26,
    legMetalness: 0.72
  },
  desk_terrazzo_mint: {
    id: "desk_terrazzo_mint",
    name: "薄荷水磨石×奶白桌腳",
    pattern: "terrazzo",
    topColor: "#e6ece8",
    grainColor: "#6b9c87",
    detailColor: "#d48263",
    roughness: 0.34,
    metalness: 0.05,
    legColor: "#dfd7ca",
    legRoughness: 0.40,
    legMetalness: 0.25
  },
  desk_brushed_alu: {
    id: "desk_brushed_alu",
    name: "航太拉絲銀鋁×鐵灰腳",
    pattern: "brushed",
    topColor: "#cfd6df",
    grainColor: "#b3bcc8",
    detailColor: "#e2e7ef",
    roughness: 0.28,
    metalness: 0.74,
    legColor: "#64748b",
    legRoughness: 0.30,
    legMetalness: 0.65
  },
  desk_sakura_pastel: {
    id: "desk_sakura_pastel",
    name: "莫蘭迪櫻粉烤漆×奶油金腳",
    pattern: "matte",
    topColor: "#ead0ce",
    grainColor: "#d9b5b2",
    detailColor: "#f3dfdd",
    roughness: 0.36,
    metalness: 0.08,
    legColor: "#d8c2a6",
    legRoughness: 0.32,
    legMetalness: 0.58
  }
};

export const SHIRT_STYLE_PRESETS = {
  default: {
    id: "default",
    name: "基本素色上衣",
    shirtColor: null,
    sleeveColor: null,
    collarColor: null,
    detailColor: null,
    detailType: "basic"
  },
  shirt_linen_oat: {
    id: "shirt_linen_oat",
    name: "亞麻燕麥襯衫",
    shirtColor: "#ebe2d2",
    sleeveColor: "#ebe2d2",
    collarColor: "#f7f3eb",
    detailColor: "#d1c1aa",
    detailType: "pocket"
  },
  shirt_sage_tee: {
    id: "shirt_sage_tee",
    name: "鼠尾草棉質寬T",
    shirtColor: "#7d9b84",
    sleeveColor: "#7d9b84",
    collarColor: "#f5f1e6",
    detailColor: "#65826c",
    detailType: "collar"
  },
  shirt_chambray_blue: {
    id: "shirt_chambray_blue",
    name: "水洗丹寧襯衫",
    shirtColor: "#6e8aa8",
    sleeveColor: "#6e8aa8",
    collarColor: "#f4f1ea",
    detailColor: "#577290",
    detailType: "pocket"
  },
  shirt_sand_cardigan: {
    id: "shirt_sand_cardigan",
    name: "暖沙針織開襟衫",
    shirtColor: "#c9ae8c",
    sleeveColor: "#c9ae8c",
    collarColor: "#f7f2e9",
    detailColor: "#f7f2e9",
    detailType: "cardigan"
  },
  shirt_moss_raglan: {
    id: "shirt_moss_raglan",
    name: "森霧拼色七分袖",
    shirtColor: "#f1ebe0",
    sleeveColor: "#5f7f67",
    collarColor: "#5f7f67",
    detailColor: "#5f7f67",
    detailType: "raglan"
  },
  shirt_terracotta_knit: {
    id: "shirt_terracotta_knit",
    name: "赤陶條紋針織衫",
    shirtColor: "#c97053",
    sleeveColor: "#c97053",
    collarColor: "#efe6d6",
    detailColor: "#efe6d6",
    detailType: "stripe"
  },
  shirt_mist_hoodie: {
    id: "shirt_mist_hoodie",
    name: "晨霧棉柔連帽T",
    shirtColor: "#8ea4b8",
    sleeveColor: "#8ea4b8",
    collarColor: "#f2efe9",
    detailColor: "#f2efe9",
    detailType: "hoodie"
  },
  shirt_olive_chore: {
    id: "shirt_olive_chore",
    name: "橄欖綠工裝夾克",
    shirtColor: "#6c7656",
    sleeveColor: "#6c7656",
    collarColor: "#efe8da",
    detailColor: "#efe8da",
    detailType: "cardigan"
  },
  shirt_espresso_waffle: {
    id: "shirt_espresso_waffle",
    name: "深焙可可華夫格長袖",
    shirtColor: "#5e463a",
    sleeveColor: "#5e463a",
    collarColor: "#e6d8c5",
    detailColor: "#e6d8c5",
    detailType: "collar"
  },
  shirt_blush_linen: {
    id: "shirt_blush_linen",
    name: "煙粉柔棉亞麻衫",
    shirtColor: "#cfa09c",
    sleeveColor: "#cfa09c",
    collarColor: "#f7efe9",
    detailColor: "#b88783",
    detailType: "pocket"
  }
};

export const PANTS_STYLE_PRESETS = {
  default: {
    id: "default",
    name: "經典深灰長褲",
    pantsColor: "#374151",
    beltColor: null,
    cuffColor: null,
    shoeColor: "#f8fafc",
    detailType: "basic",
    isShorts: false
  },
  pants_raw_denim: {
    id: "pants_raw_denim",
    name: "原色丹寧直筒褲",
    pantsColor: "#364d6d",
    beltColor: "#8a6345",
    cuffColor: "#6f87a6",
    shoeColor: "#f6f3ec",
    detailType: "cuff",
    isShorts: false
  },
  pants_washed_denim: {
    id: "pants_washed_denim",
    name: "淺藍水洗牛仔褲",
    pantsColor: "#7b96b4",
    beltColor: "#966f4e",
    cuffColor: "#b8cae0",
    shoeColor: "#f8fafc",
    detailType: "cuff",
    isShorts: false
  },
  pants_khaki_chino: {
    id: "pants_khaki_chino",
    name: "卡其斜紋休閒褲",
    pantsColor: "#bfa582",
    beltColor: "#6e4d37",
    cuffColor: null,
    shoeColor: "#f3eee4",
    detailType: "belt",
    isShorts: false
  },
  pants_olive_cargo: {
    id: "pants_olive_cargo",
    name: "軍綠棉質寬版工作褲",
    pantsColor: "#667056",
    beltColor: "#4f5742",
    cuffColor: "#7c876a",
    shoeColor: "#ebe5da",
    detailType: "cuff",
    isShorts: false
  },
  pants_oat_linen: {
    id: "pants_oat_linen",
    name: "米白亞麻寬褲",
    pantsColor: "#e7dfd0",
    beltColor: "#b8a58d",
    cuffColor: null,
    shoeColor: "#d6c4ae",
    detailType: "belt",
    isShorts: false
  },
  pants_mocha_corduroy: {
    id: "pants_mocha_corduroy",
    name: "摩卡燈芯絨長褲",
    pantsColor: "#725644",
    beltColor: "#cbb8a2",
    cuffColor: null,
    shoeColor: "#f1eadf",
    detailType: "belt",
    isShorts: false
  },
  pants_slate_sweatpants: {
    id: "pants_slate_sweatpants",
    name: "霧灰棉柔居家縮口褲",
    pantsColor: "#939aa3",
    beltColor: "#e5e7eb",
    cuffColor: "#78808a",
    shoeColor: "#f4f4f5",
    detailType: "cuff",
    isShorts: false
  },
  pants_charcoal_pleated: {
    id: "pants_charcoal_pleated",
    name: "曜石灰西裝寬褲",
    pantsColor: "#454b54",
    beltColor: "#292d33",
    cuffColor: null,
    shoeColor: "#e7e3dc",
    detailType: "belt",
    isShorts: false
  },
  pants_sand_shorts: {
    id: "pants_sand_shorts",
    name: "亞麻沙色五分短褲",
    pantsColor: "#cfb899",
    beltColor: "#ece3d4",
    cuffColor: null,
    shoeColor: "#f4efe6",
    detailType: "shorts",
    isShorts: true
  },
  pants_forest_shorts: {
    id: "pants_forest_shorts",
    name: "松柏綠戶外休閒短褲",
    pantsColor: "#4f6d5c",
    beltColor: "#d9cdb8",
    cuffColor: null,
    shoeColor: "#ebe6dc",
    detailType: "shorts",
    isShorts: true
  }
};

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
    id: "floor_honey_oak",
    name: "經典蜂蜜橡木地板",
    category: "floor",
    consumable: true,
    floorStyleId: DEFAULT_FLOOR_STYLE,
    price: 100,
    icon: "🍯",
    floorStyle: FLOOR_STYLE_PRESETS.default,
    desc: "溫潤經典的原始蜂蜜橡木地板與鋪設工錢，每次換鋪或復原皆需重新購買。"
  },
  {
    id: "floor_ash_nordic",
    name: "北歐白蠟淺木紋地板",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_ash_nordic",
    price: 140,
    icon: "🪵",
    floorStyle: FLOOR_STYLE_PRESETS.floor_ash_nordic,
    desc: "明亮清爽的淺色北歐白蠟實木拼接，讓採光更顯柔和寬敞，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_walnut_herringbone",
    name: "深胡桃木人字拼地板",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_walnut_herringbone",
    price: 160,
    icon: "🤎",
    floorStyle: FLOOR_STYLE_PRESETS.floor_walnut_herringbone,
    desc: "溫潤典雅的深胡桃實木搭配經典人字拼紋理，工作室質感瞬間升級，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_bamboo_tatami",
    name: "和風編織竹木／榻榻米席紋",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_bamboo_tatami",
    price: 170,
    icon: "🎋",
    floorStyle: FLOOR_STYLE_PRESETS.floor_bamboo_tatami,
    desc: "細緻草蓆編織感搭配深森綠緣邊框線，營造靜謐日式創作空間，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_carrara_marble",
    name: "卡拉拉白雪花大理石",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_carrara_marble",
    price: 220,
    icon: "🏛️",
    floorStyle: FLOOR_STYLE_PRESETS.floor_carrara_marble,
    desc: "潔白溫潤石材表面流動自然淡灰脈絡，映出微光倒影，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_terrazzo_warm",
    name: "義大利暖彩水磨石",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_terrazzo_warm",
    price: 190,
    icon: "🪨",
    floorStyle: FLOOR_STYLE_PRESETS.floor_terrazzo_warm,
    desc: "奶油石底鑲嵌赤陶、鼠尾草與金黃天然碎石紋樣，活潑又耐看，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_dark_slate",
    name: "曜石深灰板岩磚",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_dark_slate",
    price: 180,
    icon: "🌑",
    floorStyle: FLOOR_STYLE_PRESETS.floor_dark_slate,
    desc: "沉穩內斂的霧面深炭黑板岩石磚，極簡工業與深夜接案首選，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_checker_retro",
    name: "復古奶油可可棋盤磚",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_checker_retro",
    price: 160,
    icon: "🏁",
    floorStyle: FLOOR_STYLE_PRESETS.floor_checker_retro,
    desc: "懷舊歐風咖啡館經典奶油與深焙可可方格拼貼磚，復古感滿分，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_hex_terracotta",
    name: "地中海六角赤陶磚",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_hex_terracotta",
    price: 180,
    icon: "🧱",
    floorStyle: FLOOR_STYLE_PRESETS.floor_hex_terracotta,
    desc: "暖陽窯燒赤陶六角花磚配上米白填縫，充滿南歐手作暖意，每次重鋪皆需重新付費施作。"
  },
  {
    id: "floor_moroccan_star",
    name: "摩洛哥青花幾何花磚",
    category: "floor",
    consumable: true,
    floorStyleId: "floor_moroccan_star",
    price: 200,
    icon: "💠",
    floorStyle: FLOOR_STYLE_PRESETS.floor_moroccan_star,
    desc: "象牙白底勾勒靛青星芒菱紋藝術花磚，打造獨樹一格的視覺亮點，每次重鋪皆需重新付費施作。"
  },
  {
    id: "desk_ash_white",
    name: "北歐白蠟木×純白桌腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 120,
    icon: "🪵",
    deskStyle: DESK_STYLE_PRESETS.desk_ash_white,
    desc: "保留相同極簡書桌尺寸，換成清爽淺白蠟木桌面與霧白桌腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_walnut_brass",
    name: "黑胡桃實木×香檳金腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 140,
    icon: "🤎",
    deskStyle: DESK_STYLE_PRESETS.desk_walnut_brass,
    desc: "保留相同極簡書桌尺寸，換成深沉胡桃木紋桌面搭配香檳金柱腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_sakura_pastel",
    name: "莫蘭迪櫻粉烤漆×奶油金腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 140,
    icon: "🌸",
    deskStyle: DESK_STYLE_PRESETS.desk_sakura_pastel,
    desc: "保留相同極簡書桌尺寸，柔霧櫻粉緞面桌面配奶油香檳金桌腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_matte_obsidian",
    name: "極簡曜石霧黑×鈦灰腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 150,
    icon: "🖤",
    deskStyle: DESK_STYLE_PRESETS.desk_matte_obsidian,
    desc: "保留相同極簡書桌尺寸，耐看霧黑桌面搭配深鈦灰圓柱腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_terrazzo_mint",
    name: "薄荷水磨石×奶白桌腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 170,
    icon: "🪨",
    deskStyle: DESK_STYLE_PRESETS.desk_terrazzo_mint,
    desc: "保留相同極簡書桌尺寸，鼠尾草薄荷水磨石質感桌面配奶白桌腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_brushed_alu",
    name: "航太拉絲銀鋁×鐵灰腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 180,
    icon: "🪩",
    deskStyle: DESK_STYLE_PRESETS.desk_brushed_alu,
    desc: "保留相同極簡書桌尺寸，金屬拉絲銀鋁工作檯面配鐵灰金屬腳，購買後可免費隨時切換。"
  },
  {
    id: "desk_carrara_marble",
    name: "雪花大理石×霧金桌腳",
    category: "desk",
    textileKind: "deskStyle",
    price: 200,
    icon: "🏛️",
    deskStyle: DESK_STYLE_PRESETS.desk_carrara_marble,
    desc: "保留相同極簡書桌尺寸，亮澤卡拉拉白雪花大理石桌面配霧金桌腳，購買後可免費隨時切換。"
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
    id: "shirt_linen_oat",
    name: "亞麻燕麥襯衫",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 85,
    icon: "👕",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_linen_oat,
    desc: "透氣亞麻燕麥色日常襯衫，附小胸袋點綴，輕鬆穿出自然文青感。"
  },
  {
    id: "shirt_sage_tee",
    name: "鼠尾草棉質寬T",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 75,
    icon: "🌿",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_sage_tee,
    desc: "柔霧鼠尾草綠重磅純棉短T，領口微露奶油白內搭，耐看又清爽。"
  },
  {
    id: "shirt_chambray_blue",
    name: "水洗丹寧襯衫",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 95,
    icon: "🩵",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_chambray_blue,
    desc: "水洗淺靛青丹寧布襯衫，寬鬆自在又帶一點率性工作室氣息。"
  },
  {
    id: "shirt_sand_cardigan",
    name: "暖沙針織開襟衫",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 120,
    icon: "🧶",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_sand_cardigan,
    desc: "溫潤燕麥沙色毛線開襟外套內搭米白上衣，畫畫久坐也溫暖。"
  },
  {
    id: "shirt_moss_raglan",
    name: "森霧拼色七分袖",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 90,
    icon: "🌲",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_moss_raglan,
    desc: "米白衣身搭配森林墨綠插肩袖與滾邊領口，自然又帶點美式休閒。"
  },
  {
    id: "shirt_terracotta_knit",
    name: "赤陶條紋針織衫",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 105,
    icon: "🍂",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_terracotta_knit,
    desc: "溫暖赤陶橘紅搭一條奶霜橫紋，低調柔和卻非常顯氣色。"
  },
  {
    id: "shirt_mist_hoodie",
    name: "晨霧棉柔連帽T",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 115,
    icon: "☁️",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_mist_hoodie,
    desc: "輕柔霧藍灰連帽衛衣配雙抽繩，在家追劇或深夜趕稿最舒服。"
  },
  {
    id: "shirt_olive_chore",
    name: "橄欖綠工裝夾克",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 130,
    icon: "🧥",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_olive_chore,
    desc: "自然橄欖綠斜紋工裝外套內搭米色打底，簡約俐落很有職人味。"
  },
  {
    id: "shirt_espresso_waffle",
    name: "深焙可可華夫格長袖",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 100,
    icon: "☕",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_espresso_waffle,
    desc: "濃厚咖啡可可色格紋棉衫配淺杏圓領邊，溫暖沉穩不單調。"
  },
  {
    id: "shirt_blush_linen",
    name: "煙粉柔棉亞麻衫",
    category: "shirt",
    textileKind: "shirtStyle",
    price: 95,
    icon: "🌷",
    shirtStyle: SHIRT_STYLE_PRESETS.shirt_blush_linen,
    desc: "低飽和煙燻乾燥玫瑰粉純棉上衣，柔和親膚、越洗越有質感。"
  },
  {
    id: "pants_raw_denim",
    name: "原色丹寧直筒褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 80,
    icon: "👖",
    pantsStyle: PANTS_STYLE_PRESETS.pants_raw_denim,
    desc: "經典深藍原色赤耳牛仔褲，褲腳微捲露出一圈淺色反折超百搭。"
  },
  {
    id: "pants_washed_denim",
    name: "淺藍水洗牛仔褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 85,
    icon: "🩵",
    pantsStyle: PANTS_STYLE_PRESETS.pants_washed_denim,
    desc: "清爽水洗天藍丹寧直筒褲，配任何大地色上衣都自然好看。"
  },
  {
    id: "pants_khaki_chino",
    name: "卡其斜紋休閒褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 75,
    icon: "🌾",
    pantsStyle: PANTS_STYLE_PRESETS.pants_khaki_chino,
    desc: "自然卡其棉斜紋長褲搭配深棕細皮帶，日常出門或見客戶都合適。"
  },
  {
    id: "pants_olive_cargo",
    name: "軍綠棉質寬版工作褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 95,
    icon: "🪖",
    pantsStyle: PANTS_STYLE_PRESETS.pants_olive_cargo,
    desc: "寬鬆自在的軍綠水洗工裝褲，自然垂墜感讓站姿與走動更隨性。"
  },
  {
    id: "pants_oat_linen",
    name: "米白亞麻寬褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 90,
    icon: "🐚",
    pantsStyle: PANTS_STYLE_PRESETS.pants_oat_linen,
    desc: "天然原胚米白亞麻抽繩寬褲，輕盈涼爽又有日系雜誌休閒感。"
  },
  {
    id: "pants_mocha_corduroy",
    name: "摩卡燈芯絨長褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 105,
    icon: "🌰",
    pantsStyle: PANTS_STYLE_PRESETS.pants_mocha_corduroy,
    desc: "溫暖摩卡棕細條燈芯絨長褲，秋冬午後在工作室穿起來格外溫馨。"
  },
  {
    id: "pants_slate_sweatpants",
    name: "霧灰棉柔居家縮口褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 70,
    icon: "☁️",
    pantsStyle: PANTS_STYLE_PRESETS.pants_slate_sweatpants,
    desc: "花紗淺灰純棉運動縮口褲，沙發追劇或做伏地挺身零束縛。"
  },
  {
    id: "pants_charcoal_pleated",
    name: "曜石灰西裝寬褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 110,
    icon: "🖤",
    pantsStyle: PANTS_STYLE_PRESETS.pants_charcoal_pleated,
    desc: "垂墜流暢的木炭深灰打摺寬褲，低調俐落又帶有都會鬆弛感。"
  },
  {
    id: "pants_sand_shorts",
    name: "亞麻沙色五分短褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 70,
    icon: "🏖️",
    pantsStyle: PANTS_STYLE_PRESETS.pants_sand_shorts,
    desc: "輕便舒爽的沙色亞麻及膝短褲，夏天泡手沖或出門買麵包超輕鬆。"
  },
  {
    id: "pants_forest_shorts",
    name: "松柏綠戶外休閒短褲",
    category: "pants",
    textileKind: "pantsStyle",
    price: 75,
    icon: "🌲",
    pantsStyle: PANTS_STYLE_PRESETS.pants_forest_shorts,
    desc: "沈穩松柏綠尼龍棉質及膝短褲配米色抽繩，活潑透氣好活動。"
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
    id: "arc_lamp_brass",
    name: "黃銅穹頂釣魚落地燈",
    category: "decor",
    price: 230,
    icon: "💡",
    previewImage: "./assets/shop/arc_lamp_brass.jpg",
    desc: "深灰圓石底座搭細長拉絲黃銅弧形燈桿與半圓金屬穹頂燈罩，可自由擺放並點擊開關暖光。"
  },
  {
    id: "arc_lamp_black",
    name: "極簡霧黑釣魚落地燈",
    category: "decor",
    price: 250,
    icon: "💡",
    previewImage: "./assets/shop/arc_lamp_black.jpg",
    desc: "簡約霧黑寬圓盤底座配高挑弧線燈桿與錐形深黑燈罩，擺在沙發或工作區旁質感滿分，可點擊開關照明。"
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
    id: "hamster_cage",
    name: "布丁倉鼠「麻糬」與小抽屜桌",
    category: "decor",
    price: 380,
    icon: "🐹",
    previewImage: "./assets/shop/hamster_cage.jpg",
    desc: "購買後會在書桌左邊擺上專屬雙抽屜小邊桌，並把透明鼠籠穩穩放在桌面上！可愛倉鼠「麻糬」整天在滾輪上奔跑。"
  },
  {
    id: "orange_cat",
    name: "橘貓室友「阿橘」與貓窩",
    category: "decor",
    price: 420,
    icon: "🐈",
    previewImage: "./assets/shop/orange_cat.jpg",
    desc: "領養一隻會搖尾巴的可愛肥橘貓住在暖烘烘貓窩裡，可走去摸摸牠！"
  },
  {
    id: "dolby_atmos",
    name: "Dolby Atmos 環繞音響組",
    category: "decor",
    price: 480,
    icon: "🔊",
    requiresOwned: ["wall_tv", "cozy_sofa"],
    previewImage: "./assets/shop/dolby_atmos.jpg",
    desc: "購齊小電視與雙人沙發解鎖！含獨立可擺放的前置聲霸重低音與後環繞雙立柱音箱，不綁死電視與沙發、皆可自由移動旋轉。"
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

  const validCats = new Set(["paint", "floor", "desk", "textile", "shirt", "pants", "decor", "gear"]);
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
    if (base?.requiresOwned) {
      merged.requiresOwned = [...base.requiresOwned];
    }
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

export function getMissingShopPrerequisites(item, owned = {}) {
  if (!item || !Array.isArray(item.requiresOwned) || item.requiresOwned.length === 0) {
    return [];
  }
  return item.requiresOwned
    .filter(reqId => owned?.[reqId] !== true)
    .map(reqId => {
      const reqItem = getShopItem(reqId);
      return {
        id: reqId,
        name: reqItem ? getShopItemName(reqItem) : bi(reqId, reqId)
      };
    });
}

export function isSellableShopItem(item) {
  return Boolean(
    item
    && !item.consumable
    && !item.textileKind
    && (item.category === "decor" || item.category === "gear")
  );
}

export function getBlockingDependentOwnedItems(itemId, owned = {}) {
  return SHOP_CATALOG.filter(
    other => owned?.[other.id] === true
      && Array.isArray(other.requiresOwned)
      && other.requiresOwned.includes(itemId)
  );
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

export function resolveFloorStyle(floorStyleId) {
  if (!floorStyleId || floorStyleId === "floor_honey_oak") {
    return FLOOR_STYLE_PRESETS[DEFAULT_FLOOR_STYLE];
  }
  return FLOOR_STYLE_PRESETS[floorStyleId] || FLOOR_STYLE_PRESETS[DEFAULT_FLOOR_STYLE];
}

export function resolveDeskStyle(deskStyleId) {
  return DESK_STYLE_PRESETS[deskStyleId] || DESK_STYLE_PRESETS[DEFAULT_DESK_STYLE];
}

export function resolveBedSheetStyle(bedSheetId) {
  return BED_SHEET_PRESETS[bedSheetId] || BED_SHEET_PRESETS[DEFAULT_BED_SHEET];
}

export function resolveRugStyle(rugStyleId) {
  return RUG_STYLE_PRESETS[rugStyleId] || RUG_STYLE_PRESETS[DEFAULT_RUG_STYLE];
}

export function resolveShirtStyle(shirtStyleId) {
  return SHIRT_STYLE_PRESETS[shirtStyleId] || SHIRT_STYLE_PRESETS[DEFAULT_SHIRT_STYLE];
}

export function resolvePantsStyle(pantsStyleId) {
  return PANTS_STYLE_PRESETS[pantsStyleId] || PANTS_STYLE_PRESETS[DEFAULT_PANTS_STYLE];
}
