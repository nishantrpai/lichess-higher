/**
 * Ethereum Provider Bridge
 * 
 * This script runs in the page context and provides access to window.ethereum
 * It bridges communication between the page context and our content script
 */

// Create a proxy object to communicate with ethereum provider
window.ethereumBridge = {
  isAvailable: !!window.ethereum,
  isMetaMask: window.ethereum?.isMetaMask || false,
  chainId: window.ethereum?.chainId || null
};

// Function to handle Ethereum requests from content script
document.addEventListener('ETHEREUM_REQUEST', function(event) {
  if (!event.detail) return;
  
  const { requestId, method, params } = event.detail;
  
  if (!window.ethereum) {
    document.dispatchEvent(new CustomEvent('ETHEREUM_RESPONSE', {
      detail: { requestId, error: 'No ethereum provider found' }
    }));
    return;
  }
  
  try {
    window.ethereum.request({ method, params })
      .then(result => {
        document.dispatchEvent(new CustomEvent('ETHEREUM_RESPONSE', {
          detail: { requestId, result }
        }));
      })
      .catch(error => {
        document.dispatchEvent(new CustomEvent('ETHEREUM_RESPONSE', {
          detail: { requestId, error: error.message || 'Unknown error' }
        }));
      });
  } catch (err) {
    document.dispatchEvent(new CustomEvent('ETHEREUM_RESPONSE', {
      detail: { requestId, error: err.message || 'Exception occurred' }
    }));
  }
});

// Set up ethereum account change events
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.dispatchEvent(new CustomEvent('ETHEREUM_EVENT', {
      detail: { 
        eventName: 'accountsChanged',
        data: accounts
      }
    }));
  });
  
  window.ethereum.on('chainChanged', (chainId) => {
    document.dispatchEvent(new CustomEvent('ETHEREUM_EVENT', {
      detail: { 
        eventName: 'chainChanged',
        data: chainId
      }
    }));
  });

  window.ethereum.on('disconnect', (error) => {
    document.dispatchEvent(new CustomEvent('ETHEREUM_EVENT', {
      detail: { 
        eventName: 'disconnect',
        data: error
      }
    }));
  });
}

// Signal that bridge is ready
document.dispatchEvent(new CustomEvent('ETHEREUM_BRIDGE_READY', {
  detail: window.ethereumBridge
}));

// Check and notify about ethereum presence
function checkEthereum() {
  if (window.ethereum) {
    document.dispatchEvent(new CustomEvent('ETHEREUM_DETECTED', {
      detail: { 
        exists: true,
        isMetaMask: window.ethereum.isMetaMask || false,
        hasProviders: !!window.ethereum.providers,
        chainId: window.ethereum.chainId || 'unknown' 
      }
    }));
  } else {
    // No ethereum found, try again after delay
    setTimeout(checkEthereum, 500);
  }
}

// Start checking for ethereum provider
checkEthereum();
