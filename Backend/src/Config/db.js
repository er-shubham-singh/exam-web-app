import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const connectDb = async () => {
  console.log(MONGO_URI)
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully:', MONGO_URI);
  } catch (error) {
    console.error('❌ Error while connecting to MongoDB:', error.message);
    process.exit(1); // Optional: Exit the process on failure
  }
};

export default connectDb;
