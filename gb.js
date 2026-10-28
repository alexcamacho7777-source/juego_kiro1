// ============================================================
//  gb.js — estética Game Boy: paleta de 4 tonos y dibujo por
//  rejilla de pixeles. Todo se pinta en "pixeles gordos".
// ============================================================

// Paleta clásica verde-gris de Game Boy (4 tonos).
export const GB = {
  0: "#9bbc0f", // más claro (fondo)
  1: "#8bac0f", // claro
  2: "#306230", // oscuro
  3: "#0f380f", // más oscuro (tinta)
};
// alias cómodos
export const C_LIGHT = 0, C_MID = 1, C_DARK = 2, C_INK = 3;

// Tamaño del "pixel gordo" en pantalla.
export let PX = 4;
export function setPX(n) { PX = n; }

// Pinta un pixel lógico (gx,gy) de la rejilla en el canvas con origen ox,oy.
export function px(ctx, ox, oy, gx, gy, tone, scale = PX) {
  ctx.fillStyle = typeof tone === "string" ? tone : GB[tone];
  ctx.fillRect(ox + gx * scale, oy + gy * scale, scale, scale);
}

// Dibuja un "sprite" definido como filas de texto.
// Cada carácter es un tono: ' ' = transparente, '0' '1' '2' '3' = tonos GB.
// Devuelve el ancho/alto en pixeles lógicos.
export function drawPixels(ctx, rows, ox, oy, scale = PX, { flip = false } = {}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x] || " ";
      if (ch === " " || ch === ".") continue;
      const gx = flip ? (w - 1 - x) : x;
      px(ctx, ox, oy, gx, y, parseInt(ch, 10), scale);
    }
  }
  return { w, h };
}

// Caja de texto estilo GB: marco doble con esquinas.
export function gbBox(ctx, x, y, w, h, scale = PX) {
  // fondo claro
  ctx.fillStyle = GB[0];
  ctx.fillRect(x, y, w, h);
  // marco de tinta de 2 px lógicos
  ctx.fillStyle = GB[3];
  const b = scale; // grosor
  ctx.fillRect(x, y, w, b);
  ctx.fillRect(x, y + h - b, w, b);
  ctx.fillRect(x, y, b, h);
  ctx.fillRect(x + w - b, y, b, h);
  // segundo marco interior
  const g = scale * 2;
  ctx.strokeStyle = GB[3];
  ctx.lineWidth = Math.max(1, scale / 2);
  ctx.strokeRect(x + g, y + g, w - g * 2, h - g * 2);
}
