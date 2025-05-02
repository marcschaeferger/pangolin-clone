// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import { GetApiKeyResponse } from "@server/routers/apiKeys";
import { createContext } from "react";

interface ApiKeyContextType {
    apiKey: GetApiKeyResponse;
    updateApiKey: (updatedApiKey: Partial<GetApiKeyResponse>) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export default ApiKeyContext;
