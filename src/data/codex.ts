// Códice: what the player has discovered (enemies met, reactions caused), with readable descriptions.
import { ELEMENTS, type Element } from './elements';
import { ENEMIES, type EnemyId } from './enemies';
import { REACTION_TABLE, REACTIONS, type ReactionId } from './reactions';

export const CODEX_ENEMIES: EnemyId[] = ['slime', 'wolf', 'bat', 'golem', 'salamander', 'yeti', 'skeleton', 'shaman', 'mudling', 'colossus', 'treasure', 'herald', 'sentinel', 'devourer'];

export const REACTION_EFFECT: Record<ReactionId, string> = {
  wildfire: '×2 de dano e o fogo pula para quem está perto',
  melt: '×1,75 de dano',
  thornfrost: 'Prende pelo dobro do tempo e deixa Frágil',
  shatter: '×1,5 de dano e quebra o gelo',
  overload: '×1,5 de dano e explode em área',
  superconduct: '×1,25 de dano e deixa Frágeis os vizinhos',
};

const AURA_NAME: Record<string, string> = { burning: 'Queimando', chilled: 'Resfriado', frozen: 'Congelado', rooted: 'Enraizado' };

/** "Queimando + Natureza  ou  Enraizado + Fogo" */
export function reactionRecipe(id: ReactionId): string {
  return REACTION_TABLE.filter((r) => r.reaction === id)
    .map((r) => `${AURA_NAME[r.aura] ?? r.aura} + ${ELEMENTS[r.trigger].name}`)
    .join('  ou  ');
}

export function reactionName(id: ReactionId): string {
  return REACTIONS[id].name;
}

/** Plain-language profile of an enemy (built from its data so it never goes stale). */
export function enemyFacts(id: EnemyId): string[] {
  const d = ENEMIES[id];
  const facts: string[] = [];
  const speed = d.speed >= 125 ? 'muito rápido' : d.speed >= 95 ? 'rápido' : d.speed <= 60 ? 'lento' : 'velocidade normal';
  facts.push(`Vida ${d.hp} • ${speed}`);
  if (d.flying) facts.push('Voa: a Vinha não alcança');
  if (d.rootImmune) facts.push('Não pode ser enraizado');
  for (const [el, r] of Object.entries(d.resist) as [Element, number][]) {
    const name = ELEMENTS[el].name;
    if (r >= 1) facts.push(`Imune a ${name}`);
    else if (r > 0) facts.push(`Resiste a ${name} (−${Math.round(r * 100)}%)`);
    else facts.push(`Fraco a ${name} (+${Math.round(-r * 100)}%)`);
  }
  if (d.livesCost === 0) facts.push('Não tira vida: só foge com o ouro');
  else if (d.livesCost > 1) facts.push(`Tira ${d.livesCost} vidas se chegar ao cristal`);
  if (d.boss?.shields) facts.push(`Chefe com escudos: ${d.boss.shields.reactions.map((r) => REACTIONS[r].name).join(' → ')}`);
  else if (d.boss) facts.push('Chefe: fica imune a Resfriado e chama ajuda');
  return facts;
}
