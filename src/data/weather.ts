/**
 * Clima (Região 4, Ilhas do Vazio): some waves bring weather that changes which towers shine.
 * The forecast shows one wave ahead, so there is time to rebuild. Durations in seconds from the wave start.
 */
export type WeatherId = 'rain' | 'wind' | 'eclipse';

export interface WeatherDef {
  name: string; // UI (pt-BR)
  icon: string; // emoji shown in the HUD chip
  text: string; // one line: what it does
  color: number; // tint of the banner / overlay
  duration: number;
  /** Damage multiplier per element while it lasts (missing = ×1). */
  damage?: Partial<Record<'physical' | 'fire' | 'ice' | 'nature' | 'lightning', number>>;
  noBurn?: boolean; // puts out Queimando and blocks new burns
  flyerSpeed?: number; // speed multiplier of flying monsters
  reactionMult?: number; // reaction damage multiplier
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  rain: {
    name: 'Chuva',
    icon: '🌧',
    text: 'Fogo −40%, Raio +30%, nada queima',
    color: 0x6fa8ff,
    duration: 30,
    damage: { fire: 0.6, lightning: 1.3 },
    noBurn: true,
  },
  wind: {
    name: 'Ventania',
    icon: '🌪',
    text: 'Voadores +50% de velocidade, flechas +30%',
    color: 0xc8f0d8,
    duration: 30,
    damage: { physical: 1.3 },
    flyerSpeed: 1.5,
  },
  eclipse: {
    name: 'Eclipse',
    icon: '🌑',
    text: 'Reações causam o dobro por 10 s',
    color: 0xb57bff,
    duration: 10,
    reactionMult: 2,
  },
};
