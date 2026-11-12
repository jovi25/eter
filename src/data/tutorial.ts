// Tutorial: short tips shown the first time something happens, spread over the 5 stages of Region 1.
// Each tip shows once per device (the match pauses while it is on screen). Texts in plain Portuguese.

export type TipId =
  | 'build'
  | 'elements'
  | 'hero'
  | 'callWave'
  | 'reaction'
  | 'combo'
  | 'upgrade'
  | 'twoPaths'
  | 'resist'
  | 'boon'
  | 'flying'
  | 'skill'
  | 'fewSlots'
  | 'maxLevel'
  | 'runes'
  | 'boss'
  | 'rift'
  | 'altar';

export interface TipDef {
  title: string;
  text: string;
}

export const TIPS: Record<TipId, TipDef> = {
  // ── Fase 1: o básico ──
  build: { title: 'Construa uma torre', text: 'Toque num círculo com + perto do caminho e escolha uma torre. Os monstros não podem chegar ao Cristal!' },
  elements: { title: 'Elementos', text: 'Cada torre tem um elemento: Fogo, Gelo, Natureza, Raio ou Físico. Misturar elementos é o segredo do Éter.' },
  hero: { title: 'Seu herói', text: 'O herói ataca sozinho. Toque no chão para levá-lo aonde a luta está mais difícil.' },
  callWave: { title: 'Chamar a onda', text: 'Pronto antes da hora? Chame a próxima onda e ganhe ouro extra pela coragem.' },
  reaction: { title: 'REAÇÃO!', text: 'Dois elementos no mesmo monstro causam uma reação com dano extra. Ex.: Queimando + Natureza = INCÊNDIO. Todas ficam no Códice.' },
  combo: { title: 'Combo', text: 'Reações seguidas formam um COMBO e cada uma bate mais forte. Não deixe o combo esfriar!' },
  upgrade: { title: 'Melhore suas torres', text: 'Toque numa torre construída para melhorá-la. No nível 3 ela ganha um poder especial.' },
  // ── Fase 2: estratégia ──
  twoPaths: { title: 'Duas entradas', text: 'Os monstros vêm por dois lados. Use torres que alcancem os dois caminhos.' },
  resist: { title: 'Fraquezas', text: 'Alguns monstros resistem a um elemento. Nos números de dano, ▲ quer dizer fraco e ▼ quer dizer resiste.' },
  boon: { title: 'Bênção de Éter', text: 'A cada 3 ondas você escolhe 1 poder para esta partida. Eles se acumulam: monte sua estratégia!' },
  // ── Fase 3 ──
  flying: { title: 'Voadores', text: 'Monstros voadores passam por cima das raízes: a Vinha não os alcança.' },
  skill: { title: 'Habilidade do herói', text: 'O botão no canto mostra a habilidade do herói. Ela é usada sozinha, e cada reação diminui o tempo de recarga.' },
  // ── Fase 4 ──
  fewSlots: { title: 'Poucos espaços', text: 'Aqui há só 5 lugares para torres. Melhorar vale mais que espalhar.' },
  maxLevel: { title: 'Reforço', text: 'Torre no nível 3? Agora você pode comprar Reforço: mais dano sem limite, ficando mais caro a cada vez.' },
  runes: { title: 'Runas', text: 'As pedras rúnicas no chão não ocupam espaço de torre. Uma Runa acelera ou fortalece as torres perto dela.' },
  // ── Fase 5 ──
  boss: { title: 'Chefe MVP', text: 'O Arauto da Geada fica imune a Resfriado de tempos em tempos e chama gosmas. Guarde dano forte para ele.' },
  // ── Depois do tutorial ──
  rift: { title: 'Fenda Infinita', text: '40 ondas cada vez mais duras. Quanto mais longe, mais moedas para o Relicário.' },
  altar: { title: 'Altar de Éter', text: 'Ouro sobrando? Toque no ALTAR e troque ouro por uma Bênção extra.' },
};
