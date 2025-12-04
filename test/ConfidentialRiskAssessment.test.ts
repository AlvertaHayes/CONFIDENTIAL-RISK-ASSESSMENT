import { expect } from "chai";
import { ethers } from "hardhat";
import { ConfidentialRiskAssessment } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @title FHEVM Confidential Risk Assessment Test Suite
 * @chapter access-control, encryption, public-decryption
 *
 * @description
 * This comprehensive test suite demonstrates key FHEVM concepts including:
 * - Encryption of sensitive data (credit scores, income, employment)
 * - Access control lists (ACL) for encrypted values
 * - Public decryption through the decryption oracle
 * - Time-based restrictions and business logic
 * - Owner-only functions and role-based access
 *
 * @concept Access Control
 * FHEVM requires explicit permission for contracts and users to access encrypted data.
 * We use FHE.allowThis() and FHE.allow() to grant access permissions.
 *
 * @concept Encryption
 * All sensitive financial data is encrypted using FHE types (euint8, euint16, euint32)
 * before being stored on-chain, ensuring privacy throughout the process.
 *
 * @concept Public Decryption
 * The contract uses the decryption oracle to reveal the risk threshold after
 * the assessment window closes, demonstrating async decryption patterns.
 */
describe("ConfidentialRiskAssessment", function () {
  let contract: ConfidentialRiskAssessment;
  let owner: SignerWithAddress;
  let applicant1: SignerWithAddress;
  let applicant2: SignerWithAddress;
  let applicant3: SignerWithAddress;

  /**
   * @setup Contract Deployment
   *
   * Deploy the ConfidentialRiskAssessment contract before each test.
   * This ensures a clean state for every test case.
   */
  beforeEach(async function () {
    [owner, applicant1, applicant2, applicant3] = await ethers.getSigners();

    const ConfidentialRiskAssessment = await ethers.getContractFactory(
      "ConfidentialRiskAssessment"
    );
    contract = await ConfidentialRiskAssessment.deploy();
    await contract.waitForDeployment();
  });

  /**
   * @test Contract Initialization
   * @category basic
   *
   * Verify that the contract initializes correctly with:
   * - Owner set to deployer address
   * - Assessment ID starting at 1
   * - Proper timestamp tracking
   */
  describe("Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should initialize with assessment ID 1", async function () {
      expect(await contract.currentAssessmentId()).to.equal(1);
    });

    it("Should track last assessment time", async function () {
      const lastTime = await contract.lastAssessmentTime();
      expect(lastTime).to.be.gt(0);
    });
  });

  /**
   * @test Business Hours Validation
   * @category time-restrictions
   *
   * @description
   * Demonstrates time-based access control patterns in FHEVM.
   * Business hours are enforced to simulate real-world constraints.
   *
   * @pattern Time-Based Restrictions
   * Smart contracts can enforce temporal rules using block.timestamp.
   * This pattern is useful for:
   * - Trading windows
   * - Auction deadlines
   * - Operational hours compliance
   */
  describe("Business Hours", function () {
    it("Should correctly identify business hours (9 AM - 5 PM UTC)", async function () {
      // Set time to 10 AM UTC (within business hours)
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;

      await time.increaseTo(targetTime);

      const isBusinessHours = await contract.isBusinessHours();
      expect(isBusinessHours).to.be.true;
    });

    it("Should reject operations outside business hours", async function () {
      // Set time to 8 PM UTC (outside business hours)
      const eightPM = Math.floor(Date.now() / 1000);
      const hourOfDay = 20;
      const targetTime = eightPM - (eightPM % 86400) + hourOfDay * 3600;

      await time.increaseTo(targetTime);

      const isBusinessHours = await contract.isBusinessHours();
      expect(isBusinessHours).to.be.false;
    });
  });

  /**
   * @test Assessment Lifecycle
   * @category access-control, encryption
   *
   * @description
   * Tests the complete lifecycle of a risk assessment from initialization
   * through submission to completion.
   *
   * @pattern Owner-Only Functions
   * Critical operations like starting assessments are restricted to the contract owner.
   * This demonstrates role-based access control in FHEVM applications.
   *
   * @pattern Encrypted Random Values
   * Uses FHE.randEuint8() to generate encrypted random thresholds that remain
   * confidential until explicitly decrypted.
   */
  describe("Assessment Lifecycle", function () {
    it("Should allow owner to start new assessment during business hours", async function () {
      // Set time to business hours
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await expect(contract.startNewAssessment())
        .to.emit(contract, "AssessmentStarted")
        .withArgs(1, await time.latest());

      const assessmentInfo = await contract.getCurrentAssessmentInfo();
      expect(assessmentInfo.thresholdSet).to.be.true;
      expect(assessmentInfo.assessmentCompleted).to.be.false;
    });

    /**
     * @antipattern Missing Owner Check
     *
     * This test demonstrates why owner-only restrictions are critical.
     * Without proper access control, unauthorized users could manipulate
     * the assessment process.
     */
    it("Should prevent non-owner from starting assessment", async function () {
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await expect(
        contract.connect(applicant1).startNewAssessment()
      ).to.be.revertedWith("Not authorized");
    });

    it("Should prevent starting assessment outside business hours", async function () {
      // Set time outside business hours (8 PM)
      const eightPM = Math.floor(Date.now() / 1000);
      const hourOfDay = 20;
      const targetTime = eightPM - (eightPM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await expect(
        contract.startNewAssessment()
      ).to.be.revertedWith("Not during business hours");
    });
  });

  /**
   * @test Risk Profile Submission
   * @category encryption, access-control
   *
   * @description
   * Demonstrates encryption of multiple data types and proper ACL management.
   *
   * @concept Encrypted Types
   * FHEVM provides various encrypted integer types:
   * - euint8: 8-bit encrypted integers (0-255)
   * - euint16: 16-bit encrypted integers (0-65535)
   * - euint32: 32-bit encrypted integers (0-4294967295)
   *
   * @pattern Access Control Lists
   * After encrypting data, we must explicitly grant access using:
   * - FHE.allowThis(): Grant contract access
   * - FHE.allow(value, address): Grant specific address access
   *
   * @pattern Input Validation
   * Even with encrypted data, we validate inputs before encryption
   * to prevent invalid data from entering the system.
   */
  describe("Risk Profile Submission", function () {
    beforeEach(async function () {
      // Start assessment during business hours
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await contract.startNewAssessment();
    });

    it("Should allow applicant to submit encrypted risk profile", async function () {
      const creditScore = 750;
      const income = 75000;
      const employmentYears = 5;
      const debtRatio = 30;

      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(creditScore, income, employmentYears, debtRatio)
      )
        .to.emit(contract, "ProfileSubmitted")
        .withArgs(applicant1.address, 1);

      const status = await contract.getApplicantStatus(applicant1.address);
      expect(status.hasSubmitted).to.be.true;
    });

    /**
     * @test Multiple Submissions
     * @pattern Batch Processing
     *
     * Demonstrates how multiple applicants can submit encrypted profiles
     * which will later be evaluated in a batch operation.
     */
    it("Should accept multiple applicant submissions", async function () {
      // Applicant 1 - High credit, good income
      await contract
        .connect(applicant1)
        .submitRiskProfile(800, 100000, 10, 20);

      // Applicant 2 - Medium credit, average income
      await contract
        .connect(applicant2)
        .submitRiskProfile(650, 50000, 3, 40);

      // Applicant 3 - Lower credit, lower income
      await contract
        .connect(applicant3)
        .submitRiskProfile(550, 35000, 1, 60);

      const info = await contract.getCurrentAssessmentInfo();
      expect(info.applicantCount).to.equal(3);
    });

    /**
     * @antipattern Invalid Input Values
     *
     * This test shows why input validation is important even before encryption.
     * Invalid ranges should be rejected early to maintain data integrity.
     */
    it("Should reject invalid credit score (> 850)", async function () {
      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(900, 50000, 5, 30)
      ).to.be.revertedWith("Invalid credit score");
    });

    it("Should reject invalid employment years (> 50)", async function () {
      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(700, 50000, 60, 30)
      ).to.be.revertedWith("Invalid employment years");
    });

    it("Should reject invalid debt ratio (> 100)", async function () {
      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(700, 50000, 5, 150)
      ).to.be.revertedWith("Invalid debt ratio");
    });

    /**
     * @antipattern Duplicate Submissions
     *
     * Prevents applicants from submitting multiple profiles in the same
     * assessment cycle, which could skew results or enable gaming.
     */
    it("Should prevent duplicate submissions from same applicant", async function () {
      await contract
        .connect(applicant1)
        .submitRiskProfile(750, 75000, 5, 30);

      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(800, 80000, 6, 25)
      ).to.be.revertedWith("Profile already submitted");
    });

    it("Should only accept submissions during assessment window", async function () {
      // Move time outside business hours
      const eightPM = Math.floor(Date.now() / 1000);
      const hourOfDay = 20;
      const targetTime = eightPM - (eightPM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await expect(
        contract
          .connect(applicant1)
          .submitRiskProfile(750, 75000, 5, 30)
      ).to.be.revertedWith("Assessment window not active");
    });
  });

  /**
   * @test Public Decryption Process
   * @category public-decryption
   *
   * @description
   * Demonstrates the asynchronous decryption pattern in FHEVM.
   *
   * @concept Decryption Oracle
   * FHEVM uses an oracle network to perform decryption operations.
   * The process is:
   * 1. Contract requests decryption via FHE.requestDecryption()
   * 2. Oracle network decrypts the value off-chain
   * 3. Oracle calls back with decrypted value and signatures
   * 4. Contract verifies signatures via FHE.checkSignatures()
   * 5. Contract processes the decrypted result
   *
   * @pattern Async Decryption
   * Unlike encryption (which is instant), decryption requires waiting for
   * the oracle callback. This is a key pattern in FHEVM development.
   */
  describe("Assessment Processing", function () {
    beforeEach(async function () {
      // Setup: Start assessment and add applicants
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await contract.startNewAssessment();

      // Add multiple applicants
      await contract
        .connect(applicant1)
        .submitRiskProfile(800, 100000, 10, 20);

      await contract
        .connect(applicant2)
        .submitRiskProfile(650, 50000, 3, 40);
    });

    it("Should process assessment after business hours", async function () {
      // Move to after business hours (evaluation time)
      const eightPM = Math.floor(Date.now() / 1000);
      const hourOfDay = 20;
      const targetTime = eightPM - (eightPM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      // Request decryption (in production, oracle would callback)
      await expect(contract.processRiskAssessment()).to.not.be.reverted;
    });

    it("Should not process during business hours", async function () {
      await expect(
        contract.processRiskAssessment()
      ).to.be.revertedWith("Not evaluation time");
    });

    it("Should not process without threshold set", async function () {
      // Deploy new contract without starting assessment
      const ConfidentialRiskAssessment = await ethers.getContractFactory(
        "ConfidentialRiskAssessment"
      );
      const newContract = await ConfidentialRiskAssessment.deploy();

      const eightPM = Math.floor(Date.now() / 1000);
      const hourOfDay = 20;
      const targetTime = eightPM - (eightPM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await expect(
        newContract.processRiskAssessment()
      ).to.be.revertedWith("No threshold set");
    });
  });

  /**
   * @test Status and Information Queries
   * @category view-functions
   *
   * @description
   * View functions provide read-only access to contract state.
   * These are gas-free and can be called anytime.
   *
   * @pattern Information Transparency
   * While individual data remains encrypted, aggregate information
   * (like applicant count, status) is publicly visible for transparency.
   */
  describe("Status Queries", function () {
    beforeEach(async function () {
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await contract.startNewAssessment();

      await contract
        .connect(applicant1)
        .submitRiskProfile(750, 75000, 5, 30);
    });

    it("Should return current assessment information", async function () {
      const info = await contract.getCurrentAssessmentInfo();

      expect(info.assessmentId).to.equal(1);
      expect(info.thresholdSet).to.be.true;
      expect(info.assessmentCompleted).to.be.false;
      expect(info.applicantCount).to.equal(1);
    });

    it("Should return applicant status correctly", async function () {
      const status = await contract.getApplicantStatus(applicant1.address);

      expect(status.hasSubmitted).to.be.true;
      expect(status.timestamp).to.be.gt(0);
    });

    it("Should return current hour", async function () {
      const currentHour = await contract.getCurrentHour();
      expect(currentHour).to.be.gte(0).and.lte(23);
    });
  });

  /**
   * @test Emergency Controls
   * @category access-control
   *
   * @description
   * Emergency pause functionality provides a safety mechanism for
   * unexpected situations.
   *
   * @pattern Circuit Breaker
   * Owner can pause ongoing assessments in case of:
   * - Discovered vulnerabilities
   * - Oracle failures
   * - Unexpected behavior
   * - Administrative requirements
   */
  describe("Emergency Controls", function () {
    beforeEach(async function () {
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await contract.startNewAssessment();
    });

    it("Should allow owner to pause current assessment", async function () {
      await contract.pauseCurrentAssessment();

      const info = await contract.getCurrentAssessmentInfo();
      expect(info.assessmentCompleted).to.be.true;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        contract.connect(applicant1).pauseCurrentAssessment()
      ).to.be.revertedWith("Not authorized");
    });
  });

  /**
   * @test Assessment History
   * @category data-retrieval
   *
   * @description
   * Historical data allows auditing and analysis of past assessments.
   *
   * @pattern Historical Records
   * Maintaining on-chain history enables:
   * - Audit trails
   * - Performance analysis
   * - Regulatory compliance
   * - Transparency
   */
  describe("Assessment History", function () {
    it("Should retrieve historical assessment data", async function () {
      const tenAM = Math.floor(Date.now() / 1000);
      const hourOfDay = 10;
      const targetTime = tenAM - (tenAM % 86400) + hourOfDay * 3600;
      await time.increaseTo(targetTime);

      await contract.startNewAssessment();

      await contract
        .connect(applicant1)
        .submitRiskProfile(750, 75000, 5, 30);

      const history = await contract.getAssessmentHistory(1);
      expect(history.applicantCount).to.equal(1);
    });
  });
});

/**
 * @summary
 * This test suite demonstrates essential FHEVM patterns for building
 * privacy-preserving applications:
 *
 * 1. **Encryption**: Converting plaintext to encrypted types (euint*)
 * 2. **Access Control**: Managing permissions with FHE.allow*() functions
 * 3. **Public Decryption**: Async decryption via oracle callbacks
 * 4. **Time Restrictions**: Enforcing business rules with timestamps
 * 5. **Role-Based Access**: Owner-only functions for critical operations
 * 6. **Input Validation**: Checking bounds before encryption
 * 7. **Batch Processing**: Handling multiple encrypted submissions
 * 8. **Error Handling**: Proper validation and revert messages
 *
 * @deployment
 * To deploy and test this contract:
 * 1. Install dependencies: `npm install`
 * 2. Compile contracts: `npm run compile`
 * 3. Run tests: `npm test`
 * 4. Deploy locally: `npm run deploy:local`
 *
 * @resources
 * - FHEVM Documentation: https://docs.zama.ai/fhevm
 * - Hardhat Guide: https://hardhat.org/getting-started
 * - Example Repository: https://github.com/zama-ai/fhevm-hardhat-template
 */
