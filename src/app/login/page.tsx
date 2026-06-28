import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { temporarySupervisorMode } from "@/lib/temporary-supervisor-mode";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (temporarySupervisorMode) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#f6f2ea,#d9e7da_52%,#f4c86a)] px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-700">Elyadai Serviços</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-stone-950">Acesso operacional</h1>
          <p className="mt-3 text-stone-700">Entre como supervisor, cliente ou funcionário.</p>
        </div>
        <LoginForm error={params.error} />
      </section>
    </main>
  );
}