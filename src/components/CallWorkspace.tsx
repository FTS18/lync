"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack, 
  ILocalVideoTrack,
  IAgoraRTCRemoteUser 
} from "agora-rtc-sdk-ng";
import { useFirebase } from "@/hooks/useFirebase";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { database } from "@/lib/firebase";
import { ref, push, onChildAdded, off, get, set, update, remove, onValue, onDisconnect } from "firebase/database";
import VideoGrid, { VideoPlayer } from "@/components/VideoGrid";
import ChatPanel from "./ChatPanel";
import ParticipantPanel from "./ParticipantPanel";
import WaitingRoomPanel from "./WaitingRoomPanel";
import PreJoinLobby from "./PreJoinLobby";
import Whiteboard from "./Whiteboard";
import { sanitizeText, sanitizeDisplayName } from "@/lib/sanitize";
import { Loader2, ArrowLeft, Clock, Lock, MicOff, Mic, Video, VideoOff, Monitor, MonitorOff, PhoneOff, MessageSquare, Users, Hand, Smile, Sparkles, PenTool, Disc, Captions, CaptionsOff, FlipHorizontal2, Vote, BarChart2, MoreHorizontal, FileText } from "lucide-react";
import { playTapSound, playToggleSound, triggerHaptic, getAudioContext } from "@/lib/audioEffects";
import GoogleDocPanel from "@/components/GoogleDocPanel";
import MeetingArtifactsModal from "@/components/MeetingArtifactsModal";
interface CallWorkspaceProps {
  roomId: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface Participant {
  uid: string | number;
  authUid: string;
  displayName: string;
  photoURL?: string;
  audioMuted: boolean;
  videoMuted: boolean;
}

interface WaitingEntry {
  uid: string;
  displayName: string;
  requestedAt: number;
}

interface Poll {
  question: string;
  options: string[];
  votes: Record<string, number>; // authUid -> option index
  active: boolean;
  createdBy: string;
}

interface AttendanceEntry {
  uid: string;
  displayName: string;
  authUid: string;
  joinedAt: number;
  leftAt?: number;
}

const MorphingMicIcon = ({ muted }: { muted: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" x2="12" y1="19" y2="22" />
    <line 
      x1="2" 
      y1="2" 
      x2="22" 
      y2="22" 
      className="transition-all duration-300 ease-out origin-center"
      style={{
        strokeDasharray: 28,
        strokeDashoffset: muted ? 0 : 28,
        opacity: muted ? 1 : 0
      }}
    />
  </svg>
);

const MorphingVideoIcon = ({ muted }: { muted: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="m22 8-6 4 6 4V8Z" />
    <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
    <line 
      x1="2" 
      y1="2" 
      x2="22" 
      y2="22" 
      className="transition-all duration-300 ease-out origin-center"
      style={{
        strokeDasharray: 28,
        strokeDashoffset: muted ? 0 : 28,
        opacity: muted ? 1 : 0
      }}
    />
  </svg>
);

export default function CallWorkspace({ roomId }: CallWorkspaceProps) {
  const router = useRouter();
  const { user, dbUser } = useFirebase();
  
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  
  // Passcode states
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [expectedPasscode, setExpectedPasscode] = useState("");
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  // Audio/Video Muted states (default to muted on entry to support insecure HTTP contexts)
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  // Screen Share states
  const [screenSharing, setScreenSharing] = useState(false);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);

  // Whiteboard state
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // Google Doc Panel
  const [showGoogleDoc, setShowGoogleDoc] = useState(false);

  // Desktop Control Bar Popover State
  const [showMoreDesktopOptions, setShowMoreDesktopOptions] = useState(false);

  // Meeting Artifacts Modal
  const [showArtifactsModal, setShowArtifactsModal] = useState(false);
  const artifactChatBlob = useRef<Blob | null>(null);
  const artifactAttendanceBlob = useRef<Blob | null>(null);
  const artifactRecordingBlob = useRef<Blob | null>(null);


  // Premium Features States
  const [handRaised, setHandRaised] = useState(false);
  const [localFilter, setLocalFilter] = useState("none");
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [participantReactions, setParticipantReactions] = useState<{ [uid: string]: string }>({});

  // Participant Drawer states
  const [showParticipants, setShowParticipants] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<Participant[]>([]);
  const [adminsMap, setAdminsMap] = useState<{ [key: string]: boolean }>({});
  const [creatorUid, setCreatorUid] = useState<string | null>(null);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  // Mirror refs so cleanup always has access to latest tracks
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  // Active speaker, network health, and toast notification states
  const [activeSpeakers, setActiveSpeakers] = useState<{ [uid: string]: boolean }>({});
  const [networkQualities, setNetworkQualities] = useState<{ [uid: string]: number }>({});
  const [chatToast, setChatToast] = useState<{ sender: string; text: string } | null>(null);

  // Spatial Audio Node Registry
  const spatialAudioNodes = useRef<Map<string | number, { source: any; panner: any; dummyAudio: HTMLAudioElement }>>(new Map());

  const updateUserAudioPan = useCallback((uid: string | number, pan: number) => {
    const node = spatialAudioNodes.current.get(uid);
    if (node && node.panner) {
      const ctx = getAudioContext();
      if (ctx) {
        node.panner.pan.linearRampToValueAtTime(pan, ctx.currentTime + 0.1);
      }
    }
  }, []);

  // Refs to prevent stale closures in Firebase child listeners
  const showChatRef = useRef(showChat);
  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  const dbUserRef = useRef(dbUser);
  useEffect(() => {
    dbUserRef.current = dbUser;
  }, [dbUser]);

  // ─── New Feature States ────────────────────────────────────────────────────

  // Pre-Join Lobby
  const [showPreJoinLobby, setShowPreJoinLobby] = useState(true);
  const [lobbyDisplayName, setLobbyDisplayName] = useState("");
  const [lobbyAudioEnabled, setLobbyAudioEnabled] = useState(false);
  const [lobbyVideoEnabled, setLobbyVideoEnabled] = useState(false);

  // Waiting Room (host side)
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  // Waiting Room (participant side)
  const [waitingForAdmit, setWaitingForAdmit] = useState(false);
  const [guestUid] = useState<string>(() => `guest-${Math.random().toString(36).slice(2, 8)}`);

  // Spotlight / Pin
  const [pinnedUid, setPinnedUid] = useState<string | number | null>(null);

  // Live Captions (Web Speech API)
  const { transcript, interimTranscript, isListening: captionsActive, isSupported: captionsSupported, toggleListening: toggleCaptions } = useSpeechRecognition();

  // Mobile Camera Flip
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
          window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  // Camera selection / switching
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [showCameraDropdown, setShowCameraDropdown] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      AgoraRTC.getCameras()
        .then((devices) => {
          setAvailableCameras(devices.filter((d) => d.deviceId));
        })
        .catch((err) => {
          console.warn("Failed to retrieve cameras:", err);
        });
    }
  }, []);

  // Auto-start camera and mic if enabled in the lobby
  const autoInitTracksRef = useRef(false);
  useEffect(() => {
    if (!joined || autoInitTracksRef.current) return;
    
    const initLobbyTracks = async () => {
      const client = clientRef.current;
      if (!client) return;
      autoInitTracksRef.current = true;

      // Initialize audio if enabled in lobby
      if (!audioMuted && !localAudioTrackRef.current) {
        try {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          setLocalAudioTrack(audioTrack);
          localAudioTrackRef.current = audioTrack;
          await client.publish(audioTrack);
        } catch (err) {
          console.error("Auto Microphone creation failed:", err);
        }
      }

      // Initialize video if enabled in lobby
      if (!videoMuted && !localVideoTrackRef.current) {
        try {
          const videoTrack = await AgoraRTC.createCameraVideoTrack({ facingMode });
          setLocalVideoTrack(videoTrack);
          localVideoTrackRef.current = videoTrack;
          await client.publish(videoTrack);
        } catch (err) {
          console.error("Auto Camera creation failed:", err);
        }
      }
    };

    initLobbyTracks();
  }, [joined, audioMuted, videoMuted, facingMode]);

  const handleSwitchCamera = useCallback(async (deviceId: string) => {
    if (localVideoTrackRef.current) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
        console.log("Successfully switched camera device to:", deviceId);
      } catch (err) {
        console.error("Failed to switch camera device:", err);
      }
    }
  }, []);

  // Voting / Poll
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["Yes", "No"]);
  const [hasVoted, setHasVoted] = useState(false);

  // Attendance tracking
  const joinedAtRef = useRef<number>(0);

  // O(1) message dedup using a Set instead of .some() O(n)
  const seenMessageIds = useRef<Set<string>>(new Set());


  // Listen to participant's own admission updates
  const waitingEntryCreated = useRef(false);
  useEffect(() => {
    if (!waitingForAdmit) {
      waitingEntryCreated.current = false;
      return;
    }
    const myUid = user?.uid || guestUid;
    const waitingEntryRef = ref(database, `rooms/${roomId}/waitingRoom/${myUid}`);
    const unsubscribe = onValue(waitingEntryRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        if (waitingEntryCreated.current) {
          alert("Your request to join was declined by the host.");
          router.push("/");
        }
      } else {
        waitingEntryCreated.current = true;
        if (data.admitted === true) {
          setWaitingForAdmit(false);
        }
      }
    });
    return () => unsubscribe();
  }, [waitingForAdmit, roomId, user, guestUid, router]);

  // Ambient video glow color extraction effect
  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");

    const updateAmbientGlow = () => {
      const videoEl = 
        document.querySelector(".ring-2 video") as HTMLVideoElement ||
        document.querySelector(".video-player-container video") as HTMLVideoElement;

      if (videoEl && ctx && videoEl.readyState >= 2) {
        try {
          ctx.drawImage(videoEl, 0, 0, 4, 4);
          const data = ctx.getImageData(0, 0, 4, 4).data;

          const r1 = data[0], g1 = data[1], b1 = data[2];
          const r2 = data[12], g2 = data[13], b2 = data[14]; // pixel 3

          document.documentElement.style.setProperty("--ambient-glow-1", `rgba(${r1}, ${g1}, ${b1}, 0.08)`);
          document.documentElement.style.setProperty("--ambient-glow-2", `rgba(${r2}, ${g2}, ${b2}, 0.08)`);
        } catch (e) {}
      }
    };

    const interval = setInterval(updateAmbientGlow, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync states and user details to Firebase when changed
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !joined) return;

    const participantRef = ref(database, `rooms/${roomId}/participants/${client.uid}`);
    update(participantRef, {
      audioMuted,
      videoMuted,
      handRaised,
      displayName: dbUser?.displayName || user?.email?.split("@")[0] || "Guest",
      photoURL: dbUser?.photoURL || null,
    }).catch(console.error);
  }, [audioMuted, videoMuted, handRaised, dbUser, user, joined, roomId]);

  useEffect(() => {
    let active = true;
    let currentClientUid: string | number | null = null;
    
    // Initialize Agora Client
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    // Define subscription listeners
    const handleUserPublished = async (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      if (remoteUser.uid === client.uid) return;
      await client.subscribe(remoteUser, mediaType);
      
      if (mediaType === "audio" && remoteUser.audioTrack) {
        try {
          const track = remoteUser.audioTrack;
          const mediaStreamTrack = track.getMediaStreamTrack();
          const ms = new MediaStream([mediaStreamTrack]);

          const dummyAudio = new Audio();
          dummyAudio.srcObject = ms;
          dummyAudio.muted = true;
          dummyAudio.play().catch(() => {});

          const ctx = getAudioContext();
          if (ctx) {
            const existing = spatialAudioNodes.current.get(remoteUser.uid);
            if (existing) {
              existing.panner.disconnect();
            }

            const source = ctx.createMediaStreamSource(ms);
            const panner = ctx.createStereoPanner();
            
            source.connect(panner);
            panner.connect(ctx.destination);

            spatialAudioNodes.current.set(remoteUser.uid, { source, panner, dummyAudio });
          }
        } catch (e) {
          console.warn("Spatial audio setup failed:", e);
          remoteUser.audioTrack.play();
        }
      }

      if (active) {
        setRemoteUsers((prev) => {
          if (prev.some((u) => u.uid === remoteUser.uid)) {
            return prev.map((u) => (u.uid === remoteUser.uid ? remoteUser : u));
          }
          return [...prev, remoteUser];
        });
      }
    };

    const handleUserUnpublished = (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      if (mediaType === "audio") {
        const node = spatialAudioNodes.current.get(remoteUser.uid);
        if (node) {
          node.panner.disconnect();
          spatialAudioNodes.current.delete(remoteUser.uid);
        }
      }
      if (active) {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
      }
    };

    const handleUserLeft = (remoteUser: IAgoraRTCRemoteUser) => {
      const node = spatialAudioNodes.current.get(remoteUser.uid);
      if (node) {
        node.panner.disconnect();
        spatialAudioNodes.current.delete(remoteUser.uid);
      }
      if (active) {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    // Active Speaker Volume Indicators
    client.enableAudioVolumeIndicator();
    const handleVolumeIndicator = (volumes: { uid: string | number; level: number }[]) => {
      const activeMap: { [uid: string]: boolean } = {};
      volumes.forEach((volume) => {
        if (volume.level > 5) {
          const speakerUid = volume.uid === 0 ? client.uid : volume.uid;
          activeMap[String(speakerUid)] = true;
        }
      });
      if (active) setActiveSpeakers(activeMap);
    };
    client.on("volume-indicator", handleVolumeIndicator);

    // Network Connection Quality Listener
    const handleNetworkQuality = (stats: any) => {
      const qualities: { [uid: string]: number } = {};
      qualities["local"] = stats.localUpway;
      if (stats.remoteQualities) {
        Object.entries(stats.remoteQualities).forEach(([uid, qual]) => {
          qualities[uid] = (qual as any).receiveQuality;
        });
      }
      if (active) setNetworkQualities(qualities);
    };
    client.on("network-quality", handleNetworkQuality);

    // Sync Chat Messages from Firebase Realtime DB
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    const handleMessageAdded = (snapshot: any) => {
      const val = snapshot.val();
      const msgId = snapshot.key || "";
      if (val && active && !seenMessageIds.current.has(msgId)) {
        seenMessageIds.current.add(msgId);
        const localSenderName = dbUserRef.current?.displayName || user?.email?.split("@")[0] || "Guest";
        const isMe = val.sender === localSenderName;

        const safeMsg = {
          id: msgId,
          sender: sanitizeDisplayName(val.sender || ""),
          text: sanitizeText(val.text || "", 1000),
          timestamp: val.timestamp,
        };

        setMessages((prev) => [...prev, safeMsg]);

        // Trigger floating toast preview if chat sidebar is closed and message is remote
        if (!showChatRef.current && !isMe) {
          setChatToast({ sender: safeMsg.sender, text: safeMsg.text });
          const timer = setTimeout(() => {
            setChatToast(null);
          }, 3000);
        }
      }
    };
    onChildAdded(messagesRef, handleMessageAdded);

    // Sync Active Participants list & floating emoji reactions from Firebase DB
    const lastReactionTimestamps = new Map<string, number>();
    const participantsRef = ref(database, `rooms/${roomId}/participants`);
    const handleParticipantsValue = onValue(participantsRef, (snapshot) => {
      if (!active) return;
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([uid, val]: [string, any]) => {
          // Check for new reaction updates (clock-skew proof via local state tracking)
          if (val.reaction && val.reactionTimestamp) {
            const lastTime = lastReactionTimestamps.get(uid);
            if (lastTime === undefined) {
              lastReactionTimestamps.set(uid, val.reactionTimestamp);
            } else if (val.reactionTimestamp > lastTime) {
              lastReactionTimestamps.set(uid, val.reactionTimestamp);
              
              const animId = `${uid}-${val.reactionTimestamp}`;
              setFloatingReactions((prev) => [
                ...prev,
                {
                  id: animId,
                  emoji: val.reaction,
                  x: 10 + Math.random() * 80,
                },
              ]);
              setTimeout(() => {
                setFloatingReactions((prev) => prev.filter((r) => r.id !== animId));
              }, 3000);

              setParticipantReactions((prev) => ({
                ...prev,
                [uid]: val.reaction,
              }));
              setTimeout(() => {
                setParticipantReactions((prev) => {
                  const next = { ...prev };
                  delete next[uid];
                  return next;
                });
              }, 3000);
            }
          }

          return {
            uid,
            authUid: val.authUid || "anonymous",
            displayName: val.displayName || "Guest",
            photoURL: val.photoURL || undefined,
            audioMuted: val.audioMuted ?? false,
            videoMuted: val.videoMuted ?? false,
            handRaised: val.handRaised ?? false,
          };
        });
        setRoomParticipants(list);
      } else {
        setRoomParticipants([]);
      }
    });

    // Sync Admins list from Firebase DB
    const adminsRef = ref(database, `rooms/${roomId}/metadata/admins`);
    const handleAdminsValue = onValue(adminsRef, (snapshot) => {
      if (!active) return;
      const data = snapshot.val();
      if (data) {
        setAdminsMap(data);
      } else {
        setAdminsMap({});
      }
    });

    // Sync Waiting Room configuration
    const waitingRoomEnabledRef = ref(database, `rooms/${roomId}/metadata/waitingRoomEnabled`);
    const handleWaitingRoomEnabledValue = onValue(waitingRoomEnabledRef, (snapshot) => {
      if (!active) return;
      const val = snapshot.val();
      setWaitingRoomEnabled(val === true);
    });

    // Listen to local user participant updates (for forceMute / kick triggers)
    let myParticipantUnsubscribe: (() => void) | null = null;
    const listenToMyParticipantTriggers = (clientUid: string | number) => {
      const myParticipantRef = ref(database, `rooms/${roomId}/participants/${clientUid}`);
      myParticipantUnsubscribe = onValue(myParticipantRef, (snapshot) => {
        if (!active) return;
        const val = snapshot.val();
        if (val) {
          // 1. Force Mute Triggered by Host
          if (val.forceMuted) {
            if (localAudioTrackRef.current) {
              localAudioTrackRef.current.setEnabled(false).catch(console.error);
            }
            if (active) {
              setAudioMuted(true);
              alert("You have been muted by a host.");
            }
            // Clear database flag so user can choose to unmute themselves later
            update(myParticipantRef, { forceMuted: false }).catch(console.error);
          }

          // 2. Kick Triggered by Host
          if (val.kicked) {
            alert("You have been removed from the meeting by a host.");
            router.push("/");
          }
        }
      });
    };

    // Call Token Endpoint & Join Call
    const joinRoom = async () => {
      try {
        setLoading(true);
        
        // Check room expiry metadata in Firebase DB
        const metadataRef = ref(database, `rooms/${roomId}/metadata`);
        const snapshot = await get(metadataRef);
        const metadata = snapshot.val();
        
        if (metadata) {
          if (active) {
            setCreatorUid(metadata.creator || null);
          }
          // Dynamic fallback: If admins map doesn't exist, register the creator as admin in DB
          if (!metadata.admins && metadata.creator) {
            await set(ref(database, `rooms/${roomId}/metadata/admins/${metadata.creator}`), true);
          }
          const hoursElapsed = (Date.now() - metadata.createdAt) / (1000 * 60 * 60);
          if (hoursElapsed > 24) {
            if (active) {
              setExpired(true);
              setLoading(false);
            }
            return;
          }

          // Passcode Lock validation
          if (metadata.passcode && !passcodeUnlocked) {
            if (active) {
              setExpectedPasscode(metadata.passcode);
              setPasscodeRequired(true);
              setLoading(false);
            }
            return;
          }
        } else {
          // If no metadata exists, initialize it (e.g. dynamic room created on-the-fly)
          const localUserUid = user?.uid || "anonymous";
          if (active) {
            setCreatorUid(localUserUid);
            await set(metadataRef, {
              createdAt: Date.now(),
              creator: localUserUid,
              passcode: null,
              admins: {
                [localUserUid]: true,
              },
            });
          }
        }
        
        if (!active) return;
        
        if (showPreJoinLobby || waitingForAdmit) {
          if (active) setLoading(false);
          return;
        }
        
        // 1. Fetch Agora token
        const res = await fetch(`/api/token?channel=${roomId}&uid=0`);
        if (!res.ok) throw new Error("Failed to load secure calling token");
        const data = await res.json();
        
        if (!active) return;

        // 2. Connect to Agora Channel (Lazy track loading for HTTP compatibility)
        await client.join(data.appId, roomId, data.token || null, data.uid || null);
        
        if (!active) {
          await client.leave();
          return;
        }

        currentClientUid = client.uid !== undefined ? client.uid : null;

        // Determine display name (lobby name > dbUser > email > guest)
        const resolvedName = sanitizeDisplayName(
          lobbyDisplayName ||
          dbUserRef.current?.displayName ||
          user?.email?.split("@")[0] ||
          "Guest"
        );

        // Register local participant details in Firebase DB
        if (client.uid !== undefined) {
          const myParticipantRef = ref(database, `rooms/${roomId}/participants/${client.uid}`);
          await set(myParticipantRef, {
            uid: client.uid,
            authUid: user?.uid || guestUid,
            displayName: resolvedName,
            photoURL: user?.photoURL || null,
            audioMuted,
            videoMuted,
            lastActive: Date.now(),
          });

          // Auto remove participant node on disconnect/refresh
          onDisconnect(myParticipantRef).remove();

          // Attendance: log join time
          joinedAtRef.current = Date.now();
          const attendanceRef = ref(database, `rooms/${roomId}/attendance/${client.uid}`);
          await set(attendanceRef, {
            uid: String(client.uid),
            displayName: resolvedName,
            authUid: user?.uid || guestUid,
            joinedAt: joinedAtRef.current,
          });
          // On disconnect: write leftAt
          onDisconnect(attendanceRef).update({ leftAt: Date.now() });

          // Beforeunload: write leftAt synchronously (best-effort)
          const handleBeforeUnload = () => {
            update(attendanceRef, { leftAt: Date.now() }).catch(() => {});
          };
          window.addEventListener("beforeunload", handleBeforeUnload);

          // Initialize listener for host command triggers (mute/kick)
          listenToMyParticipantTriggers(client.uid);
        }

        if (active) {
          setJoined(true);
        }
      } catch (error) {
        console.error("Failed to join Agora call:", error);
        if (active) {
          alert("Error connecting to room workspace.");
          router.push("/");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    // ─── Waiting Room Listener (host side) ───────────────────────────────────────────
    const waitingRef = ref(database, `rooms/${roomId}/waitingRoom`);
    const unsubscribeWaiting = onValue(waitingRef, (snap) => {
      if (!active) return;
      const data = snap.val();
      if (data) {
        const list: WaitingEntry[] = Object.entries(data)
          .filter(([, v]: [string, any]) => !v.admitted && !v.rejected)
          .map(([uid, v]: [string, any]) => ({
            uid,
            displayName: sanitizeDisplayName(v.displayName || "Guest"),
            requestedAt: v.requestedAt || Date.now(),
          }));
        setWaitingList(list);
      } else {
        setWaitingList([]);
      }
    });

    // ─── Poll Listener ────────────────────────────────────────────────────────────
    const pollRef = ref(database, `rooms/${roomId}/poll`);
    const unsubscribePoll = onValue(pollRef, (snap) => {
      if (!active) return;
      const data = snap.val();
      if (data && data.active) {
        setActivePoll(data as Poll);
        setShowPollModal(true);
        setHasVoted(!!data.votes?.[user?.uid || guestUid]);
      } else {
        setActivePoll(null);
        setShowPollModal(false);
        setHasVoted(false);
      }
    });

    joinRoom();

    // Clean up tracks and leave channel on unmount
    return () => {
      active = false;
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
      client.off("volume-indicator", handleVolumeIndicator);
      client.off("network-quality", handleNetworkQuality);
      off(messagesRef, "child_added", handleMessageAdded);
      off(participantsRef, "value", handleParticipantsValue);
      off(adminsRef, "value", handleAdminsValue);
      off(waitingRoomEnabledRef, "value", handleWaitingRoomEnabledValue);

      if (unsubscribeWaiting) unsubscribeWaiting();
      if (unsubscribePoll) unsubscribePoll();

      if (myParticipantUnsubscribe) {
        myParticipantUnsubscribe();
      }

      // Stop state-held tracks that may have been set after initial join
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
      }

      if (currentClientUid) {
        const myParticipantRef = ref(database, `rooms/${roomId}/participants/${currentClientUid}`);
        remove(myParticipantRef).catch(console.error);
      }
      
      client.leave().catch(console.error);
    };
  }, [roomId, router, passcodeUnlocked, showPreJoinLobby, waitingForAdmit]);

  const handleSendMessage = useCallback((text: string) => {
    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    const senderName = sanitizeDisplayName(dbUser?.displayName || user?.email?.split("@")[0] || "Guest");
    const sanitizedText = sanitizeText(text, 1000);
    if (!sanitizedText) return;
    push(messagesRef, {
      sender: senderName,
      text: sanitizedText,
      timestamp: Date.now(),
    });
  }, [roomId, dbUser, user]);

  const handleLeave = useCallback(async () => {
    triggerHaptic();
    playToggleSound(false);

    const isHost = user?.uid && (user.uid === creatorUid || adminsMap[user.uid]);

    if (isHost) {
      // Build chat blob
      try {
        const chatSnap = await get(ref(database, `rooms/${roomId}/messages`));
        const chatData = chatSnap.val();
        if (chatData) {
          const lines = Object.values(chatData).map((m: any) =>
            `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender}: ${m.text}`
          ).join("\n");
          artifactChatBlob.current = new Blob([lines], { type: "text/plain" });
        }
      } catch { /* ignore */ }

      // Build attendance blob
      try {
        const attSnap = await get(ref(database, `rooms/${roomId}/attendance`));
        const attData = attSnap.val();
        if (attData) {
          const rows = ["Name,Joined At,Left At,Duration (s)"];
          Object.values(attData).forEach((v: any) => {
            const dur = v.leftAt ? Math.round((v.leftAt - v.joinedAt) / 1000) : "";
            rows.push(`"${v.displayName || 'Guest'}","${new Date(v.joinedAt).toLocaleString()}","${v.leftAt ? new Date(v.leftAt).toLocaleString() : 'Active'}",${dur}`);
          });
          artifactAttendanceBlob.current = new Blob([rows.join("\n")], { type: "text/csv" });
        }
      } catch { /* ignore */ }

      // Show artifacts modal (Temporarily disabled)
      // setShowArtifactsModal(true);
      // return; // router.push happens after modal close
    }

    router.push("/");
  }, [router, user, creatorUid, adminsMap, roomId]);


  const handleUnlockPasscode = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === expectedPasscode) {
      setPasscodeUnlocked(true);
      setPasscodeRequired(false);
      setPasscodeError(false);
      setLoading(true);
    } else {
      setPasscodeError(true);
    }
  }, [passcodeInput, expectedPasscode]);

  const handleToggleHand = useCallback(() => {
    triggerHaptic();
    setHandRaised(prev => {
      const nextVal = !prev;
      playToggleSound(nextVal);
      return nextVal;
    });
  }, []);

  const handleSendReaction = useCallback((emoji: string) => {
    triggerHaptic();
    playTapSound();
    const myUid = clientRef.current?.uid;
    if (myUid !== undefined) {
      const myParticipantRef = ref(database, `rooms/${roomId}/participants/${myUid}`);
      update(myParticipantRef, {
        reaction: emoji,
        reactionTimestamp: Date.now(),
      }).catch((err) => console.error("Failed to send reaction:", err));
    }
  }, [roomId]);

  const handleToggleFilter = useCallback(() => {
    triggerHaptic();
    playTapSound();
    const filters = ["none", "warm", "cold", "retro", "mono"];
    setLocalFilter(prev => {
      const idx = filters.indexOf(prev);
      const nextIdx = (idx + 1) % filters.length;
      return filters[nextIdx];
    });
  }, []);

  const handleToggleRecording = useCallback(async () => {
    triggerHaptic();
    playToggleSound(!isRecording);
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm"
        });

        mediaRecorderRef.current = mediaRecorder;
        recordedChunks.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: "video/webm" });
          // Store for artifact upload; also offer local download
          artifactRecordingBlob.current = blob;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `lync-record-${roomId}-${Date.now()}.webm`;
          a.click();
          setIsRecording(false);
          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Recording failed or cancelled:", err);
      }
    }
  }, [isRecording, roomId]);

  const handleToggleAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joined) return;

    triggerHaptic();
    if (!localAudioTrack) {
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
        localAudioTrackRef.current = audioTrack;
        await client.publish(audioTrack);
        playToggleSound(true);
        setAudioMuted(false);
      } catch (err) {
        console.error("Microphone track creation failed:", err);
        const msg = (err as any)?.name === "NotAllowedError"
          ? "Microphone access was denied. Click the camera icon in the address bar to allow permissions."
          : "Could not access microphone. Check that it is connected and not in use."; 
        setChatToast({ sender: "⚠️ Permission Error", text: msg });
      }
    } else {
      const nextMuted = !audioMuted;
      await localAudioTrack.setEnabled(!nextMuted);
      playToggleSound(!nextMuted);
      setAudioMuted(nextMuted);
    }
  }, [joined, localAudioTrack, audioMuted]);

  const handleToggleVideo = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joined || screenSharing) return;

    triggerHaptic();
    if (!localVideoTrack) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          facingMode,
        });
        setLocalVideoTrack(videoTrack);
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        playToggleSound(true);
        setVideoMuted(false);
      } catch (err) {
        console.error("Camera track creation failed:", err);
        const msg = (err as any)?.name === "NotAllowedError"
          ? "Camera access was denied. Click the camera icon in the address bar to allow permissions."
          : "Could not access camera. Check that it is connected and not in use.";
        setChatToast({ sender: "⚠️ Permission Error", text: msg });
      }
    } else {
      const nextMuted = !videoMuted;
      await localVideoTrack.setEnabled(!nextMuted);
      playToggleSound(!nextMuted);
      setVideoMuted(nextMuted);
    }
  }, [joined, screenSharing, localVideoTrack, videoMuted, facingMode]);

  const handleFlipCamera = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joined || !localVideoTrack || screenSharing) return;

    triggerHaptic();
    playTapSound();
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);

    try {
      localVideoTrack.stop();
      localVideoTrack.close();
      await client.unpublish(localVideoTrack);

      const newTrack = await AgoraRTC.createCameraVideoTrack({
        facingMode: nextMode,
      });

      setLocalVideoTrack(newTrack);
      localVideoTrackRef.current = newTrack;
      await client.publish(newTrack);
      setVideoMuted(false);
    } catch (err) {
      console.error("Camera flip failed:", err);
      alert("Failed to flip camera.");
    }
  }, [joined, localVideoTrack, screenSharing, facingMode]);

  const handleToggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joined) return;

    triggerHaptic();
    playToggleSound(!screenSharing);
    if (screenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        await client.unpublish(screenTrackRef.current);
        screenTrackRef.current = null;
      }
      if (localVideoTrack) {
        await localVideoTrack.setEnabled(!videoMuted);
        await client.publish(localVideoTrack);
      }
      setScreenSharing(false);
    } else {
      try {
        let screenTrack;
        try {
          screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
        } catch (agoraErr) {
          console.warn("Agora screen share failed, trying native getDisplayMedia fallback...", agoraErr);
          if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            screenTrack = AgoraRTC.createCustomVideoTrack({
              mediaStreamTrack: videoTrack,
            });
          } else {
            throw agoraErr;
          }
        }
        screenTrackRef.current = screenTrack;

        screenTrack.on("track-ended", async () => {
          if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            screenTrackRef.current.close();
            await client.unpublish(screenTrackRef.current);
            screenTrackRef.current = null;
          }
          if (localVideoTrack) {
            await localVideoTrack.setEnabled(!videoMuted);
            await client.publish(localVideoTrack);
          }
          setScreenSharing(false);
        });

        if (localVideoTrack) {
          await client.unpublish(localVideoTrack);
        }

        await client.publish(screenTrack);
        setScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed:", err);
        alert("Screen sharing blocked by browser security context.");
      }
    }
  }, [joined, screenSharing, localVideoTrack, videoMuted]);

  // Co-Host Management Handlers
  const handlePromoteAdmin = useCallback(async (authUid: string) => {
    await set(ref(database, `rooms/${roomId}/metadata/admins/${authUid}`), true);
  }, [roomId]);

  const handleDemoteAdmin = useCallback(async (authUid: string) => {
    if (authUid === creatorUid) return;
    await remove(ref(database, `rooms/${roomId}/metadata/admins/${authUid}`));
  }, [roomId, creatorUid]);

  const handleForceMuteUser = useCallback(async (targetClientUid: string | number) => {
    await update(ref(database, `rooms/${roomId}/participants/${targetClientUid}`), {
      forceMuted: true,
    });
  }, [roomId]);

  const handleKickUser = useCallback(async (targetClientUid: string | number) => {
    await update(ref(database, `rooms/${roomId}/participants/${targetClientUid}`), {
      kicked: true,
    });
  }, [roomId]);

  // Waiting Room Management
  const handleToggleWaitingRoom = useCallback(async () => {
    triggerHaptic();
    playTapSound();
    
    const nextVal = !waitingRoomEnabled;
    const configRef = ref(database, `rooms/${roomId}/metadata/waitingRoomEnabled`);
    await set(configRef, nextVal);

    // If disabling the waiting room, automatically admit everyone currently waiting
    if (!nextVal) {
      try {
        const waitingRef = ref(database, `rooms/${roomId}/waitingRoom`);
        const snapshot = await get(waitingRef);
        const data = snapshot.val();
        if (data) {
          const updates: Record<string, any> = {};
          Object.keys(data).forEach((uid) => {
            updates[`${uid}/admitted`] = true;
          });
          await update(waitingRef, updates);
          
          // Clear the waiting room records after a short delay (matching handleAdmitWaitingUser)
          setTimeout(async () => {
            Object.keys(data).forEach(async (uid) => {
              await remove(ref(database, `rooms/${roomId}/waitingRoom/${uid}`));
            });
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to auto-admit waiting users:", err);
      }
    }
  }, [roomId, waitingRoomEnabled]);

  const handleAdmitWaitingUser = useCallback(async (targetUid: string) => {
    const waitingRef = ref(database, `rooms/${roomId}/waitingRoom/${targetUid}`);
    await update(waitingRef, { admitted: true });
    setTimeout(async () => {
      await remove(waitingRef);
    }, 1000);
  }, [roomId]);

  const handleRejectWaitingUser = useCallback(async (targetUid: string) => {
    const waitingRef = ref(database, `rooms/${roomId}/waitingRoom/${targetUid}`);
    await remove(waitingRef);
  }, [roomId]);

  // Live Poll Management
  const handleCreatePoll = useCallback(async (question: string, options: string[]) => {
    const pollRef = ref(database, `rooms/${roomId}/poll`);
    const newPoll: Poll = {
      question: sanitizeText(question, 200),
      options: options.map(o => sanitizeText(o, 100)),
      votes: {},
      active: true,
      createdBy: user?.uid || guestUid,
    };
    await set(pollRef, newPoll);
  }, [roomId, user, guestUid]);

  const handleVotePoll = useCallback(async (optionIndex: number) => {
    const myUid = user?.uid || guestUid;
    const voteRef = ref(database, `rooms/${roomId}/poll/votes/${myUid}`);
    await set(voteRef, optionIndex);
    setHasVoted(true);
  }, [roomId, user, guestUid]);

  const handleEndPoll = useCallback(async () => {
    const pollActiveRef = ref(database, `rooms/${roomId}/poll/active`);
    await set(pollActiveRef, false);
  }, [roomId]);

  // Swipe-to-close handlers for the mobile actions sheet
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetTouchStartY = useRef(0);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartY.current = e.touches[0].clientY;
    setIsSheetDragging(true);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - sheetTouchStartY.current;
    const isAtTop = sheetRef.current ? sheetRef.current.scrollTop === 0 : true;
    
    if (isAtTop) {
      if (deltaY > 0) {
        // Prevent default native browser behavior (like pull-to-refresh) when dragging sheet down
        if (e.cancelable) {
          e.preventDefault();
        }
        setSheetDragY(deltaY);
      } else {
        const resistance = 0.25;
        setSheetDragY(deltaY * resistance);
      }
    }
  };

  const handleSheetTouchEnd = () => {
    setIsSheetDragging(false);
    if (sheetDragY > 100) {
      setShowMobileMore(false);
    }
    setSheetDragY(0);
  };

  // 1. Render Locked Passcode validation screen
  if (passcodeRequired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-vercel-light dark:bg-vercel-black p-6 text-center font-mono animate-in fade-in duration-300">
        <div className="p-3 border border-vercel-border-light dark:border-vercel-border-dark rounded-full bg-vercel-light dark:bg-vercel-dark">
          <Lock className="h-5 w-5 text-vercel-text-light dark:text-vercel-text-dark" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold tracking-tight uppercase">Room is Locked</h2>
          <p className="text-xs text-vercel-text-muted max-w-xs leading-relaxed">
            Enter the password setup by the creator to join this call workspace.
          </p>
        </div>
        <form onSubmit={handleUnlockPasscode} className="flex gap-2 w-full max-w-xs mt-2">
          <input
            type="password"
            placeholder="Room passcode"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            className="flex-1 h-9 px-3 rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 text-xs transition-all text-vercel-text-light dark:text-vercel-text-dark"
            required
          />
          <button
            type="submit"
            className="h-9 px-4 rounded bg-vercel-text-light text-vercel-light dark:bg-vercel-light dark:text-vercel-black hover:opacity-90 text-xs font-semibold"
          >
            Unlock
          </button>
        </form>
        {passcodeError && (
          <p className="text-[10px] text-red-500 font-semibold">
            Incorrect passcode. Try again.
          </p>
        )}
        <button
          onClick={handleLeave}
          className="mt-2 text-xs text-vercel-text-muted hover:underline"
        >
          Cancel and return
        </button>
      </div>
    );
  }

  // 2. Render Expired Link screen
  if (expired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-vercel-light dark:bg-vercel-black p-6 text-center font-mono">
        <div className="p-3 border border-vercel-border-light dark:border-vercel-border-dark rounded-full bg-vercel-light dark:bg-vercel-dark">
          <Clock className="h-6 w-6 text-red-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold tracking-tight uppercase">Meeting Link Expired</h2>
          <p className="text-xs text-vercel-text-muted max-w-xs leading-relaxed">
            This room code was created more than 24 hours ago and has expired.
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="mt-2 h-9 px-4 rounded border border-vercel-border-light dark:border-vercel-border-dark text-xs font-semibold hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-colors text-vercel-text-light dark:text-vercel-text-dark animate-pulse"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // 3. Render Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-vercel-light dark:bg-vercel-black text-sm text-vercel-text-muted font-mono">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }
  // 3. Render Pre-Join Lobby
  if (showPreJoinLobby) {
    const defaultDisplayName = dbUser?.displayName || user?.email?.split("@")[0] || "";
    return (
      <PreJoinLobby
        roomId={roomId}
        defaultDisplayName={defaultDisplayName}
        isPasscodeProtected={!!expectedPasscode}
        onJoin={async ({ displayName, audioEnabled, videoEnabled }) => {
          setLobbyDisplayName(displayName);
          setAudioMuted(!audioEnabled);
          setVideoMuted(!videoEnabled);
          setShowPreJoinLobby(false);

          // Check if user is host
          const isHost = user?.uid && (user.uid === creatorUid || adminsMap[user.uid]);
          if (isHost) {
            setWaitingForAdmit(false);
          } else {
            // Get waiting room configuration setting (defaults to false)
            let isWaitingEnabled = false;
            try {
              const waitingEnabledRef = ref(database, `rooms/${roomId}/metadata/waitingRoomEnabled`);
              const snap = await get(waitingEnabledRef);
              isWaitingEnabled = snap.val() === true;
            } catch (err) {
              console.error("Failed to read waitingRoomEnabled config:", err);
            }

            if (isWaitingEnabled) {
              const myUid = user?.uid || guestUid;
              const waitingRef = ref(database, `rooms/${roomId}/waitingRoom/${myUid}`);
              await set(waitingRef, {
                uid: myUid,
                displayName: displayName,
                requestedAt: Date.now(),
                admitted: false,
              });
              setWaitingForAdmit(true);
            } else {
              setWaitingForAdmit(false);
            }
          }
        }}
        onCancel={handleLeave}
      />
    );
  }

  // 4. Render Waiting Room screen
  if (waitingForAdmit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-vercel-light dark:bg-vercel-black p-6 text-center font-mono animate-in fade-in duration-300">
        <div className="p-3 border border-vercel-border-light dark:border-vercel-border-dark rounded-full bg-vercel-light dark:bg-vercel-dark animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-vercel-text-light dark:text-vercel-text-dark" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold tracking-tight uppercase">Waiting for Host...</h2>
          <p className="text-xs text-vercel-text-muted max-w-xs leading-relaxed">
            Please wait, the meeting host has been notified. You will join the call as soon as they admit you.
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="mt-2 h-9 px-4 rounded border border-vercel-border-light dark:border-vercel-border-dark text-xs font-semibold hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-colors text-vercel-text-light dark:text-vercel-text-dark"
        >
          Leave Meeting
        </button>
      </div>
    );
  }
  const localUserName = dbUser?.displayName || user?.email?.split("@")[0] || "Guest";
  const rightPanelActive = showChat || showParticipants || showGoogleDoc;
  const localClientUid = clientRef.current?.uid || null;
  const localIsAdmin = adminsMap[user?.uid || "anonymous"] === true;
  const localIsHost = !!(user?.uid && (user.uid === creatorUid || adminsMap[user.uid]));


  const activeRemoteUsers = remoteUsers;
  const activeParticipants = roomParticipants;
  const activeAdminsMap = { ...adminsMap };

  return (
    <div className="h-[100dvh] w-screen flex flex-col md:flex-row bg-vercel-light dark:bg-vercel-black overflow-hidden relative">
      {/* Floating Chat Toast Notification Overlay */}
      {chatToast && (
        <div 
          onClick={() => {
            setShowChat(true);
            setShowParticipants(false);
            setChatToast(null);
          }}
          className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded bg-vercel-text-light text-vercel-light dark:bg-vercel-light dark:text-vercel-black border border-vercel-border-light dark:border-vercel-border-dark text-xs cursor-pointer shadow-lg animate-in slide-in-from-top-4 duration-300 font-mono select-none"
        >
          <span className="font-bold">{chatToast.sender}:</span>
          <span className="opacity-90 max-w-[200px] truncate">{chatToast.text}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      <div 
        onClick={() => {
          setShowChat(false);
          setShowParticipants(false);
        }}
        className={`md:hidden fixed inset-0 bg-black/45 z-30 transition-opacity duration-300 ${
          rightPanelActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Main Calling Workspace */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative group">

        {/* Gradient overlays (fade on hover on desktop) */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />

        {/* Floating Reactions Render Overlay */}
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="reaction-bubble"
            style={{ left: `${reaction.x}%` }}
          >
            {reaction.emoji}
          </div>
        ))}

        {/* Top-Right Control Actions (Members, Chat, End Call) */}
        <div className="absolute top-2 right-2 z-40 flex items-center gap-1 bg-black/60 border border-white/10 backdrop-blur-md backdrop-saturate-180 p-1 rounded-full shadow-lg">
          {/* Members Toggle */}
          <button
            onClick={() => {
              triggerHaptic();
              const nextVal = !showParticipants;
              playToggleSound(nextVal);
              setShowParticipants(nextVal);
              setShowChat(false);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 ${
              showParticipants
                ? "bg-white text-black"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Room Members"
          >
            <Users className="h-4 w-4" />
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => {
              triggerHaptic();
              const nextVal = !showChat;
              playToggleSound(nextVal);
              setShowChat(nextVal);
              setShowParticipants(false);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 ${
              showChat
                ? "bg-white text-black"
                : "text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Chat Panel"
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {/* End Call (Red badge) */}
          <button
            onClick={handleLeave}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all active:scale-95 shadow-md"
            title="Leave Meeting"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>

        {/* Top-Left Floating Header Row (Info + Recording Indicator) */}
        <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-lg bg-black/60 border border-white/5 backdrop-blur-md backdrop-saturate-180 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase truncate leading-tight tracking-wider">{roomId}</div>
              <div className="text-[8px] text-zinc-400 leading-tight">
                {joined ? "● Connected" : "○ Disconnected"} · {1 + activeRemoteUsers.length} active
              </div>
            </div>
          </div>

          {/* Recording Status Overlay */}
          {isRecording && (
            <div className="flex items-center gap-1 p-1 px-2 rounded-lg bg-red-600/90 border border-red-500 text-white text-[8px] font-bold tracking-wider animate-pulse shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>REC</span>
            </div>
          )}
        </div>

        {/* Waiting Room Panel Overlay for Host */}
        {localIsAdmin && waitingList.length > 0 && (
          <div className="absolute top-16 right-4 z-45 w-80 max-w-[calc(100vw-2rem)]">
            <WaitingRoomPanel
              waitingList={waitingList}
              onAdmit={handleAdmitWaitingUser}
              onReject={handleRejectWaitingUser}
            />
          </div>
        )}

        {/* Subtitle / Caption Overlay */}
        {captionsActive && (transcript || interimTranscript) && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-35 max-w-[80%] bg-black/75 px-4 py-2 rounded-xl text-center backdrop-blur-md border border-white/10 font-sans pointer-events-none">
            <p className="text-white text-xs md:text-sm leading-snug">
              {transcript ? (
                <span>{transcript}</span>
              ) : (
                <span className="opacity-70 italic">{interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {/* Video/Whiteboard area — fills 100% of workspace container */}
        <div className="w-full h-full min-h-0 overflow-hidden p-2 relative">
          {showWhiteboard ? (
            <div className="flex flex-col md:flex-row-reverse gap-2 h-full min-h-0">
              {/* Video sidebar (desktop right / mobile top) */}
              <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto py-1 md:py-2 px-2 border border-white/10 rounded bg-black/60 backdrop-blur-md max-h-[80px] md:max-h-none md:w-52 items-center md:items-stretch flex-shrink-0 scrollbar-none">
                {localVideoTrack && (
                  <div className="relative w-24 md:w-full aspect-video rounded overflow-hidden flex-shrink-0 bg-black flex items-center justify-center border border-white/10" style={localFilter !== "none" ? { filter: localFilter === "warm" ? "sepia(0.25) saturate(1.2) contrast(1.1)" : localFilter === "cold" ? "saturate(0.9) contrast(1.05) sepia(0.05) hue-rotate(-10deg)" : localFilter === "retro" ? "sepia(0.4) saturate(1.1) contrast(0.95)" : "grayscale(1) contrast(1.15) brightness(0.95)" } : {}}>
                    {!videoMuted ? (
                      <VideoPlayer track={localVideoTrack} isLocal={true} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] md:text-xs text-zinc-400 font-mono uppercase">Off</span>
                    )}
                    <span className="absolute bottom-1 left-1.5 bg-black/75 px-1 py-0.5 border border-white/10 text-[8px] md:text-[10px] text-white rounded font-mono">You</span>
                    {audioMuted && (
                      <div className="absolute top-1 right-1 bg-red-500/90 p-0.5 rounded-full border border-white/20 text-white">
                        <MicOff className="h-2 w-2" />
                      </div>
                    )}
                  </div>
                )}
                {activeRemoteUsers.map((rUser) => (
                  <div key={rUser.uid} className="relative w-24 md:w-full aspect-video rounded overflow-hidden flex-shrink-0 bg-black flex items-center justify-center border border-white/10">
                    {rUser.videoTrack && rUser.hasVideo ? (
                      <VideoPlayer track={rUser.videoTrack} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] md:text-xs text-zinc-400 font-mono uppercase">Off</span>
                    )}
                    <span className="absolute bottom-1 left-1.5 bg-black/75 px-1 py-0.5 border border-white/10 text-[8px] md:text-[10px] text-white rounded font-mono truncate max-w-[80%]">UID: {rUser.uid}</span>
                    {!rUser.hasAudio && (
                      <div className="absolute top-1 right-1 bg-red-500/90 p-0.5 rounded-full border border-white/20 text-white">
                        <MicOff className="h-2 w-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Whiteboard main container */}
              <div className="flex-1 min-h-0 min-w-0">
                <Whiteboard roomId={roomId} onClose={() => setShowWhiteboard(false)} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full min-h-0 overflow-hidden">
              <VideoGrid 
                localVideoTrack={localVideoTrack} 
                remoteUsers={activeRemoteUsers} 
                localName={localUserName}
                localAudioMuted={audioMuted}
                localVideoMuted={videoMuted} 
                localHandRaised={handRaised}
                localFilter={localFilter}
                activeSpeakers={activeSpeakers}
                networkQualities={networkQualities}
                localClientUid={localClientUid}
                localIsAdmin={localIsAdmin}
                adminsMap={activeAdminsMap}
                creatorUid={creatorUid}
                roomParticipants={activeParticipants}
                pinnedUid={pinnedUid}
                onPinUser={setPinnedUid}
                onPromoteAdmin={handlePromoteAdmin}
                onDemoteAdmin={handleDemoteAdmin}
                onKickUser={handleKickUser}
                onForceMuteUser={handleForceMuteUser}
                onToggleParticipants={() => setShowParticipants(!showParticipants)}
                onUpdateUserPan={updateUserAudioPan}
              />
            </div>
          )}

          {/* Cinematic Presenter Webcam Overlay */}
          {screenSharing && localVideoTrack && !videoMuted && (
            <div className="absolute bottom-4 right-4 z-40 w-32 h-32 rounded-full overflow-hidden border border-white/20 shadow-2xl backdrop-blur-md backdrop-saturate-180 animate-in zoom-in-50 duration-500 ease-out-spring group/overlay">
              <VideoPlayer track={localVideoTrack} isLocal={true} className="w-full h-full object-cover rounded-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/overlay:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                <span className="text-[10px] text-white font-mono uppercase font-bold tracking-wider">You (Presenter)</span>
              </div>
            </div>
          )}
        </div>

        {/* Centered Floating Emoji Reactions Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-2 border border-white/10 bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-150">
            {["❤️", "👏", "😂", "👍", "🎉"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="text-2xl hover:scale-125 transition-transform active:scale-95 duration-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* ─── Floating Bottom Control Bar Overlay ───────────────────────── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center items-center gap-1.5 px-4 py-2 bg-black/35 dark:bg-black/55 border border-white/10 backdrop-blur-xl backdrop-saturate-180 rounded-full shadow-2xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 max-w-[95vw] md:max-w-none">
          {isMobile ? (
            <div className="flex items-center gap-3">
              {/* Camera split-button with dropdown switcher */}
              <div className="relative flex items-center">
                <div className="flex items-center bg-zinc-800/80 rounded-full border border-white/10 overflow-hidden">
                  <button
                    onClick={handleToggleVideo}
                    className={`flex items-center justify-center w-10 h-10 transition-all active:scale-95 ${
                      videoMuted ? "bg-red-600 text-white" : "text-zinc-300 hover:text-white"
                    }`}
                    title={videoMuted ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    <MorphingVideoIcon muted={videoMuted} />
                  </button>
                  
                  {availableCameras.length >= 2 && (
                    <button
                      onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                      className="flex items-center justify-center w-5 h-10 border-l border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                      title="Select Camera"
                    >
                      <span className="text-[10px] leading-none">⋮</span>
                    </button>
                  )}
                </div>

                {showCameraDropdown && availableCameras.length >= 2 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCameraDropdown(false)} />
                    <div className="absolute bottom-12 left-0 z-50 bg-[#09090b]/95 border border-white/10 rounded-xl p-2 min-w-[160px] max-w-[220px] shadow-2xl space-y-1 font-mono text-[10px]">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1 border-b border-white/5">Select Camera</p>
                      {availableCameras.map((cam) => (
                        <button
                          key={cam.deviceId}
                          onClick={() => {
                            handleSwitchCamera(cam.deviceId);
                            setShowCameraDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white truncate"
                          title={cam.label}
                        >
                          {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Mic */}
              <button
                onClick={handleToggleAudio}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  audioMuted
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80"
                }`}
                title={audioMuted ? "Unmute" : "Mute"}
              >
                <MorphingMicIcon muted={audioMuted} />
              </button>

              {/* Screen Share */}
              <button
                onClick={handleToggleScreenShare}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  screenSharing
                    ? "bg-white text-black border-transparent"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80"
                }`}
                title={screenSharing ? "Stop Sharing" : "Share Screen"}
              >
                {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </button>

              {/* Hand Raise */}
              <button
                onClick={handleToggleHand}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  handRaised
                    ? "bg-yellow-500 text-black border-transparent"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80"
                }`}
                title="Raise Hand"
              >
                <Hand className="h-5 w-5" />
              </button>

              {/* More options three dots */}
              <button
                onClick={() => setShowMobileMore(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 transition-all active:scale-95"
                title="More Options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              {/* Camera split-button with dropdown switcher */}
              <div className="relative flex items-center">
                <div className="flex items-center bg-zinc-800/80 rounded-full border border-white/10 overflow-hidden">
                  <button
                    onClick={handleToggleVideo}
                    className={`flex items-center justify-center w-10 h-10 transition-all active:scale-95 ${
                      videoMuted ? "bg-red-600 text-white border-transparent" : "text-zinc-300 hover:text-white"
                    }`}
                    title={videoMuted ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    <MorphingVideoIcon muted={videoMuted} />
                  </button>
                  
                  {availableCameras.length >= 2 && (
                    <button
                      onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                      className="flex items-center justify-center w-5 h-10 border-l border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                      title="Select Camera"
                    >
                      <span className="text-[10px] leading-none">⋮</span>
                    </button>
                  )}
                </div>

                {showCameraDropdown && availableCameras.length >= 2 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCameraDropdown(false)} />
                    <div className="absolute bottom-12 left-0 z-50 bg-[#09090b]/95 border border-white/10 rounded-xl p-2 min-w-[160px] max-w-[220px] shadow-2xl space-y-1 font-mono text-[10px]">
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1 border-b border-white/5">Select Camera</p>
                      {availableCameras.map((cam) => (
                        <button
                          key={cam.deviceId}
                          onClick={() => {
                            handleSwitchCamera(cam.deviceId);
                            setShowCameraDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white truncate"
                          title={cam.label}
                        >
                          {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Mic */}
              <button
                onClick={handleToggleAudio}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  audioMuted
                    ? "bg-red-600 text-white border-transparent"
                    : "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title={audioMuted ? "Unmute" : "Mute"}
              >
                <MorphingMicIcon muted={audioMuted} />
              </button>

              {/* Screen Share */}
              <button
                onClick={handleToggleScreenShare}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  screenSharing
                    ? "bg-white text-black border-transparent"
                    : "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title={screenSharing ? "Stop Sharing" : "Share Screen"}
              >
                {screenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </button>

              {/* Hand Raise Toggler */}
              <button
                onClick={handleToggleHand}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                  handRaised
                    ? "bg-yellow-500 text-black border-transparent"
                    : "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title="Raise Hand"
              >
                <Hand className="h-5 w-5" />
              </button>

              {/* Desktop More Options Trigger */}
              <div className="relative">
                <button
                  onClick={() => { triggerHaptic(); playTapSound(); setShowMoreDesktopOptions(!showMoreDesktopOptions); }}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${
                    showMoreDesktopOptions
                      ? "bg-white text-black border-transparent"
                      : "border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title="More Options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {showMoreDesktopOptions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreDesktopOptions(false)} />
                    <div className="absolute bottom-14 right-0 z-50 w-56 py-2 bg-zinc-950/95 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-150 flex flex-col font-mono text-xs">
                      
                      {/* Send Reaction */}
                      <button
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowMoreDesktopOptions(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <Smile className="h-4 w-4 text-zinc-400" />
                        <span>Send Reaction</span>
                      </button>

                      {/* Video Filters */}
                      <button
                        onClick={() => { handleToggleFilter(); setShowMoreDesktopOptions(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <Sparkles className={`h-4 w-4 ${localFilter !== "none" ? "text-purple-400" : "text-zinc-400"}`} />
                        <span>Video Filters</span>
                      </button>

                      {/* Call Recording */}
                      <button
                        onClick={() => { handleToggleRecording(); setShowMoreDesktopOptions(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <Disc className={`h-4 w-4 ${isRecording ? "text-red-500 animate-pulse" : "text-zinc-400"}`} />
                        <span>{isRecording ? "Stop Recording" : "Record Session"}</span>
                      </button>

                      {/* Live Captions */}
                      {captionsSupported && (
                        <button
                          onClick={() => { toggleCaptions(); setShowMoreDesktopOptions(false); }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                          {captionsActive ? (
                            <Captions className="h-4 w-4 text-green-400" />
                          ) : (
                            <CaptionsOff className="h-4 w-4 text-zinc-400" />
                          )}
                          <span>{captionsActive ? "Turn Off Captions" : "Turn On Captions"}</span>
                        </button>
                      )}

                      {/* Divider */}
                      <div className="h-px bg-white/5 my-1" />

                      {/* Whiteboard */}
                      <button
                        onClick={() => { setShowWhiteboard(!showWhiteboard); setShowMoreDesktopOptions(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <PenTool className={`h-4 w-4 ${showWhiteboard ? "text-white" : "text-zinc-400"}`} />
                        <span>Whiteboard</span>
                      </button>

                      {/* Google Shared Doc */}
                      <button
                        onClick={() => { triggerHaptic(); playTapSound(); setShowGoogleDoc(!showGoogleDoc); setShowChat(false); setShowParticipants(false); setShowMoreDesktopOptions(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <FileText className={`h-4 w-4 ${showGoogleDoc ? "text-blue-400" : "text-zinc-400"}`} />
                        <span>Shared Google Doc</span>
                      </button>

                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile "More Actions" Bottom Sheet (Vertical List Style) */}
        {isMobile && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowMobileMore(false)}
              style={{
                opacity: showMobileMore ? 1 - Math.min(Math.max(sheetDragY, 0) / 350, 0.8) : 0
              }}
              className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
                showMobileMore ? "pointer-events-auto" : "pointer-events-none"
              }`}
            />
            {/* Sheet */}
            <div 
              ref={sheetRef}
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              style={{
                transform: showMobileMore 
                  ? `translateY(${sheetDragY}px)` 
                  : `translateY(100%)`
              }}
              className={`fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 border-t border-white/10 rounded-t-2xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto transform backdrop-blur-xl backdrop-saturate-180 font-mono text-xs text-white ${
                isSheetDragging ? "transition-none" : "transition-transform duration-300 ease-out"
              } ${
                showMobileMore ? "pointer-events-auto" : "pointer-events-none"
              }`}
            >
              {/* Header handle indicator */}
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-2" />
              
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">More Actions</p>
              </div>

              {/* Vertical List of Options */}
              <div className="space-y-2 py-1">
                {/* Flip Camera */}
                {!videoMuted && !screenSharing && (isMobile || availableCameras.length >= 2) && (
                  <button
                    onClick={() => {
                      handleFlipCamera();
                      setShowMobileMore(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FlipHorizontal2 className="h-5 w-5 text-zinc-300" />
                      <span className="font-bold uppercase tracking-wider text-[10px]">Flip Camera</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 uppercase">Switch view</span>
                  </button>
                )}

                {/* Reactions trigger */}
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowMobileMore(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    showEmojiPicker
                      ? "border-purple-500/25 bg-purple-500/10 text-purple-400"
                      : "border-white/5 bg-white/5 text-zinc-300 active:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Smile className="h-5 w-5" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Send Reaction</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 uppercase">{showEmojiPicker ? "Open" : "Closed"}</span>
                </button>

                {/* Video Filters */}
                <button
                  onClick={() => {
                    handleToggleFilter();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5 text-zinc-300 active:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-zinc-300" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Video Filter</span>
                  </div>
                  <span className="text-[9px] text-purple-400 uppercase">{localFilter}</span>
                </button>

                {/* Captions */}
                {captionsSupported && (
                  <button
                    onClick={() => {
                      toggleCaptions();
                      setShowMobileMore(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                      captionsActive
                        ? "border-green-500/25 bg-green-500/10 text-green-400"
                        : "border-white/5 bg-white/5 text-zinc-300 active:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {captionsActive ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
                      <span className="font-bold uppercase tracking-wider text-[10px]">Live Captions</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 uppercase">{captionsActive ? "On" : "Off"}</span>
                  </button>
                )}

                {/* Recording */}
                <button
                  onClick={() => {
                    handleToggleRecording();
                    setShowMobileMore(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    isRecording
                      ? "border-red-500/25 bg-red-500/10 text-red-400 animate-pulse"
                      : "border-white/5 bg-white/5 text-zinc-300 active:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Disc className="h-5 w-5" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Call Recording</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 uppercase">{isRecording ? "Recording" : "Off"}</span>
                </button>

                {/* Whiteboard */}
                <button
                  onClick={() => {
                    setShowWhiteboard(!showWhiteboard);
                    setShowMobileMore(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                    showWhiteboard
                      ? "border-zinc-500/25 bg-white/10 text-white"
                      : "border-white/5 bg-white/5 text-zinc-300 active:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PenTool className="h-5 w-5" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Whiteboard</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 uppercase">{showWhiteboard ? "Active" : "Closed"}</span>
                </button>
              </div>
            </div>
          </>
        )}


      </div>

      {/* Chat Sidebar (Right Column) */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onClose={() => setShowChat(false)}
        localUserName={localUserName}
        visible={showChat}
      />

      {/* Active Participants Sidebar (Right Column) */}
      <ParticipantPanel
        participants={activeParticipants}
        onClose={() => setShowParticipants(false)}
        localUid={localClientUid}
        localIsAdmin={localIsAdmin}
        adminsMap={activeAdminsMap}
        creatorUid={creatorUid}
        participantReactions={participantReactions}
        onPromoteAdmin={handlePromoteAdmin}
        onDemoteAdmin={handleDemoteAdmin}
        onKickUser={handleKickUser}
        onForceMuteUser={handleForceMuteUser}
        activePoll={activePoll}
        hasVoted={hasVoted}
        onVotePoll={handleVotePoll}
        onEndPoll={handleEndPoll}
        onCreatePoll={handleCreatePoll}
        visible={showParticipants}
        waitingRoomEnabled={waitingRoomEnabled}
        onToggleWaitingRoom={handleToggleWaitingRoom}
      />
      {/* Google Shared Doc Panel */}
      <GoogleDocPanel
        roomId={roomId}
        visible={showGoogleDoc}
        localIsHost={localIsHost}
        onClose={() => setShowGoogleDoc(false)}
      />

      {/* Meeting Artifacts Upload Modal (host only, shown on leave) */}
      {showArtifactsModal && (
        <MeetingArtifactsModal
          roomId={roomId}
          chatBlob={artifactChatBlob.current}
          attendanceBlob={artifactAttendanceBlob.current}
          recordingBlob={artifactRecordingBlob.current}
          onClose={() => { setShowArtifactsModal(false); router.push("/"); }}
        />
      )}

    </div>
  );
}
