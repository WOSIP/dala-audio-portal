import { useState, useMemo } from "react";
import { Comic } from "./types";
import { initialComics } from "./data";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

function App() {
  const [comics, setComics] = useState<Comic[]>(initialComics);

  // Filtered comics for the user view (not deleted and enabled)
  const activeComics = useMemo(() => {
    return comics.filter(c => !c.deleted && c.enabled);
  }, [comics]);

  const [currentComicId, setCurrentComicId] = useState<string>(activeComics[0]?.id || "");

  const currentComic = useMemo(() => {
    return activeComics.find(c => c.id === currentComicId) || activeComics[0];
  }, [activeComics, currentComicId]);

  const currentIndex = useMemo(() => {
    return activeComics.findIndex(c => c.id === currentComic?.id);
  }, [activeComics, currentComic]);

  const handleComicSelect = (comic: Comic) => {
    setCurrentComicId(comic.id);
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
    setCurrentComicId(newComic.id);
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
      const visibleComics = prev.filter(c => !c.deleted);
      const visibleIndex = visibleComics.findIndex(c => c.id === id);
      if (visibleIndex === -1) return prev;

      const targetVisibleIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;
      if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleComics.length) return prev;

      const neighborId = visibleComics[targetVisibleIndex].id;
      
      const newComics = [...prev];
      const indexA = newComics.findIndex(c => c.id === id);
      const indexB = newComics.findIndex(c => c.id === neighborId);
      
      [newComics[indexA], newComics[indexB]] = [newComics[indexB], newComics[indexA]];
      
      return newComics;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-50 flex flex-col font-sans">
      <Navbar 
        onAddComic={handleAddComic} 
        comics={comics}
        onToggleEnable={handleToggleEnable}
        onDeleteComic={handleDeleteComic}
        onUpdateComic={handleUpdateComic}
        onReorderComic={handleReorderComic}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Player Area */}
        <div className="flex-1 relative overflow-y-auto lg:h-[calc(100vh-80px)] p-6 lg:p-12">
          <div className="max-w-4xl mx-auto w-full">
            {activeComics.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentComic.id}
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
              <div className="h-full flex items-center justify-center text-slate-500">
                <p>No episodes available at the moment.</p>
              </div>
            )}
          </div>
          
          {/* Subtle Background Glow */}
          <div className="fixed top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        </div>

        {/* Sidebar */}
        <ComicSidebar 
          comics={activeComics} 
          currentComicId={currentComic?.id || ""}
          onComicSelect={handleComicSelect}
        />
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;