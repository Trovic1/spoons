import { useEffect, useState } from 'react';
import type { DayState } from './engine/day';

export interface Prefs {
  theme: 'system' | 'light' | 'dark';
  contrast: 'normal' | 'high';
  font: 'atkinson' | 'lexend';
}

export interface AppState extends DayState {
  version: 1;
  example: boolean;
  checkedIn: boolean;
  prefs: Prefs;
}

const KEY = 'spoons:v1';

/** Synthetic example day for a composite persona. Labelled as an example in the UI. */
export function exampleState(): AppState {
  return {
    version: 1,
    example: true,
    checkedIn: true,
    budget: 8,
    reserve: 1,
    partialSpent: 0,
    prefs: { theme: 'system', contrast: 'normal', font: 'atkinson' },
    logs: [
      { title: 'Grocery run', actual: 3 },
      { title: 'Grocery run', actual: 3 },
      { title: 'Attend lecture', actual: 2 },
      { title: 'Attend lecture', actual: 3 },
    ],
    tasks: [
      { id: 't1', title: 'Attend lecture', cost: 2, priority: 'must', dueInDays: 0 },
      { id: 't2', title: 'Shower and get dressed', cost: 1, priority: 'must', dueInDays: 0 },
      { id: 't3', title: 'Lab report draft', cost: 3, priority: 'must', dueInDays: 1 },
      { id: 't4', title: 'Pick up prescription', cost: 2, priority: 'should', dueInDays: 0, helpable: true },
      { id: 't5', title: 'Study for quiz', cost: 3, priority: 'should', dueInDays: 2, splittable: true },
      { id: 't6', title: 'Reply to project group chat', cost: 1, priority: 'could' },
      { id: 't7', title: 'Laundry', cost: 3, priority: 'could', helpable: true },
    ],
  };
}

export function blankState(prefs: Prefs): AppState {
  return { ...exampleState(), example: false, checkedIn: false, logs: [], tasks: [], prefs };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 1 && Array.isArray(parsed.tasks)) return parsed;
    }
  } catch {
    /* storage unavailable or corrupt: fall back to the example day */
  }
  return exampleState();
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode: keep working in memory */
    }
  }, [state]);
  return [state, setState] as const;
}

export const newId = () => Math.random().toString(36).slice(2, 9);
