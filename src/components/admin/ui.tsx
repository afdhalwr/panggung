import { CheckCircle2, CircleDashed, CircleSlash, Clock, Flag, PencilLine, RotateCcw, Send, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EVENT_STATUS_LABEL, type EventStatus, type OrderStatus } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, className, children }: { title?: string; description?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type Tone = "success" | "warning" | "danger" | "muted" | "primary";

const TONE: Record<Tone, string> = {
  success: "border-success/40 text-success",
  warning: "border-seat-held/50 text-seat-held",
  danger: "border-danger/40 text-danger",
  muted: "border-line text-muted",
  primary: "border-primary/40 text-primary",
};

/** Lencana status: warna selalu disertai ikon dan teks, tidak mengandalkan warna saja. */
export function Badge({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold", TONE[tone])}>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

const EVENT_BADGE: Record<EventStatus, { tone: Tone; icon: LucideIcon }> = {
  draft: { tone: "muted", icon: PencilLine },
  published: { tone: "success", icon: Send },
  finished: { tone: "primary", icon: Flag },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const b = EVENT_BADGE[status];
  return (
    <Badge tone={b.tone} icon={b.icon}>
      {EVENT_STATUS_LABEL[status]}
    </Badge>
  );
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  paid: "Lunas",
  pending: "Menunggu bayar",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
  refunded: "Direfund",
};

const ORDER_BADGE: Record<OrderStatus, { tone: Tone; icon: LucideIcon }> = {
  paid: { tone: "success", icon: CheckCircle2 },
  pending: { tone: "warning", icon: Clock },
  expired: { tone: "muted", icon: CircleDashed },
  cancelled: { tone: "muted", icon: CircleSlash },
  failed: { tone: "danger", icon: XCircle },
  refunded: { tone: "primary", icon: RotateCcw },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const b = ORDER_BADGE[status];
  return (
    <Badge tone={b.tone} icon={b.icon}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

export function KpiCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        <Icon className="size-4 text-muted" aria-hidden />
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Kelas bersama untuk input/select di halaman admin (lebih padat dari form pembeli). */
export const fieldCls = (invalid = false) =>
  cn("h-10 w-full rounded-xl border bg-base px-3 text-sm outline-none focus:border-primary", invalid ? "border-danger" : "border-line");
