"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DomainsDataTable } from "./DomainsDataTable";
import { Button } from "@app/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Badge } from "@app/components/ui/badge";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import CreateDomainForm from "./CreateDomainForm";
import { useToast } from "@app/hooks/useToast";
import { useOrgContext } from "@app/hooks/useOrgContext";

export type DomainRow = {
    domainId: string;
    baseDomain: string;
    type: string;
    verified: boolean;
    failed: boolean;
    tries: number;
    configManaged: boolean;
};

type Props = {
    domains: DomainRow[];
};

export default function DomainsTable({ domains }: Props) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<DomainRow | null>(
        null
    );
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [restartingDomains, setRestartingDomains] = useState<Set<string>>(
        new Set()
    );
    const api = createApiClient(useEnvContext());
    const router = useRouter();
    const t = useTranslations();
    const { toast } = useToast();
    const { org } = useOrgContext();

    const refreshData = async () => {
        setIsRefreshing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 200));
            router.refresh();
        } catch (error) {
            toast({
                title: t("error"),
                description: t("refreshError"),
                variant: "destructive"
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const deleteDomain = async (domainId: string) => {
        try {
            await api.delete(`/org/${org.org.orgId}/domain/${domainId}`);
            toast({
                title: t("success"),
                description: t("domainDeletedDescription")
            });
            setIsDeleteModalOpen(false);
            refreshData();
        } catch (e) {
            toast({
                title: t("error"),
                description: formatAxiosError(e),
                variant: "destructive"
            });
        }
    };

    const restartDomain = async (domainId: string) => {
        setRestartingDomains((prev) => new Set(prev).add(domainId));
        try {
            await api.post(`/org/${org.org.orgId}/domain/${domainId}/restart`);
            toast({
                title: t("success"),
                description: t("domainRestartedDescription", {
                    fallback: "Domain verification restarted successfully"
                })
            });
            refreshData();
        } catch (e) {
            toast({
                title: t("error"),
                description: formatAxiosError(e),
                variant: "destructive"
            });
        } finally {
            setRestartingDomains((prev) => {
                const newSet = new Set(prev);
                newSet.delete(domainId);
                return newSet;
            });
        }
    };

    const getTypeDisplay = (type: string) => {
        switch (type) {
            case "ns":
                return t("selectDomainTypeNsName");
            case "cname":
                return t("selectDomainTypeCnameName");
            case "wildcard":
                return t("selectDomainTypeWildcardName");
            default:
                return type;
        }
    };

    const columns: ColumnDef<DomainRow>[] = [
        {
            accessorKey: "baseDomain",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        {t("domain")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            }
        },
        {
            accessorKey: "type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        {t("type")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const type = row.original.type;
                return (
                    <Badge variant="secondary">{getTypeDisplay(type)}</Badge>
                );
            }
        },
        {
            accessorKey: "verified",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        {t("status")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const { verified, failed } = row.original;
                if (verified) {
                    return <Badge variant="green">{t("verified")}</Badge>;
                } else if (failed) {
                    return (
                        <Badge variant="destructive">
                            {t("failed", { fallback: "Failed" })}
                        </Badge>
                    );
                } else {
                    return <Badge variant="yellow">{t("pending")}</Badge>;
                }
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const domain = row.original;
                const isRestarting = restartingDomains.has(domain.domainId);

                return (
                    <div className="flex items-center justify-end gap-2">
                        {domain.failed && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restartDomain(domain.domainId)}
                                disabled={isRestarting}
                            >
                                {isRestarting
                                    ? t("restarting", {
                                          fallback: "Restarting..."
                                      })
                                    : t("restart", { fallback: "Restart" })}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={domain.configManaged}
                            onClick={() => {
                                setSelectedDomain(domain);
                                setIsDeleteModalOpen(true);
                            }}
                        >
                            {t("delete")}
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <>
            {selectedDomain && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelectedDomain(null);
                    }}
                    dialog={
                        <div className="space-y-4">
                            <p>
                                {t("domainQuestionRemove", {
                                    domain: selectedDomain.baseDomain
                                })}
                            </p>
                            <p>
                                <b>{t("domainMessageRemove")}</b>
                            </p>
                            <p>{t("domainMessageConfirm")}</p>
                        </div>
                    }
                    buttonText={t("domainConfirmDelete")}
                    onConfirm={async () =>
                        deleteDomain(selectedDomain.domainId)
                    }
                    string={selectedDomain.baseDomain}
                    title={t("domainDelete")}
                />
            )}

            <CreateDomainForm
                open={isCreateModalOpen}
                setOpen={setIsCreateModalOpen}
                onCreated={(domain) => {
                    refreshData();
                }}
            />

            <DomainsDataTable
                columns={columns}
                data={domains}
                onAdd={() => setIsCreateModalOpen(true)}
                onRefresh={refreshData}
                isRefreshing={isRefreshing}
            />
        </>
    );
}
