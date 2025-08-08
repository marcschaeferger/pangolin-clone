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
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@app/components/ui/table";
import { toast } from "@app/hooks/useToast";
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
import { SwitchInput } from "@app/components/SwitchInput";
import { ArrowUpDown, Check, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
    InfoSection,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";
import { InfoPopup } from "@app/components/ui/info-popup";
import {
    isValidCIDR,
    isValidIP,
    isValidUrlGlobPattern
} from "@server/lib/validators";
import { Switch } from "@app/components/ui/switch";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ResourceRulesManager } from "@app/components/ruleTemplate/ResourceRulesManager";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@app/components/ui/dialog";

// Schema for rule validation
const addRuleSchema = z.object({
    action: z.string(),
    match: z.string(),
    value: z.string(),
    priority: z.coerce.number().int().optional()
});

type LocalRule = ArrayElement<ListResourceRulesResponse["rules"]> & {
    new?: boolean;
    updated?: boolean;
};

export default function ResourceRules(props: {
    params: Promise<{ resourceId: number }>;
}) {
    const params = use(props.params);
    const { resource, updateResource } = useResourceContext();
    const api = createApiClient(useEnvContext());
    const [rules, setRules] = useState<LocalRule[]>([]);
    const [rulesToRemove, setRulesToRemove] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [rulesEnabled, setRulesEnabled] = useState(resource.applyRules);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    });
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const router = useRouter();
    const t = useTranslations();


    const RuleAction = {
        ACCEPT: t('alwaysAllow'),
        DROP: t('alwaysDeny')
    } as const;

    const RuleMatch = {
        PATH: t('path'),
        IP: "IP",
        CIDR: t('ipAddressRange')
    } as const;

    const addRuleForm = useForm({
        resolver: zodResolver(addRuleSchema),
        defaultValues: {
            action: "ACCEPT",
            match: "IP",
            value: ""
        }
    });

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
                title: t('rulesErrorFetch'),
                description: formatAxiosError(
                    err,
                    t('rulesErrorFetchDescription')
                )
            });
        } finally {
            setPageLoading(false);
        }
    };

    useEffect(() => {
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
                title: t('rulesErrorDuplicate'),
                description: t('rulesErrorDuplicateDescription')
            });
            return;
        }

        if (data.match === "CIDR" && !isValidCIDR(data.value)) {
            toast({
                variant: "destructive",
                title: t('rulesErrorInvalidIpAddressRange'),
                description: t('rulesErrorInvalidIpAddressRangeDescription')
            });
            setLoading(false);
            return;
        }
        if (data.match === "PATH" && !isValidUrlGlobPattern(data.value)) {
            toast({
                variant: "destructive",
                title: t('rulesErrorInvalidUrl'),
                description: t('rulesErrorInvalidUrlDescription')
            });
            setLoading(false);
            return;
        }
        if (data.match === "IP" && !isValidIP(data.value)) {
            toast({
                variant: "destructive",
                title: t('rulesErrorInvalidIpAddress'),
                description: t('rulesErrorInvalidIpAddressDescription')
            });
            setLoading(false);
            return;
        }

        // find the highest priority and add one
        let priority = data.priority;
        if (priority === undefined) {
            priority = rules.reduce(
                (acc, rule) => (rule.priority > acc ? rule.priority : acc),
                0
            );
            priority++;
        }

        const newRule: LocalRule = {
            ...data,
            ruleId: new Date().getTime(),
            new: true,
            resourceId: resource.resourceId,
            templateRuleId: null,
            priority,
            enabled: true
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

    function getValueHelpText(type: string) {
        switch (type) {
            case "CIDR":
                return t('rulesMatchIpAddressRangeDescription');
            case "IP":
                return t('rulesMatchIpAddress');
            case "PATH":
                return t('rulesMatchUrl');
        }
    }

    async function saveAllSettings() {
        try {
            setLoading(true);

            // Save rules enabled state
            const res = await api
                .post(`/resource/${params.resourceId}`, {
                    applyRules: rulesEnabled
                })
                .catch((err) => {
                    console.error(err);
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorUpdate'),
                        description: formatAxiosError(
                            err,
                            t('rulesErrorUpdateDescription')
                        )
                    });
                    throw err;
                });

            if (res && res.status === 200) {
                updateResource({ applyRules: rulesEnabled });
            }

            // Save rules
            for (let rule of rules) {
                const data = {
                    action: rule.action,
                    match: rule.match,
                    value: rule.value,
                    priority: rule.priority,
                    enabled: rule.enabled
                };

                if (rule.match === "CIDR" && !isValidCIDR(rule.value)) {
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorInvalidIpAddressRange'),
                        description: t('rulesErrorInvalidIpAddressRangeDescription')
                    });
                    setLoading(false);
                    return;
                }
                if (
                    rule.match === "PATH" &&
                    !isValidUrlGlobPattern(rule.value)
                ) {
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorInvalidUrl'),
                        description: t('rulesErrorInvalidUrlDescription')
                    });
                    setLoading(false);
                    return;
                }
                if (rule.match === "IP" && !isValidIP(rule.value)) {
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorInvalidIpAddress'),
                        description: t('rulesErrorInvalidIpAddressDescription')
                    });
                    setLoading(false);
                    return;
                }

                if (rule.priority === undefined) {
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorInvalidPriority'),
                        description: t('rulesErrorInvalidPriorityDescription')
                    });
                    setLoading(false);
                    return;
                }

                // make sure no duplicate priorities
                const priorities = rules.map((r) => r.priority);
                if (priorities.length !== new Set(priorities).size) {
                    toast({
                        variant: "destructive",
                        title: t('rulesErrorDuplicatePriority'),
                        description: t('rulesErrorDuplicatePriorityDescription')
                    });
                    setLoading(false);
                    return;
                }

                if (rule.new) {
                    const res = await api.put(
                        `/resource/${params.resourceId}/rule`,
                        data
                    );
                    rule.ruleId = res.data.data.ruleId;
                } else if (rule.updated) {
                    await api.post(
                        `/resource/${params.resourceId}/rule/${rule.ruleId}`,
                        data
                    );
                }

                setRules([
                    ...rules.map((r) => {
                        let res = {
                            ...r,
                            new: false,
                            updated: false
                        };
                        return res;
                    })
                ]);
            }

            for (const ruleId of rulesToRemove) {
                await api.delete(
                    `/resource/${params.resourceId}/rule/${ruleId}`
                );
                setRules(rules.filter((r) => r.ruleId !== ruleId));
            }

            toast({
                title: t('ruleUpdated'),
                description: t('ruleUpdatedDescription')
            });

            setRulesToRemove([]);
            router.refresh();
        } catch (err) {
            console.error(err);
            toast({
                variant: "destructive",
                title: t('ruleErrorUpdate'),
                description: formatAxiosError(
                    err,
                    t('ruleErrorUpdateDescription')
                )
            });
        }
        setLoading(false);
    }

    const columns: ColumnDef<LocalRule>[] = [
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
                                title: t('rulesErrorInvalidIpAddress'), // correct priority or IP?
                                description: t('rulesErrorInvalidPriorityDescription')
                            });
                            setLoading(false);
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
            cell: ({ row }) => {
                const isTemplateRule = row.original.templateRuleId !== null;
                return (
                    <Select
                        defaultValue={row.original.action}
                        onValueChange={(value: "ACCEPT" | "DROP") =>
                            updateRule(row.original.ruleId, { action: value })
                        }
                        disabled={isTemplateRule}
                    >
                        <SelectTrigger className={`min-w-[150px] ${isTemplateRule ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACCEPT">
                                {RuleAction.ACCEPT}
                            </SelectItem>
                            <SelectItem value="DROP">{RuleAction.DROP}</SelectItem>
                        </SelectContent>
                    </Select>
                );
            }
        },
        {
            accessorKey: "match",
            header: t('rulesMatchType'),
            cell: ({ row }) => {
                const isTemplateRule = row.original.templateRuleId !== null;
                return (
                    <Select
                        defaultValue={row.original.match}
                        onValueChange={(value: "CIDR" | "IP" | "PATH") =>
                            updateRule(row.original.ruleId, { match: value })
                        }
                        disabled={isTemplateRule}
                    >
                        <SelectTrigger className={`min-w-[125px] ${isTemplateRule ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PATH">{RuleMatch.PATH}</SelectItem>
                            <SelectItem value="IP">{RuleMatch.IP}</SelectItem>
                            <SelectItem value="CIDR">{RuleMatch.CIDR}</SelectItem>
                        </SelectContent>
                    </Select>
                );
            }
        },
        {
            accessorKey: "value",
            header: t('value'),
            cell: ({ row }) => {
                const isTemplateRule = row.original.templateRuleId !== null;
                return (
                    <Input
                        defaultValue={row.original.value}
                        className={`min-w-[200px] ${isTemplateRule ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onBlur={(e) =>
                            updateRule(row.original.ruleId, {
                                value: e.target.value
                            })
                        }
                        disabled={isTemplateRule}
                    />
                );
            }
        },
        {
            accessorKey: "enabled",
            header: t('enabled'),
            cell: ({ row }) => {
                const isTemplateRule = row.original.templateRuleId !== null;
                return (
                    <Switch
                        defaultChecked={row.original.enabled}
                        onCheckedChange={(val) =>
                            updateRule(row.original.ruleId, { enabled: val })
                        }
                        disabled={isTemplateRule}
                        className={isTemplateRule ? 'opacity-50' : ''}
                    />
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const isTemplateRule = row.original.templateRuleId !== null;
                return (
                    <div className="flex items-center justify-end space-x-2">
                        {isTemplateRule ? (
                            <div className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                                Template
                            </div>
                        ) : (
                            <div className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
                                Manual
                            </div>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => removeRule(row.original.ruleId)}
                            disabled={isTemplateRule}
                            className={isTemplateRule ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {t('delete')}
                        </Button>
                    </div>
                );
            }
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

    if (pageLoading) {
        return <></>;
    }

    return (
        <SettingsContainer>
            {/* 1. Enabled Rules Control & How it works */}
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('rulesEnable')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('rulesEnableDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    <div className="flex items-center space-x-2">
                        <SwitchInput
                            id="rules-toggle"
                            label={t('rulesEnable')}
                            defaultChecked={rulesEnabled}
                            onCheckedChange={(val) => setRulesEnabled(val)}
                        />
                    </div>
                    <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-3 text-sm text-muted-foreground">
                            {t('rulesAboutDescription')}
                        </div>
                        <InfoSections cols={2}>
                            <InfoSection>
                                <InfoSectionTitle>{t('rulesActions')}</InfoSectionTitle>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li className="flex items-center gap-2">
                                        <Check className="text-green-500 w-4 h-4" />
                                        {t('rulesActionAlwaysAllow')}
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <X className="text-red-500 w-4 h-4" />
                                        {t('rulesActionAlwaysDeny')}
                                    </li>
                                </ul>
                            </InfoSection>
                            <InfoSection>
                                <InfoSectionTitle>{t('rulesMatchCriteria')}</InfoSectionTitle>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li className="flex items-center gap-2">
                                        {t('rulesMatchCriteriaIpAddress')}
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {t('rulesMatchCriteriaIpAddressRange')}
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {t('rulesMatchCriteriaUrl')}
                                    </li>
                                </ul>
                            </InfoSection>
                        </InfoSections>
                    </div>
                </SettingsSectionBody>
            </SettingsSection>

            {/* 2. Rule Templates Section */}
            {rulesEnabled && (
                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            {t('ruleTemplates')}
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            {t('ruleTemplatesDescription')}
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>
                    <SettingsSectionBody>
                        <ResourceRulesManager
                            resourceId={params.resourceId.toString()}
                            orgId={resource.orgId}
                            onUpdate={fetchRules}
                        />
                    </SettingsSectionBody>
                </SettingsSection>
            )}

            {/* 3. Resource Rules Configuration */}
            {rulesEnabled && (
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('rulesResource')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('rulesResourceDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    <div className="flex justify-end">
                        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary">{t('ruleSubmit')}</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('ruleSubmit')}</DialogTitle>
                                    <DialogDescription>
                                        {t('rulesResourceDescription')}
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...addRuleForm}>
                                    <form
                                        onSubmit={addRuleForm.handleSubmit(async (data) => {
                                            await addRule(data);
                                            setCreateDialogOpen(false);
                                        })}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={addRuleForm.control}
                                                name="action"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('rulesAction')}</FormLabel>
                                                        <FormControl>
                                                            <Select
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                            >
                                                                <SelectTrigger className="w-full">
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
                                                control={addRuleForm.control}
                                                name="match"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('rulesMatchType')}</FormLabel>
                                                        <FormControl>
                                                            <Select
                                                                value={field.value}
                                                                onValueChange={field.onChange}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {resource.http && (
                                                                        <SelectItem value="PATH">{RuleMatch.PATH}</SelectItem>
                                                                    )}
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
                                                control={addRuleForm.control}
                                                name="value"
                                                render={({ field }) => (
                                                    <FormItem className="gap-1 md:col-span-2">
                                                        <InfoPopup
                                                            text={t('value')}
                                                            info={getValueHelpText(addRuleForm.watch('match')) || ''}
                                                        />
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">{t('ruleSubmit')}</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>

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
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        {t('rulesNoOne')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

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
                                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
                </SettingsSectionBody>
            </SettingsSection>
            )}

            <div className="flex justify-end">
                <Button onClick={saveAllSettings} loading={loading} disabled={loading}>
                    {t('saveAllSettings')}
                </Button>
            </div>
        </SettingsContainer>
    );
}
