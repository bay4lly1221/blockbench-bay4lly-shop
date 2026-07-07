import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { 
  Lock, 
  User, 
  Trash2, 
  Edit, 
  LogOut, 
  Plus, 
  Check, 
  X, 
  ChevronRight, 
  UploadCloud, 
  Eye,
  Settings
} from "lucide-react";

interface PluginEntry {
  id: string;
  title: string;
  author: string;
  version: string;
  description: string;
  category: string;
  folder: string;
  filename: string;
  featured: boolean;
  verified: boolean;
  beta: boolean;
  tags: string[];
  min_version: string;
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // PR Approval system state
  const [activeTab, setActiveTab] = useState<"plugins" | "prs">("plugins");
  const [prs, setPrs] = useState<any[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Editing Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<PluginEntry | null>(null);
  
  // Edit Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Tools");
  const [formTags, setFormTags] = useState("");
  const [formMinVersion, setFormMinVersion] = useState("4.0.0");
  const [formBeta, setFormBeta] = useState(false);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formVerified, setFormVerified] = useState(false);

  // File Overrides
  const [newPluginFile, setNewPluginFile] = useState<File | null>(null);
  const [newIconFile, setNewIconFile] = useState<File | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newReadmeFile, setNewReadmeFile] = useState<File | null>(null);

  const REPO_URL = "https://raw.githubusercontent.com/bay4lly1221/bay4lly-shop-repo/main/";

  useEffect(() => {
    const session = localStorage.getItem("bay4lly_admin_logged_in");
    if (session === "true") {
      setIsLoggedIn(true);
      fetchPlugins();
      fetchPrs();
    }
  }, []);

  const fetchPlugins = async () => {
    setLoadingPlugins(true);
    try {
      const response = await fetch(`${REPO_URL}plugins.json?t=${Date.now()}`);
      if (!response.ok) throw new Error("plugins.json could not be loaded");
      const data = await response.json();
      setPlugins(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Plugin listesi yüklenemedi: " + e.message);
    } finally {
      setLoadingPlugins(false);
    }
  };

  const fetchPrs = async () => {
    setLoadingPrs(true);
    try {
      const savedPass = localStorage.getItem("bay4lly_admin_pass") || "";
      const response = await fetch("/api/admin/pending-prs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bay4lly", password: savedPass })
      });
      if (!response.ok) throw new Error("Açık PR listesi yüklenemedi.");
      const data = await response.json();
      setPrs(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Bekleyen başvurular yüklenemedi: " + e.message);
    } finally {
      setLoadingPrs(false);
    }
  };

  const handleApprovePR = async (prNumber: number, title: string) => {
    if (!window.confirm(`"${title}" adlı eklenti başvurusunu onaylayıp ana mağazaya dahil etmek istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const savedPass = localStorage.getItem("bay4lly_admin_pass") || "";
      const response = await fetch("/api/admin/merge-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bay4lly", password: savedPass, prNumber })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "PR birleştirilemedi.");
      }

      toast.success("Eklenti onaylandı ve birleştirildi! Vercel derlemesi otomatik başladı.");
      // Refresh both plugins list and PRs list
      setTimeout(() => {
        fetchPlugins();
        fetchPrs();
      }, 3000);
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPR = async (prNumber: number, title: string) => {
    if (!window.confirm(`"${title}" eklenti başvurusunu reddetmek ve kapatmak istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const savedPass = localStorage.getItem("bay4lly_admin_pass") || "";
      const response = await fetch("/api/admin/close-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bay4lly", password: savedPass, prNumber })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "PR kapatılamadı.");
      }

      toast.info("Eklenti başvurusu reddedildi ve kapatıldı.");
      setTimeout(fetchPrs, 2000);
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Giriş başarısız.");
      }

      localStorage.setItem("bay4lly_admin_logged_in", "true");
      localStorage.setItem("bay4lly_admin_pass", password); // Temp save password for subsequent API requests
      setIsLoggedIn(true);
      toast.success("Yönetim paneline başarıyla giriş yapıldı.");
      fetchPlugins();
      fetchPrs();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bay4lly_admin_logged_in");
    localStorage.removeItem("bay4lly_admin_pass");
    setIsLoggedIn(false);
    toast.info("Oturum kapatıldı.");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const openEditModal = (plugin: PluginEntry) => {
    setEditingPlugin(plugin);
    setFormTitle(plugin.title);
    setFormVersion(plugin.version);
    setFormDescription(plugin.description);
    setFormCategory(plugin.category);
    setFormTags(plugin.tags ? plugin.tags.join(", ") : "");
    setFormMinVersion(plugin.min_version || "4.0.0");
    setFormBeta(plugin.beta || false);
    setFormFeatured(plugin.featured || false);
    setFormVerified(plugin.verified || false);
    
    // Clear files
    setNewPluginFile(null);
    setNewIconFile(null);
    setNewBannerFile(null);
    setNewReadmeFile(null);

    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingPlugin(null);
    setEditModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlugin) return;
    setActionLoading(true);

    try {
      const savedPass = localStorage.getItem("bay4lly_admin_pass") || "";
      const files: Record<string, string> = {};

      const originalFilename = newPluginFile ? newPluginFile.name : editingPlugin.filename;

      if (newPluginFile) {
        files[newPluginFile.name] = await fileToBase64(newPluginFile);
      }
      if (newIconFile) {
        files["icon.png"] = await fileToBase64(newIconFile);
      }
      if (newBannerFile) {
        files["banner.png"] = await fileToBase64(newBannerFile);
      }
      if (newReadmeFile) {
        files["README.md"] = await fileToBase64(newReadmeFile);
      }

      const metadata = {
        title: formTitle,
        version: formVersion,
        description: formDescription,
        category: formCategory,
        tags: formTags,
        minVersion: formMinVersion,
        beta: formBeta,
        featured: formFeatured,
        verified: formVerified,
        filename: originalFilename,
      };

      const response = await fetch("/api/admin/edit-plugin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "bay4lly",
          password: savedPass,
          pluginId: editingPlugin.id,
          metadata,
          files: Object.keys(files).length > 0 ? files : undefined
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eklenti güncellenemedi.");
      }

      toast.success("Eklenti başarıyla güncellendi (GitHub'a doğrudan commit atıldı).");
      closeEditModal();
      // Delay fetch slightly to allow GitHub to process the commit
      setTimeout(fetchPlugins, 2500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (pluginId: string, title: string) => {
    if (!window.confirm(`"${title}" eklentisini ve ilgili tüm dosyaları depodan tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoading(true);

    try {
      const savedPass = localStorage.getItem("bay4lly_admin_pass") || "";
      const response = await fetch("/api/admin/delete-plugin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "bay4lly",
          password: savedPass,
          pluginId
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eklenti silinemedi.");
      }

      toast.success("Eklenti ve klasörü depodan tamamen silindi.");
      setTimeout(fetchPlugins, 2500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.title.toLowerCase().includes(search.toLowerCase()) || 
                          plugin.id.toLowerCase().includes(search.toLowerCase()) ||
                          plugin.author.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = categoryFilter === "All" || plugin.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-blue-400 animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bay4lly Admin</h1>
            <p className="text-slate-400 text-sm mt-1">Eklenti marketi yönetim paneline giriş yapın.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Kullanıcı Adı</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Kullanıcı adını girin..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none text-slate-100 placeholder-slate-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Parola</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Parolanızı girin..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none text-slate-100 placeholder-slate-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {loginLoading ? "Giriş yapılıyor..." : "Yönetici Girişi"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1">
              Portala Geri Dön <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Bay4lly Shop</h1>
            <p className="text-xs text-blue-400/80 font-medium tracking-wide uppercase">Admin Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-200 transition">
            Portalı Görüntüle
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab("plugins")}
            className={`pb-3 text-sm font-semibold transition relative ${
              activeTab === "plugins" 
                ? "text-blue-400" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mağaza Eklentileri ({plugins.length})
            {activeTab === "plugins" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => {
              setActiveTab("prs");
              fetchPrs();
            }}
            className={`pb-3 text-sm font-semibold transition relative flex items-center gap-1.5 ${
              activeTab === "prs" 
                ? "text-blue-400" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Bekleyen Başvurular
            {prs.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-md text-[10px] font-bold">
                {prs.length}
              </span>
            )}
            {activeTab === "prs" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {activeTab === "plugins" && (
          <>
            {/* Statistics & Filters Bar */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div>
                  <div className="text-2xl font-black text-blue-400">{plugins.length}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Eklenti</div>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div>
                  <div className="text-2xl font-black text-emerald-400">
                    {plugins.filter(p => p.verified).length}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doğrulanmış</div>
                </div>
                <div className="w-px h-10 bg-slate-800" />
                <div>
                  <div className="text-2xl font-black text-amber-400">
                    {plugins.filter(p => p.featured).length}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Öne Çıkan</div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <input
                  type="text"
                  placeholder="Eklenti ara (ad, ID veya yazar)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-slate-100 placeholder-slate-600 focus:border-blue-500 transition text-sm w-full md:w-64"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl outline-none text-slate-200 focus:border-blue-500 transition text-sm"
                >
                  <option value="All">Tüm Kategoriler</option>
                  <option value="Models">Models</option>
                  <option value="Textures">Textures</option>
                  <option value="Tools">Tools</option>
                  <option value="Animations">Animations</option>
                  <option value="Shaders">Shaders</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Plugin Table Grid */}
            <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                <h2 className="font-bold tracking-tight">Kayıtlı Eklentiler</h2>
                <button 
                  onClick={() => toast.info("Yeni eklentileri ana portal üzerinden yükleyip, bu panelden düzenleyebilirsiniz.")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Yeni Eklenti Ekle
                </button>
              </div>

              {loadingPlugins ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-sm">Eklenti listesi GitHub'dan çekiliyor...</span>
                </div>
              ) : filteredPlugins.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-sm">
                  Eşleşen herhangi bir eklenti bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/20">
                        <th className="px-6 py-3.5">İkon & Eklenti Adı</th>
                        <th className="px-6 py-3.5">Kategori</th>
                        <th className="px-6 py-3.5">Versiyon</th>
                        <th className="px-6 py-3.5">Yazar</th>
                        <th className="px-6 py-3.5">Rozetler</th>
                        <th className="px-6 py-3.5 text-right">Eylemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredPlugins.map((plugin) => (
                        <tr key={plugin.id} className="hover:bg-slate-900/20 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                <img
                                  src={`${REPO_URL}plugins/${plugin.folder}/icon.png`}
                                  onError={(e) => {
                                    (e.target as HTMLElement).outerHTML = `<div class="w-5 h-5 text-slate-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-puzzle"><path d="M19.439 10.04a2.98 2.98 0 0 0-5.183-1.226 3 3 0 0 0-4.228-4.228 2.98 2.98 0 0 0-1.226-5.183c-.888-.204-1.802.26-2.227 1.077L4.76 4.108C3.896 4.972 3 6.136 3 7.378v9.244c0 1.242.896 2.406 1.76 3.27l1.815 3.63c.425.817 1.339 1.281 2.227 1.077a2.98 2.98 0 0 0 1.226-5.183 3 3 0 0 0 4.228-4.228 2.98 2.98 0 0 0 5.183-1.226c.204-.888-.26-1.802-1.077-2.227l-3.63-1.815a3.27 3.27 0 0 1 0-5.83l3.63-1.815c.817-.425 1.281-1.339 1.077-2.227z"/></svg></div>`;
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100">{plugin.title}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{plugin.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-medium">{plugin.category}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">v{plugin.version}</td>
                          <td className="px-6 py-4 text-slate-300">@{plugin.author}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {plugin.verified && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md">✓ Doğrulanmış</span>
                              )}
                              {plugin.featured && (
                                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded-md">★ Vitrin</span>
                              )}
                              {plugin.beta && (
                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded-md">Beta</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(plugin)}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 hover:text-blue-400 rounded-lg transition"
                                title="Düzenle"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(plugin.id, plugin.title)}
                                disabled={actionLoading}
                                className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 hover:text-red-400 rounded-lg transition"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "prs" && (
          <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
              <h2 className="font-bold tracking-tight">Bekleyen Başvurular (GitHub Pull Requests)</h2>
              <button 
                onClick={fetchPrs}
                disabled={loadingPrs}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Yenile
              </button>
            </div>

            {loadingPrs ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">Bekleyen başvurular GitHub'dan sorgulanıyor...</span>
              </div>
            ) : prs.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                Şu anda incelenmeyi bekleyen herhangi bir eklenti başvurusu bulunmuyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/20">
                      <th className="px-6 py-3.5">Eklenti Adı</th>
                      <th className="px-6 py-3.5">Gönderen Geliştirici</th>
                      <th className="px-6 py-3.5">Gönderim Tarihi</th>
                      <th className="px-6 py-3.5">Açıklama Detayları</th>
                      <th className="px-6 py-3.5 text-right">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {prs.map((pr) => (
                      <tr key={pr.number} className="hover:bg-slate-900/20 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-100">{pr.title}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">PR #{pr.number}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <a 
                            href={`https://github.com/${pr.user}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 hover:underline transition"
                          >
                            @{pr.user}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {new Date(pr.created_at).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-slate-400 text-xs">
                          {pr.body || "Açıklama belirtilmemiş."}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-3">
                            <a
                              href={pr.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            >
                              <Eye className="w-3.5 h-3.5" /> İncele
                            </a>
                            <button
                              onClick={() => handleApprovePR(pr.number, pr.title)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            >
                              <Check className="w-3.5 h-3.5" /> Kabul Et
                            </button>
                            <button
                              onClick={() => handleRejectPR(pr.number, pr.title)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            >
                              <X className="w-3.5 h-3.5" /> Reddet
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editing Modal Dialog */}
      {editModalOpen && editingPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col my-8 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold">Eklentiyi Düzenle: <span className="text-blue-400">{editingPlugin.title}</span></h3>
              </div>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Eklenti Adı</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-100 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-200 text-sm transition"
                  >
                    <option value="Models">Models</option>
                    <option value="Textures">Textures</option>
                    <option value="Tools">Tools</option>
                    <option value="Animations">Animations</option>
                    <option value="Shaders">Shaders</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Versiyon</label>
                  <input
                    type="text"
                    required
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-100 text-sm transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Min. Blockbench Sürümü</label>
                  <input
                    type="text"
                    required
                    value={formMinVersion}
                    onChange={(e) => setFormMinVersion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-100 text-sm transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Kısa Açıklama</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-100 text-sm transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Etiketler (Virgülle ayırın)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="örn. tools, minecraft, export"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl outline-none text-slate-100 text-sm transition"
                />
              </div>

              {/* Badges/Settings Checkboxes */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formVerified}
                    onChange={(e) => setFormVerified(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 accent-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-emerald-400">Doğrulanmış</span>
                    <p className="text-[10px] text-slate-500">Güvenilir rozeti ekler.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 accent-amber-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-amber-400">Vitrin Eklenti</span>
                    <p className="text-[10px] text-slate-500">Öne çıkanlar listesine ekler.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formBeta}
                    onChange={(e) => setFormBeta(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 accent-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-blue-400">Beta Aşamasında</span>
                    <p className="text-[10px] text-slate-500">Beta sürüm uyarısı ekler.</p>
                  </div>
                </label>
              </div>

              {/* File Overrides */}
              <div className="border-t border-slate-800 pt-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dosyaları Güncelle (İsteğe Bağlı)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Plugin File */}
                  <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">Eklenti Kodu (.js)</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Orijinal dosya adıyla kaydedilir.</p>
                    </div>
                    <label className="mt-3 cursor-pointer py-2 px-3 border border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs font-semibold">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>{newPluginFile ? newPluginFile.name : "Yeni dosya seç..."}</span>
                      <input
                        type="file"
                        accept=".js"
                        onChange={(e) => setNewPluginFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Icon */}
                  <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">Eklenti İkonu (.png)</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">icon.png olarak güncellenir.</p>
                    </div>
                    <label className="mt-3 cursor-pointer py-2 px-3 border border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs font-semibold">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>{newIconFile ? newIconFile.name : "Yeni ikon seç..."}</span>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={(e) => setNewIconFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Banner */}
                  <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">Kapak Resmi (.png)</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">banner.png olarak güncellenir.</p>
                    </div>
                    <label className="mt-3 cursor-pointer py-2 px-3 border border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs font-semibold">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>{newBannerFile ? newBannerFile.name : "Yeni kapak seç..."}</span>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={(e) => setNewBannerFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* README */}
                  <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-300">Detaylar / README (.md)</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">README.md olarak güncellenir.</p>
                    </div>
                    <label className="mt-3 cursor-pointer py-2 px-3 border border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-blue-500/5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs font-semibold">
                      <UploadCloud className="w-4 h-4 text-slate-400" />
                      <span>{newReadmeFile ? newReadmeFile.name : "Yeni döküman seç..."}</span>
                      <input
                        type="file"
                        accept=".md"
                        onChange={(e) => setNewReadmeFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900 py-2 z-10">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={actionLoading}
                  className="px-4 py-2.5 border border-slate-800 hover:bg-slate-850 text-slate-300 text-sm font-semibold rounded-xl transition active:scale-[0.98]"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                >
                  {actionLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
