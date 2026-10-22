#!/bin/sh
# Turn the raw Playwright recording into a 1080p MP4 with a soft caption track.
# Usage: sh demo/make_video.sh demo/out <start-offset-seconds> <duration-seconds>
set -e
OUT=${1:-demo/out}; START=${2:-1.2}; DUR=${3:-109}
RAW=$(ls "$OUT"/raw/*.webm | head -1)
ffmpeg -y -v error -ss "$START" -t "$DUR" -i "$RAW" -i "$OUT/spoons-demo.srt" \
  -map 0:v -map 1:s \
  -vf "fps=30,scale=1920:1080:flags=lanczos,fade=t=in:st=0:d=0.6,fade=t=out:st=$(echo "$DUR - 0.8" | bc):d=0.8" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
  -c:s mov_text -metadata:s:s:0 language=eng \
  "$OUT/spoons-demo.mp4"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT/spoons-demo.mp4"
