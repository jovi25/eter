# Roteiro de teste (playtest)

Para testar no celular depois de cada fase. Link: https://jovi25.github.io/eter/
Se aparecer a versão antiga, feche a aba e abra de novo.

## 1. Primeira impressão (5 min)
- [ ] O jogo abre rápido e a música toca depois do primeiro toque
- [ ] O mapa-múndi mostra estrelas, desafios e moedas; os ícones de baixo abrem Desafio do dia, Relicário, Códice e Opções
- [ ] Opções: "Textos maiores" aumenta os textos (o mapa redesenha na hora)

## 2. Uma fase da Região 1
- [ ] Construir, melhorar até o nível 3 e vender (a venda pede **dois toques**)
- [ ] No nível 3: Evoluir (2 caminhos), **Fundir** com uma torre vizinha de outro elemento ou Vender — não existe mais Reforço
- [ ] Mover o herói tocando no chão **e** arrastando o herói com o dedo
- [ ] Inimigos com estado mostram um ícone: chama (queimando), cristal (congelado), raízes (preso), raio roxo (frágil)
- [ ] Cada tipo de monstro tem um som diferente ao cair (gosma, golem, morcego, esqueleto, lobo)
- [ ] Ao vencer, "Próxima fase" abre o cartão da fase seguinte (missões e herói antes de jogar)

## 3. Região 2 (Ermos de Âmbar)
- [ ] Arrastar o mapa para rolar; setas ▲▼ contam inimigos fora da tela
- [ ] Comporta (fases 2 e 5): tocar na placa troca o caminho dos próximos inimigos
- [ ] Chefes com escudo (fases 3 e 5): só a reação escrita no escudo o quebra

## 4. Equilíbrio — o que observar
- Nenhuma dupla de torres deve ganhar sozinha. Se uma estratégia ficar fácil demais, anote **quais torres, evoluções e fase**.
- O Arcanista e a Sacerdotisa dependem de onde ficam: leve-os para perto da luta.
- Robôs (`npm run balance`): 4 estratégias × 10 fases e 4 heróis × 2 escolhas de bênção. Eles não movem o herói
  nem usam a Comporta, então são mais fracos que um jogador.

## 5. Desempenho
- [ ] A linha do canto inferior esquerdo mostra fps, "quadro X ms" e a resolução (ex.: GL 80%)
- [ ] Se o fps cair abaixo de 30, mande um print **durante** a luta

## Como mandar o retorno
Uma lista curta: o que gostou, o que estranhou, o que travou (com a fase e o que estava na tela).
