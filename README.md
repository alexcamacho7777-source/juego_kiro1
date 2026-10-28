# MONSTRU

Un juego de monstruos por turnos que corre en el navegador. Todo el contenido (monstruos, tipos, movimientos, historia, personajes) es **inventado y original**.

## Cómo jugar

Haz **doble clic en `JUGAR.bat`**. Se abre solo en tu navegador. Deja la ventana negra abierta mientras juegas.

(Usa Node, que ya tienes instalado. No hay que instalar nada más.)

## Qué hay dentro

- **12 monstruos** repartidos en **6 tipos**: fuego, agua, planta, eléctrico, roca y normal.
- **Líneas evolutivas** reales: tus monstruos evolucionan al subir de nivel (hasta 3 fases).
- **Combate por turnos** con ventajas de tipo (súper eficaz / poco eficaz), movimientos con PP y daño realista.
- **Captura** de monstruos salvajes (más fácil con poca vida).
- **Un rival, Nova**, al que te enfrentas **3 veces** con equipos cada vez más fuertes. Vencerlo 3 veces te hace Campeón.
- **Sprites 2D animados**: flotan, tiemblan y parpadean en rojo al recibir daño.

## Controles

| Tecla | Acción |
|---|---|
| Flechas / W A S D | moverte por el mapa |
| (pisar la hierba) | encontrar monstruos salvajes |
| 1-4 | elegir opción / movimiento en combate |
| Clic | también funciona en todos los menús |
| Esc | volver atrás en el menú de combate |

## Monstruos por tipo

- **Fuego**: Emberín → Flamuro → Pyroleo
- **Agua**: Gotita → Maruala → Tsunareo
- **Planta**: Brotón → Hojarco → Selvarex
- **Eléctrico**: Chispín → Voltaix
- **Roca**: Rocoto → Peñascor
- **Normal**: Nubelú → Lumbeast

## Archivos

- `index.html` — la página del juego
- `game.js` — mundo, combate e historia
- `engine.js` — reglas (niveles, evolución, daño, captura)
- `data.js` — monstruos, tipos y movimientos
- `render.js` — dibujo de los sprites
- `server.js` + `JUGAR.bat` — lanzador local
