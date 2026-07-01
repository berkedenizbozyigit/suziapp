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

/** folders(...) — user-owned buckets that saved items can be filed under.
 *  query_text / cover_saved_item_id added in Phase 1 (folders-as-conversations).
 *  query_embedding (pgvector) is deferred to Phase 2, once the dimension is fixed. */
export type Folder = {
  id: string;
  user_id: string;
  name: string;
  query_text: string | null;
  cover_saved_item_id: string | null;
  created_at: string;
};

/** The user's answer to "did you buy it?" — a SOFT signal, NOT revenue truth.
 *  Real money lands in the service-role-only `conversions` table (not typed here). */
export type PurchaseIntent = 'bought' | 'not_yet' | 'no';

/** saved_items(...) — a product a user swiped right on. */
export type SavedItem = {
  id: string;
  user_id: string;
  product_id: string;
  folder_id: string | null;
  price_at_save: number | null;
  purchase_intent: PurchaseIntent | null;
  created_at: string;
};

/** profiles(...) — public profile row, id === auth.users.id.
 *  expo_push_token added in Phase 1 (stored after the push-permission grant). */
export type Profile = {
  id: string;
  display_name: string | null;
  expo_push_token: string | null;
  created_at: string;
};

/** Who authored a message. */
export type MessageRole = 'user' | 'suzi';

/** messages(...) — Ask Suzi chat (Phase 1). folder_id null = the global thread;
 *  a folder_id scopes the thread to that folder ("conversation"). image_url is
 *  set for visual-search messages. */
export type Message = {
  id: string;
  user_id: string;
  folder_id: string | null;
  role: MessageRole;
  content: string | null;
  image_url: string | null;
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
        Insert: { user_id: string; name: string; query_text?: string | null };
        Update: {
          name?: string;
          query_text?: string | null;
          cover_saved_item_id?: string | null;
        };
        Relationships: [];
      };
      saved_items: {
        Row: SavedItem;
        Insert: SavedItemInsert;
        Update: { folder_id?: string | null; purchase_intent?: PurchaseIntent | null };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null; expo_push_token?: string | null };
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: {
          user_id: string;
          role: MessageRole;
          folder_id?: string | null;
          content?: string | null;
          image_url?: string | null;
        };
        Update: { content?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
