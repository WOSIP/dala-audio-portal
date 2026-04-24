import { useState, useMemo, useEffect } from "react";
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
  const [currentComic, setCurrentComic] = useState<Comic>(initialComics[0]);
  const [currentIllustrationIndex, setCurrentIllustrationIndex] = useState(0);

  const currentIndex = useMemo(() => {
    return comics.findIndex(c => c.id === currentComic.id);
  }, [comics, currentComic]);

  // Reset page index when switching comics
  useEffect(() => {
    setCurrentIllustrationIndex(0);
  }, [currentComic.id]);

  const handleComicSelect = (comic: Comic) => {
    setCurrentComic(comic);
  };

  const handleNextPage = () => {
    const pages = currentComic.illustrationUrls.length > 0 
      ? currentComic.illustrationUrls 
      : [currentComic.coverUrl];
    setCurrentIllustrationIndex((prev) => (prev + 1) % pages.length);
  };

  const handlePreviousPage = () => {
    const pages = currentComic.illustrationUrls.length > 0 
      ? currentComic.illustrationUrls 
      : [currentComic.coverUrl];
    setCurrentIllustrationIndex((prev) => (prev - 1 + pages.length) % pages.length);
  };

  const handleAddComic = (newComicData: Omit<Comic, "id" | "createdAt">) => {
    const newComic: Comic = {
      ...newComicData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setComics([newComic, ...comics]);
    setCurrentComic(newComic);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-50 flex flex-col font-sans">
      <Navbar onAddComic={handleAddComic} />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Player Area */}
        <div className="flex-1 relative overflow-y-auto lg:h-[calc(100vh-80px)] p-6 lg:p-12">
          <div className="max-w-4xl mx-auto w-full">
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
                  currentIllustrationIndex={currentIllustrationIndex}
                  onNextPage={handleNextPage}
                  onPreviousPage={handlePreviousPage}
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
          </div>
          
          {/* Subtle Background Glow */}
          <div className="fixed top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        </div>

        {/* Sidebar */}
        <ComicSidebar 
          comics={comics} 
          currentComicId={currentComic.id}
          onComicSelect={handleComicSelect}
        />
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;