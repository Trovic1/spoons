"""Mux the zoomed recording with the mixed soundtrack, loudness-normalised for YouTube (-14 LUFS),
and write an .srt with the full voice-over text.
Usage: python3 demo/make_video2.py demo/out2 demo/vo <start-offset-seconds>
"""
import json, subprocess, sys, pathlib, glob
out, vo, start = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), float(sys.argv[3])
ev = json.load(open(out / "events.json"))
durs = json.load(open(vo / "durations.json"))
lines = json.load(open(pathlib.Path(__file__).with_name("vo_lines.json")))
def ts(s):
    h, r = divmod(s, 3600); m, sec = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(sec):02},{int(round((sec % 1) * 1000)) % 1000:03}"
with open(out / "spoons-demo.srt", "w") as f:
    for n, (i, at) in enumerate(ev["vo"], 1):
        f.write(f"{n}\n{ts(at)} --> {ts(at + durs[i] + 0.2)}\n{lines[i]}\n\n")
synced = out / "synced.mp4"
raw = str(synced) if synced.exists() else glob.glob(str(out / "raw" / "*.webm"))[0]
D = ev["duration"]
subprocess.run([
    "ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(D), "-i", raw,
    "-i", str(out / "soundtrack.wav"), "-i", str(out / "spoons-demo.srt"),
    "-map", "0:v", "-map", "1:a", "-map", "2:s",
    "-vf", f"fps=30,format=yuv420p,fade=t=out:st={D-0.6}:d=0.6",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-c:s", "mov_text", "-metadata:s:s:0", "language=eng",
    "-movflags", "+faststart", str(out / "spoons-demo.mp4")], check=True)
print("ok", D)
