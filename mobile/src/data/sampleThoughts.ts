// SAMPLE DATA — for local prototyping of the Universe screen only.
// None of this represents a real user, real activity, or real location.
// Replace with real API data in Phase 2 (see /DEVELOPMENT_PLAN.md).

import { MoodId } from '@/theme';

export type SampleThought = {
  id: string;
  text: string;
  mood: MoodId;
};

export const sampleThoughts: SampleThought[] = [
  { id: '1', text: 'Do you ever miss someone you’ve never met?', mood: 'deep' },
  { id: '2', text: 'Some songs feel like memories.', mood: 'reflective' },
  { id: '3', text: 'I wonder if someone is thinking about me right now.', mood: 'lonely' },
  { id: '4', text: 'Today I finally felt happy after a long time.', mood: 'happy' },
  {
    id: '5',
    text: 'Does anyone else want to disappear into a new city for a while?',
    mood: 'curious',
  },
  { id: '6', text: 'I hope wherever you are, you feel a little less alone tonight.', mood: 'love' },
  { id: '7', text: 'Started over today. Scared, but hopeful.', mood: 'hopeful' },
  { id: '8', text: 'Three AM thoughts hit differently.', mood: 'random' },
  { id: '9', text: 'I keep a list of things I want to tell someone, someday.', mood: 'deep' },
  { id: '10', text: 'The sky looked like it was healing tonight.', mood: 'reflective' },
  { id: '11', text: 'Maybe being okay alone is its own kind of brave.', mood: 'hopeful' },
  { id: '12', text: 'I laughed so hard today I forgot to be sad.', mood: 'happy' },
];
