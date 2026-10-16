import type { ExamDashboard } from '@/domain/dashboard';
import { StatTile } from '@/shared/components/StatTile';
import { formatDate, formatDaysLeft, formatDecimal, formatPercent } from '@/shared/lib/format';

function PaceTile({ dashboard }: { dashboard: ExamDashboard }) {
  const { pace, overall } = dashboard;
  if (overall.total === 0) {
    return <StatTile label="Günlük tempo" value="—" detail="Henüz konu eklenmedi." />;
  }
  switch (pace.kind) {
    case 'done':
      return <StatTile label="Günlük tempo" value="Tamam" detail="Tüm konular bitti." />;
    case 'overdue':
      return (
        <StatTile
          label="Günlük tempo"
          value="Süre doldu"
          detail={`${pace.unfinished} konu kaldı · hedef ${pace.daysOverdue} gün önceydi`}
        />
      );
    case 'pace':
      return (
        <StatTile
          label="Günlük tempo"
          value={formatDecimal(pace.perDay)}
          unit="konu/gün"
          detail={`${pace.unfinished} bitmemiş konu · ${pace.daysLeft === 0 ? 'son gün bugün' : `${pace.daysLeft} gün`}`}
        />
      );
  }
}

/** Headline tiles: daily pace, target date, finished share. */
export function KpiRow({ dashboard }: { dashboard: ExamDashboard }) {
  const { overall, deadline, deadlineIsExamDate, daysToDeadline } = dashboard;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 grid sm:col-span-1">
        <PaceTile dashboard={dashboard} />
      </div>
      <StatTile
        label={deadlineIsExamDate ? 'Hedef tarih (sınav günü)' : 'Çalışma bitişi'}
        value={formatDaysLeft(daysToDeadline)}
        detail={deadlineIsExamDate ? 'Çalışma bitiş tarihi girilmedi.' : formatDate(deadline)}
      />
      <StatTile
        label="Biten konular"
        value={formatPercent(overall.donePercent)}
        detail={`${overall.done} / ${overall.total} konu`}
      />
    </div>
  );
}
