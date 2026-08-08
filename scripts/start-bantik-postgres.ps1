$ErrorActionPreference = "Stop"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$pgData = "C:\Users\ABV\Documents\Codex\2026-08-08\referenced-chatgpt-conversation-this-is-an\work\postgres-data"
$pgLog = "C:\Users\ABV\Documents\Codex\2026-08-08\referenced-chatgpt-conversation-this-is-an\work\postgres.log"

& "$pgBin\pg_isready.exe" -h 127.0.0.1 -p 5432 *> $null
if ($LASTEXITCODE -ne 0) {
  & "$pgBin\pg_ctl.exe" -D $pgData -l $pgLog start
}
