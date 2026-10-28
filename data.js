// ============================================================
//  MONSTRU — datos del juego (tipos, monstruos, movimientos)
//  Todo el contenido es inventado y original.
// ============================================================

// ---- TIPOS y tabla de efectividad ----
// Multiplicador de daño del atacante (fila) contra el defensor (columna).
export const TYPES = ["fuego", "agua", "planta", "electrico", "roca", "normal"];

export const TYPE_COLORS = {
  fuego:     "#ff7043",
  agua:      "#4fa3ff",
  planta:    "#66bb6a",
  electrico: "#ffd54f",
  roca:      "#a1887f",
  normal:    "#bdbdbd",
};

// 2 = súper eficaz, 0.5 = poco eficaz, 1 = normal
export const EFFECT = {
  fuego:     { planta: 2, agua: 0.5, roca: 0.5, fuego: 0.5 },
  agua:      { fuego: 2, roca: 2, planta: 0.5, agua: 0.5 },
  planta:    { agua: 2, roca: 2, fuego: 0.5, planta: 0.5, electrico: 1 },
  electrico: { agua: 2, planta: 0.5, roca: 0.5, electrico: 0.5 },
  roca:      { fuego: 2, electrico: 1, planta: 0.5, agua: 0.5 },
  normal:    {},
};

export function effectiveness(atkType, defType) {
  const row = EFFECT[atkType] || {};
  return row[defType] ?? 1;
}

// ---- MOVIMIENTOS ----
// power 0 = movimiento de estado (no hace daño directo)
export const MOVES = {
  placaje:     { name: "Placaje",     type: "normal",    power: 35, acc: 1.0,  pp: 35 },
  ascua:       { name: "Ascua",       type: "fuego",     power: 40, acc: 1.0,  pp: 25 },
  llamarada:   { name: "Llamarada",   type: "fuego",     power: 70, acc: 0.85, pp: 10 },
  burbuja:     { name: "Burbuja",     type: "agua",      power: 40, acc: 1.0,  pp: 25 },
  hidrochorro: { name: "Hidrochorro", type: "agua",      power: 70, acc: 0.9,  pp: 10 },
  latigazo:    { name: "Látigo Hoja", type: "planta",    power: 40, acc: 1.0,  pp: 25 },
  tormentah:   { name: "Tormenta Hoja", type: "planta",  power: 70, acc: 0.85, pp: 10 },
  chispa:      { name: "Chispa",      type: "electrico", power: 40, acc: 1.0,  pp: 25 },
  rayo:        { name: "Rayo",        type: "electrico", power: 70, acc: 0.9,  pp: 10 },
  pedrada:     { name: "Pedrada",     type: "roca",      power: 45, acc: 0.95, pp: 20 },
  avalancha:   { name: "Avalancha",   type: "roca",      power: 70, acc: 0.85, pp: 10 },
  gruñido:     { name: "Gruñido",     type: "normal",    power: 0,  acc: 1.0,  pp: 30, effect: "atkDown" },
  refuerzo:    { name: "Refuerzo",    type: "normal",    power: 0,  acc: 1.0,  pp: 20, effect: "defUp" },
};

// ---- MONSTRUOS ----
// sprite: lista de "partes" que dibuja el canvas (ver render.js)
// evolvesTo / evolveLevel: línea evolutiva
// base: estadísticas base (hp, atk, def, spd)
// learnset: nivel -> clave de movimiento
export const SPECIES = {
  // ---- Línea FUEGO: Emberín -> Flamuro -> Pyroleo ----
  emberin: {
    id: "emberin", name: "Emberín", type: "fuego",
    base: { hp: 42, atk: 12, def: 9, spd: 12 },
    learnset: { 1: "placaje", 1.1: "ascua", 7: "gruñido", 13: "llamarada" },
    evolvesTo: "flamuro", evolveLevel: 16,
    sprite: { body: "#ff8a4c", belly: "#ffd9b0", accent: "#e8451f", shape: "fox", eye: "#2b2b2b" },
    dex: "Guarda una llama en la cola que nunca se apaga.",
  },
  flamuro: {
    id: "flamuro", name: "Flamuro", type: "fuego",
    base: { hp: 58, atk: 17, def: 13, spd: 16 },
    learnset: { 1: "ascua", 1.1: "placaje", 18: "llamarada", 24: "refuerzo" },
    evolvesTo: "pyroleo", evolveLevel: 32,
    sprite: { body: "#ff6a3c", belly: "#ffcf9a", accent: "#c2341a", shape: "beast", eye: "#fff2b0" },
    dex: "Su melena arde más cuanto más furioso se pone.",
  },
  pyroleo: {
    id: "pyroleo", name: "Pyroleo", type: "fuego",
    base: { hp: 82, atk: 24, def: 19, spd: 20 },
    learnset: { 1: "llamarada", 1.1: "ascua", 36: "refuerzo" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#ff5230", belly: "#ffd089", accent: "#9c2412", shape: "lion", eye: "#fff2b0" },
    dex: "Un león de fuego. Su rugido derrite la roca.",
  },

  // ---- Línea AGUA: Gotita -> Maruala -> Tsunareo ----
  gotita: {
    id: "gotita", name: "Gotita", type: "agua",
    base: { hp: 45, atk: 10, def: 11, spd: 11 },
    learnset: { 1: "placaje", 1.1: "burbuja", 7: "gruñido", 13: "hidrochorro" },
    evolvesTo: "maruala", evolveLevel: 16,
    sprite: { body: "#4fa3ff", belly: "#cfeaff", accent: "#2d6fcf", shape: "blob", eye: "#07305f" },
    dex: "Una gota con vida. Rebota feliz por los charcos.",
  },
  maruala: {
    id: "maruala", name: "Maruala", type: "agua",
    base: { hp: 60, atk: 14, def: 16, spd: 15 },
    learnset: { 1: "burbuja", 1.1: "placaje", 18: "hidrochorro", 24: "refuerzo" },
    evolvesTo: "tsunareo", evolveLevel: 32,
    sprite: { body: "#3b8ee0", belly: "#bfe4ff", accent: "#1f5aa8", shape: "beast", eye: "#06243f" },
    dex: "Nada en círculos creando pequeños remolinos.",
  },
  tsunareo: {
    id: "tsunareo", name: "Tsunareo", type: "agua",
    base: { hp: 85, atk: 20, def: 23, spd: 17 },
    learnset: { 1: "hidrochorro", 1.1: "burbuja", 36: "refuerzo" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#2f78cf", belly: "#aee0ff", accent: "#153f7a", shape: "lion", eye: "#06243f" },
    dex: "Controla las olas. Dicen que calma tormentas.",
  },

  // ---- Línea PLANTA: Brotón -> Hojarco -> Selvarex ----
  broton: {
    id: "broton", name: "Brotón", type: "planta",
    base: { hp: 48, atk: 11, def: 12, spd: 9 },
    learnset: { 1: "placaje", 1.1: "latigazo", 7: "gruñido", 13: "tormentah" },
    evolvesTo: "hojarco", evolveLevel: 16,
    sprite: { body: "#66bb6a", belly: "#dff5cf", accent: "#2f7a3a", shape: "fox", eye: "#1b3a1f" },
    dex: "Un brote con patas. Busca siempre la luz del sol.",
  },
  hojarco: {
    id: "hojarco", name: "Hojarco", type: "planta",
    base: { hp: 63, atk: 16, def: 17, spd: 12 },
    learnset: { 1: "latigazo", 1.1: "placaje", 18: "tormentah", 24: "refuerzo" },
    evolvesTo: "selvarex", evolveLevel: 32,
    sprite: { body: "#4ca055", belly: "#cdeab0", accent: "#236030", shape: "beast", eye: "#143019" },
    dex: "Su lomo echa hojas filosas que lanza al atacar.",
  },
  selvarex: {
    id: "selvarex", name: "Selvarex", type: "planta",
    base: { hp: 88, atk: 22, def: 22, spd: 14 },
    learnset: { 1: "tormentah", 1.1: "latigazo", 36: "refuerzo" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#3f8f49", belly: "#c2e39c", accent: "#17481f", shape: "lion", eye: "#0f2714" },
    dex: "Rey de la selva. Las plantas crecen a su paso.",
  },

  // ---- Línea ELÉCTRICO: Chispín -> Voltaix ----
  chispin: {
    id: "chispin", name: "Chispín", type: "electrico",
    base: { hp: 40, atk: 13, def: 8, spd: 17 },
    learnset: { 1: "placaje", 1.1: "chispa", 9: "gruñido", 15: "rayo" },
    evolvesTo: "voltaix", evolveLevel: 22,
    sprite: { body: "#ffd54f", belly: "#fff3bf", accent: "#d39e00", shape: "fox", eye: "#3a2b00" },
    dex: "Chisporrotea cuando está contento. ¡Cuidado al tocarlo!",
  },
  voltaix: {
    id: "voltaix", name: "Voltaix", type: "electrico",
    base: { hp: 68, atk: 22, def: 14, spd: 26 },
    learnset: { 1: "chispa", 1.1: "rayo", 26: "refuerzo" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#ffc21f", belly: "#fff0a8", accent: "#b07c00", shape: "beast", eye: "#2e2200" },
    dex: "Tan rápido que deja un rastro de rayos al correr.",
  },

  // ---- Línea ROCA: Rocoto -> Peñascor ----
  rocoto: {
    id: "rocoto", name: "Rocoto", type: "roca",
    base: { hp: 55, atk: 12, def: 18, spd: 6 },
    learnset: { 1: "placaje", 1.1: "pedrada", 10: "refuerzo", 16: "avalancha" },
    evolvesTo: "peñascor", evolveLevel: 24,
    sprite: { body: "#a1887f", belly: "#d7c3b5", accent: "#6d4c41", shape: "blob", eye: "#2b1c14" },
    dex: "Parece una piedra hasta que abre los ojos.",
  },
  peñascor: {
    id: "peñascor", name: "Peñascor", type: "roca",
    base: { hp: 92, atk: 20, def: 28, spd: 8 },
    learnset: { 1: "pedrada", 1.1: "avalancha", 30: "refuerzo" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#8d6e63", belly: "#c7b2a4", accent: "#4e342e", shape: "lion", eye: "#241610" },
    dex: "Una montaña con patas. Un cabezazo suyo tumba árboles.",
  },

  // ---- NORMAL (rival y salvajes comunes) ----
  nubelu: {
    id: "nubelu", name: "Nubelú", type: "normal",
    base: { hp: 50, atk: 13, def: 12, spd: 13 },
    learnset: { 1: "placaje", 1.1: "gruñido", 12: "refuerzo" },
    evolvesTo: "lumbeast", evolveLevel: 20,
    sprite: { body: "#cfd8dc", belly: "#eceff1", accent: "#90a4ae", shape: "blob", eye: "#37474f" },
    dex: "Una nubecita esponjosa que flota sin rumbo.",
  },
  lumbeast: {
    id: "lumbeast", name: "Lumbeast", type: "normal",
    base: { hp: 78, atk: 20, def: 18, spd: 18 },
    learnset: { 1: "placaje", 1.1: "refuerzo", 28: "gruñido" },
    evolvesTo: null, evolveLevel: null,
    sprite: { body: "#b0bec5", belly: "#e0e6e9", accent: "#78909c", shape: "lion", eye: "#263238" },
    dex: "Guardián tranquilo. Solo pelea si lo provocan.",
  },
};

// ---- Dónde aparece cada salvaje en la hierba ----
export const WILD_POOL = [
  { id: "emberin", min: 2, max: 5, weight: 3 },
  { id: "gotita",  min: 2, max: 5, weight: 3 },
  { id: "broton",  min: 2, max: 5, weight: 3 },
  { id: "chispin", min: 3, max: 6, weight: 2 },
  { id: "rocoto",  min: 3, max: 6, weight: 2 },
  { id: "nubelu",  min: 2, max: 6, weight: 4 },
];

// ---- Monstruos iniciales que puede elegir el jugador ----
export const STARTERS = ["emberin", "gotita", "broton"];
