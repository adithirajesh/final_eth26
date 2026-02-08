const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x020475e2E2F86680C62bE017529A7Bc66Ac2C23a";
  
  console.log("🔍 Testing deployed FtsoV2Consumer...\n");
  
  const FtsoV2Consumer = await hre.ethers.getContractFactory("FtsoV2Consumer");
  const contract = FtsoV2Consumer.attach(CONTRACT_ADDRESS);
  
  // Test 1: Get FLR/USD price
  console.log("📊 Getting FLR/USD price...");
  const [price, decimals, timestamp] = await contract.getFlrUsdPrice();
  console.log("Price:", price.toString());
  console.log("Decimals:", decimals.toString());
  console.log("Actual Price:", Number(price) / Math.pow(10, Math.abs(Number(decimals))));
  console.log("Timestamp:", new Date(Number(timestamp) * 1000).toLocaleString());
  
  // Test 2: Get multiple feed values
  console.log("\n💹 Getting FLR/USD, BTC/USD, ETH/USD prices...");
  const [values, decs, ts] = await contract.getFtsoV2CurrentFeedValues();
  
  console.log("\nFLR/USD:", Number(values[0]) / Math.pow(10, Math.abs(Number(decs[0]))));
  console.log("BTC/USD:", Number(values[1]) / Math.pow(10, Math.abs(Number(decs[1]))));
  console.log("ETH/USD:", Number(values[2]) / Math.pow(10, Math.abs(Number(decs[2]))));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
