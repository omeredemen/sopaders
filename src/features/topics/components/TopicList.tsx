import { useState } from 'react';
import { getTopicStatus, nextTopicStatus } from '@/domain/statuses';
import type { Id, Topic } from '@/domain/types';
import { IconButton } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EditableName } from '@/shared/components/EditableName';
import { Icon } from '@/shared/components/Icon';
import { InlineAddForm } from '@/shared/components/InlineAddForm';
import { useTopicActions } from '../hooks/useTopicActions';
import { StatusChip } from './StatusChip';
import { StatusSelect } from './StatusSelect';

interface TopicListProps {
  lessonId: Id;
  /** Topics of this lesson, in display order. */
  topics: Topic[];
  /** Edit mode shows reorder, rename, status picker and delete controls. */
  editing: boolean;
}

export function TopicList({ lessonId, topics, editing }: TopicListProps) {
  const actions = useTopicActions();
  const [toDelete, setToDelete] = useState<Topic | null>(null);

  return (
    <div>
      {topics.length === 0 ? (
        <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">Bu derste henüz konu yok.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {topics.map((topic, index) =>
            editing ? (
              <li key={topic.id} className="flex flex-wrap items-center gap-1 py-1.5">
                <IconButton aria-label="Yukarı taşı" disabled={index === 0} onClick={() => actions.move(topics, index, -1)}>
                  <Icon name="arrowUp" className="h-4 w-4" />
                </IconButton>
                <IconButton
                  aria-label="Aşağı taşı"
                  disabled={index === topics.length - 1}
                  onClick={() => actions.move(topics, index, 1)}
                >
                  <Icon name="arrowDown" className="h-4 w-4" />
                </IconButton>
                <EditableName
                  label="Konu adı"
                  value={topic.name}
                  onSave={(name) => actions.rename(topic, name)}
                  className="basis-40"
                />
                {/* Wraps onto its own line on narrow screens. */}
                <div className="ml-auto flex items-center gap-1">
                  <StatusSelect
                    label={`${topic.name} durumu`}
                    value={topic.status}
                    onChange={(status) => actions.setStatus(topic, status)}
                  />
                  <IconButton aria-label="Konuyu sil" onClick={() => setToDelete(topic)} className="hover:text-red-600">
                    <Icon name="trash" className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            ) : (
              <li key={topic.id}>
                <button
                  type="button"
                  onClick={() => actions.cycleStatus(topic)}
                  aria-label={`${topic.name}: ${getTopicStatus(topic.status).label}. Dokun: ${nextTopicStatus(topic.status).label}`}
                  className="flex min-h-12 w-full items-center gap-3 rounded-md px-1 py-2 text-left hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800"
                >
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      getTopicStatus(topic.status).countsAsDone ? 'text-slate-500 line-through dark:text-slate-500' : ''
                    }`}
                  >
                    {topic.name}
                  </span>
                  <StatusChip status={topic.status} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="mt-2">
        <InlineAddForm label="Konu ekle" placeholder="Yeni konu adı" onAdd={(name) => actions.add(lessonId, name)} />
      </div>
      {toDelete && (
        <ConfirmDialog
          title="Konuyu sil"
          message={`"${toDelete.name}" silinsin mi? Deneme kayıtlarındaki yanlış konu işaretleri de kaldırılır.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            actions.remove(toDelete);
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
