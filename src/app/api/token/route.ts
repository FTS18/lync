import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export const runtime = "edge";

// ─── In-memory rate limiter ─────────────────────────────────────────────────
// Map<ip, { count, windowStart }>
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 15;       // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
let lastPruned = Date.now();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Lazy prune old entries every 5 minutes on incoming requests to avoid memory bloat
  if (now - lastPruned > 300_000) {
    rateLimitMap.forEach((record, key) => {
      if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 5) {
        rateLimitMap.delete(key);
      }
    });
    lastPruned = now;
  }

  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count++;
  return false;
}

// ─── Channel name validation ─────────────────────────────────────────────────
function isValidChannel(name: string): boolean {
  return /^[a-zA-Z0-9\-_]{1,64}$/.test(name);
}

// ─── Route handler ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // CORS: only allow same-origin requests
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  if (origin && !allowedOrigins.some((o) => origin.startsWith(o as string))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limiting by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before retrying." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(req.url);
  const channelName = searchParams.get("channel");
  const uidStr = searchParams.get("uid") || "0";

  if (!channelName) {
    return NextResponse.json(
      { error: "Channel name is required" },
      { status: 400 }
    );
  }

  // Validate channel name — prevent path traversal / injection
  if (!isValidChannel(channelName)) {
    return NextResponse.json(
      { error: "Invalid channel name. Use only letters, digits, hyphens, underscores (max 64 chars)." },
      { status: 400 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";

  if (!appId) {
    return NextResponse.json(
      { error: "Agora App ID is not configured" },
      { status: 500 }
    );
  }

  let uid = parseInt(uidStr, 10);
  if (isNaN(uid) || uid < 0 || uid > 4294967295) {
    uid = 0; // 0 = auto-assign by Agora
  }

  const role = RtcRole.PUBLISHER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + 3600; // 1 hour

  try {
    let token = "";

    if (appCertificate) {
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
    } else {
      console.warn("AGORA_APP_CERTIFICATE missing — unsecured token.");
      token = "";
    }

    const res = NextResponse.json({ token, appId, uid, channelName });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("Error generating Agora token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
