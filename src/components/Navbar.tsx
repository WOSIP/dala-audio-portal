import React from "react";
import { AdminPanel } from "./AdminPanel";
import { Comic } from "../types";
import { Headphones } from "lucide-react";

interface NavbarProps {
  onAddComic: (comic: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => void;
  comics: Comic[];
  onToggleEnable: (id: string) => void;
  onDeleteComic: (id: string) => void;
  onUpdateComic: (id: string, updates: Partial<Comic>) => void;
  onReorderComic: (id: string, direction: 'up' | 'down') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onAddComic, 
  comics, 
  onToggleEnable, 
  onDeleteComic,
  onUpdateComic,
  onReorderComic
}) => {
  return (
    <nav className="border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-2xl shadow-amber-500/20 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <Headphones className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter leading-none text-white">DALA</h1>
            <p className="text-[10px] font-black text-amber-500 tracking-[0.4em] uppercase">Audio Portal</p>
          </div>
        </div>
        
        <AdminPanel 
          onAddComic={onAddComic} 
          comics={comics} 
          onToggleEnable={onToggleEnable}
          onDeleteComic={onDeleteComic}
          onUpdateComic={onUpdateComic}
          onReorderComic={onReorderComic}
        />
      </div>
    </nav>
  );
};