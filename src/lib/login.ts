import { createServerFn } from "@tanstack/react-start";
import { cleanUrl } from "@/lib/supabase";

// Logging in with a username needs the account's email, which only the server
// may look up. The email never leaves the server: it signs in here and hands
// the browser just the session tokens.
export type LoginResult =
  { ok: true; accessToken: string; refreshToken: string } | { ok: false; error: string };

const WRONG = "Wrong username or password.";

export const loginWithUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as { identifier?: unknown; password?: unknown };
    if (typeof data?.identifier !== "string" || typeof data?.password !== "string") {
      throw new Error("Invalid login request.");
    }
    return {
      identifier: data.identifier.trim().slice(0, 320),
      password: data.password.slice(0, 200),
    };
  })
  .handler(async ({ data }): Promise<LoginResult> => {
    const url = cleanUrl(process.env["VITE_SUPABASE_URL"]);
    const publishable = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const secret = process.env["SUPABASE_SECRET_KEY"];
    if (!url || !publishable || !secret) {
      return { ok: false, error: "Logging in isn't available right now. Please try again later." };
    }
    if (!data.identifier || !data.password) return { ok: false, error: WRONG };

    const lookup = await fetch(`${url}/rest/v1/rpc/login_lookup`, {
      method: "POST",
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_identifier: data.identifier }),
    });
    if (!lookup.ok) {
      console.error("login_lookup failed", lookup.status);
      return { ok: false, error: "Logging in isn't available right now. Please try again later." };
    }
    const rows = (await lookup.json()) as { email: string; banned: boolean }[];
    const account = rows[0];
    if (!account) return { ok: false, error: WRONG };

    const token = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: publishable, "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: data.password }),
    });
    const body = (await token.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      error_code?: string;
      code?: string;
      msg?: string;
      error_description?: string;
    };
    if (!token.ok || !body.access_token || !body.refresh_token) {
      const code = body.error_code ?? body.code;
      if (code === "email_not_confirmed") {
        return {
          ok: false,
          error: "Please confirm your email first. Check your inbox for the link.",
        };
      }
      if (token.status === 429 || code === "over_request_rate_limit") {
        return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
      }
      return { ok: false, error: WRONG };
    }
    // Checked after the password so the message doesn't reveal which accounts exist.
    if (account.banned) return { ok: false, error: "This account is suspended." };
    return { ok: true, accessToken: body.access_token, refreshToken: body.refresh_token };
  });
