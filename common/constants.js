/**
 * FFTabClose - Constants
 * Central location for all constants used throughout the extension
 * 
 * Version 3.1.0
 */

// Default settings
export const DEFAULT_SETTINGS = {
  timeLimit: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
  discardPinnedTabs: true, // Always unload pinned tabs instead of closing them
  excludeAudioTabs: true,
  closeOnStart: true
};

// Storage keys
export const STORAGE_KEYS = {
  TAB_TIMESTAMPS: 'tabTimestamps',
  SETTINGS: 'settings',
  DOMAIN_RULES: 'domainRules'
};

// Alarm names
export const ALARM_NAMES = {
  CHECK_TABS: 'checkTabsAlarm',
  UPDATE_TIMESTAMPS: 'updateTimestampsAlarm'
};

// Check intervals (in minutes)
export const CHECK_INTERVALS = {
  TABS: 0.5, // Check tabs every 30 seconds
  TIMESTAMPS: 0.25 // Update timestamps every 15 seconds
};

// Debug levels
export const DEBUG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5
};

// Debug mode configuration
export const DEBUG_CONFIG = {
  LEVEL: DEBUG_LEVELS.INFO, // Set default debug level
  ENABLED: false // Set to true to enable debug logging
};

// Zen workspace detection patterns
export const ZEN_PATTERNS = {
  NAMES: [
    'zen',
    'Zen',
    'space',
    'Space',
    'workspace',
    'Workspace',
    'container',
    'Container'
  ],
  IDS: [
    'zen',
    'container-',
    'firefox-container-',
    'userContext'
  ]
};

// Tab actions
export const TAB_ACTIONS = {
  CLOSE: 'close',
  DISCARD: 'discard',
  KEEP: 'keep'
};

// Domain rule actions
export const DOMAIN_RULE_ACTIONS = {
  NEVER_CLOSE: 'never-close',
  ALWAYS_CLOSE: 'always-close',
  CUSTOM_TIMEOUT: 'custom-timeout'
};

// Extension info
export const EXTENSION_INFO = {
  NAME: 'FFTabClose',
  VERSION: '3.1.0'
};

// Supported Firefox containers
export const CONTAINER_TYPES = {
  DEFAULT: 'firefox-default',
  PRIVATE: 'firefox-private',
  CONTEXTUAL: 'firefox-container-'
};