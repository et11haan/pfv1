import mongoose from 'mongoose';
import User from './models/User.js';

const MONGODB_URI = "mongodb+srv://admin:Unhackabl1million@pfnet.xx2jvx6.mongodb.net/parts_marketplace?retryWrites=true&w=majority";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const result = await User.updateOne(
    { email: "eth.haan.gm@gmail.com" },
    { $set: { isAdminForTags: ["Honda", "BMW"] } }
  );
  console.log(result);
  await mongoose.disconnect();
}

run(); 