import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50, // virtual users
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% requests < 1s
    http_req_failed: ['rate<0.01'],    // <1% failure
  },
};

const BASE_URL = 'https://hotstoneadmin.2klips.com';

export default function () {
  // Example: Login API
  const loginPayload = JSON.stringify({
    email: 'admin@test.com',
    password: '123456',
  });

  const headers = {
    'Content-Type': 'application/json',
  };

  let loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers });

  check(loginRes, {
    'login success': (r) => r.status === 200,
  });

  let token = loginRes.json('token');

  // Example: Get Hero Banners
  let bannerRes = http.get(`${BASE_URL}/hero-banners`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(bannerRes, {
    'banner fetch success': (r) => r.status === 200,
  });

  sleep(1);
}
