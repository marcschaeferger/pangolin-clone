"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useSiteContext } from "@app/hooks/useSiteContext";
import { Separator } from "@app/components/ui/separator";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";

type SiteInfoCardProps = {};

export default function SiteInfoCard({}: SiteInfoCardProps) {
    const { site, updateSite } = useSiteContext();

    const getConnectionTypeString = (type: string) => {
        if (type === "newt") {
            return "Newt";
        } else if (type === "wireguard") {
            return "WireGuard";
        } else if (type === "local") {
            return "Local";
        } else {
            return "Unknown";
        }
    };

    return (
        <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-semibold">Site Information</AlertTitle>
            <AlertDescription className="mt-4">
                <InfoSections>
                    {(site.type == "newt" || site.type == "wireguard") && (
                        <>
                            <InfoSection>
                                <InfoSectionTitle>Status</InfoSectionTitle>
                                <InfoSectionContent>
                                    {site.online ? (
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

                            <Separator orientation="vertical" />
                        </>
                    )}
                    <InfoSection>
                        <InfoSectionTitle>Connection Type</InfoSectionTitle>
                        <InfoSectionContent>
                            {getConnectionTypeString(site.type)}
                        </InfoSectionContent>
                    </InfoSection>
                </InfoSections>
            </AlertDescription>
        </Alert>
    );
}
