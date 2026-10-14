type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type OwnedRow = { user_id: string; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      categories: Table<
        OwnedRow & {
          id: string;
          name: string;
          color: string;
          is_default: boolean;
          type: "income" | "expense";
          is_fallback: boolean;
        },
        {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_default?: boolean;
          type: "income" | "expense";
          is_fallback?: boolean;
        }
      >;
      category_rules: Table<
        OwnedRow & {
          id: string;
          category_id: string;
          keywords: string[];
          priority: number;
          is_default: boolean;
        },
        {
          id: string;
          user_id: string;
          category_id: string;
          keywords: string[];
          priority: number;
          is_default?: boolean;
        }
      >;
      transactions: Table<
        OwnedRow & {
          id: string;
          type: "income" | "expense";
          description: string;
          amount_paise: number;
          category_id: string;
          category_source: "suggested" | "manual";
          date: string;
          payment_method: string | null;
          notes: string | null;
          original_amount_paise: number | null;
          original_currency: string | null;
          exchange_rate_date: string | null;
        },
        {
          id: string;
          user_id: string;
          type: "income" | "expense";
          description: string;
          amount_paise: number;
          category_id: string;
          category_source?: "suggested" | "manual";
          date: string;
          payment_method?: string | null;
          notes?: string | null;
          original_amount_paise?: number | null;
          original_currency?: string | null;
          exchange_rate_date?: string | null;
          created_at: string;
          updated_at?: string;
        }
      >;
      recurring_rules: Table<
        OwnedRow & {
          id: string;
          description: string;
          type: "income" | "expense";
          amount_paise: number;
          category_id: string;
          frequency: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
          interval: number | null;
          start_date: string;
          next_due_date: string;
          end_date: string | null;
          active: boolean;
          notes: string | null;
          original_amount_paise: number | null;
          original_currency: string | null;
          exchange_rate_date: string | null;
        },
        {
          id: string;
          user_id: string;
          description: string;
          type: "income" | "expense";
          amount_paise: number;
          category_id: string;
          frequency: "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
          interval?: number | null;
          start_date: string;
          next_due_date: string;
          end_date?: string | null;
          active?: boolean;
          notes?: string | null;
          original_amount_paise?: number | null;
          original_currency?: string | null;
          exchange_rate_date?: string | null;
          created_at: string;
          updated_at?: string;
        }
      >;
      recurring_occurrences: Table<
        OwnedRow & {
          id: string;
          rule_id: string | null;
          scheduled_date: string;
          date: string;
          description: string;
          type: "income" | "expense";
          amount_paise: number;
          category_id: string;
          status: "pending" | "confirmed" | "skipped";
          transaction_id: string | null;
          original_amount_paise: number | null;
          original_currency: string | null;
          exchange_rate_date: string | null;
        },
        {
          id: string;
          user_id: string;
          rule_id?: string | null;
          scheduled_date: string;
          date: string;
          description: string;
          type: "income" | "expense";
          amount_paise: number;
          category_id: string;
          status: "pending" | "confirmed" | "skipped";
          transaction_id?: string | null;
          original_amount_paise?: number | null;
          original_currency?: string | null;
          exchange_rate_date?: string | null;
          created_at: string;
          updated_at?: string;
        }
      >;
      monthly_budgets: Table<
        OwnedRow & {
          id: string;
          year: number;
          month: number;
          overall_limit_paise: number | null;
          original_overall_limit_paise: number | null;
          original_currency: string | null;
          exchange_rate_date: string | null;
        },
        {
          id: string;
          user_id: string;
          year: number;
          month: number;
          overall_limit_paise?: number | null;
          original_overall_limit_paise?: number | null;
          original_currency?: string | null;
          exchange_rate_date?: string | null;
          created_at: string;
          updated_at?: string;
        }
      >;
      budget_allocations: Table<
        { user_id: string; budget_id: string; category_id: string; category_type: "expense"; amount_paise: number; original_amount_paise: number | null; original_currency: string | null; exchange_rate_date: string | null },
        {
          user_id: string;
          budget_id: string;
          category_id: string;
          category_type?: "expense";
          amount_paise: number;
          original_amount_paise?: number | null;
          original_currency?: string | null;
          exchange_rate_date?: string | null;
        }
      >;
      user_preferences: Table<
        {
          user_id: string;
          default_currency: string;
          date_format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
          hide_balances: boolean;
          updated_at: string;
        },
        {
          user_id: string;
          default_currency?: string;
          date_format?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
          hide_balances?: boolean;
          updated_at?: string;
        }
      >;
      finance_migrations: Table<
        {
          user_id: string;
          migration_id: string;
          entity_counts: Record<string, number>;
          imported_at: string;
        },
        {
          user_id: string;
          migration_id: string;
          entity_counts: Record<string, number>;
          imported_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      apply_currency_conversion: {
        Args: { p_changes: Record<string, unknown> };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
