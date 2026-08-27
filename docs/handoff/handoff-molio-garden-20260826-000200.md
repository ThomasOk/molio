# Handoff — jardin Molio, du flipbook peint au rendu en place

**Date :** 2026-08-26 · **Repo :** `/Users/thomas/Documents/dev/molio` (rien de committé)
**Session précédente :** `docs/handoff/handoff-molio-garden-20260824-233324.md`

Cette session a fait deux choses : **produire la série des huit peintures**, qui
était l'objet du handoff précédent, puis **la monter dans l'app et la régler sur
appareil** — ce qui n'était pas prévu et qui a produit l'essentiel des
apprentissages.

---

## Lire d'abord

**`docs/adr/0001-moteur-de-rendu-du-jardin.md`** — trois amendements ont été
ajoutés cette session, aux dates du 25 et du 26. Ils contiennent :

- le retrait de Skia et son motif chiffré ;
- l'état de la série des huit paliers et les deux acquis de méthode de
  génération ;
- **la contrainte fluidité/netteté et sa résolution par la dissolution cuite**,
  avec les trois pièges payés.

Tout est là. Ne pas relitiger ce qui y figure — en particulier ne pas
reproposer Skia sans lire l'amendement du 26, et ne pas re-condamner le flipbook
sur un diff de pixels (raison au 24/08).

`apps/mobile/src/features/garden/components/garden-flipbook.tsx` — le composant.
Il est abondamment commenté, chaque constante porte son pourquoi. C'est la
seconde chose à lire.

---

## Où on en est

**Ça tourne, et l'utilisateur a validé le fond.** Testé sur Nothing Phone (2) à
plusieurs reprises pendant la session. Le dernier réglage — les dix-sept cadres
espacés régulièrement en pas — **n'a pas encore été testé.** C'est la première
chose à faire.

### Ce qui est acquis

- La série des huit peintures existe, papier normalisé, fondus propres sur toute
  la chaîne y compris entre les paliers bas — le doute principal du handoff
  précédent est levé.
- Le flipbook rend dans le lab, `pnpm type-check` et `pnpm lint` passent à 0
  erreur.
- Le fond transparent a été testé et écarté ; l'aquarelle *est* le papier.
- Skia n'est pas nécessaire, et on sait maintenant précisément pourquoi.

### Ce qui n'est pas fait

1. **Les cinq seuils du contrat de perf de l'ADR n'ont jamais été mesurés.**
   C'est le vrai jalon restant, et c'est l'absence de ces mesures qui avait
   laissé pourrir le spike SVG. Trois se mesurent exactement sur le NP(2).
2. Le jardin est toujours dans le lab, pas sur Home.
3. Le sort de l'ancien moteur SVG n'est pas tranché.

---

## Fichiers produits ou modifiés

| Chemin | Quoi |
| --- | --- |
| `apps/mobile/src/features/garden/components/garden-flipbook.tsx` | Le composant. Nouveau. |
| `apps/mobile/src/features/garden/assets/frame-00..16.jpg` | Les 17 cadres, 1024×1536, 7,5 Mo. |
| `apps/mobile/scripts/bake-garden-frames.sh` | Régénère les 17 cadres depuis les 8 peintures. |
| `apps/mobile/src/features/garden/garden-lab-screen.tsx` | Modifié : flipbook à la place de `GardenScene`, palette épinglée en clair, bouton de thème retiré. |
| `apps/mobile/src/features/garden/palette.ts` | Modifié : ajout de `GARDEN_PAPER`. |
| `docs/adr/0001-...md` | Trois amendements. |

### Dans `.scratch/garden-flipbook/paliers/` — **346 Mo, à trier**

À garder, ce sont les sources de tout le reste :

| Fichier | Quoi |
| --- | --- |
| `norm/p1.png` … `p8.png` | **Les huit peintures, papier normalisé.** Tout descend de là. |
| `p1.png` … `p8.png` | Les mêmes avant normalisation. |
| `normalize.sh` | Aligne le papier des huit sur celui de p8. |
| `PROMPTS.md` | Les 7 prompts d'édition qui ont produit la série. |
| `verify.sh` | Mesure les hauteurs, produit `blends.png`. |

Jetable : `frames/`, `cmp/`, `cmp2/`, `inter/`, `out768/`, `out1024/`, tous les
`b-*.png`, les GIF et les images de comparaison.

**`.scratch/` n'est pas dans le `.gitignore`.** À trancher avant tout commit.

---

## Les deux ou trois choses à savoir avant de toucher au rendu

Le détail est dans l'ADR. Le résumé opérationnel :

- **Ne pas mettre d'easing sur l'opacité.** `Easing.linear`, et la raison est
  dans le code.
- **Ne pas faire passer l'indice de la paire montée par un `useEffect`.** Ça
  produit un flash plein écran à chaque fin de transition. Le piège a déjà été
  payé une fois.
- **`FRAME_FADE_MS` se règle contre le rythme des franchissements**, pas contre
  la sensation d'un fondu isolé. Les écarts réels sont tabulés dans le commentaire
  de la constante.
- **Le blur du masque dans le script de cuisson** décide si un cadre
  intermédiaire se lit comme une prairie ou comme une image abîmée. 30, pas
  moins de 20.

---

## Prochaines étapes, dans l'ordre

**1. Tester les 17 cadres sur l'appareil.** `pnpm android`, tirer le scrubber sur
toute la course. La question est de savoir si le mouvement a retrouvé la
fluidité que l'utilisateur avait avant, sans le flou au repos. Deux leviers si
ça ne suffit pas, dans cet ordre : ajuster `FRAME_FADE_MS` (400 aujourd'hui),
puis passer `STEP` à 1000 dans le script pour 21 cadres et ~9 Mo.

**2. Mesurer le contrat de perf.** C'est le jalon qui manque depuis le début.

```bash
adb shell dumpsys meminfo <pkg>              # < 25 Mo résidents
adb shell dumpsys gfxinfo <pkg> framestats   # 0 frame rendue au repos
adb shell am start -W                        # < 400 ms sur le NP(2), dératé ×3
```

Le NP(2) est un flagship, donc un mauvais instrument : il ne détecte que les
défaillances structurelles. Compléter par un AVD plafonné à 2 Go.

**3. Décider du sort de `features/garden/`.** `index.ts` exporte toujours
`garden-scene`, qui tire `flora.ts` et `react-native-svg` dans le bundle alors
que le moteur SVG est écarté. Le débrancher allégerait ; `flora.ts` doit rester
dormant selon l'ADR.

**4. Passer le jardin sur Home.** C'est la décision de fond de l'utilisateur : le
jardin devient l'écran principal et l'identité de l'app. Le lab reste comme
écran de test — décision explicite de cette session.

---

## Points ouverts, non tranchés

- **L'échelle micro-variable.** `SCALE_SPAN = 0.05` sur toute la course, soit
  0,3 % par cadre. C'est le seul retour continu entre deux cadres. À l'usage,
  peut sembler parasite ou insuffisant ; c'est une constante.
- **Pas de mode sombre sur cet écran** sans refaire peindre l'art. Le papier
  crème est la couleur de l'écran, pas un calque échangeable. À porter au cahier
  des charges de l'illustrateur·rice.
- **Les écarts de hauteur entre paliers restent irréguliers** : de 2 à 15 points,
  et p6/p7 n'en ont que 2. Absorbable par l'échelle de base plutôt qu'en
  régénérant des peintures.

---

## Décisions de l'utilisateur — ne pas relitiger

Celles des sessions précédentes tiennent toujours (voir le handoff du 24/08 :
SVG abandonné, sprites rejetés, jardin destiné à devenir Home, la prairie monte).
S'ajoutent celles-ci :

- **Skia n'est pas ajouté.** « J'aimerais d'abord qu'on voie ce que ça donne sans
  avant d'ajouter cette couche supplémentaire. » La question a été rouverte deux
  fois avec des arguments chiffrés, et la réponse a tenu — puis la dissolution
  cuite l'a rendue sans objet.
- **Le lab reste l'écran de test.** Le jardin n'est pas monté directement sur
  Home.
- **Image nette au repos, animation seulement au franchissement.** C'est
  l'utilisateur qui a diagnostiqué le défaut, mieux que l'agent : le problème
  n'était pas le délavage pendant la transition mais l'écran d'accueil flou en
  permanence.

---

## Suggested skills

- **`animate-expo`** — avant tout réglage de `FRAME_FADE_MS`, de l'échelle ou de
  la transition. Déjà utilisé dans les sessions précédentes de ce projet.
- **`performance`** — avant de mesurer sur le téléphone. C'est exactement le
  sujet du contrat de perf de l'ADR.
- **`code-review`** — avant tout commit. Rien n'est committé et la surface
  touchée est réelle.
- **`design-foundations`** ou **`ui-review`** — pour juger le rendu à l'œil. Tous
  les arbitrages décisifs de cette session ont été des jugements de perception
  de l'utilisateur sur appareil, jamais des mesures.

Ne pas invoquer `improve-animations` ni `find-animation-opportunities` : le
mouvement se réduit à une transition entre deux images.

---

## Une note de méthode qui a servi tout du long

Deux fois cette session, une analyse a été démentie par une mesure, et deux fois
la mesure a changé la décision : les statistiques globales ne distinguaient pas
le fondu de la dissolution, alors que l'écart au plus proche des deux peintures
les séparait nettement ; et « les paliers sont franchis toutes les ~930 ms »
était une moyenne qui cachait des écarts de 233 à 2 580 ms.

Sur ce sujet, ne pas juger sur une bande d'images côte à côte ni sur une
moyenne. Fabriquer l'état exact dont on parle et le regarder.
