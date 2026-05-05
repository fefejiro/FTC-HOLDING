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
  lastLocationLat: real('last_location_lat'),
  lastLocationLng: real('last_location_lng'),
  lastLocationLabel: text('last_location_label'),
  lastLocationAccuracyMeters: integer('last_location_accuracy_meters'),
  lastLocationAt: timestamp('last_location_at'),
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
  viewCount: integer('view_count').default(0),
  actionCount: integer('action_count').default(0),
  actioned: boolean('actioned').default(false),
  lastViewedAt: timestamp('last_viewed_at'),
  lastActionedAt: timestamp('last_actioned_at'),
  lastViewedByOperatorId: uuid('last_viewed_by_operator_id').references(() => operators.id),
  lastActionedByOperatorId: uuid('last_actioned_by_operator_id').references(() => operators.id),
  workflowStatus: text('workflow_status'),
  workflowOperatorId: uuid('workflow_operator_id').references(() => operators.id),
  workflowStartedAt: timestamp('workflow_started_at'),
  workflowResolvedAt: timestamp('workflow_resolved_at'),
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
  enRouteAt: timestamp('en_route_at'),
  completedAt: timestamp('completed_at'),
});
