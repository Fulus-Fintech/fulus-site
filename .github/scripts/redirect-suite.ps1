# .github/scripts/redirect-suite.ps1 — run tests/e2e/redirects.spec.ts against
# the REAL worker.
#
# The redirect specs target `wrangler dev` on 127.0.0.1:8787, not the vite
# preview server: routing, the data-doors stamp and POST /e all live in
# src/worker.ts, which preview never runs. Every describe block in that file
# auto-skips unless DOORS_MODE is set, so a plain `npx playwright test` proves
# nothing about them — this script is what makes the claim true in CI.
#
# Run from the repo root. Caller sets DOORS_MODE ('pre' or 'open'); any
# arguments are forwarded to `wrangler dev`, which is how the doors flip is
# exercised (pass B adds --var DOORS:open and the store ids).
#
# Windows-only (taskkill): checks.yml pins windows-latest so the committed
# visual baselines compare against the same rasterizer.
$ErrorActionPreference = 'Stop'

$wranglerArgs = @('node_modules/wrangler/bin/wrangler.js', 'dev', '--port', '8787', '--ip', '127.0.0.1') + $args
$wrangler = Start-Process -FilePath 'node' -ArgumentList $wranglerArgs -PassThru -NoNewWindow
try {
  # Poll rather than sleep a fixed amount: wrangler's first boot pulls workerd
  # and can take a while on a cold runner, and it reloads once more when
  # playwright's webServer rebuilds dist/ under it.
  $ready = $false
  foreach ($i in 1..60) {
    if ($wrangler.HasExited) { throw "wrangler dev exited early (code $($wrangler.ExitCode))" }
    try {
      Invoke-WebRequest -Uri 'http://127.0.0.1:8787/' -UseBasicParsing -TimeoutSec 5 | Out-Null
      $ready = $true
      break
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) { throw 'wrangler dev never answered on http://127.0.0.1:8787' }

  npx playwright test tests/e2e/redirects.spec.ts --project=chromium
  if ($LASTEXITCODE -ne 0) { throw "redirect suite failed (exit $LASTEXITCODE)" }
} finally {
  # /T kills the tree: wrangler's workerd child is what actually holds 8787,
  # and leaving it alive would make the next pass bind-fail or, worse, test
  # the previous pass's vars.
  taskkill /PID $wrangler.Id /T /F 2>&1 | Out-Null
}
