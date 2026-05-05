# Una Labs — Stripe Worker Secret Setup
# Run this from: c:\FTC HOLDING\workers\stripe-api\
# Gets your keys from: https://dashboard.stripe.com/apikeys
# Gets your price IDs from: https://dashboard.stripe.com/products

Write-Host "`n=== Una Labs Stripe Worker Setup ===" -ForegroundColor Cyan
Write-Host "This will set your Stripe keys in the Cloudflare Worker." -ForegroundColor Gray
Write-Host "Keys are stored securely in Cloudflare — never in this repo.`n" -ForegroundColor Gray

function Set-Secret($name, $prompt) {
    Write-Host $prompt -ForegroundColor Yellow -NoNewline
    $val = Read-Host
    if ($val.Trim()) {
        $val | npx wrangler secret put $name
        Write-Host "  ✓ $name set`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Skipped $name`n" -ForegroundColor DarkYellow
    }
}

Write-Host "--- STRIPE API KEY ---" -ForegroundColor White
Write-Host "Find at: https://dashboard.stripe.com/apikeys`n" -ForegroundColor Gray
Set-Secret "STRIPE_SECRET_KEY" "Paste your Stripe Secret Key (sk_live_... or sk_test_...): "

Write-Host "--- STRIPE PRICE IDs ---" -ForegroundColor White
Write-Host "Create products at: https://dashboard.stripe.com/products" -ForegroundColor Gray
Write-Host "Each plan needs a Monthly and Annual price in CAD.`n" -ForegroundColor Gray

# Starter — CA$67/mo | CA$57/mo (annual)
Set-Secret "STRIPE_PRICE_STARTER_MONTHLY"    "Starter Monthly (CA`$67/mo) price ID: "
Set-Secret "STRIPE_PRICE_STARTER_ANNUAL"     "Starter Annual  (CA`$57/mo) price ID: "

# Professional — CA$135/mo | CA$108/mo
Set-Secret "STRIPE_PRICE_PROFESSIONAL_MONTHLY" "Professional Monthly (CA`$135/mo) price ID: "
Set-Secret "STRIPE_PRICE_PROFESSIONAL_ANNUAL"  "Professional Annual  (CA`$108/mo) price ID: "

# Agency — CA$339/mo | CA$271/mo
Set-Secret "STRIPE_PRICE_AGENCY_MONTHLY"    "Agency Monthly (CA`$339/mo) price ID: "
Set-Secret "STRIPE_PRICE_AGENCY_ANNUAL"     "Agency Annual  (CA`$271/mo) price ID: "

# Enterprise — CA$679/mo | CA$543/mo
Set-Secret "STRIPE_PRICE_ENTERPRISE_MONTHLY" "Enterprise Monthly (CA`$679/mo) price ID: "
Set-Secret "STRIPE_PRICE_ENTERPRISE_ANNUAL"  "Enterprise Annual  (CA`$543/mo) price ID: "

Write-Host "--- OPTIONAL WEBHOOKS ---" -ForegroundColor White
Write-Host "Paste Make/Zapier webhook URLs to receive new subscription + confirmation email notifications.`n" -ForegroundColor Gray
Set-Secret "UNALABS_NEW_PROJECT_WEBHOOK_URL"                    "Admin notification webhook URL (optional): "
Set-Secret "UNALABS_PROJECT_CONFIRMATION_EMAIL_WEBHOOK_URL"     "Client confirmation email webhook URL (optional): "

Write-Host "`n=== Setup complete! ===" -ForegroundColor Cyan
Write-Host "Worker: https://una-stripe-api.fejiro-efiuvwere.workers.dev" -ForegroundColor White
Write-Host "Site:   https://unalabs.cloud/start" -ForegroundColor White
Write-Host "`nTest with: .\test-stripe.ps1  (after setup)" -ForegroundColor Gray
