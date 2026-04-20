require('dotenv').config();
const mongoose = require('mongoose');

async function main(){
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Student = require('../models/Student');
  const SuspensionInquiry = require('../models/SuspensionInquiry');

  // change these values as needed
  const testEmail = process.env.TEST_STUDENT_EMAIL || 'test.student@example.com';

  let student = await Student.findOne({ email: testEmail.toLowerCase() });
  if (!student) {
    student = await Student.create({ name: 'Test Student', email: testEmail.toLowerCase(), password: 'password123' });
    console.log('Created test student:', student._id.toString());
  } else {
    console.log('Found student:', student._id.toString());
  }

  const inquiry = await SuspensionInquiry.create({ studentId: student._id, message: 'Test inquiry from script' });
  console.log('Created inquiry:', inquiry._id.toString());

  const found = await SuspensionInquiry.findById(inquiry._id).populate('studentId', 'name email');
  console.log('Populated inquiry:', found);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
