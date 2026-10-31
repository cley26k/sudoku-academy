// Catálogo pedagógico: fichas de técnicas, unidades y prerrequisitos.
import type { TechId } from '../engine/step';

export type SheetStatus = 'ready' | 'concept' | 'pending';
export interface Question { q: string; options: string[]; answer: number; why: string }
export interface Sheet {
  id: string; impl?: TechId; status: SheetStatus;
  name: string; aliases: string[]; abbr: string;
  level: 'Fundamentos' | 'Intermedio' | 'Avanzado'; family: string; unit: number; difficulty: 1 | 2 | 3 | 4 | 5;
  prereqs: string[]; related: string[];
  intuition: string; principle: string; conditions: string[];
  errors: { text: string; why: string }[];
  mastery: string; questions: Question[];
  intro?: string; findPrompt?: string; variants?: Record<string, string>;
  analogy?: string; terms?: string[];
}
export interface Unit { n: number; title: string; blurb: string; color: string }

export const UNITS_MAP: Unit[] = [
  { n: 1, title: 'Fundamentos', blurb: 'Reglas, candidatos y colocar números', color: 'green' },
  { n: 2, title: 'Intersecciones', blurb: 'Una caja y una línea se limitan', color: 'purple' },
  { n: 3, title: 'Subconjuntos', blurb: 'Casillas que se reparten números', color: 'blue' },
  { n: 4, title: 'Peces', blurb: 'Un número atrapado en varias líneas', color: 'orange' },
  { n: 5, title: 'Alas', blurb: 'Casillas que se obligan entre sí', color: 'pink' },
  { n: 6, title: 'Unicidad', blurb: 'Usar que la solución es única', color: 'teal' },
  { n: 7, title: 'Cadenas', blurb: 'Seguir consecuencias en cadena', color: 'red' },
];

const MASTERY = 'Dominio = precisión reciente sin pistas, variedad de configuraciones resueltas y constancia en días distintos, más superar la prueba final de la lección.';

export const SHEETS: Sheet[] = [
  {
    id: 'rules', status: 'concept', name: 'Reglas del Sudoku', aliases: ['Reglas'], abbr: 'R', level: 'Fundamentos', family: 'Fundamentos', unit: 1, difficulty: 1,
    prereqs: [], related: ['candidates', 'naked_single'],
    intuition: 'Cada fila, cada columna y cada caja de 3×3 contiene los números del 1 al 9 exactamente una vez.',
    principle: 'Si un número ya aparece en una unidad (fila, columna o caja), no puede repetirse en ninguna otra casilla de esa unidad. Todas las técnicas se derivan de esta única regla.',
    conditions: ['La cuadrícula tiene 81 casillas, 9 filas, 9 columnas y 9 cajas.', 'Un sudoku bien construido tiene una única solución.', 'Dos casillas se «ven» si comparten fila, columna o caja.'],
    errors: [{ text: 'Mirar solo la fila y la columna', why: 'La caja es una unidad tan importante como las líneas.' }],
    mastery: 'Completar la lección sin repetir números.', questions: [
      { q: '¿Cuántas casillas «ve» cada casilla?', options: ['8', '20', '24'], answer: 1, why: '8 de su fila, 8 de su columna y 4 más de su caja que no están en ninguna de las dos.' },
    ],
  },
  {
    id: 'candidates', status: 'concept', name: 'Candidatos y anotaciones', aliases: ['Pencil marks', 'Notas'], abbr: 'C', level: 'Fundamentos', family: 'Fundamentos', unit: 1, difficulty: 1,
    prereqs: ['rules'], related: ['naked_single', 'hidden_single'],
    intuition: 'Los candidatos de una casilla son los números que todavía podrían ir en ella.',
    principle: 'Un número es candidato de una casilla si no aparece en ninguna casilla que ella ve y ninguna deducción lo ha descartado. Las técnicas avanzadas trabajan eliminando candidatos.',
    conditions: ['Se calculan revisando fila, columna y caja.', 'Al colocar un número, desaparece como candidato de las 20 casillas que lo ven.'],
    errors: [{ text: 'Olvidar actualizar candidatos tras colocar un número', why: 'Un candidato obsoleto hace que los patrones parezcan existir cuando no existen.' }],
    mastery: 'Calcular correctamente los candidatos de varias casillas.', questions: [],
  },
  {
    id: 'naked_single', impl: 'naked_single', status: 'ready', name: 'Candidato único', aliases: ['Naked Single', 'Single desnudo'], abbr: 'CU', level: 'Fundamentos', family: 'Singles', unit: 1, difficulty: 1,
    prereqs: ['candidates'], related: ['hidden_single', 'naked_pair'],
    intuition: 'Tachas lo que ya está en su fila, su columna y su caja. Si solo sobrevive un número, va ahí.',
    principle: 'Si los otros ocho dígitos ya aparecen entre la fila, la columna y la caja de una casilla (o se descartaron antes), el dígito restante es obligatorio.',
    conditions: ['La casilla está vacía.', 'Tiene exactamente un candidato.'],
    errors: [
      { text: 'Contar dos veces un número que aparece en la fila y en la caja', why: 'Lo que importa es cuántos dígitos distintos quedan descartados.' },
      { text: 'Colocar un número «porque encaja»', why: 'Que un número no choque no lo hace obligatorio: deben quedar descartados los otros ocho.' },
    ],
    mastery: MASTERY,
    intro: 'Empecemos por lo más directo: casillas que no tienen elección.',
    findPrompt: 'Encuentra una casilla con una sola posibilidad.',
    variants: { cell: 'Casilla' },
    questions: [
      { q: '¿Qué hace falta para que una casilla sea un candidato único?', options: ['Que el número no aparezca en su fila', 'Que los otros ocho números queden descartados', 'Que sea la última casilla vacía de su caja'], answer: 1, why: 'Solo cuando los otros ocho están descartados el número restante es inevitable.' },
      { q: 'Una casilla ve los números 1, 2, 3, 5, 6, 7 y 9. ¿Es un candidato único?', options: ['Sí, es el 4', 'No: aún admite 4 y 8', 'Sí, es el 8'], answer: 1, why: 'Solo hay siete números descartados; quedan dos candidatos.' },
    ],
  },
  {
    id: 'hidden_single', impl: 'hidden_single', status: 'ready', name: 'Lugar único', aliases: ['Hidden Single', 'Single oculto', 'Escaneo'], abbr: 'LU', level: 'Fundamentos', family: 'Singles', unit: 1, difficulty: 1,
    prereqs: ['candidates'], related: ['naked_single', 'hidden_pair', 'pointing'],
    intuition: 'Elige un número y una zona (fila, columna o caja). Si ese número solo cabe en una casilla, va ahí.',
    principle: 'Cada unidad debe contener cada número. Si todas las casillas de la unidad menos una están bloqueadas para un número, ese número va en la que queda, aunque la casilla tenga otros candidatos.',
    conditions: ['El número no está colocado todavía en la unidad.', 'Solo una casilla vacía de la unidad lo admite como candidato.'],
    errors: [
      { text: 'Confundirlo con un candidato único', why: 'La casilla puede tener varios candidatos; lo único que importa es que el número no tiene otro sitio en esa unidad.' },
      { text: 'Olvidar casillas bloqueadas por la caja', why: 'Una línea que pasa por una caja puede quedar cubierta por un número de otra línea.' },
    ],
    mastery: MASTERY,
    intro: 'Ahora cambiamos la pregunta: en vez de «¿qué va en esta casilla?», preguntamos «¿dónde va este número?».',
    findPrompt: 'Encuentra un número que solo tenga un sitio en alguna unidad.',
    variants: { box: 'En una caja', row: 'En una fila', col: 'En una columna' },
    questions: [
      { q: 'En una caja, el 7 solo puede ir en una casilla que también admite 2 y 5. ¿Qué número va allí?', options: ['No se puede saber', 'El 7', 'El 2 o el 5'], answer: 1, why: 'La caja necesita un 7 y no tiene otro sitio. Los demás candidatos de la casilla no importan.' },
      { q: '¿Qué unidades pueden producir un lugar único?', options: ['Solo las cajas', 'Filas, columnas y cajas', 'Solo filas y columnas'], answer: 1, why: 'Cualquier unidad debe contener todos los números.' },
    ],
  },
  {
    id: 'pointing', impl: 'pointing', status: 'ready', name: 'Bloqueo caja-línea', aliases: ['Pointing', 'Candidatos bloqueados tipo 1'], abbr: 'CL', level: 'Fundamentos', family: 'Intersecciones', unit: 2, difficulty: 2,
    prereqs: ['hidden_single'], related: ['claiming', 'x_wing'],
    intuition: 'Si dentro de una caja un número solo puede estar en una fila (o columna), esa fila recibe su número dentro de la caja.',
    principle: 'La caja necesita el número. Todas sus posiciones están en la misma línea, así que el número de esa línea quedará dentro de la caja. Ninguna otra casilla de la línea, fuera de la caja, puede tenerlo.',
    conditions: ['Dentro de una caja, todas las posiciones del número están en una misma fila o columna.', 'Hay al menos una casilla de esa línea, fuera de la caja, con ese candidato.'],
    errors: [
      { text: 'Eliminar dentro de la caja', why: 'Las casillas de la caja son justamente donde el número puede estar.' },
      { text: 'Eliminar en una línea distinta', why: 'Solo queda afectada la línea en la que están alineadas las posiciones.' },
    ],
    mastery: MASTERY,
    intro: 'Primera técnica de eliminación. No colocaremos números: descartaremos candidatos.',
    findPrompt: 'Busca una caja donde un número solo pueda ir en una línea.',
    variants: { row: 'Apunta a una fila', col: 'Apunta a una columna' },
    questions: [
      { q: 'En la caja 4 el 3 solo puede ir en la fila 5. ¿De dónde se elimina el 3?', options: ['Del resto de la caja 4', 'De la fila 5 fuera de la caja 4', 'De toda la columna'], answer: 1, why: 'La fila 5 tendrá su 3 dentro de la caja; fuera de ella, sobra.' },
    ],
  },
  {
    id: 'claiming', impl: 'claiming', status: 'ready', name: 'Bloqueo línea-caja', aliases: ['Claiming', 'Box/Line Reduction', 'Candidatos bloqueados tipo 2'], abbr: 'LC', level: 'Fundamentos', family: 'Intersecciones', unit: 2, difficulty: 2,
    prereqs: ['pointing'], related: ['pointing'],
    intuition: 'Si dentro de una fila (o columna) un número solo puede estar en una caja, la caja recibe ese número en esa línea.',
    principle: 'La línea necesita el número y solo puede ponerlo en casillas de una caja. Así, el número de la caja estará en esa línea y el resto de la caja no puede tenerlo.',
    conditions: ['Dentro de una fila o columna, todas las posiciones del número están en la misma caja.', 'Otra casilla de la caja, fuera de la línea, tiene ese candidato.'],
    errors: [{ text: 'Confundir la dirección', why: 'En el bloqueo línea-caja se parte de la línea y se elimina en la caja; en el caja-línea, al revés.' }],
    mastery: MASTERY,
    intro: 'Es la misma intersección vista desde el otro lado: ahora manda la línea.',
    findPrompt: 'Busca una línea donde un número solo pueda ir dentro de una caja.',
    variants: { row: 'Desde una fila', col: 'Desde una columna' },
    questions: [
      { q: 'En la fila 2, el 8 solo puede ir en casillas de la caja 3. ¿Qué se deduce?', options: ['El 8 va en la fila 2 en la caja 3', 'El resto de la caja 3 no puede tener 8', 'Ambas cosas'], answer: 2, why: 'La fila coloca su 8 dentro de la caja, y ese es también el 8 de la caja.' },
    ],
  },
  {
    id: 'naked_pair', impl: 'naked_pair', status: 'ready', name: 'Par desnudo', aliases: ['Naked Pair'], abbr: 'PD', level: 'Fundamentos', family: 'Subconjuntos', unit: 3, difficulty: 2,
    prereqs: ['naked_single'], related: ['naked_triple', 'hidden_pair'],
    intuition: 'Dos casillas de la misma zona que solo pueden ser los mismos dos números. Se los reparten, así que nadie más en la zona puede tenerlos.',
    principle: 'Esas dos casillas se quedarán con esos dos números en algún orden. Por tanto, ninguna otra casilla de la unidad compartida puede tenerlos.',
    conditions: ['Dos casillas de la misma unidad.', 'Ambas tienen exactamente los mismos dos candidatos.', 'Si además comparten caja, la eliminación vale en las dos unidades.'],
    errors: [
      { text: 'Usar casillas que no comparten unidad', why: 'Si no se ven, podrían tener el mismo número.' },
      { text: 'Aceptar un par como {1,2} y {1,2,3}', why: 'La segunda casilla podría ser 3; no hay par.' },
    ],
    mastery: MASTERY,
    intro: 'Una casilla con un solo candidato decide su número. ¿Y dos casillas con los mismos dos?',
    findPrompt: 'Busca dos casillas de una misma unidad con los mismos dos candidatos.',
    variants: { line: 'En una línea', box: 'En una caja', 'line+box': 'Línea y caja a la vez' },
    questions: [
      { q: 'F1C1 y F1C5 admiten solo {4,7}. ¿Qué se puede eliminar?', options: ['El 4 y el 7 del resto de la fila 1', 'El 4 y el 7 de toda la columna 1', 'Nada todavía'], answer: 0, why: 'La fila 1 tendrá su 4 y su 7 en esas dos casillas.' },
    ],
  },
  {
    id: 'hidden_pair', impl: 'hidden_pair', status: 'ready', name: 'Par oculto', aliases: ['Hidden Pair'], abbr: 'PO', level: 'Fundamentos', family: 'Subconjuntos', unit: 3, difficulty: 3,
    prereqs: ['hidden_single', 'naked_pair'], related: ['hidden_triple', 'naked_pair'],
    intuition: 'Dos números que, en una zona, solo caben en las mismas dos casillas. Esas casillas son suyas: borra sus otros candidatos.',
    principle: 'Los dos números necesitan sitio en la unidad y solo tienen esas dos casillas. Las casillas quedan reservadas para ellos: sus demás candidatos sobran.',
    conditions: ['En una unidad, dos números aparecen como candidatos solo en las mismas dos casillas.', 'Esas casillas tienen otros candidatos que eliminar.'],
    errors: [{ text: 'Eliminar fuera de las dos casillas', why: 'El par oculto limpia sus propias casillas; para eliminar fuera hace falta un par desnudo.' }],
    mastery: MASTERY,
    intro: 'El par desnudo mira casillas. El oculto mira números.',
    findPrompt: 'Busca dos números con los mismos dos únicos sitios en una unidad.',
    variants: { line: 'En una línea', box: 'En una caja' },
    questions: [
      { q: 'En la caja 7, el 2 y el 9 solo pueden ir en F7C1 y F8C3. ¿Qué se elimina?', options: ['El 2 y el 9 del resto de la caja', 'Los demás candidatos de F7C1 y F8C3', 'El 2 y el 9 de la fila 7'], answer: 1, why: 'Esas casillas deben ser 2 y 9; cualquier otro candidato en ellas sobra.' },
    ],
  },
  {
    id: 'naked_triple', impl: 'naked_triple', status: 'ready', name: 'Trío desnudo', aliases: ['Naked Triple'], abbr: 'TD', level: 'Intermedio', family: 'Subconjuntos', unit: 3, difficulty: 3,
    prereqs: ['naked_pair'], related: ['naked_pair', 'hidden_triple'],
    intuition: 'Tres casillas de la misma zona que, entre todas, solo usan tres números. Esos tres quedan reservados para ellas.',
    principle: 'Tres casillas y tres números: se los repartirán entre ellas. No hace falta que cada casilla tenga los tres; basta con que la unión de sus candidatos sea de tres números.',
    conditions: ['Tres casillas de la misma unidad.', 'La unión de sus candidatos tiene exactamente tres números.', 'Cada casilla tiene dos o tres candidatos.'],
    errors: [{ text: 'Exigir que las tres casillas tengan los tres números', why: '{1,2}, {2,3} y {1,3} también forman un trío desnudo.' }],
    mastery: MASTERY,
    intro: 'La idea del par se generaliza: lo que cuenta es cuántos números distintos suman entre todas.',
    findPrompt: 'Busca tres casillas de una unidad que entre todas solo admitan tres números.',
    variants: { line: 'En una línea', box: 'En una caja', 'line+box': 'Línea y caja a la vez' },
    questions: [
      { q: '¿Forman {3,5}, {5,8} y {3,8} un trío desnudo?', options: ['No, ninguna tiene los tres', 'Sí: la unión es {3,5,8}', 'Solo si están en una caja'], answer: 1, why: 'La condición es sobre la unión de candidatos, en cualquier unidad común.' },
    ],
  },
  {
    id: 'hidden_triple', impl: 'hidden_triple', status: 'ready', name: 'Trío oculto', aliases: ['Hidden Triple'], abbr: 'TO', level: 'Intermedio', family: 'Subconjuntos', unit: 3, difficulty: 3,
    prereqs: ['hidden_pair', 'naked_triple'], related: ['hidden_pair'],
    intuition: 'Tres números que, en una zona, solo caben en las mismas tres casillas. Esas casillas no pueden ser nada más.',
    principle: 'Tres números necesitan tres sitios y solo tienen esas tres casillas. Las casillas quedan reservadas y sus demás candidatos se eliminan.',
    conditions: ['En una unidad, tres números solo aparecen como candidatos en las mismas tres casillas (entre todos).', 'Esas casillas tienen otros candidatos.'],
    errors: [{ text: 'Buscarlo en casillas con muchos candidatos y rendirse', why: 'Los tríos ocultos se ven mejor contando sitios por número, no candidatos por casilla.' }],
    mastery: MASTERY,
    intro: 'El trío oculto es difícil de ver mirando casillas. Lo veremos mirando números.',
    findPrompt: 'Busca tres números que compartan sus únicos tres sitios en una unidad.',
    variants: { line: 'En una línea', box: 'En una caja' },
    questions: [],
  },
  {
    id: 'x_wing', impl: 'x_wing', status: 'ready', name: 'X-Wing', aliases: ['Pez de tamaño 2'], abbr: 'XW', level: 'Intermedio', family: 'Peces', unit: 4, difficulty: 3,
    prereqs: ['pointing', 'claiming'], related: ['swordfish', 'simple_coloring'],
    intuition: 'Un número que en dos filas solo tiene dos sitios, y en las mismas columnas. Sea como sea, esas columnas ya tienen su número.',
    principle: 'Cada fila base debe tener el número, y solo puede ponerlo en dos columnas. Como cada columna admite un único ejemplar, las dos filas ocupan las dos columnas, una cada una. Esas columnas ya tienen su número dentro de las filas base, así que fuera de ellas se elimina.',
    conditions: ['Un solo dígito.', 'Dos filas (base) donde el dígito tiene exactamente dos posiciones, en las mismas dos columnas (cubierta). O la versión transpuesta con columnas como base.', 'Hay candidatos de ese dígito en las columnas de cubierta fuera de las filas base.'],
    errors: [
      { text: 'Eliminar en las filas base', why: 'Las filas base son donde el patrón coloca el número.' },
      { text: 'Aceptar filas con tres posiciones', why: 'Con tres posiciones en dos filas y tres columnas, no hay X-Wing (podría haber un Swordfish con otra fila).' },
      { text: 'Pensar que hace falta que las cuatro esquinas formen un cuadrado perfecto en cajas', why: 'Las cajas no importan en un X-Wing; solo filas y columnas.' },
    ],
    mastery: MASTERY,
    intro: 'Vamos a seguir un único número a través de dos filas a la vez.',
    findPrompt: 'Busca un número que en dos filas (o dos columnas) solo tenga las mismas dos posiciones.',
    variants: { row: 'Filas como base', col: 'Columnas como base' },
    questions: [
      { q: 'En las filas 2 y 7 el 4 solo puede ir en las columnas 3 y 8. ¿Dónde se elimina el 4?', options: ['En las filas 2 y 7, fuera de esas columnas', 'En las columnas 3 y 8, fuera de las filas 2 y 7', 'En las cajas de las esquinas'], answer: 1, why: 'Las columnas 3 y 8 recibirán su 4 en las filas 2 y 7.' },
      { q: '¿Qué ocurre si el 4 de la fila 2 va a la columna 3?', options: ['El de la fila 7 va a la columna 8', 'El de la fila 7 también va a la columna 3', 'No se puede saber'], answer: 0, why: 'La columna 3 ya tendría su 4; a la fila 7 solo le queda la columna 8.' },
    ],
  },
  {
    id: 'swordfish', impl: 'swordfish', status: 'ready', name: 'Swordfish', aliases: ['Pez de tamaño 3'], abbr: 'SF', level: 'Intermedio', family: 'Peces', unit: 4, difficulty: 4,
    prereqs: ['x_wing'], related: ['x_wing', 'jellyfish'],
    intuition: 'Como el X-Wing, pero con tres filas: el número solo cabe en tres columnas en total, así que esas columnas quedan servidas.',
    principle: 'Tres filas deben colocar el número y, entre todas, solo disponen de tres columnas. Tres números en tres columnas distintas: cada columna recibe exactamente uno de ellos. Fuera de las filas base, esas columnas no pueden tener el número.',
    conditions: ['Un solo dígito.', 'Tres filas base, cada una con 2 o 3 posiciones del dígito.', 'La unión de esas posiciones ocupa exactamente tres columnas.', 'No hace falta que cada fila use las tres columnas.'],
    errors: [{ text: 'Exigir tres posiciones por fila', why: 'Un patrón 2-2-2 también es un Swordfish válido.' }],
    mastery: MASTERY,
    intro: 'Si dominas el X-Wing, ya entiendes el Swordfish: solo añadimos una línea más.',
    findPrompt: 'Busca un número cuyas posiciones en tres líneas paralelas quepan en solo tres líneas perpendiculares.',
    variants: { row: 'Filas como base', col: 'Columnas como base' },
    questions: [
      { q: 'Las filas 1, 4 y 9 tienen el 6 solo en las columnas {2,5}, {5,8} y {2,8}. ¿Es un Swordfish?', options: ['Sí', 'No, cada fila necesita tres posiciones', 'No, debería estar en cajas distintas'], answer: 0, why: 'La unión ocupa exactamente tres columnas.' },
    ],
  },
  {
    id: 'jellyfish', impl: 'jellyfish', status: 'ready', name: 'Jellyfish', aliases: ['Pez de tamaño 4'], abbr: 'JF', level: 'Avanzado', family: 'Peces', unit: 4, difficulty: 5,
    prereqs: ['swordfish'], related: ['swordfish'],
    intuition: 'El mismo truco del X-Wing con cuatro filas y cuatro columnas.',
    principle: 'Cuatro filas deben colocar el número y solo disponen de cuatro columnas: esas columnas quedan cubiertas por las filas base.',
    conditions: ['Un solo dígito.', 'Cuatro líneas base con 2 a 4 posiciones cada una.', 'La unión ocupa exactamente cuatro líneas de cubierta.'],
    errors: [{ text: 'Buscarlo antes que peces más pequeños', why: 'Si existe un pez menor con las mismas eliminaciones, es preferible.' }],
    mastery: MASTERY,
    intro: 'Es el pez más grande que merece la pena buscar.',
    variants: { row: 'Filas como base', col: 'Columnas como base' },
    questions: [],
  },
  {
    id: 'y_wing', impl: 'y_wing', status: 'ready', name: 'Y-Wing', aliases: ['XY-Wing'], abbr: 'YW', level: 'Intermedio', family: 'Alas', unit: 5, difficulty: 3,
    prereqs: ['naked_pair'], related: ['xyz_wing', 'w_wing'],
    intuition: 'Una casilla (pivote) con dos opciones ve a dos «pinzas». Sea lo que sea el pivote, una pinza acaba siendo el mismo número.',
    principle: 'Pivote {A,B}, pinzas {A,C} y {B,C}, ambas vistas por el pivote. Si el pivote es A, la pinza {A,C} es C; si es B, la pinza {B,C} es C. Una de las pinzas es C, así que cualquier casilla que vea a las dos no puede ser C.',
    conditions: ['Tres casillas de dos candidatos: pivote {A,B}, pinzas {A,C} y {B,C}.', 'El pivote ve a ambas pinzas.', 'Se elimina C de las casillas que ven a las dos pinzas.'],
    errors: [
      { text: 'Eliminar C de casillas que solo ven una pinza', why: 'Si la C estuviera en la otra pinza, esa casilla podría ser C.' },
      { text: 'Usar casillas con tres candidatos', why: 'Con un tercer candidato, el razonamiento «si no es A, es B» deja de valer.' },
    ],
    mastery: MASTERY,
    intro: 'Hasta ahora mirábamos un número. Ahora razonaremos con casillas de dos candidatos que se obligan entre sí.',
    findPrompt: 'Busca un pivote de dos candidatos que vea a dos casillas de dos candidatos con un número en común.',
    variants: { box: 'Pinza en la caja del pivote', line: 'Pinzas en líneas' },
    questions: [
      { q: 'Pivote {2,7}, pinzas {2,9} y {7,9}. ¿Qué número se elimina?', options: ['El 2', 'El 7', 'El 9'], answer: 2, why: 'Una de las pinzas será 9 en cualquier caso.' },
    ],
  },
  {
    id: 'xyz_wing', impl: 'xyz_wing', status: 'ready', name: 'XYZ-Wing', aliases: [], abbr: 'XZ', level: 'Intermedio', family: 'Alas', unit: 5, difficulty: 4,
    prereqs: ['y_wing'], related: ['y_wing'],
    intuition: 'Como el Y-Wing, pero el pivote también puede ser el número común. Solo se borra donde se ven las tres casillas.',
    principle: 'Pivote {A,B,C}, pinzas {A,C} y {B,C}. Si el pivote es C, la C está en el pivote; si es A o B, la C está en una pinza. La C está en una de las tres casillas, así que solo se elimina de casillas que ven a las tres.',
    conditions: ['Pivote con tres candidatos; dos pinzas de dos candidatos contenidas en él.', 'El pivote ve a ambas pinzas.', 'Se elimina C de casillas que ven al pivote y a las dos pinzas.'],
    errors: [{ text: 'Olvidar que también hay que ver al pivote', why: 'El propio pivote puede ser la C.' }],
    mastery: MASTERY,
    intro: 'Una pequeña variación del Y-Wing con una consecuencia importante.',
    variants: { box: 'Pinza en la caja del pivote', line: 'Pinzas en líneas' },
    questions: [
      { q: 'En un XYZ-Wing, ¿qué casillas pierden el número común?', options: ['Las que ven a las dos pinzas', 'Las que ven a las dos pinzas y al pivote', 'Las de la caja del pivote'], answer: 1, why: 'El número común puede estar en cualquiera de las tres.' },
    ],
  },
  {
    id: 'w_wing', impl: 'w_wing', status: 'ready', name: 'W-Wing', aliases: [], abbr: 'WW', level: 'Intermedio', family: 'Alas', unit: 5, difficulty: 4,
    prereqs: ['y_wing', 'x_wing'], related: ['y_wing', 'simple_coloring'],
    intuition: 'Dos casillas iguales de dos opciones (por ejemplo 4 o 9), unidas por un número que solo tiene dos sitios en una fila. Al menos una es 4.',
    principle: 'Si ninguna de las dos fuera X, ambas serían Y. Pero hay una unidad donde el Y solo tiene dos sitios, y cada uno ve a una de las casillas: ambos sitios quedarían bloqueados y esa unidad se quedaría sin Y. Por tanto, al menos una de las dos casillas es X.',
    conditions: ['Dos casillas {X,Y} que no se ven.', 'Una unidad con exactamente dos posiciones de Y (enlace fuerte), cada una vista por una de las casillas.', 'Se elimina X de casillas que ven a ambas.'],
    errors: [{ text: 'Usar un enlace débil (tres o más posiciones)', why: 'Sin enlace fuerte, el Y podría ir a un tercer sitio y no hay contradicción.' }],
    mastery: MASTERY,
    intro: 'Primer contacto con los enlaces fuertes: «si no está aquí, está allí».',
    variants: { line: 'Enlace en una línea', box: 'Enlace en una caja' },
    questions: [
      { q: '¿Qué debe cumplir la unidad que conecta un W-Wing?', options: ['Que el Y tenga exactamente dos sitios', 'Que contenga las dos casillas', 'Que sea una caja'], answer: 0, why: 'Ese enlace fuerte es lo que provoca la contradicción.' },
    ],
  },
  {
    id: 'unique_rect1', impl: 'unique_rect1', status: 'ready', name: 'Rectángulo único (tipo 1)', aliases: ['Unique Rectangle Type 1', 'UR1'], abbr: 'RU', level: 'Intermedio', family: 'Unicidad', unit: 6, difficulty: 3,
    prereqs: ['naked_pair'], related: [],
    intuition: 'Cuatro casillas en rectángulo que no pueden quedarse todas con el mismo par, porque habría dos soluciones.',
    principle: 'Si cuatro casillas sin resolver, en dos filas, dos columnas y dos cajas, solo admitieran {A,B}, A y B podrían intercambiarse en las cuatro sin violar ninguna regla: el sudoku tendría dos soluciones. SUPUESTO: el sudoku tiene solución única. Con ese supuesto, si tres esquinas son exactamente {A,B}, la cuarta no puede ser A ni B.',
    conditions: ['Cuatro casillas sin resolver (ninguna es pista inicial) en dos filas, dos columnas y exactamente dos cajas.', 'Tres de ellas tienen exactamente los candidatos {A,B}.', 'La cuarta contiene A, B y algún otro candidato.', 'Solo es válido si el sudoku tiene solución única. Todos los sudokus de esta app se verifican así.'],
    errors: [
      { text: 'Aplicarlo con cuatro casillas en cuatro cajas', why: 'Con cuatro cajas el intercambio puede romper otras unidades; no hay patrón mortal.' },
      { text: 'Aplicarlo en sudokus sin unicidad garantizada', why: 'Sin unicidad, el razonamiento no es lógico sino una suposición.' },
    ],
    mastery: MASTERY,
    intro: 'Esta técnica no se deduce solo de las reglas: usa un dato extra, que la solución es única.',
    variants: { 'rows-in-band': 'Filas en la misma banda', 'cols-in-stack': 'Columnas en la misma pila' },
    questions: [
      { q: '¿Por qué hace falta que el rectángulo ocupe exactamente dos cajas?', options: ['Por estética', 'Para que intercambiar A y B mantenga válidas las cajas', 'No hace falta'], answer: 1, why: 'Cada caja contiene dos esquinas con A y B; el intercambio no altera su contenido.' },
    ],
  },
  {
    id: 'simple_coloring', impl: 'simple_coloring', status: 'ready', name: 'Coloreado simple', aliases: ['Simple Coloring', 'Single\'s Chains'], abbr: 'CS', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 4,
    prereqs: ['x_wing', 'w_wing'], related: ['x_wing', 'w_wing'],
    intuition: 'Encadena enlaces fuertes de un número y píntalos alternando dos colores: un color entero es verdadero y el otro falso.',
    principle: 'En un enlace fuerte (unidad con exactamente dos posiciones), uno de los extremos tiene el número. Al alternar colores por la cadena, todas las casillas de un color tienen el número o ninguna. Trampa: una casilla que ve ambos colores ve al menos un número, así que pierde el candidato. Color repetido: si dos casillas del mismo color se ven, ese color es falso.',
    conditions: ['Un solo dígito.', 'Cadena de enlaces fuertes conectados (al menos tres casillas).', 'Trampa: casilla fuera de la cadena que ve un color de cada tipo.', 'Color repetido: dos casillas del mismo color que se ven.'],
    errors: [
      { text: 'Encadenar enlaces débiles', why: 'Si la unidad tiene tres posiciones, que no esté en una no obliga a que esté en otra concreta.' },
      { text: 'Eliminar casillas que ven dos casillas del mismo color', why: 'Hace falta ver un color de cada tipo.' },
    ],
    mastery: MASTERY,
    intro: 'Vamos a seguir las consecuencias de un número a lo largo de una cadena.',
    variants: { trap: 'Trampa', wrap: 'Color repetido' },
    questions: [
      { q: 'Una casilla ve una casilla azul y otra magenta de la cadena del 5. ¿Qué se deduce?', options: ['Que es 5', 'Que no puede ser 5', 'Nada'], answer: 1, why: 'Uno de los dos colores es verdadero, así que una de las dos casillas vistas tiene el 5.' },
    ],
  },
  {
    id: 'naked_quad', impl: 'naked_quad', status: 'ready', name: 'Cuarteto desnudo', aliases: ['Naked Quad'], abbr: 'CD', level: 'Avanzado', family: 'Subconjuntos', unit: 3, difficulty: 4,
    prereqs: ['naked_triple'], related: ['naked_triple', 'hidden_quad'],
    intuition: 'Cuatro casillas de una unidad que, entre todas, solo admiten cuatro números.',
    principle: 'Cuatro casillas y cuatro números: se los repartirán entre ellas. Ninguna otra casilla de la unidad puede tener esos números.',
    conditions: ['Cuatro casillas de la misma unidad.', 'La unión de sus candidatos tiene exactamente cuatro números.'],
    errors: [{ text: 'Contar mal la unión', why: 'Si entre las cuatro aparecen cinco números distintos, no hay cuarteto.' }],
    mastery: MASTERY, intro: 'La misma idea del par y el trío, con cuatro.', variants: { line: 'En una línea', box: 'En una caja', 'line+box': 'Línea y caja a la vez' },
    questions: [{ q: '¿Forman {1,2}, {2,3}, {3,4} y {1,4} un cuarteto desnudo?', options: ['Sí: la unión es {1,2,3,4}', 'No, ninguna tiene cuatro'], answer: 0, why: 'Cuenta la unión de candidatos, no cada casilla.' }],
  },
  {
    id: 'hidden_quad', impl: 'hidden_quad', status: 'ready', name: 'Cuarteto oculto', aliases: ['Hidden Quad'], abbr: 'CO', level: 'Avanzado', family: 'Subconjuntos', unit: 3, difficulty: 4,
    prereqs: ['hidden_triple'], related: ['hidden_triple', 'naked_quad'],
    intuition: 'Cuatro números que, en una unidad, solo caben en las mismas cuatro casillas.',
    principle: 'Cuatro números necesitan cuatro sitios y solo tienen esas cuatro casillas. Los demás candidatos de esas casillas sobran.',
    conditions: ['En una unidad, cuatro números aparecen solo en las mismas cuatro casillas.', 'Esas casillas tienen otros candidatos.'],
    errors: [{ text: 'Eliminar fuera del grupo', why: 'Un grupo oculto solo limpia sus propias casillas.' }],
    mastery: MASTERY, intro: 'Mira números, no casillas.', variants: { line: 'En una línea', box: 'En una caja' }, questions: [],
  },
  {
    id: 'finned_fish', impl: 'finned_fish', status: 'ready', name: 'Pez con aleta', aliases: ['Finned X-Wing', 'Finned Swordfish', 'Sashimi'], abbr: 'PA', level: 'Avanzado', family: 'Peces', unit: 4, difficulty: 4,
    prereqs: ['x_wing', 'swordfish'], related: ['x_wing', 'swordfish'],
    intuition: 'Un X-Wing (o Swordfish) casi perfecto, con candidatos de más en una sola caja: la aleta.',
    principle: 'O la aleta es verdadera, o no. Si no lo es, el pez funciona y elimina en las líneas de cubierta. Si lo es, elimina en su caja. Solo es seguro eliminar donde coinciden los dos casos: en la caja de la aleta y en las líneas de cubierta.',
    conditions: ['Un solo dígito.', 'Las líneas base forman un pez si se ignoran unos pocos candidatos (la aleta).', 'Toda la aleta está en una misma caja.', 'Se elimina en las casillas de las líneas de cubierta que están en la caja de la aleta, fuera de las líneas base.'],
    errors: [{ text: 'Eliminar en toda la línea de cubierta', why: 'Fuera de la caja de la aleta, si la aleta fuera verdadera, el número podría estar ahí.' }],
    mastery: MASTERY, intro: 'A veces un pez no es perfecto, pero sigue sirviendo.', variants: { row: 'Filas como base', col: 'Columnas como base' },
    questions: [{ q: '¿Dónde elimina un X-Wing con aleta?', options: ['En toda la columna cubierta', 'Solo donde la columna cubierta cruza la caja de la aleta', 'En la caja de la aleta entera'], answer: 1, why: 'Ese es el único sitio seguro en los dos casos.' }],
  },
  {
    id: 'unique_rect_plus', impl: 'unique_rect_plus', status: 'ready', name: 'Rectángulo único (tipos 2 y 4)', aliases: ['UR2', 'UR4'], abbr: 'R+', level: 'Avanzado', family: 'Unicidad', unit: 6, difficulty: 4,
    prereqs: ['unique_rect1'], related: ['unique_rect1', 'bug1'],
    intuition: 'Dos esquinas del rectángulo son {a,b} (el suelo); las otras dos (el techo) tienen a, b y algo más. El techo no puede quedarse en {a,b}.',
    principle: 'SUPUESTO: solución única. Tipo 2: si las dos esquinas del techo tienen el mismo extra c, una de ellas será c, y quien vea a ambas pierde el c. Tipo 4: si en una unidad común al techo el número a solo cabe en el techo, una esquina del techo será a; si la otra fuera b, el techo sería {a,b}. Por eso el b sale de las dos.',
    conditions: ['Cuatro casillas sin resolver en dos filas, dos columnas y dos cajas.', 'El suelo: dos esquinas en el mismo lado, exactamente {a,b}.', 'El techo: las otras dos, con a, b y extras.', 'Válido solo con solución única.'],
    errors: [{ text: 'Usar un suelo en diagonal', why: 'Esos son otros tipos (5 y 6), con reglas distintas.' }],
    mastery: MASTERY, intro: 'Más formas de usar que la solución es única.', variants: { tipo2: 'Tipo 2', tipo4: 'Tipo 4' }, questions: [],
  },
  {
    id: 'bug1', impl: 'bug1', status: 'ready', name: 'BUG+1', aliases: ['Bivalue Universal Grave'], abbr: 'BG', level: 'Avanzado', family: 'Unicidad', unit: 6, difficulty: 3,
    prereqs: ['unique_rect1'], related: ['unique_rect_plus'],
    intuition: 'Todas las casillas vacías tienen dos candidatos menos una, que tiene tres. Esa casilla decide.',
    principle: 'SUPUESTO: solución única. Si todo el tablero quedara en parejas (cada número dos veces por unidad), tendría varias soluciones o ninguna. La casilla de tres candidatos debe ser el número que rompe esa simetría: el que aparece tres veces en sus unidades.',
    conditions: ['Todas las casillas vacías tienen dos candidatos salvo una con tres.', 'En cada unidad, cada número aparece 0 o 2 veces, salvo el número extra en las unidades de esa casilla.'],
    errors: [{ text: 'Aplicarlo con dos casillas de tres candidatos', why: 'Eso ya no es BUG+1.' }],
    mastery: MASTERY, intro: 'Un truco de final de partida.', variants: { bug: 'BUG+1' }, questions: [],
  },
  {
    id: 'x_chain', impl: 'x_chain', status: 'ready', name: 'X-Chain', aliases: ['X-Cycles (cadena abierta)', 'Skyscraper', '2-String Kite', 'Turbot Fish'], abbr: 'XC', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 4,
    prereqs: ['simple_coloring'], related: ['simple_coloring', 'aic'],
    intuition: 'Sigue un número saltando de casilla en casilla: «si no está aquí, está allí», «si está aquí, no está allí». Uno de los extremos es seguro.',
    principle: 'Empieza y termina con un enlace fuerte. Si el primer extremo es falso, la cadena obliga a que el último sea verdadero. Así que al menos uno de los dos extremos tiene el número, y quien vea a ambos lo pierde. Skyscraper, 2-String Kite y Turbot son X-Chains cortas.',
    conditions: ['Un solo dígito.', 'Enlaces alternos: fuerte, débil, fuerte… terminando en fuerte.', 'Se elimina el dígito de las casillas que ven a los dos extremos.'],
    errors: [{ text: 'Poner dos enlaces débiles seguidos', why: 'Un débil no obliga a nada si el anterior es falso.' }],
    mastery: MASTERY, intro: 'Seguimos un número por todo el tablero.', variants: { corta: 'Cadena corta', larga: 'Cadena larga' },
    questions: [{ q: 'En una X-Chain, ¿qué sabemos de los extremos?', options: ['Los dos tienen el número', 'Al menos uno tiene el número', 'Ninguno lo tiene'], answer: 1, why: 'Si uno es falso, la cadena hace verdadero al otro.' }],
  },
  {
    id: 'xy_chain', impl: 'xy_chain', status: 'ready', name: 'XY-Chain', aliases: ['Cadena XY'], abbr: 'XY', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 4,
    prereqs: ['y_wing'], related: ['y_wing', 'aic'],
    intuition: 'Un Y-Wing estirado: una fila de casillas de dos candidatos que se pasan un número como una cadena de fichas.',
    principle: 'Si la primera casilla no es z, es el otro número, que obliga a la siguiente, y así hasta la última, que termina siendo z. O la primera es z o la última lo es: quien vea a ambas pierde el z.',
    conditions: ['Todas las casillas tienen dos candidatos.', 'Cada casilla ve a la siguiente y comparten el número que pasa.', 'La primera y la última tienen el número z libre en los extremos.'],
    errors: [{ text: 'Saltar casillas que no se ven', why: 'Cada eslabón debe ver al siguiente.' }],
    mastery: MASTERY, intro: 'Fichas de dominó que caen una tras otra.', variants: { corta: 'Cadena corta', larga: 'Cadena larga' }, questions: [],
  },
  {
    id: 'multi_coloring', impl: 'multi_coloring', status: 'ready', name: 'Coloreado múltiple', aliases: ['Multi-Coloring'], abbr: 'CM', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 5,
    prereqs: ['simple_coloring'], related: ['simple_coloring', 'medusa'],
    intuition: 'Dos grupos de colores del mismo número que se tocan. Eso obliga a que uno de dos colores sea verdadero.',
    principle: 'En cada cadena un color es verdadero. Si un color de la cadena 1 ve a un color de la cadena 2, no pueden ser los dos verdaderos: al menos uno de los otros colores lo es. Quien vea un color «otro» de cada cadena pierde el número.',
    conditions: ['Un solo dígito y dos cadenas separadas de enlaces fuertes.', 'Un color de una ve a un color de la otra.'],
    errors: [{ text: 'Mezclar las cadenas en una sola', why: 'Si estuvieran unidas, sería coloreado simple.' }],
    mastery: MASTERY, intro: 'Dos cadenas que se vigilan.', variants: { trampa: 'Trampa' }, questions: [],
  },
  {
    id: 'medusa', impl: 'medusa', status: 'ready', name: '3D Medusa', aliases: ['Medusa'], abbr: 'MD', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 5,
    prereqs: ['simple_coloring', 'xy_chain'], related: ['multi_coloring', 'aic'],
    intuition: 'Coloreado que pinta varios números a la vez: salta dentro de casillas de dos opciones y por números con dos sitios.',
    principle: 'Todos los azules son verdaderos o todos los rosas. Un color es falso si pone dos números en una casilla o el mismo número dos veces en una unidad. Un candidato sin color sobra si ve ambos colores de su número, si su casilla tiene ambos colores, o si su casilla tiene un color y ve el otro color de su número.',
    conditions: ['Red de enlaces fuertes de varios números.', 'Se aplican las reglas de contradicción y de trampa.'],
    errors: [{ text: 'Usar enlaces débiles para colorear', why: 'Solo los enlaces fuertes garantizan que un color sea el contrario del otro.' }],
    mastery: MASTERY, intro: 'El coloreado en tres dimensiones.', variants: { 'color falso': 'Color falso', trampa: 'Trampa' }, questions: [],
  },
  {
    id: 'aic', impl: 'aic', status: 'ready', name: 'AIC', aliases: ['Alternating Inference Chains', 'Cadenas de inferencia alterna'], abbr: 'AI', level: 'Avanzado', family: 'Cadenas', unit: 7, difficulty: 5,
    prereqs: ['x_chain', 'xy_chain'], related: ['x_chain', 'xy_chain', 'medusa'],
    intuition: 'La cadena más general: mezcla números y casillas. Mientras alternes fuerte y débil, la lógica se sostiene.',
    principle: 'Si el primer candidato es falso, la cadena obliga a que el último sea verdadero. Si los extremos son el mismo número, quien vea a ambos lo pierde. Si están en la misma casilla, el resto de sus candidatos sobra. Si son números distintos en casillas que se ven, cada extremo pierde el número del otro.',
    conditions: ['Empieza y termina con enlace fuerte.', 'Alterna fuerte y débil.', 'Fuerte: única pareja de una unidad o casilla de dos candidatos. Débil: misma casilla, o mismo número en casillas que se ven.'],
    errors: [{ text: 'Tratar un enlace débil como fuerte', why: 'Si hay tres sitios, que no esté en uno no dice dónde está.' }],
    mastery: MASTERY, intro: 'Todas las cadenas son AIC.', variants: { 'un dígito': 'Un número', mixta: 'Varios números' }, questions: [],
  },
];

function pending(id: string, name: string, aliases: string[], family: string, unit: number, level: Sheet['level'], prereqs: string[], intuition: string): Sheet[] {
  return [{ id, status: 'pending', name, aliases, abbr: name.slice(0, 2).toUpperCase(), level, family, unit, difficulty: 5, prereqs, related: prereqs, intuition, principle: intuition, conditions: [], errors: [], mastery: '', questions: [] }];
}

const ANALOGY: Record<string, string> = {
  rules: 'Cada fila, columna y caja es un equipo de 9 jugadores con dorsales del 1 al 9: nunca puede haber dos con el mismo dorsal.',
  candidates: 'Los candidatos son la lista de «quizás» de cada casilla. Resolver es ir tachando quizás hasta que solo queda uno.',
  naked_single: 'Como la última pieza de un puzle: si todo lo de alrededor ya está puesto, solo encaja una.',
  hidden_single: 'Como buscar aparcamiento para el coche nº 7 en una calle: todas las plazas tienen un cartel de «prohibido» menos una. Ahí va.',
  pointing: 'Como una reserva de tren: si tu asiento está en este vagón, no puede estar en ningún otro vagón del mismo tren.',
  claiming: 'La misma reserva vista al revés: si la fila guarda su número dentro de una caja, el resto de la caja ya no lo necesita.',
  naked_pair: 'Dos niños que solo quieren chocolate o fresa, y quedan justo esos dos helados: ya nadie más de la mesa puede pedir esos sabores.',
  hidden_pair: 'Dos invitados VIP que solo caben en dos sillas concretas: esas sillas son suyas, y lo que hubiera apuntado en ellas sobra.',
  naked_triple: 'Igual que la pareja, pero con tres niños y tres sabores: se los reparten entre ellos.',
  hidden_triple: 'Tres invitados VIP, tres sillas reservadas.',
  naked_quad: 'Cuatro niños, cuatro sabores: nadie más puede pedirlos.',
  hidden_quad: 'Cuatro invitados VIP con sus cuatro sillas.',
  x_wing: 'Dos parejas de baile y solo dos pistas: cada pista se la queda una pareja. En esas pistas ya no puede bailar nadie más.',
  swordfish: 'Tres parejas y tres pistas: todas las pistas quedan ocupadas.',
  jellyfish: 'Cuatro parejas, cuatro pistas.',
  finned_fish: 'Un X-Wing con un «pero»: la aleta. Si la aleta no cuenta, funciona el X-Wing; si cuenta, tapa su propia caja. Solo se elimina lo que cae en los dos casos.',
  y_wing: 'El pivote es un interruptor de dos posiciones: en una enciende la pinza A, en la otra la pinza B. Las dos apuntan a la misma casilla: pase lo que pase, queda bloqueada.',
  xyz_wing: 'Como el Y-Wing, pero el interruptor tiene una tercera posición que también bloquea: hay que estar a la vista de los tres.',
  w_wing: 'Dos casillas gemelas {x,y}, lejos una de otra, unidas por un puente de y. No pueden ser y las dos a la vez sin romper el puente, así que al menos una es x.',
  unique_rect1: 'Si cuatro esquinas pudieran intercambiar sus números sin que nadie lo notara, habría dos soluciones. Los buenos sudokus tienen una sola: la cuarta esquina rompe el empate.',
  unique_rect_plus: 'El mismo empate imposible, pero el techo tiene extras: alguno de esos extras tiene que ser verdad.',
  bug1: 'Todo el tablero baila en parejas. La única casilla con tres candidatos es la que rompe la simetría, y decide.',
  simple_coloring: 'Un juego de verdad o mentira: pinta la cadena con dos colores. Un color dice la verdad y el otro miente.',
  multi_coloring: 'Dos equipos de verdad o mentira que se vigilan entre sí.',
  x_chain: 'Fichas de dominó de un solo número: si la primera no está, empuja a la siguiente… hasta que la última sí está.',
  xy_chain: 'Fichas de dominó hechas con casillas de dos candidatos que se pasan el número.',
  medusa: 'El coloreado en 3D: la cadena puede saltar de un número a otro dentro de la misma casilla.',
  aic: 'La cadena universal: mezcla todo lo anterior. Si el primer eslabón miente, el último dice la verdad.',
};
const TERMS: Record<string, string[]> = {
  x_wing: ['base', 'cubierta'], swordfish: ['base', 'cubierta'], jellyfish: ['base', 'cubierta'], finned_fish: ['base', 'cubierta', 'aleta'],
  y_wing: ['pivote', 'pinza'], xyz_wing: ['pivote', 'pinza'], w_wing: ['enlace fuerte', 'enlace débil'],
  unique_rect1: ['patrón mortal'], unique_rect_plus: ['patrón mortal', 'suelo', 'techo'], bug1: ['patrón mortal'],
  simple_coloring: ['enlace fuerte'], multi_coloring: ['enlace fuerte'], x_chain: ['enlace fuerte', 'enlace débil'], xy_chain: ['casilla bivalor'],
  medusa: ['enlace fuerte', 'casilla bivalor'], aic: ['enlace fuerte', 'enlace débil'], naked_pair: ['unidad'], hidden_single: ['unidad'], pointing: ['unidad'], claiming: ['unidad'],
};
export const GLOSSARY: Record<string, string> = {
  'unidad': 'Una fila, una columna o una caja de 3×3.',
  'base': 'Las líneas donde el número tiene muy pocos sitios. Es donde se fija el patrón.',
  'cubierta': 'Las líneas perpendiculares que cubren esos sitios. Ahí se elimina.',
  'aleta': 'Candidatos de más que estropean un pez perfecto. Siempre en una misma caja.',
  'pivote': 'La casilla central que ve a las dos pinzas.',
  'pinza': 'Cada una de las casillas que el pivote obliga.',
  'enlace fuerte': 'Si uno no es verdad, el otro sí. Pasa cuando un número tiene solo dos sitios en una unidad, o una casilla solo tiene dos candidatos.',
  'enlace débil': 'Si uno es verdad, el otro no. Pasa entre candidatos que se ven.',
  'patrón mortal': 'Cuatro esquinas que podrían intercambiarse: daría dos soluciones, cosa imposible.',
  'suelo': 'Las dos esquinas del rectángulo que solo tienen los dos números.',
  'techo': 'Las otras dos esquinas, con algo más.',
  'casilla bivalor': 'Una casilla con exactamente dos candidatos.',
};
for (const s of SHEETS) { s.analogy = ANALOGY[s.id]; s.terms = TERMS[s.id]; }

export const SHEET_BY_ID: Record<string, Sheet> = Object.fromEntries(SHEETS.map(s => [s.id, s]));
export const sheetForTech = (t: TechId) => SHEETS.find(s => s.impl === t)!;
export const READY = SHEETS.filter(s => s.status === 'ready');
/** Nombre en minúscula para usar dentro de una frase («el par desnudo», pero «el X-Wing»). */
export const inSentence = (name: string) => (/^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ [a-záéíóúñ]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);
