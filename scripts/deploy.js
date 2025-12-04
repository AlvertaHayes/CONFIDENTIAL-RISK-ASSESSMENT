const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Confidential Risk Assessment contract...");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const ConfidentialRiskAssessment = await ethers.getContractFactory("ConfidentialRiskAssessment");
  const riskAssessment = await ConfidentialRiskAssessment.deploy();

  await riskAssessment.waitForDeployment();

  const contractAddress = await riskAssessment.getAddress();
  console.log("ConfidentialRiskAssessment deployed to:", contractAddress);

  // Verify deployment
  console.log("Verifying deployment...");
  const owner = await riskAssessment.owner();
  console.log("Contract owner:", owner);
  console.log("Deployer address:", deployer.address);
  console.log("Owner verification:", owner === deployer.address ? "✅ Correct" : "❌ Incorrect");

  // Display contract information
  const currentAssessmentId = await riskAssessment.currentAssessmentId();
  console.log("Current assessment ID:", currentAssessmentId.toString());

  const currentHour = await riskAssessment.getCurrentHour();
  console.log("Current hour (UTC):", currentHour.toString());

  const isBusinessHours = await riskAssessment.isBusinessHours();
  console.log("Is business hours:", isBusinessHours);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📄 Contract Address:", contractAddress);
  console.log("🔗 Network:", hre.network.name);

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: hre.network.name,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contractName: "ConfidentialRiskAssessment"
  };

  console.log("\n📋 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });