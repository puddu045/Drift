import { api } from '@/lib/api';

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
};

export type UpsertProfileInput = {
  displayName: string;
  username: string;
  bio?: string;
  country?: string;
  relationshipIntent?: RelationshipIntent;
};

export function getOwnProfile() {
  return api.get<Profile>('/profiles/me');
}

export function upsertOwnProfile(input: UpsertProfileInput) {
  return api.patch<Profile>('/profiles/me', input);
}
