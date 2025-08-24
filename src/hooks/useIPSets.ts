import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api/formatAxiosError";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { IPSet } from '@app/components/ipsets/IPSetManager';

interface UseIPSetsOptions {
    orgId: string;
    t: (key: string) => string;
    onError?: (error: any) => void;
}

interface UseIPSetsReturn {
    ipSets: IPSet[];
    loading: boolean;
    fetchIPSets: () => Promise<void>;
    createIPSet: (data: { name: string; description?: string; ips: string[] }) => Promise<void>; 
    updateIPSet: (ipSetId: string, data: Partial<IPSet>) => Promise<void>; 
    deleteIPSet: (ipSetId: string) => Promise<void>;
    getIPSetById: (id: string) => IPSet | undefined;
    getIPSetByName: (name: string) => IPSet | undefined;
}

export default function useIPSets({ orgId, t, onError }: UseIPSetsOptions): UseIPSetsReturn {
    const api = createApiClient(useEnvContext());
    const [ipSets, setIPSets] = useState<IPSet[]>([]);
    const [loading, setLoading] = useState(false);
    const onErrorRef = useRef(onError);
    const tRef = useRef(t);
    
    useEffect(() => {
        onErrorRef.current = onError;
        tRef.current = t;
    }, [onError, t]);

    const handleError = useCallback((error: any, defaultMessage: string) => {
        console.error(error);
        const errorMessage = formatAxiosError(error, defaultMessage);
        toast({
            variant: "destructive",
            title: tRef.current('error'),
            description: errorMessage
        });
        onErrorRef.current?.(error);
    }, []);

    const fetchIPSets = useCallback(async () => {
        if (!orgId) return;
        
        try {
            setLoading(true);
            const res = await api.get(`/org/${orgId}/ip-sets`);
            if (res.status === 200) {
                setIPSets(res.data.data.ipSets);
            }
        } catch (err) {
            handleError(err, tRef.current('ipSetErrorFetch'));
        } finally {
            setLoading(false);
        }
    }, [orgId, api, handleError]);

    const createIPSet = useCallback(async (data: { name: string; description?: string; ips: string[] }): Promise<void> => {
        try {
            setLoading(true);
            const res = await api.post(`/org/${orgId}/ip-sets`, data);
            if (res.status === 201) {
                await fetchIPSets();
                toast({
                    title: tRef.current('ipSetCreated'),
                    description: tRef.current('ipSetCreatedDescription')
                });
            } else {
                throw new Error(tRef.current('ipSetErrorCreate'));
            }
        } catch (err) {
            handleError(err, tRef.current('ipSetErrorCreate'));
            throw err;
        } finally {
            setLoading(false);
        }
    }, [orgId, api, handleError, fetchIPSets]);

    const updateIPSet = useCallback(
        async (ipSetId: string, data: Partial<IPSet>): Promise<void> => {
            try {
                setLoading(true);
                const res = await api.put(`/org/${orgId}/ip-sets/${ipSetId}`, data);

                if (res.status === 200) {
                    await fetchIPSets();
                    toast({
                        title: tRef.current('ipSetUpdated'),
                        description: tRef.current('ipSetUpdatedDescription')
                    });
                } else {
                    throw new Error(tRef.current('ipSetErrorUpdate'));
                }
            } catch (err) {
                handleError(err, tRef.current('ipSetErrorUpdate'));
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [orgId, api, handleError, fetchIPSets]
    );
    
    const deleteIPSet = useCallback(async (ipSetId: string): Promise<void> => {
        try {
            setLoading(true);
            const res = await api.delete(`/org/${orgId}/ip-sets/${ipSetId}`);
            if (res.status === 200) {
                await fetchIPSets();
                toast({
                    title: tRef.current('ipSetDeleted'),
                    description: tRef.current('ipSetDeletedDescription')
                });
            } else {
                throw new Error(tRef.current('ipSetErrorDelete'));
            }
        } catch (err) {
            handleError(err, tRef.current('ipSetErrorDelete'));
            throw err;
        } finally {
            setLoading(false);
        }
    }, [orgId, api, handleError, fetchIPSets]);

    const getIPSetById = useCallback((id: string): IPSet | undefined => {
        return ipSets.find(ipSet => ipSet.id === id);
    }, [ipSets]);

    const getIPSetByName = useCallback((name: string): IPSet | undefined => {
        return ipSets.find(ipSet => ipSet.name === name);
    }, [ipSets]);

    useEffect(() => {
        if (orgId) {
            fetchIPSets();
        }
    }, [orgId]);

    return {
        ipSets,
        loading,
        fetchIPSets,
        createIPSet,
        updateIPSet,
        deleteIPSet,
        getIPSetById,
        getIPSetByName
    };
}