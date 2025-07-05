import { redirect } from "next/navigation";

export default async function SecurityPage() {
    redirect("/admin/security/audit-logs");
    return null;
} 