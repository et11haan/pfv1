# PowerShell script to export all main collections from the parts_marketplace MongoDB database to JSON files in the scripts directory.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/export_db.ps1

$mongoUri = "mongodb://localhost:27017/parts_marketplace"
$exportDir = "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)"

mongoexport --uri="$mongoUri" --collection=products --out="$exportDir/products.json"
mongoexport --uri="$mongoUri" --collection=listings --out="$exportDir/listings.json"
mongoexport --uri="$mongoUri" --collection=comments --out="$exportDir/comments.json"
mongoexport --uri="$mongoUri" --collection=images --out="$exportDir/images.json"
mongoexport --uri="$mongoUri" --collection=users --out="$exportDir/users.json"

Write-Host "Export complete. Files are in $exportDir." 