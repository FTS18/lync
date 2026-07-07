"use client";

import { Check, X, Clock, Users, ShieldCheck } from "lucide-react";

interface WaitingEntry {
  uid: string;
  displayName: string;
  requestedAt: number;
}

interface WaitingRoomPanelProps {
  waitingList: WaitingEntry[];
  onAdmit: (uid: string) => void;
  onReject: (uid: string) => void;
}

export default function WaitingRoomPanel({
  waitingList,
  onAdmit,
  onReject,
}: WaitingRoomPanelProps) {
  if (waitingList.length === 0) return null;

  const timeAgo = (ts: number) => {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50 rounded-xl p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
        <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-yellow-700 dark:text-yellow-400">
          Waiting Room · {waitingList.length} pending
        </p>
      </div>

      {/* Entries */}
      <div className="space-y-1.5">
        {waitingList.map((entry) => (
          <div
            key={entry.uid}
            className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40 rounded-lg"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-7 w-7 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 uppercase">
                  {entry.displayName.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate text-vercel-text-light dark:text-vercel-text-dark font-mono">
                  {entry.displayName}
                </p>
                <p className="text-[9px] text-vercel-text-muted flex items-center gap-1 font-mono">
                  <Clock className="h-2.5 w-2.5" />
                  {timeAgo(entry.requestedAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onAdmit(entry.uid)}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold font-mono uppercase tracking-wider transition-colors active:scale-95"
                title="Admit"
              >
                <Check className="h-3 w-3" />
                Admit
              </button>
              <button
                onClick={() => onReject(entry.uid)}
                className="flex items-center justify-center h-7 w-7 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-95"
                title="Reject"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <p className="text-[9px] text-vercel-text-muted font-mono flex items-center gap-1">
        <ShieldCheck className="h-2.5 w-2.5" />
        Participants cannot see or hear each other until admitted.
      </p>
    </div>
  );
}
