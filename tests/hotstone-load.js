import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // only 1 VU to stay under API rate limit
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL;       // https://apiloyalty.hotstonelondon.com
const EMAIL = __ENV.EMAIL;             // admin@gmail.com
const PASSWORD = __ENV.PASSWORD;       // Password@1
const RESTAURANT_ID = __ENV.RESTAURANT_ID; // from GitHub secrets

export function setup() {
  // Admin login
  const loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    throw new Error(`Login failed: ${loginRes.status} - ${loginRes.body}`);
  }

  const token = loginRes.json('accessToken');
  if (!token) throw new Error('No accessToken returned');

  return { token };
}

export default function (data) {
  // 1️⃣ Admin: fetch all offers
  const adminRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(adminRes, { 'admin offers success': (r) => r.status === 200 });

  // 2️⃣ Customer: fetch special offers
  if (RESTAURANT_ID) {
    const customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'x-restaurant-id': RESTAURANT_ID,
      },
    });
    check(customerRes, { 'customer offers success': (r) => r.status === 200 });
  }

  // Respect API rate limit ~25 requests per minute
  sleep(2.5);
}
