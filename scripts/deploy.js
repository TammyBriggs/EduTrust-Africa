const hre = require("hardhat");

async function main() {
  console.log("----------------------------------------------------");
  console.log("Deploying EduTrust Africa Smart Contract...");
  console.log("----------------------------------------------------");

  // Get the ContractFactory
  const EduTrust = await hre.ethers.getContractFactory("EduTrust");

  // Deploy the contract
  const eduTrust = await EduTrust.deploy();

  // Wait for the deployment transaction to be mined
  await eduTrust.waitForDeployment();

  const contractAddress = await eduTrust.getAddress();

  console.log(`✅ EduTrust deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log("----------------------------------------------------");
  console.log("Next steps:");
  console.log(`1. Verify contract on Etherscan:`);
  console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
