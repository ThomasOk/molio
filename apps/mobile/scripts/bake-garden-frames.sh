#!/usr/bin/env bash
#
# Bakes the garden's render frames.
#
# Eight paintings exist; seventeen frames ship. The nine in between are made
# here by dissolving one painting into the next through a blurred noise
# threshold, so that every frame is a whole watercolour rather than a blend of
# two — at any threshold a pixel comes from one painting or the other, never
# from an average. That is what lets the garden change continuously with the
# step count and still be sharp wherever it stops. See ADR 0001.
#
# Frames are spaced evenly in STEPS, not on MILESTONES: MILESTONES is copy, and
# its uneven spacing would land on screen as an uneven rhythm.
#
# Requires ImageMagick 7. Run from anywhere:
#   ./scripts/bake-garden-frames.sh [source-dir]
#
# The source dir holds the eight paintings as p1.png … p8.png, already
# normalised so their paper is the same cream in all eight (see normalize.sh
# beside them). Defaults to the scratch directory they were produced in.

set -euo pipefail
# French locale prints decimals with a comma, which silently corrupts every
# number handed to ImageMagick.
export LC_ALL=C

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-$HERE/../../../.scratch/garden-flipbook/paliers/norm}"
OUT="$HERE/../src/features/garden/assets"

MILESTONES=(0 2000 4000 6000 8000 10000 15000 20000)
STEP=1250
MAX=20000
# Blob size of the dissolve. Large enough that a whole flower falls on one side
# of the threshold: below ~20 the mask cuts big blooms in half and the
# intermediate frames read as damage rather than as a meadow.
BLUR=30
WIDTH=1024
QUALITY=92

for i in $(seq 1 8); do
  [ -f "$SRC/p$i.png" ] || { echo "missing: $SRC/p$i.png" >&2; exit 1; }
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

magick -size 1024x1536 xc: +noise Random -channel R -separate +channel \
  -blur "0x$BLUR" -auto-level "$TMP/noise.png"

rm -f "$OUT"/frame-*.jpg
for i in $(seq 0 $((MAX / STEP))); do
  s=$((i * STEP))
  for ((k = 0; k < ${#MILESTONES[@]} - 1; k++)); do
    if ((s >= MILESTONES[k] && s <= MILESTONES[k + 1])); then break; fi
  done
  t=$(awk -v s="$s" -v a="${MILESTONES[k]}" -v b="${MILESTONES[k + 1]}" \
    'BEGIN{printf "%.6f", (s-a)/(b-a)}')
  out="$OUT/frame-$(printf '%02d' "$i").jpg"

  if awk -v t="$t" 'BEGIN{exit !(t < 0.0001)}'; then
    src="$SRC/p$((k + 1)).png"
    magick "$src" -resize "${WIDTH}x" -strip -quality "$QUALITY" "$out"
  elif awk -v t="$t" 'BEGIN{exit !(t > 0.9999)}'; then
    src="$SRC/p$((k + 2)).png"
    magick "$src" -resize "${WIDTH}x" -strip -quality "$QUALITY" "$out"
  else
    # Mask polarity: black keeps the first painting, white takes the second,
    # hence the (1 - t). Getting this backwards runs the garden in reverse.
    l=$(awk -v t="$t" 'BEGIN{printf "%.3f", -6 + (1-t)*112}')
    h=$(awk -v t="$t" 'BEGIN{printf "%.3f",  0 + (1-t)*112}')
    magick "$TMP/noise.png" -level "${l}%,${h}%" "$TMP/mask.png"
    magick "$SRC/p$((k + 1)).png" "$SRC/p$((k + 2)).png" "$TMP/mask.png" \
      -composite -resize "${WIDTH}x" -strip -quality "$QUALITY" "$out"
  fi
  printf 'frame %02d  %5d steps  p%d→p%d at %.2f\n' \
    "$i" "$s" "$((k + 1))" "$((k + 2))" "$t"
done

echo
du -ch "$OUT"/frame-*.jpg | tail -1
