import { Bricolage_Grotesque } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
  weight: ["300", "400", "500", "600", "700", "800"],
});

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lync",
  description: "Secure WebRTC Calling Platform",
  manifest: "/manifest.json",
  themeColor: "#09090b",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" }
    ],
    apple: "/icon-192.png",
  },
  verification: {
    google: "uD6C4QgFw4b4qWeAZGhTHUn8_K9U8LvL9X5y1a-FvWI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bricolageGrotesque.variable}>
      <body className="min-h-screen bg-vercel-light text-vercel-text-light dark:bg-vercel-black dark:text-vercel-text-dark font-sans transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }, function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
