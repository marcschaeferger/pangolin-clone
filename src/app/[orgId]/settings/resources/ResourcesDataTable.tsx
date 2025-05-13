"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createResource?: () => void;
}

export function ResourcesDataTable<TData, TValue>({
    columns,
    data,
    createResource
}: DataTableProps<TData, TValue>) {
    return (
        <DataTable
            columns={columns}
            data={data}
            title="Resources"
            searchPlaceholder="Search resources..."
            searchColumn="name"
            onAdd={createResource}
            addButtonText="Add Resource"
            defaultSort={{
                id: "name",
                desc: false
            }}
        />
    );
}
