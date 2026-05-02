import React, { Suspense, lazy } from "react";
import { Comic, Album } from "../types";
import { Headphones, Loader2, LayoutGrid } from "lucide-react";

// Lazy load the AdminPanel as it's a large component and only used on interaction
const AdminPanel = lazy(() => import("./AdminPanel").then(module => ({ default: module.AdminPanel })));

interface NavbarProps {
  onAddComic: (comic: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => void;
  comics: Comic[];
  albums: Album[];
  onToggleEnable: (id: string) => void;
  onDeleteComic: (id: string) => void;
  onUpdateComic: (id: string, updates: Partial<Comic>) => void;
  onReorderComic: (id: string, direction: 'up' | 'down') => void;
  onAddAlbum: (album: Omit<Album, "id" | "createdAt" | "isEnabled">) => void;
  onUpdateAlbum: (id: string, updates: Partial<Album>) => void;
  onDeleteAlbum: (id: string) => void;
  onToggleAlbumEnable: (id: string) => void;
  onLogoClick?: () => void;
  currentView?: 'catalog' | 'player';
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onAddComic, 
  comics, 
  albums,
  onToggleEnable, 
  onDeleteComic,
  onUpdateComic,
  onReorderComic,
  onAddAlbum,
  onUpdateAlbum,
  onDeleteAlbum,
  onToggleAlbumEnable,
  onLogoClick,
  currentView
}) => {
  return (
    <nav className="border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 sm:gap-4 cursor-pointer group"
          onClick={onLogoClick}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-500 rounded-lg sm:rounded-2xl flex items-center justify-center text-black shadow-2xl shadow-amber-500/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
            <Headphones className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-xl font-black tracking-tighter leading-none text-white uppercase group-hover:text-amber-500 transition-colors">
              <span className="sm:hidden">DALA PORTAL</span>
              <span className="hidden sm:inline">World Open Services</span>
            </h1>
            <p className="hidden sm:block text-[9px] sm:text-[10px] font-black text-amber-500 tracking-[0.2em] uppercase">Dala Audio Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {currentView === 'player' && (
            <button 
              onClick={onLogoClick}
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg sm:rounded-xl transition-all border border-white/5"
              title="Explore Catalog"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Explore Catalog</span>
            </button>
          )}
          
          <Suspense fallback={
            <div className="h-9 sm:h-11 w-9 sm:w-auto px-0 sm:px-6 flex items-center justify-center bg-white/5 rounded-lg sm:rounded-xl border border-white/10">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            </div>
          }>
            <AdminPanel 
              onAddComic={onAddComic} 
              comics={comics} 
              albums={albums}
              onToggleEnable={onToggleEnable}
              onDeleteComic={onDeleteComic}
              onUpdateComic={onUpdateComic}
              onReorderComic={onReorderComic}
              onAddAlbum={onAddAlbum}
              onUpdateAlbum={onUpdateAlbum}
              onDeleteAlbum={onDeleteAlbum}
              onToggleAlbumEnable={onToggleAlbumEnable}
            />
          </Suspense>
        </div>
      </div>
    </nav>
  );
};