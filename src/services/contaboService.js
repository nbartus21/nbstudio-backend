// services/contaboService.js
const CONTABO_API_URL = 'https://api.contabo.com/v1';

class ContaboService {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
  }

  async getAuthToken() {
    try {
      const response = await fetch('https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) throw new Error('Authentication failed');
      
      const data = await response.json();
      this.token = data.access_token;
      return this.token;
    } catch (error) {
      console.error('Contabo authentication error:', error);
      throw error;
    }
  }

  async getInstances() {
    try {
      if (!this.token) {
        await this.getAuthToken();
      }

      const response = await fetch(`${CONTABO_API_URL}/compute/instances`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'x-request-id': crypto.randomUUID(),
        },
      });

      if (!response.ok) throw new Error('Failed to fetch instances');

      const data = await response.json();
      return data.data.map(instance => this.transformInstanceData(instance));
    } catch (error) {
      console.error('Error fetching Contabo instances:', error);
      throw error;
    }
  }

  transformInstanceData(instance) {
    return {
      name: instance.name || `Contabo-${instance.instanceId}`,
      type: 'primary', // Alapértelmezett típus
      provider: {
        name: 'Contabo',
        accountId: this.clientId,
        controlPanelUrl: 'https://my.contabo.com/vps',
      },
      specifications: {
        cpu: `${instance.cpu} vCores`,
        ram: `${instance.ram}GB`,
        storage: {
          total: instance.disk,
          used: 0, // Az API nem ad információt a használt tárhelyről
          type: instance.diskType || 'SSD',
        },
      },
      costs: {
        monthly: instance.pricePerMonth,
        currency: 'EUR',
        billingCycle: 'monthly',
      },
      status: instance.status.toLowerCase(),
      ipAddresses: instance.ipConfig?.v4?.ip || [],
    };
  }
}

export const contaboService = new ContaboService(
  'DE-192917',
  'CKCwx6GfuGtHsoKF84JUPzzwQNbPz2RG'
);