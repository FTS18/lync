import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-black hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-all text-vercel-text-light dark:text-vercel-text-dark"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>

  );
}
