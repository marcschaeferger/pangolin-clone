// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

"use client";

import { DataTable } from "@app/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    addApiKey?: () => void;
}

export function OrgApiKeysDataTable<TData, TValue>({
    addApiKey,
    columns,
    data
}: DataTableProps<TData, TValue>) {

    const t = useTranslations();

    return (
        <DataTable
            columns={columns}
            data={data}
            title={t('apiKeys')}
            searchPlaceholder={t('searchApiKeys')}
            searchColumn="name"
            onAdd={addApiKey}
            addButtonText={t('apiKeysAdd')}
        />
    );
}
