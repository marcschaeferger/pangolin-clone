"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { formatAxiosError } from "@app/lib/api";
import { toast } from "@app/hooks/useToast";
import { Button } from "@app/components/ui/button";
import { Input } from "@app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { Switch } from "@app/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import {
    ColumnDef,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getCoreRowModel,
    useReactTable,
    flexRender
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@app/components/ui/table";
import { isValidCIDR, isValidIP, isValidUrlGlobPattern } from "@server/lib/validators";
import { ArrowUpDown, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { ConfirmationDialog } from "@app/components/ConfirmationDialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@app/components/ui/dialog";

const addRuleSchema = z.object({
    action: z.enum(["ACCEPT", "DROP"]),
    match: z.enum(["CIDR", "IP", "PATH"]),
    value: z.string().min(1),
    priority: z.coerce.number().int().optional()
});

type TemplateRule = {
    ruleId: number;
    templateId: string;
    enabled: boolean;
    priority: number;
    action: string;
    match: string;
    value: string;
};

type TemplateRulesManagerProps = {
    templateId: string;
    orgId: string;
};

export function TemplateRulesManager({ templateId, orgId }: TemplateRulesManagerProps) {
    const t = useTranslations();
    const api = createApiClient(useEnvContext());
    const [rules, setRules] = useState<TemplateRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingRule, setAddingRule] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
    const [deletingRule, setDeletingRule] = useState(false);

    const RuleAction = {
        ACCEPT: t('alwaysAllow'),
        DROP: t('alwaysDeny')
    } as const;

    const RuleMatch = {
        PATH: t('path'),
        IP: "IP",
        CIDR: t('ipAddressRange')
    } as const;

    const form = useForm<z.infer<typeof addRuleSchema>>({
        resolver: zodResolver(addRuleSchema),
        defaultValues: {
            action: "ACCEPT",
            match: "IP",
            value: "",
            priority: undefined
        }
    });

    const fetchRules = async () => {
        try {
            const response = await api.get(`/org/${orgId}/rule-templates/${templateId}/rules`);
            setRules(response.data.data.rules);
        } catch (error) {
            console.error("Failed to fetch template rules:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: formatAxiosError(error, "Failed to fetch template rules")
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, [templateId, orgId]);

    const addRule = async (data: z.infer<typeof addRuleSchema>) => {
        try {
            setAddingRule(true);
            
            // Validate the value based on match type
            if (data.match === "CIDR" && !isValidCIDR(data.value)) {
                toast({
                    variant: "destructive",
                    title: "Invalid CIDR format",
                    description: "Please enter a valid CIDR notation (e.g., 192.168.1.0/24)"
                });
                return;
            }
            if (data.match === "IP" && !isValidIP(data.value)) {
                toast({
                    variant: "destructive",
                    title: "Invalid IP address",
                    description: "Please enter a valid IP address"
                });
                return;
            }
            if (data.match === "PATH" && !isValidUrlGlobPattern(data.value)) {
                toast({
                    variant: "destructive",
                    title: "Invalid URL pattern",
                    description: "Please enter a valid URL pattern"
                });
                return;
            }

            const response = await api.post(`/org/${orgId}/rule-templates/${templateId}/rules`, data);
            toast({
                title: "Template Rule Added",
                description: "A new rule has been added to the template. It will be available for assignment to resources.",
                variant: "default"
            });
            form.reset();
            fetchRules();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Add Rule Failed",
                description: formatAxiosError(error, "Failed to add rule. Please check your input and try again.")
            });
        } finally {
            setAddingRule(false);
        }
    };

    const removeRule = async (ruleId: number) => {
        setRuleToDelete(ruleId);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteRule = async () => {
        if (!ruleToDelete) return;
        
        setDeletingRule(true);
        try {
            await api.delete(`/org/${orgId}/rule-templates/${templateId}/rules/${ruleToDelete}`);
            toast({
                title: "Template Rule Removed",
                description: "The rule has been removed from the template and from all assigned resources.",
                variant: "default"
            });
            fetchRules();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Removal Failed",
                description: formatAxiosError(error, "Failed to remove template rule")
            });
        } finally {
            setDeletingRule(false);
            setRuleToDelete(null);
        }
    };

    const updateRule = async (ruleId: number, data: Partial<TemplateRule>) => {
        try {
            const response = await api.put(`/org/${orgId}/rule-templates/${templateId}/rules/${ruleId}`, data);
            
            // Show success notification with propagation info if available
            const message = response.data?.message || "The template rule has been updated and changes have been propagated to all assigned resources.";
            toast({
                title: "Template Rule Updated",
                description: message,
                variant: "default"
            });
            
            fetchRules();
        } catch (error) {
            console.error("Failed to update rule:", error);
            toast({
                title: "Update Failed",
                description: formatAxiosError(error, "Failed to update template rule. Please try again."),
                variant: "destructive"
            });
        }
    };

    const columns: ColumnDef<TemplateRule>[] = [
        {
            accessorKey: "priority",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        {t('rulesPriority')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <Input
                    defaultValue={row.original.priority}
                    className="w-[75px]"
                    type="number"
                    onBlur={(e) => {
                        const parsed = z.coerce
                            .number()
                            .int()
                            .optional()
                            .safeParse(e.target.value);

                        if (!parsed.data) {
                            toast({
                                variant: "destructive",
                                title: t('rulesErrorInvalidIpAddress'),
                                description: t('rulesErrorInvalidPriorityDescription')
                            });
                            return;
                        }

                        updateRule(row.original.ruleId, {
                            priority: parsed.data
                        });
                    }}
                />
            )
        },
        {
            accessorKey: "action",
            header: t('rulesAction'),
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.action}
                    onValueChange={(value: "ACCEPT" | "DROP") =>
                        updateRule(row.original.ruleId, { action: value })
                    }
                >
                    <SelectTrigger className="min-w-[150px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACCEPT">
                            {RuleAction.ACCEPT}
                        </SelectItem>
                        <SelectItem value="DROP">{RuleAction.DROP}</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
        {
            accessorKey: "match",
            header: t('rulesMatchType'),
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.match}
                    onValueChange={(value: "CIDR" | "IP" | "PATH") =>
                        updateRule(row.original.ruleId, { match: value })
                    }
                >
                    <SelectTrigger className="min-w-[125px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PATH">{RuleMatch.PATH}</SelectItem>
                        <SelectItem value="IP">{RuleMatch.IP}</SelectItem>
                        <SelectItem value="CIDR">{RuleMatch.CIDR}</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
        {
            accessorKey: "value",
            header: t('value'),
            cell: ({ row }) => (
                <Input
                    defaultValue={row.original.value}
                    className="min-w-[200px]"
                    onBlur={(e) =>
                        updateRule(row.original.ruleId, { value: e.target.value })
                    }
                />
            )
        },
        {
            accessorKey: "enabled",
            header: t('enabled'),
            cell: ({ row }) => (
                <Switch
                    defaultChecked={row.original.enabled}
                    onCheckedChange={(val) =>
                        updateRule(row.original.ruleId, { enabled: val })
                    }
                />
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button
                    variant="outline"
                    onClick={() => removeRule(row.original.ruleId)}
                >
                    {t('delete')}
                </Button>
            )
        }
    ];

    const table = useReactTable({
        data: rules,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            pagination
        },
        onPaginationChange: setPagination,
        manualPagination: false
    });

    if (loading) {
        return <div className="text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary" disabled={addingRule}>
                            {addingRule ? "Adding Rule..." : t('ruleSubmit')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('ruleSubmit')}</DialogTitle>
                            <DialogDescription>
                                {t('rulesResourceDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(async (data) => {
                                    await addRule(data);
                                    setCreateDialogOpen(false);
                                })}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="action"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('rulesAction')}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ACCEPT">{RuleAction.ACCEPT}</SelectItem>
                                                            <SelectItem value="DROP">{RuleAction.DROP}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="match"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('rulesMatchType')}</FormLabel>
                                                <FormControl>
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PATH">{RuleMatch.PATH}</SelectItem>
                                                            <SelectItem value="IP">{RuleMatch.IP}</SelectItem>
                                                            <SelectItem value="CIDR">{RuleMatch.CIDR}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel>{t('value')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter value" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priority"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('rulesPriority')} (optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Auto" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" variant="secondary" disabled={addingRule}>
                                        {addingRule ? "Adding Rule..." : t('ruleSubmit')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No rules found. Add your first rule above.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {rules.length > 0 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="flex-1 text-sm text-muted-foreground">
                        Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            table.getFilteredRowModel().rows.length
                        )}{" "}
                        of {table.getFilteredRowModel().rows.length} rules
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => {
                                    table.setPageSize(Number(value));
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 25, 50, 100].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to first page</span>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to last page</span>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Template Rule"
                description="Are you sure you want to delete this rule? This action will remove the rule from the template and from all assigned resources. This action cannot be undone."
                confirmText="Delete Rule"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={confirmDeleteRule}
                loading={deletingRule}
            />
        </div>
    );
}
