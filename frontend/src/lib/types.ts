// Mirrors backend/models/schemas.py — keep in sync by hand.
export type Gender = "Male" | "Female" | "Non-binary" | "Other";
export type Personality = string; // options are admin-editable
export interface QuestionCfg {
  title: string;
  hint: string;
  options: string[];
}
export interface Questions {
  personality: QuestionCfg;
  qualities: QuestionCfg;
  vibe: QuestionCfg;
  lifestyle: QuestionCfg;
  intention: QuestionCfg;
}
export type PaymentStatus = "pending" | "verified" | "rejected";
export type EmailStatus = "no_matches" | "pending" | "sent";

export interface SettingsIn {
  form_open: boolean;
  fee: number;
  upi_id: string;
  payee_name: string;
}
export interface Settings extends SettingsIn {
  qr_file_id: string | null;
}
export interface PublicForm {
  open: boolean;
  fee: number;
  upi_id: string;
  payee_name: string;
  has_qr: boolean;
  questions: Questions;
}
export interface Preferences {
  surprise_me: boolean;
  genders: Gender[];
  age_min: number;
  age_max: number;
  height_min: number;
  height_max: number;
  personalities: Personality[];
  qualities: string[];
  vibes: string[];
  lifestyles: string[];
  intentions: string[];
  college: string;
  location: string;
}
export interface ProfileFields {
  full_name: string;
  age: number;
  gender: Gender;
  height_cm: number;
  mobile: string;
  email: string;
  college: string;
  course: string;
  city: string;
  hometown: string;
  instagram: string;
  religion: string;
  share_religion: boolean;
  personality: Personality;
  qualities: string[];
  dating_vibe: string;
  lifestyle: string[];
  intention: string;
  preferences: Preferences;
}
export interface ApplicationIn extends ProfileFields {
  photo_id: string;
  utr?: string; // not needed for women (free entry)
  screenshot_id?: string;
  consent_accurate: true;
  consent_matchmaking: true;
  consent_share_contact: true;
}
export interface Payment {
  status: PaymentStatus;
  utr: string;
  screenshot_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  note: string;
}
export interface Application extends ProfileFields {
  id: string;
  app_code: string;
  photo_id: string | null;
  payment: Payment;
  created_at: string;
  match_count: number;
  email_status: EmailStatus;
  email_sent_at: string | null;
}
export interface ApplicationCreated {
  app_code: string;
  free_entry: boolean;
}
export interface UploadOut {
  file_id: string;
}
export interface OkOut {
  ok: boolean;
  message: string;
}
export interface EndRoundOut {
  deleted_entries: number;
  deleted_files: number;
}
export interface AdminOut {
  id: string;
  email: string;
  name: string;
}
export interface CompatPart {
  label: string;
  score: number;
  max: number;
  note: string;
}
export interface Candidate {
  application: Application;
  score: number;
  breakdown: CompatPart[];
  warnings: string[];
  eligible: boolean;
  issues: string[];
  assigned: boolean;
  reverse_assigned: boolean;
}
export interface AssignOut {
  created: number;
  skipped: string[];
}
export interface AssignedMatch {
  id: string;
  override: boolean;
  created_at: string;
  score: number;
  match: Application;
}
export interface EmailPreview {
  application_id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  match_count: number;
  status: EmailStatus;
  sent_at: string | null;
}
export interface EmailMarkOut {
  status: EmailStatus;
  duplicate: boolean;
}
