"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";
import { useTranslations } from "next-intl";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createShareLink?: () => void;
}

export function ShareLinksDataTable<TData, TValue>({
    columns,
    data,
    createShareLink
}: DataTableProps<TData, TValue>) {

    const t = useTranslations();

    return (
        <DataTable
            columns={columns}
            data={data}
            title={t('shareLinks')}
            searchPlaceholder={t('shareSearch')}
            searchColumn="name"
            onAdd={createShareLink}
            addButtonText={t('shareCreate')}
        />
    );
}
