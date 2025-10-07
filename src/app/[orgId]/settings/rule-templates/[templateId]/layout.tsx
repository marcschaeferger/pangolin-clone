import { internal } from "@app/lib/api";
import { GetRuleTemplateResponse } from "@server/routers/ruleTemplate";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/lib/api/cookies";
import { HorizontalTabs } from "@app/components/HorizontalTabs";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { GetOrgResponse } from "@server/routers/org";
import OrgProvider from "@app/providers/OrgProvider";
import { cache } from "react";
import { getTranslations } from 'next-intl/server';

interface RuleTemplateLayoutProps {
    children: React.ReactNode;
    params: Promise<{ templateId: string; orgId: string }>;
}

export default async function RuleTemplateLayout(props: RuleTemplateLayoutProps) {
    const params = await props.params;
    const t = await getTranslations();

    const { children } = props;

    let template = null;
    try {
        const res = await internal.get<AxiosResponse<GetRuleTemplateResponse>>(
            `/org/${params.orgId}/rule-templates/${params.templateId}`,
            await authCookieHeader()
        );
        template = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/rule-templates`);
    }

    if (!template) {
        redirect(`/${params.orgId}/settings/rule-templates`);
    }

    let org = null;
    try {
        const getOrg = cache(async () =>
            internal.get<AxiosResponse<GetOrgResponse>>(
                `/org/${params.orgId}`,
                await authCookieHeader()
            )
        );
        const res = await getOrg();
        org = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/rule-templates`);
    }

    if (!org) {
        redirect(`/${params.orgId}/settings/rule-templates`);
    }

    const navItems = [
        {
            title: t('general'),
            href: `/{orgId}/settings/rule-templates/{templateId}/general`
        },
        {
            title: t('rules'),
            href: `/{orgId}/settings/rule-templates/{templateId}/rules`
        }
    ];

    return (
        <>
            <SettingsSectionTitle
                title={t('ruleTemplateSetting', {templateName: template?.name})}
                description={t('ruleTemplateSettingDescription')}
            />

            <OrgProvider org={org}>
                <div className="space-y-6">
                    <HorizontalTabs items={navItems}>
                        {children}
                    </HorizontalTabs>
                </div>
            </OrgProvider>
        </>
    );
}
