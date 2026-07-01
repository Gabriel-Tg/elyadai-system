import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeeLocationTracker } from "@/components/maps/employee-location-tracker";
import { RealtimeMap } from "@/components/maps/realtime-map";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth";
import { getEscortDetails, updateEscortStatusAction, uploadEscortPhotoAction } from "@/services/escorts";

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
  const primaryTeamMember = escort.escort_team?.find((team) => team.position === 1) ?? null;
  const isPrimaryEmployee = Boolean(isEmployee && profile.employee_id && primaryTeamMember?.employee_id === profile.employee_id);
  const canStart = escort.status === "Agendada";
  const canFinish = escort.status === "Em andamento";
  const canReschedule = escort.status === "Agendada";
  const canCancel = escort.status === "Agendada";

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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Escolta</p>
          <h1 className="font-display text-3xl font-bold">{escort.clients?.nome ?? escort.client_id}</h1>
        </div>
        <StatusBadge value={escort.status} />
      </div>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <RealtimeMap escortId={escort.id} initialLocations={details.locations} trackedEmployeeId={primaryTeamMember?.employee_id ?? null} />
        <Panel className="space-y-4 p-5">
          <dl className="grid gap-4 text-sm">
            <div><dt className="font-bold text-[var(--muted)]">Data</dt><dd className="text-[var(--foreground)]">{escort.data_escolta} às {escort.hora_carregamento}</dd></div>
            <div><dt className="font-bold text-[var(--muted)]">Local</dt><dd className="text-[var(--foreground)]">{escort.local_carregamento}</dd></div>
            {!isClient ? <div><dt className="font-bold text-[var(--muted)]">Funcionário 1</dt><dd className="text-[var(--foreground)]">{primaryTeamMember?.employees?.nome ?? "Não definido"}</dd></div> : null}
            <div><dt className="font-bold text-[var(--muted)]">Encontro alternativo</dt><dd className="text-[var(--foreground)]">{escort.encontro_alternativo_permitido ? escort.local_alternativo_encontro : "Não permitido"}</dd></div>
          </dl>
          {isClient ? (
            null
          ) : isEmployee ? (
            <div className="grid gap-2">
              {isPrimaryEmployee && canStart ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><Button className="w-full" type="submit" variant="success">Iniciar corrida</Button></form> : null}
              {isPrimaryEmployee && canFinish ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Finalizada"); }}><Button className="w-full" type="submit">Finalizar corrida</Button></form> : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {canStart ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Em andamento"); }}><Button className="w-full" type="submit" variant="success">Iniciar corrida</Button></form> : null}
              {canFinish ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Finalizada"); }}><Button className="w-full" type="submit">Finalizar</Button></form> : null}
              {canReschedule ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Reagendada"); }}><Button className="w-full" type="submit" variant="warning">Reagendar</Button></form> : null}
              {canCancel ? <form action={async () => { "use server"; await updateEscortStatusAction(escort.id, "Cancelada"); }}><Button className="w-full" type="submit" variant="danger">Cancelar</Button></form> : null}
            </div>
          )}
        </Panel>
      </section>
      {isPrimaryEmployee && escort.status === "Em andamento" ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <EmployeeLocationTracker escortId={escort.id} />
          <Panel className="space-y-4 p-5">
            <form action={uploadEscortPhotoAction.bind(null, profile)} className="grid gap-3">
              <input name="escort_id" type="hidden" value={escort.id} />
              <h2 className="font-display text-xl font-bold">Anexar foto</h2>
              <input accept="image/*" className="field-control" name="foto" required type="file" />
              <Button type="submit" variant="secondary">Enviar foto</Button>
            </form>
          </Panel>
        </section>
      ) : null}
      <Panel className="mt-6 p-5">
        <h2 className="font-display text-xl font-bold">Fotos anexadas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {details.photos.map((photo) => <a className="rounded-md border border-[var(--border)] bg-[rgba(13,17,23,0.55)] p-3 text-sm font-bold text-[var(--muted-strong)] underline-offset-4 hover:text-[#79c0ff] hover:underline" href={photo.url} key={photo.id} target="_blank">{new Date(photo.taken_at).toLocaleString("pt-BR")}</a>)}
          {!details.photos.length ? <p className="text-sm text-[var(--muted-strong)]">Nenhuma foto enviada.</p> : null}
        </div>
      </Panel>
    </AppShell>
  );
}