function Test-UnaScheduledWindow {
  param(
    [string]$ScheduledAt,
    [int]$MaxLatenessMinutes
  )

  if (-not $ScheduledAt -or $MaxLatenessMinutes -le 0) {
    return $true
  }

  $scheduledTime = [datetime]::ParseExact($ScheduledAt, 'HH:mm', $null)
  $scheduledToday = (Get-Date).Date.AddHours($scheduledTime.Hour).AddMinutes($scheduledTime.Minute)
  $lateness = ((Get-Date) - $scheduledToday).TotalMinutes
  if ($lateness -lt 0) {
    $lateness += 24 * 60
  }
  return $lateness -le $MaxLatenessMinutes
}

function Enter-UnaSocialRunLock {
  param([int]$TimeoutSeconds = 600)

  $mutex = [System.Threading.Mutex]::new($false, 'Local\UnaLabsSocialPipeline')
  if (-not $mutex.WaitOne([TimeSpan]::FromSeconds($TimeoutSeconds))) {
    $mutex.Dispose()
    return $null
  }
  return $mutex
}

function Exit-UnaSocialRunLock {
  param($Mutex)

  if ($null -eq $Mutex) {
    return
  }
  try {
    $Mutex.ReleaseMutex()
  }
  finally {
    $Mutex.Dispose()
  }
}
