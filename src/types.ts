export interface InvitedAccess {
  email: string;
  enabled: boolean;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  createdAt: string;
  privacy: 'public' | 'private';
  invitedAccess: InvitedAccess[];
  isEnabled: boolean;
  owner_id?: string;
}

export interface Comic {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  illustrationUrls: string[];
  notes?: string;
  createdAt: string;
  enabled: boolean;
  deleted: boolean;
  audioImportLink?: string;
  illustrationImportLink?: string;
  albumId: string;
}

export type AudioTrackImport = {
  audioUrl: string;
  message: string;
};

export type IllustrationPartImport = {
  coverUrl: string;
  illustrationUrls: string[];
  message: string;
};

export type AppRole = 'superadmin' | 'role3' | 'role2' | 'role1' | 'viewer';

export interface UserRole {
  id: string;
  userId: string;
  role: AppRole;
  email?: string; // Joined from auth.users or profiles
}

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}