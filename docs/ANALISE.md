# Análise crítica do Éter (novembro de 2026, depois da Fase 18)

Escrita depois do seu teste: "passei de tudo sem dificuldade".

## O que está bom (manter)
- **O coração do jogo funciona.** Combinar elementos (Fogo + Gelo = DERRETIMENTO etc.) dá decisões de verdade:
  onde pôr cada torre, em que ordem, qual evolução escolher.
- **Os chefes têm mecânicas próprias.** Os escudos que só quebram com a reação certa e o Prisma que muda de
  elemento obrigam a montar a defesa pensando no chefe.
- **A arte pintada é bonita e coerente.** Heróis esbeltos, mapas com tema por região.
- **O jogo é limpo:** offline, sem anúncios, nada pago, save com backup.

## Problemas, do mais grave ao menos grave

### 1. As Relíquias quebram a dificuldade (o motivo principal de estar fácil)
Toda a calibragem foi feita com robôs **sem Relíquias, sem níveis de herói e sem talentos**. No seu save você joga
com tudo isso somado. Eu medi:

| Robô (Sacerdotisa, 2 partidas por fase) | Região 2–4 e Caçada |
|---|---|
| 6 torres, **sem** Relíquias | perde quase todas (vence só i5 e às vezes a5/c5) |
| 6 torres, **com** Coração da Fenda + Lente de Cristal + Pedra do Alquimista (nível 3) | **vence todas**, quase sempre com 20 vidas |

As três somam cerca de +60% de dano das torres e +50% nas reações. É **poder permanente que só cresce**, e você já
tinha me dito que não gosta de "upgrades infinitos".

### 2. O Relicário não combina com o jogo
- É uma caixa aleatória comprada com moedas. Ela não ensina nada e não muda o jeito de jogar, só aumenta números.
- Repetidas viram moedas, o que mantém a sensação de "roleta".
- É o único lugar onde gastar moedas. Então todo modo novo (Caçada, Mutante, Desafio do dia) acaba sendo
  "mais moedas para a roleta".

### 3. Não existe um "próximo degrau" depois de vencer
Vencida a fase com 3★, não há versão mais difícil dela. A Fenda e a Caçada também não sobem de nível. Quem joga
bem fica sem desafio. Faltam **níveis de dificuldade escolhidos pelo jogador**, com recompensa por subir.

### 4. Modos demais, cada um rasinho
Fenda, Desafio do dia, Expedição, Caçada, Semana Mutante e Vale dos Ventos são 6 portas no mapa, todas
pagando a mesma coisa (moedas). O mapa ficou cheio e nenhum modo tem uma meta longa própria.

### 5. Pouca variedade de inimigos para o tamanho da campanha
São 19 monstros em 20 fases, e as regiões 3 e 4 reaproveitam muito as anteriores. Os chefes são o ponto forte;
os monstros comuns quase não pedem estratégia nova.

### 6. Detalhes de interface (corrigidos agora)
- O Códice tinha monstros por cima do botão de voltar e as reações passavam do fim da tela.
- A TORMENTA aparecia no Códice como "gusted + Raio" em vez de "Soprado + Raio".
- A tela inicial tinha herói e monstros. Agora mostra só o Éter.

## Sobre trocar o tema para Harry Potter, Pokémon, Digimon...
**Não recomendo e não vou fazer.** O jogo está público no GitHub e no GitHub Pages. Usar nomes, personagens ou arte
dessas marcas é violação de direitos autorais, e as donas costumam derrubar projetos assim (é comum o GitHub tirar
repositórios do ar a pedido delas). Isso também quebra a regra 4 do próprio projeto.

O que dá para fazer, e pode ficar ótimo: um tema **original** que lembre o gênero que você gosta, por exemplo:
- **Escola de magia original**: alunos-heróis, casas com elementos, criaturas do castelo como inimigos.
- **Criaturas elementais colecionáveis originais**: as torres viram bichinhos que evoluem (o jogo já tem evolução!).
- **Monstros digitais originais**: um mundo dentro de um cristal/computador, com vírus como inimigos.

## Plano proposto (Plano 3.0)
1. **Fase 19 — Ameaça.** Níveis de dificuldade escolhidos pelo jogador em cada fase já vencida com 3★:
   - **Ameaça 1 a 5.** Cada nível soma uma regra dura (monstros mais fortes, menos vidas, regras mutantes,
     Relíquias desligadas nos níveis altos).
   - **Recompensa por nível:** uma coroa na fase e moedas.
   - A Caçada e a Fenda ganham versões com Ameaça.
   - Robôs passam a calibrar **com** as melhores Relíquias.
   - Isso também cria muito conteúdo difícil de uma vez.
2. **Fase 20 — Relicário 2.0** (formato a combinar com você): trocar a caixa aleatória por algo que faça sentido no
   jogo. Relíquias viram escolhas com custo, não poder puro.
3. **Fase 21 — Região 5** com monstros novos de verdade (mecânicas novas, não só mais vida) e um chefe novo.
4. **Fase 22 — Arrumar os modos:** juntar os modos num "Salão dos Desafios" e dar a cada um uma meta longa.
5. Depois: as antigas Fase 19 (O mundo ganha voz) e Fase 20 (Maestria e vitrine).
