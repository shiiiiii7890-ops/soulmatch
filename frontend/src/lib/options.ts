// Mirrors backend/lib/options.py.
export const GENDERS = ["Male", "Female", "Non-binary", "Other"] as const;
export const PERSONALITIES = ["Introvert", "Extrovert", "Ambivert"] as const;
export const QUALITIES = [
  "Loyal", "Kind", "Funny", "Humorous", "Ambitious", "Intellectual", "Confident", "Caring",
  "Creative", "Romantic", "Adventurous", "Shy", "Emotional", "Foodie", "Nerd",
];
export const DATING_VIBES = ["Gen Z", "Old School", "Hopeless Romantic", "Casual & Fun", "Deep Conversations", "Friends First"];
export const LIFESTYLES = [
  "Party Lover", "Fitness Enthusiast", "Book Lover", "Traveller", "Movie Buff", "Music Lover", "Gamer", "Food Explorer",
];
export const INTENTIONS = ["Serious Relationship", "Getting to Know Someone", "Friendship First", "Open to Connections", "Hookup"];

export interface QuestionCfg { title: string; hint: string; options: string[] }
export type QuestionKey = "personality" | "qualities" | "vibe" | "lifestyle" | "intention";
// Fallback only — the live wording/options come from /public/form (editable by the admin).
export const DEFAULT_QUESTIONS: Record<QuestionKey, QuestionCfg> = {
  personality: { title: "Personality", hint: "", options: [...PERSONALITIES] },
  qualities: { title: "Choose your qualities", hint: "Pick as many as feel like you", options: [...QUALITIES] },
  vibe: { title: "Dating vibe", hint: "", options: [...DATING_VIBES] },
  lifestyle: { title: "Lifestyle", hint: "Select all that apply", options: [...LIFESTYLES] },
  intention: { title: "Relationship type", hint: "What are you looking for?", options: [...INTENTIONS] },
};

export const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
};
export const EMAIL_LABEL: Record<string, string> = {
  no_matches: "No matches",
  pending: "Email pending",
  sent: "Email sent",
};
export const PHASE_LABEL: Record<string, string> = {
  registration: "Registration",
  matching: "Matching in progress",
  published: "Results published",
};

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const igUrl = (h: string) => `https://instagram.com/${h.replace(/^@/, "")}`;
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
