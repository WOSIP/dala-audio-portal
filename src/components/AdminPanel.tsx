import React, { useState } from "react";
import { Comic } from "../types";
import { 
  Lock, 
  PlusCircle,
  Eye,
  EyeOff,
  Plus,
  X,
  ImageIcon,
  Link2,
  Wand2
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface AdminPanelProps {
  onAddComic: (comic: Omit<Comic, "id" | "createdAt">) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onAddComic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  
  const [formData, setFormData] = useState<{
    title: string;
    audioUrl: string;
    coverUrl: string;
    illustrationUrls: string[];
    notes: string;
  }>({
    title: "",
    audioUrl: "",
    coverUrl: "",
    illustrationUrls: [],
    notes: ""
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1Fsadmin1966") {
      setIsAuthenticated(true);
      toast.success("Welcome back, Administrator!");
    } else {
      toast.error("Invalid credentials. Access denied.");
    }
  };

  const processMagicLink = () => {
    if (!magicLink) {
      toast.error("Please enter a link to process.");
      return;
    }

    setIsUploading(true);
    
    // Simulated link processing logic
    // In a real app, this would be an API call to a backend service that scrapes/parses the link
    setTimeout(() => {
      // Mock response based on the "Magic Link" concept
      const mockData = {
        audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
        cover: "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/night-of-the-storyteller-d9d14369-1777005229667.webp",
        images: [
          "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/the-legend-of-dala---page-1-238eacfb-1777005702556.webp",
          "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/echoes-of-the-ancestors---page-2-9f9b4942-1777005703064.webp",
          "https://storage.googleapis.com/dala-prod-public-storage/generated-images/a0c853ef-8c9b-4188-873a-65414f906e88/path-of-the-warrior---page-1-a4685c16-1777005702193.webp"
        ]
      };

      setFormData(prev => ({
        ...prev,
        audioUrl: mockData.audio,
        coverUrl: mockData.cover,
        illustrationUrls: mockData.images
      }));

      setIsUploading(false);
      toast.success("Link processed! Assets extracted and organized.");
    }, 1500);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, coverUrl: reader.result as string }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleIllustrationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];
    let processed = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newUrls.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setFormData(prev => ({ 
            ...prev, 
            illustrationUrls: [...prev.illustrationUrls, ...newUrls] 
          }));
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveIllustration = (index: number) => {
    setFormData(prev => ({
      ...prev,
      illustrationUrls: prev.illustrationUrls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.audioUrl) {
      toast.error("Title and Audio are required.");
      return;
    }

    onAddComic(formData);
    toast.success("Comic published successfully!");
    setFormData({ title: "", audioUrl: "", coverUrl: "", illustrationUrls: [], notes: "" });
    setMagicLink("");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border-none rounded-xl px-6 h-11 transition-all hover:scale-105 active:scale-95">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Upload Comic</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] bg-[#121214] border-white/5 shadow-3xl p-0 overflow-hidden rounded-3xl">
        {!isAuthenticated ? (
          <div className="p-10">
            <DialogHeader className="mb-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight text-white">Creator Access</DialogTitle>
              <p className="text-slate-400 mt-2">Enter your secure code to manage the Dala portal.</p>
            </DialogHeader>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Access Code</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter code..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12 h-14 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-slate-700 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-xl shadow-amber-500/10">
                Unlock Portal
              </Button>
            </form>
          </div>
        ) : (
          <div className="p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <PlusCircle className="w-6 h-6" />
                </div>
                Publish Comic
              </DialogTitle>
              <p className="text-slate-400 mt-2">Provide a single link to auto-extract your comic assets.</p>
            </DialogHeader>
            
            <div className="space-y-8">
              {/* Magic Link Section */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Wand2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Magic Link Importer</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Paste your gallery/zip link here..."
                      value={magicLink}
                      onChange={(e) => setMagicLink(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500"
                    />
                  </div>
                  <Button 
                    type="button"
                    onClick={processMagicLink}
                    disabled={isUploading || !magicLink}
                    className="h-12 bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl px-6"
                  >
                    {isUploading ? "Parsing..." : "Process"}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Supported formats: Audio + Image Gallery URLs, Organized ZIP links, or Web Bundles.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-slate-500">Episode Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. The Moon's Secret"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Audio (Auto-filled)</Label>
                    <Input
                      readOnly
                      value={formData.audioUrl}
                      placeholder="Extracted audio URL..."
                      className="h-12 bg-white/5 border-white/10 rounded-xl text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cover (Auto-filled)</Label>
                    <div className="h-12 bg-white/5 border border-white/10 rounded-xl flex items-center px-4 overflow-hidden">
                      <span className="text-xs text-slate-500 truncate">
                        {formData.coverUrl ? "Cover image ready" : "No cover detected"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Extracted Illustrations ({formData.illustrationUrls.length})
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {formData.illustrationUrls.map((url, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img 
                          src={url} 
                          alt={`Page ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg border border-white/10"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveIllustration(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</Label>
                  <Textarea
                    id="notes"
                    placeholder="Episode notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[100px] bg-white/5 border-white/10 rounded-xl text-white"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl"
                    disabled={isUploading || !formData.audioUrl}
                  >
                    {isUploading ? "Processing Assets..." : "Publish Comic"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsAuthenticated(false)} 
                    className="text-slate-500 hover:text-white"
                  >
                    Sign Out
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};