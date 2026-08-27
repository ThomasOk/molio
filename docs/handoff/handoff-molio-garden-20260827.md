# Handoff — jardin Molio : écran Home minimal, pull-to-sync, toast verre

**Date :** 2026-08-27 · **Repo :** `/Users/thomas/Documents/dev/molio` (rien de committé)
**Sessions précédentes :** `docs/handoff/handoff-molio-garden-20260826-000200.md`
(et celui du 24/08). **À lire d'abord** : ce handoff-là + `docs/adr/0001-moteur-de-rendu-du-jardin.md`.

Cette session est partie du flipbook déjà en place (17 cadres, testé sur
appareil) et a construit **le vrai écran Home minimal** : découplage des durées
d'animation, interaction pull-to-sync faite main, et un toast « liquid glass ».
Le langage de couleur de la sync a beaucoup itéré — voir « Décisions ».

---

## Lire d'abord / ne pas relitiger

- L'ADR `docs/adr/0001-...md` et ses trois amendements tiennent toujours : Skia
  écarté, flipbook cuit hors-ligne, papier crème = fond de l'écran, **pas de
  mode sombre sans repeindre l'art**.
- Le flipbook (`components/garden-flipbook.tsx`) et le mapping cadres→peintures
  ne changent pas cette session.
- **Les 17 `frame-*.jpg` (7,5 Mo) sont les seuls fichiers image de l'app.** Rien
  dans `.scratch/` ne sert le runtime (seul le script de cuisson y pointe par
  défaut). `.scratch/` fait toujours ~345 Mo, non ignoré, non trié — **à
  trancher avant tout commit** (cf. handoff du 26).

---

## Ce qui a été fait cette session

Tout le code passe `pnpm type-check` (0) et `pnpm lint` (0 erreur ; 14 warnings
`react-refresh` préexistants, aucun sur les fichiers touchés). **Rien n'a encore
été vu tourner sur appareil cette session** — voir « À tester ».

### 1. Découplage compteur / jardin + loi de durée (`bloom.ts`, `use-bloom-lab.ts`)
Une seule cible engagée (`committedStepsRef`), **deux horloges** qui y courent à
des vitesses différentes — ce n'est PAS une seconde source de vérité :
- `counter` (shared value) → chiffres + anneau + libellé de bande. Durée **fixe
  `COUNTER_MS = 2000`**.
- `progress` (shared value) → flipbook du jardin. Durée **proportionnelle au
  delta** : `gardenDuration` rampe de `GARDEN_MIN_MS = 2500` à
  `GARDEN_MAX_MS = 5500` (`bloom.ts`). L'utilisateur a validé le proportionnel.
- Règle « delta nul → pas d'animation » conservée. Le scrubber écrit les deux
  horloges au doigt (elles ne divergent qu'au sync validé). `bandIndex` suit
  `counter` pour coller au chiffre affiché.

### 2. Écran Home minimal — `garden-home-screen.tsx` (nouveau)
Le lab sans les instruments : pas de scrubber, pas de boutons de palier, pas de
header. Fond crème, jardin en bas, anneau + compteur centrés, indice discret.
- **Routing** : `/garden` → `GardenHomeScreen` ; **nouveau** `/garden-lab` →
  `GardenLabScreen` (banc d'essai conservé, cf. `app/garden-lab.tsx`,
  `_layout.tsx`). Le lien dev du dashboard (`garden-lab-link.tsx`) propose les
  deux.
- **Bouton « Réinitialiser »** discret en haut à droite → `lab.reset`. **Marqué
  dev** : à retirer / repenser (« recommencer la journée » à minuit) sur la vraie
  Home avec données réelles.

### 3. Pull-to-sync fait main — `use-pull-to-sync.ts` (nouveau) + `step-ring.tsx`
`RefreshControl` remplacé (il déplace le contenu, ce que l'utilisateur refuse).
**Rien ne se déplace.** `Gesture.Pan` charge une valeur `pull` que l'anneau rend.
- Anneau = instrument : arc de charge (0→plein au seuil `PULL_THRESHOLD = 96`),
  puis balayette qui tourne pendant la sync (`SWEEP_FRACTION = 0.22`). Tout sur
  le thread UI. Reduced-motion géré.
- **Haptique** au franchissement du seuil (`expo-haptics`, `selectionAsync`),
  jamais l'unique retour.
- Indice sous l'anneau (« ↓ Tirez pour synchroniser ») qui respire et s'efface
  quand la charge monte ; « À jour » ~1,4 s sur delta nul.

### 4. Couleur de la sync — token `ringSync` (`palette.ts`)
Beaucoup d'allers-retours (orange, bleu, rose pâle, corail) — tous **trop
saturés**, ils faisaient tache sur l'aquarelle. **État final retenu :
terracotta mate** `#9E5F46` (clair) / `#BD7D64` (sombre). Charge + balayette
plafonnées en opacité (`CHARGE_MAX_OPACITY` / `SWEEP_MAX_OPACITY`, actuellement
à **1**) dans `step-ring.tsx`. Voir « Décisions » pour le pourquoi.

### 5. Toasts sonner-native + toast « liquid glass »
- Installé **`sonner-native ^0.27.0`** ; `<Toaster />` monté à la racine
  (`_layout.tsx`, dans `GestureHandlerRootView`, à côté du `FlashMessage`
  existant — les deux coexistent, à converger plus tard).
- **`GlassToast`** (`components/glass-toast.tsx`, nouveau) : carte verre via
  `BlurView` (`expo-blur`) + voile laiteux + bordure lumineuse + ombre. Deux vues
  imbriquées (ombre dehors / clip du flou dedans). Intensité du flou **jamais
  animée**. Android : `experimentalBlurMethod="dimezisBlurView"`.
- Branché sur le sync du jardin via `toast.custom` : delta>0 → « +X pas
  synchronisés » ; delta nul → « Déjà à jour ». **Icône ✓ retirée** (demande
  utilisateur).
- Réglages actuels après itérations : `RADIUS = 13`, `intensity = 58`, voile
  `rgba(255,255,255,0.1)`, carte élargie (`alignSelf:'stretch'`, gouttière 12).

---

## Fichiers de la session

| Chemin | Quoi |
| --- | --- |
| `apps/mobile/src/features/garden/garden-home-screen.tsx` | **Nouveau.** Écran Home minimal. |
| `apps/mobile/src/features/garden/use-pull-to-sync.ts` | **Nouveau.** Geste pull-to-sync. |
| `apps/mobile/src/features/garden/components/glass-toast.tsx` | **Nouveau.** Toast verre. |
| `apps/mobile/src/app/garden-lab.tsx` | **Nouveau.** Route du banc d'essai. |
| `apps/mobile/src/features/garden/components/step-ring.tsx` | Arc de charge + balayette de sync. |
| `apps/mobile/src/features/garden/bloom.ts` | `counterDuration` / `gardenDuration`, constantes. |
| `apps/mobile/src/features/garden/use-bloom-lab.ts` | Horloge `counter`, helper `bloomTo`. |
| `apps/mobile/src/features/garden/components/bloom-scrubber.tsx` | Écrit les deux horloges. |
| `apps/mobile/src/features/garden/palette.ts` | Token `ringSync`. |
| `apps/mobile/src/app/garden.tsx`, `_layout.tsx`, `index.ts`, `garden-lab-link.tsx` | Routing / exports. |
| `apps/mobile/package.json` | +`sonner-native`, +`expo-haptics`, +`expo-blur`. |

---

## À faire ensuite (ordre suggéré)

1. **BUILD NATIF OBLIGATOIRE avant de tester.** `expo-blur`, `expo-haptics`,
   `sonner-native` ajoutent du natif. Client de dev custom (`expo-dev-client`) →
   `cd apps/mobile && pnpm ios` (ou `pnpm android`). Un reload JS ne suffit pas :
   sans rebuild, `BlurView` s'affiche « Unimplemented component » (déjà rencontré
   cette session).
2. **Tout juger sur appareil** (rien vu tourner cette session) : fluidité
   compteur 2 s vs jardin 2,5–5,5 s ; pull-to-sync (seuil 96, haptique pile au
   seuil, rien ne bouge) ; terracotta sur l'aquarelle ; toast verre — **iOS
   d'abord** (flou de référence), puis vérifier le flou Android `dimezisBlurView`
   (scintillement à l'entrée/sortie ?).
3. **Trancher `.scratch/`** et le `.gitignore` (les `norm/p1..p8.png` sont les
   sources de régénération) avant tout commit.
4. **Passe `code-review` puis commit groupé** : découplage + durées + pull-to-sync
   + couleur + toast verre + ADR. Rédiger **l'amendement d'ADR** qui acte le
   découplage (la lettre « une seule shared value » n'est plus exacte — l'esprit
   « une seule cible engagée » tient).
5. **Suite Home** (cf. handoff du 26, toujours valable) : brancher le jardin sur
   le vrai modèle `ProgressSummary`/`DayProgress` (aujourd'hui `steps/20000` +
   sync **factice** à delta aléatoire) ; source de pas réelle (aucune lib santé) ;
   décision remplacer-vs-fusionner le tableau de bord existant ; contrat de perf
   de l'ADR toujours non mesuré.

---

## Décisions utilisateur — ne pas relitiger

- **Compteur : durée fixe.** Jardin : **proportionnel au delta** (testé et gardé).
- **Découpler compteur et jardin** : à 2 s partout, le jardin s'animait trop vite
  et cassait la satisfaction ; le compteur, lui, doit rester vif et fixe.
- **Pull-to-sync : rien ne se déplace.** Retour subtil sur l'anneau, pas le bloc
  qui descend. Le lab reste le banc d'essai.
- **Couleur de sync : pas d'aplat saturé.** Le vrai problème était la saturation,
  pas la teinte — un accent doit être rompu/chaud, dans la famille du papier.
  Retenu : terracotta `#9E5F46`. (Refusés en cours de route : orange, bleu
  ardoise, rose pâle `#FFCCD3` — invisible sur le crème —, corail vif.)
- **Toast : effet liquid glass**, transparence poussée, peu arrondi (`RADIUS=13`),
  élargi, **sans icône check**.
- Portage RN de Sonner = **`sonner-native`** (Sonner « web » ne tourne pas en RN).

---

## Constantes de réglage (toutes commentées sur place)

- Durées : `COUNTER_MS`, `GARDEN_MIN_MS`, `GARDEN_MAX_MS` (`bloom.ts`).
- Geste : `PULL_THRESHOLD` (`use-pull-to-sync.ts`).
- Anneau sync : `SWEEP_FRACTION`, `CHARGE_MAX_OPACITY`, `SWEEP_MAX_OPACITY`
  (`step-ring.tsx`). Baisser les opacités (~0,55) rend l'accent plus « verre ».
- Couleur : `ringSync` (`palette.ts`).
- Toast : `RADIUS`, `intensity`, opacité du `wash` (`glass-toast.tsx`).

---

## Points ouverts

- **Redondance de feedback** : compteur qui grimpe + floraison + indice « À jour »
  + toast disent la même chose. OK pour tester ; choisir lequel porte le message
  au moment de figer l'UX.
- **Lisibilité du toast** à voile 0,1 si un fond sombre passe derrière (texte
  foncé `#1E2A22`) — remonter le voile ou poser un dégradé sous le texte le cas
  échéant.
- **`GlassToast` non tolérant à l'absence de flou** : proposé mais pas fait —
  détecter un `BlurView` natif indisponible et retomber sur le verre translucide
  au lieu du carré « unimplemented ».
- **Deux libs de toast** (`react-native-flash-message` + `sonner-native`) — à
  converger.
- Bouton « Réinitialiser » dev à retirer sur la vraie Home.

---

## Suggested skills

- **`animate-expo`** — avant tout réglage du pull-to-sync, des durées, de la
  balayette. Déjà utilisé cette session ; le pull-to-refresh signature justifie le
  fait main (confirmé par le skill).
- **`color`** — pour tout nouvel arbitrage de couleur (le token `ringSync`).
  Rappel du fichier : **RN ne parse pas `oklch()`, la palette est en hex** ; on
  convertit en amont. Déjà utilisé cette session.
- **`ui-review`** / **`design-foundations`** — juger le rendu premium/nature à
  l'œil (tous les arbitrages décisifs sont des jugements de perception sur
  appareil).
- **`code-review`** — avant le commit groupé.
- **`ask-sonner`** est orienté web ; peu utile pour `sonner-native`. S'appuyer sur
  les types du paquet (`node_modules/sonner-native/lib/typescript/src/types.d.ts`)
  qui exposent `toast.custom`, `backgroundComponent`, `toastOptions`.
