import { getSupabase, requireSupabase } from "@/lib/supabase";
import { loginWithUsername } from "@/lib/login";
import type { Credentials, SignupDetails, User } from "@/types/academy";

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export type SignupResult = { user: User | null; needsConfirmation: boolean };

export const authService = {
  async getUser(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return null;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, email, role, banned")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return null;
    if (profile.banned) {
      await supabase.auth.signOut();
      return null;
    }
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role === "admin" ? "admin" : "user",
    };
  },
  async login({ identifier, password }: Credentials): Promise<User> {
    const supabase = requireSupabase();
    const result = await loginWithUsername({ data: { identifier, password } });
    if (!result.ok) throw new Error(result.error);
    const { error } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
    if (error) throw new Error("Logging in didn't work. Please try again.");
    const user = await authService.getUser();
    if (!user) throw new Error("Logging in didn't work. Please try again.");
    return user;
  },
  async signup({ username, email, password }: SignupDetails): Promise<SignupResult> {
    const supabase = requireSupabase();
    const name = username.trim();
    if (!USERNAME.test(name)) {
      throw new Error("Usernames are 3 to 20 letters, numbers or underscores.");
    }
    if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
    const { data: available, error: checkError } = await supabase.rpc("username_available", {
      p_username: name,
    });
    if (checkError)
      throw new Error("Signing up isn't available right now. Please try again later.");
    if (!available) throw new Error("That username is taken.");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: name }, emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) throw new Error(signupMessage(error.message));
    // With email confirmation on, Supabase returns no session until the link is clicked.
    if (!data.session) return { user: null, needsConfirmation: true };
    return { user: await authService.getUser(), needsConfirmation: false };
  },
  async logout(): Promise<void> {
    await getSupabase()?.auth.signOut();
  },
  onChange(callback: () => void): () => void {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange(() => callback());
    return () => data.subscription.unsubscribe();
  },
};

function signupMessage(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("already registered")) return "An account with that email already exists.";
  if (text.includes("password")) return message;
  if (text.includes("rate limit")) return "Too many sign-ups right now. Please try again later.";
  if (text.includes("database error")) return "That username or email is already in use.";
  return "Signing up didn't work. Please check your details and try again.";
}
