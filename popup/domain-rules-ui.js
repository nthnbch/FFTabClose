/**
 * FFTabClose - Domain Rules Popup Handler
 * Manages domain rules in the popup UI
 * 
 * Version 3.0.0
 * Last updated: 17 juillet 2025
 */

// Handle adding a new domain rule
async function addDomainRule() {
  try {
    // Open domain rule dialog in a new window
    const width = 400;
    const height = 450;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    window.open(
      'domain-rule-dialog.html',
      'domain-rule-dialog',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  } catch (error) {
    console.error('Error opening domain rule dialog:', error);
  }
}

// Handle editing an existing domain rule
async function editDomainRule(domain) {
  try {
    // Open domain rule dialog with domain parameter
    const width = 400;
    const height = 450;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    window.open(
      `domain-rule-dialog.html?domain=${encodeURIComponent(domain)}`,
      'domain-rule-dialog',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  } catch (error) {
    console.error('Error opening domain rule dialog for editing:', error);
  }
}

// Handle removing a domain rule
async function removeDomainRule(domain) {
  try {
    const confirmed = confirm(`Are you sure you want to remove the rule for ${domain}?`);
    if (confirmed) {
      await browser.runtime.sendMessage({
        action: 'removeDomainRule',
        domain
      });
      
      // Refresh the rules list
      loadDomainRules();
    }
  } catch (error) {
    console.error('Error removing domain rule:', error);
  }
}

// Load domain rules into select dropdown
async function loadDomainRules() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getDomainRules' });
    const rules = response.rules || [];
    
    const select = document.getElementById('domainRules');
    select.innerHTML = ''; // Clear existing options
    
    if (rules.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.id = 'noDomainRules';
      option.textContent = browser.i18n.getMessage('noDomainRulesText') || 'None configured';
      select.appendChild(option);
      return;
    }
    
    // Add each rule as an option
    rules.forEach(rule => {
      const option = document.createElement('option');
      option.value = rule.domain;
      option.textContent = rule.domain;
      
      // Add action as data attribute
      option.dataset.action = rule.action;
      
      // Add icon/indicator based on rule type
      let actionText = '';
      switch(rule.action) {
        case 'never-close':
          actionText = ' (never close)';
          break;
        case 'always-close':
          actionText = ' (always close)';
          break;
        case 'custom-timeout':
          const timeInMinutes = Math.floor(rule.timeout / 60000);
          actionText = ` (${timeInMinutes} min)`;
          break;
      }
      
      option.textContent = `${rule.domain}${actionText}`;
      select.appendChild(option);
    });
    
    // Add change handler to enable editing rules
    select.onchange = function() {
      const domain = this.value;
      if (domain) {
        editDomainRule(domain);
      }
    };
  } catch (error) {
    console.error('Error loading domain rules:', error);
  }
}

// Export functions to be used in popup.js
export { 
  addDomainRule,
  editDomainRule,
  removeDomainRule,
  loadDomainRules
};
