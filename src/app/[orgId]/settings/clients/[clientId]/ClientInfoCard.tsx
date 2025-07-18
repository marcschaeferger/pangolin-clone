"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useClientContext } from "@app/hooks/useClientContext";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";

type ClientInfoCardProps = {};

export default function SiteInfoCard({}: ClientInfoCardProps) {
    const { client, updateClient } = useClientContext();

    return (
        <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-semibold">Client Information</AlertTitle>
            <AlertDescription className="mt-4">
                <InfoSections cols={2}>
                        <>
                            <InfoSection>
                                <InfoSectionTitle>Status</InfoSectionTitle>
                                <InfoSectionContent>
                                    {client.online ? (
                                        <div className="text-green-500 flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span>Online</span>
                                        </div>
                                    ) : (
                                        <div className="text-neutral-500 flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                            <span>Offline</span>
                                        </div>
                                    )}
                                </InfoSectionContent>
                            </InfoSection>
                        </>
                    <InfoSection>
                        <InfoSectionTitle>Address</InfoSectionTitle>
                        <InfoSectionContent>
                            {client.subnet.split("/")[0]}
                        </InfoSectionContent>
                    </InfoSection>
                </InfoSections>
            </AlertDescription>
        </Alert>
    );
}
