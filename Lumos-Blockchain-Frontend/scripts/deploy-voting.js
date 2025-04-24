const { ethers } = require("hardhat");

async function main() {
  // Get the account to deploy with
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // First deploy the GrantManager or get its existing address
  let grantManagerAddress;
  
  // If you're using an existing GrantManager:
  grantManagerAddress = "0x012499D995eB88BeD9350dB5ec37EC5CCC975555";
  console.log("Using existing GrantManager at:", grantManagerAddress);
  
  // Now deploy the Voting contract
  console.log("Deploying Voting contract...");
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(grantManagerAddress);
  
  // Wait for deployment to finish
  await voting.waitForDeployment();
  
  // Get the deployed contract address
  const votingAddress = await voting.getAddress();
  console.log("Voting contract deployed to:", votingAddress);
  
  // If needed, set the Voting address in the GrantManager
  try {
    const grantManagerContract = await ethers.getContractAt("GrantManager", grantManagerAddress);
    const setVotingTx = await grantManagerContract.setVotingContract(votingAddress);
    await setVotingTx.wait();
    console.log("Voting address set in GrantManager");
  } catch (error) {
    console.warn("Could not set Voting address in GrantManager. You may need to do this manually:", error.message);
  }
  
  console.log("\n✅ Deployment completed! Update your frontend with this address:");
  console.log(`VOTING_ADDRESS="${votingAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
