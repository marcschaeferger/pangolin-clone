"use client";

import { useEffect, useState, use } from "react";
import { Trash2, Server, Globe, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import api from "@app/api";
import { AxiosResponse } from "axios";
import { ListTargetsResponse } from "@server/routers/target/listTargets";
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
    FormMessage,
} from "@app/components/ui/form";
import { CreateTargetResponse, updateTarget } from "@server/routers/target";
import {
    ColumnDef,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getCoreRowModel,
    useReactTable,
    flexRender,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@app/components/ui/table";
import { useToast } from "@app/hooks/useToast";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { Target } from "@server/db/schema";
import { useResourceContext } from "@app/hooks/useResourceContext";

const addTargetSchema = z.object({
    ip: z
        .string()
        .regex(
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            "Invalid IP address format"
        ),
    method: z.string(),
    port: z
        .string()
        .refine((val) => !isNaN(Number(val)), {
            message: "Port must be a number",
        })
        .transform((val) => Number(val)),
    protocol: z.string(),
});

type AddTargetFormValues = z.infer<typeof addTargetSchema>;

export default function ReverseProxyTargets(props: {
    params: Promise<{ resourceId: number }>;
}) {
    const params = use(props.params);

    const { toast } = useToast();
    const { resource, updateResource } = useResourceContext();

    const [targets, setTargets] = useState<ListTargetsResponse["targets"]>([]);

    const addTargetForm = useForm({
        resolver: zodResolver(addTargetSchema),
        defaultValues: {
            ip: "",
            method: "http",
            port: "80",
            protocol: "TCP",
        },
    });

    useEffect(() => {
        const fetchSites = async () => {
            const res = await api
                .get<AxiosResponse<ListTargetsResponse>>(
                    `/resource/${params.resourceId}/targets`
                )
                .catch((err) => {
                    console.error(err);
                    toast({
                        variant: "destructive",
                        title: "Failed to fetch targets",
                        description:
                            err.message ||
                            "An error occurred while fetching targets",
                    });
                });

            if (res && res.status === 200) {
                setTargets(res.data.data.targets);
            }
        };
        fetchSites();
    }, []);

    async function addTarget(data: AddTargetFormValues) {
        const res = await api
            .put<AxiosResponse<CreateTargetResponse>>(
                `/resource/${params.resourceId}/target`,
                {
                    ...data,
                    resourceId: undefined,
                }
            )
            .catch((err) => {
                console.error(err);
                toast({
                    variant: "destructive",
                    title: "Failed to add target",
                    description:
                        err.message || "An error occurred while adding target",
                });
            });

        if (res && res.status === 201) {
            setTargets([...targets, res.data.data]);
            addTargetForm.reset();
        }
    }

    const removeTarget = (targetId: number) => {
        api.delete(`/target/${targetId}`)
            .catch((err) => {
                console.error(err);
            })
            .then((res) => {
                setTargets(
                    targets.filter((target) => target.targetId !== targetId)
                );
            });
    };

    async function updateTarget(targetId: number, data: Partial<Target>) {
        setTargets(
            targets.map((target) =>
                target.targetId === targetId ? { ...target, ...data } : target
            )
        );

        const res = await api.post(`/target/${targetId}`, data).catch((err) => {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Failed to update target",
                description:
                    err.message || "An error occurred while updating target",
            });
        });

        if (res && res.status === 200) {
            toast({
                title: "Target updated",
                description: "The target has been updated successfully",
            });
        }
    }

    const columns: ColumnDef<ListTargetsResponse["targets"][0]>[] = [
        {
            accessorKey: "ip",
            header: "IP Address",
            cell: ({ row }) => (
                <Input
                    defaultValue={row.original.ip}
                    onBlur={(e) =>
                        updateTarget(row.original.targetId, {
                            ip: e.target.value,
                        })
                    }
                />
            ),
        },
        {
            accessorKey: "port",
            header: "Port",
            cell: ({ row }) => (
                <Input
                    type="number"
                    defaultValue={row.original.port}
                    onBlur={(e) =>
                        updateTarget(row.original.targetId, {
                            port: parseInt(e.target.value, 10),
                        })
                    }
                />
            ),
        },
        {
            accessorKey: "method",
            header: "Method",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.method}
                    onValueChange={(value) =>
                        updateTarget(row.original.targetId, { method: value })
                    }
                >
                    <SelectTrigger>{row.original.method}</SelectTrigger>
                    <SelectContent>
                        <SelectItem value="http">http</SelectItem>
                        <SelectItem value="https">https</SelectItem>
                    </SelectContent>
                </Select>
            ),
        },
        {
            accessorKey: "protocol",
            header: "Protocol",
            cell: ({ row }) => (
                <Select
                    defaultValue={row.original.protocol!}
                    onValueChange={(value) =>
                        updateTarget(row.original.targetId, { protocol: value })
                    }
                >
                    <SelectTrigger>{row.original.protocol}</SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                    </SelectContent>
                </Select>
            ),
        },
        {
            accessorKey: "enabled",
            header: "Enabled",
            cell: ({ row }) => (
                <Switch
                    defaultChecked={row.original.enabled}
                    onCheckedChange={(val) =>
                        updateTarget(row.original.targetId, { enabled: val })
                    }
                />
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button
                    variant="outline"
                    onClick={() => removeTarget(row.original.targetId)}
                >
                    Delete
                </Button>
            ),
        },
    ];

    const table = useReactTable({
        data: targets,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div>
            {/* <div className="lg:max-w-2xl"> */}
            <div>
                <div className="mb-8">
                    <SettingsSectionTitle
                        title="SSL"
                        description="Setup SSL to secure your connections with LetsEncrypt certificates"
                    />

                    <div className="flex items-center space-x-2">
                        <Switch id="ssl-toggle" />
                        <Label htmlFor="ssl-toggle">Enable SSL (https)</Label>
                    </div>
                </div>

                <div className="mb-8">
                    <SettingsSectionTitle
                        title="Targets"
                        description="Setup targets to route traffic to your services"
                    />

                    <Form {...addTargetForm}>
                        <form
                            onSubmit={addTargetForm.handleSubmit(
                                addTarget as any
                            )}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField
                                    control={addTargetForm.control}
                                    name="ip"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>IP Address</FormLabel>
                                            <FormControl>
                                                <Input id="ip" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Enter the IP address of the
                                                target
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addTargetForm.control}
                                    name="method"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Method</FormLabel>
                                            <FormControl>
                                                <Select
                                                    {...field}
                                                    onValueChange={(value) => {
                                                        addTargetForm.setValue(
                                                            "method",
                                                            value
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger id="method">
                                                        <SelectValue placeholder="Select method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="http">
                                                            HTTP
                                                        </SelectItem>
                                                        <SelectItem value="https">
                                                            HTTPS
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormDescription>
                                                Choose the method for the target
                                                connection
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addTargetForm.control}
                                    name="port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Port</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="port"
                                                    type="number"
                                                    {...field}
                                                    required
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Specify the port number for the
                                                target
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addTargetForm.control}
                                    name="protocol"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Protocol</FormLabel>
                                            <FormControl>
                                                <Select
                                                    {...field}
                                                    onValueChange={(value) => {
                                                        addTargetForm.setValue(
                                                            "protocol",
                                                            value
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger id="protocol">
                                                        <SelectValue placeholder="Select protocol" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UDP">
                                                            UDP
                                                        </SelectItem>
                                                        <SelectItem value="TCP">
                                                            TCP
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormDescription>
                                                Select the protocol used by the
                                                target
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit">Add Target</Button>
                        </form>
                    </Form>
                </div>

                <div className="rounded-md border mt-4">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
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
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
