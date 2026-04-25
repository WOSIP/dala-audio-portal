import React, { useState, useRef, useEffect } from "react";
import { Comic, Album, AppRole, UserManagementRecord, InvitedAccess } from "../types";
import { supabase, updateUserStatus, updateUserProfile, createUserByEmail, updateUserPassword } from "../lib/supabase";
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
  Key
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
  const editAlbumCoverInputRef = useRef<HTMLInputElement>(null);

  // User Management State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementRecord | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  
  // Add User specific password state
  const [addUserPassword, setAddUserPassword] = useState("");
  const [addUserConfirmPassword, setAddUserConfirmPassword] = useState("");
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);

  // Password Management State (for editing)
  const [newUserPassword, setNewUserPassword] = useState("");
  const [confirmUserPassword, setConfirmUserPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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
    privacy: 'public' | 'private';
    invitedAccess: InvitedAccess[];
  }>({
    title: "",
    description: "",
    coverUrl: "",
    privacy: 'public',
    invitedAccess: []
  });

  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [newInvitedEmail, setNewInvitedEmail] = useState("");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isProcessingIllustration, setIsProcessingIllustration] = useState(false);
  const [editingComicId, setEditingComicId] = useState<string | null>(null);

  // Check session and role on mount
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
      // Update local state immediately for better UX
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
      // Update Name and Role
      await updateUserProfile(editingUser.id, {
        name: newUserName,
        role: newUserRole
      });

      // Update Password if provided
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'illustrations' | 'audio' | 'album-cover' | 'edit-album-cover') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'cover') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, coverUrl: url }));
      toast.success("Cover image uploaded!");
    } else if (type === 'album-cover') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setAlbumFormData(prev => ({ ...prev, coverUrl: url }));
      toast.success("Album cover uploaded!");
    } else if (type === 'edit-album-cover') {
      const file = files[0];
      const url = URL.createObjectURL(file);
      if (editingAlbumId) {
        onUpdateAlbum(editingAlbumId, { coverUrl: url });
        toast.success("Album cover updated!");
      }
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
    
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.audioUrl || !formData.albumId) {
      toast.error("Title, Audio, and Album are required.");
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
      illustrationImportLink: "",
      albumId: albums[0]?.id || ""
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
    setAlbumFormData({ title: "", description: "", coverUrl: "", privacy: 'public', invitedAccess: [] });
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
        const updatedAccess = album.invitedAccess.map(i => 
          i.email === email ? { ...i, enabled: !i.enabled } : i
        );
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
        <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold border-none rounded-xl px-6 h-11 transition-all hover:scale-105 active:scale-95">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Admin Panel</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[750px] bg-[#121214] border-white/5 shadow-3xl p-0 overflow-hidden rounded-3xl">
        {!isAuthenticated ? (
          <div className="p-10">
            <DialogHeader className="mb-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                <Lock className="w-8 h-8" />
              </div>
              <DialogTitle className="text-3xl font-black tracking-tight text-white">Creator Access</DialogTitle>
              <p className="text-slate-400 mt-2">Sign in to manage the Dala portal.</p>
            </DialogHeader>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</Label>
                <Input
                  type="email"
                  placeholder="kristalwos@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 rounded-xl text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password / Code</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12 h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500"
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
                Sign In
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col h-[90vh]">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white">Creator Studio</h2>
                    <p className="text-xs text-slate-500">Role: <span className="text-amber-500 uppercase">{userRole || 'Loading...'}</span></p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut} 
                  className="text-slate-500 hover:text-white"
                >
                  Sign Out
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-12 w-full grid grid-cols-4">
                  <TabsTrigger value="publish" disabled={!canManageContent} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    Publish
                  </TabsTrigger>
                  <TabsTrigger value="albums" disabled={!canManageContent} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    Albums
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    Catalog
                  </TabsTrigger>
                  <TabsTrigger value="users" disabled={userRole !== 'admin' && userRole !== 'superadmin'} className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold">
                    Users
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="publish" className="mt-0">
                   <div className="space-y-6">
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

                    <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="space-y-2">
                          <Label htmlFor="album" className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Album</Label>
                          <Select 
                            value={formData.albumId} 
                            onValueChange={(val) => setFormData({ ...formData, albumId: val })}
                          >
                            <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white focus:ring-amber-500">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <TabsContent value="albums" className="mt-0">
                   {!editingAlbumId ? (
                     <div className="space-y-8">
                        <form onSubmit={handleAddAlbumSubmit} className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-2xl">
                           <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500">Create New Album</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                 <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Album Title</Label>
                                    <Input 
                                       placeholder="e.g. Volume 1: Origins" 
                                       value={albumFormData.title}
                                       onChange={(e) => setAlbumFormData({...albumFormData, title: e.target.value})}
                                       className="h-11 bg-white/5 border-white/10"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Privacy Setting</Label>
                                    <Select 
                                      value={albumFormData.privacy} 
                                      onValueChange={(val: 'public' | 'private') => setAlbumFormData({ ...albumFormData, privacy: val })}
                                    >
                                      <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                                        <div className="flex items-center gap-2">
                                          {albumFormData.privacy === 'public' ? <Shield className="w-4 h-4 text-emerald-500" /> : <ShieldOff className="w-4 h-4 text-amber-500" />}
                                          <SelectValue />
                                        </div>
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#121214] border-white/10 text-white">
                                        <SelectItem value="public">Public (Everyone)</SelectItem>
                                        <SelectItem value="private">Private (Invited Only)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Album Cover</Label>
                                 <div 
                                    onClick={() => albumCoverInputRef.current?.click()}
                                    className={cn(
                                       "relative h-[155px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all overflow-hidden",
                                       albumFormData.coverUrl ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-amber-500/50 bg-white/5"
                                    )}
                                 >
                                    {albumFormData.coverUrl ? (
                                       <>
                                          <img src={albumFormData.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                                          <ImagePlus className="w-6 h-6 text-emerald-500 relative z-10" />
                                       </>
                                    ) : (
                                       <Upload className="w-6 h-6 text-slate-500" />
                                    )}
                                    <input 
                                       type="file" 
                                       ref={albumCoverInputRef}
                                       className="hidden" 
                                       accept="image/*"
                                       onChange={(e) => handleFileUpload(e, 'album-cover')}
                                    />
                                 </div>
                              </div>
                           </div>

                           <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold h-11 rounded-xl">
                              Create Album
                           </Button>
                        </form>

                        {/* Album Management Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Manage Albums</h3>
                          <div className="grid gap-3">
                            {albums.map((album) => (
                              <div 
                                key={album.id} 
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10",
                                  !album.isEnabled && "opacity-60 grayscale"
                                )}
                              >
                                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                  <img src={album.coverUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-white truncate">{album.title}</h4>
                                  <p className="text-[10px] text-slate-500 uppercase">{album.privacy} • {comics.filter(c => c.albumId === album.id && !c.deleted).length} Episodes</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setEditingAlbumId(album.id)}
                                    className="h-10 w-10 rounded-xl text-amber-500 hover:bg-amber-500/10"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => onToggleAlbumEnable(album.id)}
                                    className={cn("h-10 w-10 rounded-xl", album.isEnabled ? "text-emerald-500" : "text-slate-500")}
                                  >
                                    {album.isEnabled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      if(confirm("Delete this album and all its settings?")) onDeleteAlbum(album.id);
                                    }}
                                    className="h-10 w-10 rounded-xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <Button 
                          variant="ghost" 
                          onClick={() => setEditingAlbumId(null)} 
                          className="gap-2 text-slate-400 hover:text-white px-0"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Albums
                        </Button>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-8">
                           <div className="flex items-start gap-6">
                              <div 
                                onClick={() => editAlbumCoverInputRef.current?.click()}
                                className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-amber-500/50 cursor-pointer shrink-0"
                              >
                                <img src={currentEditingAlbum?.coverUrl} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input 
                                  type="file" 
                                  ref={editAlbumCoverInputRef}
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, 'edit-album-cover')}
                                />
                              </div>
                              
                              <div className="flex-1 space-y-4">
                                 <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Album Title</Label>
                                    <Input 
                                      value={currentEditingAlbum?.title}
                                      onChange={(e) => onUpdateAlbum(editingAlbumId, { title: e.target.value })}
                                      className="bg-white/5 border-white/10 text-white font-bold"
                                    />
                                 </div>
                                 <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                      <Label className="text-xs font-bold text-slate-500 uppercase">Privacy</Label>
                                      <Select 
                                        value={currentEditingAlbum?.privacy} 
                                        onValueChange={(val: 'public' | 'private') => onUpdateAlbum(editingAlbumId, { privacy: val })}
                                      >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#121214] border-white/10 text-white">
                                          <SelectItem value="public">Public</SelectItem>
                                          <SelectItem value="private">Private</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                       <Switch 
                                         checked={currentEditingAlbum?.isEnabled}
                                         onCheckedChange={(checked) => onUpdateAlbum(editingAlbumId, { isEnabled: checked })}
                                       />
                                       <span className="text-xs font-bold text-white">Enabled</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <Label className="text-xs font-bold text-slate-500 uppercase">Description</Label>
                              <Textarea 
                                value={currentEditingAlbum?.description}
                                onChange={(e) => onUpdateAlbum(editingAlbumId, { description: e.target.value })}
                                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                                placeholder="Describe this collection..."
                              />
                           </div>

                           {currentEditingAlbum?.privacy === 'private' && (
                             <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                   <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Invited User Access</h4>
                                   <div className="flex gap-2 w-64">
                                      <Input 
                                        placeholder="Add email..."
                                        value={newInvitedEmail}
                                        onChange={(e) => setNewInvitedEmail(e.target.value)}
                                        className="h-9 text-xs bg-white/5 border-white/10"
                                      />
                                      <Button 
                                        size="sm"
                                        onClick={handleAddInvitedEmail}
                                        className="bg-amber-500 text-black hover:bg-amber-400 h-9"
                                      >
                                        <UserPlus className="w-4 h-4" />
                                      </Button>
                                   </div>
                                </div>
                                
                                <div className="grid gap-2">
                                   {currentEditingAlbum.invitedAccess.map((access) => (
                                     <div key={access.email} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                           <Mail className="w-4 h-4 text-slate-500" />
                                           <span className="text-sm text-white">{access.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <Switch 
                                             checked={access.enabled}
                                             onCheckedChange={() => handleToggleUserAccess(access.email)}
                                           />
                                           <Button 
                                             variant="ghost" 
                                             size="icon"
                                             onClick={() => handleRemoveUserAccess(access.email)}
                                             className="h-8 w-8 text-rose-500"
                                           >
                                              <X className="w-4 h-4" />
                                           </Button>
                                        </div>
                                     </div>
                                   ))}
                                   {currentEditingAlbum.invitedAccess.length === 0 && (
                                      <p className="text-center py-4 text-xs text-slate-500 italic">No users invited yet.</p>
                                   )}
                                </div>
                             </div>
                           )}

                           <div className="space-y-4 pt-4 border-t border-white/5">
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Episodes in this Album</h4>
                              <div className="grid gap-2">
                                 {comics.filter(c => c.albumId === editingAlbumId && !c.deleted).map(comic => (
                                   <div key={comic.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                      <img src={comic.coverUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                      <div className="flex-1 min-w-0">
                                         <p className="text-sm font-bold text-white truncate">{comic.title}</p>
                                         <p className="text-[10px] text-slate-500">Added on {new Date(comic.createdAt).toLocaleDateString()}</p>
                                      </div>
                                      <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold", comic.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500")}>
                                         {comic.enabled ? "LIVE" : "HIDDEN"}
                                      </div>
                                   </div>
                                 ))}
                                 {comics.filter(c => c.albumId === editingAlbumId && !c.deleted).length === 0 && (
                                    <p className="text-center py-4 text-xs text-slate-500 italic">This album is empty.</p>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </TabsContent>

                <TabsContent value="manage" className="mt-0">
                   <div className="space-y-4">
                    {visibleComics.length === 0 ? (
                      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl border-dashed">
                        <p className="text-slate-500">No episodes published yet.</p>
                      </div>
                    ) : (
                      visibleComics.map((comic) => (
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
                            </div>
                            <p className="text-[10px] text-slate-500 uppercase">
                              Album: {albums.find(a => a.id === comic.albumId)?.title || 'Unassigned'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {canManageContent && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => onToggleEnable(comic.id)}
                                  className={cn("h-10 w-10 rounded-xl", comic.enabled ? "text-emerald-500" : "text-slate-500")}
                                >
                                  {comic.enabled ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    if(confirm("Are you sure?")) onDeleteComic(comic.id);
                                  }}
                                  className="h-10 w-10 rounded-xl text-rose-500"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
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
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-amber-500">
                         <Users className="w-5 h-5" />
                         <h3 className="text-sm font-bold uppercase tracking-widest">User Management</h3>
                       </div>
                       <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={fetchAllUsers} 
                            className="text-xs text-slate-500"
                          >
                            <RefreshCw className={cn("w-3 h-3 mr-2", isLoadingUsers && "animate-spin")} />
                            Refresh
                          </Button>
                          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                              <Button className="h-9 bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs rounded-xl">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add User
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#121214] border-white/5 text-white">
                              <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleAddUser} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-500 uppercase">Email Address</Label>
                                  <Input 
                                    type="email"
                                    placeholder="user@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-500 uppercase">Full Name</Label>
                                  <Input 
                                    placeholder="John Doe"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-500 uppercase">Role</Label>
                                  <Select 
                                    value={newUserRole} 
                                    onValueChange={(val: AppRole) => setNewUserRole(val)}
                                  >
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#121214] border-white/10 text-white">
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="editor">Editor</SelectItem>
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                   <div className="flex items-center gap-2 text-amber-500">
                                      <Key className="w-4 h-4" />
                                      <span className="text-xs font-bold uppercase tracking-widest">Set Password</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                         <Label className="text-[10px] text-slate-500 uppercase">Password</Label>
                                         <div className="relative">
                                            <Input 
                                              type={showAddUserPassword ? "text" : "password"}
                                              placeholder="******"
                                              value={addUserPassword}
                                              onChange={(e) => setAddUserPassword(e.target.value)}
                                              className="bg-white/5 border-white/10 h-10 pr-10"
                                              required
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setShowAddUserPassword(!showAddUserPassword)}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                              {showAddUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                         </div>
                                      </div>
                                      <div className="space-y-2">
                                         <Label className="text-[10px] text-slate-500 uppercase">Confirm Password</Label>
                                         <Input 
                                           type={showAddUserPassword ? "text" : "password"}
                                           placeholder="******"
                                           value={addUserConfirmPassword}
                                           onChange={(e) => setAddUserConfirmPassword(e.target.value)}
                                           className="bg-white/5 border-white/10 h-10"
                                           required
                                         />
                                      </div>
                                   </div>
                                </div>

                                <DialogFooter className="pt-4">
                                  <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold">
                                    Create User
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                       </div>
                    </div>

                    <div className="space-y-3">
                      {allUsers.map(u => (
                        <div 
                          key={u.id} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10",
                            !u.isEnabled && "opacity-60 grayscale"
                          )}
                        >
                          <div className="flex items-center gap-3">
                             <Avatar className="w-10 h-10 border border-white/10">
                                <AvatarImage src={u.avatarUrl} />
                                <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                                   {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                </AvatarFallback>
                             </Avatar>
                             <div>
                               <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-white">{u.name || "Unnamed User"}</p>
                                  {!u.isEnabled && (
                                     <span className="text-[8px] bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                        Disabled
                                     </span>
                                  )}
                               </div>
                               <p className="text-xs text-slate-400">{u.email}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                               <Label className="text-[10px] text-slate-500 uppercase">Role</Label>
                               <Select 
                                 value={u.role} 
                                 onValueChange={(val: AppRole) => handleUpdateRole(u.id, val)}
                               >
                                 <SelectTrigger className="w-28 h-9 bg-white/5 border-white/10 text-white text-xs">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="bg-[#121214] border-white/10 text-white">
                                   <SelectItem value="admin">Admin</SelectItem>
                                   <SelectItem value="editor">Editor</SelectItem>
                                   <SelectItem value="viewer">Viewer</SelectItem>
                                 </SelectContent>
                               </Select>
                            </div>

                            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                               <div className="flex items-center gap-2">
                                  <Switch 
                                    checked={u.isEnabled}
                                    onCheckedChange={() => handleToggleUserEnabled(u.id, u.isEnabled)}
                                  />
                               </div>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 onClick={() => openEditModal(u)}
                                 className="h-9 w-9 text-slate-500 hover:text-white"
                               >
                                 <Edit className="w-4 h-4" />
                               </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {allUsers.length === 0 && !isLoadingUsers && (
                         <div className="text-center py-10 text-slate-500">
                            No users found.
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Edit User Modal */}
                  <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                    <DialogContent className="bg-[#121214] border-white/5 text-white">
                      <DialogHeader>
                        <DialogTitle>Edit User Profile</DialogTitle>
                      </DialogHeader>
                      {editingUser && (
                        <form onSubmit={handleUpdateUser} className="space-y-4 pt-4">
                          <div className="space-y-2 opacity-50">
                            <Label className="text-xs text-slate-500 uppercase">Email (Cannot change)</Label>
                            <Input 
                              value={editingUser.email}
                              disabled
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase">Full Name</Label>
                            <Input 
                              placeholder="John Doe"
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500 uppercase">Role</Label>
                            <Select 
                              value={newUserRole} 
                              onValueChange={(val: AppRole) => setNewUserRole(val)}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#121214] border-white/10 text-white">
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="pt-4 border-t border-white/5 space-y-4">
                             <div className="flex items-center gap-2 text-amber-500">
                                <Key className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Change Password</span>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <Label className="text-[10px] text-slate-500 uppercase">New Password</Label>
                                   <div className="relative">
                                      <Input 
                                        type={showUserPassword ? "text" : "password"}
                                        placeholder="******"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="bg-white/5 border-white/10 h-10 pr-10"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowUserPassword(!showUserPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                      >
                                        {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <Label className="text-[10px] text-slate-500 uppercase">Confirm Password</Label>
                                   <Input 
                                     type={showUserPassword ? "text" : "password"}
                                     placeholder="******"
                                     value={confirmUserPassword}
                                     onChange={(e) => setConfirmUserPassword(e.target.value)}
                                     className="bg-white/5 border-white/10 h-10"
                                   />
                                </div>
                             </div>
                             <p className="text-[10px] text-slate-500">Leave blank to keep current password.</p>
                          </div>

                          <DialogFooter className="pt-4">
                            <Button 
                              type="submit" 
                              className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold"
                              disabled={isUpdatingPassword}
                            >
                              {isUpdatingPassword ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Save Changes
                            </Button>
                          </DialogFooter>
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
    </Dialog>
  );
};