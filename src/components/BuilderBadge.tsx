import React from "react";
import { Hammer } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface BuilderBadgeProps {
  name?: string;
  avatarUrl?: string;
  className?: string;
}

export const BuilderBadge: React.FC<BuilderBadgeProps> = ({ 
  name = "Gebeya Dala", 
  avatarUrl,
  className = "" 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full backdrop-blur-md shadow-lg shadow-amber-500/5 hover:bg-amber-500/20 transition-colors group cursor-default ${className}`}
    >
      <div className="relative">
        <Avatar className="w-6 h-6 border border-amber-500/30">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-amber-500 text-black text-[10px] font-black">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-[#0a0a0c]">
          <Hammer className="w-2 h-2 text-black" />
        </div>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">Builder</span>
        <span className="text-[11px] font-bold text-slate-100 group-hover:text-amber-500 transition-colors">{name}</span>
      </div>
    </motion.div>
  );
};