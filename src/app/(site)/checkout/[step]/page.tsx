import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STEPS, type StepSlug } from "@/components/checkout/stepper";
import { CheckoutFlow } from "./checkout-flow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export function generateStaticParams() {
  return STEPS.map((s) => ({ step: s.slug }));
}

export default async function CheckoutPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!STEPS.some((s) => s.slug === step)) notFound();
  return <CheckoutFlow step={step as StepSlug} />;
}
