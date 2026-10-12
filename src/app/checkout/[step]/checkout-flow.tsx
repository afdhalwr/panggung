"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BuyerForm } from "@/components/checkout/buyer-form";
import { ConfirmStep } from "@/components/checkout/confirm-step";
import { CountdownBadge, useCountdown } from "@/components/checkout/countdown-badge";
import { ExpiredDialog } from "@/components/checkout/expired-dialog";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentForm } from "@/components/checkout/payment-form";
import { Stepper, type StepSlug } from "@/components/checkout/stepper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { RequireAuth } from "@/features/auth/require-auth";
import { useCart, type HeldOrder } from "@/features/cart/store";
import { ApiRequestError, ordersRepository } from "@/features/orders/repository";
import { buyerSchema } from "@/lib/schemas";
import { useMounted } from "@/lib/use-mounted";

export function CheckoutFlow({ step }: { step: StepSlug }) {
  const mounted = useMounted();
  const order = useCart((s) => s.order);
  const [finishing, setFinishing] = useState(false);

  if (!mounted) return <Skeleton className="mx-auto mt-10 h-96 max-w-5xl" />;
  return (
    <RequireAuth>
      {finishing ? (
        <p className="py-24 text-center text-muted" role="status">
          Pembayaran berhasil. Menyiapkan e-ticket…
        </p>
      ) : order ? (
        <ActiveCheckout step={step} order={order} onFinish={() => setFinishing(true)} />
      ) : (
        <NoOrder />
      )}
    </RequireAuth>
  );
}

function ActiveCheckout({ step, order, onFinish }: { step: StepSlug; order: HeldOrder; onFinish: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { clockOffset, buyer, method, saveBuyer, saveMethod, reset } = useCart();
  const ms = useCountdown(order.holdExpiresAt, clockOffset);
  const [serverExpired, setServerExpired] = useState(false);
  const [busy, setBusy] = useState<"pay" | "fail" | null>(null);
  const [error, setError] = useState("");

  const buyerValid = !!buyer && buyerSchema.safeParse(buyer).success;
  const maxReached = buyerValid ? (method ? 2 : 1) : 0;
  const expired = ms <= 0 || serverExpired;

  // Langkah berikutnya terkunci sampai langkah sebelumnya valid.
  useEffect(() => {
    if (step !== "data" && !buyerValid) router.replace("/checkout/data");
    else if (step === "konfirmasi" && !method) router.replace("/checkout/pembayaran");
  }, [step, buyerValid, method, router]);

  function restart() {
    const slug = order.info.slug;
    reset();
    router.push(`/events/${slug}/seats`);
  }

  async function pay(simulateFailure: boolean) {
    if (!buyer || !method) return;
    setError("");
    setBusy(simulateFailure ? "fail" : "pay");
    try {
      const parsed = buyerSchema.parse(buyer);
      const { ticketIds } = await ordersRepository.payOrder(order.id, { buyer: parsed, method }, { simulateFailure });
      onFinish();
      reset();
      toast.success("Pembayaran berhasil!", { description: "E-ticket sudah tersimpan di Tiket Saya." });
      router.push(`/tickets/${ticketIds[0]}?baru=1`);
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiRequestError && err.status === 410) setServerExpired(true);
      else setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex flex-col items-center gap-3 border-b border-line bg-base/90 px-4 py-3 backdrop-blur sm:flex-row sm:justify-between">
        <Stepper current={step} maxReached={maxReached} />
        <CountdownBadge ms={ms} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {step === "data" && (
            <BuyerForm
              defaultValues={buyer ?? { name: user?.displayName ?? "", email: user?.email ?? "", phone: "" }}
              onSubmit={(b) => {
                saveBuyer(b);
                router.push("/checkout/pembayaran");
              }}
            />
          )}
          {step === "pembayaran" && buyerValid && (
            <PaymentForm
              initial={method}
              onBack={() => router.push("/checkout/data")}
              onSubmit={(m) => {
                saveMethod(m);
                router.push("/checkout/konfirmasi");
              }}
            />
          )}
          {step === "konfirmasi" && buyerValid && method && (
            <ConfirmStep buyer={buyer} method={method} total={order.total} busy={busy} error={error} onPay={(f) => void pay(f)} onBack={() => router.push("/checkout/pembayaran")} />
          )}
        </div>
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <OrderSummary order={order} />
        </aside>
      </div>

      <ExpiredDialog open={expired} onRestart={restart} />
    </div>
  );
}

function NoOrder() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Belum ada pesanan aktif</h1>
      <p className="text-muted">Pilih konser dan kursi dulu. Setelah kamu lanjut, kursi ditahan 10 menit untuk checkout.</p>
      <Button asChild>
        <Link href="/events">Cari konser</Link>
      </Button>
    </div>
  );
}
