/**
 * Robustly extracts a streamable audio URL from various source formats.
 * Handles major cloud providers and direct file links.
 */
export const extractAudioUrl = (url: string): string => {
  if (!url) return "";

  // Clean the URL
  const cleanUrl = url.trim();

  // 1. Handle Dropbox
  // Converts https://www.dropbox.com/s/xyz/file.mp3?dl=0 to https://www.dropbox.com/s/xyz/file.mp3?raw=1
  if (cleanUrl.includes("dropbox.com")) {
    let result = cleanUrl.split("?")[0]; // Get the base URL
    return `${result}?raw=1`;
  }

  // 2. Handle Google Drive
  // Converts https://drive.google.com/file/d/ID/view to https://drive.google.com/uc?export=download&id=ID
  const gdriveRegex = /(?:https?:\/\/)?(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=))([\w-]+)/;
  const gdriveMatch = cleanUrl.match(gdriveRegex);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
  }

  // 3. Handle OneDrive
  // Shared links often need a 'download=1' or similar parameter
  if (cleanUrl.includes("1drv.ms") || cleanUrl.includes("onedrive.live.com")) {
    if (cleanUrl.includes("?")) {
      return cleanUrl.includes("download=1") ? cleanUrl : `${cleanUrl}&download=1`;
    }
    return `${cleanUrl}?download=1`;
  }

  // 4. Handle Box.com
  if (cleanUrl.includes("box.com/s/")) {
    return cleanUrl.endsWith("/") ? `${cleanUrl}download` : `${cleanUrl}/download`;
  }

  // 5. Handle Direct Links or common audio extensions
  const audioRegex = /\.(mp3|wav|m4a|aac|ogg|flac|webm|opus)(\?.*)?$/i;
  if (audioRegex.test(cleanUrl)) {
    return cleanUrl;
  }

  // 6. Handle Dala Magic Bundle Patterns (Mock logic for internal testing)
  if (cleanUrl.includes("dala-audio-bundle-import.com")) {
    const slug = cleanUrl.split("/").pop() || "default";
    const samples: Record<string, string> = {
      "dala-legend-audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      "echoes-audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      "warrior-audio": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    };
    return samples[slug] || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";
  }

  // 7. Handle YouTube
  if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
    return cleanUrl;
  }

  return cleanUrl;
};