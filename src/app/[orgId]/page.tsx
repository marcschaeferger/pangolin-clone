import { redirect } from "next/navigation";

type OrgPageProps = {
    params: { orgId: string };
};

export default async function Page({ params }: OrgPageProps) {
    redirect(`/${params.orgId}/sites`);

    return <></>;
}
