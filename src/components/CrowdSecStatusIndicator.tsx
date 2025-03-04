// src/components/CrowdSecStatusIndicator.tsx
import { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { api } from '@/lib/api';

type CrowdSecStatus = {
  status: 'online' | 'offline';
  lastChecked: string;
  metrics?: {
    decisions?: number;
    bouncers?: number;
    machines?: number;
    alerts?: number;
  };
  error?: string;
  warning?: string;
};

export const CrowdSecStatusIndicator = () => {
  const [status, setStatus] = useState<CrowdSecStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
      const response = await api.get('/crowdsec/status');
      setStatus(response.data);
    } catch (error) {
      setStatus({
        status: 'offline',
        lastChecked: new Date().toISOString(),
        error: 'Failed to fetch CrowdSec status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check status immediately on mount
    checkStatus();
    
    // Then check periodically
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Badge variant="outline">CrowdSec: Loading...</Badge>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`cursor-help ${status?.status === 'online' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
          >
            CrowdSec: {status?.status === 'online' ? 'Online' : 'Offline'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="p-2">
            <p>Last checked: {new Date(status?.lastChecked || '').toLocaleString()}</p>
            {status?.status === 'online' && status.metrics && (
              <>
                {status.metrics.decisions !== undefined && (
                  <p>Active decisions: {status.metrics.decisions}</p>
                )}
                {status.metrics.bouncers !== undefined && (
                  <p>Connected bouncers: {status.metrics.bouncers}</p>
                )}
                {status.metrics.alerts !== undefined && (
                  <p>Total alerts: {status.metrics.alerts}</p>
                )}
              </>
            )}
            {status?.warning && <p className="text-yellow-500">Warning: {status.warning}</p>}
            {status?.error && <p className="text-red-500">Error: {status.error}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
