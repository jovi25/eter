// Fase 8 — Heróis com identidade.
// Heroes level up by playing (XP = waves cleared with them). Each level from 2 to 4 unlocks one talent;
// the player equips ONE talent per hero (they change the play style, not just numbers).
// Level 5 adds a second automatic skill. The Arcanista can also swap weapons (element of every spell).

import type { Element } from './elements';
import type { HeroClass } from './heroes';

export const HERO_LEVELS = {
  /** Total XP needed for each level (index 0 = level 1). */
  xp: [0, 10, 30, 60, 100],
  perWave: 1, // XP per wave cleared
  winBonus: 5, // extra XP for a victory
  skill2Level: 5,
};
export const MAX_HERO_LEVEL = HERO_LEVELS.xp.length;

export function heroLevel(xp: number): number {
  let lv = 1;
  for (let i = 0; i < HERO_LEVELS.xp.length; i++) if (xp >= HERO_LEVELS.xp[i]!) lv = i + 1;
  return lv;
}

export function matchXp(wavesCleared: number, won: boolean): number {
  return wavesCleared * HERO_LEVELS.perWave + (won ? HERO_LEVELS.winBonus : 0);
}

// ───────────── Talents ─────────────

export type TalentId =
  | 'farCatalyst'
  | 'tripleShot'
  | 'comboPact'
  | 'wall'
  | 'duelist'
  | 'banner'
  | 'elderBear'
  | 'bramble'
  | 'hungrySoil'
  | 'choir'
  | 'focus'
  | 'smite';

export interface TalentDef {
  cls: HeroClass;
  level: number; // hero level that unlocks it
  name: string;
  text: string;
}

export const TALENTS: Record<TalentId, TalentDef> = {
  // Arcanista
  farCatalyst: { cls: 'mage', level: 2, name: 'Catalisador Distante', text: 'Catalisar explode no maior grupo de inimigos do mapa, não em volta dela.' },
  tripleShot: { cls: 'mage', level: 3, name: 'Disparo Triplo', text: 'Cada ataque acerta 3 inimigos (60% do dano cada): espalha o elemento e prepara combos.' },
  comboPact: { cls: 'mage', level: 4, name: 'Pacto do Combo', text: 'Cada reação no mapa recarrega 1,2 s de Catalisar (em vez de 0,5), mas ele causa 40% menos dano.' },
  // Cavaleiro
  wall: { cls: 'knight', level: 2, name: 'Muralha', text: 'Segura 4 inimigos e tem +50% de vida, mas bate 30% mais fraco.' },
  duelist: { cls: 'knight', level: 3, name: 'Duelista', text: 'Segura só 1 inimigo, bate 2,2× mais forte e cada abate recupera 15% da vida.' },
  banner: { cls: 'knight', level: 4, name: 'Estandarte', text: 'Torres perto do Cavaleiro causam +18% de dano.' },
  // Druida
  elderBear: { cls: 'druid', level: 2, name: 'Urso Ancião', text: 'O urso tem +70% de vida, segura 3 e bate 40% mais forte; os espinhos da Druida ficam 40% mais fracos.' },
  bramble: { cls: 'druid', level: 3, name: 'Espinheiro', text: 'Os espinhos explodem em área (60% nos vizinhos), mas enraízam menos.' },
  hungrySoil: { cls: 'druid', level: 4, name: 'Solo Sedento', text: 'Inimigos enraizados recebem +25% de dano de tudo. Fúria da Natureza enraíza 1 s a mais.' },
  // Sacerdotisa
  choir: { cls: 'priest', level: 2, name: 'Coro', text: 'A aura alcança muito mais longe (300), mas acelera só 12%.' },
  focus: { cls: 'priest', level: 3, name: 'Foco', text: 'Bênção vai só para a torre mais forte perto dela: +110% de dano por 7 s.' },
  smite: { cls: 'priest', level: 4, name: 'Luz Punitiva', text: 'O ataque dela fica 3× mais forte e acerta em área, mas a aura de velocidade some.' },
};

export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

export function talentsOf(cls: HeroClass): TalentId[] {
  return TALENT_IDS.filter((id) => TALENTS[id].cls === cls);
}

/** Numbers used by the talents. */
export const TALENT_NUM = {
  farCatalyst: { searchRadius: 140 }, // size of the group it looks for
  tripleShot: { targets: 3, damageMult: 0.6 },
  comboPact: { cooldownPerReaction: 1.2, damageMult: 0.6 },
  wall: { maxBlock: 4, hpMult: 1.5, damageMult: 0.7 },
  duelist: { maxBlock: 1, damageMult: 2.2, healOnKill: 0.15 },
  banner: { radius: 170, damageMult: 1.18 },
  elderBear: { hpMult: 1.7, maxBlock: 3, damageMult: 1.4, druidDamageMult: 0.6 },
  bramble: { splashRadius: 70, splashFactor: 0.6, rootChance: 0.15 },
  hungrySoil: { rootedDamageTaken: 1.25, furyRootBonus: 1 },
  choir: { auraRadius: 300, auraRateMult: 1.12 },
  focus: { damageMult: 2.1, duration: 7 },
  smite: { damageMult: 3, splashRadius: 60, splashFactor: 0.7 },
};

// ───────────── Second skill (hero level 5) ─────────────

export interface Skill2Def {
  name: string;
  text: string;
  cooldown: number;
  radius: number;
}

export const SKILL2: Record<HeroClass, Skill2Def> = {
  mage: { name: 'Chuva Elemental', text: 'A cada 18 s, 6 golpes do elemento da arma caem em inimigos perto dela.', cooldown: 18, radius: 260 },
  knight: { name: 'Grito de Guerra', text: 'A cada 16 s, deixa Frágeis (recebem mais dano) os inimigos em volta.', cooldown: 16, radius: 170 },
  druid: { name: 'Chamado Selvagem', text: 'A cada 20 s, o urso volta na hora (ou se cura todo) e enraíza quem estiver perto dele.', cooldown: 20, radius: 130 },
  priest: { name: 'Graça', text: 'A cada 30 s, se o cristal perdeu vida, recupera 1.', cooldown: 30, radius: 0 },
};

export const SKILL2_NUM = {
  rain: { hits: 6, damage: 18, minTargets: 2 },
  warcry: { minTargets: 2 },
  wildCall: { rootDuration: 1.4 },
};

// ───────────── Arcanista weapons ─────────────

export type WeaponId = 'ember' | 'frost' | 'thunder' | 'sap';
export type WeaponElement = Exclude<Element, 'arcane' | 'physical'>;

export interface WeaponDef {
  name: string;
  element: WeaponElement;
  level: number; // Arcanista level that unlocks it
  text: string;
  rootChance?: number; // auto-attack (nature)
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ember: { name: 'Cajado de Brasa', element: 'fire', level: 1, text: 'Queima. Com gelo vira DERRETIMENTO; com raio, SOBRECARGA.' },
  frost: { name: 'Cetro de Geada', element: 'ice', level: 1, text: 'Resfria e congela. Prepara ESTILHAÇO e SUPERCONDUÇÃO.' },
  thunder: { name: 'Vara do Trovão', element: 'lightning', level: 2, text: 'Não deixa marca: só detona o que as torres prepararam.' },
  sap: { name: 'Galho de Seiva', element: 'nature', level: 3, text: 'Enraíza. Com fogo vira INCÊNDIO; com gelo, GEADA ESPINHOSA.', rootChance: 0.25 },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

/** What reaching this level unlocks (shown at the end of a match). */
export function unlockAt(cls: HeroClass, level: number): string | undefined {
  const parts: string[] = [];
  for (const id of talentsOf(cls)) if (TALENTS[id].level === level) parts.push(`talento ${TALENTS[id].name}`);
  if (cls === 'mage') for (const id of WEAPON_IDS) if (WEAPONS[id].level === level && level > 1) parts.push(WEAPONS[id].name);
  if (level === HERO_LEVELS.skill2Level) parts.push(SKILL2[cls].name);
  return parts.length ? parts.join(' + ') : undefined;
}
