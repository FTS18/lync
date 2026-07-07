"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/hooks/useFirebase";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarSidebar from "@/components/CalendarSidebar";
import { Chrome, LogOut, Video, Plus, Keyboard, Copy, Check, Settings, Sparkles, LogIn, Clock, Lock, ArrowRight, Link, Calendar, Download, ExternalLink, FileText, X, Loader2, Mail } from "lucide-react";
import { database } from "@/lib/firebase";
import { requestNotificationPermission, showNotification } from "@/lib/notifications";
import { createCalendarEvent, getGoogleAccessToken } from "@/lib/googleApi";

import { ref, set, onValue, get } from "firebase/database";


interface HistoryItem {
  roomId: string;
  timestamp: number;
}

export default function Home() {
  const router = useRouter();
  const { user, loading, signIn, signUp, signInWithGoogle } = useFirebase();

  // Auth states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  // Dashboard / Join States
  const [roomIdInput, setRoomIdInput] = useState("");
  const [createdRoomLink, setCreatedRoomLink] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Passcode Setup State
  const [passcodeOption, setPasscodeOption] = useState("");

  // Schedule Setup State
  const [scheduleTime, setScheduleTime] = useState("");

  // Report Modal States
  const [reportRoomId, setReportRoomId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // Google Calendar invite emails
  const [participantEmails, setParticipantEmails] = useState("");
  const [calendarInviteSent, setCalendarInviteSent] = useState(false);


  // Sync Join History on Load
  useEffect(() => {
    if (!user) return;
    const historyRef = ref(database, `users/${user.uid}/history`);
    
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, time]) => ({
          roomId: id,
          timestamp: time as number,
        }));
        // Sort newest first, limit to 3
        list.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(list.slice(0, 3));
      } else {
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Fill out all fields");

    try {
      if (isSignUp) {
        if (!username) return alert("Username required");
        await signUp(email, username, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to generate abc-defg-hij meeting code
  const generateRoomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const part = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `${part(3)}-${part(4)}-${part(3)}`;
  };

  // Register room in Firebase
  const registerRoom = async (id: string, passcode?: string, scheduledAt?: number) => {
    if (!user) return;
    const roomRef = ref(database, `rooms/${id}/metadata`);
    await set(roomRef, {
      createdAt: Date.now(),
      creator: user.uid,
      passcode: passcode?.trim() || null,
      scheduledAt: scheduledAt || null,
      admins: {
        [user.uid]: true
      }
    });
  };

  // Write join history
  const recordJoinHistory = async (id: string) => {
    if (!user) return;
    const historyRef = ref(database, `users/${user.uid}/history/${id}`);
    await set(historyRef, Date.now());
  };

  const handleStartInstantMeeting = async () => {
    const id = generateRoomId();
    try {
      await registerRoom(id);
      await recordJoinHistory(id);
      router.push(`/room/${id}`);
    } catch (err: any) {
      alert("Failed to start meeting: " + err.message);
    }
  };

  const handleCreateMeetingLater = async () => {
    const id = generateRoomId();
    try {
      const scheduledTimeMs = scheduleTime ? new Date(scheduleTime).getTime() : undefined;
      await registerRoom(id, passcodeOption, scheduledTimeMs);
      const link = `${window.location.origin}/room/${id}`;
      setCreatedRoomLink(link);
      setCopied(false);
      setCalendarInviteSent(false);

      if (scheduledTimeMs) {
        const delay = scheduledTimeMs - Date.now() - 5 * 60 * 1000;
        if (delay > 0) {
          requestNotificationPermission().then((granted) => {
            if (granted) {
              setTimeout(() => {
                showNotification("Meeting starting in 5 minutes!", {
                  body: `Your Lync meeting is starting in 5 minutes.`,
                });
              }, delay);
            }
          });
        }

        // Auto-create Google Calendar event if token available
        if (getGoogleAccessToken()) {
          try {
            const emails = participantEmails
              .split(/[,;\n]+/)
              .map((e) => e.trim())
              .filter((e) => e.includes("@"));
            await createCalendarEvent(
              "Lync Meeting Call",
              scheduledTimeMs,
              scheduledTimeMs + 3600_000,
              link,
              `Join Lync Secure Call Workspace: ${link}`,
              emails
            );
            setCalendarInviteSent(true);
          } catch (calErr: any) {
            console.warn("Calendar event creation failed:", calErr.message);
          }
        }
      }
    } catch (err: any) {
      alert("Failed to generate meeting link: " + err.message);
    }
  };


  const downloadIcsFile = (roomId: string, timeMs: number) => {
    const startStr = new Date(timeMs).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = new Date(timeMs + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LYNC//Secure Calling Workspace//EN",
      "BEGIN:VEVENT",
      `UID:${roomId}@lync.secure`,
      `DTSTAMP:${startStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      "SUMMARY:Lync Meeting Call",
      `DESCRIPTION:Join Lync Secure Call Workspace: ${window.location.origin}/room/${roomId}`,
      `LOCATION:${window.location.origin}/room/${roomId}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lync-meeting-${roomId}.ics`;
    link.click();
  };

  const getGoogleCalendarUrl = (roomId: string, timeMs: number) => {
    const startStr = new Date(timeMs).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = new Date(timeMs + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const details = encodeURIComponent(`Join Lync Secure Call Workspace: ${window.location.origin}/room/${roomId}`);
    const location = encodeURIComponent(`${window.location.origin}/room/${roomId}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Lync+Meeting+Call&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  const handleViewReport = async (roomId: string) => {
    setReportRoomId(roomId);
    setLoadingReport(true);
    setAttendanceRecords([]);
    try {
      const attendanceRef = ref(database, `rooms/${roomId}/attendance`);
      const snapshot = await get(attendanceRef);
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).map((v: any) => ({
          displayName: v.displayName || "Guest",
          joinedAt: v.joinedAt,
          leftAt: v.leftAt || null,
        }));
        setAttendanceRecords(list);
      }
    } catch (err) {
      console.error("Failed to load attendance report:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdRoomLink) return;
    navigator.clipboard.writeText(createdRoomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    let codeOrLink = roomIdInput.trim();
    if (!codeOrLink) return alert("Please enter a meeting code or link");

    // Parse code from full URL if pasted
    if (codeOrLink.includes("/room/")) {
      const parts = codeOrLink.split("/room/");
      codeOrLink = parts[parts.length - 1];
    }

    // Clean up spaces or query params
    codeOrLink = codeOrLink.split("?")[0].replace(/\s+/g, "").toLowerCase();

    if (!codeOrLink) return alert("Invalid meeting link or code");

    try {
      await recordJoinHistory(codeOrLink);
      router.push(`/room/${codeOrLink}`);
    } catch (err: any) {
      router.push(`/room/${codeOrLink}`);
    }
  };

  const handleQuickJoin = async (id: string) => {
    await recordJoinHistory(id);
    router.push(`/room/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vercel-light dark:bg-vercel-black text-sm text-vercel-text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between grid-bg animate-in fade-in duration-300">
      <header className="fixed top-0 left-0 right-0 border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/75 dark:bg-vercel-black/75 backdrop-blur-md z-50">
        <div className="max-w-[460px] mx-auto px-4 md:px-0 h-11 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <span className="text-lg md:text-xl font-black tracking-widest uppercase font-mono text-vercel-text-light dark:text-white select-none">LYNC</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <button
                onClick={() => router.push("/settings")}
                className="h-9 text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-vercel-text-light dark:text-vercel-text-dark border border-vercel-border-light dark:border-vercel-border-dark rounded-xl px-3 hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-all flex items-center gap-1.5 font-mono bg-vercel-light dark:bg-vercel-black"
              >
                <Settings className="h-3.5 w-3.5" /> Settings
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-start justify-center pt-16 pb-24 px-4 md:pt-28 md:pb-32 md:px-12">
        <div className="w-full max-w-4xl space-y-6 md:space-y-8 py-1 md:py-2 animate-in slide-in-from-bottom-4 duration-300">
          {/* Center Hero Logo Banner */}
          <div className="flex flex-col justify-center items-center py-6 gap-4 animate-in fade-in zoom-in-95 duration-700">
            {/* Glow bloom behind logo */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/5 blur-3xl scale-150 pointer-events-none" />
              <img 
                src="/logo.png" 
                alt="Lync Logo" 
                className="relative h-32 md:h-52 w-auto object-contain dark:invert-0 invert drop-shadow-2xl" 
              />
            </div>
            {/* Tagline */}
            <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.35em] text-vercel-text-muted text-center">
              Secure · Real-Time · WebRTC Calling
            </p>


          </div>

          {!user ? (
            /* Auth Form Card */
            <div className="w-full max-w-[380px] mx-auto border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark p-8 rounded-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Subtle glow border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-right from-neutral-200 to-neutral-800 dark:from-neutral-800 dark:to-neutral-200" />
              
              <h2 className="text-lg font-bold tracking-tight text-center mb-1 font-mono uppercase">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-[11px] text-vercel-text-muted text-center mb-6">
                {isSignUp ? "Join the calling space instantly" : "Sign in to join a room"}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div className="input-box">
                    <label htmlFor="username">Username</label>
                    <input
                      id="username"
                      type="text"
                      placeholder="john_doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                )}
                <div className="input-box">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="input-box">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="w-full btn-primary h-11">
                  {isSignUp ? "Sign Up" : "Login"}
                </button>
              </form>

              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-vercel-border-light dark:border-vercel-border-dark"></div>
                <span className="flex-shrink mx-4 text-vercel-text-muted text-[10px] uppercase font-mono tracking-wider">or</span>
                <div className="flex-grow border-t border-vercel-border-light dark:border-vercel-border-dark"></div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full btn-secondary h-11 flex items-center justify-center gap-2"
                >
                  <Chrome className="h-4 w-4" /> Google
                </button>
                
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-center text-[10px] tracking-wide font-bold uppercase text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-vercel-text-dark transition-colors font-mono"
                >
                  {isSignUp ? "Sign In Instead" : "Create Account Instead"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Centered Aligning Cards Container */}
              <div className="max-w-[460px] mx-auto w-full space-y-6">
              {/* Single Unified Action Card */}
              <div className="card-premium">
                {/* Section A: Start a Meeting */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-vercel-text-light dark:text-vercel-text-dark border-b border-vercel-border-light dark:border-vercel-border-dark pb-2">
                    <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Start a Meeting</h3>
                  </div>
                  <p className="text-[11px] md:text-xs text-vercel-text-muted leading-relaxed">
                    Create a new call instantly, or generate a link to schedule and share with others for later.
                  </p>

                  {/* Passcode Option Input */}
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-vercel-text-muted" />
                    <input
                      type="text"
                      placeholder="Room Passcode (optional)"
                      value={passcodeOption}
                      onChange={(e) => setPasscodeOption(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-xs transition-all text-vercel-text-light dark:text-vercel-text-dark font-mono"
                    />
                  </div>

                  {/* Schedule Meeting Time Input (optional) */}
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-vercel-text-muted" />
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-xs transition-all text-vercel-text-light dark:text-vercel-text-dark font-mono"
                      title="Schedule for later (optional)"
                    />
                  </div>

                  {/* Participant emails for Calendar invites */}
                  {scheduleTime && (
                    <div className="relative animate-in fade-in slide-in-from-top-1 duration-200">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-vercel-text-muted" />
                      <input
                        type="text"
                        placeholder="Invite emails (comma separated, optional)"
                        value={participantEmails}
                        onChange={(e) => setParticipantEmails(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-xs transition-all text-vercel-text-light dark:text-vercel-text-dark font-mono"
                      />
                    </div>
                  )}


                  {createdRoomLink && (
                    <div className="space-y-2">
                      <div className="p-3 border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-black rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] uppercase tracking-wider text-vercel-text-muted font-bold font-mono">
                            Share Link
                          </p>
                          <p className="text-xs font-mono truncate text-vercel-text-light dark:text-vercel-text-dark select-all">
                            {createdRoomLink}
                          </p>
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className="p-2 border border-vercel-border-light dark:border-vercel-border-dark rounded-lg hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-colors flex-shrink-0"
                          title="Copy Link"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {scheduleTime && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <button
                            onClick={() => {
                              const roomId = createdRoomLink.split("/room/")[1];
                              downloadIcsFile(roomId, new Date(scheduleTime).getTime());
                            }}
                            className="flex-1 h-9 border border-vercel-border-light dark:border-vercel-border-dark rounded-lg hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-[9px] uppercase font-bold tracking-wider font-mono text-vercel-text-light dark:text-vercel-text-dark flex items-center justify-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" /> Download .ics
                          </button>
                          {calendarInviteSent ? (
                            <div className="flex-1 h-9 border border-green-500/30 rounded-lg text-[9px] uppercase font-bold tracking-wider font-mono text-green-500 flex items-center justify-center gap-1.5 bg-green-500/5">
                              <Check className="h-3.5 w-3.5" /> Invite Sent!
                            </div>
                          ) : (
                            <a
                              href={getGoogleCalendarUrl(createdRoomLink.split("/room/")[1], new Date(scheduleTime).getTime())}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-9 border border-vercel-border-light dark:border-vercel-border-dark rounded-lg hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-[9px] uppercase font-bold tracking-wider font-mono text-vercel-text-light dark:text-vercel-text-dark flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Google Calendar
                            </a>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartInstantMeeting}
                      className="flex-1 btn-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> Instant Call
                    </button>
                    <button
                      onClick={handleCreateMeetingLater}
                      className="flex-1 btn-secondary"
                    >
                      <Link className="h-3.5 w-3.5" /> Create Link
                    </button>
                  </div>
                </div>

                {/* Divider with 'OR' badge */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-vercel-border-light dark:border-vercel-border-dark" />
                  </div>
                  <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-widest font-mono">
                    <span className="bg-white dark:bg-[#18181b] px-3 text-vercel-text-muted">OR</span>
                  </div>
                </div>

                {/* Section B: Join a Meeting */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-vercel-text-light dark:text-vercel-text-dark border-b border-vercel-border-light dark:border-vercel-border-dark pb-2">
                    <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Join with a Code</h3>
                  </div>
                  <p className="text-[11px] md:text-xs text-vercel-text-muted leading-relaxed">
                    Pasted a room URL or typed a custom room ID? Enter it below to join the call workspace.
                  </p>

                  <form onSubmit={handleJoinByCode} className="space-y-3">
                    <div className="relative">
                      <Keyboard className="absolute left-3 top-3 h-4 w-4 text-vercel-text-muted" />
                      <input
                        type="text"
                        placeholder="Enter link or room code"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-xs transition-all text-vercel-text-light dark:text-vercel-text-dark font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full btn-primary"
                    >
                      <LogIn className="h-3.5 w-3.5" /> Join Room
                    </button>
                  </form>
                </div>
              </div>

              {/* Recent History Card */}
              {history.length > 0 && (
                <div className="border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark p-4 md:p-5 rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-vercel-text-light dark:text-vercel-text-dark">
                    <h3 className="font-bold text-xs tracking-wider uppercase font-mono">Recent Meetings</h3>
                  </div>
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div 
                        key={item.roomId}
                        onClick={() => handleQuickJoin(item.roomId)}
                        className="p-3 border border-vercel-border-light dark:border-vercel-border-dark rounded-xl hover:border-neutral-400 dark:hover:border-neutral-600 bg-vercel-light dark:bg-vercel-black transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-500 transition-colors">
                            <Video className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-mono text-xs font-bold text-vercel-text-light dark:text-vercel-text-dark select-all">
                              {item.roomId}
                            </p>
                            <p className="text-[9px] font-mono text-vercel-text-muted uppercase">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(item.roomId);
                            }}
                            className="p-1.5 rounded-full border border-transparent hover:border-vercel-border-light dark:hover:border-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-all"
                            title="Attendance Report"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <div className="p-1.5 rounded-full border border-transparent group-hover:border-vercel-border-light dark:group-hover:border-vercel-border-dark text-vercel-text-muted group-hover:text-vercel-text-light dark:group-hover:text-white transition-all">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Google Calendar Sidebar — upcoming events (Temporarily disabled) */}
            {/* <CalendarSidebar /> */}
          </>
        )}
      </div>
    </main>


      {/* Attendance Report Modal */}
      {reportRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-vercel-border-light dark:border-vercel-border-dark">
              <div>
                <h3 className="font-bold text-sm font-mono uppercase tracking-wider text-vercel-text-light dark:text-white">
                  Attendance Report
                </h3>
                <p className="text-[10px] font-mono text-vercel-text-muted">
                  ROOM: {reportRoomId}
                </p>
              </div>
              <button
                onClick={() => setReportRoomId(null)}
                className="p-1 rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loadingReport ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-vercel-text-muted font-mono">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Fetching Attendance...</span>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-xs text-vercel-text-muted text-center py-8 font-mono">
                  No attendance records found for this session.
                </p>
              ) : (
                attendanceRecords.map((record, index) => {
                  const duration = record.leftAt 
                    ? Math.round((record.leftAt - record.joinedAt) / 1000)
                    : null;
                  
                  const formatDuration = (secs: number) => {
                    if (secs < 60) return `${secs}s`;
                    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
                  };

                  return (
                    <div 
                      key={index}
                      className="p-2.5 rounded-lg border border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-black flex items-center justify-between text-xs font-mono"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold truncate text-vercel-text-light dark:text-vercel-text-dark">
                          {record.displayName}
                        </p>
                        <p className="text-[9px] text-vercel-text-muted">
                          Joined: {new Date(record.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {duration !== null ? (
                          <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">
                            {formatDuration(duration)}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end">
              <button
                onClick={() => setReportRoomId(null)}
                className="btn-primary h-9 px-4 text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light/50 dark:bg-vercel-black/50 text-[10px] text-vercel-text-muted font-mono">
        <div className="max-w-[460px] mx-auto px-4 md:px-0 h-12 flex items-center justify-between">
          <p>© {new Date().getFullYear()} LYNC.</p>
          <div className="flex items-center gap-4 uppercase tracking-wider text-[9px]">
            <a href="/privacy" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Terms</a>
            <a href="/support" className="hover:text-vercel-text-light dark:hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

