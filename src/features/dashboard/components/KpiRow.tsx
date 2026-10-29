import type { ExamDashboard } from '@/domain/dashboard';
import { StatTile } from '@/shared/components/StatTile';
import { formatDate, formatDaysLeft, formatDecimal, formatPercent } from '@/shared/lib/format';

function PaceTile({ dashboard }: { dashboard: ExamDashboard }) {
  const { pace, overall } = dashboard;
  if (overall.total === 0) {
    return <StatTile label="Gereken tempo" value="—" detail="Henüz konu eklenmedi." />;
  }
  switch (pace.kind) {
    case 'done':
      return <StatTile label="Gereken tempo" value="Tamam" detail="Tüm konular bitti." />;
    case 'overdue':
      return (
        <StatTile
          label="Gereken tempo"
          value="Süre doldu"
          detail={`${pace.unfinished} konu kaldı · hedef ${pace.daysOverdue} gün önceydi`}
        />
      );
    case 'pace':
      return (
        <StatTile
          label="Gereken tempo"
          value={formatDecimal(pace.perDay)}
          unit="konu/gün"
          detail={`${pace.unfinished} bitmemiş konu · ${pace.daysLeft === 0 ? 'son gün bugün' : `${pace.daysLeft} gün`}`}
        />
      );
  }
}

function TempoTile({ dashboard }: { dashboard: ExamDashboard }) {
  const { tempo, overall } = dashboard;
  const label = 'Gerçek tempon';
  if (overall.total === 0) {
    return <StatTile label={label} value="—" detail="Henüz konu eklenmedi." />;
  }
  if (tempo.kind === 'notStarted') {
    return (
      <StatTile
        label={label}
        value="Başlamadı"
        detail={`Başlangıç: ${tempo.daysToStart === 1 ? 'yarın' : `${tempo.daysToStart} gün sonra`}`}
      />
    );
  }
  const { projection } = tempo;
  const summary = `${tempo.done} konu · ${tempo.daysStudied} günde`;
  let outlook: string;
  switch (projection.kind) {
    case 'done':
      outlook = 'Tüm konular bitti.';
      break;
    case 'none':
      outlook = 'Bitiş tahmini için bir konu bitir.';
      break;
    case 'finish':
      outlook = `Bu tempoyla bitiş: ${formatDate(projection.date)} · ${projection.onTrack ? 'hedefe yetişiyor' : 'hedefin gerisinde'}`;
      break;
  }
  return (
    <StatTile
      label={label}
      value={formatDecimal(tempo.perDay)}
      unit="konu/gün"
      detail={
        <>
          {summary}
          <br />
          {outlook}
        </>
      }
    />
  );
}

/** Headline tiles: required pace, actual tempo, target date, finished share. */
export function KpiRow({ dashboard }: { dashboard: ExamDashboard }) {
  const { overall, deadline, deadlineIsExamDate, daysToDeadline } = dashboard;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 grid sm:col-span-1">
        <PaceTile dashboard={dashboard} />
      </div>
      <div className="col-span-2 grid sm:col-span-1">
        <TempoTile dashboard={dashboard} />
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
