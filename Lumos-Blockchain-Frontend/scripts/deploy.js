const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  console.log("🚀 Deploying with account:", deployer.address);
  console.log("📡 Network:", networkName);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Check if we have enough funds for deployment
  if (balance <= 0 && networkName !== "hardhat" && networkName !== "localhost") {
    console.error("❌ Insufficient funds! Please fund your account before deploying.");
    console.log("💡 If you're testing, try using the hardhat or localhost network:");
    console.log("   npx hardhat run scripts/deploy.js --network hardhat");
    console.log("   or");
    console.log("   npx hardhat run scripts/deploy.js --network localhost");
    process.exit(1);
  }

  // 1. Deploy GrantManager first
  const GrantManager = await hre.ethers.getContractFactory("GrantManager");
  const grantManager = await GrantManager.deploy();
  await grantManager.waitForDeployment();
  console.log("🎓 GrantManager deployed at:", grantManager.target);

  // 2. Deploy Voting, pass GrantManager's address to constructor
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(grantManager.target); // ✅ this is required
  await voting.waitForDeployment();
  console.log("🗳️ Voting deployed at:", voting.target);

  // 3. Optional: link Voting back into GrantManager
  const tx = await grantManager.setVotingContract(voting.target);
  await tx.wait();
  console.log("🔗 Linked Voting to GrantManager");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
