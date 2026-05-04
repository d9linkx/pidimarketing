# Project Rules for Supabase & SQL

- **Database Types**: All ID columns are native `UUID` types.
- **No Text Casting**: Never use `::text` when comparing `auth.uid()` or IDs in SQL policies.
- **SQL Syntax**: When creating RLS policies, never group actions with commas (e.g., `FOR INSERT, UPDATE`). Use `FOR ALL` instead.
- **RLS Bypass**: For admin-level backend functions, use the `service_role` key.