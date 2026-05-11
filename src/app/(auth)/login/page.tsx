import { redirect } from "next/navigation";
import { AuthForm } from "@/components/layout/AuthForm";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (!hasSupabaseEnv()) {
    return <AuthForm mode="login" />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/");

  return <AuthForm mode="login" />;
}
