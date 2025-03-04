// server/routers/crowdsec/getStatus.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../../lib/config';

export const getStatus = async (req: Request, res: Response) => {
  try {
    // Get CrowdSec API URL and key from config
    const crowdsecUrl = config.crowdsec?.apiUrl || 'http://crowdsec:8080';
    const crowdsecApiKey = config.crowdsec?.apiKey || '';
    
    // Check if CrowdSec API is responding
    const metricsResponse = await axios.get(`${crowdsecUrl}/v1/metrics`, {
      headers: {
        'X-Api-Key': crowdsecApiKey
      },
      timeout: 3000 // 3 second timeout
    });
    
    if (metricsResponse.status === 200) {
      // If metrics succeeds, get decisions to include in the status
      try {
        const decisionsResponse = await axios.get(`${crowdsecUrl}/v1/decisions`, {
          headers: {
            'X-Api-Key': crowdsecApiKey
          },
          timeout: 3000
        });
        
        return res.json({
          status: 'online',
          lastChecked: new Date().toISOString(),
          metrics: {
            decisions: decisionsResponse.data?.length || 0,
            bouncers: metricsResponse.data?.bouncers_count || 0,
            machines: metricsResponse.data?.machines_count || 0,
            alerts: metricsResponse.data?.alerts_count || 0
          }
        });
      } catch (decisionError) {
        // If decisions fails but metrics succeeded, still consider it online
        return res.json({
          status: 'online',
          lastChecked: new Date().toISOString(),
          metrics: {
            bouncers: metricsResponse.data?.bouncers_count || 0,
            machines: metricsResponse.data?.machines_count || 0,
            alerts: metricsResponse.data?.alerts_count || 0
          },
          warning: 'Could not fetch decisions'
        });
      }
    }
    
    return res.status(503).json({
      status: 'offline',
      lastChecked: new Date().toISOString(),
      error: 'CrowdSec API responded but with an unexpected status'
    });
  } catch (error) {
    console.error('Error checking CrowdSec status:', error);
    return res.status(503).json({
      status: 'offline',
      lastChecked: new Date().toISOString(),
      error: 'Failed to connect to CrowdSec API'
    });
  }
};
