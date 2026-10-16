import { TOPIC_STATUSES } from '@/config/topicStatuses';
import { getTopicStatus } from '@/domain/statuses';

interface StatusSelectProps {
  value: string;
  onChange: (status: string) => void;
  label: string;
}

/** Pick any status directly (native select: good on mobile). */
export function StatusSelect({ value, onChange, label }: StatusSelectProps) {
  return (
    <select
      aria-label={label}
      value={getTopicStatus(value).id}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
    >
      {TOPIC_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
