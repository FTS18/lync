"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/hooks/useFirebase";
import ThemeToggle from "@/components/ThemeToggle";
import { ArrowLeft, Video, LogOut, Save, User } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, dbUser, loading, logout, updateProfileInfo } = useFirebase();

  // Profile setup states
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync user details on load
  useEffect(() => {
    if (dbUser) {
      setDisplayName(dbUser.displayName || "");
      setPhotoURL(dbUser.photoURL || "");
    }
  }, [dbUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      await updateProfileInfo(user.uid, displayName.trim(), photoURL.trim());
      alert("Profile updated successfully!");
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err: any) {
      alert("Failed to log out: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vercel-light dark:bg-vercel-black text-sm text-vercel-text-muted">
        Loading...
      </div>
    );
  }

  if (!user) {
    // If not authenticated, redirect to home page
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between grid-bg animate-in fade-in duration-300">
      {/* Header */}
      <header className="border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/75 dark:bg-vercel-black/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <span className="text-lg md:text-xl font-black tracking-widest uppercase font-mono text-vercel-text-light dark:text-white select-none">LYNC</span>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Settings Panel */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[440px] border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark p-8 rounded-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Subtle glow border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-right from-neutral-200 to-neutral-800 dark:from-neutral-800 dark:to-neutral-200" />

          {/* Back button and title */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push("/")}
              className="p-2 border border-vercel-border-light dark:border-vercel-border-dark rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-colors text-vercel-text-light dark:text-vercel-text-dark"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-wider uppercase font-mono">Account Settings</h2>
              <p className="text-xs text-vercel-text-muted truncate">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Display Name Input */}
            <div className="input-box">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            {/* Avatar URL Input */}
            <div className="input-box">
              <label htmlFor="photoURL">Avatar Image URL</label>
              <input
                id="photoURL"
                type="text"
                placeholder="https://example.com/avatar.jpg"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary h-11"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Profile Info"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-11 rounded text-[11px] font-bold tracking-wider uppercase select-none transition-all active:scale-[0.98] border border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center gap-1.5 font-mono"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/50 dark:bg-vercel-black/50 text-[10px] text-vercel-text-muted font-mono">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <p>© {new Date().getFullYear()} LYNC. All Rights Reserved.</p>
          <p className="text-[9px] uppercase tracking-wider">SECURE WEBRTC PLATFORM</p>
        </div>
      </footer>
    </div>
  );
}
