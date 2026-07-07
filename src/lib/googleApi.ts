/**
 * googleApi.ts
 * Client-side Google Calendar + Drive REST API helpers.
 * Uses the OAuth access token obtained from Firebase Google Sign-In.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Token store — populated by useFirebase after Google sign-in
// ─────────────────────────────────────────────────────────────────────────────
let _googleAccessToken: string | null = null;

export function setGoogleAccessToken(token: string | null) {
  _googleAccessToken = token;
}

export function getGoogleAccessToken(): string | null {
  return _googleAccessToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────
async function gFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = _googleAccessToken;
  if (!token) throw new Error("No Google OAuth token. Please sign in with Google.");

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API error ${res.status}: ${err}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar API
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  htmlLink: string;
}

/** List upcoming calendar events within the next N days. */
export async function listUpcomingCalendarEvents(days = 7): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + days * 86400_000).toISOString();

  const params = new URLSearchParams({
    timeMin: now,
    timeMax: later,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "15",
  });

  const data = await gFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
  );

  return (data?.items ?? []) as CalendarEvent[];
}

/** Create a Google Calendar event and optionally send email invites. */
export async function createCalendarEvent(
  title: string,
  startMs: number,
  endMs: number,
  location: string,
  description: string,
  attendeeEmails: string[] = []
): Promise<CalendarEvent> {
  const body: any = {
    summary: title,
    location,
    description,
    start: { dateTime: new Date(startMs).toISOString() },
    end: { dateTime: new Date(endMs).toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 30 },
        { method: "popup", minutes: 10 },
      ],
    },
    guestsCanModify: false,
    guestsCanInviteOthers: false,
  };

  if (attendeeEmails.length > 0) {
    body.attendees = attendeeEmails.map((email) => ({ email }));
  }

  return await gFetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    { method: "POST", body: JSON.stringify(body) }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Drive API
// ─────────────────────────────────────────────────────────────────────────────

/** Find or create a folder by name. Returns the folder ID. */
export async function getOrCreateDriveFolder(
  name: string,
  parentId?: string
): Promise<string> {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const searchParams = new URLSearchParams({ q, fields: "files(id,name)" });
  const searchRes = await gFetch(
    `https://www.googleapis.com/drive/v3/files?${searchParams}`
  );

  if (searchRes?.files?.length > 0) {
    return searchRes.files[0].id;
  }

  // Create new folder
  const createBody: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) createBody.parents = [parentId];

  const created = await gFetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    body: JSON.stringify(createBody),
  });

  return created.id;
}

/** Upload a file blob to Google Drive using multipart upload. */
export async function uploadFileToDrive(
  blob: Blob,
  filename: string,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  const token = _googleAccessToken;
  if (!token) throw new Error("No Google OAuth token available.");

  const metadata = { name: filename, parents: [folderId] };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", blob, filename);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload error ${res.status}: ${err}`);
  }

  return res.json();
}

/** Get a shareable web link for a Drive folder. */
export async function getDriveFolderLink(folderId: string): Promise<string> {
  const data = await gFetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=webViewLink`
  );
  return data?.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract a Lync room link from a calendar event's description or location. */
export function extractLyncLink(event: CalendarEvent): string | null {
  const text = `${event.description ?? ""} ${event.location ?? ""}`;
  const match = text.match(/https?:\/\/[^\s"']+\/room\/[a-z]+-[a-z]+-[a-z]+/);
  return match ? match[0] : null;
}

/** Format a Calendar event's start time for compact display. */
export function formatEventTime(event: CalendarEvent): string {
  const dt = event.start.dateTime ?? event.start.date ?? "";
  if (!dt) return "";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
