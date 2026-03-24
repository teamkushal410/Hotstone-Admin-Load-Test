import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },    // ramp-up
    { duration: '1m', target: 10 },    // moderate load
    { duration: '1m', target: 20 },    // high load
    { duration: '1m', target: 30 },    // stress
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],    // <5% failed requests
    http_req_duration: ['p(95)<1000'], // p95 < 1000ms
  },
};

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export function setup() {
  // Check required environment variables
  if (!BASE_URL || !EMAIL || !PASSWORD || !RESTAURANT_ID) {
    throw new Error(
      `Missing env vars. BASE_URL=${BASE_URL}, EMAIL=${EMAIL ? '***' : 'undefined'}, PASSWORD=${PASSWORD ? '***' : 'undefined'}, RESTAURANT_ID=${RESTAURANT_ID}`
    );
  }

  // Login once
  const loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
  }

  const token = loginRes.json('token');
  if (!token) {
    throw new Error('Login failed: No token returned');
  }

  return { token };
}

export default function (data) {
  // 1️⃣ Admin offers
  const offersRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(offersRes, { 'offers success': (r) => r.status === 200 });

  // 2️⃣ Customer offers
  const customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'x-restaurant-id': RESTAURANT_ID,
    },
  });
  check(customerRes, { 'customer offers success': (r) => r.status === 200 });

  // Sleep to respect rate limit (~25 req/minute)
  sleep(3);
}
