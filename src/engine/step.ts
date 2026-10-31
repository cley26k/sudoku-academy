// Representación de una deducción: qué se concluye, qué patrón la justifica
// y cómo se explica paso a paso (fotogramas) y por niveles de pista.
export type TechId =
  | 'naked_single' | 'hidden_single'
  | 'pointing' | 'claiming'
  | 'naked_pair' | 'hidden_pair' | 'naked_triple' | 'hidden_triple'
  | 'x_wing' | 'swordfish' | 'jellyfish'
  | 'y_wing' | 'xyz_wing' | 'w_wing'
  | 'unique_rect1' | 'unique_rect_plus' | 'bug1' | 'simple_coloring'
  | 'naked_quad' | 'hidden_quad' | 'finned_fish'
  | 'x_chain' | 'xy_chain' | 'multi_coloring' | 'medusa' | 'aic';

export interface CD { cell: number; digit: number }
export type CellTone = 'focus' | 'pattern' | 'pivot' | 'source' | 'target' | 'colorA' | 'colorB' | 'dim';
export type CandTone = 'pattern' | 'elim' | 'confirm' | 'colorA' | 'colorB' | 'dim' | 'mark';
export type UnitTone = 'focus' | 'base' | 'cover';

export interface Overlay {
  units?: { u: number; tone: UnitTone }[];
  cells?: { cell: number; tone: CellTone }[];
  cands?: { cell: number; digit: number; tone: CandTone }[];
  links?: { a: CD; b: CD; kind: 'strong' | 'weak' }[];
  place?: CD[];   // valores que la deducción confirma
  hypo?: CD[];    // valores supuestos en una hipótesis
  rays?: { from: number; to: number; tone?: 'block' | 'elim' }[]; // flechas «esto bloquea aquello»
  digitFocus?: number;
}
export interface Frame extends Overlay { text: string }
export interface Scenario { label: string; frames: Frame[] }

export interface Step {
  tech: TechId;
  key: string;
  placements: CD[];
  elims: CD[];
  pattern: { cells: number[]; cands: CD[] };
  digits: number[];
  variant: string;
  title: string;
  hints: Frame[];        // 4 niveles: región, elementos, patrón, deducción
  frames: Frame[];       // demostración completa
  scenarios?: Scenario[];
  whyNot?: (cell: number, digit: number) => string | null;
}

export const cd = (cell: number, digit: number): CD => ({ cell, digit });
export const cdKey = (x: CD) => x.cell * 10 + x.digit;
