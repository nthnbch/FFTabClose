/**
 * FFTabClose - Test Setup
 * Sets up the test environment for Jest
 */

// Mock browser API
global.browser = {
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    create: jest.fn()
  },
  windows: {
    getAll: jest.fn(),
    getCurrent: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  contextualIdentities: {
    query: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  runtime: {
    getManifest: jest.fn().mockReturnValue({ version: '3.1.0' }),
    getBrowserInfo: jest.fn().mockResolvedValue({ name: 'Firefox', version: '117.0' }),
    getPlatformInfo: jest.fn().mockResolvedValue({ os: 'mac', arch: 'x86-64' }),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  i18n: {
    getMessage: jest.fn((key) => key)
  }
};

// Mock console for testing log levels
const originalConsole = { ...console };
global.originalConsole = originalConsole;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});