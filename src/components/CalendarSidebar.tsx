"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarEvent, listUpcomingCalendarEvents, extractLyncLink, formatEventTime, getGoogleAccessToken } from "@/lib/googleApi";
import { Calendar, ExternalLink, Video, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export default function CalendarSidebar() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const hasToken = !!getGoogleAccessToken();

  const fetchEvents = async () => {
    if (!hasToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listUpcomingCalendarEvents(7);
      setEvents(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load calendar events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="w-full max-w-[460px] mx-auto">
        <div className="card-premium flex items-center gap-3 py-3 px-4 text-xs font-mono text-vercel-text-muted">
          <Calendar className="h-4 w-4 flex-shrink-0 text-vercel-text-muted" />
          <span className="text-[10px]">Sign in with Google to see your upcoming calendar events here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] mx-auto">
      <div className="card-premium space-y-0 overflow-hidden">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between pb-2 border-b border-vercel-border-light dark:border-vercel-border-dark mb-0 group"
        >
          <div className="flex items-center gap-2 text-vercel-text-light dark:text-vercel-text-dark">
            <Calendar className="h-3.5 w-3.5" />
            <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Upcoming Events</h3>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <button
                onClick={(e) => { e.stopPropagation(); fetchEvents(); }}
                className="p-1 rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-all"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
            {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-vercel-text-muted" /> : <ChevronUp className="h-3.5 w-3.5 text-vercel-text-muted" />}
          </div>
        </button>

        {!collapsed && (
          <div className="pt-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-vercel-text-muted font-mono">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading calendar...</span>
              </div>
            ) : error ? (
              <div className="py-4 text-center">
                <p className="text-[10px] font-mono text-red-400">{error}</p>
                <button onClick={fetchEvents} className="mt-2 text-[10px] font-mono underline text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-colors">
                  Retry
                </button>
              </div>
            ) : events.length === 0 ? (
              <p className="text-[10px] font-mono text-vercel-text-muted text-center py-4">
                No upcoming events in the next 7 days.
              </p>
            ) : (
              events.map((event) => {
                const lyncLink = extractLyncLink(event);
                const roomId = lyncLink ? lyncLink.split("/room/")[1] : null;
                return (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-vercel-border-light dark:border-vercel-border-dark hover:bg-vercel-border-light/30 dark:hover:bg-vercel-border-dark/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate text-vercel-text-light dark:text-vercel-text-dark font-mono">
                        {event.summary ?? "(No Title)"}
                      </p>
                      <p className="text-[9px] text-vercel-text-muted font-mono mt-0.5">
                        {formatEventTime(event)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {roomId && (
                        <button
                          onClick={() => router.push(`/room/${roomId}`)}
                          className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-vercel-text-light dark:bg-white text-white dark:text-vercel-black text-[9px] font-bold uppercase tracking-wider font-mono hover:opacity-80 transition-opacity"
                        >
                          <Video className="h-3 w-3" />
                          Join
                        </button>
                      )}
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-transparent hover:border-vercel-border-light dark:hover:border-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
