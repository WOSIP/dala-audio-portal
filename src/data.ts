import { Comic, Album } from "./types";

export const initialAlbums: Album[] = [
  {
    id: "album-1",
    title: "Ancient Legends",
    description: "Chronicles of the old world and its mysteries.",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/ancient-legends-album-cover-ada44d30-1777021745809.webp",
    createdAt: new Date().toISOString(),
    privacy: 'public',
    invitedAccess: [],
    isEnabled: true,
  },
  {
    id: "album-2",
    title: "Modern Chronicles",
    description: "The evolution of the realm in the digital age.",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/modern-chronicles-album-cover-decd9b10-1777021745384.webp",
    createdAt: new Date().toISOString(),
    privacy: 'private',
    invitedAccess: [{ email: "user@example.com", enabled: true }],
    isEnabled: true,
  }
];

export const initialComics: Comic[] = [
  {
    id: "1",
    title: "The Legend of Dala",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/the-legend-of-dala-0a1857ec-1777005229575.webp",
    illustrationUrls: [
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/the-legend-of-dala---page-1-238eacfb-1777005702556.webp",
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/the-legend-of-dala---page-2-5e5fa702-1777005702259.webp",
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/the-legend-of-dala---page-3-93dfe84e-1777005704177.webp"
    ],
    notes: "The beginning of an epic journey through the ancient lands.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    audioImportLink: "https://dala-audio-bundle-import.com/dala-legend-audio",
    illustrationImportLink: "https://dala-audio-bundle-import.com/dala-legend-art",
    albumId: "album-1"
  },
  {
    id: "2",
    title: "Echoes of the Ancestors",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/echoes-of-the-ancestors-8579a730-1777005230820.webp",
    illustrationUrls: [
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/echoes-of-the-ancestors---page-1-c7e64154-1777005702793.webp",
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/echoes-of-the-ancestors---page-2-9f9b4942-1777005703064.webp"
    ],
    notes: "Listen to the voices of those who came before us.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    audioImportLink: "https://dala-audio-bundle-import.com/echoes-audio",
    illustrationImportLink: "https://dala-audio-bundle-import.com/echoes-art",
    albumId: "album-1"
  },
  {
    id: "3",
    title: "Path of the Warrior",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/path-of-the-warrior-04f10032-1777005230941.webp",
    illustrationUrls: [
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/path-of-the-warrior---page-1-a4685c16-1777005702193.webp",
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/path-of-the-warrior---page-2-e2356339-1777005702853.webp"
    ],
    notes: "A story of courage, honor, and the strength of the spirit.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    audioImportLink: "https://dala-audio-bundle-import.com/warrior-audio",
    illustrationImportLink: "https://dala-audio-bundle-import.com/warrior-art",
    albumId: "album-2"
  }
];