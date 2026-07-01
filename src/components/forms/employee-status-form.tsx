import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { updateEmployeeStatusAction } from "@/services/employees";
import type { EmployeeStatus } from "@/types/database";

export function EmployeeStatusForm({ employeeId, status }: { employeeId: string; status: EmployeeStatus }) {
  if (status === "ocupado") {
    return <StatusBadge value="ocupado" />;
  }

  return (
    <form action={updateEmployeeStatusAction} className="flex min-w-56 items-center gap-2">
      <input name="employee_id" type="hidden" value={employeeId} />
      <select className="field-control min-h-10 py-2" defaultValue={status} name="status" required>
        <option value="disponivel">Disponível</option>
        <option value="folga">Folga</option>
      </select>
      <Button className="min-h-10 px-3 py-2 text-xs" type="submit" variant="secondary">Atualizar</Button>
    </form>
  );
}