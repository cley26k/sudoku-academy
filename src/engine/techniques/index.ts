import { State } from '../grid';
import { Step, TechId } from '../step';
import { findNakedSingles, findHiddenSingles } from './singles';
import { findPointing, findClaiming } from './intersections';
import { findNakedSubsets, findHiddenSubsets } from './subsets';
import { findFish } from './fish';
import { findYWing, findXYZWing, findWWing } from './wings';
import { findSimpleColoring } from './coloring';
import { findUniqueRect1, findUniqueRectPlus } from './uniqueness';
import { findFinnedFish } from './finned';
import { findBug1 } from './bug';
import { findXChain, findXYChain, findMultiColoring, findMedusa, findAIC } from './chains';

export interface TechImpl { id: TechId; name: string; find: (s: State) => Step[]; action: 'place' | 'eliminate' }

/** Orden = dificultad creciente. El solver humano siempre intenta la técnica más sencilla primero. */
export const TECHS: TechImpl[] = [
  { id: 'naked_single', name: 'Single desnudo', find: findNakedSingles, action: 'place' },
  { id: 'hidden_single', name: 'Single oculto', find: findHiddenSingles, action: 'place' },
  { id: 'pointing', name: 'Pointing', find: findPointing, action: 'eliminate' },
  { id: 'claiming', name: 'Claiming', find: findClaiming, action: 'eliminate' },
  { id: 'naked_pair', name: 'Par desnudo', find: s => findNakedSubsets(s, 2), action: 'eliminate' },
  { id: 'hidden_pair', name: 'Par oculto', find: s => findHiddenSubsets(s, 2), action: 'eliminate' },
  { id: 'naked_triple', name: 'Trío desnudo', find: s => findNakedSubsets(s, 3), action: 'eliminate' },
  { id: 'hidden_triple', name: 'Trío oculto', find: s => findHiddenSubsets(s, 3), action: 'eliminate' },
  { id: 'x_wing', name: 'X-Wing', find: s => findFish(s, 2), action: 'eliminate' },
  { id: 'swordfish', name: 'Swordfish', find: s => findFish(s, 3), action: 'eliminate' },
  { id: 'y_wing', name: 'Y-Wing', find: findYWing, action: 'eliminate' },
  { id: 'xyz_wing', name: 'XYZ-Wing', find: findXYZWing, action: 'eliminate' },
  { id: 'w_wing', name: 'W-Wing', find: findWWing, action: 'eliminate' },
  { id: 'finned_fish', name: 'Pez con aleta', find: findFinnedFish, action: 'eliminate' },
  { id: 'unique_rect1', name: 'Rectángulo único (tipo 1)', find: findUniqueRect1, action: 'eliminate' },
  { id: 'unique_rect_plus', name: 'Rectángulo único (tipos 2 y 4)', find: findUniqueRectPlus, action: 'eliminate' },
  { id: 'bug1', name: 'BUG+1', find: findBug1, action: 'place' },
  { id: 'naked_quad', name: 'Cuarteto desnudo', find: s => findNakedSubsets(s, 4), action: 'eliminate' },
  { id: 'hidden_quad', name: 'Cuarteto oculto', find: s => findHiddenSubsets(s, 4), action: 'eliminate' },
  { id: 'simple_coloring', name: 'Coloreado simple', find: findSimpleColoring, action: 'eliminate' },
  { id: 'jellyfish', name: 'Jellyfish', find: s => findFish(s, 4), action: 'eliminate' },
  { id: 'x_chain', name: 'X-Chain', find: findXChain, action: 'eliminate' },
  { id: 'xy_chain', name: 'XY-Chain', find: findXYChain, action: 'eliminate' },
  { id: 'multi_coloring', name: 'Coloreado múltiple', find: findMultiColoring, action: 'eliminate' },
  { id: 'medusa', name: '3D Medusa', find: findMedusa, action: 'eliminate' },
  { id: 'aic', name: 'AIC', find: findAIC, action: 'eliminate' },
];
export const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t])) as Record<TechId, TechImpl>;
export const TECH_ORDER = TECHS.map(t => t.id);
export const SINGLES: TechId[] = ['naked_single', 'hidden_single'];
export const techRank = (id: TechId) => TECH_ORDER.indexOf(id);
