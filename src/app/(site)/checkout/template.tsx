/** Pindah langkah checkout: konten bergeser masuk dari kanan, terasa seperti maju satu langkah. */
export default function CheckoutTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-step-in">{children}</div>;
}
