// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import { LicenseStatus } from "@server/license/license";
import { createContext } from "react";

type LicenseStatusContextType = {
    licenseStatus: LicenseStatus | null;
    updateLicenseStatus: (updatedSite: LicenseStatus) => void;
    isLicenseViolation: () => boolean;
    isUnlocked: () => boolean;
};

const LicenseStatusContext = createContext<
    LicenseStatusContextType | undefined
>(undefined);

export default LicenseStatusContext;
