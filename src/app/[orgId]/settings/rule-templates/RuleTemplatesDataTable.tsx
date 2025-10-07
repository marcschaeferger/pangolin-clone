"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@app/components/ui/data-table";
import { useTranslations } from 'next-intl';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    createTemplate?: () => void;
}

export function RuleTemplatesDataTable<TData, TValue>({
    columns,
    data,
    createTemplate
}: DataTableProps<TData, TValue>) {

    const t = useTranslations();

    return (
        <DataTable
            columns={columns}
            data={data}
            title={t('ruleTemplates')}
            searchPlaceholder={t('ruleTemplatesSearch')}
            searchColumn="name"
            onAdd={createTemplate}
            addButtonText={t('ruleTemplateAdd')}
            defaultSort={{
                id: "name",
                desc: false
            }}
        />
    );
}
