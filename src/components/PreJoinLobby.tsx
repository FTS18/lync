"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC, { ICameraVideoTrack } from "agora-rtc-sdk-ng";
import { Video, VideoOff, Mic, MicOff, ArrowRight, FlipHorizontal2, Loader2, Lock } from "lucide-react";

interface PreJoinLobbyProps {
  roomId: string;
  defaultDisplayName: string;
  isPasscodeProtected: boolean;
  onJoin: (opts: {
    displayName: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }) => void;
  onCancel: () => void;
}

export default function PreJoinLobby({
  roomId,
  defaultDisplayName,
  isPasscodeProtected,
  onJoin,
  onCancel,
}: PreJoinLobbyProps) {
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<ICameraVideoTrack | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isMobile, setIsMobile] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<ICameraVideoTrack | null>(null);

  // Detect mobile
  useEffect(() => {
    setIsMobile(
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        window.innerWidth < 768
    );
  }, []);

  // Start/stop camera preview
  const startPreview = useCallback(
    async (facing: "user" | "environment" = facingMode) => {
      setLoadingPreview(true);
      try {
        // Stop existing track
        if (trackRef.current) {
          trackRef.current.stop();
          trackRef.current.close();
          trackRef.current = null;
          setPreviewTrack(null);
        }

        const track = await AgoraRTC.createCameraVideoTrack({
          facingMode: facing,
        });
        trackRef.current = track;
        setPreviewTrack(track);

        // Play into preview container
        if (previewContainerRef.current) {
          track.play(previewContainerRef.current);
        }
      } catch (err) {
        console.warn("Camera preview unavailable:", err);
      } finally {
        setLoadingPreview(false);
      }
    },
    [facingMode]
  );

  const stopPreview = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current.close();
      trackRef.current = null;
    }
    setPreviewTrack(null);
  }, []);

  // Toggle camera
  const handleToggleVideo = useCallback(async () => {
    if (videoEnabled) {
      stopPreview();
      setVideoEnabled(false);
    } else {
      setVideoEnabled(true);
      await startPreview(facingMode);
    }
  }, [videoEnabled, facingMode, startPreview, stopPreview]);

  // Flip camera (mobile)
  const handleFlipCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (videoEnabled) {
      await startPreview(next);
    }
  }, [facingMode, videoEnabled, startPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current.close();
      }
    };
  }, []);

  // Play track into container when both exist
  useEffect(() => {
    if (previewTrack && previewContainerRef.current) {
      previewTrack.play(previewContainerRef.current);
    }
  }, [previewTrack]);

  const handleJoin = () => {
    const name = displayName.trim() || "Guest";
    onJoin({ displayName: name, audioEnabled, videoEnabled });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vercel-light dark:bg-vercel-black px-4 py-8 animate-in fade-in duration-300">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-vercel-text-muted">
            Pre-Join Check
          </p>
          <h2 className="text-lg font-extrabold tracking-tight font-mono uppercase text-vercel-text-light dark:text-white">
            {roomId}
          </h2>
          {isPasscodeProtected && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded-full">
              <Lock className="h-2.5 w-2.5" /> Passcode Protected
            </span>
          )}
        </div>

        {/* Camera Preview */}
        <div className="relative w-full aspect-video rounded-xl border border-vercel-border-light dark:border-vercel-border-dark bg-black/90 overflow-hidden flex items-center justify-center">
          {videoEnabled ? (
            <>
              <div
                ref={previewContainerRef}
                className={`w-full h-full ${facingMode === "user" ? "[&_video]:scale-x-[-1]" : ""}`}
              />
              {loadingPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              {/* Flip button — mobile only */}
              {isMobile && (
                <button
                  onClick={handleFlipCamera}
                  className="absolute top-2 right-2 p-2 bg-black/60 border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors"
                  title="Flip Camera"
                >
                  <FlipHorizontal2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <VideoOff className="h-8 w-8" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Camera Off
              </span>
            </div>
          )}
        </div>

        {/* A/V Controls Row */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleToggleVideo}
            className={`flex items-center gap-2 h-10 px-4 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider border transition-all active:scale-95 ${
              videoEnabled
                ? "bg-vercel-text-light dark:bg-white text-white dark:text-black border-transparent"
                : "border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-muted hover:border-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            {videoEnabled ? "Cam On" : "Cam Off"}
          </button>

          <button
            onClick={() => setAudioEnabled((p) => !p)}
            className={`flex items-center gap-2 h-10 px-4 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider border transition-all active:scale-95 ${
              audioEnabled
                ? "bg-vercel-text-light dark:bg-white text-white dark:text-black border-transparent"
                : "border-vercel-border-light dark:border-vercel-border-dark text-vercel-text-muted hover:border-neutral-400 dark:hover:border-neutral-600"
            }`}
          >
            {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {audioEnabled ? "Mic On" : "Mic Off"}
          </button>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-vercel-text-muted font-mono">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="Enter your display name"
            className="w-full h-10 px-3 text-xs rounded border border-vercel-border-light dark:border-vercel-border-dark bg-transparent outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-all text-vercel-text-light dark:text-vercel-text-dark font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={!displayName.trim()}
            className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join Now <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
