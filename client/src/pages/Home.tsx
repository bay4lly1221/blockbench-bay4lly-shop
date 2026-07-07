import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github, Upload, CheckCircle, Zap } from "lucide-react";
import { useLocation, Link } from "wouter";

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string;
  token?: string;
}

export default function Home() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  // Check if user is already logged in (from localStorage or session)
  useEffect(() => {
    const storedUser = localStorage.getItem("bay4lly_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }

    // Check for GitHub OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      handleGitHubCallback(code);
    }
  }, []);

  const handleGitHubCallback = async (code: string) => {
    setLoading(true);
    try {
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "YOUR_GITHUB_CLIENT_ID";

      if (code === "simulated_code" || clientId === "YOUR_GITHUB_CLIENT_ID") {
        const simulatedUser: GitHubUser = {
          login: "developer_" + Math.random().toString(36).substring(2, 11),
          avatar_url: `https://avatars.githubusercontent.com/u/583231?v=4`,
          name: "Simulated User"
        };
        setUser(simulatedUser);
        localStorage.setItem("bay4lly_user", JSON.stringify(simulatedUser));
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const response = await fetch("/api/auth/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setUser(data);
      localStorage.setItem("bay4lly_user", JSON.stringify(data));
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error("GitHub authentication failed:", error);
      alert("GitHub real login failed. Falling back to simulated login.");
      const simulatedUser: GitHubUser = {
        login: "developer_" + Math.random().toString(36).substring(2, 11),
        avatar_url: `https://avatars.githubusercontent.com/u/583231?v=4`,
        name: "Simulated User"
      };
      setUser(simulatedUser);
      localStorage.setItem("bay4lly_user", JSON.stringify(simulatedUser));
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "YOUR_GITHUB_CLIENT_ID";
    
    if (clientId === "YOUR_GITHUB_CLIENT_ID") {
      alert("GitHub Client ID is not configured in .env. Falling back to simulated login.");
      handleGitHubCallback("simulated_code");
      return;
    }

    setLoading(true);
    const redirectUri = `${window.location.origin}/`;
    const scope = "public_repo,user:email";
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("bay4lly_user");
  };

  const handleSubmitPlugin = () => {
    if (user) {
      navigate("/submit");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B4</span>
            </div>
            <h1 className="text-white font-bold text-xl">Bay4lly Shop</h1>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-white text-sm">{user.login}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Fikirlerini Gerçeğe Dönüştür
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Blockbench eklentilerini Bay4lly Shop'a gönder, topluluğun beğenisini kazanıp milyonlara ulaş.
          </p>

          {!user ? (
            <Button
              size="lg"
              onClick={handleGitHubLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 py-6 text-lg rounded-lg"
            >
              <Github className="w-5 h-5" />
              GitHub ile Başla
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmitPlugin}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8 py-6 text-lg rounded-lg"
            >
              <Upload className="w-5 h-5" />
              Eklenti Gönder
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-white mb-12 text-center">Nasıl Çalışır?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Github,
              title: "GitHub ile Giriş",
              description: "Güvenli ve hızlı giriş. Şifre hatırlamana gerek yok."
            },
            {
              icon: Upload,
              title: "Eklenti Gönder",
              description: "Eklentin dosyalarını ve bilgilerini basit bir form ile yükle."
            },
            {
              icon: CheckCircle,
              title: "Onay & Yayınlama",
              description: "Admin tarafından incelendikten sonra mağazada yayınlanır."
            }
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={idx}
                className="bg-slate-800 border-slate-700 p-8 hover:border-blue-500 transition-colors"
              >
                <Icon className="w-12 h-12 text-blue-500 mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      {user && (
        <section className="max-w-6xl mx-auto px-4 py-20">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 p-12 text-center">
            <Zap className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-white mb-4">Hazır mısın?</h3>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Eklentini gönder ve Bay4lly Shop'un geniş kullanıcı tabanına ulaş.
            </p>
            <Button
              size="lg"
              onClick={handleSubmitPlugin}
              className="bg-white text-blue-600 hover:bg-slate-100 gap-2 px-8 py-6 text-lg"
            >
              <Upload className="w-5 h-5" />
              Şimdi Gönder
            </Button>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-slate-400 gap-4">
          <p>© 2026 Bay4lly Shop. Blockbench topluluğu için yapılmıştır.</p>
          <Link to="/admin" className="text-xs text-slate-500 hover:text-blue-400 hover:underline transition">
            Yönetim Paneli
          </Link>
        </div>
      </footer>
    </div>
  );
}
