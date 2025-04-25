// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 voteCount;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public voterToProposal;
    address[] public voters;
    mapping(address => bool) public isVoterTracked;
    uint256 public proposalCount;
    address public grantManager;

    // Events
    event ProposalSubmitted(uint256 indexed proposalId, string title, address proposer);
    event VoteCast(uint256 indexed proposalId, address voter);
    event VoteCleared(address indexed voter, uint256 indexed proposalId);

    modifier onlyGrantManager() {
        require(msg.sender == grantManager, "Only GrantManager can call this");
        _;
    }

    constructor(address _grantManager) {
        grantManager = _grantManager;
    }

    function submitProposal(string memory _title, string memory _description) external returns (uint256) {
        // Basic validation
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        
        // Increment proposal count
        proposalCount++;
        
        // Create the new proposal
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: _title,
            description: _description,
            proposer: msg.sender,
            voteCount: 0
        });

        // Emit event
        emit ProposalSubmitted(proposalCount, _title, msg.sender);
        
        return proposalCount;
    }

    function vote(uint256 _proposalId) external {
        require(!hasVoted[msg.sender], "You have already voted");
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal");

        proposals[_proposalId].voteCount += 1;
        hasVoted[msg.sender] = true;
        voterToProposal[msg.sender] = _proposalId;

        // Track voter for admin reset
        if (!isVoterTracked[msg.sender]) {
            voters.push(msg.sender);
            isVoterTracked[msg.sender] = true;
        }

        emit VoteCast(_proposalId, msg.sender);
    }

    function clearVote() public {
        require(hasVoted[msg.sender], "You haven't voted yet");

        uint256 proposalId = voterToProposal[msg.sender];
        if (proposals[proposalId].voteCount > 0) {
            proposals[proposalId].voteCount--;
        }

        hasVoted[msg.sender] = false;
        delete voterToProposal[msg.sender];

        emit VoteCleared(msg.sender, proposalId);
    }

    function adminResetAllVotes() external onlyGrantManager {
        // Reset all proposal vote counts
        for (uint256 i = 1; i <= proposalCount; i++) {
            proposals[i].voteCount = 0;
        }
        // Reset all voter mappings
        for (uint256 i = 0; i < voters.length; i++) {
            address voter = voters[i];
            hasVoted[voter] = false;
            delete voterToProposal[voter];
            isVoterTracked[voter] = false;
        }
        // Clear the voters array
        delete voters;
    }

    function getWinner() public view returns (uint256 winningProposalId, string memory title, address proposer) {
        uint256 maxVotes = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].voteCount > maxVotes) {
                maxVotes = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        Proposal memory winner = proposals[winningProposalId];
        return (winner.id, winner.title, winner.proposer);
    }
}
