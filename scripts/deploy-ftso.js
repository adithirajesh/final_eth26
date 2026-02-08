const hre = require("hardhat");

async function main() {
  console.log("Deploying FtsoV2Consumer to Flare Coston2...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "C2FLR");
  
  if (balance === 0n) {
    console.log("No testnet tokens! Get some from: https://faucet.flare.network/coston2");
    return;
  }
  
  const FtsoV2Consumer = await hre.ethers.getContractFactory("FtsoV2Consumer");
  const contract = await FtsoV2Consumer.deploy();
  
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  
  console.log("Deployed to:", address);
  console.log("View:", "https://coston2-explorer.flare.network/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
