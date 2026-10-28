// ============================================================
//  render.js — dibuja los monstruos como PIXEL ART (estilo GB).
//  Toma la rejilla de texto de sprites.js y la pinta en pixeles
//  gordos. La animación (flotar / parpadeo de daño) la pone el juego.
// ============================================================
import { spriteFor } from "./sprites.js";
import { GB } from "./gb.js";

// Dibuja un monstruo centrado en (cx,cy). "size" = alto deseado en px.
export function drawMonster(ctx, speciesId, cx, cy, size, { flip = false, frame = 0, hurt = 0 } = {}) {
  const rows = spriteFor(speciesId);
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const scale = Math.max(1, Math.floor(size / h));
  const bob = Math.round(Math.sin(frame / 20) * scale * 0.6); // flotar en pasos de pixel
  const ox = Math.round(cx - (w * scale) / 2);
  const oy = Math.round(cy - (h * scale) / 2) + bob;

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x] || " ";
      if (ch === " " || ch === ".") continue;
      let tone = parseInt(ch, 10);
      // parpadeo de daño: todo a tinta de forma intermitente
      if (hurt > 0 && Math.floor(frame / 3) % 2 === 0) tone = 3;
      const gx = flip ? (w - 1 - x) : x;
      ctx.fillStyle = GB[tone];
      ctx.fillRect(ox + gx * scale, oy + y * scale, scale, scale);
    }
  }
}
