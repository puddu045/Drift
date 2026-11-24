import { api } from '@/lib/api';
import { Thought } from '@/features/thoughts/api';

export function getTodayDestiny() {
  return api.get<Thought>('/destiny/today');
}
