$raw = Get-Content "$HOME\.railway\config.json"
$cfg = $raw | ConvertFrom-Json
$tok = $cfg.user.accessToken

$body = '{"query":"{ me { id name email } }"}'
$r = Invoke-RestMethod -Uri "https://backboard.railway.com/graphql/v2" -Method POST -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $tok" }
$r | ConvertTo-Json -Depth 10
