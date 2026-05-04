import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { Comic, Album } from "./types";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { AlbumCatalog } from "./components/AlbumCatalog";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones } from "lucide-react";
import { fetchAlbums, fetchComics, fetchComicAudio } from "./data";
import { supabase } from "./lib/supabase";
import { toast } from "sonner";
import "./App.css";

function App() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isComicsLoading, setIsComicsLoading] = useState(false);
  const [isAudioFetching, setIsAudioFetching] = useState(false);
  const [view, setView] = useState<'catalog' | 'player'>('catalog');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  // Timer for splash screen
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingSeconds(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Disable swipe-to-refresh during loading
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('disable-swipe-refresh');
    } else {
      document.body.classList.remove('disable-swipe-refresh');
    }
  }, [isLoading]);

  // Fetch initial data - Sequential loading strategy
  const fetchData = useCallback(async () => {
    try {
      // Step 1: Load albums first to allow portal entry
      const albumsData = await fetchAlbums();
      setAlbums(albumsData || []);
      
      // Release initial loading state once albums are ready
      // This shows the catalog to the user immediately
      const minTime = isFirstLoad ? 1200 : 300;
      setTimeout(() => {
        setIsLoading(false);
        if (isFirstLoad) {
          setTimeout(() => setIsFirstLoad(false), 800);
        }
      }, minTime);

      // Step 2: Load comic metadata in background
      setIsComicsLoading(true);
      const comicsData = await fetchComics();
      setComics(comicsData || []);
      setIsComicsLoading(false);
      
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to connect to database. Please check your connection.");
      setIsLoading(false);
      setIsComicsLoading(false);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Admin Operations
  const handleAddComic = async (newComic: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => {
    try {
      const { error } = await supabase
        .from('comics')
        .insert([{
          album_id: newComic.albumId,
          title: newComic.title,
          audio_url: newComic.audioUrl,
          cover_url: newComic.coverUrl,
          illustration_urls: newComic.illustrationUrls,
          notes: newComic.notes,
          audio_import_link: newComic.audioImportLink,
          illustration_import_link: newComic.illustrationImportLink,
          enabled: true,
          deleted: false
        }]);

      if (error) throw error;
      
      toast.success("Episode published successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to publish episode: " + error.message);
    }
  };

  const handleUpdateComic = async (id: string, updates: Partial<Comic>) => {
    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.audioUrl !== undefined) dbUpdates.audio_url = updates.audioUrl;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
      if (updates.illustrationUrls !== undefined) dbUpdates.illustration_urls = updates.illustrationUrls;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.deleted !== undefined) dbUpdates.deleted = updates.deleted;

      const { error } = await supabase
        .from('comics')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      toast.success("Episode updated!");
      fetchData();
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    }
  };

  const handleDeleteComic = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comics')
        .update({ deleted: true })
        .eq('id', id);

      if (error) throw error;
      toast.success("Episode removed.");
      fetchData();
    } catch (error: any) {
      toast.error("Removal failed: " + error.message);
    }
  };

  const handleAddAlbum = async (newAlbum: Omit<Album, "id" | "createdAt" | "isEnabled">) => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .insert([{
          title: newAlbum.title,
          description: newAlbum.description,
          cover_url: newAlbum.coverUrl,
          soundtrack_url: newAlbum.soundtrackUrl,
          privacy: newAlbum.privacy,
          is_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      if (newAlbum.invitedAccess && newAlbum.invitedAccess.length > 0) {
        await supabase.from('album_invitations').insert(
          newAlbum.invitedAccess.map(inv => ({
            album_id: data.id,
            email: inv.email,
            enabled: inv.enabled
          }))
        );
      }

      toast.success("Album created successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to create album: " + error.message);
    }
  };

  const handleUpdateAlbum = async (id: string, updates: Partial<Album>) => {
    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
      if (updates.soundtrackUrl !== undefined) dbUpdates.soundtrack_url = updates.soundtrackUrl;
      if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

      const { error } = await supabase
        .from('albums')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      toast.success("Album updated!");
      fetchData();
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    }
  };

  const accessibleAlbums = useMemo(() => {
    if (!albums || albums.length === 0) return [];
    return albums.filter(album => {
      if (!album) return false;
      if (!album.isEnabled) return false;
      if (album.privacy === 'public') return true;
      if (!userEmail) return false;
      return album.invitedAccess?.some(access => 
        access?.email?.toLowerCase() === userEmail.toLowerCase() && access.enabled
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
    if (!comics || !currentAlbumId) return [];
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
    } finally {
      setIsAudioFetching(false);
    }
  };

  const handleComicSelect = (comic: Comic) => {
    if (!comic) return;
    setCurrentComicId(comic.id);
    // Step 3: Lazy load audio ONLY when a specific comic is selected
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
                  {`Initializing... ${loadingSeconds.toFixed(1)}s`}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar 
        onAddComic={handleAddComic} 
        comics={comics}
        albums={albums}
        onToggleEnable={(id) => handleUpdateComic(id, { enabled: !comics.find(c => c.id === id)?.enabled })}
        onDeleteComic={handleDeleteComic}
        onDeleteAlbum={(id) => handleUpdateAlbum(id, { isEnabled: false })}
        onToggleAlbumEnable={(id) => handleUpdateAlbum(id, { isEnabled: !albums.find(a => a.id === id)?.isEnabled })}
        onUpdateComic={handleUpdateComic}
        onReorderComic={() => {}}
        onAddAlbum={handleAddAlbum}
        onUpdateAlbum={handleUpdateAlbum}
        onLogoClick={() => setView('catalog')}
        currentView={view}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row-reverse relative">
        <Suspense fallback={<div className="flex-1 bg-[#0a0a0c]" />}>
          <AnimatePresence mode="wait">
            {view === 'catalog' ? (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full flex flex-col"
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
                  isLoading={isComicsLoading}
                />

                <div className="flex-1 relative overflow-y-auto p-3 sm:p-6 lg:p-12 bg-[#0a0a0c]">
                  <div className="max-w-4xl mx-auto w-full">
                    {activeComics.length > 0 ? (
                      <AudioPlayer 
                        currentComic={currentComic!} 
                        onNextComic={handleNextComic}
                        onPreviousComic={handlePreviousComic}
                        author={currentAlbum?.author}
                        soundtrackUrl={currentAlbum?.soundtrackUrl}
                        isFetching={isAudioFetching}
                      />
                    ) : isComicsLoading ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20 gap-4">
                          <Headphones className="w-10 h-10 text-amber-500/20 animate-pulse" />
                          <p className="text-xs font-black uppercase tracking-widest">Loading Episodes...</p>
                       </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 py-20">
                          <p>No episodes found for this collection.</p>
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