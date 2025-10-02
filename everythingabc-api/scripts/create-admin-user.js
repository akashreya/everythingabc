const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
require('dotenv').config();

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/everythingabc');
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ email: 'admin@everythingabc.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Role: ${existingAdmin.role}`);
      console.log(`🔑 ID: ${existingAdmin.id}`);
      return;
    }

    console.log('👤 Creating admin user...');
    const adminUser = new AdminUser({
      id: 'admin-user-001',
      email: 'admin@everythingabc.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: [
        'categories.create',
        'categories.read',
        'categories.update',
        'categories.delete',
        'items.create',
        'items.read',
        'items.update',
        'items.delete',
        'items.approve',
        'analytics.read',
        'users.manage',
        'settings.update'
      ],
      isActive: true
    });

    // Set password (this will be hashed automatically by the pre-save middleware)
    await adminUser.setPassword('admin123');
    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log(`📧 Email: admin@everythingabc.com`);
    console.log(`🔑 Password: admin123`);
    console.log(`👤 Role: ${adminUser.role}`);
    console.log(`🆔 ID: ${adminUser.id}`);

    // Also create an editor user for testing
    const editorExists = await AdminUser.findOne({ email: 'editor@everythingabc.com' });
    if (!editorExists) {
      console.log('👤 Creating editor user...');
      const editorUser = new AdminUser({
        id: 'editor-user-001',
        email: 'editor@everythingabc.com',
        firstName: 'Editor',
        lastName: 'User',
        role: 'editor',
        permissions: [
          'categories.read',
          'items.create',
          'items.read',
          'items.update'
        ],
        isActive: true
      });

      await editorUser.setPassword('editor123');
      await editorUser.save();

      console.log('🎉 Editor user created successfully!');
      console.log(`📧 Email: editor@everythingabc.com`);
      console.log(`🔑 Password: editor123`);
      console.log(`👤 Role: ${editorUser.role}`);
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };