import { Camera, MapPin, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/cards/stat-card";
import { requireProfile } from "@/lib/auth";
import { getEmployeeDashboard } from "@/services/dashboard";
import { sendLocationAction, updateEscortStatusAction, uploadEscortPhotoAction } from "@/services/escorts";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const profile = await requireProfile(["funcionario"]);

  if (!profile.employee_id) {
    throw new Error("Perfil de funcionário sem vínculo com cadastro de funcionário.");
  }

  const missions = await getEmployeeDashboard(profile.employee_id);
  const currentMission = missions.find((mission) => mission.status === "Em andamento") ?? missions[0];
  const photoCount = missions.reduce(
    (sum, mission) => sum + ((mission as { escort_photos?: unknown[] }).escort_photos?.length ?? 0),
    0,
  );

  return (
    <AppShell profile={profile}>
      <h1 className="mb-6 font-display text-3xl font-bold">Minhas missões</h1>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="Missões vinculadas ao seu usuário" icon={ShieldCheck} label="Total" value={missions.length} />
        <StatCard detail="Rastreamento em tempo real" icon={MapPin} label="Em andamento" value={missions.filter((mission) => mission.status === "Em andamento").length} />
        <StatCard detail="Fotos anexadas por você" icon={Camera} label="Fotos" value={photoCount} />
      </section>
      {currentMission ? (
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Missão selecionada</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{currentMission.clients?.nome ?? currentMission.client_id}</h2>
            <p className="mt-2 text-stone-700">{currentMission.local_carregamento}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <form action={async () => { "use server"; await updateEscortStatusAction(currentMission.id, "Em andamento"); }}><button className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-bold text-white" type="submit">Iniciar</button></form>
              <form action={async () => { "use server"; await updateEscortStatusAction(currentMission.id, "Finalizada"); }}><button className="w-full rounded-md bg-stone-950 px-3 py-3 text-sm font-bold text-white" type="submit">Finalizar</button></form>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <form action={sendLocationAction.bind(null, profile)} className="grid gap-3">
              <input name="escort_id" type="hidden" value={currentMission.id} />
              <h2 className="font-display text-xl font-bold">Enviar localização</h2>
              <input className="rounded-md border border-stone-300 px-3 py-3" name="latitude" placeholder="Latitude" required type="number" step="any" />
              <input className="rounded-md border border-stone-300 px-3 py-3" name="longitude" placeholder="Longitude" required type="number" step="any" />
              <input className="rounded-md border border-stone-300 px-3 py-3" name="accuracy_meters" placeholder="Precisão em metros" type="number" step="any" />
              <button className="rounded-md bg-stone-950 px-4 py-3 font-bold text-white" type="submit">Compartilhar GPS</button>
            </form>
            <form action={uploadEscortPhotoAction.bind(null, profile)} className="grid gap-3">
              <input name="escort_id" type="hidden" value={currentMission.id} />
              <h2 className="font-display text-xl font-bold">Anexar foto</h2>
              <input className="rounded-md border border-stone-300 px-3 py-3" name="foto" required type="file" accept="image/*" />
              <button className="rounded-md border border-stone-300 px-4 py-3 font-bold text-stone-900" type="submit">Enviar foto</button>
            </form>
          </div>
        </section>
      ) : (
        <p className="mt-6 rounded-lg border border-stone-200 bg-white p-5 text-stone-700">Nenhuma missão vinculada.</p>
      )}
    </AppShell>
  );
}