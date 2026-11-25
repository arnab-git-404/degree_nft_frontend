// 4th Edition 
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';


import { Buffer } from 'buffer';

// Polyfill Buffer for the browser
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
  
  // Process polyfill
  if (!window.process) window.process = { env: {} };
  
  // Additional polyfills that might be needed
  if (!window.crypto) window.crypto = window.msCrypto; // For older IE browsers
}

// Switch to devnet
// One setting picks the network for the whole frontend (must match the backend's SOLANA_CLUSTER).
export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet';
export const IS_MAINNET = SOLANA_NETWORK === 'mainnet';
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(IS_MAINNET ? 'mainnet-beta' : 'devnet');
export const SOLANA_CONNECTION = new Connection(SOLANA_RPC_URL);



/**
 * Checks if a string is a valid Solana public key
 * @param {string} address - The address to validate
 * @returns {boolean} - Whether the address is valid
 */

export const isValidPublicKey = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets a Solana Explorer URL for a given address
 * @param {string} address - Solana address
 * @param {'account' | 'tx'} type - Type of explorer URL
 * @returns {string} - Explorer URL
 */

export const getExplorerUrl = (address, type = 'account') => {
  return `https://explorer.solana.com/${type}/${address}${IS_MAINNET ? '' : '?cluster=devnet'}`;
};

/**
 * @typedef {Object} DegreeMetadataAttributes
 * @property {string} institutionName
 * @property {string} institutionAddress
 * @property {string} studentName
 * @property {string} studentAddress
 * @property {string} degreeType
 * @property {string} issueDate
 * @property {string} graduationYear
 * @property {string} cgpa
 * @property {string} programDuration
 * @property {string} major
 * @property {string} honors
 */

/**
 * @typedef {Object} DegreeMetadata
 * @property {string} name
 * @property {string} symbol
 * @property {string} description
 * @property {string} image
 * @property {string} external_url
 * @property {DegreeMetadataAttributes} attributes
 * @property {Object} properties
 * @property {Array<{uri: string, type: string}>} properties.files
 * @property {'image'} properties.category
 * @property {Array<{address: string, share: number}>} properties.creators
 */

/**
 * Creates metadata for a degree certificate NFT
 * @param {Object} data - Certificate data
 * @param {string} data.institutionName - Name of the institution
 * @param {string} data.institutionAddress - Solana address of the institution
 * @param {string} data.studentName - Name of the student
 * @param {string} data.degreeType - Type of degree
 * @param {string} data.issueDate - Date when the degree was issued
 * @param {string} data.graduationYear - Year of graduation
 * @param {string} data.cgpa - Cumulative Grade Point Average
 * @param {string} data.programDuration - Duration of the program
 * @param {string} data.major - Major subject
 * @param {string} data.honors - Honors received (optional)
 * @param {string} institutionAddress - Solana address of the institution issuing the certificate
 * @returns {DegreeMetadata} - Formatted metadata object
 */


export const createDegreeMetadata = (data, institutionAddress) => ({
  name: `${data.institutionName} - ${data.degreeType}`,
  symbol: 'DEGREE',
  description: `Official degree certificate issued by ${data.institutionName} to ${data.studentName}`,
  image: 'https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb?w=800',
  external_url: `https://explorer.solana.com/address/${institutionAddress}?cluster=${SOLANA_NETWORK}`,
  attributes: {
    ...data,
    studentAddress: '', // Will be filled during minting
  },
  properties: {
    files: [{
      uri: 'https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb?w=800',
      type: 'image/jpeg'
    }],
    category: 'image',
    creators: [{
      address: institutionAddress,
      share: 100
    }]
  }
});


/**
 * Calculates the estimated cost for minting an NFT in SOL
 * @returns {Promise<number>} Cost in SOL
 */

export const calculateMintingCost = async () => {
  const rentExemptBalance = await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(165);
  const transactionFee = 5000; // Base transaction fee
  const metadataFee = 0.012 * LAMPORTS_PER_SOL; // Metadata storage cost
  
  return (rentExemptBalance + transactionFee + metadataFee) / LAMPORTS_PER_SOL;
};

// 3rd Edition
// import React, { useState, useEffect } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
// import { 
//   SOLANA_CONNECTION, 
//   createDegreeMetadata, 
//   calculateMintingCost,
//   isValidPublicKey
// } from './solana-metaplex-utils';

// const DegreeNFTForm = () => {
//   const { publicKey, signTransaction } = useWallet();
//   console.log("PublicKey is: "+publicKey);

//   const [isLoading, setIsLoading] = useState(false);
//   const [mintCost, setMintCost] = useState(0);
//   const [statusMessage, setStatusMessage] = useState('');
//   const [formData, setFormData] = useState({
//     institutionName: '',
//     institutionAddress: '',
//     studentName: '',
//     degreeType: '',
//     issueDate: '',
//     graduationYear: '',
//     cgpa: '',
//     programDuration: '',
//     major: '',
//     honors: ''
//   });

//   // Load estimated minting cost on component mount
//   useEffect(() => {
//     const loadMintCost = async () => {
//       try {
//         const cost = await calculateMintingCost();
//         setMintCost(cost);
//       } catch (error) {
//         console.error("Failed to calculate minting cost:", error);
//       }
//     };
    
//     loadMintCost();
//   }, []);

//   // Update form data when inputs change
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   // Submit the form to create and mint the NFT
//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // Validation
//     if (!publicKey) {
//       setStatusMessage("Please connect your wallet first");
//       return;
//     }
    
//     if (!isValidPublicKey(formData.institutionAddress)) {
//       setStatusMessage("Please enter a valid institution wallet address");
//       return;
//     }
    
//     try {
//       setIsLoading(true);
//       setStatusMessage("Creating degree certificate NFT...");
      
//       // Set institution address to connected wallet if not specified
//       const institutionAddress = formData.institutionAddress || publicKey.toString();
      
//       // Create the metadata
//       const metadata = createDegreeMetadata(
//         {
//           institutionName: formData.institutionName,
//           institutionAddress: institutionAddress,
//           studentName: formData.studentName,
//           degreeType: formData.degreeType,
//           issueDate: formData.issueDate,
//           graduationYear: formData.graduationYear,
//           cgpa: formData.cgpa,
//           programDuration: formData.programDuration,
//           major: formData.major,
//           honors: formData.honors
//         },
//         institutionAddress
//       );
      
//       // Initialize Metaplex with the connected wallet
//       const metaplex = Metaplex.make(SOLANA_CONNECTION).use({
//         wallet: {
//           publicKey,
//           signTransaction
//         }
//       });
      
//       // Upload metadata to Arweave
//       const { uri } = await metaplex.nfts().uploadMetadata(metadata);
//       setStatusMessage("Metadata uploaded, minting NFT...");
      
//       // Mint the NFT
//       const { nft } = await metaplex.nfts().create({
//         uri,
//         name: metadata.name,
//         sellerFeeBasisPoints: 0, // No royalties
//         creators: [{ address: publicKey, share: 100 }]
//       });
      
//       setStatusMessage(`Success! Degree certificate NFT created with mint address: ${nft.address.toString()}`);
      
//       // Clear form after successful submission
//       setFormData({
//         institutionName: '',
//         institutionAddress: '',
//         studentName: '',
//         degreeType: '',
//         issueDate: '',
//         graduationYear: '',
//         cgpa: '',
//         programDuration: '',
//         major: '',
//         honors: ''
//       });
      
//     } catch (error) {
//       console.error("Failed to mint NFT:", error);
//       setStatusMessage(`Error creating NFT: ${error.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
//       <h1 className="text-2xl font-bold mb-6">Create Degree Certificate NFT</h1>
      
//       <div className="mb-6">
//         <WalletMultiButton className="mb-4" />
//         <p className="text-sm text-gray-600">
//           Estimated minting cost: {mintCost.toFixed(4)} SOL
//         </p>
//       </div>
      
//       {statusMessage && (
//         <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
//           {statusMessage}
//         </div>
//       )}
      
//       <form onSubmit={handleSubmit}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {/* Institution Information */}
//           <div className="col-span-2">
//             <h2 className="text-lg font-semibold mb-2">Institution Information</h2>
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Institution Name</label>
//             <input
//               type="text"
//               name="institutionName"
//               value={formData.institutionName}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">
//               Institution Wallet Address (optional)
//             </label>
//             <input
//               type="text"
//               name="institutionAddress"
//               value={formData.institutionAddress}
//               onChange={handleInputChange}
//               placeholder={publicKey ? publicKey.toString() : "Connect wallet first"}
//               className="w-full p-2 border rounded"
//             />
//             <p className="text-xs text-gray-500 mt-1">
//               Leave blank to use connected wallet address
//             </p>
//           </div>
          
//           {/* Student Information */}
//           <div className="col-span-2">
//             <h2 className="text-lg font-semibold mb-2 mt-4">Student Information</h2>
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Student Name</label>
//             <input
//               type="text"
//               name="studentName"
//               value={formData.studentName}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           {/* Degree Information */}
//           <div className="col-span-2">
//             <h2 className="text-lg font-semibold mb-2 mt-4">Degree Information</h2>
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Degree Type</label>
//             <input
//               type="text"
//               name="degreeType"
//               value={formData.degreeType}
//               onChange={handleInputChange}
//               placeholder="Bachelor of Science, Master of Arts, etc."
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Issue Date</label>
//             <input
//               type="date"
//               name="issueDate"
//               value={formData.issueDate}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Graduation Year</label>
//             <input
//               type="text"
//               name="graduationYear"
//               value={formData.graduationYear}
//               onChange={handleInputChange}
//               placeholder="2025"
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">CGPA</label>
//             <input
//               type="text"
//               name="cgpa"
//               value={formData.cgpa}
//               onChange={handleInputChange}
//               placeholder="3.8"
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Program Duration</label>
//             <input
//               type="text"
//               name="programDuration"
//               value={formData.programDuration}
//               onChange={handleInputChange}
//               placeholder="4 years"
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Major</label>
//             <input
//               type="text"
//               name="major"
//               value={formData.major}
//               onChange={handleInputChange}
//               placeholder="Computer Science"
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium mb-1">Honors</label>
//             <input
//               type="text"
//               name="honors"
//               value={formData.honors}
//               onChange={handleInputChange}
//               placeholder="Cum Laude, Magna Cum Laude, etc. (optional)"
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
        
//         <button
//           type="submit"
//           disabled={isLoading || !publicKey}
//           className="w-full mt-6 p-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
//         >
//           {isLoading ? "Creating NFT..." : "Create Degree Certificate NFT"}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default DegreeNFTForm;

// 2nd Edition 
// import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
// import { Buffer } from 'buffer';

// // Polyfill Buffer for the browser
// if (typeof window !== 'undefined') {
//   window.Buffer = Buffer;
// }

// // Switch to devnet
// export const SOLANA_NETWORK = 'devnet';
// export const SOLANA_CONNECTION = new Connection(clusterApiUrl(SOLANA_NETWORK));

// // Initialize Metaplex with a dummy keypair for read-only operations
// // This will be replaced with the actual wallet when performing transactions
// const dummyKeypair = Keypair.generate();
// export const metaplex = new Metaplex(SOLANA_CONNECTION).use({
//   identity: dummyKeypair,
//   cluster: 'devnet'
// });

// export const isValidPublicKey = (address) => {
//   try {
//     new PublicKey(address);
//     return true;
//   } catch {
//     return false;
//   }
// };

// export const getExplorerUrl = (address, type = 'account') => {
//   return `https://explorer.solana.com/${type}/${address}?cluster=${SOLANA_NETWORK}`;
// };


// /**
//  * @typedef {Object} DegreeMetadataAttributes
//  * @property {string} institutionName
//  * @property {string} institutionAddress
//  * @property {string} studentName
//  * @property {string} studentAddress
//  * @property {string} degreeType
//  * @property {string} issueDate
//  * @property {string} graduationYear
//  * @property {string} cgpa
//  * @property {string} programDuration
//  * @property {string} major
//  * @property {string} honors
//  */

// /**
//  * @typedef {Object} DegreeMetadata
//  * @property {string} name
//  * @property {string} symbol
//  * @property {string} description
//  * @property {string} image
//  * @property {string} external_url
//  * @property {DegreeMetadataAttributes} attributes
//  * @property {Object} properties
//  * @property {Array<{uri: string, type: string}>} properties.files
//  * @property {'image'} properties.category
//  * @property {Array<{address: string, share: number}>} properties.creators
//  */

// /**
//  * Creates metadata for a degree certificate NFT
//  * @param {Omit<DegreeMetadataAttributes, 'studentAddress'>} data 
//  * @param {string} institutionAddress 
//  * @returns {DegreeMetadata}
//  */

// export const createDegreeMetadata = (data, institutionAddress) => ({
//   name: `${data.institutionName} - ${data.degreeType}`,
//   symbol: 'DEGREE',
//   description: `Official degree certificate issued by ${data.institutionName} to ${data.studentName}`,
//   image: 'https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb?w=800',
//   external_url: `https://explorer.solana.com/address/${institutionAddress}?cluster=${SOLANA_NETWORK}`,
//   attributes: {
//     ...data,
//     studentAddress: '', // Will be filled during minting
//   },
//   properties: {
//     files: [{
//       uri: 'https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb?w=800',
//       type: 'image/jpeg'
//     }],
//     category: 'image',
//     creators: [{
//       address: institutionAddress,
//       share: 100
//     }]
//   }
// });

// /**
//  * Calculates the estimated cost for minting an NFT in SOL
//  * @returns {Promise<number>} Cost in SOL
//  */

// export const calculateMintingCost = async () => {
//   const rentExemptBalance = await SOLANA_CONNECTION.getMinimumBalanceForRentExemption(165);
//   const transactionFee = 5000; // Base transaction fee
//   const metadataFee = 0.012 * LAMPORTS_PER_SOL; // Metadata storage cost
  
//   return (rentExemptBalance + transactionFee + metadataFee) / LAMPORTS_PER_SOL;
// };





// 1st Edition 
// import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
// import { Buffer } from 'buffer';

// // Polyfill Buffer for the browser
// if (typeof window !== 'undefined') {
//   window.Buffer = Buffer;
// }

// export const SOLANA_NETWORK = 'devnet';
// export const SOLANA_CONNECTION = new Connection(clusterApiUrl(SOLANA_NETWORK));

// export const isValidPublicKey = (address: string): boolean => {
//   try {
//     new PublicKey(address);
//     return true;
//   } catch {
//     return false;
//   }
// };

// export const getExplorerUrl = (address: string, type: 'account' | 'tx' = 'account'): string => {
//   return `https://explorer.solana.com/${type}/${address}?cluster=${SOLANA_NETWORK}`;
// };