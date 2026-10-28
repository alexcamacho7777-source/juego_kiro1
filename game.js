// ============================================================
//  game.js — MONSTRU estilo Game Boy, mundo por ZONAS.
//  Pueblo + 6 rutas + 6 ciudades con arena, líderes, medallas,
//  historia original (Verdalia, Equipo Eclipse, rival Nova),
//  menú (equipo, dex, mochila, medallas, guardar) y guardado.
// ============================================================
import { SPECIES, MOVES, WILD_POOL, STARTERS, effectiveness as effFor } from "./data.js";
import { makeMonster, gainXp, computeDamage, catchChance } from "./engine.js";
import { drawMonster } from "./render.js";
import { GB, gbBox } from "./gb.js";
import { ZONES } from "./maps.js";
import { REGION, PLACES, GYM_LEADERS, STORY_BEATS } from "./story.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const SAVE_KEY = "monstru_save_v2";

export const ITEMS = {
  esfera:  { name: "Esfera", desc: "Atrapa a un monstruo salvaje.", kind: "ball" },
  pocion:  { name: "Poción", desc: "Cura 30 PV.", kind: "heal", amount: 30 },
  superpocion: { name: "Superpoción", desc: "Cura 70 PV.", kind: "heal", amount: 70 },
  revivir: { name: "Revivir", desc: "Revive con media vida.", kind: "revive" },
};

const State = {
  scene: "title",
  frame: 0,
  party: [],
  bag: { esfera: 15, pocion: 8, superpocion: 3, revivir: 2 },
  dex: {},
  badges: [],             // nombres de medallas conseguidas
  gymsDone: {},           // city -> true
  defeatedRivals: 0,
  zone: "pueblo_raiz",
  player: { x: 7, y: 10, dir: "down" },
  flags: {},              // eventos de historia ya vistos
  message: "", flash: 0,
  menuSel: 0,
  story: null, storyIdx: 0,   // texto de historia en curso
};

// zona actual
let MAP = [], COLS = 16, ROWS = 14, EXITS = {}, GYMAT = null, SIGN = null;
let TILE = 36, VIEW_OX = 0, VIEW_OY = 54;
let rivalTile = null, villainTile = null;

function loadZone(id, entry) {
  const z = ZONES[id];
  State.zone = id;
  MAP = z.map.map(r => r.slice());
  ROWS = MAP.length; COLS = MAP[0].length;
  TILE = Math.floor(Math.min((W - 20) / COLS, (H - 120) / ROWS));
  VIEW_OX = Math.floor((W - COLS * TILE) / 2);
  VIEW_OY = 54;
  const pos = entry || z.start;
  State.player.x = pos.x; State.player.y = pos.y;
  EXITS = z.exits || {};
  GYMAT = z.gymAt || null; SIGN = z.sign || null;
  rivalTile = findTile(5); villainTile = findTile(7) && null;
  // villano: solo si el evento aún no ocurrió
  villainTile = null;
  if (z.villain) {
    const key = "villain_" + id;
    if (!State.flags[key]) villainTile = { ...z.villain };
  }
  // arena ya superada -> no vuelve a pelear como obligatoria, pero la puerta sigue
  const beat = PLACES[z.place];
  if (beat && beat.intro && !State.flags["seen_" + id]) {
    State.flags["seen_" + id] = true;
    showStory(beat.intro);
  }
}
function findTile(v){ for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) if(MAP[y][x]===v) return {x,y}; return null; }

// ============================================================
//  HISTORIA (cajas de texto que avanzas)
// ============================================================
function showStory(lines){ State.story = lines.slice(); State.storyIdx = 0; }
function storyAdvance(){
  if(!State.story) return;
  State.storyIdx++;
  if(State.storyIdx >= State.story.length){ State.story = null; State.storyIdx = 0; }
}

// ============================================================
//  BATALLA
// ============================================================
const Battle = {
  active:false, enemy:null, mine:null, log:[], menu:"main", busy:false,
  mode:"wild",  // wild | rival | gym | villain
  team:[], idx:0, leader:"", badge:"", city:"",
  mineHurt:0, enemyHurt:0, mineShake:0, enemyShake:0,
};

// ============================================================
//  ENTRADA
// ============================================================
const keys = {};
addEventListener("keydown",(e)=>{ keys[e.key]=true; handleKey(e.key); if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter"].includes(e.key))e.preventDefault(); });
addEventListener("keyup",(e)=>{ keys[e.key]=false; });

function handleKey(k){
  if(State.story){ if(k==="Enter"||k===" "||k==="Escape") storyAdvance(); return; }
  if(State.scene==="title"){ tryLoadOrStart(); return; }
  if(State.scene==="starter"){ if(k==="1")chooseStarter(0); if(k==="2")chooseStarter(1); if(k==="3")chooseStarter(2); return; }
  if(State.scene==="over"){ if(k==="Enter")location.reload(); return; }
  if(State.scene==="world"){ if(k==="Enter"||k==="m"||k==="Escape"){State.scene="menu";State.menuSel=0;} if(k===" ")interact(); return; }
  if(State.scene==="menu"){ menuKey(k); return; }
  if(State.scene==="battle"){ battleKey(k); return; }
}
canvas.addEventListener("click",(e)=>{
  const r=canvas.getBoundingClientRect(); const mx=(e.clientX-r.left)*(W/r.width); const my=(e.clientY-r.top)*(H/r.height);
  if(State.story){ storyAdvance(); return; }
  if(State.scene==="title"){ tryLoadOrStart(); return; }
  if(State.scene==="starter"){ clickStarter(mx,my); return; }
  if(State.scene==="battle"){ battleClick(mx,my); return; }
  if(State.scene==="menu"){ menuClick(mx,my); return; }
  if(State.scene==="over"){ location.reload(); return; }
},{passive:true});

// ============================================================
//  GUARDAR / CARGAR
// ============================================================
function saveGame(){
  const d={ party:State.party, bag:State.bag, dex:State.dex, badges:State.badges, gymsDone:State.gymsDone,
    defeatedRivals:State.defeatedRivals, zone:State.zone, player:State.player, flags:State.flags };
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify(d)); flash("Partida guardada."); }catch{ flash("No se pudo guardar."); }
}
function hasSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch{ return false; } }
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!d||!d.party||!d.party.length) return false;
    Object.assign(State,{ party:d.party, bag:d.bag||State.bag, dex:d.dex||{}, badges:d.badges||[],
      gymsDone:d.gymsDone||{}, defeatedRivals:d.defeatedRivals||0, flags:d.flags||{} });
    State.scene="world"; loadZone(d.zone||"pueblo_raiz", d.player); State.story=null; return true;
  }catch{ return false; }
}
function tryLoadOrStart(){ if(hasSave()&&loadGame()){ flash("¡Bienvenido de nuevo!"); return; } State.scene="starter"; }

// ============================================================
//  INICIO
// ============================================================
let starterRects=[];
function chooseStarter(i){
  const id=STARTERS[i]; State.party=[makeMonster(id,5)]; markDex(id,true);
  State.scene="world"; loadZone("pueblo_raiz");
  setTimeout(()=>showStory(STORY_BEATS.intro), 300);
}
function clickStarter(mx,my){ for(let i=0;i<starterRects.length;i++){const r=starterRects[i]; if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){chooseStarter(i);return;}} }
function markDex(id,caught){ if(!State.dex[id])State.dex[id]={seen:false,caught:false}; State.dex[id].seen=true; if(caught)State.dex[id].caught=true; }

// ============================================================
//  INTERACCIÓN (SPACE): letreros y arenas
// ============================================================
function facing(){ const p=State.player; const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[p.dir]||[0,1]; return {x:p.x+d[0], y:p.y+d[1]}; }
function interact(){
  const f=facing();
  if(SIGN && SIGN.x===f.x && SIGN.y===f.y){ showStory(SIGN.text); return; }
  if(GYMAT && Math.abs(f.x-GYMAT.x)<=1 && Math.abs(f.y-GYMAT.y)<=1){ enterGym(); return; }
  // también si estás sobre el tile 7 (arena)
  if(MAP[State.player.y] && MAP[State.player.y][State.player.x]===7) enterGym();
}

// ============================================================
//  MOVIMIENTO + TRANSICIÓN ENTRE ZONAS
// ============================================================
let moveCd=0;
function updateWorld(){
  if(moveCd>0){moveCd--;return;}
  let dx=0,dy=0;
  if(keys["ArrowUp"]||keys["w"]){dy=-1;State.player.dir="up";}
  else if(keys["ArrowDown"]||keys["s"]){dy=1;State.player.dir="down";}
  else if(keys["ArrowLeft"]||keys["a"]){dx=-1;State.player.dir="left";}
  else if(keys["ArrowRight"]||keys["d"]){dx=1;State.player.dir="right";}
  if(!dx&&!dy)return;
  const nx=State.player.x+dx, ny=State.player.y+dy;

  // salir de la zona por un borde
  if(ny<0 && EXITS.north){ travel(EXITS.north); return; }
  if(ny>=ROWS && EXITS.south){ travel(EXITS.south); return; }
  if(nx<0 && EXITS.west){ travel(EXITS.west); return; }
  if(nx>=COLS && EXITS.east){ travel(EXITS.east); return; }
  if(nx<0||ny<0||nx>=COLS||ny>=ROWS) return;

  const t=MAP[ny][nx];
  if(t===2||t===3||t===4) return;        // pared/agua/casa bloquean
  if(t===7){ State.player.x=nx;State.player.y=ny;moveCd=7; enterGym(); return; }
  if(t===5){ State.player.x=nx;State.player.y=ny;moveCd=7; startRival(); return; }
  if(t===8){ if(SIGN) showStory(SIGN.text); return; }
  // villano bloqueando
  if(villainTile && villainTile.x===nx && villainTile.y===ny){ State.player.x=nx;State.player.y=ny;moveCd=7; startVillain(); return; }

  State.player.x=nx; State.player.y=ny; moveCd=7;
  if(t===1 && Math.random()<0.16) startWild();
}
function travel(ex){ moveCd=12; loadZone(ex.to, {x:ex.x,y:ex.y}); }

// ============================================================
//  COMBATE (lógica)
// ============================================================
function firstAlive(){ return State.party.find(m=>m.hp>0)||null; }

function startWild(){
  const id=weightedWild(); const lvl=levelForZone();
  Battle.enemy=makeMonster(id,lvl); Battle.mine=firstAlive(); if(!Battle.mine)return;
  markDex(id,false); beginBattle("wild",[`Un ${Battle.enemy.name} salvaje`,`apareció.`]);
}
function levelForZone(){
  // sube el nivel de los salvajes según medallas
  const base=2+State.badges.length*4; return base+Math.floor(Math.random()*4);
}
function startRival(){
  const teams=[
    [["nubelu",6],["chispin",7]],
    [["rocoto",14],["gotita",15],["broton",15]],
    [["flamuro",26],["maruala",26],["voltaix",27]],
    [["pyroleo",38],["tsunareo",38],["selvarex",39],["lumbeast",40]],
  ];
  const idx=Math.min(State.defeatedRivals,teams.length-1);
  Battle.team=teams[idx].map(([id,lv])=>makeMonster(id,lv)); Battle.idx=0;
  Battle.enemy=Battle.team[0]; Battle.mine=firstAlive(); if(!Battle.mine)return;
  const intro = State.defeatedRivals===0 ? STORY_BEATS.rival_1 : [`¡El rival NOVA`,`quiere la revancha!`];
  showStory(intro);
  beginBattle("rival",[`NOVA envía a`,`${Battle.enemy.name}.`]);
}
function enterGym(){
  const z=ZONES[State.zone]; const place=PLACES[z.place];
  if(!place||!place.gym){ flash("Aquí no hay arena."); return; }
  if(State.gymsDone[z.place]){ flash(`Ya tienes la ${place.gym.badge}.`); return; }
  const leader=GYM_LEADERS.find(g=>g.city===z.place);
  Battle.team=leader.team.map(([id,lv])=>makeMonster(id,lv)); Battle.idx=0;
  Battle.enemy=Battle.team[0]; Battle.mine=firstAlive(); if(!Battle.mine){flash("¡No tienes monstruos en pie!");return;}
  Battle.leader=leader.name; Battle.badge=leader.badge; Battle.city=z.place;
  showStory([`LÍDER ${leader.name.toUpperCase()}:`,`«¡Demuéstrame tu valía`,` con el tipo ${leader.type.toUpperCase()}!»`]);
  beginBattle("gym",[`${leader.name} envía a`,`${Battle.enemy.name}.`]);
}
function startVillain(){
  const isBoss = State.zone==="ciudad_brasa";
  showStory(isBoss?STORY_BEATS.eclipse_boss:STORY_BEATS.eclipse_1);
  const team = isBoss ? [["pyroleo",33],["peñascor",33],["lumbeast",34]] : [["nubelu",20],["rocoto",21]];
  Battle.team=team.map(([id,lv])=>makeMonster(id,lv)); Battle.idx=0;
  Battle.enemy=Battle.team[0]; Battle.mine=firstAlive(); if(!Battle.mine)return;
  Battle.city=State.zone;
  beginBattle("villain",[`EQUIPO ECLIPSE`,`envía a ${Battle.enemy.name}.`]);
}
function beginBattle(mode,log){
  Battle.mode=mode; Battle.active=true; Battle.log=log; Battle.menu="main"; Battle.busy=false;
  if(Battle.mine){Battle.mine.atkMod=0;Battle.mine.defMod=0;} Battle.enemy.atkMod=0;Battle.enemy.defMod=0;
  State.scene="battle";
}

function battleKey(k){
  if(Battle.busy)return;
  if(Battle.menu==="main"){ if(k==="1")Battle.menu="fight"; if(k==="2")Battle.menu="bag"; if(k==="3")swapNext(); if(k==="4")flee(); }
  else if(Battle.menu==="fight"){ const n=parseInt(k,10); if(n>=1&&n<=Battle.mine.moves.length)playerMove(Battle.mine.moves[n-1].key); if(k==="Escape"||k==="0")Battle.menu="main"; }
  else if(Battle.menu==="bag"){ if(k==="1")throwBall(); if(k==="2")useHeal("pocion"); if(k==="3")useHeal("superpocion"); if(k==="Escape"||k==="0")Battle.menu="main"; }
}
let mainRects=[],fightRects=[],bagRects=[];
function battleClick(mx,my){
  if(Battle.busy)return;
  const test=(arr,fn)=>{for(let i=0;i<arr.length;i++)if(hit(mx,my,arr[i])){fn(i);return true;}return false;};
  if(Battle.menu==="main")test(mainRects,(i)=>{[()=>Battle.menu="fight",()=>Battle.menu="bag",swapNext,flee][i]();});
  else if(Battle.menu==="fight"){ if(!test(fightRects,(i)=>{if(i<Battle.mine.moves.length)playerMove(Battle.mine.moves[i].key);})&&my>H-54)Battle.menu="main"; }
  else if(Battle.menu==="bag"){ if(!test(bagRects,(i)=>{[()=>throwBall(),()=>useHeal("pocion"),()=>useHeal("superpocion")][i]();})&&my>H-54)Battle.menu="main"; }
}
function hit(mx,my,r){ return mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h; }

function playerMove(moveKey){
  const mv=Battle.mine.moves.find(m=>m.key===moveKey);
  if(mv&&mv.pp<=0){pushLog("¡Sin PP!");return;} if(mv)mv.pp--;
  Battle.busy=true;Battle.menu="main";
  const first=Battle.mine.spd>=Battle.enemy.spd;
  const seq=first?[()=>doMove(Battle.mine,Battle.enemy,moveKey,true),()=>enemyTurn()]:[()=>enemyTurn(),()=>doMove(Battle.mine,Battle.enemy,moveKey,true)];
  runSeq(seq,0);
}
function enemyTurn(){ if(Battle.enemy.hp<=0)return; doMove(Battle.enemy,Battle.mine,pickEnemyMove(),false); }
function pickEnemyMove(){ const ms=Battle.enemy.moves.filter(m=>m.pp>0); if(!ms.length)return "placaje"; let b=ms[0].key,bs=-1;
  for(const m of ms){const mv=MOVES[m.key]; if(mv.power===0)continue; const s=mv.power*effFor(mv.type,Battle.mine.type)*(0.85+Math.random()*0.3); if(s>bs){bs=s;b=m.key;}} return b; }
function doMove(user,target,moveKey,isPlayer){
  if(user.hp<=0)return; const mv=MOVES[moveKey]; const res=computeDamage(user,target,moveKey);
  pushLog(`${user.name} usó`,`${mv.name}.`);
  if(res.miss){pushLog("¡Pero falló!");return;}
  if(res.effect){ if(res.effect==="atkDown"){target.atkMod=Math.max(-2,target.atkMod-1);pushLog("Bajó el ataque",`de ${target.name}.`);}
    if(res.effect==="defUp"){user.defMod=Math.min(2,user.defMod+1);pushLog("Subió la defensa",`de ${user.name}.`);} return; }
  target.hp=Math.max(0,target.hp-res.dmg);
  if(isPlayer){Battle.enemyHurt=1;Battle.enemyShake=1;}else{Battle.mineHurt=1;Battle.mineShake=1;}
  if(res.eff>1)pushLog("¡Es súper eficaz!"); else if(res.eff<1)pushLog("No es muy eficaz...");
  if(target.hp<=0){ pushLog(`${target.name}`,`se debilitó.`); if(target===Battle.enemy)onEnemyFaint(); else onMineFaint(); }
}
function onEnemyFaint(){
  const xp=18+Battle.enemy.level*6; const evs=gainXp(Battle.mine,xp);
  pushLog(`${Battle.mine.name} ganó`,`${xp} de exp.`);
  for(const ev of evs){ if(ev.type==="levelup")pushLog("¡Subió al",`nivel ${ev.level}!`); if(ev.type==="learn")pushLog("¡Aprendió",`${ev.move}!`); if(ev.type==="evolve")pushLog(`¡${ev.from} evolucionó`,`a ${ev.to}!`); }
  if(Battle.mode!=="wild"){
    Battle.idx++;
    if(Battle.idx<Battle.team.length){ setTimeout(()=>{Battle.enemy=Battle.team[Battle.idx];Battle.enemy.atkMod=0;Battle.enemy.defMod=0;pushLog("Envía a",`${Battle.enemy.name}.`);Battle.busy=false;},700); return; }
    setTimeout(()=>onTrainerDefeated(),800); return;
  }
  setTimeout(()=>endBattle(),800);
}
function onTrainerDefeated(){
  const mode=Battle.mode;
  endBattle();
  if(mode==="gym"){
    State.gymsDone[Battle.city]=true;
    if(!State.badges.includes(Battle.badge))State.badges.push(Battle.badge);
    if(MAP[GYMAT?.y]&&GYMAT) MAP[GYMAT.y][GYMAT.x]=0;
    flash(`¡Ganaste la ${Battle.badge}! (${State.badges.length}/6)`);
    if(State.badges.length>=6) setTimeout(()=>showStory(STORY_BEATS.champion),600);
  } else if(mode==="rival"){
    State.defeatedRivals++; if(rivalTile)MAP[rivalTile.y][rivalTile.x]=0;
    flash(`¡Venciste a NOVA! (${State.defeatedRivals})`);
  } else if(mode==="villain"){
    const key="villain_"+State.zone; State.flags[key]=true; villainTile=null;
    if(State.zone==="ciudad_brasa"){ flash("¡Derrotaste al COMANDANTE UMBRA! Verdalia a salvo."); }
    else { flash("¡El EQUIPO ECLIPSE huye! El camino queda libre."); }
  }
}
function onMineFaint(){ const n=firstAlive(); if(n)setTimeout(()=>{Battle.mine=n;Battle.mine.atkMod=0;Battle.mine.defMod=0;pushLog("¡Adelante,",`${Battle.mine.name}!`);Battle.busy=false;},700); else setTimeout(()=>{State.scene="over";Battle.active=false;},800); }
function runSeq(seq,i){ if(i>=seq.length){ if(Battle.enemy.hp>0&&Battle.mine.hp>0)Battle.busy=false; return; } seq[i](); if(Battle.enemy.hp<=0||Battle.mine.hp<=0)return; setTimeout(()=>runSeq(seq,i+1),650); }
function throwBall(){
  if(Battle.mode!=="wild"){pushLog("¡No puedes robar el","monstruo de otro!");return;}
  if(State.bag.esfera<=0){pushLog("No te quedan","esferas.");return;}
  State.bag.esfera--;Battle.busy=true;Battle.menu="main";pushLog("Lanzaste una","esfera...");
  const ok=Math.random()<catchChance(Battle.enemy);
  setTimeout(()=>{ if(ok){pushLog("¡Atrapaste a",`${Battle.enemy.name}!`);markDex(Battle.enemy.species,true); if(State.party.length<6)State.party.push(Battle.enemy); setTimeout(()=>endBattle(),800);}
    else{pushLog("¡Se soltó!");setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},400);} },700);
}
function useHeal(key){ if(State.bag[key]<=0){pushLog("No te quedan.","");return;} const it=ITEMS[key];
  if(Battle.mine.hp>=Battle.mine.maxHp){pushLog("Ya está al","máximo.");return;}
  State.bag[key]--;Battle.mine.hp=Math.min(Battle.mine.maxHp,Battle.mine.hp+it.amount);pushLog(`${Battle.mine.name} recuperó`,"PV.");
  Battle.busy=true;Battle.menu="main";setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500); }
function swapNext(){ const o=State.party.filter(m=>m!==Battle.mine&&m.hp>0); if(!o.length){pushLog("No hay otro","en pie.");return;}
  Battle.mine=o[0];Battle.mine.atkMod=0;Battle.mine.defMod=0;pushLog("¡Adelante,",`${Battle.mine.name}!`);Battle.busy=true;Battle.menu="main";
  setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500); }
function flee(){ if(Battle.mode!=="wild"){pushLog("¡No puedes huir de","este combate!");return;}
  if(Math.random()<0.7){pushLog("Escapaste.","");setTimeout(()=>endBattle(),500);} else{pushLog("¡No escapaste!","");Battle.busy=true;setTimeout(()=>{enemyTurn();if(Battle.mine.hp>0)Battle.busy=false;},500);} }
function endBattle(){ Battle.active=false; State.scene="world"; }
function pushLog(a,b=""){ Battle.log=[a,b]; }

// ============================================================
//  MENÚ
// ============================================================
const TABS=["EQUIPO","DEX","MOCHILA","MEDALLAS","GUARDAR"];
let tabRects=[];
function menuKey(k){ if(k==="Escape"||k==="m"){State.scene="world";return;}
  if(k==="ArrowLeft"||k==="a")State.menuSel=(State.menuSel+TABS.length-1)%TABS.length;
  if(k==="ArrowRight"||k==="d")State.menuSel=(State.menuSel+1)%TABS.length;
  if((k==="Enter"||k===" ")&&State.menuSel===4)saveGame();
  const n=parseInt(k,10); if(n>=1&&n<=TABS.length){State.menuSel=n-1; if(n===5)saveGame();} }
function menuClick(mx,my){ for(let i=0;i<tabRects.length;i++)if(hit(mx,my,tabRects[i])){State.menuSel=i;if(i===4)saveGame();return;} if(my>H-40)State.scene="world"; }

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
  if(State.scene==="world"&&!State.story)updateWorld();
  for(const k of ["mineHurt","enemyHurt","mineShake","enemyShake"])if(Battle[k]>0)Battle[k]-=0.1;
  if(State.flash>0)State.flash--;
  ctx.fillStyle="#0f380f";ctx.fillRect(0,0,W,H);
  if(State.scene==="title")drawTitle();
  else if(State.scene==="starter")drawStarter();
  else if(State.scene==="world")drawWorld();
  else if(State.scene==="battle")drawBattle();
  else if(State.scene==="menu")drawMenu();
  else if(State.scene==="over")drawOver();
  if(State.story)drawStoryBox();
  requestAnimationFrame(loop);
}
function screen(){ ctx.fillStyle=GB[0];ctx.fillRect(0,0,W,H); }
function text(s,x,y,tone=3,size=16){ ctx.fillStyle=GB[tone];ctx.font=`${size}px "Courier New", monospace`;ctx.textAlign="left";ctx.fillText(s,x,y); }
function textC(s,x,y,tone=3,size=16){ ctx.fillStyle=GB[tone];ctx.font=`bold ${size}px "Courier New", monospace`;ctx.textAlign="center";ctx.fillText(s,x,y);ctx.textAlign="left"; }

function drawStoryBox(){
  const bx=20,by=H-150,bw=W-40,bh=130;
  gbBox(ctx,bx,by,bw,bh,4);
  ctx.font='17px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.textAlign="left";
  const shown=State.story.slice(0,State.storyIdx+1).slice(-4);
  shown.forEach((l,i)=>ctx.fillText(l,bx+24,by+34+i*26));
  if(Math.floor(State.frame/20)%2===0) textC("▼ (ENTER)",W-80,by+bh-14,2,13);
}

function drawTitle(){
  screen();
  textC("MONSTRU",W/2,120,3,56);
  textC("Edición Esmeralda del Bosque",W/2,160,2,16);
  drawMonster(ctx,"emberin",W/2-120,320,110,{frame:State.frame});
  drawMonster(ctx,"gotita",W/2,320,110,{frame:State.frame+30});
  drawMonster(ctx,"broton",W/2+120,320,110,{frame:State.frame+60});
  if(Math.floor(State.frame/30)%2===0)textC(hasSave()?"PULSA PARA CONTINUAR":"PULSA PARA EMPEZAR",W/2,H-70,2,18);
  textC("Región de Verdalia · todo original",W/2,H-36,1,13);
}
function drawStarter(){
  screen();
  textC("EL PROF. CEDRO TE DA",W/2,70,3,22);
  textC("TU PRIMER MONSTRUO",W/2,98,3,22);
  textC("Elige con 1 / 2 / 3 o haz clic",W/2,128,2,15);
  starterRects=[];
  STARTERS.forEach((id,i)=>{ const x=W/2+(i-1)*230,y=320,cw=200,ch=260,rx=x-cw/2,ry=y-ch/2;
    gbBox(ctx,rx,ry,cw,ch,4); starterRects.push({x:rx,y:ry,w:cw,h:ch});
    drawMonster(ctx,id,x,y-30,120,{frame:State.frame+i*25}); const sp=SPECIES[id];
    textC(`${i+1}. ${sp.name}`,x,y+80,3,20); textC(`TIPO ${sp.type.toUpperCase()}`,x,y+104,2,14);
    ctx.font='12px "Courier New", monospace';ctx.fillStyle=GB[2]; wrap(sp.dex,x,y+124,cw-30,14,true); });
}
function drawWorld(){
  screen();
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const t=MAP[y][x],px=VIEW_OX+x*TILE,py=VIEW_OY+y*TILE;
    ctx.fillStyle=GB[1];ctx.fillRect(px,py,TILE,TILE);
    if(t===6){ctx.fillStyle=GB[0];ctx.fillRect(px,py,TILE,TILE);}
    if(t===1){ctx.fillStyle=GB[2];for(let i=0;i<4;i++)for(let j=0;j<4;j++)if((i+j)%2===0)ctx.fillRect(px+i*(TILE/4),py+j*(TILE/4),TILE/7,TILE/7);}
    if(t===3){ctx.fillStyle=GB[2];ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle=GB[1];for(let i=0;i<3;i++)ctx.fillRect(px+4+i*11,py+8+((i%2)*10),7,3);}
    if(t===2){ctx.fillStyle=GB[3];ctx.fillRect(px+3,py+3,TILE-6,TILE-6);ctx.fillStyle=GB[2];ctx.fillRect(px+7,py+7,TILE-14,TILE-14);}
    if(t===4){ctx.fillStyle=GB[3];ctx.fillRect(px+2,py+10,TILE-4,TILE-10);ctx.fillStyle=GB[2];ctx.fillRect(px+TILE/2-4,py+16,8,TILE-16);ctx.fillStyle=GB[3];ctx.beginPath();ctx.moveTo(px,py+12);ctx.lineTo(px+TILE/2,py+2);ctx.lineTo(px+TILE,py+12);ctx.closePath();ctx.fill();}
    if(t===7){ctx.fillStyle=GB[3];ctx.fillRect(px+2,py+2,TILE-4,TILE-4);ctx.fillStyle=GB[0];ctx.font='bold 18px monospace';ctx.textAlign="center";ctx.fillText("ARENA",px+TILE/2,py+TILE/2+6);ctx.textAlign="left";}
    if(t===8){ctx.fillStyle=GB[3];ctx.fillRect(px+6,py+6,TILE-12,TILE-14);ctx.fillStyle=GB[0];ctx.font='bold 16px monospace';ctx.textAlign="center";ctx.fillText("i",px+TILE/2,py+TILE/2+4);ctx.textAlign="left";}
    if(t===5)drawTrainer(px+TILE/2,py+TILE/2,"R");
  }
  if(villainTile){ drawTrainer(VIEW_OX+villainTile.x*TILE+TILE/2, VIEW_OY+villainTile.y*TILE+TILE/2, "E"); }
  drawPlayer();
  // HUD
  ctx.fillStyle=GB[3];ctx.fillRect(0,0,W,46);
  text("MONSTRU",14,30,0,20);
  const z=ZONES[State.zone]; const pname=PLACES[z.place]?PLACES[z.place].name:"";
  text(`${pname}   Medallas ${State.badges.length}/6   Esferas ${State.bag.esfera}`,210,30,0,15);
  ctx.fillStyle=GB[3];ctx.fillRect(0,H-30,W,30);
  text("Flechas: mover · ESPACIO: hablar/arena · ENTER: menú",14,H-10,0,14);
  if(State.flash>0&&!State.story){ gbBox(ctx,40,H/2-40,W-80,80,4);ctx.font='bold 18px "Courier New", monospace';ctx.fillStyle=GB[3];wrap(State.message,W/2,H/2-2,W-140,22,true); }
}
function drawPlayer(){
  const px=VIEW_OX+State.player.x*TILE+TILE/2,py=VIEW_OY+State.player.y*TILE+TILE/2;
  ctx.fillStyle=GB[3];ctx.fillRect(px-9,py-4,18,14);
  ctx.fillStyle=GB[2];ctx.fillRect(px-8,py-14,16,10);
  ctx.fillStyle=GB[3];ctx.fillRect(px-9,py-16,18,4);
  ctx.fillStyle=GB[0];ctx.fillRect(px-6,py-11,3,3);ctx.fillRect(px+3,py-11,3,3);
}
function drawTrainer(cx,cy,letter){
  ctx.fillStyle=GB[3];ctx.fillRect(cx-9,cy-4,18,14);
  ctx.fillStyle=GB[2];ctx.fillRect(cx-8,cy-14,16,10);
  ctx.fillStyle=GB[3];ctx.fillRect(cx-9,cy-18,18,5);
  const yb=Math.round(Math.sin(State.frame/10)*2);
  ctx.font='bold 18px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.textAlign="center";
  ctx.fillText(letter||"!",cx,cy-22+yb);ctx.textAlign="left";
}

// ---------- BATALLA ----------
function drawBattle(){
  ctx.fillStyle=GB[1];ctx.fillRect(0,0,W,H);
  ctx.fillStyle=GB[0];ctx.fillRect(0,H*0.5,W,H*0.5);
  plat(W*0.72,H*0.42,150);plat(W*0.28,H*0.66,180);
  const ex=W*0.72+(Battle.enemyShake>0?(Math.random()-0.5)*8:0);
  drawMonster(ctx,Battle.enemy.species,ex,H*0.34,120,{flip:true,frame:State.frame,hurt:Math.max(0,Battle.enemyHurt)});
  statBox(40,70,Battle.enemy,false);
  const mx=W*0.28+(Battle.mineShake>0?(Math.random()-0.5)*8:0);
  drawMonster(ctx,Battle.mine.species,mx,H*0.56,150,{flip:false,frame:State.frame+15,hurt:Math.max(0,Battle.mineHurt)});
  statBox(W-360,H*0.46,Battle.mine,true);
  const by=H-150; gbBox(ctx,12,by,W-24,138,4);
  ctx.font='17px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.textAlign="left";
  Battle.log.forEach((l,i)=>ctx.fillText(l,34,by+36+i*26));
  mainRects=[];fightRects=[];bagRects=[];
  if(!Battle.busy&&!State.story){
    if(Battle.menu==="main"){ const opts=["LUCHAR","MOCHILA","CAMBIAR","HUIR"];
      opts.forEach((o,i)=>{const bx=W/2+(i%2)*((W/2-24)/2)+6;const yy=by+28+Math.floor(i/2)*52;const bw=(W/2-36)/2;const bh=44;btn(bx,yy,bw,bh,`${i+1} ${o}`);mainRects.push({x:bx,y:yy,w:bw,h:bh});}); }
    else if(Battle.menu==="fight"){ Battle.mine.moves.forEach((m,i)=>{const mv=MOVES[m.key];const bx=28+(i%2)*((W-56)/2);const yy=by+28+Math.floor(i/2)*52;const bw=(W-72)/2;const bh=44;moveBtn(bx,yy,bw,bh,mv,m,i+1);fightRects.push({x:bx,y:yy,w:bw,h:bh});}); textC("(Esc = volver)",W-90,by+128,2,12); }
    else if(Battle.menu==="bag"){ const opts=[["ESFERA",State.bag.esfera],["POCIÓN",State.bag.pocion],["SUPERPOCIÓN",State.bag.superpocion]];
      opts.forEach((o,i)=>{const bx=28+(i%3)*((W-56)/3);const yy=by+40;const bw=(W-72)/3;const bh=50;btn(bx,yy,bw,bh,`${i+1} ${o[0]} x${o[1]}`,13);bagRects.push({x:bx,y:yy,w:bw,h:bh});}); textC("(Esc = volver)",W-90,by+128,2,12); }
  }
}
function plat(cx,cy,r){ ctx.fillStyle=GB[2];for(let i=0;i<5;i++){const w=r-i*(r/6);ctx.fillRect(cx-w,cy+i*5-2,w*2,5);} }
function statBox(x,y,mon,mine){
  const w=320,h=mine?86:70; gbBox(ctx,x,y,w,h,4);
  ctx.font='bold 18px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.textAlign="left";ctx.fillText(mon.name.toUpperCase(),x+16,y+26);
  ctx.font='15px "Courier New", monospace';ctx.fillText(`Nv${mon.level}`,x+w-54,y+26);
  const bx=x+16,bby=y+40,bw=w-32,bh=12; ctx.fillStyle=GB[3];ctx.fillRect(bx-2,bby-2,bw+4,bh+4);ctx.fillStyle=GB[0];ctx.fillRect(bx,bby,bw,bh);
  const ratio=Math.max(0,mon.hp/mon.maxHp);ctx.fillStyle=GB[2];ctx.fillRect(bx,bby,bw*ratio,bh);
  if(mine){ctx.font='14px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.fillText(`PV ${Math.max(0,Math.round(mon.hp))}/${mon.maxHp}`,bx,bby+30);
    const need=18+mon.level*mon.level*4;const er=Math.min(1,mon.xp/need);ctx.fillStyle=GB[3];ctx.fillRect(bx,bby+40,bw,5);ctx.fillStyle=GB[1];ctx.fillRect(bx,bby+40,bw*er,5);}
}
function btn(x,y,w,h,label,size=16){ gbBox(ctx,x,y,w,h,3);ctx.font=`bold ${size}px "Courier New", monospace`;ctx.fillStyle=GB[3];ctx.textAlign="center";ctx.fillText(label,x+w/2,y+h/2+5);ctx.textAlign="left"; }
function moveBtn(x,y,w,h,mv,m,n){ gbBox(ctx,x,y,w,h,3);ctx.fillStyle=GB[3];ctx.textAlign="left";ctx.font='bold 16px "Courier New", monospace';ctx.fillText(`${n} ${mv.name}`,x+12,y+20);ctx.font='12px "Courier New", monospace';ctx.fillText(`${mv.type}  PP ${m.pp}/${m.ppMax}  ${mv.power?"Pot "+mv.power:"estado"}`,x+12,y+36); }

// ---------- MENÚ ----------
function drawMenu(){
  screen(); tabRects=[]; const tw=W/TABS.length;
  TABS.forEach((t,i)=>{const x=i*tw,sel=i===State.menuSel;ctx.fillStyle=sel?GB[3]:GB[1];ctx.fillRect(x,0,tw,44);
    ctx.font='bold 16px "Courier New", monospace';ctx.fillStyle=sel?GB[0]:GB[3];ctx.textAlign="center";ctx.fillText(t,x+tw/2,30);ctx.textAlign="left";tabRects.push({x,y:0,w:tw,h:44});});
  gbBox(ctx,12,54,W-24,H-100,4);
  if(State.menuSel===0)drawTeam(); else if(State.menuSel===1)drawDex(); else if(State.menuSel===2)drawBag(); else if(State.menuSel===3)drawBadges(); else drawSaveTab();
  ctx.fillStyle=GB[3];ctx.fillRect(0,H-40,W,40);text("←/→ pestaña · ENTER en GUARDAR · ESC salir",14,H-14,0,14);
}
function drawTeam(){ textC("TU EQUIPO",W/2,88,3,22);
  State.party.forEach((m,i)=>{const y=116+i*72,x=60;drawMonster(ctx,m.species,x+30,y+18,58,{frame:State.frame+i*20});
    ctx.textAlign="left";ctx.font='bold 18px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.fillText(`${m.name}  Nv${m.level}`,x+90,y+8);
    const bw=300,bx=x+90,by=y+20;ctx.fillStyle=GB[3];ctx.fillRect(bx-2,by-2,bw+4,14);ctx.fillStyle=GB[0];ctx.fillRect(bx,by,bw,10);ctx.fillStyle=GB[2];ctx.fillRect(bx,by,bw*Math.max(0,m.hp/m.maxHp),10);
    ctx.font='13px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.fillText(`PV ${Math.max(0,Math.round(m.hp))}/${m.maxHp}  tipo ${m.type}`,bx,by+26);});
}
function drawDex(){ textC("POKÉDEX",W/2,86,3,22);
  const ids=Object.keys(SPECIES);const seen=ids.filter(id=>State.dex[id]&&State.dex[id].seen).length;const caught=ids.filter(id=>State.dex[id]&&State.dex[id].caught).length;
  textC(`Vistos ${seen}   Atrapados ${caught}   Total ${ids.length}`,W/2,112,2,15);
  ids.forEach((id,i)=>{const col=i%3,row=Math.floor(i/3);const x=70+col*((W-140)/3),y=142+row*64;const d=State.dex[id];
    if(d&&d.seen)drawMonster(ctx,id,x+26,y+16,48,{frame:State.frame}); else{ctx.fillStyle=GB[2];ctx.fillRect(x+8,y-4,38,38);ctx.fillStyle=GB[0];ctx.font='bold 22px monospace';ctx.textAlign="center";ctx.fillText("?",x+27,y+22);ctx.textAlign="left";}
    ctx.font='13px "Courier New", monospace';ctx.textAlign="left";ctx.fillStyle=GB[3];ctx.fillText(d&&d.seen?SPECIES[id].name:"- - -",x+56,y+12);
    if(d&&d.caught){ctx.fillText("● capturado",x+56,y+28);}});
}
function drawBag(){ textC("MOCHILA",W/2,88,3,22);
  Object.entries(State.bag).forEach(([k,n],i)=>{const it=ITEMS[k];const y=136+i*58;ctx.textAlign="left";ctx.font='bold 20px "Courier New", monospace';ctx.fillStyle=GB[3];ctx.fillText(`${it.name}  x${n}`,70,y);ctx.font='14px "Courier New", monospace';ctx.fillStyle=GB[2];ctx.fillText(it.desc,70,y+22);});
}
function drawBadges(){ textC("MEDALLAS",W/2,88,3,22);
  const all=GYM_LEADERS.map(g=>g.badge);
  all.forEach((b,i)=>{const col=i%3,row=Math.floor(i/3);const x=90+col*((W-160)/3),y=150+row*120;const got=State.badges.includes(b);
    ctx.fillStyle=got?GB[3]:GB[1];ctx.beginPath();ctx.arc(x,y,34,0,Math.PI*2);ctx.fill();ctx.strokeStyle=GB[3];ctx.lineWidth=3;ctx.stroke();
    if(got){ctx.fillStyle=GB[0];ctx.font='bold 26px monospace';ctx.textAlign="center";ctx.fillText("★",x,y+9);}
    ctx.fillStyle=GB[3];ctx.font='13px "Courier New", monospace';ctx.textAlign="center";wrap(b,x,y+56,130,15,true);ctx.textAlign="left";});
  textC(`${State.badges.length} de 6 conseguidas`,W/2,H-80,2,16);
}
function drawSaveTab(){ textC("GUARDAR PARTIDA",W/2,150,3,24);textC("Pulsa ENTER o clic en esta pestaña",W/2,200,2,16);textC("Se guarda en este navegador.",W/2,230,2,16);
  if(State.flash>0){gbBox(ctx,W/2-200,280,400,70,4);textC(State.message,W/2,322,3,20);} }
function drawOver(){ screen();textC("TODOS TUS MONSTRUOS",W/2,H/2-40,3,28);textC("SE DEBILITARON",W/2,H/2-6,3,28);textC("Pulsa ENTER para reintentar",W/2,H/2+50,2,16); }

function wrap(s,x,y,maxW,lh,centered){ const words=String(s).split(" ");let line="",yy=y;ctx.textAlign=centered?"center":"left";
  for(const w of words){const t=line+w+" ";if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line.trim(),x,yy);line=w+" ";yy+=lh;}else line=t;}ctx.fillText(line.trim(),x,yy);ctx.textAlign="left"; }

loop();
