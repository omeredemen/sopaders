import { useState } from 'react';
import { normalizeName } from '@/domain/importPlan';
import type { Id, Topic } from '@/domain/types';
import { StatusChip } from '@/features/topics/components/StatusChip';
import { Icon } from '@/shared/components/Icon';

interface WrongTopicPickerProps {
  topics: Topic[];
  selected: ReadonlySet<Id>;
  onToggle: (topicId: Id) => void;
}

/** Multi-select list of a lesson's topics, with a filter box for long lists. */
export function WrongTopicPicker({ topics, selected, onToggle }: WrongTopicPickerProps) {
  const [filter, setFilter] = useState('');
  const key = normalizeName(filter);
  const visible = key ? topics.filter((t) => normalizeName(t.name).includes(key)) : topics;

  if (topics.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Bu derste konu yok.</p>;
  }

  return (
    <div>
      {topics.length > 8 && (
        <input
          type="search"
          aria-label="Konu ara"
          placeholder="Konu ara…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-600 dark:border-slate-700 dark:bg-slate-950"
        />
      )}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((topic) => {
          const isSelected = selected.has(topic.id);
          return (
            <li key={topic.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => onToggle(topic.id)}
                className="flex min-h-12 w-full items-center gap-3 px-1 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  aria-hidden
                >
                  {isSelected && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">{topic.name}</span>
                <StatusChip status={topic.status} />
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="py-2 text-sm text-slate-500">Eşleşen konu yok.</li>}
      </ul>
    </div>
  );
}
