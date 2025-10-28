const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/everythingabc');
const Item = require('./models/Item');

async function checkItemsStatus() {
  try {
    const items = await Item.find({}).limit(3);
    console.log('Sample items from database:');
    items.forEach(item => {
      console.log(`- ${item.name} (Letter: ${item.letter}, Category: ${item.categoryId})`);
      console.log(`  Status: ${item.status}`);
      console.log(`  Quality Status: ${item.quality?.status || 'undefined'}`);
      console.log(`  Has Image: ${item.image ? 'Yes' : 'No'}`);
      console.log('');
    });

    const totalItems = await Item.countDocuments();
    const pendingQuality = await Item.countDocuments({ 'quality.status': 'pending' });
    const approvedQuality = await Item.countDocuments({ 'quality.status': 'approved' });
    const rejectedQuality = await Item.countDocuments({ 'quality.status': 'rejected' });
    const undefinedQuality = await Item.countDocuments({ 'quality.status': { $exists: false } });
    const withImages = await Item.countDocuments({ image: { $exists: true, $ne: null } });

    console.log('Database Summary:');
    console.log(`Total Items: ${totalItems}`);
    console.log(`Pending Quality: ${pendingQuality}`);
    console.log(`Approved Quality: ${approvedQuality}`);
    console.log(`Rejected Quality: ${rejectedQuality}`);
    console.log(`Undefined Quality: ${undefinedQuality}`);
    console.log(`Items with Images: ${withImages}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItemsStatus();