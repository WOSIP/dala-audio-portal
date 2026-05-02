import React, { useState, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";

interface AlbumSkeletonProps {
  layout: 'grid' | 'list';
}

export const AlbumSkeleton: React.FC<AlbumSkeletonProps> = ({ layout }) => {
  return (
    <div className={cn(
      "bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative group",
      layout === 'list' && "flex flex-row items-center p-4 gap-8"
    )}>
      {/* Subtle scanning animation for the individual card */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent z-10 pointer-events-none"
        animate={{ 
          x: ["-100%", "100%"],
        }}
        transition={{ 
          duration: 2.5, 
          repeat: Infinity, 
          ease: "linear",
        }}
      />

      {/* Cover Skeleton */}
      <div className={cn(
        "relative overflow-hidden aspect-square",
        layout === 'list' ? "w-48 rounded-2xl shrink-0" : "w-full"
      )}>
        <Skeleton className="w-full h-full bg-white/5" />
      </div>

      {/* Content Skeleton */}
      <div className={cn(
        "p-6 space-y-4 flex-1",
        layout === 'list' && "p-0 py-4"
      )}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4 bg-white/10" />
          <Skeleton className="h-4 w-1/4 bg-white/5" />
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full bg-white/5" />
          <Skeleton className="h-4 w-5/6 bg-white/5" />
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <Skeleton className="h-4 w-24 bg-white/5" />
          <Skeleton className="h-4 w-16 bg-white/5" />
        </div>
      </div>
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 98;
        // Natural slowing progression
        const increment = (100 - prev) * 0.08;
        return prev + increment;
      });
      setSeconds(s => s + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[400px] flex items-center justify-center overflow-hidden">
      {/* Background glow animation */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 text-center space-y-8 px-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col items-center">
          {/* Main Progress Indicator */}
          <div className="w-full max-w-md mb-12 space-y-3">
            <div className="flex justify-between items-end px-1">
               <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">Syncing Database</span>
               </div>
               <div className="flex items-center gap-3 text-white/40 font-mono text-[10px] tracking-widest">
                 <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-500/50" />
                    <span>{seconds.toFixed(1)}s</span>
                 </div>
                 <span className="text-amber-500 font-black">{Math.round(progress)}%</span>
               </div>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              />
            </div>
          </div>

          <Skeleton className="h-6 w-48 bg-amber-500/10 mb-6 rounded-full" />
          <div className="w-full space-y-4 flex flex-col items-center">
            <Skeleton className="h-16 w-3/4 bg-white/5" />
            <Skeleton className="h-16 w-1/2 bg-white/5 sm:hidden" />
          </div>
          <div className="w-full space-y-2 mt-6 flex flex-col items-center">
            <Skeleton className="h-4 w-2/3 bg-white/5" />
            <Skeleton className="h-4 w-1/2 bg-white/5" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Skeleton className="h-14 w-full max-w-md bg-white/5 rounded-2xl" />
          <Skeleton className="h-14 w-32 bg-white/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
};