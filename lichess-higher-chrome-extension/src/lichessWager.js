/**
 * Lichess Higher - Chrome Extension
 * 
 * This module handles integration with Lichess.org to enable wagering on chess games.
 * It detects live games, provides a minimal UI for placing wagers, and interacts with smart contracts.
 */

import { ethers } from "ethers";
import LichessWagerABI from "./abis/LichessWager.json";
import LichessOracleABI from "./abis/LichessOracle.json";
import initWeb3Module from './initWeb3';

// Contract addresses (will be replaced with actual contract addresses in production)
const LICHESS_WAGER_ADDRESS = "0x1234567890123456789012345678901234567890";
const LICHESS_ORACLE_ADDRESS = "0x0987654321098765432109876543210987654321";

// Global state
let currentAccount = null;
let provider = null;
let signer = null;
let wagerContract = null;
let oracleContract = null;
let isConnected = false;
let currentGameId = null;
let currentWager = null;
let transactionStatus = "idle"; // idle, pending, confirmed, error
let isLightTheme = false;
let wagerAmount = "0.01"; // Default wager amount in ETH
let contractGameId = null; // ID of the game in the smart contract

/**
 * Utility functions
 */

// Check if we're on a Lichess game page
const isLichessGamePage = () => {
  const url = window.location.href;
  // Match URLs like https://lichess.org/{gameId} or https://lichess.org/{gameId}/{perspective}
  // Game IDs are 8 characters of alphanumeric content
  return /^https:\/\/lichess\.org\/[a-zA-Z0-9]{8}(\/.*)?$/.test(url);
};

// Extract game ID from Lichess URL
const getLichessGameId = () => {
  const url = window.location.href;
  const gameIdMatch = url.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
  return gameIdMatch ? gameIdMatch[1] : null;
};

// Detect Lichess theme (dark/light)
const detectTheme = () => {
  const bodyClasses = document.body.classList;
  isLightTheme = !bodyClasses.contains('dark') && !bodyClasses.contains('transp');
  return isLightTheme;
};

// Format ETH amount with 4 decimal places max
const formatEth = (amount) => {
  return parseFloat(amount).toFixed(4).replace(/\.?0+$/, '');
};

// Shorten address for display
const shortenAddress = (address) => {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
};

/**
 * Web3 and Contract Interaction
 */

// Initialize Web3 connection
const initWeb3 = initWeb3Module; // Use the implementation from our module
        (function() {
          // Create a proxy object to communicate with ethereum provider
          window.ethereumBridge = {
            isAvailable: !!window.ethereum,
            isMetaMask: window.ethereum?.isMetaMask || false,
            chainId: window.ethereum?.chainId || null
          };
          
          // Function to send request from content script to page ethereum
          window.handleEthereumRequest = function(requestId, method, params) {
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
          };
          
          // Signal that bridge is ready
          document.dispatchEvent(new CustomEvent('ETHEREUM_BRIDGE_READY', {
            detail: window.ethereumBridge
          }));
        })();
      `;
      
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
              
              // Forward request to page context using event dispatch instead of inline scripts
              // This avoids CSP issues and webpack parsing problems
              document.dispatchEvent(new CustomEvent('ETHEREUM_REQUEST', {
                detail: {
                  requestId: requestId,
                  method: args.method,
                  params: args.params || []
                }
              }));
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

// Create a wager for the current game
const createWager = async (amount) => {
  if (!isConnected) {
    const connected = await initWeb3();
    if (!connected) return null;
  }
  
  const gameId = getLichessGameId();
  if (!gameId) {
    console.error("No game ID found");
    return null;
  }
  
  try {
    transactionStatus = "pending";
    updateUI();
    
    const parsedAmount = ethers.parseEther(amount.toString());
    const tx = await wagerContract.createGame(gameId, {
      value: parsedAmount
    });
    
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
    
    // Find the game ID from the events
    const event = receipt.logs.find(log => {
      try {
        // Attempt to parse the log
        const parsed = wagerContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsed && parsed.name === "GameCreated";
      } catch (e) {
        return false;
      }
    });
    
    if (event) {
      const parsedLog = wagerContract.interface.parseLog({
        topics: event.topics,
        data: event.data
      });
      
      contractGameId = parsedLog.args.gameId;
      currentWager = {
        amount: amount,
        createdBy: currentAccount,
        lichessGameId: gameId,
        contractGameId: contractGameId,
        status: "created"
      };
      
      transactionStatus = "confirmed";
      
      // Save to storage for persistence
      chrome.storage.local.set({
        [gameId]: currentWager
      });
      
      updateUI();
      return contractGameId;
    } else {
      console.error("Could not find GameCreated event");
      transactionStatus = "error";
      updateUI();
      return null;
    }
  } catch (error) {
    console.error("Error creating wager:", error);
    transactionStatus = "error";
    updateUI();
    return null;
  }
};

// Join an existing wager
const joinWager = async (gameId, amount) => {
  if (!isConnected) {
    const connected = await initWeb3();
    if (!connected) return false;
  }
  
  try {
    transactionStatus = "pending";
    updateUI();
    
    const parsedAmount = ethers.parseEther(amount.toString());
    const tx = await wagerContract.joinGame(gameId, {
      value: parsedAmount
    });
    
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
    
    // Update current wager
    currentWager = {
      ...currentWager,
      joinedBy: currentAccount,
      status: "joined"
    };
    
    transactionStatus = "confirmed";
    
    // Update storage
    const lichessId = getLichessGameId();
    chrome.storage.local.get(lichessId, (data) => {
      const gameData = data[lichessId] || {};
      chrome.storage.local.set({
        [lichessId]: {
          ...gameData,
          joinedBy: currentAccount,
          status: "joined"
        }
      });
    });
    
    updateUI();
    return true;
  } catch (error) {
    console.error("Error joining wager:", error);
    transactionStatus = "error";
    updateUI();
    return false;
  }
};

// Cancel a wager
const cancelWager = async (contractId) => {
  if (!isConnected) {
    const connected = await initWeb3();
    if (!connected) return false;
  }
  
  try {
    transactionStatus = "pending";
    updateUI();
    
    const tx = await wagerContract.cancelGame(contractId);
    console.log("Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);
    
    transactionStatus = "confirmed";
    
    // Update storage
    const lichessId = getLichessGameId();
    chrome.storage.local.get(lichessId, (data) => {
      const gameData = data[lichessId] || {};
      chrome.storage.local.set({
        [lichessId]: {
          ...gameData,
          status: "cancelled"
        }
      });
    });
    
    currentWager = {
      ...currentWager,
      status: "cancelled"
    };
    
    updateUI();
    return true;
  } catch (error) {
    console.error("Error cancelling wager:", error);
    transactionStatus = "error";
    updateUI();
    return false;
  }
};

// Check for existing wager for current game
const checkExistingWager = async () => {
  const gameId = getLichessGameId();
  if (!gameId) return null;
  
  return new Promise((resolve) => {
    chrome.storage.local.get(gameId, (data) => {
      if (data && data[gameId]) {
        currentWager = data[gameId];
        contractGameId = currentWager.contractGameId;
        resolve(currentWager);
      } else {
        resolve(null);
      }
    });
  });
};

// Get game details from contract
const getGameDetails = async (contractId) => {
  if (!isConnected || !wagerContract) {
    await initWeb3();
  }
  
  try {
    const details = await wagerContract.getGameDetails(contractId);
    return details;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
};

/**
 * UI Components
 */

// Create a mini button element
const createButton = (text, onClick, color = '#3893e8', textColor = '#fff') => {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.padding = '4px 8px';
  button.style.margin = '0 4px';
  button.style.backgroundColor = color;
  button.style.color = textColor;
  button.style.border = 'none';
  button.style.borderRadius = '3px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '12px';
  button.style.fontWeight = '500';
  button.onclick = onClick;
  return button;
};

// Create a small input field
const createInput = (value, onChange, width = '60px') => {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.001';
  input.min = '0.001';
  input.value = value;
  input.style.width = width;
  input.style.padding = '3px 4px';
  input.style.borderRadius = '3px';
  input.style.border = isLightTheme ? '1px solid #ccc' : '1px solid #444';
  input.style.backgroundColor = isLightTheme ? '#fff' : '#333';
  input.style.color = isLightTheme ? '#333' : '#eee';
  input.style.fontSize = '12px';
  input.oninput = (e) => onChange(e.target.value);
  return input;
};

// Create a label element
const createLabel = (text, bold = false) => {
  const label = document.createElement('span');
  label.textContent = text;
  label.style.fontSize = '12px';
  label.style.marginRight = '6px';
  if (bold) label.style.fontWeight = 'bold';
  return label;
};

// Create a container div
const createContainer = (horizontal = false) => {
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.flexDirection = horizontal ? 'row' : 'column';
  div.style.alignItems = horizontal ? 'center' : 'flex-start';
  div.style.marginBottom = '6px';
  div.style.gap = '4px';
  return div;
};

// Create the status indicator
const createStatusIndicator = (status) => {
  const statusContainer = document.createElement('div');
  statusContainer.style.display = 'flex';
  statusContainer.style.alignItems = 'center';
  statusContainer.style.marginBottom = '6px';
  
  const indicator = document.createElement('div');
  indicator.style.width = '8px';
  indicator.style.height = '8px';
  indicator.style.borderRadius = '50%';
  indicator.style.marginRight = '6px';
  
  const statusLabel = document.createElement('span');
  statusLabel.style.fontSize = '12px';
  
  switch (status) {
    case 'idle':
      indicator.style.backgroundColor = '#999';
      statusLabel.textContent = 'Ready';
      break;
    case 'pending':
      indicator.style.backgroundColor = '#f59f00';
      statusLabel.textContent = 'Transaction pending...';
      break;
    case 'confirmed':
      indicator.style.backgroundColor = '#2ecc40';
      statusLabel.textContent = 'Transaction confirmed';
      break;
    case 'error':
      indicator.style.backgroundColor = '#ff4136';
      statusLabel.textContent = 'Error occurred';
      break;
    default:
      indicator.style.backgroundColor = '#999';
      statusLabel.textContent = 'Ready';
  }
  
  statusContainer.appendChild(indicator);
  statusContainer.appendChild(statusLabel);
  return statusContainer;
};

// Build the UI
const buildWagerUI = () => {
  detectTheme();
  
  // Create main container
  const container = document.createElement('div');
  container.id = 'lichess-higher-container';
  container.style.padding = '8px';
  container.style.margin = '4px 0';
  container.style.borderRadius = '3px';
  container.style.backgroundColor = isLightTheme ? '#f1f1f1' : '#262626';
  container.style.color = isLightTheme ? '#333' : '#ccc';
  container.style.fontSize = '12px';
  container.style.boxShadow = isLightTheme ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.4)';
  container.style.position = 'relative';
  
  // Create logo/title
  const titleContainer = createContainer(true);
  const title = document.createElement('div');
  title.textContent = 'Lichess Higher';
  title.style.fontSize = '13px';
  title.style.fontWeight = 'bold';
  
  // Create small ETH logo/icon
  const ethIcon = document.createElement('span');
  ethIcon.textContent = 'Ξ';
  ethIcon.style.marginRight = '4px';
  ethIcon.style.fontSize = '14px';
  ethIcon.style.fontWeight = 'bold';
  ethIcon.style.color = '#627eea';
  
  titleContainer.appendChild(ethIcon);
  titleContainer.appendChild(title);
  container.appendChild(titleContainer);
  
  // If not connected to Web3, show connect button
  if (!isConnected) {
    const connectBtn = createButton('Connect Wallet', async () => {
      const success = await initWeb3();
      if (success) {
        await checkExistingWager();
        updateUI();
      }
    });
    connectBtn.style.marginTop = '8px';
    container.appendChild(connectBtn);
    
    return container;
  }
  
  // Show wallet info if connected
  const accountContainer = createContainer(true);
  accountContainer.style.marginTop = '4px';
  
  const walletIcon = document.createElement('span');
  walletIcon.textContent = '👛';
  walletIcon.style.fontSize = '12px';
  walletIcon.style.marginRight = '4px';
  
  const accountLabel = createLabel(shortenAddress(currentAccount));
  
  accountContainer.appendChild(walletIcon);
  accountContainer.appendChild(accountLabel);
  container.appendChild(accountContainer);
  
  // Show transaction status if not idle
  if (transactionStatus !== 'idle') {
    container.appendChild(createStatusIndicator(transactionStatus));
  }
  
  // If we have a current wager, show its details
  if (currentWager) {
    const wagerContainer = createContainer(false);
    wagerContainer.style.backgroundColor = isLightTheme ? '#e9e9e9' : '#333';
    wagerContainer.style.padding = '6px';
    wagerContainer.style.borderRadius = '3px';
    wagerContainer.style.marginTop = '8px';
    wagerContainer.style.width = '100%';
    
    const amountContainer = createContainer(true);
    const amountLabel = createLabel('Wager:', true);
    const amountValue = createLabel(`${currentWager.amount} ETH`);
    amountContainer.appendChild(amountLabel);
    amountContainer.appendChild(amountValue);
    wagerContainer.appendChild(amountContainer);
    
    // Show creator
    const creatorContainer = createContainer(true);
    const creatorLabel = createLabel('Created by:', true);
    const isCreator = currentWager.createdBy === currentAccount;
    const creatorValue = createLabel(isCreator ? 'You' : shortenAddress(currentWager.createdBy));
    creatorContainer.appendChild(creatorLabel);
    creatorContainer.appendChild(creatorValue);
    wagerContainer.appendChild(creatorContainer);
    
    // Show opponent if joined
    if (currentWager.joinedBy) {
      const opponentContainer = createContainer(true);
      const opponentLabel = createLabel('Joined by:', true);
      const isOpponent = currentWager.joinedBy === currentAccount;
      const opponentValue = createLabel(isOpponent ? 'You' : shortenAddress(currentWager.joinedBy));
      opponentContainer.appendChild(opponentLabel);
      opponentContainer.appendChild(opponentValue);
      wagerContainer.appendChild(opponentContainer);
    }
    
    // Show status
    const statusContainer = createContainer(true);
    const statusLabel = createLabel('Status:', true);
    const statusValue = createLabel(currentWager.status || 'active');
    statusValue.style.textTransform = 'capitalize';
    statusContainer.appendChild(statusLabel);
    statusContainer.appendChild(statusValue);
    wagerContainer.appendChild(statusContainer);
    
    container.appendChild(wagerContainer);
    
    // Show action buttons based on state
    const actionsContainer = createContainer(true);
    actionsContainer.style.marginTop = '8px';
    actionsContainer.style.justifyContent = 'center';
    actionsContainer.style.width = '100%';
    
    if (currentWager.status === 'created') {
      // If user is creator, show cancel button
      if (currentWager.createdBy === currentAccount) {
        const cancelBtn = createButton('Cancel Wager', async () => {
          await cancelWager(currentWager.contractGameId);
        }, '#e74c3c');
        actionsContainer.appendChild(cancelBtn);
      } 
      // If user is not creator, show join button
      else {
        const joinBtn = createButton('Join Wager', async () => {
          await joinWager(currentWager.contractGameId, currentWager.amount);
        });
        actionsContainer.appendChild(joinBtn);
      }
    } 
    // If joined, show a "Submit Result" button for demonstration
    else if (currentWager.status === 'joined') {
      const submitBtn = createButton('Submit Result', () => {
        alert('This would typically connect to the Oracle to submit the game result. For demo purposes, this is just a placeholder.');
      }, '#9b59b6');
      actionsContainer.appendChild(submitBtn);
    }
    
    container.appendChild(actionsContainer);
  } 
  // No current wager, show creation form
  else {
    const formContainer = createContainer(false);
    formContainer.style.marginTop = '8px';
    
    // Amount input row
    const amountRow = createContainer(true);
    const amountLabel = createLabel('Wager:');
    
    // Input field for amount
    const amountInput = createInput(wagerAmount, (value) => {
      wagerAmount = value;
    });
    
    const ethLabel = createLabel('ETH');
    
    amountRow.appendChild(amountLabel);
    amountRow.appendChild(amountInput);
    amountRow.appendChild(ethLabel);
    formContainer.appendChild(amountRow);
    
    // Create wager button
    const createRow = createContainer(true);
    createRow.style.marginTop = '8px';
    createRow.style.justifyContent = 'center';
    createRow.style.width = '100%';
    
    const createBtn = createButton('Create Wager', async () => {
      const amount = parseFloat(wagerAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      await createWager(wagerAmount);
    });
    
    createRow.appendChild(createBtn);
    formContainer.appendChild(createRow);
    container.appendChild(formContainer);
  }
  
  return container;
};

// Place the UI on the page
const injectUI = () => {
  // Find timer container to place our UI near it
  const clockContainer = document.querySelector('.rclock') || document.querySelector('.time');
  
  // Remove existing UI if present
  const existingUI = document.getElementById('lichess-higher-container');
  if (existingUI) existingUI.remove();
  
  // Build the UI
  const uiElement = buildWagerUI();
  
  // Insert near clock if found, otherwise try alternatives
  if (clockContainer) {
    clockContainer.parentElement.insertBefore(uiElement, clockContainer.nextSibling);
  } else {
    // Alternative locations
    const rightColumn = document.querySelector('.rcontrols');
    if (rightColumn) {
      rightColumn.prepend(uiElement);
    } else {
      const underboard = document.querySelector('.under-board');
      if (underboard) {
        underboard.prepend(uiElement);
      }
    }
  }
};

// Update the UI
const updateUI = () => {
  if (!isLichessGamePage()) return;
  injectUI();
};

// Initialize
const initialize = async () => {
  if (!isLichessGamePage()) return;
  
  console.log("Initializing Lichess Higher extension");
  
  // Get Ethereum provider function (same as in initWeb3)
  const getEthereumProvider = () => {
    if (window.ethereum) {
      console.log("Found standard window.ethereum provider");
      return window.ethereum;
    }
    
    // Check for MetaMask specifically
    if (window.metamask && window.metamask.ethereum) {
      console.log("Found metamask.ethereum provider");
      return window.metamask.ethereum;
    }
    
    // Try to detect injected providers
    if (window.ethereum?.providers) {
      const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
      if (metamaskProvider) {
        console.log("Found MetaMask provider in providers array");
        return metamaskProvider;
      }
    }
    
    console.log("No Ethereum provider found in window object");
    return null;
  };
  
  // Try to reuse existing connection
  if (!isConnected) {
    const ethereumProvider = getEthereumProvider();
    
    if (ethereumProvider) {
      try {
        console.log("Found Ethereum provider, attempting connection");
        provider = new ethers.BrowserProvider(ethereumProvider);
        const accounts = await provider.getNetwork().then(() => provider.listAccounts());
        
        if (accounts.length > 0) {
          currentAccount = accounts[0].address;
          signer = await provider.getSigner();
          
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
          console.log("Reused existing Web3 connection with account:", currentAccount);
        } else {
          console.log("No accounts available (user not connected to the site)");
        }
      } catch (error) {
        console.log("Error establishing Web3 connection:", error);
      }
    } else {
      console.log("No Ethereum provider detected during initialization");
    }
  }
  
  // Check for existing wager for this game
  await checkExistingWager();
  
  // Initialize the UI
  updateUI();
};

// Inject a script into the page context to access window.ethereum
const injectPageScript = () => {
  console.log("Injecting page script to bridge Ethereum provider");
  
  try {
    const script = document.createElement('script');
    
    // Use the web_accessible_resources approach to load the script
    script.src = chrome.runtime.getURL('pageScript.js');
    script.onload = () => script.remove();
    
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.error("Error injecting page script:", err);
  }
};

// Listen for ethereum detection from the page context
document.addEventListener('ETHEREUM_DETECTED', (event) => {
  console.log('Ethereum provider detected in page context:', event.detail);
  
  // If we're not connected yet, initialize again now that we know ethereum exists
  if (!isConnected && event.detail?.exists) {
    initialize();
  }
});

// Watch for DOM changes to handle SPA navigation
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    setTimeout(initialize, 1000); // Delay to ensure DOM is updated
  }
});

observer.observe(document, { subtree: true, childList: true });

// Initialize when the extension loads
window.addEventListener('DOMContentLoaded', () => {
  initialize();
  injectPageScript(); // Inject our bridge script
});

// Check for theme changes
const themeObserver = new MutationObserver(() => {
  if (isLichessGamePage()) {
    const newTheme = detectTheme();
    if (newTheme !== isLightTheme) {
      updateUI();
    }
  }
});

themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

// Initial setup
initialize();
injectPageScript(); // Ensure the script is injected immediately
