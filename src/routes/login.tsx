import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/academy/auth-form";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/login")({
  head: () => pageHead("Log in", "Log in to save your chess progress."),
  component: () => <AuthForm />,
});
