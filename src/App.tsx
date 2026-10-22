import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Copy,
  HandHelping,
  Minus,
  Plus,
  Scissors,
  Settings2,
  Sunrise,
  Trash2,
  Volume2,
  VolumeX,
  Armchair,
  X,
} from 'lucide-react';
import { Battery } from './components/Battery';
import { extensionMessage, helpMessage, learnCost, type Priority, type Task } from './engine/plan';
import { LOW_POWER, markDone, startNewDay, todaysPlan } from './engine/day';
import { blankState, exampleState, newId, useAppState, type Prefs } from './store';

const MAX = 12;
const COST_WORDS = ['', 'Light', 'Moderate', 'Heavy', 'Very heavy', 'Draining'];
const PRIORITY_WORDS: Record<Priority, string> = { must: 'Must', should: 'Should', could: 'Could' };

function dayWord(n: number) {
  if (n <= 3) return 'Low power day';
  if (n <= 6) return 'Careful day';
  if (n <= 9) return 'Steady day';
  return 'Good day';
}

function dueWord(d?: number) {
  if (d === undefined) return null;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

const spoons = (n: number) => `${n} ${n === 1 ? 'spoon' : 'spoons'}`;

async function copyText(text: string, fallback: HTMLElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallback) {
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    return false;
  }
}

export default function App() {
  const [state, setState] = useAppState();
  const [announce, setAnnounce] = useState('');
  const [adding, setAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const plan = useMemo(() => todaysPlan(state), [state]);
  const lowPower = state.budget <= LOW_POWER;
  const done = state.tasks.filter((t) => t.done);

  useEffect(() => {
    const root = document.documentElement;
    // Only clear a theme we set ourselves, so a host page's own theme choice survives.
    if (state.prefs.theme !== 'system') {
      root.setAttribute('data-theme', state.prefs.theme);
      root.dataset.themeOwner = 'spoons';
    } else if (root.dataset.themeOwner === 'spoons') {
      root.removeAttribute('data-theme');
      delete root.dataset.themeOwner;
    }
    root.setAttribute('data-contrast', state.prefs.contrast);
    root.setAttribute('data-font', state.prefs.font);
  }, [state.prefs]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const fits = plan.scheduled.filter((s) => s.kind === 'task').length;
    const parts = [`Plan updated. ${fits} ${fits === 1 ? 'task fits' : 'tasks fit'} today.`];
    if (plan.help.length) parts.push(`${plan.help.length} could go to someone else.`);
    if (plan.moved.length) parts.push(`${plan.moved.length} moved to tomorrow.`);
    if (plan.atRisk.length) parts.push(`${plan.atRisk.length} must-do at risk.`);
    setAnnounce(parts.join(' '));
  }, [plan]);

  const setBudget = (n: number) =>
    setState((s) => ({ ...s, budget: Math.max(0, Math.min(MAX, n)), checkedIn: true }));
  const setPrefs = (p: Partial<Prefs>) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } }));
  const addTask = (task: Task) => setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
  const removeTask = (id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));

  function speakPlan() {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const tasks = plan.scheduled
      .map((s) => (s.kind === 'rest' ? 'Then rest.' : `${s.task.title}, ${spoons(s.cost)}.`))
      .join(' ');
    const extra = [
      plan.help.length ? `Ask for help with ${plan.help.map((t) => t.title).join(', ')}.` : '',
      plan.moved.length ? `Moved to tomorrow: ${plan.moved.map((t) => t.title).join(', ')}.` : '',
    ].join(' ');
    const u = new SpeechSynthesisUtterance(
      `You have ${spoons(Math.max(0, state.budget - plan.spent))} left today, with ${spoons(state.reserve)} in reserve. Your plan: ${tasks || 'rest.'} ${extra}`,
    );
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="app" data-power={lowPower ? 'low' : 'normal'}>
      <a className="skip" href="#plan">
        Skip to today's plan
      </a>
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 20" aria-hidden="true">
            <rect x="1.25" y="1.25" width="25.5" height="17.5" rx="3.5" />
            <rect className="brand-tip" x="28" y="6" width="3" height="8" rx="1" />
            <rect className="brand-cell" x="4.5" y="4.5" width="5" height="11" rx="1" />
            <rect className="brand-cell" x="11.5" y="4.5" width="5" height="11" rx="1" />
          </svg>
          <span className="brand-name">Spoons</span>
          <span className="brand-date">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-quiet" onClick={speakPlan} aria-pressed={speaking}>
            {speaking ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            <span>{speaking ? 'Stop reading' : 'Read plan aloud'}</span>
          </button>
          <button
            className="btn btn-quiet"
            aria-expanded={showSettings}
            aria-controls="settings"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 aria-hidden="true" />
            <span>Display</span>
          </button>
        </div>
      </header>

      {showSettings && <Settings prefs={state.prefs} setPrefs={setPrefs} reserve={state.reserve} setReserve={(r) => setState((s) => ({ ...s, reserve: r }))} onClose={() => setShowSettings(false)} />}

      {state.example && (
        <div className="example-note" role="note">
          <p>
            <b>Example day.</b> These tasks belong to a made-up student so you can see how Spoons works. Try changing
            today's spoons below.
          </p>
          <button className="btn btn-line" onClick={() => setState(blankState(state.prefs))}>
            Start my own day
          </button>
        </div>
      )}

      <main className="main">
        <section className="checkin" aria-labelledby="checkin-h">
          <div className="checkin-text">
            <h1 id="checkin-h">{state.checkedIn ? 'Today’s energy' : 'How much energy do you have today?'}</h1>
            <p>Count it in spoons. One spoon is a small task; a hard lecture might take three.</p>
          </div>
          <div className="stepper" role="group" aria-label="Spoons today">
            <button className="step" onClick={() => setBudget(state.budget - 1)} disabled={state.budget <= 0} aria-label="One spoon less">
              <Minus aria-hidden="true" />
            </button>
            <output className="step-value" aria-live="polite" aria-atomic="true">
              <span className="num">{state.budget}</span>
              <span className="step-unit">{state.budget === 1 ? 'spoon' : 'spoons'}</span>
            </output>
            <button className="step" onClick={() => setBudget(state.budget + 1)} disabled={state.budget >= MAX} aria-label="One spoon more">
              <Plus aria-hidden="true" />
            </button>
          </div>
          <p className="day-word">{dayWord(state.budget)}</p>
        </section>

        <Battery budget={state.budget} reserve={state.reserve} plan={plan} />

        {lowPower && (
          <p className="lowpower-note" role="status">
            <b>Low power day.</b> Spoons plans must-dos only and everything else waits. Resting counts as part of the plan.
          </p>
        )}

        <div className="columns">
          <section className="panel" id="plan" aria-labelledby="plan-h" tabIndex={-1}>
            <div className="panel-head">
              <h2 id="plan-h">Today’s plan</h2>
              <button className="btn btn-primary" onClick={() => setAdding((v) => !v)} aria-expanded={adding} aria-controls="add-task">
                {adding ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
                <span>{adding ? 'Close' : 'Add task'}</span>
              </button>
            </div>
            {adding && (
              <AddTask
                logs={state.logs}
                onAdd={(t) => {
                  addTask(t);
                  setState((s) => ({ ...s, example: false }));
                }}
                onClose={() => setAdding(false)}
              />
            )}
            {plan.scheduled.length === 0 ? (
              <div className="empty">
                {state.tasks.filter((t) => !t.done).length === 0 ? (
                  <p>Nothing planned yet. Add the things on your mind and Spoons will fit them to today’s energy.</p>
                ) : (
                  <p>Nothing fits in today’s spoons. That’s a plan too: rest, and see what can move or go to someone else.</p>
                )}
              </div>
            ) : (
              <ol className="plan-list">
                {plan.scheduled.map((item, i) =>
                  item.kind === 'rest' ? (
                    <li key={`rest-${i}`} className="plan-rest">
                      <Armchair aria-hidden="true" />
                      <span>Rest break before the next task</span>
                    </li>
                  ) : (
                    <PlanRow
                      key={item.task.id}
                      task={item.task}
                      cost={item.cost}
                      partial={item.partial}
                      onDone={(actual) =>
                        setState((s) => ({
                          ...markDone(s, { taskId: item.task.id, partial: item.partial, plannedCost: item.cost }, actual),
                          example: false,
                        }))
                      }
                      onRemove={() => removeTask(item.task.id)}
                    />
                  ),
                )}
              </ol>
            )}
            {done.length > 0 && (
              <details className="done-list">
                <summary>
                  Done today <span className="num">({done.length})</span>
                </summary>
                <ul>
                  {done.map((t) => (
                    <li key={t.id}>
                      <Check aria-hidden="true" />
                      <span>{t.title}</span>
                      <span className="num muted">{spoons(t.actualCost ?? t.cost)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="panel panel-overflow" aria-labelledby="overflow-h">
            <div className="panel-head">
              <h2 id="overflow-h">Didn’t fit today</h2>
            </div>
            {plan.atRisk.length + plan.help.length + plan.moved.length === 0 ? (
              <div className="empty">
                <p>Everything fits, with {spoons(Math.min(state.reserve, state.budget))} kept in reserve.</p>
              </div>
            ) : (
              <div className="overflow-groups">
                {plan.atRisk.length > 0 && (
                  <OverflowGroup
                    icon={<AlertTriangle aria-hidden="true" />}
                    kind="risk"
                    title="Must-dos at risk"
                    hint="These don’t fit and can’t be split. Ask someone for help or ask for more time."
                    tasks={plan.atRisk}
                    actions={['help', 'extension']}
                  />
                )}
                {plan.help.length > 0 && (
                  <OverflowGroup
                    icon={<HandHelping aria-hidden="true" />}
                    kind="help"
                    title="Someone could help"
                    hint="A short message is ready for each one."
                    tasks={plan.help}
                    actions={['help']}
                  />
                )}
                {plan.moved.length > 0 && (
                  <OverflowGroup
                    icon={<CalendarClock aria-hidden="true" />}
                    kind="later"
                    title="Moved to tomorrow"
                    hint="Not a failure. These are planned for another day."
                    tasks={plan.moved}
                    actions={[]}
                    splitIds={new Set(plan.scheduled.flatMap((s) => (s.kind === 'task' && s.partial ? [s.task.id] : [])))}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        <section className="newday" aria-labelledby="newday-h">
          <div>
            <h2 id="newday-h">End of the day?</h2>
            <p>Finished tasks are saved so Spoons learns what they really cost. Everything else carries over.</p>
          </div>
          <button
            className="btn btn-line"
            onClick={() => {
              setState((s) => ({ ...startNewDay(s, s.budget), checkedIn: false, example: false }));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Sunrise aria-hidden="true" />
            <span>Start tomorrow</span>
          </button>
        </section>
      </main>

      <footer className="footer">
        <p>
          Spoon theory was written by Christine Miserandino in 2003. Your tasks stay in this browser; nothing is sent
          anywhere.
        </p>
        <button className="btn-link" onClick={() => setState({ ...exampleState(), prefs: state.prefs })}>
          Load the example day
        </button>
      </footer>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </div>
  );
}

function PlanRow({
  task,
  cost,
  partial,
  onDone,
  onRemove,
}: {
  task: Task;
  cost: number;
  partial: boolean;
  onDone: (actual: number) => void;
  onRemove: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const due = dueWord(task.dueInDays);
  const groupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (asking) groupRef.current?.querySelector<HTMLButtonElement>('button[data-planned]')?.focus();
  }, [asking]);

  return (
    <li className={`plan-row prio-${task.priority}`}>
      <div className="row-main">
        <span className={`prio-pill prio-pill-${task.priority}`}>{PRIORITY_WORDS[task.priority]}</span>
        <div className="row-text">
          <span className="row-title">{task.title}</span>
          <span className="row-meta">
            {partial && (
              <span className="meta-chip">
                <Scissors aria-hidden="true" /> First part only
              </span>
            )}
            {due && <span>{due}</span>}
          </span>
        </div>
        <span className="row-cost" aria-label={spoons(cost)}>
          <span className="mini-cells" aria-hidden="true">
            {Array.from({ length: cost }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span className="num">{cost}</span>
        </span>
        {!asking && (
          <div className="row-actions">
            <button className="btn btn-done" onClick={() => setAsking(true)}>
              <Check aria-hidden="true" />
              <span>Done</span>
            </button>
            <button className="icon-btn" onClick={onRemove} aria-label={`Remove ${task.title}`}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {asking && (
        <div className="ask-cost" ref={groupRef} role="group" aria-label={`How many spoons did ${task.title} take?`}>
          <span className="ask-label">How many spoons did it really take?</span>
          <div className="cost-pick">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="cost-btn" data-planned={n === cost ? '' : undefined} onClick={() => onDone(n)}>
                <span className="num">{n}</span>
                {n === cost && <span className="cost-note">as planned</span>}
              </button>
            ))}
          </div>
          <button className="btn-link" onClick={() => setAsking(false)}>
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function OverflowGroup({
  icon,
  kind,
  title,
  hint,
  tasks,
  actions,
  splitIds,
}: {
  icon: React.ReactNode;
  kind: 'risk' | 'help' | 'later';
  title: string;
  hint: string;
  tasks: Task[];
  actions: ('help' | 'extension')[];
  splitIds?: Set<string>;
}) {
  return (
    <div className={`og og-${kind}`}>
      <h3 className="og-title">
        {icon}
        <span>{title}</span>
        <span className="og-count num">{tasks.length}</span>
      </h3>
      <p className="og-hint">{hint}</p>
      <ul className="og-list">
        {tasks.map((t) => (
          <OverflowItem key={t.id} task={t} actions={actions} remainder={splitIds?.has(t.id)} />
        ))}
      </ul>
    </div>
  );
}

function OverflowItem({ task, actions, remainder }: { task: Task; actions: ('help' | 'extension')[]; remainder?: boolean }) {
  const [open, setOpen] = useState<'help' | 'extension' | null>(null);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const message = open === 'help' ? helpMessage(task) : open === 'extension' ? extensionMessage(task) : '';

  return (
    <li className="og-item">
      <div className="og-row">
        <span className="og-name">
          {task.title}
          {remainder && <span className="muted"> · the rest</span>}
        </span>
        <span className="num muted og-cost">{spoons(task.cost)}</span>
      </div>
      {actions.length > 0 && (
        <div className="og-actions">
          {actions.includes('help') && (
            <button className="btn btn-small" aria-expanded={open === 'help'} onClick={() => { setOpen(open === 'help' ? null : 'help'); setCopied(false); }}>
              Write a help message
            </button>
          )}
          {actions.includes('extension') && (
            <button className="btn btn-small" aria-expanded={open === 'extension'} onClick={() => { setOpen(open === 'extension' ? null : 'extension'); setCopied(false); }}>
              Ask for more time
            </button>
          )}
        </div>
      )}
      {open && (
        <div className="message">
          <p ref={textRef} className="message-text">
            {message}
          </p>
          <button
            className="btn btn-small btn-primary"
            onClick={async () => setCopied(await copyText(message, textRef.current))}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Copy message'}</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? 'Message copied' : ''}
          </span>
        </div>
      )}
    </li>
  );
}

function AddTask({ logs, onAdd, onClose }: { logs: { title: string; actual: number }[]; onAdd: (t: Task) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(2);
  const [priority, setPriority] = useState<Priority>('should');
  const [due, setDue] = useState('none');
  const [splittable, setSplittable] = useState(false);
  const [helpable, setHelpable] = useState(false);
  const [error, setError] = useState('');
  const learned = title.trim() ? learnCost(logs, title) : null;
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  return (
    <form
      id="add-task"
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          setError('Give the task a short name, like “Pick up prescription”.');
          titleRef.current?.focus();
          return;
        }
        onAdd({
          id: newId(),
          title: title.trim(),
          cost,
          priority,
          dueInDays: due === 'none' ? undefined : Number(due),
          splittable,
          helpable,
        });
        setTitle('');
        setError('');
        setSplittable(false);
        setHelpable(false);
        titleRef.current?.focus();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="field">
        <label htmlFor="task-title">Task</label>
        <input
          id="task-title"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pick up prescription"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? 'task-title-error' : undefined}
        />
        {error && (
          <p id="task-title-error" className="field-error">
            {error}
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>Energy cost</legend>
        <div className="seg-control">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="seg-option">
              <input type="radio" name="cost" value={n} checked={cost === n} onChange={() => setCost(n)} />
              <span>
                <b className="num">{n}</b>
                <small>{COST_WORDS[n]}</small>
              </span>
            </label>
          ))}
        </div>
        {learned !== null && learned !== cost && (
          <p className="learned">
            Last few times, “{title.trim()}” took about {spoons(learned)}.{' '}
            <button type="button" className="btn-link" onClick={() => setCost(learned)}>
              Use {learned}
            </button>
          </p>
        )}
      </fieldset>

      <div className="field-row">
        <fieldset className="field">
          <legend>How important</legend>
          <div className="seg-control seg-control-3">
            {(['must', 'should', 'could'] as Priority[]).map((p) => (
              <label key={p} className="seg-option">
                <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
                <span>{PRIORITY_WORDS[p]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="task-due">Deadline</label>
          <select id="task-due" value={due} onChange={(e) => setDue(e.target.value)}>
            <option value="none">No deadline</option>
            <option value="0">Today</option>
            <option value="1">Tomorrow</option>
            <option value="3">In a few days</option>
            <option value="7">Next week</option>
          </select>
        </div>
      </div>

      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={splittable} onChange={(e) => setSplittable(e.target.checked)} />
          <span>Can be done in parts</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={helpable} onChange={(e) => setHelpable(e.target.checked)} />
          <span>Someone else could do it</span>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          <Plus aria-hidden="true" />
          <span>Add to today</span>
        </button>
        <button type="button" className="btn-link" onClick={onClose}>
          Done adding
        </button>
      </div>
    </form>
  );
}

function Settings({
  prefs,
  setPrefs,
  reserve,
  setReserve,
  onClose,
}: {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  reserve: number;
  setReserve: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <section id="settings" className="settings" aria-label="Display and planning settings">
      <fieldset>
        <legend>Theme</legend>
        <div className="seg-control seg-control-3">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <label key={t} className="seg-option">
              <input type="radio" name="theme" checked={prefs.theme === t} onChange={() => setPrefs({ theme: t })} />
              <span>{t === 'system' ? 'Match device' : t === 'light' ? 'Light' : 'Dark'}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={prefs.contrast === 'high'} onChange={(e) => setPrefs({ contrast: e.target.checked ? 'high' : 'normal' })} />
        <span>High contrast</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={prefs.font === 'lexend'} onChange={(e) => setPrefs({ font: e.target.checked ? 'lexend' : 'atkinson' })} />
        <span>Easier reading font (Lexend, wider spacing)</span>
      </label>
      <fieldset>
        <legend>Spoons kept in reserve</legend>
        <div className="seg-control seg-control-3">
          {[0, 1, 2].map((n) => (
            <label key={n} className="seg-option">
              <input type="radio" name="reserve" checked={reserve === n} onChange={() => setReserve(n)} />
              <span className="num">{n}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-line" onClick={onClose}>
        Close
      </button>
    </section>
  );
}
