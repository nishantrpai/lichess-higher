# Lichess Higher Chrome Extension

A Chrome extension that allows you to place wagers on your Lichess chess games using Ethereum.

## Features

- Connect to MetaMask or other Web3 providers
- Create wagers for Lichess games
- Join existing wagers
- View wager status
- Integration with Ethereum smart contracts

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

## Development

- `npm run watch` - Watch for changes and rebuild
- `npm run build` - Build for production
- `npm run format` - Format code with Prettier

## Smart Contracts

This extension interacts with Ethereum smart contracts deployed on the Ethereum network. See the `lichess-higher-contracts` directory for contract details.
