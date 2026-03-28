import { pgTable, uuid, text, real, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const serviceTypeEnum = pgEnum('service_type', ['gas', 'lockout', 'jump', 'tire', 'other']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'accepted', 'en_route', 'completed', 'cancelled']);

export const operators = pgTable('operators', {
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

export const incidents = pgTable('incidents', {
  id: text('id').primaryKey(), // Ontario 511 event ID (dedup key)
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

export const requests = pgTable('requests', {
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
