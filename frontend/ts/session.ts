// Mirrors src/hooks/use-auth.tsx, but as plain module-level state backed by
// localStorage instead of a React context.

export interface StudentProfile {
  id: string;
  user_id: string | null;
  member_id: string;
  admission_no: string | null;
  name: string;
  class: string | null;
  section: string | null;
  house: string | null;
  room_number: string | null;
  phone: string | null;
  gender: string | null;
  hostel: string | null;
  photo_url: string | null;
  total_points: number;
  [key: string]: unknown;
}

export interface Me {
  id: string;
  email: string | null;
  role: "super_admin" | "teacher" | "student";
  full_name: string | null;
  student: StudentProfile | null;
}

const TOKEN_KEY = "gurukul_access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
