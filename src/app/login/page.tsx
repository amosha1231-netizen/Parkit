import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { safePath } from "@/lib/safe-path";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next: rawNext, expired } = await searchParams;
  const next = safePath(rawNext);
  if (await repo.currentUser()) redirect(next);
  return <LoginForm next={next} expired={Boolean(expired)} />;
}
