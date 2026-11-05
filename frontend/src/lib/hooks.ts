import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import type { AdminOut, PublicForm } from "./types";

export function usePublicForm() {
  return useQuery({ queryKey: ["public-form"], queryFn: () => apiGet<PublicForm>("/public/form"), retry: 1 });
}

export function useAdminMe() {
  return useQuery({ queryKey: ["admin-me"], queryFn: () => apiGet<AdminOut>("/auth/me"), retry: false });
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// Copies as rich HTML (pastes formatted into Gmail/Outlook) with a plain-text fallback.
export async function copyRich(html: string, text: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(text);
}
