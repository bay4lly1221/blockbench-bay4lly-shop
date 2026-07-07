import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface PluginFormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  author: string;
  version: string;
  minVersion: string;
  verified: boolean;
  featured: boolean;
  beta: boolean;
  pluginFile: File | null;
  iconFile: File | null;
  bannerFile: File | null;
  readmeFile: File | null;
}

const CATEGORIES = [
  "Models",
  "Textures",
  "Tools",
  "Animations",
  "Shaders",
  "Other"
];

export default function Submit() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [formData, setFormData] = useState<PluginFormData>({
    title: "",
    description: "",
    category: "",
    tags: "",
    author: "",
    version: "1.0.0",
    minVersion: "4.0.0",
    verified: false,
    featured: false,
    beta: false,
    pluginFile: null,
    iconFile: null,
    bannerFile: null,
    readmeFile: null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "pluginFile" | "iconFile" | "bannerFile" | "readmeFile"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      toast.success(`${fileType.replace("File", "")} dosyası yüklendi`);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.description || !formData.category) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    if (!formData.pluginFile) {
      toast.error("Plugin dosyası zorunludur");
      return;
    }

    setLoading(true);

    try {
      const storedUser = localStorage.getItem("bay4lly_user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const token = user?.token;

      if (!token) {
        toast.error("Giriş yapmanız gerekmektedir.");
        setLoading(false);
        return;
      }

      // Convert plugin title to clean folder id
      const pluginId = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/(^_|_$)/g, "");

      // Convert files to Base64
      const files: Record<string, string> = {};
      files[`${pluginId}.js`] = await fileToBase64(formData.pluginFile);
      
      if (formData.iconFile) {
        files["icon.png"] = await fileToBase64(formData.iconFile);
      }
      if (formData.bannerFile) {
        files["banner.png"] = await fileToBase64(formData.bannerFile);
      }
      if (formData.readmeFile) {
        files["README.md"] = await fileToBase64(formData.readmeFile);
      }

      // Make API request
      const response = await fetch("/api/submit-plugin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          pluginId,
          metadata: {
            title: formData.title,
            version: formData.version,
            description: formData.description,
            category: formData.category,
            tags: formData.tags,
            minVersion: formData.minVersion,
            beta: formData.beta,
          },
          files,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sunucu hatası");
      }

      const data = await response.json();
      setPrUrl(data.prUrl);
      setSubmitted(true);
      toast.success("Eklenti başarıyla gönderildi!");

    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(`Gönderim sırasında hata oluştu: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <Card className="bg-slate-800 border-slate-700 p-12 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Başarıyla Gönderildi!</h2>
          <p className="text-slate-300 mb-6">
            Eklentiniz için GitHub üzerinde bir Değişiklik İsteği (Pull Request) oluşturuldu.
          </p>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-2.5 px-4 mb-8 bg-slate-700 hover:bg-slate-600 text-blue-400 font-medium rounded-lg border border-slate-600 transition-colors text-sm break-all"
            >
              GitHub'da İncele (PR Linki)
            </a>
          )}
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Ana Sayfaya Dön
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-bold text-xl">Eklenti Gönder</h1>
        </div>
      </nav>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="bg-slate-800 border-slate-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Temel Bilgiler</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Eklenti Adı *
                  </label>
                  <Input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Örn: Advanced Model Exporter"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Açıklama *
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Eklentinin ne yaptığını kısaca açıkla..."
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 min-h-24"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Kategori *
                    </label>
                    <Select value={formData.category} onValueChange={handleSelectChange}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Kategori seç" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-white">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Etiketler
                    </label>
                    <Input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="Virgülle ayırarak yazın"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Version Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Sürüm Bilgileri</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Eklenti Sürümü
                  </label>
                  <Input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    placeholder="1.0.0"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Minimum Blockbench Sürümü
                  </label>
                  <Input
                    type="text"
                    name="minVersion"
                    value={formData.minVersion}
                    onChange={handleInputChange}
                    placeholder="4.0.0"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Files */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Dosyalar</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Plugin.js Dosyası * {formData.pluginFile && <span className="text-green-400">✓</span>}
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept=".js"
                      onChange={(e) => handleFileChange(e, "pluginFile")}
                      className="hidden"
                      id="plugin-file"
                    />
                    <label htmlFor="plugin-file" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-300">
                        {formData.pluginFile?.name || "Dosya seç veya sürükle"}
                      </p>
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { id: "icon", label: "İkon (PNG)", type: "iconFile" },
                    { id: "banner", label: "Banner (PNG)", type: "bannerFile" },
                    { id: "readme", label: "README (MD)", type: "readmeFile" },
                  ].map((file) => (
                    <div key={file.id}>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {file.label} {formData[file.type as keyof PluginFormData] && <span className="text-green-400">✓</span>}
                      </label>
                      <div className="border border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          accept={file.id === "readme" ? ".md" : ".png"}
                          onChange={(e) =>
                            handleFileChange(e, file.type as any)
                          }
                          className="hidden"
                          id={file.id}
                        />
                        <label htmlFor={file.id} className="cursor-pointer block">
                          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                          <p className="text-xs text-slate-400">Dosya seç</p>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 text-sm">
                  Eklentin admin tarafından incelendikten sonra Bay4lly Shop'ta yayınlanacak. Lütfen tüm bilgilerin doğru olduğundan emin ol.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Gönderiliyor..." : "Eklentiyi Gönder"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
