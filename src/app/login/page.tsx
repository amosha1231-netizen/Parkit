import { redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await repo.currentUser()) redirect(next.startsWith("/") ? next : "/");
  return <LoginForm next={next} />;
}
