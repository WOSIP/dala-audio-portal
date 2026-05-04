import { Album, Comic, UserManagementRecord } from "./types";

export const MOCK_ALBUMS: Album[] = [
  {
    id: "album-1",
    title: "Origins: The Awakening",
    description: "The first collection of the Dala Chronicles, exploring the birth of the world and its early heroes.",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/sci-fi-comic-cover-1-bb02b43c-1777744882889.webp",
    soundtrackUrl: "",
    createdAt: new Date().toISOString(),
    privacy: "public",
    invitedAccess: [],
    isEnabled: true,
    author: {
      name: "Gebeya Dala",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gebeya"
    }
  },
  {
    id: "album-2",
    title: "The Silent Forest",
    description: "Enter a world where nature speaks and shadows whisper secrets of the ancient past.",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/fantasy-comic-cover-1-962acda0-1777744886345.webp",
    soundtrackUrl: "",
    createdAt: new Date().toISOString(),
    privacy: "public",
    invitedAccess: [],
    isEnabled: true,
    author: {
      name: "Dala Creator",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dala"
    }
  },
  {
    id: "album-3",
    title: "Celestial Echoes",
    description: "A private collection of cosmic stories and starlit journeys.",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/cyberpunk-comic-cover-1-07b46395-1777744882488.webp",
    soundtrackUrl: "",
    createdAt: new Date().toISOString(),
    privacy: "private",
    invitedAccess: [{ email: "demo@example.com", enabled: true }],
    isEnabled: true,
    author: {
      name: "Astra",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Astra"
    }
  }
];

export const MOCK_COMICS: Comic[] = [
  {
    id: "comic-1",
    title: "Episode 1: The First Breath",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/sci-fi-comic-cover-1-bb02b43c-1777744882889.webp",
    illustrationUrls: [
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/sci-fi-comic-cover-1-bb02b43c-1777744882889.webp",
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/retro-comic-cover-1-b8656d7d-1777744883217.webp"
    ],
    notes: "In the beginning, there was only silence. Then came the first breath of the creator.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    albumId: "album-1"
  },
  {
    id: "comic-2",
    title: "Episode 2: Shadows Rising",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/fantasy-comic-cover-1-962acda0-1777744886345.webp",
    illustrationUrls: [
      "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/fantasy-comic-cover-1-962acda0-1777744886345.webp"
    ],
    notes: "As the light grew, so did the shadows. A new threat emerges from the depths.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    albumId: "album-1"
  },
  {
    id: "comic-3",
    title: "The Whispering Leaves",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverUrl: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/cyberpunk-comic-cover-1-07b46395-1777744882488.webp",
    illustrationUrls: [],
    notes: "Listen closely to the wind. The forest has a story to tell those who dare to hear.",
    createdAt: new Date().toISOString(),
    enabled: true,
    deleted: false,
    albumId: "album-2"
  }
];

export const MOCK_USERS: UserManagementRecord[] = [
  {
    id: "user-1",
    userId: "user-1",
    email: "admin@example.com",
    name: "System Admin",
    role: "admin",
    isEnabled: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "user-2",
    userId: "user-2",
    email: "editor@example.com",
    name: "Content Editor",
    role: "editor",
    isEnabled: true,
    createdAt: new Date().toISOString()
  }
];