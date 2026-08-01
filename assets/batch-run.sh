#!/bin/bash
# Full art batch: up to 4 passes over missing ids (codex can stall/degrade; passes self-heal).
cd "$(dirname "$0")/.."
for pass in 1 2 3 4; do
  echo "=== BATCH PASS $pass $(date '+%H:%M:%S') ==="
  ./assets/generate-art.sh missing && { echo "=== BATCH COMPLETE pass $pass ==="; exit 0; }
  echo "=== pass $pass had failures; sleeping 5m before retry ==="
  sleep 300
done
echo "=== BATCH FINISHED WITH FAILURES after 4 passes ==="
./assets/generate-art.sh list | /usr/bin/grep '⬜' || true
exit 1
