# Devpost submission: copy and paste

Deadline: **Saturday 24 October 2026, 22:00 Lagos time** (5:00pm EDT). Aim to submit by Saturday afternoon.

---

## Project name (60 characters max)
Spoons: plan your day by energy, not hours

## Elevator pitch (200 characters max)
A day planner for students with chronic illness. Set today's energy in spoons; it fits your tasks, keeps a reserve, and turns the rest into a next step: tomorrow, a help message, or more time.

## Built with (tags)
react, typescript, vite, vitest, web-speech-api, localstorage, playwright, axe-core, lucide

## Try it out (links)
- Live demo: https://spoons-sooty.vercel.app
- Code: *https://github.com/trovic1/spoons*

## Video
Upload `spoons-demo.mp4` to YouTube and paste the link. Title, description, tags and thumbnail are in `docs/YOUTUBE.md`.

---

## About the project (the story)

### Inspiration
Think of a student who lives with a chronic illness such as sickle cell disease, long COVID or lupus. Some mornings she has energy for a full day. Some mornings, getting to one lecture is the whole day. Her to-do app doesn't know the difference. It lets her plan a full day on an empty tank, so she pushes through, crashes, and loses the next day too.

Many chronically ill people describe this with **spoon theory**, written by Christine Miserandino in 2003: you start each day with a limited number of spoons, and every task costs some. We wanted a planner that speaks that language and treats energy, not time, as the limit.

The user in our demo, "Ada", is a **composite persona**. Her tasks are made-up examples and no real person's health story is used.

### What it does
1. **Check in.** Each morning, set today's energy from 0 to 12 spoons.
2. **See it fit.** Today becomes a battery with one cell per spoon. Tasks fill the cells by priority and deadline, with one spoon kept in reserve so you don't crash. Big tasks that can be split get their first part planned today. Heavy tasks get a rest break after them.
3. **Get a next step for the rest.** Whatever doesn't fit spills past the battery tip, sorted into **Someone could help** (with a message ready to copy), **Moved to tomorrow**, and **Must-dos at risk** (with a polite request for more time).
4. **Low Power mode.** On a 3-spoon day the app turns yellow, plans must-dos only, and keeps the rest for later.
5. **Re-plan from reality.** Mark a task done and log what it really cost. If the lecture took 4 spoons instead of 2, the rest of the day re-plans instantly and flags what no longer fits.
6. **Learn.** When you add a task you've done before, Spoons suggests what it usually costs you.

The copy is deliberately guilt-free: moving a task is a plan, not a failure.

### Accessibility
For a hackathon about tools that don't leave people behind, accessibility had to be part of the core, not a final pass:
- Zero axe-core WCAG 2.2 AA violations across light, dark, high-contrast and low-power states
- Full keyboard use, a skip link and visible focus
- Screen-reader announcements every time the plan changes; the battery has a text description
- Read-aloud of the whole plan
- High-contrast mode, dark mode, and an easier-reading font option (Lexend)
- Atkinson Hyperlegible Next, a typeface designed by the Braille Institute for low-vision readers
- 44px touch targets, phone-first layout, reduced-motion support
- No account and no network: tasks never leave the browser, and it works offline

### How we built it
- **React + TypeScript + Vite**, deployed as a static site.
- The **planning engine** is a set of pure TypeScript functions, written **test-first with Vitest** (26 tests). It is a greedy scheduler with priority and deadline ordering, a protected reserve, splitting, help routing, at-risk flags, pacing with rest breaks, re-planning from actual costs, and a median-based cost learner.
- The **battery** is a flex layout where each segment's `flex-grow` equals its spoon cost. When the plan changes, the segments animate to their new sizes, so you can see the day reflow.
- **Accessibility testing** used axe-core in a headless browser across every UI state, plus keyboard walkthroughs.
- The **demo video** was recorded with a scripted Playwright run, so every step in it is the real app working.

### Challenges we ran into
- **Making the overflow feel helpful, not like failure.** Our first plan left half the example day "unplanned", which read as the app failing. We reworked the example day and the language so every leftover task has a concrete next step.
- **Split tasks across a day.** Finishing part one of a split task has to reduce the remaining cost and count the spoons spent, without marking the whole task done. We modelled that explicitly and covered it with tests.
- **Colour that means something.** We first painted every planned cell yellow, which made the yellow "low power" warning meaningless. Yellow is now reserved for low-energy days.

### Accomplishments that we're proud of
- A planner that handles a bad day honestly: it says what doesn't fit and helps you tell someone.
- A real, tested engine behind the visuals.
- Zero automated accessibility violations, plus read-aloud, high contrast and a reading-font mode.

### What we learned
- Spoon theory gives users a shared vocabulary, and using their words lowers the effort of using the tool.
- Accessibility decisions (plain words, big targets, fewer choices) also make the app calmer for everyone on a low-energy day.
- Writing tests first for the scheduler caught edge cases early, such as a zero-spoon day and a task that costs more than the remaining budget.

### What's next for Spoons
- Test with chronically ill students and disability-support offices, and adjust costs and language with them
- Optional sync and a shared "help circle" so requests go straight to friends
- Weekly view to spot patterns (which tasks cost the most, which days are low)
- Installable app (PWA) with gentle morning check-in reminders

### Limitations
- Greedy scheduling: priority beats packing efficiency, by design.
- Energy costs are self-reported, and learning needs at least two logs per task.
- Single-device storage; no sync yet.
- Not medical advice.
- Not yet tested with real users from the target group.

### Pre-existing work and AI disclosure
- All code was written during the hackathon (22–24 Oct 2026). We used open-source libraries (React, Vite, Lucide icons, Fontsource fonts) under their licenses.
- **AI assistance:** we used Claude (Anthropic) as a coding and writing assistant for research, planning, code, tests, the demo recording script and documentation drafts. The demo voice-over is AI-generated with Kokoro (open-source TTS); the music and sound effects were synthesized in code for the video. We reviewed, ran and tested everything before submitting.
- Spoon theory is the work of Christine Miserandino, credited in the app and the README.
