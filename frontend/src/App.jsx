import { useState } from 'react'
import { ethers } from 'ethers'

// REPLACE WITH YOUR NEW CONTRACT ADDRESS
const CONTRACT_ADDRESS = "0x4C117612Fa38CD8E2B20072D7D233aB54e1f9868";

// Expanded ABI including Revoke functions and the Event log for Tx Hash lookup
const contractABI = [
  "function verifyCredential(bytes32 _credentialHash) external view returns (bool isValid, string memory institutionName, string memory country, string memory programName, uint256 issueDate)",
  "function issueCredential(bytes32 _credentialHash, string memory _studentIdHash, string memory _programName) external",
  "function revokeCredential(bytes32 _credentialHash) external",
  "function accreditedIssuers(address) external view returns (string institutionName, string country, bool isAuthorized)",
  "event CredentialIssued(bytes32 indexed credentialHash, address indexed issuerAddress)"
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
  
  // Revocation State
  const [revokeHash, setRevokeHash] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState("");
  
  // Form State
  const [studentId, setStudentId] = useState("");
  const [programName, setProgramName] = useState("");
  const [mintFileHash, setMintFileHash] = useState("");
  const [fileName, setFileName] = useState("");

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
      setMintError("Please install MetaMask.");
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
        setMintError("Access Denied: Wallet not registered as an Accredited Institution.");
      }
    } catch (err) {
      setMintError("Failed to connect wallet.");
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    if (!mintFileHash || !studentId || !programName) return setMintError("Complete all fields.");

    setIsMinting(true);
    setMintError("");
    setMintSuccess("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.issueCredential(mintFileHash, ethers.id(studentId), programName);
      await tx.wait(); 

      setMintSuccess(`Success! Anchored to block. TX: ${tx.hash}`);
      setMintFileHash(""); setFileName(""); setStudentId(""); setProgramName("");
    } catch (err) {
      setMintError("Transaction failed.");
    }
    setIsMinting(false);
  };

  // NEW: Revoke Credential Function
  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeHash) return;

    setIsRevoking(true);
    setRevokeMessage("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      const tx = await contract.revokeCredential(revokeHash);
      await tx.wait();

      setRevokeMessage(`Credential successfully revoked. TX: ${tx.hash}`);
      setRevokeHash("");
    } catch (err) {
      console.error(err);
      setRevokeMessage("Revocation failed. Ensure you are the original issuer of this credential.");
    }
    setIsRevoking(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyHash) return setVerifyError("Please enter a hash.");

    setLoadingVerify(true);
    setVerifyError("");
    setResult(null);

    try {
      const provider = ethers.getDefaultProvider("sepolia");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const data = await contract.verifyCredential(verifyHash);
      
      // NEW: Query blockchain event logs to find the transaction hash
      let txHash = null;
      try {
        const filter = contract.filters.CredentialIssued(verifyHash);
        const events = await contract.queryFilter(filter, -10000); // Check recent blocks
        if (events.length > 0) {
          txHash = events[0].transactionHash;
        }
      } catch (logErr) {
        console.log("Could not fetch event logs for Tx Hash.");
      }

      setResult({
        isValid: data[0],
        institution: data[1],
        country: data[2],
        program: data[3],
        date: new Date(Number(data[4]) * 1000).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
        txHash: txHash
      });
    } catch (err) {
      setVerifyError("Verification failed. The document has been altered or does not exist.");
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
            Verify Credential
          </button>
          <button 
            onClick={() => { setActiveTab("issue"); setMintFileHash(""); setFileName(""); }}
            className={`px-6 py-2 rounded-xl transition-all duration-300 font-medium ${activeTab === "issue" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
          >
            Institution Portal
          </button>
        </div>

        {activeTab === "verify" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <label className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-accentCyan/50 transition-colors bg-black/20 block cursor-pointer group">
                <input type="file" onChange={(e) => handleFileUpload(e, true)} style={{ display: 'none' }} />
                <p className="text-gray-300 font-medium group-hover:text-accentCyan transition-colors">
                  {fileName ? fileName : "Drag & Drop Certificate Document Here"}
                </p>
                <p className="text-gray-500 text-sm mt-2">Document is hashed locally. No files are uploaded.</p>
              </label>

              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-gray-500 text-sm font-medium">OR</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <input type="text" placeholder="Paste raw SHA-256 hash (0x...)" value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accentCyan/50 transition-all duration-300" />
              
              <button type="submit" disabled={loadingVerify} className="w-full bg-gradient-to-r from-accentCyan to-accentPurple text-white font-semibold rounded-xl px-5 py-4 mt-6 shadow-lg shadow-accentCyan/20 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
                {loadingVerify ? "Verifying..." : "Verify Authenticity"}
              </button>
            </form>

            {verifyError && <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-center">{verifyError}</div>}
            
            {result && (
              <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-gray-200">On-Chain Record</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.isValid ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border`}>
                    {result.isValid ? '✓ VALID' : '⚠ INVALID (REVOKED)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><p className="text-gray-500">Institution</p><p className="text-white">{result.institution}</p></div>
                  <div><p className="text-gray-500">Country</p><p className="text-white">{result.country}</p></div>
                  <div><p className="text-gray-500">Program</p><p className="text-white">{result.program}</p></div>
                  <div><p className="text-gray-500">Issued</p><p className="text-white">{result.date}</p></div>
                </div>
                {/* NEW: Etherscan Transaction Hash Link */}
                {result.txHash && (
                   <div className="pt-4 border-t border-white/10 text-center">
                     <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-accentCyan hover:text-accentPurple transition-colors text-sm font-medium flex items-center justify-center gap-2">
                       View Cryptographic Proof on Etherscan ↗
                     </a>
                   </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "issue" && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500">
            {!walletAddress ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-6">Connect your authorized institutional wallet to mint credentials.</p>
                <button onClick={connectWallet} className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-xl hover:bg-white/20 transition-all">Connect MetaMask</button>
              </div>
            ) : (
              <>
                {/* Minting Section */}
                {issuerData && (
                  <form onSubmit={handleMint} className="flex flex-col gap-5 pb-8 border-b border-white/10">
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
                      <input type="file" onChange={(e) => handleFileUpload(e, false)} style={{ display: 'none' }} required />
                      <p className="text-gray-300 font-medium group-hover:text-accentPurple transition-colors">
                        {fileName ? fileName : "Upload Certificate to Generate Hash"}
                      </p>
                    </label>

                    <button type="submit" disabled={isMinting} className="w-full bg-gradient-to-r from-accentPurple to-accentCyan text-white font-semibold rounded-xl px-5 py-4 mt-4 shadow-lg shadow-accentPurple/20 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
                      {isMinting ? "Minting to Blockchain..." : "Mint Digital Credential"}
                    </button>
                    {mintError && <div className="mt-2 text-red-400 text-sm text-center">{mintError}</div>}
                    {mintSuccess && <div className="mt-2 text-green-400 text-sm text-center break-words">{mintSuccess}</div>}
                  </form>
                )}

                {/* NEW: Revoke Section */}
                <div className="pt-8">
                  <h3 className="text-gray-300 font-semibold mb-4 text-center">Revoke a Credential</h3>
                  <form onSubmit={handleRevoke} className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Enter Credential Hash to Revoke" 
                      value={revokeHash} 
                      onChange={(e) => setRevokeHash(e.target.value)} 
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50" 
                      required 
                    />
                    <button type="submit" disabled={isRevoking} className="bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 whitespace-nowrap">
                      {isRevoking ? "Revoking..." : "Revoke"}
                    </button>
                  </form>
                  {revokeMessage && (
                    <div className={`mt-4 p-3 rounded-lg text-sm text-center ${revokeMessage.includes("failed") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
                      {revokeMessage}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
