// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import ApiKeyContext from "@app/contexts/apiKeyContext";
import { useContext } from "react";

export function useApiKeyContext() {
    const context = useContext(ApiKeyContext);
    if (context === undefined) {
        throw new Error(
            "useApiKeyContext must be used within a ApiKeyProvider"
        );
    }
    return context;
}
