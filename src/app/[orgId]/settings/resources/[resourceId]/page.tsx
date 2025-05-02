import { redirect } from "next/navigation";

export default async function ResourcePage(props: {
    params: Promise<{ resourceId: number | string; orgId: string }>;
}) {
    const params = await props.params;
    redirect(
        `/${params.orgId}/settings/resources/${params.resourceId}/proxy`
    );
}
