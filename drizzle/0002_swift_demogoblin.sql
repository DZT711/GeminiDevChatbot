ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_nodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
CREATE POLICY "users can see their own accounts" ON "accounts" AS PERMISSIVE FOR SELECT TO public USING ("accounts"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users can manage their own knowledge" ON "knowledge_nodes" AS PERMISSIVE FOR ALL TO public USING ("knowledge_nodes"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users can view messages in their sessions" ON "messages" AS PERMISSIVE FOR SELECT TO public USING (exists (select 1 from sessions s where s.id = "messages"."session_id" and s.user_id = current_setting('app.current_user_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users can insert messages in their sessions" ON "messages" AS PERMISSIVE FOR INSERT TO public WITH CHECK (exists (select 1 from sessions s where s.id = "messages"."session_id" and s.user_id = current_setting('app.current_user_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users can delete messages in their sessions" ON "messages" AS PERMISSIVE FOR DELETE TO public USING (exists (select 1 from sessions s where s.id = "messages"."session_id" and s.user_id = current_setting('app.current_user_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "users can manage their own sessions" ON "sessions" AS PERMISSIVE FOR ALL TO public USING ("sessions"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users can see their own data" ON "users" AS PERMISSIVE FOR SELECT TO public USING ("users"."id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "users can update their own data" ON "users" AS PERMISSIVE FOR UPDATE TO public USING ("users"."id" = current_setting('app.current_user_id', true)::uuid);