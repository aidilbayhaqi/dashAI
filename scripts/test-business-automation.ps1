param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Email = "superadmin@dashai.test",
    [string]$Password = "admin123",
    [string]$CompanyId = "",
    [string]$BranchId = "",
    [string]$ProductId = "",
    [decimal]$Quantity = 1
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-Rows {
    param([Parameter(Mandatory = $true)]$Payload)

    if ($Payload -is [System.Array]) {
        return @($Payload)
    }

    foreach ($Name in @("data", "items", "results", "rows")) {
        $Property = $Payload.PSObject.Properties[$Name]
        if ($null -eq $Property) { continue }

        $Value = $Property.Value
        if ($Value -is [System.Array]) {
            return @($Value)
        }
        if ($null -ne $Value) {
            $Nested = @(Get-Rows -Payload $Value)
            if ($Nested.Count -gt 0) { return $Nested }
        }
    }

    return @()
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $Parameters = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        Headers = $Headers
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $Parameters.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    return Invoke-RestMethod @Parameters
}

Write-Host "Logging in to $BaseUrl ..."
$Login = Invoke-Api `
    -Method "POST" `
    -Path "/api/v1/auth/login" `
    -Body @{
        email = $Email
        password = $Password
    }

$Token = $Login.token.access_token
if ([string]::IsNullOrWhiteSpace([string]$Token)) {
    throw "Login response tidak memiliki access token."
}

$AuthHeaders = @{
    Authorization = "Bearer $Token"
}

if ([string]::IsNullOrWhiteSpace($CompanyId)) {
    $Companies = Get-Rows -Payload (
        Invoke-Api -Method "GET" -Path "/api/v1/companies?limit=100" -Headers $AuthHeaders
    )
    if ($Companies.Count -eq 0) {
        throw "Tidak ada company. Jalankan seed terlebih dahulu."
    }
    $CompanyId = [string]$Companies[0].id
}

if ([string]::IsNullOrWhiteSpace($BranchId)) {
    $Branches = Get-Rows -Payload (
        Invoke-Api `
            -Method "GET" `
            -Path "/api/v1/companies/$CompanyId/branches" `
            -Headers $AuthHeaders
    )
    if ($Branches.Count -eq 0) {
        throw "Company tidak memiliki branch aktif."
    }
    $BranchId = [string]$Branches[0].id
}

$Products = Get-Rows -Payload (
    Invoke-Api `
        -Method "GET" `
        -Path "/api/v1/products/items?company_id=$CompanyId&limit=100" `
        -Headers $AuthHeaders
)
$Stocks = Get-Rows -Payload (
    Invoke-Api `
        -Method "GET" `
        -Path "/api/v1/products/stocks?company_id=$CompanyId&branch_id=$BranchId&limit=100" `
        -Headers $AuthHeaders
)

if ([string]::IsNullOrWhiteSpace($ProductId)) {
    $SelectedStock = $Stocks |
        Where-Object {
            ([decimal]$_.quantity_on_hand - [decimal]$_.reserved_quantity) -ge $Quantity
        } |
        Select-Object -First 1

    if ($null -eq $SelectedStock) {
        throw "Tidak ada produk dengan stok tersedia minimal $Quantity. Tambahkan stok dahulu."
    }

    $ProductId = [string]$SelectedStock.product_id
}

$Product = $Products |
    Where-Object { [string]$_.id -eq $ProductId } |
    Select-Object -First 1

if ($null -eq $Product) {
    throw "Product $ProductId tidak ditemukan pada company $CompanyId."
}

$StockBefore = $Stocks |
    Where-Object {
        [string]$_.product_id -eq $ProductId -and
        [string]$_.branch_id -eq $BranchId
    } |
    Select-Object -First 1

if ($null -eq $StockBefore) {
    throw "Stock product belum dibuat pada branch terpilih."
}

$IdempotencyKey = "manual-automation-$([guid]::NewGuid().ToString('N'))"
$Headers = @{
    Authorization = "Bearer $Token"
    "Idempotency-Key" = $IdempotencyKey
}

Write-Host "Creating automated sales order ..."
$Order = Invoke-Api `
    -Method "POST" `
    -Path "/api/v1/automation/sales-orders" `
    -Headers $Headers `
    -Body @{
        company_id = $CompanyId
        branch_id = $BranchId
        customer_name = "Manual Smoke Test Customer"
        creation_mode = "manual"
        auto_process = $true
        items = @(
            @{
                product_id = $ProductId
                quantity = [string]$Quantity
            }
        )
        notes = "Created by scripts/test-business-automation.ps1"
    }

$Transaction = Invoke-Api `
    -Method "GET" `
    -Path "/api/v1/finance/transactions/$($Order.transaction_id)" `
    -Headers $AuthHeaders
$Invoice = Invoke-Api `
    -Method "GET" `
    -Path "/api/v1/finance/invoices/$($Order.invoice_id)" `
    -Headers $AuthHeaders
$Events = Get-Rows -Payload (
    Invoke-Api `
        -Method "GET" `
        -Path "/api/v1/automation/events?company_id=$CompanyId&aggregate_id=$($Order.id)" `
        -Headers $AuthHeaders
)
$StocksAfter = Get-Rows -Payload (
    Invoke-Api `
        -Method "GET" `
        -Path "/api/v1/products/stocks?company_id=$CompanyId&branch_id=$BranchId&product_id=$ProductId&limit=100" `
        -Headers $AuthHeaders
)
$StockAfter = $StocksAfter | Select-Object -First 1

if ($Order.status -ne "fulfilled") {
    throw "Sales order tidak fulfilled: $($Order.status)"
}
if ([string]$Transaction.source_id -ne [string]$Order.id) {
    throw "Finance transaction tidak terhubung ke sales order."
}
if ([string]$Invoice.source_id -ne [string]$Order.id) {
    throw "Invoice tidak terhubung ke sales order."
}
if ($Transaction.creation_mode -ne "automatic") {
    throw "Transaction creation_mode bukan automatic."
}
if ($Invoice.creation_mode -ne "automatic") {
    throw "Invoice creation_mode bukan automatic."
}
if ($Events.Count -lt 5) {
    throw "Domain event kurang dari yang diharapkan: $($Events.Count)"
}

$ExpectedStock = [decimal]$StockBefore.quantity_on_hand - $Quantity
if ([decimal]$StockAfter.quantity_on_hand -ne $ExpectedStock) {
    throw "Stock akhir tidak sesuai. Expected $ExpectedStock, actual $($StockAfter.quantity_on_hand)"
}

Write-Host ""
Write-Host "BUSINESS AUTOMATION MANUAL TEST PASSED" -ForegroundColor Green
Write-Host "Order       : $($Order.order_no) [$($Order.status)]"
Write-Host "Product     : $($Product.name)"
Write-Host "Stock       : $($StockBefore.quantity_on_hand) -> $($StockAfter.quantity_on_hand)"
Write-Host "Transaction : $($Transaction.transaction_no) [$($Transaction.creation_mode)]"
Write-Host "Invoice     : $($Invoice.invoice_no) [$($Invoice.creation_mode)]"
Write-Host "Events      : $($Events.Count)"
