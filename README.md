# Molio

mobile step-tracking app

## Structure

```text
apps/
  mobile/        Expo / React Native
packages/
  domain/       Pure, shareable business rules
  supabase/     Types generated from the Supabase database
supabase/
  migrations/   Versioned SQL migrations
```

`apps/web` and `apps/api` will be added when a concrete product need justifies it.

## Getting started

Prerequisites: Node.js, pnpm 10, and the native tooling required by Expo.

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev
```

To run a development build:

```bash
pnpm ios
pnpm android
```

App-specific Expo and EAS commands must be run from `apps/mobile`.

## Checks

```bash
pnpm check
```

## Supabase

Migration files live in `supabase/migrations`. Once the Supabase project is linked, the generated types should replace `packages/supabase/src/database.types.ts`.
