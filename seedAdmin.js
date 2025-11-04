// seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('⚠️ Admin already exists:', existingAdmin.email);
            process.exit(0);
        }

        const admin = await User.create({
            name: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            role: 'admin',
            isVerified: true,
        });

        console.log('✅ Admin created successfully');
        console.log(`Login with:\nEmail: ${admin.email}\nPassword: (hidden in .env)`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
})();
