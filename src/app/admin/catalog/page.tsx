import Link from "next/link";
import { connection } from "next/server";
import { requireSession } from "@/lib/auth/http";
import CatalogAdmin from "./panel";

export default async function CatalogAdminPage() {
  await connection();
  const identity = await requireSession();
  if (!identity || (identity.role !== "employee" && identity.role !== "admin")) {
    return (
      <main className="catalog-shell">
        <p role="alert">Acesso restrito à equipe autorizada.</p>
        <Link href="/auth">Entrar</Link>
      </main>
    );
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação principal">
        <Link href="/catalog">Catálogo público</Link>
        <Link href="/">Flor da Meia-Noite</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1>Produtos e estoque</h1>
        <p className="description">
          Cadastre produtos, mantenha o saldo e registre imagens do catálogo.
        </p>
      </header>
      <CatalogAdmin />
    </main>
  );
}
