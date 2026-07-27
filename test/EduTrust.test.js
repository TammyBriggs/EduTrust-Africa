const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EduTrust Africa Smart Contract", function () {
  let EduTrust;
  let eduTrust;
  let admin, aluIssuer, unilagIssuer, employerVerifier, student;

  // Mock data for our cross-border scenario
  const aluName = "African Leadership University";
  const aluCountry = "Rwanda";
  
  const unilagName = "University of Lagos";
  const unilagCountry = "Nigeria";

  const credentialHash = ethers.id("MOCK_OFF_CHAIN_DOCUMENT_HASH_001");
  const studentIdHash = ethers.id("STUDENT_ID_98765");
  const programName = "BSc Software Engineering";

  beforeEach(async function () {
    // Retrieve testing accounts
    [admin, aluIssuer, unilagIssuer, employerVerifier, student] = await ethers.getSigners();

    // Deploy the contract
    EduTrust = await ethers.getContractFactory("EduTrust");
    eduTrust = await EduTrust.deploy();
  });

  describe("Deployment & Administration", function () {
    it("Should set the right admin", async function () {
      expect(await eduTrust.admin()).to.equal(admin.address);
    });

    it("Should allow the admin to authorize an issuer", async function () {
      await expect(eduTrust.authorizeIssuer(aluIssuer.address, aluName, aluCountry))
        .to.emit(eduTrust, "IssuerAuthorized")
        .withArgs(aluIssuer.address, aluName, aluCountry);

      const issuerData = await eduTrust.accreditedIssuers(aluIssuer.address);
      expect(issuerData.isAuthorized).to.be.true;
      expect(issuerData.institutionName).to.equal(aluName);
    });

    it("Should revert if a non-admin tries to authorize an issuer", async function () {
      await expect(
        eduTrust.connect(aluIssuer).authorizeIssuer(unilagIssuer.address, unilagName, unilagCountry)
      ).to.be.revertedWith("EduTrust: Only admin can perform this action");
    });
  });

  describe("Credential Issuance & Verification", function () {
    beforeEach(async function () {
      // Authorize an issuer before running these tests
      await eduTrust.authorizeIssuer(aluIssuer.address, aluName, aluCountry);
    });

    it("Should allow an authorized issuer to mint a credential", async function () {
      await expect(
        eduTrust.connect(aluIssuer).issueCredential(credentialHash, studentIdHash, programName)
      ).to.emit(eduTrust, "CredentialIssued")
       .withArgs(credentialHash, aluIssuer.address);

      // Verify the credential data via a public call
      const verifiedData = await eduTrust.verifyCredential(credentialHash);
      expect(verifiedData.isValid).to.be.true;
      expect(verifiedData.institutionName).to.equal(aluName);
      expect(verifiedData.country).to.equal(aluCountry);
      expect(verifiedData.programName).to.equal(programName);
    });

    it("Should revert if an unauthorized wallet tries to issue a credential", async function () {
      await expect(
        eduTrust.connect(employerVerifier).issueCredential(credentialHash, studentIdHash, programName)
      ).to.be.revertedWith("EduTrust: Caller is not an authorized issuer");
    });

    it("Should revert if trying to verify a non-existent credential", async function () {
      const fakeHash = ethers.id("FAKE_HASH");
      await expect(eduTrust.verifyCredential(fakeHash)).to.be.revertedWith("EduTrust: Credential not found");
    });
  });

  describe("Credential Revocation", function () {
    beforeEach(async function () {
      await eduTrust.authorizeIssuer(unilagIssuer.address, unilagName, unilagCountry);
      await eduTrust.connect(unilagIssuer).issueCredential(credentialHash, studentIdHash, programName);
    });

    it("Should allow the original issuer to revoke a credential", async function () {
      await expect(eduTrust.connect(unilagIssuer).revokeCredential(credentialHash))
        .to.emit(eduTrust, "CredentialRevoked")
        .withArgs(credentialHash, unilagIssuer.address);

      const verifiedData = await eduTrust.verifyCredential(credentialHash);
      expect(verifiedData.isValid).to.be.false;
    });

    it("Should prevent a different issuer from revoking the credential", async function () {
      await eduTrust.authorizeIssuer(aluIssuer.address, aluName, aluCountry);

      await expect(
        eduTrust.connect(aluIssuer).revokeCredential(credentialHash)
      ).to.be.revertedWith("EduTrust: Only the original issuer can revoke");
    });
  });
});
