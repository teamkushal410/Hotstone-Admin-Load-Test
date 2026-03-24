import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3, // 1 VU per admin account
  duration: '4m',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

const ADMINS = [
  { email: __ENV.EMAIL, password: __ENV.PASSWORD },
  { email: __ENV.EMAIL1, password: __ENV.PASSWORD1 },
  { email: __ENV.EMAIL2, password: __ENV.PASSWORD2 },
];

function adminLogin(email, password) {
  const res = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed for ${email}: ${res.status} - ${res.body}`);
  }
  return res.json('accessToken');
}

export function setup() {
  const tokens = ADMINS.map(acc => adminLogin(acc.email, acc.password));
  return { tokens };
}

export default function (data) {
  const vuIndex = __VU - 1;
  const token = data.tokens[vuIndex % data.tokens.length];

  const adminRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(adminRes, { 'admin offers success': (r) => r.status === 200 });

  if (RESTAURANT_ID) {
    const custRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-restaurant-id': RESTAURANT_ID,
      },
    });
    check(custRes, { 'customer offers success': (r) => r.status === 200 });
  }

  // Rate limit: ~25 requests/min → 1 request every 2.5s
  sleep(2.5);
}
