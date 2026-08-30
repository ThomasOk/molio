# Handoff — backend Molio : Supabase (tickets 01-02)

**Date :** 2026-08-30 · **Repo :** `/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** ⚠️ **rien de committé.** Deux sujets distincts
non committés en parallèle — à garder en PR séparées :
1. Ce chantier (schéma + client Supabase).
2. Un sujet précédent, sans rapport : retrait du badge de niveau sur l'écran
   Classement (`garden-leaderboard-screen.tsx`, `leaderboard.ts`).

**À lire d'abord :** `.scratch/supabase-backend/spec.md` et ses tickets
(`issues/01-06`) — c'est la trace de référence, ce handoff en est le résumé
narratif. Le fichier `docs/handoff/handoff-molio-garden-20260827-gamification.md`
reste la référence pour tout ce qui est jardin/UI, sans lien avec ce chantier.

Oui, on peut reprendre dans une nouvelle session : ouvrir cette session avec
`.scratch/supabase-backend/spec.md` en premier suffit à retrouver le contexte —
c'est exactement pour ça que le tracker existe. Rien de spécial à faire côté outil,
juste pointer vers ce fichier en démarrant.

## 1. Décision de fond (à ne pas relitiger)

- **Supabase pour le MVP.** Effect (effect-ts) reste une idée « peut-être plus
  tard » pour la robustesse, pas le plan actuel — ne pas introduire de package
  `@molio/api` en Effect de sa propre initiative.
- **Auth : email + mot de passe, ET Google, ET Apple**, toutes les trois dès le
  départ (pas de choix unique).
- **Les amis restent mockés** (`friends.ts`) — ce chantier persiste MON profil et
  MON historique de pas, pas un vrai classement multi-comptes.
- **La source des pas reste le seed + les outils dev** — pas de HealthKit/Health
  Connect dans ce chantier.
- **Projet hébergé (free tier), pas de Docker local.** Écarté en discussion :
  `supabase start` en local aurait tourné sur `localhost`, injoignable depuis un
  téléphone Android physique sans bricoler l'IP LAN — encore une source de bugs
  « marche en simu, pas sur l'appareil » comme celles déjà rencontrées (cache
  Metro, `experimentalBlurMethod`...). Le hosted évite complètement cette classe de
  problème, et la CLI s'utilise pareil dans les deux cas.
- Projet : `aspqxufsiuphyxzvbyvb` (`https://aspqxufsiuphyxzvbyvb.supabase.co`).

## 2. Ce qui est fait (tickets 01 et 02)

**Schéma** (`supabase/migrations/20260830203106_init_profiles_and_day_activity.sql`,
appliquée avec `supabase db push --linked`) :
- `profiles(id, name, flower, created_at)` — `flower` contraint aux 8 valeurs de
  `palette.ts`'s `Hue`, à garder synchronisé si un hue est ajouté/renommé. RLS
  `select`/`update` par `auth.uid() = id`, **pas d'insert/delete côté client**.
- `day_activity(user_id, date, steps, goal, source, synced_at)`, PK
  `(user_id, date)`. RLS `select`/`insert`/`update` par `auth.uid() = user_id`.
- Trigger `on_auth_user_created` → `handle_new_user()` (security definer) crée la
  ligne `profiles` à l'inscription, quelle que soit la méthode d'auth future.
- Types régénérés depuis le vrai schéma dans
  `packages/supabase/src/database.types.ts` (remplace le placeholder).

**Client** :
- `packages/supabase/src/client.ts` — `createSupabaseClient(url, anonKey, options)`,
  factory générique, **ne connaît pas `Env`** (le paquet reste agnostique
  d'Expo, comme `packages/domain`).
- `apps/mobile/src/lib/supabase/storage-adapter.ts` — le point le plus
  intéressant techniquement. Le faux token d'auth vivait en clair dans la MMKV
  partagée avec l'historique de pas (`src/lib/storage.tsx`, `createMMKV()` sans
  clé). Pour une vraie session, ni SecureStore seul (limite ~2 Ko par item côté
  Keychain, une session Supabase la dépasse souvent) ni MMKV seul (pas d'endroit
  sûr où garder une clé de chiffrement persistante) ne suffisent : l'adaptateur
  génère une clé de 16 octets (le max que MMKV accepte) une seule fois, la garde
  dans `expo-secure-store`, et l'utilise pour chiffrer une instance MMKV **dédiée**
  (`supabase-auth`, distincte de celle du reste de l'app) où vit la session.
- `apps/mobile/src/lib/supabase/client.ts` — singleton `supabase`, lit
  `Env.EXPO_PUBLIC_SUPABASE_{URL,ANON_KEY}`, câble l'adaptateur, et relance
  `startAutoRefresh`/`stopAutoRefresh` sur les transitions `AppState` (patron
  officiel Supabase pour RN — un timer JS ne tourne pas en arrière-plan, sans ça
  une session peut expirer silencieusement et ne se voir qu'à un 401 confus plus
  tard).
- Nouvelles dépendances : `@supabase/supabase-js` (packages/supabase +
  apps/mobile), `react-native-url-polyfill` (patché en side-effect import, requis
  par `supabase-js` — RN n'implémente pas `URL` en entier), `expo-secure-store`
  (installée via `expo install` pour la version compatible SDK 57, plugin ajouté à
  `app.config.ts`), `supabase` CLI en devDependency racine.
- `env.ts` + `.env.example` + `.env` (local, jamais commité — déjà gitignoré) :
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, même patron que
  `EXPO_PUBLIC_API_URL`.

**Le client n'est encore importé nulle part** dans un écran — volontaire, c'est le
ticket 03 qui le consomme pour de vrai.

## 3. Secrets — comment ils ont été manipulés cette session

Le jeton d'accès personnel Supabase et le mot de passe de la base Postgres n'ont
servi que dans le terminal, pour `supabase login --token`, `supabase link -p` et
`supabase db push -p` — **jamais écrits dans un fichier du repo**. L'URL et la clé
anon (publiques par nature, faites pour être dans le bundle client) sont les seules
valeurs Supabase qui vivent dans `.env` (gitignoré) / `.env.example` (placeholder).

## 4. Vérifications faites

`pnpm type-check` (racine, les 3 paquets) → **0**. `pnpm --filter mobile lint` →
**0 erreur, 14 warnings préexistants** (`react-refresh`, inchangés). Migration
vérifiée par `supabase db push --linked` sans erreur ; types régénérés depuis le
schéma réel et comparés à la migration. **Rien vu tourner sur appareil** — normal,
aucun écran ne consomme encore le client (ticket 03).

## 5. À faire ensuite — tickets 03 à 06

Détail complet dans `.scratch/supabase-backend/issues/`. Résumé :

3. **Email + mot de passe réel** (ouvert, prochain logique) — remplacer le faux
   token de `use-auth-store.tsx` par `supabase.auth.getSession()` +
   `onAuthStateChange`, écran d'inscription (patron `login-form.tsx`, TanStack
   Form), mutations en `react-query-kit` dans un nouveau
   `src/features/auth/api.ts` (convention déjà en place dans
   `src/features/feed/api.ts`).
4. **Apple Sign-In** (bloqué) — nécessite d'abord un accès Apple Developer Program
   (capacité « Sign in with Apple » + provider Supabase). Prévoir un `/wizard` pour
   cette partie une fois le compte en main.
5. **Google Sign-In** (bloqué) — nécessite d'abord un projet Google Cloud Console
   (clients OAuth Web/iOS/Android, empreinte SHA-1 pour Android). Même remarque
   `/wizard`.
6. **Sync de l'historique de pas** (`use-day-history.ts`) — après le ticket 03,
   pour avoir un vrai `auth.uid()` contre qui tester. Additive : MMKV reste le
   cache optimiste/hors-ligne, `day_activity` devient la source qui fait autorité
   par jour une fois une session ouverte ; le seed continue de jouer son rôle de
   repli hors-ligne/déconnecté.

**Toujours en attente côté jardin (pas ce chantier)** : redimensionner
`profile-poppy.png` (2,47 Mo), voir tourner sur appareil ce qui reste de la session
leaderboard (6), committer le retrait du badge de niveau.

## Suggested skills

- **`tdd`** — pertinent dès le ticket 03 : c'est la première fois que l'app a un
  vrai état serveur à tester (session, redirections d'auth), contrairement au
  jardin qui est surtout du rendu.
- **`wizard`** — pour les tickets 04 et 05, au moment de guider la création des
  identifiants Apple/Google.
- Pas de skill de review nécessaire pour l'instant (pas encore d'UI branchée) ; y
  revenir au ticket 03.

## Rappels d'environnement

- Projet Supabase hébergé : `aspqxufsiuphyxzvbyvb`. CLI en devDependency racine
  (`pnpm exec supabase ...`), déjà liée (`supabase link`) — pas besoin de relier
  sauf nouvelle machine.
- Pas de Docker, pas de `supabase start` : tout passe par le projet hébergé
  (`--linked` sur les commandes CLI qui le demandent).
- Commandes : `pnpm type-check` (racine, couvre les 3 paquets),
  `pnpm --filter mobile lint`, `pnpm --filter mobile type-check`.
- **Pas de trailer `Co-Authored-By` / `Claude-Session`** dans les commits de ce
  repo.
- L'utilisateur délègue push/PR/merge, et attend un découpage en plusieurs PR
  quand les sujets sont distincts (ici : ce chantier ≠ le retrait du badge de
  niveau, à ne pas mélanger dans une même PR).
