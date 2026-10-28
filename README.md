# MONSTRU — Edición Esmeralda del Bosque

Un juego de monstruos por turnos con **estética Game Boy** (pixel art, paleta verde-gris de 4 tonos). Corre en el navegador. Todo el contenido —criaturas, nombres, tipos, movimientos, objetos, historia, personajes— es **original e inventado**. No contiene material de Nintendo ni de Pokémon.

## Cómo jugar

Haz **doble clic en `JUGAR.bat`**. Se abre solo en tu navegador. Deja la ventana negra abierta mientras juegas.

(Usa Node, que ya tienes. No hay que instalar nada más.)

## Qué tiene (Paso 1 — la base)

- **Estética Game Boy**: pantalla verde-gris, pixel art de verdad, cajas y barras clásicas.
- **Pueblo inicial** visto desde arriba, con casas, caminos, agua, árboles y hierba alta.
- **Elegir monstruo inicial** (fuego / agua / planta) de manos del Prof. Cedro.
- **Combate por turnos** clásico: cajas de texto, barras de vida y experiencia, ventajas de tipo.
- **Menú principal** con 4 pestañas:
  - **Equipo**: tus monstruos, nivel y vida.
  - **Pokédex**: vistos y atrapados.
  - **Mochila**: objetos (Esfera, Poción, Superpoción, Revivir).
  - **Guardar**: guarda la partida en este navegador.
- **Captura** de monstruos salvajes con la Esfera.
- **Rival NOVA** al que te enfrentas (equipos cada vez más fuertes).
- **15 criaturas** en 6 tipos, con líneas evolutivas.

## Controles

| Tecla | Acción |
|---|---|
| Flechas / W A S D | moverte por el mapa |
| (pisar hierba alta) | encontrar monstruos salvajes |
| ENTER | abrir el menú principal |
| 1-4 | elegir opción / movimiento en combate |
| Esc | volver atrás |
| Clic | funciona en todos los menús |

## Plan por fases (vamos creciendo)

1. **Base jugable** (hecho): estilo Game Boy, pueblo, combate, menú, guardar. ← estás aquí
2. **Mundo**: más ciudades y rutas, hasta 6 arenas (gimnasios) con sus líderes.
3. **Contenido**: subir a 100 criaturas, legendarios, más objetos y habilidades.
4. **Historia**: trama completa y rival.

## Criaturas actuales

- **Fuego**: Emberín → Flamuro → Pyroleo
- **Agua**: Gotita → Maruala → Tsunareo
- **Planta**: Brotón → Hojarco → Selvarex
- **Eléctrico**: Chispín → Voltaix
- **Roca**: Rocoto → Peñascor
- **Normal**: Nubelú → Lumbeast

## Archivos

- `index.html` — la pantalla del juego (marco Game Boy)
- `game.js` — mundo, combate, menús, guardado
- `engine.js` — reglas (niveles, evolución, daño, captura)
- `data.js` — criaturas, tipos y movimientos
- `sprites.js` — pixel art de cada criatura
- `gb.js` — paleta y dibujo por rejilla de píxeles
- `render.js` — pinta los sprites
- `server.js` + `JUGAR.bat` — lanzador local
