#!/bin/bash

# Ez a script az ismétlődő számlák feldolgozását végzi

# Projekt gyökérkönyvtárába navigálás
cd "$(dirname "$0")/.."

# Node környezet beállítása
export NODE_ENV=production

# Script futtatása Node.js-sel
node --experimental-modules scripts/process-recurring-invoices.js >> logs/recurring-invoices.log 2>&1

# Futtatási státusz ellenőrzése
if [ $? -eq 0 ]; then
  echo "$(date): Recurring invoices processed successfully" >> logs/recurring-invoices.log
else
  echo "$(date): Error processing recurring invoices" >> logs/recurring-invoices.log
fi