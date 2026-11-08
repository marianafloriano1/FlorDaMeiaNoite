import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/http";
import { listCoupons } from "@/lib/coupons/service";
import type { Coupon } from "@/lib/coupons/types";
import CouponPanel from "./panel";

export const dynamic = "force-dynamic";

export default async function CouponsAdminPage() {
  const identity = await requireSession();
  if (identity?.role !== "admin") redirect("/admin/catalog");
  let coupons: Coupon[] = [];
  try {
    coupons = await listCoupons();
  } catch {
    /* show empty status; API reports operational errors */
  }
  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação administrativa">
        <Link href="/admin/catalog">Catálogo</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1>Cupons</h1>
        <p className="description">
          Cupons aplicam-se a um pedido, sem acumulação. Limites e escopos são configuráveis por
          campanha.
        </p>
      </header>
      <CouponPanel initialCoupons={coupons} />
    </main>
  );
}
