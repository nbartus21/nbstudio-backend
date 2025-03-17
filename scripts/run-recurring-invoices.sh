#!/bin/bash

# Ez a script az ismétlődő számlák feldolgozását végzi

# Szkript könyvtára
SCRIPT_DIR="$(dirname "$0")"
# Projekt gyökérkönyvtárába navigálás
cd "$SCRIPT_DIR/.."

# Létrehozzuk a logs könyvtárat, ha még nem létezik
mkdir -p "$SCRIPT_DIR/logs"

# Log fájl teljes útvonala
LOG_FILE="$SCRIPT_DIR/logs/recurring-invoices.log"

# Node környezet beállítása
export NODE_ENV=production

# Script futtatása Node.js-sel
echo "$(date): Starting recurring invoices process" >> "$LOG_FILE"
node --experimental-modules "$SCRIPT_DIR/process-recurring-invoices.js" >> "$LOG_FILE" 2>&1

# Futtatási státusz ellenőrzése
if [ $? -eq 0 ]; then
  echo "$(date): Recurring invoices processed successfully" >> "$LOG_FILE"
else
  echo "$(date): Error processing recurring invoices" >> "$LOG_FILE"
fi