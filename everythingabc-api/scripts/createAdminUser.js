const mongoose = require('mongoose');
require('dotenv').config();

const AdminUser = require('../models/AdminUser');
const database = require('../db');

/**
 * Script to create a default admin user
 * Usage: node scripts/createAdminUser.js [email] [password] [firstName] [lastName]
 */

async function createAdminUser() {
  try {
    // Connect to database
    await database.connect();
    console.log('✅ Connected to database');

    // Get arguments
    const args = process.argv.slice(2);

    const email = args[0] || 'admin@everythingabc.com';
    const password = args[1] || 'admin123456';
    const firstName = args[2] || 'Admin';
    const lastName = args[3] || 'User';

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findByEmail(email);

    if (existingAdmin) {
      console.log(`❌ Admin user with email ${email} already exists`);
      process.exit(1);
    }

    // Create admin user
    const adminUser = await AdminUser.createUser({
      email,
      passwordHash: password,
      firstName,
      lastName,
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', adminUser.fullName);
    console.log('🛡️ Role:', adminUser.role);
    console.log('📋 Permissions:', adminUser.permissions);
    console.log('');
    console.log('🔐 You can now login to the admin panel with these credentials');
    console.log('🌐 Admin Login: POST /admin/auth/login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);

    if (error.code === 11000) {
      console.error('💡 A user with this email already exists');
    }

    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('✅ Disconnected from database');
    process.exit(0);
  }
}

// Handle script execution
if (require.main === module) {
  console.log('🚀 Creating admin user...');
  console.log('');
  createAdminUser();
}

module.exports = createAdminUser;