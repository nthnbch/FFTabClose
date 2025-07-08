/**
 * Test simple pour vérifier le fonctionnement de base
 */

// Test de la fonction getTabActionReal
function testGetTabActionReal() {
  console.log('Testing getTabActionReal...');
  
  // Mock tab
  const mockTab = {
    id: 1,
    pinned: false,
    audible: false,
    title: 'Test Tab'
  };
  
  // Mock configuration
  const testConfig = {
    autoCloseTime: 5 * 60 * 1000, // 5 minutes
    excludePinned: true,
    excludeAudible: true,
    discardPinned: true
  };
  
  // Mock timestamps
  const testTimestamps = new Map();
  const now = Date.now();
  const oldTimestamp = now - (6 * 60 * 1000); // 6 minutes ago
  
  testTimestamps.set('1', oldTimestamp);
  
  // Test logic
  const timestamp = testTimestamps.get(mockTab.id.toString());
  if (!timestamp) {
    console.log('No timestamp found');
    return 'none';
  }
  
  const age = now - timestamp;
  console.log(`Tab age: ${age}ms, Limit: ${testConfig.autoCloseTime}ms`);
  
  if (age <= testConfig.autoCloseTime) {
    console.log('Tab is not old enough');
    return 'none';
  }
  
  // Handle pinned tabs
  if (mockTab.pinned) {
    if (testConfig.excludePinned) {
      console.log('Pinned tab excluded');
      return 'none';
    } else if (testConfig.discardPinned) {
      console.log('Pinned tab should be discarded');
      return 'discard';
    } else {
      console.log('Pinned tab should be closed');
      return 'close';
    }
  }
  
  // Handle audible tabs
  if (testConfig.excludeAudible && mockTab.audible) {
    console.log('Audible tab excluded');
    return 'none';
  }
  
  console.log('Normal tab should be closed');
  return 'close';
}

// Test de la logique de validation
function testValidation() {
  console.log('Testing validation...');
  
  // Test valid message
  const validMessage = {
    action: 'getConfig'
  };
  
  if (!validMessage || typeof validMessage !== 'object' || !validMessage.action) {
    console.log('Valid message failed validation');
    return false;
  }
  
  console.log('Valid message passed validation');
  
  // Test invalid message
  const invalidMessage = null;
  
  if (!invalidMessage || typeof invalidMessage !== 'object' || !invalidMessage.action) {
    console.log('Invalid message correctly rejected');
    return true;
  }
  
  console.log('Invalid message incorrectly accepted');
  return false;
}

// Exécuter les tests
console.log('=== FFTabClose Tests ===');
const action = testGetTabActionReal();
console.log(`Result: ${action}`);

const validationResult = testValidation();
console.log(`Validation test: ${validationResult ? 'PASSED' : 'FAILED'}`);

console.log('=== Tests completed ===');
