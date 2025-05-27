# Lichess Wager Smart Contracts

A decentralized wager system for Lichess chess matches where players can stake ETH on their games, with the winner taking the pot.

## Overview

This project implements a betting platform for Lichess chess games using Ethereum smart contracts. Two players can stake an equal amount of ETH before a match, and the winner receives both stakes after the match ends. The system uses a trusted oracle to confirm match results from the Lichess API.

## Features

- Create wagers for Lichess games
- Join existing wagers by matching the stake amount
- Oracle-based result confirmation
- Support for win/loss/draw outcomes
- Refund system for cancelled games
- Owner and operator controls for security

## Smart Contracts

### LichessWager.sol

The main contract that handles wagers, game management, and fund distribution.

#### Key Functions:

- `createGame(string memory lichessGameId)`: Create a new wager for a Lichess game
- `joinGame(bytes32 gameId)`: Join an existing wager
- `submitGameResult(bytes32 gameId, GameResult result)`: Submit the result of a game (Oracle only)
- `cancelGame(bytes32 gameId)`: Cancel a game that hasn't been joined
- `getGameDetails(bytes32 gameId)`: Get details of a game

### LichessOracle.sol

The oracle contract that submits verified game results to the wager contract.

#### Key Functions:

- `submitResult(bytes32 gameId, LichessWager.GameResult result)`: Submit game result
- `addOperator(address _operator)`: Add a trusted operator
- `removeOperator(address _operator)`: Remove an operator
- `transferOwnership(address _newOwner)`: Transfer ownership

## Development

### Prerequisites

- Node.js v16+
- npm or yarn
- Hardhat

### Setup

1. Install dependencies:

```bash
npm install
```

2. Compile contracts:

```bash
npm run compile
```

3. Run tests:

```bash
npm test
```

### Deployment

1. Start a local blockchain:

```bash
npm run node
```

2. Deploy contracts to local network:

```bash
npm run deploy:local
```

3. Deploy to Sepolia testnet:

```bash
npm run deploy:testnet
```

## Testing

The test suite covers various scenarios:

- Game creation and joining
- Win/loss/draw result handling
- Fund distribution
- Game cancellation
- Oracle management

## License

MIT
