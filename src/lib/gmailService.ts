import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNCTION_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/gmail-proxy`;

async function callGmail(action: string, options: {
  method?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
} = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { method = "GET", body, params } = options;
  const searchParams = params ? `?${new URLSearchParams(params)}` : "";

  const res = await fetch(`${FUNCTION_URL}/${action}${searchParams}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gmail API error");
  return data;
}

export function getGmailAuthUrl(redirectUri: string) {
  return callGmail("auth-url", {
    method: "POST",
    body: { redirectUri },
  });
}

export function exchangeGmailCode(code: string, redirectUri: string) {
  return callGmail("callback", {
    method: "POST",
    body: { code, redirectUri },
  });
}

export function getGmailAccounts() {
  return callGmail("accounts", { method: "GET" });
}

export function removeGmailAccount(email: string) {
  return callGmail("remove-account", {
    method: "POST",
    body: { email },
  });
}

export function listMessages(email: string, options: {
  labelIds?: string;
  q?: string;
  maxResults?: string;
  pageToken?: string;
} = {}) {
  return callGmail("messages", {
    method: "GET",
    params: { email, ...options } as Record<string, string>,
  });
}

export function getMessage(email: string, messageId: string) {
  return callGmail("message", {
    method: "GET",
    params: { email, id: messageId },
  });
}

export function sendMessage(email: string, to: string, subject: string, body: string, options?: {
  inReplyTo?: string;
  references?: string;
  threadId?: string;
  attachments?: { filename: string; mimeType: string; data: string }[];
}) {
  return callGmail("send", {
    method: "POST",
    body: { email, to, subject, body, ...options },
  });
}

export function modifyMessage(email: string, messageId: string, addLabelIds?: string[], removeLabelIds?: string[]) {
  return callGmail("modify", {
    method: "POST",
    body: { email, messageId, addLabelIds, removeLabelIds },
  });
}

export function trashMessage(email: string, messageId: string) {
  return callGmail("trash", {
    method: "POST",
    body: { email, messageId },
  });
}

export function getLabels(email: string) {
  return callGmail("labels", {
    method: "GET",
    params: { email },
  });
}

export function getAttachment(email: string, messageId: string, attachmentId: string) {
  return callGmail("attachment", {
    method: "GET",
    params: { email, messageId, attachmentId },
  });
}

// Helpers to parse Gmail message
export function getHeader(message: GmailMessage, name: string): string {
  const header = message.payload?.headers?.find(
    (h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
}

export function getMessageBody(message: GmailMessage): string {
  const payload = message.payload;
  if (!payload) return "";

  // Simple text/html body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart
  if (payload.parts) {
    // Prefer HTML
    const htmlPart = payload.parts.find((p: GmailPart) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);

    const textPart = payload.parts.find((p: GmailPart) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      const text = decodeBase64Url(textPart.body.data);
      return text.replace(/\n/g, "<br>");
    }

    // Nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = part.parts.find((p: GmailPart) => p.mimeType === "text/html");
        if (nested?.body?.data) return decodeBase64Url(nested.body.data);
      }
    }
  }

  return "<p>Unable to display message body</p>";
}

export interface AttachmentInfo {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
  partId: string;
}

export function getAttachments(message: GmailMessage): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = [];
  const collectParts = (parts?: GmailPart[]) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
          partId: part.partId || "",
        });
      }
      if (part.parts) collectParts(part.parts);
    }
  };
  collectParts(message.payload?.parts);
  return attachments;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

export function base64UrlToBlob(data: string, mimeType: string): Blob {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export interface GmailPart {
  mimeType: string;
  filename?: string;
  partId?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string; size?: number };
    parts?: GmailPart[];
    mimeType?: string;
  };
}
