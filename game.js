// ============================================================
//  game.js — bucle principal: mundo, combate por turnos, historia.
// ============================================================
import { SPECIES, MOVES, WILD_POOL, STARTERS, TYPE_COLORS, effectiveness as effFor } from "./data.js";
import { makeMonster, gainXp, computeDamage, catchChance } from "./engine.js";
import { drawMonster } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ---- estado global ----
const State = {
  scene: "title", // title | starter | world | battle | over
  frame: 0,
  party: [],        // tus monstruos
  balls: 10,        // capturas disponibles
  defeatedRivals: 0,
  player: { x: 7, y: 7, dir: "down", step: 0, moving: false },
  message: "",
  flash: 0,
};

// ---- MAPA (16x14). 0 suelo, 1 hierba, 2 árbol/pared, 3 agua, 4 casa, 5 rival ----
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,0,0,0,1,1,1,0,0,0,2,3,3,3,2],
  [2,0,0,0,0,1,1,1,0,0,0,0,3,3,3,2],
  [2,0,0,2,0,0,0,0,0,2,0,0,0,3,0,2],
  [2,0,0,2,0,1,1,1,0,2,0,0,0,0,0,2],
  [2,0,0,0,0,1,1,1,0,0,0,2,2,0,0,2],
  [2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,1,1,0,0,2,2,0,0,1,1,1,0,0,0,2],
  [2,0,0,0,0,0,0,0,0,1,1,1,0,0,0,2],
  [2,0,0,2,2,0,0,0,0,1,1,1,0,2,0,2],
  [2,0,0,0,0,0,5,0,0,0,0,0,0,0,0,2],
  [2,3,0,0,0,0,0,0,2,2,0,0,1,1,0,2],
  [2,3,3,0,0,0,0,0,2,4,0,0,1,1,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];
const COLS = MAP[0].length, ROWS = MAP.length;
const TILE = Math.floor(Math.min(W / COLS, (H - 90) / ROWS));
const OX = Math.floor((W - COLS * TILE) / 2);
const OY = 70;

// posición del rival en el mapa
let rivalTile = null;
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (MAP[y][x] === 5) rivalTile = { x, y };

// ---- BATALLA ----
const Battle = {
  active: false,
  enemy: null,
  mine: null,
  log: [],
  menu: "main", // main | fight | item
  busy: false,
  isTrainer: false,
  trainerTeam: [],
  trainerIdx: 0,
  onWin: null,
  mineHurt: 0,
  enemyHurt: 0,
  mineShake: 0,
  enemyShake: 0,
};

// ============================================================
//  ENTRADA
// ============================================================
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  handleKey(e.key);
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function handleKey(k) {
  if (State.scene === "title") {
    State.scene = "starter";
    return;
  }
  if (State.scene === "starter") {
    if (k === "1") chooseStarter(0);
    if (k === "2") chooseStarter(1);
    if (k === "3") chooseStarter(2);
    return;
  }
  if (State.scene === "over") {
    if (k === "Enter") location.reload();
    return;
  }
  if (State.scene === "battle") {
    battleKey(k);
    return;
  }
}

// clics también sirven (botones en pantalla)
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  if (State.scene === "title") { State.scene = "starter"; return; }
  if (State.scene === "starter") { clickStarter(mx, my); return; }
  if (State.scene === "battle") { battleClick(mx, my); return; }
  if (State.scene === "over") { location.reload(); return; }
}, { passive: true });

// ============================================================
//  INICIO
// ============================================================
let starterRects = [];
function chooseStarter(i) {
  const id = STARTERS[i];
  State.party = [makeMonster(id, 5)];
  State.scene = "world";
  flash(`¡Elegiste a ${SPECIES[id].name}! Tu aventura empieza.`);
}
function clickStarter(mx, my) {
  for (let i = 0; i < starterRects.length; i++) {
    const r = starterRects[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { chooseStarter(i); return; }
  }
}

// ============================================================
//  MOVIMIENTO EN EL MUNDO
// ============================================================
let moveCooldown = 0;
function updateWorld() {
  if (moveCooldown > 0) { moveCooldown--; return; }
  let dx = 0, dy = 0;
  if (keys["ArrowUp"] || keys["w"]) { dy = -1; State.player.dir = "up"; }
  else if (keys["ArrowDown"] || keys["s"]) { dy = 1; State.player.dir = "down"; }
  else if (keys["ArrowLeft"] || keys["a"]) { dx = -1; State.player.dir = "left"; }
  else if (keys["ArrowRight"] || keys["d"]) { dx = 1; State.player.dir = "right"; }
  if (dx === 0 && dy === 0) return;

  const nx = State.player.x + dx, ny = State.player.y + dy;
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
  const tile = MAP[ny][nx];
  if (tile === 2 || tile === 3 || tile === 4) return; // pared/agua/casa

  // ¿rival?
  if (tile === 5) {
    State.player.x = nx; State.player.y = ny;
    moveCooldown = 8;
    startTrainerBattle();
    return;
  }

  State.player.x = nx; State.player.y = ny;
  State.player.step = (State.player.step + 1) % 4;
  moveCooldown = 8;

  // ¿hierba? encuentro al azar
  if (tile === 1 && Math.random() < 0.18) {
    startWildBattle();
  }
}

// ============================================================
//  COMBATE
// ============================================================
function firstAlive() {
  return State.party.find((m) => m.hp > 0) || null;
}

function startWildBattle() {
  const pick = weightedWild();
  const lvl = 2 + Math.floor(Math.random() * 5);
  Battle.enemy = makeMonster(pick, lvl);
  Battle.mine = firstAlive();
  if (!Battle.mine) return;
  Battle.active = true; Battle.isTrainer = false;
  Battle.log = [`¡Un ${Battle.enemy.name} salvaje apareció!`];
  Battle.menu = "main"; Battle.busy = false;
  resetMods();
  State.scene = "battle";
}

function startTrainerBattle() {
  const teams = [
    [["nubelu", 6], ["chispin", 7]],
    [["rocoto", 10], ["gotita", 11], ["broton", 11]],
    [["flamuro", 16], ["maruala", 16], ["voltaix", 17], ["lumbeast", 18]],
  ];
  const idx = Math.min(State.defeatedRivals, teams.length - 1);
  Battle.trainerTeam = teams[idx].map(([id, lv]) => makeMonster(id, lv));
  Battle.trainerIdx = 0;
  Battle.enemy = Battle.trainerTeam[0];
  Battle.mine = firstAlive();
  if (!Battle.mine) return;
  Battle.active = true; Battle.isTrainer = true;
  Battle.log = [`¡RETO del rival Nova!`, `Nova envía a ${Battle.enemy.name}.`];
  Battle.menu = "main"; Battle.busy = false;
  resetMods();
  State.scene = "battle";
}

function resetMods() {
  if (Battle.mine) { Battle.mine.atkMod = 0; Battle.mine.defMod = 0; }
  if (Battle.enemy) { Battle.enemy.atkMod = 0; Battle.enemy.defMod = 0; }
}

function battleKey(k) {
  if (Battle.busy) return;
  if (Battle.menu === "main") {
    if (k === "1") Battle.menu = "fight";
    if (k === "2") tryCatch();
    if (k === "3") swapNext();
    if (k === "4") flee();
  } else if (Battle.menu === "fight") {
    const n = parseInt(k, 10);
    if (n >= 1 && n <= Battle.mine.moves.length) playerMove(Battle.mine.moves[n - 1].key);
    if (k === "Escape" || k === "0") Battle.menu = "main";
  }
}

let mainRects = [], fightRects = [];
function battleClick(mx, my) {
  if (Battle.busy) return;
  if (Battle.menu === "main") {
    for (let i = 0; i < mainRects.length; i++) {
      const r = mainRects[i];
      if (hit(mx, my, r)) {
        if (i === 0) Battle.menu = "fight";
        if (i === 1) tryCatch();
        if (i === 2) swapNext();
        if (i === 3) flee();
        return;
      }
    }
  } else if (Battle.menu === "fight") {
    for (let i = 0; i < fightRects.length; i++) {
      if (hit(mx, my, fightRects[i])) {
        if (i < Battle.mine.moves.length) playerMove(Battle.mine.moves[i].key);
        return;
      }
    }
    // zona "volver"
    if (my > H - 60) Battle.menu = "main";
  }
}
function hit(mx, my, r) { return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h; }

function playerMove(moveKey) {
  const mv = Battle.mine.moves.find((m) => m.key === moveKey);
  if (mv && mv.pp <= 0) { pushLog("¡No quedan PP de ese movimiento!"); return; }
  if (mv) mv.pp--;
  Battle.busy = true; Battle.menu = "main";

  // orden por velocidad
  const playerFirst = Battle.mine.spd >= Battle.enemy.spd;
  const seq = playerFirst
    ? [() => doMove(Battle.mine, Battle.enemy, moveKey, true), () => enemyTurn()]
    : [() => enemyTurn(), () => doMove(Battle.mine, Battle.enemy, moveKey, true)];

  runSeq(seq, 0);
}

function enemyTurn() {
  if (Battle.enemy.hp <= 0) return;
  const mv = pickEnemyMove();
  doMove(Battle.enemy, Battle.mine, mv, false);
}

// IA sencilla: prefiere el movimiento más efectivo.
function pickEnemyMove() {
  const moves = Battle.enemy.moves.filter((m) => m.pp > 0);
  if (moves.length === 0) return "placaje";
  let best = moves[0].key, bestScore = -1;
  for (const m of moves) {
    const mv = MOVES[m.key];
    if (mv.power === 0) { if (Math.random() < 0.2 && bestScore < 0) { best = m.key; } continue; }
    const score = mv.power * effFor(mv.type, Battle.mine.type) * (0.85 + Math.random() * 0.3);
    if (score > bestScore) { bestScore = score; best = m.key; }
  }
  return best;
}

function doMove(user, target, moveKey, isPlayer) {
  if (user.hp <= 0) return;
  const mv = MOVES[moveKey];
  const res = computeDamage(user, target, moveKey);
  pushLog(`${user.name} usó ${mv.name}.`);
  if (res.miss) { pushLog("¡Pero falló!"); return; }

  if (res.effect) {
    if (res.effect === "atkDown") { target.atkMod = Math.max(-2, target.atkMod - 1); pushLog(`¡El ataque de ${target.name} bajó!`); }
    if (res.effect === "defUp") { user.defMod = Math.min(2, user.defMod + 1); pushLog(`¡La defensa de ${user.name} subió!`); }
    return;
  }

  target.hp = Math.max(0, target.hp - res.dmg);
  if (isPlayer) { Battle.enemyHurt = 1; Battle.enemyShake = 1; }
  else { Battle.mineHurt = 1; Battle.mineShake = 1; }

  if (res.eff > 1) pushLog("¡Es súper eficaz!");
  else if (res.eff < 1) pushLog("No es muy eficaz...");

  if (target.hp <= 0) {
    pushLog(`¡${target.name} se debilitó!`);
    if (target === Battle.enemy) onEnemyFaint();
    else onMineFaint();
  }
}

function onEnemyFaint() {
  // XP
  const xp = 18 + Battle.enemy.level * 6;
  const evs = gainXp(Battle.mine, xp);
  pushLog(`${Battle.mine.name} ganó ${xp} de experiencia.`);
  for (const ev of evs) {
    if (ev.type === "levelup") pushLog(`¡Subió al nivel ${ev.level}!`);
    if (ev.type === "learn") pushLog(`¡Aprendió ${ev.move}!`);
    if (ev.type === "evolve") pushLog(`¡${ev.from} evolucionó a ${ev.to}!`);
  }

  if (Battle.isTrainer) {
    Battle.trainerIdx++;
    if (Battle.trainerIdx < Battle.trainerTeam.length) {
      setTimeout(() => {
        Battle.enemy = Battle.trainerTeam[Battle.trainerIdx];
        Battle.enemy.atkMod = 0; Battle.enemy.defMod = 0;
        pushLog(`Nova envía a ${Battle.enemy.name}.`);
        Battle.busy = false;
      }, 700);
      return;
    }
    // ganó el combate de entrenador
    State.defeatedRivals++;
    MAP[rivalTile.y][rivalTile.x] = 0; // el rival se va de ese punto
    setTimeout(() => {
      endBattle(true);
      if (State.defeatedRivals >= 3) {
        flash("¡Venciste a Nova 3 veces! Eres el Campeón de la región. 🏆");
      } else {
        flash(`¡Venciste a Nova! (${State.defeatedRivals}/3). Te espera en otro punto del mapa.`);
        placeRivalRandom();
      }
    }, 800);
    return;
  }

  setTimeout(() => endBattle(true), 800);
}

function placeRivalRandom() {
  // coloca al rival en un suelo libre al azar
  const spots = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
    if (MAP[y][x] === 0 && !(x === State.player.x && y === State.player.y)) spots.push({ x, y });
  }
  const s = spots[Math.floor(Math.random() * spots.length)];
  MAP[s.y][s.x] = 5; rivalTile = s;
}

function onMineFaint() {
  const next = firstAlive();
  if (next) {
    setTimeout(() => { Battle.mine = next; Battle.mine.atkMod = 0; Battle.mine.defMod = 0; pushLog(`¡Adelante, ${Battle.mine.name}!`); Battle.busy = false; }, 700);
  } else {
    setTimeout(() => { State.scene = "over"; Battle.active = false; }, 800);
  }
}

function runSeq(seq, i) {
  if (i >= seq.length) {
    // fin de turno
    if (Battle.enemy.hp > 0 && Battle.mine.hp > 0) Battle.busy = false;
    return;
  }
  seq[i]();
  // si alguien cayó, el manejador correspondiente controla el flujo
  if (Battle.enemy.hp <= 0 || Battle.mine.hp <= 0) return;
  setTimeout(() => runSeq(seq, i + 1), 650);
}

function tryCatch() {
  if (Battle.isTrainer) { pushLog("¡No puedes capturar el monstruo de otro entrenador!"); return; }
  if (State.balls <= 0) { pushLog("No te quedan esferas."); return; }
  State.balls--;
  Battle.busy = true; Battle.menu = "main";
  pushLog(`Lanzaste una esfera... (quedan ${State.balls})`);
  const ok = Math.random() < catchChance(Battle.enemy);
  setTimeout(() => {
    if (ok) {
      pushLog(`¡Atrapaste a ${Battle.enemy.name}! 🎉`);
      if (State.party.length < 6) State.party.push(Battle.enemy);
      setTimeout(() => endBattle(false), 800);
    } else {
      pushLog("¡Se soltó! El monstruo contraataca.");
      setTimeout(() => { enemyTurn(); if (Battle.mine.hp > 0) Battle.busy = false; }, 400);
    }
  }, 700);
}

function swapNext() {
  const others = State.party.filter((m) => m !== Battle.mine && m.hp > 0);
  if (others.length === 0) { pushLog("No tienes otro monstruo en pie."); return; }
  Battle.mine = others[0];
  Battle.mine.atkMod = 0; Battle.mine.defMod = 0;
  pushLog(`¡Cambio! Adelante, ${Battle.mine.name}.`);
  Battle.busy = true; Battle.menu = "main";
  setTimeout(() => { enemyTurn(); if (Battle.mine.hp > 0) Battle.busy = false; }, 500);
}

function flee() {
  if (Battle.isTrainer) { pushLog("¡No puedes huir de un combate de entrenador!"); return; }
  if (Math.random() < 0.7) { pushLog("Escapaste."); setTimeout(() => endBattle(false), 500); }
  else { pushLog("¡No pudiste escapar!"); Battle.busy = true; setTimeout(() => { enemyTurn(); if (Battle.mine.hp > 0) Battle.busy = false; }, 500); }
}

function endBattle(won) {
  Battle.active = false;
  State.scene = "world";
}

function pushLog(s) {
  Battle.log.push(s);
  if (Battle.log.length > 4) Battle.log.shift();
}

// ============================================================
//  UTILS
// ============================================================
function weightedWild() {
  const total = WILD_POOL.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const w of WILD_POOL) { r -= w.weight; if (r <= 0) return w.id; }
  return WILD_POOL[0].id;
}
function flash(msg) { State.message = msg; State.flash = 220; }

// ============================================================
//  DIBUJO
// ============================================================
function loop() {
  State.frame++;
  if (State.scene === "world") updateWorld();
  if (Battle.mineHurt > 0) Battle.mineHurt -= 0.08;
  if (Battle.enemyHurt > 0) Battle.enemyHurt -= 0.08;
  if (Battle.mineShake > 0) Battle.mineShake -= 0.1;
  if (Battle.enemyShake > 0) Battle.enemyShake -= 0.1;
  if (State.flash > 0) State.flash--;

  ctx.clearRect(0, 0, W, H);
  if (State.scene === "title") drawTitle();
  else if (State.scene === "starter") drawStarter();
  else if (State.scene === "world") drawWorld();
  else if (State.scene === "battle") drawBattle();
  else if (State.scene === "over") drawOver();
  requestAnimationFrame(loop);
}

function drawTitle() {
  bg("#1b2a4a", "#0d1424");
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd54f";
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillText("MONSTRU", W / 2, H / 2 - 60);
  ctx.fillStyle = "#fff";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Una aventura de monstruos por turnos", W / 2, H / 2 - 20);
  // tres monstruos de muestra
  drawMonster(ctx, "emberin", W / 2 - 110, H / 2 + 60, 60, { frame: State.frame });
  drawMonster(ctx, "gotita", W / 2, H / 2 + 60, 60, { frame: State.frame + 30 });
  drawMonster(ctx, "broton", W / 2 + 110, H / 2 + 60, 60, { frame: State.frame + 60 });
  ctx.fillStyle = "#9ec5ff";
  ctx.font = "16px system-ui, sans-serif";
  if (Math.floor(State.frame / 30) % 2 === 0)
    ctx.fillText("Pulsa cualquier tecla o haz clic para empezar", W / 2, H - 40);
  ctx.textAlign = "left";
}

function drawStarter() {
  bg("#17324a", "#0b1a2a");
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText("El Profesor Cedro te ofrece tu primer monstruo", W / 2, 70);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "#9ec5ff";
  ctx.fillText("Elige con las teclas 1 / 2 / 3 o haz clic", W / 2, 100);

  starterRects = [];
  const names = ["1 — ", "2 — ", "3 — "];
  STARTERS.forEach((id, i) => {
    const x = W / 2 + (i - 1) * 230;
    const y = H / 2 + 20;
    // tarjeta
    const cw = 190, ch = 240;
    const rx = x - cw / 2, ry = y - ch / 2;
    card(rx, ry, cw, ch);
    starterRects.push({ x: rx, y: ry, w: cw, h: ch });
    drawMonster(ctx, id, x, y - 20, 70, { frame: State.frame + i * 25 });
    const sp = SPECIES[id];
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(names[i] + sp.name, x, y + 70);
    chip(x, y + 92, sp.type);
    ctx.fillStyle = "#c9d6e5";
    ctx.font = "12px system-ui, sans-serif";
    wrap(ctx, sp.dex, x, y + 112, cw - 24, 15);
  });
  ctx.textAlign = "left";
}

function drawWorld() {
  bg("#2e5d34", "#24492a");
  // tiles
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = MAP[y][x];
      const px = OX + x * TILE, py = OY + y * TILE;
      let col = "#3b7a44";
      if (t === 0) col = (x + y) % 2 ? "#3b7a44" : "#418349";
      else if (t === 1) col = (x + y) % 2 ? "#2f8a3a" : "#34993f"; // hierba
      else if (t === 2) col = "#6d4c41"; // pared/árbol
      else if (t === 3) col = "#3a7bd5"; // agua
      else if (t === 4) col = "#c0392b"; // casa
      else if (t === 5) col = "#418349";
      ctx.fillStyle = col;
      ctx.fillRect(px, py, TILE, TILE);
      if (t === 1) { // matitas de hierba
        ctx.strokeStyle = "#1f5e27"; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const gx = px + 6 + i * 7;
          ctx.beginPath(); ctx.moveTo(gx, py + TILE - 4); ctx.lineTo(gx, py + TILE - 12); ctx.stroke();
        }
      }
      if (t === 2) { // copa de árbol
        ctx.fillStyle = "#2e7d32";
        ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2, TILE * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      if (t === 4) { // casa / laboratorio
        ctx.fillStyle = "#8d4b40";
        ctx.fillRect(px + 4, py + TILE * 0.4, TILE - 8, TILE * 0.6);
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath(); ctx.moveTo(px + 2, py + TILE * 0.42); ctx.lineTo(px + TILE / 2, py + 4); ctx.lineTo(px + TILE - 2, py + TILE * 0.42); ctx.closePath(); ctx.fill();
      }
      if (t === 5) { // rival
        drawTrainerSprite(px + TILE / 2, py + TILE / 2);
      }
    }
  }
  // jugador
  drawPlayer();

  // HUD
  ctx.fillStyle = "rgba(10,16,28,0.78)";
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("MONSTRU", 16, 26);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#9ec5ff";
  ctx.fillText(`Equipo: ${State.party.length}/6   Esferas: ${State.balls}   Nova vencido: ${State.defeatedRivals}/3`, 16, 46);
  // mini equipo
  State.party.forEach((m, i) => {
    const x = W - 40 - i * 46;
    drawMonster(ctx, m.species, x, 30, 20, { frame: State.frame + i * 20 });
    if (m.hp <= 0) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x - 20, 10, 40, 40); }
  });
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#c9d6e5";
  ctx.fillText("Muévete con las flechas o W A S D. Pisa la hierba para encontrar monstruos. Busca a Nova (el rival).", 16, H - 14);

  if (State.flash > 0) {
    ctx.fillStyle = `rgba(10,16,28,${Math.min(0.85, State.flash / 220 + 0.2)})`;
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = "#ffd54f"; ctx.textAlign = "center";
    ctx.font = "bold 18px system-ui, sans-serif";
    wrap(ctx, State.message, W / 2, H / 2 - 4, W - 80, 22);
    ctx.textAlign = "left";
  }
}

function drawPlayer() {
  const px = OX + State.player.x * TILE + TILE / 2;
  const py = OY + State.player.y * TILE + TILE / 2;
  // cuerpo
  ctx.fillStyle = "#1f6fd6";
  ctx.beginPath(); ctx.arc(px, py, TILE * 0.3, 0, Math.PI * 2); ctx.fill();
  // cabeza
  ctx.fillStyle = "#ffcc9c";
  ctx.beginPath(); ctx.arc(px, py - TILE * 0.22, TILE * 0.18, 0, Math.PI * 2); ctx.fill();
  // gorra
  ctx.fillStyle = "#e53935";
  ctx.beginPath(); ctx.arc(px, py - TILE * 0.26, TILE * 0.18, Math.PI, 0); ctx.fill();
  ctx.fillRect(px - TILE * 0.18, py - TILE * 0.28, TILE * 0.28, TILE * 0.05);
}

function drawTrainerSprite(cx, cy) {
  ctx.fillStyle = "#7e57c2";
  ctx.beginPath(); ctx.arc(cx, cy + 2, TILE * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffcc9c";
  ctx.beginPath(); ctx.arc(cx, cy - TILE * 0.2, TILE * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#311b92";
  ctx.beginPath(); ctx.arc(cx, cy - TILE * 0.24, TILE * 0.18, Math.PI, 0); ctx.fill();
  // signo de exclamación flotando
  ctx.fillStyle = "#ffd54f";
  ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center";
  const yb = Math.sin(State.frame / 10) * 3;
  ctx.fillText("!", cx, cy - TILE * 0.5 + yb);
  ctx.textAlign = "left";
}

// ---------- BATALLA ----------
function drawBattle() {
  // fondo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#aee0ff"); g.addColorStop(0.6, "#cde7c0"); g.addColorStop(1, "#8bc47a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // plataformas
  platform(W * 0.72, H * 0.42, 120);
  platform(W * 0.28, H * 0.68, 150);

  // enemigo (arriba-dcha)
  const ex = W * 0.72 + (Battle.enemyShake > 0 ? (Math.random() - 0.5) * 10 : 0);
  drawMonster(ctx, Battle.enemy.species, ex, H * 0.38, 78, { flip: true, frame: State.frame, hurt: Math.max(0, Battle.enemyHurt) });
  hpBar(W * 0.08, 90, Battle.enemy, false);

  // mío (abajo-izq)
  const mx = W * 0.28 + (Battle.mineShake > 0 ? (Math.random() - 0.5) * 10 : 0);
  drawMonster(ctx, Battle.mine.species, mx, H * 0.6, 96, { flip: false, frame: State.frame + 15, hurt: Math.max(0, Battle.mineHurt) });
  hpBar(W * 0.55, H * 0.46, Battle.mine, true);

  // caja de mensajes
  const boxY = H - 150;
  ctx.fillStyle = "rgba(10,16,28,0.9)";
  roundRect(ctx, 12, boxY, W - 24, 138, 10); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "15px system-ui, sans-serif";
  Battle.log.forEach((line, i) => ctx.fillText(line, 28, boxY + 24 + i * 20));

  // menús
  mainRects = []; fightRects = [];
  if (!Battle.busy) {
    if (Battle.menu === "main") {
      const opts = ["1 Luchar", "2 Capturar", "3 Cambiar", "4 Huir"];
      opts.forEach((o, i) => {
        const bx = W / 2 + (i % 2) * (W / 4 - 10) - 4;
        const by = boxY + 44 + Math.floor(i / 2) * 42;
        const bw = W / 4 - 20, bh = 34;
        menuBtn(bx, by, bw, bh, o);
        mainRects.push({ x: bx, y: by, w: bw, h: bh });
      });
    } else if (Battle.menu === "fight") {
      Battle.mine.moves.forEach((m, i) => {
        const mv = MOVES[m.key];
        const bx = 20 + (i % 2) * (W / 2 - 20);
        const by = boxY + 40 + Math.floor(i / 2) * 44;
        const bw = W / 2 - 40, bh = 38;
        moveBtn(bx, by, bw, bh, mv, m);
        fightRects.push({ x: bx, y: by, w: bw, h: bh });
      });
      ctx.fillStyle = "#9ec5ff"; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("(Esc = volver)", W - 110, boxY + 20);
    }
  }
}

function drawOver() {
  bg("#3a0d0d", "#160404");
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff6b6b"; ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText("Todos tus monstruos cayeron", W / 2, H / 2 - 20);
  ctx.fillStyle = "#fff"; ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Pulsa Enter o haz clic para volver a empezar", W / 2, H / 2 + 30);
  ctx.textAlign = "left";
}

// ---------- helpers de dibujo ----------
function bg(a, b) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function platform(cx, cy, r) { ctx.fillStyle = "rgba(60,120,60,0.45)"; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
function card(x, y, w, h) { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.strokeStyle = "rgba(255,255,255,0.25)"; roundRect(ctx, x, y, w, h, 12); ctx.fill(); ctx.stroke(); }
function menuBtn(x, y, w, h, text) {
  ctx.fillStyle = "#1f6fd6"; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h / 2 + 5); ctx.textAlign = "left";
}
function moveBtn(x, y, w, h, mv, m) {
  ctx.fillStyle = TYPE_COLORS[mv.type]; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = "#101820"; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`${mv.name}`, x + 10, y + 17);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(`${mv.type}  PP ${m.pp}/${m.ppMax}  ${mv.power ? "Pot " + mv.power : "estado"}`, x + 10, y + 32);
}
function chip(cx, y, type) {
  const txt = type.toUpperCase();
  ctx.font = "bold 11px system-ui, sans-serif";
  const w = ctx.measureText(txt).width + 18;
  ctx.fillStyle = TYPE_COLORS[type]; roundRect(ctx, cx - w / 2, y - 11, w, 18, 9); ctx.fill();
  ctx.fillStyle = "#101820"; ctx.textAlign = "center"; ctx.fillText(txt, cx, y + 2); ctx.textAlign = "left";
}
function hpBar(x, y, mon, mine) {
  const w = 220, h = 54;
  ctx.fillStyle = "rgba(10,16,28,0.82)"; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(`${mon.name}`, x + 10, y + 18);
  ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = "#9ec5ff";
  ctx.fillText(`Nv ${mon.level}`, x + w - 46, y + 18);
  // barra
  const bx = x + 10, by = y + 28, bw = w - 20, bh = 10;
  ctx.fillStyle = "#30455e"; roundRect(ctx, bx, by, bw, bh, 5); ctx.fill();
  const ratio = Math.max(0, mon.hp / mon.maxHp);
  ctx.fillStyle = ratio > 0.5 ? "#4caf50" : ratio > 0.2 ? "#ffb300" : "#e53935";
  roundRect(ctx, bx, by, bw * ratio, bh, 5); ctx.fill();
  if (mine) { ctx.fillStyle = "#c9d6e5"; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(`${Math.max(0, Math.round(mon.hp))}/${mon.maxHp}`, bx, by + 24); }
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(" "); let line = ""; let yy = y;
  for (const wd of words) {
    const test = line + wd + " ";
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = wd + " "; yy += lh; }
    else line = test;
  }
  ctx.fillText(line.trim(), x, yy);
}

loop();
