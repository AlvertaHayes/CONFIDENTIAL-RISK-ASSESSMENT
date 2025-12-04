import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * FHEVM Example Generator CLI Tool
 *
 * This automated tool scaffolds new FHEVM example repositories based on templates.
 * It demonstrates the automation requirements for the Zama bounty program.
 *
 * @usage
 * ts-node automation/create-fhevm-example.ts [example-name] [category]
 *
 * @example
 * ts-node automation/create-fhevm-example.ts encrypted-voting governance
 */

interface ExampleConfig {
  name: string;
  category: string;
  description: string;
  contractName: string;
  outputPath: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExampleConfig {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("❌ Usage: ts-node create-fhevm-example.ts <name> <category>");
    console.error("\nExamples:");
    console.error("  ts-node create-fhevm-example.ts encrypted-voting governance");
    console.error("  ts-node create-fhevm-example.ts confidential-auction defi");
    process.exit(1);
  }

  const [name, category] = args;

  // Convert kebab-case to PascalCase for contract name
  const contractName = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return {
    name,
    category,
    description: `FHEVM Example: ${contractName}`,
    contractName,
    outputPath: path.join(process.cwd(), "..", `${name}-example`),
  };
}

/**
 * Create directory structure for new example
 */
function createDirectoryStructure(config: ExampleConfig): void {
  console.log(`\n📁 Creating directory structure for ${config.name}...\n`);

  const directories = [
    config.outputPath,
    path.join(config.outputPath, "contracts"),
    path.join(config.outputPath, "test"),
    path.join(config.outputPath, "scripts"),
    path.join(config.outputPath, "automation"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   ✓ Created: ${path.relative(process.cwd(), dir)}`);
    }
  });
}

/**
 * Generate package.json for new example
 */
function generatePackageJson(config: ExampleConfig): void {
  const packageJson = {
    name: `fhevm-${config.name}-example`,
    version: "1.0.0",
    description: config.description,
    keywords: ["fhevm", "fhe", config.category, "privacy", "blockchain"],
    author: "FHEVM Examples Contributor",
    license: "MIT",
    scripts: {
      compile: "hardhat compile",
      test: "hardhat test",
      "deploy:local": "hardhat run scripts/deploy.ts --network hardhat",
      "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
      "generate:docs": "ts-node automation/generate-docs.ts",
      clean: "hardhat clean",
    },
    devDependencies: {
      "@nomicfoundation/hardhat-toolbox": "^4.0.0",
      "@types/node": "^20.0.0",
      hardhat: "^2.19.0",
      typescript: "^5.3.0",
    },
    dependencies: {
      "@fhevm/solidity": "^0.5.0",
    },
  };

  const outputPath = path.join(config.outputPath, "package.json");
  fs.writeFileSync(outputPath, JSON.stringify(packageJson, null, 2));
  console.log(`\n   ✓ Generated: package.json`);
}

/**
 * Copy Hardhat configuration
 */
function copyHardhatConfig(config: ExampleConfig): void {
  const sourceConfig = path.join(process.cwd(), "hardhat.config.ts");
  const destConfig = path.join(config.outputPath, "hardhat.config.ts");

  if (fs.existsSync(sourceConfig)) {
    fs.copyFileSync(sourceConfig, destConfig);
    console.log(`   ✓ Copied: hardhat.config.ts`);
  }
}

/**
 * Generate base contract template
 */
function generateContractTemplate(config: ExampleConfig): void {
  const contractTemplate = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ${config.contractName}
 * @notice FHEVM example demonstrating ${config.category} concepts
 * @dev This contract showcases privacy-preserving operations using FHE
 */
contract ${config.contractName} is SepoliaConfig {
    address public owner;

    event ContractDeployed(address indexed owner, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit ContractDeployed(msg.sender, block.timestamp);
    }

    // TODO: Implement your FHEVM logic here
    // Remember to:
    // 1. Use FHE.asEuint*() for encryption
    // 2. Use FHE.allowThis() and FHE.allow() for access control
    // 3. Use FHE.requestDecryption() for public decryption
    // 4. Validate inputs before encryption
}
`;

  const contractPath = path.join(
    config.outputPath,
    "contracts",
    `${config.contractName}.sol`
  );
  fs.writeFileSync(contractPath, contractTemplate);
  console.log(`   ✓ Generated: contracts/${config.contractName}.sol`);
}

/**
 * Generate test template
 */
function generateTestTemplate(config: ExampleConfig): void {
  const testTemplate = `import { expect } from "chai";
import { ethers } from "hardhat";
import { ${config.contractName} } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title ${config.contractName} Test Suite
 * @chapter ${config.category}
 *
 * @description
 * This test suite demonstrates key FHEVM concepts for ${config.category} applications.
 *
 * @concept Encryption
 * All sensitive data is encrypted using FHE types before storage.
 *
 * @concept Access Control
 * Proper ACL management ensures only authorized parties can access encrypted data.
 */
describe("${config.contractName}", function () {
  let contract: ${config.contractName};
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const ${config.contractName}Factory = await ethers.getContractFactory("${config.contractName}");
    contract = await ${config.contractName}Factory.deploy();
    await contract.waitForDeployment();
  });

  /**
   * @test Contract Initialization
   * @category basic
   */
  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  // TODO: Add more test cases demonstrating:
  // - Encryption of values
  // - Access control patterns
  // - Public/user decryption
  // - Error handling
  // - Edge cases
});

/**
 * @summary
 * Key patterns demonstrated:
 * - Contract deployment and initialization
 * - Owner-based access control
 * - TODO: Add your specific patterns here
 */
`;

  const testPath = path.join(
    config.outputPath,
    "test",
    `${config.contractName}.test.ts`
  );
  fs.writeFileSync(testPath, testTemplate);
  console.log(`   ✓ Generated: test/${config.contractName}.test.ts`);
}

/**
 * Generate deployment script
 */
function generateDeployScript(config: ExampleConfig): void {
  const deployScript = `import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying ${config.contractName}...\\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const ${config.contractName} = await ethers.getContractFactory("${config.contractName}");
  const contract = await ${config.contractName}.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ ${config.contractName} deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  const scriptPath = path.join(config.outputPath, "scripts", "deploy.ts");
  fs.writeFileSync(scriptPath, deployScript);
  console.log(`   ✓ Generated: scripts/deploy.ts`);
}

/**
 * Generate README template
 */
function generateReadme(config: ExampleConfig): void {
  const readme = `# ${config.contractName} Example

> FHEVM Example demonstrating ${config.category} with privacy-preserving smart contracts

## Overview

This example showcases how to build privacy-preserving ${config.category} applications using Fully Homomorphic Encryption (FHE) on the blockchain.

## Features

- ✅ Encrypted data storage and computation
- ✅ Access control lists (ACL) for encrypted values
- ✅ Public decryption via oracle
- ✅ Comprehensive test coverage
- ✅ Production-ready deployment scripts

## Quick Start

### Installation

\`\`\`bash
npm install
\`\`\`

### Compile Contracts

\`\`\`bash
npm run compile
\`\`\`

### Run Tests

\`\`\`bash
npm test
\`\`\`

### Deploy

\`\`\`bash
# Local deployment
npm run deploy:local

# Testnet deployment
npm run deploy:sepolia
\`\`\`

## Key Concepts

### Encryption

All sensitive data is encrypted using FHEVM types (euint8, euint16, euint32, ebool).

### Access Control

The contract uses FHE.allow() and FHE.allowThis() to manage access permissions.

### Decryption

Public decryption is performed asynchronously via the decryption oracle.

## Project Structure

\`\`\`
${config.name}-example/
├── contracts/          # Solidity contracts
├── test/              # Test suite
├── scripts/           # Deployment scripts
├── automation/        # Documentation generation
└── README.md          # This file
\`\`\`

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org)
- [Example Repository](https://github.com/zama-ai/fhevm-hardhat-template)

## License

MIT
`;

  const readmePath = path.join(config.outputPath, "README.md");
  fs.writeFileSync(readmePath, readme);
  console.log(`   ✓ Generated: README.md`);
}

/**
 * Generate .env.example file
 */
function generateEnvExample(config: ExampleConfig): void {
  const envExample = `# Network Configuration
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
FHEVM_RPC_URL=http://localhost:8545

# Deployment Account
PRIVATE_KEY=your_private_key_here

# Block Explorer
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas Reporting
REPORT_GAS=false
`;

  const envPath = path.join(config.outputPath, ".env.example");
  fs.writeFileSync(envPath, envExample);
  console.log(`   ✓ Generated: .env.example`);
}

/**
 * Copy documentation generator
 */
function copyDocGenerator(config: ExampleConfig): void {
  const sourceGen = path.join(
    process.cwd(),
    "automation",
    "generate-docs.ts"
  );
  const destGen = path.join(
    config.outputPath,
    "automation",
    "generate-docs.ts"
  );

  // If the generator exists, copy it; otherwise, create a placeholder
  if (fs.existsSync(sourceGen)) {
    fs.copyFileSync(sourceGen, destGen);
  } else {
    const placeholderGen = `// Documentation generator placeholder
// Run: npm run generate:docs
console.log("Documentation generator - To be implemented");
`;
    fs.writeFileSync(destGen, placeholderGen);
  }
  console.log(`   ✓ Generated: automation/generate-docs.ts`);
}

/**
 * Main execution function
 */
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  FHEVM Example Generator               ║");
  console.log("║  Automated Scaffolding Tool            ║");
  console.log("╚════════════════════════════════════════╝");

  const config = parseArgs();

  console.log(`\n📦 Configuration:`);
  console.log(`   Name: ${config.name}`);
  console.log(`   Category: ${config.category}`);
  console.log(`   Contract: ${config.contractName}`);
  console.log(`   Output: ${config.outputPath}`);

  // Create project structure
  createDirectoryStructure(config);
  generatePackageJson(config);
  copyHardhatConfig(config);
  generateContractTemplate(config);
  generateTestTemplate(config);
  generateDeployScript(config);
  generateReadme(config);
  generateEnvExample(config);
  copyDocGenerator(config);

  console.log("\n✨ Example repository generated successfully!\n");
  console.log("📋 Next steps:");
  console.log(`   1. cd ${path.relative(process.cwd(), config.outputPath)}`);
  console.log("   2. npm install");
  console.log("   3. Implement your contract logic");
  console.log("   4. Write comprehensive tests");
  console.log("   5. npm test");
  console.log("   6. npm run generate:docs");
  console.log("\n🎉 Happy coding!\n");
}

// Execute the generator
main().catch((error) => {
  console.error("❌ Error generating example:", error);
  process.exit(1);
});
