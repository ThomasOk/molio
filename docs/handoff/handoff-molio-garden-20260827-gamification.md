# Handoff — jardin Molio : gamification

> Document multi-sessions. **La plus récente est en tête.** Sous le premier `---`,
> la session fondatrice du 2026-08-27 (Niveau du jour) est conservée intégralement.

---

## Session 2026-08-29 (6) — **écran Classement du jour** (fausses données), accès depuis la feuille de personnage, bouton en relief

**Date :** 2026-08-29 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** ⚠️ **rien de committé pendant la session** — commité et
mergé par cette même session juste après, en PR séparées (voir section 7).
**À lire d'abord :** la session 2026-08-29 (5) ci-dessous (celle qui annonçait le classement
comme prochain gros morceau) + `friends.ts` / `leaderboard.ts` / `garden-leaderboard-screen.tsx`
directement, le code est plus court que ce handoff.

Le morceau annoncé depuis quatre sessions. Un aperçu artifact a précédé le code (référence
fournie par l'utilisateur, une app d'habitudes façon iOS), puis trois itérations en cours de
route sur commentaire direct de l'utilisateur : l'entrée a changé d'endroit deux fois, et le
bouton d'accès a été refait une fois pour un vrai défaut visuel.
Artifact (mis à jour sur la même URL à chaque itération) :
https://claude.ai/code/artifact/604c6b0f-f577-477c-9221-d77a024e07ab

**Tout passe `pnpm --filter mobile type-check` (0) et `lint` (0 erreur ; 14 warnings
`react-refresh` préexistants, aucun ajouté) à chaque étape. `expo export --platform ios` →
bundle OK à chaque étape. Rien vu tourner sur appareil ni sur simulateur cette session.**

### 1. L'écran Classement (`garden-leaderboard-screen.tsx`, nouveau)

Une ligne par marcheur : rang · fleur (42 px) · nom + pas du jour · 7 carrés de tendance.
Transposition assumée de la référence, pas une copie — voir section 5 pour l'arbitrage qui en
est le cœur.

- **`friends.ts`** (nouveau) — 11 marcheurs en dur, un mock explicite comme `profile.ts` et le
  seed de `use-day-history.ts`. Une seule teinte est réservée (`coral`, celle de `PROFILE`), les
  autres se répètent parfois — c'est l'état honnête d'un jardin, le rang et le nom portent
  l'identité de toute façon.
- **`leaderboard.ts`** (nouveau) — `buildStandings(history, today)` fusionne moi (lu depuis
  `useDayHistory`, **pas mocké**) et les amis, trie par pas du jour décroissant (départage par
  nom), dérive les paliers des 7 derniers jours via `tierForDay`. **Ma ligne n'est pas un mock** :
  un sync sur la Home me fait remonter le classement pour de vrai, et le bouton dev
  `+10 000 pas` est le moyen le plus rapide de le vérifier.
- **`components/trend-row.tsx`** (nouveau) — délibérément PAS `TierSquares` (qui sert la
  heatmap) : la seule vraie règle empruntée à la référence, **un jour à 0 se rétracte en point**
  (5 px) au lieu de peindre un carré plein. Sur le crème, le palier 0 (`#E7E1D2`) est à un
  cheveu du fond ; un carré plein à cette taille s'y lit comme un trou. Deux tailles seulement,
  jamais cinq — la couleur porte déjà l'intensité, la taille ne dit que « ce jour a eu lieu ».
- **Fond nu, pas de cartes** — cohérent avec la décision déjà prise sur l'écran Stats. Testé
  en A/B dans l'artifact (papier + filet vs cartes blanches) : neuf cartes blanches auraient
  fait de cet écran le plus bruyant de l'app.
- **Ma ligne = pastille plus claire que le papier** (`#FFFDF7`), filet, mention « VOUS » — mais
  seulement pour la ligne dans la liste, jamais pour la barre épinglée (section 2), qui répète
  le même visuel pour rester lisible en flottant sur le contenu qui défile derrière.
- **`formatDayMonth`** ajouté à `calendar.ts` — « samedi 29 août », sans année : le classement
  parle d'aujourd'hui, une année dessus le ferait lire comme une archive.

### 2. Ma ligne reste joignable — la barre épinglée

Quand ma ligne sort du viewport, une copie glisse depuis le bas ; un tap dessus recentre le
scroll dessus.

- **Position par arithmétique, pas par mesure** : `listTop + myRank × ROW_H` (`ROW_H = 68` fixe).
  Un seul événement `onLayout` sur le conteneur de liste plutôt qu'une ref par ligne, et
  l'arithmétique reste juste pendant le scroll — condition : aucune ligne ne peut grandir sous
  une police plus grande, ce qui tient tant que `numberOfLines={1}` sur le nom.
- **`useAnimatedReaction` sur le franchissement, pas `useDerivedValue` seul.** Premier essai :
  un `withTiming` retourné directement par le `useDerivedValue` de visibilité — relancé à
  **chaque frame de scroll**, il ne finit jamais d'arriver puisqu'il est sans cesse redémarré.
  Correction : un `useAnimatedReaction` qui compare `next !== previous` et n'anime que sur le
  changement d'état (160 ms).
- **`pinHeight` calculé une fois** (`ROW_H + PIN_PAD*2 + insets.bottom`) et partagé entre le
  test de visibilité, le padding du bas de la liste et le décalage de glissement — sinon la
  barre s'arrête à mi-chemin hors écran sur les appareils à home indicator.
- **Non jugé sur appareil.** L'utilisateur avait validé le principe sur l'aperçu (« épinglé, je
  regarderai ce que ça donne ») ; c'est le point le plus exposé de tout l'écran.

### 3. L'accès — trois versions en une session, sur commentaires directs

L'ordre compte, chaque étape corrige la précédente sur intervention de l'utilisateur :

1. **D'abord un glyphe sur la Home**, à côté du bouton Stats (trois barres décroissantes,
   16 px). **Rejeté par l'utilisateur** avant même d'être vu tourner — question posée
   directement : « et si on mettait l'accès sur l'écran Niveau ? »
2. **Argument retenu, plus fort que « désencombrer la Home »** : les deux coins hauts de la
   Home disent tous les deux « moi » (mon portrait, mon activité) ; le classement est la
   première chose de l'app qui parle des *autres*, il n'est pas de la même nature. L'écran
   Niveau est la feuille de personnage — un rang y est une statistique de personnage comme le
   niveau. Glyphe retiré, **une ligne texte posée dans le bloc centré** (« 6ᵉ sur 12 au
   classement › »), lisant `useDayHistory` pour calculer le rang.
3. **Rejeté à son tour** : « je pense qu'on devrait juste mettre un bouton pour consulter le
   classement sans rien révéler directement ». Bon argument de ton, pas d'information — l'écran
   Niveau est celui où atterrit un passage de niveau, y imprimer un rang accueille ce moment par
   un verdict. **La ligne devient un bouton muet**, sorti du bloc centré (`position: absolute`
   en bas), qui n'affiche plus le rang — et l'écran Niveau perd sa dépendance à
   `useDayHistory`/`buildStandings` en même temps.
4. **Icône + relief demandés explicitement** (deux images de référence fournies : une app
   d'habitudes, et trois boutons ronds en glassmorphism). Voir sections 4 et 5.

Le point qui reste vrai à travers les trois versions : **l'écran Niveau ne bouge pas**. Le lien
est en `position: absolute`, hors du bloc centré — portrait, barre d'XP, compteur gardent
exactement le cadrage déjà réglé.

### 4. L'icône — `components/podium-mark.tsx` (nouveau)

Trois marches, la plus haute au centre, dans l'agencement d'un vrai podium (2ᵉ à gauche, 1ʳᵉ au
centre, 3ᵉ à droite) — c'est ce qui empêche trois barres de se lire comme un graphique.

- **Marches plates**, pas de capsules — un podium est une chose sur laquelle on se tient ; des
  sommets arrondis lisent comme un diagramme à barres aux bouts pilule.
- **Couleurs = rampe des paliers, montée jusqu'au corail pour la 1ʳᵉ place** — le même sommet
  que la heatmap donne au meilleur jour de l'année ; les deux écrans récompensent le haut d'une
  échelle par une seule couleur. Effet de bord voulu : ça évite aussi qu'une marche dans un vert
  pâle (`tiers[1]`, `#CBE4A2`) se délave sur le crème — un podium avec une marche invisible est
  un podium cassé. **Prise d'initiative de l'agent, non redemandée par l'utilisateur** — à
  confirmer, le corail est déjà pris par la barre d'XP juste au-dessus.

### 5. Le bouton en relief — `components/raised-button.tsx` (nouveau) + `palette.ts` (`raised`)

Demande explicite : « donner un effet de relief au bouton, quelque chose qui donne envie
d'appuyer », avec une image de référence (boutons ronds glassmorphism).

- **La recette de la barre d'XP, retournée.** Là, l'ombre `inset` est en HAUT et creuse une
  gorge ; ici la même ombre passe en BAS et bombe la face vers l'utilisateur au lieu de la
  creuser. Zéro dépendance ajoutée — `boxShadow`, déjà éprouvé sur Android par la barre elle-même
  (session (5), l'enquête liquid glass).
- 🐛 **Corrigé en cours de session, signalé par l'utilisateur** (« la zone blanche du bouton ne
  fait pas propre, ça fait une tâche ») : le premier jet copiait le calque blanc plein de la
  barre d'XP (une `View` couvrant les 40 % du haut). À 14 px de haut ce calque a son bord bas à
  un ou deux pixels de la crête, invisible ; agrandi à un bouton de 46 px, ce même bord trace une
  **couture nette en travers de la face**. La lumière sur une courbe n'a pas de bord : le calque
  est remplacé par une **ombre interne floue** (`inset 0px 7px 9px`) qui s'éteint au lieu de
  s'arrêter. Le composant y perd une couche de style, il est plus court qu'avant. Le jeton
  `palette.raised.gloss` porte maintenant en commentaire la règle « ombre interne floue, jamais
  calque peint » pour empêcher de refaire l'erreur en agrandissant un autre bouton un jour.
- **Nouveau jeu de jetons `palette.raised`** (`face`, `gloss`, `bezel`, `seat`, `shadow`), light
  et dark, documenté à côté de `xp`. Délibérément non teinté — l'accent du bouton est son icône,
  la barre d'XP juste au-dessus possède déjà le corail de l'écran.
- **Le bouton s'enfonce sous le doigt** : échelle 0,965, assombrissement léger.
  **90 ms à la descente (le doigt est déjà là), 220 ms à la remontée** (un relâchement qui doit
  se lire comme une remontée, pas un instantané) — asymétrie déjà établie ailleurs dans l'app
  (le pop de level-up). **Sans rebond**, conformément à la décision déjà prise sur toutes les
  animations de niveau. Sous mouvement réduit, l'échelle disparaît et seul l'assombrissement
  répond.
- **Pas de chevron sur le bouton** — la flèche du lien texte était le seul signal « tappable » ;
  le relief le remplace, deux signes pour un seul travail est de trop.

### 6. Décisions utilisateur — ne pas relitiger

- Le classement se transpose, il ne se copie pas : **la couleur des carrés reste le barème
  partagé `palette.tiers`** (déjà pris par la heatmap), **l'identité passe dans la fleur**
  (`FlowerAvatar`, recolorable).
- Fond nu, pas de cartes. Jour à 0 = point, pas carré plein. Sept jours de tendance, pas cinq.
- Ma ligne **s'épingle** en bas de l'écran quand elle sort du scroll — validé sur artifact,
  **pas encore jugé sur appareil**.
- L'accès au classement est sur l'**écran Niveau**, pas sur la Home — **glyphe de coin refusé**,
  **ligne de rang refusée**, retenu : **un bouton muet qui ne révèle aucun rang**.
- Le bouton doit avoir un **relief qui donne envie d'appuyer**, avec une **icône de podium**
  (marches plates, demandées explicitement après un premier jet en capsules).

### 7. Fichiers de la session

**Nouveaux** (`apps/mobile/src/features/garden/`) : `friends.ts`, `leaderboard.ts`,
`components/trend-row.tsx`, `components/podium-mark.tsx`, `components/raised-button.tsx`,
`garden-leaderboard-screen.tsx`. Plus `app/garden-leaderboard.tsx`.
**Modifiés** : `calendar.ts` (`formatDayMonth`), `index.ts` (export), `app/_layout.tsx` (route,
`contentStyle`), `palette.ts` (jetons `raised`), `garden-level-screen.tsx` (le bouton).
`garden-home-screen.tsx` **n'a subi aucun changement net** — un glyphe y a été ajouté puis
retiré dans la même session (voir section 3.1-3.2).

Committé par cette session juste après ce handoff, en PR séparées :
1. L'écran Classement (`friends.ts`, `leaderboard.ts`, `trend-row.tsx`,
   `garden-leaderboard-screen.tsx`, la route, `formatDayMonth`, l'export).
2. L'accès depuis la feuille de personnage (`podium-mark.tsx`, `raised-button.tsx`, les jetons
   `raised`, le bouton dans `garden-level-screen.tsx`) — **basée sur la première une fois
   mergée**, puisqu'elle pousse vers `/garden-leaderboard`.
3. Ce handoff.

### 8. À faire ensuite

1. **Voir tourner sur appareil** — priorité absolue, rien de cette session n'a été vu ailleurs
   que sur artifact web. Trois choses précises à juger (section 9).
2. Décider si le **corail en couronne du podium** (section 4) est gardé ou redescendu d'un cran
   — prise d'initiative de l'agent, pas explicitement demandée.
3. Toujours en attente : retirer les **outils dev** et les **mocks** (seed, `friends.ts`, clé
   `…v3`) avec la vraie source de pas — `friends.ts` s'ajoute maintenant à cette liste.
4. **Asset `profile-poppy.png` = 2,47 Mo** (rappel de la session (5), jamais traité).

### 9. À juger sur appareil (rien vu tourner cette session)

- **La barre épinglée** — le point le plus exposé : le calcul par arithmétique (`listTop + rank
  × ROW_H`) plutôt que par mesure, le seuil d'apparition/disparition, le glissement 160 ms.
- **Le bouton en relief** — la profondeur du `seat` (l'ombre basse, ce qui décide si la face est
  bombée ou juste posée), et si le bouton lit trop soutenu par rapport au papier une fois en
  vrai lumière d'écran plutôt qu'en aperçu web.
- **L'ombre interne floue de la crête** sur Android en particulier — jamais vue rendre en vrai,
  seulement en CSS ; c'est un pari raisonnable (le `boxShadow` de la barre d'XP tourne déjà là),
  pas une certitude.
- Le point creux à 5 px dans `TrendRow` sur le crème.

### Suggested skills

- **`animate-expo`** — pour juger le relief/pression du bouton et l'épinglage au doigt.
- **`apple-design`** — le podium et le relief empruntent la grammaire déjà établie (barre d'XP,
  level-up) plutôt que d'en inventer une nouvelle ; utile pour vérifier que l'emprunt tient.
- **`ui-review`** / **`emil-design-eng`** — pour la passe de jugement une fois sur appareil.
- ⚠️ **Ne pas** invoquer `animations` / `improve-animations` / `review-animations` : orientés
  web (CSS, Framer Motion), inutiles ici.

### Rappels d'environnement

- Expo **SDK 54**, RN 0.81.5, Reanimated **4.1.6**, Gesture Handler 2.28,
  `react-native-worklets` 0.7.2, `expo-blur` 15, `expo-haptics` 15. **Rien à installer.**
- Commandes : `pnpm --filter mobile type-check`, `pnpm --filter mobile lint`,
  `pnpm exec expo export --platform ios` (depuis `apps/mobile`).
- **Pas de trailer `Co-Authored-By` / `Claude-Session`** dans les commits de ce repo.
- L'utilisateur délègue push/PR/merge, et attend un **découpage en plusieurs PR** quand les
  sujets sont distincts.

---

## Session 2026-08-29 (5) — finition du zoom, **marche entre les jours**, **haptique du compteur**, et une chasse au bug **sur Android physique**

**Date :** 2026-08-29 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** ✅ **TOUT est committé et mergé.** Quatre PR, toutes
sur `main` : **#12** (zoom mois/jour — absorbe le retard des sessions (3) et (4)),
**#13** (toast de sync sur Android), **#14** (haptique du compteur), **#15** (ce handoff).
**Le retard de commit qui traînait depuis la session (3) est donc soldé.**
**À lire d'abord :** la session (4) ci-dessous — celle-ci la termine.

**Première session vue tourner sur un vrai appareil** (Android physique + simulateur iOS).
C'est ce qui change tout : les trois quarts de ce qui suit sont des choses qu'aucune
vérification statique n'aurait pu trouver.

### 1. Le zoom, finitions (PR #12)

- **Le retour ne se « pose » plus sur la grille.** Symptôme signalé par l'utilisateur : en
  revenant du mois vers la heatmap, un rectangle blanc venait se poser sur le mois. Cause :
  la surface est peinte en `GARDEN_PAPER` mais atterrit sur des **cases colorées**, et son
  contenu s'efface dès `progress < 0.35` — donc la dernière moitié de la fermeture montrait
  une plaque crème vide, ombre portée comprise. Correctif : la surface **se dissout pendant
  qu'elle rentre** (`fade` dans `useExpansion`, 150 ms contre ~220 ms pour le ressort), elle
  est partie avant d'être petite. `DayZoom` n'avait pas le défaut — sa couleur est celle de
  la tuile où elle atterrit, ce qui a servi de preuve du diagnostic.
- 🐛 **Le bouton retour du zoom renvoyait à la Home.** Vrai bug, pas une impression. Le
  `BackButton` de l'écran Stats est un **frère** de l'overlay et porte `zIndex: 1`, l'overlay
  n'en portait aucun — il peignait donc **par-dessus tout le zoom** et avalait le tap. Les
  deux boutons étaient au même pixel avec le même libellé, donc ça se lisait comme un seul.
  Correctif : `zIndex: 2` sur l'overlay du mois.
- **Les boutons retour nomment leur destination** (« ‹ août », « ‹ Mon activité »), à la
  façon d'iOS. Motif : trois zooms empilés au même coin du même écran, un « Retour » partout
  = le même mot pour trois choses. Minuscule sur le mois, pour coller au titre (« août 2026 »)
  et à l'usage français.
- **Correction de doc dans `expansion.ts`** : Reanimated **n'a pas de solution suramortie** —
  passé un ratio de 1 il bascule sur la formule critique, où la vitesse dépend de
  `stiffness/mass` **seul**. Le `damping: 24` d'`EXPAND_SPRING` ne fait donc rien de plus que
  « pas de rebond ». Le commentaire précédent laissait croire l'inverse ; **c'est `stiffness`
  qu'il faut bouger** pour changer le rythme (~420 ms aujourd'hui).

### 2. Marche d'un jour à l'autre dans le détail (PR #12)

Swipe latéral dans le détail du jour, comme entre les mois. Trois points de conception :

- **L'origine suit.** `useDayPicker` garde désormais **le coin mesuré de la grille + un
  index**, plus un rect figé : l'origine se re-dérive à chaque pas (`tileOrigin()`). Sans ça,
  passer du 8 au 12 puis refermer aurait recontracté dans la case du **8**.
- **La couleur se fond** (`useTierWash`, `interpolateColor`) : sans ça, passer d'un palier
  clair à un corail faisait un flash plein écran. Sur les **mêmes 240 ms** que le glissement.
  `ExpandingSurface.color` accepte donc `string | SharedValue<string>`.
- **Le glissement est mutualisé** : nouveau `components/use-page-slide.ts`, utilisé par les
  deux niveaux — les deux marches latérales ne peuvent plus diverger.
- **Bornes : on reste dans le mois.** Le 1er et le dernier jour vécu sont des murs (le swipe
  ne fait rien plutôt que de rejouer une animation sur place). Traverser vers le mois voisin
  supposerait de faire glisser l'écran du dessous en même temps — écarté, le mois est à un
  swipe vers le bas.

### 3. Haptique du compteur (PR #14)

Un tick léger à chaque cran que le compteur franchit **en montant**, après un pull-to-sync.
- **16 pulsations par sync, fixes** — pas « une tous les N pas ». Motif : `counterDuration`
  rend déjà la durée du compteur **indépendante du delta** (2 s dans tous les cas, cf. le
  raisonnement dans `bloom.ts`) ; garder le nombre de pulsations constant prolonge la même
  règle. Un cadencement par pas aurait fait l'inverse : bourdonnement sur un gros sync, rien
  sur un petit.
- Espacées **par fraction du trajet**, donc elles suivent `EASE_BLOOM` gratuitement : rares
  aux extrémités, denses au milieu où les chiffres défilent vite.
- **Le sens seul suffit** : les crans ne comptent qu'en montant, donc le `reset()` du bouton
  dev redescend en silence sans qu'on ait eu à lui dire que c'est un reset.
- Extrait en `useCounterTicks` — `useBloomLab` était déjà contre la limite de 110 lignes.
- **Réglage : `COUNTER_TICKS = 16`**, commenté sur place dans `use-bloom-lab.ts`.

### 4. Android physique : le liquid glass coûtait des frames (PR #13)

**Le morceau important de la session.** Symptômes rapportés : en allant Home → Niveau pendant
que le toast central était affiché, la transition **saccadait** et le fond du nouvel écran
paraissait **plus sombre** ; puis le toast s'éteignait **en trois temps** (le texte partait
avant la carte vide).

- **Cause : `experimentalBlurMethod="dimezisBlurView"`** sur `GlassToast`. Un flou n'est
  **pas une propriété**, c'est un calcul : il doit savoir ce qu'il y a derrière. iOS a une
  primitive système (`UIVisualEffectView`), gratuite. Android n'en a pas → la lib **capture
  ce qui est derrière, réduit, floute et redessine, à chaque frame**, plus une passe de rendu
  supplémentaire de la hiérarchie pour obtenir la capture. Pendant les **4 s** du toast. La
  doc d'expo-blur le dit sur cette prop exacte : *« experimental on Android and may cause
  performance and graphical issues »*, défaut `'none'` — on avait opté pour l'inverse.
  ⚠️ **Ça coûtait déjà autant avant ; ça ne se voyait pas tant que rien d'autre ne réclamait
  ces frames.** La transition est le seul moment où le budget est déjà pris.
- **Second mécanisme, la sortie en trois temps.** Sonner éteint un toast avec **une seule
  opacité** sur son conteneur. Android ne rend pas le groupe hors écran pour estomper le
  résultat : il **fait descendre l'alpha et le multiplie dans chaque enfant**. Des couches
  translucides calibrées pour se composer se défont donc en partant. L'ombre `elevation` est
  pire : dessinée par le système à partir du contour, elle n'entre pas du tout dans cet alpha.
- **Correctif = enlever, pas ajouter.** Le flou parti, les couches qui n'existaient que pour
  composer du verre par-dessus lui étaient de l'échafaudage. Sur Android la carte est
  maintenant **une seule vue opaque + son texte**, bordure hairline au lieu de l'`elevation`.
  iOS ne bouge pas d'un pixel. **Le composant est plus court qu'avant.**
- **`contentStyle` sur les routes jardin** (`_layout.tsx`) : le fond d'écran du navigateur
  vient du thème React Navigation (`#ffffff` clair, **`#121212` sombre**) et transparaît
  pendant qu'un écran s'anime. Posé pendant l'enquête ; **n'a pas suffi à lui seul**, mais
  gardé — c'est correct dans les deux thèmes.

### 5. Décisions utilisateur — ne pas relitiger

- Le retour du zoom **se dissout**, il ne se pose pas. L'animation iOS home grid est
  **conservée** (l'option « navigation classique sans animation » a été écartée).
- Les boutons retour **nomment leur destination**. **Pas** de poignée (grabber) : les deux
  niveaux sont plein écran, une poignée annonce une feuille avec quelque chose derrière.
- Marche entre les jours **bornée au mois**.
- Haptique = **nombre de pulsations fixe**, aligné sur la durée fixe du compteur.
- **Pas de flou Android** sur le toast. Le verre reste un choix iOS.
- L'utilisateur a explicitement demandé de **ne pas empiler des correctifs partout** —
  d'où le refus d'ajouter `needsOffscreenAlphaCompositing` « au cas où ».

### 6. Fichiers

**Nouveau :** `components/use-page-slide.ts`.
**Modifiés :** `components/{expansion.ts, expanding-surface.tsx, use-expansion.ts,
month-zoom.tsx, day-zoom.tsx, zoom-back-button.tsx, glass-toast.tsx}`, `use-bloom-lab.ts`,
`app/_layout.tsx`. (+ tout le lot de la session (4), committé tel quel en #12.)

### 7. Vérifications

`type-check` **0** et `lint` **0 erreur / 14 warnings préexistants** à chaque étape — y
compris **branche par branche, en isolant chaque commit au `git stash`**, pour qu'aucune des
trois PR ne casse `main` toute seule. `expo export --platform ios` → bundle OK.
**Vu tourner** sur Android physique (fluidité confirmée corrigée par l'utilisateur) et sur
simulateur iOS.

### 8. À faire ensuite

1. **Écran Classement social** en fausses données — le prochain gros morceau, en attente
   depuis quatre sessions (avatars = `FlowerAvatar`, tendance = `TierSquares` en ligne,
   couleurs = rampe `tiers`).
2. **Découvrabilité du swipe latéral**, maintenant à **deux niveaux** (mois *et* jour) et
   sans chevrons. Piste proposée, non faite : une rangée de points sous la grille. C'est le
   seul point de conception laissé ouvert.
3. Retirer les **outils dev** et les **mocks** (seed, clé `…v3`) avec la vraie source de pas.
4. **Asset `profile-poppy.png` = 2,47 Mo (1254×1254)** — soupçonné un moment dans l'enquête
   Android, jamais confirmé ni corrigé. À redimensionner si l'écran Niveau se remet à
   accrocher au montage.

### 9. À juger sur appareil

Le réglage `COUNTER_TICKS = 16` (trop dense ? pas assez ?). Le rendu de la carte de toast
Android sans verre. Le fondu de couleur entre paliers en marchant d'un jour à l'autre.

### Suggested skills

- **`animate-expo`** — toujours la référence des sessions garden.
- **`apple-design`** — la grammaire du zoom (mouvement physique, interruptibilité).
- **`ui-review`** / **`emil-design-eng`** — pour juger le rendu sur appareil.
- ⚠️ **Ne pas** invoquer `animations` / `improve-animations` / `review-animations` : orientés
  web (CSS, Framer Motion), inutiles ici.

### Rappels d'environnement

- Expo **SDK 54**, RN 0.81.5, Reanimated **4.1.6**, Gesture Handler 2.28,
  `react-native-worklets` 0.7.2, `expo-blur` 15, `expo-haptics` 15. **Rien à installer.**
- Commandes : `pnpm --filter mobile type-check`, `pnpm --filter mobile lint`,
  `pnpm exec expo export --platform ios` (depuis `apps/mobile`).
- **Pas de trailer `Co-Authored-By` / `Claude-Session`** dans les commits de ce repo.
- L'utilisateur délègue push/PR/merge, et attend un **découpage en plusieurs PR** quand les
  sujets sont distincts (ici 4).

---

## Session 2026-08-29 (4) — zoom façon **iOS home grid** : heatmap → **mois en tuiles** → **jour plein écran**

**Date :** 2026-08-29 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** ⚠️ **corrigé par la session (5) :** tout ce qui suit
était non committé au moment de l'écriture ; la (5) l'a committé (PR **#12**), avec le
reliquat de la (3) (PR **#13**). Le texte d'origine est conservé tel quel ci-dessous.
**À lire d'abord :** la session 2026-08-29 (2) (fenêtre glissante 52 semaines) puis la (3).

**Prochaine session (demande explicite de l'utilisateur) : « continuer le travail sur les
animations de la grille avec les détails ».** Tout ce qui suit est écrit pour ça.

### 1. Ce qui a été livré

Deux niveaux d'expansion en cascade, à partir de la heatmap de l'écran Stats :

1. **Tap sur la heatmap** → les **colonnes du mois touché** (pas la grille entière) s'étendent
   en plein écran ; l'écran Stats se floute derrière. Écran mois = **4 tuiles par ligne**,
   dans l'ordre du 1 au 31, numéro du jour **sous** chaque tuile, mois seul en haut.
2. **Tap sur une tuile** → elle s'étend en plein écran **dans la couleur de son palier**, avec
   **date + pas** (rien d'autre). Retour = **swipe vers le bas** (recontraction dans la case)
   ou « ‹ Retour ».

Référence d'origine : la démo **`ios-home-grid`** de reactiive.io, dont le code est
open-source — `src/animations/ios-home-grid/` dans `github.com/enzomanuelmangano/demos`
(fichiers utiles : `navigation/expansion-provider.tsx`, `navigation-item.tsx`,
`DetailScreenWrapper.tsx`, `MainScreenWrapper.tsx`). **Lire ces 4 fichiers avant de toucher
aux animations** — les valeurs de ressort viennent de là.

**Écart assumé avec la démo :** elle passe par une vraie navigation (provider à la racine +
push d'écran à la fin du ressort). Ici tout est **local à l'écran Stats** : des overlays
`position: absolute` montés sur un `useState`. Moins de pièces, pas de bagarre avec les
transitions d'expo-router. Conséquence à connaître : voir « Risques » ci-dessous.

### 2. Architecture des animations (ce qu'il faut savoir pour continuer)

- **`components/expansion.ts`** — le seul endroit où vivent la **physique** et la géométrie :
  `EXPAND_SPRING` (mass .1 / damping 24 / stiffness 25 → **suramorti, ratio ≈ 7,6**, glisse
  sans rebond), `COLLAPSE_SPRING` (ratio ≈ 0,98, plus raide → le retour est plus rapide que
  l'aller), `SCREEN_RADIUS = 44`, et le type `ExpandOrigin` (rect en coordonnées **page**).
- **`components/expanding-surface.tsx`** — la primitive : une `Animated.View` qui interpole
  width/height/translate/borderRadius de l'`origin` jusqu'au plein écran. **Détail central :**
  le contenu est posé **une fois en taille écran et contre-translaté**, donc la surface
  s'ouvre *comme une fenêtre* au-dessus de lui — rien ne se re-layoute pendant l'animation,
  c'est ce qui fait lire l'ensemble comme un seul objet. Opacité du contenu montée entre
  `progress` 0,35 et 0,8.
- **`components/use-expansion.ts`** — un niveau de zoom : ouvre au montage, expose `collapse`,
  le **swipe-down** (friction 0.3, `Math.pow(…, 1.2)`, scale plancher 0,7, seuils 150 px /
  900 px·s⁻¹) et le bouton retour Android. `onClose` n'est appelé **qu'à l'atterrissage** du
  ressort de fermeture.
- **`components/month-zoom.tsx`** — niveau 1. Contient aussi `useMonthPaging` (slide+fade de
  240 ms, `PAGE_SHIFT = 28`), `useDayPicker` (un seul `Gesture.Tap` pour toute la grille +
  un seul `measure()`), `tileGeometry()` et le rendu des tuiles.
- **`components/day-zoom.tsx`** — niveau 2.

**Contraintes du repo rencontrées (ne pas les redécouvrir) :**
- `max-lines-per-function: 110` — `MonthZoom` et `GardenStatsScreen` ont déjà été découpés
  pour repasser dessous. Toute addition force une extraction.
- **`eslint-plugin-react-compiler`** : une directive `'worklet'` **dans un hook** fait bailler
  le compilateur sur tout le hook, qui casse ensuite les `useCallback` du même hook
  (« Existing memoization could not be preserved »). D'où `cellIndexAt` **en portée module**
  dans `month-zoom.tsx`, et `pick`/`closeDay` en fonctions simples. Même piège si on ajoute un
  worklet ailleurs.
- `Gesture.Race(...)` **n'a pas** de `.enabled()` — il faut l'appeler sur chaque geste enfant
  (c'est ce qui coupe les gestes du mois quand le jour est ouvert).
- `collapsable={false}` **obligatoire** sur toute vue qu'on `measure()` (Fabric), sinon `null`.
- `scheduleOnRN` (react-native-worklets) est l'idiome maison, pas `runOnJS`.

### 3. Décisions utilisateur — ne pas relitiger

- Zoom en **deux niveaux** : grille → **mois**, mois → **jour**. Animation = celle de la démo
  iOS home grid.
- Écran mois = **grille de 4 tuiles par ligne** façon écran d'accueil (l'utilisateur a fourni
  une capture de référence), **pas un calendrier** : ni alignement par jour de semaine, ni
  en-tête L M M J V S D, ni cases vides de début/fin de mois.
- **Mois seul en haut**, **numéro du jour sous chaque tuile**. Les chevrons ‹ › de navigation
  ont été **retirés** à cette occasion — on change de mois au **swipe latéral**.
- Détail du jour = **plein écran**, **fond = la couleur du palier de la case**, contenu =
  **date + pas**, rien d'autre.

### 4. Choix de conception faits par l'agent (discutables, à valider)

- **Rien ne défile** dans l'écran mois : la tuile se dimensionne sur la plus contraignante des
  deux dimensions (57 px sur un iPhone 390×844), donc 31 jours = 8 lignes tiennent d'un écran.
  Motif : un `ScrollView` vertical dans une surface qu'on referme aussi par un swipe vers le
  bas = bagarre de gestes.
- **L'aire tactile est la case entière** (85 × 85), pas la tuile (57).
- **Aujourd'hui** = numéro en gras + encre pleine (un anneau sur la tuile salissait l'aspect
  « icône »). **Jours à venir** = contour vide, non tappables. **Jour à 0 pas** = ouvrable,
  affiche « Aucun pas ».
- `inkOnTier()` ajouté à `palette.ts` : encre crème sur les paliers 3-4, encre du jardin en
  dessous. Sert au fond coloré du détail du jour.

### 5. Aperçu visuel (déjà produit, ne pas refaire)

Artifact « Le mois en tuiles » — rendu aux dimensions réelles + géométrie calculée :
https://claude.ai/code/artifact/8617f0cd-bebf-4aad-a74e-a29f06a61c67
(Republier sur **la même URL** si on le met à jour.)

### 6. Fichiers de la session

**Nouveaux** (`apps/mobile/src/features/garden/`) : `calendar.ts` (dates FR, sans `Intl`),
`components/expansion.ts`, `components/expanding-surface.tsx`, `components/use-expansion.ts`,
`components/month-cells.ts`, `components/month-zoom.tsx`, `components/day-zoom.tsx`,
`components/zoom-back-button.tsx`.
**Modifiés** : `garden-stats-screen.tsx` (geste + overlay ; les helpers de date sont partis
dans `calendar.ts`, extraction de `useMonthZoom` et `ActivityGrid` pour la limite de lignes),
`palette.ts` (`inkOnTier`).

### 7. Vérifications faites

`pnpm --filter mobile type-check` → **0**. `lint` → **0 erreur, 14 warnings**
(*exactement* les préexistants `react-refresh`, aucun ajouté — c'est pour ça que les
constantes sont dans `expansion.ts` et pas dans le fichier du composant).
`pnpm exec expo export --platform ios` → **bundle OK** (valide que les worklets passent le
plugin Babel). **RIEN vu tourner sur appareil ni sur simulateur.**

### 8. Risques connus / à juger sur appareil — le cœur de la prochaine session

1. **Délai tap → début d'expansion.** L'overlay se monte via `useState`, donc l'animation
   démarre après un aller-retour JS (~1 frame). La démo, elle, démarre le ressort **sur le
   thread UI** dans le geste et ne navigue qu'à la fin. Si ça se sent : garder l'overlay monté
   en permanence (`pointerEvents: 'none'` + opacité 0) et ne piloter que des shared values.
   **C'est le premier chantier à évaluer.**
2. **`measure()` pendant l'animation.** Un tap sur une tuile pendant l'ouverture du mois
   mesure une position intermédiaire — visuellement correct, mais jamais testé.
3. **Le flou (`expo-blur`) sur Android** ne floute pas le dessous sans
   `experimentalBlurMethod="dimezisBlurView"`. `BLUR_INTENSITY = 40`, monté par
   `useAnimatedProps` (obligatoire : une shared value passée en prop gèle à la valeur par
   défaut — commenté sur place).
4. **Course de gestes** : les gestes du mois sont coupés (`.enabled(!openDay)`) quand le jour
   est ouvert ; le `Gesture.Tap` des tuiles vit dans un `GestureDetector` imbriqué. À vérifier
   au doigt, notamment le swipe-down qui part d'une tuile.
5. **Découvrabilité du swipe latéral** entre mois, maintenant que les chevrons ont sauté.
   Piste proposée, non faite : une rangée de points sous la grille.
6. `SCREEN_RADIUS = 44` face au vrai arrondi de l'écran ; la barre d'état passe en `light` sur
   les paliers 3-4 via `setStatusBarStyle` (restaurée à `dark` au démontage) — à voir en vrai.
7. **Aucune animation d'entrée sur les tuiles** du mois (elles apparaissent avec le contenu,
   en bloc). Un stagger à l'ouverture est la piste évidente si l'utilisateur en veut plus.

### 9. À faire ensuite

1. **Les animations, avec les détails** (demande explicite) — partir du point 8.1, puis
   8.7 (stagger d'entrée), puis le rythme relatif ouverture/fermeture des **deux** niveaux.
2. **Committer** : branche + PR pour cette session **et** pour `garden-home-screen.tsx` resté
   de la session (3).
3. Toujours en attente : **écran Classement social** en fausses données ; retirer les outils
   dev et les mocks (seed, clé `…v3`) quand la vraie source de pas arrivera.

### Suggested skills

- **`animate-expo`** — la référence des sessions garden, et exactement le sujet de la
  prochaine (Reanimated 4, gestes, ressorts, dégradation). À invoquer **avant** de toucher aux
  ressorts.
- **`apple-design`** — pour le fond de la question : mouvement physique, interruptibilité,
  transitions gouvernées par le geste. C'est la grammaire de la démo qu'on copie.
- **`ui-review`** / **`emil-design-eng`** — pour juger le rendu une fois vu sur appareil.
- **`code-review`** — avant le commit groupé (rien de cette feature n'est committé).
- ⚠️ **Ne pas** invoquer `animations` / `improve-animations` / `review-animations` : ils sont
  orientés web (CSS, Framer Motion), inutiles ici.

### Rappels d'environnement

- Expo **SDK 54**, RN 0.81.5, Reanimated **4.1.6**, Gesture Handler 2.28,
  `react-native-worklets` 0.7.2, `expo-blur` 15, `expo-haptics` 15. **Rien à installer.**
- `apps/mobile/CLAUDE.md` annonce « Expo SDK 54 » — c'est bien la version réelle du
  `package.json`.
- Commandes : `pnpm --filter mobile type-check`, `pnpm --filter mobile lint`,
  `pnpm exec expo export --platform ios` (depuis `apps/mobile`, pour vérifier le bundle sans
  build natif).
- **Pas de trailer `Co-Authored-By` / `Claude-Session`** dans les commits de ce repo.

---

## Session 2026-08-29 (3) — Stats : intitulés **au-dessus** + relief **letterpress** ; toast de sync qui **se ferme au changement d'écran**

**Date :** 2026-08-29 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** **NON committé** — 2 fichiers modifiés
(`garden-stats-screen.tsx`, `garden-home-screen.tsx`), rien sur une branche. L'utilisateur
délègue push/PR/merge comme d'habitude.
**À lire d'abord :** la section 2026-08-29 (2) ci-dessous (fenêtre glissante 52 semaines).

Petite session **design + comportement**. **Tout passe `pnpm --filter mobile type-check` (0)
et `lint` (0 erreur ; 14 warnings préexistants). Rien vu tourner sur appareil.**

### 1. Écran Stats — présentation des 2 stats (`garden-stats-screen.tsx`)
- **Intitulé AU-DESSUS du chiffre** (avant : chiffre puis libellé dessous). Le petit espace de
  4 px a suivi du libellé (désormais en haut) vers la valeur (désormais dessous) — l'écart
  visuel entre les deux est identique.
- **Libellés renommés** : « jours de série » → **« Série actuelle »**, « meilleur jour » →
  **« Meilleur jour »**.

### 2. Écran Stats — relief **letterpress** sur les 2 stats (option **B**)
Demande : donner du relief aux 2 stats **sans panneau à fond distinct**, en gardant le papier crème.
Un **artifact de comparaison** a été produit (5 pistes A→E) :
https://claude.ai/code/artifact/2d7afc64-9bee-492a-b751-bf531bb3c100
- **Cheminement** : l'utilisateur a d'abord essayé **C** (tuiles surélevées de *même* crème via
  `boxShadow`, trait séparateur retiré), puis un **fond blanc** sur ces tuiles — **les deux ont
  été abandonnés**, retour à **B**.
- **Retenu = B (gravé)** : `textShadow` clair **net** (rgba blanc, `radius: 0`) sous les glyphes →
  le texte lit « pressé dans le papier ». Offset `height: 1.5` sur la valeur, `1` sur l'intitulé.
  **Aucun panneau, aucun changement de layout**, le **trait séparateur est conservé**.

### 3. Home — le toast de sync **se ferme quand on quitte l'écran** (`garden-home-screen.tsx`)
Problème : après un pull-to-refresh, le toast central (`sonner-native`, position `center`) reste
~4 s ; si on va tout de suite sur l'écran Niveau, il **flottait par-dessus**.
- `useSyncPhase` **capture l'id** du toast (`toast.custom(...)` le retourne) dans une `ref`.
- Un **`useFocusEffect`** (idiome déjà utilisé dans `use-unseen-level-up.ts`) **ferme ce toast au
  blur** de la Home via **`toast.dismiss(id)`**. Ciblé sur l'**id précis** → ne tue pas le toast de
  level-up de l'écran Niveau, qui s'affiche *après* la navigation. Import `useFocusEffect` ajouté.

### Fichiers de la session
Modifiés : `garden-stats-screen.tsx` (intitulés en haut + renommage + letterpress),
`garden-home-screen.tsx` (dismiss du toast de sync au blur). **Non committés.**

### Décisions utilisateur — ne pas relitiger
- Stats = **intitulé au-dessus du chiffre**, libellés **« Série actuelle » / « Meilleur jour »**.
- Relief = **letterpress (B, `textShadow`)** — **pas** les tuiles surélevées (C), **pas** de fond blanc.
- Le **toast de sync se ferme au changement d'écran** (dismiss ciblé sur son id, pas `dismiss()` global).

### À faire ensuite
1. **Committer** cette session (2 fichiers sur `main`, non committés) — branche + PR comme d'habitude.
2. **Écran Classement social** en fausses données — toujours le prochain gros morceau.
3. Retirer les **outils dev** et **mocks** (seed, clé `…v3`) avec la vraie source de pas.

### À juger sur appareil (rien vu tourner)
Rendu du **letterpress** (`textShadow` iOS/Android, contraste sur le crème) — si trop subtil, monter
l'offset à `2` ou assombrir un peu le texte ; s'il bave, réduire à `1`. Fermeture du toast au moment
réel de la navigation Home → Niveau.

---

## Session 2026-08-29 (2) — grille Stats en **fenêtre glissante 52 semaines** (finit aujourd'hui), légende **− / +**, libellé d'année + hint retirés

**Date :** 2026-08-29 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** **TOUT committé et mergé.** PR **#9** (handoff), puis PR **#10**
(`feature/mobile-garden-stats-rolling-window`) mergée sur `main` (merge commit `7e50296`, HEAD).
**À lire d'abord :** la section 2026-08-29 (1) ci-dessous — cette session **remplace la grille annuelle**
qu'elle décrivait par une fenêtre glissante ; les décisions « grille annuelle scrollable » de la (1) sont
**caduques** sur ce point (le reste — portrait coquelicot, rampe B, stats à 2 chiffres — tient).

Itération **design pur** sur la grille de l'écran Stats, à partir d'aperçus artifact. **Tout passe
`type-check` (0) et `lint` (0 erreur ; 14 warnings préexistants). Rien vu tourner sur appareil.**

### 1. Grille = **fenêtre glissante de 52 semaines finissant aujourd'hui** (`garden-stats-screen.tsx`)
Cheminement de la décision : d'abord la grille annuelle a été bornée **à aujourd'hui** (au lieu du 31 déc,
qui laissait des semaines futures vides) → variante « **année-à-ce-jour** » (1ᵉʳ jan → aujourd'hui). Un
**aperçu au 20 février** (artifact) a montré que cette variante est **très maigre en début d'année**
(≈ 8 colonnes). L'utilisateur a donc tranché pour une **fenêtre glissante de 52 semaines** façon GitHub —
toujours 12 mois pleins, **finissant sur aujourd'hui**. (La variante « année-à-ce-jour » n'a jamais été
committée telle quelle ; `main` va directement de l'annuel — PR #8 — à la fenêtre glissante — PR #10.)
- `buildYearGrid` → **`buildGrid`** : part de `mondayOf(today) − 51 semaines`, `WEEKS = 52` colonnes, se
  termine sur la semaine en cours. Jours après aujourd'hui = cases vides (tier −1). Helper `windowStartFor`.
- **`buildStats`** (série + meilleur jour) calculé sur cette même fenêtre.
- **Scroll initial** = **bout de fenêtre** (aujourd'hui contre le bord droit) via `contentOffset` ; on glisse
  à gauche pour l'historique. Plus de calcul `todayCol` (const `DAY_MS` retirée).
- Libellés de mois : la contrainte « même année » saute (la fenêtre **chevauche 2025/2026**) → ils courent
  `sept → … → déc → jan → … → août`, avec le passage d'année visible. `key` de label inclut l'année.

### 2. Retraits (la grille se suffit à elle-même)
- **Libellé « 2026 » supprimé** — plus de sens sur une fenêtre à cheval sur deux ans ; les mois portent le
  repère.
- **Hint « ← Glissez pour explorer l'année → » supprimé** — la grille tronquée à gauche + les mois sont
  assez explicites. Styles `year`/`hint` retirés ; `gridRow` reprend la marge haute.

### 3. Légende — cases à la taille de la grille + échelle **« − … + »**
- Cases de la légende **dimensionnées sur `CELL` (14 px)**, comme les cellules de la grille (avant : 18 px).
- Ajout d'une **échelle orientée** encadrant la rampe : `−` … rampe … `+` (gris `label`, `bold` 14 px,
  centré). Testé « **Calme … Actif** » (proposition maison, plus « bien-être »), **remplacé par « − / + »**
  à la demande de l'utilisateur. La rampe reste **B** (5 paliers, `tierForDay` inchangé).

### 4. Seed démo → **52 semaines** + clé **v3** (`use-day-history.ts`)
- `seedDemoHistory` remplit désormais les **52 dernières semaines** (`SEED_DAYS = 364`) jusqu'à hier (au
  lieu de « année civile »), pour peupler toute la fenêtre glissante. Toujours un **mock**.
- Clé de stockage **`…v2 → …v3`** : retire les seeds précédents au prochain lancement.

### Fichiers de la session
Modifiés : `garden-stats-screen.tsx` (fenêtre glissante, retraits, légende), `use-day-history.ts`
(seed 52 sem. + clé v3). *(Le handoff a été committé à part en PR #9.)*

### Décisions utilisateur — ne pas relitiger
- Grille Stats = **fenêtre glissante 52 semaines finissant aujourd'hui** (pas l'année civile, pas
  l'année-à-ce-jour). Ça **remplace** la « grille annuelle » de la section (1).
- **Pas de libellé d'année, pas de hint** de scroll.
- Légende = rampe à la **taille des cellules** + échelle **« − / + »** (pas « Calme/Actif », pas de liste).
- Décisions de la (1) toujours valides **sauf** ce qui touche la grille annuelle.

### À faire ensuite
1. **Écran Classement social** en **fausses données** — le prochain gros morceau (avatars = `FlowerAvatar`,
   tendance = `TierSquares` en ligne, couleurs = rampe `tiers`).
2. À juger sur device : sans libellé d'année, le **passage déc→jan** au milieu de la grille suffit-il à se
   repérer, ou faut-il un petit repère d'année ? (proposé, non fait). Taille des symboles `− / +` face aux
   cases de 14 px. Rendu du **corail foncé** au sommet dans un champ de 52 semaines.
3. Retirer les **outils dev** et les **mocks** (seed, clé `…v3`) avec la vraie source de pas.

---

## Session 2026-08-29 — portrait fleur (coquelicot aquarelle), refonte écran Stats (heatmap annuelle), rampe de paliers « B », **tout committé sur `main`**

**Date :** 2026-08-29 (travail étalé 08-28 → 08-29) · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** **TOUT est committé et mergé** — PR **#8** (`feature/mobile-garden-profile-stats-polish`)
mergée sur `main` (merge commit `026c274`). Ce commit a aussi **absorbé la session 2026-08-28 (2)**
ci-dessous, qui traînait non committée dans l'arbre. Le point n°1 « Committer » des handoffs précédents
est donc **réglé** ; `.scratch/` est bien gitignoré (ligne 24), il n'a jamais été un préalable au commit.
**À lire d'abord :** la session 2026-08-28 (1) (heatmap 16 sem., palette `tiers`, barre d'XP) — cette session
**refond** la heatmap et la rampe `tiers`.

Session de **design sur maquette** : on a remplacé le portrait SVG par une **vraie fleur aquarelle**, refondu
l'**écran Stats** en calendrier **annuel scrollable**, et retravaillé la **rampe de couleurs des paliers**
(décision prise après un aperçu comparatif). Plus du **polish** Home/Niveau.

**Tout passe `pnpm --filter mobile type-check` (0) et `lint` (0 erreur ; 14 warnings `react-refresh`
préexistants, aucun nouveau). Rien vu tourner sur appareil cette session** (l'aperçu des rampes a été jugé
sur artifact web, pas dans l'app).

### 1. Portrait = coquelicot aquarelle raster (remplace la fleur SVG)
Le bouton d'accès à l'écran Niveau (Home, haut-gauche) et le grand portrait de l'écran Niveau montrent
désormais une **fleur peinte** dans le style des `frame-XX.jpg`, pas le vecteur.
- **Génération externe** : je ne peux pas produire d'image ; j'ai fourni un **prompt** calé sur le style
  (coquelicot, papier crème), l'utilisateur a généré et déposé le PNG. Asset :
  `assets/profile-poppy.png` (1254×1254).
- **Nouveau `components/profile-flower.tsx`** : rend le raster dans un disque (même liseré que le vecteur),
  avec un **léger cadrage** (`ZOOM = 1.25`, `RISE = 0.06`) pour centrer la corolle et sortir la tige du rond.
  **Repli automatique** sur `FlowerAvatar` (vecteur) si `PROFILE.avatar == null` — le vecteur reste la
  brique recolorable du **futur classement**.
- `profile.ts` : nouveau champ **`avatar`** (`require('./assets/profile-poppy.png')`).
- `FlowerAvatar` : nouvelle prop **`disc`** (défaut `true`) pour dessiner une fleur **sans le disque** —
  utilisée comme petit brin rouge à côté du titre « Mon activité ».
- ⚠️ `PROFILE.flower` vaut toujours **`'coral'`** (teinte du vecteur de repli / classement) ; à passer à
  `'red'` si on veut aligner le repli sur le coquelicot. Non fait (à trancher sur device).

### 2. Écran Stats refondu — heatmap **annuelle scrollable** (`garden-stats-screen.tsx` réécrit)
D'après une maquette fournie. Sur le crème, **sans cartes** (tout posé sur le papier) :
- **2 stats seulement** : « jours de série » et « meilleur jour » (la **moyenne a sauté**), grands chiffres
  verts centrés séparés d'un fin trait vertical.
- **Titre** « Mon activité » + petit **coquelicot rouge libre** (`FlowerAvatar … disc={false}`).
- **Grille = année civile entière**, **scrollable horizontalement** : une colonne par semaine du 1ᵉʳ janvier
  au 31 décembre, 7 lignes **L M M J V S D** (gouttière **figée** hors du scroll), libellés de mois courts
  (`jan fév…`) **épinglés par le jeudi** de chaque semaine (convention ISO → pas de « déc. » parasite de
  l'année précédente). **S'ouvre sur les semaines récentes** (aujourd'hui près du bord droit) via
  `contentOffset`. Année « 2026 » au-dessus, hint « ← Glissez pour explorer l'année → » dessous.
- **Cellules** : taille fixe `CELL = 14`, gap **resserré `CELL_GAP = 2`** (serré mais non collé),
  rayon **3** (`CELL/5`). Tout (gouttière, position des mois, scroll) dérive de ces consts.
- **Légende = une seule ligne centrée** de la rampe `tiers` (du vide au corail), **sans libellés** — on a
  d'abord essayé une liste « minimum de pas » mais elle a été abandonnée (le 1ᵉʳ palier actif affichait un
  « 1 » disgracieux). Mêmes cases resserrées (gap 4) et même rayon (3) que la grille.

### 3. Seed démo → **année entière** + clé bumpée (`use-day-history.ts`)
- `seedDemoHistory` remplit maintenant **du 1ᵉʳ janvier à hier** (jours passés uniquement ; aujourd'hui
  laissé aux vrais syncs), pour que la grille annuelle ait de la matière. Toujours un **mock** assumé.
- Clé de stockage **`garden.day.history` → `garden.day.history.v2`** : force l'ancien seed 16 semaines à
  céder la place au prochain lancement (aucun vrai utilisateur, aucune perte réelle).

### 4. Design — rampe de paliers **variante « B »** (`palette.ts`, light + dark)
Décision utilisateur après **aperçu comparatif** (artifact :
https://claude.ai/code/artifact/aafd6aef-d55f-480a-b354-cc7d8b452eeb — Actuelle vs A « tout vert » vs B).
- **Problème de l'ancienne rampe** : l'or (tier 3) était **plus clair** que le vert (tier 2) → l'échelle
  redescendait en luminosité au milieu, et le corail lisait « alerte ».
- **B retenue** : des **verts qui foncent** palier par palier, **corail foncé seulement au sommet**, en
  gardant l'ordre par luminosité (le pic chaud reste plus sombre que le vert d'avant).
  - LIGHT `tiers` : `['#E7E1D2','#CBE4A2','#8FC24A','#4F8E2E','#C0492E']`
  - DARK `tiers` : `['#26302A','#33552B','#4F8A2C','#77BE3C','#DE6B48']` (sur fond sombre la rampe
    s'éclaircit, corail chaud au sommet). Doc du token `tiers` réécrite.
- **Seuils inchangés** : `tierForDay` reste à **5 paliers** (`TIER_THRESHOLDS = [1, 5000, 10000, 15000]`,
  virage à 10k/15k). Le **vert le plus foncé = tier 3 = 10 000–14 999 pas** ; 15 000+ = corail.

### 5. Polish Home + Niveau
- **Home** (`garden-home-screen.tsx`) : anneau `size` **224 → 208**, compteur (`animated-steps.tsx`)
  `fontSize` **44 → 40** / `lineHeight` **50 → 46**, bloc anneau **descendu** (`paddingTop` `insets.top+40`
  **→ +64**). Loader de pull (`pull-loader.tsx`) : `RING` **26 → 22**.
- **Niveau** (`garden-level-screen.tsx`) : le **badge de niveau reste un cercle parfait** à 2 chiffres —
  `minWidth`/`paddingHorizontal` remplacés par une **largeur fixe** `width: 34` (« 20 » tient dans 28 px).

### Fichiers de la session
Nouveaux : `components/profile-flower.tsx`, `assets/profile-poppy.png`.
Modifiés : `flower-avatar.tsx` (prop `disc`), `profile.ts` (`avatar`), `garden-stats-screen.tsx` (réécrit),
`palette.ts` (rampe B + doc), `use-day-history.ts` (seed annuel + clé v2),
`garden-home-screen.tsx` (anneau/compteur/loader + `ProfileFlower`), `garden-level-screen.tsx`
(badge cercle + `ProfileFlower`), `animated-steps.tsx`, `pull-loader.tsx`.

### Décisions utilisateur — ne pas relitiger
- **Portrait = coquelicot aquarelle raster** ; vecteur `FlowerAvatar` gardé en repli / pour le classement.
- **Rampe de paliers = variante B** (verts foncés → corail au sommet, ordonnée par luminosité), **pas** l'or
  au milieu. **5 seuils conservés.**
- **Stats = 2 chiffres** (série + meilleur jour), **grille annuelle scrollable**, **légende = rampe centrée
  sans libellés**, tout sur le crème sans cartes.
- **Cellules serrées mais non collées** (gap 2), rayon 3, cohérent grille ↔ légende.
- **Tout committé sur `main`** ; l'utilisateur délègue push/PR/merge.

### À faire ensuite
1. **Écran Classement social** en **fausses données** — le prochain gros morceau (avatars = `FlowerAvatar`,
   tendance = `TierSquares` en ligne, couleurs = la nouvelle rampe `tiers`/`tierForDay`).
2. Retirer les **outils dev** (`+10 000`, `Réinitialiser`) quand la vraie source de pas arrivera.
3. Aligner éventuellement `PROFILE.flower` → `'red'` (repli vecteur cohérent avec le coquelicot).
4. Le seed démo et la clé `…v2` sont des **mocks** à supprimer avec la vraie source de pas.

### À juger sur appareil (rien vu tourner cette session)
Cadrage du coquelicot dans le rond (`ZOOM`/`RISE`) ; densité de la grille **annuelle** et lisibilité du
**corail foncé au sommet** dans un champ dense ; le scroll initial (aujourd'hui à droite) ; cellules
resserrées (gap 2) + rayon 3 ; nouvelles tailles anneau/compteur/loader ; badge de niveau rond à 2 chiffres.

---

## Session 2026-08-28 (2) — barre d'XP variante B, animations premium, badge notif, outil dev +10 000

**Date :** 2026-08-28 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** **rien de committé cette session** (5 fichiers modifiés,
1 nouveau). Les sessions précédentes sont, elles, dans `main` (PR #5/#6/#7 mergées).
**À lire d'abord :** la section 2026-08-28 (1) ci-dessous (barre d'XP capsule « E »,
palette, level-up) — cette session la **retouche**.

Session de **polish sur device** (émulateur iOS) : on a basculé la barre d'XP de la
variante « E » vers la **« B »**, corrigé un vrai **bug de rendu SVG**, refondu les
**animations de level-up** (halo + pop), refait l'**entrée + le design du badge de
notification** de la Home (scale-in sans rebond, wiggle, encoche, icône « ! » vectorielle),
et ajouté un **bouton dev « +10 000 pas »** qui rejoue tout le flux de sync.

**Tout passe `pnpm --filter mobile type-check` (0) et `lint` (0 erreur ; 14 warnings
`react-refresh` préexistants, aucun nouveau).** La barre d'XP a été **vue sur émulateur**
(c'est ce qui a permis de trouver le bug SVG) ; le reste est à confirmer sur device.

### 1. Barre d'XP : variante « E » (capsule) → **« B »** (corail lustré + liseré blanc)
Décision utilisateur après comparaison de l'aperçu
(https://claude.ai/code/artifact/73667437-...). B = remplissage corail **affleurant dans une
gorge creusée**, liseré blanc en **anneau extérieur** (box-shadow spread, pas un cadre
rembourré), dégradé corail **3 stops**, hauteur 14.
- `palette.ts` : tokens `xp` restructurés — `capsule`/`frame` → **`track`/`bezel`/`groove`** +
  `fillTop`/**`fillMid`**/`fillBottom`/`gloss`/`glow` (light + dark). Doc du token réécrite.
- `garden-level-screen.tsx` `XpBar` : rail creusé (`boxShadow: inset groove + spread bezel`),
  remplissage absolu affleurant, gloss sur l'arête, lueur corail qui déborde (rail **non
  clippé**). Doré au niveau max conservé (`tiers[3]`).
- **Réglage device** : le `track` a été assombri (`#ECE3D0` → **`#E2D6BE`**) et le `groove`
  renforcé, sinon la partie vide lisait « blanc plat » au lieu d'une gorge.

### 2. ⚠️ Bug corrigé — le dégradé SVG ne suivait pas la largeur animée
Symptôme (vu sur device) : « petit bout orange puis blanc », incohérent avec la fraction.
Cause : `<Svg style={StyleSheet.absoluteFill}>` **sans `width`/`height` explicites** →
`react-native-svg` s'effondre à une taille par défaut, ne peignant qu'un stub. **Fix** : `<Svg>`
en **pixels fixes** (`trackWidth × BAR_HEIGHT`), rogné à la largeur courante par l'`overflow`
du remplissage. Nouveaux consts `BAR_HEIGHT`, `SHEET_PADDING`, style `fillGradient`.
**NB** : l'ancienne barre « E » avait probablement le même bug latent (jamais vue tourner).

### 3. Level-up (écran Niveau) : halo + pop refondus, **sans rebond**
Trouvé « brouillon ». Cadre = skill `emil-design-eng`.
- **Halo** : disque vert plein → **glow radial doux** (SVG `RadialGradient`, `HALO_SIZE =
  AVATAR × 1.7`), respire `scale 0.92→1.08`/opacité 0→0.5. Se lit comme de la lumière.
- **Pop badge** : montée franche `EASE_POP` (`bezier(0.22,1,0.32,1)`, 130 ms) puis descente.
  **Un `withSpring` a d'abord été posé, puis retiré à la demande de l'utilisateur** (« enlever
  le rebond ») → `withTiming(0, out.cubic, 420 ms)`. Scale badge `+0.22`.
- Le retarge lisse en cas de multi-niveaux reste (withSequence relancé). Reduced-motion : rien.

### 4. Badge de notification (Home) — entrée, wiggle, design, icône
Le « ! » en haut-gauche du portrait (`useUnseenLevelUp`). Extrait en composant **`LevelUpBadge`**.
- **Entrée** : `ZoomIn.springify().damping(13)` (rebond, part de scale 0) → **scale-in propre**
  0.8→1 + fade, `Easing.out(Easing.cubic)` 260 ms, `transformOrigin: 'left bottom'` (éclot du
  coin près du portrait). **Sans rebond** (décision réaffirmée).
- **Wiggle** : secousse en rotation à l'apparition du badge — adaptation **Reanimated** du
  snippet fourni (`withSequence` −8°→6°→−4°→2°→0°, 5×80 ms). Enveloppe **avatar + badge** pour
  qu'ils tremblent d'un bloc. Reduced-motion respecté.
- **Encoche** : le badge est rentré (`top/right: 0`, `borderWidth 2.5`) pour **mordre** dans
  l'avatar ; l'anneau crème (`GARDEN_PAPER`) découpe une encoche côté fleur — effet iOS de
  l'image de réf.
- **Icône** : nouveau `components/alert-mark.tsx` — « ! » en SVG (tige effilée arrondie + point
  détaché), remplace le glyphe de police jugé trop discret. Proportions retravaillées (tige
  bien plus haute que le point).
- **Couleur** : itérée rouge → or (`tiers[3]`) → **rouge final** (`palette.hues.red.petal`,
  bon contraste avec le « ! » blanc). Décision utilisateur.

### 5. Outil dev — bouton « +10 000 pas » (Home, bas-gauche)
Pour tester notifications/animations sans tirer to sync en boucle. `AddStepsButton`, symétrique
de `ResetButton`.
- **Passe par le même flux que le pull-to-sync** : `useBloomLab.sync` accepte désormais un
  `delta` optionnel (`delta = nextFakeDelta()` par défaut ; le geste appelle `sync()` sans arg →
  aléatoire comme avant ; le bouton appelle `sync(10000)`). Donc **spinner + toast + badge +
  floraison**, exactement comme un vrai sync. Désactivé pendant `refreshing`.

### 6. ⚠️ Bug corrigé — le badge ne se déclenchait pas
`committedSteps` repartait de **0** à chaque montage de `useBloomLab`, alors que `lastSeen`
(niveau du dernier écran vu) est **persisté** : après un redémarrage, le jour retombait sous le
dernier-vu → badge muet. **Fix** : `useBloomLab` **restaure le total du jour** au montage depuis
le store d'historique déjà persisté — nouveau `getTodaySteps()` (`use-day-history.ts`, lecture
MMKV directe, indépendante de l'hydratation). `committedSteps`/ref/`progress`/`counter` seedés à
la valeur du jour. **Effet de bord assumé (positif)** : la Home restaure les pas du jour au
redémarrage (jardin **posé**, sans révélation) au lieu de repartir à 0.

### Fichiers de la session
Nouveau : `components/alert-mark.tsx`.
Modifiés : `palette.ts` (tokens `xp` B), `garden-level-screen.tsx` (XpBar B + fix SVG + halo/pop),
`garden-home-screen.tsx` (LevelUpBadge, wiggle, encoche, AlertMark, AddStepsButton),
`use-bloom-lab.ts` (`sync(delta?)`, restauration du total du jour),
`use-day-history.ts` (`getTodaySteps`).
NB : la fonction `useBloomLab` frôle la limite `max-lines-per-function` (110) — plusieurs micro-
arbitrages de commentaires ont été faits pour rester dessous ; toute addition future y forcera
une extraction (cf. dette).

### Décisions utilisateur — ne pas relitiger
- Barre d'XP = **variante B** (corail lustré + liseré blanc dans une gorge), pas la capsule E.
- Animations de niveau **sans rebond** (ni sur le pop, ni sur l'entrée du badge).
- Badge notif = **fond rouge**, « ! » en **icône SVG** (pas la police), qui **mord** dans l'avatar.
- Le **+10 000** doit avoir **les mêmes conséquences qu'un pull-to-sync** (pas un `commit` direct).

### À faire ensuite
1. **Committer** cette session (elle est sur `main`, non committée) — idéalement sur une branche
   + PR, comme les précédentes. Le `.scratch/` non trié reste un préalable (cf. dette).
2. Écran **Classement social** (le gros morceau) — inchangé depuis la session (1).
3. Retirer les **outils dev** (`+10 000`, `Réinitialiser`) quand la vraie source de pas arrivera.

### À juger sur appareil (seule la barre d'XP a été vue)
Barre B : contraste `track` `#E2D6BE` / crème, netteté du liseré blanc (box-shadow inset+spread
sur iOS), lueur corail. Level-up : intensité du glow, rythme du pop sans rebond. Badge : le
**wiggle** (ampleur 8°/durée), l'**encoche** (chevauchement + épaisseur d'anneau), les
**proportions du « ! »**, le rouge. `+10 000` : enchaînement spinner→toast→badge→révélation.

---

## Session 2026-08-28 — écran Stats/heatmap, store des pas, barème couleur, barre d'XP premium

**Date :** 2026-08-28 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `feature/mobile-garden-gamification`
**État git :** **rien de committé cette session** (7 fichiers modifiés, 4 nouveaux ;
la session du 27 est, elle, dans le commit `193d240`).
**À lire d'abord :** la section 2026-08-27 ci-dessous + `docs/adr/0001-*`.

Livré cet écran **Stats / heatmap** (calendrier façon GitHub, offline), et posé au
passage les **deux fondations partagées** que le Classement réutilisera. Puis deux
passes de **design** demandées par l'utilisateur : la **palette de la heatmap** (verts
→ floraison chaude) et la **barre d'XP** de l'écran Niveau (capsule premium).

**Tout passe `pnpm --filter mobile type-check` (0) et `lint` (0 erreur ; 14 warnings
`react-refresh` préexistants, aucun nouveau). Rien vu tourner sur appareil.**

### 1. Store partagé des « pas du jour » — `use-day-history.ts` (nouveau, Zustand + MMKV)
Le **foyer durable** des pas par jour, que réclamait le handoff avant Stats/Classement.
- `history: Record<dayKey, steps>` (aujourd'hui inclus), persisté (clé
  `garden.day.history`). Pattern miroir de `use-auth-store` (`create` +
  `createSelectors`), `hydrateDayHistory()` appelé au démarrage dans `_layout.tsx`.
- `dayKey(date)` = `YYYY-MM-DD` en **heure locale** (pas d'ISO UTC → pas de décalage
  de fuseau), sans `Intl`.
- **Sème une démo** (`seedDemoHistory`) au 1ᵉʳ lancement si vide : ~16 sem. de **jours
  passés uniquement** (aujourd'hui laissé aux vrais commits, donc l'anneau Home à 0 et
  la heatmap ne se contredisent jamais). **Mock** clairement commenté, à supprimer dès
  qu'une vraie source de pas existe.
- Câblage : `useBloomLab.commit` appelle `recordDaySteps(target)` (chemin d'écriture
  unique). ⚠️ **Écart au plan** : `adopt` (scrubber du lab dev) **ne** record **pas**
  (un scrub de test n'est pas une vraie journée) ; `reset` record `0`.

### 2. Barème couleur partagé — `tierForDay` (`bloom.ts`) + `TierSquares` (nouveau)
- `tierForDay(steps)` : 5 paliers façon GitHub, adossés aux niveaux — 0 · 1-4 · 5-9 ·
  10-14 · 15+. **Source unique** heatmap + future tendance du classement.
- `components/tier-squares.tsx` : primitif présentational pur (grille **colonne-major**,
  `tier < 0` = cellule transparente). Réutilisé par la heatmap **et** comme **glyphe** du
  bouton Stats (mini 2×2), et prêt pour la tendance du classement (une ligne).

### 3. Écran Stats — `garden-stats-screen.tsx` (nouveau) + route `/garden-stats`
Sur le papier crème (`gardenPalettes.light`, comme l'écran Niveau) :
- Titre « Mon activité », 3 tuiles (**Série** = jours consécutifs actifs jusqu'à
  aujourd'hui, avec « aujourd'hui en attente » toléré ; **Meilleur jour** ; **Moyenne**
  des jours actifs).
- **Heatmap 16 semaines** : colonnes = semaines **lundi→dimanche**, 7 lignes, taille de
  cellule **dérivée de `useWindowDimensions`** → **aucun scroll horizontal** ; étiquettes
  de mois (FR), gouttière L/M/V, légende « Moins→Plus ».
- Lit le store → se rafraîchit après un sync fait sur la Home.
- Route `app/garden-stats.tsx` + `_layout.tsx` + export dans `index.ts`.
- **Accès** = petit **bouton mini-heatmap** en haut-droite de la Home ; le `ResetButton`
  dev est passé en **bas-droite**.

### 4. Design — palette de la heatmap (`palette.ts`) : verts → floraison chaude dès 10 000
Décision utilisateur après comparaison visuelle. La rampe `tiers` n'est **pas** un simple
dégradé de verts : elle **bascule dans le chaud au seuil symbolique de 10 000 pas**.
- LIGHT `tiers`: `['#E7E1D2','#C7DE96','#7CB53C','#F2B23C','#EE7A46']`
  (terre → vert jeune → vert feuille → **or (10k)** → **corail (15k+)**).
- DARK renseigné en parallèle. `bloom.ts` documente le seuil chaud sur le tier 3.
- Raison : vert = « jour actif » (bonne nouvelle) ; le chaud **récompense** les gros jours
  sans les faire lire comme des alertes rouges. Le corail relie tout (fleur de profil,
  sommet heatmap, barre d'XP).

### 5. Design — barre d'XP de l'écran Niveau (`garden-level-screen.tsx`) : variante « capsule »
Refonte premium demandée. Retenu = **capsule ivoire + liseré blanc, remplissage corail**,
**sans reflet animé** (variante « E » des aperçus).
- Tokens `xp` (capsule/frame/fillTop/fillBottom/gloss/glow) ajoutés à `GardenPalette`
  (light + dark).
- `XpBar` refait : cadre ivoire + liseré blanc + ombre douce ; remplissage en **dégradé
  vertical via `react-native-svg`** (déjà dépendance, **rien d'ajouté**) ; **reflet blanc**
  sur l'arête ; **lueur corail** (`boxShadow`, supporté RN 0.81). Capsule 18 px, `padding`
  qui recesse le remplissage.
- **Détail** : au niveau max, le haut du dégradé vire au **doré** (`palette.tiers[3]`) —
  écho de la floraison heatmap.

### Aperçus (artifacts de design, pour mémoire)
- Palettes heatmap : https://claude.ai/code/artifact/2953d479-fdd6-441f-a11a-a864de822222
- Barres d'XP : https://claude.ai/code/artifact/73667437-612f-4ec7-bddb-7379efcf6c8a

### Fichiers de la session
Nouveaux : `use-day-history.ts`, `components/tier-squares.tsx`,
`garden-stats-screen.tsx`, `app/garden-stats.tsx`.
Modifiés : `bloom.ts` (tierForDay + doc seuil chaud), `palette.ts` (tiers + xp),
`use-bloom-lab.ts` (record dans commit/reset ; adopt non ; extraction `nextFakeDelta`),
`garden-home-screen.tsx` (StatsButton, Reset en bas, extraction du hook `useSyncPhase`),
`garden-level-screen.tsx` (XpBar capsule + SVG), `index.ts`,
`app/_layout.tsx` (route + `hydrateDayHistory`).
NB : les extractions `nextFakeDelta` (use-bloom-lab) et `useSyncPhase`
(garden-home-screen) ont été faites **uniquement** pour repasser sous la limite
`max-lines-per-function` (110) après ajout de code — comportement inchangé.

### Décisions utilisateur — ne pas relitiger
- **Stats en premier** (offline, pose les fondations) ; Classement ensuite.
- Heatmap = **fenêtre 16 semaines** qui tient sans scroll ; accès = **bouton Home**.
- Barème = **verts jusqu'à 10 000 pas puis floraison chaude** (or→corail), pas un simple
  dégradé de verts.
- Barre d'XP = **capsule ivoire + corail, sans reflet animé** (variante E).

### À faire ensuite
1. **Écran Classement social** — le gros morceau (backend Effect, comptes, vie privée).
   Commencer en **fausses données** ; avatars = `FlowerAvatar`, tendance = `TierSquares`
   en ligne, couleurs = `tierForDay`/`palette.tiers`.
2. **Cohérence des accents** (à trancher sur device) : la barre d'XP est corail mais le
   **badge de niveau et le halo de level-up restent verts**. Option proposée : passer le
   **halo** de level-up en corail (badge vert = identité du rang). Non fait, en attente.
3. **Liseré blanc** de la barre : volontairement discret sur crème ; à épaissir/ombrer si
   trop subtil sur device.
4. Migrer éventuellement `committedSteps`/`lastSeenSteps` **entièrement** dans le store.
5. Toujours valable : brancher le vrai `ProgressSummary`/`DayProgress`, source de pas
   réelle ; amender l'ADR (découplage compteur/jardin, revirement pull-loader).

### À juger sur appareil (rien vu tourner)
Contraste des 5 verts + or/corail sur le crème ; proportions/lisibilité de la heatmap
(16 colonnes) ; cohérence Home↔heatmap sur « aujourd'hui » après un sync ; rendu de la
barre capsule (dégradé SVG, lueur `boxShadow`, doré au max) ; discrétion du liseré blanc ;
accents corail vs verts (point 2 ci-dessus).

---

## Session 2026-08-27 — fondations gamification + écran Niveau du jour

**Date :** 2026-08-27 · **Repo :** `/Users/thomas/Documents/dev/molio` (rien de committé)
**Session précédente :** `docs/handoff/handoff-molio-garden-20260827.md`
**À lire d'abord :** ce handoff-là (Home minimale, pull-to-sync, toast verre) +
`docs/adr/0001-moteur-de-rendu-du-jardin.md`.

Cette session a posé les **fondations de la gamification** et livré le premier de
plusieurs écrans : l'**écran Niveau du jour** (fiche de perso RPG), son accès via
un **avatar-fleur**, un **badge de notification** de level-up, un **toast de
palier**, et un **remaniement du feedback de pull-to-sync** (loader en haut au
lieu de l'arc sur l'anneau).

---

## Cadre produit décidé (contexte gamification)

L'utilisateur veut un aspect gamification, dans l'esprit épuré de la Home. Trois
échelles de progression **distinctes** (ne pas les confondre) :

- **Anneau d'accueil** = l'**objectif perso** fixé par l'utilisateur (dénominateur
  variable). C'est « où j'en suis de *mon* but du jour ».
- **Niveau du jour** = échelle **absolue**, `floor(pas / 1000)`. 1 000 pas = 1
  niveau ; niveau 10 = 10 000 pas ; niveau 20 = jardin plein. C'est l'objet de
  l'écran livré cette session.
- **Jardin** = `pas / MAX_STEPS (20 000)`, ses `MILESTONES`/`BANDS` sont les
  **paliers du jardin**, à ne pas confondre avec les niveaux.

Écrans encore à faire (prochaine session, cf. plus bas) : **Stats (heatmap)** et
**Classement social**.

---

## Ce qui a été fait cette session

Tout passe `pnpm type-check` (0) et `pnpm lint` (0 erreur ; 14 warnings
`react-refresh` préexistants sur les vieux écrans `features/progress/*`, aucun sur
le code touché). **Rien n'a été vu tourner sur appareil.**

### 1. Modèle — niveaux (`bloom.ts`)
Ajout de `STEPS_PER_LEVEL = 1000` et `MAX_LEVEL` (= `MAX_STEPS / 1000` = 20). Ces
constantes resserviront pour le barème « jour → palier de couleur » de la heatmap
et de la tendance du classement.

### 2. Écran Niveau du jour — `garden-level-screen.tsx` (nouveau) + route
Fiche de perso RPG : **portrait (avatar-fleur)**, **nom**, **badge de niveau** sur
le portrait qui *pop* à chaque level-up, **barre d'XP**, **`X / 1000`** animé
dessous, ligne « … pas aujourd'hui ».
- Une seule valeur animée `filled` pilote tout (niveau + fraction de barre) ; la
  barre se vide d'un coup à chaque palier franchi — ce snap **est** le moment du
  level-up (*pop* + halo + haptique, détecté via `useAnimatedReaction`).
- **Révélation une seule fois** : `filled` part du **dernier total vu** (persisté
  MMKV, cf. `level-progress.ts`), pas de 0. 1ʳᵉ visite → 0 → aujourd'hui ;
  revisite sans nouveau pas → pas d'animation ; après un sync → seulement la
  portion nouvelle. Le piège « `setState` synchrone dans l'effet » est évité (la
  réaction pose le niveau, jamais l'effet).
- Route `/garden-level` (`app/garden-level.tsx`, `_layout.tsx`). Les pas arrivent
  en **param de route** — l'écran ne devient pas une 2ᵉ source de vérité.

### 3. Avatar-fleur — `components/flower-avatar.tsx` (nouveau)
Fleur **vectorielle** (SVG, 8 pétales), recolorable par `Hue`, du portrait 40 px
de la Home à celui de l'écran niveau. **Réutilisable pour les fleurs du
classement.** Pas d'asset raster.

### 4. Accès à l'écran niveau = le portrait (Home)
Le tap sur l'anneau a été **retiré** ; l'anneau redevient purement l'anneau
d'objectif. Un **avatar-fleur en haut à gauche** ouvre la fiche (comme un RPG
s'ouvre sur son portrait). Profil prédéfini dans `profile.ts` (nom « Thomas »,
fleur `coral`) — mock, un seul endroit à éditer.

### 5. Badge de level-up non vu — `use-unseen-level-up.ts` (nouveau)
Un **« ! »** blanc sur pastille verte (marqueur de quête RPG) en haut-droite du
portrait, entrée en *zoom-in*. Visible quand `niveau(committedSteps) >
niveau(lastSeenSteps)` — donc **≥ 1 niveau (1 000 pas)**, PAS les paliers du
jardin. Se vide au retour de l'écran (`useFocusEffect` relit le « dernier vu »).
A nécessité d'exposer **`committedSteps`** (nombre) depuis `useBloomLab`.

### 6. Toast de palier (écran niveau)
À la **fin** de l'animation de barre (callback de `withTiming`), si des niveaux
ont été franchis : `« Vous avez atteint le niveau X ! »` via `GlassToast`.

### 7. Toast de sync → position `center` (Home) — **conservé volontairement**
L'utilisateur **garde** le toast de sync (« +X pas synchronisés » / « Déjà à
jour ») : c'est pour lui une bonne sensation de récompense de voir les pas
récoltés. Il est passé en **`position: 'center'`** (par-toast). NB : `sonner-native`
n'a que `top-center | bottom-center | center`.

### 8. Pull-to-sync remanié — `components/pull-loader.tsx` (nouveau) ⚠️ revirement
Le geste (`use-pull-to-sync.ts`) est inchangé ; seul son **rendu** change :
l'anneau n'affiche plus l'arc de charge ni la balayette (props `pull`/`syncing`
retirées de `<StepRing>` sur la Home). À la place, un **petit loader descend du
haut** en suivant le doigt (arc qui se remplit), **tourne** pendant la sync, puis
remonte. **Réglages finaux demandés :** couleur = `palette.ring` (vert), **sans
fond** (arc nu, plus de disque/ombre), `RING = 26`, repose à `restY = topInset +
6` pour **ne pas toucher l'anneau**.
- ⚠️ **Ceci inverse** la décision du handoff précédent (« rien ne se déplace /
  retour sur l'anneau »). L'esprit tient (le *bloc* ne bouge pas, seul un
  indicateur apparaît), mais **l'ADR doit être amendé**.

---

## Fichiers de la session

Nouveaux : `garden-level-screen.tsx`, `components/flower-avatar.tsx`,
`components/pull-loader.tsx`, `profile.ts`, `level-progress.ts`,
`use-unseen-level-up.ts`, `app/garden-level.tsx`.
Modifiés : `bloom.ts`, `garden-home-screen.tsx`, `use-bloom-lab.ts`
(+`committedSteps`), `use-pull-to-sync.ts` (doc), `index.ts`, `app/_layout.tsx`,
`.expo/types/router.d.ts` (régénéré par Expo).
`step-ring.tsx` **non modifié** (il garde la capacité `pull`/`syncing`, juste plus
branchée sur la Home).

---

## Décisions utilisateur — ne pas relitiger

- **Anneau = objectif perso** ; **niveau = absolu** (1 000 pas). Deux échelles
  complémentaires, pas redondantes.
- **Accès à l'écran niveau = le portrait-fleur** (le tap sur l'anneau est retiré).
- **Toast de sync conservé** (sensation de récompense) et **centré**.
- **Badge = « ! »** vert (marqueur RPG), déclenché au gain d'**≥ 1 niveau**.
- **Classement = vrai social**, mais on créera de **fausses données** pour valider
  le design d'abord.
- **Pull feedback = loader en haut**, vert, sans fond, dégagé de l'anneau.

---

## À faire ensuite (prochaine session : les autres écrans)

Ordre suggéré :

1. **Store partagé (Zustand) des « pas du jour »** — le vrai foyer de
   `committedSteps` / `lastSeenSteps`. Aujourd'hui chaque écran instancie son
   `useBloomLab` ; Stats et Classement ont besoin d'une source unique. À faire
   **avant** les deux écrans suivants.
2. **Barème unique `tierForDay(steps) → couleur`** (rampe de verts, famille
   `ringDone`/`grassFront`) — défini **une fois**, réutilisé par la heatmap ET la
   tendance du classement. Primitif visuel partagé `TierSquares` (grille pour la
   heatmap, ligne pour la tendance).
3. **Écran Stats / heatmap** — grille façon GitHub, offline. Prérequis : persister
   l'historique quotidien (MMKV). Attention : pas de vraie source de pas encore
   (sync factice, aucune lib santé).
4. **Écran Classement social** — le gros morceau (backend Effect, comptes, autres
   users, vie privée). Avatars = `FlowerAvatar` ; tendance = `TierSquares` en
   ligne. **Commencer avec des fausses données** pour figer le design avant
   l'infra.

Voir aussi la « Suite Home » du handoff précédent (brancher le vrai modèle
`ProgressSummary`/`DayProgress`, source de pas réelle, remplacer/fusionner le
dashboard) — toujours valable.

---

## Points ouverts / dette

- **ADR à amender** : (a) découplage compteur/jardin (déjà noté au 27), (b)
  **revirement du pull feedback** (loader haut vs arc anneau).
- **Profil mock** (`profile.ts`) → vrai store profil (fleur choisie, nom éditable,
  compte synchronisé pour le classement).
- **`SyncHint`** (« ↓ Tirez pour synchroniser ») toujours sous l'anneau — peut-être
  redondant maintenant que le feedback est en haut ; à trancher.
- **Deux libs de toast** (`react-native-flash-message` + `sonner-native`) — à
  converger.
- **`.scratch/`** ~345 Mo non ignoré/non trié — trancher avant tout commit (cf.
  handoff du 26).
- **Rien vu sur appareil** — tout juger sur device (build natif requis :
  `expo-blur`/`expo-haptics`/`sonner-native`). En particulier : contraste du
  loader vert nu sur le crème, écart réel loader/anneau, rythme des *pops* et du
  toast, tap-portrait vs geste de pull.
- **Haptique en rafale** possible sur une grosse révélation (plusieurs level-ups)
  — négligeable en usage réel (départ = dernier vu), point de réglage sinon.

---

## Constantes de réglage (commentées sur place)

- Écran niveau : `REVEAL_MIN_MS`/`REVEAL_MAX_MS`, `AVATAR_SIZE`, timings du `pop`
  (`garden-level-screen.tsx`).
- Loader : `RING`, `STROKE`, `SPINNER_FRACTION`, `restY` (`pull-loader.tsx`).
- Geste : `PULL_THRESHOLD` (`use-pull-to-sync.ts`).
- Badge : `BADGE` / `BADGE_TEXT` (`garden-home-screen.tsx`).
- Persistance : clé `garden.level.lastSeenSteps` (`level-progress.ts`).

---

## Suggested skills

- **`animate-expo`** — pour toute nouvelle animation (loader, level-up, futures
  transitions Stats/Classement). Déjà la référence des sessions garden.
- **`color`** — pour le barème `tierForDay` de la heatmap/tendance. Rappel : **RN
  ne parse pas `oklch()`**, palette en hex (voir `palette.ts`).
- **`domain-modeling`** / **`codebase-design`** — pour concevoir le store Zustand
  partagé et le primitif `TierSquares` (interfaces réutilisées par 2-3 écrans).
- **`ui-review`** / **`design-foundations`** — juger le rendu premium/nature à
  l'œil sur appareil.
- **`code-review`** — avant le commit groupé (toute la feature garden n'est pas
  committée).
- **`ask-sonner`** est orienté web ; s'appuyer sur les types de `sonner-native`
  (`node_modules/sonner-native/lib/typescript/src/types.d.ts` : `ToastPosition`,
  `ExternalToast`, `toast.custom(jsx, data)`).
