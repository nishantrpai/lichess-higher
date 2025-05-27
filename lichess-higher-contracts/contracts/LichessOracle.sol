// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LichessWager.sol";

/**
 * @title LichessOracle
 * @dev Simplistic oracle for reporting chess game results
 */
contract LichessOracle {
    // The LichessWager contract
    LichessWager public wagerContract;
    
    // Owner is the trusted source for game results
    address public owner;
    
    // Operators can report game results
    mapping(address => bool) public operators;
    
    // Events
    event OperatorAdded(address operator);
    event OperatorRemoved(address operator);
    event ResultSubmitted(bytes32 indexed gameId, LichessWager.GameResult result);
    
    /**
     * @dev Constructor sets the wager contract address and the owner
     * @param _wagerContract Address of the LichessWager contract
     */
    constructor(address _wagerContract) {
        require(_wagerContract != address(0), "Wager contract cannot be zero address");
        wagerContract = LichessWager(_wagerContract);
        owner = msg.sender;
        operators[msg.sender] = true; // Owner is also an operator by default
    }
    
    /**
     * @dev Modifier to restrict access to only the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to operators
     */
    modifier onlyOperator() {
        require(operators[msg.sender], "Only operators can call this function");
        _;
    }
    
    /**
     * @dev Submit result of a Lichess game
     * @param gameId ID of the game in the wager contract
     * @param result Result code (1 = player1 wins, 2 = player2 wins, 3 = draw, 4 = cancelled)
     */
    function submitResult(bytes32 gameId, LichessWager.GameResult result) external onlyOperator {
        wagerContract.submitGameResult(gameId, result);
        emit ResultSubmitted(gameId, result);
    }
    
    /**
     * @dev Add a new operator
     * @param _operator Address of the new operator
     */
    function addOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Operator cannot be zero address");
        operators[_operator] = true;
        emit OperatorAdded(_operator);
    }
    
    /**
     * @dev Remove an operator
     * @param _operator Address of the operator to remove
     */
    function removeOperator(address _operator) external onlyOwner {
        require(_operator != owner, "Cannot remove owner as operator");
        operators[_operator] = false;
        emit OperatorRemoved(_operator);
    }
    
    /**
     * @dev Transfer ownership of the oracle
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        operators[_newOwner] = true;
        owner = _newOwner;
    }
}
