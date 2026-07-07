"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

export const runtime = "edge";

// Load CallWorkspace dynamically on the client side
const CallWorkspace = dynamic(
  () => import("@/components/CallWorkspace"),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-vercel-light dark:bg-vercel-black text-sm text-vercel-text-muted">
        Connecting...
      </div>
    )
  }
);

export default function RoomPage() {
  const params = useParams();
  const roomId = typeof params.roomId === "string" ? params.roomId : "default";

  return <CallWorkspace roomId={roomId} />;
}
