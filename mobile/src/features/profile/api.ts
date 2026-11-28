import { setPreferredLanguage } from '@/i18n/localeStore';
import { setCached } from '@/lib/prefetchCache';
import { api } from '@/lib/api';
import { MoodId } from '@/theme';

export type RelationshipIntent = 'friendship' | 'romance' | 'open' | 'just_sharing';

export type Profile = {
  userId: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  bio: string | null;
  country: string | null;
  relationshipIntent: RelationshipIntent;
  createdAt: string;
  updatedAt: string;
  showIdentityOnContent: boolean;
  preferredLanguage: string | null;
};

export type UpsertProfileInput = {
  displayName: string;
  username: string;
  bio?: string;
  country?: string;
  relationshipIntent?: RelationshipIntent;
  photoUrl?: string;
};

export function getOwnProfile() {
  return api.get<Profile>('/profiles/me').then(profile => {
    setCached('profile:' + profile.userId, profile);
    setPreferredLanguage(profile.preferredLanguage);
    return profile;
  });
}

export function upsertOwnProfile(input: UpsertProfileInput) {
  return api.patch<Profile>('/profiles/me', input);
}

export type PublicProfile = {
  userId: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  bio: string | null;
  relationshipIntent: RelationshipIntent;
  country: string | null;
  interests: string[];
};

export function getPublicProfile(userId: string) {
  return api.get<PublicProfile>(`/profiles/${userId}`);
}

export type AuthoredThought = { id: string; text: string; mood: MoodId; createdAt: string };

export function getPublicThoughtsByAuthor(userId: string) {
  return api.get<AuthoredThought[]>(`/profiles/${userId}/thoughts`);
}

export type UpdatePreferencesInput = {
  showIdentityOnContent?: boolean;
  showCountry?: boolean;
  showActivity?: boolean;
  discoverable?: boolean;
  allowConnectionRequests?: boolean;
  /** A language code (e.g. "en", "pt") to translate thoughts, replies and
   * bios into, or null to turn translation off. */
  preferredLanguage?: string | null;
};

export function updatePreferences(input: UpdatePreferencesInput) {
  if (input.preferredLanguage !== undefined) {
    setPreferredLanguage(input.preferredLanguage);
  }
  return api.patch<void>('/profiles/me/preferences', input);
}

export type Interest = { id: string; name: string };

export function listInterests() {
  return api.get<Interest[]>('/interests');
}

export function getMyInterestIds() {
  return api.get<string[]>('/profiles/me/interests');
}

export function setMyInterests(interestIds: string[]) {
  return api.put<void>('/profiles/me/interests', { interestIds });
}

export type Translation = { translatedText: string; language: string };

/** On-demand only — a "Translate" tap on a profile's bio, never automatic. */
export function translateBio(userId: string) {
  return api.post<Translation>(`/profiles/${userId}/translate-bio`);
}

export type TranslationUsage = { used: number; limit: number };

/** How much of today's shared translate quota (thoughts, replies, bios —
 * one pool) the current user has used. */
export function getTranslationUsage() {
  return api.get<TranslationUsage>('/profiles/me/translation-usage');
}
