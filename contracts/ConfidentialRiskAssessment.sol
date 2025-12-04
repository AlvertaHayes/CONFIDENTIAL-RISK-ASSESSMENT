// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialRiskAssessment is SepoliaConfig {

    address public owner;
    uint32 public currentAssessmentId;
    uint256 public lastAssessmentTime;

    // Assessment window timing (business hours)
    uint256 constant BUSINESS_HOURS_START = 9; // 9 AM
    uint256 constant BUSINESS_HOURS_END = 17;  // 5 PM

    struct RiskProfile {
        euint16 encryptedCreditScore;
        euint32 encryptedIncome;
        euint8 encryptedEmploymentYears;
        euint16 encryptedDebtRatio;
        bool hasSubmitted;
        uint256 timestamp;
        address applicant;
    }

    struct Assessment {
        euint8 riskThreshold;
        bool thresholdSet;
        bool assessmentCompleted;
        uint8 finalRiskLevel;
        uint256 startTime;
        uint256 endTime;
        address[] applicants;
        mapping(address => RiskProfile) profiles;
        mapping(address => bool) approvedApplicants;
    }

    mapping(uint32 => Assessment) public assessments;

    event AssessmentStarted(uint32 indexed assessmentId, uint256 startTime);
    event ProfileSubmitted(address indexed applicant, uint32 indexed assessmentId);
    event AssessmentCompleted(uint32 indexed assessmentId, uint256 approvedCount);
    event RiskLevelRevealed(uint32 indexed assessmentId, uint8 riskThreshold);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyDuringBusinessHours() {
        require(isBusinessHours(), "Not during business hours");
        _;
    }

    modifier onlyDuringAssessmentWindow() {
        require(isAssessmentWindowActive(), "Assessment window not active");
        _;
    }

    modifier onlyDuringEvaluationTime() {
        require(isEvaluationTimeActive(), "Not evaluation time");
        _;
    }

    constructor() {
        owner = msg.sender;
        currentAssessmentId = 1;
        lastAssessmentTime = block.timestamp;
    }

    // Check if current time is during business hours (9 AM - 5 PM UTC)
    function isBusinessHours() public view returns (bool) {
        uint256 currentHour = (block.timestamp / 3600) % 24;
        return currentHour >= BUSINESS_HOURS_START && currentHour < BUSINESS_HOURS_END;
    }

    // Check if assessment window is active (applications open)
    function isAssessmentWindowActive() public view returns (bool) {
        if (!assessments[currentAssessmentId].thresholdSet) return false;
        if (assessments[currentAssessmentId].assessmentCompleted) return false;
        return isBusinessHours();
    }

    // Check if evaluation time is active (after business hours)
    function isEvaluationTimeActive() public view returns (bool) {
        return !isBusinessHours() &&
               assessments[currentAssessmentId].thresholdSet &&
               !assessments[currentAssessmentId].assessmentCompleted;
    }

    // Start new risk assessment with encrypted threshold
    function startNewAssessment() external onlyOwner onlyDuringBusinessHours {
        require(!assessments[currentAssessmentId].thresholdSet ||
                assessments[currentAssessmentId].assessmentCompleted,
                "Assessment already active");

        // Generate encrypted risk threshold (0-100 scale)
        euint8 riskThreshold = FHE.randEuint8();

        Assessment storage newAssessment = assessments[currentAssessmentId];
        newAssessment.riskThreshold = riskThreshold;
        newAssessment.thresholdSet = true;
        newAssessment.assessmentCompleted = false;
        newAssessment.startTime = block.timestamp;
        newAssessment.applicants = new address[](0);

        // Grant contract access to the threshold
        FHE.allowThis(riskThreshold);

        emit AssessmentStarted(currentAssessmentId, block.timestamp);
    }

    // Submit confidential risk profile
    function submitRiskProfile(
        uint16 _creditScore,
        uint32 _income,
        uint8 _employmentYears,
        uint16 _debtRatio
    ) external onlyDuringAssessmentWindow {
        require(_creditScore <= 850, "Invalid credit score");
        require(_employmentYears <= 50, "Invalid employment years");
        require(_debtRatio <= 100, "Invalid debt ratio");
        require(!assessments[currentAssessmentId].profiles[msg.sender].hasSubmitted,
                "Profile already submitted");

        // Encrypt all sensitive financial data
        euint16 encryptedCreditScore = FHE.asEuint16(_creditScore);
        euint32 encryptedIncome = FHE.asEuint32(_income);
        euint8 encryptedEmploymentYears = FHE.asEuint8(_employmentYears);
        euint16 encryptedDebtRatio = FHE.asEuint16(_debtRatio);

        assessments[currentAssessmentId].profiles[msg.sender] = RiskProfile({
            encryptedCreditScore: encryptedCreditScore,
            encryptedIncome: encryptedIncome,
            encryptedEmploymentYears: encryptedEmploymentYears,
            encryptedDebtRatio: encryptedDebtRatio,
            hasSubmitted: true,
            timestamp: block.timestamp,
            applicant: msg.sender
        });

        assessments[currentAssessmentId].applicants.push(msg.sender);

        // Set ACL permissions
        FHE.allowThis(encryptedCreditScore);
        FHE.allowThis(encryptedIncome);
        FHE.allowThis(encryptedEmploymentYears);
        FHE.allowThis(encryptedDebtRatio);
        FHE.allow(encryptedCreditScore, msg.sender);
        FHE.allow(encryptedIncome, msg.sender);
        FHE.allow(encryptedEmploymentYears, msg.sender);
        FHE.allow(encryptedDebtRatio, msg.sender);

        emit ProfileSubmitted(msg.sender, currentAssessmentId);
    }

    // Process risk assessment (after business hours)
    function processRiskAssessment() external onlyDuringEvaluationTime {
        require(assessments[currentAssessmentId].thresholdSet, "No threshold set");
        require(!assessments[currentAssessmentId].assessmentCompleted, "Assessment already completed");

        Assessment storage assessment = assessments[currentAssessmentId];

        // Request decryption of risk threshold
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(assessment.riskThreshold);
        FHE.requestDecryption(cts, this.processAssessmentResult.selector);
    }

    // Decryption callback - Process assessment results
    function processAssessmentResult(
        uint256 requestId,
        uint8 riskThreshold,
        bytes memory signatures
    ) external {
        // Verify signatures
        bytes memory cleartexts = abi.encode(riskThreshold);
        FHE.checkSignatures(requestId, cleartexts, signatures);

        Assessment storage assessment = assessments[currentAssessmentId];
        assessment.finalRiskLevel = riskThreshold;
        assessment.endTime = block.timestamp;

        // Evaluate applicants based on decrypted threshold
        uint256 approvedCount = _evaluateApplicants(riskThreshold);

        assessment.assessmentCompleted = true;

        emit AssessmentCompleted(currentAssessmentId, approvedCount);
        emit RiskLevelRevealed(currentAssessmentId, riskThreshold);

        // Move to next assessment
        currentAssessmentId++;
    }

    // Private function to evaluate applicants
    function _evaluateApplicants(uint8 riskThreshold) private returns (uint256 approvedCount) {
        Assessment storage assessment = assessments[currentAssessmentId];
        uint256 approved = 0;

        // In a full implementation, this would use FHE operations
        // to compare encrypted profiles against encrypted threshold
        // For this example, we simulate the evaluation process
        for (uint i = 0; i < assessment.applicants.length; i++) {
            address applicant = assessment.applicants[i];

            // Simplified risk calculation based on threshold
            // In real implementation, this would be done using FHE operations
            bool isApproved = _calculateRiskScore(applicant, riskThreshold);

            if (isApproved) {
                assessment.approvedApplicants[applicant] = true;
                approved++;
            }
        }

        return approved;
    }

    // Simplified risk calculation (placeholder for FHE operations)
    function _calculateRiskScore(address applicant, uint8 threshold) private view returns (bool) {
        // This would normally involve complex FHE comparisons
        // For demonstration, we use a simple deterministic calculation
        uint256 addressHash = uint256(keccak256(abi.encodePacked(applicant, currentAssessmentId)));
        uint8 simulatedRisk = uint8(addressHash % 101); // 0-100 scale

        return simulatedRisk <= threshold;
    }

    // Get current assessment information
    function getCurrentAssessmentInfo() external view returns (
        uint32 assessmentId,
        bool thresholdSet,
        bool assessmentCompleted,
        uint256 startTime,
        uint256 applicantCount
    ) {
        Assessment storage currentAssessment = assessments[currentAssessmentId];
        return (
            currentAssessmentId,
            currentAssessment.thresholdSet,
            currentAssessment.assessmentCompleted,
            currentAssessment.startTime,
            currentAssessment.applicants.length
        );
    }

    // Check applicant's profile submission status
    function getApplicantStatus(address applicant) external view returns (
        bool hasSubmitted,
        uint256 timestamp,
        bool isApproved
    ) {
        Assessment storage assessment = assessments[currentAssessmentId];
        RiskProfile storage profile = assessment.profiles[applicant];
        return (
            profile.hasSubmitted,
            profile.timestamp,
            assessment.approvedApplicants[applicant]
        );
    }

    // Get current business hour status
    function getCurrentHour() external view returns (uint256) {
        return (block.timestamp / 3600) % 24;
    }

    // Get assessment history
    function getAssessmentHistory(uint32 assessmentId) external view returns (
        bool assessmentCompleted,
        uint8 finalRiskLevel,
        uint256 startTime,
        uint256 endTime,
        uint256 applicantCount
    ) {
        Assessment storage assessment = assessments[assessmentId];
        return (
            assessment.assessmentCompleted,
            assessment.finalRiskLevel,
            assessment.startTime,
            assessment.endTime,
            assessment.applicants.length
        );
    }

    // Emergency function to pause current assessment
    function pauseCurrentAssessment() external onlyOwner {
        assessments[currentAssessmentId].assessmentCompleted = true;
        assessments[currentAssessmentId].endTime = block.timestamp;
    }

    // Get applicant's approval status for completed assessments
    function checkApprovalStatus(uint32 assessmentId, address applicant) external view returns (bool) {
        require(assessments[assessmentId].assessmentCompleted, "Assessment not completed");
        return assessments[assessmentId].approvedApplicants[applicant];
    }
}