/**
 * FFTabClose - Common Utilities
 * Shared utility functions used throughout the extension
 * 
 * Version 3.1.0
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  
  // Create a temporary element
  const tempElement = document.createElement('div');
  // Set its text content (not innerHTML) which escapes HTML
  tempElement.textContent = str;
  // Return the escaped content
  return tempElement.textContent;
}

/**
 * Format a time duration in milliseconds to a human-readable string
 * @param {number} milliseconds - The time duration in milliseconds
 * @returns {string} - Human-readable time string
 */
export function formatTimeForDisplay(milliseconds) {
  // Convert to minutes for calculation
  const minutes = Math.floor(milliseconds / 60000);
  
  if (minutes < 60) {
    return `${minutes} ${browser.i18n.getMessage('timeMin') || 'min'}`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hoursText = browser.i18n.getMessage('timeHours') || 'hrs';
    const minsText = browser.i18n.getMessage('timeMin') || 'min';
    
    return `${hours} ${hoursText}${mins > 0 ? ` ${mins} ${minsText}` : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const daysText = browser.i18n.getMessage('timeDays') || 'days';
    const hoursText = browser.i18n.getMessage('timeHours') || 'hrs';
    
    return `${days} ${daysText}${hours > 0 ? ` ${hours} ${hoursText}` : ''}`;
  }
}

/**
 * Get a URL parameter value
 * @param {string} name - The parameter name
 * @returns {string|null} - The parameter value or null if not found
 */
export function getUrlParameter(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Create and show a notification to the user
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
    
    // Add styles
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '9999';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
  }
  
  // Set type-specific styles
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
      break;
    case 'error':
      notification.style.backgroundColor = '#F44336';
      notification.style.color = 'white';
      break;
    case 'warning':
      notification.style.backgroundColor = '#FF9800';
      notification.style.color = 'white';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#2196F3';
      notification.style.color = 'white';
      break;
  }
  
  // Set content and show
  notification.textContent = sanitizeHTML(message);
  notification.style.opacity = '1';
  
  // Hide after duration
  setTimeout(() => {
    notification.style.opacity = '0';
  }, duration);
}
