import { useMemo } from 'react';
import { Link } from 'react-router';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { netSeriesByLesson, netStats, type NetPoint } from '@/domain/trials';
import type { Exam, Lesson } from '@/domain/types';
import { formatDate, formatNet, formatShortDate, formatSignedNet } from '@/shared/lib/format';
import { useTrialTests } from '../hooks/useTrialTests';

/** Single-series line color (one series per chart, so no legend is needed). */
const LINE_COLOR = '#2563eb';

interface ChartPoint extends NetPoint {
  label: string;
}

function NetTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: ChartPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold tabular-nums">{formatNet(point.net)} net</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(point.date)}</p>
    </div>
  );
}

function LessonNetChart({ lessonName, points }: { lessonName: string; points: NetPoint[] }) {
  const stats = netStats(points);
  const data: ChartPoint[] = points.map((p) => ({ ...p, label: formatShortDate(p.date) }));
  if (!stats) return null;

  return (
    <div className="chart rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium">{lessonName}</h3>
        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{stats.count} deneme</span>
      </div>
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatNet(stats.last)}</span> son net
        {stats.change !== null && (
          <span className="ml-2 tabular-nums">
            ({stats.change > 0 ? '▲' : stats.change < 0 ? '▼' : '='} {formatSignedNet(stats.change)})
          </span>
        )}
      </p>
      <div className="h-36" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} fontSize={11} />
            <YAxis width={32} tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} domain={['auto', 'auto']} />
            <Tooltip content={NetTooltip} cursor={{ className: 'chart-cursor' }} isAnimationActive={false} />
            <Line
              type="linear"
              dataKey="net"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 2, className: 'chart-dot' }}
              activeDot={{ r: 6, fill: LINE_COLOR, strokeWidth: 2, className: 'chart-dot' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Values without hovering: */}
      <p className="mt-2 text-xs text-slate-500 tabular-nums dark:text-slate-400">
        Ortalama {formatNet(stats.average)} · En iyi {formatNet(stats.best)}
      </p>
    </div>
  );
}

/** Net trend per lesson (small multiples), for lessons that have at least one trial test. */
export function NetTrendCharts({ exam, lessons }: { exam: Exam; lessons: Lesson[] }) {
  const { data: tests = [] } = useTrialTests(exam.id);
  const series = useMemo(() => netSeriesByLesson(tests, exam.wrongPenalty), [tests, exam.wrongPenalty]);
  const withTests = lessons.filter((l) => (series.get(l.id)?.length ?? 0) > 0);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Net gelişimi</h2>
        <Link to={`/trials/${exam.id}`} className="text-sm font-medium text-brand-600 dark:text-blue-400">
          Denemeler
        </Link>
      </div>
      {withTests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Henüz deneme yok.{' '}
          <Link to={`/trials/${exam.id}/new`} className="font-medium text-brand-600 underline dark:text-blue-400">
            Deneme ekle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {withTests.map((lesson) => (
            <LessonNetChart key={lesson.id} lessonName={lesson.name} points={series.get(lesson.id) ?? []} />
          ))}
        </div>
      )}
    </section>
  );
}
