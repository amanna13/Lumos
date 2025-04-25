// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";

contract GrantManagerV2 {
    enum Phase { Submission, GroqCheck, Voting, Completed }
    Phase public currentPhase;

    string public currentPhaseString;

    address public owner;
    Voting public votingContract;

    uint256 public lastPhaseChange;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    event PhaseChanged(Phase newPhase, string phaseName, uint256 timestamp);

    constructor() {
        owner = msg.sender;
        _setPhase(Phase.Submission);
    }

    function setVotingContract(address _votingAddress) external onlyOwner {
        votingContract = Voting(_votingAddress);
    }

    function advancePhase() external onlyOwner {
        require(uint256(currentPhase) < uint256(Phase.Completed), "Already completed");
        _setPhase(Phase(uint256(currentPhase) + 1));
    }

    function revertToPreviousPhase() external onlyOwner {
        require(uint256(currentPhase) > 0, "Already at first phase");
        _setPhase(Phase(uint256(currentPhase) - 1));
    }

    function setPhase(uint256 _phase) external onlyOwner {
        require(_phase <= uint256(Phase.Completed), "Invalid phase");
        _setPhase(Phase(_phase));
    }

    function _setPhase(Phase _phase) internal {
        currentPhase = _phase;
        currentPhaseString = _getPhaseString(_phase);
        lastPhaseChange = block.timestamp;
        emit PhaseChanged(currentPhase, currentPhaseString, block.timestamp);
    }

    function _getPhaseString(Phase _phase) internal pure returns (string memory) {
        if (_phase == Phase.Submission) return "Submission Phase";
        if (_phase == Phase.GroqCheck) return "Groq Check Phase";
        if (_phase == Phase.Voting) return "Voting Phase";
        return "Completed Phase";
    }

    function getCurrentPhase() external view returns (string memory) {
        return currentPhaseString;
    }

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
