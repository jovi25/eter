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

## 4. Coleção e evolução

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
