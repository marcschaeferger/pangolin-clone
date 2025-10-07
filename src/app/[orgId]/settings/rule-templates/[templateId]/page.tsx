import { redirect } from "next/navigation";

export default async function RuleTemplatePage(props: {
    params: Promise<{ templateId: string; orgId: string }>;
}) {
    const params = await props.params;
    redirect(
        `/${params.orgId}/settings/rule-templates/${params.templateId}/general`
    );
}
