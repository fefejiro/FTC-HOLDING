# Una Labs — Stripe Payment Setup
Last updated: 2026-04-20

## Status

| Item | Status |
|------|--------|
| Worker deployed | ✓ https://una-stripe-api.fejiro-efiuvwere.workers.dev |
| Test mode fully working | ✓ Verified end-to-end in browser |
| /start intake form | ✓ https://unalabs.cloud/start |
| /start/summary review + payment | ✓ https://unalabs.cloud/start/summary |
| /confirmation post-payment | ✓ https://unalabs.cloud/confirmation |
| Live Stripe key set | ✓ rk_live_ key in worker |
| Live products + prices | ✓ All 8 live prices set in worker |
| **Live checkout verified** | ✓ cs_live_ session created 2026-04-18 |
| **Connect sandbox verification** | ✓ Completed 2026-04-20 via Una Labs admin onboarding flow |
| **RBC bank account** | ⏳ Manual step — see below |

---

## Live mode price IDs (set in worker 2026-04-18)

| Plan | Monthly | Annual |
|------|---------|--------|
| Starter | price_1TNbbd5M2AZUCbReEyubdwVq | price_1TNbbe5M2AZUCbReJQVY14Qs |
| Professional | price_1TNbbd5M2AZUCbRep5dLdnJ0 | price_1TNbbe5M2AZUCbReo3Ssc2tk |
| Agency | price_1TNbbd5M2AZUCbRe5rCIGwQJ | price_1TNbbe5M2AZUCbRe89sEZlDU |
| Enterprise | price_1TNbbd5M2AZUCbReTSrmgs8Q | price_1TNbbe5M2AZUCbRekGVcW0SP |

Live products: Starter `prod_UMKF4H6Zxzv892` · Professional `prod_UMKF4LJinghWif` · Agency `prod_UMKFqA2XGQ0V4h` · Enterprise `prod_UMKFRlsQpirgks`

Key in worker: `rk_live_51TMK0E5M2AZUCbRe...` (OAuth restricted key, has checkout + price read/write)

Test card (test mode only): `4242 4242 4242 4242` · any future date · any CVC

---

## Switch to live mode (one-time)

### Step 1 — Get your live secret key
Go to: https://dashboard.stripe.com/apikeys  
Click **Reveal live key** next to Secret key → copy the `sk_live_...` value

### Step 2 — Set it in the worker
Open PowerShell in `c:\FTC HOLDING\workers\stripe-api\` and run:

```powershell
cmd /c "echo sk_live_YOUR_KEY_HERE" | npx wrangler secret put STRIPE_SECRET_KEY
```

### Step 3 — Create live products and prices
```powershell
$stripe = "c:\FTC HOLDING\tmp-bin\stripe-cli\stripe.exe"

# Products
$ls = (& $stripe products create --name="Una Labs Starter"      --live 2>&1 | Out-String | ConvertFrom-Json).id
$lp = (& $stripe products create --name="Una Labs Professional" --live 2>&1 | Out-String | ConvertFrom-Json).id
$la = (& $stripe products create --name="Una Labs Agency"       --live 2>&1 | Out-String | ConvertFrom-Json).id
$le = (& $stripe products create --name="Una Labs Enterprise"   --live 2>&1 | Out-String | ConvertFrom-Json).id

# Monthly prices
$sm = (& $stripe prices create -d "product=$ls" -d "unit_amount=6700"  -d "currency=cad" -d "recurring[interval]=month" --live 2>&1 | Out-String | ConvertFrom-Json).id
$pm = (& $stripe prices create -d "product=$lp" -d "unit_amount=13500" -d "currency=cad" -d "recurring[interval]=month" --live 2>&1 | Out-String | ConvertFrom-Json).id
$am = (& $stripe prices create -d "product=$la" -d "unit_amount=33900" -d "currency=cad" -d "recurring[interval]=month" --live 2>&1 | Out-String | ConvertFrom-Json).id
$em = (& $stripe prices create -d "product=$le" -d "unit_amount=67900" -d "currency=cad" -d "recurring[interval]=month" --live 2>&1 | Out-String | ConvertFrom-Json).id

# Annual prices
$sa = (& $stripe prices create -d "product=$ls" -d "unit_amount=68400"  -d "currency=cad" -d "recurring[interval]=year" --live 2>&1 | Out-String | ConvertFrom-Json).id
$pa = (& $stripe prices create -d "product=$lp" -d "unit_amount=129600" -d "currency=cad" -d "recurring[interval]=year" --live 2>&1 | Out-String | ConvertFrom-Json).id
$aa = (& $stripe prices create -d "product=$la" -d "unit_amount=325200" -d "currency=cad" -d "recurring[interval]=year" --live 2>&1 | Out-String | ConvertFrom-Json).id
$ea = (& $stripe prices create -d "product=$le" -d "unit_amount=651600" -d "currency=cad" -d "recurring[interval]=year" --live 2>&1 | Out-String | ConvertFrom-Json).id

# Set all live price IDs in worker
cmd /c "echo $sm" | npx wrangler secret put STRIPE_PRICE_STARTER_MONTHLY
cmd /c "echo $pm" | npx wrangler secret put STRIPE_PRICE_PROFESSIONAL_MONTHLY
cmd /c "echo $am" | npx wrangler secret put STRIPE_PRICE_AGENCY_MONTHLY
cmd /c "echo $em" | npx wrangler secret put STRIPE_PRICE_ENTERPRISE_MONTHLY
cmd /c "echo $sa" | npx wrangler secret put STRIPE_PRICE_STARTER_ANNUAL
cmd /c "echo $pa" | npx wrangler secret put STRIPE_PRICE_PROFESSIONAL_ANNUAL
cmd /c "echo $aa" | npx wrangler secret put STRIPE_PRICE_AGENCY_ANNUAL
cmd /c "echo $ea" | npx wrangler secret put STRIPE_PRICE_ENTERPRISE_ANNUAL
```

---

## RBC bank account

1. Go to https://dashboard.stripe.com/settings/payouts
2. Click **Add bank account** → Canada
3. Enter RBC routing number + account number
4. Stripe sends 2 micro-deposits (1–2 business days) to verify

Stripe account: `acct_1TMK0E5M2AZUCbRe` (primary contact should be `hello@unalabs.cloud`; verify in Stripe before handoff)

---

## Architecture

```
unalabs.cloud/start        → 2-step intake (details + plan picker)
unalabs.cloud/start/summary → review + sticky payment CTA
  └── POST una-stripe-api.fejiro-efiuvwere.workers.dev/api/create-checkout-session
        └── Stripe Checkout (subscription, 14-day trial, CAD)
              └── success → /confirmation?session_id=xxx
                    └── POST /api/activate-project (verify + notify)
```

## Redeploy commands

```powershell
# Worker
cd "c:\FTC HOLDING\workers\stripe-api"; npx wrangler deploy

# Site
cd "c:\FTC HOLDING\APPS\una-labs-site"
npm run build
npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
```

