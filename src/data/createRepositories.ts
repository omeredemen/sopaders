import { createDexieRepositories } from './dexie';
import type { Repositories } from './repositories';

/**
 * THE single place that decides which storage backend the app uses.
 *
 * To switch to Supabase later: implement `createSupabaseRepositories()` in
 * src/data/supabase/ (same `Repositories` interface) and return it here.
 */
export function createRepositories(): Repositories {
  return createDexieRepositories();
}
