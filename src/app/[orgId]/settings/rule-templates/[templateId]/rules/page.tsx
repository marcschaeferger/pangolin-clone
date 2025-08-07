"use client";

import { useParams } from "next/navigation";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle
} from "@app/components/Settings";
import { TemplateRulesManager } from "@app/components/ruleTemplate/TemplateRulesManager";

export default function RulesPage() {
    const params = useParams();

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle title="Template Rules" />
                </SettingsSectionHeader>
                <TemplateRulesManager
                    orgId={params.orgId as string}
                    templateId={params.templateId as string}
                />
            </SettingsSection>
        </SettingsContainer>
    );
}
