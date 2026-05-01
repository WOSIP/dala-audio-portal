import React, { useState, useEffect, useRef } from "react";
import { Comic, Author } from "../types";
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
import { BuilderBadge } from "./BuilderBadge";

interface AudioPlayerProps {
  currentComic: Comic;
  onNextComic: () => void;
  onPreviousComic: () => void;
  author?: Author;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  currentComic, 
  onNextComic,
  onPreviousComic,
  author
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentIllustrationIndex, setCurrentIllustrationIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);

  const pages = currentComic.illustrationUrls && currentComic.illustrationUrls.length > 0 
    ? currentComic.illustrationUrls 
    : [currentComic.coverUrl];

  // Sync Soundtrack with Main Audio
  useEffect(() => {
    if (soundtrackRef.current) {
       soundtrackRef.current.volume = (volume / 100) * 0.4; // Soundtrack is usually quieter (40% of main volume)
       if (isMuted) soundtrackRef.current.volume = 0;
    }
  }, [volume, isMuted]);

  // Reset page index and audio when switching comics
  useEffect(() => {
    setCurrentIllustrationIndex(0);
    setDirection(0);
    
    if (audioRef.current) {
      audioRef.current.src = currentComic.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Main audio playback failed:", err));
      }
    }

    if (soundtrackRef.current) {
      if (currentComic.soundtrackUrl) {
        soundtrackRef.current.src = currentComic.soundtrackUrl;
        if (isPlaying) {
          soundtrackRef.current.play().catch(err => console.error("Soundtrack playback failed:", err));
        }
      } else {
        soundtrackRef.current.src = "";
      }
    }
  }, [currentComic.id, currentComic.audioUrl, currentComic.soundtrackUrl]);

  const handleNextPage = () => {
    setDirection(1);
    setCurrentIllustrationIndex((prev) => (prev + 1) % pages.length);
  };

  const handlePreviousPage = () => {
    setDirection(-1);
    setCurrentIllustrationIndex((prev) => (prev - 1 + pages.length) % pages.length);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (soundtrackRef.current) soundtrackRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
        if (soundtrackRef.current && currentComic.soundtrackUrl) {
           soundtrackRef.current.play().catch(err => console.error("Soundtrack playback failed:", err));
        }
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
      
      // We don't necessarily sync soundtrack time as it's usually background loop
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (soundtrackRef.current) {
      soundtrackRef.current.volume = (newVolume / 100) * 0.4;
    }
    if (newVolume === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.volume = nextMute ? 0 : volume / 100;
      if (soundtrackRef.current) {
        soundtrackRef.current.volume = nextMute ? 0 : (volume / 100) * 0.4;
      }
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

  // Animation variants for the page flip effect
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotateY: direction > 0 ? 45 : -45,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotateY: direction < 0 ? 45 : -45,
    })
  };

  return (
    <Card className="w-full bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-4 lg:p-8 flex flex-col gap-8 rounded-3xl overflow-hidden">
      <div className="flex flex-col gap-8">
        {/* Illustration Swiper Area */}
        <div 
          className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-2xl overflow-hidden bg-black/60 border border-white/5 group shadow-inner"
          style={{ perspective: "1000px" }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={`${currentComic.id}-${currentIllustrationIndex}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                rotateY: { duration: 0.4 },
                scale: { duration: 0.4 }
              }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Blurred Background Layer for "Format Adjustment" */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src={pages[currentIllustrationIndex]} 
                  alt=""
                  className="w-full h-full object-cover blur-3xl opacity-40 scale-110"
                  aria-hidden="true"
                />
              </div>

              {/* Main Illustration Layer */}
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4 md:p-8">
                <img 
                  src={pages[currentIllustrationIndex]} 
                  alt={`${currentComic.title} - Page ${currentIllustrationIndex + 1}`}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Overlays and Controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none z-20" />
          
          {/* Page Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-30">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold tracking-widest text-white uppercase">
              Page {currentIllustrationIndex + 1} / {pages.length}
            </span>
          </div>

          {/* Navigation Arrows (For Pages) */}
          {pages.length > 1 && (
            <div className="absolute inset-y-0 inset-x-4 flex items-center justify-between pointer-events-none z-30">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200 backdrop-blur-sm"
                title="Previous Page"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                className="pointer-events-auto h-12 w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200 backdrop-blur-sm"
                title="Next Page"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>

        {/* Audio Controls Area */}
        <div className="w-full flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white">{currentComic.title}</h1>
                {author && (
                  <BuilderBadge 
                    name={author.name} 
                    avatarUrl={author.avatarUrl} 
                    className="mt-1"
                  />
                )}
              </div>
              <p className="text-slate-400 text-base md:text-lg line-clamp-2 max-w-2xl">{currentComic.notes || "A Dala original audio comic experience."}</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-44 bg-white/5 border border-white/10 p-2 px-4 rounded-full self-end md:self-auto">
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

      <audio 
        ref={soundtrackRef}
        loop
      />
    </Card>
  );
};