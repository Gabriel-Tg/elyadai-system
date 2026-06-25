import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RealtimeMap } from "@/components/maps/realtime-map";
import { requireProfile } from "@/lib/auth";
import { getEscortDetails, updateEscortStatusAction } from "@/services/escorts";

export const dynamic = "force-dynamic";

export default async function EscortDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(["supervisor"]);
  const { id } = await params;
  const details = await getEscortDetails(id).catch(() => null);

  if (!details) notFound();

  const escort = details.escort;

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Escolta</p>
          <h1 className="font-display text-3xl font-bold">{escort.clients?.nome ?? escort.client_id}</h1>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">{escort.status}</span>
      </div>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <RealtimeMap escortId={escort.id} initialLocations={details.locations} />
        <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <dl className="grid gap-4 text-sm">
            <div><dt className="font-bold text-stone-500">Data</dt><dd>{escort.data_escolta} às {escort.hora_carregamento}</dd></div>
            <div><dt className="font-bold text-stone-500">Local</dt><dd>{escort.local_carregamento}</dd></div>
            <div><dt className="font-bold text-stone-500">Equipe</dt><dd>{escort.escort_team?.map((team) => team.employees?.nome).filter(Boolean).join(" + ")}</dd></div>
            <div><dt className="font-bold text-stone-500">Encontro alternativo</dt><dd>{escort.encontro_alternativo_permitido ? escort.local_alternativo_encontro : "Não permitido"}</dd></div>
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><button className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white" type="submit">Iniciar</button></form>
            <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Finalizada"); }}><button className="w-full rounded-md bg-stone-950 px-3 py-3 text-sm font-bold text-white" type="submit">Finalizar</button></form>
            <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Reagendada"); }}><button className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-950" type="submit">Reagendar</button></form>
            <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Cancelada"); }}><button className="w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-950" type="submit">Cancelar</button></form>
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Fotos anexadas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {details.photos.map((photo) => <a className="rounded-md border border-stone-200 p-3 text-sm font-bold text-stone-800 underline" href={photo.url} key={photo.id} target="_blank">{new Date(photo.taken_at).toLocaleString("pt-BR")}</a>)}
          {!details.photos.length ? <p className="text-sm text-stone-600">Nenhuma foto enviada.</p> : null}
        </div>
      </section>
    </AppShell>
  );
}