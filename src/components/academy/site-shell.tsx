import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { BrandMark } from "./brand";
export function SiteShell({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const { data: user } = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Logging in or out in another tab, or a token refresh, updates the header.
  useEffect(
    () => authService.onChange(() => void queryClient.invalidateQueries({ queryKey: ["user"] })),
    [queryClient],
  );
  const logout = async () => {
    setMenu(false);
    await authService.logout();
    await queryClient.invalidateQueries();
    await navigate({ to: "/" });
  };
  useEffect(() => {
    const preference = localStorage.getItem("gambit-theme");
    const value = preference
      ? preference === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
  }, []);
  const toggle = () => {
    const value = !dark;
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("gambit-theme", value ? "dark" : "light");
  };
  const nav = (
    <>
      <a href="https://phrenico.dk" className="hub-link" title="More playgrounds on phrenico.dk">
        phrenico.dk
      </a>
      <Link to="/" activeOptions={{ exact: true }} onClick={() => setMenu(false)}>
        Home
      </Link>
      <Link to="/puzzles" onClick={() => setMenu(false)}>
        Puzzles
      </Link>
      <Link to="/learn" onClick={() => setMenu(false)}>
        Lessons
      </Link>
      <Link to="/play" onClick={() => setMenu(false)}>
        Play
      </Link>
      <Link to="/practice" onClick={() => setMenu(false)}>
        Practice board
      </Link>
      <Link to="/progress" onClick={() => setMenu(false)}>
        Progress
      </Link>
      {user?.role === "admin" && (
        <Link to="/admin" onClick={() => setMenu(false)}>
          Admin
        </Link>
      )}
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Gambit Academy home">
            <BrandMark />
            <span>
              gambit<span className="brand-sub">ACADEMY</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav}
          </nav>
          <div className="header-actions">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            {user ? (
              <>
                <span className="header-username">{user.username}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void logout()}
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <>
                <Link className="login-link" to="/login">
                  Log in
                </Link>
                <Button className="signup-button" asChild>
                  <Link to="/signup">
                    Sign up
                    <ArrowUpRight />
                  </Link>
                </Button>
              </>
            )}
            <Button
              className="mobile-menu-button"
              variant="ghost"
              size="icon"
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {nav}
            {user ? (
              <button type="button" onClick={() => void logout()}>
                Log out
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenu(false)}>
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setMenu(false)}>
                  Sign up
                </Link>
              </>
            )}
          </nav>
        )}
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <p className="footer-credit">
          Part of <a href="https://phrenico.dk">phrenico.dk</a>: small worlds for learning to code (
          <a href="https://python.phrenico.dk">Python</a>, <a href="https://c.phrenico.dk">C++</a>,{" "}
          <a href="https://pygame.phrenico.dk">pygame</a>).
        </p>
        <Link to="/" className="footer-brand">
          <BrandMark />
          <span>gambit academy</span>
        </Link>
        <p className="footer-credit">
          Puzzles from the{" "}
          <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noreferrer">
            Lichess puzzle database
          </a>
          , opening names from{" "}
          <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer">
            Lichess chess-openings
          </a>{" "}
          (both CC0). Bots and coach use{" "}
          <a
            href="https://github.com/official-stockfish/Stockfish"
            target="_blank"
            rel="noreferrer"
          >
            Stockfish
          </a>{" "}
          (
          <a href="/engine/COPYING.txt" target="_blank" rel="noreferrer">
            GPLv3
          </a>
          ,{" "}
          <a href="https://github.com/nmrugg/stockfish.js" target="_blank" rel="noreferrer">
            source
          </a>
          ).
        </p>
      </footer>
    </>
  );
}
