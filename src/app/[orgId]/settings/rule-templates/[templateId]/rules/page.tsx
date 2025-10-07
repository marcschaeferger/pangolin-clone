"use client";

import { useParams } from "next/navigation";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody
} from "@app/components/Settings";
import { TemplateRulesManager } from "@app/components/ruleTemplate/TemplateRulesManager";
import { useTranslations } from "next-intl";

export default function RulesPage() {
    const params = useParams();
    const t = useTranslations();

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('ruleTemplates')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Manage the rules for this template. Changes propagate to all assigned resources.
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    <TemplateRulesManager
                        orgId={params.orgId as string}
                        templateId={params.templateId as string}
                    />
                </SettingsSectionBody>
            </SettingsSection>
        </SettingsContainer>
    );
}
