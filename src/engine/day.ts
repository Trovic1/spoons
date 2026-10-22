import { replan, type Plan, type Task } from './plan';

export interface DayState {
  budget: number;
  reserve: number;
  /** Spoons spent on finished parts of split tasks today. */
  partialSpent: number;
  logs: { title: string; actual: number }[];
  tasks: Task[];
}

export interface DoneRef {
  taskId: string;
  partial: boolean;
  plannedCost: number;
}

export function markDone<S extends DayState>(s: S, ref: DoneRef, actual: number): S {
  if (ref.partial) {
    return {
      ...s,
      partialSpent: s.partialSpent + actual,
      tasks: s.tasks.map((t) => (t.id === ref.taskId ? { ...t, cost: Math.max(1, t.cost - ref.plannedCost) } : t)),
    };
  }
  return {
    ...s,
    tasks: s.tasks.map((t) => (t.id === ref.taskId ? { ...t, done: true, actualCost: actual } : t)),
  };
}

/** A day of 3 spoons or fewer is a low power day: must-dos only. */
export const LOW_POWER = 3;

export function todaysPlan(s: DayState): Plan {
  const plan = replan({
    budget: Math.max(0, s.budget - s.partialSpent),
    reserve: s.reserve,
    tasks: s.tasks,
    mustOnly: s.budget <= LOW_POWER,
  });
  return { ...plan, spent: plan.spent + s.partialSpent };
}

export function startNewDay<S extends DayState>(s: S, budget: number): S {
  const done = s.tasks.filter((t) => t.done);
  return {
    ...s,
    budget,
    partialSpent: 0,
    logs: [...s.logs, ...done.map((t) => ({ title: t.title, actual: t.actualCost ?? t.cost }))],
    tasks: s.tasks
      .filter((t) => !t.done)
      .map((t) => (t.dueInDays === undefined ? t : { ...t, dueInDays: Math.max(0, t.dueInDays - 1) })),
  };
}
