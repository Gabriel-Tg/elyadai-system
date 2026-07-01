import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

function isStatusColumn(column: string) {
  return column.toLowerCase().includes("status");
}

function renderCell(column: string, cell: React.ReactNode) {
  if (isStatusColumn(column) && typeof cell === "string") {
    return <StatusBadge value={cell} />;
  }

  return cell;
}

export function RecordTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ href?: string; cells: React.ReactNode[] }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[rgba(22,27,34,0.92)] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-elevated)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <tr>{columns.map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row, index) => {
              const content = row.cells.map((cell, cellIndex) => <td className="px-4 py-4 text-[var(--muted-strong)]" key={cellIndex}>{renderCell(columns[cellIndex] ?? "", cell)}</td>);
              const href = row.href;

              return href ? (
                <tr className="odd:bg-[rgba(13,17,23,0.22)] hover:bg-[rgba(31,111,235,0.12)]" key={href}>
                  {content.map((cell, cellIndex) => cellIndex === 0 ? <td className="px-4 py-4" key="link"><Link className="font-bold text-white underline-offset-4 hover:text-[#79c0ff] hover:underline" href={href}>{row.cells[0]}</Link></td> : cell)}
                </tr>
              ) : <tr className="odd:bg-[rgba(13,17,23,0.22)] hover:bg-[rgba(31,111,235,0.12)]" key={index}>{content}</tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}