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