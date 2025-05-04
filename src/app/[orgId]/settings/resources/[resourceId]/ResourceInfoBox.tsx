"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, InfoIcon, ShieldCheck, ShieldOff } from "lucide-react";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { Separator } from "@app/components/ui/separator";
import CopyToClipboard from "@app/components/CopyToClipboard";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";
import Link from "next/link";
import { Switch } from "@app/components/ui/switch";
import { useTranslations } from 'next-intl';

type ResourceInfoBoxType = {};

export default function ResourceInfoBox({}: ResourceInfoBoxType) {
    const { resource, authInfo } = useResourceContext();
    const t = useTranslations();

    let fullUrl = `${resource.ssl ? "https" : "http"}://${resource.fullDomain}`;

    return (
        <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-semibold">
                {t('resourceInfo')}
            </AlertTitle>
            <AlertDescription className="mt-4">
                <InfoSections cols={4}>
                    {resource.http ? (
                        <>
                            <InfoSection>
                                <InfoSectionTitle>
                                    {t('authentication')}
                                </InfoSectionTitle>
                                <InfoSectionContent>
                                    {authInfo.password ||
                                    authInfo.pincode ||
                                    authInfo.sso ||
                                    authInfo.whitelist ? (
                                        <div className="flex items-start space-x-2 text-green-500">
                                            <ShieldCheck className="w-4 h-4 mt-0.5" />
                                            <span>{t('protected')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2 text-yellow-500">
                                            <ShieldOff className="w-4 h-4" />
                                            <span>{t('notProtected')}</span>
                                        </div>
                                    )}
                                </InfoSectionContent>
                            </InfoSection>
                            <InfoSection>
                                <InfoSectionTitle>URL</InfoSectionTitle>
                                <InfoSectionContent>
                                    <CopyToClipboard
                                        text={fullUrl}
                                        isLink={true}
                                    />
                                </InfoSectionContent>
                            </InfoSection>
                            <InfoSection>
                                <InfoSectionTitle>{t('site')}</InfoSectionTitle>
                                <InfoSectionContent>
                                    {resource.siteName}
                                </InfoSectionContent>
                            </InfoSection>
                        </>
                    ) : (
                        <>
                            <InfoSection>
                                <InfoSectionTitle>{t('protocol')}</InfoSectionTitle>
                                <InfoSectionContent>
                                    <span>
                                        {resource.protocol.toUpperCase()}
                                    </span>
                                </InfoSectionContent>
                            </InfoSection>
                            <InfoSection>
                                <InfoSectionTitle>{t('port')}</InfoSectionTitle>
                                <InfoSectionContent>
                                    <CopyToClipboard
                                        text={resource.proxyPort!.toString()}
                                        isLink={false}
                                    />
                                </InfoSectionContent>
                            </InfoSection>
                        </>
                    )}
                    <InfoSection>
                        <InfoSectionTitle>{t('visibility')}</InfoSectionTitle>
                        <InfoSectionContent>
                            <span>{resource.enabled ? t('enabled') : t('disabled')}</span>
                        </InfoSectionContent>
                    </InfoSection>
                </InfoSections>
            </AlertDescription>
        </Alert>
    );
}
