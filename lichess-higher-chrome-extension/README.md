# Lichess Higher Chrome Extension

A Chrome extension that allows you to place wagers on your Lichess chess games using Ethereum smart contracts.

## Features

- Minimal UI that integrates seamlessly with the Lichess interface
- Connect to MetaMask or other Web3 providers
- Create wagers for Lichess games
- Join existing wagers
- View wager status and transaction confirmations
- Support for both light and dark themes
- Smart contract integration for secure fund handling

## Setup Instructions

1. Install dependencies and build:
   ```
   npm install
   npm run build
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `build` folder

3. The extension should now be active. Visit Lichess.org and go to a game page to use the wager functionality.

## Usage

1. Visit [Lichess.org](https://lichess.org) and start or join a game.

2. Once in a game, you'll see the Lichess Higher interface appear near the game clock:
   - Click "Connect Wallet" to connect your MetaMask wallet
   - Enter a wager amount in ETH
   - Click "Create Wager" to create a new wager

3. To join someone else's wager:
   - They must share the game URL with you
   - Navigate to the game page
   - Connect your wallet
   - Click "Join Wager"

4. After the game completes, the result will be submitted to the smart contract for verification, and funds will be distributed accordingly.

## Smart Contract Architecture

The extension interacts with two main smart contracts:

1. **LichessWager**: Handles game creation, joining, and fund distribution
2. **LichessOracle**: Verifies game results from Lichess API

## Development

- `npm run watch` - Watch for changes and rebuild
- `npm run build` - Build for production
- `npm run format` - Format code using Prettier

## Security Note

This is currently in development, and the smart contracts are using mock addresses for testing. Do not use real funds with this extension until the official release.
- `npm run format` - Format code with Prettier

## Smart Contracts

This extension interacts with Ethereum smart contracts deployed on the Ethereum network. See the `lichess-higher-contracts` directory for contract details.
