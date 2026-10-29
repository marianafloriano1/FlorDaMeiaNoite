import Link from "next/link";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">FLOR DA MEIA-NOITE</p>
        <h1 id="page-title">Um espaço para florescer.</h1>
        <p className="description">
          Explore flores, plantas e objetos de jardinagem no catálogo da loja.
        </p>
        <p className="environment" role="status">
          Catálogo público. Pedidos e pagamentos não são realizados nesta etapa.
        </p>
        <p className="description">
          <Link href="/catalog">Abrir catálogo</Link>
        </p>
        <p className="description">
          <Link href="/auth">Entrar ou criar uma conta</Link>
        </p>
      </section>
    </main>
  );
}
