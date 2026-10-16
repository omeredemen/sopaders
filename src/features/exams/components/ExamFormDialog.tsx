import { useState, type FormEvent } from 'react';
import { useRepositories } from '@/data/RepositoryProvider';
import { validateExam, type ExamFields, type ExamValidationErrors } from '@/domain/exam';
import { DEFAULT_WRONG_PENALTY } from '@/domain/net';
import type { Exam } from '@/domain/types';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import { useAction } from '@/shared/hooks/useAction';
import { parseDecimal } from '@/shared/lib/format';
import { EXAM_ERROR_MESSAGES } from '../examErrors';

interface ExamFormDialogProps {
  /** Exam to edit; omit to create a new one. */
  exam?: Exam;
  onClose: () => void;
  onSaved?: (exam: Exam) => void;
}

export function ExamFormDialog({ exam, onClose, onSaved }: ExamFormDialogProps) {
  const repos = useRepositories();
  const run = useAction();
  const [name, setName] = useState(exam?.name ?? '');
  const [examDate, setExamDate] = useState(exam?.examDate ?? '');
  const [studyDeadline, setStudyDeadline] = useState(exam?.studyDeadline ?? '');
  const [penalty, setPenalty] = useState(String(exam?.wrongPenalty ?? DEFAULT_WRONG_PENALTY));
  const [errors, setErrors] = useState<ExamValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fields: ExamFields = {
      name,
      examDate,
      studyDeadline: studyDeadline || null,
      wrongPenalty: parseDecimal(penalty),
    };
    const found = validateExam(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    const saved = await run(
      () => (exam ? repos.exams.update(exam.id, fields) : repos.exams.create(fields)),
      exam ? 'Sınav güncellendi' : 'Sınav eklendi',
    );
    setSaving(false);
    if (saved) {
      onClose();
      onSaved?.(saved);
    }
  };

  const message = (field: keyof ExamFields) => {
    const code = errors[field];
    return code ? EXAM_ERROR_MESSAGES[code] : undefined;
  };

  return (
    <Modal title={exam ? 'Sınavı düzenle' : 'Yeni sınav'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormField
          label="Sınav adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ör. KPSS 2026"
          error={message('name')}
          autoFocus
        />
        <FormField
          label="Sınav tarihi"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          error={message('examDate')}
        />
        <FormField
          label="Çalışma bitiş tarihi (isteğe bağlı)"
          type="date"
          value={studyDeadline}
          onChange={(e) => setStudyDeadline(e.target.value)}
          error={message('studyDeadline')}
          hint="Konuları bitirmeyi hedeflediğin tarih. Boş bırakırsan sınav tarihi kullanılır."
        />
        <FormField
          label="Yanlış cezası"
          inputMode="decimal"
          value={penalty}
          onChange={(e) => setPenalty(e.target.value)}
          error={message('wrongPenalty')}
          hint="Kaç yanlışın bir doğruyu götürdüğü. 0 = ceza yok."
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={saving}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
