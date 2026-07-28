const hre = require("hardhat");

async function main() {
  // Your deployed Sepolia contract address
  const contractAddress = "0x4C117612Fa38CD8E2B20072D7D233aB54e1f9868";
  
  // The wallet address you want to authorize as an issuer
  const issuerAddress = "0xf0C0A1310e1b214Bee95E2715B13f6330AE4E89D"; 
  
  const institutionName = "African Leadership University";
  const country = "Rwanda";

  console.log(`Attaching to EduTrust contract at ${contractAddress}...`);
  
  // Get the contract instance connected to your admin wallet (from .env)
  const EduTrust = await hre.ethers.getContractFactory("EduTrust");
  const eduTrust = EduTrust.attach(contractAddress);

  console.log(`Authorizing ${institutionName} (${issuerAddress})...`);

  // Execute the authorize function
  const tx = await eduTrust.authorizeIssuer(issuerAddress, institutionName, country);
  
  console.log(`Transaction submitted! Waiting for block confirmation...`);
  console.log(`Tx Hash: ${tx.hash}`);
  
  await tx.wait();

  console.log(`✅ Success! ${issuerAddress} is now an authorized issuer on the EduTrust network.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
