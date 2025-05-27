// Web3 integration for Lichess Higher Chrome Extension
import { ethers } from "ethers";
import LichessWagerABI from "./abis/LichessWager.json";
import LichessOracleABI from "./abis/LichessOracle.json";

// Contract addresses - these will be updated based on deployment
const LICHESS_WAGER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder
const LICHESS_ORACLE_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder

// Store user state
let currentAccount = null;
let provider = null;
let signer = null;
let wagerContract = null;
let oracleContract = null;
let isConnected = false;

// Check if we're on a Lichess game page
const isLichessGamePage = () => {
  const url = window.location.href;
  return url.includes('lichess.org') && url.includes('/game/');
};

// Extract game ID from Lichess URL
const getLichessGameId = () => {
  const url = window.location.href;
  const gameIdMatch = url.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
  return gameIdMatch ? gameIdMatch[1] : null;
};

// Initialize Web3 connection
const initWeb3 = async () => {
  if (window.ethereum) {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
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
      window.ethereum.on("accountsChanged", (accounts) => {
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

// Create a wager for a game
const createWager = async (amount) => {
  if (!isConnected || !wagerContract) {
    await initWeb3();
  }
  
  const gameId = getLichessGameId();
  if (!gameId) {
    console.error("No game ID found");
    return null;
  }
  
  try {
    const tx = await wagerContract.createGame(gameId, {
      value: ethers.parseEther(amount.toString())
    });
    const receipt = await tx.wait();
    
    // Find the game ID from the events
    const event = receipt.logs.find(
      log => log.topics[0] === ethers.id("GameCreated(bytes32,address,uint256,string)")
    );
    
    if (event) {
      const parsedLog = wagerContract.interface.parseLog({
        topics: event.topics,
        data: event.data
      });
      return parsedLog.args.gameId;
    }
    
    return null;
  } catch (error) {
    console.error("Error creating wager:", error);
    return null;
  }
};

// Join an existing wager
const joinWager = async (gameId, amount) => {
  if (!isConnected || !wagerContract) {
    await initWeb3();
  }
  
  try {
    const tx = await wagerContract.joinGame(gameId, {
      value: ethers.parseEther(amount.toString())
    });
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error joining wager:", error);
    return false;
  }
};

// Cancel a wager
const cancelWager = async (gameId) => {
  if (!isConnected || !wagerContract) {
    await initWeb3();
  }
  
  try {
    const tx = await wagerContract.cancelGame(gameId);
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Error cancelling wager:", error);
    return false;
  }
};

// Check if a wager exists for the current game
const checkWager = async () => {
  const gameId = getLichessGameId();
  if (!gameId) {
    return null;
  }
  
  // We can't directly query for a wager by Lichess game ID
  // Would need to track this in a separate service or local storage
  return null;
};

// Create UI elements for wager interaction
const createWagerUI = () => {
  if (!isLichessGamePage()) {
    return;
  }
  
  // Create a container for our UI
  const container = document.createElement('div');
  container.id = 'lichess-higher-container';
  container.style.padding = '10px';
  container.style.margin = '10px 0';
  container.style.borderRadius = '5px';
  container.style.backgroundColor = '#2b2b2b';
  container.style.color = '#fff';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Wager on this game';
  title.style.margin = '0 0 10px 0';
  container.appendChild(title);
  
  // Add connect button if not connected
  if (!isConnected) {
    const connectButton = document.createElement('button');
    connectButton.textContent = 'Connect Wallet';
    connectButton.style.padding = '5px 10px';
    connectButton.style.backgroundColor = '#3893e8';
    connectButton.style.color = '#fff';
    connectButton.style.border = 'none';
    connectButton.style.borderRadius = '3px';
    connectButton.style.cursor = 'pointer';
    connectButton.onclick = async () => {
      const success = await initWeb3();
      if (success) {
        updateUI();
      }
    };
    container.appendChild(connectButton);
  } else {
    // Create wager form
    const form = document.createElement('div');
    
    // Amount input
    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'Amount (ETH): ';
    form.appendChild(amountLabel);
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.step = '0.01';
    amountInput.min = '0.01';
    amountInput.value = '0.1';
    amountInput.style.margin = '0 10px 10px 5px';
    amountInput.style.padding = '3px';
    amountInput.style.borderRadius = '3px';
    amountInput.style.border = '1px solid #ccc';
    form.appendChild(amountInput);
    
    // Create wager button
    const createButton = document.createElement('button');
    createButton.textContent = 'Create Wager';
    createButton.style.padding = '5px 10px';
    createButton.style.backgroundColor = '#3893e8';
    createButton.style.color = '#fff';
    createButton.style.border = 'none';
    createButton.style.borderRadius = '3px';
    createButton.style.cursor = 'pointer';
    createButton.style.marginTop = '10px';
    createButton.onclick = async () => {
      const amount = parseFloat(amountInput.value);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      const gameId = await createWager(amount);
      if (gameId) {
        alert(`Wager created successfully! Game ID: ${gameId}`);
        updateUI();
      } else {
        alert('Failed to create wager');
      }
    };
    form.appendChild(document.createElement('br'));
    form.appendChild(createButton);
    
    container.appendChild(form);
  }
  
  // Find a good place to insert our UI
  const rightColumn = document.querySelector('.rcontrols');
  if (rightColumn) {
    rightColumn.prepend(container);
  } else {
    // Try alternative location if the typical structure isn't available
    const underboard = document.querySelector('.under-board');
    if (underboard) {
      underboard.prepend(container);
    }
  }
};

// Update UI based on current state
const updateUI = () => {
  // Remove existing UI
  const existingContainer = document.getElementById('lichess-higher-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Create new UI
  createWagerUI();
};

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
  if (isLichessGamePage()) {
    createWagerUI();
  }
});

// Check for URL changes to handle SPA navigation
let currentUrl = location.href;
const observer = new MutationObserver(() => {
  if (currentUrl !== location.href) {
    currentUrl = location.href;
    if (isLichessGamePage()) {
      setTimeout(createWagerUI, 1000); // Delay to ensure DOM is updated
    }
  }
});

observer.observe(document, { subtree: true, childList: true });
