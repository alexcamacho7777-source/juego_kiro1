// ============================================================
//  game.js — MONSTRU estilo Game Boy.
//  Mundo de pixeles, combate clasico, menu (equipo, Pokedex,
//  mochila, guardar), guardado en el navegador. Contenido original.
// ============================================================
import { SPECIES, MOVES, WILD_POOL, STARTERS, effectiveness as effFor } from "./data.js";
import { makeMonster, gainXp, computeDamage, catchChance } from "./engine.js";
import { drawMonster } from "./render.js";
import { GB, gbBox, drawPixels } from "./gb.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const SAVE_KEY = "monstru_save_v1";

// ---- objetos de la mochila (originales, no de Nintendo) ----
export const ITEMS = {
  esfera:  { name: "Esfera", desc: "Atrapa a un monstruo salvaje.", kind: "ball" },
  pocion:  { name: "Poción", desc: "Cura 30 PV a un monstruo.", kind: "heal", amount: 30 },
  superpocion: { name: "Superpoción", desc: "Cura 70 PV.", kind: "heal", amount: 70 },
  revivir: { name: "Revivir", desc: "Revive a un monstruo debilitado con media vida.", kind: "revive" },
};

const State = {
  scene: "title",          // title | starter | world | battle | menu | over
  frame: 0,
  party: [],
  bag: { esfera: 10, pocion: 5, superpocion: 2, revivir: 1 },
  dex: {},                 // id -> { seen:true, caught:bool }
  defeatedRivals: 0,
  player: { x: 7, y: 10, dir: "down" },
  message: "", flash: 0,
  menuTab: 0,              // 0 equipo 1 pokedex 2 mochila 3 guardar
  menuSel: 0,
};

// ============================================================
//  MAPA — pueblo inicial (vista desde arriba), tiles de pixeles
//  0 hierba-suelo  1 hierba-alta  2 arbol/pared  3 agua  4 casa  5 rival  6 camino
// ============================================================
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,4,0,0,1,1,1,0,0,4,4,0,3,3,2],
  [2,4,4,0,6,1,1,1,6,0,4,4,0,3,3,2],
  [2,0,0,0,6,0,0,0,6,0,0,0,0,0,3,2],
  [2,6,6,6,6,6,6,6,6,6,6,6,6,0,0,2],
  [2,0,0,2,0,0,0,0,0,2,0,0,6,0,0,2],
  [2,0,0,2,0,1,1,1,0,2,0,0,6,2,2,2],
  [2,0,0,0,0,1,1,1,0,0,0,0,6,0,0,2],
  [2,1,1,0,0,1,1,1,0,0,2,2,6,0,0,2],
  [2,1,1,0,6,6,6,6,6,6,6,6,6,0,0,2],
  [2,0,0,0,6,0,0,5,0,0,0,0,6,0,0,2],
  [2,0,0,0,6,0,0,0,0,2,2,0,6,1,1,2],
  [2,4,4,0,6,0,0,0,0,4,4,0,0,1,1,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];
const COLS = MAP[0].length, ROWS = MAP.length;
const TILE = 36;
const VIEW_OX = Math.floor((W - COLS * TILE) / 2);
const VIEW_OY = 54;

let rivalTile = findTile(5);
function findTile(v) { for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) if (MAP[y][x]===v) return {x,y}; return null; }

// ============================================================
//  BATALLA
// ============================================================
const Battle = {
  active:false, enemy:null, mine:null, log:[], menu:"main", busy:false,
  isTrainer:false, trainerTeam:[], trainerIdx:0,
  mineHurt:0, enemyHurt:0, mineShake:0, enemyShake:0, typing:0,
};

// ============================================================
//  ENTRADA
// ============================================================
const keys = {};
addEventListener("keydown", (e) => {
  keys[e.key] = true; handleKey(e.key);
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key)) e.preventDefault();
});
addEventListener("keyup", (e) => { keys[e.key] = false; });

function handleKey(k) {
  if (State.scene === "title") { tryLoadOrStart(); return; }
  if (State.scene === "starter") {
    if (k==="1") chooseStarter(0); if (k==="2") chooseStarter(1); if (k==="3") chooseStarter(2);
    return;
  }
  if (State.scene === "over") { if (k==="Enter") location.reload(); return; }
  if (State.scene === "world") {
    if (k==="Enter" || k==="m" || k==="Escape") { State.scene="menu"; State.menuSel=0; }
    return;
  }
  if (State.scene === "menu") { menuKey(k); return; }
  if (State.scene === "battle") { battleKey(k); return; }
}

canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  if (State.scene === "title") { tryLoadOrStart(); return; }
  if (State.scene === "starter") { clickStarter(mx, my); return; }
  if (State.scene === "battle") { battleClick(mx, my); return; }
  if (State.scene === "menu") { menuClick(mx, my); return; }
  if (State.scene === "over") { location.reload(); return; }
}, { passive: true });

// ============================================================
//  GUARDAR / CARGAR  (en el navegador: localStorage)
// ============================================================
function saveGame() {
  const data = {
    party: State.party, bag: State.bag, dex: State.dex,
    defeatedRivals: State.defeatedRivals, player: State.player,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); flash("Partida guardada."); }
  catch { flash("No se pudo guardar."); }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!d || !d.party || !d.party.length) return false;
    State.party = d.party; State.bag = d.bag || State.bag; State.dex = d.dex || {};
    State.defeatedRivals = d.defeatedRivals || 0; State.player = d.player || State.player;
    State.scene = "world"; return true;
  } catch { return false; }
}
function tryLoadOrStart() {
  if (hasSave() && loadGame()) { flash("¡Bienvenido de nuevo!"); return; }
  State.scene = "starter";
}

// ============================================================
//  INICIO
// ============================================================
let starterRects = [];
function chooseStarter(i) {
  const id = STARTERS[i];
  const m = makeMonster(id, 5);
  State.party = [m];
  markDex(id, true);
  State.scene = "world";
  flash(`¡Elegiste a ${SPECIES[id].name}!`);
}
function clickStarter(mx,my){ for (let i=0;i<starterRects.length;i++){const r=starterRects[i]; if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){chooseStarter(i);return;}} }
function markDex(id, caught) {
  if (!State.dex[id]) State.dex[id] = { seen:true, caught:false };
  State.dex[id].seen = true; if (caught) State.dex[id].caught = true;
}

// ============================================================
//  MOVIMIENTO EN EL MUNDO
// ============================================================
let moveCd = 0;
function updateWorld() {
  if (moveCd > 0) { moveCd--; return; }
  let dx=0, dy=0;
  if (keys["ArrowUp"]||keys["w"]) { dy=-1; State.player.dir="up"; }
  else if (keys["ArrowDown"]||keys["s"]) { dy=1; State.player.dir="down"; }
  else if (keys["ArrowLeft"]||keys["a"]) { dx=-1; State.player.dir="left"; }
  else if (keys["ArrowRight"]||keys["d"]) { dx=1; State.player.dir="right"; }
  if (!dx && !dy) return;
  const nx=State.player.x+dx, ny=State.player.y+dy;
  if (nx<0||ny<0||nx>=COLS||ny>=ROWS) return;
  const t = MAP[ny][nx];
  if (t===2||t===3||t===4) return;
  State.player.x=nx; State.player.y=ny; moveCd=7;
  if (t===5) { startTrainerBattle(); return; }
  if (t===1 && Math.random()<0.16) startWildBattle();
}

// ============================================================
//  COMBATE (lógica)
// ============================================================
function firstAlive(){ return State.party.find(m=>m.hp>0)||null; }

function startWildBattle() {
  const id = weightedWild();
  const lvl = 2 + Math.floor(Math.random()*5);
  Battle.enemy = makeMonster(id, lvl);
  Battle.mine = firstAlive(); if (!Battle.mine) return;
  markDex(id, false);
  Battle.active=true; Battle.isTrainer=false;
  Battle.log=[`Un ${Battle.enemy.name} salvaje`, `apareció.`];
  Battle.menu="main"; Battle.busy=false; resetMods();
  State.scene="battle";
}
function startTrainerBattle() {
  const teams = [
    [["nubelu",6],["chispin",7]],
    [["rocoto",10],["gotita",11],["broton",11]],
    [["flamuro",16],["maruala",16],["voltaix",17],["lumbeast",18]],
    [["hojarco",22],["peñascor",22],["tsunareo",23]],
    [["selvarex",28],["voltaix",28],["pyroleo",29]],
    [["pyroleo",34],["tsunareo",34],["selvarex",34],["peñascor",35],["lumbeast",36]],
  ];
  const idx = Math.min(State.defeatedRivals, teams.length-1);
  Battle.trainerTeam = teams[idx].map(([id,lv])=>makeMonster(id,lv));
  Battle.trainerIdx=0; Battle.enemy=Battle.trainerTeam[0];
  Battle.mine=firstAlive(); if (!Battle.mine) return;
  Battle.active=true; Battle.isTrainer=true;
  Battle.log=[`¡El rival NOVA`, `quiere luchar!`];
  Battle.menu="main"; Battle.busy=false; resetMods();
  State.scene="battle";
}
function resetMods(){ if(Battle.mine){Battle.mine.atkMod=0;Battle.mine.defMod=0;} if(Battle.enemy){Battle.enemy.atkMod=0;Battle.enemy.defMod=0;} }

function battleKey(k) {
  if (Battle.busy) return;
  if (Battle.menu==="main") {
    if (k==="1") Battle.menu="fight";
    if (k==="2") Battle.menu="bag";
    if (k==="3") swapNext();
    if (k==="4") flee();
  } else if (Battle.menu==="fight") {
    const n=parseInt(k,10);
    if (n>=1 && n<=Battle.mine.moves.length) playerMove(Battle.mine.moves[n-1].key);
    if (k==="Escape"||k==="0") Battle.menu="main";
  } else if (Battle.menu==="bag") {
    if (k==="1") throwBall();
    if (k==="2") useHeal("pocion");
    if (k==="3") useHeal("superpocion");
    if (k==="Escape"||k==="0") Battle.menu="main";
  }
}

let mainRects=[], fightRects=[], bagRects=[];
function battleClick(mx,my) {
  if (Battle.busy) return;
  const test=(arr,fn)=>{for(let i=0;i<arr.length;i++) if(hit(mx,my,arr[i])){fn(i);return true;} return false;};
  if (Battle.menu==="main") test(mainRects,(i)=>{[()=>Battle.menu="fight",()=>Battle.menu="bag",swapNext,flee][i]();});
  else if (Battle.menu==="fight") { if(!test(fightRects,(i)=>{if(i<Battle.mine.moves.length)playerMove(Battle.mine.moves[i].key);}) && my>H-54) Battle.menu="main"; }
  else if (Battle.menu==="bag") { if(!test(bagRects,(i)=>{[()=>throwBall(),()=>useHeal("pocion"),()=>useHeal("superpocion")][i]();}) && my>H-54) Battle.menu="main"; }
}
function hit(mx,my,r){ return mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h; }

function playerMove(moveKey) {
  const mv = Battle.mine.moves.find(m=>m.key===moveKey);
  if (mv && mv.pp<=0) { pushLog("¡Sin PP!"); return; }
  if (mv) mv.pp--;
  Battle.busy=true; Battle.menu="main";
  const playerFirst = Battle.mine.spd >= Battle.enemy.spd;
  const seq = playerFirst
    ? [()=>doMove(Battle.mine,Battle.enemy,moveKey,true), ()=>enemyTurn()]
    : [()=>enemyTurn(), ()=>doMove(Battle.mine,Battle.enemy,moveKey,true)];
  runSeq(seq,0);
}
function enemyTurn(){ if(Battle.enemy.hp<=0)return; doMove(Battle.enemy,Battle.mine,pickEnemyMove(),false); }
function pickEnemyMove() {
  const moves=Battle.enemy.moves.filter(m=>m.pp>0); if(!moves.length)return "placaje";
  let best=moves[0].key,bs=-1;
  for(const m of moves){ const mv=MOVES[m.key]; if(mv.power===0){continue;}
    const s=mv.power*effFor(mv.type,Battle.mine.type)*(0.85+Math.random()*0.3); if(s>bs){bs=s;best=m.key;} }
  return best;
}
function doMove(user,target,moveKey,isPlayer) {
  if (user.hp<=0) return;
  const mv=MOVES[moveKey];
  const res=computeDamage(user,target,moveKey);
  pushLog(`${user.name} usó`, `${mv.name}.`);
  if (res.miss){ pushLog("¡Pero falló!"); return; }
  if (res.effect){
    if(res.effect==="atkDown"){target.atkMod=Math.max(-2,target.atkMod-1);pushLog(`Bajó el ataque`,`de ${target.name}.`);}
    if(res.effect==="defUp"){user.defMod=Math.min(2,user.defMod+1);pushLog(`Subió la defensa`,`de ${user.name}.`);}
    return;
  }
  target.hp=Math.max(0,target.hp-res.dmg);
  if (isPlayer){Battle.enemyHurt=1;Battle.enemyShake=1;} else {Battle.mineHurt=1;Battle.mineShake=1;}
  if (res.eff>1) pushLog("¡Es súper eficaz!");
  else if (res.eff<1) pushLog("No es muy eficaz...");
  if (target.hp<=0){ pushLog(`${target.name}`,`se debilitó.`); if(target===Battle.enemy)onEnemyFaint(); else onMineFaint(); }
}
function onEnemyFaint() {
  const xp=18+Battle.enemy.level*6;
  const evs=gainXp(Battle.mine,xp);
  pushLog(`${Battle.mine.name} ganó`, `${xp} de exp.`);
  for(const ev of evs){
    if(ev.type==="levelup") pushLog(`¡Subió al`,`nivel ${ev.level}!`);
    if(ev.type==="learn") pushLog(`¡Aprendió`,`${ev.move}!`);
    if(ev.type==="evolve") pushLog(`¡${ev.from} evolucionó`,`a ${ev.to}!`);
  }
  if (Battle.isTrainer) {
    Battle.trainerIdx++;
    if (Battle.trainerIdx<Battle.trainerTeam.length) {
      setTimeout(()=>{Battle.enemy=Battle.trainerTeam[Battle.trainerIdx];Battle.enemy.atkMod=0;Battle.enemy.defMod=0;pushLog(`NOVA envía a`,`${Battle.enemy.name}.`);Battle.busy=false;},700);
      return;
    }
    State.defeatedRivals++;
    if (rivalTile){ MAP[rivalTile.y][rivalTile.x]=0; }
    setTimeout(()=>{ endBattle();
      if (State.defeatedRivals>=6) flash("¡6 arenas vencidas! Eres el Campeón. 🏆");
      else { flash(`¡Venciste a NOVA! (${State.defeatedRivals}/6)`); placeRivalRandom(); }
    },800);
    return;
  }
  setTimeout(()=>endBattle(),800);
}
function placeRivalRandom(){
  const spots=[]; for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++) if((MAP[y][x]===0||MAP[y][x]===6)&&!(x===State.player.x&&y===State.player.y)) spots.push({x,y});
  const s=spots[Math.floor(Math.random()*spots.length)]; MAP[s.y][s.x]=5; rivalTile=s;
}
function onMineFaint(){
  const n=firstAlive();
  if(n) setTimeout(()=>{Battle.mine=n;Battle.mine.atkMod=0;Battle.mine.defMod=0;pushLog(`¡Adelante,`,`${Battle.mine.name}!`);Battle.busy=false;},700);
  else setTimeout(()=>{State.scene="over";Battle.active=false;},800);
}
function runSeq(seq,i){
  if(i>=seq.length){ if(Battle.enemy.hp>0&&Battle.mine.hp>0)Battle.busy=false; return; }
  seq[i](); if(Battle.enemy.hp<=0||Battle.mine.hp<=0)return;
  setTimeout(()=>runSeq(seq,i+1),650);
}
function throwBall(){
  if(Battle.isTrainer){pushLog("¡No puedes robar el","monstruo de otro!");return;}
  if(State.bag.esfera<=0){pushLog("No te quedan","esferas.");return;}
  State.bag.esfera--; Battle.busy=true; Battle.menu="main";
  pushLog("Lanzaste una","esfera...");
  const ok=Math.random()<catchChance(Battle.enemy);
  setTimeout(()=>{
    if(ok){ pushLog(`¡Atrapaste a`,`${Battle.enemy.name}!`); markDex(Battle.enemy.species,true);
      if(State.party.length<6)State.party.push(Battle.enemy); setTimeout(()=>endBattle(),800); }
    else { pushLog("¡Se soltó!"); setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},400); }
  },700);
}
function useHeal(key){
  if(State.bag[key]<=0){pushLog("No te quedan.","");return;}
  const it=ITEMS[key]; if(Battle.mine.hp>=Battle.mine.maxHp){pushLog("Ya está al","máximo.");return;}
  State.bag[key]--; Battle.mine.hp=Math.min(Battle.mine.maxHp,Battle.mine.hp+it.amount);
  pushLog(`${Battle.mine.name} recuperó`,`PV.`); Battle.busy=true; Battle.menu="main";
  setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500);
}
function swapNext(){
  const o=State.party.filter(m=>m!==Battle.mine&&m.hp>0); if(!o.length){pushLog("No hay otro","en pie.");return;}
  Battle.mine=o[0];Battle.mine.atkMod=0;Battle.mine.defMod=0;pushLog(`¡Adelante,`,`${Battle.mine.name}!`);
  Battle.busy=true;Battle.menu="main"; setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500);
}
function flee(){
  if(Battle.isTrainer){pushLog("¡No puedes huir de","un rival!");return;}
  if(Math.random()<0.7){pushLog("Escapaste.","");setTimeout(()=>endBattle(),500);}
  else {pushLog("¡No escapaste!","");Battle.busy=true;setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500);}
}
function endBattle(){ Battle.active=false; State.scene="world"; }
function pushLog(a,b=""){ Battle.log=[a,b]; }

// ============================================================
//  MENÚ PRINCIPAL
// ============================================================
const TABS = ["EQUIPO","POKÉDEX","MOCHILA","GUARDAR"];
let tabRects=[];
function menuKey(k){
  if(k==="Escape"||k==="m"){State.scene="world";return;}
  if(k==="ArrowLeft"||k==="a")State.menuSel=(State.menuSel+3)%4;
  if(k==="ArrowRight"||k==="d")State.menuSel=(State.menuSel+1)%4;
  if(k==="Enter"||k===" "){ if(State.menuSel===3)saveGame(); }
  if(k==="1")State.menuSel=0; if(k==="2")State.menuSel=1; if(k==="3")State.menuSel=2; if(k==="4"){State.menuSel=3;saveGame();}
}
function menuClick(mx,my){
  for(let i=0;i<tabRects.length;i++) if(hit(mx,my,tabRects[i])){ State.menuSel=i; if(i===3)saveGame(); return; }
  if(my>H-40){State.scene="world";}
}

// ============================================================
//  UTILS
// ============================================================
function weightedWild(){ const t=WILD_POOL.reduce((a,b)=>a+b.weight,0); let r=Math.random()*t; for(const w of WILD_POOL){r-=w.weight;if(r<=0)return w.id;} return WILD_POOL[0].id; }
function flash(msg){ State.message=msg; State.flash=200; }

// ============================================================
//  DIBUJO
// ============================================================
function loop(){
  State.frame++;
  if(State.scene==="world") updateWorld();
  for(const k of ["mineHurt","enemyHurt","mineShake","enemyShake"]) if(Battle[k]>0)Battle[k]-=0.1;
  if(State.flash>0)State.flash--;
  // fondo general (bordes del "aparato")
  ctx.fillStyle="#0f380f"; ctx.fillRect(0,0,W,H);
  if(State.scene==="title")drawTitle();
  else if(State.scene==="starter")drawStarter();
  else if(State.scene==="world")drawWorld();
  else if(State.scene==="battle")drawBattle();
  else if(State.scene==="menu")drawMenu();
  else if(State.scene==="over")drawOver();
  requestAnimationFrame(loop);
}

function screen(){ ctx.fillStyle=GB[0]; ctx.fillRect(0,0,W,H); }
function text(s,x,y,tone=3,size=16){ ctx.fillStyle=GB[tone]; ctx.font=`${size}px "Courier New", monospace`; ctx.textAlign="left"; ctx.fillText(s,x,y); }
function textC(s,x,y,tone=3,size=16){ ctx.fillStyle=GB[tone]; ctx.font=`bold ${size}px "Courier New", monospace`; ctx.textAlign="center"; ctx.fillText(s,x,y); ctx.textAlign="left"; }

function drawTitle(){
  screen();
  textC("MONSTRU", W/2, 120, 3, 56);
  textC("Edición Esmeralda del Bosque", W/2, 160, 2, 16);
  drawMonster(ctx,"emberin",W/2-120,320,110,{frame:State.frame});
  drawMonster(ctx,"gotita",W/2,320,110,{frame:State.frame+30});
  drawMonster(ctx,"broton",W/2+120,320,110,{frame:State.frame+60});
  if(Math.floor(State.frame/30)%2===0) textC(hasSave()?"PULSA PARA CONTINUAR":"PULSA PARA EMPEZAR", W/2, H-70, 2, 18);
  textC("Un juego de monstruos · todo original", W/2, H-36, 1, 13);
}

function drawStarter(){
  screen();
  textC("EL PROF. CEDRO TE DA", W/2, 70, 3, 22);
  textC("TU PRIMER MONSTRUO", W/2, 98, 3, 22);
  textC("Elige con 1 / 2 / 3 o haz clic", W/2, 128, 2, 15);
  starterRects=[];
  STARTERS.forEach((id,i)=>{
    const x=W/2+(i-1)*230, y=320, cw=200, ch=260, rx=x-cw/2, ry=y-ch/2;
    gbBox(ctx,rx,ry,cw,ch,4);
    starterRects.push({x:rx,y:ry,w:cw,h:ch});
    drawMonster(ctx,id,x,y-30,120,{frame:State.frame+i*25});
    const sp=SPECIES[id];
    textC(`${i+1}. ${sp.name}`,x,y+80,3,20);
    textC(`TIPO ${sp.type.toUpperCase()}`,x,y+104,2,14);
    ctx.font='12px "Courier New", monospace'; ctx.fillStyle=GB[2];
    wrap(sp.dex,x,y+124,cw-30,14,true);
  });
}

function drawWorld(){
  screen();
  // tiles
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const t=MAP[y][x], px=VIEW_OX+x*TILE, py=VIEW_OY+y*TILE;
    // suelo base
    ctx.fillStyle=GB[1]; ctx.fillRect(px,py,TILE,TILE);
    if(t===6){ ctx.fillStyle=GB[0]; ctx.fillRect(px,py,TILE,TILE); } // camino claro
    if(t===1){ // hierba alta: patron de pixeles
      ctx.fillStyle=GB[2];
      for(let i=0;i<4;i++)for(let j=0;j<4;j++) if((i+j)%2===0) ctx.fillRect(px+i*9,py+j*9,5,5);
    }
    if(t===3){ ctx.fillStyle=GB[2]; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle=GB[1]; for(let i=0;i<3;i++)ctx.fillRect(px+4+i*11,py+8+((i%2)*10),7,3); }
    if(t===2){ ctx.fillStyle=GB[3]; ctx.fillRect(px+3,py+3,TILE-6,TILE-6); ctx.fillStyle=GB[2]; ctx.fillRect(px+7,py+7,TILE-14,TILE-14); }
    if(t===4){ ctx.fillStyle=GB[3]; ctx.fillRect(px+2,py+10,TILE-4,TILE-10); ctx.fillStyle=GB[2]; ctx.fillRect(px+8,py+16,8,TILE-16); // puerta
      ctx.fillStyle=GB[3]; ctx.beginPath(); ctx.moveTo(px,py+12);ctx.lineTo(px+TILE/2,py+2);ctx.lineTo(px+TILE,py+12);ctx.closePath();ctx.fill(); }
    if(t===5) drawTrainer(px+TILE/2,py+TILE/2);
  }
  drawPlayer();
  // HUD superior
  ctx.fillStyle=GB[3]; ctx.fillRect(0,0,W,46);
  text("MONSTRU",14,30,0,20);
  text(`Equipo ${State.party.length}/6   Esferas ${State.bag.esfera}   NOVA ${State.defeatedRivals}/6`, 200, 30, 0, 15);
  // pie
  ctx.fillStyle=GB[3]; ctx.fillRect(0,H-30,W,30);
  text("Flechas: mover · hierba: monstruos · ENTER: menú", 14, H-10, 0, 14);
  if(State.flash>0){
    gbBox(ctx,40,H/2-40,W-80,80,4);
    ctx.font='bold 18px "Courier New", monospace'; ctx.fillStyle=GB[3];
    wrap(State.message,W/2,H/2-2,W-140,22,true);
  }
}
function drawPlayer(){
  const px=VIEW_OX+State.player.x*TILE+TILE/2, py=VIEW_OY+State.player.y*TILE+TILE/2;
  ctx.fillStyle=GB[3]; ctx.fillRect(px-9,py-4,18,14);      // cuerpo
  ctx.fillStyle=GB[2]; ctx.fillRect(px-8,py-14,16,10);     // cabeza
  ctx.fillStyle=GB[3]; ctx.fillRect(px-9,py-16,18,4);      // gorra
  ctx.fillStyle=GB[0]; ctx.fillRect(px-6,py-11,3,3); ctx.fillRect(px+3,py-11,3,3); // ojos
}
function drawTrainer(cx,cy){
  ctx.fillStyle=GB[3]; ctx.fillRect(cx-9,cy-4,18,14);
  ctx.fillStyle=GB[2]; ctx.fillRect(cx-8,cy-14,16,10);
  ctx.fillStyle=GB[3]; ctx.fillRect(cx-9,cy-18,18,5);
  const yb=Math.round(Math.sin(State.frame/10)*2);
  ctx.font='bold 20px "Courier New", monospace'; ctx.fillStyle=GB[3]; ctx.textAlign="center";
  ctx.fillText("!",cx,cy-22+yb); ctx.textAlign="left";
}

// ---------- BATALLA ----------
function drawBattle(){
  screen();
  // línea de suelo
  ctx.fillStyle=GB[1]; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=GB[0]; ctx.fillRect(0,H*0.5,W,H*0.5);
  // plataformas ovaladas en pixel (rectángulos escalonados)
  plat(W*0.72,H*0.42,150); plat(W*0.28,H*0.66,180);
  // enemigo
  const ex=W*0.72+(Battle.enemyShake>0?(Math.random()-0.5)*8:0);
  drawMonster(ctx,Battle.enemy.species,ex,H*0.34,120,{flip:true,frame:State.frame,hurt:Math.max(0,Battle.enemyHurt)});
  statBox(40,70,Battle.enemy,false);
  // mío
  const mx=W*0.28+(Battle.mineShake>0?(Math.random()-0.5)*8:0);
  drawMonster(ctx,Battle.mine.species,mx,H*0.56,150,{flip:false,frame:State.frame+15,hurt:Math.max(0,Battle.mineHurt)});
  statBox(W-360,H*0.46,Battle.mine,true);
  // caja de texto / menús
  const by=H-150;
  gbBox(ctx,12,by,W-24,138,4);
  if(Battle.busy || Battle.menu==="main"===false && false){}
  // log a la izquierda
  ctx.font='17px "Courier New", monospace'; ctx.fillStyle=GB[3]; ctx.textAlign="left";
  Battle.log.forEach((l,i)=>ctx.fillText(l,34,by+36+i*26));

  mainRects=[];fightRects=[];bagRects=[];
  if(!Battle.busy){
    if(Battle.menu==="main"){
      const opts=["LUCHAR","MOCHILA","CAMBIAR","HUIR"];
      opts.forEach((o,i)=>{ const bx=W/2+ (i%2)*((W/2-24)/2) + 6; const yy=by+28+Math.floor(i/2)*52; const bw=(W/2-36)/2; const bh=44;
        btn(bx,yy,bw,bh,`${i+1} ${o}`); mainRects.push({x:bx,y:yy,w:bw,h:bh}); });
    } else if(Battle.menu==="fight"){
      Battle.mine.moves.forEach((m,i)=>{ const mv=MOVES[m.key]; const bx=28+(i%2)*((W-56)/2); const yy=by+28+Math.floor(i/2)*52; const bw=(W-72)/2; const bh=44;
        moveBtn(bx,yy,bw,bh,mv,m,i+1); fightRects.push({x:bx,y:yy,w:bw,h:bh}); });
      textC("(Esc = volver)", W-90, by+128, 2, 12);
    } else if(Battle.menu==="bag"){
      const opts=[["ESFERA",State.bag.esfera],["POCIÓN",State.bag.pocion],["SUPERPOCIÓN",State.bag.superpocion]];
      opts.forEach((o,i)=>{ const bx=28+(i%3)*((W-56)/3); const yy=by+40; const bw=(W-72)/3; const bh=50;
        btn(bx,yy,bw,bh,`${i+1} ${o[0]} x${o[1]}`,13); bagRects.push({x:bx,y:yy,w:bw,h:bh}); });
      textC("(Esc = volver)", W-90, by+128, 2, 12);
    }
  }
}
function plat(cx,cy,r){ ctx.fillStyle=GB[2]; for(let i=0;i<5;i++){const w=r-i*(r/6); ctx.fillRect(cx-w,cy+i*5-2,w*2,5);} }
function statBox(x,y,mon,mine){
  const w=320,h=mine?86:70;
  gbBox(ctx,x,y,w,h,4);
  ctx.font='bold 18px "Courier New", monospace'; ctx.fillStyle=GB[3]; ctx.textAlign="left";
  ctx.fillText(mon.name.toUpperCase(),x+16,y+26);
  ctx.font='15px "Courier New", monospace'; ctx.fillText(`Nv${mon.level}`,x+w-54,y+26);
  // barra de vida
  const bx=x+16,bby=y+40,bw=w-32,bh=12;
  ctx.fillStyle=GB[3]; ctx.fillRect(bx-2,bby-2,bw+4,bh+4);
  ctx.fillStyle=GB[0]; ctx.fillRect(bx,bby,bw,bh);
  const ratio=Math.max(0,mon.hp/mon.maxHp);
  ctx.fillStyle=GB[2]; ctx.fillRect(bx,bby,bw*ratio,bh);
  if(mine){ ctx.font='14px "Courier New", monospace'; ctx.fillStyle=GB[3]; ctx.fillText(`PV ${Math.max(0,Math.round(mon.hp))}/${mon.maxHp}`,bx,bby+30);
    // barra de experiencia fina
    const need=18+mon.level*mon.level*4; const er=Math.min(1,mon.xp/need);
    ctx.fillStyle=GB[3]; ctx.fillRect(bx,bby+40,bw,5); ctx.fillStyle=GB[1]; ctx.fillRect(bx,bby+40,bw*er,5);
  }
}
function btn(x,y,w,h,label,size=16){ gbBox(ctx,x,y,w,h,3); ctx.font=`bold ${size}px "Courier New", monospace`; ctx.fillStyle=GB[3]; ctx.textAlign="center"; ctx.fillText(label,x+w/2,y+h/2+5); ctx.textAlign="left"; }
function moveBtn(x,y,w,h,mv,m,n){ gbBox(ctx,x,y,w,h,3); ctx.fillStyle=GB[3]; ctx.textAlign="left";
  ctx.font='bold 16px "Courier New", monospace'; ctx.fillText(`${n} ${mv.name}`,x+12,y+20);
  ctx.font='12px "Courier New", monospace'; ctx.fillText(`${mv.type}  PP ${m.pp}/${m.ppMax}  ${mv.power?"Pot "+mv.power:"estado"}`,x+12,y+36); }

// ---------- MENÚ ----------
function drawMenu(){
  screen();
  // pestañas
  tabRects=[];
  const tw=W/4;
  TABS.forEach((t,i)=>{ const x=i*tw, sel=i===State.menuSel;
    ctx.fillStyle=sel?GB[3]:GB[1]; ctx.fillRect(x,0,tw,44);
    ctx.font='bold 18px "Courier New", monospace'; ctx.fillStyle=sel?GB[0]:GB[3]; ctx.textAlign="center";
    ctx.fillText(t,x+tw/2,30); ctx.textAlign="left"; tabRects.push({x,y:0,w:tw,h:44}); });
  gbBox(ctx,12,54,W-24,H-100,4);
  if(State.menuSel===0) drawTeam();
  else if(State.menuSel===1) drawDex();
  else if(State.menuSel===2) drawBag();
  else drawSaveTab();
  ctx.fillStyle=GB[3]; ctx.fillRect(0,H-40,W,40);
  text("←/→ cambia pestaña · ENTER en GUARDAR · ESC salir", 14, H-14, 0, 14);
}
function drawTeam(){
  textC("TU EQUIPO", W/2, 90, 3, 22);
  State.party.forEach((m,i)=>{
    const y=120+i*78, x=60;
    drawMonster(ctx,m.species,x+30,y+20,64,{frame:State.frame+i*20});
    ctx.textAlign="left"; ctx.font='bold 20px "Courier New", monospace'; ctx.fillStyle=GB[3];
    ctx.fillText(`${m.name}  Nv${m.level}`,x+90,y+10);
    // barra de vida
    const bw=300,bx=x+90,by=y+22; ctx.fillStyle=GB[3];ctx.fillRect(bx-2,by-2,bw+4,14);
    ctx.fillStyle=GB[0];ctx.fillRect(bx,by,bw,10); ctx.fillStyle=GB[2];ctx.fillRect(bx,by,bw*Math.max(0,m.hp/m.maxHp),10);
    ctx.font='14px "Courier New", monospace'; ctx.fillStyle=GB[3];
    ctx.fillText(`PV ${Math.max(0,Math.round(m.hp))}/${m.maxHp}  tipo ${m.type}`,bx,by+28);
  });
}
function drawDex(){
  textC("POKÉDEX", W/2, 90, 3, 22);
  const ids=Object.keys(SPECIES);
  const seen=ids.filter(id=>State.dex[id]&&State.dex[id].seen).length;
  const caught=ids.filter(id=>State.dex[id]&&State.dex[id].caught).length;
  textC(`Vistos ${seen}   Atrapados ${caught}   Total ${ids.length}`, W/2, 118, 2, 15);
  ids.forEach((id,i)=>{
    const col=i%3, row=Math.floor(i/3);
    const x=70+col*((W-140)/3), y=150+row*70;
    const d=State.dex[id];
    if(d&&d.seen){ drawMonster(ctx,id,x+28,y+18,52,{frame:State.frame}); ctx.fillStyle=GB[3]; }
    else { ctx.fillStyle=GB[2]; ctx.fillRect(x+10,y-4,40,40); ctx.fillStyle=GB[0]; ctx.font='bold 24px monospace';ctx.textAlign="center";ctx.fillText("?",x+30,y+24);ctx.textAlign="left"; ctx.fillStyle=GB[2]; }
    ctx.font='13px "Courier New", monospace'; ctx.textAlign="left";
    ctx.fillText(d&&d.seen?SPECIES[id].name:"- - -", x+58, y+14);
    if(d&&d.caught){ ctx.fillStyle=GB[3]; ctx.fillText("●",x+58,y+30); ctx.fillText("capturado",x+72,y+30); }
  });
}
function drawBag(){
  textC("MOCHILA", W/2, 90, 3, 22);
  Object.entries(State.bag).forEach(([k,n],i)=>{
    const it=ITEMS[k]; const y=140+i*60;
    ctx.textAlign="left"; ctx.font='bold 20px "Courier New", monospace'; ctx.fillStyle=GB[3];
    ctx.fillText(`${it.name}  x${n}`, 70, y);
    ctx.font='14px "Courier New", monospace'; ctx.fillStyle=GB[2];
    ctx.fillText(it.desc, 70, y+24);
  });
}
function drawSaveTab(){
  textC("GUARDAR PARTIDA", W/2, 150, 3, 24);
  textC("Pulsa ENTER o haz clic en esta pestaña", W/2, 200, 2, 16);
  textC("La partida se guarda en este navegador.", W/2, 230, 2, 16);
  if(State.flash>0){ gbBox(ctx,W/2-200,280,400,70,4); textC(State.message,W/2,322,3,20); }
}

function drawOver(){
  screen();
  textC("TODOS TUS MONSTRUOS", W/2, H/2-40, 3, 28);
  textC("SE DEBILITARON", W/2, H/2-6, 3, 28);
  textC("Pulsa ENTER para volver a empezar", W/2, H/2+50, 2, 16);
}

// envoltura de texto
function wrap(s,x,y,maxW,lh,centered){
  const words=String(s).split(" "); let line="",yy=y;
  ctx.textAlign=centered?"center":"left";
  for(const w of words){ const test=line+w+" "; if(ctx.measureText(test).width>maxW&&line){ctx.fillText(line.trim(),x,yy);line=w+" ";yy+=lh;} else line=test; }
  ctx.fillText(line.trim(),x,yy); ctx.textAlign="left";
}

loop();
