import { describe, expect, it } from 'vitest';
import { planDay, replan, learnCost, helpMessage, extensionMessage, type Task } from './plan';

const t = (id: string, cost: number, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  cost,
  priority: 'should',
  ...extra,
});

const ids = (items: { task: Task }[]) => items.map((i) => i.task.id);
const taskIds = (plan: ReturnType<typeof planDay>) =>
  plan.scheduled.filter((s) => s.kind === 'task').map((s) => (s.kind === 'task' ? s.task.id : ''));

describe('planDay', () => {
  it('schedules every task when they fit inside the budget minus the reserve', () => {
    const plan = planDay({ budget: 6, reserve: 1, tasks: [t('a', 2), t('b', 2), t('c', 1)] });
    expect(taskIds(plan).sort()).toEqual(['a', 'b', 'c']);
    expect(plan.used).toBe(5);
    expect(plan.moved).toEqual([]);
  });

  it('keeps the reserve free and moves what does not fit to tomorrow', () => {
    const plan = planDay({ budget: 5, reserve: 1, tasks: [t('a', 2), t('b', 2), t('c', 1)] });
    expect(plan.used).toBeLessThanOrEqual(4);
    expect(ids(plan.moved.map((task) => ({ task })))).toEqual(['c']);
  });

  it('plans must tasks before should and could tasks', () => {
    const plan = planDay({
      budget: 4,
      reserve: 0,
      tasks: [t('could', 2, { priority: 'could' }), t('should', 2), t('must', 2, { priority: 'must' })],
    });
    expect(taskIds(plan).sort()).toEqual(['must', 'should']);
    expect(plan.moved.map((x) => x.id)).toEqual(['could']);
  });

  it('plans sooner deadlines first within the same priority', () => {
    const plan = planDay({
      budget: 2,
      reserve: 0,
      tasks: [t('later', 2, { dueInDays: 5 }), t('today', 2, { dueInDays: 0 })],
    });
    expect(taskIds(plan)).toEqual(['today']);
  });

  it('splits a splittable task to use the spoons that are left', () => {
    const plan = planDay({
      budget: 4,
      reserve: 0,
      tasks: [t('a', 2, { priority: 'must' }), t('essay', 4, { splittable: true })],
    });
    const part = plan.scheduled.find((s) => s.kind === 'task' && s.task.id === 'essay');
    expect(part && part.kind === 'task' ? part.cost : 0).toBe(2);
    expect(part && part.kind === 'task' ? part.partial : false).toBe(true);
    expect(plan.moved.find((m) => m.id === 'essay')?.cost).toBe(2);
    expect(plan.used).toBe(4);
  });

  it('suggests asking for help with a helpable task that does not fit', () => {
    const plan = planDay({
      budget: 2,
      reserve: 0,
      tasks: [t('lab', 2, { priority: 'must' }), t('groceries', 2, { helpable: true })],
    });
    expect(plan.help.map((h) => h.id)).toEqual(['groceries']);
    expect(plan.moved).toEqual([]);
  });

  it('flags must tasks that cannot fit or be handed off as at risk', () => {
    const plan = planDay({
      budget: 3,
      reserve: 0,
      tasks: [t('exam', 3, { priority: 'must', dueInDays: 0 }), t('report', 2, { priority: 'must', dueInDays: 1 })],
    });
    expect(plan.atRisk.map((x) => x.id)).toEqual(['report']);
    expect(plan.overBy).toBe(2);
  });

  it('moves everything and flags musts when there is no energy today', () => {
    const plan = planDay({ budget: 0, reserve: 1, tasks: [t('m', 1, { priority: 'must' }), t('s', 1)] });
    expect(plan.scheduled).toEqual([]);
    expect(plan.atRisk.map((x) => x.id)).toEqual(['m']);
    expect(plan.moved.map((x) => x.id)).toEqual(['s']);
  });

  it('adds a rest break after a heavy task unless it is the last item', () => {
    const plan = planDay({ budget: 10, reserve: 0, tasks: [t('heavy', 3, { priority: 'must' }), t('light', 1)] });
    expect(plan.scheduled.map((s) => s.kind)).toEqual(['task', 'rest', 'task']);
  });

  it('does not put two heavy tasks back to back when a light task can go between', () => {
    const plan = planDay({
      budget: 10,
      reserve: 0,
      tasks: [t('h1', 3, { priority: 'must' }), t('h2', 3, { priority: 'must' }), t('l', 1)],
    });
    expect(taskIds(plan)).toEqual(['h1', 'l', 'h2']);
  });

  it('plans only must-dos in must-only mode and moves the rest to tomorrow', () => {
    const plan = planDay({
      budget: 5,
      reserve: 0,
      mustOnly: true,
      tasks: [t('m', 1, { priority: 'must' }), t('s', 1), t('h', 1, { helpable: true })],
    });
    expect(taskIds(plan)).toEqual(['m']);
    expect(plan.moved.map((x) => x.id)).toEqual(['s', 'h']);
  });

  it('ignores tasks that are already done', () => {
    const plan = planDay({ budget: 3, reserve: 0, tasks: [t('done', 3, { done: true }), t('a', 2)] });
    expect(taskIds(plan)).toEqual(['a']);
  });
});

describe('replan', () => {
  it('subtracts the actual cost of finished tasks from the day budget', () => {
    const tasks = [t('lecture', 2, { done: true, actualCost: 4 }), t('a', 2), t('b', 1)];
    const plan = replan({ budget: 7, reserve: 1, tasks });
    expect(plan.spent).toBe(4);
    expect(taskIds(plan)).toEqual(['a']);
    expect(plan.moved.map((m) => m.id)).toEqual(['b']);
  });

  it('never plans with a negative budget after a hard morning', () => {
    const plan = replan({ budget: 3, reserve: 1, tasks: [t('x', 1, { done: true, actualCost: 5 }), t('a', 1)] });
    expect(plan.scheduled).toEqual([]);
    expect(plan.spent).toBe(5);
  });
});

describe('learnCost', () => {
  it('returns null with fewer than two past logs', () => {
    expect(learnCost([{ title: 'Laundry', actual: 3 }], 'laundry')).toBeNull();
  });

  it('returns the median actual cost of matching logs, case and space insensitive', () => {
    const logs = [
      { title: 'Laundry', actual: 3 },
      { title: ' laundry ', actual: 4 },
      { title: 'LAUNDRY', actual: 4 },
      { title: 'Lecture', actual: 1 },
    ];
    expect(learnCost(logs, 'laundry')).toBe(4);
  });

  it('keeps the learned cost between 1 and 5', () => {
    const logs = [
      { title: 'Gym', actual: 9 },
      { title: 'Gym', actual: 9 },
    ];
    expect(learnCost(logs, 'gym')).toBe(5);
  });
});

describe('messages', () => {
  it('writes a help request that names the task', () => {
    expect(helpMessage(t('Pick up groceries', 2))).toContain('Pick up groceries');
  });

  it('writes an extension request that names the task', () => {
    expect(extensionMessage(t('Lab report', 3))).toContain('Lab report');
  });
});
