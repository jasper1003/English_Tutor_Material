import { bi, isEn } from "./i18n.js?v=20261128a";

export const GRID_STEP = 0.5;
export const GRID_CELLS = 16; // 16 x 16 cells across [-4.0, +4.0] room floor & walls

// Non-movable reserved floor zones: bathroom corner + doorway landing + entrance doormat swing zone
export const RESERVED_FLOOR_RECTS = [
  { minX: 11, maxX: 15, minZ: 0, maxZ: 4, reason: "浴室空間", reasonEn: "Bathroom area" },
  { minX: 11, maxX: 12, minZ: 5, maxZ: 5, reason: "浴室出入口", reasonEn: "Bathroom entrance" },
  { minX: 0, maxX: 1, minZ: 11, maxZ: 13, reason: "大門與門口地毯（收貨區）", reasonEn: "Doorway & parcel mat" }
];

// Non-movable reserved wall segments (`pos` 0..15 along [-4.0..+4.0])
export const RESERVED_WALL_SPANS = {
  north: [
    { minPos: 5, maxPos: 9, reason: "北側大窗戶", reasonEn: "North window" },
    { minPos: 11, maxPos: 15, reason: "浴室牆面", reasonEn: "Bathroom wall" }
  ],
  east: [
    { minPos: 0, maxPos: 4, reason: "浴室牆面", reasonEn: "Bathroom wall" }
  ],
  south: [],
  west: [
    { minPos: 10, maxPos: 13, reason: "租屋大門", reasonEn: "Entrance door" }
  ]
};

export const WALL_NAMES = ["north", "east", "south", "west"];

export const PLACEABLE_FURNITURE_META = {
  work_desk: {
    id: "work_desk",
    name: "接案書桌與電腦組",
    nameEn: "Studio Desk & iMac",
    icon: "🖥️",
    starter: true,
    surface: "floor",
    gridW: 5,
    gridD: 3
  },
  single_bed: {
    id: "single_bed",
    name: "單人溫馨床鋪",
    nameEn: "Cozy Single Bed",
    icon: "🛏️",
    starter: true,
    surface: "floor",
    gridW: 4,
    gridD: 5
  },
  cozy_rug: {
    id: "cozy_rug",
    name: "客廳地毯",
    nameEn: "Studio Area Rug",
    icon: "🧶",
    starter: true,
    isFloorOverlay: true,
    surface: "floor",
    gridW: 5,
    gridD: 4
  },
  hamster_cage: {
    id: "hamster_cage",
    name: "布丁倉鼠「麻糬」與小抽屜桌",
    nameEn: "Mochi the Hamster & Side Table",
    icon: "🐹",
    starter: false,
    surface: "floor",
    gridW: 2,
    gridD: 2
  },
  coffee_bar: {
    id: "coffee_bar",
    name: "文青手沖咖啡吧台",
    nameEn: "Pour-Over Coffee Bar",
    icon: "☕",
    starter: false,
    surface: "floor",
    gridW: 2,
    gridD: 1
  },
  cozy_sofa: {
    id: "cozy_sofa",
    name: "雙人布藝沙發",
    nameEn: "Cozy Fabric Sofa",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 4,
    gridD: 2
  },
  sofa_walnut_daybed: {
    id: "sofa_walnut_daybed",
    name: "和風胡桃木日系休閒沙發",
    nameEn: "Japanese Walnut & Oat Futon Sofa",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 3,
    gridD: 2
  },
  sofa_nordic_navy: {
    id: "sofa_nordic_navy",
    name: "深海藍北歐麻布雙人沙發",
    nameEn: "Nordic Indigo Linen Loveseat",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 3,
    gridD: 2
  },
  sofa_boucle_cream: {
    id: "sofa_boucle_cream",
    name: "雲朵奶油羊羔絨沙發",
    nameEn: "Cream Bouclé Cloud Sofa",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 4,
    gridD: 2
  },
  sofa_terracotta_velvet: {
    id: "sofa_terracotta_velvet",
    name: "紅磚橘絲絨復古沙發",
    nameEn: "Terracotta Velvet Lounge Sofa",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 4,
    gridD: 2
  },
  sofa_cognac_leather: {
    id: "sofa_cognac_leather",
    name: "焦糖復古皮革沙發",
    nameEn: "Cognac Mid-Century Leather Sofa",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 4,
    gridD: 2
  },
  coat_rack: {
    id: "coat_rack",
    name: "門旁直立式掛衣架",
    nameEn: "Standing Coat Rack",
    icon: "🧥",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  vinyl_player: {
    id: "vinyl_player",
    name: "復古黑膠唱片音響櫃",
    nameEn: "Retro Vinyl Console",
    icon: "🎵",
    starter: false,
    surface: "floor",
    gridW: 3,
    gridD: 1
  },
  orange_cat: {
    id: "orange_cat",
    name: "橘貓室友「阿橘」與貓窩",
    nameEn: "Ginger Cat & Pet Bed",
    icon: "🐈",
    starter: false,
    surface: "floor",
    gridW: 2,
    gridD: 2
  },
  bed_lamp: {
    id: "bed_lamp",
    name: "床邊暖光小夜燈",
    nameEn: "Warm Bedside Lamp",
    icon: "💡",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  floor_plant: {
    id: "floor_plant",
    name: "琴葉榕編織落地盆栽",
    nameEn: "Fiddle-Leaf Fig Planter",
    icon: "🌿",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  arc_lamp_brass: {
    id: "arc_lamp_brass",
    name: "黃銅穹頂釣魚落地燈",
    nameEn: "Brass Dome Arc Floor Lamp",
    icon: "💡",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  arc_lamp_black: {
    id: "arc_lamp_black",
    name: "極簡霧黑釣魚落地燈",
    nameEn: "Matte Black Drum Arc Floor Lamp",
    icon: "💡",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_paper_lantern: {
    id: "lamp_paper_lantern",
    name: "和紙圓柱落地燈",
    nameEn: "Rice Paper Column Floor Lamp",
    icon: "🏮",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_uplighter_duo: {
    id: "lamp_uplighter_duo",
    name: "雙頭子母上照落地燈",
    nameEn: "Dual Uplighter & Reading Floor Lamp",
    icon: "💡",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_tripod_linen: {
    id: "lamp_tripod_linen",
    name: "北歐白橡三腳亞麻立燈",
    nameEn: "Nordic Oak Tripod Linen Floor Lamp",
    icon: "🛋️",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_globe_opal: {
    id: "lamp_globe_opal",
    name: "蛋白石圓球燈泡落地燈",
    nameEn: "Opal Glass Globe Bulb Floor Lamp",
    icon: "⚪",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_edison_cage: {
    id: "lamp_edison_cage",
    name: "工業風愛迪生烏絲籠燈",
    nameEn: "Edison Filament Diamond Cage Lamp",
    icon: "🕯️",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  lamp_mushroom_pleated: {
    id: "lamp_mushroom_pleated",
    name: "奶油百褶蘑菇美學立燈",
    nameEn: "Cream Pleated Mushroom Floor Lamp",
    icon: "🍄",
    starter: false,
    surface: "floor",
    gridW: 1,
    gridD: 1
  },
  wall_poster: {
    id: "wall_poster",
    name: "插畫海報掛畫",
    nameEn: "Framed Wall Poster",
    icon: "🖼️",
    starter: false,
    surface: "wall",
    gridW: 2,
    gridD: 1
  },
  wall_tv: {
    id: "wall_tv",
    name: "壁掛平面小電視",
    nameEn: "Wall-Mounted Smart TV",
    icon: "📺",
    starter: false,
    surface: "wall",
    gridW: 3,
    gridD: 1
  },
  dolby_atmos: {
    id: "dolby_atmos",
    name: "Dolby Atmos 前置聲霸與重低音",
    nameEn: "Dolby Atmos Front Soundbar & Sub",
    icon: "🔊",
    starter: false,
    surface: "floor",
    gridW: 3,
    gridD: 1
  },
  dolby_atmos_rear: {
    id: "dolby_atmos_rear",
    name: "Dolby Atmos 後環繞雙立柱音箱",
    nameEn: "Dolby Atmos Rear Surround Towers",
    icon: "🔊",
    starter: false,
    ownerKey: "dolby_atmos",
    companionParcelKey: "dolby_atmos",
    surface: "floor",
    gridW: 3,
    gridD: 1
  }
};

export function getPlaceableFurnitureName(itemId) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta) return bi("家具", "Furniture");
  return isEn() ? (meta.nameEn || meta.name) : meta.name;
}

export const DEFAULT_FURNITURE_LAYOUT = {
  work_desk: { surface: "floor", gx: 5, gz: 1, rot: 0 },
  single_bed: { surface: "floor", gx: 12, gz: 10, rot: 0 },
  cozy_rug: { surface: "floor", gx: 4, gz: 7, rot: 0 },
  hamster_cage: { surface: "floor", gx: 3, gz: 1, rot: 0 },
  coffee_bar: { surface: "floor", gx: 0, gz: 3, rot: 1 },
  cozy_sofa: { surface: "floor", gx: 4, gz: 5, rot: 3 },
  sofa_boucle_cream: { surface: "floor", gx: 7, gz: 7, rot: 0 },
  sofa_cognac_leather: { surface: "floor", gx: 7, gz: 10, rot: 0 },
  sofa_nordic_navy: { surface: "floor", gx: 3, gz: 11, rot: 0 },
  sofa_terracotta_velvet: { surface: "floor", gx: 7, gz: 12, rot: 2 },
  sofa_walnut_daybed: { surface: "floor", gx: 11, gz: 7, rot: 3 },
  coat_rack: { surface: "floor", gx: 1, gz: 14, rot: 0 },
  vinyl_player: { surface: "floor", gx: 5, gz: 15, rot: 2 },
  orange_cat: { surface: "floor", gx: 9, gz: 14, rot: 2 },
  bed_lamp: { surface: "floor", gx: 11, gz: 14, rot: 0 },
  floor_plant: { surface: "floor", gx: 14, gz: 6, rot: 0 },
  arc_lamp_brass: { surface: "floor", gx: 3, gz: 9, rot: 0 },
  arc_lamp_black: { surface: "floor", gx: 13, gz: 6, rot: 2 },
  lamp_paper_lantern: { surface: "floor", gx: 15, gz: 15, rot: 0 },
  lamp_uplighter_duo: { surface: "floor", gx: 2, gz: 1, rot: 0 },
  lamp_tripod_linen: { surface: "floor", gx: 10, gz: 1, rot: 0 },
  lamp_globe_opal: { surface: "floor", gx: 0, gz: 15, rot: 0 },
  lamp_edison_cage: { surface: "floor", gx: 15, gz: 7, rot: 2 },
  lamp_mushroom_pleated: { surface: "floor", gx: 11, gz: 10, rot: 0 },
  wall_poster: { surface: "wall", wall: "north", pos: 2 },
  wall_tv: { surface: "wall", wall: "west", pos: 6 },
  dolby_atmos: { surface: "floor", gx: 0, gz: 6, rot: 1 },
  dolby_atmos_rear: { surface: "floor", gx: 6, gz: 6, rot: 3 }
};

export function isPlaceableItem(itemId) {
  return Boolean(PLACEABLE_FURNITURE_META[itemId]);
}

export function isShopParcelItem(itemId) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  return Boolean(meta && !meta.starter && !meta.companionParcelKey);
}

export function getCompanionPlaceableIds(itemId) {
  return Object.values(PLACEABLE_FURNITURE_META)
    .filter(meta => (meta.ownerKey || meta.id) === itemId)
    .map(meta => meta.id);
}

export function getRotatedDims(itemId, rot = 0) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta) return { w: 1, d: 1 };
  const cleanRot = ((Math.trunc(Number(rot) || 0) % 4) + 4) % 4;
  return (cleanRot % 2 === 1)
    ? { w: meta.gridD, d: meta.gridW }
    : { w: meta.gridW, d: meta.gridD };
}

export function getFloorCellKey(gx, gz) {
  return `${gx},${gz}`;
}

export function getWallCellKey(wall, pos) {
  return `${wall}:${pos}`;
}

export function isFloorCellReserved(gx, gz) {
  if (gx < 0 || gx >= GRID_CELLS || gz < 0 || gz >= GRID_CELLS) return true;
  return RESERVED_FLOOR_RECTS.some(
    r => gx >= r.minX && gx <= r.maxX && gz >= r.minZ && gz <= r.maxZ
  );
}

export function isWallCellReserved(wall, pos) {
  if (!WALL_NAMES.includes(wall) || pos < 0 || pos >= GRID_CELLS) return true;
  const spans = RESERVED_WALL_SPANS[wall] || [];
  return spans.some(s => pos >= s.minPos && pos <= s.maxPos);
}

export function getTotalBuildableFloorCells() {
  let count = 0;
  for (let gx = 0; gx < GRID_CELLS; gx++) {
    for (let gz = 0; gz < GRID_CELLS; gz++) {
      if (!isFloorCellReserved(gx, gz)) count += 1;
    }
  }
  return count;
}

export function getTotalBuildableWallCells() {
  let count = 0;
  for (const wall of WALL_NAMES) {
    for (let pos = 0; pos < GRID_CELLS; pos++) {
      if (!isWallCellReserved(wall, pos)) count += 1;
    }
  }
  return count;
}

export function normalizePendingParcels(raw, ownedItems = {}) {
  const out = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [id, val] of Object.entries(raw)) {
      if (val === true && isShopParcelItem(id) && ownedItems?.[id] === true) {
        out[id] = true;
      }
    }
  }
  return out;
}

export function resolveEffectiveLayout(ownedItems = {}, rawLayout = {}, rawPendingParcels = {}) {
  const pending = normalizePendingParcels(rawPendingParcels, ownedItems);
  const layout = {};
  for (const [id, meta] of Object.entries(PLACEABLE_FURNITURE_META)) {
    const ownerKey = meta.ownerKey || id;
    const parcelKey = meta.companionParcelKey || id;
    const active = meta.starter || (ownedItems?.[ownerKey] === true && !pending[parcelKey]);
    if (!active) continue;
    const saved = rawLayout?.[id];
    const fallback = DEFAULT_FURNITURE_LAYOUT[id];
    if (meta.surface === "wall") {
      const wall = WALL_NAMES.includes(saved?.wall) ? saved.wall : fallback.wall;
      const pos = Number.isInteger(saved?.pos) ? saved.pos : fallback.pos;
      layout[id] = { surface: "wall", wall, pos };
    } else {
      const gx = Number.isInteger(saved?.gx) ? saved.gx : fallback.gx;
      const gz = Number.isInteger(saved?.gz) ? saved.gz : fallback.gz;
      const rot = Number.isInteger(saved?.rot) ? ((saved.rot % 4) + 4) % 4 : fallback.rot;
      layout[id] = { surface: "floor", gx, gz, rot };
    }
  }
  return layout;
}

export function buildOccupancyMaps(ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, excludeItemId = null) {
  const floorOccupied = new Map();
  const wallOccupied = new Map();
  const layout = resolveEffectiveLayout(ownedItems, rawLayout, rawPendingParcels);
  const excludedSet = new Set(
    Array.isArray(excludeItemId)
      ? excludeItemId
      : (excludeItemId ? [excludeItemId] : [])
  );

  for (const [id, entry] of Object.entries(layout)) {
    if (excludedSet.has(id)) continue;
    const meta = PLACEABLE_FURNITURE_META[id];
    if (!meta || meta.isFloorOverlay) continue;
    if (entry.surface === "wall") {
      for (let i = 0; i < meta.gridW; i++) {
        wallOccupied.set(getWallCellKey(entry.wall, entry.pos + i), id);
      }
    } else {
      const { w, d } = getRotatedDims(id, entry.rot);
      for (let ix = 0; ix < w; ix++) {
        for (let iz = 0; iz < d; iz++) {
          floorOccupied.set(getFloorCellKey(entry.gx + ix, entry.gz + iz), id);
        }
      }
    }
  }
  return { floorOccupied, wallOccupied, layout };
}

export function canPlaceFloorItem(itemId, gx, gz, rot, ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, excludeIds = null) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta || meta.surface !== "floor") return false;
  if (!Number.isInteger(gx) || !Number.isInteger(gz)) return false;
  const { w, d } = getRotatedDims(itemId, rot);
  if (gx < 0 || gz < 0 || gx + w > GRID_CELLS || gz + d > GRID_CELLS) return false;
  const excludes = Array.isArray(excludeIds) ? [itemId, ...excludeIds] : itemId;
  const { floorOccupied } = buildOccupancyMaps(ownedItems, rawLayout, rawPendingParcels, excludes);
  const isOverlay = Boolean(meta.isFloorOverlay);
  for (let ix = 0; ix < w; ix++) {
    for (let iz = 0; iz < d; iz++) {
      const cx = gx + ix;
      const cz = gz + iz;
      if (isFloorCellReserved(cx, cz)) return false;
      if (!isOverlay && floorOccupied.has(getFloorCellKey(cx, cz))) return false;
    }
  }
  return true;
}

export function canPlaceWallItem(itemId, wall, pos, ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, excludeIds = null) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta || meta.surface !== "wall") return false;
  if (!WALL_NAMES.includes(wall) || !Number.isInteger(pos)) return false;
  if (pos < 0 || pos + meta.gridW > GRID_CELLS) return false;
  const excludes = Array.isArray(excludeIds) ? [itemId, ...excludeIds] : itemId;
  const { wallOccupied } = buildOccupancyMaps(ownedItems, rawLayout, rawPendingParcels, excludes);
  for (let i = 0; i < meta.gridW; i++) {
    const p = pos + i;
    if (isWallCellReserved(wall, p)) return false;
    if (wallOccupied.has(getWallCellKey(wall, p))) return false;
  }
  return true;
}

export function findFirstValidPlacement(itemId, ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, excludeIds = null) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta) return null;
  const def = DEFAULT_FURNITURE_LAYOUT[itemId];
  if (meta.surface === "wall") {
    if (def && canPlaceWallItem(itemId, def.wall, def.pos, ownedItems, rawLayout, rawPendingParcels, excludeIds)) {
      return { ...def };
    }
    for (const wall of WALL_NAMES) {
      for (let pos = 0; pos <= GRID_CELLS - meta.gridW; pos++) {
        if (canPlaceWallItem(itemId, wall, pos, ownedItems, rawLayout, rawPendingParcels, excludeIds)) {
          return { surface: "wall", wall, pos };
        }
      }
    }
    return null;
  }
  if (def && canPlaceFloorItem(itemId, def.gx, def.gz, def.rot, ownedItems, rawLayout, rawPendingParcels, excludeIds)) {
    return { ...def };
  }
  for (let rot = 0; rot < 4; rot++) {
    const { w, d } = getRotatedDims(itemId, rot);
    for (let gz = 0; gz <= GRID_CELLS - d; gz++) {
      for (let gx = 0; gx <= GRID_CELLS - w; gx++) {
        if (canPlaceFloorItem(itemId, gx, gz, rot, ownedItems, rawLayout, rawPendingParcels, excludeIds)) {
          return { surface: "floor", gx, gz, rot };
        }
      }
    }
  }
  return null;
}

export function computeRoomGridStats(ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, gridOverrides = null) {
  const floorTotal = Number.isInteger(gridOverrides?.floorTotal)
    ? gridOverrides.floorTotal
    : getTotalBuildableFloorCells();
  const wallTotal = Number.isInteger(gridOverrides?.wallTotal)
    ? gridOverrides.wallTotal
    : getTotalBuildableWallCells();

  const { floorOccupied, wallOccupied, layout } = buildOccupancyMaps(ownedItems, rawLayout, rawPendingParcels);
  const pending = normalizePendingParcels(rawPendingParcels, ownedItems);

  let pendingFloorCells = 0;
  let pendingWallCells = 0;
  for (const parcelId of Object.keys(pending)) {
    for (const unitId of getCompanionPlaceableIds(parcelId)) {
      const meta = PLACEABLE_FURNITURE_META[unitId];
      if (!meta) continue;
      if (meta.surface === "wall") {
        pendingWallCells += meta.gridW;
      } else {
        pendingFloorCells += meta.gridW * meta.gridD;
      }
    }
  }

  const floorUsed = floorOccupied.size + pendingFloorCells;
  const wallUsed = wallOccupied.size + pendingWallCells;
  return {
    floorTotal,
    floorPlaced: floorOccupied.size,
    floorPending: pendingFloorCells,
    floorUsed,
    floorRemaining: Math.max(0, floorTotal - floorUsed),
    wallTotal,
    wallPlaced: wallOccupied.size,
    wallPending: pendingWallCells,
    wallUsed,
    wallRemaining: Math.max(0, wallTotal - wallUsed),
    layout,
    pendingParcels: pending
  };
}

export function canPackPlaceableItems(itemIds = [], ownedItems = {}, rawLayout = {}, rawPendingParcels = {}) {
  const expanded = [];
  for (const rawId of (itemIds || [])) {
    const companions = getCompanionPlaceableIds(rawId);
    if (companions.length > 0) {
      companions.forEach(cid => {
        if (!expanded.includes(cid)) expanded.push(cid);
      });
    } else if (PLACEABLE_FURNITURE_META[rawId] && !expanded.includes(rawId)) {
      expanded.push(rawId);
    }
  }
  const queue = expanded.filter(id => Boolean(PLACEABLE_FURNITURE_META[id]));
  if (queue.length === 0) return true;
  // Pack larger-footprint items first so big multi-cell parcels claim contiguous slots cleanly
  queue.sort((a, b) => {
    const ma = PLACEABLE_FURNITURE_META[a];
    const mb = PLACEABLE_FURNITURE_META[b];
    const areaA = ma.surface === "wall" ? ma.gridW : ma.gridW * ma.gridD;
    const areaB = mb.surface === "wall" ? mb.gridW : mb.gridW * mb.gridD;
    return areaB - areaA;
  });

  const simOwned = { ...(ownedItems || {}) };
  const simLayout = { ...(rawLayout || {}) };
  const simPending = { ...(rawPendingParcels || {}) };

  for (const id of queue) {
    const ownerKey = PLACEABLE_FURNITURE_META[id]?.ownerKey || id;
    const parcelKey = PLACEABLE_FURNITURE_META[id]?.companionParcelKey || id;
    simOwned[ownerKey] = true;
    delete simPending[parcelKey];
    const slot = findFirstValidPlacement(id, simOwned, simLayout, simPending);
    if (!slot) return false;
    simLayout[id] = slot;
  }
  return true;
}

export function checkShopItemGridAvailability(itemId, ownedItems = {}, rawLayout = {}, rawPendingParcels = {}, gridOverrides = null) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  if (!meta) {
    return {
      ok: true,
      placeable: false,
      surface: null,
      neededCells: 0,
      remainingCells: 0,
      reason: ""
    };
  }
  const companionIds = getCompanionPlaceableIds(itemId);
  const unitIds = companionIds.length > 0 ? companionIds : [itemId];
  const stats = computeRoomGridStats(ownedItems, rawLayout, rawPendingParcels, gridOverrides);
  const neededCells = unitIds.reduce((sum, uid) => {
    const m = PLACEABLE_FURNITURE_META[uid];
    if (!m) return sum;
    return sum + (m.surface === "wall" ? m.gridW : m.gridW * m.gridD);
  }, 0);
  const remainingCells = meta.surface === "wall" ? stats.wallRemaining : stats.floorRemaining;
  const surfaceLabel = meta.surface === "wall" ? bi("牆面", "wall") : bi("地面", "floor");
  const itemName = getPlaceableFurnitureName(itemId);

  if (remainingCells < neededCells) {
    return {
      ok: false,
      placeable: true,
      surface: meta.surface,
      neededCells,
      remainingCells,
      reason: bi(
        `空間不夠！目前僅剩 ${remainingCells} 格${surfaceLabel}網格，但「${itemName}」需佔用 ${neededCells} 格${surfaceLabel}網格，無法購買。`,
        `Not enough space! Only ${remainingCells} ${surfaceLabel} grid cell(s) left, while "${itemName}" requires ${neededCells}.`
      )
    };
  }

  const sameSurfacePending = Object.keys(stats.pendingParcels || {}).filter(
    id => PLACEABLE_FURNITURE_META[id]?.surface === meta.surface
  );
  const canPackAll = canPackPlaceableItems(
    [...sameSurfacePending, itemId],
    ownedItems,
    rawLayout,
    stats.pendingParcels
  );
  if (!canPackAll) {
    return {
      ok: false,
      placeable: true,
      surface: meta.surface,
      neededCells,
      remainingCells,
      reason: bi(
        `目前剩餘的 ${remainingCells} 格${surfaceLabel}網格過於零碎，無法與門口待拆包裹一同放入「${itemName}」，請先拆箱並調整現有家具擺設！`,
        `Remaining ${remainingCells} ${surfaceLabel} cell(s) are too fragmented to fit "${itemName}" alongside your unopened parcel(s). Unbox and rearrange furniture first!`
      )
    };
  }

  return {
    ok: true,
    placeable: true,
    surface: meta.surface,
    neededCells,
    remainingCells,
    reason: ""
  };
}

export function floorPlacementToWorld(itemId, gx, gz, rot) {
  const { w, d } = getRotatedDims(itemId, rot);
  const cleanRot = ((Math.trunc(Number(rot) || 0) % 4) + 4) % 4;
  return {
    x: -4.0 + (gx + w * 0.5) * GRID_STEP,
    z: -4.0 + (gz + d * 0.5) * GRID_STEP,
    rotY: cleanRot * (Math.PI / 2),
    w,
    d
  };
}

export function wallPlacementToLocal(itemId, wall, pos, wallY = 1.6) {
  const meta = PLACEABLE_FURNITURE_META[itemId];
  const w = meta?.gridW || 2;
  const offset = -4.0 + (pos + w * 0.5) * GRID_STEP;
  switch (wall) {
    case "north":
      return { x: offset, y: wallY, z: -3.98, rotY: 0, normalX: 0, normalZ: 1 };
    case "east":
      return { x: 3.98, y: wallY, z: offset, rotY: -Math.PI / 2, normalX: -1, normalZ: 0 };
    case "south":
      return { x: offset, y: wallY, z: 3.98, rotY: Math.PI, normalX: 0, normalZ: -1 };
    case "west":
    default:
      return { x: -3.98, y: wallY, z: offset, rotY: Math.PI / 2, normalX: 1, normalZ: 0 };
  }
}

export function getFloorFootprintWorldBox(itemId, entry) {
  if (!entry || entry.surface !== "floor") return null;
  const { w, d } = getRotatedDims(itemId, entry.rot);
  const minX = -4.0 + entry.gx * GRID_STEP;
  const maxX = minX + w * GRID_STEP;
  const minZ = -4.0 + entry.gz * GRID_STEP;
  const maxZ = minZ + d * GRID_STEP;
  return { minX, maxX, minZ, maxZ };
}

export const FIXED_BATH_BLOCKERS = [
  { id: "__bath_west", minX: 1.32, maxX: 1.74, minZ: -3.95, maxZ: -2.28, isWall: true },
  { id: "__bath_south", minX: 2.38, maxX: 3.95, minZ: -1.72, maxZ: -1.30, isWall: true },
  { id: "__bath_sink", minX: 1.80, maxX: 2.66, minZ: -3.95, maxZ: -3.02, isWall: true },
  { id: "__bath_toilet", minX: 2.88, maxX: 3.88, minZ: -3.95, maxZ: -2.84, isWall: true }
];

/**
 * Build axis-aligned world-space blockers for walking & floor clamping.
 * Skips flat overlays (such as cozy_rug) so characters walk straight across rugs.
 */
export function getFloorWalkBlockers(
  ownedItems = {},
  rawLayout = {},
  rawPendingParcels = {},
  { pad = 0.08, wallPad = 0, excludeId = null, effectiveLayout = null } = {}
) {
  const blockers = FIXED_BATH_BLOCKERS.map(b => ({
    ...b,
    minX: b.minX - wallPad,
    maxX: b.maxX + wallPad,
    minZ: b.minZ - wallPad,
    maxZ: b.maxZ + wallPad
  }));

  const eff = effectiveLayout || resolveEffectiveLayout(ownedItems, rawLayout, rawPendingParcels);
  for (const [id, entry] of Object.entries(eff)) {
    if (!entry || entry.surface !== "floor") continue;
    if (excludeId && id === excludeId) continue;
    if (PLACEABLE_FURNITURE_META[id]?.isFloorOverlay) continue;
    const box = getFloorFootprintWorldBox(id, entry);
    if (!box) continue;
    blockers.push({
      id,
      minX: box.minX - pad,
      maxX: box.maxX + pad,
      minZ: box.minZ - pad,
      maxZ: box.maxZ + pad,
      isWall: false
    });
  }
  return blockers;
}

function pointInsideBox(x, z, box, eps = 1e-6) {
  return x > box.minX + eps && x < box.maxX - eps && z > box.minZ + eps && z < box.maxZ - eps;
}

function segmentIntersectsBox(ax, az, bx, bz, box, eps = 1e-6) {
  const dx = bx - ax;
  const dz = bz - az;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-9) {
    if (ax <= box.minX + eps || ax >= box.maxX - eps) return false;
  } else {
    const invD = 1 / dx;
    let t1 = (box.minX + eps - ax) * invD;
    let t2 = (box.maxX - eps - ax) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin >= tMax) return false;
  }

  if (Math.abs(dz) < 1e-9) {
    if (az <= box.minZ + eps || az >= box.maxZ - eps) return false;
  } else {
    const invD = 1 / dz;
    let t1 = (box.minZ + eps - az) * invD;
    let t2 = (box.maxZ - eps - az) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin >= tMax) return false;
  }

  return tMin < tMax;
}

export function hasWalkLineOfSight(ax, az, bx, bz, blockers = []) {
  for (const box of blockers) {
    if (segmentIntersectsBox(ax, az, bx, bz, box)) return false;
  }
  return true;
}

/**
 * Find the Euclidean shortest smooth walking path from startPt to endPt:
 * - Walks straight A -> B whenever line-of-sight is clear.
 * - Otherwise solves 8-directional A* around walls/furniture and string-pulls corners.
 */
export function findShortestWalkPath(
  startPt,
  endPt,
  blockers = [],
  { boundsMin = -3.55, boundsMax = 3.55, step = 0.25 } = {}
) {
  const sx = Number(startPt?.x || 0);
  const sz = Number(startPt?.z || 0);
  const ex = Number(endPt?.x || 0);
  const ez = Number(endPt?.z || 0);

  if (Math.hypot(ex - sx, ez - sz) < 0.2) {
    return [{ x: ex, z: ez }];
  }

  if (hasWalkLineOfSight(sx, sz, ex, ez, blockers)) {
    return [{ x: ex, z: ez }];
  }

  const cols = Math.round((boundsMax - boundsMin) / step) + 1;
  const total = cols * cols;
  const blocked = new Uint8Array(total);
  const toWorld = (idx) => boundsMin + idx * step;
  const toIdx = (val) => Math.max(0, Math.min(cols - 1, Math.round((val - boundsMin) / step)));

  for (let gz = 0; gz < cols; gz += 1) {
    const wz = toWorld(gz);
    for (let gx = 0; gx < cols; gx += 1) {
      const wx = toWorld(gx);
      for (const box of blockers) {
        if (pointInsideBox(wx, wz, box, -0.02)) {
          blocked[gz * cols + gx] = 1;
          break;
        }
      }
    }
  }

  const findNearestFree = (rx, rz) => {
    const cx = toIdx(rx);
    const cz = toIdx(rz);
    if (!blocked[cz * cols + cx]) return { gx: cx, gz: cz };
    let best = null;
    let bestD = Infinity;
    for (let r = 1; r <= 4; r += 1) {
      for (let dz = -r; dz <= r; dz += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nx >= cols || nz < 0 || nz >= cols) continue;
          if (blocked[nz * cols + nx]) continue;
          const d = Math.hypot(toWorld(nx) - rx, toWorld(nz) - rz);
          if (d < bestD) {
            bestD = d;
            best = { gx: nx, gz: nz };
          }
        }
      }
      if (best) return best;
    }
    return { gx: cx, gz: cz };
  };

  const sNode = findNearestFree(sx, sz);
  const eNode = findNearestFree(ex, ez);
  const startId = sNode.gz * cols + sNode.gx;
  const goalId = eNode.gz * cols + eNode.gx;
  blocked[startId] = 0;
  blocked[goalId] = 0;

  const gScore = new Float64Array(total);
  gScore.fill(Infinity);
  gScore[startId] = 0;
  const parent = new Int32Array(total);
  parent.fill(-1);
  const closed = new Uint8Array(total);
  const open = [startId];
  const inOpen = new Uint8Array(total);
  inOpen[startId] = 1;

  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
  ];

  let found = false;
  while (open.length > 0) {
    let bestPos = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i += 1) {
      const id = open[i];
      const cx = id % cols;
      const cz = Math.floor(id / cols);
      const f = gScore[id] + Math.hypot(eNode.gx - cx, eNode.gz - cz);
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }
    const cur = open.splice(bestPos, 1)[0];
    inOpen[cur] = 0;
    if (cur === goalId) {
      found = true;
      break;
    }
    closed[cur] = 1;

    const cx = cur % cols;
    const cz = Math.floor(cur / cols);
    for (const [dx, dz, cost] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= cols) continue;
      const nId = nz * cols + nx;
      if (closed[nId] || blocked[nId]) continue;
      // Disallow cutting across corners of blocked cardinal neighbors
      if (dx !== 0 && dz !== 0) {
        if (blocked[cz * cols + (cx + dx)] || blocked[(cz + dz) * cols + cx]) continue;
      }
      const nextG = gScore[cur] + cost;
      if (nextG < gScore[nId]) {
        gScore[nId] = nextG;
        parent[nId] = cur;
        if (!inOpen[nId]) {
          open.push(nId);
          inOpen[nId] = 1;
        }
      }
    }
  }

  if (!found) {
    return [{ x: ex, z: ez }];
  }

  const raw = [];
  let trace = goalId;
  while (trace !== -1) {
    raw.push({ x: toWorld(trace % cols), z: toWorld(Math.floor(trace / cols)) });
    trace = parent[trace];
  }
  raw.reverse();
  raw[0] = { x: sx, z: sz };
  raw[raw.length - 1] = { x: ex, z: ez };

  // Line-of-sight string-pulling so paths hug obstacle corners smoothly along straight segments
  const smoothed = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let farthest = i + 1;
    for (let j = raw.length - 1; j > i + 1; j -= 1) {
      if (hasWalkLineOfSight(raw[i].x, raw[i].z, raw[j].x, raw[j].z, blockers)) {
        farthest = j;
        break;
      }
    }
    smoothed.push(raw[farthest]);
    i = farthest;
  }

  const out = [];
  let prev = { x: sx, z: sz };
  for (let k = 1; k < smoothed.length; k += 1) {
    const pt = smoothed[k];
    const isLast = k === smoothed.length - 1;
    if (isLast || Math.hypot(pt.x - prev.x, pt.z - prev.z) >= 0.15) {
      out.push(pt);
      prev = pt;
    }
  }
  return out.length > 0 ? out : [{ x: ex, z: ez }];
}
