"""Records the voiced, zoomed demo cut. Timing follows the voice-over clip lengths, and every
cue (voice line, click, whoosh, drop, low power) is written to events.json for demo/audio.py.

Usage: python3 demo/record2.py http://localhost:4173/ demo/out2 demo/vo
"""
import sys, time, json, pathlib
from playwright.sync_api import sync_playwright

URL, OUT, VO = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
DUR = json.load(open(VO / "durations.json"))
GAP = 0.35

# Caption text per voice line; *word* is highlighted in yellow. None = the card itself carries the words.
CAPS = [
    None, None, None, None,
    "Every morning, check in. Today, Ada has *8 spoons*.",
    "Spoons fills her battery with what fits, and keeps *1 spoon in reserve*.",
    "Too big for today? It plans *just the first part*.",
    "Everything that doesn't fit gets *a next step*. Not guilt.",
    "A friend could grab her prescription. *The message is already written.*",
    "Bad day? 3 spoons switches on *Low Power*: must-dos only.",
    "Can't make a deadline? *A request for more time* is ready.",
    "Her lecture took 4 spoons, not 2, and the day *re-plans instantly*.",
    "It learns what her tasks *really cost*.",
    "Built for everyone: *keyboard, screen readers, read-aloud, high contrast*, reading font.",
    None, None,
]

OVERLAY = r"""
(() => {
  const css = `
  html,body{overflow:hidden!important}
  #root{transform-origin:0 0;transition:transform 900ms cubic-bezier(.65,0,.2,1);will-change:transform}
  #dc{position:fixed;z-index:99999;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;
    border:3px solid #1c1b18;background:rgba(242,194,48,.6);pointer-events:none;left:-60px;top:-60px;
    box-shadow:0 0 0 6px rgba(242,194,48,.25);transition:transform .12s ease-out}
  #dc.down{transform:scale(.65)} #dc.ring::after{content:'';position:absolute;inset:-14px;border-radius:50%;border:3px solid #f2c230;animation:ring .5s ease-out forwards}
  @keyframes ring{from{opacity:1;transform:scale(.4)}to{opacity:0;transform:scale(1.6)}}
  #dcap{position:fixed;z-index:99998;left:50%;bottom:44px;transform:translate(-50%,24px) scale(.96);max-width:1500px;width:max-content;
    padding:20px 34px;border-radius:18px;background:#1c1b18;color:#fbfaf7;font:700 38px/1.3 'Atkinson Hyperlegible Next',system-ui,sans-serif;
    box-shadow:0 18px 50px -14px rgba(0,0,0,.55);opacity:0;transition:opacity .22s ease-out,transform .35s cubic-bezier(.2,1.4,.4,1);text-align:center;text-wrap:balance;letter-spacing:-.01em}
  #dcap.on{opacity:1;transform:translate(-50%,0) scale(1)} #dcap b{color:#f2c230;font-weight:800}
  #dcard{position:fixed;inset:0;z-index:100000;background:#1c1b18;color:#fbfaf7;display:none;place-items:center;
    font-family:'Atkinson Hyperlegible Next',system-ui,sans-serif;text-align:center;overflow:hidden}
  #dcard.on{display:grid}
  #dcard .wrap{display:grid;justify-items:center;gap:40px}
  #dcard h1{font-size:132px;font-weight:800;letter-spacing:-.045em;margin:0;line-height:1}
  #dcard h2{font-size:92px;font-weight:800;letter-spacing:-.035em;margin:0;line-height:1.05;max-width:1500px;text-wrap:balance}
  #dcard p{font-size:44px;margin:0;opacity:.85;font-weight:500}
  #dcard .y{color:#f2c230}
  #dcard .pop{display:inline-block;opacity:0;transform:translateY(40px) scale(.9);animation:pop .55s cubic-bezier(.2,1.4,.4,1) forwards}
  @keyframes pop{to{opacity:1;transform:none}}
  #dcard .batt{display:flex;align-items:center;gap:0}
  #dcard .case{display:flex;gap:10px;padding:12px;border:7px solid #fbfaf7;border-radius:26px}
  #dcard .cell{width:58px;height:120px;border-radius:10px;background:#f2c230;transition:background .25s,opacity .25s,transform .25s}
  #dcard .cell.off{background:transparent;box-shadow:inset 0 0 0 3px #4a4740}
  #dcard .tip{width:18px;height:56px;background:#fbfaf7;border-radius:0 10px 10px 0}
  #dcard .row{display:flex;gap:120px;align-items:flex-end}
  #dcard .col{display:grid;gap:26px;justify-items:center}
  #dcard .col p{font-size:40px}
  #dcard .small .cell{width:40px;height:84px}
  #dcard .small .case{border-width:5px;gap:7px;padding:9px;border-radius:20px}
  #dcard .lines{display:grid;gap:22px;justify-items:center}
  #dcard .lines h2{font-size:96px}
  #dcard .url{font-size:36px;opacity:.7;font-weight:700;letter-spacing:.01em}
  #dcard .logo{display:flex;align-items:center;gap:34px}
  #dcard .logo .case{padding:10px;gap:8px;border-width:6px;border-radius:22px}
  #dcard .logo .cell{width:44px;height:92px}
  #dcard .zoomin{animation:zin 1.4s cubic-bezier(.2,.9,.3,1) forwards}
  @keyframes zin{from{transform:scale(.86);opacity:0}to{transform:none;opacity:1}}
  `;
  const add = () => {
    if (document.getElementById('dcap')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    for (const id of ['dc','dcap','dcard']) { const d = document.createElement('div'); d.id = id; if (id!=='dc') d.setAttribute('aria-hidden','true'); document.body.appendChild(d); }
    const c = document.getElementById('dc');
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.classList.add('down'); c.classList.remove('ring'); void c.offsetWidth; c.classList.add('ring'); }, true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  const st = { s: 1, tx: 0, ty: 0 };
  window.__zoom = (sel, s, fy) => {
    add();
    const root = document.getElementById('root');
    if (!sel) { Object.assign(st, { s: 1, tx: 0, ty: 0 }); root.style.transform = 'none'; return; }
    const r = document.querySelector(sel).getBoundingClientRect();
    const cx = (r.left + r.width / 2 - st.tx) / st.s, cy = (r.top + r.height / 2 - st.ty) / st.s;
    const tx = innerWidth / 2 - cx * s, ty = innerHeight * (fy ?? 0.42) - cy * s;
    Object.assign(st, { s, tx, ty });
    root.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  };
  window.__cap = t => { add(); const el = document.getElementById('dcap');
    if (!t) { el.classList.remove('on'); return; }
    el.classList.remove('on'); void el.offsetWidth;
    el.innerHTML = t.replace(/\*(.+?)\*/g, '<b>$1</b>'); el.classList.add('on'); };
  window.__card = h => { add(); const el = document.getElementById('dcard'); if (!h) { el.classList.remove('on'); el.innerHTML=''; return; } el.innerHTML = h; el.classList.add('on'); };
  window.__drain = (to, every) => { const cells = [...document.querySelectorAll('#dcard .drain .cell')];
    cells.slice(to).reverse().forEach((c, i) => setTimeout(() => c.classList.add('off'), i * every)); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', add) : add();
})();
"""


def battery(n, on, cls=""):
    cells = "".join(f'<i class="cell{"" if k < on else " off"}"></i>' for k in range(n))
    return f'<div class="batt {cls}"><div class="case">{cells}</div><div class="tip"></div></div>'


LOGO = f'<div class="logo">{battery(4, 3)}<h1>Spoons</h1></div>'

ev = {"vo": [], "click": [], "whoosh": [], "drop": None, "low": None, "end": None}
t0 = None


def now():
    return time.monotonic() - t0


def vo(pg, i):
    """Start voice line i (logs it, shows its caption) and return its end time."""
    ev["vo"].append([i, round(now(), 3)])
    pg.evaluate("t => window.__cap(t)", CAPS[i])
    return now() + DUR[i] + GAP


def until(pg, deadline):
    ms = int((deadline - now()) * 1000)
    if ms > 0:
        pg.wait_for_timeout(ms)


def card(pg, html):
    ev["whoosh"].append(round(now(), 3))
    pg.evaluate("t => window.__cap(t)", None)
    pg.evaluate("h => window.__card(h)", html)


def zoom(pg, sel, s, fy=0.42, settle=950):
    pg.evaluate("([a,b,c]) => window.__zoom(a,b,c)", [sel, s, fy])
    pg.wait_for_timeout(settle)


def move(pg, loc, steps=24):
    b = loc.bounding_box()
    pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=steps)


def click(pg, loc, pause=300, steps=22):
    move(pg, loc, steps)
    pg.wait_for_timeout(120)
    ev["click"].append(round(now(), 3))
    pg.mouse.down(); pg.wait_for_timeout(70); pg.mouse.up()
    pg.wait_for_timeout(pause)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": W, "height": H}, record_video_dir=str(OUT / "raw"),
                              record_video_size={"width": W, "height": H}, color_scheme="light",
                              permissions=["clipboard-read", "clipboard-write"])
    ctx.add_init_script(OVERLAY)
    pg = ctx.new_page()
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(900)
    pg.evaluate("window.__card('<div></div>')")  # start on a dark frame
    pg.wait_for_timeout(300)
    t0 = time.monotonic()

    # ---- Hook ----
    card(pg, f'<div class="wrap"><h2><span class="pop">Your to-do app thinks</span><br><span class="pop" style="animation-delay:.25s">every day is <span class="y">the same.</span></span></h2>{battery(8, 8, "drain pop")}</div>')
    until(pg, vo(pg, 0))
    pg.evaluate("window.__drain(3, 140)")
    d = vo(pg, 1)
    pg.evaluate("""() => { const h = document.querySelector('#dcard h2'); h.innerHTML = 'If you live with a chronic illness, <span class="y">it isn&#39;t.</span>'; }""")
    until(pg, d)
    card(pg, f'<div class="row"><div class="col pop">{battery(8, 8, "small")}<p>Some days: <span class="y">everything.</span></p></div>'
             f'<div class="col pop" style="animation-delay:1.6s">{battery(8, 1, "small")}<p>Some days: <span class="y">one lecture.</span></p></div></div>')
    until(pg, vo(pg, 2))
    card(pg, f'<div class="wrap zoomin">{LOGO}<p>Plan your day by <span class="y">energy</span>, not hours.</p></div>')
    ev["drop"] = round(now(), 3)
    until(pg, vo(pg, 3))

    # ---- App ----
    zoom(pg, ".checkin", 1.45, settle=0)
    pg.evaluate("window.__card(null)")
    ev["whoosh"].append(round(now(), 3))
    pg.wait_for_timeout(950)
    d = vo(pg, 4)
    move(pg, pg.locator(".step-value"), 30)
    until(pg, d)

    d = vo(pg, 5)
    zoom(pg, ".battery-figure", 1.55, 0.4)
    cells = pg.locator(".battery-cells").bounding_box()
    pg.mouse.move(cells["x"] + 40, cells["y"] + cells["height"] / 2, steps=12)
    pg.mouse.move(cells["x"] + cells["width"] - 40, cells["y"] + cells["height"] / 2, steps=70)
    until(pg, d)

    d = vo(pg, 6)
    zoom(pg, "#plan .plan-list", 1.5, 0.45)
    move(pg, pg.locator(".plan-row", has_text="Study for quiz").locator(".meta-chip"), 26)
    until(pg, d)

    d = vo(pg, 7)
    zoom(pg, ".panel-overflow", 1.25, 0.5)
    move(pg, pg.locator("#overflow-h"), 24)
    until(pg, d)

    d = vo(pg, 8)
    item = pg.locator(".og-item", has_text="Pick up prescription")
    zoom(pg, ".panel-overflow .og-help", 1.6, 0.45)
    click(pg, item.get_by_role("button", name="Write a help message"), 700)
    zoom(pg, ".panel-overflow .og-help", 1.6, 0.45, settle=600)
    click(pg, item.get_by_role("button", name="Copy message"), 300)
    until(pg, d)

    d = vo(pg, 9)
    zoom(pg, ".checkin", 1.45, 0.45, settle=850)
    minus = pg.get_by_role("button", name="One spoon less")
    for k in range(5):
        if k == 4:
            ev["low"] = [round(now() + 0.2, 3), None]
        click(pg, minus, 170, steps=8 if k else 20)
    pg.wait_for_timeout(300)
    zoom(pg, ".main", 0.92, 0.5)
    until(pg, d)

    d = vo(pg, 10)
    risk = pg.locator(".og-risk .og-item", has_text="Lab report draft")
    zoom(pg, ".og-risk", 1.5, 0.45)
    click(pg, risk.get_by_role("button", name="Ask for more time"), 600)
    zoom(pg, ".og-risk", 1.45, 0.45, settle=500)
    until(pg, d)

    zoom(pg, ".checkin", 1.45, 0.45, settle=850)
    plus = pg.get_by_role("button", name="One spoon more")
    for k in range(5):
        click(pg, plus, 140, steps=8 if k else 20)
        if k == 0:
            ev["low"][1] = round(now(), 3)

    d = vo(pg, 11)
    zoom(pg, "#plan .plan-list", 1.5, 0.45)
    row = pg.locator(".plan-row", has_text="Attend lecture")
    click(pg, row.get_by_role("button", name="Done"), 500)
    click(pg, row.locator(".cost-btn", has_text="4"), 250)
    zoom(pg, ".battery-figure", 1.5, 0.4)
    until(pg, d)

    d = vo(pg, 12)
    zoom(pg, "#plan .panel-head", 1.5, 0.3, settle=700)
    click(pg, pg.get_by_role("button", name="Add task"), 300)
    zoom(pg, "#add-task", 1.35, 0.45, settle=700)
    pg.get_by_role("textbox", name="Task").press_sequentially("Grocery run", delay=55)
    pg.wait_for_timeout(250)
    click(pg, pg.get_by_role("button", name="Use 3"), 250, steps=16)
    until(pg, d)
    click(pg, pg.get_by_label("Someone else could do it"), 150, steps=12)
    click(pg, pg.get_by_role("button", name="Add to today"), 300, steps=12)
    click(pg, pg.get_by_role("button", name="Done adding"), 200, steps=12)

    d = vo(pg, 13)
    zoom(pg, ".topbar", 1.3, 0.25, settle=600)
    click(pg, pg.get_by_role("button", name="Display"), 500, steps=16)
    zoom(pg, "#settings", 1.3, 0.3, settle=700)
    click(pg, pg.get_by_label("High contrast"), 700, steps=14)
    click(pg, pg.get_by_label("Easier reading font (Lexend, wider spacing)"), 700, steps=14)
    click(pg, pg.locator(".settings .seg-option", has_text="Dark"), 300, steps=14)
    zoom(pg, ".main", 0.95, 0.5, settle=700)
    until(pg, d)

    # ---- Close ----
    card(pg, '<div class="lines"><h2 class="pop">No account.</h2><h2 class="pop" style="animation-delay:.9s">Works offline.</h2>'
             '<h2 class="pop" style="animation-delay:1.9s">Your data <span class="y">never leaves</span> your device.</h2></div>')
    until(pg, vo(pg, 14))
    card(pg, f'<div class="wrap zoomin">{LOGO}<p>Plan your day by <span class="y">energy</span>, not hours.</p>'
             '<p class="url">Built for Taskforge 2026 · github.com/trovic1/spoons</p></div>')
    ev["end"] = round(now(), 3)
    until(pg, vo(pg, 15) + 2.6)
    ev["duration"] = round(now(), 3)
    ctx.close(); browser.close()

json.dump(ev, open(OUT / "events.json", "w"), indent=1)
print("recorded", ev["duration"], "s; clicks", len(ev["click"]))
