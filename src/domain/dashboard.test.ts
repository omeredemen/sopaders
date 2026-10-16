import { describe, expect, it } from 'vitest';
import { buildExamDashboard } from './dashboard';

const lessons = [
  { id: 'tr', name: 'Türkçe' },
  { id: 'th', name: 'Tarih' },
];

const topics = [
  { lessonId: 'tr', status: 'finished' },
  { lessonId: 'tr', status: 'started' },
  { lessonId: 'tr', status: 'needs_review' },
  { lessonId: 'th', status: 'not_started' },
  { lessonId: 'th', status: 'finished' },
];

describe('buildExamDashboard', () => {
  it('uses the study deadline for pace when set', () => {
    const d = buildExamDashboard({ examDate: '2026-12-06', studyDeadline: '2026-10-25' }, lessons, topics, '2026-10-15');
    expect(d.daysToExam).toBe(52);
    expect(d.deadline).toBe('2026-10-25');
    expect(d.deadlineIsExamDate).toBe(false);
    expect(d.daysToDeadline).toBe(10);
    // 3 unfinished (started, needs_review, not_started) over 10 days
    expect(d.pace).toEqual({ kind: 'pace', unfinished: 3, daysLeft: 10, perDay: 0.3 });
  });

  it('falls back to the exam date without a study deadline', () => {
    const d = buildExamDashboard({ examDate: '2026-10-21', studyDeadline: null }, lessons, topics, '2026-10-15');
    expect(d.deadline).toBe('2026-10-21');
    expect(d.deadlineIsExamDate).toBe(true);
    expect(d.pace).toEqual({ kind: 'pace', unfinished: 3, daysLeft: 6, perDay: 0.5 });
  });

  it('summarizes overall and per lesson', () => {
    const d = buildExamDashboard({ examDate: '2026-12-06', studyDeadline: null }, lessons, topics, '2026-10-15');
    expect(d.overall.total).toBe(5);
    expect(d.overall.done).toBe(2);
    expect(d.lessons.map((l) => [l.lessonName, l.summary.done, l.summary.total])).toEqual([
      ['Türkçe', 1, 3],
      ['Tarih', 1, 2],
    ]);
  });

  it('reports overdue once the deadline has passed', () => {
    const d = buildExamDashboard({ examDate: '2026-12-06', studyDeadline: '2026-10-10' }, lessons, topics, '2026-10-15');
    expect(d.pace).toEqual({ kind: 'overdue', unfinished: 3, daysOverdue: 5 });
  });

  it('handles an exam with no topics', () => {
    const d = buildExamDashboard({ examDate: '2026-12-06', studyDeadline: null }, [], [], '2026-10-15');
    expect(d.overall.total).toBe(0);
    expect(d.pace).toEqual({ kind: 'done' });
    expect(d.lessons).toEqual([]);
  });
});
