"use client";

import { useState, useEffect } from "react";
import { getOrCreateDriveFolder, uploadFileToDrive, getDriveFolderLink, getGoogleAccessToken } from "@/lib/googleApi";
import { Upload, Check, X, ExternalLink, Loader2, HardDrive, FileText, Users, Video, AlertCircle } from "lucide-react";

interface ArtifactItem {
  label: string;
  filename: string;
  blob: Blob | null;
  icon: React.ReactNode;
  status: "pending" | "uploading" | "done" | "error" | "skipped";
  link?: string;
  error?: string;
}

interface MeetingArtifactsModalProps {
  roomId: string;
  chatBlob: Blob | null;
  attendanceBlob: Blob | null;
  recordingBlob: Blob | null;
  onClose: () => void;
}

export default function MeetingArtifactsModal({
  roomId,
  chatBlob,
  attendanceBlob,
  recordingBlob,
  onClose,
}: MeetingArtifactsModalProps) {
  const hasToken = !!getGoogleAccessToken();
  const [folderLink, setFolderLink] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([
    { label: "Chat Transcript", filename: `chat-${roomId}.txt`, blob: chatBlob, icon: <FileText className="h-4 w-4" />, status: "pending" },
    { label: "Attendance Log", filename: `attendance-${roomId}.csv`, blob: attendanceBlob, icon: <Users className="h-4 w-4" />, status: "pending" },
    { label: "Recording", filename: `recording-${roomId}.webm`, blob: recordingBlob, icon: <Video className="h-4 w-4" />, status: "pending" },
  ]);

  const updateArtifact = (index: number, update: Partial<ArtifactItem>) => {
    setArtifacts((prev) => prev.map((a, i) => i === index ? { ...a, ...update } : a));
  };

  const handleUpload = async () => {
    if (!hasToken) return;
    setOverallStatus("uploading");

    try {
      // Get or create Lync Meetings folder, then room subfolder
      const rootId = await getOrCreateDriveFolder("Lync Meetings");
      const roomFolderId = await getOrCreateDriveFolder(`Meeting - ${roomId}`, rootId);
      const link = await getDriveFolderLink(roomFolderId);
      setFolderLink(link);

      let anyError = false;

      for (let i = 0; i < artifacts.length; i++) {
        const artifact = artifacts[i];
        if (!artifact.blob) {
          updateArtifact(i, { status: "skipped" });
          continue;
        }

        updateArtifact(i, { status: "uploading" });
        try {
          const file = await uploadFileToDrive(artifact.blob, artifact.filename, roomFolderId);
          updateArtifact(i, { status: "done", link: file.webViewLink });
        } catch (err: any) {
          updateArtifact(i, { status: "error", error: err.message });
          anyError = true;
        }
      }

      setOverallStatus(anyError ? "error" : "done");
    } catch (err: any) {
      setOverallStatus("error");
    }
  };

  // Auto-start upload if Google token is available
  useEffect(() => {
    if (hasToken) {
      handleUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIcon = (status: ArtifactItem["status"]) => {
    switch (status) {
      case "uploading": return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case "done": return <Check className="h-4 w-4 text-green-400" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "skipped": return <span className="text-[9px] text-zinc-500 font-mono">SKIP</span>;
      default: return <div className="h-4 w-4 rounded-full border border-white/10" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">Meeting Artifacts</h3>
            </div>
            <p className="text-[10px] font-mono text-zinc-500">
              {hasToken
                ? "Uploading meeting files to your Google Drive..."
                : "Sign in with Google to auto-save artifacts to Drive."}
            </p>
          </div>
          {overallStatus !== "uploading" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-transparent hover:border-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Artifact list */}
        <div className="space-y-2">
          {artifacts.map((artifact, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/3"
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">{artifact.icon}</span>
                <div>
                  <p className="text-[11px] font-bold font-mono text-white">{artifact.label}</p>
                  {artifact.blob
                    ? <p className="text-[9px] font-mono text-zinc-500">{(artifact.blob.size / 1024).toFixed(1)} KB</p>
                    : <p className="text-[9px] font-mono text-zinc-600">No data</p>
                  }
                </div>
              </div>
              <div className="flex items-center gap-2">
                {artifact.status === "done" && artifact.link && (
                  <a href={artifact.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded border border-transparent hover:border-white/10 text-zinc-400 hover:text-white transition-all">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {statusIcon(artifact.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Drive folder link */}
        {folderLink && (
          <a
            href={folderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-white/10 text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white/30 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Google Drive
          </a>
        )}

        {/* No Google token state */}
        {!hasToken && (
          <p className="text-[10px] font-mono text-zinc-500 text-center">
            You can manually download chat transcripts and attendance from the Room Settings.
          </p>
        )}

        {/* Close button */}
        {overallStatus !== "uploading" && (
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl bg-white text-black text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            {overallStatus === "done" ? "All Done — Close" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}
