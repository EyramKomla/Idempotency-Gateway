
const http = require('http');

const makeRequest = (method, path, body, headers) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data ? JSON.parse(data) : {}
                });
            });
        });

        req.on('error', (e) => {
            console.error(`Request failed: ${e.message}`);
            reject(e);
        });
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

const runTests = async () => {
    console.log('Starting Verification Tests...');
    const key = `key_${Date.now()}`;

    // Test 1: Happy Path
    console.log('\nTest 1: Happy Path (First Request)');
    const start1 = Date.now();
    const res1 = await makeRequest('POST', '/process-payment', { amount: 100, currency: 'GHS' }, { 'Idempotency-Key': key });
    const end1 = Date.now();
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Body:`, res1.body);
    console.log(`Time: ${end1 - start1}ms`);
    if (res1.statusCode === 201 && res1.body.message.includes('Charged 100 GHS')) {
        console.log('✅ Test 1 Passed');
    } else {
        console.error('❌ Test 1 Failed');
    }

    // Test 2: Duplicate Request
    console.log('\nTest 2: Duplicate Request (Idempotency)');
    const start2 = Date.now();
    const res2 = await makeRequest('POST', '/process-payment', { amount: 100, currency: 'GHS' }, { 'Idempotency-Key': key });
    const end2 = Date.now();
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Body:`, res2.body);
    console.log(`headers['x-cache-hit']: ${res2.headers['x-cache-hit']}`);
    console.log(`Time: ${end2 - start2}ms`);
    if (res2.statusCode === 201 && res2.headers['x-cache-hit'] === 'true' && (end2 - start2) < 100) {
        console.log('✅ Test 2 Passed');
    } else {
        console.error('❌ Test 2 Failed');
    }

    // Test 3: Body Mismatch
    console.log('\nTest 3: Body Mismatch');
    const res3 = await makeRequest('POST', '/process-payment', { amount: 500, currency: 'GHS' }, { 'Idempotency-Key': key });
    console.log(`Status: ${res3.statusCode}`);
    console.log(`Body:`, res3.body);
    if (res3.statusCode === 422 || res3.statusCode === 409) {
        console.log('✅ Test 3 Passed');
    } else {
        console.error('❌ Test 3 Failed');
    }

    // Test 4: Concurrent Requests
    console.log('\nTest 4: Concurrent Requests');
    const concurrentKey = `key_conc_${Date.now()}`;
    const reqPromiseA = makeRequest('POST', '/process-payment', { amount: 200, currency: 'USD' }, { 'Idempotency-Key': concurrentKey });
    const reqPromiseB = new Promise(resolve => setTimeout(async () => {
        resolve(await makeRequest('POST', '/process-payment', { amount: 200, currency: 'USD' }, { 'Idempotency-Key': concurrentKey }));
    }, 100)); // Start B slightly after A but while A is processing

    const [resA, resB] = await Promise.all([reqPromiseA, reqPromiseB]);

    console.log('Request A:', resA.statusCode, resA.body.message);
    console.log('Request B:', resB.statusCode, resB.headers['x-cache-hit']);

    if (resA.statusCode === 201 && resB.statusCode === 201 && resB.headers['x-cache-hit'] === 'true') {
        console.log('✅ Test 4 Passed');
    } else {
        console.error('❌ Test 4 Failed');
    }

    process.exit(0); // Exit manually if needed, or let node exit
};

// Wait for server to start (simple delay for test script execution context)
setTimeout(runTests, 1000);
