# Handoff — backend Molio : Supabase (tickets 01-03)

**Date :** 2026-08-31 (mise à jour de la version du 2026-08-30) · **Repo :**
`/Users/thomas/Documents/dev/molio`
**Branche :** `main` · **État git :** ⚠️ **rien de committé pour le ticket 03.**
Les tickets 01-02 sont mergés (PR #22, commit `4b43e79`). Le ticket 03 est
implémenté et vérifié en local mais encore entièrement en working tree, à
committer/pousser (l'utilisateur garde la main sur commit/push/PR — ne pas le
faire de sa propre initiative).

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
- **Confirmation d'email désactivée** côté dashboard Supabase (Authentication →
  Sign In / Providers → Email → « Confirm email »), pour que `signUp` ouvre une
  session tout de suite plutôt que de renvoyer une session `null` en attendant un
  clic dans un email. Pratique pour le MVP/dev ; à revisiter avant de vraies
  inscriptions (n'importe quelle adresse, même invalide, peut créer un compte tant
  que c'est désactivé). Ce réglage vit uniquement dans le dashboard, pas dans le
  repo — à refaire si le projet Supabase est un jour recréé.

## 2. Ce qui est fait

**Ticket 01 — Schéma + CLI** (mergé, PR #22) :
`supabase/migrations/20260830203106_init_profiles_and_day_activity.sql`,
appliquée avec `supabase db push --linked` :
- `profiles(id, name, flower, created_at)` — `flower` contraint aux 8 valeurs de
  `palette.ts`'s `Hue`, à garder synchronisé si un hue est ajouté/renommé. RLS
  `select`/`update` par `auth.uid() = id`, **pas d'insert/delete côté client**.
- `day_activity(user_id, date, steps, goal, source, synced_at)`, PK
  `(user_id, date)`. RLS `select`/`insert`/`update` par `auth.uid() = user_id`.
- Trigger `on_auth_user_created` → `handle_new_user()` (security definer) crée la
  ligne `profiles` à l'inscription, quelle que soit la méthode d'auth future —
  lit `raw_user_meta_data ->> 'name'` (avec repli sur `full_name`, le préfixe de
  l'email, puis `'Marcheur'`).
- Types régénérés depuis le vrai schéma dans
  `packages/supabase/src/database.types.ts`.

**Ticket 02 — Client câblé** (mergé, PR #22) :
- `packages/supabase/src/client.ts` — `createSupabaseClient(url, anonKey, options)`,
  factory générique, ne connaît pas `Env`.
- `apps/mobile/src/lib/supabase/storage-adapter.ts` — MMKV chiffrée dédiée
  (`supabase-auth`), clé de 16 octets générée une fois et gardée dans
  `expo-secure-store`.
- `apps/mobile/src/lib/supabase/client.ts` — singleton `supabase`, lit
  `Env.EXPO_PUBLIC_SUPABASE_{URL,ANON_KEY}`, relance
  `startAutoRefresh`/`stopAutoRefresh` sur les transitions `AppState`.
- Dépendances : `@supabase/supabase-js`, `react-native-url-polyfill`,
  `expo-secure-store`, `supabase` CLI en devDependency racine.
- `env.ts` + `.env.example` + `.env` (local, gitignoré) :
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Ticket 03 — Email + mot de passe réel** (implémenté 2026-08-31, **pas encore
committé**) :
- `src/features/auth/api.ts` (nouveau) : `useSignInWithPassword`,
  `useSignUpWithPassword`, `useSignOut` en `react-query-kit`
  (`createMutation`), câblés sur `supabase.auth.*`. `signUp` passe `name` en
  user metadata pour que le trigger `handle_new_user` l'utilise — le client
  n'insère jamais directement dans `profiles`.
- `use-auth-store.tsx` réécrit : même forme (`status: idle|signOut|signIn`,
  `createSelectors`), mais adossé à `supabase.auth.getSession()` (dans
  `hydrate()`) + `supabase.auth.onAuthStateChange` (source de vérité continue,
  y compris pour les refresh de token) au lieu du couple `getToken`/`setToken`
  fait main. `signOut` et `hydrate` restent exposés à l'identique pour que
  `settings-screen.tsx` n'ait rien à changer.
- `login-screen.tsx` branché sur `useSignInWithPassword` pour de vrai —
  `router.replace('/')` (pas de retour possible vers le login une fois connecté),
  erreurs via `showErrorMessage` (`@/components/ui`, pattern déjà utilisé dans
  `feed/add-post-screen.tsx`).
- `login-form.tsx` : retrait du champ `name` orphelin et du texte de démo
  (« feel free to use any email... »), `onSubmit` devient `async` pour que le
  bouton reste en `loading` pendant l'appel réseau (le `form.Subscribe` sur
  `isSubmitting` ne suivait sinon que l'exécution synchrone), lien vers
  `/register`.
- Écran d'inscription (nouveau) : `register-screen.tsx` +
  `components/register-form.tsx` (+ test miroir de `login-form.test.tsx`) —
  gère les deux cas Supabase : session retournée immédiatement (confirmation
  email désactivée, cf. §1), ou `null` (confirmation activée → message + retour
  au login). Route `src/app/register.tsx`, ajoutée au `Stack` racine
  (`src/app/_layout.tsx`).
- `(app)/_layout.tsx` : petit correctif induit par le passage à une hydratation
  asynchrone — `status === 'idle'` ne rend plus rien (avant : passait à travers
  vers les Tabs), pour éviter un flash de l'UI connectée avant de savoir si une
  session existe réellement.
- Supprimé : `lib/auth/utils.tsx` (le faux token en clair dans la MMKV
  partagée) — plus rien ne l'importait après la réécriture du store.

**Fichiers touchés par le ticket 03** (`git status --short`) :
```
M  apps/mobile/src/app/(app)/_layout.tsx
M  apps/mobile/src/app/_layout.tsx
M  apps/mobile/src/features/auth/components/login-form.test.tsx
M  apps/mobile/src/features/auth/components/login-form.tsx
M  apps/mobile/src/features/auth/login-screen.tsx
M  apps/mobile/src/features/auth/use-auth-store.tsx
D  apps/mobile/src/lib/auth/utils.tsx
?? apps/mobile/src/app/register.tsx
?? apps/mobile/src/features/auth/api.ts
?? apps/mobile/src/features/auth/components/register-form.test.tsx
?? apps/mobile/src/features/auth/components/register-form.tsx
?? apps/mobile/src/features/auth/register-screen.tsx
```

## 3. Secrets — comment ils ont été manipulés

Le jeton d'accès personnel Supabase et le mot de passe de la base Postgres n'ont
servi que dans le terminal, pour `supabase login --token`, `supabase link -p` et
`supabase db push -p` — **jamais écrits dans un fichier du repo**. L'URL et la clé
anon (publiques par nature, faites pour être dans le bundle client) sont les seules
valeurs Supabase qui vivent dans `.env` (gitignoré) / `.env.example` (placeholder).

## 4. Vérifications faites

- `pnpm type-check` (racine, les 3 paquets) → **0**.
- `pnpm --filter mobile lint` → **0 erreur, 14 warnings préexistants**
  (`react-refresh`, inchangés).
- `pnpm --filter mobile test` (Jest complet) → **78/78 verts**, dont les 8 tests
  de `login-form.test.tsx` + `register-form.test.tsx` (nouveau, miroir du
  premier).
- **Vu tourner sur simulateur iOS** (2026-08-31) : créer un compte fonctionne
  bien de bout en bout.
- **Pas encore testé** : Android physique, et le redémarrage à froid (critère
  explicite du ticket — la session doit survivre grâce à l'adaptateur MMKV
  chiffré du ticket 02). C'est la seule chose qui retient le ticket 03 côté
  `Status: open` dans `.scratch/supabase-backend/issues/03-email-password-auth.md`
  (voir sa section `## Comments` pour le détail).

## 5. À faire ensuite

3. **Finir la vérification du ticket 03** — tester sur Android physique +
   redémarrage à froid (créer un compte, se déconnecter, se reconnecter,
   kill l'app, la rouvrir : la session doit être encore là). Puis committer —
   probablement en 2 commits distincts vu le split modification/suppression
   (`use-auth-store.tsx` + suppression de `lib/auth/utils.tsx` d'un côté,
   nouvel écran d'inscription de l'autre), ou un seul commit si l'utilisateur
   préfère — à voir avec lui, pas de convention encore établie sur ce point
   précis.
4. **Apple Sign-In** (bloqué) — nécessite d'abord un accès Apple Developer Program
   (capacité « Sign in with Apple » + provider Supabase). Prévoir un `/wizard` pour
   cette partie une fois le compte en main.
5. **Google Sign-In** (bloqué) — nécessite d'abord un projet Google Cloud Console
   (clients OAuth Web/iOS/Android, empreinte SHA-1 pour Android). Même remarque
   `/wizard`.
6. **Sync de l'historique de pas** (`use-day-history.ts`) — maintenant possible
   pour de vrai : le ticket 03 donne un `auth.uid()` réel contre qui tester.
   Additive : MMKV reste le cache optimiste/hors-ligne, `day_activity` devient la
   source qui fait autorité par jour une fois une session ouverte ; le seed
   continue de jouer son rôle de repli hors-ligne/déconnecté.

**Toujours en attente côté jardin (pas ce chantier)** : redimensionner
`profile-poppy.png` (2,47 Mo), voir tourner sur appareil ce qui reste de la session
leaderboard (6), committer le retrait du badge de niveau.

## Suggested skills

- **`tdd`** — pertinent pour le ticket 06 : première fois que l'app a un vrai
  état serveur à synchroniser avec un cache local optimiste (MMKV vs
  `day_activity`), contrairement au jardin qui est surtout du rendu.
- **`wizard`** — pour les tickets 04 et 05, au moment de guider la création des
  identifiants Apple/Google.
- **`code-review`** — à envisager sur le diff du ticket 03 avant de committer,
  vu qu'il touche à l'auth (surface sensible) même si aucun review formel n'a
  encore été fait dessus dans cette session.

## Rappels d'environnement

- Projet Supabase hébergé : `aspqxufsiuphyxzvbyvb`. CLI en devDependency racine
  (`pnpm exec supabase ...`), déjà liée (`supabase link`) — pas besoin de relier
  sauf nouvelle machine.
- Pas de Docker, pas de `supabase start` : tout passe par le projet hébergé
  (`--linked` sur les commandes CLI qui le demandent).
- Commandes : `pnpm type-check` (racine, couvre les 3 paquets),
  `pnpm --filter mobile lint`, `pnpm --filter mobile test`,
  `pnpm --filter mobile type-check`.
- **Pas de trailer `Co-Authored-By` / `Claude-Session`** dans les commits de ce
  repo.
- L'utilisateur délègue push/PR/merge, et attend un découpage en plusieurs PR
  quand les sujets sont distincts. Ici, le ticket 03 est un sujet cohérent en
  lui-même (auth réelle) — pas besoin de le re-découper, mais il ne doit pas se
  mélanger avec d'éventuels changements jardin non liés.
