import { redirect } from "next/navigation";

type OrgPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function Page(props: OrgPageProps) {
    const params = await props.params;
    redirect(`/${params.orgId}/sites`);

    return <></>;
}
