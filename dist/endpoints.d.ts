/**
 * Endpoint definitions for the Kalendis API
 * Each endpoint is audited against the actual service implementation
 */
export interface EndpointDefinition {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    description: string;
    params?: Record<string, {
        type: 'string' | 'number' | 'boolean';
        required: boolean;
        description: string;
    }>;
    body?: Record<string, {
        type: string;
        required: boolean;
        description: string;
    }>;
    response: {
        type: string;
        description: string;
    };
    headers: string[];
}
export declare const ENDPOINTS: Record<string, EndpointDefinition>;
//# sourceMappingURL=endpoints.d.ts.map