# Resilient HTTP fetch via .NET HttpClient (Schannel).
# Invoked from server/utils/assistant/httpFetch.ts when Node TLS/CDN fails on Windows.
#
# Env:
# ASSISTANT_HTTP_URL - request URL
# ASSISTANT_HTTP_METHOD - GET | POST
# ASSISTANT_HTTP_TIMEOUT_MS - timeout in milliseconds
# ASSISTANT_HTTP_BODY - optional raw body (UTF-8)
# ASSISTANT_HTTP_CONTENT_TYPE - content type when body is set (default application/json)
# ASSISTANT_HTTP_HEADERS_JSON - JSON object of extra headers (Authorization, Accept, …)
#
# Stdout: base64(UTF-8 JSON { status: number, body: string, retryAfter?: string })

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Get-FirstHeaderValue([System.Net.Http.Headers.HttpHeaders]$headers, [string]$name) {
  if (-not $headers) {
    return $null
  }
  foreach ($pair in $headers) {
    if ($pair.Key -ieq $name) {
      return [string]($pair.Value | Select-Object -First 1)
    }
  }
  return $null
}

$handler = [System.Net.Http.HttpClientHandler]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromMilliseconds([int]$env:ASSISTANT_HTTP_TIMEOUT_MS)

$method = [System.Net.Http.HttpMethod]::new($env:ASSISTANT_HTTP_METHOD)
$req = [System.Net.Http.HttpRequestMessage]::new($method, $env:ASSISTANT_HTTP_URL)

$contentType = if ($env:ASSISTANT_HTTP_CONTENT_TYPE) {
  $env:ASSISTANT_HTTP_CONTENT_TYPE
} else {
  'application/json'
}

if ($env:ASSISTANT_HTTP_BODY) {
  $req.Content = New-Object System.Net.Http.StringContent(
    $env:ASSISTANT_HTTP_BODY,
    [Text.Encoding]::UTF8,
    $contentType
  )
}

if ($env:ASSISTANT_HTTP_HEADERS_JSON) {
  $headers = $env:ASSISTANT_HTTP_HEADERS_JSON | ConvertFrom-Json
  foreach ($prop in $headers.PSObject.Properties) {
    if ($prop.Name -ieq 'Content-Type') {
      continue
    }
    $req.Headers.TryAddWithoutValidation($prop.Name, [string]$prop.Value) | Out-Null
  }
}

$res = $client.SendAsync($req).GetAwaiter().GetResult()
$body = $res.Content.ReadAsStringAsync().GetAwaiter().GetResult()
$retryAfter = Get-FirstHeaderValue $res.Headers 'Retry-After'
if (-not $retryAfter -and $res.Content) {
  $retryAfter = Get-FirstHeaderValue $res.Content.Headers 'Retry-After'
}

$payload = @{
  status = [int]$res.StatusCode
  body = $body
}
if ($retryAfter) {
  $payload.retryAfter = $retryAfter
}

$json = $payload | ConvertTo-Json -Compress -Depth 5
$bytes = [Text.Encoding]::UTF8.GetBytes($json)
[Convert]::ToBase64String($bytes)