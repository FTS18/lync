"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Mail, BookOpen, Shield, Zap, Video, FileText } from "lucide-react";

const faqs = [
  {
    q: "How do I start an instant meeting?",
    a: "Sign in, then click '+ Instant Call' on the dashboard. You will be taken directly into a new meeting room. Share the room link from your browser's address bar with participants."
  },
  {
    q: "How do I schedule a meeting for later?",
    a: "On the dashboard, select a date and time in the schedule input, then click 'Create Link'. A room link will be generated. If you are signed in with Google, a Google Calendar event is automatically created and invites sent to any email addresses you enter."
  },
  {
    q: "Why can't I see or hear other participants?",
    a: "Make sure your browser has camera and microphone permissions granted for this site. Check Settings → Privacy → Camera/Microphone in your browser. Also ensure you are not muted — the microphone button in the call controls should be active (not crossed out)."
  },
  {
    q: "How do I use Google Calendar integration?",
    a: "Sign in using the 'Sign in with Google' button. After sign-in, your upcoming Google Calendar events will appear on the dashboard. When creating a scheduled meeting, a Google Calendar event is automatically created. You must enable the Calendar API in your Google Cloud project for this to work."
  },
  {
    q: "How does the Google Drive auto-save work?",
    a: "When a meeting host ends a call, a modal appears offering to upload the chat transcript (.txt), attendance log (.csv), and any recordings (.webm) to a 'Lync Meetings/' folder in your Google Drive. This requires you to be signed in with Google with Drive permissions."
  },
  {
    q: "How do I share a Google Doc in a meeting?",
    a: "In a call, click the document icon (📄) in the bottom controls bar. Paste a Google Docs, Sheets, or Slides URL. The document will be embedded for all participants. The document must be shared with 'Anyone with the link can view/edit' for the embed to work."
  },
  {
    q: "Can I use Lync without a Google account?",
    a: "Yes. You can sign up with any email address and password. Google integration (Calendar, Drive) is optional and only activates when you sign in with Google."
  },
  {
    q: "What browsers are supported?",
    a: "Lync works best on Chrome, Edge, and Firefox (latest versions). Safari has limited WebRTC support. For best performance, use Chrome on desktop."
  },
  {
    q: "Is my call data private?",
    a: "Yes. WebRTC video and audio streams are transmitted peer-to-peer with DTLS-SRTP encryption. Lync does not record or intercept call content. Chat messages are stored in Firebase only for the duration of the session."
  },
  {
    q: "How do I delete my account?",
    a: "Email us at dubeyananay@gmail.com with the subject 'Account Deletion Request'. We will process your request and remove all associated data within 30 days."
  }
];

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between grid-bg animate-in fade-in duration-300">
      <title>Support — Lync</title>

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
        <div className="max-w-2xl mx-auto space-y-12">
          {/* Header */}
          <div className="space-y-3 border-b border-vercel-border-light dark:border-vercel-border-dark pb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-vercel-text-muted">Help Center</p>
            <h1 className="text-3xl md:text-4xl font-black font-mono text-vercel-text-light dark:text-white tracking-tight">Support</h1>
            <p className="text-sm text-vercel-text-muted leading-relaxed">
              Browse FAQs below or reach out directly. We typically respond within 24 hours.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Mail className="h-5 w-5" />,
                label: "Email",
                value: "dubeyananay@gmail.com",
                href: "mailto:dubeyananay@gmail.com",
                desc: "General support & billing"
              },
              {
                icon: <Shield className="h-5 w-5" />,
                label: "Privacy",
                value: "dubeyananay@gmail.com",
                href: "mailto:dubeyananay@gmail.com",
                desc: "Data requests & GDPR"
              },
              {
                icon: <BookOpen className="h-5 w-5" />,
                label: "Legal",
                value: "dubeyananay@gmail.com",
                href: "mailto:dubeyananay@gmail.com",
                desc: "Terms & copyright"
              },
            ].map((c) => (
              <a
                key={c.label}
                href={c.href}
                className="card-premium group hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center gap-2 mb-3 text-vercel-text-light dark:text-white">
                  {c.icon}
                  <span className="text-xs font-black font-mono uppercase tracking-wider">{c.label}</span>
                </div>
                <p className="text-[11px] font-mono text-vercel-text-muted truncate">{c.value}</p>
                <p className="text-[10px] font-mono text-vercel-text-muted mt-1 opacity-60">{c.desc}</p>
              </a>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Video className="h-4 w-4" />, label: "Start a Meeting", href: "/" },
              { icon: <Zap className="h-4 w-4" />, label: "Privacy Policy", href: "/privacy" },
              { icon: <BookOpen className="h-4 w-4" />, label: "Terms of Service", href: "/terms" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="flex items-center gap-2 p-3 rounded-xl border border-vercel-border-light dark:border-vercel-border-dark hover:border-neutral-400 dark:hover:border-neutral-600 text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-all text-[11px] font-mono uppercase tracking-wider font-bold"
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-sm font-black font-mono uppercase tracking-wider text-vercel-text-light dark:text-white border-b border-vercel-border-light dark:border-vercel-border-dark pb-3">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group border border-vercel-border-light dark:border-vercel-border-dark rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-vercel-border-light/30 dark:hover:bg-vercel-border-dark/30 transition-colors">
                    <span className="text-[12px] font-bold font-mono text-vercel-text-light dark:text-vercel-text-dark pr-4">{faq.q}</span>
                    <span className="text-vercel-text-muted text-lg font-light flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-[12px] leading-6 text-vercel-text-muted font-sans">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
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
