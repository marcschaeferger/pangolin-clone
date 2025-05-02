// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import { redirect } from "next/navigation";

export default async function ApiKeysPage(props: {
    params: Promise<{ orgId: string; apiKeyId: string }>;
}) {
    const params = await props.params;
    redirect(`/${params.orgId}/settings/api-keys/${params.apiKeyId}/permissions`);
}
