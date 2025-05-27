// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LichessWager
 * @dev Smart contract for wagering on Lichess matches
 * @notice Two players stake ETH, winner takes all (or split in case of a draw)
 */
contract LichessWager {
    // Game struct to keep track of wager details
    struct Game {
        address player1;
        address player2;
        uint256 wagerAmount;
        string lichessGameId;
        bool isCompleted;
        GameResult result;
    }
    
    // Possible game results
    enum GameResult {
        PENDING,
        PLAYER1_WINS,
        PLAYER2_WINS,
        DRAW,
        CANCELLED
    }
    
    // Mapping from game ID to Game struct
    mapping(bytes32 => Game) public games;
    
    // Oracle address that can submit game results
    address public oracle;
    
    // Owner of the contract
    address public owner;
    
    // Events
    event GameCreated(bytes32 indexed gameId, address indexed player1, uint256 wagerAmount, string lichessGameId);
    event PlayerJoined(bytes32 indexed gameId, address indexed player2);
    event GameCompleted(bytes32 indexed gameId, GameResult result);
    event GameCancelled(bytes32 indexed gameId);
    event OracleUpdated(address indexed newOracle);
    
    /**
     * @dev Constructor to set the oracle and owner
     * @param _oracle Address that will be authorized to submit game results
     */
    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle cannot be the zero address");
        oracle = _oracle;
        owner = msg.sender;
    }
    
    /**
     * @dev Modifier to restrict access to only the oracle
     */
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this function");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to only the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Create a new wager for a Lichess game
     * @param lichessGameId ID of the Lichess game
     * @return gameId Unique identifier for the wager
     */
    function createGame(string memory lichessGameId) external payable returns (bytes32) {
        require(msg.value > 0, "Wager amount must be greater than 0");
        
        bytes32 gameId = keccak256(abi.encodePacked(msg.sender, lichessGameId, block.timestamp));
        
        require(games[gameId].player1 == address(0), "Game already exists");
        
        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            wagerAmount: msg.value,
            lichessGameId: lichessGameId,
            isCompleted: false,
            result: GameResult.PENDING
        });
        
        emit GameCreated(gameId, msg.sender, msg.value, lichessGameId);
        
        return gameId;
    }
    
    /**
     * @dev Join an existing wager
     * @param gameId ID of the game to join
     */
    function joinGame(bytes32 gameId) external payable {
        Game storage game = games[gameId];
        
        require(game.player1 != address(0), "Game does not exist");
        require(game.player2 == address(0), "Game is already full");
        require(game.isCompleted == false, "Game is already completed");
        require(msg.sender != game.player1, "Cannot join your own game");
        require(msg.value == game.wagerAmount, "Must match the wager amount");
        
        game.player2 = msg.sender;
        
        emit PlayerJoined(gameId, msg.sender);
    }
    
    /**
     * @dev Submit the result of a Lichess game
     * @param gameId ID of the completed game
     * @param result Result of the game (1 = player1 wins, 2 = player2 wins, 3 = draw)
     */
    function submitGameResult(bytes32 gameId, GameResult result) external onlyOracle {
        Game storage game = games[gameId];
        
        require(game.player1 != address(0), "Game does not exist");
        require(game.player2 != address(0), "Game is not full");
        require(!game.isCompleted, "Game is already completed");
        require(result != GameResult.PENDING, "Cannot set result to pending");
        
        game.isCompleted = true;
        game.result = result;
        
        // Distribute winnings based on the result
        uint256 totalWager = game.wagerAmount * 2;
        
        if (result == GameResult.PLAYER1_WINS) {
            payable(game.player1).transfer(totalWager);
        } else if (result == GameResult.PLAYER2_WINS) {
            payable(game.player2).transfer(totalWager);
        } else if (result == GameResult.DRAW) {
            payable(game.player1).transfer(game.wagerAmount);
            payable(game.player2).transfer(game.wagerAmount);
        } else if (result == GameResult.CANCELLED) {
            payable(game.player1).transfer(game.wagerAmount);
            payable(game.player2).transfer(game.wagerAmount);
        }
        
        emit GameCompleted(gameId, result);
    }
    
    /**
     * @dev Cancel a game that hasn't been joined yet
     * @param gameId ID of the game to cancel
     */
    function cancelGame(bytes32 gameId) external {
        Game storage game = games[gameId];
        
        require(game.player1 == msg.sender, "Only game creator can cancel");
        require(game.player2 == address(0), "Cannot cancel game that has been joined");
        require(!game.isCompleted, "Game is already completed");
        
        game.isCompleted = true;
        game.result = GameResult.CANCELLED;
        
        // Return wager to player1
        payable(game.player1).transfer(game.wagerAmount);
        
        emit GameCancelled(gameId);
    }
    
    /**
     * @dev Get details of a game
     * @param gameId ID of the game to query
     * @return Game struct with all game details
     */
    function getGameDetails(bytes32 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    /**
     * @dev Update the oracle address (only owner)
     * @param _newOracle Address of the new oracle
     */
    function updateOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Oracle cannot be the zero address");
        oracle = _newOracle;
        
        emit OracleUpdated(_newOracle);
    }
}
