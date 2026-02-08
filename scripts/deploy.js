const hre = require("hardhat");

async function main() {
  console.log("Deploying HealthCredentials contract...");

  // Get the contract factory
  const HealthCredentials = await hre.ethers.getContractFactory("HealthCredentials");
  
  // Deploy the contract
  const healthCredentials = await HealthCredentials.deploy();
  await healthCredentials.waitForDeployment();

  const address = await healthCredentials.getAddress();
  console.log("HealthCredentials deployed to:", address);
  
  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployed by:", deployer.address);
  console.log("Deployer is owner and authorized verifier");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });