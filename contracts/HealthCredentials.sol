// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;  // Changed from >=0.8.0 <0.9.0

contract HealthCredentials {
    event CredentialSubmitted(address indexed patient, bytes32 credentialHash, uint256 timestamp);
    event CredentialValidated(address indexed patient, bool verified);

    struct Credential{
        bytes32 zkproofhash;
        bytes32 datahash;
        uint256 timestamp;
        bool verified;
        string dataSource;
    }
    mapping(address => Credential[]) public patientCredentials;
    mapping(address => bool) public authorizedVerifiers;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender], "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }

    function submitCredential(bytes32 zkproofhash, bytes32 datahash, string memory dataSource) external{
        Credential memory newCredential = Credential({
            zkproofhash: zkproofhash,
            datahash:datahash,
            timestamp: block.timestamp,
            verified: false,
            dataSource:dataSource
        });
        patientCredentials[msg.sender].push(newCredential);
        emit CredentialSubmitted(msg.sender, zkproofhash, block.timestamp);
    }
    function isCredentialRecent(address patient, uint256 index) external view returns(bool){
        // require it to be recent 
        require(patientCredentials[patient].length > index, "Invalid index");
        uint256 submissionTime = patientCredentials[patient][index].timestamp;
        return block.timestamp - submissionTime < 30 days;
        // TestFtsoV2Interface ftsoV2 = contractRegistry.getTestFtsoV2();
        // uint256 submissionTime = patientCredentials[patient][index].timestamp;
        // return ftsoV2.isRecent(submissionTime);
    }
    function getPatientCredentials(address patient) external view returns(Credential[] memory){
        return patientCredentials[patient];

    }
    function validateCredential(address patient, uint256 index, bool verified) external onlyVerifier{
        require(patientCredentials[patient].length>index,"Invalid index");
        patientCredentials[patient][index].verified = verified;
        emit CredentialValidated(patient, verified);
    }
    function addVerifier(address verifier) external onlyOwner{
        authorizedVerifiers[verifier] = true;
    }
    function removeVerifier(address verifier) external onlyOwner{
        authorizedVerifiers[verifier] = false;
    }
}