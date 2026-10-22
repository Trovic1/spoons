export type Priority = 'must' | 'should' | 'could';

export interface Task {
  id: string;
  title: string;
  /** Energy cost in spoons, 1–5. */
  cost: number;
  priority: Priority;
  /** 0 = due today. Undefined = no deadline. */
  dueInDays?: number;
  splittable?: boolean;
  helpable?: boolean;
  done?: boolean;
  /** Spoons it really took, logged when marked done. */
  actualCost?: number;
}

export type PlanItem =
  | { kind: 'task'; task: Task; cost: number; partial: boolean }
  | { kind: 'rest' };

export interface Plan {
  scheduled: PlanItem[];
  /** Tasks (or remaining parts) pushed to tomorrow. */
  moved: Task[];
  /** Tasks someone else could take. */
  help: Task[];
  /** Must-do tasks that don't fit and can't be handed off. */
  atRisk: Task[];
  overBy: number;
  used: number;
  usable: number;
  /** Spoons already spent on finished tasks today. */
  spent: number;
}

export interface PlanInput {
  budget: number;
  reserve?: number;
  tasks: Task[];
  /** Low power day: plan must-dos only; everything else waits. */
  mustOnly?: boolean;
}

export const HEAVY = 3;
const RANK: Record<Priority, number> = { must: 0, should: 1, could: 2 };
const isHeavy = (item: PlanItem) => item.kind === 'task' && item.cost >= HEAVY;

function byUrgency(tasks: Task[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort(
      (a, b) =>
        RANK[a.task.priority] - RANK[b.task.priority] ||
        (a.task.dueInDays ?? Infinity) - (b.task.dueInDays ?? Infinity) ||
        a.index - b.index,
    )
    .map((x) => x.task);
}

/** Avoid two heavy tasks in a row, then add a rest break after each heavy task. */
function pace(items: PlanItem[]): PlanItem[] {
  const order = [...items];
  for (let i = 1; i < order.length; i++) {
    if (isHeavy(order[i]) && isHeavy(order[i - 1])) {
      const j = order.findIndex((item, k) => k > i && !isHeavy(item));
      if (j !== -1) order.splice(i, 0, ...order.splice(j, 1));
    }
  }
  return order.flatMap((item, i) =>
    isHeavy(item) && i < order.length - 1 ? [item, { kind: 'rest' } as PlanItem] : [item],
  );
}

export function planDay({ budget, reserve = 1, tasks, mustOnly = false }: PlanInput): Plan {
  const usable = Math.max(0, budget - reserve);
  let left = usable;
  const chosen: PlanItem[] = [];
  const moved: Task[] = [];
  const help: Task[] = [];
  const atRisk: Task[] = [];
  let overBy = 0;

  for (const task of byUrgency(tasks.filter((x) => !x.done))) {
    if (mustOnly && task.priority !== 'must') {
      moved.push(task);
    } else if (task.cost <= left) {
      chosen.push({ kind: 'task', task, cost: task.cost, partial: false });
      left -= task.cost;
    } else if (task.splittable && left >= 1) {
      chosen.push({ kind: 'task', task, cost: left, partial: true });
      moved.push({ ...task, cost: task.cost - left });
      left = 0;
    } else if (task.helpable) {
      help.push(task);
    } else if (task.priority === 'must') {
      atRisk.push(task);
      overBy += task.cost;
    } else {
      moved.push(task);
    }
  }

  return { scheduled: pace(chosen), moved, help, atRisk, overBy, used: usable - left, usable, spent: 0 };
}

/** Re-plan the rest of the day using what finished tasks really cost. */
export function replan({ budget, reserve = 1, tasks, mustOnly }: PlanInput): Plan {
  const spent = tasks.filter((x) => x.done).reduce((sum, x) => sum + (x.actualCost ?? x.cost), 0);
  return { ...planDay({ budget: Math.max(0, budget - spent), reserve, tasks, mustOnly }), spent };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Suggest a cost from past logs of the same task (median, 1–5). */
export function learnCost(logs: { title: string; actual: number }[], title: string): number | null {
  const values = logs.filter((l) => norm(l.title) === norm(title)).map((l) => l.actual).sort((a, b) => a - b);
  if (values.length < 2) return null;
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  return Math.min(5, Math.max(1, Math.round(median)));
}

export function helpMessage(task: Task): string {
  return `Hi! I'm running low on energy today. Could you help me with "${task.title}"? It would make a real difference. Thank you!`;
}

export function extensionMessage(task: Task): string {
  return `Hello, I'm managing a health condition that limits my energy, and I won't be able to finish "${task.title}" to my usual standard by the deadline. Could I have a short extension? I can share an updated timeline. Thank you for understanding.`;
}
