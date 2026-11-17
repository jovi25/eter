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
  | 'scroll'
  | 'gate'
  | 'shield'
  | 'rift'
  | 'altar'
  | 'fireVine'
  | 'iceStorm'
  | 'evolveFuse'
  | 'archer'
  | 'bridge'
  | 'links'
  | 'healer'
  | 'weather'
  | 'thief'
  | 'prism'
  | 'wind';

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
  // ── Tutorial: uma torre nova por fase ──
  archer: { title: 'A Arqueira', text: 'Dispara rápido, acerta voadores e de vez em quando dá um golpe crítico. É a base de qualquer defesa.' },
  fireVine: { title: 'Fogo e Planta', text: 'O Braseiro queima em área; a Vinha prende no chão. Fogo num monstro preso (ou Natureza num que queima) = INCÊNDIO, que espalha chamas!' },
  iceStorm: { title: 'Gelo e Raio', text: 'O Cristal Gélido resfria e congela; o Trovão salta entre inimigos. Raio em quem está gelado = SUPERCONDUÇÃO; em quem está congelado = ESTILHAÇO.' },
  links: { title: 'Vínculo de Éter', text: 'Torres vizinhas de tipos diferentes ficam ligadas por um fio de luz. A cada 5 disparos, cada uma acerta também com o elemento da outra. Misture os tipos lado a lado para fazer reações!' },
  evolveFuse: { title: 'Evoluir e Fundir', text: 'Leve uma torre ao nível 3 e toque nela: escolha GOLPE FINAL (forte e lento) ou CONSTANTE (sem parar), ou FUNDA duas torres vizinhas em uma só.' },
  // ── Fase 2: estratégia ──
  twoPaths: { title: 'Duas entradas', text: 'Os monstros vêm por dois lados. Use torres que alcancem os dois caminhos.' },
  resist: { title: 'Fraquezas', text: 'Alguns monstros resistem a um elemento. Nos números de dano, ▲ quer dizer fraco e ▼ quer dizer resiste.' },
  boon: { title: 'Bênção de Éter', text: 'A cada 3 ondas você escolhe 1 poder para esta partida. Eles se acumulam: monte sua estratégia!' },
  // ── Fase 3 ──
  flying: { title: 'Voadores', text: 'Monstros voadores passam por cima das raízes: a Vinha não os alcança.' },
  skill: { title: 'Habilidade do herói', text: 'O botão no canto mostra a habilidade do herói. Ela é usada sozinha, e cada reação diminui o tempo de recarga.' },
  // ── Fase 4 ──
  fewSlots: { title: 'Poucos espaços', text: 'Aqui há só 5 lugares para torres. Melhorar vale mais que espalhar.' },
  maxLevel: { title: 'Evolução!', text: 'Torre no nível 3? Toque nela: escolha uma de duas Evoluções, ou FUNDA com outra torre nível 3 por perto (de um elemento que reage) e libere um espaço. É a última melhoria: escolha bem onde e com quem.' },
  runes: { title: 'Runas', text: 'As pedras rúnicas no chão não ocupam espaço de torre. Uma Runa acelera ou fortalece as torres perto dela.' },
  // ── Fase 5 ──
  boss: { title: 'Chefe MVP', text: 'O Arauto da Geada fica imune a Resfriado de tempos em tempos e chama gosmas. Guarde dano forte para ele.' },
  // ── Depois do tutorial ──
  rift: { title: 'Fenda Infinita', text: '40 ondas cada vez mais duras. Quanto mais longe, mais moedas para o Relicário.' },
  altar: { title: 'Altar de Éter', text: 'Ouro sobrando? Toque no ALTAR e troque ouro por uma Bênção extra.' },
  // ── Região 3 ──
  bridge: { title: 'Ponte levadiça', text: 'Toque na ponte para erguê-la: os monstros que andam ficam parados na frente dela por 4 s (voadores passam). Depois ela precisa de um tempo para subir de novo.' },
  healer: { title: 'Monge do Gelo', text: 'Ele cura os monstros em volta a cada 3 s. Derrube-o primeiro!' },
  wind: { title: 'Torre do Vento', text: 'Empurra os monstros e os deixa Soprados. Vento + Queimando = LABAREDA, Vento + Resfriado = VENDAVAL GELADO, Raio + Soprado = TORMENTA.' },
  // ── Região 4 ──
  weather: { title: 'Clima', text: 'Nas Ilhas do Vazio o tempo muda. O ícone no alto avisa o clima da PRÓXIMA onda: Chuva enfraquece o Fogo e fortalece o Raio, Ventania acelera os voadores, Eclipse dobra as reações.' },
  thief: { title: 'Diabrete Ladrão', text: 'No meio do caminho ele rouba ouro e corre. Pegue-o antes que fuja: ele devolve o DOBRO.' },
  prism: { title: 'Prisma do Vazio', text: 'Ele troca de elemento 4 vezes: resiste a um e é fraco contra outro. A cor dele mostra a forma; mude a defesa quando ele mudar.' },
  // ── Região 2 ──
  scroll: { title: 'Mapa maior', text: 'Os mapas dos Ermos são mais altos que a tela: arraste para cima e para baixo. As setas ▲ ▼ contam os inimigos fora da tela.' },
  gate: { title: 'Comporta', text: 'Toque na placa da Comporta para mandar os próximos inimigos pelo outro caminho. Os que já passaram não mudam.' },
  shield: { title: 'Escudo elemental', text: 'Este chefe quase não sente dano enquanto o escudo está de pé. Só a reação escrita nele quebra o escudo: monte as torres certas!' },
};
