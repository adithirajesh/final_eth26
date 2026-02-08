const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthCredentials", function () {
  let healthCredentials;
  let owner, patient, verifier, unauthorized;

  beforeEach(async function () {
    [owner, patient, verifier, unauthorized] = await ethers.getSigners();
    const HealthCredentials = await ethers.getContractFactory("HealthCredentials");
    healthCredentials = await HealthCredentials.deploy();
    await healthCredentials.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await healthCredentials.owner()).to.equal(owner.address);
    });

    it("Should authorize owner as verifier", async function () {
      expect(await healthCredentials.authorizedVerifiers(owner.address)).to.be.true;
    });
  });

  describe("Submit Credentials", function () {
    it("Should allow patients to submit credentials", async function () {
      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      const dataSource = "Hospital A";

      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, dataSource);
      
      const credentials = await healthCredentials.getPatientCredentials(patient.address);
      expect(credentials.length).to.equal(1);
    });

    it("Should store credential with correct data", async function () {
      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      const dataSource = "Hospital A";

      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, dataSource);

      const credentials = await healthCredentials.getPatientCredentials(patient.address);
      expect(credentials[0].zkproofhash).to.equal(zkProofHash);
      expect(credentials[0].datahash).to.equal(dataHash);
      expect(credentials[0].dataSource).to.equal(dataSource);
      expect(credentials[0].verified).to.be.false;
    });

    it("Should allow multiple credentials per patient", async function () {
      const zkProofHash1 = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      const zkProofHash2 = ethers.keccak256(ethers.toUtf8Bytes("zkproof2"));
      const dataHash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));

      await healthCredentials.connect(patient).submitCredential(zkProofHash1, dataHash1, "Hospital A");
      await healthCredentials.connect(patient).submitCredential(zkProofHash2, dataHash2, "Lab B");

      const credentials = await healthCredentials.getPatientCredentials(patient.address);
      expect(credentials.length).to.equal(2);
    });
  });

  describe("Credential Validation", function () {
    beforeEach(async function () {
      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, "Hospital A");
    });

    it("Should allow authorized verifier to validate credential", async function () {
      await healthCredentials.connect(owner).validateCredential(patient.address, 0, true);

      const credentials = await healthCredentials.getPatientCredentials(patient.address);
      expect(credentials[0].verified).to.be.true;
    });

    it("Should reject validation from unauthorized address", async function () {
      await expect(
        healthCredentials.connect(unauthorized).validateCredential(patient.address, 0, true)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should reject validation of invalid index", async function () {
      await expect(
        healthCredentials.connect(owner).validateCredential(patient.address, 999, true)
      ).to.be.revertedWith("Invalid index");
    });
  });

  describe("Verifier Management", function () {
    it("Should allow owner to add verifier", async function () {
      await healthCredentials.connect(owner).addVerifier(verifier.address);
      expect(await healthCredentials.authorizedVerifiers(verifier.address)).to.be.true;
    });

    it("Should allow new verifier to validate credentials", async function () {
      await healthCredentials.connect(owner).addVerifier(verifier.address);

      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, "Hospital A");

      await expect(
        healthCredentials.connect(verifier).validateCredential(patient.address, 0, true)
      ).to.not.be.reverted;
    });

    it("Should allow owner to remove verifier", async function () {
      await healthCredentials.connect(owner).addVerifier(verifier.address);
      await healthCredentials.connect(owner).removeVerifier(verifier.address);
      expect(await healthCredentials.authorizedVerifiers(verifier.address)).to.be.false;
    });

    it("Should reject verifier operations from non-owner", async function () {
      await expect(
        healthCredentials.connect(unauthorized).addVerifier(verifier.address)
      ).to.be.revertedWith("Only owner");
    });
  });

  describe("Credential Recency Check", function () {
    it("Should return true for recent credentials", async function () {
      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, "Hospital A");

      const isRecent = await healthCredentials.isCredentialRecent(patient.address, 0);
      expect(isRecent).to.be.true;
    });

    it("Should return false for old credentials", async function () {
      const zkProofHash = ethers.keccak256(ethers.toUtf8Bytes("zkproof1"));
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      await healthCredentials.connect(patient).submitCredential(zkProofHash, dataHash, "Hospital A");

      // Fast forward time by 31 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const isRecent = await healthCredentials.isCredentialRecent(patient.address, 0);
      expect(isRecent).to.be.false;
    });

    it("Should revert for invalid index", async function () {
      await expect(
        healthCredentials.isCredentialRecent(patient.address, 0)
      ).to.be.revertedWith("Invalid index");
    });
  });
});