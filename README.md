# Lichess Higher

Lichess Higher is a decentralized wagering platform for Lichess chess matches, allowing players to stake cryptocurrency on their games with secure, smart-contract governed payouts.

## Project Overview

This project consists of two main components:

1. **Smart Contracts** - Solidity contracts for managing wagers and verifying game results
2. **Chrome Extension** - Browser extension that integrates with the Lichess UI to create and manage wagers

## Getting Started

### Prerequisites

- Node.js and npm installed
- MetaMask or another Web3 provider
- Chrome or compatible browser

### Installation

1. Clone the repository:
```
git clone https://github.com/your-username/lichess-higher.git
cd lichess-higher
```

2. Install and build the Chrome extension:
```
cd lichess-higher-chrome-extension
npm install
npm run build
```

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `build` folder from the chrome-extension directory

4. (Optional) Deploy the smart contracts to a test network:
```
cd ../lichess-higher-contracts
npm install
npx hardhat compile
npx hardhat deploy --network <network-name>
```

## Smart Contracts

The smart contracts handle all the on-chain logic for creating wagers, joining games, and distributing funds based on verified results.

### Key Features

- Create wagers for Lichess games with ETH staking
- Join existing wagers by matching stake amounts
- Oracle-based result verification system
- Support for win/loss/draw outcomes
- Automatic fund distribution based on game results
- Cancel unmatched wagers and retrieve funds

### Technical Stack

- Solidity ^0.8.28
- Hardhat development environment
- TypeScript for testing and deployment scripts
- Ethers.js for interacting with the blockchain

### Contract Architecture

- **LichessWager.sol**: Main contract for handling wagers and funds
- **LichessOracle.sol**: Oracle contract for submitting verified game results

## Chrome Extension

The Chrome extension provides a user interface integrated directly into the Lichess website, allowing users to create and manage wagers without leaving the chess platform.

### Key Features

- Seamless integration with Lichess game pages
- Web3 wallet connection (MetaMask, etc.)
- Create and join wagers directly from game pages
- View active wagers and their statuses
- Automatic result tracking

### Technical Stack

- JavaScript/TypeScript
- Webpack
- Ethers.js for Web3 connection
- Chrome Extensions API

## Getting Started

### Smart Contracts

1. Navigate to the contracts directory:
   ```bash
   cd lichess-higher-contracts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile contracts:
   ```bash
   npm run compile
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Deploy to local network:
   ```bash
   npm run deploy:local
   ```

### Chrome Extension

1. Navigate to the extension directory:
   ```bash
   cd lichess-higher-chrome-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `build` folder

## Usage

1. Install the Chrome extension
2. Visit a Lichess game page
3. Connect your Web3 wallet
4. Create a wager or join an existing one
5. Play your game
6. Results are automatically verified and funds distributed

## Development Roadmap

- [x] Smart contract implementation
- [x] Basic Chrome extension integration
- [ ] Oracle server implementation
- [ ] Contract deployment to testnets
- [ ] UI enhancements for better user experience
- [ ] Support for ERC-20 tokens as wager options
- [ ] Tournament support
- [ ] Multi-game series wagers

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.