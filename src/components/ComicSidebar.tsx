import React, { useState } from "react";
import { Comic, Album } from "../types";
import { Play, ListMusic, Layers, Lock, Mail, CheckCircle, LogOut, Shield } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsVerifying(true);
    // Simulate verification delay
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
    <div className="w-full lg:w-[420px] flex flex-col h-full bg-[#0d0d0f] border-l border-white/5">
      {/* Access Control Section */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
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
                  className="pl-9 h-10 bg-white/5 border-white/10 text-xs rounded-xl focus:ring-amber-500"
                />
              </div>
              <Button 
                type="submit"
                disabled={isVerifying}
                className="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
              >
                {isVerifying ? "..." : "Unlock"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Access Active</p>
                <p className="text-xs text-white font-medium truncate max-w-[150px]">{userEmail}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 h-8 px-2"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span className="text-[10px] font-bold">Logout</span>
            </Button>
          </div>
        )}
      </div>

      {/* Album Selector */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">Albums</h2>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => onAlbumSelect(album.id)}
              className={cn(
                "relative shrink-0 w-24 flex flex-col items-center gap-2 group transition-all",
                currentAlbumId === album.id ? "scale-105" : "opacity-60 hover:opacity-100"
              )}
            >
              <div className={cn(
                "w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shadow-2xl relative",
                currentAlbumId === album.id ? "border-amber-500 ring-4 ring-amber-500/20" : "border-white/10 group-hover:border-white/30"
              )}>
                <img src={album.coverUrl} className="w-full h-full object-cover" alt={album.title} />
                {album.privacy === 'private' && (
                  <div className="absolute top-1 right-1 bg-amber-500 rounded-md p-1 shadow-lg">
                    <Lock className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 w-full">
                {album.privacy === 'private' && <Shield className="w-2 h-2 text-amber-500" />}
                <span className={cn(
                  "text-[10px] font-bold text-center truncate",
                  currentAlbumId === album.id ? "text-amber-500" : "text-slate-400"
                )}>
                  {album.title}
                </span>
              </div>
            </button>
          ))}
          {albums.length === 0 && (
            <div className="py-4 text-center w-full">
              <p className="text-[10px] text-slate-500">No albums accessible</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListMusic className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Episodes</h2>
        </div>
        <span className="text-[10px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">{comics.length} AVAILABLE</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-8 space-y-2">
          {comics.length > 0 ? (
            comics.map((comic) => (
              <button
                key={comic.id}
                onClick={() => onComicSelect(comic)}
                className={cn(
                  "w-full flex gap-4 p-3 rounded-2xl transition-all duration-300 group text-left border border-transparent",
                  currentComicId === comic.id 
                    ? "bg-white/5 border-white/10 shadow-xl scale-[1.01]" 
                    : "hover:bg-white/[0.02] hover:border-white/5"
                )}
              >
                <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden shadow-lg border border-white/5">
                  <img 
                    src={comic.coverUrl} 
                    alt={comic.title}
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-500",
                      currentComicId === comic.id ? "scale-110" : "group-hover:scale-110"
                    )}
                  />
                  {currentComicId === comic.id && (
                     <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-2xl">
                           <Play className="w-3 h-3 fill-amber-500 text-amber-500 ml-0.5" />
                        </div>
                     </div>
                  )}
                </div>
                <div className="flex flex-col justify-center overflow-hidden flex-1">
                  <h3 className={cn(
                    "font-bold line-clamp-1 text-sm transition-colors",
                    currentComicId === comic.id ? "text-amber-500" : "text-slate-200 group-hover:text-white"
                  )}>
                    {comic.title}
                  </h3>
                  <p className={cn(
                    "text-[11px] line-clamp-2 mt-0.5 leading-relaxed",
                    currentComicId === comic.id ? "text-slate-400" : "text-slate-500"
                  )}>
                    {comic.notes || "Tap to play this episode"}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-xs text-slate-600">No episodes found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};