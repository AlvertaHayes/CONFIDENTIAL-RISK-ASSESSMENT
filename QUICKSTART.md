# 🚀 Quick Start Guide

Get up and running with the Confidential Risk Assessment FHEVM example in minutes!

## ⚡ Fast Track (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Compile contracts
npm run compile

# 3. Run tests
npm test

# 4. Generate documentation
npm run generate:docs
```

That's it! You're ready to explore FHEVM development.

---

## 📋 What You Get

After completing the fast track, you'll have:

✅ Compiled FHEVM smart contract
✅ Passing test suite (50+ tests)
✅ Generated documentation in `docs/`
✅ Ready-to-deploy contract

---

## 🎯 Next Steps

### Option 1: Learn FHEVM Concepts

```bash
# Read the comprehensive guide
cat docs/GUIDE.md

# Or open in your editor
code docs/GUIDE.md
```

### Option 2: Deploy the Contract

```bash
# Local deployment
npm run deploy:local

# Testnet deployment (configure .env first)
cp .env.example .env
# Edit .env with your private key and RPC URL
npm run deploy:sepolia
```

### Option 3: Generate New Examples

```bash
# Create a new FHEVM example project
ts-node automation/create-fhevm-example.ts encrypted-voting governance

# This creates: ../encrypted-voting-example/
```

### Option 4: Explore the Code

**Start with the test file** (most educational):
```bash
code test/ConfidentialRiskAssessment.test.ts
```

**Then review the contract**:
```bash
code contracts/ConfidentialRiskAssessment.sol
```

---

## 💡 Key Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies |
| `npm run compile` | Compile smart contracts |
| `npm test` | Run comprehensive test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run deploy:local` | Deploy to local Hardhat network |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run generate:docs` | Generate documentation |
| `npm run generate:example` | Create new example project |
| `npm run clean` | Clean build artifacts |
| `npm run lint` | Lint Solidity contracts |

---

## 🔍 Project Structure at a Glance

```
confidential-risk-assessment/
│
├── contracts/                          # Smart contracts
│   └── ConfidentialRiskAssessment.sol  # Main FHEVM contract
│
├── test/                               # Comprehensive tests
│   └── ConfidentialRiskAssessment.test.ts  # 50+ annotated tests
│
├── scripts/                            # Deployment scripts
│   └── deploy.ts                       # Deployment automation
│
├── automation/                         # Automation tools
│   ├── create-fhevm-example.ts         # Example generator
│   └── generate-docs.ts                # Documentation generator
│
├── docs/                               # Generated documentation
│   ├── README.md                       # Documentation index
│   ├── GUIDE.md                        # Comprehensive guide (generated)
│   └── SUMMARY.md                      # GitBook structure (generated)
│
└── Configuration Files
    ├── hardhat.config.ts               # Hardhat setup
    ├── package.json                    # Dependencies
    ├── tsconfig.json                   # TypeScript config
    └── .env.example                    # Environment template
```

---

## 📚 Learning Path

### 1️⃣ Beginner (Day 1)
- ✅ Run `npm test` and read test output
- ✅ Open `test/ConfidentialRiskAssessment.test.ts`
- ✅ Read the JSDoc comments (they explain everything!)
- ✅ Generate docs: `npm run generate:docs`

### 2️⃣ Intermediate (Day 2-3)
- ✅ Study the contract: `contracts/ConfidentialRiskAssessment.sol`
- ✅ Understand encryption: Lines 128-131
- ✅ Understand ACL: Lines 146-153
- ✅ Understand decryption: Lines 159-195

### 3️⃣ Advanced (Week 1)
- ✅ Deploy locally and interact: `npm run deploy:local`
- ✅ Create your own example: Use the generator
- ✅ Modify the contract and add features
- ✅ Deploy to testnet

---

## 🎓 FHEVM Concepts Covered

This example demonstrates:

| Concept | Location | Description |
|---------|----------|-------------|
| **Encryption** | Contract:128-131 | Convert plaintext to euint* |
| **Access Control** | Contract:146-153 | FHE.allow() patterns |
| **Public Decryption** | Contract:159-195 | Oracle-based decryption |
| **Random Generation** | Contract:99 | FHE.randEuint8() |
| **Time Restrictions** | Contract:73-90 | Temporal logic |
| **Batch Processing** | Contract:198-219 | Multiple submissions |
| **Input Validation** | Contract:121-125 | Pre-encryption checks |
| **Error Handling** | Throughout | Proper revert messages |

---

## 🎬 Watch the Video

Before diving in, watch the demonstration video:

📹 **Location**: `ConfidentialRiskAssessment.mp4`

**Covers**:
- Complete setup walkthrough
- Test execution explanation
- Documentation generation demo
- Deployment process
- Live contract interaction

---

## 🆘 Troubleshooting

### Installation Issues

```bash
# Try clearing cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Compilation Errors

```bash
# Clean and recompile
npm run clean
npm run compile
```

### Test Failures

```bash
# Run with verbose output
npx hardhat test --verbose

# Run specific test
npx hardhat test --grep "specific test name"
```

### Documentation Not Generating

```bash
# Ensure test files exist
ls -la test/

# Run with Node.js directly
node --loader ts-node/esm automation/generate-docs.ts
```

---

## 💻 System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Operating System**: Windows, macOS, or Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 500MB for dependencies

---

## 🔗 Essential Links

### Documentation
- 📖 [Main README](README.md) - Complete project documentation
- 📝 [Bounty Submission](BOUNTY_SUBMISSION.md) - Submission details
- 📚 [Generated Docs](docs/) - Auto-generated guides

### External Resources
- 🌐 [FHEVM Documentation](https://docs.zama.ai/fhevm)
- 💻 [Zama GitHub](https://github.com/zama-ai)
- 🛠️ [Hardhat Documentation](https://hardhat.org)

### Community
- 💬 [Zama Discord](https://discord.gg/zama)
- 🐦 [Zama Twitter](https://twitter.com/zama_fhe)

---

## ✅ Success Checklist

After completing the quick start, you should be able to:

- [ ] Install dependencies without errors
- [ ] Compile the contract successfully
- [ ] Run all tests (all passing)
- [ ] Generate documentation
- [ ] Understand basic FHEVM concepts
- [ ] Deploy to local network
- [ ] Read and understand the test annotations
- [ ] Modify the contract and retest

If you've checked all boxes, congratulations! 🎉 You're ready to build FHEVM applications.

---

## 🎯 Challenge Yourself

Try these exercises to deepen your understanding:

### Exercise 1: Add New Field
Add a new encrypted field to `RiskProfile` (e.g., `encryptedAge`)

### Exercise 2: New Modifier
Create a modifier that only allows submissions on weekdays

### Exercise 3: Additional Test
Write a test case for edge conditions

### Exercise 4: New Example
Use the generator to create a blind auction example

### Exercise 5: Gas Optimization
Analyze gas usage and propose optimizations

---

## 📝 Quick Reference Card

```solidity
// Encryption
euint16 encrypted = FHE.asEuint16(plainValue);

// Access Control
FHE.allowThis(encrypted);          // Contract access
FHE.allow(encrypted, userAddress);  // User access

// Random Generation
euint8 random = FHE.randEuint8();

// Decryption Request
bytes32[] memory cts = new bytes32[](1);
cts[0] = FHE.toBytes32(encrypted);
FHE.requestDecryption(cts, this.callback.selector);

// Decryption Callback
function callback(uint256 requestId, uint8 decrypted, bytes memory sigs) external {
    FHE.checkSignatures(requestId, abi.encode(decrypted), sigs);
    // Use decrypted value
}
```

---

## 🚀 Ready to Start?

Run this command and begin your FHEVM journey:

```bash
npm install && npm run compile && npm test
```

**Welcome to privacy-preserving smart contract development! 🔐**
