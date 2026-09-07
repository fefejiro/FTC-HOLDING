[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\FTC HOLDING"
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$gitRoot = (git -C $resolvedRoot rev-parse --show-toplevel 2>$null).Trim()
if (-not $gitRoot) { throw "No Git repository found at $resolvedRoot" }

$branch = (git -C $gitRoot branch --show-current).Trim()
$head = (git -C $gitRoot rev-parse --short HEAD).Trim()
$upstream = (git -C $gitRoot rev-parse --abbrev-ref '@{upstream}' 2>$null)
if (-not $upstream) { $upstream = "(none)" }
$dirty = @(git -C $gitRoot status --porcelain=v1).Count
$worktrees = @(git -C $gitRoot worktree list --porcelain | Select-String '^worktree ').Count
$branches = @(git -C $gitRoot for-each-ref refs/heads --format='%(refname:short)').Count

$nodeModules = Join-Path $gitRoot "node_modules"
$nodeSummary = "missing"
if (Test-Path -LiteralPath $nodeModules) {
    $nodeItem = Get-Item -LiteralPath $nodeModules -Force
    $nodeSummary = if ($nodeItem.LinkType) {
        "$($nodeItem.LinkType) -> $($nodeItem.Target -join ', ')"
    } else {
        "local directory"
    }
}

$disk = Get-PSDrive C, D -ErrorAction SilentlyContinue | ForEach-Object {
    [pscustomobject]@{
        Drive = $_.Name
        FreeGB = [math]::Round($_.Free / 1GB, 2)
    }
}

[pscustomobject]@{
    RequestedPath = $resolvedRoot
    GitRoot = $gitRoot
    Branch = $branch
    Upstream = $upstream
    Head = $head
    DirtyEntries = $dirty
    LocalBranches = $branches
    Worktrees = $worktrees
    RootNodeModules = $nodeSummary
    Disk = $disk
} | ConvertTo-Json -Depth 4
