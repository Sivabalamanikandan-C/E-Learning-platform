const jwt = require('jsonwebtoken');
const axios = require('axios');

const token = jwt.sign({
  id: '507f1f77bcf86cd799439011',
  role: 'instructor',
  name: 'Test Instructor'
}, 'sivabalan');

console.log('Testing /api/instructor/courses endpoint...\n');

axios.get('http://localhost:5000/api/instructor/courses', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => {
  console.log('✅ Success! Status:', r.status);
  console.log('Data:', JSON.stringify(r.data, null, 2));
})
.catch(e => {
  console.log('❌ Error! Status:', e.response?.status);
  console.log('Response:', JSON.stringify(e.response?.data, null, 2));
  console.log('Message:', e.message);
});
