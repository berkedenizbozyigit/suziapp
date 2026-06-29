// Hand-written TypeScript types mirroring the existing Supabase schema.
// IMPORTANT: these MUST stay in sync with the live tables — we do not own the
// schema here, we only describe it so the client is fully typed (no `any`).

/** A JSON-compatible value, used for the products.attributes jsonb column. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// NOTE: these domain types are `type` aliases, not `interface`s, on purpose.
// supabase-js requires each table's Row/Insert/Update to be assignable to
// `Record<string, unknown>`; interfaces are NOT (TS#15300), which silently
// collapses the whole typed client to `never`. Object-literal type aliases are.

/** products(...) — the catalog of swipeable fashion items. */
export type Product = {
  id: string;
  source: string | null;
  external_id: string | null;
  merchant: string | null;
  brand: string | null;
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  original_price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  in_stock: boolean | null;
  attributes: Json | null;
  // `embedding` (pgvector) is intentionally omitted: AI/semantic search is out
  // of scope for the skeleton and we never select it on the client.
  created_at: string;
  updated_at: string | null;
}

/** folders(...) — user-owned buckets that saved items can be filed under. */
export type Folder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

/** saved_items(...) — a product a user swiped right on. */
export type SavedItem = {
  id: string;
  user_id: string;
  product_id: string;
  folder_id: string | null;
  price_at_save: number | null;
  created_at: string;
};

/** profiles(...) — public profile row, id === auth.users.id. */
export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
};

/**
 * The shape we insert into saved_items. id/created_at are DB-generated, so they
 * are omitted; folder_id is optional (defaults to null = "All saves").
 */
export type SavedItemInsert = {
  user_id: string;
  product_id: string;
  price_at_save: number | null;
  folder_id?: string | null;
};

/**
 * Minimal `Database` generic for `createClient<Database>`. We only enumerate the
 * Row/Insert/Update shapes the app actually touches. supabase-js uses this to
 * type `.from(...).select(...)` results.
 */
export type Database = {
  public: {
    Tables: {
      products: {
        // The client never writes products, but supabase-js requires every table
        // to expose object-shaped Insert/Update types for the schema to type-check.
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
        Relationships: [];
      };
      folders: {
        Row: Folder;
        Insert: { user_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      saved_items: {
        Row: SavedItem;
        Insert: SavedItemInsert;
        Update: { folder_id?: string | null };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
