import { StoreGate } from "@/lib/store";
import { Shell } from "@/components/Shell";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreGate>
      <Shell>{children}</Shell>
    </StoreGate>
  );
}
