const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  console.log("🚀 Deploying GrantManagerV2 with account:", deployer.address);
  console.log("📡 Network:", networkName);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy GrantManagerV2
  const GrantManagerV2 = await hre.ethers.getContractFactory("GrantManagerV2");
  const grantManagerV2 = await GrantManagerV2.deploy();
  await grantManagerV2.waitForDeployment();
  const grantManagerAddress = await grantManagerV2.getAddress();
  console.log("🎓 GrantManagerV2 deployed at:", grantManagerAddress);

  // Deploy Voting
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(grantManagerAddress);
  await voting.waitForDeployment();
  const votingAddress = await voting.getAddress();
  console.log("🗳️ Voting deployed at:", votingAddress);

  // Link Voting back to GrantManagerV2
  const tx = await grantManagerV2.setVotingContract(votingAddress);
  await tx.wait();
  console.log("🔗 Linked Voting to GrantManagerV2");

  // Save contract addresses for frontend
  console.log("\n✅ Deployment completed! Update your frontend with these addresses:");
  console.log(`GRANT_MANAGER_ADDRESS="${grantManagerAddress}"`);
  console.log(`VOTING_ADDRESS="${votingAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

/*
  Deployment Instructions:
  # 1. Open a terminal in your project root (where hardhat.config.js is located)
  # 2. Ensure your .env file contains valid RPC_URL and PRIVATE_KEY for your target network (e.g., baseSepolia)
  # 3. Run the following command to deploy GrantManagerV2 and Voting contracts:

  npx hardhat run scripts/deploy-v2.js --network baseSepolia

  # 4. After deployment, copy the printed GRANT_MANAGER_ADDRESS and VOTING_ADDRESS to your frontend config.
  # 5. If the ABI changed, copy the new GrantManagerV2.json to your frontend as well.
*/
