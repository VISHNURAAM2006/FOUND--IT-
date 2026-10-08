import { redirect } from "next/navigation";
import { isAuthenticatedAdmin } from "@/lib/admin-auth";

export default async function AdminRootPage() {
  const isAuth = await isAuthenticatedAdmin();
  if (isAuth) {
    redirect("/admin/dashboard");
  } else {
    redirect("/admin/login");
  }
}
