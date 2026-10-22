"""Re-time the raw recording so visual cuts land exactly on the logged event times (the
screencast runs slower than wall clock under load). Anchors: raw-video time of each card cut,
paired with its event time. Usage: python3 demo/sync_video.py demo/out2 '<json [[raw, event], ...]>'"""
import json, subprocess, sys, glob, pathlib
out = pathlib.Path(sys.argv[1]); anchors = json.loads(sys.argv[2])
raw = glob.glob(str(out / "raw" / "*.webm"))[0]
segs = []
for k in range(len(anchors) - 1):
    (r0, e0), (r1, e1) = anchors[k], anchors[k + 1]
    f = (e1 - e0) / (r1 - r0)
    seg = out / f"seg{k}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(r0), "-t", str(r1 - r0), "-i", raw,
                    "-vf", f"setpts=(PTS-STARTPTS)*{f:.6f},fps=30,format=yuv420p",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "14", str(seg)], check=True)
    segs.append(seg)
(out / "segs.txt").write_text("".join(f"file '{p.name}'\n" for p in segs))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(out / "segs.txt"),
                "-c", "copy", str(out / "synced.mp4")], check=True)
print(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out / "synced.mp4")], capture_output=True, text=True).stdout)
