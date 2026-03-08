/**
 * Core API Gateway
 * Centralized API layer for all module communications.
 * All modules must use this gateway instead of calling supabase directly for edge functions.
 */
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
}

/**
 * Invoke an edge function with retry logic
 */
export async function invokeFunction<T = any>(
  functionName: string,
  params: Record<string, string>,
  options: { retries?: number; timeout?: number } = {}
): Promise<ApiResponse<T>> {
  const { retries = 2, timeout = 15000 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const queryStr = new URLSearchParams(params).toString();
      const res = await fetch(
        `https://${PROJECT_ID}.supabase.co/functions/v1/${functionName}?${queryStr}`,
        {
          headers: { Authorization: `Bearer ${ANON_KEY}` },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);

      if (!res.ok) {
        if (attempt < retries && res.status >= 500) continue;
        return { data: null, error: `API error: ${res.status}` };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err: any) {
      if (attempt < retries && err.name !== "AbortError") continue;
      return { data: null, error: err.message || "Network error" };
    }
  }

  return { data: null, error: "Max retries exceeded" };
}

/**
 * Authenticated query helper with error handling
 */
export async function queryTable<T = any>(
  table: string,
  queryFn: (q: any) => any
): Promise<ApiResponse<T>> {
  try {
    const query = supabase.from(table as any);
    const { data, error } = await queryFn(query);
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Query failed" };
  }
}

/**
 * Get current authenticated user ID or null
 */
export function getCurrentUserId(): string | null {
  // This is synchronous - relies on the session being cached
  return null; // Must be used with useAuth hook instead
}

export { supabase };
