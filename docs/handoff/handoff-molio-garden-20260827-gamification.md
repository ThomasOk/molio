# Handoff — jardin Molio : gamification, écran Niveau du jour

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
