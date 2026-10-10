import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="auth-page">
      <div className="page-heading">
        <h1>{signup ? "Sign up" : "Log in"}</h1>
      </div>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(event.currentTarget);
          try {
            if (signup)
              await authService.signup({
                username: String(form.get("username")),
                email: String(form.get("email")),
                password: String(form.get("password")),
              });
            else
              await authService.login({
                identifier: String(form.get("identifier")),
                password: String(form.get("password")),
              });
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Something went wrong. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {signup ? (
          <>
            <label>
              Username
              <input
                className="field"
                name="username"
                autoComplete="username"
                required
                placeholder="Username"
              />
            </label>
            <label>
              Email
              <input
                className="field"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
          </>
        ) : (
          <label>
            Username or email
            <input
              className="field"
              name="identifier"
              autoComplete="username"
              required
              placeholder="Username or email"
            />
          </label>
        )}
        <label>
          Password
          <input
            className="field"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            placeholder="Password"
          />
        </label>
        {error && (
          <div className="feedback" role="alert">
            <XCircle />
            {error}
          </div>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Loading…" : signup ? "Sign up" : "Log in"}
          <ArrowRight />
        </Button>
      </form>
      <p className="auth-note">
        {signup ? "Already have an account? " : "No account? "}
        <Link to={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Sign up"}</Link>
      </p>
      <div className="auth-guest">
        <p>Accounts save progress; all training is free for guests.</p>
        <Button variant="link" asChild>
          <Link to="/learn">
            Continue as guest
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
