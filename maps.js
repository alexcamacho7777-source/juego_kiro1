// ============================================================
//  maps.js — mapas de cada zona de Verdalia.
//  Tiles: 0 suelo  1 hierba alta  2 arbol/pared  3 agua  4 casa
//         5 rival  6 camino  7 arena(gimnasio)  8 letrero
//  "exits": por borde, a qué zona llevas y dónde apareces.
//  Todo original.
// ============================================================

// Atajo para construir filas desde texto (cada char = un tile).
const T = { ".":0, "#":1, "T":2, "~":3, "H":4, "R":5, "=":6, "G":7, "S":8 };
function grid(rows){ return rows.map(r => [...r].map(c => T[c] ?? 0)); }

export const ZONES = {
  // ---------------- PUEBLO RAÍZ ----------------
  pueblo_raiz: {
    place: "pueblo_raiz",
    map: grid([
      "TTTTTTTTTTTTTTTT",
      "THH..###..HH..~T",
      "THH.=###=.HH..~T",
      "T...=...=....~~T",
      "T======.======T",
      "T..T...=...T...T",
      "T..T.###=..T...T",
      "T....###=....H.T",
      "T#.........T..T",
      "T#..=======.=.T",
      "T...=.....S.=.T",
      "T...=......=..T",
      "THH.==========T",
      "TTTTTTTT^TTTTTTT",  // ^ salida sur a ruta_1
    ]),
    start: { x: 7, y: 10 },
    exits: { south: { to: "ruta_1", x: 7, y: 1 } },
    sign: { x: 10, y: 10, text: ["PUEBLO RAÍZ", "Donde empieza tu viaje."] },
  },

  // ---------------- RUTA 1 ----------------
  ruta_1: {
    place: "ruta_1",
    map: grid([
      "TTTTTT^TTTTTTTTT",  // ^ norte a pueblo
      "T#####=#####..T",
      "T#####=#####.RT",
      "T.....=.....#.T",
      "T.###.=.###...T",
      "T.###.=.###.#.T",
      "T.....=.......T",
      "T####.=.####..T",
      "T####.=.####..T",
      "T.....=.....#.T",
      "T.###.=.###...T",
      "T.....======..T",
      "T###########=.T",
      "TTTTTTTTTTT^TTTT",  // ^ sur a ciudad_alba
    ]),
    start: { x: 6, y: 1 },
    exits: { north: { to: "pueblo_raiz", x: 7, y: 12 }, south: { to: "ciudad_alba", x: 11, y: 1 } },
    rival: { x: 11, y: 2 },
  },

  // ---------------- CIUDAD ALBA (arena PLANTA) ----------------
  ciudad_alba: {
    place: "ciudad_alba",
    map: grid([
      "TTTTTTTTTTT^TTTT",  // norte a ruta_1
      "T.HH.HH..==...T",
      "T.HH.HH..=..H.T",
      "T......===....T",
      "T.HH..=G=..HH.T",  // G arena
      "T.HH..===..HH.T",
      "T======.======T",
      "T.H..=...=..H.T",
      "T....=.S.=....T",
      "T.HH.=...=.HH.T",
      "T.HH.=====.HH.T",
      "T........=....T",
      "T========.====T",
      "TTTTTTTT^TTTTTTT",  // sur a ruta_2
    ]),
    start: { x: 11, y: 1 },
    exits: { north: { to: "ruta_1", x: 11, y: 12 }, south: { to: "ruta_2", x: 7, y: 1 } },
    gymAt: { x: 6, y: 4 },
    sign: { x: 7, y: 8, text: ["ARENA DE CIUDAD ALBA", "Líder FEL - tipo PLANTA"] },
  },

  // ---------------- RUTA 2 ----------------
  ruta_2: {
    place: "ruta_2",
    map: grid([
      "TTTTTTTT^TTTTTTT",
      "T..#.==.#....T",
      "T..#.==.#.##.T",
      "T~~~~==~~~~~~T",
      "T~~~~==~~~~~~T",
      "T.##.==.....T",
      "T....======.T",
      "T.####...##=.T",
      "T.####.#.##=.T",
      "T......#...=.T",
      "T.##.######=.T",
      "T.##.......=.T",
      "T==========.T",
      "TTTTTTTTT^TTTTTT",
    ]),
    start: { x: 6, y: 1 },
    exits: { north: { to: "ciudad_alba", x: 7, y: 12 }, south: { to: "ciudad_marea", x: 9, y: 1 } },
  },

  // ---------------- CIUDAD MAREA (arena AGUA) ----------------
  ciudad_marea: {
    place: "ciudad_marea",
    map: grid([
      "TTTTTTTTT^TTTTTT",
      "T~~~..HH..G..T",
      "T~~~..HH..=..T",
      "T~~~......=..T",
      "T====.======T",
      "T.HH.=...=.H.T",
      "T.HH.=.S.=.H.T",
      "T....=...=...T",
      "T.HH.=====.H.T",
      "T.HH......=..T",
      "T~~~~.====.~~T",
      "T~~~~......~~T",
      "T=========.=T",
      "TTTTTTTT^TTTTTTT",
    ]),
    start: { x: 9, y: 1 },
    exits: { north: { to: "ruta_2", x: 9, y: 12 }, south: { to: "ruta_3", x: 7, y: 1 } },
    gymAt: { x: 10, y: 1 },
    sign: { x: 7, y: 6, text: ["ARENA DE CIUDAD MAREA", "Líder DELTA - tipo AGUA"] },
  },

  // ---------------- RUTA 3 ----------------
  ruta_3: {
    place: "ruta_3",
    map: grid([
      "TTTTTTTT^TTTTTTT",
      "T.TT.==.TT...T",
      "T.TT.==.TT.#.T",
      "T....==.....T",
      "T.##.=====..T",
      "T.##.....==.T",
      "T........==.T",
      "T.TTTT.#.==.T",
      "T.TTTT.#.==.T",
      "T......#..=.T",
      "T.####.##=..T",
      "T......===..T",
      "T======.....T",
      "TTT^TTTTTTTTTT",
    ]),
    start: { x: 7, y: 1 },
    exits: { north: { to: "ciudad_marea", x: 7, y: 12 }, south: { to: "ciudad_pena", x: 3, y: 1 } },
  },

  // ---------------- CIUDAD PEÑA (arena ROCA) ----------------
  ciudad_pena: {
    place: "ciudad_pena",
    map: grid([
      "TTT^TTTTTTTTTTTT",
      "T..=..TT..G..T",
      "T..=..TT..=..T",
      "T..====...=..T",
      "T.HH.=.====..T",
      "T.HH.=.=.....T",
      "T....=.=.S...T",
      "T.TT.=.=.....T",
      "T.TT.===.....T",
      "T......=.....T",
      "T.HH...=..HH.T",
      "T.HH...=..HH.T",
      "T======.=====T",
      "TTTTTTT^TTTTTTT",
    ]),
    start: { x: 3, y: 1 },
    exits: { north: { to: "ruta_3", x: 3, y: 12 }, south: { to: "ruta_4", x: 7, y: 1 } },
    gymAt: { x: 10, y: 1 },
    sign: { x: 8, y: 6, text: ["ARENA DE CIUDAD PEÑA", "Líder GRANITO - tipo ROCA"] },
    villain: { x: 7, y: 3 }, // Equipo Eclipse bloquea aquí la primera vez
  },

  // ---------------- RUTA 4 ----------------
  ruta_4: {
    place: "ruta_4",
    map: grid([
      "TTTTTTT^TTTTTTTT",
      "T..##.==.##..T",
      "T..##.==.##..T",
      "T.....==.....T",
      "T.##..==..##.T",
      "T.##..==..##.T",
      "T.....====...T",
      "T.####...==..T",
      "T.####.#.==..T",
      "T......#..=..T",
      "T.##.####.=..T",
      "T.##......=..T",
      "T=========...T",
      "TTTTTTTTT^TTTTTT",
    ]),
    start: { x: 7, y: 1 },
    exits: { north: { to: "ciudad_pena", x: 7, y: 12 }, south: { to: "ciudad_voltio", x: 9, y: 1 } },
  },

  // ---------------- CIUDAD VOLTIO (arena ELÉCTRICO) ----------------
  ciudad_voltio: {
    place: "ciudad_voltio",
    map: grid([
      "TTTTTTTTT^TTTTTT",
      "T.HH..G...HH.T",
      "T.HH..=...HH.T",
      "T.....=......T",
      "T=====.======T",
      "T...=.....=..T",
      "T.S.=.HHH.=..T",
      "T...=.HHH.=..T",
      "T...=.....=..T",
      "T...=======..T",
      "T.HH.......H.T",
      "T.HH.......H.T",
      "T=====.======T",
      "TTTTT^TTTTTTTTTT",
    ]),
    start: { x: 9, y: 1 },
    exits: { north: { to: "ruta_4", x: 9, y: 12 }, south: { to: "ruta_5", x: 5, y: 1 } },
    gymAt: { x: 6, y: 1 },
    sign: { x: 2, y: 6, text: ["ARENA DE CIUDAD VOLTIO", "Líder AMPERIO - ELÉCTRICO"] },
  },

  // ---------------- RUTA 5 ----------------
  ruta_5: {
    place: "ruta_5",
    map: grid([
      "TTTTT^TTTTTTTTTT",
      "T.TT.==.....T",
      "T.TT.==.###.T",
      "T....==.###.T",
      "T.##.====...T",
      "T.##....==..T",
      "T.......==..T",
      "T.####..==..T",
      "T.####.##=..T",
      "T......#.=..T",
      "T.####.#.=..T",
      "T......===..T",
      "T======.....T",
      "TTT^TTTTTTTTTTTT",
    ]),
    start: { x: 5, y: 1 },
    exits: { north: { to: "ciudad_voltio", x: 5, y: 12 }, south: { to: "ciudad_brasa", x: 3, y: 1 } },
  },

  // ---------------- CIUDAD BRASA (arena FUEGO) ----------------
  ciudad_brasa: {
    place: "ciudad_brasa",
    map: grid([
      "TTT^TTTTTTTTTTTT",
      "T..=....G....T",
      "T..=....=....T",
      "T..======....T",
      "T.HH.....=.H.T",
      "T.HH..S..=.H.T",
      "T........=...T",
      "T.####...=...T",
      "T.####.===...T",
      "T......=.....T",
      "T.HH...=..HH.T",
      "T.HH...=..HH.T",
      "T======.=====T",
      "TTTTTTT^TTTTTTT",
    ]),
    start: { x: 3, y: 1 },
    exits: { north: { to: "ruta_5", x: 3, y: 12 }, south: { to: "ruta_6", x: 7, y: 1 } },
    gymAt: { x: 8, y: 1 },
    sign: { x: 6, y: 5, text: ["ARENA DE CIUDAD BRASA", "Líder ÍGNEA - tipo FUEGO"] },
    villain: { x: 6, y: 5 }, // jefe del Equipo Eclipse
  },

  // ---------------- RUTA 6 ----------------
  ruta_6: {
    place: "ruta_6",
    map: grid([
      "TTTTTTT^TTTTTTTT",
      "T.....==.....T",
      "T.TTT.==.TTT.T",
      "T.TTT.==.TTT.T",
      "T.....==.....T",
      "T.###.==.###.T",
      "T.###.==.###.T",
      "T.....==.....T",
      "T.TTT.==.TTT.T",
      "T.TTT.==.TTT.T",
      "T.....==.....T",
      "T.###.==.###.T",
      "T=====.======T",
      "TTTTTT^TTTTTTTT",
    ]),
    start: { x: 7, y: 1 },
    exits: { north: { to: "ciudad_brasa", x: 7, y: 12 }, south: { to: "ciudad_cima", x: 6, y: 1 } },
  },

  // ---------------- CIUDAD CIMA (arena FINAL / Liga) ----------------
  ciudad_cima: {
    place: "ciudad_cima",
    map: grid([
      "TTTTTT^TTTTTTTTT",
      "T.....=......T",
      "T.HH..=...HH.T",
      "T.HH..=...HH.T",
      "T===..=..====T",
      "T..=..=..=...T",
      "T..====G====.T",
      "T..=.......=.T",
      "T.S=.......=.T",
      "T..=========.T",
      "T.HH.......H.T",
      "T.HH.......H.T",
      "T============T",
      "TTTTTTTTTTTTTTTT",
    ]),
    start: { x: 6, y: 1 },
    exits: { north: { to: "ruta_6", x: 7, y: 12 } },
    gymAt: { x: 7, y: 6 },
    sign: { x: 2, y: 8, text: ["LIGA DE LA CIMA", "MAESTRA ONIX te espera."] },
  },
};
