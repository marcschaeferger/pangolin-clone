"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@app/hooks/useToast";
import { Trash2 } from "lucide-react";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { ConfirmationDialog } from "@app/components/ConfirmationDialog";

interface RuleTemplate {
    templateId: string;
    name: string;
    description: string;
    orgId: string;
    createdAt: string;
}

interface ResourceTemplate {
    templateId: string;
    name: string;
    description: string;
    orgId: string;
    createdAt: string;
}

export function ResourceRulesManager({ 
    resourceId, 
    orgId,
    onUpdate
}: { 
    resourceId: string; 
    orgId: string;
    onUpdate?: () => Promise<void>;
}) {
    const [templates, setTemplates] = useState<RuleTemplate[]>([]);
    const [resourceTemplates, setResourceTemplates] = useState<ResourceTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
    const [templateToUnassign, setTemplateToUnassign] = useState<string | null>(null);
    const [unassigning, setUnassigning] = useState(false);
    const { toast } = useToast();
    const { env } = useEnvContext();
    const api = createApiClient({ env });

    useEffect(() => {
        fetchData();
    }, [resourceId, orgId]);

    const fetchData = async () => {
        try {
            const [templatesRes, resourceTemplatesRes] = await Promise.all([
                api.get(`/org/${orgId}/rule-templates`),
                api.get(`/resource/${resourceId}/templates`)
            ]);

            if (templatesRes.status === 200) {
                setTemplates(templatesRes.data.data.templates || []);
            }
            if (resourceTemplatesRes.status === 200) {
                setResourceTemplates(resourceTemplatesRes.data.data.templates || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: formatAxiosError(error, "Failed to fetch data"),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignTemplate = async (templateId: string) => {
        if (!templateId) return;
        
        try {
            const response = await api.put(`/resource/${resourceId}/templates/${templateId}`);

            if (response.status === 200 || response.status === 201) {
                toast({
                    title: "Template Assigned",
                    description: "Template has been assigned to this resource. All template rules have been applied and will be automatically updated when the template changes.",
                    variant: "default"
                });
                
                setSelectedTemplate("");
                await fetchData();
                if (onUpdate) {
                    await onUpdate();
                }
            } else {
                toast({
                    title: "Error",
                    description: response.data.message || "Failed to assign template",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error, "Failed to assign template"),
                variant: "destructive"
            });
        }
    };

    const handleUnassignTemplate = async (templateId: string) => {
        setTemplateToUnassign(templateId);
        setUnassignDialogOpen(true);
    };

    const confirmUnassignTemplate = async () => {
        if (!templateToUnassign) return;
        
        setUnassigning(true);
        try {
            const response = await api.delete(`/resource/${resourceId}/templates/${templateToUnassign}`);

            if (response.status === 200 || response.status === 201) {
                toast({
                    title: "Template Unassigned",
                    description: "Template has been unassigned from this resource. All template-managed rules have been removed from this resource.",
                    variant: "default"
                });
                
                await fetchData();
                if (onUpdate) {
                    await onUpdate();
                }
            } else {
                toast({
                    title: "Unassign Failed",
                    description: response.data.message || "Failed to unassign template. Please try again.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Unassign Failed",
                description: formatAxiosError(error, "Failed to unassign template. Please try again."),
                variant: "destructive"
            });
        } finally {
            setUnassigning(false);
            setTemplateToUnassign(null);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedTemplate}
                        onValueChange={(value) => {
                            setSelectedTemplate(value);
                            handleAssignTemplate(value);
                        }}
                    >
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Select a template to assign" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map((template) => (
                                <SelectItem key={template.templateId} value={template.templateId}>
                                    {template.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {resourceTemplates.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="font-medium">Assigned Templates</h4>
                        <div className="space-y-2">
                            {resourceTemplates.map((template) => (
                                <div
                                    key={template.templateId}
                                    className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{template.name}</span>
                                        {template.description && (
                                            <span className="text-sm text-muted-foreground">{template.description}</span>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnassignTemplate(template.templateId)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Unassign
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationDialog
                open={unassignDialogOpen}
                onOpenChange={setUnassignDialogOpen}
                title="Unassign Template"
                description="Are you sure you want to unassign this template? This will remove all template-managed rules from this resource. This action cannot be undone."
                confirmText="Unassign Template"
                cancelText="Cancel"
                variant="destructive"
                onConfirm={confirmUnassignTemplate}
                loading={unassigning}
            />
        </div>
    );
}
