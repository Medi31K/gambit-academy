import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/academy/auth-form";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/signup")({
  head: () => pageHead("Sign up", "Create a free account to save your chess progress."),
  component: () => <AuthForm signup />,
});
