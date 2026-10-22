# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Vite + React + TypeScript, Vitest for the planning engine. Static build with no backend, no account and no API key, so judges can open it anywhere and it keeps working offline.

## Users

Primary: a university student living with a chronic illness that limits daily energy (for example sickle cell disease, long COVID, lupus or ME/CFS). Energy changes day to day. A normal to-do app assumes the same capacity every day, so she over-commits, crashes, and loses the next day too. The demo uses a composite persona, labelled as such; no real person's health story is used.

Job: each morning, decide what today can realistically hold, then get through it without crashing.

## Product Purpose

Spoons plans the day by energy, not hours. She says how many spoons she has today, lists tasks with an energy cost, and the planner builds a day that fits with a reserve kept back. Whatever doesn't fit gets a clear next step: move it to tomorrow, split it, ask someone for help (with a message ready to send), or request an extension. When a task costs more than expected, she logs it and the rest of the day re-plans.

Success: she ends the day with energy in reserve and knows exactly what was moved and why, without guilt.

## Positioning

Built on spoon theory (Christine Miserandino, 2003), the language many chronically ill people already use. Most productivity tools treat time as the limit; Spoons treats energy as the limit and handles the overflow by communicating, not by pushing harder.

## Operating Context

Used in the morning, often from bed and on a phone, sometimes during brain fog, pain or fatigue. Low energy means low tolerance for fiddly input, dense screens, or guilt-heavy copy. Hackathon judges will evaluate it on a laptop in a few minutes.

## Capabilities and Constraints

- Morning energy check-in (0–12 spoons), adjustable reserve.
- Tasks: title, cost 1–5, must/should/could, optional due day, splittable, someone-could-help.
- Planner (tested): fits to budget minus reserve, priority then deadline, splits, routes to help, flags at-risk musts, paces heavy tasks with rest breaks, re-plans from actual costs.
- Learns typical cost of repeated tasks from logs.
- Ready-to-copy help and extension messages.
- Read-aloud of the plan.
- Data stays in the browser (localStorage). No sync, no accounts.

## Evidence on Hand

No real users or testimonials. Do not invent statistics, user quotes or clinical claims. Sample tasks are synthetic and must be labelled as examples.

## Product Principles

1. Energy is the budget; time is secondary.
2. No guilt: moving a task is a plan, not a failure.
3. Every overflow gets a next step someone can act on.
4. Fewest possible decisions on a bad day.
5. Works for whoever opens it: keyboard, screen reader, low vision, dyslexia, reduced motion.

## Accessibility & Inclusion

WCAG 2.2 AA minimum. Full keyboard use, visible focus, screen-reader announcements when the plan changes, 44px targets, high-contrast option, reading-friendly font option, read-aloud, respects reduced motion. Plain-language copy.
