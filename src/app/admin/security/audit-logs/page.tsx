"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { toast } from "@app/hooks/useToast";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody
} from "@app/components/Settings";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@app/components/ui/table";
import { Button } from "@app/components/ui/button";
import { Input } from "@app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { formatAxiosError } from "@app/lib/api";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { InfoIcon, Download } from "lucide-react";

type AuditLogEntry = {
    timestamp: string;
    action: string;
    userId?: string;
    orgId?: string;
    targetEmail?: string;
    inviteId?: string;
    roleId?: number;
    ip?: string;
    success: boolean;
    error?: string;
};

export default function AuditLogsPage() {
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const t = useTranslations();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [actionFilter, searchTerm, page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/audit-logs", {
                params: {
                    action: actionFilter === "all" ? undefined : actionFilter,
                    search: searchTerm || undefined,
                    page
                }
            });
            setLogs(response.data.data.logs);
            setTotalPages(response.data.data.totalPages);
        } catch (error) {
            toast({
                variant: "destructive",
                title: t("errorFetchingAuditLogs"),
                description: formatAxiosError(error)
            });
        } finally {
            setLoading(false);
        }
    };

    const downloadLogs = async () => {
        try {
            const response = await api.get("/admin/audit-logs/download", {
                responseType: "blob"
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast({
                variant: "destructive",
                title: t("errorDownloadingAuditLogs"),
                description: formatAxiosError(error)
            });
        }
    };

    return (
        <SettingsContainer>
            <Alert className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>{t("auditLogsInfo")}</AlertTitle>
                <AlertDescription>
                    {t("auditLogsDescription")}
                </AlertDescription>
            </Alert>

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>{t("auditLogs")}</SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t("viewAuditLogsDescription")}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <div className="flex items-center gap-4 mb-4">
                        <Input
                            placeholder={t("searchLogs")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("filterByAction")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("allActions")}</SelectItem>
                                <SelectItem value="invite.create">{t("inviteCreate")}</SelectItem>
                                <SelectItem value="invite.regenerate">{t("inviteRegenerate")}</SelectItem>
                                <SelectItem value="invite.delete">{t("inviteDelete")}</SelectItem>
                                <SelectItem value="invite.accept">{t("inviteAccept")}</SelectItem>
                                <SelectItem value="invite.expire">{t("inviteExpire")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            className="ml-auto"
                            onClick={downloadLogs}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            {t("downloadLogs")}
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("timestamp")}</TableHead>
                                    <TableHead>{t("action")}</TableHead>
                                    <TableHead>{t("user")}</TableHead>
                                    <TableHead>{t("organization")}</TableHead>
                                    <TableHead>{t("target")}</TableHead>
                                    <TableHead>{t("status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>{t(log.action)}</TableCell>
                                        <TableCell>{log.userId || "-"}</TableCell>
                                        <TableCell>{log.orgId || "-"}</TableCell>
                                        <TableCell>{log.targetEmail || log.inviteId || "-"}</TableCell>
                                        <TableCell>
                                            <span className={log.success ? "text-green-500" : "text-red-500"}>
                                                {log.success ? t("success") : t("failed")}
                                                {log.error && ` - ${log.error}`}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            {t("previous")}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {t("pageXofY", { current: page, total: totalPages })}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            {t("next")}
                        </Button>
                    </div>
                </SettingsSectionBody>
            </SettingsSection>
        </SettingsContainer>
    );
} 