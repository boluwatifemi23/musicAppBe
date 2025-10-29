require('dotenv').config();
const cloudinary = require('./config/cloudinary');

(async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary connected:", result);
  } catch (error) {
    console.error("❌ Cloudinary error:", error);
  }
})();
