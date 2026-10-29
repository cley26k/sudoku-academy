# Sudoku Academy

Entrenador de Sudoku que enseña a razonar: lecciones animadas en seis fases, práctica ilimitada por técnica
y un motor lógico determinista que verifica cada deducción.

## Estructura
- `src/engine/` — motor independiente de la interfaz (TypeScript estricto, sin dependencias).
  - `grid.ts` geometría, candidatos (máscaras de bits), contradicciones.
  - `bruteforce.ts` solo para unicidad/solución; nunca justifica deducciones.
  - `techniques/` una función por técnica: devuelve todas las instancias con eliminaciones, patrón,
    4 niveles de pista, fotogramas de demostración, escenarios «¿y si…?» y `whyNot()` para explicar errores.
  - `solver.ts` solver humano: siempre aplica la técnica más sencilla que progresa.
  - `transform.ts` isomorfismos (dígitos, filas/columnas, bandas/pilas, trasposición).
  - `exercise.ts` instanciación verificada y evaluación (reconocimiento, colocación, eliminaciones).
- `src/content/catalog.ts` fichas pedagógicas, unidades y prerrequisitos (técnicas pendientes marcadas como tales).
- `src/data/bank.json` banco minado offline (`scripts/mine.ts`): posiciones donde la técnica objetivo es el
  paso lógico más sencillo disponible.
- `src/app/` interfaz React (tablero SVG, tutor, lecciones, entrenamiento, sudoku, progreso, revisión).

## Garantías
- Cada ejercicio se transforma y se vuelve a verificar al mostrarse: la técnica debe aplicarse, ninguna
  eliminación puede quitar el valor de la solución y se comprueba si es el paso más sencillo.
- Modo restringido: un sudoku es válido si el solver humano lo resuelve usando solo las técnicas elegidas más
  los singles (colocar números siempre está permitido) y usa al menos una técnica elegida. Si no, se descarta.
- El rectángulo único supone solución única; todos los sudokus del banco y generados la tienen verificada.

## Comandos
- Pruebas: `npx tsx --test tests/*.test.ts`
- Minado: `npx tsx scripts/mine.ts`
- Compilación (un único HTML): `node scripts/build.mjs`

## Técnicas
26 técnicas con lección y práctica: singles, intersecciones, pares/tríos/cuartetos desnudos y ocultos,
X-Wing, Swordfish, Jellyfish, peces con aleta, Y-Wing, XYZ-Wing, W-Wing, rectángulos únicos (tipos 1, 2 y 4),
BUG+1, coloreado simple y múltiple, X-Chain, XY-Chain, 3D Medusa y AIC.
Las de unicidad (rectángulos únicos y BUG+1) suponen solución única, verificada en todos los sudokus.
Cuartetos, Jellyfish y coloreado múltiple son poco frecuentes como paso más sencillo: su banco incluye
posiciones donde la técnica aplica de forma no degenerada (`ns: 1`) aunque exista otro camino.
