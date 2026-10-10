import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, MailCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (sent)
    return (
      <div className="auth-page">
        <div className="page-heading">
          <h1>Check your email</h1>
        </div>
        <div className="feedback correct" role="status">
          <MailCheck />
          <span>We sent you a link to confirm your account. After that, you can log in.</span>
        </div>
        <p className="auth-note">
          <Link to="/login">Go to log in</Link>
        </p>
      </div>
    );
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
            if (signup) {
              const result = await authService.signup({
                username: String(form.get("username")),
                email: String(form.get("email")),
                password: String(form.get("password")),
              });
              if (result.needsConfirmation) {
                setSent(true);
                return;
              }
              queryClient.setQueryData(["user"], result.user);
            } else {
              const user = await authService.login({
                identifier: String(form.get("identifier")),
                password: String(form.get("password")),
              });
              queryClient.setQueryData(["user"], user);
            }
            // Everything else cached as a guest is refetched for the account.
            await queryClient.invalidateQueries({
              predicate: (query) => query.queryKey[0] !== "user",
            });
            await navigate({ to: "/puzzles" });
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
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="3 to 20 letters, numbers or underscores"
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
            minLength={signup ? 8 : undefined}
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
