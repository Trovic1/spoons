import type { Plan } from '../engine/plan';

interface Props {
  budget: number;
  reserve: number;
  plan: Plan;
}

type Seg = { key: string; kind: 'spent' | 'must' | 'should' | 'could' | 'free' | 'reserve'; span: number; label?: string };

export function Battery({ budget, reserve, plan }: Props) {
  const spent = Math.min(plan.spent, budget);
  const left = Math.max(0, budget - spent);
  const reserveCells = Math.min(reserve, left);
  const free = Math.max(0, plan.usable - plan.used);

  const segs: Seg[] = [];
  if (spent > 0) segs.push({ key: 'spent', kind: 'spent', span: spent, label: 'Used' });
  for (const item of plan.scheduled) {
    if (item.kind !== 'task') continue;
    segs.push({ key: item.task.id, kind: item.task.priority, span: item.cost, label: item.task.title });
  }
  if (free > 0) segs.push({ key: 'free', kind: 'free', span: free });
  if (reserveCells > 0) segs.push({ key: 'reserve', kind: 'reserve', span: reserveCells, label: 'Reserve' });

  const overflow = [
    ...plan.atRisk.map((t) => ({ id: t.id, title: t.title, tag: 'At risk', kind: 'risk' })),
    ...plan.help.map((t) => ({ id: t.id, title: t.title, tag: 'Ask for help', kind: 'help' })),
    ...plan.moved.map((t) => ({ id: t.id + '-m', title: t.title, tag: 'Tomorrow', kind: 'later' })),
  ];

  const summary =
    budget === 0
      ? 'Battery empty. No spoons today.'
      : `Battery: ${budget} spoons. ${spent} used, ${plan.used} planned, ${free} free, ${reserveCells} in reserve. ${overflow.length} tasks did not fit.`;

  return (
    <figure className="battery-figure">
      <div className="battery-row">
        <div className="battery" role="img" aria-label={summary}>
          <div className="battery-cells">
            {budget === 0 ? (
              <span className="battery-empty">No spoons today. Rest is the plan.</span>
            ) : (
              segs.map((s) => (
                <div
                  key={s.key}
                  className={`seg seg-${s.kind}`}
                  style={{ flexGrow: s.span }}
                  title={s.label ? `${s.label}: ${s.span} ${s.span === 1 ? 'spoon' : 'spoons'}` : undefined}
                >
                  {Array.from({ length: s.span }, (_, i) => (
                    <span key={i} className="cell-tick" />
                  ))}
                  {s.label && <span className={`seg-label${s.span === 1 ? ' seg-label-1' : ''}`}>{s.label}</span>}
                </div>
              ))
            )}
          </div>
          <div className="battery-tip" />
        </div>
        {overflow.length > 0 && (
          <ul className="spill" aria-hidden="true">
            {overflow.slice(0, 4).map((o) => (
              <li key={o.id} className={`spill-chip spill-${o.kind}`}>
                <span className="spill-title">{o.title}</span>
                <span className="spill-tag">{o.tag}</span>
              </li>
            ))}
            {overflow.length > 4 && <li className="spill-more">+{overflow.length - 4} more</li>}
          </ul>
        )}
      </div>
      <figcaption className="battery-caption">
        <span>
          <b className="num">{plan.used}</b> of <b className="num">{budget}</b> planned
        </span>
        {plan.spent > 0 && (
          <span>
            <b className="num">{plan.spent}</b> used so far
          </span>
        )}
        <span>
          <b className="num">{reserveCells}</b> kept in reserve
        </span>
        {plan.spent > 0 && (
          <span className="battery-level">
            <b className="num">{left}</b> {left === 1 ? 'spoon' : 'spoons'} left today
          </span>
        )}
        {plan.overBy > 0 && (
          <span className="caption-risk">
            Must-dos over by <b className="num">{plan.overBy}</b>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
