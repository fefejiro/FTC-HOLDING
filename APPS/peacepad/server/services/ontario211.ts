// 211 Ontario API Integration Service
// Documentation: https://211ontario.ca/api/
// Endpoint: https://api211.portal.azure-api.net

interface Ontario211Resource {
  id: string;
  name: string;
  organization?: string;
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  categories?: string[];
  serviceArea?: string;
  languages?: string[];
  hours?: string;
  accessibility?: string[];
}

interface Ontario211SearchParams {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
  keywords?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export class Ontario211Service {
  private apiKey: string;
  private baseUrl: string = 'https://api211.portal.azure-api.net';

  constructor() {
    this.apiKey = process.env.ONTARIO_211_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async searchResources(params: Ontario211SearchParams): Promise<Ontario211Resource[]> {
    if (!this.isConfigured()) {
      console.log('[211 Ontario] API key not configured, skipping external API call');
      return [];
    }

    try {
      const queryParams = new URLSearchParams();
      
      if (params.latitude && params.longitude) {
        queryParams.append('lat', params.latitude.toString());
        queryParams.append('lng', params.longitude.toString());
      }
      
      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
      }
      
      if (params.keywords) {
        queryParams.append('keywords', params.keywords);
      }
      
      if (params.category) {
        queryParams.append('category', params.category);
      }
      
      queryParams.append('limit', (params.limit || 20).toString());

      const response = await fetch(`${this.baseUrl}/search?${queryParams.toString()}`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[211 Ontario] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return this.transformResults(data.results || data.records || data);
    } catch (error) {
      console.error('[211 Ontario] Error fetching resources:', error);
      return [];
    }
  }

  private transformResults(results: any[]): Ontario211Resource[] {
    return results.map((item: any) => ({
      id: item.id || item.recordId || `211-${Date.now()}-${Math.random()}`,
      name: item.name || item.serviceName || item.organizationName,
      organization: item.organizationName || item.agencyName,
      description: item.description || item.serviceDescription || '',
      phone: item.phone || item.phoneNumber || item.contact?.phone,
      email: item.email || item.contact?.email,
      website: item.website || item.url,
      address: item.address || item.physicalAddress?.address1,
      city: item.city || item.physicalAddress?.city,
      province: item.province || item.physicalAddress?.province || 'ON',
      postalCode: item.postalCode || item.physicalAddress?.postalCode,
      latitude: item.latitude?.toString() || item.location?.latitude?.toString(),
      longitude: item.longitude?.toString() || item.location?.longitude?.toString(),
      categories: item.categories || item.taxonomies || [],
      serviceArea: item.serviceArea || item.coverage,
      languages: item.languages || [],
      hours: item.hours || item.hoursOfOperation,
      accessibility: item.accessibility || [],
    }));
  }

  // Map PeacePad categories to 211 Ontario taxonomy codes
  getCategoryKeywords(category: string): string {
    const categoryMap: Record<string, string> = {
      'crisis': 'crisis intervention domestic violence hotline',
      'shelter': 'emergency shelter domestic violence shelter',
      'legal': 'legal aid family law',
      'therapy': 'counseling therapy mental health',
      'support_groups': 'support groups peer support',
    };
    
    return categoryMap[category] || category;
  }
}

export const ontario211Service = new Ontario211Service();
