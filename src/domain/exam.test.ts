import { describe, expect, it } from 'vitest';
import { isExamValid, validateExam } from './exam';

const valid = { name: 'KPSS 2026', examDate: '2026-12-01', studyDeadline: null, wrongPenalty: 4 };

describe('validateExam', () => {
  it('accepts a valid exam', () => {
    expect(validateExam(valid)).toEqual({});
    expect(isExamValid({ ...valid, studyDeadline: '2026-11-15' })).toBe(true);
  });

  it('requires a name and exam date', () => {
    expect(validateExam({ ...valid, name: '  ', examDate: '' })).toEqual({ name: 'required', examDate: 'required' });
  });

  it('rejects invalid dates', () => {
    expect(validateExam({ ...valid, examDate: '2026-02-30' }).examDate).toBe('invalid_date');
    expect(validateExam({ ...valid, studyDeadline: 'x' }).studyDeadline).toBe('invalid_date');
  });

  it('rejects a study deadline after the exam (same day is fine)', () => {
    expect(validateExam({ ...valid, studyDeadline: '2026-12-02' }).studyDeadline).toBe('deadline_after_exam');
    expect(validateExam({ ...valid, studyDeadline: '2026-12-01' })).toEqual({});
  });

  it('rejects negative penalties', () => {
    expect(validateExam({ ...valid, wrongPenalty: -1 }).wrongPenalty).toBe('invalid_penalty');
    expect(validateExam({ ...valid, wrongPenalty: 0 })).toEqual({});
  });
});
