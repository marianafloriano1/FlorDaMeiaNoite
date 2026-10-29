import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCatalogProductInput,
  parseStockAdjustment,
} from "../../src/lib/catalog/admin-validation";
import { catalogAccessDenial } from "../../src/lib/catalog/authorization";
import { validateCatalogProductImage } from "../../src/lib/storage/catalog-image-validation";

const product = {
  slug: "rosa-sintetica",
  name: "Rosa de teste",
  productType: "Rosa",
  description: "Produto sintético.",
  colors: ["vermelho"],
  priceBrl: 12.5,
  category: "Flores",
  occasion: null,
  size: null,
  materials: ["rosa"],
  careInstructions: "Informação não disponível.",
  flowerMeaning: "Informação não disponível.",
  petToxicity: "Informação não disponível.",
  shelfLife: "Informação não disponível.",
  status: "draft",
};

test("TASK-007: cadastro valida o contrato do catálogo e não aceita campos de estoque/auditoria", () => {
  assert.deepEqual(parseCatalogProductInput(product), product);
  assert.equal(parseCatalogProductInput({ ...product, slug: "Slug Inválido" }), null);
  assert.equal(parseCatalogProductInput({ ...product, name: "  " }), null);
  assert.deepEqual(parseCatalogProductInput({ ...product, description: "" }), {
    ...product,
    description: "",
  });
  assert.equal(parseCatalogProductInput({ ...product, priceBrl: -1 }), null);
  assert.equal(parseCatalogProductInput({ ...product, category: "Outra" }), null);
  assert.equal(parseCatalogProductInput({ ...product, stock_quantity: 500 }), null);
  assert.deepEqual(parseCatalogProductInput({ name: "Nome corrigido" }, true), {
    name: "Nome corrigido",
  });
});

test("TASK-007: ajuste requer saldo inteiro não negativo e justificativa de 1 a 400 caracteres", () => {
  assert.deepEqual(parseStockAdjustment({ newQuantity: 7, reason: "Contagem física" }), {
    newQuantity: 7,
    reason: "Contagem física",
  });
  for (const value of [
    { newQuantity: -1, reason: "ajuste" },
    { newQuantity: 1.5, reason: "ajuste" },
    { newQuantity: "7", reason: "ajuste" },
    { newQuantity: 7, reason: " " },
    { newQuantity: 7, reason: "x".repeat(401) },
    { newQuantity: 7, reason: "ajuste", actorUid: "forged" },
  ])
    assert.equal(parseStockAdjustment(value), null);
});

test("TASK-007: autorização permite employee/admin e exige MFA recente para mutação do admin", () => {
  assert.deepEqual(catalogAccessDenial(null, false, false), {
    status: 401,
    error: "authentication_required",
  });
  assert.deepEqual(catalogAccessDenial("customer", true, false), {
    status: 403,
    error: "catalog_operator_required",
  });
  assert.equal(catalogAccessDenial("employee", true, false), null);
  assert.deepEqual(catalogAccessDenial("admin", true, false), {
    status: 428,
    error: "admin_mfa_required",
  });
  assert.equal(catalogAccessDenial("admin", true, true), null);
});

test("TASK-007: upload exige assinatura de imagem, alt text e dimensões dentro dos limites", () => {
  const validPng = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(validPng);
  validPng.writeUInt32BE(1, 16);
  validPng.writeUInt32BE(1, 20);
  const input = {
    content: validPng,
    contentType: "image/png",
    altText: "Rosa sintética",
    width: 1,
    height: 1,
  };
  assert.equal(validateCatalogProductImage(input), null);
  assert.equal(
    validateCatalogProductImage({ ...input, contentType: "image/png;evil" }),
    "catalog_image_not_allowed",
  );
  assert.equal(
    validateCatalogProductImage({ ...input, content: Buffer.from("not an image") }),
    "catalog_image_signature_invalid",
  );
  assert.equal(
    validateCatalogProductImage({ ...input, altText: " " }),
    "catalog_image_alt_invalid",
  );
  assert.equal(
    validateCatalogProductImage({ ...input, width: 10_000, height: 10_000 }),
    "catalog_image_dimensions_invalid",
  );
  assert.equal(
    validateCatalogProductImage({ ...input, width: 2 }),
    "catalog_image_dimensions_invalid",
  );
});
