import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_EMAIL } from "@/lib/admin";
import ActivateForm from "./ActivateForm";

// Same gate as /admin/referrals: the signed-in user must be the admin,
// checked on the server against the session.
export default async function AdminPlans() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return <ActivateForm />;
}
