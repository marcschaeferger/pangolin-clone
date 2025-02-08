"use client";
import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AxiosResponse } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormDescription,
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
    TableContainer,
    TableHead,
    TableHeader,
    TableRow
} from "@app/components/ui/table";
import { useToast } from "@app/hooks/useToast";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { ArrayElement } from "@server/types/ArrayElement";
import { formatAxiosError } from "@app/lib/api/formatAxiosError";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { createApiClient } from "@app/lib/api";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody,
    SettingsSectionFooter
} from "@app/components/Settings";
import { ListResourceRulesResponse } from "@server/routers/resource/listResourceRules";

// Schema for rule validation
const addRuleSchema = z.object({
    action: z.string(),
    match: z.string(),
    value: z.string()
});

type LocalRule = ArrayElement<ListResourceRulesResponse["rules"]> & {
    new?: boolean;
    updated?: boolean;
};

export default function ResourceRules(props: {
    params: Promise<{ resourceId: number }>;
}) {
    const params = use(props.params);
    const { toast } = useToast();
    const { resource } = useResourceContext();
    const api = createApiClient(useEnvContext());
    const [rules, setRules] = useState<LocalRule[]>([]);
    const [rulesToRemove, setRulesToRemove] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const addRuleForm = useForm({
        resolver: zodResolver(addRuleSchema),
        defaultValues: {
            action: "ACCEPT",
            match: "CIDR",
            value: ""
        }
    });

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const res = await api.get<
                    AxiosResponse<ListResourceRulesResponse>
                >(`/resource/${params.resourceId}/rules`);
                if (res.status === 200) {
                    setRules(res.data.data.rules);
                }
            } catch (err) {
                console.error(err);
                toast({
                    variant: "destructive",
                    title: "Failed to fetch rules",
                    description: formatAxiosError(
                        err,
                        "An error occurred while fetching rules"
                    )
                });
            } finally {
                setPageLoading(false);
            }
        };
        fetchRules();
    }, []);

    async function addRule(data: z.infer<typeof addRuleSchema>) {
        const isDuplicate = rules.some(
            (rule) =>
                rule.action === data.action &&
                rule.match === data.match &&
                rule.value === data.value
        );

        if (isDuplicate) {
            toast({
                variant: "destructive",
                title: "Duplicate rule",
                description: "A rule with these settings already exists"
            });
            return;
        }

        if (data.match === "CIDR" && !isValidCIDR(data.value)) {
            toast({
                variant: "destructive",
                title: "Invalid CIDR",
                description: "Please enter a valid CIDR value"
            });
            setLoading(false);
            return;
        }
        if (data.match === "PATH" && !isValidUrlGlobPattern(data.value)) {
            toast({
                variant: "destructive",
                title: "Invalid URL path",
                description: "Please enter a valid URL path value"
            });
            setLoading(false);
            return;
        }

        const newRule: LocalRule = {
            ...data,
            ruleId: new Date().getTime(),
            new: true,
            resourceId: resource.resourceId
        };

        setRules([...rules, newRule]);
        addRuleForm.reset();
    }

    const removeRule = (ruleId: number) => {
        setRules([...rules.filter((rule) => rule.ruleId !== ruleId)]);
        if (!rules.find((rule) => rule.ruleId === ruleId)?.new) {
            setRulesToRemove([...rulesToRemove, ruleId]);
        }
    };

    async function updateRule(ruleId: number, data: Partial<LocalRule>) {
        setRules(
            rules.map((rule) =>
                rule.ruleId === ruleId
                    ? { ...rule, ...data, updated: true }
                    : rule
            )
        );
    }

    async function saveRules() {
        try {
            setLoading(true);
            for (let rule of rules) {
                const data = {
                    action: rule.action,
                    match: rule.match,
                    value: rule.value
                };

                if (rule.match === "CIDR" && !isValidCIDR(rule.value)) {
                    toast({
                        variant: "destructive",
                        title: "Invalid CIDR",
                        description: "Please enter a valid CIDR value"
                    });
                    setLoading(false);
                    return;
                }
                if (rule.match === "PATH" && !isValidUrlGlobPattern(rule.value)) {
                    toast({
                        variant: "destructive",
                        title: "Invalid URL path",
                        description: "Please enter a valid URL path value"
                    });
                    setLoading(false);
                    return;
                }

                if (rule.new) {
                    await api.put(`/resource/${params.resourceId}/rule`, data);
                } else if (rule.updated) {
                    await api.post(
                        `/resource/${params.resourceId}/rule/${rule.ruleId}`,
                        data
                    );
                }
            }

            for (const ruleId of rulesToRemove) {
                await api.delete(
                    `/resource/${params.resourceId}/rule/${ruleId}`
                );
            }

            setRules(
                rules.map((rule) => ({ ...rule, new: false, updated: false }))
            );
            setRulesToRemove([]);

            toast({
                title: "Rules updated",
                description: "Rules updated successfully"
            });
        } catch (err) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Operation failed",
                description: formatAxiosError(
                    err,
                    "An error occurred during the save operation"
                )
            });
        }
        setLoading(false);
    }

    const columns: ColumnDef<LocalRule>[] = [
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.action}
                    onValueChange={(value: "ACCEPT" | "DROP") =>
                        updateRule(row.original.ruleId, { action: value })
                    }
                >
                    <SelectTrigger className="min-w-[100px]">
                        {row.original.action}
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACCEPT">ACCEPT</SelectItem>
                        <SelectItem value="DROP">DROP</SelectItem>
                    </SelectContent>
                </Select>
            )
        },
        {
            accessorKey: "match",
            header: "Match Type",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.match}
                    onValueChange={(value: "CIDR" | "PATH") =>
                        updateRule(row.original.ruleId, { match: value })
                    }
                >
                    <SelectTrigger className="min-w-[100px]">
                        {row.original.match}
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CIDR">CIDR</SelectItem>
                        <SelectItem value="PATH">PATH</SelectItem>
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
                        updateRule(row.original.ruleId, {
                            value: e.target.value
                        })
                    }
                />
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => removeRule(row.original.ruleId)}
                    >
                        Delete
                    </Button>
                </div>
            )
        }
    ];

    const table = useReactTable({
        data: rules,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel()
    });

    if (pageLoading) {
        return <></>;
    }

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        Resource Rules Configuration
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Configure rules to control access to your resource
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    <Form {...addRuleForm}>
                        <form
                            onSubmit={addRuleForm.handleSubmit(addRule)}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={addRuleForm.control}
                                    name="action"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Action</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ACCEPT">
                                                            ACCEPT
                                                        </SelectItem>
                                                        <SelectItem value="DROP">
                                                            DROP
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addRuleForm.control}
                                    name="match"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Match Type</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="CIDR">
                                                            CIDR
                                                        </SelectItem>
                                                        <SelectItem value="PATH">
                                                            PATH
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addRuleForm.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Value</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>
                                                Enter CIDR or path value based
                                                on match type
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                Add Rule
                            </Button>
                        </form>
                    </Form>
                    <TableContainer>
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column
                                                              .columnDef.header,
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
                                            {row
                                                .getVisibleCells()
                                                .map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column
                                                                .columnDef.cell,
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
                                            No rules. Add a rule using the form.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </SettingsSectionBody>
                <SettingsSectionFooter>
                    <Button
                        onClick={saveRules}
                        loading={loading}
                        disabled={loading}
                    >
                        Save Rules
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
}

function isValidCIDR(cidr: string): boolean {
    // Match CIDR pattern (e.g., "192.168.0.0/24")
    const cidrPattern =
        /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;

    if (!cidrPattern.test(cidr)) {
        return false;
    }

    // Validate IP address part
    const ipPart = cidr.split("/")[0];
    const octets = ipPart.split(".");

    return octets.every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });
}

function isValidUrlGlobPattern(pattern: string): boolean {
    // Remove leading slash if present
    pattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
    
    // Empty string is not valid
    if (!pattern) {
      return false;
    }
  
    // Split path into segments
    const segments = pattern.split('/');
    
    // Check each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Empty segments are not allowed (double slashes)
      if (!segment && i !== segments.length - 1) {
        return false;
      }
      
      // If segment contains *, it must be exactly *
      if (segment.includes('*') && segment !== '*') {
        return false;
      }
      
      // Check for invalid characters
      if (!/^[a-zA-Z0-9_*-]*$/.test(segment)) {
        return false;
      }
    }
    
    return true;
  }