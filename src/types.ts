export interface InvitedAccess {
  email: string;
  enabled: boolean;
}

export interface Author {
  name: string;
  avatarUrl?: string;
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
  author?: Author;
}

export interface Comic {
  id: string;
  title: string;
  audioUrl: string;
  soundtrackUrl?: string;
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

export type AppRole = 'admin' | 'editor' | 'viewer' | 'superadmin' | 'moderator' | 'user' | 'role1' | 'role2' | 'role3';

export interface UserRole {
  id: string;
  userId: string;
  role: AppRole;
  email?: string; // Joined from auth.users or profiles
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isEnabled: boolean;
  createdAt: string;
  password_hash?: string;
}

export interface UserManagementRecord extends UserProfile {
  role: AppRole;
  userId: string;
}