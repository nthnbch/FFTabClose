/**
 * FFTabClose - Domain Rule Dialog Script
 * Handles the domain rule dialog UI interactions
 * 
 * Version 3.0.0
 * Last updated: 18 July 2025
 */

// Helper function to sanitize text content (XSS protection)
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  
  const tempElement = document.createElement('div');
  tempElement.textContent = str;
  return tempElement.textContent;
}

// Helper function to get URL parameters
function getUrlParameter(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Handle radio button changes for custom timeout
function toggleTimeoutContainer() {
  const customTimeoutRadio = document.getElementById('customTimeout');
  const timeoutContainer = document.getElementById('timeoutContainer');
  
  if (customTimeoutRadio.checked) {
    timeoutContainer.classList.add('active');
  } else {
    timeoutContainer.classList.remove('active');
  }
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const domain = document.getElementById('domainInput').value.trim();
  const action = document.querySelector('input[name="action"]:checked').value;
  const timeout = document.getElementById('customTimeoutValue').value;
  
  // Basic validation
  if (!domain) {
    alert('Please enter a domain name.');
    return;
  }
  
  try {
    // Send message to popup to save the rule
    await browser.runtime.sendMessage({
      action: 'saveDomainRule',
      data: {
        domain,
        action,
        timeout: action === 'custom-timeout' ? parseInt(timeout, 10) : null
      }
    });
    
    // Close dialog
    window.close();
  } catch (error) {
    console.error('Error saving domain rule:', error);
    alert('Could not save the domain rule. Please try again.');
  }
}

// Initialize dialog
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Set up event listeners
    document.querySelectorAll('input[name="action"]').forEach(radio => {
      radio.addEventListener('change', toggleTimeoutContainer);
    });
    
    document.getElementById('domainForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelButton').addEventListener('click', () => window.close());
    
    // Initialize UI state
    toggleTimeoutContainer();
    
    // Check if we're editing an existing rule
    const editDomain = getUrlParameter('domain');
    if (editDomain) {
      document.getElementById('dialogTitle').textContent = 'Edit Domain Rule';
      document.getElementById('domainInput').value = sanitizeHTML(editDomain);
      document.getElementById('domainInput').readOnly = true;
      
      // Fetch the existing rule data
      const response = await browser.runtime.sendMessage({
        action: 'getDomainRule',
        domain: editDomain
      });
      
      if (response && response.rule) {
        const rule = response.rule;
        
        // Set form values based on rule
        document.querySelector(`input[value="${rule.action}"]`).checked = true;
        
        if (rule.action === 'custom-timeout' && rule.timeout) {
          document.getElementById('customTimeoutValue').value = rule.timeout;
          toggleTimeoutContainer();
        }
      }
    }
    
    // Apply i18n if available
    if (browser.i18n) {
      // Translate dialog elements
      const elementsToTranslate = {
        'dialogTitle': 'domainRuleDialogTitle',
        'domainInput': 'domainInputLabel',
        'neverClose': 'neverCloseOption',
        'alwaysClose': 'alwaysCloseOption',
        'customTimeout': 'customTimeoutOption',
        'cancelButton': 'cancelButtonLabel',
        'saveButton': 'saveButtonLabel'
      };
      
      for (const [id, msgKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(id);
        if (element) {
          const translated = browser.i18n.getMessage(msgKey);
          if (translated) {
            if (element.tagName === 'INPUT') {
              if (element.type === 'text') {
                element.placeholder = sanitizeHTML(translated);
              }
            } else {
              element.textContent = sanitizeHTML(translated);
            }
          }
        }
      }
      
      // Translate labels associated with radio buttons
      document.querySelectorAll('input[type="radio"] + label').forEach(label => {
        const radioId = label.getAttribute('for');
        if (radioId) {
          const translated = browser.i18n.getMessage(`${radioId}Label`);
          if (translated) {
            label.textContent = sanitizeHTML(translated);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error initializing domain rule dialog:', error);
  }
});
