import { useState } from 'react'
import { ethers } from 'ethers'

const CONTRACT_ADDRESS = "0x631bc6903bF764C2f263F1a485aBf9197eD1e9B4";

// Expanded ABI to include issuance and authorization checks
const contractABI = [
  "function verifyCredential(bytes32 _credentialHash) external view returns (bool isValid, string memory institutionName, string memory country, string memory programName, uint256 issueDate)",
  "function issueCredential(bytes32 _credentialHash, string memory _studentIdHash, string memory _programName) external",
  "function accreditedIssuers(address) external view returns (string institutionName, string country, bool isAuthorized)"
];

function App() {
  const [activeTab, setActiveTab] = useState("verify"); // 'verify' or 'issue'
  
  // Verification State
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [result, setResult] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  // Issuer State
  const [walletAddress, setWalletAddress] = useState("");
  const [issuerData, setIssuerData] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState("");
  const [mintError, setMintError] = useState("");
  
  // Form State
  const [studentId, setStudentId] = useState("");
  const [programName, setProgramName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [fileName, setFileName] = useState("");

  // Cryptographic File Hashing (Browser-side)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    
    // Read file and generate SHA-256 hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    setFileHash(hashHex);
  };

  // MetaMask Connection & Authorization Check
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMintError("Please install MetaMask to use the Issuer Dashboard.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setWalletAddress(address);

      // Check if wallet is an authorized issuer on the contract
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      const issuerInfo = await contract.accreditedIssuers(address);
      
      if (issuerInfo.isAuthorized) {
        setIssuerData({ name: issuerInfo.institutionName, country: issuerInfo.country });
        setMintError("");
      } else {
        setIssuerData(null);
        setMintError("Access Denied: This wallet is not registered as an Accredited Institution.");
      }
    } catch (err) {
      console.error(err);
      setMintError("Failed to connect wallet.");
    }
  };

  // Minting Function
  const handleMint = async (e) => {
    e.preventDefault();
    if (!fileHash || !studentId || !programName) {
      setMintError("Please complete all fields and upload a document.");
      return;
    }

    setIsMinting(true);
    setMintError("");
    setMintSuccess("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Hash the student ID for privacy
      const studentIdHash = ethers.id(studentId);

      const tx = await contract.issueCredential(fileHash, studentIdHash, programName);
      await tx.wait(); // Wait for block confirmation

      setMintSuccess(`Success! Credential anchored to Sepolia block. TX: ${tx.hash}`);
      setFileHash("");
      setFileName("");
      setStudentId("");
      setProgramName("");
    } catch (err) {
      console.error(err);
      setMintError("Transaction failed. Ensure you have Sepolia ETH and have not minted this exact document before.");
    }
    setIsMinting(false);
  };

  // Verification Function
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!fileHash) {
      setVerifyError("Please upload a document to verify.");
      return;
    }

    setLoadingVerify(true);
    setVerifyError("");
    setResult(null);

    try {
      const provider = ethers.getDefaultProvider("sepolia");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const data = await contract.verifyCredential(fileHash);
      const date = new Date(Number(data[4]) * 1000).toLocaleDateString("en-US", {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      setResult({
        isValid: data[0],
        institution: data[1],
        country: data[2],
        program: data[3],
        date: date
      });
    } catch (err) {
      setVerifyError("Verification failed. The document has been altered or does not exist on the ledger.");
    }
    setLoadingVerify(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800 via-darkBg to-darkBg relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accentCyan/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accentPurple/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-accentCyan to-accentPurple">Trust</span> Africa
          </h1>
          <p className="text-gray-400 text-lg">Decentralized Academic Credential Infrastructure</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8 bg-black/40 p-1 rounded-2xl border border-white/10 w-fit mx-auto">
          <button 
            onClick={() => { setActiveTab("verify"); setFileHash(""); setFileName(""); setResult(null); }}
            className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${activeTab === "verify" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            Verify Credential
          </button>
          <button 
            onClick={() => { setActiveTab("issue"); setFileHash(""); setFileName(""); }}
            className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${activeTab === "issue" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            Institution Portal
          </button>
        </div>

        {/* VERIFIER DASHBOARD */}
        {activeTab === "verify" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
            <form onSubmit={handleVerify} className="flex flex-col gap-6">
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-accentCyan/50 transition-colors bg-black/20 relative">
                <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                <p className="text-gray-300 font-medium">{fileName ? fileName : "Drag & Drop Certificate Document Here"}</p>
                <p className="text-gray-500 text-sm mt-2">Document is hashed locally. No files are uploaded.</p>
              </div>
              
              <button type="submit" disabled={loadingVerify} className="w-full bg-gradient-to-r from-accentCyan to-accentPurple text-white font-semibold rounded-xl px-5 py-4 shadow-lg shadow-accentCyan/20 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
                {loadingVerify ? "Verifying..." : "Verify Authenticity"}
              </button>
            </form>

            {verifyError && <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-center">{verifyError}</div>}
            
            {result && (
              <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-gray-200">On-Chain Record</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.isValid ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border`}>
                    {result.isValid ? '✓ VALID' : '⚠ INVALID'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Institution</p><p className="text-white">{result.institution}</p></div>
                  <div><p className="text-gray-500">Country</p><p className="text-white">{result.country}</p></div>
                  <div><p className="text-gray-500">Program</p><p className="text-white">{result.program}</p></div>
                  <div><p className="text-gray-500">Issued</p><p className="text-white">{result.date}</p></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ISSUER DASHBOARD */}
        {activeTab === "issue" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
            {!walletAddress ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-6">Connect your authorized institutional wallet to mint credentials.</p>
                <button onClick={connectWallet} className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl hover:bg-white/20 transition-all">Connect MetaMask</button>
              </div>
            ) : issuerData ? (
              <form onSubmit={handleMint} className="flex flex-col gap-5">
                <div className="bg-accentCyan/10 border border-accentCyan/30 rounded-xl p-4 mb-2 flex justify-between items-center">
                  <div>
                    <p className="text-accentCyan text-sm font-bold">Authorized Issuer Active</p>
                    <p className="text-white text-lg">{issuerData.name} ({issuerData.country})</p>
                  </div>
                  <div className="h-3 w-3 bg-accentCyan rounded-full animate-pulse"></div>
                </div>

                <input type="text" placeholder="Student ID Number" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-accentPurple/50 outline-none" required />
                <input type="text" placeholder="Academic Program (e.g., BSc Software Engineering)" value={programName} onChange={(e) => setProgramName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-accentPurple/50 outline-none" required />
                
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-accentPurple/50 transition-colors bg-black/20 relative">
                  <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                  <p className="text-gray-300 font-medium">{fileName ? fileName : "Upload Certificate to Generate Hash"}</p>
                </div>

                <button type="submit" disabled={isMinting} className="w-full bg-gradient-to-r from-accentPurple to-accentCyan text-white font-semibold rounded-xl px-5 py-4 shadow-lg shadow-accentPurple/20 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
                  {isMinting ? "Minting to Blockchain..." : "Mint Digital Credential"}
                </button>
              </form>
            ) : null}

            {mintError && <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-center">{mintError}</div>}
            {mintSuccess && <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-center text-sm break-words">{mintSuccess}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
