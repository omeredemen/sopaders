import { cleanName } from './importPlan';
import { daysBetween, isLocalDate } from './dates';
import { isValidWrongPenalty } from './net';
import type { Exam } from './types';

export type ExamFields = Pick<Exam, 'name' | 'examDate' | 'studyDeadline' | 'wrongPenalty'>;

export type ExamFieldError = 'required' | 'invalid_date' | 'deadline_after_exam' | 'invalid_penalty';
export type ExamValidationErrors = Partial<Record<keyof ExamFields, ExamFieldError>>;

/** Validates exam fields. Returns an empty object when everything is valid. */
export function validateExam(fields: ExamFields): ExamValidationErrors {
  const errors: ExamValidationErrors = {};
  if (!cleanName(fields.name)) errors.name = 'required';

  if (!fields.examDate) errors.examDate = 'required';
  else if (!isLocalDate(fields.examDate)) errors.examDate = 'invalid_date';

  if (fields.studyDeadline !== null) {
    if (!isLocalDate(fields.studyDeadline)) errors.studyDeadline = 'invalid_date';
    else if (!errors.examDate && daysBetween(fields.studyDeadline, fields.examDate) < 0) {
      errors.studyDeadline = 'deadline_after_exam';
    }
  }

  if (!isValidWrongPenalty(fields.wrongPenalty)) errors.wrongPenalty = 'invalid_penalty';
  return errors;
}

export function isExamValid(fields: ExamFields): boolean {
  return Object.keys(validateExam(fields)).length === 0;
}
