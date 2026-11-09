import Link from "next/link";
import { redirect } from "next/navigation";
import { getReportsAdmin } from "@/lib/reports/authorization";
import { parseReportFilters } from "@/lib/reports/periods";
import { getOperationsReport } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const authorization = await getReportsAdmin();
  if (!authorization.ok) redirect(authorization.status === 401 ? "/auth" : "/admin/catalog");
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["period", "basis", "anchor"]) {
    const value = values[key];
    if (typeof value === "string") params.set(key, value);
  }
  const filters = parseReportFilters(params);
  if (!filters) {
    return (
      <main className="catalog-shell">
        <h1>Relatórios</h1>
        <p role="alert">Filtro inválido.</p>
      </main>
    );
  }
  let report: Awaited<ReturnType<typeof getOperationsReport>> | null = null;
  try {
    report = await getOperationsReport(filters);
  } catch {
    return (
      <main className="catalog-shell">
        <h1>Relatórios</h1>
        <p role="alert">Relatório indisponível.</p>
      </main>
    );
  }

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Navegação administrativa">
        <Link href="/admin/catalog">Catálogo</Link>
        <Link href="/admin/orders">Pedidos</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">ADMINISTRAÇÃO</p>
        <h1>Relatórios</h1>
        <p className="description">
          Semana: segunda a domingo; mês civil. Faturamento considera somente pagamentos
          confirmados.
        </p>
      </header>
      <form method="get">
        <label>
          Período{" "}
          <select name="period" defaultValue={filters.period}>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </label>
        <label>
          Base temporal{" "}
          <select name="basis" defaultValue={filters.basis}>
            <option value="created">Criação do pedido</option>
            <option value="paid">Confirmação do pagamento</option>
          </select>
        </label>
        <label>
          Data de referência <input name="anchor" type="date" defaultValue={filters.anchor} />
        </label>
        <button type="submit">Aplicar filtros</button>
      </form>
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">Resumo</h2>
        <p>
          Período local: {filters.anchor}; base:{" "}
          {filters.basis === "created" ? "criação" : "pagamento"}.
        </p>
        <dl>
          <dt>Pedidos pagos</dt>
          <dd>{report.paidOrderCount}</dd>
          <dt>Faturamento líquido de cupons (BRL)</dt>
          <dd>{report.revenueBrl.toFixed(2)}</dd>
          <dt>Pedidos com cancelamento após pagamento</dt>
          <dd>{report.postPaymentCancelledOrderCount}</dd>
          <dt>Eventos de adição ao carrinho</dt>
          <dd>
            {report.cartItemAddedEvents} ({report.cartUnitsAdded} unidades)
          </dd>
          <dt>Eventos de favoritos</dt>
          <dd>{report.favoriteAddedEvents}</dd>
        </dl>
      </section>
      <section aria-labelledby="products-heading">
        <h2 id="products-heading">Produtos vendidos</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Unidades líquidas</th>
            </tr>
          </thead>
          <tbody>
            {report.products.map((product) => (
              <tr key={product.productName}>
                <td>{product.productName}</td>
                <td>{product.unitsSold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="export-heading">
        <h2 id="export-heading">Exportar relatório</h2>
        <form action="/api/admin/reports/export" method="post">
          <input type="hidden" name="period" value={filters.period} />
          <input type="hidden" name="basis" value={filters.basis} />
          <input type="hidden" name="anchor" value={filters.anchor} />
          <button name="format" value="xlsx" type="submit">
            Baixar Excel
          </button>
          <button name="format" value="pdf" type="submit">
            Baixar PDF
          </button>
        </form>
      </section>
    </main>
  );
}
