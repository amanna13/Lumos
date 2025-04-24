// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";

contract GrantManager {
    enum Phase { Submission, Voting, Completed }
    Phase public currentPhase;

    address public owner;
    Voting public votingContract;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    event PhaseChanged(Phase newPhase);

    constructor() {
        owner = msg.sender;
        currentPhase = Phase.Submission;
    }

    function setVotingContract(address _votingAddress) external onlyOwner {
        votingContract = Voting(_votingAddress);
    }

    function advancePhase() external onlyOwner {
        require(uint256(currentPhase) < 2, "Already completed");
        currentPhase = Phase(uint256(currentPhase) + 1);
        emit PhaseChanged(currentPhase);
    }

    function getCurrentPhase() external view returns (string memory) {
        if (currentPhase == Phase.Submission) return "Submission";
        if (currentPhase == Phase.Voting) return "Voting";
        return "Completed";
    }

    // You can also add time-based auto-phase transitions if needed
}
