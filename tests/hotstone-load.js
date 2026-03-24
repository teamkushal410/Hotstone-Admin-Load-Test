import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '30s', target: 3 },  // ramp-up
        { duration: '3m', target: 3 },   // steady state
        { duration: '30s', target: 0 },  // ramp-down
    ],
    thresholds: {
        http_req_failed: ['rate<0.1'],  // <10% failed requests
        http_req_duration: ['p(95)<1000'],
    },
};

const BASE_URL = __ENV.BASE_URL;

// Load all 3 admin accounts
const ADMINS = [
    { email: __ENV.EMAIL, password: __ENV.PASSWORD },
    { email: __ENV.EMAIL1, password: __ENV.PASSWORD1 },
    { email: __ENV.EMAIL2, password: __ENV.PASSWORD2 },
];

// Rate limit management: 25 requests per minute => 1 request every ~2.4s
const REQUEST_INTERVAL = 2.5; // seconds

// Login function
function adminLogin(admin) {
    let res = http.post(`${BASE_URL}/auth/staff/login`, JSON.stringify({
        email: admin.email,
        password: admin.password
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'login success': (r) => r.status === 200 || r.status === 201,
    });

    if (res.status !== 200 && res.status !== 201) {
        throw new Error(`Login failed for ${admin.email}: ${res.status} - ${res.body}`);
    }

    const body = res.json();
    return body.accessToken;
}

// Fetch special offers
function fetchSpecialOffers(token) {
    let res = http.get(`${BASE_URL}/special-offer/special-offer/customer`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    check(res, {
        'admin offers success': (r) => r.status === 200,
    });

    sleep(REQUEST_INTERVAL);
}

export default function () {
    // Pick a random admin for this iteration
    let admin = ADMINS[Math.floor(Math.random() * ADMINS.length)];
    let token = adminLogin(admin);

    // Hit the offers endpoint
    fetchSpecialOffers(token);
}
