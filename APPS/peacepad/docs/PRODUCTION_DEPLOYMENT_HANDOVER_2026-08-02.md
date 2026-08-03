# PeacePad Production Deployment Handover

Date: 2026-08-02

## Outcome

The App Store discovery update is live on `peacepad.ca` from merged commit
`eba4ddd37364ce76aae2540ec88a5b8385047501`.

The production frontend is Cloudflare Pages project `ftc-holding`. It is not the
separate Cloudflare Worker named `peacepad`.

## Verified deployment

| Item | Verified value |
|---|---|
| Pages project | `ftc-holding` |
| Deployment ID | `dbfaac86-06a0-442c-b2d1-71bb61c11b15` |
| Deployment URL | `https://dbfaac86.ftc-holding.pages.dev` |
| Production branch | `main` |
| Commit | `eba4ddd37364ce76aae2540ec88a5b8385047501` |
| Root directory | `APPS/peacepad` |
| Build command | `npm run build:frontend` |
| Output directory | `dist/public` |
| Production domains | `peacepad.ca`, `www.peacepad.ca` |
| Automatic Git deployments | Disabled for production and preview |
| PR deployment comments | Disabled |

The verified recovery command was:

```bash
wrangler pages deploy dist/public --project-name ftc-holding --branch main --commit-hash eba4ddd37364ce76aae2540ec88a5b8385047501 --commit-message "Publish PeacePad App Store discovery links"
```

## Live checks

The following checks passed after publication:

- `https://peacepad.ca/` returned HTTP 200.
- `https://peacepad.ca/privacy` returned HTTP 200.
- `https://peacepad.ca/terms` returned HTTP 200.
- `https://peacepad.ca/support` returned HTTP 200.
- `https://apps.apple.com/ca/app/peacepad/id6793350735` returned HTTP 200.
- The homepage contains the Smart App Banner for Apple ID `6793350735`.
- The homepage structured data lists Web, iOS, iPadOS, and Android.
- The App Store download and install destinations are present.

Before the deployment, the exact frontend commit passed TypeScript, the focused
App Store visibility unit contract, and a Vite production build. The full secret
guard also passed before publication of the same commit.

## Failure classification

### Git-connected Pages deployment

Cloudflare Pages deployment `63581ab0-d0db-46b5-bf8a-915e6e33d81f` failed in
the repository-clone stage. The build step did not start. The successful build
and direct Pages deployment of the same commit rule out the PeacePad bundle as
the cause of that incident.

If this repeats, inspect the Pages deployment stages before changing product
code. Cloudflare documents root directories and build watch paths as the
monorepo controls for Git-connected builds:

- <https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>
- <https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/>

Because this account's Pages source integration repeatedly failed while cloning
the repository, automatic production and preview deployments were disabled on
2026-08-02 through the Pages API. Cloudflare explicitly supports disabling Git
deployments while continuing to deploy the same Pages project with Wrangler:

- <https://developers.cloudflare.com/pages/get-started/git-integration/>

The live deployment and custom domains were rechecked after this setting change
and remained available. Direct Wrangler deployment is now the authoritative
frontend release path until the Git installation is repaired and re-verified.

### Legacy Worker named `peacepad`

The red `Latest build failed` badge in the original Cloudflare screenshot
belonged to a separate Worker named `peacepad` that was still Git-connected.

Read-only checks showed:

- no PeacePad custom domain;
- no route;
- no binding;
- zero recent invocations;
- old deployments unrelated to the current Pages release.

This Worker is not serving `peacepad.ca`. Its failed check is noise on unrelated
pull requests, not a production outage.

## Completed dashboard cleanup

On 2026-08-02 the repository integration was disconnected through **Worker
Settings -> Build**. The result was verified in the dashboard:

- the Worker remained present;
- the Build section no longer displayed a Git repository and offered
  **Connect** instead;
- no domain, route, binding, or runtime configuration was deleted;
- `peacepad.ca`, `www.peacepad.ca`, Privacy, Terms, Support, and the Canadian
  App Store listing each returned HTTP 200 after the change.

Do not delete the Worker until its lack of domains, routes, bindings, secrets,
and traffic is reconfirmed. The completed Git disconnect is sufficient to stop
new irrelevant repository builds while preserving a recovery path.

The current Wrangler OAuth session can deploy Pages and inspect Worker
deployments, but it cannot edit Workers Builds configuration. The Workers
Builds API returned Cloudflare authentication error `10000`. Automatic cleanup
would have required a user-scoped token with Workers Builds Configuration edit
permission, so the authenticated dashboard was used instead.

## GitHub check note

The PeacePad Production Gates job associated with the same change failed before
allocation: it reported no runner and contained no executed steps. Treat that as
an external runner/billing allocation failure, not a passing or failing product
test. Local verification remains the evidence for this deployment.

## Next product visibility work

1. Record the current non-public keyword and promotional-text fields in App
   Store Connect.
2. Apply only the approved 145-character promotional text to version 1.0.
3. Confirm the canonical Support URL is `https://peacepad.ca/support`.
4. Reconcile App Privacy answers with the exact live binary.
5. Produce a six-screen conversion set for version 1.0.1 after the UI is tested.
6. Add French and Spanish metadata only after source copy review.

Do not upload a replacement binary merely to change promotional text or public
website discovery links.
