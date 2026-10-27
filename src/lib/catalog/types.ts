export const CATALOG_CATEGORIES = [
  "Buquês",
  "Arranjos",
  "Boxes",
  "Embalagens",
  "Laços",
  "Vasos",
  "Ornamentos",
  "Flores",
  "Plantas",
  "Fertilizantes",
  "Terras",
  "Sementes",
  "Ferramentas de jardinagem",
  "Decorações",
  "Pedras",
  "Insumos",
] as const;

export const CATALOG_LOCALES = ["pt-BR", "en", "es", "ru"] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

export type CatalogImageRow = {
  objectKey: string;
  altText: string;
  width: number;
  height: number;
  mimeType: string;
};

export type CatalogProductRow = {
  id: string;
  slug: string;
  name: string;
  product_type: string;
  description: string;
  colors: string[];
  price_brl: number | string;
  category_name: string;
  occasion: string | null;
  size: string | null;
  materials: string[];
  care_instructions: string;
  flower_meaning: string;
  pet_toxicity: string;
  shelf_life: string;
  content_version: number;
  images: CatalogImageRow[];
  low_stock_alert: boolean;
};

export type CatalogFilters = {
  query?: string;
  flowerType?: string;
  color?: string;
  size?: string;
  materials?: string[];
  minPrice?: number;
  maxPrice?: number;
};

export type PublicCatalogProduct = {
  slug: string;
  name: string;
  productType: string;
  description: string;
  colors: string[];
  photos: Array<{ url: string; altText: string; width: number; height: number; mimeType: string }>;
  priceBrl: number;
  category: string;
  availability: "available";
  lowStockAlert: boolean;
  occasion: string | null;
  size: string | null;
  materials: string[];
  careInstructions: string;
  flowerMeaning: string;
  petToxicity: string;
  shelfLife: string;
  contentLocale: CatalogLocale;
};
