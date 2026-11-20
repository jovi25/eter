# Arte por IA — guia de pedidos

O jogador gera as ilustrações numa IA de imagem gratuita, e o Claude escreve os textos (prompts).
O Claude recorta o fundo (`tools/cutout.py`), coloca as imagens no jogo e anima tudo por código:
respiração, bote, projéteis, partículas e brilho.

## Regras para toda imagem

1. **Fundo liso de uma cor só.** É magenta (#FF00FF), ou verde (#00FF00) quando o bicho é roxo ou rosa;
   cada pedido já diz qual usar. Não aceite fundo xadrez "falso transparente".
2. **De lado, olhando para a direita, corpo inteiro.** Nada cortado e sem chão desenhado.
3. **Sem partículas soltas e sem textos.** Os efeitos vêm do jogo.
4. **Imagens "B" na mesma conversa da "A".** Assim a IA mantém o desenho igual.
5. **Anexe a imagem de referência** que o pedido indica.
6. **Envie o arquivo original**, não um print, e diga qual é (ex.: "T1-A").

## Pronto

- ✅ Todas as torres (T1–T5 + Braseiro), mapas e objetos (P1–P4), monstros (M1–M5)
- ✅ Heróis H1–H5 (Arcanista, Cavaleiro, Druida, Sacerdotisa, Urso)
- ✅ Cartas do Grimório C1–C4 (32 artes, 2026-11-20)
- ✅ Pacote de conteúdo 1: monstros M6 (Bolhão, Besouro, Espectro, Lebre) e cartas C5
- ✅ Evoluções E1–E6 (2026-11-19, geradas no Gemini numa conversa nova por elemento; sem anexar
  referência, o dragão adulto foi descrito em texto no próprio pedido)
- Dica: peça cada imagem nova numa **conversa nova**. Na mesma conversa o Gemini às vezes edita a
  imagem anterior (o urso saiu com a Sacerdotisa por cima).

## Ordem sugerida

1. Torres (T1 a T5)
2. Mapas e objetos (P1 a P4)
3. Monstros (M1 a M5)
4. Heróis (H1 a H5)
5. Evoluções do nível 4 (E1 a E6)

Os textos estão em inglês porque as IAs de imagem entendem melhor; é só copiar e colar.

---

## 1. Torres

Referência: anexe a **tabela de dragões parados** (a primeira que você fez).
O pedido A gera a linha parada. O B vai na mesma conversa, logo depois, e gera a linha atacando.

### T1 — Gelo (Cristal Gélido)

**T1-A**
```
Use the "Gelo" row of the attached image as the design reference.

Wide landscape image (3:2). Character sheet for a mobile tower defense game: the 3 evolution stages of the same cute ice dragon, side by side from left to right (stage 1, stage 2, stage 3), with wide empty space between them, all standing on the same invisible ground line, all facing right in a 3/4 side view, calm idle pose, full body visible, nothing cut off.

Stage 1: tiny round light-blue baby dragon on four short legs, big head, small ice crest, a snowflake-shaped crystal on the tail tip.
Stage 2: young dragon, slimmer and taller, small icy wings, a crystal horn on the snout, crystal tail tip.
Stage 3: proud adult ice dragon with crystal wings, a cozy blue knitted scarf and a frosty mane; wings raised UP and folded close to the body (not spread wide). The whole creature must fit in a square, about as wide as it is tall.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), cool saturated colors, light coming from the top left. Same art style, line weight and colors for all three.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no scenery, no floating particles, no text, no labels.
```

**T1-B**
```
Now the exact same three dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: body leaning forward, mouth wide open, a short puff of frosty mist with two tiny ice shards right in front of the mouth (small, nothing flying away), tail raised.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### T2 — Planta (Vinha Ancestral)

**T2-A**
```
Use the "Planta" row of the attached image as the design reference.

Wide landscape image (3:2). Character sheet for a mobile tower defense game: the 3 evolution stages of the same cute plant dragon, side by side from left to right (stage 1, stage 2, stage 3), with wide empty space between them, all standing on the same invisible ground line, all facing right in a 3/4 side view, calm idle pose, full body visible, nothing cut off.

Stage 1: tiny round leaf-green baby dragon on four short legs, big head, a two-leaf sprout on top of the head, a leaf on the tail tip.
Stage 2: young dragon, slimmer and taller, small branch antlers, leaf-shaped wings, a red flower bud on the tail tip.
Stage 3: wise adult plant dragon with a mossy back covered in small flowers, branch antlers with blossoms and a small leather satchel; keep the foliage close to the body. The whole creature must fit in a square, about as wide as it is tall.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), warm saturated colors, light coming from the top left. Same art style, line weight and colors for all three.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no scenery, no floating leaves or particles, no text, no labels.
```

**T2-B**
```
Now the exact same three dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: body leaning forward, mouth wide open, a short burst of three green leaves and a tiny curling vine right in front of the mouth (small, nothing flying away), tail raised.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### T3 — Raio (Torre do Trovão)

Mudei de propósito: sem bochecha vermelha redonda e sem cauda em forma de raio, para não lembrar um
personagem amarelo famoso.

**T3-A**
```
Use the "Raio" row of the attached image as a loose reference, with these changes: no round red cheek marks, and the tail does not end in a lightning-bolt shape.

Wide landscape image (3:2). Character sheet for a mobile tower defense game: the 3 evolution stages of the same cute storm dragon, side by side from left to right (stage 1, stage 2, stage 3), with wide empty space between them, all standing on the same invisible ground line, all facing right in a 3/4 side view, calm idle pose, full body visible, nothing cut off.

Stage 1: tiny round golden-yellow baby dragon with deep blue stripes on the back, four short legs, big head, stubby wings, a small glowing blue crystal on the tail tip.
Stage 2: young dragon, slimmer and taller, jagged horns, a dark blue neckerchief, a spiky crest along the back.
Stage 3: confident adult storm dragon with a metal shoulder pad, a tall spiky crest that glows faintly blue, horns swept back; wings raised UP and folded close to the body (not spread wide). The whole creature must fit in a square, about as wide as it is tall.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), warm saturated colors, light coming from the top left. Same art style, line weight and colors for all three.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no scenery, no floating sparks or particles, no text, no labels.
```

**T3-B**
```
Now the exact same three dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: body leaning forward, mouth wide open, a small crackling ball of blue-white electricity right in front of the mouth (small, nothing flying away), crest glowing brighter, tail raised.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### T4 — Vento (Torre do Vento)

**T4-A**
```
Use the "Vento" row of the attached image as the design reference.

Wide landscape image (3:2). Character sheet for a mobile tower defense game: the 3 evolution stages of the same cute wind dragon, side by side from left to right (stage 1, stage 2, stage 3), with wide empty space between them, all standing on the same invisible ground line, all facing right in a 3/4 side view, calm idle pose, full body visible, nothing cut off.

Stage 1: tiny round pale silver-white baby dragon with a fluffy chest, four short legs, big head, tiny feathered wings.
Stage 2: young dragon, slimmer and taller, large feathered wings, a long fluffy tail like a little cloud.
Stage 3: graceful adult wind dragon with a fluffy cloud-like mane, a red ribbon around the neck and big feathered wings; wings raised UP and folded close to the body (not spread wide). The whole creature must fit in a square, about as wide as it is tall.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), soft saturated colors with light blue and mint shading, light coming from the top left. Same art style, line weight and colors for all three.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no scenery, no floating particles, no text, no labels.
```

**T4-B**
```
Now the exact same three dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: body leaning forward, mouth wide open, a small swirl of white wind lines right in front of the mouth (small, nothing flying away), wings lifted a little.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### T5 — Normal (Arqueiro)

**T5-A**
```
Use the "Normal" row of the attached image as the design reference.

Wide landscape image (3:2). Character sheet for a mobile tower defense game: the 3 evolution stages of the same cute furry dragon, side by side from left to right (stage 1, stage 2, stage 3), with wide empty space between them, all standing on the same invisible ground line, all facing right in a 3/4 side view, calm idle pose, full body visible, nothing cut off.

Stage 1: tiny round cream-ivory fluffy baby dragon on four short legs, big head, tiny horns, small bat wings.
Stage 2: young dragon, slimmer and taller, bat wings, a little leather satchel on a strap, a row of short sharp quills along the tail.
Stage 3: adventurous adult dragon with a big fluffy mane, curved horns, a leather harness with a satchel and sharp quills along the back and tail; wings raised UP and folded close to the body (not spread wide). The whole creature must fit in a square, about as wide as it is tall.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), warm saturated colors, light coming from the top left. Same art style, line weight and colors for all three.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no scenery, no floating particles, no text, no labels.
```

**T5-B**
```
Now the exact same three dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: body leaning forward, mouth wide open in a fierce roar, a small white ring of air right in front of the mouth (small, nothing flying away), quills raised, tail up.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

---

## 2. Mapas e objetos

Referência: anexe a **imagem do campo** que você já fez.

### P1 — Mapa de Âmbar (outono, cânions)
```
Match the art style of the attached image (same painting style, same top-down camera), but a different place.

Portrait image (2:3). Top-down view of an autumn canyon for a mobile tower defense map, seen from above with a slight tilt. Warm sandy-orange ground with patches of dry golden grass and fallen leaves. Orange and red autumn trees, sandstone rocks and glowing amber crystals ONLY along the left and right edges; keep the middle 70% as open ground with no objects, because roads and towers are drawn on top in the game. No road, no path, no water, no buildings, no characters, no text.

Style: polished painted 2D game art, soft cel shading, warm saturated colors, cute fantasy mood, light coming from the top left.
```

### P2 — Mapa de Neve
```
Match the art style of the attached image (same painting style, same top-down camera), but a different place.

Portrait image (2:3). Top-down view of a snowy mountain meadow for a mobile tower defense map, seen from above with a slight tilt. Soft packed snow with patches of frosty blue-green grass and small ice puddles. Snow-covered pine trees, icy rocks and pale blue ice crystals ONLY along the left and right edges; keep the middle 70% as open snow with no objects, because roads and towers are drawn on top in the game. No road, no path, no river, no buildings, no characters, no text.

Style: polished painted 2D game art, soft cel shading, cool saturated colors with warm sunlight, cute fantasy mood, light coming from the top left.
```

### P3 — Mapa do Vazio (ilha mágica)
```
Match the art style of the attached image (same painting style, same top-down camera), but a different place.

Portrait image (2:3). Top-down view of a mystic floating island for a mobile tower defense map, seen from above with a slight tilt. Dark violet stone ground with faint glowing cyan rune cracks and patches of strange teal moss. Purple and cyan crystal clusters, glowing mushrooms and twisted dark trees ONLY along the left and right edges, with a glimpse of starry sky beyond the island's edge; keep the middle 70% as open ground with no objects, because roads and towers are drawn on top in the game. No road, no path, no buildings, no characters, no text.

Style: polished painted 2D game art, soft cel shading, rich saturated colors, magical mood, light coming from the top left.
```

### P4 — Objetos do mapa (fundo verde)

Referência: anexe a **imagem do dragão de Fogo parado**.
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Four separate objects for a mobile tower defense map, side by side from left to right with wide empty space between them, seen from the front and slightly above, nothing cut off:
1) A low round stone pedestal where a creature stands: wide and flat on top, mossy grey stone with carved runes and a thin gold trim.
2) An empty build spot: a small flat round stone plate with a carved circle and a faint plus sign in the middle.
3) The magic crystal the player defends: a tall glowing violet crystal on a small rock base, with a soft inner light.
4) A monster portal seen from above: a round swirling vortex of dark purple and black magic, like a whirlpool, with a thin ring of stones around it.

Background: one solid flat green color (#00FF00) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

---

## 3. Monstros

Referência: anexe a **imagem do dragão de Fogo parado** (só para o estilo).
Os bichos ficam olhando para a direita, andando; o jogo vira e anima.

### M1
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Four different monsters for a mobile tower defense game, side by side from left to right with wide empty space between them, all facing right in a 3/4 side view, walking or moving pose, full body, similar size, nothing cut off. They are the villains: cute, but grumpy or sneaky.
1) A round teal slime blob with a grumpy face and a shiny highlight.
2) The same kind of slime made of shiny gold, with a few coins inside and a greedy grin.
3) A lean grey-blue wolf pup in a running pose, with a torn red scarf.
4) A dark navy-blue bat with big ears, glowing yellow eyes and open wings, flying.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### M2
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Four different monsters for a mobile tower defense game, side by side from left to right with wide empty space between them, all facing right in a 3/4 side view, walking pose, full body, similar size, nothing cut off. They are the villains: cute, but grumpy or menacing.
1) A stocky golem made of tree bark and moss, with glowing amber eyes.
2) A wingless four-legged beast with charcoal-black scales, glowing orange ember cracks and one big curved horn on its nose like a rhino.
3) A cute frozen zombie with pale blue skin, small icicles, a tattered fur coat and arms stretched forward.
4) A small skeleton warrior with a dented helmet and a rusty sword.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### M3
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Four different monsters for a mobile tower defense game, side by side from left to right with wide empty space between them, all facing right in a 3/4 side view, walking pose, full body, similar size, nothing cut off. They are the villains: cute, but grumpy or sneaky.
1) A short green-skinned orc shaman with a feathered bone mask and a crooked staff with hanging charms.
2) A blob of wet brown mud with a little leaf on its head and dripping arms.
3) A calm old monk in light-blue robes with a frosty white beard and a staff with prayer beads.
4) A small red imp thief with tiny horns, a sly grin and a bag of gold coins over its shoulder, sneaking on tiptoes.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### M4 — grandes
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Three different big monsters for a mobile tower defense game, side by side from left to right with wide empty space between them, all facing right in a 3/4 side view, full body, nothing cut off. Imposing but still cute.
1) A grey stone gargoyle with bat wings open and small horns, flying.
2) A boss: a tall herald in heavy ice armor with an icicle crown, a long frosty cape and a curved horn of ice in one hand.
3) A boss: a huge mossy swamp giant with a rotten tree stump on its back, lily pads, mud dripping and tiny glowing eyes.

Style: polished professional 2D game illustration, chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### M5 — chefões (fundo verde)
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). Four different boss monsters for a mobile tower defense game, side by side from left to right with wide empty space between them, all facing right in a 3/4 side view, full body, nothing cut off. Imposing but still cute.
1) A sentinel golem made of glowing amber crystal and gold plates, holding a big round shield, with a small leaf trapped inside its amber chest.
2) A floating void creature like a big eel with a huge toothy mouth, a violet glowing body and small fins, made of dark magic.
3) A huge titan made of black obsidian rock with molten orange cracks and a heavy jaw.
4) A floating crystal being shaped like a large prism, with a single big eye, dark violet and cyan facets and small orbiting shards close to it.

Style: polished professional 2D game illustration, chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat green color (#00FF00) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

---

## 4. Heróis

Referência: anexe a **imagem do dragão de Fogo parado** (só para o estilo).
Cada herói aparece duas vezes na mesma imagem: parado à esquerda e atacando à direita. Assim sai igual.

### H1 — Arcanista (fundo verde)
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). The same hero shown twice, side by side with wide empty space between: LEFT in a calm standing idle pose, RIGHT in an attack pose. Both facing right in a 3/4 side view, full body, nothing cut off. Slim and elegant proportions (about 4 heads tall, long legs), NOT chubby; anime fantasy style; long flowing cape.
The hero: a young arcane mage with silver-white hair, violet and navy robes, a long cape with small star embroidery, and a wooden staff topped with a floating violet crystal.
Attack pose: staff thrust forward, the crystal glowing bright, cape flowing back.

Background: one solid flat green color (#00FF00) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### H2 — Cavaleiro
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). The same hero shown twice, side by side with wide empty space between: LEFT in a calm standing idle pose, RIGHT in an attack pose. Both facing right in a 3/4 side view, full body, nothing cut off. Slim and elegant proportions (about 4 heads tall, long legs), NOT chubby; anime fantasy style; long flowing cape.
The hero: a young knight with short brown hair, light silver armor, a blue tabard, a long blue cape, a sword and a round shield.
Attack pose: a wide horizontal sword swing, shield held back, cape flowing.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### H3 — Druida
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). The same hero shown twice, side by side with wide empty space between: LEFT in a calm standing idle pose, RIGHT in an attack pose. Both facing right in a 3/4 side view, full body, nothing cut off. Slim and elegant proportions (about 4 heads tall, long legs), NOT chubby; anime fantasy style; long flowing cloak.
The hero: a druid with long auburn hair, a cloak of leaves and moss, a wooden circlet with small antlers, and a twisted wooden staff wrapped in vines.
Attack pose: staff pointed forward, the free hand glowing green, cloak flowing.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### H4 — Sacerdotisa
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). The same hero shown twice, side by side with wide empty space between: LEFT in a calm standing idle pose, RIGHT in an attack pose. Both facing right in a 3/4 side view, full body, nothing cut off. Slim and elegant proportions (about 4 heads tall, long legs), NOT chubby; anime fantasy style; long flowing veil and cape.
The hero: a priestess with long golden hair, white and gold robes, a flowing white veil-cape, and a golden staff topped with a sun halo.
Attack pose: staff raised high and forward, a warm golden glow at its top.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

### H5 — Urso da Druida
```
Match the art style of the attached image (outline, cel shading, colors), not the creature.

Wide landscape image (3:2). The same creature shown twice, side by side with wide empty space between: LEFT standing on four legs, calm; RIGHT rearing up and swiping with one claw. Both facing right in a 3/4 side view, full body, nothing cut off.
The creature: a sturdy brown spirit bear summoned by a druid, with moss and small flowers on its back, a leafy collar and faint glowing green runes on its shoulders.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading, clean dark-brown outline, expressive eyes of natural size (not bulging), warm saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

---

## 5. Evoluções (nível 4)

Cada torre evolui para uma de duas formas finais. Referência: anexe a **linha parada daquele elemento**
(a imagem "A" da torre). O pedido A gera as duas formas paradas; o B, na mesma conversa, gera as duas atacando.

### E1 — Fogo: Vulcão (esquerda) e Fornalha (direita)

Referência: anexe a imagem parada (A) da linha de Fogo (a primeira imagem do Braseiro).

**E1-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: a dark obsidian-scaled dragon with glowing lava cracks, a small smoking volcano-shaped crest on its back and heavy stone armor.
Right: a sleek dragon with brass furnace armor on its chest showing a glowing grate, a flame mane and chimney-like horns.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E1-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one roars upward with its crest glowing; the right one breathes a short flame jet. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### E2 — Gelo: Coroa do Inverno (esquerda) e Nevasca Eterna (direita)

Referência: anexe a imagem parada (A) da linha de Gelo.

**E2-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: a regal ice dragon with a crown of tall ice crystals and a frost cape.
Right: a fluffy dragon with a mane like a snow cloud and snowflake patterns.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E2-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one raises its head with the crystals glowing; the right one blows a short swirl of snow. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### E3 — Planta: Árvore Anciã (esquerda) e Raiz Faminta (direita)

Referência: anexe a imagem parada (A) da linha de Planta.

**E3-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: an ancient dragon with bark skin, a small leafy tree growing on its back and a mossy beard.
Right: a thorny dragon with root-like legs and a carnivorous flower on the tail tip.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E3-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one raises a front paw with glowing green runes; the right one lunges with jaws open and short thorny vines at the mouth. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### E4 — Raio: Senhor do Trovão (esquerda) e Bobina Tesla (direita)

Referência: anexe a imagem parada (A) da linha de Raio.

**E4-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: a majestic dragon with a small storm-cloud crown floating above its horns and golden armor.
Right: a dragon with copper coils and metal rods on its back.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E4-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one roars upward with the cloud crown flashing; the right one makes a short electric arc between its horns. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### E5 — Vento: Olho do Furacão (esquerda) e Brisa Cortante (direita)

Referência: anexe a imagem parada (A) da linha de Vento.

**E5-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: a big-winged dragon with a swirling vortex mark on its chest and a cloud mane.
Right: a sleek fast dragon with blade-shaped feathers and a long ribbon tail.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E5-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one flaps its wings upward; the right one slashes a small crescent of wind at the mouth. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

### E6 — Normal: Atirador de Elite (esquerda) e Chuva de Flechas (direita)

Referência: anexe a imagem parada (A) da linha de Normal.

**E6-A**
```
Use the stage 3 dragon of the attached image as the base design.

Wide landscape image (3:2). Two different final evolutions of this dragon for a mobile tower defense game, side by side with wide empty space between them, both facing right in a 3/4 side view, calm idle pose, full body, nothing cut off. Both are a bit bigger and grander than stage 3, with compact silhouettes: wings raised up and close to the body, each fitting in a square.

Left: a focused dragon with brass goggles and a long tail ending in one big quill.
Right: a dragon with many quills on its back like a quiver.

Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients, clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light coming from the top left.

Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no floating particles, no text, no labels.
```

**E6-B**
```
Now the exact same two dragons: identical design, colors, size, order and positions as the previous image. Change only the pose to an attack: the left one aims with its mouth open and a small air burst; the right one shakes its back quills upward. Small effects only, nothing flying away.

Same style and same background: one solid flat magenta color (#FF00FF). No gradient, no ground, no shadow, no floating particles, no text.
```

---

## Torre → dragão

Braseiro = Fogo ✅, Cristal Gélido = Gelo, Vinha Ancestral = Planta, Torre do Trovão = Raio,
Torre do Vento = Vento, Arqueiro = Normal. Pedra fica guardado para uma torre futura.

---

## 6. Cartas do Grimório (C1 a C4)

Cada imagem é uma **grade 3×3 de pinturas separadas por faixas brancas** (a última tem só 5). O recorte é
automático: `python tools/cutout.py grid <imagem> public/assets/cards <nomes na ordem>`.
A ordem é sempre da esquerda para a direita, de cima para baixo.

Estilo comum a todas (vai junto em cada pedido):
```
Style: polished fantasy collectible card game illustrations, painterly with soft cel shading, rich glowing
magical lighting, saturated jewel colors, one clear central subject per painting, cute and friendly (not dark),
matching a cute chibi fantasy tower defense game. No text, no letters, no numbers, no card frames, no borders.
```

**C1** (fireMastery, iceMastery, natureMastery, boltMastery, eagleEye, longReach, treasure, heart, windMastery)
```
Generate an image. A 3x3 grid of 9 separate square paintings of equal size, separated by thick pure white
gutters (#FFFFFF) between them and around the edges. Each painting fills its whole square.
1: glowing living embers and a dancing flame. 2: a long winter, a big shining snowflake over frozen pines.
3: ancient glowing golden sap dripping from a huge old leaf. 4: a charged stormy sky full of lightning.
5: the sharp golden eye of an eagle with feathers. 6: a floating magical crystal lens refracting violet light.
7: a forgotten treasure chest overflowing with gold, half covered in moss. 8: a glowing crystal heart full of
ether light. 9: cutting wind, swirling green-white gusts with flying leaves.
[estilo comum]
```

**C2** (bounty, bargain, catalyst, eternalCombo, heroFury, echo, absoluteZero, stormHeart, overdrive)
```
... 1: a bounty hunter's heavy coin pouch with a wanted poster. 2: a master builder's hammer and tools with
blueprints. 3: an unstable bubbling potion flask cracking with orange energy. 4: a glowing hourglass whose sand
loops forever. 5: a guardian's sword wreathed in fiery golden aura. 6: arcane echo, violet rune rings rippling
outward. 7: absolute zero, a perfect ice crystal freezing the air around it. 8: the heart of a storm, a dark
cloud with a glowing core and lightning. 9: overdrive, glowing brass gears spinning with white light.
```

**C3** (tallVines, heavyHand, ironArrows, deepRoots, sharpMelt, quickHands, galeForce, goldPact, cyclone)
```
... 1: a climbing vine growing up into the sky. 2: a heavy armored gauntlet fist hitting the ground.
3: a bundle of iron-tipped arrows gleaming. 4: deep eternal roots glowing underground. 5: melting ice pierced by
a burning drop of fire. 6: nimble winged gloves. 7: a powerful gust spiral of wind. 8: a golden pact, a glowing
contract scroll sealed with a heart-shaped wax seal. 9: the eye of a cyclone crackling with lightning.
```

**C4 — Lendárias e Épica** (goldRain, sunOfEter, phoenix, worldSeed, timeCrown): pedir grade 3x2, a 6ª célula vazia.
```
... A 3x2 grid of 6 squares ... 1: a rain of gold coins from a glowing sky. 2: the radiant sun of Ether with
rings of runes. 3: a phoenix feather blazing with fire. 4: a glowing world seed sprouting a tiny world tree.
5: a crown of time with clock faces and floating golden gears. 6: leave this square plain white.
```

---

## 7. Pacote de conteúdo 1

### M6-A — Bolhão e Lebre-Relâmpago (fundo magenta)
Recorte: `python tools/cutout.py fit <imagem> public/assets/enemies broodmother:200:184 hare:160:140`
```
Generate an image. Wide landscape image (3:2). Two different monsters for a cute mobile fantasy tower defense game,
side by side with wide empty space between them, both facing right in a 3/4 side view, full body, nothing cut off.
They are villains: cute but grumpy or sneaky. Left: a big round teal slime mother blob with a grumpy face, a shiny
highlight and two tiny baby slimes visible inside its jelly body. Right: a small fluffy yellow hare with
lightning-bolt shaped ears and a crackling electric tail, in a fast running pose.
Style: polished professional 2D game illustration, cute chibi proportions, soft cel shading with gentle gradients,
clean dark-brown outline, expressive eyes of natural size (not bulging), saturated colors, light from the top left.
Background: one solid flat magenta color (#FF00FF) filling everything. No gradient, no ground, no shadow, no
floating particles, no text, no labels.
```

### M6-B — Besouro Couraçado e Espectro (fundo verde)
Recorte: `python tools/cutout.py fit <imagem> public/assets/enemies beetle:176:152 wraith:176:192`
```
... Left: a stout armored beetle with a thick shiny bronze and steel-blue shell, small horns and grumpy eyes,
walking. Right: a small hooded ghost wraith of pale blue-white mist with glowing cyan eyes and a wispy tail,
floating low. ... Background: one solid flat green color (#00FF00) ...
```

### C5 — 8 cartas novas (grade 3×3, a 9ª célula sobra)
Recorte: `python tools/cutout.py grid <imagem> public/assets/cards harvest trueShot livingWall interest emberBurst stickyMud secondChance bossHunter -`
```
1: a golden wheat harvest with gold coins among the stalks. 2: a single glowing arrow hitting the exact center of
a target. 3: a living wall of stone and green vines with a glowing heart in the middle. 4: a stack of gold coins
growing into a taller stack with a soft magic glow (interest). 5: a burning ember bursting into a ring of fire.
6: thick sticky purple-brown mud with bubbles and a stuck boot. 7: a cracked crystal heart being healed by pink
light, a second chance. 8: a hunter's trophy: a big monster horn crossed with a glowing spear. 9: plain white.
[estilo comum das cartas]
```

### C6 — 6 cartas do Pacote de conteúdo 2 (grade 3×2) ✅
Recorte: `python tools/cutout.py grid <imagem> public/assets/cards crystalShield quickstart midas weatherWise overcharge frostNova`
```
1: a glowing blue crystal shield protecting a small purple crystal. 2: a runner's starting line with a golden
hourglass and a burst of speed lines. 3: a golden hand touching a monster horn that turns into gold. 4: a wizard's
staff conducting swirling weather: snow, sun and rain clouds together. 5: an overcharged lightning orb crackling
with golden energy. 6: a frozen ice statue shattering into a burst of frost shards. [estilo comum das cartas]
```
