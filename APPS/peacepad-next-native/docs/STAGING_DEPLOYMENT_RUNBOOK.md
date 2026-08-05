# PeacePad Native Staging Deployment

This runbook is for the isolated V2 service only. It must never target the
approved Capacitor application, production data, or production API host.

## Required separation

- `PEACEPAD_STAGING_MIGRATION_DATABASE_URL` belongs to the schema owner used
  only by Railway's pre-deploy migration command.
- `PEACEPAD_STAGING_RUNTIME_DATABASE_URL` belongs to the dedicated
  `peacepad_native_staging_runtime` role used by the running service.
- The runtime role is created out of band without superuser, schema-owner,
  role-management, database-creation, or bypass-RLS privileges.
- Both URLs must name an isolated database containing `staging` in its name.
- All identities, families, and invitation data must be fictional.

## Deployment sequence

1. Provision one isolated PostgreSQL database and create the dedicated runtime
   role. Do not reuse production credentials.
2. Configure the server-only values listed in `staging/.env.server.example`.
   Never expose them through `EXPO_PUBLIC_*` variables.
3. Railway runs `npm run staging:migrate` as its pre-deploy command. The
   migrator takes an advisory lock, applies migration `0001`, revokes PUBLIC
   access, grants only data access to the runtime role, and releases the lock.
4. Railway starts `npm run staging:start` with the runtime database URL.
5. After deployment, run:

   ```text
   PEACEPAD_STAGING_SMOKE_URL=https://api.staging.peacepad.ca npm run staging:smoke
   ```

   The smoke check calls only `/health` and `/readyz`, sends no credential, and
   rejects production or non-PeacePad targets.

## Promotion gate

Do not connect an iPhone until migration, runtime startup, and the readiness
smoke pass. A passing smoke check proves service and database readiness only;
it does not prove invitation correctness, concurrency, backup restoration, or
production suitability.
