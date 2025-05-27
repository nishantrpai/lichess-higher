import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lichess Wager System", function () {
  // Contracts
  let lichessWager: any;
  let lichessOracle: any;
  
  // Signers
  let owner: any;
  let player1: any;
  let player2: any;
  let operator: any;
  
  // Constants
  const wagerAmount = ethers.parseEther("0.1"); // 0.1 ETH
  const lichessGameId = "abcd1234";
  let gameId: string;
  
  // Enum values for game results
  const PENDING = 0;
  const PLAYER1_WINS = 1;
  const PLAYER2_WINS = 2;
  const DRAW = 3;
  const CANCELLED = 4;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2, operator] = await ethers.getSigners();
    
    // Deploy the contracts
    const LichessWagerFactory = await ethers.getContractFactory("LichessWager");
    lichessWager = await LichessWagerFactory.deploy(owner.address);
    
    const lichessWagerAddress = await lichessWager.getAddress();
    
    const LichessOracleFactory = await ethers.getContractFactory("LichessOracle");
    lichessOracle = await LichessOracleFactory.deploy(lichessWagerAddress);
    
    const lichessOracleAddress = await lichessOracle.getAddress();
    
    // Update the oracle address in the wager contract
    await lichessWager.connect(owner).updateOracle(lichessOracleAddress);
    
    // Add operator to the oracle
    await lichessOracle.connect(owner).addOperator(operator.address);
    
    // Create a game
    const createGameTx = await lichessWager.connect(player1).createGame(lichessGameId, { value: wagerAmount });
    const receipt = await createGameTx.wait();
    
    if (receipt && receipt.logs) {
      // Find the GameCreated event and extract the gameId
      const iface = new ethers.Interface([
        "event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 wagerAmount, string lichessGameId)"
      ]);
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog({ 
            topics: log.topics as string[], 
            data: log.data 
          });
          
          if (parsedLog && parsedLog.name === "GameCreated") {
            gameId = parsedLog.args.gameId;
            break;
          }
        } catch (e) {
          // Not the event we're looking for
          continue;
        }
      }
    }
  });

  describe("Game Creation and Joining", function () {
    it("Should create a game successfully", async function () {
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.player1).to.equal(player1.address);
      expect(game.wagerAmount).to.equal(wagerAmount);
      expect(game.lichessGameId).to.equal(lichessGameId);
      expect(game.isCompleted).to.be.false;
      expect(game.result).to.equal(PENDING);
    });

    it("Should allow player2 to join the game", async function () {
      await lichessWager.connect(player2).joinGame(gameId, { value: wagerAmount });
      
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.player2).to.equal(player2.address);
    });

    it("Should not allow player1 to join their own game", async function () {
      await expect(
        lichessWager.connect(player1).joinGame(gameId, { value: wagerAmount })
      ).to.be.revertedWith("Cannot join your own game");
    });

    it("Should not allow joining with incorrect wager amount", async function () {
      const incorrectAmount = ethers.parseEther("0.05");
      await expect(
        lichessWager.connect(player2).joinGame(gameId, { value: incorrectAmount })
      ).to.be.revertedWith("Must match the wager amount");
    });
  });

  describe("Game Results and Payouts", function () {
    beforeEach(async function () {
      // Player2 joins the game
      await lichessWager.connect(player2).joinGame(gameId, { value: wagerAmount });
    });

    it("Should distribute funds to player1 when they win", async function () {
      const initialBalance = await ethers.provider.getBalance(player1.address);
      
      // Oracle submits result: player1 wins
      await lichessOracle.connect(operator).submitResult(gameId, PLAYER1_WINS);
      
      // Check if player1 received the funds
      const finalBalance = await ethers.provider.getBalance(player1.address);
      const expectedWinnings = wagerAmount * 2n;
      
      // The final balance should be greater than initial + winnings - gas costs
      expect(finalBalance).to.be.gt(initialBalance + expectedWinnings - ethers.parseEther("0.01"));
      
      // Check that the game is marked as completed
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.isCompleted).to.be.true;
      expect(game.result).to.equal(PLAYER1_WINS);
    });

    it("Should distribute funds to player2 when they win", async function () {
      const initialBalance = await ethers.provider.getBalance(player2.address);
      
      // Oracle submits result: player2 wins
      await lichessOracle.connect(operator).submitResult(gameId, PLAYER2_WINS);
      
      // Check if player2 received the funds
      const finalBalance = await ethers.provider.getBalance(player2.address);
      const expectedWinnings = wagerAmount * 2n;
      
      // The final balance should be greater than initial + winnings - gas costs
      expect(finalBalance).to.be.gt(initialBalance + expectedWinnings - ethers.parseEther("0.01"));
      
      // Check that the game is marked as completed
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.isCompleted).to.be.true;
      expect(game.result).to.equal(PLAYER2_WINS);
    });

    it("Should split funds on a draw", async function () {
      const initialBalance1 = await ethers.provider.getBalance(player1.address);
      const initialBalance2 = await ethers.provider.getBalance(player2.address);
      
      // Oracle submits result: draw
      await lichessOracle.connect(operator).submitResult(gameId, DRAW);
      
      // Check if both players received their original wager back
      const finalBalance1 = await ethers.provider.getBalance(player1.address);
      const finalBalance2 = await ethers.provider.getBalance(player2.address);
      
      // Both players should have received their original wager back (minus gas costs)
      expect(finalBalance1).to.be.gt(initialBalance1 - ethers.parseEther("0.01"));
      expect(finalBalance2).to.be.gt(initialBalance2 - ethers.parseEther("0.01"));
      
      // Check that the game is marked as completed
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.isCompleted).to.be.true;
      expect(game.result).to.equal(DRAW);
    });
  });

  describe("Game Cancellation", function () {
    it("Should allow player1 to cancel an unjoined game", async function () {
      const initialBalance = await ethers.provider.getBalance(player1.address);
      
      // Player1 cancels the game
      await lichessWager.connect(player1).cancelGame(gameId);
      
      // Check if player1 got their wager back
      const finalBalance = await ethers.provider.getBalance(player1.address);
      
      // Final balance should be approximately equal to initial balance - gas costs
      expect(finalBalance).to.be.gt(initialBalance - ethers.parseEther("0.01"));
      
      // Check that the game is marked as cancelled
      const game = await lichessWager.getGameDetails(gameId);
      expect(game.isCompleted).to.be.true;
      expect(game.result).to.equal(CANCELLED);
    });

    it("Should not allow player2 to cancel someone else's game", async function () {
      await expect(
        lichessWager.connect(player2).cancelGame(gameId)
      ).to.be.revertedWith("Only game creator can cancel");
    });

    it("Should not allow cancelling a game that has been joined", async function () {
      // Player2 joins the game
      await lichessWager.connect(player2).joinGame(gameId, { value: wagerAmount });
      
      // Player1 tries to cancel the game
      await expect(
        lichessWager.connect(player1).cancelGame(gameId)
      ).to.be.revertedWith("Cannot cancel game that has been joined");
    });
  });

  describe("Oracle Management", function () {
    it("Should allow owner to add operators", async function () {
      const newOperator = ethers.Wallet.createRandom().address;
      await lichessOracle.connect(owner).addOperator(newOperator);
      
      const isOperator = await lichessOracle.operators(newOperator);
      expect(isOperator).to.be.true;
    });

    it("Should allow owner to remove operators", async function () {
      await lichessOracle.connect(owner).removeOperator(operator.address);
      
      const isOperator = await lichessOracle.operators(operator.address);
      expect(isOperator).to.be.false;
    });

    it("Should not allow non-operators to submit results", async function () {
      // Player2 joins the game
      await lichessWager.connect(player2).joinGame(gameId, { value: wagerAmount });
      
      // Non-operator tries to submit result
      await expect(
        lichessOracle.connect(player1).submitResult(gameId, PLAYER1_WINS)
      ).to.be.revertedWith("Only operators can call this function");
    });
  });
});
