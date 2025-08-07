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
import { ArrowUpDown, Trash2 } from "lucide-react";

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

            await api.post(`/org/${orgId}/rule-templates/${templateId}/rules`, data);
            toast({
                title: "Success",
                description: "Rule added successfully"
            });
            form.reset();
            fetchRules();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: formatAxiosError(error, "Failed to add rule")
            });
        } finally {
            setAddingRule(false);
        }
    };

    const removeRule = async (ruleId: number) => {
        try {
            await api.delete(`/org/${orgId}/rule-templates/${templateId}/rules/${ruleId}`);
            toast({
                title: "Success",
                description: "Rule removed successfully"
            });
            fetchRules();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: formatAxiosError(error, "Failed to remove rule")
            });
        }
    };

    const updateRule = async (ruleId: number, data: Partial<TemplateRule>) => {
        try {
            await api.put(`/org/${orgId}/rule-templates/${templateId}/rules/${ruleId}`, data);
            fetchRules();
        } catch (error) {
            console.error("Failed to update rule:", error);
        }
    };

    const columns: ColumnDef<TemplateRule>[] = [
        {
            accessorKey: "priority",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Priority
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <Input
                    type="number"
                    defaultValue={row.original.priority}
                    className="w-20"
                    onBlur={(e) =>
                        updateRule(row.original.ruleId, {
                            priority: parseInt(e.target.value, 10)
                        })
                    }
                />
            )
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.action}
                    onValueChange={(value) =>
                        updateRule(row.original.ruleId, { action: value })
                    }
                >
                    <SelectTrigger className="w-24">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACCEPT">Accept</SelectItem>
                        <SelectItem value="DROP">Drop</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
        {
            accessorKey: "match",
            header: "Match",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.match}
                    onValueChange={(value) =>
                        updateRule(row.original.ruleId, { match: value })
                    }
                >
                    <SelectTrigger className="w-24">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="IP">IP</SelectItem>
                        <SelectItem value="CIDR">CIDR</SelectItem>
                        <SelectItem value="PATH">Path</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
        {
            accessorKey: "value",
            header: "Value",
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
            header: "Enabled",
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
                    size="sm"
                    onClick={() => removeRule(row.original.ruleId)}
                >
                    <Trash2 className="h-4 w-4" />
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
            pagination: {
                pageIndex: 0,
                pageSize: 1000
            }
        }
    });

    if (loading) {
        return <div>Loading rules...</div>;
    }

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(addRule)} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="action"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Action</FormLabel>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACCEPT">Accept</SelectItem>
                                                <SelectItem value="DROP">Drop</SelectItem>
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
                                    <FormLabel>Match</FormLabel>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IP">IP</SelectItem>
                                                <SelectItem value="CIDR">CIDR</SelectItem>
                                                <SelectItem value="PATH">Path</SelectItem>
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
                                <FormItem>
                                    <FormLabel>Value</FormLabel>
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
                                    <FormLabel>Priority (optional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Auto"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" variant="secondary" disabled={addingRule}>
                        {addingRule ? "Adding Rule..." : "Add Rule"}
                    </Button>
                </form>
            </Form>

            <div className="rounded-md border">
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
        </div>
    );
}
