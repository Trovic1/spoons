"""Records the Spoons demo video with burned-in captions and writes matching .srt captions.

Usage: python3 demo/record.py http://localhost:4173/ demo/out
Then demo/make_video.sh turns the recording into demo/out/spoons-demo.mp4.
"""
import sys, time, json, pathlib
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/"
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "demo/out")
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1600, 900

OVERLAY = r"""
(() => {
  const css = `
  #demo-cursor{position:fixed;z-index:99999;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;
    border:3px solid #1c1b18;background:rgba(242,194,48,.55);pointer-events:none;transition:transform .12s ease-out;left:-50px;top:-50px}
  #demo-cursor.down{transform:scale(.7)}
  #demo-cap{position:fixed;z-index:99998;left:50%;bottom:34px;transform:translateX(-50%);max-width:1100px;width:max-content;
    padding:16px 26px;border-radius:14px;background:#1c1b18;color:#fbfaf7;font:600 27px/1.35 'Atkinson Hyperlegible Next',system-ui,sans-serif;
    box-shadow:0 10px 30px -10px rgba(0,0,0,.5);opacity:0;transition:opacity .25s ease-out;text-align:center;text-wrap:balance}
  #demo-cap.on{opacity:1}
  #demo-card{position:fixed;inset:0;z-index:100000;background:#1c1b18;color:#fbfaf7;display:none;place-items:center;
    font-family:'Atkinson Hyperlegible Next',system-ui,sans-serif;text-align:center;padding:80px}
  #demo-card.on{display:grid}
  #demo-card h1{font-size:96px;font-weight:800;letter-spacing:-.03em;margin:0}
  #demo-card h2{font-size:46px;font-weight:700;margin:0 0 22px;line-height:1.2;text-wrap:balance;max-width:1200px}
  #demo-card p{font-size:30px;margin:10px auto 0;opacity:.82;max-width:1100px;line-height:1.4;text-wrap:balance}
  #demo-card .mark{display:flex;gap:10px;justify-content:center;margin-bottom:28px}
  #demo-card .mark i{width:34px;height:64px;border-radius:7px;background:#f2c230}
  #demo-card .mark i.off{background:transparent;border:3px solid #57544b}
  #demo-card .y{color:#f2c230}`;
  const add = () => {
    if (document.getElementById('demo-cap')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const c = document.createElement('div'); c.id = 'demo-cursor'; document.body.appendChild(c);
    const cap = document.createElement('div'); cap.id = 'demo-cap'; cap.setAttribute('aria-hidden','true'); document.body.appendChild(cap);
    const card = document.createElement('div'); card.id = 'demo-card'; document.body.appendChild(card);
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => c.classList.add('down'), true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  window.__cap = t => { add(); const el = document.getElementById('demo-cap'); if (!t) { el.classList.remove('on'); return; } el.textContent = t; el.classList.add('on'); };
  window.__card = h => { add(); const el = document.getElementById('demo-card'); if (!h) { el.classList.remove('on'); return; } el.innerHTML = h; el.classList.add('on'); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
})();
"""

cues = []
t0 = None
cur = {"text": None, "start": 0}
mouse = {"x": W / 2, "y": H / 2}


def now():
    return time.monotonic() - t0


def caption(pg, text):
    if cur["text"]:
        cues.append((cur["start"], now(), cur["text"]))
    cur.update(text=text, start=now())
    pg.evaluate("t => window.__cap(t)", text)


def card(pg, html, text_for_srt):
    caption(pg, None)
    if html:
        cur.update(text=text_for_srt, start=now())
    pg.evaluate("h => window.__card(h)", html)


def move_to(pg, loc, dx=0.5, dy=0.5, steps=28):
    loc.scroll_into_view_if_needed()
    box = loc.bounding_box()
    x, y = box["x"] + box["width"] * dx, box["y"] + box["height"] * dy
    pg.mouse.move(x, y, steps=steps)
    mouse.update(x=x, y=y)


def click(pg, loc, pause=350):
    move_to(pg, loc)
    pg.wait_for_timeout(180)
    pg.mouse.down(); pg.wait_for_timeout(90); pg.mouse.up()
    pg.wait_for_timeout(pause)


def scroll_to(pg, y):
    pg.evaluate("y => window.scrollTo({top: y, behavior: 'smooth'})", y)
    pg.wait_for_timeout(700)


def wait(pg, ms):
    pg.wait_for_timeout(ms)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(
        viewport={"width": W, "height": H},
        record_video_dir=str(OUT / "raw"),
        record_video_size={"width": W, "height": H},
        color_scheme="light",
        permissions=["clipboard-read", "clipboard-write"],
    )
    ctx.add_init_script(OVERLAY)
    pg = ctx.new_page()
    pg.goto(URL)
    pg.evaluate("localStorage.clear()")
    pg.reload()
    pg.wait_for_timeout(800)
    t0 = time.monotonic()

    # 1. Title and problem
    card(pg, '<div><div class="mark"><i></i><i></i><i></i><i class="off"></i></div><h1>Spoons</h1><p>Plan your day by energy, not hours.</p></div>',
         "Spoons. Plan your day by energy, not hours.")
    wait(pg, 4200)
    card(pg, '<div><h2>For students living with a chronic illness, energy changes every day.</h2><p>To-do apps assume every day is the same. So people overcommit, crash, and lose tomorrow too.</p></div>',
         "For students living with a chronic illness, energy changes every day. To-do apps assume every day is the same. So people overcommit, crash, and lose tomorrow too.")
    wait(pg, 7000)
    card(pg, '<div><h2>Meet Ada.</h2><p>A composite persona: a second-year student with an energy-limiting illness. Her tasks below are examples.</p></div>',
         "Meet Ada. A composite persona: a second-year student with an energy-limiting illness. Her tasks below are examples.")
    wait(pg, 4500)
    card(pg, None, None)

    # 2. Check-in and battery
    caption(pg, "Every morning Ada checks in. Today she has 8 spoons of energy.")
    move_to(pg, pg.locator(".step-value"))
    wait(pg, 3600)
    caption(pg, "Spoons fills her battery with what fits, and keeps 1 spoon in reserve.")
    move_to(pg, pg.locator(".battery-cells"), 0.25)
    pg.mouse.move(mouse["x"] + 520, mouse["y"], steps=60)
    wait(pg, 2600)
    caption(pg, "Must-dos come first. A heavy task gets a rest break after it.")
    scroll_to(pg, 380)
    move_to(pg, pg.locator(".plan-rest"))
    wait(pg, 3600)
    caption(pg, "“Study for quiz” is too big for what’s left, so only the first part is planned today.")
    move_to(pg, pg.locator(".plan-row", has_text="Study for quiz").locator(".row-title"))
    wait(pg, 4200)

    # 3. Overflow gets a next step
    caption(pg, "Whatever doesn’t fit gets a next step instead of guilt.")
    move_to(pg, pg.locator("#overflow-h"))
    wait(pg, 3000)
    item = pg.locator(".og-item", has_text="Pick up prescription")
    caption(pg, "A friend could pick up her prescription. The message is already written.")
    click(pg, item.get_by_role("button", name="Write a help message"), 1800)
    click(pg, item.get_by_role("button", name="Copy message"), 1600)

    # 4. Low power day
    scroll_to(pg, 0)
    caption(pg, "Bad day? Ada turns today down to 3 spoons.")
    minus = pg.get_by_role("button", name="One spoon less")
    for _ in range(5):
        click(pg, minus, 380)
    caption(pg, "On 3 spoons, Spoons switches to Low Power: must-dos only.")
    wait(pg, 3000)
    caption(pg, "Must-dos that can’t fit are flagged, with a request for more time ready to send.")
    scroll_to(pg, 380)
    risk = pg.locator(".og-risk .og-item", has_text="Lab report draft")
    click(pg, risk.get_by_role("button", name="Ask for more time"), 4200)

    # 5. Re-plan from what tasks really cost
    scroll_to(pg, 0)
    caption(pg, "Back to a steady 8-spoon day.")
    plus = pg.get_by_role("button", name="One spoon more")
    for _ in range(5):
        click(pg, plus, 300)
    wait(pg, 1000)
    caption(pg, "Her lecture drained more than expected: 4 spoons, not 2.")
    scroll_to(pg, 300)
    row = pg.locator(".plan-row", has_text="Attend lecture")
    click(pg, row.get_by_role("button", name="Done"), 900)
    click(pg, row.locator(".cost-btn", has_text="4"), 300)
    scroll_to(pg, 120)
    caption(pg, "Her day re-plans instantly. The lab report no longer fits, so it is flagged before she crashes.")
    move_to(pg, pg.locator(".battery-cells"), 0.15)
    wait(pg, 4300)

    # 6. Learns real costs
    caption(pg, "It learns what tasks really cost her.")
    scroll_to(pg, 380)
    click(pg, pg.get_by_role("button", name="Add task"), 500)
    pg.get_by_role("textbox", name="Task").press_sequentially("Grocery run", delay=90)
    wait(pg, 500)
    move_to(pg, pg.locator(".learned"))
    wait(pg, 2200)
    click(pg, pg.get_by_role("button", name="Use 3"), 500)
    click(pg, pg.get_by_label("Someone else could do it"), 400)
    click(pg, pg.get_by_role("button", name="Add to today"), 600)
    click(pg, pg.get_by_role("button", name="Done adding"), 1200)

    # 7. Accessibility
    scroll_to(pg, 0)
    caption(pg, "Built for whoever opens it: full keyboard use, screen reader announcements, and read-aloud.")
    click(pg, pg.get_by_role("button", name="Display"), 4200)
    caption(pg, "High contrast, a reading-friendly font, and dark mode.")
    click(pg, pg.get_by_label("High contrast"), 1400)
    click(pg, pg.get_by_label("Easier reading font (Lexend, wider spacing)"), 1600)
    click(pg, pg.locator(".settings .seg-option", has_text="Dark"), 2600)
    click(pg, pg.locator(".settings .seg-option", has_text="Match device"), 300)
    click(pg, pg.get_by_label("High contrast"), 200)
    click(pg, pg.get_by_label("Easier reading font (Lexend, wider spacing)"), 200)
    click(pg, pg.locator(".settings").get_by_role("button", name="Close"), 600)

    # 8. Close
    card(pg, '<div><div class="mark"><i></i><i></i><i></i><i class="off"></i></div><h1>Spoons</h1><p>Works offline · No account · Your tasks stay on your device</p><p class="y">Built for Taskforge 2026 · github.com/trovic1/spoons</p></div>',
         "Spoons. Works offline. No account. Your tasks stay on your device. Built for Taskforge 2026.")
    wait(pg, 5500)
    if cur["text"]:
        cues.append((cur["start"], now(), cur["text"]))
    total = now()
    ctx.close()
    browser.close()


def ts(s):
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{int(sec):02},{int((sec % 1) * 1000):03}"


with open(OUT / "spoons-demo.srt", "w") as f:
    for i, (a, b, text) in enumerate(cues, 1):
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{text}\n\n")
json.dump({"t0_offset_hint": "trim leading load frames", "duration": total}, open(OUT / "meta.json", "w"))
print("recorded", round(total, 1), "s,", len(cues), "captions")
