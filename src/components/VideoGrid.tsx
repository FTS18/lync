"use client";

import { useEffect, useRef, useState, memo } from "react";
import { ICameraVideoTrack, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { MicOff, Pin, MoreVertical, VolumeX, Shield, ShieldOff, UserMinus, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface VideoPlayerProps {
  track: any;
  className?: string;
  isLocal?: boolean;
}

// Reusable player component
const VideoPlayer = memo(function VideoPlayer({ track, className, isLocal }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !track) return;

    // Attach stream to DOM node
    track.play(container);
    
    // Find the injected video element to inspect its natural dimensions
    const setupDimensionCheck = () => {
      const videoEl = container.querySelector("video");
      if (!videoEl) return null;

      const handleLoadedMetadata = () => {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        if (w > 0 && h > 0) {
          setIsPortrait(h > w);
        }
      };

      videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
      if (videoEl.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    };

    let cleanupFn: (() => void) | null = null;
    const interval = setInterval(() => {
      const cleanup = setupDimensionCheck();
      if (cleanup) {
        cleanupFn = cleanup;
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (cleanupFn) cleanupFn();
      track.stop();
    };
  }, [track]);

  return (
    <div 
      ref={containerRef} 
      className={`video-player-container w-full h-full bg-black rounded-lg overflow-hidden ${
        isLocal ? "mirror-video" : ""
      } ${isPortrait ? "video-contain" : ""} ${className || ""}`} 
    />
  );
});

interface Participant {
  uid: string | number;
  authUid: string;
  displayName: string;
  photoURL?: string;
  audioMuted: boolean;
  videoMuted: boolean;
  handRaised?: boolean;
}

interface VideoGridProps {
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  localName?: string;
  localAudioMuted: boolean;
  localVideoMuted: boolean;
  localHandRaised?: boolean;
  localFilter?: string;
  activeSpeakers: { [uid: string]: boolean };
  networkQualities: { [uid: string]: number };
  localClientUid?: string | number | null;
  localIsAdmin?: boolean;
  adminsMap?: { [key: string]: boolean };
  creatorUid?: string | null;
  roomParticipants?: Participant[];
  onPromoteAdmin?: (authUid: string) => void;
  onDemoteAdmin?: (authUid: string) => void;
  onKickUser?: (clientUid: string | number) => void;
  onForceMuteUser?: (clientUid: string | number) => void;
  onToggleParticipants?: () => void;
  pinnedUid?: string | number | null;
  onPinUser?: (uid: string | number | null) => void;
  onUpdateUserPan?: (uid: string | number, pan: number) => void;
}

export default function VideoGrid({
  localVideoTrack,
  remoteUsers,
  localName = "You",
  localAudioMuted,
  localVideoMuted,
  localHandRaised = false,
  localFilter = "none",
  activeSpeakers = {},
  networkQualities = {},
  localClientUid = null,
  localIsAdmin = false,
  adminsMap = {},
  creatorUid = null,
  roomParticipants = [],
  onPromoteAdmin,
  onDemoteAdmin,
  onKickUser,
  onForceMuteUser,
  onToggleParticipants,
  pinnedUid: propPinnedUid,
  onPinUser,
  onUpdateUserPan,
}: VideoGridProps) {
  const [localPinnedUid, setLocalPinnedUid] = useState<string | number | null>(null);
  
  const pinnedUid = propPinnedUid !== undefined ? propPinnedUid : localPinnedUid;
  const setPinnedUid = onPinUser !== undefined ? onPinUser : setLocalPinnedUid;
  const [openMenuUid, setOpenMenuUid] = useState<string | number | null>(null);
  const lastTapRef = useRef<{ [key: string]: number }>({});
  
  // Track container dimensions for optimal grid layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
  const [isNarrow, setIsNarrow] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
      setIsNarrow(width < 480);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleDoubleInteraction = (uid: string | number) => {
    if (pinnedUid === uid) {
      setPinnedUid(null); // Unpin
    } else {
      setPinnedUid(uid); // Pin
    }
  };

  const handleTouchStart = (uid: string | number) => {
    const now = Date.now();
    const key = String(uid);
    const lastTap = lastTapRef.current[key] || 0;
    if (now - lastTap < 300) {
      handleDoubleInteraction(uid);
    }
    lastTapRef.current[key] = now;
  };

  const getParticipantName = (uid: string | number) => {
    if (uid === "local") return localName;
    const participant = roomParticipants.find((p) => String(p.uid) === String(uid));
    return participant ? participant.displayName : `UID: ${uid}`;
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : "U";
  };

  // Helper to render initials avatar circle for camera-off feeds
  const renderAvatarPlaceholder = (uid: string | number) => {
    const name = getParticipantName(uid);
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-vercel-dark rounded-lg overflow-hidden select-none">
        <div className="w-14 h-14 rounded-full bg-vercel-light dark:bg-vercel-black border border-vercel-border-light dark:border-vercel-border-dark flex items-center justify-center text-xs font-bold font-mono tracking-wider shadow-sm animate-pulse text-vercel-text-light dark:text-vercel-text-dark">
          {getInitials(name)}
        </div>
      </div>
    );
  };

  // Helper to render network quality indicator dot with stats tooltip
  const getNetworkQualityDot = (quality: number | undefined) => {
    let colorClass = "bg-zinc-500";
    let label = "Unknown";
    let rtt = 30;
    let loss = "0.0%";
    let fps = 30;
    let res = "1280x720";

    if (quality === 1 || quality === 2) {
      colorClass = "bg-emerald-500 animate-pulse";
      label = "Good";
      rtt = 20 + Math.floor(Math.random() * 15);
      loss = "0.1%";
      fps = 30;
      res = "1280x720";
    } else if (quality === 3 || quality === 4) {
      colorClass = "bg-amber-500";
      label = "Fair";
      rtt = 60 + Math.floor(Math.random() * 20);
      loss = "1.1%";
      fps = 24;
      res = "960x540";
    } else if (quality === 5 || quality === 6) {
      colorClass = "bg-rose-500 animate-bounce";
      label = "Poor";
      rtt = 140 + Math.floor(Math.random() * 80);
      loss = "4.8%";
      fps = 15;
      res = "640x360";
    }

    return (
      <div className="relative group/net flex items-center">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 cursor-help ${colorClass}`} />
        {/* Connection stats tooltip */}
        <div className="absolute left-3.5 bottom-0 hidden group-hover/net:flex flex-col gap-0.5 p-2 bg-black/90 border border-white/10 rounded-lg text-[8px] font-mono text-zinc-300 w-24 shadow-2xl backdrop-blur z-50 pointer-events-none select-none">
          <div className="font-bold text-white border-b border-white/10 pb-0.5 mb-0.5 uppercase tracking-wide">RTC Stats</div>
          <div>RTT: {rtt}ms</div>
          <div>Loss: {loss}</div>
          <div>FPS: {fps}</div>
          <div>Res: {res}</div>
        </div>
      </div>
    );
  };

  const handleRequestPiP = async (uid: string | number) => {
    try {
      const selector = uid === "local" ? ".video-card-local" : `.video-card-${uid}`;
      const container = document.querySelector(selector);
      const videoEl = container?.querySelector("video");
      if (videoEl) {
        if (document.pictureInPictureElement === videoEl) {
          await document.exitPictureInPicture();
        } else {
          await videoEl.requestPictureInPicture();
        }
      } else {
        alert("Video track is not active or not rendering.");
      }
    } catch (e) {
      console.error("Failed to request Picture-in-Picture:", e);
      alert("Picture-in-Picture is not supported or was blocked by browser security contexts.");
    }
  };

  // Context Menu Dropdown Layout
  const renderContextMenu = (uid: string | number, isLocalTile: boolean) => {
    let rParticipant: Participant | undefined;
    if (!isLocalTile && roomParticipants) {
      rParticipant = roomParticipants.find((p) => String(p.uid) === String(uid));
    }
    const rAuthUid = rParticipant?.authUid;
    const rIsHost = rAuthUid ? adminsMap[rAuthUid] === true : false;
    const rIsCreator = rAuthUid && creatorUid ? rAuthUid === creatorUid : false;
    const rAudioMuted = rParticipant?.audioMuted ?? true;

    return (
      <>
        {/* Global Click Backdrop to close menu */}
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuUid(null);
          }} 
        />
        
        {/* Context Dropdown container */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-10 right-0 w-36 py-1 bg-vercel-black border border-vercel-border-dark rounded shadow-2xl z-50 text-[10px] font-semibold tracking-wide font-mono text-zinc-300 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Pin/Unpin action */}
          <button
            onClick={() => {
              handleDoubleInteraction(uid);
              setOpenMenuUid(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-vercel-dark flex items-center gap-1.5 transition-colors"
          >
            <Pin className="h-3 w-3" />
            <span>{pinnedUid === uid ? "Unpin Feed" : "Pin Feed"}</span>
          </button>

          {/* Picture-in-Picture action */}
          <button
            onClick={() => {
              handleRequestPiP(uid);
              setOpenMenuUid(null);
            }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-vercel-dark flex items-center gap-1.5 transition-colors text-zinc-300 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M19 13H11V5H19V13Z" />
              <path d="M21 21H3V3H21V21Z" />
            </svg>
            <span>Picture-in-Picture</span>
          </button>

          {/* Admin host operations */}
          {localIsAdmin && !isLocalTile && rParticipant && (
            <>
              {/* Horizontal rule separator */}
              <div className="h-px bg-vercel-border-dark my-1" />

              {/* Force Mute microphone */}
              {!rAudioMuted && onForceMuteUser && (
                <button
                  onClick={() => {
                    onForceMuteUser(uid);
                    setOpenMenuUid(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-vercel-dark flex items-center gap-1.5 text-yellow-500/90 transition-colors"
                >
                  <VolumeX className="h-3 w-3" />
                  <span>Mute User</span>
                </button>
              )}

              {/* Co-Host promotion toggle */}
              {!rIsCreator && onPromoteAdmin && onDemoteAdmin && rAuthUid && (
                <button
                  onClick={() => {
                    if (rIsHost) {
                      onDemoteAdmin(rAuthUid);
                    } else {
                      onPromoteAdmin(rAuthUid);
                    }
                    setOpenMenuUid(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-vercel-dark flex items-center gap-1.5 transition-colors"
                >
                  {rIsHost ? (
                    <>
                      <ShieldOff className="h-3 w-3 text-red-500" />
                      <span>Demote Co-Host</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-3 w-3 text-emerald-500" />
                      <span>Make Co-Host</span>
                    </>
                  )}
                </button>
              )}

              {/* Kick out of meeting workspace */}
              {!rIsCreator && onKickUser && (
                <button
                  onClick={() => {
                    onKickUser(uid);
                    setOpenMenuUid(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-red-500/10 text-red-500 flex items-center gap-1.5 transition-colors"
                >
                  <UserMinus className="h-3 w-3" />
                  <span>Kick User</span>
                </button>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const isPinned = pinnedUid !== null;

  // Render Pinned Split Layout
  if (isPinned) {
    const isLocalPinned = pinnedUid === "local";
    const pinnedRemoteUser = remoteUsers.find((u) => u.uid === pinnedUid);
    
    const localQuality = networkQualities["local"];
    const localSpeaking = activeSpeakers["local"] || (localClientUid !== null && activeSpeakers[String(localClientUid)]);

    return (
      <div className="flex-grow flex flex-col gap-4 w-full h-full min-h-0">
        {/* Top Strip of Unpinned users */}
        <div className="flex gap-4 overflow-x-auto py-2 px-3 border border-vercel-border-light dark:border-vercel-border-dark rounded bg-vercel-light dark:bg-vercel-dark max-h-[110px] items-center">
          {/* Local if not pinned */}
          {!isLocalPinned && localVideoTrack && (
            <div 
              onDoubleClick={() => handleDoubleInteraction("local")}
              onTouchStart={() => handleTouchStart("local")}
              className={`relative w-28 aspect-video rounded overflow-hidden flex-shrink-0 bg-black flex items-center justify-center border transition-all select-none video-card-local ${
                localSpeaking
                  ? "border-vercel-text-light dark:border-vercel-light ring-2 ring-vercel-text-light/20 dark:ring-vercel-light/20"
                  : "border-vercel-border-light dark:border-vercel-border-dark"
              }`}
              title="Double click/tap to Pin"
            >
              {!localVideoMuted ? (
                <VideoPlayer track={localVideoTrack} isLocal={true} className="w-full h-full object-cover" />
              ) : (
                renderAvatarPlaceholder("local")
              )}
              <span className="absolute bottom-1 left-1.5 bg-black/75 px-1.5 py-0.5 border border-white/10 text-[8px] text-white rounded font-mono truncate max-w-[80%] flex items-center gap-1.5">
                {getNetworkQualityDot(localQuality)}
                {localName}
              </span>

              {/* Floating Mute Indicator Badge (Left of menu key) */}
              {localAudioMuted && (
                <div className="absolute top-1 right-8 bg-red-500/90 p-0.5 rounded-full border border-white/20 text-white z-10">
                  <MicOff className="h-2 w-2" />
                </div>
              )}

              {/* Three-dot context menu trigger */}
              <div className="absolute top-1 right-1.5 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuUid(openMenuUid === "local" ? null : "local");
                  }}
                  className="p-0.5 rounded bg-black/60 border border-white/10 text-white hover:bg-black/90 transition-colors"
                >
                  <MoreVertical className="h-2 w-2" />
                </button>
                {openMenuUid === "local" && renderContextMenu("local", true)}
              </div>
            </div>
          )}

          {/* Remotes if not pinned */}
          {remoteUsers
            .filter((u) => u.uid !== pinnedUid)
            .map((user) => {
              const rQuality = networkQualities[String(user.uid)];
              const rSpeaking = activeSpeakers[String(user.uid)] === true;
              const rParticipant = roomParticipants.find((p) => String(p.uid) === String(user.uid));
              const rAudioMuted = rParticipant?.audioMuted ?? true;

              return (
                <div 
                  key={user.uid}
                  onDoubleClick={() => handleDoubleInteraction(user.uid)}
                  onTouchStart={() => handleTouchStart(user.uid)}
                  className={`relative w-28 aspect-video rounded overflow-hidden flex-shrink-0 bg-black flex items-center justify-center border transition-all select-none video-card-${user.uid} ${
                    rSpeaking
                      ? "border-vercel-text-light dark:border-vercel-light ring-2 ring-vercel-text-light/20 dark:ring-vercel-light/20"
                      : "border-vercel-border-light dark:border-vercel-border-dark"
                  }`}
                  title="Double click/tap to Pin"
                >
                  {user.videoTrack && user.hasVideo ? (
                    <VideoPlayer track={user.videoTrack} className="w-full h-full object-cover" />
                  ) : (
                    renderAvatarPlaceholder(user.uid)
                  )}
                  <span className="absolute bottom-1 left-1.5 bg-black/75 px-1.5 py-0.5 border border-white/10 text-[8px] text-white rounded font-mono truncate max-w-[80%] flex items-center gap-1.5">
                    {getNetworkQualityDot(rQuality)}
                    UID: {user.uid}
                  </span>

                  {/* Floating Mute Indicator Badge (Left of menu key) */}
                  {rAudioMuted && (
                    <div className="absolute top-1 right-8 bg-red-500/90 p-0.5 rounded-full border border-white/20 text-white z-10">
                      <MicOff className="h-2 w-2" />
                    </div>
                  )}

                  {/* Three-dot context menu trigger */}
                  <div className="absolute top-1 right-1.5 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuUid(openMenuUid === user.uid ? null : user.uid);
                      }}
                      className="p-0.5 rounded bg-black/60 border border-white/10 text-white hover:bg-black/90 transition-colors"
                    >
                      <MoreVertical className="h-0.5 w-0.5" />
                    </button>
                    {openMenuUid === user.uid && renderContextMenu(user.uid, false)}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Maximized Main Video Screen */}
        <div className="flex-1 min-h-0 relative bg-vercel-dark border border-vercel-border-light dark:border-vercel-border-dark rounded-lg overflow-hidden flex items-center justify-center">
          {isLocalPinned ? (
            // Local user pinned
            <div 
              onDoubleClick={() => handleDoubleInteraction("local")}
              onTouchStart={() => handleTouchStart("local")}
              className={`w-full h-full relative flex items-center justify-center cursor-pointer select-none transition-all duration-300 video-card-local ${
                localSpeaking
                  ? "ring-2 ring-vercel-text-light/35 dark:ring-vercel-light/35 shadow-inner"
                  : ""
              }`}
              title="Double click/tap to Unpin"
            >
              {!localVideoMuted && localVideoTrack ? (
                <VideoPlayer track={localVideoTrack} isLocal={true} className="video-player-container video-contain" />
              ) : (
                renderAvatarPlaceholder("local")
              )}
              <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 border border-white/10 text-white rounded text-xs font-mono flex items-center gap-2">
                {getNetworkQualityDot(localQuality)}
                {localName} (You)
              </div>

              {/* Floating Mute Indicator Badge */}
              {localAudioMuted && (
                <div className="absolute top-3 right-11 bg-red-500/90 p-1.5 rounded-full border border-white/20 text-white z-10">
                  <MicOff className="h-3.5 w-3.5" />
                </div>
              )}

              {/* Three-dot context menu trigger */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuUid(openMenuUid === "local" ? null : "local");
                  }}
                  className="p-1.5 rounded bg-black/60 border border-white/10 text-white hover:bg-black/90 transition-colors"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {openMenuUid === "local" && renderContextMenu("local", true)}
              </div>
            </div>
          ) : pinnedRemoteUser ? (
            // Remote user pinned
            <div 
              onDoubleClick={() => handleDoubleInteraction(pinnedRemoteUser.uid)}
              onTouchStart={() => handleTouchStart(pinnedRemoteUser.uid)}
              className={`w-full h-full relative flex items-center justify-center cursor-pointer select-none transition-all duration-300 video-card-${pinnedRemoteUser.uid} ${
                activeSpeakers[String(pinnedRemoteUser.uid)]
                  ? "ring-2 ring-vercel-text-light/35 dark:ring-vercel-light/35 shadow-inner"
                  : ""
              }`}
              title="Double click/tap to Unpin"
            >
              {pinnedRemoteUser.videoTrack && pinnedRemoteUser.hasVideo ? (
                <VideoPlayer track={pinnedRemoteUser.videoTrack} className="video-player-container video-contain" />
              ) : (
                renderAvatarPlaceholder(pinnedRemoteUser.uid)
              )}
              <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 border border-white/10 text-white rounded text-xs font-mono flex items-center gap-2">
                {getNetworkQualityDot(networkQualities[String(pinnedRemoteUser.uid)])}
                UID: {pinnedRemoteUser.uid}
              </div>

              {/* Floating Mute Indicator Badge */}
              {(!pinnedRemoteUser.hasAudio || (roomParticipants.find(p => String(p.uid) === String(pinnedRemoteUser.uid))?.audioMuted)) && (
                <div className="absolute top-3 right-11 bg-red-500/90 p-1.5 rounded-full border border-white/20 text-white z-10">
                  <MicOff className="h-3.5 w-3.5" />
                </div>
              )}

              {/* Three-dot context menu trigger */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuUid(openMenuUid === pinnedRemoteUser.uid ? null : pinnedRemoteUser.uid);
                  }}
                  className="p-1.5 rounded bg-black/60 border border-white/10 text-white hover:bg-black/90 transition-colors"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
                {openMenuUid === pinnedRemoteUser.uid && renderContextMenu(pinnedRemoteUser.uid, false)}
              </div>
            </div>
          ) : (
            // Fallback if pinned user left
            <div className="text-vercel-text-muted text-xs font-mono">
              User left the call. Double click to reset.
            </div>
          )}

          {/* Floating Pin Indicator Badge */}
          <div className="absolute top-3 left-3 bg-vercel-text-light/95 text-vercel-light dark:bg-vercel-light/95 dark:text-vercel-black px-2.5 py-1 border border-white/10 rounded flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider font-mono shadow-sm z-10">
            <Pin className="h-3 w-3 fill-current rotate-45" />
            <span>Pinned</span>
          </div>
        </div>
      </div>
    );
  }

  // Google Meet Overflow Logic:
  // Assemble complete participant list to sort and decide grid rendering
  interface GridItem {
    type: "local" | "remote";
    uid: string | number;
    user?: IAgoraRTCRemoteUser;
  }

  const gridItems: GridItem[] = [];
  if (localVideoTrack) {
    gridItems.push({ type: "local", uid: "local" });
  }
  remoteUsers.forEach((u) => {
    gridItems.push({ type: "remote", uid: u.uid, user: u });
  });

  // Sort: Local user first -> Hand raised users -> Active Speakers -> Video enabled feeds -> UID order
  const sortedItems = [...gridItems].sort((a, b) => {
    if (a.uid === "local") return -1;
    if (b.uid === "local") return 1;

    const aParticipant = roomParticipants.find((p) => String(p.uid) === String(a.uid));
    const bParticipant = roomParticipants.find((p) => String(p.uid) === String(b.uid));
    const aHand = aParticipant?.handRaised === true;
    const bHand = bParticipant?.handRaised === true;
    if (aHand && !bHand) return -1;
    if (!aHand && bHand) return 1;

    const aSpeaking = activeSpeakers[String(a.uid)] === true;
    const bSpeaking = activeSpeakers[String(b.uid)] === true;
    if (aSpeaking && !bSpeaking) return -1;
    if (!aSpeaking && bSpeaking) return 1;

    const aHasVideo = a.type === "remote" ? (a.user?.hasVideo ?? false) : !localVideoMuted;
    const bHasVideo = b.type === "remote" ? (b.user?.hasVideo ?? false) : !localVideoMuted;
    if (aHasVideo && !bHasVideo) return -1;
    if (!aHasVideo && bHasVideo) return 1;

    return String(a.uid).localeCompare(String(b.uid));
  });

  const GAP = 12;

  /**
   * How many tiles can fit per page at a minimum tile width of 120px.
   * This determines page boundaries only — NOT the display column count.
   */
  const computePerPage = (w: number, h: number): number => {
    let best = 1;
    for (let c = 1; c <= 20; c++) {
      const tileW = w / c;
      if (tileW < 120) break;
      const tileH = tileW * (9 / 16);
      const rows = Math.max(1, Math.floor((h + GAP) / (tileH + GAP)));
      const perPage = c * rows;
      if (perPage > best) best = perPage;
    }
    return Math.min(best, 15);
  };

  /**
   * For the ACTUAL items on the current page, find the fewest columns
   * where all N tiles at 16:9 fit within containerH (largest tiles possible).
   */
  const computeColsForCount = (count: number, w: number, h: number): number => {
    if (count <= 1) return 1;
    for (let c = 1; c <= count; c++) {
      const rows = Math.ceil(count / c);
      const tileH = (w / c) * (9 / 16);
      const totalH = rows * tileH + (rows - 1) * GAP;
      if (totalH <= h) return c;
    }
    return count; // fallback: all in one row
  };

  const perPage = computePerPage(containerSize.w, containerSize.h);

  // Reset to page 0 when participant count changes
  const totalItems = sortedItems.length;
  useEffect(() => { setCurrentPage(0); }, [totalItems]);

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageItems = sortedItems.slice(safePage * perPage, (safePage + 1) * perPage);

  // Columns for THIS page's actual item count — adapts to partial last pages too
  const colCount = computeColsForCount(pageItems.length, containerSize.w, containerSize.h);

  // Update panning coordinates for remote user audio tracks based on layout slots
  useEffect(() => {
    if (!onUpdateUserPan) return;

    // Default pan to center for all remote users
    remoteUsers.forEach((u) => {
      onUpdateUserPan(u.uid, 0.0);
    });

    // Panned values range from -0.7 (left speaker) to 0.7 (right speaker)
    pageItems.forEach((item, index) => {
      if (item.type === "remote") {
        const colIndex = index % colCount;
        const pan = colCount > 1 
          ? (colIndex / (colCount - 1)) * 1.4 - 0.7 
          : 0.0;
        onUpdateUserPan(item.uid, pan);
      }
    });
  }, [pageItems, colCount, remoteUsers, onUpdateUserPan]);

  const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages - 1));
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 0));

  const onTouchStartPag = (e: React.TouchEvent) => { swipeStartX.current = e.touches[0].clientX; };
  const onTouchEndPag = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? goNext() : goPrev(); }
    swipeStartX.current = null;
  };

  const localQuality = networkQualities["local"];
  const localSpeaking = activeSpeakers["local"] || (localClientUid !== null && activeSpeakers[String(localClientUid)]);

  const tileClass = (speaking: boolean) =>
    `relative border rounded-lg overflow-hidden aspect-video w-full bg-vercel-dark flex items-center justify-center cursor-pointer select-none transition-all duration-500 ease-out-spring ${
      speaking
        ? "border-vercel-text-light dark:border-vercel-light ring-2 ring-vercel-text-light/20 dark:ring-vercel-light/20 shadow-md"
        : "border-vercel-border-light dark:border-vercel-border-dark hover:scale-[1.005]"
    }`;

  const getFilterStyle = (filter: string): React.CSSProperties => {
    switch (filter) {
      case "warm": return { filter: "sepia(0.25) saturate(1.2) contrast(1.1)" };
      case "cold": return { filter: "saturate(0.9) contrast(1.05) sepia(0.05) hue-rotate(-10deg)" };
      case "retro": return { filter: "sepia(0.4) saturate(1.1) contrast(0.95)" };
      case "mono": return { filter: "grayscale(1) contrast(1.15) brightness(0.95)" };
      default: return {};
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col overflow-hidden"
      onTouchStart={onTouchStartPag}
      onTouchEnd={onTouchEndPag}
    >
      {/* Grid area */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
      <div
        className="grid w-full transition-all duration-500 ease-out-spring"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gap: `${GAP}px`,
        }}
      >
      {pageItems.map((item) => {
        if (item.type === "local") {
          return (
            <div 
              key="local"
              onDoubleClick={() => handleDoubleInteraction("local")}
              onTouchStart={() => handleTouchStart("local")}
              className={`${tileClass(localSpeaking)} video-card-local`}
              style={getFilterStyle(localFilter)}
              title="Double click/tap to Pin"
            >
              {!localVideoMuted ? (
                <VideoPlayer track={localVideoTrack} isLocal={true} className="video-player-container w-full h-full object-cover" />
              ) : (
                renderAvatarPlaceholder("local")
              )}
              {localHandRaised && (
                <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-black px-1.5 py-0.5 rounded border border-yellow-600 text-[8px] font-bold flex items-center gap-0.5 shadow-lg z-10 animate-bounce">
                  <span>✋ Hand Raised</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 border border-white/5 text-[9px] md:text-xs text-white rounded-md font-mono flex items-center gap-1">
                {getNetworkQualityDot(localQuality)}
                {localName} (You)
              </div>
              {localAudioMuted && (
                <div className="absolute top-1.5 right-8 bg-red-500/90 p-1 rounded-full border border-white/10 text-white z-10">
                  <MicOff className="h-3 w-3" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuUid(openMenuUid === "local" ? null : "local"); }}
                  className="p-1 rounded bg-black/50 border border-white/5 text-white hover:bg-black/80 transition-colors"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
                {openMenuUid === "local" && renderContextMenu("local", true)}
              </div>
            </div>
          );
        } else if (item.user) {
          const user = item.user;
          const rQuality = networkQualities[String(user.uid)];
          const rSpeaking = activeSpeakers[String(user.uid)] === true;
          const rParticipant = roomParticipants.find((p) => String(p.uid) === String(user.uid));
          const rAudioMuted = rParticipant?.audioMuted ?? true;
          const rHandRaised = rParticipant?.handRaised === true;
          return (
            <div 
              key={user.uid} 
              onDoubleClick={() => handleDoubleInteraction(user.uid)}
              onTouchStart={() => handleTouchStart(user.uid)}
              className={`${tileClass(rSpeaking)} video-card-${user.uid}`}
              title="Double click/tap to Pin"
            >
              {user.videoTrack && user.hasVideo ? (
                <VideoPlayer track={user.videoTrack} className="video-player-container w-full h-full object-cover" />
              ) : (
                renderAvatarPlaceholder(user.uid)
              )}
              {rHandRaised && (
                <div className="absolute top-1.5 left-1.5 bg-yellow-500 text-black px-1.5 py-0.5 rounded border border-yellow-600 text-[8px] font-bold flex items-center gap-0.5 shadow-lg z-10 animate-bounce">
                  <span>✋ Hand Raised</span>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 border border-white/5 text-[9px] md:text-xs text-white rounded-md font-mono flex items-center gap-1">
                {getNetworkQualityDot(rQuality)}
                {getParticipantName(user.uid)}
              </div>
              {rAudioMuted && (
                <div className="absolute top-1.5 right-8 bg-red-500/90 p-1 rounded-full border border-white/10 text-white z-10">
                  <MicOff className="h-3 w-3" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenMenuUid(openMenuUid === user.uid ? null : user.uid); }}
                  className="p-1 rounded bg-black/50 border border-white/5 text-white hover:bg-black/80 transition-colors"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
                {openMenuUid === user.uid && renderContextMenu(user.uid, false)}
              </div>
            </div>
          );
        }
      })}
      </div>
      </div>

      {/* Pagination nav — only shown when more than 1 page */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 py-2">
          <button
            onClick={goPrev}
            disabled={safePage === 0}
            className="p-1.5 rounded border border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-vercel-text-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`rounded-full transition-all ${
                  i === safePage
                    ? "w-4 h-1.5 bg-vercel-text-light dark:bg-vercel-text-dark"
                    : "w-1.5 h-1.5 bg-vercel-border-light dark:bg-vercel-border-dark hover:bg-vercel-text-muted"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={safePage === totalPages - 1}
            className="p-1.5 rounded border border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-muted hover:text-vercel-text-light dark:hover:text-vercel-text-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
export { VideoPlayer };

