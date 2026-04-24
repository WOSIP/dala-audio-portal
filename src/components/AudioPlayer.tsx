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
  BookOpen,
  SkipBack,
  SkipForward
} from "lucide-react";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface AudioPlayerProps {
  currentComic: Comic;
  onNextComic: () => void;
  onPreviousComic: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  currentComic, 
  onNextComic,
  onPreviousComic
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentIllustrationIndex, setCurrentIllustrationIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pages = currentComic.illustrationUrls && currentComic.illustrationUrls.length > 0 
    ? currentComic.illustrationUrls 
    : [currentComic.coverUrl];

  // Reset page index and audio when switching comics
  useEffect(() => {
    setCurrentIllustrationIndex(0);
    if (audioRef.current) {
      audioRef.current.src = currentComic.audioUrl;
      // If was already playing, try to play the new one
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
      }
    }
  }, [currentComic.id, currentComic.audioUrl]);

  const handleNextPage = () => {
    setCurrentIllustrationIndex((prev) => (prev + 1) % pages.length);
  };

  const handlePreviousPage = () => {
    setCurrentIllustrationIndex((prev) => (prev - 1 + pages.length) % pages.length);
  };

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
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-black/40 border border-white/5 group">
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

          {/* Navigation Arrows (For Pages) */}
          {pages.length > 1 && (
            <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200"
                title="Previous Page"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200"
                title="Next Page"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          )}
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

          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <Slider 
                value={[currentTime]} 
                max={duration || 100} 
                step={0.1} 
                onValueChange={handleSliderChange}
                className="cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4 md:gap-8 bg-white/5 backdrop-blur-md px-8 py-4 rounded-full border border-white/10">
                {/* Previous Comic */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onPreviousComic}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-10 w-10 transition-colors"
                  title="Previous Comic"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                {/* Back 10s */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={skipBackward}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-9 w-9 transition-colors"
                  title="Back 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                {/* Main Play/Pause Launch Control */}
                <Button 
                  size="icon" 
                  onClick={togglePlay}
                  className="h-16 w-16 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-2xl transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-1" />
                  )}
                </Button>

                {/* Forward 10s */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={skipForward}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-9 w-9 transition-colors"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>

                {/* Next Comic */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onNextComic}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-10 w-10 transition-colors"
                  title="Next Comic"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => onNextComic()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </Card>
  );
};