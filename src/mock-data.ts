import { Album, Comic, UserManagementRecord } from "./types";

export const MOCK_ALBUMS: Album[] = [
  {
    id: "album-1",
    title: "Origins: The Awakening",
    description: "The first collection of the Dala Chronicles, exploring the birth of the world and its early heroes.",
    coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop",
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
    coverUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop",
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
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
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
    coverUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop",
    illustrationUrls: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop"
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
    coverUrl: "https://images.unsplash.com/photo-1501854140801-50d01674aa3e?q=80&w=400&auto=format&fit=crop",
    illustrationUrls: [
      "https://images.unsplash.com/photo-1501854140801-50d01674aa3e?q=80&w=400&auto=format&fit=crop"
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
    coverUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=400&auto=format&fit=crop",
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