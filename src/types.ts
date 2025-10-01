/**
 * Core type definitions for the Kalendis API
 * All dates are ISO 8601 strings to preserve timezone information
 */

export enum DaysOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY'
}

export enum Role {
  STANDARD = 'STANDARD',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  timeZone: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Availability {
  id: string;
  start: string;
  end: string;
  utcOffsetStart: number;
  utcOffsetEnd: number;
  timeZone: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringAvailability {
  id: string;
  daysOfWeek: DaysOfWeek[];
  start: string;
  end: string;
  expiration?: string;
  startDayOffset: number;
  endDayOffset: number;
  utcOffsetStart: number;
  utcOffsetEnd: number;
  timeZone: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityException {
  id: string;
  start: string;
  end: string;
  utcOffsetStart: number;
  utcOffsetEnd: number;
  timeZone?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  start: string;
  end: string;
  utcOffsetStart: number;
  utcOffsetEnd: number;
  timeZone: string;
  userIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  active: boolean;
  name: string;
  role: Role;
  apiCallsUsed: number;
  apiCallsIncluded: number;
  lastUsageReset?: string;
}

export interface AddUserRequest {
  id?: string;
  name: string;
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  timeZone?: string;
}

export interface AddAvailabilityRequest {
  userId: string;
  start: string;
  end: string;
  timeZone?: string;
}

export interface UpdateAvailabilityRequest {
  availabilityId: string;
  userId: string;
  start?: string;
  end?: string;
  timeZone?: string;
}

export interface AddRecurringAvailabilityRequest {
  userId: string;
  daysOfWeek: DaysOfWeek[];
  start: string;
  end: string;
  expiration?: string;
  startDayOffset?: number;
  endDayOffset?: number;
  timeZone?: string;
}

export interface UpdateRecurringAvailabilityRequest {
  id: string;
  daysOfWeek?: DaysOfWeek[];
  start?: string;
  end?: string;
  expiration?: string;
  startDayOffset?: number;
  endDayOffset?: number;
  timeZone?: string;
}

export interface AddAvailabilityExceptionRequest {
  userId: string;
  start: string;
  end: string;
  timeZone?: string;
}

export interface AddRecurringAvailabilityExceptionRequest {
  userId: string;
  start: string;
  end: string;
  numberOfWeeks: number;
  timeZone?: string;
}

export interface UpdateAvailabilityExceptionRequest {
  availabilityExceptionId: string;
  userId: string;
  start?: string;
  end?: string;
  timeZone?: string;
}

export interface AddBookingRequest {
  users: string[];
  start: string;
  end: string;
  allowDoubleBooking?: boolean;
  timeZone?: string;
}

export interface UpdateBookingRequest {
  bookingId: string;
  users?: string[];
  start?: string;
  end?: string;
  timeZone?: string;
}

export interface GetBookingsByIdsRequest {
  bookingIds: string[];
}

export interface UpdateAccountRequest {
  name?: string;
}

export interface GetAvailabilityParams {
  userId?: string;
  start?: string;
  end?: string;
}

export interface GetRecurringAvailabilityParams {
  userId?: string;
}

export interface GetAvailabilityExceptionParams {
  userId?: string;
}

export interface GetBookingParams {
  bookingId?: string;
}

export interface DeleteParams {
  id: string;
}

export interface ApiError {
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface GetMultiUserCalculatedAvailabilityRequest {
  userIds: string[];
  start: string;
  end: string;
  duration: number;
}

export interface GetRecurringAvailabilityByDateRequest {
  userId: string;
  date: string;
}

export interface GetMatchingAvailabilityByDateRequest {
  userIds: string[];
  date: string;
}