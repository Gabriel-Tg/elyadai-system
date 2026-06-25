import Link from "next/link";

export function RecordTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ href?: string; cells: React.ReactNode[] }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-[0.12em] text-stone-500">
            <tr>{columns.map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const content = row.cells.map((cell, cellIndex) => <td className="border-t border-stone-100 px-4 py-4" key={cellIndex}>{cell}</td>);
              const href = row.href;

              return href ? (
                <tr className="hover:bg-stone-50" key={href}>
                  {content.map((cell, cellIndex) => cellIndex === 0 ? <td className="border-t border-stone-100 px-4 py-4" key="link"><Link className="font-bold text-stone-950 underline-offset-4 hover:underline" href={href}>{row.cells[0]}</Link></td> : cell)}
                </tr>
              ) : <tr key={index}>{content}</tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}