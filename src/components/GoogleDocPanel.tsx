"use client";

import { useState, useEffect, useRef } from "react";
import { ref, set, onValue, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { FileText, X, ExternalLink, Link, Check, AlertCircle } from "lucide-react";

interface GoogleDocPanelProps {
  roomId: string;
  visible: boolean;
  localIsHost: boolean;
  onClose: () => void;
}

// Extract Google Doc/Sheet/Slides embed URL from various share formats
function toEmbedUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname;
    if (!host.includes("docs.google.com") && !host.includes("drive.google.com")) return null;

    // Already an embed URL
    if (url.pathname.includes("/edit") || url.pathname.includes("/pub")) {
      return input.replace(/\/edit.*$/, "/edit?embedded=true").replace(/\/pub.*$/, "/pub?embedded=true");
    }
    return input;
  } catch {
    return null;
  }
}

export default function GoogleDocPanel({ roomId, visible, localIsHost, onClose }: GoogleDocPanelProps) {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [inputError, setInputError] = useState(false);
  const [copied, setCopied] = useState(false);
  const embedUrl = docUrl ? toEmbedUrl(docUrl) : null;
  const dbRef = useRef(ref(database, `rooms/${roomId}/sharedDoc`));

  // Sync shared doc URL from Firebase
  useEffect(() => {
    const docRef = dbRef.current;
    const unsub = onValue(docRef, (snap) => {
      const val = snap.val();
      setDocUrl(val ?? null);
      if (val) setInputVal(val);
    });
    return () => off(docRef, "value", unsub);
  }, [roomId]);

  const handleSetDoc = () => {
    const embed = toEmbedUrl(inputVal);
    if (!embed) {
      setInputError(true);
      setTimeout(() => setInputError(false), 2000);
      return;
    }
    set(dbRef.current, inputVal.trim());
  };

  const handleClearDoc = () => {
    set(dbRef.current, null);
    setInputVal("");
  };

  const handleCopyLink = () => {
    if (!docUrl) return;
    navigator.clipboard.writeText(docUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col w-full md:w-[520px] bg-zinc-950 border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-white">Shared Document</span>
        </div>
        <div className="flex items-center gap-1">
          {docUrl && (
            <>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg border border-transparent hover:border-white/10 text-zinc-400 hover:text-white transition-all"
                title="Copy doc link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link className="h-3.5 w-3.5" />}
              </button>
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-transparent hover:border-white/10 text-zinc-400 hover:text-white transition-all"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-white/10 text-zinc-400 hover:text-white transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Host URL input bar */}
      {localIsHost && (
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
            Paste a Google Doc, Sheet, or Slides link to share with everyone
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setInputError(false); }}
              placeholder="https://docs.google.com/document/d/..."
              className={`flex-1 h-8 px-3 rounded-lg bg-white/5 border text-[11px] font-mono text-white placeholder:text-zinc-600 outline-none transition-all focus:border-white/30 ${inputError ? "border-red-500/50" : "border-white/10"}`}
            />
            <button
              onClick={handleSetDoc}
              className="h-8 px-3 rounded-lg bg-white text-black text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity flex-shrink-0"
            >
              Share
            </button>
            {docUrl && (
              <button
                onClick={handleClearDoc}
                className="h-8 px-3 rounded-lg border border-white/10 text-zinc-400 text-[10px] font-mono uppercase tracking-wider hover:border-white/30 hover:text-white transition-all flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          {inputError && (
            <p className="flex items-center gap-1 text-[9px] font-mono text-red-400">
              <AlertCircle className="h-3 w-3" />
              Not a valid Google Docs/Sheets/Slides link.
            </p>
          )}
        </div>
      )}

      {/* Document embed or placeholder */}
      <div className="flex-1 overflow-hidden relative">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            title="Shared Google Document"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-mono">No Document Shared</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                {localIsHost
                  ? "Paste a Google Doc link above to collaborate with participants."
                  : "Waiting for the host to share a document..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
