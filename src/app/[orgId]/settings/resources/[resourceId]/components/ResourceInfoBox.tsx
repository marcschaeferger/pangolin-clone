"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    InfoIcon,
    LinkIcon,
    CheckIcon,
    CopyIcon,
    ShieldCheck,
    ShieldOff
} from "lucide-react";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useResourceContext } from "@app/hooks/useResourceContext";
import Link from "next/link";

type ResourceInfoBoxType = {};

export default function ResourceInfoBox({}: ResourceInfoBoxType) {
    const [copied, setCopied] = useState(false);

    const { org } = useOrgContext();
    const { resource, authInfo } = useResourceContext();

    const fullUrl = `${resource.ssl ? "https" : "http"}://${
        resource.subdomain
    }.${org.org.domain}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className="font-semibold">
                Resource Information
            </AlertTitle>
            <AlertDescription className="mt-3">
                <div className="space-y-3">
                    <div>
                        {authInfo.password ||
                        authInfo.pincode ||
                        authInfo.sso ||
                        authInfo.whitelist ? (
                            <div className="flex items-center space-x-2 text-green-500">
                                <ShieldCheck />
                                <span>
                                    This resource is protected with at least one
                                    auth method.
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-yellow-500">
                                <ShieldOff />
                                <span>
                                    This resource is not protected with any auth
                                    method. Anyone can access this resource.
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 bg-muted p-1 pl-3 rounded-md">
                        <LinkIcon className="h-4 w-4" />
                        <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono flex-grow hover:underline truncate"
                        >
                            {fullUrl}
                        </a>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={copyToClipboard}
                            className="ml-2"
                            type="button"
                        >
                            {copied ? (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                            ) : (
                                <CopyIcon className="h-4 w-4" />
                            )}
                            <span className="ml-2">
                                {copied ? "Copied!" : "Copy"}
                            </span>
                        </Button>
                    </div>

                    {/* <p className="mt-3">
                        To create a proxy to your private services,{" "}
                        <Link
                            href={`/${org.org.orgId}/settings/resources/${resource.resourceId}/connectivity`}
                            className="text-primary hover:underline"
                        >
                            add targets
                        </Link>{" "}
                        to this resource
                    </p> */}
                </div>
            </AlertDescription>
        </Alert>
    );
}
