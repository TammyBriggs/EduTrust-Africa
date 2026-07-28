import { useState } from 'react'
import { ethers } from 'ethers'

const CONTRACT_ADDRESS = "0x631bc6903bF764C2f263F1a485aBf9197eD1e9B4";

const contractABI = [
  "function verifyCredential(bytes32 _credentialHash) external view returns (bool isValid, string memory institutionName, string memory country, string memory programName, uint256 issueDate)",
  "function issueCredential(bytes32 _credentialHash, string memory _studentIdHash, string memory _programName) external",
  "function accreditedIssuers(address) external view returns (string institutionName, string country, bool isAuthorized)"
];

function App() {
  const [activeTab, setActiveTab] = useState("verify");
  
  // Verification State
  const [verifyHash, setVerifyHash] = useState("");
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
  const [mintFileHash, setMintFileHash] = useState("");
  const [fileName, setFileName] = useState("");

  // Cryptographic File Hashing (Browser-side)
  const handleFileUpload = async (e, isVerify = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (isVerify) {
      setVerifyHash(hashHex);
    } else {
      setMintFileHash(hashHex);
    }
  };

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

  const handleMint = async (e) => {
    e.preventDefault();
    if (!mintFileHash || !studentId || !programName) {
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

      const studentIdHash = ethers.id(studentId);

      const tx = await contract.issueCredential(mintFileHash, studentIdHash, programName);
      await tx.wait(); 

      setMintSuccess(`Success! Credential anchored to Sepolia block. TX: ${tx.hash}`);
      setMintFileHash("");
      setFileName("");
      setStudentId("");
      setProgramName("");
    } catch (err) {
      console.error(err);
      setMintError("Transaction failed. Ensure you have Sepolia ETH and have not minted this exact document before.");
    }
    setIsMinting(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyHash) {
      setVerifyError("Please upload a document or enter a hash to verify.");
      return;
    }

    setLoadingVerify(true);
    setVerifyError("");
    setResult(null);

    try {
      const provider = ethers.getDefaultProvider("sepolia");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const data = await contract.verifyCredential(verifyHash);
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
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accentCyan/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accentPurple/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 tracking-tight">
            Edu<span className="text-transparent bg-clip-text bg-gradient-to-r from-accentCyan to-accentPurple">Trust</span> Africa
          </h1>
          <p className="text-gray-400 text-lg">Decentralized Academic Credential Infrastructure</p>
        </div>

        {/* Tab Navigation - Fixed Spacing */}
        <div className="flex justify-center gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/10 w-fit mx-auto">
          <button 
            onClick={() => { setActiveTab("verify"); setVerifyHash(""); setFileName(""); setResult(null); }}
            className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${activeTab === "verify" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            Verify Credential |
          </button>
          <button 
            onClick={() => { setActiveTab("issue"); setMintFileHash(""); setFileName(""); }}
            className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${activeTab === "issue" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            | Institution Portal
          </button>
        </div>

        {/* VERIFIER DASHBOARD */}
        {activeTab === "verify" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              
              {/* File Upload - Fixed Overlap */}
              <label className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-accentCyan/50 transition-colors bg-black/20 block cursor-pointer group">
                <input type="file" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                <p className="text-gray-300 font-medium group-hover:text-accentCyan transition-colors">
                  {fileName ? fileName : "Drag & Drop Certificate Document Here"}
                </p>
                <p className="text-gray-500 text-sm mt-2">Document is hashed locally. No files are uploaded.</p>
              </label>

              {/* Divider */}
              <div className="flex items-center gap-4 my-1">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-gray-500 text-sm font-medium">OR</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              {/* Manual Hash Input */}
              <input 
                type="text" 
                placeholder="Paste raw SHA-256 hash (0x...)" 
                value={verifyHash} 
                onChange={(e) => setVerifyHash(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accentCyan/50 transition-all duration-300"
              />
              
              <button type="submit" disabled={loadingVerify} className="w-full bg-gradient-to-r from-accentCyan to-accentPurple text-white font-semibold rounded-xl px-5 py-4 mt-8 shadow-lg shadow-accentCyan/20 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
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
                
                <label className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-accentPurple/50 transition-colors bg-black/20 block cursor-pointer group">
                  <input type="file" onChange={(e) => handleFileUpload(e, false)} className="hidden" required />
                  <p className="text-gray-300 font-medium group-hover:text-accentPurple transition-colors">
                    {fileName ? fileName : "Upload Certificate to Generate Hash"}
                  </p>
                </label>

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
