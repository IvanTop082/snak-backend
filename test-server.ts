import http from 'http';

const testPrompt = "Hello, this is a test message. Can you confirm you received this?";

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/ask',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', response);
    } catch (error) {
      console.error('Error parsing response:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error);
});

// Send the request
req.write(JSON.stringify({ prompt: testPrompt }));
req.end(); 