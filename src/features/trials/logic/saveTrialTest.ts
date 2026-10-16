import { REVIEW_TOPIC_STATUS_ID } from '@/config/topicStatuses';
import { NotFoundError, type Repositories, type TrialTestInput, type TrialTestWithTopics } from '@/data/repositories';
import { topicsToMarkForReview } from '@/domain/trials';
import type { Id } from '@/domain/types';

export interface SaveTrialTestResult {
  test: TrialTestWithTopics;
  /** How many topics were set to "needs review" by this save. */
  markedForReview: number;
}

/**
 * Creates or updates a trial test, then sets its newly selected wrong topics
 * to "needs review". Spans two repositories, so it lives here rather than in either.
 */
export async function saveTrialTest(
  repos: Pick<Repositories, 'trialTests' | 'topics'>,
  input: TrialTestInput,
  existingId?: Id,
): Promise<SaveTrialTestResult> {
  let previousWrongTopicIds: Id[] = [];
  let test: TrialTestWithTopics;

  if (existingId) {
    const previous = await repos.trialTests.get(existingId);
    if (!previous) throw new NotFoundError('TrialTest', existingId);
    previousWrongTopicIds = previous.wrongTopicIds;
    const { examId: _examId, ...patch } = input;
    test = await repos.trialTests.update(existingId, patch);
  } else {
    test = await repos.trialTests.create(input);
  }

  const toMark = topicsToMarkForReview(previousWrongTopicIds, test.wrongTopicIds);
  await repos.topics.setStatus(toMark, REVIEW_TOPIC_STATUS_ID);
  return { test, markedForReview: toMark.length };
}
