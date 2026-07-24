# Campo Branco — Adventurer

Cena top-down local construída com HTML, CSS e Canvas 2D usando os sprites originais
do pacote **FREE Adventurer 2D Pixel Art**.

O cenário inclui dois tipos de slime que se alternam a cada renascimento. O slime
clássico usa `assets/sprites/enemies/classic.png`; o slime de água usa todas as
animações de `assets/sprites/enemies/water` — idle, movimento, ataque, dano e
morte. Ambos perseguem o personagem, causam dano, recebem os ataques e contam
para liberar os baús.

O primeiro baú sólido aparece depois de 5 slimes derrotados e o segundo depois de
10. Eles reproduzem `assets/audio/treasure-open.wav` e entregam, sem repetir, as gemas de fogo
e água. Cada gema salta com gravidade e quique; ao ser coletada, seu ícone
apagado acende no HUD e libera um poder arremessável.

A gema amarela usa `assets/effects/fire.png`; a azul usa
`assets/effects/water.png`. Cada elemento alterna uma seleção de cinco
projéteis animados em ordem embaralhada, mostrando todos antes de repetir.
Os projéteis causam dano, empurram o slime e desaparecem ao atingir um alvo,
o limite da arena ou o fim de seu alcance.

Depois que as duas gemas são coletadas, a raposa de
`assets/sprites/companions/fox.png` aparece
como pet e passa a acompanhar o personagem. Quando um slime se aproxima, ela olha
para o perigo e usa a animação de alerta da quinta linha da spritesheet.

Ao perder toda a vida, a partida é pausada e uma tela de game over feita com os
assets de UI mostra o total de slimes e gemas. É possível reiniciar imediatamente
ou voltar ao menu principal.

O cenário possui chuva em pixel art com gotas brancas diagonais, densidade
responsiva e respingos presos ao chão do mundo.

## Áudio

Durante a partida, os sons de chuva e vento tocam em loop com volume ambiente.
Eles são pausados automaticamente no menu, no inventário, no game over e quando
a página fica em segundo plano. Os demais efeitos acompanham passos, ataques de
espada, poderes de fogo e água, impactos, movimentos dos slimes e abertura dos
baús. Efeitos curtos usam pools independentes para permitir sons simultâneos sem
interromper uma ação anterior.

Nove árvores de `assets/sprites/environment/autumn-tree.png` são distribuídas com pequenas variações
aleatórias pelo mapa. Cada uma possui fase e velocidade de idle próprias, colisão
na base do tronco e libera poucas pétalas em intervalos ocasionais.

O inventário usa o painel maior de `Free Inventory`, com retrato animado, capacidade,
slimes derrotados, gemas e a raposa companheira. Pressione `I` para abrir ou
fechar; a partida fica pausada enquanto o painel estiver visível.

## Estrutura

- `assets/audio`: ambientes e efeitos sonoros
- `assets/effects`: folhas de projéteis de fogo e água
- `assets/sprites`: personagem, inimigos, cenário e companheira
- `assets/ui`: interface principal e inventário
- `assets/licenses`: licenças preservadas dos pacotes utilizados
- raiz do projeto: somente `index.html`, `styles.css`, `game.js` e este README

## Como executar

Você pode abrir `index.html` diretamente no navegador. Se preferir executar por um
servidor local:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Controles

- `WASD` ou setas: movimentação
- Botão esquerdo do mouse: ataque rápido
- Botão direito do mouse: ataque forte
- `1` ou clique na gema amarela: arremessar poder de fogo
- `2` ou clique na gema azul: arremessar poder de água
- `E` ou clique/toque no baú: abrir quando estiver próximo
- `I`: abrir ou fechar o inventário
- `Esc`: abrir ou fechar o menu de pausa
- Controles de toque aparecem automaticamente em celulares e tablets
