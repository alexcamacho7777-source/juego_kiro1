// ============================================================
//  engine.js — reglas del juego: crear monstruos, subir nivel,
//  evolucionar, calcular daño y capturar.
// ============================================================
import { SPECIES, MOVES, effectiveness } from "./data.js";

// Crea un monstruo concreto (una instancia) a partir de una especie y nivel.
export function makeMonster(speciesId, level) {
  const sp = SPECIES[speciesId];
  const stats = statsAt(sp.base, level);
  return {
    species: speciesId,
    name: sp.name,
    type: sp.type,
    level,
    xp: 0,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    moves: movesAt(sp, level),
    atkMod: 0, // -1 bajado por Gruñido, +1 subido por Refuerzo (en combate)
    defMod: 0,
  };
}

function statsAt(base, level) {
  const f = (b) => Math.floor(b + b * (level - 1) * 0.11);
  return {
    hp: Math.floor(base.hp + base.hp * (level - 1) * 0.14) + 8,
    atk: f(base.atk),
    def: f(base.def),
    spd: f(base.spd),
  };
}

// Devuelve hasta 4 movimientos aprendidos hasta ese nivel.
function movesAt(sp, level) {
  const learned = [];
  const entries = Object.entries(sp.learnset)
    .map(([lv, mv]) => [parseFloat(lv), mv])
    .sort((a, b) => a[0] - b[0]);
  for (const [lv, mv] of entries) {
    if (lv <= level) learned.push(mv);
  }
  const last4 = learned.slice(-4);
  return last4.map((key) => ({ key, pp: MOVES[key].pp, ppMax: MOVES[key].pp }));
}

export function xpNeeded(level) {
  return Math.floor(18 + level * level * 4);
}

// Da experiencia; devuelve eventos (subió de nivel, evolucionó, aprendió movimiento).
export function gainXp(mon, amount) {
  const events = [];
  mon.xp += amount;
  while (mon.xp >= xpNeeded(mon.level) && mon.level < 60) {
    mon.xp -= xpNeeded(mon.level);
    mon.level++;
    const sp = SPECIES[mon.species];
    const before = { hp: mon.maxHp };
    const st = statsAt(sp.base, mon.level);
    const hpGain = st.hp - mon.maxHp;
    mon.maxHp = st.hp; mon.hp = Math.min(mon.maxHp, mon.hp + hpGain);
    mon.atk = st.atk; mon.def = st.def; mon.spd = st.spd;
    events.push({ type: "levelup", level: mon.level });

    // ¿aprende movimiento nuevo a este nivel?
    for (const [lv, mv] of Object.entries(sp.learnset)) {
      if (Math.floor(parseFloat(lv)) === mon.level && parseFloat(lv) >= 2) {
        if (!mon.moves.find((m) => m.key === mv)) {
          if (mon.moves.length < 4) mon.moves.push({ key: mv, pp: MOVES[mv].pp, ppMax: MOVES[mv].pp });
          else { mon.moves.shift(); mon.moves.push({ key: mv, pp: MOVES[mv].pp, ppMax: MOVES[mv].pp }); }
          events.push({ type: "learn", move: MOVES[mv].name });
        }
      }
    }

    // ¿evoluciona?
    if (sp.evolvesTo && mon.level >= sp.evolveLevel) {
      const oldName = mon.name;
      evolve(mon);
      events.push({ type: "evolve", from: oldName, to: mon.name });
    }
  }
  return events;
}

function evolve(mon) {
  const sp = SPECIES[mon.species];
  const next = SPECIES[sp.evolvesTo];
  mon.species = next.id;
  mon.name = next.name;
  mon.type = next.type;
  const st = statsAt(next.base, mon.level);
  const ratio = mon.hp / mon.maxHp;
  mon.maxHp = st.hp; mon.hp = Math.round(st.hp * ratio);
  mon.atk = st.atk; mon.def = st.def; mon.spd = st.spd;
}

// Calcula el daño de un movimiento. Devuelve {dmg, eff, miss, effect}
export function computeDamage(attacker, defender, moveKey) {
  const move = MOVES[moveKey];
  if (Math.random() > move.acc) return { dmg: 0, eff: 1, miss: true };

  if (move.power === 0) {
    return { dmg: 0, eff: 1, miss: false, effect: move.effect };
  }

  const eff = effectiveness(move.type, defender.type);
  const stab = move.type === attacker.type ? 1.3 : 1; // bonus por mismo tipo
  const atkEff = Math.max(1, attacker.atk + attacker.atkMod * attacker.atk * 0.25);
  const defEff = Math.max(1, defender.def + defender.defMod * defender.def * 0.25);

  const base = (((2 * attacker.level) / 5 + 2) * move.power * (atkEff / defEff)) / 50 + 2;
  const rand = 0.85 + Math.random() * 0.15;
  let dmg = Math.floor(base * eff * stab * rand);
  dmg = Math.max(1, dmg);
  return { dmg, eff, miss: false };
}

// Probabilidad de captura (0..1). Más fácil con poca vida.
export function catchChance(wild) {
  const hpFactor = 1 - wild.hp / wild.maxHp; // 0 lleno .. 1 vacío
  const base = 0.25 + hpFactor * 0.55;
  const levelPenalty = Math.min(0.2, wild.level * 0.01);
  return Math.max(0.08, Math.min(0.92, base - levelPenalty));
}
