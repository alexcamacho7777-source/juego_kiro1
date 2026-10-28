// ============================================================
//  render.js — dibuja los monstruos como sprites 2D con color.
//  Cada "shape" es una silueta distinta. La animación (flotar,
//  temblar al recibir daño) la aplica el juego cambiando offsets.
// ============================================================
import { SPECIES, TYPE_COLORS } from "./data.js";

// Dibuja un monstruo en un canvas.
// ctx: contexto 2D ; cx,cy: centro ; size: tamaño ; flip: mira a la izq.
// frame: número para animar (flotar). hurt: 0..1 parpadeo rojo.
export function drawMonster(ctx, speciesId, cx, cy, size, { flip = false, frame = 0, hurt = 0 } = {}) {
  const sp = SPECIES[speciesId];
  if (!sp) return;
  const s = sp.sprite;
  const bob = Math.sin(frame / 18) * size * 0.04; // flotar suave
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (flip) ctx.scale(-1, 1);

  // sombra en el suelo
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.52 - bob, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const body = s.body, belly = s.belly, accent = s.accent, eye = s.eye;

  const paint = (fn) => { fn(); };

  if (s.shape === "blob") {
    // cuerpo redondo
    roundBody(ctx, size, body, belly, accent);
  } else if (s.shape === "fox") {
    drawFox(ctx, size, body, belly, accent);
  } else if (s.shape === "beast") {
    drawBeast(ctx, size, body, belly, accent);
  } else if (s.shape === "lion") {
    drawLion(ctx, size, body, belly, accent);
  } else {
    roundBody(ctx, size, body, belly, accent);
  }

  drawFace(ctx, size, s.shape, eye);

  // destello de tipo
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = TYPE_COLORS[sp.type] || "#fff";
  ctx.beginPath();
  ctx.arc(size * 0.34, -size * 0.34, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // parpadeo rojo al recibir daño
  if (hurt > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45 * hurt;
    ctx.fillStyle = "#ff2b2b";
    blobPath(ctx, size);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function blobPath(ctx, size) {
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.44, size * 0.42, 0, 0, Math.PI * 2);
}

function shade(ctx, size, color) {
  const g = ctx.createRadialGradient(-size * 0.2, -size * 0.2, size * 0.1, 0, 0, size * 0.5);
  g.addColorStop(0, lighten(color, 28));
  g.addColorStop(1, color);
  return g;
}

function roundBody(ctx, size, body, belly, accent) {
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.44, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.12, size * 0.26, size * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // piececitos
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(-size * 0.18, size * 0.44, size * 0.1, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(size * 0.18, size * 0.44, size * 0.1, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
}

function drawFox(ctx, size, body, belly, accent) {
  // orejas
  ctx.fillStyle = accent;
  tri(ctx, -size * 0.28, -size * 0.34, size * 0.14, size * 0.26);
  tri(ctx, size * 0.28, -size * 0.34, size * 0.14, size * 0.26);
  // cuerpo
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(0, size * 0.02, size * 0.4, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // panza
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.16, size * 0.22, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // cola
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(size * 0.42, size * 0.18, size * 0.14, size * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // patas
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-size * 0.16, size * 0.44, size * 0.09, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(size * 0.16, size * 0.44, size * 0.09, size * 0.06, 0, 0, Math.PI * 2); ctx.fill();
}

function drawBeast(ctx, size, body, belly, accent) {
  // cuerpo alargado
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(-size * 0.05, size * 0.05, size * 0.46, size * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // cabeza
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(size * 0.26, -size * 0.14, size * 0.24, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // crin/acento
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(size * 0.12, -size * 0.18, size * 0.2, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // panza
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, size * 0.16, size * 0.24, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // patas
  ctx.fillStyle = accent;
  for (const dx of [-0.26, -0.02, 0.22]) {
    ctx.beginPath(); ctx.ellipse(size * dx, size * 0.4, size * 0.07, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLion(ctx, size, body, belly, accent) {
  // melena
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(size * 0.2, -size * 0.1, size * 0.34, size * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  // cuerpo
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, size * 0.1, size * 0.44, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // cabeza
  ctx.fillStyle = shade(ctx, size, body);
  ctx.beginPath();
  ctx.ellipse(size * 0.24, -size * 0.1, size * 0.22, size * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  // panza
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-size * 0.12, size * 0.2, size * 0.24, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // patas
  ctx.fillStyle = accent;
  for (const dx of [-0.3, -0.05, 0.2]) {
    ctx.beginPath(); ctx.ellipse(size * dx, size * 0.42, size * 0.08, size * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawFace(ctx, size, shape, eye) {
  const hx = shape === "beast" || shape === "lion" ? size * 0.26 : 0;
  const hy = shape === "beast" || shape === "lion" ? -size * 0.12 : -size * 0.06;
  // ojos
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(hx - size * 0.1, hy, size * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + size * 0.08, hy, size * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = eye;
  ctx.beginPath(); ctx.arc(hx - size * 0.09, hy + size * 0.01, size * 0.032, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + size * 0.09, hy + size * 0.01, size * 0.032, 0, Math.PI * 2); ctx.fill();
  // brillo
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(hx - size * 0.1, hy - size * 0.02, size * 0.014, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + size * 0.08, hy - size * 0.02, size * 0.014, 0, Math.PI * 2); ctx.fill();
  // boquita
  ctx.strokeStyle = eye; ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.beginPath();
  ctx.arc(hx, hy + size * 0.12, size * 0.06, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function tri(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - w, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}

function lighten(hex, amt) {
  const c = hex.replace("#", "");
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
  return `rgb(${r},${g},${b})`;
}
