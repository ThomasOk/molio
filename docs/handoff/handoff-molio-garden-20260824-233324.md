# Handoff — jardin Molio, choix du moteur de rendu

**Date :** 2026-08-24 · **Repo :** `/Users/thomas/Documents/dev/molio` (rien de committé)
**Session précédente :** `docs/handoff/handoff-molio-garden-20260823-214343.md`

Cette session a repris la question « SVG, images ou Skia ? » posée à la fin de la
précédente, après que le lab jardin ait **gelé puis fermé l'app sur un Nothing
Phone (2)**.

---

## Lire d'abord

**`docs/adr/0001-moteur-de-rendu-du-jardin.md`** — à jour au 24/08. Il contient
le diagnostic complet du crash SVG, les preuves chiffrées, le contrat de perf en
cinq seuils avec les commandes `adb`, et **les trois pistes testées et écartées**
avec le motif de chaque rejet. Ne pas relitiger ce qui y figure ; en particulier,
ne pas re-condamner le flipbook sur un diff de pixels (l'ADR explique pourquoi
c'est le mauvais critère).

`.scratch/garden-flipbook/brief-frames.md` — mesures sur la peinture de référence
et la recette de détourage des sprites, avec ses deux pièges résolus.

---

## Où on en est

La direction retenue est **une série de paliers peints, avec transition par
dissolution**, proposée par l'utilisateur en fin de session. C'est *sa* décision
après avoir rejeté la composition procédurale par sprites : « c'est clairement pas
harmonieux, on ressent pas d'émotion ».

Le principe est validé sur une paire d'images. **Il reste à le valider sur la
série complète, et c'est tout l'objet de la prochaine session.**

### Ce qui est prouvé

- La transition entre deux paliers mal recalés **ne produit ni fantôme ni
  dédoublement** (`transition.gif`, `compare-transition.png`, `zoom-transition.png`).
- La dissolution à seuil de bruit est plus franche que le fondu linéaire, qui
  ramollit les pétales.
- `@shopify/react-native-skia@2.11` est compatible sans mise à jour (peer deps
  vérifiées contre react 19.1 / RN 0.81.5 / worklets 0.7.2 / reanimated 4.1.6).

### Ce qui n'est pas prouvé

1. **La transition sur les paliers bas.** 7→8 marche parce que les deux prairies
   sont proches. Les paliers 1 et 2 seront très différents l'un de l'autre, et
   c'est **là** que le fondu peut casser. À tester en priorité.
2. Rien n'a jamais tourné sur le téléphone. Les cinq seuils de l'ADR sont
   intouchés.

---

## À générer — c'est le sujet de la prochaine session

**Huit paliers**, tous dérivés de la prairie pleine déjà existante.

`.scratch/garden-flipbook/f5.png` **est le palier 8** (1024×1536, prairie
complète, papier `#FBF6EA`). Ne pas le régénérer, tout descend de lui.
`.scratch/garden-flipbook/f4.png` existe déjà et correspond à peu près au
**palier 6** — à replacer dans la série une fois les autres produits.

| Palier | Hauteur de la végétation | Contenu |
| --- | --- | --- |
| 1 | ~15 % | Sol quasi nu, quelques pousses fines, aucune fleur ouverte |
| 2 | ~22 % | Deux ou trois bourgeons fermés, encore aucune fleur |
| 3 | ~30 % | Premières petites fleurs blanches et jaunes, éparses |
| 4 | ~38 % | Un peu plus dense, premiers bleus |
| 5 | ~45 % | Floraison modérée, le feuillage commence à faire masse |
| 6 | ~50 % | ≈ `f4.png` existant |
| 7 | ~55 % | Dense, premiers rouges au premier plan |
| 8 | ~60 % | = `f5.png`, floraison complète, papillons |

### Méthode

Générer **en descendant**, 8 → 1, chaque image étant une **édition de la
précédente**. La raison est établie : partir du bas donne au modèle carte blanche
pour composer et les frames divergent ; partir du haut lui laisse ~90 % de
l'image à préserver et un travail soustractif.

Prompt d'édition (adapter le pourcentage et la description à chaque palier) :

```
Keep this exact image. Same composition, same ground line, same cream
background, same palette, same brush character. Do not move the large flowers.

Remove some of the flowers and shorten the vegetation so it now reaches about
{X}% of the image height instead of {Y}%. {Description du palier.} Fill what you
removed with the same plain cream paper, with no trace and no shadow.
```

**La consigne qui décide de tout : garder l'ossature.** Le sol au même endroit,
les grandes fleurs à peu près aux mêmes positions. C'est ce qui fait que la
dissolution fonctionne malgré le repeint. Un décalage fin est acceptable et se
lit même comme du végétal qui bouge — c'est le point sur lequel l'utilisateur
avait raison et l'agent précédent tort.

Le modèle repeindra la scène plutôt que d'éditer. **Ce n'est pas un échec.** Ne
pas relancer pour améliorer la fidélité des pixels ; juger uniquement sur
l'aspect du fondu.

### Déposer les images

`.scratch/garden-flipbook/paliers/p1.png` … `p8.png`, 1024×1536.

### Vérifier

Ne jamais juger sur une bande d'images côte à côte — cinq belles images alignées
paraissent toujours cohérentes. Ce qui révèle un problème, c'est le fondu :

```bash
cd .scratch/garden-flipbook/paliers
for i in 1 2 3 4 5 6 7; do
  magick composite -blend 50 p$((i+1)).png p$i.png b-$i$((i+1)).png
done
magick montage b-*.png -tile 7x1 -geometry +10+10 -background '#CFC4A6' blends.png
```

Un sol qui a dérivé apparaît **en double** dans `blends.png`. Regarder d'abord
`b-12.png` et `b-23.png`.

Puis enchaîner la série complète en animation, comme `transition.gif` a été
produit (recette dans l'historique : masque de bruit flouté, `-level` glissant de
-18 %,8 % à 118 %,144 % sur 20 frames, `-delay 6`).

**Critère d'arrêt :** si la chaîne 1→8 ne se lit pas comme un jardin qui pousse,
la piste est morte et il faut passer à un·e illustrateur·rice livrant des calques.

---

## Après les images

Deux réglages font partie du rendu et ne doivent pas être oubliés :

- **Micro-variation d'échelle à l'intérieur d'un palier.** Sans elle, +400 pas ne
  produit aucun changement visible la plupart du temps, ce qui tue le sentiment
  de satisfaction recherché. L'image est dessinée très légèrement plus grande à
  mesure que les pas montent, ancrée en bas.
- **Fondu d'alpha sur le haut de l'image.** Le papier peint n'a pas exactement la
  couleur du fond de l'app ; sans fondu on voit le rectangle. Vérifié sur la
  peinture de masse (papier à `#F1E7CB` contre `#FBF6EA`).

Puis le vrai jalon : monter ça dans Skia et **mesurer sur le Nothing Phone**.
Trois des cinq seuils de l'ADR y sont mesurables exactement ; pour le cold start,
dérater ×3 (viser ~400 ms pour tenir 1,2 s sur un milieu de gamme).

---

## Réutilisable, produit cette session

Dans `.scratch/garden-flipbook/` — répertoire à **176 Mo**, presque entièrement
jetable. Ce qui compte :

| Fichier | Quoi |
| --- | --- |
| `f5.png` | La prairie pleine. Palier 8, source de toute la série. |
| `f4.png` | ≈ palier 6. |
| `mass.png`, `mass-c.png` | Peinture de masse sans grandes fleurs. Inutile pour le flipbook, à garder si les sprites étaient rouverts. |
| `sprites/{shoot,bud1,buds2,butter,daisy,yarrow,cosmos,corn,scab,poppy2,grass,tuft,wispy,clump,fern}.png` | 15 sprites détourés, fond transparent, même main. Dormants. |
| `transition.gif` | La preuve que la transition fonctionne. |
| `scene5.sh` | Le compositeur procédural. Approche écartée ; utile seulement comme référence de paramétrage. |

Tout le reste (`p-*`, `s-*`, `t-*`, `u-*`, `v-*`, `w-*`, `*x.png`, fichiers de
travail) est de la sortie intermédiaire supprimable.

**`.scratch/garden-flipbook/prompts.md`** contient les prompts de génération et la recette de
détourage — utile si de nouveaux sprites devenaient nécessaires.

---

## Pièges rencontrés, à ne pas repayer

- **Locale française.** `awk` sort `0,0000` avec une virgule, ce qui casse
  silencieusement tous les nombres passés à ImageMagick. `export LC_ALL=C` en
  tête de tout script.
- **`-flatten` après `-alpha off`** ne composite pas sur `-background` : composer
  explicitement sur un `xc:'#RRGGBB'`.
- **`-trim` ne recadre pas** un PNG dont le fond transparent garde du bruit RGB.
  Passer par `-alpha extract -threshold 6% -morphology Open Disk:4 -format %@`
  puis `-crop`.
- **`sed 's/^FEET=.*/…/'`** avale ce qui suit sur la ligne. Une définition
  écrasée donne un rendu entièrement vide sans aucune erreur.
- **Jamais de fond blanc** pour générer un sprite : des pétales blancs sur fond
  blanc sont littéralement les mêmes pixels. Fond gris clair uni.

---

## Suggested skills

- **`animate-expo`** — avant de toucher à la transition. Quel thread, quelles
  propriétés, `useAnimatedReaction` sur le franchissement de palier. Déjà utilisé
  dans les sessions précédentes de ce projet.
- **`performance`** — avant de mesurer sur le téléphone. C'est exactement le
  sujet du contrat de perf de l'ADR.
- **`design-foundations`** ou **`ui-review`** — pour juger les paliers générés.
  Les rejets successifs de l'utilisateur cette session étaient tous des jugements
  de composition, pas d'ingénierie.
- **`code-review`** — avant tout commit. `features/garden/` (3 137 lignes) est
  déjà sur `main` et repose sur le moteur SVG écarté ; son sort n'est pas tranché.

Ne pas invoquer `improve-animations` ni `find-animation-opportunities` : le
mouvement se réduit à une transition entre deux images.

---

## Décisions de l'utilisateur — ne pas relitiger

- Le SVG est abandonné. Motif esthétique autant que technique, voir l'ADR.
- La composition procédurale par sprites est rejetée. Motif : l'harmonie.
  Aucun réglage ne la sauve, ne pas reproposer d'affiner les placements.
- Le jardin est destiné à **devenir Home**, l'écran principal et l'identité de
  l'app. Ce n'est plus un lab.
- La prairie **monte** avec les pas, elle ne fait pas que se densifier.
- Point signalé et non tranché : une aquarelle générée par IA est une fondation
  faible pour une identité de marque. La dépense la plus lourde à venir est de
  faire peindre l'art définitif, en exigeant une livraison **en calques**.
