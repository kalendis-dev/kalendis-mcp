/**
 * Simple client generator for Kalendis API
 * Generates TypeScript clients with correct x-api-key authentication
 */

import { ENDPOINTS, EndpointDefinition } from '../endpoints';
import { convertToLocalTime } from '@kalendis/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export const BASE_URLS = {
  production: 'https://api.kalendis.dev',
  staging: 'https://dev-303703761.us-central1.run.app',
  development: process.env.KALENDIS_API_URL || 'https://sandbox.api.kalendis.dev',
} as const;;

export type Environment = keyof typeof BASE_URLS;
export type Framework = 'react' | 'nextjs' | 'express' | 'vanilla' | 'fastify' | 'nestjs';

export interface GenerateOptions {
  framework: Framework;
  environment: Environment;
  typesImportPath?: string;
  outputDir?: string;
}

function needsTimezoneConversion(methodName: string): boolean {
  return (
    methodName.includes('Availability') ||
    methodName.includes('Booking') ||
    methodName.includes('availability') ||
    methodName.includes('booking')
  );
}

function mapResponseType(type: string, useTypes: boolean = true): string {
  if (!useTypes) return type;

  if (type.includes('[]')) {
    const baseType = type.replace('[]', '');
    if (isKnownType(baseType)) {
      return `Types.${baseType}[]`;
    }
    return `${baseType}[]`;
  }

  if (type.startsWith('Array<')) {
    const innerType = type.slice(6, -1);
    if (isKnownType(innerType)) {
      return `Types.${innerType}[]`;
    }
    return type;
  }

  if (isKnownType(type)) {
    return `Types.${type}`;
  }

  if (type.startsWith('{') && type.endsWith('}')) {
    return type;
  }

  return type;
}

function isKnownType(type: string): boolean {
  const knownTypes = ['User', 'Availability', 'RecurringAvailability', 'AvailabilityException', 'Booking', 'Account'];
  return knownTypes.includes(type);
}

function generateParamType(param: { type: string; required: boolean }): string {
  const tsType = param.type === 'number' ? 'number' : param.type === 'boolean' ? 'boolean' : 'string';
  return param.required ? tsType : `${tsType} | undefined`;
}

function generateBodyType(field: { type: string; required: boolean }): string {
  if (field.type.includes('[]')) {
    const baseType = field.type.replace('[]', '');
    const mappedType = field.type === 'DaysOfWeek[]' ? 'Types.DaysOfWeek[]' : `${baseType}[]`;
    return field.required ? mappedType : `${mappedType} | undefined`;
  }

  const tsType = field.type === 'number' ? 'number' : field.type === 'boolean' ? 'boolean' : 'string';

  return field.required ? tsType : `${tsType} | undefined`;
}

function generateBaseClient(environment: Environment, typesPath: string): string {
  return `import * as Types from '${typesPath}';

class KalendisClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: { apiKey: string }) {
    if (!options.apiKey) {
      throw new Error('API key is required. Pass it in the constructor: new KalendisClient({ apiKey: "your-key" })');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = process.env.KALENDIS_API_URL || 'https://sandbox.api.kalendis.dev';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = \`\${this.baseUrl}\${endpoint}\`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        let errorMessage = \`Kalendis API Error (\${response.status}): \${response.statusText}\`;
        try {
          const error = await response.json();
          errorMessage = \`Kalendis API Error (\${response.status}): \${error.message || error.error || response.statusText}\`;
        } catch {
          // Use default error message if response isn't JSON
        }
        
        if (response.status === 401) {
          throw new Error('Authentication failed: Invalid or missing API key');
        } else if (response.status === 403) {
          throw new Error('Permission denied: Your API key does not have access to this resource');
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(\`Cannot connect to Kalendis API at \${this.baseUrl}. Please ensure the service is running.\`);
      }
      throw error;
    }
  }`;
}

function generateMethod(name: string, endpoint: EndpointDefinition): string {
  const returnType = mapResponseType(endpoint.response.type);

  if (endpoint.method === 'GET' && endpoint.params) {
    const paramTypes = Object.entries(endpoint.params)
      .map(([key, param]) => `    ${key}?: ${generateParamType(param)};`)
      .join('\n');

    return `
  async ${name}(params: {
${paramTypes}
  } = {}): Promise<${returnType}> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    return this.request<${returnType}>('${endpoint.path}' + (queryString ? '?' + queryString : ''), {
      method: 'GET'
    });
  }`;
  }

  if (endpoint.method === 'DELETE' && endpoint.params) {
    const paramTypes = Object.entries(endpoint.params)
      .map(([key, param]) => `    ${key}: ${generateParamType(param)};`)
      .join('\n');

    return `
  async ${name}(params: {
${paramTypes}
  }): Promise<${returnType}> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    return this.request<${returnType}>('${endpoint.path}?' + query.toString(), {
      method: 'DELETE'
    });
  }`;
  }

  if ((endpoint.method === 'POST' || endpoint.method === 'PUT') && endpoint.body) {
    const bodyTypes = Object.entries(endpoint.body)
      .map(([key, field]) => `    ${key}${field.required ? '' : '?'}: ${generateBodyType(field)};`)
      .join('\n');

    return `
  async ${name}(data: {
${bodyTypes}
  }): Promise<${returnType}> {
    return this.request<${returnType}>('${endpoint.path}', {
      method: '${endpoint.method}',
      body: JSON.stringify(data)
    });
  }`;
  }

  return `
  async ${name}(): Promise<${returnType}> {
    return this.request<${returnType}>('${endpoint.path}', {
      method: '${endpoint.method}'
    });
  }`;
}

export function generateBackendClient(options: GenerateOptions): string {
  const typesPath = options.typesImportPath || '../types';
  const baseClient = generateBaseClient(options.environment, typesPath);

  const methods = Object.entries(ENDPOINTS)
    .map(([name, endpoint]) => generateMethod(name, endpoint))
    .join('\n');

  return `${baseClient}
${methods}
}

export default KalendisClient;
`;
}

export function generateFrontendClient(options?: { typesImportPath?: string }): string {
  const typesPath = options?.typesImportPath || '../types';

  return `import * as Types from '${typesPath}';
import { convertToLocalTime } from '@kalendis/utils';

export const api = {
  getUsers: async (): Promise<Types.User[]> => {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  createUser: async (data: { id: string; name: string; email?: string; timezone?: string }): Promise<Types.User> => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  updateUser: async (data: { id: string; name?: string; timezone?: string }): Promise<Types.User> => {
    const response = await fetch(\`/api/users/\${data.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  deleteUser: async (id: string): Promise<Types.User> => {
    const response = await fetch(\`/api/users/\${id}\`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  getAvailability: async (params?: { userId?: string; start?: string; end?: string }): Promise<Types.Availability[]> => {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch('/api/availability' + (query ? '?' + query : ''));
    if (!response.ok) throw new Error('Failed to fetch availability');
    const data = await response.json();
    return convertToLocalTime(data);
  },

  getAllAvailability: async (params: { start: string; end?: string; timezone?: string }): Promise<Array<{userId: string; start: string; end: string}>> => {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch('/api/availability/all?' + query);
    if (!response.ok) throw new Error('Failed to fetch all availability');
    const data = await response.json();
    return convertToLocalTime(data);
  },

  getMultiUserCalculatedAvailability: async (data: {
    userIds: string[];
    start: string;
    end?: string;
    timezone?: string;
  }): Promise<Array<{userId: string; availability: Array<{start: string; end: string; offset: number}>}>> => {
    const response = await fetch('/api/availability/calculated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to fetch calculated availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  getRecurringAvailabilityByDate: async (data: {
    userId: string;
    start: string;
    cadence: string;
    frequency: number;
    numberOfOccurrences: number;
    timezone?: string;
  }): Promise<Array<Array<{start: string; end: string; offset: number}>>> => {
    const response = await fetch('/api/availability/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to fetch recurring availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  getMatchingAvailabilityByDate: async (data: {
    userIds: string[];
    start: string;
    end?: string;
    timezone?: string;
  }): Promise<Array<{start: string; end: string}>> => {
    const response = await fetch('/api/availability/matching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to fetch matching availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  addAvailability: async (data: { userId: string; start: string; end: string; timezone?: string }): Promise<Types.Availability> => {
    const response = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  updateAvailability: async (data: { id: string; start?: string; end?: string; timezone?: string }): Promise<Types.Availability> => {
    const response = await fetch(\`/api/availability/\${data.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  deleteAvailability: async (id: string, userId: string): Promise<{message: string}> => {
    const response = await fetch(\`/api/availability/\${id}?userId=\${userId}\`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete availability');
    return response.json();
  },

  getRecurringAvailability: async (userId: string): Promise<Types.RecurringAvailability[]> => {
    const response = await fetch(\`/api/recurring-availability?userId=\${userId}\`);
    if (!response.ok) throw new Error('Failed to fetch recurring availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  addRecurringAvailability: async (data: {
    userId: string;
    daysOfWeek: Types.DaysOfWeek[];
    start: string;
    end: string;
    expiration?: string;
    timezone?: string;
  }): Promise<Types.RecurringAvailability> => {
    const response = await fetch('/api/recurring-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add recurring availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  updateRecurringAvailability: async (data: {
    id: string;
    userId: string;
    daysOfWeek?: Types.DaysOfWeek[];
    start?: string;
    end?: string;
    expiration?: string;
    makeInfinite?: boolean;
    timezone?: string;
  }): Promise<Types.RecurringAvailability> => {
    const response = await fetch(\`/api/recurring-availability/\${data.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update recurring availability');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  deleteRecurringAvailability: async (id: string, userId: string): Promise<{message: string}> => {
    const response = await fetch(\`/api/recurring-availability/\${id}?userId=\${userId}\`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete recurring availability');
    return response.json();
  },

  getAvailabilityException: async (userId: string): Promise<Types.AvailabilityException[]> => {
    const response = await fetch(\`/api/availability-exceptions?userId=\${userId}\`);
    if (!response.ok) throw new Error('Failed to fetch availability exceptions');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  addAvailabilityException: async (data: {
    userId: string;
    start: string;
    end: string;
    timezone?: string;
  }): Promise<Types.AvailabilityException> => {
    const response = await fetch('/api/availability-exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add availability exception');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  addRecurringAvailabilityException: async (data: {
    userId: string;
    daysOfWeek: Types.DaysOfWeek[];
    start: string;
    end: string;
    expiration?: string;
    timezone?: string;
  }): Promise<Types.AvailabilityException[]> => {
    const response = await fetch('/api/availability-exceptions/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add recurring availability exception');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  updateAvailabilityException: async (data: {
    id: string;
    start?: string;
    end?: string;
    timezone?: string;
  }): Promise<Types.AvailabilityException> => {
    const response = await fetch(\`/api/availability-exceptions/\${data.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update availability exception');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  deleteAvailabilityException: async (id: string, userId: string): Promise<{message: string}> => {
    const response = await fetch(\`/api/availability-exceptions/\${id}?userId=\${userId}\`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete availability exception');
    return response.json();
  },

  getBookings: async (params: { userId: string; start: string; end?: string }): Promise<Types.Booking[]> => {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch('/api/bookings?' + query);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  getBookingsByIds: async (bookingIds: string[]): Promise<Types.Booking[]> => {
    const response = await fetch('/api/bookings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingIds })
    });
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  createBooking: async (data: { userIds: string[]; start: string; end: string; timezone?: string }): Promise<Types.Booking> => {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create booking');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  updateBooking: async (data: { id: string; userIds?: string[]; start?: string; end?: string; timezone?: string }): Promise<Types.Booking> => {
    const response = await fetch(\`/api/bookings/\${data.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update booking');
    const responseData = await response.json();
    return convertToLocalTime(responseData);
  },

  deleteBooking: async (id: string): Promise<{message: string}> => {
    const response = await fetch(\`/api/bookings/\${id}\`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete booking');
    return response.json();
  },

  getAccount: async (): Promise<Types.Account> => {
    const response = await fetch('/api/account');
    if (!response.ok) throw new Error('Failed to fetch account');
    return response.json();
  },

  updateAccount: async (data: { name?: string; active?: boolean }): Promise<Types.Account> => {
    const response = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update account');
    return response.json();
  }
};

export default api;
`;
}

export function generateNextjsRoutes(typesPath: string = '@/lib/types'): Record<string, string> {
  const files: Record<string, string> = {};

  files['app/api/users/route.ts'] = `import { NextRequest, NextResponse } from 'next/server';
import KalendisClient from '@/lib/kalendisClient';

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY! 
});

export async function GET() {
  try {
    const users = await kalendisClient.getUsersByAccountId();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await kalendisClient.addUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await kalendisClient.updateUser(body);
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('User ID required');
    const result = await kalendisClient.deleteUser({ id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

  files['app/api/bookings/route.ts'] = `import { NextRequest, NextResponse } from 'next/server';
import KalendisClient from '@/lib/kalendisClient';

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY! 
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end') || undefined;
    
    if (!userId || !start) {
      return NextResponse.json({ error: 'userId and start are required' }, { status: 400 });
    }
    
    const bookings = await kalendisClient.getBooking({ userId, start, end });
    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if bulk fetch
    if (body.bookingIds) {
      const bookings = await kalendisClient.getBookingsByIds(body);
      return NextResponse.json(bookings);
    }
    
    // Otherwise create new booking
    const booking = await kalendisClient.addBooking(body);
    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const booking = await kalendisClient.updateBooking(body);
    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('Booking ID required');
    const result = await kalendisClient.deleteBooking({ id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

  files['app/api/availability/route.ts'] = `import { NextRequest, NextResponse } from 'next/server';
import KalendisClient from '@/lib/kalendisClient';

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY! 
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Check which endpoint to call
    if (request.url.includes('/all')) {
      const availability = await kalendisClient.getAllAvailability(params as any);
      return NextResponse.json(availability);
    } else if (request.url.includes('/recurring-availability')) {
      const availability = await kalendisClient.getRecurringAvailability(params as any);
      return NextResponse.json(availability);
    } else if (request.url.includes('/exceptions')) {
      const exceptions = await kalendisClient.getAvailabilityException(params as any);
      return NextResponse.json(exceptions);
    } else {
      const availability = await kalendisClient.getAvailability(params);
      return NextResponse.json(availability);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Route to correct endpoint based on URL
    if (request.url.includes('/calculated')) {
      const result = await kalendisClient.getMultiUserCalculatedAvailability(body);
      return NextResponse.json(result);
    } else if (request.url.includes('/recurring-by-date')) {
      const result = await kalendisClient.getRecurringAvailabilityByDate(body);
      return NextResponse.json(result);
    } else if (request.url.includes('/matching')) {
      const result = await kalendisClient.getMatchingAvailabilityByDate(body);
      return NextResponse.json(result);
    } else if (request.url.includes('/recurring-availability')) {
      const result = await kalendisClient.addRecurringAvailability(body);
      return NextResponse.json(result, { status: 201 });
    } else if (request.url.includes('/exceptions/recurring')) {
      const result = await kalendisClient.addRecurringAvailabilityException(body);
      return NextResponse.json(result, { status: 201 });
    } else if (request.url.includes('/exceptions')) {
      const result = await kalendisClient.addAvailabilityException(body);
      return NextResponse.json(result, { status: 201 });
    } else {
      const availability = await kalendisClient.addAvailability(body);
      return NextResponse.json(availability, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (request.url.includes('/recurring-availability')) {
      const result = await kalendisClient.updateRecurringAvailability(body);
      return NextResponse.json(result);
    } else if (request.url.includes('/exceptions')) {
      const result = await kalendisClient.updateAvailabilityException(body);
      return NextResponse.json(result);
    } else {
      const availability = await kalendisClient.updateAvailability(body);
      return NextResponse.json(availability);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID required');
    
    if (request.url.includes('/recurring-availability')) {
      const userId = searchParams.get('userId');
      if (!userId) throw new Error('User ID required');
      const result = await kalendisClient.deleteRecurringAvailability({ id, userId });
      return NextResponse.json(result);
    } else if (request.url.includes('/exceptions')) {
      const userId = searchParams.get('userId');
      if (!userId) throw new Error('User ID required');
      const result = await kalendisClient.deleteAvailabilityException({ id, userId });
      return NextResponse.json(result);
    } else {
      const userId = searchParams.get('userId');
      if (!userId) throw new Error('User ID required');
      const result = await kalendisClient.deleteAvailability({ id, userId });
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

  files['app/api/account/route.ts'] = `import { NextRequest, NextResponse } from 'next/server';
import KalendisClient from '@/lib/kalendisClient';

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY! 
});

export async function GET() {
  try {
    const account = await kalendisClient.getAccount();
    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const account = await kalendisClient.updateAccount(body);
    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

  return files;
}

async function askOverwrite(filePath: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`File exists: ${filePath}. Overwrite? (y/n) `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const fullPath = path.resolve(filePath);

  if (fs.existsSync(fullPath)) {
    const shouldOverwrite = await askOverwrite(fullPath);
    if (!shouldOverwrite) {
      console.log('\n=== File content (add to a file of your choosing) ===\n');
      console.log(content);
      console.log('\n=== End of file content ===\n');
      return;
    }
  }

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ Written: ${fullPath}`);
}

export function generateExpressRoutes(): string {
  return `import { Request, Response, Router } from 'express';
import KalendisClient from './kalendisClient';

const router = Router();

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY!
});

const handleError = (error: any, res: Response) => {
  res.status(500).json({ error: error.message });
};

router.get('/api/users', async (req, res) => {
  try {
    const users = await kalendisClient.getUsersByAccountId();
    res.json(users);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const user = await kalendisClient.addUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const user = await kalendisClient.updateUser({ id, ...req.body });
    res.json(user);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await kalendisClient.deleteUser({ id });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/availability', async (req, res) => {
  try {
    const availability = await kalendisClient.getAvailability(req.query as any);
    res.json(availability);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/availability/all', async (req, res) => {
  try {
    const availability = await kalendisClient.getAllAvailability(req.query as any);
    res.json(availability);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability/calculated', async (req, res) => {
  try {
    const result = await kalendisClient.getMultiUserCalculatedAvailability(req.body);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability/recurring', async (req, res) => {
  try {
    const result = await kalendisClient.getRecurringAvailabilityByDate(req.body);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability/matching', async (req, res) => {
  try {
    const result = await kalendisClient.getMatchingAvailabilityByDate(req.body);
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability', async (req, res) => {
  try {
    const availability = await kalendisClient.addAvailability(req.body);
    res.status(201).json(availability);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/availability/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const availability = await kalendisClient.updateAvailability({ id, ...req.body });
    res.json(availability);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/api/availability/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { userId } = req.query as { userId: string };
    const result = await kalendisClient.deleteAvailability({ id, userId });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/recurring-availability', async (req, res) => {
  try {
    const availability = await kalendisClient.getRecurringAvailability(req.query as any);
    res.json(availability);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/recurring-availability', async (req, res) => {
  try {
    const result = await kalendisClient.addRecurringAvailability(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/recurring-availability/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await kalendisClient.updateRecurringAvailability({ id, ...req.body });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/api/recurring-availability/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { userId } = req.query as { userId: string };
    const result = await kalendisClient.deleteRecurringAvailability({ id, userId });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/availability-exceptions', async (req, res) => {
  try {
    const exceptions = await kalendisClient.getAvailabilityException(req.query as any);
    res.json(exceptions);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability-exceptions', async (req, res) => {
  try {
    const exception = await kalendisClient.addAvailabilityException(req.body);
    res.status(201).json(exception);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/availability-exceptions/recurring', async (req, res) => {
  try {
    const exceptions = await kalendisClient.addRecurringAvailabilityException(req.body);
    res.status(201).json(exceptions);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/availability-exceptions/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const exception = await kalendisClient.updateAvailabilityException({ id, ...req.body });
    res.json(exception);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/api/availability-exceptions/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { userId } = req.query as { userId: string };
    const result = await kalendisClient.deleteAvailabilityException({ id, userId });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await kalendisClient.getBooking(req.query as any);
    res.json(bookings);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/bookings/bulk', async (req, res) => {
  try {
    const bookings = await kalendisClient.getBookingsByIds(req.body);
    res.json(bookings);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.post('/api/bookings', async (req, res) => {
  try {
    const booking = await kalendisClient.addBooking(req.body);
    res.status(201).json(booking);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const booking = await kalendisClient.updateBooking({ id, ...req.body });
    res.json(booking);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const result = await kalendisClient.deleteBooking({ id });
    res.json(result);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.get('/api/account', async (req, res) => {
  try {
    const account = await kalendisClient.getAccount();
    res.json(account);
  } catch (error: any) {
    handleError(error, res);
  }
});

router.put('/api/account', async (req, res) => {
  try {
    const account = await kalendisClient.updateAccount(req.body);
    res.json(account);
  } catch (error: any) {
    handleError(error, res);
  }
});

export default router;
`;
}

export function generateFastifyRoutes(): string {
  return `import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import KalendisClient from './kalendisClient';

const kalendisClient = new KalendisClient({ 
  apiKey: process.env.KALENDIS_API_KEY! 
});

export default async function routes(fastify: FastifyInstance) {
  fastify.get('/api/users', async (request, reply) => {
    const users = await kalendisClient.getUsersByAccountId();
    return users;
  });

  fastify.post('/api/users', async (request, reply) => {
    const user = await kalendisClient.addUser(request.body as any);
    reply.code(201).send(user);
  });

  fastify.put('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await kalendisClient.updateUser({ id, ...request.body as any });
    return user;
  });

  fastify.delete('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await kalendisClient.deleteUser({ id });
    return result;
  });

  fastify.get('/api/availability', async (request, reply) => {
    const availability = await kalendisClient.getAvailability(request.query as any);
    return availability;
  });

  fastify.get('/api/availability/all', async (request, reply) => {
    const availability = await kalendisClient.getAllAvailability(request.query as any);
    return availability;
  });

  fastify.post('/api/availability/calculated', async (request, reply) => {
    const result = await kalendisClient.getMultiUserCalculatedAvailability(request.body as any);
    return result;
  });

  fastify.post('/api/availability/recurring', async (request, reply) => {
    const result = await kalendisClient.getRecurringAvailabilityByDate(request.body as any);
    return result;
  });

  fastify.post('/api/availability/matching', async (request, reply) => {
    const result = await kalendisClient.getMatchingAvailabilityByDate(request.body as any);
    return result;
  });

  fastify.post('/api/availability', async (request, reply) => {
    const availability = await kalendisClient.addAvailability(request.body as any);
    reply.code(201).send(availability);
  });

  fastify.put('/api/availability/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const availability = await kalendisClient.updateAvailability({ id, ...request.body as any });
    return availability;
  });

  fastify.delete('/api/availability/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    const result = await kalendisClient.deleteAvailability({ id, userId });
    return result;
  });

  fastify.get('/api/recurring-availability', async (request, reply) => {
    const availability = await kalendisClient.getRecurringAvailability(request.query as any);
    return availability;
  });

  fastify.post('/api/recurring-availability', async (request, reply) => {
    const result = await kalendisClient.addRecurringAvailability(request.body as any);
    reply.code(201).send(result);
  });

  fastify.put('/api/recurring-availability/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await kalendisClient.updateRecurringAvailability({ id, ...request.body as any });
    return result;
  });

  fastify.delete('/api/recurring-availability/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    const result = await kalendisClient.deleteRecurringAvailability({ id, userId });
    return result;
  });

  fastify.get('/api/availability-exceptions', async (request, reply) => {
    const exceptions = await kalendisClient.getAvailabilityException(request.query as any);
    return exceptions;
  });

  fastify.post('/api/availability-exceptions', async (request, reply) => {
    const exception = await kalendisClient.addAvailabilityException(request.body as any);
    reply.code(201).send(exception);
  });

  fastify.post('/api/availability-exceptions/recurring', async (request, reply) => {
    const exceptions = await kalendisClient.addRecurringAvailabilityException(request.body as any);
    reply.code(201).send(exceptions);
  });

  fastify.put('/api/availability-exceptions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const exception = await kalendisClient.updateAvailabilityException({ id, ...request.body as any });
    return exception;
  });

  fastify.delete('/api/availability-exceptions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.query as { userId: string };
    const result = await kalendisClient.deleteAvailabilityException({ id, userId });
    return result;
  });

  fastify.get('/api/bookings', async (request, reply) => {
    const bookings = await kalendisClient.getBooking(request.query as any);
    return bookings;
  });

  fastify.post('/api/bookings/bulk', async (request, reply) => {
    const bookings = await kalendisClient.getBookingsByIds(request.body as any);
    return bookings;
  });

  fastify.post('/api/bookings', async (request, reply) => {
    const booking = await kalendisClient.addBooking(request.body as any);
    reply.code(201).send(booking);
  });

  fastify.put('/api/bookings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const booking = await kalendisClient.updateBooking({ id, ...request.body as any });
    return booking;
  });

  fastify.delete('/api/bookings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await kalendisClient.deleteBooking({ id });
    return result;
  });

  fastify.get('/api/account', async (request, reply) => {
    const account = await kalendisClient.getAccount();
    return account;
  });

  fastify.put('/api/account', async (request, reply) => {
    const account = await kalendisClient.updateAccount(request.body as any);
    return account;
  });
}
`;
}

export function generateNestJSModule(typesPath: string = '@/types'): Record<string, string> {
  const files: Record<string, string> = {};

  files['kalendis.controller.ts'] = `import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { KalendisService } from './kalendis.service';
import * as Types from '${typesPath}';

@Controller('api')
export class KalendisController {
  constructor(private readonly kalendisService: KalendisService) {}

  @Get('users')
  async getUsers() {
    return this.kalendisService.getUsersByAccountId();
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() body: { id: string; name: string; email?: string; timezone?: string }) {
    return this.kalendisService.addUser(body);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() body: { name?: string; timezone?: string }) {
    return this.kalendisService.updateUser({ id, ...body });
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.kalendisService.deleteUser({ id });
  }

  @Get('availability')
  async getAvailability(@Query() query: { userId?: string; start?: string; end?: string }) {
    return this.kalendisService.getAvailability(query);
  }

  @Get('availability/all')
  async getAllAvailability(@Query() query: { start: string; end?: string; timezone?: string }) {
    return this.kalendisService.getAllAvailability(query);
  }

  @Post('availability/calculated')
  async getCalculatedAvailability(@Body() body: { userIds: string[]; start: string; end?: string; timezone?: string }) {
    return this.kalendisService.getMultiUserCalculatedAvailability(body);
  }

  @Post('availability/recurring')
  async getRecurringAvailabilityByDate(@Body() body: { userId: string; start: string; cadence: string; frequency: number; numberOfOccurrences: number; timezone?: string }) {
    return this.kalendisService.getRecurringAvailabilityByDate(body);
  }

  @Post('availability/matching')
  async getMatchingAvailability(@Body() body: { userIds: string[]; start: string; end?: string; timezone?: string }) {
    return this.kalendisService.getMatchingAvailabilityByDate(body);
  }

  @Post('availability')
  @HttpCode(HttpStatus.CREATED)
  async addAvailability(@Body() body: { userId: string; start: string; end: string; timezone?: string }) {
    return this.kalendisService.addAvailability(body);
  }

  @Put('availability/:id')
  async updateAvailability(@Param('id') id: string, @Body() body: { start?: string; end?: string; timezone?: string }) {
    return this.kalendisService.updateAvailability({ id, ...body });
  }

  @Delete('availability/:id')
  async deleteAvailability(@Param('id') id: string, @Query('userId') userId: string) {
    return this.kalendisService.deleteAvailability({ id, userId });
  }

  @Get('recurring-availability')
  async getRecurringAvailability(@Query('userId') userId: string) {
    return this.kalendisService.getRecurringAvailability({ userId });
  }

  @Post('recurring-availability')
  @HttpCode(HttpStatus.CREATED)
  async addRecurringAvailability(@Body() body: { userId: string; daysOfWeek: Types.DaysOfWeek[]; start: string; end: string; expiration?: string; timezone?: string }) {
    return this.kalendisService.addRecurringAvailability(body);
  }

  @Put('recurring-availability/:id')
  async updateRecurringAvailability(@Param('id') id: string, @Body() body: { userId: string; daysOfWeek?: Types.DaysOfWeek[]; start?: string; end?: string; expiration?: string; makeInfinite?: boolean; timezone?: string }) {
    return this.kalendisService.updateRecurringAvailability({ id, ...body });
  }

  @Delete('recurring-availability/:id')
  async deleteRecurringAvailability(@Param('id') id: string, @Query('userId') userId: string) {
    return this.kalendisService.deleteRecurringAvailability({ id, userId });
  }

  @Get('availability-exceptions')
  async getAvailabilityExceptions(@Query('userId') userId: string) {
    return this.kalendisService.getAvailabilityException({ userId });
  }

  @Post('availability-exceptions')
  @HttpCode(HttpStatus.CREATED)
  async addAvailabilityException(@Body() body: { userId: string; start: string; end: string; timezone?: string }) {
    return this.kalendisService.addAvailabilityException(body);
  }

  @Post('availability-exceptions/recurring')
  @HttpCode(HttpStatus.CREATED)
  async addRecurringAvailabilityException(@Body() body: { userId: string; daysOfWeek: Types.DaysOfWeek[]; start: string; end: string; expiration?: string; timezone?: string }) {
    return this.kalendisService.addRecurringAvailabilityException(body);
  }

  @Put('availability-exceptions/:id')
  async updateAvailabilityException(@Param('id') id: string, @Body() body: { start?: string; end?: string; timezone?: string }) {
    return this.kalendisService.updateAvailabilityException({ id, ...body });
  }

  @Delete('availability-exceptions/:id')
  async deleteAvailabilityException(@Param('id') id: string, @Query('userId') userId: string) {
    return this.kalendisService.deleteAvailabilityException({ id, userId });
  }

  @Get('bookings')
  async getBookings(@Query() query: { userId: string; start: string; end?: string }) {
    return this.kalendisService.getBooking(query);
  }

  @Post('bookings/bulk')
  async getBookingsByIds(@Body() body: { bookingIds: string[] }) {
    return this.kalendisService.getBookingsByIds(body);
  }

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(@Body() body: { userIds: string[]; start: string; end: string; timezone?: string }) {
    return this.kalendisService.addBooking(body);
  }

  @Put('bookings/:id')
  async updateBooking(@Param('id') id: string, @Body() body: { userIds?: string[]; start?: string; end?: string; timezone?: string }) {
    return this.kalendisService.updateBooking({ id, ...body });
  }

  @Delete('bookings/:id')
  async deleteBooking(@Param('id') id: string) {
    return this.kalendisService.deleteBooking({ id });
  }

  @Get('account')
  async getAccount() {
    return this.kalendisService.getAccount();
  }

  @Put('account')
  async updateAccount(@Body() body: { name?: string; active?: boolean }) {
    return this.kalendisService.updateAccount(body);
  }
}
`;

  files['kalendis.service.ts'] = `import { Injectable } from '@nestjs/common';
import KalendisClient from './kalendisClient';
import * as Types from '${typesPath}';

@Injectable()
export class KalendisService {
  private kalendisClient: KalendisClient;

  constructor() {
    this.kalendisClient = new KalendisClient({
      apiKey: process.env.KALENDIS_API_KEY!
    });
  }

  async getUsersByAccountId() {
    return this.kalendisClient.getUsersByAccountId();
  }

  async addUser(data: { id: string; name: string; email?: string; timezone?: string }) {
    return this.kalendisClient.addUser(data);
  }

  async updateUser(data: { id: string; name?: string; timezone?: string }) {
    return this.kalendisClient.updateUser(data);
  }

  async deleteUser(data: { id: string }) {
    return this.kalendisClient.deleteUser(data);
  }

  async getAvailability(params?: { userId?: string; start?: string; end?: string }) {
    return this.kalendisClient.getAvailability(params);
  }

  async getAllAvailability(params: { start: string; end?: string; timezone?: string }) {
    return this.kalendisClient.getAllAvailability(params);
  }

  async getMultiUserCalculatedAvailability(data: { userIds: string[]; start: string; end?: string; timezone?: string }) {
    return this.kalendisClient.getMultiUserCalculatedAvailability(data);
  }

  async getRecurringAvailabilityByDate(data: { userId: string; start: string; cadence: string; frequency: number; numberOfOccurrences: number; timezone?: string }) {
    return this.kalendisClient.getRecurringAvailabilityByDate(data);
  }

  async getMatchingAvailabilityByDate(data: { userIds: string[]; start: string; end?: string; timezone?: string }) {
    return this.kalendisClient.getMatchingAvailabilityByDate(data);
  }

  async addAvailability(data: { userId: string; start: string; end: string; timezone?: string }) {
    return this.kalendisClient.addAvailability(data);
  }

  async updateAvailability(data: { id: string; start?: string; end?: string; timezone?: string }) {
    return this.kalendisClient.updateAvailability(data);
  }

  async deleteAvailability(data: { id: string; userId: string }) {
    return this.kalendisClient.deleteAvailability(data);
  }

  async getRecurringAvailability(params: { userId: string }) {
    return this.kalendisClient.getRecurringAvailability(params);
  }

  async addRecurringAvailability(data: { userId: string; daysOfWeek: Types.DaysOfWeek[]; start: string; end: string; expiration?: string; timezone?: string }) {
    return this.kalendisClient.addRecurringAvailability(data);
  }

  async updateRecurringAvailability(data: { id: string; userId: string; daysOfWeek?: Types.DaysOfWeek[]; start?: string; end?: string; expiration?: string; makeInfinite?: boolean; timezone?: string }) {
    return this.kalendisClient.updateRecurringAvailability(data);
  }

  async deleteRecurringAvailability(data: { id: string; userId: string }) {
    return this.kalendisClient.deleteRecurringAvailability(data);
  }

  async getAvailabilityException(params: { userId: string }) {
    return this.kalendisClient.getAvailabilityException(params);
  }

  async addAvailabilityException(data: { userId: string; start: string; end: string; timezone?: string }) {
    return this.kalendisClient.addAvailabilityException(data);
  }

  async addRecurringAvailabilityException(data: { userId: string; daysOfWeek: Types.DaysOfWeek[]; start: string; end: string; expiration?: string; timezone?: string }) {
    return this.kalendisClient.addRecurringAvailabilityException(data);
  }

  async updateAvailabilityException(data: { id: string; start?: string; end?: string; timezone?: string }) {
    return this.kalendisClient.updateAvailabilityException(data);
  }

  async deleteAvailabilityException(data: { id: string; userId: string }) {
    return this.kalendisClient.deleteAvailabilityException(data);
  }

  async getBooking(params: { userId: string; start: string; end?: string }) {
    return this.kalendisClient.getBooking(params);
  }

  async getBookingsByIds(data: { bookingIds: string[] }) {
    return this.kalendisClient.getBookingsByIds(data);
  }

  async addBooking(data: { userIds: string[]; start: string; end: string; timezone?: string }) {
    return this.kalendisClient.addBooking(data);
  }

  async updateBooking(data: { id: string; userIds?: string[]; start?: string; end?: string; timezone?: string }) {
    return this.kalendisClient.updateBooking(data);
  }

  async deleteBooking(data: { id: string }) {
    return this.kalendisClient.deleteBooking(data);
  }

  async getAccount() {
    return this.kalendisClient.getAccount();
  }

  async updateAccount(data: { name?: string; active?: boolean }) {
    return this.kalendisClient.updateAccount(data);
  }
}
`;

  files['kalendis.module.ts'] = `import { Module } from '@nestjs/common';
import { KalendisController } from './kalendis.controller';
import { KalendisService } from './kalendis.service';

@Module({
  controllers: [KalendisController],
  providers: [KalendisService],
  exports: [KalendisService],
})
export class KalendisModule {}
`;

  return files;
}
