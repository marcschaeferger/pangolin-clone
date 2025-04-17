"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";
import { useRouter } from "next/navigation";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export function IdpDataTable<TData, TValue>({
    columns,
    data
}: DataTableProps<TData, TValue>) {
    const router = useRouter();

    return (
        <DataTable
            columns={columns}
            data={data}
            title="Identity Providers"
            searchPlaceholder="Search identity providers..."
            searchColumn="name"
            addButtonText="Add Identity Provider"
            onAdd={() => {
                router.push("/admin/idp/create");
            }}
        />
    );
}
