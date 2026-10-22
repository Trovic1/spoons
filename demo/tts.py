"""Generate the voice-over clips with Kokoro (local neural TTS). Usage: python3 demo/tts.py <model_dir> <out_dir> [voice]"""
import sys, json, pathlib
import soundfile as sf
from kokoro_onnx import Kokoro
model_dir, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
voice = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
out.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(model_dir / "kokoro-v1.0.onnx"), str(model_dir / "voices-v1.0.bin"))
lines = json.load(open(pathlib.Path(__file__).with_name("vo_lines.json")))
durs = []
for i, line in enumerate(lines):
    audio, sr = k.create(line, voice=voice, speed=1.06, lang="en-us")
    sf.write(out / f"vo{i:02}.wav", audio, sr)
    durs.append(round(len(audio) / sr, 3))
json.dump(durs, open(out / "durations.json", "w"))
print(voice, durs, round(sum(durs), 1))
