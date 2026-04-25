import { redirect } from "next/navigation";

// Super admin login is now handled by the unified /login page
export default function SuperAdminLoginPage() {
  redirect("/login");
}
