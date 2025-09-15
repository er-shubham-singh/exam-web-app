import mongoose from "mongoose";
import dotenv from "dotenv";
import Domain from "../src/Modal/domain.model.js";
import { DOMAIN_DATA } from "./domain.data.js";

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    await Domain.deleteMany({});
    const result = await Domain.insertMany(DOMAIN_DATA);

    console.log(`🌱 Seeded domains: ${result.length}`);
  } catch (err) {
    console.error("Seed error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
