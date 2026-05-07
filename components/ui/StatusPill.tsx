import type { OutbreakStatus } from "@/lib/types";

const config: Record<
  OutbreakStatus,
  { label: string; className: string; pulse: boolean }
> = {
  active: {
    label: "Active",
    className: "text-color-accent border-color-accent",
    pulse: true,
  },
  contained: {
    label: "Contained",
    className: "text-color-warning border-color-warning",
    pulse: false,
  },
  resolved: {
    label: "Resolved",
    className: "text-color-success border-color-success",
    pulse: false,
  },
};

export default function StatusPill({ status }: { status: OutbreakStatus }) {
  const { label, className, pulse } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-data text-[10px] uppercase tracking-widest px-2 py-0.5 border bg-color-bg-subtle ${className}`}
    >
      {pulse && <span className="live-dot" aria-hidden style={{ width: 6, height: 6 }} />}
      {label}
    </span>
  );
}
