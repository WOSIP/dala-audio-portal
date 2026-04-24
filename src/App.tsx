import { useState, useMemo, useEffect } from "react";
import { Comic, Album } from "./types";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabase";
import { toast } from "sonner";
import "./App.css";

function App() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select('*, album_invitations(*)');
        
        if (albumsError) throw albumsError;

        const mappedAlbums: Album[] = (albumsData || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || "",
          coverUrl: a.cover_url || "",
          createdAt: a.created_at,
          privacy: a.privacy,
          isEnabled: a.is_enabled,
          invitedAccess: (a.album_invitations || []).map((i: any) => ({
            email: i.email,
            enabled: i.enabled
          }))
        }));
        setAlbums(mappedAlbums);

        const { data: comicsData, error: comicsError } = await supabase
          .from('comics')
          .select('*')
          .order('created_at', { ascending: false });

        if (comicsError) throw comicsError;

        const mappedComics: Comic[] = (comicsData || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          audioUrl: c.audio_url || "",
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
        setComics(mappedComics);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data from database");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const [currentAlbumId, setCurrentAlbumId] = useState<string>("");

  // Set initial album ID once loaded
  useEffect(() => {
    if (!currentAlbumId && accessibleAlbums.length > 0) {
      setCurrentAlbumId(accessibleAlbums[0].id);
    }
  }, [accessibleAlbums, currentAlbumId]);

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
  }, [currentAlbumId, activeComics, currentComicId]);

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

  const handleAddComic = async (newComicData: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => {
    try {
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
          album_id: newComicData.albumId,
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
         setCurrentComicId(newComic.id);
      }
      toast.success("Comic added to database");
    } catch (error: any) {
      console.error("Error adding comic:", error);
      toast.error("Failed to save comic");
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
        c.id === id ? { ...c, enabled: !c.enabled } : c
      ));
    } catch (error) {
      console.error("Error updating comic:", error);
      toast.error("Failed to update comic status");
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
      toast.success("Comic marked as deleted");
    } catch (error) {
      console.error("Error deleting comic:", error);
      toast.error("Failed to delete comic");
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
      if (updates.albumId !== undefined) dbUpdates.album_id = updates.albumId;
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
      toast.error("Failed to update comic");
    }
  };

  const handleReorderComic = (id: string, direction: 'up' | 'down') => {
    // This part is local-only unless we have an 'order' column in DB
    // For now, let's keep it local as requested, or implement order if needed
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
          privacy: album.privacy,
          is_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Handle invitedAccess if provided during creation
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
      if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('albums')
          .update(dbUpdates)
          .eq('id', id);
        if (error) throw error;
      }

      // Handle invitedAccess sync
      if (updates.invitedAccess !== undefined) {
        // Simple sync: delete all and re-insert
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
    if (albums.length <= 1) return;
    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlbums(prev => prev.filter(a => a.id !== id));
      if (currentAlbumId === id) {
        setCurrentAlbumId(albums.find(a => a.id !== id)?.id || "");
      }
      toast.success("Album deleted from database");
    } catch (error) {
      console.error("Error deleting album:", error);
      toast.error("Failed to delete album");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium">Loading Dala Portal...</p>
        </div>
      </div>
    );
  }

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