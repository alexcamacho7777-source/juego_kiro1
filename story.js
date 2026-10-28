// ============================================================
//  story.js — historia y región (todo ORIGINAL).
//  Estructura clásica de aventura de monstruos: pueblo natal,
//  profesor, viaje por ciudades, 6 arenas/medallas, un rival,
//  una organización malvada y la Liga final.
// ============================================================

// La región inventada
export const REGION = {
  name: "Región de Verdalia",
  professor: "Prof. Cedro",
  rival: "Nova",
  villainTeam: "Equipo Eclipse",
  villainBoss: "Comandante Umbra",
  legendary: "Solmyr", // monstruo legendario del clímax
};

// Las 6 ciudades con arena + rutas que las unen.
// Cada "lugar" tiene un id, nombre, tipo (pueblo/ciudad/ruta), su líder de
// arena (si lo hay) y el texto de historia que se dispara al entrar.
export const PLACES = {
  pueblo_raiz: {
    id: "pueblo_raiz", name: "Pueblo Raíz", kind: "pueblo",
    intro: [
      "PUEBLO RAÍZ",
      "Tu pueblo natal. Pequeño y tranquilo,",
      "rodeado de bosque. Aquí empieza todo.",
    ],
  },
  ruta_1: {
    id: "ruta_1", name: "Ruta 1", kind: "ruta",
    intro: ["RUTA 1", "Un sendero entre hierba alta.", "Buen sitio para tus primeros combates."],
  },
  ciudad_alba: {
    id: "ciudad_alba", name: "Ciudad Alba", kind: "ciudad",
    gym: { leader: "Fel", type: "planta", badge: "Medalla Brote", level: 12 },
    intro: [
      "CIUDAD ALBA",
      "Ciudad de jardines. Su arena la dirige",
      "FEL, especialista en tipo PLANTA.",
      "Insignia en juego: la MEDALLA BROTE.",
    ],
  },
  ruta_2: {
    id: "ruta_2", name: "Ruta 2", kind: "ruta",
    intro: ["RUTA 2", "Un puente sobre el río.", "Agua por todas partes."],
  },
  ciudad_marea: {
    id: "ciudad_marea", name: "Ciudad Marea", kind: "ciudad",
    gym: { leader: "Delta", type: "agua", badge: "Medalla Ola", level: 18 },
    intro: [
      "CIUDAD MAREA",
      "Puerto pesquero. La arena es de DELTA,",
      "maestra del tipo AGUA.",
      "En juego: la MEDALLA OLA.",
    ],
  },
  ruta_3: {
    id: "ruta_3", name: "Ruta 3", kind: "ruta",
    intro: ["RUTA 3", "Camino rocoso que sube al monte.", "¡Cuidado con los desprendimientos!"],
  },
  ciudad_pena: {
    id: "ciudad_pena", name: "Ciudad Peña", kind: "ciudad",
    gym: { leader: "Granito", type: "roca", badge: "Medalla Roca", level: 24 },
    intro: [
      "CIUDAD PEÑA",
      "Tallada en la montaña. Su líder es",
      "GRANITO, del tipo ROCA.",
      "En juego: la MEDALLA ROCA.",
    ],
  },
  ruta_4: {
    id: "ruta_4", name: "Ruta 4", kind: "ruta",
    intro: ["RUTA 4", "Un valle con tormenta eléctrica.", "El aire chisporrotea."],
  },
  ciudad_voltio: {
    id: "ciudad_voltio", name: "Ciudad Voltio", kind: "ciudad",
    gym: { leader: "Amperio", type: "electrico", badge: "Medalla Chispa", level: 30 },
    intro: [
      "CIUDAD VOLTIO",
      "Ciudad de luces y cables. El líder es",
      "AMPERIO, del tipo ELÉCTRICO.",
      "En juego: la MEDALLA CHISPA.",
    ],
  },
  ruta_5: {
    id: "ruta_5", name: "Ruta 5", kind: "ruta",
    intro: ["RUTA 5", "Un desfiladero volcánico.", "Hace mucho calor aquí."],
  },
  ciudad_brasa: {
    id: "ciudad_brasa", name: "Ciudad Brasa", kind: "ciudad",
    gym: { leader: "Ígnea", type: "fuego", badge: "Medalla Llama", level: 36 },
    intro: [
      "CIUDAD BRASA",
      "A los pies de un volcán. La arena es",
      "de ÍGNEA, del tipo FUEGO.",
      "En juego: la MEDALLA LLAMA.",
    ],
  },
  ruta_6: {
    id: "ruta_6", name: "Ruta 6", kind: "ruta",
    intro: ["RUTA 6", "La senda que lleva a la cima.", "Solo los mejores llegan aquí."],
  },
  ciudad_cima: {
    id: "ciudad_cima", name: "Ciudad Cima", kind: "ciudad",
    gym: { leader: "Maestra Onix", type: "normal", badge: "Medalla Cima", level: 42 },
    intro: [
      "CIUDAD CIMA",
      "La ciudad más alta de Verdalia.",
      "Última arena: la MAESTRA ONIX.",
      "En juego: la MEDALLA CIMA.",
    ],
  },
};

// Orden de los lugares a lo largo de la aventura.
export const JOURNEY = [
  "pueblo_raiz", "ruta_1", "ciudad_alba", "ruta_2", "ciudad_marea",
  "ruta_3", "ciudad_pena", "ruta_4", "ciudad_voltio", "ruta_5",
  "ciudad_brasa", "ruta_6", "ciudad_cima",
];

// Los 6 líderes de arena, en orden, con su equipo.
export const GYM_LEADERS = [
  { name: "Fel", type: "planta", badge: "Medalla Brote", city: "ciudad_alba",
    team: [["broton", 10], ["hojarco", 12]] },
  { name: "Delta", type: "agua", badge: "Medalla Ola", city: "ciudad_marea",
    team: [["gotita", 16], ["maruala", 18]] },
  { name: "Granito", type: "roca", badge: "Medalla Roca", city: "ciudad_pena",
    team: [["rocoto", 22], ["peñascor", 24]] },
  { name: "Amperio", type: "electrico", badge: "Medalla Chispa", city: "ciudad_voltio",
    team: [["chispin", 28], ["voltaix", 30]] },
  { name: "Ígnea", type: "fuego", badge: "Medalla Llama", city: "ciudad_brasa",
    team: [["emberin", 34], ["flamuro", 35], ["pyroleo", 36]] },
  { name: "Maestra Onix", type: "normal", badge: "Medalla Cima", city: "ciudad_cima",
    team: [["lumbeast", 40], ["tsunareo", 41], ["selvarex", 42]] },
];

// Momentos de la trama (se disparan por progreso). Original.
export const STORY_BEATS = {
  intro: [
    "El PROF. CEDRO:",
    "«¡Bienvenido! Verdalia está llena de",
    " monstruos salvajes. Elige un compañero",
    " y empieza tu viaje. ¡Reúne las 6 medallas",
    " y llega a la Liga de la Cima!»",
  ],
  rival_1: [
    "NOVA aparece:",
    "«¿Tú también quieres ser el mejor?",
    " ¡Veamos quién va por delante!»",
  ],
  eclipse_1: [
    "¡El EQUIPO ECLIPSE bloquea la ruta!",
    "«Buscamos a SOLMYR, el monstruo",
    " legendario del sol. Apártate, novato.»",
  ],
  eclipse_boss: [
    "COMANDANTE UMBRA:",
    "«Con el poder de SOLMYR, Verdalia",
    " vivirá en un eclipse eterno. ¡Nadie",
    " me detendrá!»",
  ],
  champion: [
    "¡Has vencido a la MAESTRA ONIX!",
    "«Enhorabuena. Eres el nuevo CAMPEÓN",
    " de Verdalia. Tu viaje será leyenda.»",
  ],
};
