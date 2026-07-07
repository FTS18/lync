"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const sections = [
  {
    title: "1. Information We Collect",
    content: `Lync collects only the minimum data required to provide our service. This includes your email address and display name when you create an account, your room participation history stored locally to your account, optional Google OAuth tokens (only when you explicitly sign in with Google and grant permissions), and browser-level metadata such as device type for session quality purposes. We do not sell, rent, or share your personal data with any third parties for marketing purposes.`
  },
  {
    title: "2. How We Use Your Information",
    content: `Your information is used solely to operate and improve Lync. Specifically: your email and display name are used to identify you in meetings, your room history is stored so you can quickly rejoin past meetings, Google OAuth tokens (when provided) are used in-session only to read your Google Calendar and upload meeting artifacts to your Google Drive — they are never stored on our servers. All WebRTC call data (video, audio, screen shares) is transmitted peer-to-peer and is never stored or recorded by Lync unless you explicitly trigger recording.`
  },
  {
    title: "3. Data Storage & Firebase",
    content: `Lync uses Firebase (Google) for authentication and Realtime Database storage. Room metadata, chat messages, and attendance records are stored in Firebase Realtime Database tied to your Firebase project. Firebase's own privacy policy applies to this data: https://firebase.google.com/support/privacy. All data is encrypted in transit using TLS.`
  },
  {
    title: "4. Google Services Integration",
    content: `If you choose to connect Google services (Calendar, Drive), Lync will request your explicit consent via Google's OAuth 2.0 flow. We request the minimum necessary scopes: calendar (to read and create events) and drive.file (to write files created by Lync). We do not access any pre-existing files in your Drive. You can revoke access at any time via your Google Account settings at myaccount.google.com/permissions.`
  },
  {
    title: "5. Cookies & Local Storage",
    content: `Lync uses browser localStorage to persist your theme preference (light/dark mode). No advertising cookies, tracking pixels, or third-party analytics are embedded in the application. We do not use Google Analytics or similar tools.`
  },
  {
    title: "6. Data Retention",
    content: `Room data (messages, attendance logs) persists in Firebase until you or the room host explicitly deletes it. You can request deletion of your account and associated data by contacting us at dubeyananay@gmail.com. We will process deletion requests within 30 days.`
  },
  {
    title: "7. Your Rights",
    content: `You have the right to access, correct, or delete any personal data Lync holds about you. You may also request a portable copy of your data. To exercise these rights, contact us at the address below. Users in the European Union additionally hold rights under GDPR, including the right to object to processing and the right to restrict processing.`
  },
  {
    title: "8. Security",
    content: `All data transmitted by Lync is encrypted using TLS/HTTPS. WebRTC streams are end-to-end encrypted by default using DTLS-SRTP. We use Firebase Auth for secure identity management with industry-standard token-based sessions. We regularly review our security posture and apply updates promptly.`
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy occasionally. When we do, we will update the "Last updated" date at the top of this page. For material changes, we will notify users via the application interface. Continued use of Lync after changes constitutes acceptance of the updated policy.`
  },
  {
    title: "10. Contact",
    content: `For privacy-related questions or requests, contact us at: dubeyananay@gmail.com or visit our support page at https://lyncc.netlify.app/support.`
  }
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between grid-bg animate-in fade-in duration-300">
      <title>Privacy Policy — Lync</title>

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/75 dark:bg-vercel-black/75 backdrop-blur-md z-50">
        <div className="max-w-2xl mx-auto px-4 md:px-0 h-11 md:h-16 flex items-center justify-between">
          <Link href="/" className="text-lg md:text-xl font-black tracking-widest uppercase font-mono text-vercel-text-light dark:text-white select-none">
            LYNC
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[10px] font-mono uppercase tracking-wider text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-colors">
              ← Back
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow pt-20 md:pt-28 pb-20 px-4 md:px-0">
        <div className="max-w-2xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-3 border-b border-vercel-border-light dark:border-vercel-border-dark pb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-vercel-text-muted">Legal</p>
            <h1 className="text-3xl md:text-4xl font-black font-mono text-vercel-text-light dark:text-white tracking-tight">Privacy Policy</h1>
            <p className="text-xs font-mono text-vercel-text-muted">Last updated: July 8, 2026</p>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-sm font-black font-mono uppercase tracking-wider text-vercel-text-light dark:text-white">{section.title}</h2>
              <p className="text-[13px] leading-7 text-vercel-text-muted font-sans">{section.content}</p>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/50 dark:bg-vercel-black/50 text-[10px] text-vercel-text-muted font-mono">
        <div className="max-w-2xl mx-auto px-4 md:px-0 h-12 flex items-center justify-between">
          <p>© {new Date().getFullYear()} LYNC.</p>
          <div className="flex items-center gap-4 uppercase tracking-wider text-[9px]">
            <Link href="/privacy" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
