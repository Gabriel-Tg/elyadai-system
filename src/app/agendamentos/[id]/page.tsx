import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeeLocationTracker } from "@/components/maps/employee-location-tracker";
import { RealtimeMap } from "@/components/maps/realtime-map";
import { requireProfile } from "@/lib/auth";
import { getEscortDetails, sendLocationAction, updateEscortStatusAction, uploadEscortPhotoAction } from "@/services/escorts";

export const dynamic = "force-dynamic";

function isEmployeeAssigned(employeeId: string, escort: NonNullable<Awaited<ReturnType<typeof getEscortDetails>>>["escort"]) {
  return Boolean(escort.escort_team?.some((team) => team.employee_id === employeeId));
}

export default async function EscortDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(["supervisor", "funcionario", "cliente"]);
  const { id } = await params;
  const details = await getEscortDetails(id);

  if (!details) notFound();

  const escort = details.escort;
  const isEmployee = profile.role === "funcionario";
  const isClient = profile.role === "cliente";

  if (isEmployee && (!profile.employee_id || !isEmployeeAssigned(profile.employee_id, escort))) {
    notFound();
  }

  if (isClient && (!profile.client_id || profile.client_id !== escort.client_id)) {
    notFound();
  }

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
          {isClient ? (
            <div className="grid gap-2">
              {escort.status !== "Em andamento" && escort.status !== "Finalizada" ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><button className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white" type="submit">Iniciar corrida</button></form> : null}
            </div>
          ) : isEmployee ? (
            <div className="grid gap-2">
              {escort.status !== "Em andamento" && escort.status !== "Finalizada" ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><button className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white" type="submit">Iniciar corrida</button></form> : null}
              {escort.status === "Em andamento" ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Finalizada"); }}><button className="w-full rounded-md bg-stone-950 px-3 py-3 text-sm font-bold text-white" type="submit">Finalizar corrida</button></form> : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><button className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white" type="submit">Iniciar corrida</button></form>
              <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Finalizada"); }}><button className="w-full rounded-md bg-stone-950 px-3 py-3 text-sm font-bold text-white" type="submit">Finalizar</button></form>
              <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Reagendada"); }}><button className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-950" type="submit">Reagendar</button></form>
              <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Cancelada"); }}><button className="w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-3 text-sm font-bold text-rose-950" type="submit">Cancelar</button></form>
            </div>
          )}
        </div>
      </section>
      {isEmployee && escort.status === "Em andamento" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <EmployeeLocationTracker escortId={escort.id} />
          <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <form action={sendLocationAction.bind(null, profile)} className="grid gap-3">
              <input name="escort_id" type="hidden" value={escort.id} />
              <h2 className="font-display text-xl font-bold">Enviar localização manual</h2>
              <input className="rounded-md border border-stone-300 px-3 py-3" name="latitude" placeholder="Latitude" required step="any" type="number" />
              <input className="rounded-md border border-stone-300 px-3 py-3" name="longitude" placeholder="Longitude" required step="any" type="number" />
              <input className="rounded-md border border-stone-300 px-3 py-3" name="accuracy_meters" placeholder="Precisão em metros" step="any" type="number" />
              <button className="rounded-md bg-stone-950 px-4 py-3 font-bold text-white" type="submit">Compartilhar GPS</button>
            </form>
            <form action={uploadEscortPhotoAction.bind(null, profile)} className="grid gap-3">
              <input name="escort_id" type="hidden" value={escort.id} />
              <h2 className="font-display text-xl font-bold">Anexar foto</h2>
              <input accept="image/*" className="rounded-md border border-stone-300 px-3 py-3" name="foto" required type="file" />
              <button className="rounded-md border border-stone-300 px-4 py-3 font-bold text-stone-900" type="submit">Enviar foto</button>
            </form>
          </div>
        </section>
      ) : null}
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