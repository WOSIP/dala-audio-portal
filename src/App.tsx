import { useState, useMemo, useEffect } from "react";
import { Comic, Album } from "./types";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { AlbumCatalog } from "./components/AlbumCatalog";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabase";
import { toast } from "sonner";
import { Headphones, Clock } from "lucide-react";
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
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch initial data from Supabase in parallel
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching initial data...");
        // Fetch albums and comics in parallel
        // Optimization: Do NOT fetch audio_url initially to speed up portal load
        const [albumsResponse, comicsResponse] = await Promise.all([
          supabase.from('albums').select('*, album_invitations(*)'),
          supabase.from('comics')
            .select('id, title, cover_url, illustration_urls, notes, created_at, enabled, deleted, audio_import_link, illustration_import_link, album_id')
            .order('created_at', { ascending: false })
        ]);

        if (albumsResponse.error) {
          console.error("Albums fetch error:", albumsResponse.error);
          throw albumsResponse.error;
        }
        if (comicsResponse.error) {
          console.error("Comics fetch error:", comicsResponse.error);
          throw comicsResponse.error;
        }

        const albumsData = albumsResponse.data || [];
        const comicsData = comicsResponse.data || [];

        // Fetch profiles for the albums
        const ownerIds = Array.from(new Set(albumsData.map((a: any) => a.owner_id))).filter(Boolean);
        
        let profilesMap: Record<string, any> = {};
        if (ownerIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', ownerIds);

          if (profilesError) {
             console.warn("Could not fetch profiles:", profilesError);
          } else {
            profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        const mappedAlbums: Album[] = albumsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || "",
          coverUrl: a.cover_url || "",
          soundtrackUrl: a.soundtrack_url || "",
          createdAt: a.created_at,
          privacy: a.privacy,
          isEnabled: a.is_enabled,
          author: profilesMap[a.owner_id] ? {
            name: profilesMap[a.owner_id].full_name || "Unknown Author",
            avatarUrl: profilesMap[a.owner_id].avatar_url
          } : {
            name: "Gebeya Dala",
            avatarUrl: ""
          },
          invitedAccess: (a.album_invitations || []).map((i: any) => ({
            email: i.email,
            enabled: i.enabled
          }))
        }));

        const mappedComics: Comic[] = comicsData.map((c: any) => ({
          id: c.id,
          title: c.title,
          audioUrl: undefined, // Lazy loaded
          coverUrl: c.cover_url || "",
          illustrationUrls: c.illustration_urls || [],
          notes: c.notes || "",
          createdAt: c.created_at,
          enabled: c.enabled,
          deleted: c.deleted,
          audioImportLink: c.audio_import_link || "",
          illustrationImportLink: c.illustration_import_link || "",
          albumId: c.album_id
        }));

        setAlbums(mappedAlbums);
        setComics(mappedComics);
        console.log("Data fetched successfully:", { albums: mappedAlbums.length, comics: mappedComics.length });
      } catch (error: any) {
        console.error("Critical error fetching data:", error);
        toast.error("Failed to load data from database: " + (error.message || "Unknown error"));
      } finally {
        // Small delay to ensure minimum splash duration if it's too fast
        setTimeout(() => {
           setIsLoading(false);
           setTimeout(() => setIsFirstLoad(false), 800);
        }, 1000);
      }
    };

    fetchData();
  }, []);

  const accessibleAlbums = useMemo(() => {
    return albums.filter(album => {
      if (!album.isEnabled) return false;
      if (album.privacy === 'public') return true;
      if (!userEmail) return false;
      return album.invitedAccess.some(access => 
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

  useEffect(() => {
    if (view === 'player') {
      const isAccessible = accessibleAlbums.some(a => a.id === currentAlbumId);
      if (!isAccessible && accessibleAlbums.length > 0) {
        setCurrentAlbumId(accessibleAlbums[0].id);
      } else if (accessibleAlbums.length === 0) {
        setCurrentAlbumId("");
      }
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
        // When switching albums, we should select the first comic
        // handleComicSelect will be called which will fetch the audio
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

  const fetchComicAudio = async (comicId: string) => {
    try {
      setIsAudioFetching(true);
      const { data, error } = await supabase
        .from('comics')
        .select('audio_url')
        .eq('id', comicId)
        .single();
      
      if (error) throw error;
      
      if (data?.audio_url) {
        setComics(prev => prev.map(c => 
          c.id === comicId ? { ...c, audioUrl: data.audio_url } : c
        ));
      }
    } catch (error) {
      console.error("Error fetching audio:", error);
      toast.error("Could not load audio file");
    } finally {
      setIsAudioFetching(false);
    }
  };

  const handleComicSelect = (comic: Comic) => {
    setCurrentComicId(comic.id);
    if (!comic.audioUrl) {
      fetchComicAudio(comic.id);
    }
  };

  const handleAlbumSelect = (albumId: string) => {
    setCurrentAlbumId(albumId);
    setView('player');
    // Scroll to top when switching to player on mobile
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

  const handleAddComic = async (newComicData: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => {
    try {
      // Validate album_id before insert - ensure it's a valid UUID or null
      const albumId = (newComicData.albumId && newComicData.albumId.length > 0) ? newComicData.albumId : null;

      const { data, error } = await supabase
        .from('comics')
        .insert([{
          title: newComicData.title,
          audio_url: newComicData.audioUrl,
          cover_url: newComicData.coverUrl,
          illustration_urls: newComicData.illustrationUrls,
          notes: newComicData.notes,
          audio_import_link: newComicData.audioImportLink,
          illustration_import_link: newComicData.illustrationImportLink,
          album_id: albumId,
          enabled: true,
          deleted: false
        }])
        .select()
        .single();

      if (error) throw error;

      const newComic: Comic = {
        ...newComicData,
        id: data.id,
        createdAt: data.created_at,
        enabled: data.enabled,
        deleted: data.deleted,
      };

      setComics(prev => [newComic, ...prev]);
      if (newComic.albumId === currentAlbumId) {
         handleComicSelect(newComic);
      }
      toast.success("Episode added to database");
    } catch (error: any) {
      console.error("Error adding comic:", error);
      toast.error("Failed to save episode: " + (error.message || "Unknown error"));
    }
  };

  const handleToggleEnable = async (id: string) => {
    const comic = comics.find(c => c.id === id);
    if (!comic) return;

    try {
      const { error } = await supabase
        .from('comics')
        .update({ enabled: !comic.enabled })
        .eq('id', id);

      if (error) throw error;

      setComics(prev => prev.map(c => 
        c.id === id ? { ...c, enabled: !comic.enabled } : c
      ));
    } catch (error) {
      console.error("Error updating comic:", error);
      toast.error("Failed to update episode status");
    }
  };

  const handleDeleteComic = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comics')
        .update({ deleted: true })
        .eq('id', id);

      if (error) throw error;

      setComics(prev => prev.map(c => 
        c.id === id ? { ...c, deleted: true } : c
      ));
      toast.success("Episode marked as deleted");
    } catch (error) {
      console.error("Error deleting comic:", error);
      toast.error("Failed to delete episode");
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
      if (updates.albumId !== undefined) dbUpdates.album_id = (updates.albumId && updates.albumId.length > 0) ? updates.albumId : null;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.deleted !== undefined) dbUpdates.deleted = updates.deleted;

      const { error } = await supabase
        .from('comics')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setComics(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));
    } catch (error) {
      console.error("Error updating comic:", error);
      toast.error("Failed to update episode");
    }
  };

  const handleReorderComic = (id: string, direction: 'up' | 'down') => {
    setComics(prev => {
      const comicToMove = prev.find(c => c.id === id);
      if (!comicToMove) return prev;
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

  const handleAddAlbum = async (album: Omit<Album, "id" | "createdAt" | "isEnabled">) => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .insert([{
          title: album.title,
          description: album.description,
          cover_url: album.coverUrl,
          soundtrack_url: album.soundtrackUrl,
          privacy: album.privacy,
          is_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;

      if (album.invitedAccess && album.invitedAccess.length > 0) {
        const { error: invError } = await supabase
          .from('album_invitations')
          .insert(album.invitedAccess.map(i => ({
            album_id: data.id,
            email: i.email,
            enabled: i.enabled
          })));
        if (invError) throw invError;
      }

      const newAlbum: Album = {
        ...album,
        id: data.id,
        createdAt: data.created_at,
        isEnabled: data.is_enabled,
        invitedAccess: album.invitedAccess || []
      };
      setAlbums([...albums, newAlbum]);
      toast.success("Album created in database");
    } catch (error: any) {
      console.error("Error adding album:", error);
      toast.error(error.message || "Failed to create album");
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

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('albums')
          .update(dbUpdates)
          .eq('id', id);
        if (error) throw error;
      }

      if (updates.invitedAccess !== undefined) {
        await supabase.from('album_invitations').delete().eq('album_id', id);
        if (updates.invitedAccess.length > 0) {
          const { error: invError } = await supabase
            .from('album_invitations')
            .insert(updates.invitedAccess.map(i => ({
              album_id: id,
              email: i.email,
              enabled: i.enabled
            })));
          if (invError) throw invError;
        }
      }

      setAlbums(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (error: any) {
      console.error("Error updating album:", error);
      toast.error(error.message || "Failed to update album");
    }
  };

  const handleToggleAlbumEnable = async (id: string) => {
    const album = albums.find(a => a.id === id);
    if (!album) return;
    handleUpdateAlbum(id, { isEnabled: !album.isEnabled });
  };

  const handleDeleteAlbum = async (id: string) => {
    try {
      // Step 1: Perform the deletion in the database
      // The ON DELETE CASCADE constraint in the DB will handle related comics and invitations
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Step 2: Update local state for albums
      const updatedAlbums = albums.filter(a => a.id !== id);
      setAlbums(updatedAlbums);

      // Step 3: Update local state for comics (sync with DB cascade)
      setComics(prev => prev.filter(c => c.albumId !== id));

      // Step 4: Handle active album navigation
      if (currentAlbumId === id) {
        if (updatedAlbums.length > 0) {
          setCurrentAlbumId(updatedAlbums[0].id);
        } else {
          setCurrentAlbumId("");
          setView('catalog');
        }
      }
      
      toast.success("Album and all related content deleted");
    } catch (error: any) {
      console.error("Error deleting album:", error);
      toast.error(error.message || "Failed to delete album");
    }
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
              transition={{ 
                duration: 1.2, 
                ease: "easeOut",
                scale: { type: "spring", damping: 15 }
              }}
              className="relative"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-500 rounded-2xl sm:rounded-3xl flex items-center justify-center text-black shadow-[0_0_50px_rgba(245,158,11,0.3)] mb-8 transform -rotate-3">
                <Headphones className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-center space-y-3 sm:space-y-4"
            >
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase text-white px-6">World Open Services</h1>
                <p className="text-amber-500 font-bold tracking-[0.3em] uppercase text-[10px] sm:text-xs">Dala Audio Portal</p>
              </div>

              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="flex items-center gap-2 text-white/30 font-mono text-[9px] sm:text-[10px] tracking-widest uppercase">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500/50" />
                  <span>Initializing System... {loadingSeconds.toFixed(1)}s</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        onLogoClick={() => setView('catalog')}
        currentView={view}
      />
      
      <main className="flex-1 flex flex-col lg:flex-row-reverse relative">
        <AnimatePresence mode="wait">
          {view === 'catalog' ? (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
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
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 flex flex-col lg:flex-row-reverse w-full h-full"
            >
              {/* Sidebar - Moved to Right (lg:flex-row-reverse) */}
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

              {/* Main Player Area */}
              <div className="flex-1 relative overflow-y-auto lg:h-[calc(100vh-80px)] p-3 sm:p-6 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#0a0a0c]">
                <div className="max-w-4xl mx-auto w-full">
                  {activeComics.length > 0 ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentComic?.id || 'none'}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <AudioPlayer 
                          currentComic={currentComic} 
                          onNextComic={handleNextComic}
                          onPreviousComic={handlePreviousComic}
                          author={currentAlbum?.author}
                          soundtrackUrl={currentAlbum?.soundtrackUrl}
                          isFetching={isAudioFetching}
                        />
                        
                        <div className="mt-6 sm:mt-12">
                          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 opacity-50 uppercase tracking-widest text-[9px] sm:text-xs">Description</h2>
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 prose prose-invert max-w-none">
                            <p className="text-sm sm:text-lg leading-relaxed text-slate-400">
                              {currentComic.notes || "This Dala comic takes you on a journey through vibrant soundscapes and captivating narration. Immerse yourself in the story as every detail comes to life through the power of audio storytelling."}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 py-20 sm:py-32">
                      <div className="text-center space-y-4 px-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          >
                             <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-slate-800" />
                          </motion.div>
                        </div>
                        <p className="text-base sm:text-lg font-medium text-slate-400">No episodes in this album.</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Subtle Background Glow */}
                <div className="fixed top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-amber-500/10 rounded-full blur-[80px] sm:blur-[120px] -z-10 pointer-events-none" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;