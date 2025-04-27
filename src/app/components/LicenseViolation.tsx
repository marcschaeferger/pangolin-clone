// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

"use client";

import { useLicenseStatusContext } from "@app/hooks/useLicenseStatusContext";

export default function LicenseViolation() {
    const { licenseStatus } = useLicenseStatusContext();

    if (!licenseStatus) return null;

    // Show invalid license banner
    if (licenseStatus.isHostLicensed && !licenseStatus.isLicenseValid) {
        return (
            <div className="fixed bottom-0 left-0 right-0 w-full bg-red-500 text-white p-4 text-center z-50">
                <p>
                    Invalid or expired license keys detected. Follow license
                    terms to continue using all features.
                </p>
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
                <p>
                    License Violation: Using {licenseStatus.usedSites} sites
                    exceeds your licensed limit of {licenseStatus.maxSites}{" "}
                    sites. Follow license terms to continue using all features.
                </p>
            </div>
        );
    }

    return null;
}
