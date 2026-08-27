---
status: accepted
date: 2026-08-24
---

# Moteur de rendu du jardin : Skia + images pré-peintes, pas SVG

Le jardin — la prairie qui fleurit quand les pas montent — est destiné à devenir
l'écran d'accueil de Molio et l'identité visuelle de l'app. Un premier spike l'a
implémenté en `react-native-svg` ; il rendait correctement sur simulateur iOS et
**gelait puis fermait l'app sur un Nothing Phone (2)**. On abandonne le SVG au
profit de **`@shopify/react-native-skia` dessinant des images aquarelle
pré-peintes**, avec un contrat de performance chiffré (plus bas) qui n'existait
pas et dont l'absence est ce qui a laissé le SVG aller jusqu'au crash.

## Pourquoi le SVG est écarté

Deux raisons indépendantes, chacune suffisante.

**1. Plafond esthétique.** La direction artistique visée est une aquarelle :
grain du papier, bords qui bavent, lavis superposés. Vérifié dans la source de
`react-native-svg` : seules 7 primitives de filtre ont une implémentation native
(`FeBlend`, `FeColorMatrix`, `FeComposite`, `FeFlood`, `FeGaussianBlur`,
`FeMerge`, `FeOffset`). **`FeTurbulence` et `FeDisplacementMap` existent dans la
surface TypeScript mais sont des no-op sur device.** La texture aquarelle est
hors d'atteinte, et aucune passe de fidélité supplémentaire n'y changera rien.
Le rendu obtenu était du « botanique à dégradés », jugé trop géométrique — ce
jugement était correct et définitif.

**2. Modèle de coût inversé sur Android.** Dans
`react-native-svg/android/src/main/java/com/horcrux/svg/SvgView.java` (`onDraw`,
ligne ~134, appelant `drawOutput()` ligne ~267), **chaque racine `<Svg>` alloue
son propre `Bitmap.createBitmap(w, h, ARGB_8888)` et le rastérise sur le thread
UI.** iOS n'a pas cet étage : le simulateur ne pouvait structurellement pas
révéler le problème.

Or « chaque fleur s'ouvre à son propre seuil » force une racine `<Svg>` par
élément animé. Le spike montait **≈374 racines** (132 plantes × 2 vues + 92
fleurs d'abondance + 4 passes plein écran + 14 particules), dont 4 à ~4,8 Mo
chacune. Le coût croît avec le nombre de formes ; la beauté d'une prairie aussi.
Il n'existe aucun réglage où c'est à la fois beau et tenable.

Qu'un Snapdragon 8+ Gen 1 avec 8 Go de RAM échoue là-dessus indique une
défaillance structurelle, pas une marge insuffisante.

Note pour un futur lecteur : la référence graphique ayant servi de brief (une
infographie générée par IA) porte la mention « ÉLÉMENTS 100 % ANIMABLES (SVG) ».
C'est une hallucination — l'image est un raster peint, pas un vecteur — et elle a
fixé le choix du moteur avant que la question soit posée.

## Ce qu'on fait à la place

- **Skia** (`@shopify/react-native-skia`, ≥ 2.11). Un seul canvas, zéro vue
  native par élément, N commandes de dessin GPU. Compatible sans mise à jour :
  peer deps `react ≥19` / `react-native ≥0.78` / `react-native-worklets ≥0.7.0`
  / `reanimated ≥4.0.0`, le repo est à 19.1.0 / 0.81.5 / 0.7.2 / 4.1.6.
- **Une série de paliers peints.** Huit images plein cadre de la même prairie,
  de la prairie nue à la floraison complète, générées en descendant par édition
  successive depuis la plus fleurie. Deux images résidentes à la fois, ~10 Mo.
- **Transition par dissolution à seuil de bruit** (SkSL) entre deux paliers
  adjacents : la nouvelle image arrive par plaques dispersées, comme l'encre sur
  papier humide. Vérifié en comparaison directe — le fondu linéaire ramollit les
  pétales, la dissolution reste franche. Skia n'est pas strictement obligatoire
  (un fondu d'opacité suffirait), mais c'est ce qui distingue une floraison d'un
  diaporama.
- **Micro-variation d'échelle à l'intérieur d'un palier** : l'image est dessinée
  très légèrement plus grande à mesure que les pas montent, ce qui donne un
  retour continu entre les sauts de palier. Sans ça, un delta de +400 pas ne
  produit souvent aucun changement visible.

### Trois pistes testées et écartées (2026-08-24)

**Composition procédurale par sprites** — un fond peint plus 30-40 fleurs
peintes découpées, placées par `flora.ts`, chacune apparaissant à son seuil.
Techniquement excellent (un atlas, ~2 Mo, cascade fleur par fleur, granularité
continue) et **écarté pour raison de design** : l'harmonie d'une prairie tient à
sa composition — l'échelle continue du plus petit élément au plus grand, tout
tissé dans la même lumière. Cent objets finis posés côte à côte restent cent
objets. Aucun réglage d'échelle, de teinte ou de rotation n'y change quoi que ce
soit ; le problème est dans la nature de l'approche, pas dans son paramétrage.
C'est le risque de « collage d'autocollants » nommé au départ, et il s'est
réalisé.

**Une peinture unique + masque montant** — recalage inexistant par construction,
~5 Mo, granularité continue, un seul asset. Écarté parce qu'un masque vertical ne
fait varier que la hauteur : la densité et la couleur restent figées, et le
premier plan — la zone que l'œil regarde en premier — est identique à 300 pas et
à 10 000. Ça se dévoile au lieu d'évoluer. Le principe du masque est conservé
sous la forme de la micro-variation d'échelle.

**Le flipbook a d'abord été écarté à tort.** Une frame générée par édition d'une
autre repeint effectivement la scène — mesuré : la zone censée être intacte
diffère de 17× le bruit du papier, et aucune translation ne réconcilie les deux
images. Mais c'était le mauvais critère. **Ce qui compte est l'aspect de la
transition, pas la fidélité des pixels**, et le fondu de cette même paire ne
montre ni fantôme ni dédoublement : les deux peintures partagent la même ossature
de composition, et l'aquarelle est trop douce pour que l'écart se voie. Les
petits déplacements se lisent même comme du végétal qui bouge. Ne pas
re-condamner cette piste sur un diff de pixels.

## Contrat de performance

Cinq seuils, à mesurer avant de considérer le jardin comme livrable. Leur absence
est ce qui a permis au spike SVG de durer.

| Seuil | Mesure |
| --- | --- |
| Mémoire résidente du jardin < 25 Mo | `adb shell dumpsys meminfo <pkg>` |
| 0 frame rendue au repos (sans transition) | `adb shell dumpsys gfxinfo <pkg> framestats` |
| Le jardin ne bloque pas le premier paint de Home | Structurel : compteur et anneau d'abord, jardin en fondu |
| Cold start Home interactif < 1,2 s (milieu de gamme 2021, release) | `adb shell am start -W` |
| 60 fps pendant la transition | Vrai matériel lent requis |

Le seul appareil physique disponible est un Nothing Phone (2) — un flagship, donc
un mauvais instrument : il ne détecte que les défaillances structurelles. Les
trois premiers seuils sont indépendants du matériel et s'y mesurent exactement.
Pour le cold start, **dérater ×3** : viser ~400 ms sur le NP(2) pour tenir 1,2 s
sur un milieu de gamme. Compléter par un AVD plafonné à 2 Go (l'émulateur ment
sur le GPU, pas sur l'OOM).

## Ce qui survit du spike SVG

`features/garden/bloom.ts` : le modèle où **`bloom` est un seul nombre continu
0 → 1** que chaque élément compare à son propre seuil. Il n'y a aucun état
« palier 3 » nulle part ; les cinq bandes de la référence sont des libellés, pas
des états de rendu. C'est ce qui fait qu'un saut arbitraire (1 254 → 7 842 pas)
s'anime en cascade sans stagger écrit à la main. Ce modèle est indépendant du
moteur et se transpose tel quel.

`features/garden/flora.ts` devient dormant : le placement procédural n'a plus
d'objet puisque la composition est peinte. Le conserver coûte peu et il
redeviendrait utile si la piste des sprites était un jour rouverte.

## Conséquences

- Nouvelle dépendance native : ~5 Mo d'APK par ABI, et un `expo prebuild`. Le
  prebuild était de toute façon dû pour `expo-haptics`.
- Une montée de version d'Expo SDK dépendra désormais du support Skia.
- Il faut un plan de repli : si Skia échoue à s'initialiser, Home ne doit pas
  être blanc. Error boundary + une image statique unique.
- **Le vrai actif de cette DA est la peinture, pas le moteur.** L'aquarelle
  générée par IA convient au spike ; elle est une fondation faible pour une
  marque (non ownable, incohérente dès qu'il faut plusieurs dizaines d'éléments
  dans un style unique, statut juridique discutable en usage commercial). Faire
  peindre l'art définitif est la dépense la plus lourde à venir. Le jour où ça
  arrive, exiger une livraison **en calques** — ça rouvre l'option des sprites
  individuels et la composition procédurale.

## Amendement 2026-08-25 — Skia n'est pas retenu pour la première version

**Décision de l'utilisateur : voir d'abord ce que donne le flipbook sans couche
native, et ne juger l'ajout de Skia que si le fondu simple déçoit sur appareil.**

Le motif est que la justification a fondu en cours de route. L'ADR retenait Skia
pour trois choses ; deux ont disparu avec le flipbook.

- *Un canvas, zéro vue native par élément.* C'était la réponse au crash SVG et
  ses centaines de vues. Le flipbook en affiche deux. L'argument ne pèse plus.
- *Micro-variation d'échelle.* Un `transform: scale` sous Reanimated y suffit.
- *Dissolution à seuil de bruit (SkSL).* Seul usage restant. React Native n'a
  aucune primitive de shader fragment, donc c'est bien Skia ou rien — mais ça ne
  concerne plus que l'aspect de la transition, pas sa faisabilité.

En face, le coût est inchangé : ~5 Mo d'APK par ABI, les montées de SDK
dépendantes du support Skia, un plan de repli obligatoire, et une charge de
démarrage alors que le contrat impose Home interactif sous 1,2 s.

**Ce qu'on fait donc :** `<Image>` React Native + Reanimated, fondu d'opacité
entre les deux paliers encadrant `progress`, plus la micro-variation d'échelle.
Le contrat de performance des cinq seuils s'applique tel quel — il est
indépendant du moteur.

**Ce qui rouvrirait la question :** un fondu d'opacité qui ramollit visiblement
les pétales sur appareil. La comparaison n'a été faite que sur la paire 7→8, la
plus subtile de la série ; les huit paliers existent désormais et permettent de
la refaire sur toute la chaîne.

## Amendement 2026-08-25 — la série des huit paliers existe

`.scratch/garden-flipbook/paliers/` — `p1.png` … `p8.png` en 1024×1536, plus
`norm/` où le papier des huit est aligné sur `250,244,232`.

Hauteur de végétation mesurée : `11 · 25 · 31 · 37 · 52 · 56 · 58 · 67 %`.
Les sept fondus 50/50 sont propres, sol non dédoublé, y compris entre les
paliers bas — ce qui lève le doute principal du handoff du 24/08.

Deux acquis de méthode, à ne pas repayer :

- **La hauteur ne se demande pas en pourcentage.** Un modèle qui garde une fleur
  à 52 % ne peut pas répondre à « descends à 45 % » ; il éclaircit à la place, ce
  qu'il a fait deux fois. La consigne qui marche est de nommer la fleur qui doit
  devenir la plus haute. Le pourcentage suit.
- **Le papier dérive à chaque génération**, toujours vers le sombre et le gris :
  −4 en rouge et −9 en bleu entre p8 et p2. Invisible sur une image, c'est une
  variation de luminosité plein écran en animation. `paliers/normalize.sh` la
  corrige en post ; le prompt ne suffit pas.

Conséquence sur le rendu : une fois le papier des huit aligné, il suffit de
donner au fond de l'app cette valeur exacte pour que l'image et le fond soient
la même surface. **Le fondu d'alpha en haut de l'image, prévu plus haut dans cet
ADR, devient inutile.** En contrepartie, pas de mode sombre sur Home sans
refaire peindre l'art — à porter au cahier des charges de l'illustrateur·rice au
même titre que la livraison en calques.

Le fond transparent a été testé et écarté : l'aquarelle *est* le papier, les
pétales blancs sont du papier nu, et un détourage les efface avec le fond
(`paliers/test-detourage.png`).

Reste irrégulier : les écarts de hauteur vont de 2 à 15 points, et p6/p7 n'en
ont que 2 — à absorber par l'échelle de base plutôt qu'en régénérant.

## Amendement 2026-08-26 — la dissolution est cuite hors-ligne, pas calculée

Le flipbook a été monté puis testé sur appareil, et le test a fait apparaître
une contrainte que ni cet ADR ni les sessions précédentes n'avaient nommée.

**La fluidité et le flou sont le même phénomène.** Avec un fondu d'opacité,
`progress` n'est presque jamais pile sur un cadre : le composant est donc en
permanence à mi-fondu, ce qui rend le mouvement continu — et rend l'image de
repos floue. Un mélange qui varie en continu est un mélange non nul à l'arrêt.
C'est arithmétique. On ne peut pas garder l'un sans l'autre.

L'utilisateur a rejeté les deux extrêmes après les avoir essayés sur le
téléphone : le repos flou d'abord, puis le mouvement saccadé obtenu en
verrouillant l'affichage sur un cadre entier.

**Ce qui résout la contrainte est la dissolution à seuil**, parce qu'elle
n'affiche jamais de valeur intermédiaire : chaque pixel vient d'une peinture ou
de l'autre, jamais d'une moyenne. Mesuré sur toute la course, l'écart moyen au
plus proche des deux peintures est de 0,00 à n'importe quel seuil, contre 1,5 à
3,9 pour le fondu d'opacité. Elle est donc nette **y compris à l'arrêt**, ce qui
n'avait pas été vu : l'intérêt de la dissolution n'était pas l'esthétique des
pétales pendant 600 ms, c'était de rendre viable le modèle continu.

**Elle n'a pas besoin de tourner sur le GPU.** C'est le point qui évite Skia :
rien n'oblige à calculer la dissolution à l'exécution. Elle est cuite à l'avance
et les états intermédiaires sont livrés comme des cadres de plus. Skia reste
donc écarté, et pour la première fois sans regret — voir l'amendement du 25/08
pour le détail du coût.

### Ce qui est livré

Dix-sept cadres, dont huit peints et neuf cuits, produits par
`apps/mobile/scripts/bake-garden-frames.sh` depuis les huit peintures
normalisées. 7,5 Mo d'assets ; la mémoire vive ne bouge pas, le composant monte
toujours exactement deux images.

**Les cadres sont espacés régulièrement en pas, pas alignés sur `MILESTONES`.**
C'est la décision qui compte. `MILESTONES` est de la copie — cinq paliers tous
les 2 000 pas puis des sauts de 5 000 — et y accrocher le rendu fait hériter
cette irrégularité comme rythme à l'écran. Écarts entre franchissements sur une
course complète, en millisecondes :

```
sur MILESTONES     1901  494  347  276  233  670  2580
tous les 1250 pas  1625 422 296 236 199 174 156 141 141 156 174 199 236 296 422 1625
```

Symétrique, médiane 236 ms, et les deux longs écarts restants sont l'ease-in et
l'ease-out de l'animation des pas, où une pause est légitime. Ça remet aussi le
rendu en accord avec ce que `bloom.ts` affirme depuis l'origine : les paliers
sont des libellés, jamais des états de rendu.

### Trois pièges payés, à ne pas repayer

- **Le blur du masque décide de tout.** Sous ~20 les plaques coupent les grosses
  fleurs en deux et les cadres intermédiaires se lisent comme de l'abîmé. À 30
  une fleur entière tombe d'un côté du seuil, et l'état intermédiaire se lit
  comme « un peu plus de fleurs ».
- **La polarité du masque est inversée** par rapport à l'intuition : noir garde
  la première peinture, blanc prend la seconde, d'où le `(1 - t)`. À l'envers,
  le jardin pousse à reculons sans qu'aucune mesure ne le signale.
- **Ne jamais faire passer l'indice de la paire montée par un `useEffect`.**
  L'effet s'exécute après le commit React : pendant une frame les sources sont
  les nouvelles et le worklet calcule avec l'ancien indice, ce qui affiche à
  pleine opacité le cadre d'*après* celui atteint. Un flash plein écran à chaque
  fin de transition. Lire l'indice depuis la closure de rendu — React installe
  les sources et le worklet dans le même commit.

### Conséquences

- Le fondu d'alpha en haut de l'image reste inutile (amendement du 25/08).
- Une courbe d'easing sur l'opacité est à proscrire : l'œil lit une dissolution
  par sa luminosité, qui suit la valeur directement. `Easing.linear`.
- `features/garden/` porte toujours le moteur SVG écarté, exporté par `index.ts`
  et tirant `react-native-svg` dans le bundle. Son sort n'est pas tranché.
