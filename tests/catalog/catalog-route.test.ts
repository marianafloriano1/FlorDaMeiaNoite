import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { renderToStaticMarkup } from "react-dom/server";

function successfulClient() {
  return {
    from() {
      const query = {
        select() {
          return query;
        },
        order() {
          return query;
        },
        async limit() {
          return { data: [], error: null };
        },
      };
      return query;
    },
  };
}

test("T008: API separa sucesso 200, indisponibilidade 503 e filtro inválido 400", async (t) => {
  let createSupabaseClient: () => Promise<unknown> = async () => successfulClient();
  mock.module("@/lib/supabase/server", {
    namedExports: {
      getSupabaseServerClient: () => createSupabaseClient(),
    },
  });
  const { GET } = await import("@/app/api/catalog/route");

  await t.test("Supabase disponível retorna 200", async () => {
    createSupabaseClient = async () => successfulClient();
    const response = await GET(new Request("http://localhost/api/catalog"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [] });
  });

  await t.test("erro Supabase retorna 503 genérico sem detalhes", async () => {
    createSupabaseClient = async () => ({
      from() {
        const query = {
          select() {
            return query;
          },
          order() {
            return query;
          },
          async limit() {
            return {
              data: null,
              error: new Error("ECONNREFUSED http://127.0.0.1:1 synthetic-secret"),
            };
          },
        };
        return query;
      },
    });

    const originalError = console.error;
    console.error = () => {};
    try {
      const response = await GET(new Request("http://localhost/api/catalog"));
      const body = await response.text();
      assert.equal(response.status, 503);
      assert.equal(body, JSON.stringify({ error: "catalog_unavailable" }));
      assert.doesNotMatch(body, /ECONNREFUSED|127\.0\.0\.1|synthetic-secret|stack/i);
    } finally {
      console.error = originalError;
    }
  });

  await t.test("URL local sintética indisponível resulta em HTTP 503", async () => {
    createSupabaseClient = async () =>
      createClient("http://127.0.0.1:1", "synthetic-invalid-anon-key");

    const originalError = console.error;
    console.error = () => {};
    try {
      const response = await GET(new Request("http://localhost/api/catalog"));
      const body = await response.text();
      assert.equal(response.status, 503);
      assert.equal(body, JSON.stringify({ error: "catalog_unavailable" }));
      assert.doesNotMatch(body, /127\.0\.0\.1|synthetic-invalid-anon-key|stack/i);
    } finally {
      console.error = originalError;
    }
  });

  await t.test("catálogo mantém navegação e informa indisponibilidade", async () => {
    createSupabaseClient = async () => ({
      from() {
        const query = {
          select() {
            return query;
          },
          order() {
            return query;
          },
          async limit() {
            return { data: null, error: new Error("synthetic dependency failure") };
          },
        };
        return query;
      },
    });
    const { default: CatalogPage } = await import("@/app/catalog/page");
    const markup = renderToStaticMarkup(await CatalogPage({ searchParams: Promise.resolve({}) }));

    assert.match(markup, /Flor da Meia-Noite/);
    assert.match(markup, /Entrar ou criar conta/);
    assert.match(markup, /temporariamente indisponível/i);
    assert.doesNotMatch(markup, /synthetic dependency failure|stack trace/i);
  });

  await t.test("filtro inválido retorna 400 antes de consultar Supabase", async () => {
    let clientRequested = false;
    createSupabaseClient = async () => {
      clientRequested = true;
      throw new Error("Supabase must not be called for invalid filters");
    };

    const response = await GET(new Request("http://localhost/api/catalog?minPrice=invalid"));

    assert.equal(response.status, 400);
    assert.equal(clientRequested, false);
  });
});
