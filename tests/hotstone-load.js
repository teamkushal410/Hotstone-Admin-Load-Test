import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export function setup() {
  if (!BASE_URL || !EMAIL || !PASSWORD || !RESTAURANT_ID) {
    throw new Error(
      `Missing required env vars. BASE_URL=${BASE_URL}, EMAIL=${EMAIL ? '***' : 'undefined'}, PASSWORD=${PASSWORD ? '***' : 'undefined'}, RESTAURANT_ID=${RESTAURANT_ID}`
    );
  }

  const loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
  }

  const token = loginRes.json('token');
  if (!token) throw new Error('Login failed: No token returned');

  return { token };
}

export default function (data) {
  // Admin offers
  const offersRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(offersRes, { 'offers success': (r) => r.status === 200 });

  // Customer offers
  const customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'x-restaurant-id': RESTAURANT_ID,
    },
  });
  check(customerRes, { 'customer offers success': (r) => r.status === 200 });

  sleep(3);
}
