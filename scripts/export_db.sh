#!/bin/bash
# Exports all main collections from the parts_marketplace MongoDB database to JSON files in the scripts directory.
# Usage: bash export_db.sh

MONGO_URI="mongodb://localhost:27017/parts_marketplace"
EXPORT_DIR="$(dirname "$0")"

mongoexport --uri="$MONGO_URI" --collection=products --out="$EXPORT_DIR/products.json"
mongoexport --uri="$MONGO_URI" --collection=listings --out="$EXPORT_DIR/listings.json"
mongoexport --uri="$MONGO_URI" --collection=comments --out="$EXPORT_DIR/comments.json"
mongoexport --uri="$MONGO_URI" --collection=images --out="$EXPORT_DIR/images.json"
mongoexport --uri="$MONGO_URI" --collection=users --out="$EXPORT_DIR/users.json"

echo "Export complete. Files are in $EXPORT_DIR." 