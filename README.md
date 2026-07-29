# EduTrust-Africa 🎓🌍

Decentralized Cross-Border Academic Credential Verification Infrastructure.

## 📖 Project Overview
EduTrust-Africa is a decentralized Web3 application (dApp) designed to eliminate academic credential fraud and streamline cross-border verification across the African continent (e.g., between Nigeria and Rwanda). By anchoring cryptographic hashes of academic certificates to the Ethereum blockchain, the system allows universities to securely issue and revoke credentials, while empowering employers to instantly verify authenticity without relying on centralized, slow institutional databases.

### How the Frontend Connects to the Smart Contract
The frontend is a single-page React application that utilizes `ethers.js` to bridge the user interface with the deployed Solidity smart contract on the Sepolia Testnet. 
*   **Read-Only Operations (Verification):** When a user verifies a credential, the frontend uses an `ethers.getDefaultProvider("sepolia")` connection. This allows anyone to verify a document for free, without needing a MetaMask wallet installed. It also queries blockchain event logs (`queryFilter`) to fetch the exact Etherscan Transaction Hash for maximum transparency.
*   **Write Operations (Minting/Revoking):** For state-changing transactions, the frontend uses `ethers.BrowserProvider(window.ethereum)` to request the user's MetaMask wallet connection. It checks the connected address against the smart contract's `accreditedIssuers` mapping to ensure strict access control before allowing the wallet to sign and pay gas for a transaction.

---

## 🛠️ Tech Stack & Versions

*   **Smart Contract Framework:** Hardhat (v2.29.0)
*   **Network:** Ethereum Sepolia Testnet
*   **Frontend Library:** React (via Vite)
*   **Web3 Library:** Ethers.js (v6)
*   **Styling:** Tailwind CSS (v3)
*   **Environment:** Node.js (v18.0.0 or higher recommended)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd EduTrust-Africa
```

### 2. Smart Contract Setup
Install Hardhat and backend dependencies:

```bash
npm install
```

Create a `.env` file in the root directory and add your credentials:

```
SEPOLIA_RPC_URL="your_alchemy_or_infura_url"
PRIVATE_KEY="your_metamask_private_key"
ETHERSCAN_API_KEY="your_etherscan_api_key"
```

### 3. Frontend Setup
Navigate to the frontend directory and install the React dependencies:

```bash
cd frontend
npm install
```

### 4. Run the Development Server
Start the local Vite server to view the UI:

```bash
npm run dev
```

Navigate to http://localhost:5173 in your browser.

## 🚀 User Guide: Features & Instructions

### 1. Verifying a Credential (Employers/Admissions)
Wallet connection is NOT required for this feature.

1. Navigate to the Verify Credential tab.
2. Either Drag & Drop the student's digital certificate (PDF/Image) into the upload zone, OR manually paste the raw SHA-256 hash if provided by the student.
3. The browser will locally hash the file (preserving privacy; the file is never uploaded) and query the Sepolia testnet.
4. View the On-Chain Record, verification status (Valid/Revoked), and click the Etherscan link to view the cryptographic proof.

### 2. Minting a Credential (Authorized Institutions)
1. Navigate to the Institution Portal tab.
2. Click Connect MetaMask (Your wallet must be pre-authorized as an Accredited Issuer by the network Admin).
3. Fill in the Student ID and Academic Program fields.
4. Upload the official certificate document. The app will generate a secure SHA-256 hash.
5. Click Mint Digital Credential. Confirm the transaction in MetaMask and wait for block confirmation.

### 3. Revoking a Credential
1. Inside the Institution Portal, scroll to the Revoke a Credential section.
2. Paste the exact Credential Hash (SHA-256) of the document you wish to invalidate.
3. Click Revoke and confirm the transaction in MetaMask.

**Note:** Only the specific institutional wallet that originally minted the credential can revoke it.

## ⚠️ Known Issues & Limitations

*   **The Oracle Problem:** While the blockchain guarantees the document hash hasn't been tampered with, it relies on the real-world institution to upload accurate data initially. The system currently requires manual onboarding of universities by the central Admin.
*   **Centralized Admin MVP:** In this MVP phase, institutional authorization is controlled by a single Admin wallet. A production deployment would require a Multi-Signature (Multi-sig) wallet or a DAO governed by regional educational authorities (e.g., Ministries of Education) to decentralize the onboarding process.
*   **Testnet Dependency:** The dApp is currently deployed on the Sepolia testnet. Transaction speeds and availability are subject to the testnet's network conditions.
