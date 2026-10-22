# Demo video script

The finished video is `spoons-demo.mp4` (1:54, 1080p). It has captions burned in and a soft caption track, plus `spoons-demo.srt` for YouTube. It works with no audio.

**Optional voice-over:** Devpost judges often prefer hearing a person. Play the video and read the lines below over it, using your phone's voice recorder or QuickTime. Then merge the audio:

```bash
ffmpeg -i spoons-demo.mp4 -i voice.m4a -map 0:v -map 0:s? -map 1:a -c:v copy -c:s copy -c:a aac -shortest spoons-demo-voice.mp4
```

Speak slowly. Each line fits its time slot at a calm pace. The times are approximate and match the captions.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Title card | "This is Spoons. It plans your day by energy, not hours." |
| 0:04 | Problem card | "If you live with a chronic illness, your energy changes every day. To-do apps assume every day is the same, so you overcommit, crash, and lose tomorrow too." |
| 0:11 | Persona card | "Meet Ada. She's a composite persona, a student with an energy-limiting illness." |
| 0:15 | Check-in, 8 spoons | "Every morning she checks in. Today she has eight spoons." |
| 0:20 | Battery fills | "Spoons fills her battery with what fits, and keeps one spoon in reserve so she doesn't crash." |
| 0:24 | Rest break row | "Must-dos come first, and heavy tasks get a rest break after them." |
| 0:29 | Study for quiz, first part | "Studying for her quiz is too big for what's left, so Spoons plans just the first part today." |
| 0:34 | Didn't fit today | "Everything that doesn't fit gets a next step, not guilt." |
| 0:37 | Help message, Copy | "A friend could pick up her prescription, and the message is already written." |
| 0:43 | Stepper down to 3 | "On a bad day, she turns it down to three spoons." |
| 0:49 | Yellow Low Power | "Spoons switches to Low Power and plans must-dos only." |
| 0:52 | Ask for more time | "A must-do that can't fit is flagged, with a polite request for more time ready to send." |
| 0:59 | Back to 8 | "Back on a steady day." |
| 1:06 | Done, log 4 spoons | "Her lecture took four spoons, not two." |
| 1:10 | Battery reflows | "So the rest of her day re-plans instantly, and the lab report is flagged before she runs out." |
| 1:15 | Add "Grocery run", "Use 3" | "Spoons also learns what tasks really cost her." |
| 1:30 | Display settings | "It's built for whoever opens it: keyboard, screen reader announcements, read-aloud…" |
| 1:35 | High contrast, Lexend, dark | "…high contrast, a reading-friendly font, and dark mode." |
| 1:48 | End card | "Spoons works offline, with no account, and your tasks stay on your device." |

## Re-recording after changes

```bash
npm run build && npx vite preview --port 4173 &
python3 demo/record.py http://localhost:4173/ demo/out
sh demo/make_video.sh demo/out 1.0 <duration printed by record.py>
```

Every step in the video is the real app driven by a script, with no mock screens.
