import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // ramp-up
    { duration: '1m', target: 10 },   // moderate load
    { duration: '1m', target: 15 },   // high load, careful with rate limit
    { duration: '30s', target: 0 },   // ramp-down
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
  // login once to get token
  let loginRes = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
    email: EMAIL,
    password: PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('token');

  return { token };
}

export default function (data) {
  // call /special-offer (admin offers)
  let offersRes = http.get(`${BASE_URL}/special-offer`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  check(offersRes, {
    'offers success': (r) => r.status === 200,
  });

  // call customer-specific API
  let customerRes = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
    headers: { 
      Authorization: `Bearer ${data.token}`,
      'x-restaurant-id': RESTAURANT_ID
    },
  });

  check(customerRes, {
    'customer offers success': (r) => r.status === 200,
  });

  // sleep to respect rate limit (~2.5s per request)
  sleep(3);
}
