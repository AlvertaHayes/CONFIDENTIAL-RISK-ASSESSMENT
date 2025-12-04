import { ethers } from "hardhat";

/**
 * Deployment Script for Confidential Risk Assessment
 *
 * This script demonstrates proper deployment patterns for FHEVM contracts.
 * It includes verification steps and post-deployment configuration.
 */
async function main() {
  console.log("🚀 Starting deployment of Confidential Risk Assessment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  console.log("⏳ Deploying ConfidentialRiskAssessment contract...");
  const ConfidentialRiskAssessment = await ethers.getContractFactory(
    "ConfidentialRiskAssessment"
  );
  const contract = await ConfidentialRiskAssessment.deploy();

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await contract.owner();
  const currentId = await contract.currentAssessmentId();

  console.log("   Owner:", owner);
  console.log("   Current Assessment ID:", currentId.toString());

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with:");
  console.log(`   DEPLOYED_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\n2. Verify on block explorer (if on testnet):");
  console.log(`   npx hardhat verify --network <network> ${contractAddress}`);
  console.log("\n3. Start an assessment (owner only):");
  console.log("   Call startNewAssessment() during business hours (9-17 UTC)");

  console.log("\n✨ Deployment complete!\n");

  return contractAddress;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
