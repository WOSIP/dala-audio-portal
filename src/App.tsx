import { useState, useMemo, useEffect } from "react";
import { Comic, Album } from "./types";
import { AudioPlayer } from "./components/AudioPlayer";
import { ComicSidebar } from "./components/ComicSidebar";
import { Navbar } from "./components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabase";
import { toast } from "sonner";
import { Music } from "lucide-react";
import { useIsMobile } from "./hooks/use-mobile";
import { cn } from "@/lib/utils";
import "./App.css";

function App() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select('*, album_invitations(*)');
        
        if (albumsError) throw albumsError;

        const ownerIds = Array.from(new Set((albumsData || []).map((a: any) => a.owner_id)));
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds);

        const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const mappedAlbums: Album[] = (albumsData || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || "",
          coverUrl: a.cover_url || "",
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
        setAlbums(mappedAlbums);

        const { data: comicsData, error: comicsError } = await supabase
          .from('comics')
          .select('*')
          .order('display_order', { ascending: true });

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
          albumId: c.album_id,
          displayOrder: c.display_order || 0
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
    if (!currentAlbumId && accessibleAlbums.length > 0) {
      setCurrentAlbumId(accessibleAlbums[0].id);
    }
  }, [accessibleAlbums, currentAlbumId]);

  useEffect(() => {
    const isAccessible = accessibleAlbums.some(a => a.id === currentAlbumId);
    if (!isAccessible && accessibleAlbums.length > 0) {
      setCurrentAlbumId(accessibleAlbums[0].id);
    } else if (accessibleAlbums.length === 0) {
      setCurrentAlbumId("");
    }
  }, [accessibleAlbums, currentAlbumId]);

  const activeComics = useMemo(() => {
    return comics.filter(c => !c.deleted && c.enabled && c.albumId === currentAlbumId);
  }, [comics, currentAlbumId]);

  const [currentComicId, setCurrentComicId] = useState<string>("");

  useEffect(() => {
    if (activeComics.length > 0) {
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

  const currentAlbum = useMemo(() => {
    return albums.find(a => a.id === currentAlbumId);
  }, [albums, currentAlbumId]);

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

  const handleAddComic = async (newComicData: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted" | "displayOrder">) => {
    try {
      const albumComics = comics.filter(c => c.albumId === newComicData.albumId);
      const nextOrder = albumComics.length > 0 
        ? Math.max(...albumComics.map(c => c.displayOrder)) + 1 
        : 1;

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
          deleted: false,
          display_order: nextOrder
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
        displayOrder: data.display_order
      };

      setComics(prev => [...prev, newComic].sort((a, b) => a.displayOrder - b.displayOrder));
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
        c.id === id ? { ...c, enabled: !comic.enabled } : c
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
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('comics')
          .update(dbUpdates)
          .eq('id', id);
        if (error) throw error;
      }

      setComics(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));
    } catch (error) {
      console.error("Error updating comic:", error);
      toast.error("Failed to update comic");
    }
  };

  const handleReorderComic = async (id: string, direction: 'up' | 'down') => {
    const comicToMove = comics.find(c => c.id === id);
    if (!comicToMove) return;

    const sameAlbumComics = comics
      .filter(c => c.albumId === comicToMove.albumId && !c.deleted)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const visibleIndex = sameAlbumComics.findIndex(c => c.id === id);
    const targetVisibleIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;

    if (targetVisibleIndex < 0 || targetVisibleIndex >= sameAlbumComics.length) return;

    const neighborComic = sameAlbumComics[targetVisibleIndex];

    try {
      const orderA = comicToMove.displayOrder;
      const orderB = neighborComic.displayOrder;

      const { error: error1 } = await supabase
        .from('comics')
        .update({ display_order: orderB })
        .eq('id', comicToMove.id);

      const { error: error2 } = await supabase
        .from('comics')
        .update({ display_order: orderA })
        .eq('id', neighborComic.id);

      if (error1 || error2) throw new Error("Failed to update order in database");

      setComics(prev => prev.map(c => {
        if (c.id === comicToMove.id) return { ...c, displayOrder: orderB };
        if (c.id === neighborComic.id) return { ...c, displayOrder: orderA };
        return c;
      }).sort((a, b) => a.displayOrder - b.displayOrder));

      toast.success("Order updated");
    } catch (error: any) {
      console.error("Error reordering comic:", error);
      toast.error(error.message || "Failed to reorder comic");
    }
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
          <p className="text-slate-400 font-medium">Loading World Open Services - Dala Audio Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0c] text-slate-50 flex flex-col font-sans overflow-hidden">
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
        <div className="flex-1 relative overflow-y-auto h-full lg:h-[calc(100vh-80px)] p-6 lg:p-12 border-b lg:border-b-0 lg:border-r border-white/5 scroll-smooth">
          <div className="max-w-4xl mx-auto w-full pb-20">
            {activeComics.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentComic?.id || 'none'}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -10 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <AudioPlayer 
                    currentComic={currentComic} 
                    onNextComic={handleNextComic}
                    onPreviousComic={handlePreviousComic}
                    author={currentAlbum?.author}
                  />
                  
                  <div className="mt-12">
                    <div className="flex items-center gap-3 mb-6 opacity-60">
                       <div className="h-[1px] flex-1 bg-white/10" />
                       <h2 className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Episode Details</h2>
                       <div className="h-[1px] flex-1 bg-white/10" />
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl backdrop-blur-sm relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -z-10 transition-colors group-hover:bg-amber-500/10" />
                      <p className="text-lg lg:text-xl leading-relaxed text-slate-300 font-medium">
                        {currentComic.notes || "This Dala comic takes you on a journey through vibrant soundscapes and captivating narration. Immerse yourself in the story as every detail comes to life through the power of audio storytelling."}
                      </p>
                      
                      <div className="mt-8 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                           <Music className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</span>
                           <span className="text-sm font-bold text-white">Audio Storytelling</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 py-32">
                <div className="text-center space-y-6">
                  <div className="w-32 h-32 bg-white/[0.03] rounded-[3rem] flex items-center justify-center mx-auto border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    >
                       <img 
                        src={albums.find(a => a.id === currentAlbumId)?.coverUrl} 
                        className="w-16 h-16 rounded-full opacity-30 object-cover" 
                        alt="" 
                       />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-black text-white uppercase tracking-tighter">Collection Empty</p>
                    <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto">
                      Select another album from the sidebar or wait for new content to be uploaded.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Atmospheric Background Glows */}
          <div className="fixed top-1/4 -left-20 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="fixed bottom-1/4 -right-20 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        </div>

        {/* Sidebar - Integrated Visuals */}
        <div className={cn("h-full lg:h-auto overflow-y-auto", isMobile ? "flex-1" : "")}>
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
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;