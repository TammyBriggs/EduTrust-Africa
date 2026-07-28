// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title EduTrust Africa Credential Verifier
 * @dev A smart contract for issuing, verifying, and revoking cross-border academic credentials.
 */
contract EduTrust {
    address public admin;

    struct Issuer {
        string institutionName;
        string country; // e.g., "Nigeria", "Rwanda"
        bool isAuthorized;
    }

    struct Credential {
        bytes32 credentialHash; // The off-chain document hash
        address issuerAddress;
        string studentIdHash;   // Privacy-preserving identifier
        string programName;
        uint256 issueDate;
        bool isValid;
        bool exists;
    }

    // Mappings
    mapping(address => Issuer) public accreditedIssuers;
    mapping(bytes32 => Credential) public credentials;

    // Events
    event IssuerAuthorized(address indexed issuerAddress, string institutionName, string country);
    event IssuerRevoked(address indexed issuerAddress);
    event CredentialIssued(bytes32 indexed credentialHash, address indexed issuerAddress);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuerAddress);
    event IssuerAccessRevoked(address indexed issuerAddress);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "EduTrust: Only admin can perform this action");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(accreditedIssuers[msg.sender].isAuthorized, "EduTrust: Caller is not an authorized issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Authorizes a new university or institution to issue credentials.
     */
    function authorizeIssuer(address _issuer, string memory _name, string memory _country) external onlyAdmin {
        accreditedIssuers[_issuer] = Issuer({
            institutionName: _name,
            country: _country,
            isAuthorized: true
        });
        emit IssuerAuthorized(_issuer, _name, _country);
    }

    /**
     * @dev Issues a new academic credential.
     */
    function issueCredential(
        bytes32 _credentialHash, 
        string memory _studentIdHash, 
        string memory _programName
    ) external onlyAuthorizedIssuer {
        require(!credentials[_credentialHash].exists, "EduTrust: Credential already exists");

        credentials[_credentialHash] = Credential({
            credentialHash: _credentialHash,
            issuerAddress: msg.sender,
            studentIdHash: _studentIdHash,
            programName: _programName,
            issueDate: block.timestamp,
            isValid: true,
            exists: true
        });

        emit CredentialIssued(_credentialHash, msg.sender);
    }

    /**
     * @dev Revokes a previously issued credential (e.g., in case of academic misconduct).
     */
    function revokeCredential(bytes32 _credentialHash) external onlyAuthorizedIssuer {
        require(credentials[_credentialHash].exists, "EduTrust: Credential does not exist");
        require(credentials[_credentialHash].issuerAddress == msg.sender, "EduTrust: Only the original issuer can revoke");
        require(credentials[_credentialHash].isValid, "EduTrust: Credential is already revoked");

        credentials[_credentialHash].isValid = false;
        emit CredentialRevoked(_credentialHash, msg.sender);
    }

    /**
     * @dev Revokes an institution's ability to issue new credentials.
     */
    function revokeIssuer(address _issuer) external onlyAdmin {
        require(accreditedIssuers[_issuer].isAuthorized, "EduTrust: Issuer is not currently authorized");
        accreditedIssuers[_issuer].isAuthorized = false;
        emit IssuerAccessRevoked(_issuer);
    }

    /**
     * @dev Verifies a credential's authenticity and status.
     * Anyone (employers, other universities) can call this function for free.
     */
    function verifyCredential(bytes32 _credentialHash) 
        external 
        view 
        returns (
            bool isValid, 
            string memory institutionName, 
            string memory country, 
            string memory programName, 
            uint256 issueDate
        ) 
    {
        Credential memory cred = credentials[_credentialHash];
        require(cred.exists, "EduTrust: Credential not found");

        Issuer memory issuer = accreditedIssuers[cred.issuerAddress];

        return (
            cred.isValid,
            issuer.institutionName,
            issuer.country,
            cred.programName,
            cred.issueDate
        );
    }
}
