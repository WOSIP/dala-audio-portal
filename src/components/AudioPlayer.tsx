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
  SkipForward,
  Music2,
  Loader2
} from "lucide-react";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { BuilderBadge } from "./BuilderBadge";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  currentComic: Comic;
  onNextComic: () => void;
  onPreviousComic: () => void;
  author?: Author;
  soundtrackUrl?: string;
  isFetching?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  currentComic, 
  onNextComic,
  onPreviousComic,
  author,
  soundtrackUrl,
  isFetching = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundtrackEnabled, setIsSoundtrackEnabled] = useState(true);
  const [currentIllustrationIndex, setCurrentIllustrationIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);

  const pages = currentComic?.illustrationUrls && currentComic?.illustrationUrls.length > 0 
    ? currentComic.illustrationUrls 
    : [currentComic?.coverUrl];

  useEffect(() => {
    if (soundtrackRef.current) {
       soundtrackRef.current.volume = isSoundtrackEnabled ? (volume / 100) * 0.4 : 0; 
       if (isMuted) soundtrackRef.current.volume = 0;
    }
  }, [volume, isMuted, isSoundtrackEnabled]);

  useEffect(() => {
    setCurrentIllustrationIndex(0);
    setDirection(0);
    
    if (audioRef.current && currentComic?.audioUrl) {
      audioRef.current.src = currentComic.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Main audio playback failed:", err));
      }
    } else if (audioRef.current) {
      audioRef.current.src = "";
    }
  }, [currentComic?.id, currentComic?.audioUrl]);

  useEffect(() => {
    if (soundtrackRef.current) {
      if (soundtrackUrl) {
        soundtrackRef.current.src = soundtrackUrl;
        if (isPlaying && isSoundtrackEnabled) {
          soundtrackRef.current.play().catch(err => console.error("Soundtrack playback failed:", err));
        }
      } else {
        soundtrackRef.current.src = "";
      }
    }
  }, [soundtrackUrl]);

  const handleNextPage = () => {
    setDirection(1);
    setCurrentIllustrationIndex((prev) => (prev + 1) % pages.length);
  };

  const handlePreviousPage = () => {
    setDirection(-1);
    setCurrentIllustrationIndex((prev) => (prev - 1 + pages.length) % pages.length);
  };

  const togglePlay = () => {
    if (!currentComic?.audioUrl) return;
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (soundtrackRef.current) soundtrackRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
        if (soundtrackRef.current && soundtrackUrl && isSoundtrackEnabled) {
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
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (soundtrackRef.current) {
      soundtrackRef.current.volume = isSoundtrackEnabled ? (newVolume / 100) * 0.4 : 0;
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
        soundtrackRef.current.volume = nextMute ? 0 : (isSoundtrackEnabled ? (volume / 100) * 0.4 : 0);
      }
    }
  };

  const toggleSoundtrack = () => {
    const nextState = !isSoundtrackEnabled;
    setIsSoundtrackEnabled(nextState);
    if (soundtrackRef.current) {
      if (nextState && isPlaying && soundtrackUrl) {
        soundtrackRef.current.play().catch(err => console.error("Soundtrack playback failed:", err));
      } else {
        soundtrackRef.current.pause();
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
    <Card className="w-full bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5 md:gap-8 rounded-2xl sm:rounded-3xl overflow-hidden relative">
      <AnimatePresence>
        {(isFetching || !currentComic?.audioUrl) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            </div>
            <p className="text-amber-500 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">Preparing Audio...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5 md:gap-8">
        <div 
          className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden bg-black/60 border border-white/5 group shadow-inner"
          style={{ perspective: "1000px" }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={`${currentComic?.id}-${currentIllustrationIndex}`}
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
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src={pages[currentIllustrationIndex]} 
                  alt=""
                  className="w-full h-full object-cover blur-3xl opacity-40 scale-110"
                  aria-hidden="true"
                  loading="lazy"
                />
              </div>

              <div className="relative z-10 w-full h-full flex items-center justify-center p-2 sm:p-4 md:p-8">
                <img 
                  src={pages[currentIllustrationIndex]} 
                  alt={`${currentComic?.title} - Page ${currentIllustrationIndex + 1}`}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none z-20" />
          
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-full border border-white/10 z-30">
            <BookOpen className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="text-[7px] sm:text-[10px] font-bold tracking-widest text-white uppercase">
              {currentIllustrationIndex + 1} / {pages.length}
            </span>
          </div>

          {pages.length > 1 && (
            <div className="absolute inset-y-0 inset-x-1 sm:inset-x-4 flex items-center justify-between pointer-events-none z-30">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPage}
                className="pointer-events-auto h-7 w-7 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200 backdrop-blur-sm"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                className="pointer-events-auto h-7 w-7 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-amber-500 text-white border-none shadow-xl transition-all duration-200 backdrop-blur-sm"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
              </Button>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 mb-4 md:mb-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <h1 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tighter text-white">{currentComic?.title}</h1>
                {author && (
                  <BuilderBadge 
                    name={author.name} 
                    avatarUrl={author.avatarUrl} 
                    className="mt-0.5"
                  />
                )}
                {soundtrackUrl && (
                   <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSoundtrack}
                      className={cn(
                        "rounded-full h-6 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 border border-white/10 transition-all",
                        isSoundtrackEnabled ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-slate-500"
                      )}
                      title={isSoundtrackEnabled ? "Disable Soundtrack" : "Enable Soundtrack"}
                   >
                      <Music2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                      <span className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest">Ambient</span>
                   </Button>
                )}
              </div>
              <p className="text-slate-400 text-xs sm:text-base md:text-lg line-clamp-2 max-w-2xl">{currentComic?.notes || "A Dala original audio comic experience."}</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto md:w-44 bg-white/5 border border-white/10 p-1.5 sm:p-2 px-3 sm:px-4 rounded-full">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-slate-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" /> : <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />}
              </Button>
              <Slider 
                value={[isMuted ? 0 : volume]} 
                max={100} 
                step={1} 
                onValueChange={handleVolumeChange}
                className="w-full sm:w-32 md:w-full cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-2 sm:gap-4">
              <Slider 
                value={[currentTime]} 
                max={duration || 100} 
                step={0.1} 
                onValueChange={handleSliderChange}
                className="cursor-pointer h-1.5 sm:h-2"
              />
              <div className="flex items-center justify-between text-[7px] sm:text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2.5 sm:gap-4 md:gap-8 bg-white/5 backdrop-blur-md px-4 sm:px-8 py-2.5 sm:py-4 rounded-full border border-white/10">
                <button 
                  onClick={onPreviousComic}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-7 w-7 sm:h-10 sm:w-10 transition-colors flex items-center justify-center"
                  title="Previous Comic"
                >
                  <SkipBack className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
                
                <button 
                  onClick={skipBackward}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-6 w-6 sm:h-9 sm:w-9 transition-colors flex items-center justify-center"
                  title="Back 10s"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                <button 
                  onClick={togglePlay}
                  disabled={!currentComic?.audioUrl}
                  className="h-10 w-10 sm:h-16 sm:w-16 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-2xl transition-transform hover:scale-110 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-wait"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 sm:w-8 sm:h-8 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 sm:w-8 sm:h-8 fill-current ml-0.5 sm:ml-1" />
                  )}
                </button>

                <button 
                  onClick={skipForward}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-6 w-6 sm:h-9 sm:w-9 transition-colors flex items-center justify-center"
                  title="Forward 10s"
                >
                  <RotateCw className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                <button 
                  onClick={onNextComic}
                  className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full h-7 w-7 sm:h-10 sm:w-10 transition-colors flex items-center justify-center"
                  title="Next Comic"
                >
                  <SkipForward className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => onNextComic()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <audio 
        ref={soundtrackRef}
        preload="none"
        loop
      />
    </Card>
  );
};