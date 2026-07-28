const hre = require("hardhat");

async function main() {
  // REPLACE WITH YOUR NEWLY DEPLOYED CONTRACT ADDRESS
  const contractAddress = "YOUR_NEW_CONTRACT_ADDRESS";
  
  // The wallet address you want to REVOKE
  const issuerAddress = "THE_WALLET_ADDRESS_TO_REVOKE"; 

  console.log(`Attaching to EduTrust contract at ${contractAddress}...`);
  const EduTrust = await hre.ethers.getContractFactory("EduTrust");
  const eduTrust = EduTrust.attach(contractAddress);

  console.log(`Revoking authorization for ${issuerAddress}...`);

  const tx = await eduTrust.revokeIssuer(issuerAddress);
  console.log(`Transaction submitted! Waiting for block confirmation...`);
  console.log(`Tx Hash: ${tx.hash}`);
  
  await tx.wait();
  console.log(`✅ Success! ${issuerAddress} can no longer mint credentials.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
