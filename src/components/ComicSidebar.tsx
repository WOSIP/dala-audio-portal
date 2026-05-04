import React, { useState } from "react";
import { Comic, Album } from "../types";
import { Play, ListMusic, Layers, Lock, Mail, CheckCircle, LogOut, Music, Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ComicSidebarProps {
  albums: Album[];
  currentAlbumId: string;
  onAlbumSelect: (albumId: string) => void;
  comics: Comic[];
  currentComicId: string;
  onComicSelect: (comic: Comic) => void;
  userEmail: string;
  onSetUserEmail: (email: string) => void;
  isLoading?: boolean;
}

const Waveform = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-end gap-0.5 h-5 sm:h-6 w-full px-1.5 sm:px-2">
    {[...Array(10)].map((_, i) => (
      <motion.div
        key={i}
        animate={isActive ? { 
          height: ["20%", "100%", "30%", "80%", "20%"], 
          opacity: [0.4, 1, 0.4] 
        } : { 
          height: "15%",
          opacity: 0.2
        }}
        transition={{
          duration: 0.8 + Math.random() * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.05
        }}
        className="flex-1 bg-amber-500 rounded-full"
      />
    ))}
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
  onSetUserEmail,
  isLoading = false
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [hoveredAlbumId, setHoveredAlbumId] = useState<string | null>(null);

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

  return (
    <div className="w-full lg:w-[400px] xl:w-[420px] flex flex-col h-full bg-[#0d0d0f] border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl z-20">
      {/* Access Control Section */}
      <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.01] backdrop-blur-xl">
        {!userEmail ? (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">Private Access</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input 
                  placeholder="Enter email..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="pl-9 h-10 sm:h-11 bg-white/5 border-white/10 text-xs rounded-lg sm:rounded-xl focus:ring-amber-500 transition-all focus:bg-white/10"
                />
              </div>
              <Button 
                type="submit"
                disabled={isVerifying}
                className="h-10 sm:h-11 px-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] sm:text-xs rounded-lg sm:rounded-xl transition-all active:scale-95"
              >
                {isVerifying ? "..." : "UNLOCK"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Active</p>
                <p className="text-[11px] sm:text-xs text-white font-bold truncate max-w-[120px] sm:max-w-[160px]">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 px-2 sm:px-3 rounded-lg"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Logout</span>
            </Button>
          </div>
        )}
      </div>

      {/* Album Selector */}
      <div className="p-4 sm:p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-3 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 bg-amber-500/10 rounded-lg sm:rounded-xl text-amber-500 shadow-inner">
              <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-sm sm:text-lg font-black tracking-tight text-white uppercase">Albums</h2>
          </div>
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{albums.length}</span>
        </div>
        
        <div className="flex gap-3 sm:gap-8 overflow-x-auto pb-4 sm:pb-8 pt-1 sm:pt-4 no-scrollbar px-1 sm:px-2">
          {albums.map((album) => (
            <motion.button
              key={album.id}
              onClick={() => onAlbumSelect(album.id)}
              onMouseEnter={() => setHoveredAlbumId(album.id)}
              onMouseLeave={() => setHoveredAlbumId(null)}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative shrink-0 w-20 sm:w-32 flex flex-col items-center gap-2 sm:gap-4 group transition-all",
                currentAlbumId === album.id ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              {/* Album Cover Wrapper */}
              <div className="relative w-18 h-18 sm:w-28 sm:h-28 perspective-[800px]">
                {/* Decorative Stack Layers */}
                <motion.div 
                  animate={{ 
                    rotateZ: currentAlbumId === album.id || hoveredAlbumId === album.id ? 6 : 3,
                    x: currentAlbumId === album.id || hoveredAlbumId === album.id ? 4 : 2,
                  }}
                  className="absolute inset-0 bg-white/5 rounded-lg sm:rounded-2xl border border-white/10 -z-20"
                />
                
                <div className={cn(
                  "w-full h-full rounded-lg sm:rounded-2xl overflow-hidden border-2 transition-all shadow-xl relative z-10",
                  currentAlbumId === album.id 
                    ? "border-amber-500 ring-4 sm:ring-[12px] ring-amber-500/10" 
                    : "border-white/20 group-hover:border-white/40"
                )}>
                  <img 
                    src={album.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={album.title} 
                    loading="lazy"
                  />
                  
                  {/* Private Badge */}
                  {album.privacy === 'private' && (
                    <div className="absolute top-1 right-1 bg-amber-500/90 backdrop-blur-md rounded-md p-1 z-30">
                      <Lock className="w-2 h-2 sm:w-3 sm:h-3 text-black" />
                    </div>
                  )}

                  {/* Waveform Overlay */}
                  <div className="absolute inset-x-0 bottom-1 sm:bottom-2 z-30">
                    <Waveform isActive={currentAlbumId === album.id || hoveredAlbumId === album.id} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-0.5 w-full overflow-hidden">
                <span className={cn(
                  "text-[9px] sm:text-[11px] font-black text-center leading-tight transition-colors duration-300 uppercase tracking-wider truncate w-full",
                  currentAlbumId === album.id ? "text-amber-500" : "text-slate-400 group-hover:text-slate-100"
                )}>
                  {album.title}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 py-3 sm:py-5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 bg-slate-500/10 rounded-lg text-slate-500">
            <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <h2 className="text-[10px] sm:text-sm font-black uppercase tracking-[0.15em] text-slate-400">Episodes</h2>
        </div>
        <span className="text-[8px] sm:text-[10px] font-black text-amber-500/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">{comics.length}</span>
      </div>

      <ScrollArea className="flex-1 h-full min-h-[300px] lg:min-h-0">
        <div className="px-4 sm:px-6 pb-12 space-y-2 sm:space-y-4 pt-1 sm:pt-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
               <Loader2 className="w-8 h-8 text-amber-500/40 animate-spin mx-auto" />
               <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Loading Episodes...</p>
            </div>
          ) : comics.length > 0 ? (
            comics.map((comic) => (
              <motion.button
                key={comic.id}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onComicSelect(comic)}
                className={cn(
                  "w-full flex gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-500 group text-left border relative overflow-hidden",
                  currentComicId === comic.id 
                    ? "bg-white/[0.08] border-white/20 shadow-xl ring-1 ring-amber-500/20" 
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                )}
              >
                <div className="relative shrink-0 w-14 h-14 sm:w-20 sm:h-20">
                  <div className={cn(
                    "w-full h-full rounded-lg sm:rounded-xl overflow-hidden border transition-all duration-500 relative z-10",
                    currentComicId === comic.id 
                      ? "border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                      : "border-white/10 group-hover:border-white/30"
                  )}>
                    <img 
                      src={comic.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=150&auto=format&fit=crop"} 
                      alt={comic.title}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-1000",
                        currentComicId === comic.id ? "scale-115" : "group-hover:scale-110"
                      )}
                      loading="lazy"
                    />
                    <AnimatePresence>
                      {currentComicId === comic.id && (
                         <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-amber-500/40 flex items-center justify-center backdrop-blur-[1px] z-20"
                         >
                            <Play className="w-4 h-4 fill-white text-white" />
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center overflow-hidden flex-1 relative z-10">
                  <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1.5">
                    {currentComicId === comic.id && <div className="w-1 h-1 bg-amber-500 rounded-full animate-ping" />}
                    <h3 className={cn(
                      "font-black uppercase tracking-wider text-[9px] sm:text-xs transition-colors duration-300 truncate",
                      currentComicId === comic.id ? "text-amber-500" : "text-slate-100 group-hover:text-white"
                    )}>
                      {comic.title}
                    </h3>
                  </div>
                  <p className={cn(
                    "text-[9px] sm:text-[11px] line-clamp-2 leading-tight sm:leading-relaxed transition-colors duration-300 font-medium",
                    currentComicId === comic.id ? "text-slate-200" : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {comic.notes || "Tap to play episodes."}
                  </p>
                </div>
              </motion.button>
            ))
          ) : (
            <div className="py-16 text-center">
              <Music className="w-8 h-8 text-slate-800 mx-auto mb-4" />
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Empty Collection</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};