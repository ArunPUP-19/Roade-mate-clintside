# ═══════════════════════════════════════════════════════════════════════════════
#  RouteMate Load Test — Concurrent Join Simulation
#  
#  Simulates multiple users joining trips simultaneously to verify:
#  - No race conditions in seat counting
#  - No duplicate participant entries (UK constraint)
#  - Correct final state under concurrent load
#  - Response time metrics
#
#  Usage: .\load-test.ps1 [-ConcurrentUsers 10] [-Rounds 3]
#  Prerequisites: Backend must be running at localhost:5000
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$ConcurrentUsers = 10,
    [int]$Rounds = 3
)

$ErrorActionPreference = "Continue"

function Write-Section($title) {
    Write-Host ""
    Write-Host ("═" * 70) -ForegroundColor DarkCyan
    Write-Host "  $title" -ForegroundColor White
    Write-Host ("═" * 70) -ForegroundColor DarkCyan
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $params = @{
            Uri     = "$BaseUrl$Url"
            Method  = $Method
            Headers = $headers
            ErrorAction = "Stop"
        }
        if ($Body) { $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($Body) }
        $response = Invoke-WebRequest @params
        $stopwatch.Stop()
        $content = $response.Content | ConvertFrom-Json
        return @{ Status = $response.StatusCode; Body = $content; TimeMs = $stopwatch.ElapsedMilliseconds; Error = $null }
    } catch {
        $stopwatch.Stop()
        $statusCode = 0
        try { $statusCode = $_.Exception.Response.StatusCode.value__ } catch {}
        $content = $null
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $content = $reader.ReadToEnd() | ConvertFrom-Json
        } catch {}
        return @{ Status = $statusCode; Body = $content; TimeMs = $stopwatch.ElapsedMilliseconds; Error = $_.Exception.Message }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║         RouteMate — Load Test (Concurrent Join Simulation)     ║" -ForegroundColor Magenta
Write-Host "║         Concurrent Users: $ConcurrentUsers  |  Rounds: $Rounds                        ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

# ── Step 1: Login as driver ───────────────────────────────────────────────────
Write-Section "Step 1: Login Driver Account"

$driverRes = Invoke-Api -Method POST -Url "/api/auth/login" -Body '{"email":"arun@routemate.com","password":"password123"}'
if ($driverRes.Status -ne 200) {
    Write-Host "  ✗ Failed to login driver. Is backend running?" -ForegroundColor Red
    exit 1
}
$DRIVER_TOKEN = $driverRes.Body.token
Write-Host "  ✓ Driver logged in" -ForegroundColor Green

# ── Step 2: Register test users ──────────────────────────────────────────────
Write-Section "Step 2: Register $ConcurrentUsers Test Users"

$userTokens = @()
for ($i = 1; $i -le $ConcurrentUsers; $i++) {
    $email = "loadtest_user_$($i)_$(Get-Random)@routemate.com"
    $regBody = @{ name = "LoadUser$i"; email = $email; password = "password123" } | ConvertTo-Json
    $regRes = Invoke-Api -Method POST -Url "/api/auth/register" -Body $regBody
    if ($regRes.Status -eq 200 -and $regRes.Body.token) {
        $userTokens += $regRes.Body.token
        Write-Host "  ✓ Registered user $i ($email)" -ForegroundColor DarkGray
    } else {
        Write-Host "  ✗ Failed to register user $i" -ForegroundColor Red
    }
}
Write-Host "  → $($userTokens.Count) users registered" -ForegroundColor Cyan

# ── Step 3: Run Concurrent Join Rounds ────────────────────────────────────────
for ($round = 1; $round -le $Rounds; $round++) {
    Write-Section "Round $round of $Rounds — $($userTokens.Count) concurrent joins"

    # Create a fresh trip for this round
    $seats = [Math]::Max(1, [Math]::Floor($ConcurrentUsers / 2))  # Allow only half
    $tripBody = @{
        startingLocation = "LoadTest From R$round"
        destination      = "LoadTest To R$round"
        date             = "2026-11-01"
        time             = "08:00"
        seatsAvailable   = $seats
        vehicleDetails   = "Load Test Vehicle"
    } | ConvertTo-Json

    $createRes = Invoke-Api -Method POST -Url "/api/trips" -Body $tripBody -Token $DRIVER_TOKEN
    if ($createRes.Status -ne 201) {
        Write-Host "  ✗ Failed to create trip for round $round" -ForegroundColor Red
        continue
    }
    $tripId = $createRes.Body.trip.id
    Write-Host "  Trip ID=$tripId, Seats=$seats" -ForegroundColor Cyan

    # Fire concurrent join requests using PowerShell Jobs
    $jobs = @()
    $joinStartTime = Get-Date

    foreach ($token in $userTokens) {
        $jobs += Start-Job -ScriptBlock {
            param($baseUrl, $tripId, $token)
            $headers = @{
                "Content-Type"  = "application/json"
                "Authorization" = "Bearer $token"
            }
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            try {
                $resp = Invoke-WebRequest -Uri "$baseUrl/api/trips/$tripId/join" `
                    -Method POST -Headers $headers -ErrorAction Stop
                $sw.Stop()
                return @{ Status = $resp.StatusCode; TimeMs = $sw.ElapsedMilliseconds; Success = $true }
            } catch {
                $sw.Stop()
                $code = 0
                try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
                return @{ Status = $code; TimeMs = $sw.ElapsedMilliseconds; Success = $false; Error = $_.Exception.Message }
            }
        } -ArgumentList $BaseUrl, $tripId, $token
    }

    # Wait for all jobs
    $jobs | Wait-Job | Out-Null
    $joinEndTime = Get-Date
    $totalJoinTime = ($joinEndTime - $joinStartTime).TotalMilliseconds

    # Collect results
    $successes = 0
    $failures = 0
    $responseTimes = @()

    foreach ($job in $jobs) {
        $result = Receive-Job $job
        if ($result.Success) {
            $successes++
        } else {
            $failures++
        }
        if ($result.TimeMs) { $responseTimes += $result.TimeMs }
        Remove-Job $job
    }

    # Stats
    $avgTime = if ($responseTimes.Count -gt 0) { [Math]::Round(($responseTimes | Measure-Object -Average).Average, 1) } else { 0 }
    $maxTime = if ($responseTimes.Count -gt 0) { ($responseTimes | Measure-Object -Maximum).Maximum } else { 0 }
    $minTime = if ($responseTimes.Count -gt 0) { ($responseTimes | Measure-Object -Minimum).Minimum } else { 0 }

    Write-Host ""
    Write-Host "  ┌─── Results ──────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │ Successful joins:  $successes" -ForegroundColor $(if ($successes -le $seats) { "Green" } else { "Red" })
    Write-Host "  │ Rejected (full):   $failures" -ForegroundColor Yellow
    Write-Host "  │ Expected joins:    ≤ $seats (seats available)" -ForegroundColor Cyan
    Write-Host "  │ Total wall time:   $([Math]::Round($totalJoinTime, 0)) ms" -ForegroundColor DarkGray
    Write-Host "  │ Avg response:      $avgTime ms" -ForegroundColor DarkGray
    Write-Host "  │ Min/Max response:  $minTime / $maxTime ms" -ForegroundColor DarkGray
    Write-Host "  └──────────────────────────────────────────────────────┘" -ForegroundColor DarkGray

    # ── Data integrity check ──────────────────────────────────────────────
    Write-Host ""
    Write-Host "  Verifying data integrity..." -ForegroundColor Cyan

    $tripDetail = Invoke-Api -Method GET -Url "/api/trips/$tripId"
    if ($tripDetail.Status -eq 200) {
        $finalSeats = $tripDetail.Body.seatsAvailable
        $totalSeats = $tripDetail.Body.totalSeats
        $participantCount = $tripDetail.Body.participants.Count
        $pendingCount = ($tripDetail.Body.participants | Where-Object { $_.confirmationStatus -eq "PENDING" }).Count
        $confirmedCount = ($tripDetail.Body.participants | Where-Object { $_.confirmationStatus -eq "CONFIRMED" }).Count

        $expectedSeats = $totalSeats - $pendingCount  # Driver is confirmed, passengers are pending
        $passengerCount = $participantCount - 1  # Subtract driver

        Write-Host "  │ Final seats available: $finalSeats" -ForegroundColor DarkGray
        Write-Host "  │ Total participants:    $participantCount (1 driver + $passengerCount passengers)" -ForegroundColor DarkGray
        Write-Host "  │ Pending:               $pendingCount" -ForegroundColor DarkGray
        Write-Host "  │ Trip status:           $($tripDetail.Body.status)" -ForegroundColor DarkGray

        # Validate: successful joins should equal passenger count
        if ($successes -eq $passengerCount) {
            Write-Host "  ✓ Seat count consistent (joins=$successes, passengers=$passengerCount)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ MISMATCH: joins=$successes but passengers=$passengerCount" -ForegroundColor Red
        }

        # Validate: no more joins than seats
        if ($successes -le $seats) {
            Write-Host "  ✓ No overselling ($successes joins ≤ $seats seats)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ OVERSELLING DETECTED! $successes joins > $seats seats" -ForegroundColor Red
        }

        # Validate: seats_available + pending passengers = total_seats
        if ($finalSeats + $pendingCount -eq $totalSeats) {
            Write-Host "  ✓ Seat math correct (available=$finalSeats + pending=$pendingCount = total=$totalSeats)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Seat math ERROR ($finalSeats + $pendingCount ≠ $totalSeats)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ Could not fetch trip details for integrity check" -ForegroundColor Red
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
#  FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host ("═" * 70) -ForegroundColor Magenta
Write-Host "  Load test completed: $Rounds rounds × $ConcurrentUsers concurrent users" -ForegroundColor Green
Write-Host ("═" * 70) -ForegroundColor Magenta
Write-Host ""
