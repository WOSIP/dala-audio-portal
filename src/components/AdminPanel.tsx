import React, { useState, useRef, useEffect } from "react";
import { Comic, Album, AppRole, UserManagementRecord, InvitedAccess } from "../types";
import { supabase, updateUserStatus, updateUserProfile, createUserByEmail, updateUserPassword, uploadFile } from "../lib/supabase";
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
  Image as ImageIcon,
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [audioMagicLink, setAudioMagicLink] = useState("");
  const [activeTab, setActiveTab] = useState("publish");
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const illustrationsInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const albumCoverInputRef = useRef<HTMLInputElement>(null);
  const albumSoundtrackInputRef = useRef<HTMLInputElement>(null);
  const editAlbumCoverInputRef = useRef<HTMLInputElement>(null);
  const editAlbumSoundtrackInputRef = useRef<HTMLInputElement>(null);
  const editComicCoverInputRef = useRef<HTMLInputElement>(null);
  const editComicAudioInputRef = useRef<HTMLInputElement>(null);
  const editComicIllustrationInputRef = useRef<HTMLInputElement>(null);

  // User Management State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementRecord | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  
  const [addUserPassword, setAddUserPassword] = useState("");
  const [addUserConfirmPassword, setAddUserConfirmPassword] = useState("");
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);

  const [newUserPassword, setNewUserPassword] = useState("");
  const [confirmUserPassword, setConfirmUserPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Comic Edit State
  const [editingComicId, setEditingComicId] = useState<string | null>(null);
  const [isEditComicOpen, setIsEditComicOpen] = useState(false);
  const [editComicForm, setEditComicForm] = useState<Partial<Comic>>({});
  const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);
  const [isUploadingEditAudio, setIsUploadingEditAudio] = useState(false);
  const [isFetchingEditAudio, setIsFetchingEditAudio] = useState(false);

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
  const [newInvitedEmail, setNewInvitedEmail] = useState("");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isProcessingIllustration, setIsProcessingIllustration] = useState(false);
  const [isProcessingEditIllustration, setIsProcessingEditIllustration] = useState(false);
  const [isUploadingEditSoundtrack, setIsUploadingEditSoundtrack] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        fetchUserRole(session.user.id);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        fetchUserRole(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching role:", error);
      return;
    }
    setUserRole(data.role as AppRole);
  };

  const fetchAllUsers = async () => {
    if (userRole !== 'admin' && userRole !== 'superadmin') return;
    
    setIsLoadingUsers(true);
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*');

    if (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } else {
      const mappedUsers: UserManagementRecord[] = (data || []).map((item: any) => ({
        id: item.user_id || item.profile_id || item.id,
        userId: item.user_id,
        role: item.role,
        email: item.email || 'No email found',
        name: item.name || item.full_name || '',
        isEnabled: item.is_enabled ?? true,
        createdAt: item.created_at || new Date().toISOString()
      }));
      setAllUsers(mappedUsers);
    }
    setIsLoadingUsers(false);
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      await updateUserProfile(userId, { role: newRole });
      toast.success("Role updated successfully");
      fetchAllUsers();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleToggleUserEnabled = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(userId, !currentStatus);
      toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, isEnabled: !currentStatus } : u));
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) {
      toast.error("Email is required");
      return;
    }

    if (addUserPassword && addUserPassword !== addUserConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (addUserPassword && addUserPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await createUserByEmail(newUserEmail, newUserName, newUserRole, addUserPassword);
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("viewer");
      setAddUserPassword("");
      setAddUserConfirmPassword("");
      fetchAllUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingPassword(true);
    try {
      await updateUserProfile(editingUser.id, {
        name: newUserName,
        role: newUserRole
      });

      if (newUserPassword) {
        if (newUserPassword !== confirmUserPassword) {
          toast.error("Passwords do not match");
          setIsUpdatingPassword(false);
          return;
        }
        if (newUserPassword.length < 6) {
          toast.error("Password must be at least 6 characters");
          setIsUpdatingPassword(false);
          return;
        }
        await updateUserPassword(editingUser.id, newUserPassword);
        toast.success("Profile and password updated");
      } else {
        toast.success("User updated successfully");
      }

      setIsEditUserOpen(false);
      setEditingUser(null);
      setNewUserPassword("");
      setConfirmUserPassword("");
      fetchAllUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const openEditModal = (user: UserManagementRecord) => {
    setEditingUser(user);
    setNewUserName(user.name || "");
    setNewUserRole(user.role);
    setNewUserPassword("");
    setConfirmUserPassword("");
    setIsEditUserOpen(true);
  };

  const openEditComicModal = async (comic: Comic) => {
    setEditingComicId(comic.id);
    
    // Optimized: If audioUrl is missing (lazy loaded), fetch it now for the admin
    let fullAudioUrl = comic.audioUrl;
    if (!fullAudioUrl) {
      try {
        setIsFetchingEditAudio(true);
        const { data, error } = await supabase
          .from('comics')
          .select('audio_url')
          .eq('id', comic.id)
          .single();
        if (!error && data) {
          fullAudioUrl = data.audio_url;
        }
      } catch (err) {
        console.error("Failed to fetch audio for edit:", err);
      } finally {
        setIsFetchingEditAudio(false);
      }
    }

    setEditComicForm({
      title: comic.title,
      notes: comic.notes,
      albumId: comic.albumId,
      enabled: comic.enabled,
      coverUrl: comic.coverUrl,
      audioUrl: fullAudioUrl,
      illustrationUrls: comic.illustrationUrls || []
    });
    setIsEditComicOpen(true);
  };

  const handleUpdateComicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComicId) return;
    onUpdateComic(editingComicId, editComicForm);
    toast.success("Episode updated successfully");
    setIsEditComicOpen(false);
    setEditingComicId(null);
  };

  useEffect(() => {
    if (activeTab === 'users' && (userRole === 'admin' || userRole === 'superadmin')) {
      fetchAllUsers();
    }
  }, [activeTab, userRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1Fsadmin1966") {
       setIsAuthenticated(true);
       setUserRole('admin');
       toast.success("Welcome back, Administrator!");
       return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  const processAudioLink = (url: string = audioMagicLink) => {
    if (!url) {
      toast.error("Please enter an audio link to process.");
      return;
    }
    setIsProcessingAudio(true);
    setTimeout(() => {
      const extractedAudio = extractAudioUrl(url);
      setFormData(prev => ({ ...prev, audioUrl: extractedAudio, audioImportLink: url }));
      toast.success("Audio track extracted successfully!");
      setIsProcessingAudio(false);
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'illustrations' | 'audio' | 'album-cover' | 'album-soundtrack' | 'edit-album-cover' | 'edit-album-soundtrack' | 'edit-comic-cover' | 'edit-comic-audio' | 'edit-comic-illustrations') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileName = `${Date.now()}_${file.name.replace(/\\s+/g, '_')}`;

    try {
      if (type === 'edit-comic-cover') {
        setIsUploadingEditCover(true);
        const publicUrl = await uploadFile('comics', `covers/${fileName}`, file);
        setEditComicForm(prev => ({ ...prev, coverUrl: publicUrl }));
        toast.success("Cover image updated!");
      } else if (type === 'edit-comic-audio') {
        setIsUploadingEditAudio(true);
        const publicUrl = await uploadFile('comics', `audio/${fileName}`, file);
        setEditComicForm(prev => ({ ...prev, audioUrl: publicUrl }));
        toast.success("Main audio track updated!");
      } else if (type === 'edit-comic-illustrations') {
        if (file.type !== 'application/pdf') {
          toast.error("Please upload a PDF file for illustrations.");
          return;
        }
        setIsProcessingEditIllustration(true);
        try {
          const pageUrls = await extractPagesFromPDF(file);
          setEditComicForm(prev => ({ ...prev, illustrationUrls: pageUrls }));
          toast.success(`Extracted ${pageUrls.length} page(s) from PDF!`);
        } catch (error) {
          toast.error("Failed to process PDF file.");
        } finally {
          setIsProcessingEditIllustration(false);
        }
      } else if (type === 'cover') {
        const publicUrl = await uploadFile('comics', `covers/${fileName}`, file);
        setFormData(prev => ({ ...prev, coverUrl: publicUrl }));
        toast.success("Cover image uploaded!");
      } else if (type === 'album-cover') {
        const publicUrl = await uploadFile('comics', `albums/${fileName}`, file);
        setAlbumFormData(prev => ({ ...prev, coverUrl: publicUrl }));
        toast.success("Album cover uploaded!");
      } else if (type === 'album-soundtrack') {
        const publicUrl = await uploadFile('comic_soundtracks', `soundtracks/${fileName}`, file);
        setAlbumFormData(prev => ({ ...prev, soundtrackUrl: publicUrl }));
        toast.success("Album soundtrack uploaded!");
      } else if (type === 'edit-album-cover') {
        if (editingAlbumId) {
          const publicUrl = await uploadFile('comics', `albums/${fileName}`, file);
          onUpdateAlbum(editingAlbumId, { coverUrl: publicUrl });
          toast.success("Album cover updated!");
        }
      } else if (type === 'edit-album-soundtrack') {
        if (editingAlbumId) {
          setIsUploadingEditSoundtrack(true);
          const publicUrl = await uploadFile('comic_soundtracks', `soundtracks/${fileName}`, file);
          onUpdateAlbum(editingAlbumId, { soundtrackUrl: publicUrl });
          toast.success("Album soundtrack updated!");
        }
      } else if (type === 'illustrations') {
        if (file.type !== 'application/pdf') {
          toast.error("Please upload a PDF file for illustrations.");
          return;
        }
        setIsProcessingIllustration(true);
        try {
          const pageUrls = await extractPagesFromPDF(file);
          setFormData(prev => ({ ...prev, illustrationUrls: pageUrls }));
          toast.success(`Extracted ${pageUrls.length} page(s) from PDF!`);
        } catch (error) {
          toast.error("Failed to process PDF file.");
        } finally {
          setIsProcessingIllustration(false);
        }
      } else if (type === 'audio') {
        const publicUrl = await uploadFile('comics', `audio/${fileName}`, file);
        setFormData(prev => ({ ...prev, audioUrl: publicUrl }));
        toast.success("Audio track uploaded!");
      }
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingEditCover(false);
      setIsUploadingEditAudio(false);
      setIsUploadingEditSoundtrack(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.audioUrl || !formData.albumId) {
      toast.error("Title, Audio, and Album are required.");
      return;
    }
    onAddComic(formData);
    toast.success("Episode published successfully!");
    setFormData({ 
      title: "", audioUrl: "", coverUrl: "", illustrationUrls: [], 
      notes: "", audioImportLink: "", illustrationImportLink: "", albumId: albums[0]?.id || ""
    });
    setAudioMagicLink("");
    setActiveTab("manage");
  };

  const handleAddAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumFormData.title || !albumFormData.coverUrl) {
      toast.error("Album title and cover are required.");
      return;
    }
    onAddAlbum(albumFormData);
    toast.success("Album created successfully!");
    setAlbumFormData({ title: "", description: "", coverUrl: "", soundtrackUrl: "", privacy: 'public', invitedAccess: [] });
  };

  const handleAddInvitedEmail = () => {
    if (!newInvitedEmail || !newInvitedEmail.includes('@')) {
      toast.error("Please enter a valid email");
      return;
    }
    if (editingAlbumId) {
      const album = albums.find(a => a.id === editingAlbumId);
      if (album) {
        if (album.invitedAccess.some(i => i.email.toLowerCase() === newInvitedEmail.toLowerCase())) {
           toast.error("Email already added");
           return;
        }
        const updatedAccess = [...album.invitedAccess, { email: newInvitedEmail, enabled: true }];
        onUpdateAlbum(editingAlbumId, { invitedAccess: updatedAccess });
        setNewInvitedEmail("");
        toast.success("User added to access list");
      }
    }
  };

  const handleToggleUserAccess = (email: string) => {
    if (editingAlbumId) {
      const album = albums.find(a => a.id === editingAlbumId);
      if (album) {
        const updatedAccess = album.invitedAccess.map(i => i.email === email ? { ...i, enabled: !i.enabled } : i);
        onUpdateAlbum(editingAlbumId, { invitedAccess: updatedAccess });
      }
    }
  };

  const handleRemoveUserAccess = (email: string) => {
    if (editingAlbumId) {
      const album = albums.find(a => a.id === editingAlbumId);
      if (album) {
        const updatedAccess = album.invitedAccess.filter(i => i.email !== email);
        onUpdateAlbum(editingAlbumId, { invitedAccess: updatedAccess });
        toast.info("User removed from access list");
      }
    }
  };

  const canManageContent = userRole === 'admin' || userRole === 'superadmin' || userRole === 'editor';
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
              <p className="text-sm text-slate-400 mt-2">Sign in to manage the Dala portal.</p>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</Label>
                <Input type="email" placeholder="kristalwos@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 sm:h-12 bg-white/5 border-white/10 rounded-xl text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password / Code</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Enter password..." value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12 h-11 sm:h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 sm:h-14 text-base sm:text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-xl shadow-amber-500/10">Sign In</Button>
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
                    <p className="text-[10px] text-slate-500">Role: <span className="text-amber-500 uppercase">{userRole || 'Loading...'}</span></p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-slate-500 hover:text-white h-8">Sign Out</Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-10 sm:h-12 w-full grid grid-cols-4 overflow-x-auto">
                  <TabsTrigger value="publish" disabled={!canManageContent} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Publish</TabsTrigger>
                  <TabsTrigger value="albums" disabled={!canManageContent} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Albums</TabsTrigger>
                  <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Catalog</TabsTrigger>
                  <TabsTrigger value="users" disabled={userRole !== 'admin' && userRole !== 'superadmin'} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold text-[9px] sm:text-sm px-1">Users</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="publish" className="mt-0">
                   <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 text-amber-500">
                        <FileAudio className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Audio Magic Link</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input placeholder="Paste link (Dropbox, GDrive...)" value={audioMagicLink} onChange={(e) => setAudioMagicLink(e.target.value)} className="w-full pl-10 h-10 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:ring-amber-500 focus:outline-none px-3" />
                        </div>
                        <Button type="button" size="sm" onClick={() => processAudioLink()} disabled={isProcessingAudio || !audioMagicLink} className="h-10 bg-amber-500 text-black hover:bg-amber-400 rounded-xl px-4 font-bold text-xs">{isProcessingAudio ? "..." : "Import"}</Button>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Episode Title</Label>
                          <Input id="title" placeholder="e.g. The Moon's Secret" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="h-11 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="album" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Album</Label>
                          <Select value={formData.albumId} onValueChange={(val) => setFormData({ ...formData, albumId: val })}>
                            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500 text-sm">
                              <SelectValue placeholder="Choose an album" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#121214] border-white/10 text-white">
                              {albums.map(album => (<SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">Cover Image {formData.coverUrl && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>}</Label>
                          <div onClick={() => coverInputRef.current?.click()} className={cn("relative h-32 sm:h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden", formData.coverUrl ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-white/10")}>
                            {formData.coverUrl ? (<><img src={formData.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Cover" /><div className="relative z-10 flex flex-col items-center"><ImagePlus className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500 mb-1" /><span className="text-[10px] sm:text-xs font-bold text-emerald-500">Change Cover</span></div></>) : (<><Upload className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" /><span className="text-[10px] sm:text-xs font-medium text-slate-500">Upload Cover Image</span></>)}
                            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">Audio Track {formData.audioUrl && <span className="text-amber-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>}</Label>
                          <div onClick={() => audioInputRef.current?.click()} className={cn("relative h-32 sm:h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all", formData.audioUrl ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5 hover:bg-white/10")}>
                            {formData.audioUrl ? (<div className="flex flex-col items-center"><Music className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 mb-1" /><span className="text-[10px] sm:text-xs font-bold text-amber-500">Track Uploaded</span><span className="text-[8px] sm:text-[10px] text-slate-500 mt-1 truncate max-w-[120px] sm:max-w-[150px]">Click to replace</span></div>) : (<><FileAudio className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" /><span className="text-[10px] sm:text-xs font-medium text-slate-500">Upload Audio File</span></>)}
                            <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">Illustrations (PDF) {formData.illustrationUrls.length > 0 && (<span className="text-sky-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {formData.illustrationUrls.length} Pages</span>)}</Label>
                        <div onClick={() => !isProcessingIllustration && illustrationsInputRef.current?.click()} className={cn("relative min-h-[120px] sm:min-h-[160px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 sm:gap-4 cursor-pointer transition-all p-4 sm:p-6", formData.illustrationUrls.length > 0 ? "border-sky-500/50 bg-sky-500/5" : "border-white/10 hover:border-sky-500/50 bg-white/5 hover:bg-white/10", isProcessingIllustration && "opacity-50 cursor-wait")}>
                          {isProcessingIllustration ? (<div className="flex flex-col items-center gap-2 sm:gap-3"><Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-sky-500 animate-spin" /><div className="text-center"><p className="text-xs sm:text-sm font-bold text-white">Processing PDF...</p></div></div>) : formData.illustrationUrls.length > 0 ? (<div className="w-full space-y-3 sm:space-y-4"><div className="flex items-center justify-center gap-2 sm:gap-3"><FileText className="w-7 h-7 sm:w-8 sm:h-8 text-sky-500" /><div className="text-left"><p className="text-[10px] sm:text-sm font-bold text-white">PDF Uploaded</p><p className="text-[8px] sm:text-xs text-slate-500">Click to replace PDF</p></div></div><div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">{formData.illustrationUrls.slice(0, 8).map((url, index) => (<div key={index} className="relative aspect-[3/4] bg-white/10 rounded-lg overflow-hidden border border-white/10"><img src={url} className="w-full h-full object-cover" alt="" /><div className="absolute bottom-0.5 right-0.5 bg-black/60 text-[7px] px-1 rounded">{index + 1}</div></div>))}</div></div>) : (<><div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500"><FileText className="w-5 h-5 sm:w-6 sm:h-6" /></div><div className="text-center"><p className="text-[10px] sm:text-sm font-bold text-white">Click to upload PDF</p><p className="text-[8px] sm:text-xs text-slate-500">Each page will become a comic illustration</p></div></>)}
                          <input type="file" ref={illustrationsInputRef} className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'illustrations')} disabled={isProcessingIllustration} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</Label>
                        <Textarea id="notes" placeholder="Tell the story behind this episode..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="min-h-[80px] sm:min-h-[100px] bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500 text-sm" />
                      </div>

                      <Button type="submit" className="w-full h-12 sm:h-14 text-base sm:text-lg font-black bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-xl shadow-amber-500/20" disabled={isProcessingAudio || isProcessingIllustration || !formData.audioUrl || !formData.title}>Publish Episode</Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="albums" className="mt-0">
                   {!editingAlbumId ? (
                     <div className="space-y-6 sm:space-y-8">
                        <form onSubmit={handleAddAlbumSubmit} className="space-y-4 bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl">
                           <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-500">Create New Album</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-4">
                                 <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Album Title</Label>
                                    <Input placeholder="e.g. Volume 1: Origins" value={albumFormData.title} onChange={(e) => setAlbumFormData({...albumFormData, title: e.target.value})} className="h-10 sm:h-11 bg-white/5 border-white/10 text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Privacy Setting</Label>
                                    <Select value={albumFormData.privacy} onValueChange={(val: 'public' | 'private') => setAlbumFormData({ ...albumFormData, privacy: val })}>
                                      <SelectTrigger className="h-10 sm:h-11 bg-white/5 border-white/10 text-white text-sm"><div className="flex items-center gap-2">{albumFormData.privacy === 'public' ? <Shield className="w-3.5 h-3.5 text-emerald-500" /> : <ShieldOff className="w-3.5 h-3.5 text-amber-500" />}<SelectValue /></div></SelectTrigger>
                                      <SelectContent className="bg-[#121214] border-white/10 text-white"><SelectItem value="public">Public (Everyone)</SelectItem><SelectItem value="private">Private (Invited Only)</SelectItem></SelectContent>
                                    </Select>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Album Cover</Label>
                                 <div onClick={() => albumCoverInputRef.current?.click()} className={cn("relative h-28 sm:h-[110px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden", albumFormData.coverUrl ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5")}>
                                    {albumFormData.coverUrl ? (<><img src={albumFormData.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" /><ImagePlus className="w-6 h-6 text-emerald-500 relative z-10" /></>) : (<Upload className="w-6 h-6 text-slate-500" />)}
                                    <input type="file" ref={albumCoverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'album-cover')} />
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2 pt-2">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">Album Soundtrack {albumFormData.soundtrackUrl && <span className="text-violet-500 font-bold"><CheckCircle2 className="w-3 h-3 inline mr-1" />Ready</span>}</Label>
                              <div onClick={() => albumSoundtrackInputRef.current?.click()} className={cn("relative h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all", albumFormData.soundtrackUrl ? "border-violet-500/50 bg-violet-500/5" : "border-white/10 hover:border-violet-500/50 bg-white/5")}>
                                 {albumFormData.soundtrackUrl ? (<div className="flex items-center gap-2"><Music2 className="w-4 h-4 text-violet-500" /><span className="text-[10px] font-bold text-violet-500">Soundtrack Added</span></div>) : (<div className="flex items-center gap-2"><Music2 className="w-4 h-4 text-slate-500" /><span className="text-[10px] font-medium text-slate-500">Upload Album Soundtrack (Optional)</span></div>)}
                                 <input type="file" ref={albumSoundtrackInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'album-soundtrack')} />
                              </div>
                           </div>

                           <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold h-11 rounded-xl text-sm">Create Album</Button>
                        </form>
                        <div className="space-y-4">
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-500">Manage Albums</h3>
                          <div className="grid gap-3">
                            {albums.map((album) => (
                              <div key={album.id} className={cn("flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10", !album.isEnabled && "opacity-60 grayscale")}>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-white/10"><img src={album.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                                <div className="flex-1 min-w-0"><h4 className="text-sm sm:text-base font-bold text-white truncate">{album.title}</h4><p className="text-[9px] sm:text-[10px] text-slate-500 uppercase">{album.privacy} \u2022 {comics.filter(c => c.albumId === album.id && !c.deleted).length} Ep</p></div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => setEditingAlbumId(album.id)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl text-amber-500 hover:bg-amber-500/10"><Edit className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => onToggleAlbumEnable(album.id)} className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl", album.isEnabled ? "text-emerald-500" : "text-slate-500")}>{album.isEnabled ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />}</Button>
                                  <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete this album?")) onDeleteAlbum(album.id); }} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-4 sm:space-y-6">
                        <Button variant="ghost" onClick={() => setEditingAlbumId(null)} className="gap-2 text-slate-400 hover:text-white px-0 text-xs"><ArrowLeft className="w-4 h-4" />Back to Albums</Button>
                        <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl space-y-6 sm:space-y-8">
                           <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                              <div onClick={() => editAlbumCoverInputRef.current?.click()} className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-amber-500/50 cursor-pointer shrink-0">
                                <img src={currentEditingAlbum?.coverUrl} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                                <input type="file" ref={editAlbumCoverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'edit-album-cover')} />
                              </div>
                              <div className="flex-1 w-full space-y-3 sm:space-y-4">
                                 <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase">Album Title</Label><Input value={currentEditingAlbum?.title} onChange={(e) => onUpdateAlbum(editingAlbumId, { title: e.target.value })} className="h-10 sm:h-11 bg-white/5 border-white/10 text-white font-bold text-sm" /></div>
                                 <div className="flex gap-3 sm:gap-4">
                                    <div className="flex-1 space-y-1 sm:space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase">Privacy</Label>
                                      <Select value={currentEditingAlbum?.privacy} onValueChange={(val: 'public' | 'private') => onUpdateAlbum(editingAlbumId, { privacy: val })}><SelectTrigger className="h-10 sm:h-11 bg-white/5 border-white/10 text-white text-xs sm:text-sm"><SelectValue /></SelectTrigger><SelectContent className="bg-[#121214] border-white/10 text-white"><SelectItem value="public">Public</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent></Select>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 pt-6"><Switch checked={currentEditingAlbum?.isEnabled} onCheckedChange={(checked) => onUpdateAlbum(editingAlbumId, { isEnabled: checked })} /><span className="text-[10px] sm:text-xs font-bold text-white">Enabled</span></div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <Label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">Ambient Soundtrack {currentEditingAlbum?.soundtrackUrl && <div className="flex items-center gap-2"><span className="text-violet-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onUpdateAlbum(editingAlbumId, { soundtrackUrl: "" }); }} className="h-6 w-6 text-rose-500"><X className="w-3 h-3" /></Button></div>}</Label>
                              <div onClick={() => !isUploadingEditSoundtrack && editAlbumSoundtrackInputRef.current?.click()} className={cn("relative h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all", currentEditingAlbum?.soundtrackUrl ? "border-violet-500/50 bg-violet-500/5" : "border-white/10 hover:border-violet-500/50 bg-white/5", isUploadingEditSoundtrack && "opacity-50 cursor-wait")}>
                                 {isUploadingEditSoundtrack ? (<Loader2 className="w-6 h-6 text-violet-500 animate-spin" />) : currentEditingAlbum?.soundtrackUrl ? (<div className="flex flex-col items-center"><Music2 className="w-5 h-5 text-violet-500" /><span className="text-[9px] font-bold text-violet-500">Soundtrack Uploaded</span><span className="text-[8px] text-slate-500">Click to replace</span></div>) : (<div className="flex flex-col items-center"><Music2 className="w-5 h-5 text-slate-500" /><span className="text-[9px] font-medium text-slate-500">Upload Soundtrack</span></div>)}
                                 <input type="file" ref={editAlbumSoundtrackInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'edit-album-soundtrack')} disabled={isUploadingEditSoundtrack} />
                              </div>
                           </div>

                           <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase">Description</Label><Textarea value={currentEditingAlbum?.description} onChange={(e) => onUpdateAlbum(editingAlbumId, { description: e.target.value })} className="bg-white/5 border-white/10 text-white min-h-[60px] sm:min-h-[80px] text-sm" placeholder="Describe this collection..." /></div>
                           {currentEditingAlbum?.privacy === 'private' && (
                             <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><h4 className="text-xs sm:text-sm font-bold text-amber-500 uppercase tracking-widest">Invited User Access</h4><div className="flex gap-2 w-full sm:w-64"><Input placeholder="Add email..." value={newInvitedEmail} onChange={(e) => setNewInvitedEmail(e.target.value)} className="h-9 text-xs bg-white/5 border-white/10" /><Button size="sm" onClick={handleAddInvitedEmail} className="bg-amber-500 text-black hover:bg-amber-400 h-9"><UserPlus className="w-4 h-4" /></Button></div></div>
                                <div className="grid gap-2">
                                   {currentEditingAlbum.invitedAccess.map((access) => (
                                     <div key={access.email} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/10"><div className="flex items-center gap-2 sm:gap-3"><Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" /><span className="text-xs sm:text-sm text-white">{access.email}</span></div><div className="flex items-center gap-2 sm:gap-3"><Switch checked={access.enabled} onCheckedChange={() => handleToggleUserAccess(access.email)} className="scale-75 sm:scale-100" /><Button variant="ghost" size="icon" onClick={() => handleRemoveUserAccess(access.email)} className="h-7 w-7 sm:h-8 sm:w-8 text-rose-500"><X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button></div></div>
                                   ))}
                                   {currentEditingAlbum.invitedAccess.length === 0 && (<p className="text-center py-4 text-[10px] sm:text-xs text-slate-500 italic">No users invited yet.</p>)}
                                </div>
                             </div>
                           )}
                           <div className="space-y-4 pt-4 border-t border-white/5">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">Episodes in this Album</h4>
                              <div className="grid gap-2">
                                 {comics.filter(c => c.albumId === editingAlbumId && !c.deleted).map(comic => (
                                   <div key={comic.id} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                      <img src={comic.coverUrl} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" alt="" />
                                      <div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-bold text-white truncate">{comic.title}</p><p className="text-[9px] sm:text-[10px] text-slate-500">{new Date(comic.createdAt).toLocaleDateString()}</p></div>
                                      <div className={cn("px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold", comic.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500")}>{comic.enabled ? "LIVE" : "HIDDEN"}</div>
                                      <Button variant="ghost" size="icon" onClick={() => openEditComicModal(comic)} className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500"><Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                                   </div>
                                 ))}
                                 {comics.filter(c => c.albumId === editingAlbumId && !c.deleted).length === 0 && (<p className="text-center py-4 text-[10px] sm:text-xs text-slate-500 italic">This album is empty.</p>)}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </TabsContent>

                <TabsContent value="manage" className="mt-0">
                   <div className="space-y-3 sm:space-y-4">
                    {visibleComics.length === 0 ? (
                      <div className="text-center py-16 sm:py-20 bg-white/5 border border-white/10 rounded-2xl border-dashed"><p className="text-sm text-slate-500">No episodes published yet.</p></div>
                    ) : (
                      visibleComics.map((comic, index) => (
                        <div key={comic.id} className={cn("flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 transition-all", !comic.enabled && "opacity-60 grayscale")}>
                          <div className="flex flex-col gap-1 mr-0.5 sm:mr-1 shrink-0">
                             <Button variant="ghost" size="icon" onClick={() => onReorderComic(comic.id, 'up')} disabled={index === 0} className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 hover:text-amber-500 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                             <Button variant="ghost" size="icon" onClick={() => onReorderComic(comic.id, 'down')} disabled={index === visibleComics.length - 1} className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500 hover:text-amber-500 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                          </div>
                          <div className="relative shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden border border-white/10"><img src={comic.coverUrl} className="w-full h-full object-cover" alt="" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                               <h3 className="text-xs sm:text-base font-bold text-white truncate">{comic.title}</h3>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase">Album:</span>
                              <Select value={comic.albumId} onValueChange={(val) => onUpdateComic(comic.id, { albumId: val })}>
                                <SelectTrigger className="h-5 sm:h-6 bg-transparent border-none text-[9px] sm:text-[10px] text-amber-500 p-0 focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#121214] border-white/10 text-white">
                                  {albums.map(a => (<SelectItem key={a.id} value={a.id} className="text-[10px] sm:text-xs">{a.title}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {canManageContent && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEditComicModal(comic)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl text-amber-500"><Edit className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => onToggleEnable(comic.id)} className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl", comic.enabled ? "text-emerald-500" : "text-slate-500")}>{comic.enabled ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />}</Button>
                                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Delete?")) onDeleteComic(comic.id); }} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl text-rose-500"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <div className="flex items-center gap-2 text-amber-500"><Users className="w-5 h-5" /><h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest">User Management</h3></div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="ghost" size="sm" onClick={fetchAllUsers} className="text-[10px] sm:text-xs text-slate-500 h-8"><RefreshCw className={cn("w-3 h-3 mr-2", isLoadingUsers && "animate-spin")} />Refresh</Button>
                          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild><Button className="h-8 sm:h-9 bg-amber-500 text-black hover:bg-amber-400 font-bold text-[10px] sm:text-xs rounded-lg sm:rounded-xl flex-1 sm:flex-none"><UserPlus className="w-3.5 h-3.5 mr-2" />Add User</Button></DialogTrigger>
                            <DialogContent className="bg-[#121214] border-white/5 text-white w-[95vw] sm:max-w-[450px] rounded-2xl">
                              <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                              <form onSubmit={handleAddUser} className="space-y-4 pt-2 sm:pt-4">
                                <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] text-slate-500 uppercase">Email Address</Label><Input type="email" placeholder="user@example.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="h-10 bg-white/5 border-white/10 text-sm" required /></div>
                                <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] text-slate-500 uppercase">Full Name</Label><Input placeholder="John Doe" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="h-10 bg-white/5 border-white/10 text-sm" /></div>
                                <div className="space-y-1 sm:space-y-2">
                                  <Label className="text-[10px] text-slate-500 uppercase">Role</Label>
                                  <Select value={newUserRole} onValueChange={(val: AppRole) => setNewUserRole(val)}><SelectTrigger className="h-10 bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger><SelectContent className="bg-[#121214] border-white/10 text-white"><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select>
                                </div>
                                <div className="pt-3 sm:pt-4 border-t border-white/5 space-y-3 sm:space-y-4">
                                   <div className="flex items-center gap-2 text-amber-500"><Key className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">Set Password</span></div>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                      <div className="space-y-1 sm:space-y-2"><Label className="text-[9px] text-slate-500 uppercase">Password</Label><div className="relative"><Input type={showAddUserPassword ? "text" : "password"} placeholder="******" value={addUserPassword} onChange={(e) => setAddUserPassword(e.target.value)} className="bg-white/5 border-white/10 h-10 pr-10 text-sm" required /><button type="button" onClick={() => setShowAddUserPassword(!showAddUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showAddUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                                      <div className="space-y-1 sm:space-y-2"><Label className="text-[9px] text-slate-500 uppercase">Confirm</Label><Input type={showAddUserPassword ? "text" : "password"} placeholder="******" value={addUserConfirmPassword} onChange={(e) => setAddUserConfirmPassword(e.target.value)} className="bg-white/5 border-white/10 h-10 text-sm" required /></div>
                                   </div>
                                </div>
                                <DialogFooter className="pt-2"><Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold h-10 sm:h-11">Create User</Button></DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                       </div>
                    </div>

                    <div className="space-y-3">
                      {allUsers.map(u => (
                        <div key={u.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 gap-3", !u.isEnabled && "opacity-60 grayscale")}>
                          <div className="flex items-center gap-3"><Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/10"><AvatarImage src={u.avatarUrl} /><AvatarFallback className="bg-slate-800 text-slate-400 font-bold text-xs">{u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-xs sm:text-sm font-bold text-white truncate">{u.name || "Unnamed User"}</p>{!u.isEnabled && (<span className="text-[7px] sm:text-[8px] bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Disabled</span>)}</div><p className="text-[10px] sm:text-xs text-slate-400 truncate">{u.email}</p></div></div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                            <div className="flex items-center gap-2"><Label className="text-[9px] text-slate-500 uppercase shrink-0">Role</Label><Select value={u.role} onValueChange={(val: AppRole) => handleUpdateRole(u.id, val)}><SelectTrigger className="w-24 sm:w-28 h-8 sm:h-9 bg-white/5 border-white/10 text-white text-[10px] sm:text-xs"><SelectValue /></SelectTrigger><SelectContent className="bg-[#121214] border-white/10 text-white"><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div>
                            <div className="flex items-center gap-2 sm:gap-3 border-l border-white/10 pl-3 sm:pl-4"><div className="flex items-center gap-2"><Switch checked={u.isEnabled} onCheckedChange={() => handleToggleUserEnabled(u.id, u.isEnabled)} className="scale-75 sm:scale-90" /></div><Button variant="ghost" size="icon" onClick={() => openEditModal(u)} className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-white"><Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button></div>
                          </div>
                        </div>
                      ))}
                      {allUsers.length === 0 && !isLoadingUsers && (<div className="text-center py-10 text-xs text-slate-500">No users found.</div>)}
                    </div>
                  </div>

                  <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                    <DialogContent className="bg-[#121214] border-white/5 text-white w-[95vw] sm:max-w-[450px] rounded-2xl">
                      <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
                      {editingUser && (
                        <form onSubmit={handleUpdateUser} className="space-y-4 pt-2 sm:pt-4">
                          <div className="space-y-1 sm:space-y-2 opacity-50"><Label className="text-[10px] text-slate-500 uppercase">Email (Fixed)</Label><Input value={editingUser.email} disabled className="h-10 bg-white/5 border-white/10 text-sm" /></div>
                          <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] text-slate-500 uppercase">Full Name</Label><Input placeholder="John Doe" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="h-10 bg-white/5 border-white/10 text-sm" /></div>
                          <div className="space-y-1 sm:space-y-2"><Label className="text-[10px] text-slate-500 uppercase">Role</Label><Select value={newUserRole} onValueChange={(val: AppRole) => setNewUserRole(val)}><SelectTrigger className="h-10 bg-white/5 border-white/10 text-sm"><SelectValue /></SelectTrigger><SelectContent className="bg-[#121214] border-white/10 text-white"><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select>
                        </div>
                          <div className="pt-3 sm:pt-4 border-t border-white/5 space-y-3 sm:space-y-4">
                             <div className="flex items-center gap-2 text-amber-500"><Key className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">Change Password</span></div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-1 sm:space-y-2"><Label className="text-[9px] text-slate-500 uppercase">New Pass</Label><div className="relative"><Input type={showUserPassword ? "text" : "password"} placeholder="******" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="bg-white/5 border-white/10 h-10 pr-9 text-sm" /><button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button></div></div>
                                <div className="space-y-1 sm:space-y-2"><Label className="text-[9px] text-slate-500 uppercase">Confirm</Label><Input type={showUserPassword ? "text" : "password"} placeholder="******" value={confirmUserPassword} onChange={(e) => setConfirmUserPassword(e.target.value)} className="bg-white/5 border-white/10 h-10 text-sm" /></div>
                             </div>
                             <p className="text-[9px] text-slate-500">Leave blank to keep current password.</p>
                          </div>
                          <DialogFooter className="pt-2"><Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold h-10 sm:h-11" disabled={isUpdatingPassword}>{isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes</Button></DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Edit Comic Dialog */}
      <Dialog open={isEditComicOpen} onOpenChange={setIsEditComicOpen}>
        <DialogContent className="bg-[#121214] border-white/5 text-white w-[95vw] sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateComicSubmit} className="space-y-4 pt-4 h-[75vh] sm:h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3 sm:space-y-4 pb-4 border-b border-white/5">
              <Label className="text-[10px] text-slate-500 uppercase block mb-1 sm:mb-2">Episode Cover</Label>
              <div 
                onClick={() => !isUploadingEditCover && editComicCoverInputRef.current?.click()} 
                className={cn(
                  "relative h-36 sm:h-48 rounded-xl sm:rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                  isUploadingEditCover ? "opacity-50 cursor-wait" : "hover:border-amber-500/50 hover:bg-white/5"
                )}
              >
                {isUploadingEditCover ? (
                  <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 animate-spin" />
                ) : editComicForm.coverUrl ? (
                  <>
                    <img src={editComicForm.coverUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        <span className="text-[10px] sm:text-xs font-bold text-white">Change Cover</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500" />
                    <span className="text-[10px] sm:text-xs text-slate-500">Upload Cover Image</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={editComicCoverInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'edit-comic-cover')} 
                  disabled={isUploadingEditCover}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase">Title</Label>
              <Input value={editComicForm.title || ""} onChange={(e) => setEditComicForm({ ...editComicForm, title: e.target.value })} className="h-10 bg-white/5 border-white/10 text-sm" />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
               <Label className="text-[10px] text-slate-500 uppercase flex justify-between tracking-widest">Main Audio Track {(editComicForm.audioUrl || isFetchingEditAudio) && <span className="text-amber-500 flex items-center gap-1 font-bold">{isFetchingEditAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3" /> Ready</>}</span>}</Label>
               <div 
                 onClick={() => !isUploadingEditAudio && !isFetchingEditAudio && editComicAudioInputRef.current?.click()}
                 className={cn(
                    "relative h-16 sm:h-20 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/50 bg-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all",
                    (isUploadingEditAudio || isFetchingEditAudio) && "opacity-50 cursor-wait"
                 )}
               >
                  {isUploadingEditAudio || isFetchingEditAudio ? (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : editComicForm.audioUrl ? (
                    <div className="flex flex-col items-center">
                      <Music className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-amber-500">Change Audio Track</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileAudio className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                      <span className="text-[9px] sm:text-[10px] text-slate-500">Upload Audio</span>
                    </div>
                  )}
                  <input type="file" ref={editComicAudioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileUpload(e, 'edit-comic-audio')} />
               </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase flex justify-between">Illustrations (PDF) {editComicForm.illustrationUrls && editComicForm.illustrationUrls.length > 0 && (<span className="text-sky-500 flex items-center gap-1 font-bold"><CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {editComicForm.illustrationUrls.length} Pgs</span>)}</Label>
              <div 
                onClick={() => !isProcessingEditIllustration && editComicIllustrationInputRef.current?.click()} 
                className={cn(
                  "relative min-h-[80px] sm:min-h-[100px] rounded-xl sm:rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all p-3 sm:p-4",
                  isProcessingEditIllustration ? "opacity-50 cursor-wait" : "hover:border-sky-500/50 hover:bg-white/5",
                  editComicForm.illustrationUrls && editComicForm.illustrationUrls.length > 0 ? "border-sky-500/30" : "border-white/10"
                )}
              >
                {isProcessingEditIllustration ? (
                  <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                ) : editComicForm.illustrationUrls && editComicForm.illustrationUrls.length > 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-sky-500">Update PDF</span>
                    <span className="text-[7px] sm:text-[8px] text-slate-500">{editComicForm.illustrationUrls.length} pages</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                    <span className="text-[9px] sm:text-[10px] text-slate-500">Upload Illustrations (PDF)</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={editComicIllustrationInputRef} 
                  className="hidden" 
                  accept=".pdf" 
                  onChange={(e) => handleFileUpload(e, 'edit-comic-illustrations')} 
                  disabled={isProcessingEditIllustration}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase">Album</Label>
              <Select value={editComicForm.albumId} onValueChange={(val) => setEditComicForm({ ...editComicForm, albumId: val })}>
                <SelectTrigger className="h-10 bg-white/5 border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10 text-white">
                  {albums.map(a => (<SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-[10px] text-slate-500 uppercase">Description</Label>
              <Textarea value={editComicForm.notes || ""} onChange={(e) => setEditComicForm({ ...editComicForm, notes: e.target.value })} className="bg-white/5 border-white/10 min-h-[80px] sm:min-h-[100px] text-sm" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
               <Switch checked={editComicForm.enabled} onCheckedChange={(checked) => setEditComicForm({ ...editComicForm, enabled: checked })} className="scale-90" />
               <span className="text-[10px] sm:text-xs font-bold text-white uppercase">Enabled / Visible</span>
            </div>
            <DialogFooter className="pt-4 sticky bottom-0 bg-[#121214] pb-2">
              <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold h-11 text-sm" disabled={isUploadingEditCover || isUploadingEditAudio || isProcessingEditIllustration}>
                {(isUploadingEditCover || isUploadingEditAudio || isProcessingEditIllustration) ? "Processing..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};