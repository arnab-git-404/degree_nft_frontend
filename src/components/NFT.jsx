const { Keypair, PublicKey } = require('@solana/web3.js');
const { Metaplex, keypairIdentity, bundlrStorage } = require('@metaplex-foundation/js');
const { connection } = require('./connection');

// Create Metaplex instance with institution wallet
function getMetaplex(institutionWallet) {
  return Metaplex.make(connection)
    .use(keypairIdentity(institutionWallet))
    .use(bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: 'https://api.testnet.solana.com',
      timeout: 60000,
    }));
}

// Create diploma NFT metadata
async function createDiplomaMetadata(
  metaplex,
  student,
  institution,
  imageUrl
) {
  console.log(`Creating metadata for ${student.name}'s diploma from ${institution.name}`);
  
  const metadata = {
    name: `${institution.name} - ${student.program} - ${student.name}`,
    description: `Official diploma certifying that ${student.name} has completed the requirements for ${student.program} in ${student.major} at ${institution.name}.`,
    image: imageUrl || "https://your-institution-domain.edu/diploma-template.png", // Replace with actual image
    external_url: `https://your-verification-portal.com/verify`,
    attributes: [
      { trait_type: "Student Name", value: student.name },
      { trait_type: "Student ID", value: student.id },
      { trait_type: "Program", value: student.program },
      { trait_type: "Major", value: student.major },
      { trait_type: "Graduation Date", value: student.graduationDate },
      { trait_type: "Institution", value: institution.name },
      { trait_type: "Accreditation ID", value: institution.accreditationId },
      { trait_type: "Issue Date", value: institution.issueDate }
    ],
    properties: {
      files: [
        {
          uri: imageUrl || "https://your-institution-domain.edu/diploma-template.png",
          type: "image/png"
        }
      ],
      category: "education"
    }
  };
  
  // Add honors if applicable
  if (student.honors) {
    metadata.attributes.push({ trait_type: "Honors", value: student.honors });
  }
  
  // Add any additional student info
  if (student.additionalInfo) {
    Object.entries(student.additionalInfo).forEach(([key, value]) => {
      metadata.attributes.push({ trait_type: key, value });
    });
  }
  
  // Upload to Arweave through Metaplex/Bundlr
  try {
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log("Metadata uploaded to:", uri);
    return uri;
  } catch (error) {
    console.error("Error uploading metadata:", error);
    throw error;
  }
}

// Mint NFT diploma
async function mintDiplomaNFT(
  metaplex,
  metadataUri,
  studentWalletAddress,
  student,
  institution
) {
  console.log(`Minting diploma NFT for ${student.name} to wallet ${studentWalletAddress}`);
  
  try {
    const recipientAddress = new PublicKey(studentWalletAddress);
    
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: `${institution.name} - ${student.program} - ${student.name}`,
      sellerFeeBasisPoints: 0, // No royalties for diploma NFTs
      tokenOwner: recipientAddress,
    });
    
    console.log(`Diploma NFT created with mint address: ${nft.address.toString()}`);
    return nft.address.toString();
  } catch (error) {
    console.error("Error minting diploma NFT:", error);
    throw error;
  }
}

// Verify a diploma NFT
async function verifyDiplomaNFT(nftAddress) {
  console.log(`Verifying NFT at address: ${nftAddress}`);
  
  try {
    const metaplex = Metaplex.make(connection);
    const mintAddress = new PublicKey(nftAddress);
    
    // Fetch NFT data
    const nft = await metaplex.nfts().findByMint({ mintAddress });
    
    if (!nft.uri) {
      throw new Error("No metadata URI found for this NFT");
    }
    
    // Fetch metadata
    const response = await fetch(nft.uri);
    const metadata = await response.json();
    
    return {
      isVerified: true,
      nft,
      metadata,
      ownerAddress: nft.ownerAddress?.toString() || "Unknown"
    };
  } catch (error) {
    console.error("Error verifying diploma NFT:", error);
    return {
      isVerified: false,
      error: error.message || "Failed to verify diploma NFT"
    };
  }
}

module.exports = {
  getMetaplex,
  createDiplomaMetadata,
  mintDiplomaNFT,
  verifyDiplomaNFT
};