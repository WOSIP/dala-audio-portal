import React, { useState, useRef, useEffect } from "react";
import { Comic, Album } from "../types";
import { 
  Play, 
  ListMusic, 
  Layers, 
  Lock, 
  Mail, 
  CheckCircle, 
  LogOut, 
  Music, 
  ChevronRight, 
  Headphones,
  ChevronLeft,
  ArrowRight
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface ComicSidebarProps {
  albums: Album[];
  currentAlbumId: string;
  onAlbumSelect: (albumId: string) => void;
  comics: Comic[];
  currentComicId: string;
  onComicSelect: (comic: Comic) => void;
  userEmail: string;
  onSetUserEmail: (email: string) => void;
}

const Waveform = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-end gap-[2px] h-8 w-full px-4">
    {[...Array(16)].map((_, i) => (
      <motion.div
        key={i}
        animate={isActive ? { 
          height: ["20%", "100%", "30%", "80%", "40%", "20%"], 
          opacity: [0.4, 1, 0.4] 
        } : { 
          height: "15%",
          opacity: 0.2
        }}
        transition={{
          duration: 0.6 + Math.random() * 0.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.04
        }}
        className="flex-1 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
      />
    ))}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, count }: { icon: any, title: string, subtitle?: string, count?: number }) => (
  <div className="flex items-center justify-between px-6 py-5 sticky top-0 bg-[#0d0d0f]/90 backdrop-blur-xl z-30 border-b border-white/5">
    <div className="flex items-center gap-3.5">
      <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-xl text-amber-500 border border-amber-500/20 shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
         <h2 className="text-sm font-black tracking-[0.15em] text-white uppercase">{title}</h2>
         {subtitle && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{subtitle}</p>}
      </div>
    </div>
    {count !== undefined && (
      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
        <span className="text-[10px] font-black text-white">{count}</span>
      </div>
    )}
  </div>
);

export const ComicSidebar: React.FC<ComicSidebarProps> = ({ 
  albums,
  currentAlbumId,
  onAlbumSelect,
  comics, 
  currentComicId, 
  onComicSelect,
  userEmail,
  onSetUserEmail
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      onSetUserEmail(emailInput);
      toast.success("Access unlocked for " + emailInput);
      setIsVerifying(false);
      setEmailInput("");
    }, 800);
  };

  const handleLogout = () => {
    onSetUserEmail("");
    toast.info("Logged out from private access");
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Find the current album for some contextual UI
  const currentAlbum = albums.find(a => a.id === currentAlbumId);

  return (
    <div className="w-full lg:w-[460px] flex flex-col lg:h-full bg-[#0d0d0f] border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl z-20 overflow-hidden">
      {/* 1. Access Control */}
      <div className="p-4 lg:p-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        {!userEmail ? (
          <form onSubmit={handleVerify} className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-700" />
            <div className="relative flex items-center gap-2 p-1.5 bg-[#161618] border border-white/10 rounded-2xl focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all duration-300">
              <div className="pl-4 text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <Input 
                placeholder="Enter email for private access..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 h-10 text-sm font-medium placeholder:text-slate-600"
              />
              <Button 
                type="submit"
                disabled={isVerifying}
                size="sm"
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black h-9 px-5 shrink-0 shadow-lg shadow-amber-500/10 active:scale-95 transition-all uppercase tracking-tighter text-[11px]"
              >
                {isVerifying ? "..." : "Unlock"}
              </Button>
            </div>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between p-3.5 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl backdrop-blur-sm"
          >
            <div className="flex items-center gap-3.5 px-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/20 relative">
                <CheckCircle className="w-5 h-5" />
                <div className="absolute inset-0 rounded-xl animate-ping bg-emerald-500/20 pointer-events-none" />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Access Unlocked</p>
                <p className="text-xs text-slate-200 font-bold truncate max-w-[160px]">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-9 rounded-xl px-4 group transition-all"
            >
              <LogOut className="w-3.5 h-3.5 mr-2 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Logout</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* 2. Album Selector Area */}
      <div className="flex flex-col min-h-0 bg-gradient-to-b from-black/20 to-transparent">
        <SectionHeader 
          icon={Layers} 
          title="Featured Albums" 
          subtitle={`${albums.length} Premium Collections`} 
        />

        <div className="relative group/albums">
          {/* Scroll Buttons - Desktop Only */}
          {!isMobile && (
            <>
              <button 
                onClick={() => scroll('left')}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white z-40 opacity-0 group-hover/albums:opacity-100 transition-opacity hover:bg-amber-500 hover:text-black hover:border-amber-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scroll('right')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white z-40 opacity-0 group-hover/albums:opacity-100 transition-opacity hover:bg-amber-500 hover:text-black hover:border-amber-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div 
            ref={scrollContainerRef}
            className="flex gap-8 overflow-x-auto py-10 px-8 no-scrollbar snap-x snap-mandatory scroll-smooth"
          >
            {albums.map((album) => (
              <motion.button
                key={album.id}
                onClick={() => onAlbumSelect(album.id)}
                whileHover={{ y: -4 }}
                className={cn(
                  "relative shrink-0 w-[200px] lg:w-[220px] group/card transition-all duration-700 snap-center",
                  currentAlbumId === album.id ? "opacity-100" : "opacity-40 hover:opacity-90"
                )}
              >
                <div className="relative">
                  {/* Active Glow */}
                  <AnimatePresence>
                    {currentAlbumId === album.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.15 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -inset-4 bg-amber-500/20 blur-[30px] rounded-full z-0"
                      />
                    )}
                  </AnimatePresence>

                  {/* Perspective Stack Effect */}
                  <div className="relative aspect-square z-10">
                    {/* Stack Layers */}
                    <div className={cn(
                      "absolute inset-0 bg-white/5 rounded-[2rem] border border-white/10 transition-all duration-700 transform origin-bottom-right",
                      currentAlbumId === album.id ? "rotate-6 translate-x-4 translate-y-3 opacity-100 scale-95" : "rotate-2 translate-x-1 translate-y-1 opacity-0 group-hover/card:opacity-30 group-hover/card:rotate-4"
                    )} />
                    <div className={cn(
                      "absolute inset-0 bg-white/10 rounded-[2rem] border border-white/10 transition-all duration-700 transform origin-bottom-right",
                      currentAlbumId === album.id ? "rotate-3 translate-x-2 translate-y-1.5 opacity-100 scale-[0.98]" : "rotate-1 translate-x-0.5 translate-y-0.5 opacity-0 group-hover/card:opacity-50 group-hover/card:rotate-2"
                    )} />
                    
                    {/* Main Artwork */}
                    <div className={cn(
                      "relative w-full h-full rounded-[2rem] overflow-hidden border-2 transition-all duration-700 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]",
                      currentAlbumId === album.id 
                        ? "border-amber-500/80 scale-100" 
                        : "border-white/10 group-hover/card:border-white/30"
                    )}>
                      <img 
                        src={album.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop"} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110"
                        alt={album.title} 
                      />
                      
                      {/* Glass Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2rem]" />
                      
                      {/* Active State Details */}
                      <div className="absolute inset-x-0 bottom-0 p-5 space-y-3 transform transition-transform duration-500">
                         <Waveform isActive={currentAlbumId === album.id} />
                         
                         {currentAlbumId === album.id && (
                           <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between text-white"
                           >
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                           </motion.div>
                         )}
                      </div>

                      {/* Privacy Lock Badge */}
                      {album.privacy === 'private' && (
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/20">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Album Info Text */}
                  <div className="mt-6 space-y-1">
                    <h3 className={cn(
                      "text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                      currentAlbumId === album.id ? "text-amber-500 translate-y-0" : "text-slate-400 group-hover/card:text-slate-200"
                    )}>
                      {album.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-[1px] transition-all duration-500", currentAlbumId === album.id ? "w-6 bg-amber-500" : "w-3 bg-slate-800")} />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                        {album.author?.name || "Dala Original"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
          
          {/* Scroll Fades */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0d0d0f] to-transparent pointer-events-none z-30" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0d0d0f] to-transparent pointer-events-none z-30" />
        </div>
      </div>

      {/* 3. Playlist Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <SectionHeader 
          icon={ListMusic} 
          title="Playlist Episodes" 
          count={comics.length}
        />

        <ScrollArea className="flex-1">
          <div className="p-5 lg:p-7 space-y-2.5 pb-20">
            <AnimatePresence mode="popLayout">
              {comics.length > 0 ? (
                comics.map((comic, idx) => (
                  <motion.div
                    key={comic.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: idx * 0.03 }}
                    layout
                  >
                    <button
                      onClick={() => onComicSelect(comic)}
                      className={cn(
                        "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-400 group relative overflow-hidden",
                        currentComicId === comic.id 
                          ? "bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 shadow-xl"
                          : "bg-transparent border border-transparent hover:bg-white/[0.03] hover:border-white/5"
                      )}
                    >
                      {/* Active Indicator Bar */}
                      {currentComicId === comic.id && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-amber-500 rounded-r-full"
                        />
                      )}

                      {/* Number/Icon Container */}
                      <div className="relative flex items-center justify-center w-8 shrink-0">
                        <AnimatePresence mode="wait">
                          {currentComicId === comic.id ? (
                            <motion.div 
                              key="playing"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex gap-[2px] items-end h-4 w-5"
                            >
                              <motion.div animate={{ height: ["20%", "100%", "40%", "80%", "20%"] }} transition={{ duration: 0.8, repeat: Infinity }} className="flex-1 bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                              <motion.div animate={{ height: ["60%", "30%", "100%", "50%", "60%"] }} transition={{ duration: 1.1, repeat: Infinity }} className="flex-1 bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                              <motion.div animate={{ height: ["30%", "80%", "20%", "100%", "30%"] }} transition={{ duration: 0.9, repeat: Infinity }} className="flex-1 bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                            </motion.div>
                          ) : (
                            <span key="index" className="text-[10px] font-black text-slate-600 group-hover:text-slate-400">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Thumbnail with playing overlay */}
                      <div className="relative shrink-0 w-12 h-12">
                        <div className={cn(
                          "w-full h-full rounded-xl overflow-hidden transition-all duration-500 shadow-lg",
                          currentComicId === comic.id 
                            ? "ring-2 ring-amber-500/50 ring-offset-[3px] ring-offset-[#0d0d0f] scale-105"
                            : "ring-1 ring-white/10"
                        )}>
                          <img 
                            src={comic.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=100&auto=format&fit=crop"} 
                            alt={comic.title}
                            className={cn(
                              "w-full h-full object-cover transition-transform duration-700",
                              currentComicId === comic.id ? "scale-125" : "group-hover:scale-110"
                            )}
                          />
                          {currentComicId === comic.id && (
                            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center backdrop-blur-[1px]">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Info */}
                      <div className="flex-1 min-w-0 text-left space-y-0.5">
                        <h4 className={cn(
                          "text-[11px] font-black uppercase tracking-wider truncate transition-colors duration-300",
                          currentComicId === comic.id ? "text-amber-500" : "text-slate-200 group-hover:text-white"
                        )}>
                          {comic.title}
                        </h4>
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1 opacity-60">
                              <Headphones className="w-2.5 h-2.5 text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dala Audio</span>
                           </div>
                           {currentComicId === comic.id && (
                             <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Now Playing</span>
                           )}
                        </div>
                      </div>

                      {/* Right Icon */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <ChevronRight className={cn("w-4 h-4", currentComicId === comic.id ? "text-amber-500" : "text-slate-600")} />
                      </div>
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="py-24 flex flex-col items-center text-center px-10">
                  <div className="w-24 h-24 bg-white/[0.03] rounded-[3rem] flex items-center justify-center mb-8 border border-white/5 relative group">
                    <div className="absolute inset-0 bg-amber-500/10 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <Music className="w-12 h-12 text-slate-700 relative z-10" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 mb-3">Collection Empty</h3>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed max-w-[220px]">
                    This album is currently awaiting its first audio episode. Stay tuned for upcoming Dala content.
                  </p>
                </div>
              )}
            </AnimatePresence>
            {/* Bottom Safe Area Padding */}
            <div className="h-12" />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};