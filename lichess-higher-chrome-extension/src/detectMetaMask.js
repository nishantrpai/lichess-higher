/**
 * MetaMask Detection Helper
 * 
 * This script helps detect MetaMask or other Ethereum providers in Manifest V3 extensions.
 * This is an ES module that exports a function to detect Ethereum providers.
 */

console.log("MetaMask Detection Helper loaded");

// Helper function to detect Ethereum provider in the page context
const detectEthereumProvider = () => {
  return new Promise((resolve) => {
    // We need to inject a script into the page to access window.ethereum
    const script = document.createElement('script');
    script.textContent = `
      // This script runs in page context with access to window.ethereum
      (function() {
        function checkForEthereum() {
          let details = {
            timestamp: Date.now(),
            hasEthereum: !!window.ethereum,
            isMetaMask: window.ethereum?.isMetaMask || false,
            hasProviders: !!window.ethereum?.providers,
            providersCount: window.ethereum?.providers?.length || 0,
            chainId: window.ethereum?.chainId || 'unknown'
          };
          
          document.dispatchEvent(new CustomEvent('METAMASK_DETECTION_RESULT', { 
            detail: details 
          }));
        }
        
        // Check immediately and again after a short delay
        checkForEthereum();
        setTimeout(checkForEthereum, 1000);
      })();
    `;
    
    // Listen for the result from the page context
    const listener = (event) => {
      console.log("MetaMask detection result:", event.detail);
      document.removeEventListener('METAMASK_DETECTION_RESULT', listener);
      resolve(event.detail);
    };
    
    document.addEventListener('METAMASK_DETECTION_RESULT', listener);
    
    // Inject the script
    (document.head || document.documentElement).appendChild(script);
    script.remove(); // Script tags execute even when removed immediately
  });
};

// Override the ethereum detection in lichessWager.js
window.detectEthereumProvider = detectEthereumProvider;

// Run detection immediately
detectEthereumProvider().then(result => {
  console.log("MetaMask detection completed:", result);
  
  // Send results to background script via chrome.runtime if needed
  if (chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'METAMASK_DETECTION',
      result: result
    });
  }
});

// Export for use in other modules
export { detectEthereumProvider };
