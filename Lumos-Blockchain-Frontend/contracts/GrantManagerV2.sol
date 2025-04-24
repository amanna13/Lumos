// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";

contract GrantManagerV2 {
    enum Phase { Submission, GroqCheck, Voting, Completed }
    Phase public currentPhase;
    
    // Add a string representation for easier validation
    string public currentPhaseString;

    address public owner;
    Voting public votingContract;

    // Keep track of the last time phase was changed
    uint256 public lastPhaseChange;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    event PhaseChanged(Phase newPhase, string phaseName, uint256 timestamp);

    constructor() {
        owner = msg.sender;
        currentPhase = Phase.Submission;
        currentPhaseString = "Submission";
        lastPhaseChange = block.timestamp;
        emit PhaseChanged(currentPhase, currentPhaseString, block.timestamp);
    }

    function setVotingContract(address _votingAddress) external onlyOwner {
        votingContract = Voting(_votingAddress);
    }

    // Update the phase change functions to update currentPhaseString
    function advancePhase() external onlyOwner {
        require(uint256(currentPhase) < 3, "Already completed");
        currentPhase = Phase(uint256(currentPhase) + 1);
        currentPhaseString = _getPhaseString(currentPhase);
        lastPhaseChange = block.timestamp;
        emit PhaseChanged(currentPhase, currentPhaseString, block.timestamp);
    }

    function revertToPreviousPhase() external onlyOwner {
        require(uint256(currentPhase) > 0, "Already at first phase");
        currentPhase = Phase(uint256(currentPhase) - 1);
        currentPhaseString = _getPhaseString(currentPhase);
        lastPhaseChange = block.timestamp;
        emit PhaseChanged(currentPhase, currentPhaseString, block.timestamp);
    }

    function setPhase(uint256 _phase) external onlyOwner {
        require(_phase <= 3, "Invalid phase");
        currentPhase = Phase(_phase);
        currentPhaseString = _getPhaseString(currentPhase);
        lastPhaseChange = block.timestamp;
        emit PhaseChanged(currentPhase, currentPhaseString, block.timestamp);
    }

    // Helper function to get the string representation of a phase
    function _getPhaseString(Phase _phase) internal pure returns (string memory) {
        if (_phase == Phase.Submission) return "Submission";
        if (_phase == Phase.GroqCheck) return "GroqCheck";
        if (_phase == Phase.Voting) return "Voting";
        return "Completed";
    }

    function getCurrentPhase() external view returns (string memory) {
        return currentPhaseString;
    }
    
    // Add a function to validate phase to help with debugging
    function validatePhase() external view returns (
        uint256 phaseNumber,
        string memory phaseName,
        uint256 changeTimestamp
    ) {
        return (
            uint256(currentPhase),
            currentPhaseString,
            lastPhaseChange
        );
    }
}
