/**
 * Hand-written database types mirroring supabase/migrations/0001_init.sql.
 * Kept in sync manually; regenerate with `supabase gen types` in a real project.
 */
export type BillingCustomerRow = {
  user_id: string;
  stripe_customer_id: string;
  created_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type StripeEventRow = {
  id: string;
  type: string;
  status: "received" | "processed";
  received_at: string;
};

export type Database = {
  public: {
    Tables: {
      billing_customers: {
        Row: BillingCustomerRow;
        Insert: Omit<BillingCustomerRow, "created_at"> & { created_at?: string };
        Update: Partial<BillingCustomerRow>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: Omit<SubscriptionRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SubscriptionRow>;
        Relationships: [];
      };
      stripe_events: {
        Row: StripeEventRow;
        Insert: Omit<StripeEventRow, "status" | "received_at"> & {
          status?: StripeEventRow["status"];
          received_at?: string;
        };
        Update: Partial<StripeEventRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
