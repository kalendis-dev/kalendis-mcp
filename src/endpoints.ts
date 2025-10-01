/**
 * Endpoint definitions for the Kalendis API
 * Each endpoint is audited against the actual service implementation
 */

import type * as Types from './types';

export interface EndpointDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  params?: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean';
      required: boolean;
      description: string;
    }
  >;
  body?: Record<
    string,
    {
      type: string;
      required: boolean;
      description: string;
    }
  >;
  response: {
    type: string;
    description: string;
  };
  headers: string[];
}

export const ENDPOINTS: Record<string, EndpointDefinition> = {
  // ============= USER ENDPOINTS =============
  // Audited: src/routes/user.ts line 36-40
  // Returns: { data, meta } (src/controllers/user/getUsersByAccountId.ts)
  getUsersByAccountId: {
    path: '/v1/user/getUsersByAccountId',
    method: 'GET',
    description: 'Get all users for the authenticated account',
    response: {
      type: '{ data: User[]; meta: { total: number; apiVersion?: string } }',
      description: 'Users array with metadata',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/user.ts line 90
  // OpenAPI spec shows id and name are required
  addUser: {
    path: '/v1/user/addUser',
    method: 'POST',
    description: 'Create a new user',
    body: {
      id: { type: 'string', required: false, description: 'User ID to set (optional, auto-generated if not provided)' },
      name: { type: 'string', required: true, description: 'User name' },
    },
    response: {
      type: 'User',
      description: 'Created user object',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/user.ts line 141
  updateUser: {
    path: '/v1/user/updateUser',
    method: 'PUT',
    description: 'Update an existing user',
    body: {
      id: { type: 'string', required: true, description: 'User ID to update' },
      name: { type: 'string', required: false, description: 'New name' },
      timeZone: { type: 'string', required: false, description: 'New timezone' },
    },
    response: {
      type: 'User',
      description: 'Updated user object',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/user.ts line 183
  deleteUser: {
    path: '/v1/user/deleteUser',
    method: 'DELETE',
    description: 'Delete a user',
    params: {
      id: { type: 'string', required: true, description: 'User ID to delete' },
    },
    response: {
      type: '{message: string}',
      description: 'Deletion confirmation message',
    },
    headers: ['x-api-key'],
  },

  // ============= AVAILABILITY ENDPOINTS =============
  // Audited: src/routes/availability.ts line 35
  getAvailability: {
    path: '/v1/availability/getAvailability',
    method: 'GET',
    description: 'Get availability for a specific user',
    params: {
      userId: { type: 'string', required: true, description: 'User ID to get availability for' },
      start: { type: 'string', required: true, description: 'Start date for availability' },
      end: { type: 'string', required: false, description: 'End date for availability' },
      includeExceptions: {
        type: 'string',
        required: false,
        description: 'Include exceptions in calculation (true/false)',
      },
      includeBookings: { type: 'string', required: false, description: 'Include bookings in calculation (true/false)' },
      timezone: { type: 'string', required: false, description: 'Timezone for date interpretation' },
    },
    response: {
      type: 'Array<{start: string, end: string, timeZone: string, offset: number, segments: Array<{start: string, end: string, id?: string, recurring?: boolean, expiration?: string | null, daysOfWeek?: Types.DaysOfWeek[], timeZone?: string}>}>',
      description: 'Calculated availability windows with metadata',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/availability.ts line 55
  // Returns uncalculated availability for all users
  getAllAvailability: {
    path: '/v1/availability/getAllAvailability',
    method: 'GET',
    description: 'Get availability for all users in the account',
    params: {
      start: { type: 'string', required: true, description: 'Start date to check from' },
      end: { type: 'string', required: false, description: 'End date (defaults to 7 days after start)' },
      timezone: { type: 'string', required: false, description: 'IANA timezone (defaults to America/New_York)' },
    },
    response: {
      type: 'Array<{userId: string, start: string, end: string, timeZone: string, offset: number, segments: Array<{start: string, end: string, id?: string, recurring?: boolean, expiration?: string | null, daysOfWeek?: Types.DaysOfWeek[]}>}>',
      description: 'Unmerged availability chunks per user with metadata',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/availability.ts line 83
  getMultiUserCalculatedAvailability: {
    path: '/v1/availability/getMultiUserCalculatedAvailability',
    method: 'POST',
    description: 'Get calculated availability for multiple users',
    body: {
      userIds: { type: 'string[]', required: true, description: 'Array of user IDs' },
      start: { type: 'string', required: true, description: 'Start date to check from' },
      end: { type: 'string', required: false, description: 'End date (omit for full day of start)' },
      timezone: { type: 'string', required: false, description: 'IANA timezone (defaults to America/New_York)' },
    },
    response: {
      type: 'Array<{userId: string, availability: Array<{start: string, end: string, timeZone: string, offset: number, segments: Array<{start: string, end: string, id?: string, recurring?: boolean, expiration?: string | null, daysOfWeek?: Types.DaysOfWeek[], timeZone?: string, originalItemOffset?: number}>}>, offset: number, timeZone: string}>',
      description: 'Availability per user with timezone, segments, and offsets',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availability.ts line 114
  getRecurringAvailabilityByDate: {
    path: '/v1/availability/getRecurringAvailabilityByDate',
    method: 'POST',
    description: 'Get recurring availability based on cadence',
    body: {
      userId: { type: 'string', required: true, description: 'User ID to check' },
      start: { type: 'string', required: true, description: 'Start date' },
      cadence: { type: 'string', required: true, description: 'DAILY or WEEKLY' },
      frequency: { type: 'number', required: true, description: 'How often cadence occurs' },
      numberOfOccurrences: { type: 'number', required: true, description: 'Times to check' },
      timezone: { type: 'string', required: false, description: 'IANA timezone' },
    },
    response: {
      type: 'Array<Array<{start: string, end: string, offset: number}>>',
      description: 'Nested arrays of availability per occurrence',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availability.ts line 138
  getMatchingAvailabilityByDate: {
    path: '/v1/availability/getMatchingAvailabilityByDate',
    method: 'POST',
    description: 'Get overlapping availability for multiple users',
    body: {
      userIds: { type: 'string[]', required: true, description: 'User IDs to check' },
      start: { type: 'string', required: true, description: 'Start date' },
      end: { type: 'string', required: false, description: 'End date' },
      timezone: { type: 'string', required: false, description: 'IANA timezone' },
    },
    response: {
      type: 'Array<{start: string, end: string, timeZone: string, offset: number}>',
      description: 'Times when all users are available with timezone and offset',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availability.ts line 154
  addAvailability: {
    path: '/v1/availability/addAvailability',
    method: 'POST',
    description: 'Add availability for a user',
    body: {
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: true, description: 'Start DateTime' },
      end: { type: 'string', required: true, description: 'End DateTime' },
      timezone: { type: 'string', required: false, description: 'Timezone (defaults to America/New_York)' },
    },
    response: {
      type: 'Availability',
      description: 'Created availability object',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availability.ts line 171
  updateAvailability: {
    path: '/v1/availability/updateAvailability',
    method: 'PUT',
    description: 'Update existing availability',
    body: {
      availabilityId: { type: 'string', required: true, description: 'Availability ID' },
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: false, description: 'New start time' },
      end: { type: 'string', required: false, description: 'New end time' },
      timezone: { type: 'string', required: false, description: 'New timezone' },
    },
    response: {
      type: 'Availability',
      description: 'Updated availability object',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availability.ts line 185
  deleteAvailability: {
    path: '/v1/availability/deleteAvailability',
    method: 'DELETE',
    description: 'Delete availability',
    params: {
      id: { type: 'string', required: true, description: 'Availability ID to delete' },
      userId: { type: 'string', required: true, description: 'User ID' },
    },
    response: {
      type: '{message: string}',
      description: 'Deletion confirmation message',
    },
    headers: ['x-api-key'],
  },

  // ============= RECURRING AVAILABILITY ENDPOINTS =============
  // Audited: src/routes/recurringAvailability.ts line 21
  getRecurringAvailability: {
    path: '/v1/recurringAvailability/getRecurringAvailability',
    method: 'GET',
    description: 'Get all recurring availability for a user',
    params: {
      userId: { type: 'string', required: true, description: 'User ID' },
    },
    response: {
      type: 'RecurringAvailability[]',
      description: 'Array of recurring availability objects',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/recurringAvailability.ts line 43
  addRecurringAvailability: {
    path: '/v1/recurringAvailability/addRecurringAvailability',
    method: 'POST',
    description: 'Add recurring availability for a user',
    body: {
      userId: { type: 'string', required: true, description: 'User ID' },
      daysOfWeek: { type: 'DaysOfWeek[]', required: true, description: 'Days this occurs on' },
      start: {
        type: 'string',
        required: true,
        description:
          'Start time (ISO 8601 DateTime format - full timestamp required, time portion defines recurring pattern)',
      },
      end: {
        type: 'string',
        required: true,
        description:
          'End time (ISO 8601 DateTime format - full timestamp required, time portion defines recurring pattern)',
      },
      expiration: { type: 'string', required: false, description: 'Expiration date (null = infinite)' },
      timezone: { type: 'string', required: false, description: 'Timezone (defaults to America/New_York)' },
    },
    response: {
      type: 'RecurringAvailability',
      description: 'Created recurring availability',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/recurringAvailability.ts line 66
  updateRecurringAvailability: {
    path: '/v1/recurringAvailability/updateRecurringAvailability',
    method: 'PUT',
    description: 'Update recurring availability',
    body: {
      id: { type: 'string', required: true, description: 'Recurring availability ID' },
      userId: { type: 'string', required: true, description: 'User ID' },
      daysOfWeek: { type: 'DaysOfWeek[]', required: false, description: 'New days' },
      start: {
        type: 'string',
        required: false,
        description:
          'New start time (ISO 8601 DateTime format - full timestamp required, time portion defines recurring pattern)',
      },
      end: {
        type: 'string',
        required: false,
        description:
          'New end time (ISO 8601 DateTime format - full timestamp required, time portion defines recurring pattern)',
      },
      expiration: { type: 'string', required: false, description: 'New expiration' },
      makeInfinite: { type: 'boolean', required: false, description: 'Set to true to remove expiration' },
      timezone: { type: 'string', required: false, description: 'New timezone' },
    },
    response: {
      type: 'RecurringAvailability',
      description: 'Updated recurring availability',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/recurringAvailability.ts line 80
  deleteRecurringAvailability: {
    path: '/v1/recurringAvailability/deleteRecurringAvailability',
    method: 'DELETE',
    description: 'Delete recurring availability',
    params: {
      userId: { type: 'string', required: true, description: 'User ID' },
      id: { type: 'string', required: true, description: 'Recurring availability ID' },
    },
    response: {
      type: '{message: string}',
      description: 'Deletion confirmation',
    },
    headers: ['x-api-key'],
  },

  // ============= AVAILABILITY EXCEPTION ENDPOINTS =============
  // Audited: src/routes/availabilityException.ts line 25
  getAvailabilityException: {
    path: '/v1/availabilityException/getAvailabilityException',
    method: 'GET',
    description: 'Get availability exceptions for a user',
    params: {
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: true, description: 'Start date (ISO 8601 format)' },
      end: {
        type: 'string',
        required: false,
        description: 'End date (ISO 8601 format). If not provided, returns exceptions for the entire day of start',
      },
    },
    response: {
      type: 'AvailabilityException[]',
      description: 'Array of availability exceptions',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/availabilityException.ts line 41
  addAvailabilityException: {
    path: '/v1/availabilityException/addAvailabilityException',
    method: 'POST',
    description: 'Add an availability exception',
    body: {
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: true, description: 'Start DateTime' },
      end: { type: 'string', required: true, description: 'End DateTime' },
      timezone: { type: 'string', required: false, description: 'Timezone' },
    },
    response: {
      type: 'AvailabilityException',
      description: 'Created exception',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availabilityException.ts line 58
  addRecurringAvailabilityException: {
    path: '/v1/availabilityException/addRecurringAvailabilityException',
    method: 'POST',
    description: 'Add recurring availability exception',
    body: {
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: true, description: 'Start DateTime' },
      end: { type: 'string', required: true, description: 'End DateTime' },
      numberOfWeeks: { type: 'number', required: true, description: 'Number of weeks to repeat' },
      timezone: { type: 'string', required: false, description: 'Timezone (defaults to America/New_York)' },
    },
    response: {
      type: '{count: number}',
      description: 'Number of exceptions created',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availabilityException.ts line 75
  updateAvailabilityException: {
    path: '/v1/availabilityException/updateAvailabilityException',
    method: 'PUT',
    description: 'Update availability exception',
    body: {
      availabilityExceptionId: { type: 'string', required: true, description: 'Exception ID' },
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: false, description: 'New start' },
      end: { type: 'string', required: false, description: 'New end' },
      timezone: { type: 'string', required: false, description: 'New timezone' },
    },
    response: {
      type: 'AvailabilityException',
      description: 'Updated exception',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/availabilityException.ts line 89
  deleteAvailabilityException: {
    path: '/v1/availabilityException/deleteAvailabilityException',
    method: 'DELETE',
    description: 'Delete availability exception',
    params: {
      id: { type: 'string', required: true, description: 'Exception ID' },
      userId: { type: 'string', required: true, description: 'User ID' },
    },
    response: {
      type: '{message: string}',
      description: 'Deletion confirmation',
    },
    headers: ['x-api-key'],
  },

  // ============= BOOKING ENDPOINTS =============
  // Audited: src/routes/booking.ts line 24
  getBooking: {
    path: '/v1/booking/getBooking',
    method: 'GET',
    description: 'Get all bookings for a specific user within a date range',
    params: {
      userId: { type: 'string', required: true, description: 'User ID' },
      start: { type: 'string', required: true, description: 'Start date' },
      end: { type: 'string', required: false, description: 'End date (optional)' },
    },
    response: {
      type: 'Booking[]',
      description: 'Array of booking objects',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/booking.ts line 41
  getBookingsByIds: {
    path: '/v1/booking/getBookingsByIds',
    method: 'POST',
    description: 'Get multiple bookings by IDs',
    body: {
      bookingIds: { type: 'string[]', required: true, description: 'Array of booking IDs' },
    },
    response: {
      type: 'Array<{id: string, start: string, end: string, timeZone: string}>',
      description: 'Array of booking objects with basic fields',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/booking.ts line 58
  addBooking: {
    path: '/v1/booking/addBooking',
    method: 'POST',
    description: 'Create a new booking',
    body: {
      users: { type: 'string[]', required: true, description: 'User IDs for booking' },
      start: { type: 'string', required: true, description: 'Start DateTime' },
      end: { type: 'string', required: true, description: 'End DateTime' },
      allowDoubleBooking: { type: 'boolean', required: false, description: 'Allow double booking (defaults to false)' },
      timezone: { type: 'string', required: false, description: 'Timezone' },
    },
    response: {
      type: 'Booking',
      description: 'Created booking',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/booking.ts line 75
  updateBooking: {
    path: '/v1/booking/updateBooking',
    method: 'PUT',
    description: 'Update a booking',
    body: {
      bookingId: { type: 'string', required: true, description: 'Booking ID' },
      users: { type: 'string[]', required: false, description: 'New user IDs' },
      start: { type: 'string', required: false, description: 'New start' },
      end: { type: 'string', required: false, description: 'New end' },
      timezone: { type: 'string', required: false, description: 'New timezone' },
    },
    response: {
      type: 'Booking',
      description: 'Updated booking',
    },
    headers: ['x-api-key', 'Content-Type'],
  },

  // Audited: src/routes/booking.ts line 88
  deleteBooking: {
    path: '/v1/booking/deleteBooking',
    method: 'DELETE',
    description: 'Delete a booking',
    params: {
      id: { type: 'string', required: true, description: 'Booking ID' },
    },
    response: {
      type: '{message: string}',
      description: 'Deletion confirmation',
    },
    headers: ['x-api-key'],
  },

  // ============= ACCOUNT ENDPOINTS =============
  // Audited: src/routes/account.ts line 17
  getAccount: {
    path: '/v1/account/getAccount',
    method: 'GET',
    description: 'Get account information',
    response: {
      type: 'Account',
      description: 'Account object',
    },
    headers: ['x-api-key'],
  },

  // Audited: src/routes/account.ts line 30
  updateAccount: {
    path: '/v1/account/updateAccount',
    method: 'PUT',
    description: 'Update account information',
    body: {
      name: { type: 'string', required: false, description: 'New account name' },
    },
    response: {
      type: 'Account',
      description: 'Updated account',
    },
    headers: ['x-api-key', 'Content-Type'],
  },
};
