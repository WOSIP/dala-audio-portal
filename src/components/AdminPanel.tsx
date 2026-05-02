import React, { useState, useRef, useEffect } from "react";
import { Comic, Album, AppRole, UserManagementRecord, InvitedAccess } from "../types";
import { supabase, uploadFile } from "../lib/supabase";
import { fetchUserRole as getRole, fetchAllUsers as getUsers, fetchComicAudio } from "../data";
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
  ImageIcon,
  ArrowUp,
  ArrowDown,
  Link2,
  X,
  Upload,
  ImagePlus,
  Music,
  Music2,
  FileText,
  Loader2,
  Layers,
  Mail,
  Shield,
  ShieldOff,
  Users,
  UserCheck,
  Edit,
  ArrowLeft,
  UserPlus,
  MoreVertical,
  Circle,
  Key,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";
import { extractAudioUrl } from "../utils/audio-extractor";
import { extractPagesFromPDF } from "../utils/pdf-handler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminPanelProps {
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
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
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
  onToggleAlbumEnable
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [allUsers, setAllUsers] = useState<UserManagementRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("publish");
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const illustrationsInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const albumCoverInputRef = useRef<HTMLInputElement>(null);
  const albumSoundtrackInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<{
    title: string;
    audioUrl: string;
    coverUrl: string;
    illustrationUrls: string[];
    notes: string;
    audioImportLink: string;
    illustrationImportLink: string;
    albumId: string;
  }>({
    title: "",
    audioUrl: "",
    coverUrl: "",
    illustrationUrls: [],
    notes: "",
    audioImportLink: "",
    illustrationImportLink: "",
    albumId: albums[0]?.id || ""
  });

  const [albumFormData, setAlbumFormData] = useState<{
    title: string;
    description: string;
    coverUrl: string;
    soundtrackUrl: string;
    privacy: 'public' | 'private';
    invitedAccess: InvitedAccess[];
  }>({
    title: "",
    description: "",
    coverUrl: "",
    soundtrackUrl: "",
    privacy: 'public',
    invitedAccess: []
  });

  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isProcessingIllustration, setIsProcessingIllustration] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        const role = await getRole(session.user.id);
        setUserRole(role);
      }
    };
    checkAuth();
  }, [isOpen]);

  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAllUsers();
    }
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setIsAuthenticated(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = await getRole(user.id);
        setUserRole(role);
      }
      toast.success("Welcome to Creator Studio!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    toast.info("Signed out");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'illustrations' | 'audio' | 'albumCover' | 'albumSoundtrack') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (type === 'illustrations') {
        setIsProcessingIllustration(true);
        const urls = [];
        for (const file of Array.from(files)) {
          const path = `illustrations/${Date.now()}-${file.name}`;
          const url = await uploadFile('comic_assets', path, file);
          urls.push(url);
        }
        setFormData(prev => ({ ...prev, illustrationUrls: [...prev.illustrationUrls, ...urls] }));
        toast.success(`Uploaded ${urls.length} illustrations`);
      } else {
        const file = files[0];
        const bucket = (type === 'audio' || type === 'albumSoundtrack') ? 'comic_soundtracks' : 'comic_assets';
        const path = `${type}/${Date.now()}-${file.name}`;
        
        if (type === 'audio') setIsProcessingAudio(true);
        
        const url = await uploadFile(bucket, path, file);
        
        if (type === 'cover') setFormData(prev => ({ ...prev, coverUrl: url }));
        if (type === 'audio') setFormData(prev => ({ ...prev, audioUrl: url }));
        if (type === 'albumCover') setAlbumFormData(prev => ({ ...prev, coverUrl: url }));
        if (type === 'albumSoundtrack') setAlbumFormData(prev => ({ ...prev, soundtrackUrl: url }));
        
        toast.success("Upload complete!");
      }
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsProcessingAudio(false);
      setIsProcessingIllustration(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAddComic(formData);
      setFormData({
        title: "",
        audioUrl: "",
        coverUrl: "",
        illustrationUrls: [],
        notes: "",
        audioImportLink: "",
        illustrationImportLink: "",
        albumId: albums[0]?.id || ""
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAddAlbum(albumFormData);
      setAlbumFormData({
        title: "",
        description: "",
        coverUrl: "",
        soundtrackUrl: "",
        privacy: 'public',
        invitedAccess: []
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManageContent = userRole === 'admin' || userRole === 'superadmin' || userRole === 'editor' || userRole === 'role3';
  const visibleComics = comics.filter(c => !c.deleted);
  const currentEditingAlbum = editingAlbumId ? albums.find(a => a.id === editingAlbumId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border-none rounded-xl px-4 sm:px-6 h-10 sm:h-11 transition-all hover:scale-105 active:scale-95">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Admin Panel</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[750px] w-[95vw] sm:w-full bg-[#121214] border-white/5 shadow-3xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl">
        {!isAuthenticated ? (
          <div className="p-6 sm:p-10">
            <DialogHeader className="mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">Creator Access</DialogTitle>
              <p className="text-sm text-slate-400 mt-2">Please sign in to access the management studio.</p>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</Label>
                <Input type="email" placeholder="kristalwos@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 sm:h-12 bg-white/5 border-white/10 rounded-xl text-white" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12 h-11 sm:h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 sm:h-14 text-base sm:text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-xl shadow-amber-500/10">
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-[85vh] sm:h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">Creator Studio</h2>
                    <p className="text-[10px] text-slate-500">Mode: <span className="text-emerald-500 uppercase font-bold">Online</span></p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-slate-500 hover:text-white h-8">Sign Out</Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-10 sm:h-12 w-full grid grid-cols-4 overflow-x-auto">
                  <TabsTrigger value="publish" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Publish</TabsTrigger>
                  <TabsTrigger value="albums" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Albums</TabsTrigger>
                  <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Catalog</TabsTrigger>
                  <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Users</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="publish" className="mt-0">
                   <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Episode Title</Label>
                          <Input placeholder="Episode name" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} className="h-11 bg-white/5 border-white/10 rounded-xl text-white" required />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Album</Label>
                          <Select value={formData.albumId} onValueChange={(v) => setFormData(p => ({ ...p, albumId: v }))}>
                            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white">
                              <SelectValue placeholder="Choose an album" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#121214] border-white/10 text-white">
                              {albums.map(album => (
                                <SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cover Image</Label>
                           <div 
                            onClick={() => coverInputRef.current?.click()}
                            className="h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                           >
                             {formData.coverUrl ? (
                               <img src={formData.coverUrl} className="h-full w-full object-cover rounded-2xl" />
                             ) : (
                               <><ImagePlus className="w-6 h-6 text-slate-500 mb-2" /><span className="text-[10px] font-medium text-slate-500 uppercase">Upload Cover</span></>
                             )}
                           </div>
                           <input type="file" ref={coverInputRef} onChange={(e) => handleFileUpload(e, 'cover')} className="hidden" accept="image/*" />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Audio Track</Label>
                           <div 
                            onClick={() => audioInputRef.current?.click()}
                            className="h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                           >
                             {isProcessingAudio ? (
                               <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                             ) : formData.audioUrl ? (
                               <><Music2 className="w-6 h-6 text-emerald-500 mb-2" /><span className="text-[10px] font-medium text-emerald-500 uppercase">Audio Ready</span></>
                             ) : (
                               <><Music className="w-6 h-6 text-slate-500 mb-2" /><span className="text-[10px] font-medium text-slate-500 uppercase">Upload Audio</span></>
                             )}
                           </div>
                           <input type="file" ref={audioInputRef} onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" accept="audio/*" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description / Notes</Label>
                        <Textarea placeholder="Enter episode details..." value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl min-h-[100px] text-white" />
                      </div>

                      <Button type="submit" disabled={isSubmitting || !formData.title || !formData.albumId} className="w-full h-12 sm:h-14 font-black bg-amber-500 hover:bg-amber-400 text-black">
                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Publish Episode"}
                      </Button>
                    </form>
                </TabsContent>

                <TabsContent value="manage" className="mt-0">
                   <div className="space-y-3">
                    {visibleComics.map((comic) => (
                      <div key={comic.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"><img src={comic.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{comic.title}</h4>
                          <p className="text-[10px] text-slate-500">{albums.find(a => a.id === comic.albumId)?.title}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onToggleEnable(comic.id)} className={cn("h-8 w-8", comic.enabled ? "text-emerald-500" : "text-slate-500")}>
                            {comic.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteComic(comic.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={u.avatarUrl} />
                              <AvatarFallback className="bg-slate-800 text-xs">{u.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-white">{u.name || "User"}</p>
                              <p className="text-[10px] text-slate-500">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-amber-500 uppercase px-2 py-0.5 bg-amber-500/10 rounded">{u.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="albums" className="mt-0">
                   <div className="mb-6 p-4 border border-white/5 bg-white/[0.02] rounded-2xl">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-amber-500" />
                        Create New Album
                      </h3>
                      <form onSubmit={handleAddAlbumSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Album Title</Label>
                            <Input value={albumFormData.title} onChange={(e) => setAlbumFormData(p => ({ ...p, title: e.target.value }))} className="h-10 bg-white/5 border-white/10 rounded-lg text-white" placeholder="Universe name" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Privacy</Label>
                            <Select value={albumFormData.privacy} onValueChange={(v: any) => setAlbumFormData(p => ({ ...p, privacy: v }))}>
                              <SelectTrigger className="h-10 bg-white/5 border-white/10 rounded-lg text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#121214] border-white/10 text-white">
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div onClick={() => albumCoverInputRef.current?.click()} className="h-20 border-2 border-dashed border-white/10 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden">
                            {albumFormData.coverUrl ? <img src={albumFormData.coverUrl} className="h-full w-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-500" />}
                          </div>
                          <div onClick={() => albumSoundtrackInputRef.current?.click()} className="h-20 border-2 border-dashed border-white/10 rounded-xl bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden">
                            {albumFormData.soundtrackUrl ? <Music2 className="w-5 h-5 text-emerald-500" /> : <Music className="w-5 h-5 text-slate-500" />}
                          </div>
                          <input type="file" ref={albumCoverInputRef} onChange={(e) => handleFileUpload(e, 'albumCover')} className="hidden" accept="image/*" />
                          <input type="file" ref={albumSoundtrackInputRef} onChange={(e) => handleFileUpload(e, 'albumSoundtrack')} className="hidden" accept="audio/*" />
                        </div>
                        <Button type="submit" disabled={!albumFormData.title || isSubmitting} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Album"}
                        </Button>
                      </form>
                   </div>

                   <div className="space-y-3">
                    {albums.map((album) => (
                      <div key={album.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0"><img src={album.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{album.title}</h4>
                          <p className="text-[10px] text-slate-500 uppercase">{album.privacy}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onToggleAlbumEnable(album.id)} className={cn("h-8 w-8", album.isEnabled ? "text-emerald-500" : "text-slate-500")}>
                            {album.isEnabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteAlbum(album.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
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