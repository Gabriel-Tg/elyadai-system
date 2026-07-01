import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { temporarySupervisorMode } from "@/lib/temporary-supervisor-mode";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (temporarySupervisorMode) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="tactical-shell tactical-scanline grid min-h-screen place-items-center px-4 py-10 text-[var(--foreground)]">
      <section className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Elyadai Serviços</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[var(--foreground)]">Acesso operacional</h1>
          <p className="mt-3 text-[var(--muted-strong)]">Entre como supervisor, cliente ou funcionário.</p>
        </div>
        <LoginForm error={params.error} />
      </section>
    </main>
  );
}