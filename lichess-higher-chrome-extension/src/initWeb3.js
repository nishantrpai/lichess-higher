// Initialize Web3 connection
const initWeb3 = async () => {
  console.log("initWeb3: Starting ethereum provider detection");

  // Bridge to the page context to access window.ethereum
  const getEthereumProvider = async () => {
    return new Promise((resolve) => {
      // Check if we already have a global reference
      if (window.ethereumProviderRef) {
        console.log("Using cached ethereum provider reference");
        resolve(window.ethereumProviderRef);
        return;
      }

      // Inject the bridge script if not already injected
      if (!window._bridgeInjected) {
        window._bridgeInjected = true;
        injectPageScript();
      }

      // Listen for bridge ready event
      const bridgeListener = (event) => {
        console.log("Ethereum bridge ready:", event.detail);
        
        // Create a proxy provider that forwards requests to page context
        const proxyProvider = {
          isMetaMask: event.detail.isMetaMask,
          chainId: event.detail.chainId,
          _requestId: 0,
          _callbacks: {},
          
          // Main request method that proxies to page context
          request: function(args) {
            return new Promise((resolve, reject) => {
              if (!event.detail.isAvailable) {
                reject(new Error("No Ethereum provider available"));
                return;
              }
              
              const requestId = String(++this._requestId);
              this._callbacks[requestId] = { resolve, reject };
              
              // Forward request to page context using a different approach to avoid CSP issues
              const requestEvent = new CustomEvent('ETHEREUM_REQUEST', {
                detail: {
                  requestId: requestId,
                  method: args.method, 
                  params: args.params || []
                }
              });
              document.dispatchEvent(requestEvent);
            });
          },
          
          // Simulated event emitter for Web3 compatibility
          _events: {},
          on: function(event, handler) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(handler);
            return this;
          },
          
          removeListener: function(event, handler) {
            if (!this._events[event]) return this;
            this._events[event] = this._events[event].filter(h => h !== handler);
            return this;
          }
        };
        
        // Listen for responses from page context
        document.addEventListener('ETHEREUM_RESPONSE', (evt) => {
          if (!evt.detail) return;
          const { requestId, result, error } = evt.detail;
          const callbacks = proxyProvider._callbacks[requestId];
          
          if (callbacks) {
            if (error) {
              callbacks.reject(new Error(error));
            } else {
              callbacks.resolve(result);
            }
            delete proxyProvider._callbacks[requestId];
          }
        });
        
        // Listen for ethereum events from page context
        document.addEventListener('ETHEREUM_EVENT', (evt) => {
          if (!evt.detail) return;
          const { eventName, data } = evt.detail;
          const handlers = proxyProvider._events[eventName];
          
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                console.error("Error in event handler:", err);
              }
            });
          }
        });
        
        // Cache for future use
        window.ethereumProviderRef = proxyProvider;
        resolve(proxyProvider);
      };
      
      // Listen for the bridge ready event
      document.addEventListener('ETHEREUM_BRIDGE_READY', bridgeListener);
      
      // Set timeout in case the bridge setup fails
      setTimeout(() => {
        if (window.ethereumProviderRef) {
          resolve(window.ethereumProviderRef);
        } else {
          console.error("Ethereum bridge setup timed out");
          resolve(null);
        }
      }, 3000);
    });
  };
  
  const ethereumProvider = await getEthereumProvider();
  console.log("Ethereum provider detection:", ethereumProvider ? "Found" : "Not found");
  
  if (ethereumProvider) {
    try {
      provider = new ethers.BrowserProvider(ethereumProvider);
      console.log("Requesting accounts...");
      const accounts = await provider.send("eth_requestAccounts", []);
      console.log("Got accounts:", accounts);
      currentAccount = accounts[0];
      signer = await provider.getSigner();
      
      // Initialize contract instances
      wagerContract = new ethers.Contract(
        LICHESS_WAGER_ADDRESS,
        LichessWagerABI.abi,
        signer
      );
      
      oracleContract = new ethers.Contract(
        LICHESS_ORACLE_ADDRESS,
        LichessOracleABI.abi,
        signer
      );
      
      isConnected = true;
      console.log("Connected to Web3 provider with account:", currentAccount);
      
      // Listen for account changes
      ethereumProvider.on("accountsChanged", (accounts) => {
        currentAccount = accounts[0];
        console.log("Account changed to:", currentAccount);
        updateUI();
      });
      
      return true;
    } catch (error) {
      console.error("Error connecting to Web3:", error);
      return false;
    }
  } else {
    console.log("No Ethereum provider detected");
    return false;
  }
};
