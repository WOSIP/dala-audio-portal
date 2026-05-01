import React, { useState } from "react";
import { Comic, Album } from "../types";
import { Play, ListMusic, Layers, Lock, Mail, CheckCircle, LogOut, Music } from "lucide-react";
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
}

const Waveform = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-end gap-0.5 h-6 w-full px-2">
    {[...Array(12)].map((_, i) => (
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
  onSetUserEmail
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
    <div className="w-full lg:w-[420px] flex flex-col h-full bg-[#0d0d0f] border-l border-white/5 shadow-2xl z-20">
      {/* Access Control Section */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        {!userEmail ? (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Private Access</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input 
                  placeholder="Enter email to unlock..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="pl-9 h-11 bg-white/5 border-white/10 text-xs rounded-xl focus:ring-amber-500 transition-all focus:bg-white/10"
                />
              </div>
              <Button 
                type="submit"
                disabled={isVerifying}
                className="h-11 px-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                {isVerifying ? "..." : "UNLOCK"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Active</p>
                <p className="text-xs text-white font-bold truncate max-w-[160px]">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 px-3 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">Logout</span>
            </Button>
          </div>
        )}
      </div>

      {/* Album Selector - Premium 3D Stacks */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase">Albums</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">{albums.length} COLLECTIONS</span>
        </div>
        
        <div className="flex gap-8 overflow-x-auto pb-8 pt-4 no-scrollbar px-2">
          {albums.map((album) => (
            <motion.button
              key={album.id}
              onClick={() => onAlbumSelect(album.id)}
              onMouseEnter={() => setHoveredAlbumId(album.id)}
              onMouseLeave={() => setHoveredAlbumId(null)}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "relative shrink-0 w-32 flex flex-col items-center gap-4 group transition-all",
                currentAlbumId === album.id ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              {/* 3D Album Stack */}
              <div className="relative w-28 h-28 perspective-[1000px] transform-style-3d">
                {/* Decorative Stack Layers (Back) */}
                <motion.div 
                  animate={{ 
                    rotateZ: currentAlbumId === album.id || hoveredAlbumId === album.id ? 8 : 4,
                    x: currentAlbumId === album.id || hoveredAlbumId === album.id ? 6 : 4,
                    y: currentAlbumId === album.id || hoveredAlbumId === album.id ? 4 : 2,
                  }}
                  className="absolute inset-0 bg-white/5 rounded-2xl border border-white/10 shadow-lg -z-20"
                />
                {/* Middle Layer */}
                <motion.div 
                  animate={{ 
                    rotateZ: currentAlbumId === album.id || hoveredAlbumId === album.id ? 4 : 2,
                    x: currentAlbumId === album.id || hoveredAlbumId === album.id ? 3 : 2,
                    y: currentAlbumId === album.id || hoveredAlbumId === album.id ? 2 : 1,
                  }}
                  className="absolute inset-0 bg-white/10 rounded-2xl border border-white/10 shadow-xl -z-10"
                />
                
                {/* Front Cover */}
                <div className={cn(
                  "w-28 h-28 rounded-2xl overflow-hidden border-2 transition-all shadow-2xl relative z-10",
                  currentAlbumId === album.id 
                    ? "border-amber-500 ring-[12px] ring-amber-500/10" 
                    : "border-white/20 group-hover:border-white/40"
                )}>
                  <img 
                    src={album.coverUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={album.title} 
                  />
                  
                  {/* Glossy Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-white/10 opacity-60 z-20" />
                  
                  {/* Private Badge */}
                  {album.privacy === 'private' && (
                    <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-md rounded-lg p-1.5 shadow-xl z-30">
                      <Lock className="w-3 h-3 text-black" />
                    </div>
                  )}

                  {/* Waveform Overlay */}
                  <div className="absolute inset-x-0 bottom-2 z-30">
                    <Waveform isActive={currentAlbumId === album.id || hoveredAlbumId === album.id} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 w-full">
                <span className={cn(
                  "text-[11px] font-black text-center leading-tight transition-colors duration-300 uppercase tracking-wider",
                  currentAlbumId === album.id ? "text-amber-500" : "text-slate-400 group-hover:text-slate-100"
                )}>
                  {album.title}
                </span>
                <div className="flex items-center gap-1.5 opacity-40">
                   <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                   <span className="text-[9px] font-bold tracking-[0.15em] text-slate-500">COLLECTION</span>
                </div>
              </div>
            </motion.button>
          ))}
          {albums.length === 0 && (
            <div className="py-4 text-center w-full">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No albums accessible</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 py-5 flex items-center justify-between bg-white/[0.01] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-500/10 rounded-lg text-slate-500">
            <ListMusic className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Episodes</h2>
        </div>
        <span className="text-[10px] font-black text-amber-500/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">{comics.length} LOADED</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 pb-12 space-y-4 pt-4">
          {comics.length > 0 ? (
            comics.map((comic) => (
              <motion.button
                key={comic.id}
                whileHover={{ x: 6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onComicSelect(comic)}
                className={cn(
                  "w-full flex gap-4 p-4 rounded-2xl transition-all duration-500 group text-left border relative overflow-hidden",
                  currentComicId === comic.id 
                    ? "bg-white/[0.08] border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-amber-500/20" 
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:shadow-xl"
                )}
              >
                {/* Glint Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                <div className="relative shrink-0 w-20 h-20">
                   {/* Glossy image effect */}
                  <div className={cn(
                    "w-20 h-20 rounded-xl overflow-hidden shadow-2xl border transition-all duration-500 relative z-10",
                    currentComicId === comic.id 
                      ? "border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                      : "border-white/10 group-hover:border-white/30"
                  )}>
                    <img 
                      src={comic.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=150&auto=format&fit=crop"} 
                      alt={comic.title}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-1000",
                        currentComicId === comic.id ? "scale-115" : "group-hover:scale-110"
                      )}
                    />
                    <AnimatePresence>
                      {currentComicId === comic.id && (
                         <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-amber-500/40 flex items-center justify-center backdrop-blur-[2px] z-20"
                         >
                            <motion.div 
                              initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                              animate={{ scale: 1, opacity: 1, rotate: 0 }}
                              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-2xl"
                            >
                               <Play className="w-4 h-4 fill-amber-500 text-amber-500 ml-1" />
                            </motion.div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Glow underneath */}
                  {currentComicId === comic.id && (
                    <div className="absolute -inset-4 bg-amber-500/20 blur-2xl rounded-full -z-0 opacity-50 animate-pulse" />
                  )}
                </div>
                
                <div className="flex flex-col justify-center overflow-hidden flex-1 relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    {currentComicId === comic.id && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
                    <h3 className={cn(
                      "font-black uppercase tracking-wider text-xs transition-colors duration-300",
                      currentComicId === comic.id ? "text-amber-500" : "text-slate-100 group-hover:text-white"
                    )}>
                      {comic.title}
                    </h3>
                  </div>
                  <p className={cn(
                    "text-[11px] line-clamp-2 leading-relaxed transition-colors duration-300 font-medium",
                    currentComicId === comic.id ? "text-slate-200" : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {comic.notes || "Tap to play this premium Dala audio experience."}
                  </p>
                  
                  {currentComicId === comic.id && (
                    <div className="mt-3">
                      <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ scaleX: 0 }}
                           animate={{ scaleX: 1 }}
                           transition={{ duration: 0.8, ease: "easeOut" }}
                           className="h-full w-full bg-amber-500/40 origin-left"
                         />
                      </div>
                    </div>
                  )}
                </div>
              </motion.button>
            ))
          ) : (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-white/[0.02] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Music className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em]">Empty Collection</p>
              <p className="text-[9px] text-slate-700 mt-2 font-bold">This album has no episodes yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};