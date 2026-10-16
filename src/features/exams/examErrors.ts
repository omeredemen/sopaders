import type { ExamFieldError } from '@/domain/exam';

export const EXAM_ERROR_MESSAGES: Record<ExamFieldError, string> = {
  required: 'Bu alan zorunlu.',
  invalid_date: 'Geçerli bir tarih girin.',
  deadline_after_exam: 'Çalışma bitiş tarihi sınav tarihinden sonra olamaz.',
  invalid_penalty: '0 veya daha büyük bir sayı girin.',
};
