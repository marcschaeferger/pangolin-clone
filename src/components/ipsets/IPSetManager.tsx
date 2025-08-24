import React, { useState } from 'react';
import CreateIPSetDialog from "./CreateIPSetDialog";
import ManageIPSetsDialog from "./ManageIPSetsDialog";
import EditIPSetDialog from "./EditIPSetDialog";
import useIPSets from "@app/hooks/useIPSets";

export type IPSet = {
    id: string;
    name: string;
    description?: string;
    ips: string[];
    createdAt: string;
    updatedAt: string;
};

interface IPSetManagerProps {
    orgId: string;
    t: (key: string) => string;
    onIPSetsChange?: (ipSets: IPSet[]) => void;
}

export default function IPSetManager({ orgId, t, onIPSetsChange }: IPSetManagerProps) {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [manageDialogOpen, setManageDialogOpen] = useState(false);
    const [ipSetToEdit, setIPSetToEdit] = useState<IPSet | null>(null);

    const {
        ipSets,
        loading,
        createIPSet,
        updateIPSet,
        deleteIPSet,
    } = useIPSets({
        orgId,
        t,
        onError: (error) => console.error('IP Sets error:', error),
    });

    // keep parent informed if needed
    React.useEffect(() => {
        if (onIPSetsChange) {
            onIPSetsChange(ipSets);
        }
    }, [ipSets, onIPSetsChange]);

    return (
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-medium">{t('ipSets')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t('ipSetsDescription')}
                </p>
            </div>
            <div className="flex space-x-2">
                <ManageIPSetsDialog
                    open={manageDialogOpen}
                    onOpenChange={setManageDialogOpen}
                    ipSets={ipSets}
                    onEdit={setIPSetToEdit}
                    onDelete={deleteIPSet}
                    loading={loading}
                    t={t}
                />

                <CreateIPSetDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    onCreate={createIPSet}
                    loading={loading}
                    t={t}
                />

                {ipSetToEdit && (
                    <EditIPSetDialog
                        open={!!ipSetToEdit}
                        onOpenChange={() => setIPSetToEdit(null)}
                        ipSet={ipSetToEdit}
                        onSave={(data) => updateIPSet(ipSetToEdit.id, data)}
                        loading={loading}
                        t={t}
                    />
                )}
            </div>
        </div>
    );
}