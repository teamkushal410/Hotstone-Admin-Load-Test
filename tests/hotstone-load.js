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
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const EMAIL = __ENV.EMAIL;
const PASSWORD = __ENV.PASSWORD;
const RESTAURANT_ID = __ENV.RESTAURANT_ID;

export function setup() {
  // Login once, get token
  let loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('token');

  if (!token) {
    throw new Error('Login failed – no token received');
  }

  return { token };
}

export default function (data) {
  // Call admin offers
  let offersRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  check(offersRes, {
    'offers success': (r) => r.status === 200,
  });

  // Call customer offers
  let customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
    headers: { 
      Authorization: `Bearer ${data.token}`,
      'x-restaurant-id': RESTAURANT_ID
    },
  });

  check(customerRes, {
    'customer offers success': (r) => r.status === 200,
  });

  // Respect rate limit (~1 request every 2.5-3s per endpoint)
  sleep(3);
}
