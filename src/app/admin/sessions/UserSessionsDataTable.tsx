"use client";

import {
    ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { useTranslations } from "next-intl";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function UserSessionsDataTable<TData, TValue>({
    columns,
    data
}: DataTableProps<TData, TValue>) {

    const t = useTranslations();

    return (
        <DataTable
            columns={columns}
            data={data}
            title="Active User Sessions"
            searchPlaceholder="Search by username or email..."
            searchColumn="username"
        />
    );
}