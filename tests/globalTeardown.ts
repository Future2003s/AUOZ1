export default async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Test environment cleaned up');
};
