export interface Comic {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  illustrationUrls: string[];
  notes?: string;
  createdAt: string;
}