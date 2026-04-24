import React, { useState, useEffect, useRef } from "react";
import { Comic } from "../types";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  currentComic: Comic;
  currentIllustrationIndex: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  currentComic, 
  currentIllustrationIndex,
  onNextPage,
  onPreviousPage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pages = currentComic.illustrationUrls && currentComic.illustrationUrls.length > 0 
    ? currentComic.illustrationUrls 
    : [currentComic.coverUrl];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentComic.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
      }
    }
  }, [currentComic.audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      const newTime = value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (newVolume === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.volume = nextMute ? 0 : volume / 100;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  return (
    <Card className="w-full bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-4 lg:p-8 flex flex-col gap-8 rounded-3xl">
      <div className="flex flex-col gap-8">
        {/* Illustration Swiper Area */}
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-black/40 border border-white/5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentComic.id}-${currentIllustrationIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img 
                src={pages[currentIllustrationIndex]} 
                alt={`${currentComic.title} - Page ${currentIllustrationIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Overlays and Controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
          
          {/* Page Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold tracking-widest text-white uppercase">
              Page {currentIllustrationIndex + 1} / {pages.length}
            </span>
          </div>

          {/* Navigation Arrows */}
          {pages.length > 1 && (
            <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPreviousPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          )}

          {/* Centered Play Button (Visible on hover or when paused) */}
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none",
              !isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
            )}
          >
            <Button 
              size="icon" 
              onClick={togglePlay}
              className="pointer-events-auto h-24 w-24 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-2xl transition-transform hover:scale-110"
            >
              {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-1" />}
            </Button>
          </div>
        </div>

        {/* Audio Controls Area */}
        <div className="w-full flex flex-col">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tighter text-white">{currentComic.title}</h1>
              <p className="text-slate-400 text-base md:text-lg line-clamp-2 max-w-2xl">{currentComic.notes || "A Dala original audio comic experience."}</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-44 bg-white/5 border border-white/10 p-2 px-4 rounded-full">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider 
                value={[isMuted ? 0 : volume]} 
                max={100} 
                step={1} 
                onValueChange={handleVolumeChange}
                className="w-full cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Slider 
              value={[currentTime]} 
              max={duration || 100} 
              step={0.1} 
              onValueChange={handleSliderChange}
              className="cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs font-bold tracking-widest text-slate-500 uppercase">
              <span>{formatTime(currentTime)}</span>
              <div className="flex items-center gap-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onPreviousPage}
                  className="hover:bg-white/10 text-white rounded-full h-10 w-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={skipBackward}
                  className="hover:bg-white/10 text-slate-400 rounded-full h-9 w-9"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={skipForward}
                  className="hover:bg-white/10 text-slate-400 rounded-full h-9 w-9"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onNextPage}
                  className="hover:bg-white/10 text-white rounded-full h-10 w-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {}}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </Card>
  );
};