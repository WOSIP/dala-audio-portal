import React, { useState, useRef } from "react";
import { Comic } from "../types";
import { 
  Lock, 
  PlusCircle,
  Eye,
  EyeOff,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileAudio,
  Image as ImageIcon2,
  ArrowUp,
  ArrowDown,
  Link2,
  X,
  Upload,
  ImagePlus,
  Music,
  FileText,
  Loader2
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { extractAudioUrl } from "../utils/audio-extractor";
import { extractPagesFromPDF } from "../utils/pdf-handler";

interface AdminPanelProps {
  onAddComic: (comic: Omit<Comic, "id" | "createdAt" | "enabled" | "deleted">) => void;
  comics: Comic[];
  onToggleEnable: (id: string) => void;
  onDeleteComic: (id: string) => void;
  onUpdateComic: (id: string, updates: Partial<Comic>) => void;
  onReorderComic: (id: string, direction: 'up' | 'down') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onAddComic, 
  comics, 
  onToggleEnable, 
  onDeleteComic,
  onUpdateComic,
  onReorderComic
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [audioMagicLink, setAudioMagicLink] = useState("");
  const [activeTab, setActiveTab] = useState("publish");
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const illustrationsInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<{
    title: string;
    audioUrl: string;
    coverUrl: string;
    illustrationUrls: string[];
    notes: string;
    audioImportLink: string;
    illustrationImportLink: string;
  }>(({
    title: "",
    audioUrl: "",
    coverUrl: "",
    illustrationUrls: [],
    notes: "",
    audioImportLink: "",
    illustrationImportLink: ""
  }));

  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isProcessingIllustration, setIsProcessingIllustration] = useState(false);
  const [editingComicId, setEditingComicId] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1Fsadmin1966") {
      setIsAuthenticated(true);
      toast.success("Welcome back, Administrator!");
    } else {
      toast.error("Invalid credentials. Access denied.");
    }
  };

  const processAudioLink = (url: string = audioMagicLink) => {
    if (!url) {
      toast.error("Please enter an audio link to process.");
      return;
    }

    setIsProcessingAudio(true);
    
    // Using the improved extraction utility
    setTimeout(() => {
      const extractedAudio = extractAudioUrl(url);
      
      if (editingComicId) {
        onUpdateComic(editingComicId, {
          audioUrl: extractedAudio,
          audioImportLink: url
        });
        toast.success("Audio track processed and updated!");
      } else {
        setFormData(prev => ({
          ...prev,
          audioUrl: extractedAudio,
          audioImportLink: url
        }));
        toast.success("Audio track extracted successfully!");
      }
      setIsProcessingAudio(false);
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'illustrations' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'cover') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, coverUrl: url }));
      toast.success("Cover image uploaded!");
    } else if (type === 'illustrations') {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        toast.error("Please upload a PDF file for illustrations.");
        return;
      }
      
      setIsProcessingIllustration(true);
      try {
        const pageUrls = await extractPagesFromPDF(file);
        setFormData(prev => ({ 
          ...prev, 
          illustrationUrls: pageUrls 
        }));
        toast.success(`Extracted ${pageUrls.length} page(s) from PDF!`);
      } catch (error) {
        console.error("PDF processing error:", error);
        toast.error("Failed to process PDF file.");
      } finally {
        setIsProcessingIllustration(false);
      }
    } else if (type === 'audio') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, audioUrl: url }));
      toast.success("Audio track uploaded!");
    }
    
    // Reset input
    e.target.value = "";
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
    setFormData({ 
      title: "", 
      audioUrl: "", 
      coverUrl: "", 
      illustrationUrls: [], 
      notes: "",
      audioImportLink: "",
      illustrationImportLink: ""
    });
    setAudioMagicLink("");
    setActiveTab("manage");
  };

  const handleReprocess = (comic: Comic) => {
    setEditingComicId(comic.id);
    if (comic.audioImportLink) processAudioLink(comic.audioImportLink);
    // Illustration reprocessing from magic link is removed as requested to be PDF-only
    setTimeout(() => setEditingComicId(null), 3000);
  };

  const visibleComics = comics.filter(c => !c.deleted);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border-none rounded-xl px-6 h-11 transition-all hover:scale-105 active:scale-95">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Upload Comic</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[700px] bg-[#121214] border-white/5 shadow-3xl p-0 overflow-hidden rounded-3xl">
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
          <div className="flex flex-col h-[90vh]">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white">Creator Studio</h2>
                    <p className="text-xs text-slate-500">Manage your audio comic catalog</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsAuthenticated(false)} 
                  className="text-slate-500 hover:text-white"
                >
                  Sign Out
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-12 w-full grid grid-cols-2">
                  <TabsTrigger value="publish" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Publish New
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Catalog
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="publish" className="mt-0">
                  <div className="space-y-6">
                    {/* Magic Link Importers Section */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Audio Importer - Now Full Width since Illustration importer is removed */}
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-amber-500">
                          <FileAudio className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Audio Magic Link</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                              placeholder="Paste link (Dropbox, GDrive, etc.)..."
                              value={audioMagicLink}
                              onChange={(e) => setAudioMagicLink(e.target.value)}
                              className="pl-10 h-10 bg-white/5 border-white/10 rounded-xl text-white text-sm focus:ring-amber-500"
                            />
                          </div>
                          <Button 
                            type="button"
                            size="sm"
                            onClick={() => processAudioLink()}
                            disabled={isProcessingAudio || !audioMagicLink}
                            className="h-10 bg-amber-500 text-black hover:bg-amber-400 rounded-xl px-4 font-bold text-xs"
                          >
                            {isProcessingAudio ? "..." : "Import"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-white/5">
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
                        {/* Cover Upload */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                            Cover Image
                            {formData.coverUrl && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>}
                          </Label>
                          <div 
                            onClick={() => coverInputRef.current?.click()}
                            className={cn(
                              "relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                              formData.coverUrl ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            {formData.coverUrl ? (
                              <>
                                <img src={formData.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Cover" />
                                <div className="relative z-10 flex flex-col items-center">
                                  <ImagePlus className="w-8 h-8 text-emerald-500 mb-1" />
                                  <span className="text-xs font-bold text-emerald-500">Change Cover</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-slate-500" />
                                <span className="text-xs font-medium text-slate-500">Upload Cover Image</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              ref={coverInputRef}
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'cover')}
                            />
                          </div>
                        </div>

                        {/* Audio Upload */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                            Audio Track
                            {formData.audioUrl && <span className="text-amber-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>}
                          </Label>
                          <div 
                            onClick={() => audioInputRef.current?.click()}
                            className={cn(
                              "relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                              formData.audioUrl ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            {formData.audioUrl ? (
                              <div className="flex flex-col items-center">
                                <Music className="w-8 h-8 text-amber-500 mb-1" />
                                <span className="text-xs font-bold text-amber-500">Track Uploaded</span>
                                <span className="text-[10px] text-slate-500 mt-1 truncate max-w-[150px]">Click to replace</span>
                              </div>
                            ) : (
                              <>
                                <FileAudio className="w-8 h-8 text-slate-500" />
                                <span className="text-xs font-medium text-slate-500">Upload Audio File</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              ref={audioInputRef}
                              className="hidden" 
                              accept="audio/*"
                              onChange={(e) => handleFileUpload(e, 'audio')}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Illustration PDF Upload */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                          Illustration Pages (PDF)
                          {formData.illustrationUrls.length > 0 && (
                            <span className="text-sky-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {formData.illustrationUrls.length} Pages
                            </span>
                          )}
                        </Label>
                        
                        <div 
                          onClick={() => !isProcessingIllustration && illustrationsInputRef.current?.click()}
                          className={cn(
                            "relative min-h-[160px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all p-6",
                            formData.illustrationUrls.length > 0 ? "border-sky-500/50 bg-sky-500/5" : "border-white/10 hover:border-sky-500/50 bg-white/5 hover:bg-white/10",
                            isProcessingIllustration && "opacity-50 cursor-wait"
                          )}
                        >
                          {isProcessingIllustration ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                              <div className="text-center">
                                <p className="text-sm font-bold text-white">Processing PDF...</p>
                                <p className="text-xs text-slate-500">Extracting pages as illustrations</p>
                              </div>
                            </div>
                          ) : formData.illustrationUrls.length > 0 ? (
                            <div className="w-full space-y-4">
                              <div className="flex items-center justify-center gap-3">
                                <FileText className="w-8 h-8 text-sky-500" />
                                <div className="text-left">
                                  <p className="text-sm font-bold text-white">PDF Uploaded</p>
                                  <p className="text-xs text-slate-500">Click to replace PDF</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {formData.illustrationUrls.slice(0, 12).map((url, index) => (
                                  <div key={index} className="relative aspect-[3/4] bg-white/10 rounded-lg overflow-hidden border border-white/10">
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-[8px] px-1 rounded">
                                      {index + 1}
                                    </div>
                                  </div>
                                ))}
                                {formData.illustrationUrls.length > 12 && (
                                  <div className="aspect-[3/4] bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    +{formData.illustrationUrls.length - 12}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-bold text-white">Click to upload PDF</p>
                                <p className="text-xs text-slate-500">Each page will become a comic illustration</p>
                              </div>
                            </>
                          )}
                          
                          <input 
                            type="file" 
                            ref={illustrationsInputRef}
                            className="hidden" 
                            accept=".pdf"
                            onChange={(e) => handleFileUpload(e, 'illustrations')}
                            disabled={isProcessingIllustration}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</Label>
                        <Textarea
                          id="notes"
                          placeholder="Tell the story behind this episode..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="min-h-[100px] bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-xl shadow-amber-500/20"
                        disabled={isProcessingAudio || isProcessingIllustration || !formData.audioUrl || !formData.title || formData.illustrationUrls.length === 0}
                      >
                        Publish Episode
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="manage" className="mt-0">
                  <div className="space-y-4">
                    {visibleComics.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl border-dashed">
                        <p className="text-slate-500">No episodes published yet.</p>
                      </div>
                    ) : (
                      visibleComics.map((comic, index) => (
                        <div 
                          key={comic.id} 
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all",
                            !comic.enabled && "opacity-60 grayscale"
                          )}
                        >
                          <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                            <img src={comic.coverUrl} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white truncate">{comic.title}</h3>
                              {!comic.enabled && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Created {new Date(comic.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col mr-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onReorderComic(comic.id, 'up')}
                                disabled={index === 0}
                                className="h-5 w-8 rounded-t-lg hover:bg-white/10 text-slate-500 hover:text-white"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onReorderComic(comic.id, 'down')}
                                disabled={index === visibleComics.length - 1}
                                className="h-5 w-8 rounded-b-lg hover:bg-white/10 text-slate-500 hover:text-white"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>

                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => onToggleEnable(comic.id)}
                              title={comic.enabled ? "Disable Episode" : "Enable Episode"}
                              className={cn("h-10 w-10 rounded-xl", comic.enabled ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:text-white hover:bg-white/10")}
                            >
                              {comic.enabled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleReprocess(comic)}
                              disabled={isProcessingAudio || isProcessingIllustration}
                              title="Reprocess Link"
                              className="h-10 w-10 rounded-xl text-sky-500 hover:text-sky-400 hover:bg-sky-500/10"
                            >
                              <RefreshCw className={cn("w-5 h-5", editingComicId === comic.id && "animate-spin")} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if(confirm("Are you sure you want to delete this episode?")) {
                                  onDeleteComic(comic.id);
                                  toast.error("Episode deleted");
                                }
                              }}
                              title="Delete Episode"
                              className="h-10 w-10 rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};