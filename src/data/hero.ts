// The hero (Arcanista). Numbers are starting points.

export const HERO = {
  name: 'Arcanista',
  start: { x: 360, y: 690 },
  speed: 230, // px/s when walking to a tapped spot
  bounds: { minX: 30, maxX: 690, minY: 140, maxY: 1150 },
  attack: {
    damage: 12, // arcane: neutral, never reacts
    rate: 1.2, // attacks per second
    range: 150,
    projectileSpeed: 750,
  },
  catalyze: {
    cooldown: 12, // seconds
    radius: 140, // px around the hero
    damage: 30, // of the affinity element
    burnDps: 8, // if the affinity is Fire and the enemy has no reacting aura
    rootChance: 0.6, // if the affinity is Nature
    cooldownPerReaction: 0.5, // every reaction anywhere on the map shortens the cooldown
  },
};
