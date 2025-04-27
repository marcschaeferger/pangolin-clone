// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import LicenseStatusContext from "@app/contexts/licenseStatusContext";
import { useContext } from "react";

export function useLicenseStatusContext() {
    const context = useContext(LicenseStatusContext);
    if (context === undefined) {
        throw new Error(
            "useLicenseStatusContext must be used within an LicenseStatusProvider"
        );
    }
    return context;
}
