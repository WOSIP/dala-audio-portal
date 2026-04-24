import React from "react";
import { Comic } from "../types";
import { Play, ListMusic } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface ComicSidebarProps {
  comics: Comic[];
  currentComicId: string;
  onComicSelect: (comic: Comic) => void;
}

export const ComicSidebar: React.FC<ComicSidebarProps> = ({ 
  comics, 
  currentComicId, 
  onComicSelect 
}) => {
  return (
    <div className="w-full lg:w-[420px] flex flex-col h-full bg-[#0d0d0f] border-l border-white/5">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
            <ListMusic className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Episodes</h2>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-white/5 px-2.5 py-1 rounded-full">{comics.length} TOTAL</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {comics.map((comic) => (
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
              <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-lg border border-white/5">
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
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-2xl">
                         <Play className="w-4 h-4 fill-amber-500 text-amber-500 ml-0.5" />
                      </div>
                   </div>
                )}
              </div>
              <div className="flex flex-col justify-center overflow-hidden flex-1">
                <h3 className={cn(
                  "font-bold line-clamp-1 text-base transition-colors",
                  currentComicId === comic.id ? "text-amber-500" : "text-slate-200 group-hover:text-white"
                )}>
                  {comic.title}
                </h3>
                <p className={cn(
                  "text-xs line-clamp-2 mt-1 leading-relaxed",
                  currentComicId === comic.id ? "text-slate-400" : "text-slate-500"
                )}>
                  {comic.notes || "Tap to play this episode"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};