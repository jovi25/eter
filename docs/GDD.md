# ÉTER — Game Design Document

> Fonte da verdade do design. Atualize sempre que algo mudar.
> Números aqui são pontos de partida; os valores vigentes ficam em `src/data/*.ts`.

## 1. Visão

Você é um **Guardião** que defende cristais de Éter contra hordas, evoluindo seu herói e
colecionando equipamentos e cartas de monstros: progressão de MMORPG clássico em partidas de **~3 minutos**.
Tower defense mobile, retrato, jogável com uma mão.

**Três ganchos**
1. **Combos elementais legíveis e espetaculares**: torres aplicam auras; outro elemento acerta e dispara uma *reação* com nome na tela.
2. **O herói é o catalisador**: a habilidade dele detona reações em área; cada reação reduz o cooldown dele.
3. **Relicários**: abertura com escalada de raridade por toques e revelação carta a carta.

Estética: 2D fofa de fantasia, *inspirada* em MMOs clássicos. Tudo original ou CC0. Nenhum nome, sprite ou som de outro jogo.

## 2. A partida

- **Mapa:** 1 caminho serpenteando do portal (topo) ao Cristal de Éter (base). **8 slots fixos** de construção.
- **Ondas:** 10; a 10ª é o **Chefe MVP**. Alvo ~3 min em 1×. Botão **2×**. **Chamar onda** antecipada → bônus de ouro proporcional ao tempo restante.
- **Vidas:** 20. Estrelas: 3★ = 18+ vidas, 2★ = 10+, 1★ = vitória.
- **Ouro:** começa com 120; ganho por abate e por onda limpa.
- Tocar num slot vazio → menu radial de construção. Tocar numa torre → melhorar / vender (70% do total investido).
- **Dificuldade:** vida dos inimigos ×1,15 por onda.

### 2.1 Torres (3 níveis dentro da partida)

| Torre | Elemento | Custo | Comportamento |
|---|---|---|---|
| Arqueiro | Físico | 50 | Alvo único, rápido. Não aplica status. |
| Braseiro | Fogo | 70 | Projétil com splash pequeno; aplica **Queimando**. |
| Cristal Gélido | Gelo | 70 | Alvo único; aplica **Resfriado**. |
| Vinha Ancestral | Natureza | 60 | Alvo único lento; chance de aplicar **Enraizado**. |
| Torre do Trovão | Raio | 80 | Instantâneo: acerta o alvo e salta para os inimigos mais próximos (3/4/5 alvos, alcance do salto 120–140 px), perdendo ~25–30% de dano por salto. Não aplica aura. Pedido do jogador após a Fase 2. |

### 2.2 Status (auras)

- **Queimando**: dano contínuo por 3 s.
- **Resfriado**: −30% velocidade por 2,5 s; acumula até 3; no 3º acúmulo vira **Congelado** (parado 1 s).
- **Enraizado**: parado 1 s; depois **imune a Enraizado por 2 s**.
- **Frágil** (só via reação): +25% dano recebido por 3 s. Não é aura (não é consumida por reações).

### 2.3 Reações

Um inimigo com aura recebe acerto de *outro* elemento → a aura é consumida e a reação dispara.

| Aura | Acerto de | Reação | Efeito |
|---|---|---|---|
| Enraizado | Fogo | **INCÊNDIO** | Dano de fogo ×2 + Queimando se espalha num raio de 60 px |
| Queimando | Natureza | **INCÊNDIO** | idem |
| Resfriado/Congelado | Fogo | **DERRETIMENTO** | Dano ×1,75, remove o slow |
| Queimando | Gelo | **DERRETIMENTO** | idem |
| Resfriado/Congelado | Natureza | **GEADA ESPINHOSA** | Enraizado com duração ×2 (ignora imunidade) + Frágil |
| Enraizado | Gelo | **GEADA ESPINHOSA** | idem |
| Congelado | Físico | **ESTILHAÇO** | Dano ×1,5 |
| Congelado | Raio | **ESTILHAÇO** | Mesmo efeito — a corrente estilhaça grupos congelados |

**Regras de resolução (decisões padrão, ver §10):**
- O acerto que dispara a reação **não aplica a sua própria aura** (a aura é consumida e o golpe vira reação).
- Acerto do **mesmo** elemento da aura atual só renova/acumula a aura.
- Físico e Arcano nunca aplicam aura. Físico só reage com Congelado. Arcano nunca reage.
- Se o inimigo tem mais de uma aura (ex.: Resfriado + Queimando), a ordem de prioridade da tabela de dados decide qual é consumida.

### 2.4 Combo
Reações em sequência (janela de 2 s) aumentam o contador: ×1,0 → máx ×1,5 de dano de reação (+0,05 por reação). Zera se a janela passar.

### 2.5 Inimigos

- **Gosma**: básico.
- **Lobo Ligeiro**: rápido, pouca vida.
- **Golem de Casca**: tanque, −40% dano físico.
- **Morcego Sombrio**: voador. Imune a Enraizado (inclusive o da GEADA ESPINHOSA, que nele só aplica Frágil). A Vinha não o alcança, salvo com a Carta Morcego Sombrio.
- **Chefe MVP — Arauto da Geada**: vida alta; a cada 6 s fica imune a Resfriado por 2 s e invoca 3 Gosmas. Ao morrer: faixa **"MVP!"**, câmera lenta de 0,5 s, carta do chefe garantida na primeira vitória.

## 3. O herói — Arcanista

- Em campo; tocar no chão livre move o herói. Ataque automático no inimigo mais próximo, dano **arcano** (não reage).
- **Afinidade elemental** = elemento da arma equipada. Começa com **Cajado de Brasa** (Comum, Fogo).
- **Catalisar** (cooldown 12 s): explosão em área com o elemento da afinidade → dispara reações em todos os inimigos com aura na área.
- **Cada reação no mapa reduz 0,5 s** do cooldown do Catalisar.
- Não morre no MVP.
- **Progressão:** nível da conta (XP por partida) dá atributos e libera slots: Arma (nv 1), Armadura (nv 3), Amuleto (nv 5).
- Tela de herói *paper doll*: personagem no centro, 3 slots ao redor, atributos e afinidade.

### Decisões da Fase 3
- Arcanista começa no centro do mapa (360, 690); anda a 230 px/s em linha reta até o ponto tocado (pode cruzar o caminho; não bloqueia inimigos).
- Tocar no chão livre com um menu aberto só fecha o menu (não move o herói).
- Ataque: 12 de dano arcano, 1,2/s, alcance 150, no inimigo mais próximo (inclui voadores).
- Catalisar: raio 140 px, 30 de dano do elemento da afinidade; inimigos sem aura reagível recebem a aura (Fogo: Queimando 8/s).
- Cada reação no mapa (inclusive as do próprio Catalisar) tira 0,5 s da recarga. Visual: uma orbe voa da reação até o botão.
- 3+ reações num único Catalisar: faixa "CATÁLISE ×N!".

### Habilidades de nível máximo (pedido do jogador, durante a Fase 3)
Objetivo: recompensar melhorar torres em vez de só espalhar muitas. Ativas só no nível 3 (aura colorida na torre; o menu mostra a prévia desde o nível 1).

| Torre | Habilidade | Efeito |
|---|---|---|
| Arqueiro | Rajada | A cada 4º disparo, flechas extras em até 2 outros inimigos (3 no total) |
| Braseiro | Chão em Chamas | O impacto deixa chão em chamas (raio 55, 3 s): inimigos terrestres ali ficam Queimando (12/s). Não dispara reação. |
| Cristal Gélido | Frio Profundo | Cada acerto aplica 2 acúmulos de Resfriado |
| Vinha Ancestral | Raízes Profundas | Ao enraizar, prende também os 2 vizinhos mais próximos (raio 75; respeita imunidade e voadores) |
| Torre do Trovão | Supertensão | A cada 3º raio: dobro de saltos e sem perda de dano |

Medido com robô (3 seeds): 5 torres no máximo vencem 3★, igual a 8 torres espalhadas; 4 torres no máximo perdem para o chefe.
Nota: com o herói ajudando, a fase 1 ficou fácil para estratégias de combo (20 vidas); ajuste fino fica para a Fase 5.

## Fase 4a — Região 1 completa (pedido do jogador)
### Mapas (cada um pede uma estratégia)
| Fase | Mapa | Ideia |
|---|---|---|
| 1 Campos de Vellmora I | Zigue-zague | Ensina o básico (fácil de propósito) |
| 2 Campos de Vellmora II | Duas Entradas | Dois portais que se juntam: os espaços da junção valem ouro |
| 3 Pântano de Vellmora | O Anel | Estrada em volta de um platô: cada espaço cobre duas estradas, melhorar compensa |
| 4 Desfiladeiro | Corredor | Caminho curto e só 5 espaços: torres no máximo + herói decidem |
| 5 Trono da Geada | Bifurcação | Estrada se divide e se junta; inimigos alternam lados; espaços do meio alcançam os dois |
Mapas alinhados a uma grade de 48 px (ladrilhos de 16 px ×3). Grupos de ondas podem escolher o caminho; sem escolha, alternam.

### Resistências e fraquezas por elemento
Cada inimigo tem uma tabela: 0,4 = toma 40% menos; −0,5 = toma 50% a mais; 1 = imune. Reações usam a resistência do elemento que disparou. Números na tela: "IMUNE", "▲" (fraco), "▼" (resiste). Na primeira aparição de cada inimigo especial, um cartão "NOVO INIMIGO" mostra fraquezas.
| Inimigo | Resistências / fraquezas |
|---|---|
| Gosma, Lobo Ligeiro | neutros |
| Golem de Casca | Físico −40% |
| Morcego Sombrio | voa |
| Chifrudo de Brasa | **imune a Fogo** (ainda recebe a aura → combos), fraco a Gelo |
| Zumbi Gélido | resiste 80% a Gelo, fraco a Fogo |
| Esqueleto | resiste Físico 60% e Natureza 50%, fraco a Raio |
| Xamã Orc | resiste Raio 60% e Arcano 50%, fraco a Físico |
| Lamacento | resiste Natureza 70%, **não pode ser enraizado**, fraco a Fogo |
| Colosso do Pântano | mini-chefe; resiste Físico/Gelo, fraco a Raio |

### Dificuldade (medida por robô, `npm run balance`)
Fase 1: tudo vence. Fases 2–5: só Arqueiros perde; estratégias de combo/foco vencem com cada vez menos vidas. Teste fixo: a fase 5 não é vencível só com Arqueiros, mas um build de combo vence.

### Arte
- Testamos pixel art CC0 (0x72 + Kenney) e **o jogador preferiu o estilo pintado anterior** — voltamos a ele. Pacotes de pixel art removidos do projeto.
- Tudo é pintado por código (Canvas2D: degradês, brilho, contorno suave): inimigos novos (Chifrudo de Brasa, Zumbi Gélido, Esqueleto, Xamã Orc, Lamacento, Colosso do Pântano) e **herói redesenhado** (chibi: cabeça grande, cabelo lilás, chapéu de aba larga, capa, cajado de lua crescente).
- Mapa pintado suporta vários caminhos (estradas se fundem nas junções); mapa-mundo usa o mesmo estilo.
- Nomes originais voltaram para combinar com a arte: Lobo Ligeiro, Golem de Casca, Morcego Sombrio.

### Progresso
- Save versionado em localStorage (`eter.save`, com migrações) + backup em texto (copiar/restaurar no mapa-mundo).
- Mapa-mundo da Região 1: fases liberadas em sequência, melhores estrelas, "próxima fase" no fim da partida.

## Fase 4b — Classes de herói (pedido do jogador; substitui o Catalisar manual)
**Nada é ativado à mão.** Cada herói ataca sozinho do jeito da classe e a habilidade dispara sozinha quando vale a pena. O botão virou indicador de recarga ("AUTO"). Tocar no chão continua movendo o herói. Cada reação no mapa tira 0,5 s da recarga, para todas as classes.

| Classe | Ataque automático | Habilidade automática | Liberação |
|---|---|---|---|
| Arcanista | Magias do elemento da arma (aplicam aura) | Catalisar (2+ inimigos perto) | Desde o início |
| Cavaleiro | Corpo a corpo físico; segura até 2 inimigos | Golpe Giratório (2+ perto) | Vencer fase 1 |
| Druida | Espinhos com chance de enraizar + urso que segura 2 inimigos | Fúria da Natureza: enraíza em volta e cura o urso (3+ perto) | Vencer fase 2 |
| Sacerdotisa | Ataque fraco; torres perto dela atacam 20% mais rápido | Bênção: torres perto +35% de dano por 5 s | Vencer fase 3 |

**Bloqueio:** Cavaleiro e urso seguram inimigos terrestres perto do seu posto; os inimigos param e revidam (força em `src/data/enemies.ts`). Voadores passam por cima. Quem cai solta os inimigos e volta depois (Cavaleiro 8 s, urso 10 s).
Heróis pintados em chibi anime **original**, inspirados no estilo de RPGs online clássicos, sem copiar personagens. Números em `src/data/heroes.ts`.

### Espaços de construção (revisão)
Regra travada por teste: todo espaço alcança pelo menos 250 px de estrada e fica a pelo menos 90 px da borda. O menu de construção desliza para dentro da tela perto das bordas. Vida dos inimigos recalibrada: fase 2 ×0,77, fase 3 ×1,05.

## Fase 5 — "Mais uma partida" (carta branca do jogador, nov/2026)
Objetivo: dar motivo para jogar de novo. Plano completo em `docs/ROADMAP.md` (Plano 2.0).

### Bênçãos de Éter
- Quando as ondas 2, 5, 8, 11... terminam de entrar, a partida pausa e o jogador escolhe **1 de 3** bênçãos.
- Elas **se acumulam** e valem só naquela partida. 17 bênçãos em 3 raridades (Comum 6 : Rara 3 : Épica 1 no sorteio).
- Sorteio com RNG próprio derivado da seed (não mexe nos sorteios de combate). Dados em `src/data/boons.ts`.
- Exemplos: Zero Absoluto (congela com 1 acúmulo a menos), Coração da Tempestade (+3 saltos de raio), Catalisador Instável (reações +35%).

### Reações de Raio
| Aura | Acerto | Reação | Efeito |
|---|---|---|---|
| Queimando | Raio | **SOBRECARGA** | Dano ×1,5 e explosão: 60% do golpe em quem estiver a até 75 px |
| Resfriado | Raio | **SUPERCONDUÇÃO** | Dano ×1,25 e Frágil no alvo e nos vizinhos (75 px) |
| Congelado | Raio | ESTILHAÇO | (já existia) |

### Gosma Dourada
35% de chance por onda (da 2ª em diante): corre rápido, **não tira vida** se escapar, paga 45 de ouro (escala com bônus).

### Fenda Infinita
40 ondas geradas por fórmula (iguais para todos), vida ×1,15 por onda, chefes a cada 5 e 10 ondas, bênção a cada 3.
Libera ao vencer a fase 2. Recorde (onda alcançada) salvo no save v3.

### Heróis em camadas
Cada herói é pintado em 3 peças (capa, corpo, braço com arma). O braço gira no ombro: ataque à distância (estocada + clarão na ponta),
corpo a corpo (golpe largo + investida) e habilidade (arma erguida). O herói **desliza** (sem pular), inclina o corpo e a capa fica para trás.
Proporção esbelta (cabeça ≈ 1/3 da altura), inspirada em sprites de RPG online clássico, com desenhos originais.

### Dificuldade recalibrada
Como bênçãos deixam o jogador mais forte: fase 2 ×0,9, fase 3 ×1,2, fase 4 ×1,08, fase 5 ×0,9 (robôs já escolhem bênçãos).

## Fase 6 — Maestria
### Reforço (pedido do jogador: na Fenda o ouro sobrava)
Torre no nível 3 troca "melhorar" por **Reforço**: +12% de dano por compra, sem limite. Custo 90 × 1,3ⁿ (afetado por Mestre de Obras). Vale em todos os modos.

### Desafios por fase
3 por fase, só contam em vitória; ficam salvos (save v4). Tipos: nº de reações, reação específica, vidas mínimas, máximo de torres ao mesmo tempo, sem construir uma torre, vencer com um herói. Lista em `src/data/challenges.ts`.

### Desafio do dia
A data define fase, herói (mesmo os ainda não liberados), bênção inicial e seed — igual para todos. Não conta para o progresso das fases.
Pontos: vitória +1000, +100 por vida, +10 por reação; em derrota, 60 por onda vencida. Guarda a melhor pontuação do dia.

### Desempenho
A queda de FPS vinha do custo gráfico de recriar a imagem de cada número de dano (3 vezes por golpe). Agora os números usam uma fonte
pré-desenhada (bitmap), as barras de vida são imagens em lote, e o contador de debug e o indicador de recarga redesenham poucas vezes por segundo.

### Altar de Éter (pedido do jogador: na Fenda o ouro ficava parado)
Medido com robôs: na Fenda tudo chega ao nível 3 por volta da onda 10 e depois sobram ~500 de ouro por onda (5.000 parados na onda 20).
- **Altar** (só na Fenda, botão na barra de baixo): paga ouro e escolhe 1 de 3 Bênçãos, com mais chance de Rara/Épica
  (pesos 3/3/2 contra 6/3/1). Custo 300 × 1,25ⁿ. Não oferece bênçãos que dão ouro.
- **Trocar cartas** (todo modo): na tela de Bênção, paga 40, 80, 120... para trocar as 3 cartas por outras.
- Decisão do jogador: ouro vira *poder amplo* (Altar), *poder focado* (Reforço) ou *escolha melhor* (Trocar).
Robôs: o Altar empurra a Fenda de ~onda 20 para ~onda 23–24.

### Códice e estatísticas
Códice (botão no mapa): 12 inimigos e 6 reações, revelados quando aparecem na partida (save v5). Cada inimigo mostra vida,
velocidade, fraquezas e resistências; cada reação mostra a receita e o efeito. Fim da partida: "Ver estatísticas" com dano por
torre/herói e reações por tipo (o exportar CSV foi retirado a pedido do jogador).

### Música
Composta por código (sem arquivos): pad, baixo, arpejo, melodia de 8 compassos gerada por seed e percussão leve.
Cada fase tem tom, modo e andamento próprios. Calma entre ondas, cheia durante a onda, intensa com chefe ou na Fenda a partir da onda 20.
Opção "Música" separada de "Efeitos sonoros" na pausa.

## Fase 7 — Relicários (implementado)
Substitui o desenho antigo de equipamentos/refino/encaixes/cartas (seções 4 e 5 abaixo ficam como histórico).
- **Moedas** (`coins`): vitória 30 + 10 por estrela; derrota 10; 1ª vitória da fase +60; cada desafio novo +40;
  Fenda 4 por onda; desafio do dia +50 na 1ª partida do dia. Save antigo ganha 150 (um baú). Números em `src/data/relics.ts`.
- **Baú**: 150 moedas. Conteúdo sorteado na compra e gravado no save (fechar o jogo não muda o resultado).
  Chances: Comum 55%, Rara 30%, Épica 12%, Lendária 3%. Garantia: no máximo 10 baús seguidos sem Épica ou melhor.
  Abertura: 4 toques; nos 3 primeiros a raridade pode subir (clarão, tremor, cor). Botão Pular.
- **Conteúdo**: 14 Relíquias e 5 Bênçãos bloqueadas (Vinha Trepadeira, Mão Pesada, Flechas de Ferro, Raízes Eternas,
  Derretimento Cortante). Repetida sobe a Relíquia de nível (até 3); se tudo daquela raridade estiver completo, devolve 60 moedas.
- **Relíquias**: até 3 equipadas. Comuns são bônus simples; Raras e Épicas trazem uma troca (Lente de Cristal +dano −alcance,
  Coroa da Tempestade +saltos −Fogo, Pedra do Alquimista +reações −golpe comum, Escudo de Carvalho +vidas −ouro).
  Valem nas fases e na Fenda; **não** no desafio do dia (igual para todos).
- Decisão padrão: 4 raridades (não 5 do desenho antigo) para casar com as cores das Bênçãos + dourado.

## Fase 7b — Tutorial, Runas, menu e desempenho
### Tutorial (Região 1)
Dicas curtas em `src/data/tutorial.ts`. Cada uma aparece **uma vez por aparelho**, pausa a partida e pode apontar com uma seta.
Fase 1: construir, elementos, herói, chamar onda, reação, combo, melhorar. Fase 2: duas entradas, fraquezas, Bênção.
Fase 3: Runas, habilidade do herói, voadores. Fase 4: poucos espaços, Reforço. Fase 5: chefe. Fenda: modo e Altar.
Dicas de evento (reação, voador, chefe...) aparecem onde o jogador encontrar primeiro. "Rever dicas" em Opções.

### Runas
Duas **pedras rúnicas** fixas por mapa, fora da estrada e dos espaços de torre (posições calculadas para alcançar 2–3 espaços).
Disponíveis a partir da fase 3 e na Fenda. Runa de Pressa (+25% velocidade de ataque) ou Runa de Poder (+25% dano)
para as torres a até 175 px. Custam 100 de ouro; vender devolve 70%. Decisão: pedras fixas em vez de construir em qualquer
lugar do chão, porque tocar no chão já move o herói e isso deixa o mapa legível no celular.

### Desempenho e bateria
Modo econômico (Opções/Pausa: Automático, Ligado, Desligado). Automático liga em aparelho com ≤4 núcleos ou ≤3 GB, ou depois
que o jogo ficou abaixo de 25 fps por 5 s. Ligado: tela desenhada a 75% e ampliada, efeitos leves, sem eco no áudio (o limite de 30 fps foi retirado: causava engasgos).
O contador mostra "lógica X ms" e GL/CV para diagnosticar celulares lentos.

## Fase 7c — Evoluções de torre
No nível 3 a torre pode evoluir para **uma** de duas formas finais (dados em `src/data/evolutions.ts`). Reforço continua depois.
Ramo A = golpe final lento e devastador; ramo B = efeito constante com menos dano. Escolha com 2 toques (o 1º mostra o efeito).

| Torre | A (golpe final) | B (constante) |
|---|---|---|
| Gelo | Coroa do Inverno: a cada 9 s congela todos no alcance, 6× dano | Nevasca Eterna: sem tiros; a cada 0,6 s resfria e fere todos no alcance |
| Fogo | Vulcão: a cada 7 s meteoro no maior grupo (4×, raio 115) + chão em chamas | Fornalha: 2,5× velocidade, 45% dano, queima +60% |
| Natureza | Árvore Anciã: a cada 8 s enraíza todos (terrestres) no alcance | Raiz Faminta: todo golpe enraíza, +30% velocidade, 70% dano |
| Raio | Senhor do Trovão: a cada 7 s raios do céu em até 6 inimigos (3×) | Bobina Tesla: 2,5× velocidade, +2 saltos, 42% dano |
| Arqueiro | Atirador de Elite: 45% velocidade, 3,4× dano, +45% alcance, mira no mais forte | Chuva de Flechas: todo disparo acerta 3 inimigos, 75% dano |

O golpe final só dispara com inimigo no alcance (fica carregado esperando). O primeiro vem com 40% do tempo.
Custos 220–240 de ouro (afetados por Mestre de Obras).

### Desempenho (medido)
Cenário: Fenda onda 10–16, 8 torres no máximo/evoluídas, ~25 inimigos, no computador.
Antes: 4,7 ms por quadro em média, picos de 100–140 ms, ~400 animações vivas.
Causa principal: formas vetoriais (botões, barras, auras, raios) eram recalculadas a cada quadro (6,6 ms → 0,3 ms sem elas).
Agora: ~1 ms típico. Formas estáticas viram imagens (`src/view/ui/bake.ts`), raios são pedaços de imagem, números de dano
andam sem animações, textos repetidos são reaproveitados (`LabelPool`), ouro/vidas/combo usam fonte de dígitos pronta.
O limitador de 30 fps foi removido: em telas de 60/90/120 Hz ele entregava quadros em intervalos irregulares (engasgos).

### Desempenho em celular fraco (rodada 3)
Relato: menos de 10 fps num celular fraco em fase normal. A cena é leve em CPU; a suspeita é a placa de vídeo.
- **Atlas único** (`generateTextures`): todos os sprites pintados numa textura 2048². Cada chave continua existindo
  (uma Texture por chave com um frame apontando para o atlas), então o resto do código não muda.
- **`maxTextures: 1`**: com várias texturas por lote o Phaser usa um programa de pixels com até 16 testes por pixel,
  muito lento em GPU fraca. Com 1, usa o mais simples. Custo: ~48 chamadas de desenho por quadro (eram 19), aceitável.
- **`antialiasGL: false`**: sem MSAA na tela.
- **Resolução adaptativa** (`src/view/perf.ts`): 100% → 80% → 65% → 50%. Abaixo de 45 fps por 2,5 s desce um degrau
  (ao vivo, sem recarregar) e grava o nível no aparelho. Abaixo de 50 fps liga efeitos leves (sem brilhos de torre, sem sombras).
  Modo econômico: Automático (adapta), Ligado (começa em 80%), Desligado (100% fixo). Voltar a Automático zera o aprendizado.
- Não verificado em aparelho real: depende de teste do jogador. O contador mostra a resolução atual (ex.: "GL 65%").

### Desempenho em celular fraco (rodada 4)
Print do aparelho: 21 fps com "GL 50%". Baixar a resolução não resolveu, logo o gargalo é o trabalho por objeto/efeito.
Medido em luta intensa (modo econômico): 113 chamadas de desenho, 28 trocas de mistura, 60 envios de buffer e ~58 ondas de
choque vivas por quadro. Mudanças:
- `addBlend()`: em modo econômico brilhos e faíscas usam mistura normal (cada troca normal↔aditiva quebrava o lote).
- Ondas de choque: no máximo 10 (3 no modo leve), animadas à mão, sem tween.
- `maxTextures: 8` (era 1): textos e UI voltam a entrar no mesmo lote do atlas.
- Modo leve: sem chamas, 1 moeda voando por abate, sem rótulo de habilidade de torre, sem animação ociosa em árvores/torres,
  faíscas a 1/3, no máximo 2 números de dano por quadro.
Resultado no mesmo cenário: 22 chamadas de desenho, 0 trocas de mistura, 24 envios de buffer.
O contador agora mostra "quadro X ms" (tempo de CPU do quadro inteiro): se for bem menor que 1000/fps, o limite é a GPU.

### Desempenho em celular fraco (rodada 5): o custo é a chamada de desenho
Medido: a simulação quase não custa (0,05 ms); 86% do quadro é desenho, e o que pesa é cada **chamada de desenho**
(uma imagem com textura própria custa tanto quanto 19 inimigos do atlas). Cada textura separada, cada Graphics e cada
Rectangle abre um lote novo. Mudanças:
- **Atlas de UI** (`src/view/ui/bake.ts`): fundo do mapa, barras do HUD, botões, auras e rótulos fixos vão para uma
  segunda textura 2048² compartilhada (enviada à GPU uma vez por quadro em que algo novo entra).
- Fonte de dígitos dentro do atlas de sprites. `bakeText` para textos que nunca mudam.
- Sem Graphics/Rectangle visíveis na luta: alcance só existe com menu aberto, recarga da habilidade é imagem recortada,
  barra do chefe usa imagens.
Resultado em luta intensa: 113 → 22 → **3 a 4 chamadas de desenho por quadro**.
- Resolução adaptativa agora é um teste: se 4 s depois de baixar o fps não subir 20%, desfaz e nunca mais baixa
  naquele aparelho (o limite é o processador). Aparelhos recomeçam em 100%.
- Sem clarões brancos de tela na batalha (pedido do jogador). Na abertura do Relicário eles continuam.

## 4. Coleção e evolução (desenho antigo, substituído pela Fase 7)

- **Torres como cartas:** nível de coleção 1–5; duplicatas enchem a barra. +8% dano por nível.
- **Início:** Arqueiro, Vinha, Braseiro. **Cristal Gélido** vem no **primeiro relicário (roteirizado)**: sobe até Épico nos toques.
- **Equipamentos:** 5 raridades (Comum cinza, Incomum verde, Raro azul, Épico roxo, Lendário dourado). Cada item: atributo base, **Ressonância** (bônus para torres), 0–2 encaixes, refino +1 a +5 com Essência (sem falha).
- **Cartas de monstro:**
  - Gosma: +5% moedas.
  - Lobo Ligeiro: +10% velocidade de ataque do herói.
  - Golem de Casca: torres físicas ignoram resistência física.
  - Morcego Sombrio: a Vinha acerta voadores.
  - Arauto da Geada: DERRETIMENTO também aplica Frágil.
- Duplicatas de equipamento → Essência.
- **Mapa-mundo:** Região 1 "Campos de Vellmora", 5 fases (5ª = Chefe MVP). Rejogáveis. Sem estamina.

## 5. Relicários e economia

### Moedas
- `gold`: só na partida.
- `coins`: ganhas jogando; compram relicários na loja.
- `gems`: premium, **futuro**. **Gems nunca compram nada aleatório nem convertem em coins.** No MVP só existe o tipo.

### Fontes
1ª vitória de cada fase, conquistas, vitória sobre o Chefe MVP, 1ª vitória do dia, compra com coins.

### Abertura
1. **Pré-sorteio** com RNG de seed no momento da concessão, gravado no save.
2. **Toques:** começa Comum, 4 toques, juice crescente; ao subir raridade: hitstop ~80 ms, raios, troca de cor, nome explodindo. Pode pular níveis.
3. **Explosão e revelação** carta a carta; mais raro = mais antecipação.
4. **Duplicata:** barra de nível enchendo; "NÍVEL UP!".
5. Botões **pular** e **abrir todos**.
6. **Ver chances** + contador de garantia (Épico a cada 10 aberturas sem Épico).
7. Lendário → faixa "anúncio do servidor" no topo.

Chances: Comum 45%, Incomum 30%, Raro 17%, Épico 6%, Lendário 2%.

### Missões e conquistas
~15 conquistas que ensinam mecânicas e pagam relicários. 3 missões diárias que pagam coins.

## 6. Arte, som e juice

- Arte procedural no MVP (formas com contorno, gradientes, cores por elemento: Fogo laranja/vermelho, Gelo ciano, Natureza verde, Físico bege, Arcano roxo). Inimigos fofos (corpo + olhos) com "respiração".
- Troca futura por CC0 via `src/assets/manifest.ts`.
- Juice: números de dano saltando, nome da reação + combo, hitstop, tremor de tela (desligável), moedas voando, pop ao construir, câmera lenta no chefe.
- Sons gerados por código (estilo sfxr). Sem música no MVP.
- Opções: som, vibração, tremor.

## 7. No radar (não implementar agora)
Co-op estilo Legion TD; online/nuvem; Passe de Missões e loja de gems; novas classes; elementos Raio e Sombra; torres de fusão; chefe com respawn real; guildas; Capacitor; classificação indicativa / ECA Digital antes de monetizar.

## 10. Decisões padrão registradas
Decisões que o kickoff não especificou e que tomei (podem ser revistas):
- Reação consome a aura e o golpe que disparou **não** aplica sua aura.
- Morcego (voador) nunca é enraizado; GEADA ESPINHOSA nele só aplica Frágil.
- Venda devolve 70% do **total investido** (construção + melhorias).
- Combo: +0,05 por reação encadeada, teto ×1,5.
- Simulação a 30 ticks/s; coordenadas da simulação em pixels do mundo 720×1280.
- **Resfriado** dá −30% fixo (não −30% por acúmulo); os acúmulos só contam para virar Congelado. Golpe de Gelo em inimigo Congelado não faz nada.
- **INCÊNDIO** espalha Queimando (8 de dano/s) para os *vizinhos*, não para o próprio alvo (a aura dele foi consumida).
- Dano de Queimando é dano puro: nunca dispara reação.
- Ao entrar na imunidade a Resfriado, o Arauto também se livra do frio que tinha.
- **Gosmas invocadas pelo Arauto** têm a vida base (60), sem a escala da onda; antes elas viravam um escudo de ~210 de vida cada na frente do chefe.
- Torres miram no inimigo que está **mais à frente** no caminho.
- Uma onda só pode ser chamada antes da hora depois que a anterior terminou de entrar no mapa.
- Primeira onda começa sozinha após 20 s de preparação; intervalo de 8 s entre ondas.

### Decisões da Fase 2 (partida jogável)
- **As 4 torres estão liberadas** na partida até a Fase 4 existir; aí o Cristal Gélido passa a vir do primeiro relicário.
- Construir é **um toque** na opção do menu radial (sem confirmação). Torre construída: tocar abre alcance + melhorar/vender.
- Nome de reação na tela tem intervalo mínimo de 0,38 s; as demais reações do mesmo instante mostram só faíscas e número colorido (legibilidade).
- Dano de Queimando é somado e exibido **uma vez por segundo** por inimigo.
- Hitstop de 70 ms nas reações, no máximo a cada 0,35 s. Tremor leve em INCÊNDIO/ESTILHAÇO, forte ao perder vida.
- Morte do chefe: simulação a 20% por 0,5 s + faixa "MVP!".
- Faixas grandes (onda, chefe) entram em fila para não se sobrepor.
- Overlay de debug (fps/tick/seed) fica no canto inferior esquerdo; tocar nele deixa quase transparente.

### Melhorias pós-Fase 2 (pedido do jogador)
- **Torre do Trovão** (Raio). Decisão: Raio não ganha reações próprias; só **Congelado + Raio = ESTILHAÇO**. Medido: só Trovões perde a fase 1; Trovão dentro de combos vence 3★.
- **Arte** repintada com Canvas2D (degradês, brilho, contornos suaves, sombras), fundo do mapa pintado. Teto conhecido: para "2D fofo de MMO" de verdade, sprites desenhados (CC0) via manifesto.
- **Sons** refeitos: vozes em camadas com desafinação, filtros com varredura, FM para metal/eletricidade, reverb por convolução, compressor e variação de tom por disparo. Cada reação tem som próprio.
- Menu radial em círculo para 5 torres, com nomes curtos.

## 11. Balanceamento — notas da Fase 1
Medido com um jogador-robô que constrói nos melhores espaços e melhora as torres em ordem:
- Só Arqueiros: perde na onda 10. Build com combos (Vinha + Braseiro + Gelo): vence 3★ em ~3 min 08 s, com 25–70 reações.
- O teste `design check` em `tests/sim/match.test.ts` trava essa intenção: combos vencem a fase 1 em 150–240 s.
- Ajustes feitos a partir dos valores do kickoff: recompensa de abate maior (Gosma 9, Lobo 8, Golem 20, Morcego 11), bônus de onda 20 + 4×onda, torres elementais com dano próprio comparável ao Arqueiro, Arauto com 1300 de vida.

## Fase 8 — Heróis com identidade
Cada herói sobe de nível jogando (1 XP por onda vencida, +5 na vitória; níveis em 10/30/60/100 XP). Saves antigos começam com 7 XP por estrela.
Nos níveis 2, 3 e 4 libera um talento; o jogador equipa **1** na ficha do herói (botão abaixo dos retratos no cartão da fase).

| Herói | Nv 2 | Nv 3 | Nv 4 | 2ª habilidade (nv 5) |
|---|---|---|---|---|
| Arcanista | Catalisador Distante (Catalisar no maior grupo) | Disparo Triplo (3 alvos, 60%) | Pacto do Combo (1,2 s por reação, −40% dano) | Chuva Elemental (6 golpes, 18 s) |
| Cavaleiro | Muralha (segura 4, +50% vida, −30% dano) | Duelista (segura 1, ×2,2 dano, cura 15% por abate) | Estandarte (torres perto +18% dano) | Grito de Guerra (Frágil em volta, 16 s) |
| Druida | Urso Ancião (urso +70% vida, segura 3, +40%) | Espinheiro (espinhos em área) | Solo Sedento (enraizados +25% dano) | Chamado Selvagem (urso volta/cura e enraíza, 20 s) |
| Sacerdotisa | Coro (aura 300, +12%) | Foco (Bênção numa torre, +110%, 7 s) | Luz Punitiva (ataque ×3 em área, sem aura) | Graça (+1 vida, 30 s) |

**Armas do Arcanista:** Brasa (fogo), Geada (gelo), Trovão (raio, nv 2: não marca, só detona), Seiva (natureza, nv 3: enraíza).
Números em . Desafio do dia não usa talentos/arma/2ª habilidade.
