import { redirect } from "next/navigation";
import { AuthForm } from "@/components/layout/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/");

  return <AuthForm mode="login" />;
}
