import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Lync",
  description: "Terms and conditions for using the Lync platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col grid-bg">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/75 dark:bg-vercel-black/75 backdrop-blur-md z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-widest uppercase font-mono text-vercel-text-light dark:text-white select-none">
            LYNC
          </Link>
          <Link href="/" className="text-[10px] font-mono uppercase tracking-wider text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-3 border-b border-vercel-border-light dark:border-vercel-border-dark pb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-vercel-text-muted">Legal</p>
            <h1 className="text-3xl md:text-4xl font-black font-mono text-vercel-text-light dark:text-white tracking-tight">Terms of Service</h1>
            <p className="text-xs font-mono text-vercel-text-muted">Last updated: July 8, 2026</p>
          </div>

          {/* Sections */}
          {[
            {
              title: "1. Acceptance of Terms",
              content: `By accessing or using Lync ("the Service") at lyncc.netlify.app, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. We reserve the right to update these Terms at any time, and your continued use constitutes acceptance.`
            },
            {
              title: "2. Description of Service",
              content: `Lync is a real-time WebRTC-based video conferencing platform that allows users to create and join secure call workspaces. Features include audio/video calling, screen sharing, chat, whiteboard collaboration, Google Calendar integration, and Google Drive artifact storage. The Service is provided "as is" and may be modified or discontinued at any time.`
            },
            {
              title: "3. User Accounts",
              content: `You may create an account using an email/password combination or by signing in with a Google account. You are responsible for maintaining the confidentiality of your credentials. You agree to notify us immediately of any unauthorized use of your account. You must be at least 13 years of age to create an account.`
            },
            {
              title: "4. Acceptable Use",
              content: `You agree not to use Lync for any unlawful purpose or in any way that could harm, disrupt, or impair the Service. Prohibited activities include: transmitting illegal, harmful, defamatory, or harassing content in meetings or chat; attempting to gain unauthorized access to other accounts or rooms; using the platform to distribute malware or conduct phishing; recording meetings without the consent of all participants (where required by applicable law); and reselling or commercializing access to the Service without written permission.`
            },
            {
              title: "5. Meeting Rooms & Privacy",
              content: `Room creators are responsible for the content shared within their rooms. Lync does not monitor or record call content unless explicitly triggered by participants. Room passcodes and waiting room features are provided as security tools — you are responsible for configuring and using them appropriately. Lync shall not be held liable for unauthorized room access resulting from shared passcodes or links.`
            },
            {
              title: "6. Google Services Integration",
              content: `When you connect Google services via OAuth, you grant Lync permission to interact with your Google Calendar and Google Drive on your behalf, strictly within the scopes you approve. You may revoke this access at any time. Lync does not access, store, or process any Google data beyond what is explicitly required for the features you use within a session.`
            },
            {
              title: "7. Intellectual Property",
              content: `All content, design, code, and branding associated with Lync — including the graffiti wordmark, interface design, and underlying software — are the property of Lync and its developers. You may not copy, reproduce, modify, or distribute any part of the Service without prior written consent. User-generated content (messages, uploaded docs, recordings) remains the property of the respective users.`
            },
            {
              title: "8. Disclaimer of Warranties",
              content: `The Service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We do not guarantee the security of data transmitted over the internet, though we implement industry-standard measures to protect it.`
            },
            {
              title: "9. Limitation of Liability",
              content: `To the maximum extent permitted by law, Lync and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service, including but not limited to loss of data, revenue, or profits, even if we have been advised of the possibility of such damages.`
            },
            {
              title: "10. Termination",
              content: `We reserve the right to suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. You may also terminate your account by contacting support.`
            },
            {
              title: "11. Governing Law",
              content: `These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in India.`
            },
            {
              title: "12. Contact",
              content: `For questions about these Terms, contact us at: legal@lyncc.netlify.app or visit https://lyncc.netlify.app/support.`
            },
          ].map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-sm font-black font-mono uppercase tracking-wider text-vercel-text-light dark:text-white">{section.title}</h2>
              <p className="text-[13px] leading-7 text-vercel-text-muted font-sans">{section.content}</p>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/50 dark:bg-vercel-black/50 text-[10px] text-vercel-text-muted font-mono">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center justify-between">
          <p>© {new Date().getFullYear()} LYNC. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
