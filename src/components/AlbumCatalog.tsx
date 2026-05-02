import React, { useState, useMemo } from "react";
import { Album } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Grid, List, Play, Clock, User, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AlbumSkeleton, HeroSkeleton } from "./AlbumSkeleton";

interface AlbumCatalogProps {
  albums: Album[];
  onAlbumSelect: (albumId: string) => void;
  isLoading?: boolean;
}

export const AlbumCatalog: React.FC<AlbumCatalogProps> = ({ albums, onAlbumSelect, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const filteredAlbums = useMemo(() => {
    return albums.filter(album => 
      album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.author?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [albums, searchQuery]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
        <HeroSkeleton />
        <div className="container mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
          <div className={cn(
            "grid gap-4 sm:gap-8",
            layout === 'grid' 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          )}>
            {[...Array(8)].map((_, i) => (
              <AlbumSkeleton key={i} layout={layout} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
      {/* Hero Section */}
      <div className="relative h-[280px] sm:h-[320px] md:h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-transparent to-[#0a0a0c] z-0" />
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-amber-500/10 rounded-full blur-[80px] sm:blur-[120px] -z-10 animate-pulse" />
        </div>
        
        <div className="relative z-10 text-center space-y-3 sm:space-y-6 px-4 sm:px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 md:px-4 py-0.5 md:py-1 mb-3 md:mb-6 uppercase tracking-[0.2em] font-black text-[8px] md:text-[10px]">
              Premium Audio Experience
            </Badge>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-2 sm:mb-4">
              Explore the <span className="text-amber-500">Helloopass</span> Universe
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Immerse yourself in high-quality audio storytelling and original soundtracks.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4"
          >
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
              <Input 
                placeholder="Search albums..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 sm:h-14 bg-white/5 border-white/10 text-slate-100 rounded-xl sm:rounded-2xl focus:ring-amber-500 focus:bg-white/10 transition-all border-none shadow-2xl text-xs sm:text-sm"
              />
            </div>
            
            <div className="hidden sm:flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-2xl">
              <button 
                onClick={() => setLayout('grid')}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  layout === 'grid' ? "bg-amber-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-100"
                )}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setLayout('list')}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  layout === 'list' ? "bg-amber-500 text-black shadow-lg" : "text-slate-500 hover:text-slate-100"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="container mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <AnimatePresence mode="wait">
          {filteredAlbums.length > 0 ? (
            <motion.div 
              key="album-grid"
              variants={container}
              initial="hidden"
              animate="show"
              className={cn(
                "grid gap-4 sm:gap-8",
                layout === 'grid' 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1"
              )}
            >
              {filteredAlbums.map((album) => (
                <motion.div
                  key={album.id}
                  variants={item}
                  whileHover={{ y: -8 }}
                  className={cn(
                    "group relative bg-white/[0.03] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 shadow-2xl cursor-pointer",
                    layout === 'list' && "flex flex-col sm:flex-row items-center p-3 sm:p-4 gap-4 sm:gap-8"
                  )}
                  onClick={() => onAlbumSelect(album.id)}
                >
                  {/* Album Cover */}
                  <div className={cn(
                    "relative overflow-hidden aspect-square",
                    layout === 'list' ? "w-full sm:w-48 rounded-xl sm:rounded-2xl shrink-0" : "w-full"
                  )}>
                    <img 
                      src={album.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop"} 
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-black ml-1" />
                      </div>
                    </div>

                    {/* Privacy Badge */}
                    {album.privacy === 'private' && (
                      <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-md p-1.5 rounded-lg sm:rounded-xl border border-white/10 z-10">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                      </div>
                    )}
                  </div>

                  {/* Album Content */}
                  <div className={cn(
                    "p-4 sm:p-6 space-y-2 sm:space-y-4 flex-1",
                    layout === 'list' && "p-0 py-2 sm:py-4"
                  )}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-amber-500 transition-colors truncate">
                          {album.title}
                        </h3>
                        {album.isEnabled === false && (
                          <Badge variant="outline" className="border-rose-500/50 text-rose-500 text-[7px] sm:text-[8px] uppercase font-black">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="text-[8px] sm:text-xs font-bold uppercase tracking-widest">{album.author?.name || "Unknown Author"}</span>
                      </div>
                    </div>

                    <p className="text-slate-400 text-[10px] sm:text-sm line-clamp-2 leading-relaxed font-medium">
                      {album.description || "Explore this premium Helloopass audio collection featuring exclusive content and soundtracks."}
                    </p>

                    <div className="pt-2 sm:pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
                            {new Date(album.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-amber-500 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 sm:translate-x-4 sm:group-hover:translate-x-0">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Listen</span>
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 sm:py-32 text-center space-y-6 sm:space-y-8"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-slate-700" />
              </div>
              <div className="space-y-2 px-6">
                 <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">No albums found</h2>
                 <p className="text-xs sm:text-sm text-slate-500 font-medium">Try adjusting your search query.</p>
              </div>
              <button 
                onClick={() => setSearchQuery("")}
                className="px-6 sm:px-8 h-10 sm:h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all border border-white/10 uppercase tracking-widest"
              >
                Clear Search
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};