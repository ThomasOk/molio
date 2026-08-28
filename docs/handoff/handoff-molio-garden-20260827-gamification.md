# Handoff — jardin Molio : gamification

> Document multi-sessions. **La plus récente est en tête.** Sous le premier `---`,
> la session fondatrice du 2026-08-27 (Niveau du jour) est conservée intégralement.

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
