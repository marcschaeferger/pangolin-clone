import { redirect } from "next/navigation";

type AccountPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function AccountPage(props: AccountPageProps) {
    const params = await props.params;
    
    // For now, redirect to my-resources as it's the main account feature
    redirect(`/${params.orgId}/account/my-resources`);
} 