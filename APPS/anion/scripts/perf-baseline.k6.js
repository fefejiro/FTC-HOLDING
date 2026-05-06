import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.ANION_BASE_URL || 'http://127.0.0.1:4178';

const checkoutPayload = JSON.stringify({
  bookingId: 'perf-baseline-unauth',
  planId: 'starter',
  successUrl: `${BASE_URL}/parent?subscribed=1`,
  cancelUrl: `${BASE_URL}/pricing`,
});

export const options = {
  scenarios: {
    health: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'health',
    },
    pricing: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'pricing',
      startTime: '5s',
    },
    billingCheckoutUnauth: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
      exec: 'billingCheckoutUnauth',
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
    'http_req_duration{flow:health}': ['p(95)<250'],
    'http_req_duration{flow:pricing}': ['p(95)<700'],
    'http_req_duration{flow:billing_checkout_unauth}': ['p(95)<500'],
  },
};

export function health() {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { flow: 'health' } });

  check(
    res,
    {
      'health status is 200': (r) => r.status === 200,
      'health body has ok=true': (r) => r.json('ok') === true,
    },
    { flow: 'health' },
  );
}

export function pricing() {
  const res = http.get(`${BASE_URL}/pricing`, { tags: { flow: 'pricing' } });

  check(
    res,
    {
      'pricing status is 200': (r) => r.status === 200,
      'pricing page includes heading': (r) => r.body.includes('Plans &amp; Pricing') || r.body.includes('Plans & Pricing'),
    },
    { flow: 'pricing' },
  );
}

export function billingCheckoutUnauth() {
  const res = http.post(`${BASE_URL}/api/billing/checkout`, checkoutPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { flow: 'billing_checkout_unauth' },
  });

  check(
    res,
    {
      'checkout unauth status is 401': (r) => r.status === 401,
      'checkout unauth code contract': (r) => r.json('code') === 'UNAUTHENTICATED',
    },
    { flow: 'billing_checkout_unauth' },
  );
}
