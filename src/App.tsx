import { useState, useMemo, useEffect } from "react";
import { Comic, Album } from "./types";
import { initialComics, initialAlbums } from "./data";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

function App() {
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [comics, setComics] = useState<Comic[]>(initialComics);
  const [userEmail, setUserEmail] = useState<string>("");

  // Filter albums based on privacy, user email, and enabled status
  const accessibleAlbums = useMemo(() => {
    return albums.filter(album => {
      // Hidden from all users if not enabled
      if (!album.isEnabled) return false;
      
      if (album.privacy === 'public') return true;
      if (!userEmail) return false;
      // Check if user has explicit enabled access
      return album.invitedAccess.some(access => 
        access.email.toLowerCase() === userEmail.toLowerCase() && access.enabled
      );
    });
  }, [albums, userEmail]);

  const [currentAlbumId, setCurrentAlbumId] = useState<string>(accessibleAlbums[0]?.id || "");

  // Ensure current album is still accessible, if not, switch to first available
  useEffect(() => {
    const isAccessible = accessibleAlbums.some(a => a.id === currentAlbumId);
    if (!isAccessible && accessibleAlbums.length > 0) {
      setCurrentAlbumId(accessibleAlbums[0].id);
    } else if (accessibleAlbums.length === 0) {
      setCurrentAlbumId("");
    }
  }, [accessibleAlbums, currentAlbumId]);

  // Filtered comics for the user view (not deleted and enabled AND part of current album)
  const activeComics = useMemo(() => {
    return comics.filter(c => !c.deleted && c.enabled && c.albumId === currentAlbumId);
  }, [comics, currentAlbumId]);

  const [currentComicId, setCurrentComicId] = useState<string>("");

  // Reset current comic when album changes
  useEffect(() => {
    if (activeComics.length > 0) {
      // Check if current comic is in activeComics
      const exists = activeComics.find(c => c.id === currentComicId);
      if (!exists) {
        setCurrentComicId(activeComics[0].id);
      }
    } else {
      setCurrentComicId("");
    }
  }, [currentAlbumId, activeComics]);

  const currentComic = useMemo(() => {
    return activeComics.find(c => c.id === currentComicId) || activeComics[0];
  }, [activeComics, currentComicId]);

  const currentIndex = useMemo(() => {
    return activeComics.findIndex(c => c.id === currentComic?.id);
  }, [activeComics, currentComic]);

  const handleComicSelect = (comic: Comic) => {
    setCurrentComicId(comic.id);
  };

  const handleAlbumSelect = (albumId: string) => {
    setCurrentAlbumId(albumId);
  };

  const handleNextComic = () => {
    if (activeComics.length === 0) return;
    const nextIndex = (currentIndex + 1) % activeComics.length;
    setCurrentComicId(activeComics[nextIndex].id);
  };

  const handlePreviousComic = () => {
    if (activeComics.length === 0) return;
    const prevIndex = (currentIndex - 1 + activeComics.length) % activeComics.length;
    setCurrentComicId(activeComics[prevIndex].id);
  };

  const handleAddComic = (newComicData: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => {
    const newComic: Comic = {
      ...newComicData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      enabled: true,
      deleted: false,
    };
    setComics([newComic, ...comics]);
    if (newComic.albumId === currentAlbumId) {
       setCurrentComicId(newComic.id);
    }
  };

  const handleToggleEnable = (id: string) => {
    setComics(prev => prev.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleDeleteComic = (id: string) => {
    setComics(prev => prev.map(c => 
      c.id === id ? { ...c, deleted: true } : c
    ));
  };

  const handleUpdateComic = (id: string, updates: Partial<Comic>) => {
    setComics(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const handleReorderComic = (id: string, direction: 'up' | 'down') => {
    setComics(prev => {
      // Find the comic to move
      const comicToMove = prev.find(c => c.id === id);
      if (!comicToMove) return prev;

      // Filter comics in the same album
      const sameAlbumComics = prev.filter(c => c.albumId === comicToMove.albumId && !c.deleted);
      const visibleIndex = sameAlbumComics.findIndex(c => c.id === id);
      
      const targetVisibleIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;
      if (targetVisibleIndex < 0 || targetVisibleIndex >= sameAlbumComics.length) return prev;

      const neighborId = sameAlbumComics[targetVisibleIndex].id;
      
      const newComics = [...prev];
      const indexA = newComics.findIndex(c => c.id === id);
      const indexB = newComics.findIndex(c => c.id === neighborId);
      
      [newComics[indexA], newComics[indexB]] = [newComics[indexB], newComics[indexA]];
      
      return newComics;
    });
  };

  const handleAddAlbum = (album: Omit<Album, "id" | "createdAt" | "isEnabled">) => {
    const newAlbum: Album = {
      ...album,
      id: `album-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isEnabled: true,
    };
    setAlbums([...albums, newAlbum]);
  };

  const handleUpdateAlbum = (id: string, updates: Partial<Album>) => {
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleToggleAlbumEnable = (id: string) => {
    setAlbums(prev => prev.map(a => 
      a.id === id ? { ...a, isEnabled: !a.isEnabled } : a
    ));
  };

  const handleDeleteAlbum = (id: string) => {
    if (albums.length <= 1) return; // Prevent deleting last album
    setAlbums(prev => prev.filter(a => a.id !== id));
    if (currentAlbumId === id) {
      setCurrentAlbumId(albums.find(a => a.id !== id)?.id || "");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-50 flex flex-col font-sans">
      <Navbar 
        onAddComic={handleAddComic} 
        comics={comics}
        albums={albums}
        onToggleEnable={handleToggleEnable}
        onDeleteComic={handleDeleteComic}
        onUpdateComic={handleUpdateComic}
        onReorderComic={handleReorderComic}
        onAddAlbum={handleAddAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        onDeleteAlbum={handleDeleteAlbum}
        onToggleAlbumEnable={handleToggleAlbumEnable}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Player Area */}
        <div className="flex-1 relative overflow-y-auto lg:h-[calc(100vh-80px)] p-6 lg:p-12">
          <div className="max-w-4xl mx-auto w-full">
            {activeComics.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentComic?.id || 'none'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <AudioPlayer 
                    currentComic={currentComic} 
                    onNextComic={handleNextComic}
                    onPreviousComic={handlePreviousComic}
                  />
                  
                  <div className="mt-12">
                    <h2 className="text-xl font-bold mb-4 opacity-50 uppercase tracking-widest text-xs">Description</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none">
                      <p className="text-lg leading-relaxed text-slate-300">
                        {currentComic.notes || "This Dala comic takes you on a journey through vibrant soundscapes and captivating narration. Immerse yourself in the story as every detail comes to life through the power of audio storytelling."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 py-32">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                       <img src={albums.find(a => a.id === currentAlbumId)?.coverUrl} className="w-12 h-12 rounded-full opacity-20" alt="" />
                    </motion.div>
                  </div>
                  <p className="text-lg font-medium">No episodes in this album yet.</p>
                  <p className="text-sm">Select another album or upload some comics!</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Subtle Background Glow */}
          <div className="fixed top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        </div>

        {/* Sidebar */}
        <ComicSidebar 
          albums={accessibleAlbums}
          currentAlbumId={currentAlbumId}
          onAlbumSelect={handleAlbumSelect}
          comics={activeComics} 
          currentComicId={currentComic?.id || ""}
          onComicSelect={handleComicSelect}
          userEmail={userEmail}
          onSetUserEmail={setUserEmail}
        />
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;