"use client";

import { Button } from "@app/components/ui/button";
import { useLicenseStatusContext } from "@app/hooks/useLicenseStatusContext";
import { useState } from "react";

export default function LicenseViolation() {
    const { licenseStatus } = useLicenseStatusContext();
    const [isDismissed, setIsDismissed] = useState(false);

    if (!licenseStatus || isDismissed) return null;

    // Show invalid license banner
    if (licenseStatus.isHostLicensed && !licenseStatus.isLicenseValid) {
        return (
            <div className="fixed bottom-0 left-0 right-0 w-full bg-red-500 text-white p-4 text-center z-50">
                <div className="flex justify-between items-center">
                    <p>
                        Invalid or expired license keys detected. Follow license
                        terms to continue using all features.
                    </p>
                    <Button
                        variant={"ghost"}
                        className="hover:bg-yellow-500"
                        onClick={() => setIsDismissed(true)}
                    >
                        Dismiss
                    </Button>
                </div>
            </div>
        );
    }

    // Show usage violation banner
    if (
        licenseStatus.maxSites &&
        licenseStatus.usedSites &&
        licenseStatus.usedSites > licenseStatus.maxSites
    ) {
        return (
            <div className="fixed bottom-0 left-0 right-0 w-full bg-yellow-500 text-black p-4 text-center z-50">
                <div className="flex justify-between items-center">
                    <p>
                        License Violation: This server is using{" "}
                        {licenseStatus.usedSites} sites which exceeds its
                        licensed limit of {licenseStatus.maxSites} sites. Follow
                        license terms to continue using all features.
                    </p>
                    <Button
                        variant={"ghost"}
                        className="hover:bg-yellow-500"
                        onClick={() => setIsDismissed(true)}
                    >
                        Dismiss
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
