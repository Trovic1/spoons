import { describe, expect, it } from 'vitest';
import { markDone, startNewDay, todaysPlan, type DayState } from './day';

const base = (): DayState => ({
  budget: 6,
  reserve: 1,
  partialSpent: 0,
  logs: [],
  tasks: [
    { id: 'a', title: 'Lecture', cost: 2, priority: 'must', dueInDays: 0 },
    { id: 'b', title: 'Essay', cost: 4, priority: 'should', dueInDays: 2, splittable: true },
  ],
});

describe('markDone', () => {
  it('marks a whole task done with the energy it really took', () => {
    const s = markDone(base(), { taskId: 'a', partial: false, plannedCost: 2 }, 3);
    expect(s.tasks.find((t) => t.id === 'a')).toMatchObject({ done: true, actualCost: 3 });
  });

  it('keeps a split task open with the rest of its cost after finishing one part', () => {
    const s = markDone(base(), { taskId: 'b', partial: true, plannedCost: 3 }, 3);
    expect(s.tasks.find((t) => t.id === 'b')).toMatchObject({ cost: 1 });
    expect(s.tasks.find((t) => t.id === 'b')?.done).toBeFalsy();
    expect(s.partialSpent).toBe(3);
  });
});

describe('todaysPlan', () => {
  it('re-plans the rest of the day after a task costs more than expected', () => {
    const s = markDone(base(), { taskId: 'a', partial: false, plannedCost: 2 }, 4);
    const plan = todaysPlan(s);
    expect(plan.spent).toBe(4);
    expect(plan.usable).toBe(1);
  });

  it('counts finished parts of split tasks as spent', () => {
    const s = markDone(base(), { taskId: 'b', partial: true, plannedCost: 3 }, 3);
    expect(todaysPlan(s).spent).toBe(3);
  });
});

describe('low power day', () => {
  it('plans must-dos only when the day has 3 spoons or fewer', () => {
    const s: DayState = { ...base(), budget: 3, reserve: 0 };
    const plan = todaysPlan(s);
    expect(plan.scheduled.every((i) => i.kind !== 'task' || i.task.priority === 'must')).toBe(true);
    expect(plan.moved.map((t) => t.id)).toContain('b');
  });
});

describe('startNewDay', () => {
  it('logs finished tasks, clears them, counts deadlines down and resets spending', () => {
    let s = markDone(base(), { taskId: 'a', partial: false, plannedCost: 2 }, 3);
    s = markDone(s, { taskId: 'b', partial: true, plannedCost: 2 }, 2);
    const next = startNewDay(s, 5);
    expect(next.logs).toEqual([{ title: 'Lecture', actual: 3 }]);
    expect(next.tasks.map((t) => t.id)).toEqual(['b']);
    expect(next.tasks[0].dueInDays).toBe(1);
    expect(next.partialSpent).toBe(0);
    expect(next.budget).toBe(5);
  });

  it('never counts a deadline below today', () => {
    const s: DayState = { ...base(), tasks: [{ id: 'x', title: 'X', cost: 1, priority: 'must', dueInDays: 0 }] };
    expect(startNewDay(s, 6).tasks[0].dueInDays).toBe(0);
  });
});
