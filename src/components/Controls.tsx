"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Monitor, MonitorOff, Palette, Users } from "lucide-react";

interface ControlsProps {
  onLeave: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  screenSharing: boolean;
  onToggleScreenShare: () => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
  videoMuted: boolean;
  onToggleVideo: () => void;
  whiteboardOpen: boolean;
  onToggleWhiteboard: () => void;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  /** When true: renders as squircle inline buttons (for desktop header). When false: renders as floating pill (for mobile). */
  inline?: boolean;
}

export default function Controls({
  onLeave,
  chatOpen,
  onToggleChat,
  screenSharing,
  onToggleScreenShare,
  audioMuted,
  onToggleAudio,
  videoMuted,
  onToggleVideo,
  whiteboardOpen,
  onToggleWhiteboard,
  participantsOpen,
  onToggleParticipants,
  inline = false,
}: ControlsProps) {
  
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  };

  // Inline (desktop header) — squircle large icons, no wrapper pill
  const squircleBase = "flex items-center justify-center transition-all duration-150 active:scale-95 flex-shrink-0";
  const squircleSize = inline ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-full";
  const iconSize = inline ? "h-3.5 w-3.5" : "h-4 w-4";

  const btnBase = `${squircleBase} ${squircleSize}`;
  const btnNeutral = `${btnBase} border border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-light dark:text-vercel-text-dark hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark`;
  const btnActive = `${btnBase} bg-vercel-text-light dark:bg-vercel-light text-vercel-light dark:text-vercel-black border-transparent`;
  const btnMuted  = `${btnBase} bg-red-600 text-white border-transparent hover:bg-red-700`;
  const btnEnd    = `${btnBase} bg-red-600 text-white border-transparent hover:bg-red-700`;

  const buttons = (
    <>
      {/* Video */}
      <button onClick={() => { triggerHaptic(); onToggleVideo(); }}
        className={videoMuted ? btnMuted : btnNeutral}
        title={videoMuted ? "Turn Camera On" : "Turn Camera Off"}>
        {videoMuted ? <VideoOff className={iconSize} /> : <Video className={iconSize} />}
      </button>

      {/* Audio */}
      <button onClick={() => { triggerHaptic(); onToggleAudio(); }}
        className={audioMuted ? btnMuted : btnNeutral}
        title={audioMuted ? "Unmute Microphone" : "Mute Microphone"}>
        {audioMuted ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
      </button>

      {/* Screen Share */}
      <button onClick={() => { triggerHaptic(); onToggleScreenShare(); }}
        className={screenSharing ? btnActive : btnNeutral}
        title={screenSharing ? "Stop Screen Share" : "Share Screen"}>
        {screenSharing ? <MonitorOff className={iconSize} /> : <Monitor className={iconSize} />}
      </button>

      {/* Whiteboard */}
      <button onClick={() => { triggerHaptic(); onToggleWhiteboard(); }}
        className={whiteboardOpen ? btnActive : btnNeutral}
        title="Toggle Whiteboard">
        <Palette className={iconSize} />
      </button>

      {/* Participants */}
      <button onClick={() => { triggerHaptic(); onToggleParticipants(); }}
        className={participantsOpen ? btnActive : btnNeutral}
        title="Toggle Participant List">
        <Users className={iconSize} />
      </button>

      {/* Chat */}
      <button onClick={() => { triggerHaptic(); onToggleChat(); }}
        className={chatOpen ? btnActive : btnNeutral}
        title="Toggle Chat">
        <MessageSquare className={iconSize} />
      </button>

      {/* Leave */}
      <button onClick={() => { triggerHaptic(); onLeave(); }}
        className={btnEnd}
        title="Leave Room">
        <PhoneOff className={iconSize} />
      </button>
    </>
  );

  if (inline) {
    return <div className="flex items-center gap-1">{buttons}</div>;
  }

  // Mobile: floating pill
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-vercel-light dark:bg-vercel-dark border border-vercel-border-light dark:border-vercel-border-dark rounded-full shadow-lg overflow-x-auto scrollbar-none">
      {buttons}
    </div>
  );
}
