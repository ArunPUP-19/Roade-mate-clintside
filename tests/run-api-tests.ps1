# ==============================================================================
#  RouteMate API Test Suite - PowerShell
#  Runs against a live backend instance at http://localhost:5000
#  
#  Usage: .\run-api-tests.ps1
#  Prerequisites: Backend must be running
# ==============================================================================

param(
    [string]$BaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = "Continue"

$script:passed = 0
$script:failed = 0
$script:errors = @()

function Write-TestHeader($name) {
    Write-Host ""
    Write-Host "  > $name" -ForegroundColor Cyan -NoNewline
}

function Write-Pass($detail) {
    $script:passed++
    Write-Host " PASS" -ForegroundColor Green
    if ($detail) { Write-Host "    $detail" -ForegroundColor DarkGray }
}

function Write-Fail($detail) {
    $script:failed++
    $script:errors += $detail
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "    $detail" -ForegroundColor Yellow
}

function Write-Section($title) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "  $title" -ForegroundColor White
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
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

    try {
        $params = @{
            Uri     = "$BaseUrl$Url"
            Method  = $Method
            Headers = $headers
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        if ($Body) { $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($Body) }

        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        return @{ Status = $statusCode; Body = $content; Error = $null }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $content = $null
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            $content = $errorBody | ConvertFrom-Json
        } catch {}
        return @{ Status = $statusCode; Body = $content; Error = $_.Exception.Message }
    }
}

function Assert-Status($result, $expected, $testName) {
    if ($result.Status -eq $expected) {
        return $true
    } else {
        Write-Fail "Expected status $expected, got $($result.Status) - $testName"
        return $false
    }
}

function Assert-Field($obj, $field, $expected, $testName) {
    $actual = $null
    $parts = $field -split '\.'
    $current = $obj
    foreach ($p in $parts) {
        if ($current -is [PSCustomObject] -or $current -is [hashtable]) {
            $current = $current.$p
        } else {
            Write-Fail "Field '$field' not found - $testName"
            return $false
        }
    }
    $actual = $current
    if ("$actual" -eq "$expected") {
        return $true
    } else {
        Write-Fail "Expected $field='$expected', got '$actual' - $testName"
        return $false
    }
}

# ==============================================================================

Write-Host ""
Write-Host "RouteMate - Multi-Account API Test Suite" -ForegroundColor Magenta
Write-Host "Target: $BaseUrl" -ForegroundColor Magenta

# -- SECTION 1: Authentication ------------------------------------------------
Write-Section "1. AUTHENTICATION TESTS"

Write-TestHeader "AUTH-01: Login Account A (arun@routemate.com)"
$loginA = @{ email = "arun@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/auth/login" -Body $loginA
if ((Assert-Status $res 200 "Login A") -and $res.Body.token) {
    $TOKEN_A = $res.Body.token
    Write-Pass "Token obtained"
} else { Write-Fail "No token returned" }

Write-TestHeader "AUTH-02: Login Account B (priya@routemate.com)"
$loginB = @{ email = "priya@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/auth/login" -Body $loginB
if ((Assert-Status $res 200 "Login B") -and $res.Body.token) {
    $TOKEN_B = $res.Body.token
    Write-Pass "Token obtained"
} else { Write-Fail "No token returned" }

Write-TestHeader "AUTH-03: Login Account C (suresh@routemate.com)"
$loginC = @{ email = "suresh@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/auth/login" -Body $loginC
if ((Assert-Status $res 200 "Login C") -and $res.Body.token) {
    $TOKEN_C = $res.Body.token
    Write-Pass "Token obtained"
} else { Write-Fail "No token returned" }

Write-TestHeader "AUTH-04: Login with wrong password expect 401"
$loginWrong = @{ email = "arun@routemate.com"; password = "wrongpass" } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/auth/login" -Body $loginWrong
if (Assert-Status $res 401 "Wrong password") { Write-Pass }

Write-TestHeader "AUTH-05: Register duplicate email expect 409"
$regDup = @{ name = "Dup"; email = "arun@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/auth/register" -Body $regDup
if (Assert-Status $res 409 "Duplicate email") { Write-Pass }

# -- SECTION 2: Trip Creation --------------------------------------------------
Write-Section "2. TRIP CREATION TESTS"

Write-TestHeader "TRIP-01: Account A creates a trip expect 201"
$tripBodyObj = @{
    startingLocation = "Coimbatore, Tamil Nadu"
    destination = "Chennai, Tamil Nadu"
    date = "2026-09-25"
    time = "07:30"
    seatsAvailable = 3
    vehicleDetails = "4 wheeler - Dzire (TN 38 CC 9999)"
    totalCost = 800
    yourSplit = 200
    negotiable = $true
}
$tripBody = $tripBodyObj | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $tripBody -Token $TOKEN_A
if (Assert-Status $res 201 "Create trip") {
    $TRIP_ID = $res.Body.trip.id
    if ((Assert-Field $res.Body "trip.status" "ACTIVE" "Status") -and
        (Assert-Field $res.Body "trip.seatsAvailable" "3" "Seats") -and
        (Assert-Field $res.Body "trip.driverName" "Arun Kumar" "Driver name")) {
        Write-Pass "Trip ID=$TRIP_ID"
    }
}

Write-TestHeader "TRIP-02: Unauthenticated create trip expect 401"
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $tripBody
if (Assert-Status $res 401 "No auth") { Write-Pass }

Write-TestHeader "TRIP-03: Trip detail has driver as CONFIRMED participant"
$res = Invoke-Api -Method GET -Url "/api/trips/$TRIP_ID"
if ((Assert-Status $res 200 "Get detail") -and $res.Body.participants.Count -eq 1) {
    if ((Assert-Field $res.Body "participants[0].role" "DRIVER" "Role") -and
        (Assert-Field $res.Body "participants[0].confirmationStatus" "CONFIRMED" "Status")) {
        Write-Pass
    }
} else { Write-Fail "Expected 1 participant (driver)" }

Write-TestHeader "TRIP-04: Create with blank startingLocation expect 400"
$badTrip1 = @{ startingLocation = ""; destination = "B"; date = "2026-10-01"; time = "09:00"; seatsAvailable = 2 } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $badTrip1 -Token $TOKEN_A
if (Assert-Status $res 400 "Blank from") { Write-Pass }

Write-TestHeader "TRIP-05: Create with seatsAvailable=0 expect 400"
$badTrip2 = @{ startingLocation = "A"; destination = "B"; date = "2026-10-01"; time = "09:00"; seatsAvailable = 0 } | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $badTrip2 -Token $TOKEN_A
if (Assert-Status $res 400 "Zero seats") { Write-Pass }

# -- SECTION 3: Trip Discovery -------------------------------------------------
Write-Section "3. TRIP DISCOVERY TESTS"

Write-TestHeader "SEARCH-01: Search by from/to finds the trip"
$res = Invoke-Api -Method GET -Url "/api/trips?from=Coimbatore&to=Chennai"
if (Assert-Status $res 200 "Search") {
    $found = $res.Body.trips | Where-Object { $_.id -eq $TRIP_ID }
    if ($found) { Write-Pass "Found trip $TRIP_ID in search results" }
    else { Write-Fail "Trip $TRIP_ID not found in search results" }
}

Write-TestHeader "SEARCH-02: Public GET /api/requests works without auth"
$res = Invoke-Api -Method GET -Url "/api/requests"
if (Assert-Status $res 200 "List requests") { Write-Pass "$($res.Body.requests.Count) requests found" }

# -- SECTION 4: Join Flow -----------------------------------------------------
Write-Section "4. JOIN & PARTICIPANT MANAGEMENT"

Write-TestHeader "JOIN-01: Account B joins trip PENDING_CONFIRMATION"
$res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $TOKEN_B
if (Assert-Status $res 200 "Join") {
    if ((Assert-Field $res.Body "trip.status" "PENDING_CONFIRMATION" "Trip status") -and
        (Assert-Field $res.Body "trip.seatsAvailable" "2" "Seats")) {
        $PART_B_ID = ($res.Body.trip.participants | Where-Object { $_.role -eq "PASSENGER" -and $_.confirmationStatus -eq "PENDING" -and $_.displayName -eq "Priya Sharma" }).id
        Write-Pass "Participant B ID=$PART_B_ID"
    }
}

Write-TestHeader "JOIN-02: Account B joins again expect 422 (duplicate)"
$res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $TOKEN_B
if (Assert-Status $res 422 "Duplicate join") { Write-Pass }

Write-TestHeader "JOIN-03: Account A joins own trip expect 422 (self-join)"
$res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $TOKEN_A
if (Assert-Status $res 422 "Self join") { Write-Pass }

Write-TestHeader "JOIN-04: Account C joins trip seats now 1"
$res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $TOKEN_C
if (Assert-Status $res 200 "Join C") {
    $PART_C_ID = ($res.Body.trip.participants | Where-Object { $_.role -eq "PASSENGER" -and $_.confirmationStatus -eq "PENDING" -and $_.displayName -eq "Suresh V" }).id
    if (Assert-Field $res.Body "trip.seatsAvailable" "1" "Seats") {
        Write-Pass "Participant C ID=$PART_C_ID"
    }
}

Write-TestHeader "JOIN-05: Non-organizer (B) tries to confirm C expect 422"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/participants/$PART_C_ID/confirm" -Token $TOKEN_B
if (Assert-Status $res 422 "Non-organizer confirm") { Write-Pass }

Write-TestHeader "JOIN-06: Organizer (A) confirms B participant CONFIRMED"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/participants/$PART_B_ID/confirm" -Token $TOKEN_A
if (Assert-Status $res 200 "Confirm B") { Write-Pass }

Write-TestHeader "JOIN-07: Confirm already-confirmed B expect 422"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/participants/$PART_B_ID/confirm" -Token $TOKEN_A
if (Assert-Status $res 422 "Re-confirm") { Write-Pass }

Write-TestHeader "JOIN-08: Organizer (A) confirms C trip becomes CONFIRMED"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/participants/$PART_C_ID/confirm" -Token $TOKEN_A
if (Assert-Status $res 200 "Confirm C") {
    $check = Invoke-Api -Method GET -Url "/api/trips/$TRIP_ID"
    if (Assert-Field $check.Body "" "CONFIRMED" "Trip status") { Write-Pass }
    elseif ($check.Body.status -eq "CONFIRMED") { Write-Pass }
    else { Write-Fail "Expected CONFIRMED, got $($check.Body.status)" }
}

# -- SECTION 5: Trip Lifecycle -------------------------------------------------
Write-Section "5. TRIP LIFECYCLE TRANSITIONS"

Write-TestHeader "LIFE-01: Lock trip status LOCKED"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/lock" -Token $TOKEN_A
if (Assert-Status $res 200 "Lock") {
    if ((Assert-Field $res.Body "trip.status" "LOCKED" "Status") -and $res.Body.trip.lockedAt) {
        Write-Pass "lockedAt=$($res.Body.trip.lockedAt)"
    }
}

Write-TestHeader "LIFE-02: Join a LOCKED trip expect 422"
$regLock = @{ name = "LockTest"; email = "locktest@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$regRes = Invoke-Api -Method POST -Url "/api/auth/register" -Body $regLock
if ($regRes.Status -eq 200) {
    $LOCK_TOKEN = $regRes.Body.token
    $res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $LOCK_TOKEN
    if (Assert-Status $res 422 "Join locked") { Write-Pass }
} else { Write-Fail "Could not register test user" }

Write-TestHeader "LIFE-03: Start trip status LIVE"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/start" -Token $TOKEN_A
if (Assert-Status $res 200 "Start") {
    if ((Assert-Field $res.Body "trip.status" "LIVE" "Status") -and $res.Body.trip.startedAt) {
        Write-Pass "startedAt=$($res.Body.trip.startedAt)"
    }
}

Write-TestHeader "LIFE-04: Leave a LIVE trip expect 422"
$res = Invoke-Api -Method DELETE -Url "/api/trips/$TRIP_ID/leave" -Token $TOKEN_B
if (Assert-Status $res 422 "Leave live") { Write-Pass }

Write-TestHeader "LIFE-05: Complete trip status COMPLETED"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/complete" -Token $TOKEN_A
if (Assert-Status $res 200 "Complete") {
    if ((Assert-Field $res.Body "trip.status" "COMPLETED" "Status") -and $res.Body.trip.completedAt) {
        Write-Pass "completedAt=$($res.Body.trip.completedAt)"
    }
}

Write-TestHeader "LIFE-06: Cancel COMPLETED trip expect 422"
$res = Invoke-Api -Method PUT -Url "/api/trips/$TRIP_ID/cancel" -Token $TOKEN_A
if (Assert-Status $res 422 "Cancel completed") { Write-Pass }

Write-TestHeader "LIFE-07: Join COMPLETED trip expect 422"
$regComp = @{ name = "CompTest"; email = "comptest@routemate.com"; password = "password123" } | ConvertTo-Json -Compress
$regRes = Invoke-Api -Method POST -Url "/api/auth/register" -Body $regComp
if ($regRes.Status -eq 200) {
    $res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token $regRes.Body.token
    if (Assert-Status $res 422 "Join completed") { Write-Pass }
} else { Write-Fail "Could not register test user" }

# -- SECTION 6: Non-existent & Invalid ----------------------------------------
Write-Section "6. ERROR HANDLING"

Write-TestHeader "ERR-01: Get non-existent trip expect 404"
$res = Invoke-Api -Method GET -Url "/api/trips/99999"
if (Assert-Status $res 404 "Not found") { Write-Pass }

Write-TestHeader "ERR-02: Invalid JWT token expect 401"
$res = Invoke-Api -Method POST -Url "/api/trips/$TRIP_ID/join" -Token "invalid.jwt.token"
if (Assert-Status $res 401 "Bad JWT") { Write-Pass }

# -- SECTION 7: Cancel Flow (separate trip) ------------------------------------
Write-Section "7. CANCEL FLOW"

Write-TestHeader "CANCEL-01: Create and cancel a trip"
$cancelObj = @{ startingLocation = "CancelFrom"; destination = "CancelTo"; date = "2026-10-10"; time = "08:00"; seatsAvailable = 2 }
$cancelBody = $cancelObj | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $cancelBody -Token $TOKEN_A
if ($res.Status -eq 201) {
    $CANCEL_TRIP_ID = $res.Body.trip.id
    $jres = Invoke-Api -Method POST -Url "/api/trips/$CANCEL_TRIP_ID/join" -Token $TOKEN_B
    if ($jres.Status -eq 200) {
        $cres = Invoke-Api -Method PUT -Url "/api/trips/$CANCEL_TRIP_ID/cancel" -Token $TOKEN_A
        if ((Assert-Status $cres 200 "Cancel") -and (Assert-Field $cres.Body "trip.status" "CANCELLED" "Status")) {
            Write-Pass
        }
    } else { Write-Fail "Join failed: $($jres.Status)" }
} else { Write-Fail "Create failed: $($res.Status)" }

Write-TestHeader "CANCEL-02: Join CANCELLED trip expect 422"
$res = Invoke-Api -Method POST -Url "/api/trips/$CANCEL_TRIP_ID/join" -Token $TOKEN_C
if (Assert-Status $res 422 "Join cancelled") { Write-Pass }

# -- SECTION 8: Driver Leave Protection ----------------------------------------
Write-Section "8. DRIVER PROTECTION"

Write-TestHeader "DRIVER-01: Driver leaves own trip expect 422"
$driverObj = @{ startingLocation = "DriverFrom"; destination = "DriverTo"; date = "2026-10-11"; time = "09:00"; seatsAvailable = 2 }
$driverTripBody = $driverObj | ConvertTo-Json -Compress
$res = Invoke-Api -Method POST -Url "/api/trips" -Body $driverTripBody -Token $TOKEN_A
if ($res.Status -eq 201) {
    $DRIVER_TRIP_ID = $res.Body.trip.id
    $lres = Invoke-Api -Method DELETE -Url "/api/trips/$DRIVER_TRIP_ID/leave" -Token $TOKEN_A
    if (Assert-Status $lres 422 "Driver leave") { Write-Pass }
} else { Write-Fail "Create failed" }

# ==============================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""
$total = $script:passed + $script:failed

if ($script:failed -eq 0) {
    Write-Host "  > ALL $total TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  RESULTS: $($script:passed) passed, $($script:failed) failed out of $total" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Failed tests:" -ForegroundColor Red
    foreach ($err in $script:errors) {
        Write-Host "    - $err" -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""

exit $script:failed
