import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { Comic, Album } from "./types";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { AlbumCatalog } from "./components/AlbumCatalog";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Headphones, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { fetchAlbums, fetchComics, fetchComicAudio } from "./data";
import { Button } from "./components/ui/button";
import { cn } from "@/lib/utils";
import "./App.css";

function App() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioFetching, setIsAudioFetching] = useState(false);
  const [view, setView] = useState<'catalog' | 'player'>('catalog');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Disable swipe-to-refresh during loading
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('disable-swipe-refresh');
    } else {
      document.body.classList.remove('disable-swipe-refresh');
    }
    return () => {
      document.body.classList.remove('disable-swipe-refresh');
    };
  }, [isLoading]);

  // Timer for splash screen
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingSeconds(prev => prev + 0.1);
      }, 1000 / 10);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch initial data from Supabase using robust data helpers
  const fetchData = useCallback(async (isRetry = false) => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      if (isRetry) {
        toast.info("Attempting to reconnect to database...");
      }
      
      console.log("Fetching initial data via helpers...");
      
      // Fetch in parallel using the helpers in data.ts which have internal retry and timeout handling
      const [albumsData, comicsData] = await Promise.all([
        fetchAlbums(),
        fetchComics()
      ]);

      setAlbums(albumsData);
      setComics(comicsData);
      setIsOffline(false);
      console.log("Data fetched successfully:", { albums: albumsData.length, comics: comicsData.length });
      
      if (isRetry) toast.success("Connected successfully!");
    } catch (error: any) {
      console.error("Critical error fetching data:", error);
      setIsOffline(true);
      setConnectionError(error.message || "Connection failed");
      
      // Attempt to load empty state but keep existing if any
      if (!isRetry) {
        toast.warning("Database connection issues.", {
          description: "We're having trouble connecting to the database. Showing offline content.",
          duration: 10000,
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
        });
      } else {
        toast.error("Reconnection failed: " + (error.message || "Please try again later."));
      }
    } finally {
      // Ensure loading state lasts long enough for the splash to be visible but not too long
      const minLoadTime = isFirstLoad ? 1500 : 500;
      setTimeout(() => {
         setIsLoading(false);
         setTimeout(() => setIsFirstLoad(false), 800);
      }, minLoadTime);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const accessibleAlbums = useMemo(() => {
    return albums.filter(album => {
      if (!album.isEnabled) return false;
      if (album.privacy === 'public') return true;
      if (!userEmail) return false;
      return album.invitedAccess?.some(access => 
        access.email.toLowerCase() === userEmail.toLowerCase() && access.enabled
      );
    });
  }, [albums, userEmail]);

  const [currentAlbumId, setCurrentAlbumId] = useState<string>("");

  useEffect(() => {
    if (!currentAlbumId && accessibleAlbums.length > 0 && view === 'player') {
      setCurrentAlbumId(accessibleAlbums[0].id);
    }
  }, [accessibleAlbums, currentAlbumId, view]);

  const activeComics = useMemo(() => {
    return comics.filter(c => !c.deleted && c.enabled && c.albumId === currentAlbumId);
  }, [comics, currentAlbumId]);

  const [currentComicId, setCurrentComicId] = useState<string>("");

  useEffect(() => {
    if (activeComics.length > 0) {
      const exists = activeComics.find(c => c.id === currentComicId);
      if (!exists) {
        handleComicSelect(activeComics[0]);
      }
    } else {
      setCurrentComicId("");
    }
  }, [currentAlbumId, activeComics, currentComicId]);

  const currentComic = useMemo(() => {
    return activeComics.find(c => c.id === currentComicId) || activeComics[0];
  }, [activeComics, currentComicId]);

  const currentAlbum = useMemo(() => {
    return albums.find(a => a.id === currentAlbumId);
  }, [albums, currentAlbumId]);

  const currentIndex = useMemo(() => {
    return activeComics.findIndex(c => c.id === currentComic?.id);
  }, [activeComics, currentComic]);

  const loadComicAudio = async (comicId: string) => {
    if (isOffline) return;
    try {
      setIsAudioFetching(true);
      const audioUrl = await fetchComicAudio(comicId);
      
      if (audioUrl) {
        setComics(prev => prev.map(c => 
          c.id === comicId ? { ...c, audioUrl } : c
        ));
      }
    } catch (error) {
      console.error("Error fetching audio:", error);
      if (!isOffline) toast.error("Could not load audio file");
    } finally {
      setIsAudioFetching(false);
    }
  };

  const handleComicSelect = (comic: Comic) => {
    setCurrentComicId(comic.id);
    if (!comic.audioUrl) {
      loadComicAudio(comic.id);
    }
  };

  const handleAlbumSelect = (albumId: string) => {
    setCurrentAlbumId(albumId);
    setView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextComic = () => {
    if (activeComics.length === 0) return;
    const nextIndex = (currentIndex + 1) % activeComics.length;
    handleComicSelect(activeComics[nextIndex]);
  };

  const handlePreviousComic = () => {
    if (activeComics.length === 0) return;
    const prevIndex = (currentIndex - 1 + activeComics.length) % activeComics.length;
    handleComicSelect(activeComics[prevIndex]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-50 flex flex-col font-sans">
      <AnimatePresence>
        {isFirstLoad && isLoading && (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative"
            >
              <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center text-black mb-8 transform -rotate-3">
                <Headphones className="w-10 h-10" />
              </div>
            </motion.div>
            <div className="text-center">
               <h1 className="text-2xl font-black uppercase text-white">World Open Services</h1>
               <p className="text-amber-500 font-bold tracking-widest text-xs uppercase">Dala Audio Portal</p>
               <div className="mt-4 text-white/30 text-[10px] uppercase tracking-tighter">
                  {connectionError ? "Connection Issue Detected" : `Initializing... ${loadingSeconds.toFixed(1)}s`}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar 
        onAddComic={() => {}} 
        comics={comics}
        albums={albums}
        onToggleEnable={() => {}}
        onDeleteComic={() => {}}
        onUpdateComic={() => {}}
        onReorderComic={() => {}}
        onAddAlbum={() => {}}
        onUpdateAlbum={() => {}}
        onDeleteAlbum={() => {}}
        onToggleAlbumEnable={() => {}}
        onLogoClick={() => setView('catalog')}
        currentView={view}
      />
      
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-amber-500">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3 h-3" />
            {connectionError || "Offline Mode"}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)}
            className="h-6 px-3 bg-amber-500 text-black border-none hover:bg-amber-400 font-black text-[8px] rounded-full"
          >
            <RefreshCw className={cn("w-2.5 h-2.5 mr-1.5", isLoading && "animate-spin")} />
            Retry Connection
          </Button>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row-reverse relative">
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            {view === 'catalog' ? (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <AlbumCatalog 
                  albums={accessibleAlbums} 
                  onAlbumSelect={handleAlbumSelect} 
                  isLoading={isLoading}
                />
              </motion.div>
            ) : (
              <motion.div
                key="player"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col lg:flex-row-reverse w-full h-full"
              >
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

                <div className="flex-1 relative overflow-y-auto p-3 sm:p-6 lg:p-12 bg-[#0a0a0c]">
                  <div className="max-w-4xl mx-auto w-full">
                    {activeComics.length > 0 ? (
                      <AudioPlayer 
                        currentComic={currentComic} 
                        onNextComic={handleNextComic}
                        onPreviousComic={handlePreviousComic}
                        author={currentAlbum?.author}
                        soundtrackUrl={currentAlbum?.soundtrackUrl}
                        isFetching={isAudioFetching}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 py-20">
                          <p>No episodes found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;