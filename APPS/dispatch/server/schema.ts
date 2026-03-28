import { pgSchema, uuid, text, real, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// All dispatch tables live in the 'dispatch' PostgreSQL schema,
// isolated from the shared 'public' schema used by peacepad/ATEAM.
const dispatch = pgSchema('dispatch');

export const serviceTypeEnum = dispatch.enum('service_type', ['gas', 'lockout', 'jump', 'tire', 'other']);
export const requestStatusEnum = dispatch.enum('request_status', ['pending', 'accepted', 'en_route', 'completed', 'cancelled']);

export const operators = dispatch.table('operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  pinHash: text('pin_hash'),
  fcmToken: text('fcm_token'),
  vapidSub: jsonb('vapid_sub'),
  serviceRadiusKm: integer('service_radius_km').default(25),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const incidents = dispatch.table('incidents', {
  id: text('id').primaryKey(),
  eventType: text('event_type'),
  description: text('description'),
  roadway: text('roadway'),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  severity: text('severity'),
  startDate: text('start_date'),
  lastUpdated: text('last_updated'),
  alerted: boolean('alerted').default(false),
  alertedAt: timestamp('alerted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const requests = dispatch.table('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  locationLat: real('location_lat'),
  locationLng: real('location_lng'),
  locationAddress: text('location_address'),
  serviceType: serviceTypeEnum('service_type').notNull(),
  status: requestStatusEnum('status').default('pending'),
  operatorId: uuid('operator_id').references(() => operators.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  completedAt: timestamp('completed_at'),
});
