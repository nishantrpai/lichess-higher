/**
 * Lichess Higher Chrome Extension
 * Content script that injects our wager functionality into Lichess.org
 */

// Import our MetaMask detection helper
import { detectEthereumProvider } from './detectMetaMask';

// Import our Lichess Wager functionality
import './lichessWager';

// Global variable to store Ethereum provider info
window.ethereumProviderInfo = null;

// Run MetaMask detection
console.log("Content script: Starting MetaMask detection");
detectEthereumProvider().then(result => {
  console.log("Content script: MetaMask detection result", result);
  window.ethereumProviderInfo = result;
  
  // Dispatch event for other scripts
  document.dispatchEvent(new CustomEvent('ETHEREUM_PROVIDER_DETECTED', {
    detail: result
  }));
});

// Track current URL for SPA navigation
let currentUrl = window.location.href;
let isProcessing = false;

/**
 * Check if we're on a Lichess game page
 * Lichess game URLs follow patterns like:
 * - https://lichess.org/HaekyGW1 (regular game view)
 * - https://lichess.org/HaekyGW1/white (white's perspective)
 * - https://lichess.org/HaekyGW1/black (black's perspective)
 */
const isLichessGamePage = () => {
  const url = window.location.href;
  // Match URLs like https://lichess.org/{gameId} or https://lichess.org/{gameId}/{perspective}
  // Game IDs are 8 characters of alphanumeric content
  return /^https:\/\/lichess\.org\/[a-zA-Z0-9]{8}(\/.*)?$/.test(url);
};

/**
 * Initialize our extension when on a game page
 */
const initialize = () => {
  if (isProcessing) return;
  isProcessing = true;
  
  if (isLichessGamePage()) {
    console.log("Lichess Higher: On game page, initializing UI");
    // The actual UI initialization is handled in lichessWager.js
  }
  
  isProcessing = false;
};

/**
 * Watch for DOM changes to detect route changes in Lichess
 */
const observeDOMChanges = () => {
  console.log("Lichess Higher: Setting up mutation observer");
  
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      console.log("Lichess Higher: URL changed to", currentUrl);
      
      // Short delay to ensure DOM is ready
      setTimeout(initialize, 500);
    }
  });

  observer.observe(document, {
    subtree: true, childList: true, attributes: false
  });
};

// Set up event listeners

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log("Lichess Higher: DOM loaded");
  initialize();
});

// Handle navigation via history API
window.addEventListener('popstate', () => {
  console.log("Lichess Higher: Navigation occurred");
  initialize();
});

// Handle hash changes
window.addEventListener('hashchange', () => {
  console.log("Lichess Higher: Hash changed");
  initialize();
});

// Handle clicks that might change the URL
window.addEventListener("click", () => {
  setTimeout(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      initialize();
    }
  }, 100);
}, true);

// Start observing DOM changes
observeDOMChanges();

// Initial check
initialize();
