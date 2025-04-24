const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting and GrantManager Integration Tests", function () {
  // These addresses should be replaced with your actual deployed contract addresses
  const GRANT_MANAGER_ADDRESS = "0xE1E73c95158211f9732A8163C34f60D7A8d9cd9B";
  const VOTING_ADDRESS = "0xadfFe5FD91c1654DCc146bEAb7896Bb60BD39984";
  
  let grantManager;
  let voting;
  let deployer;

  before(async function () {
    // Get deployer address
    [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Connect to deployed contracts
    grantManager = await ethers.getContractAt("GrantManager", GRANT_MANAGER_ADDRESS);
    voting = await ethers.getContractAt("Voting", VOTING_ADDRESS);
    
    console.log("Connected to GrantManager at:", GRANT_MANAGER_ADDRESS);
    console.log("Connected to Voting at:", VOTING_ADDRESS);
  });

  it("should correctly store the GrantManager address in Voting contract", async function () {
    const storedAddress = await voting.grantManager();
    expect(storedAddress).to.equal(GRANT_MANAGER_ADDRESS);
  });

  it("should correctly store the Voting address in GrantManager contract", async function () {
    const storedAddress = await grantManager.votingContract();
    expect(storedAddress).to.equal(VOTING_ADDRESS);
  });

  it("should allow submitting a proposal", async function () {
    // Submit a proposal through the Voting contract instead
    const projectName = "Test Project";
    const projectDescription = "This is a test project";
    
    const tx = await voting.submitProposal(
      projectName,
      projectDescription
    );
    await tx.wait();
    
    // Get the proposal ID from the transaction or use proposalCount
    const proposalId = await voting.proposalCount();
    
    // Get the proposal details
    const proposal = await voting.proposals(proposalId);
    
    expect(proposal.title).to.equal(projectName);
    expect(proposal.description).to.equal(projectDescription);
    expect(proposal.proposer).to.equal(deployer.address);
  });

  it("should allow voting for a proposal", async function () {
    // Get the latest proposal ID
    const proposalId = await voting.proposalCount();
    
    // Vote for it
    const tx = await voting.vote(proposalId);
    await tx.wait();
    
    // Check if we've voted
    const hasVoted = await voting.hasVoted(deployer.address);
    expect(hasVoted).to.be.true;
    
    // Check vote count
    const proposal = await voting.proposals(proposalId);
    expect(proposal.voteCount).to.be.at.least(1);
  });

  it("should not allow voting twice for the same proposal", async function () {
    // Get the latest proposal ID
    const proposalId = await voting.proposalCount();
    
    // Try to vote again (should revert)
    await expect(
      voting.vote(proposalId)
    ).to.be.revertedWith("You have already voted");
  });

  it("should correctly determine a winner", async function () {
    // This test assumes there's at least one proposal with votes
    
    const winnerInfo = await voting.getWinner();
    const winnerId = winnerInfo[0]; // First return value is the winning proposal ID
    console.log("Current winner proposal ID:", winnerId.toString());
    
    // Check if the winning proposal exists
    const proposal = await voting.proposals(winnerId);
    expect(proposal.title).to.not.be.empty;
  });
});