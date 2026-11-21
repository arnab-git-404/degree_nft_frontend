const { Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const { connection } = require('./connection');

// Generate a new wallet for institution or student
function generateWallet(label) {
  const wallet = Keypair.generate();
  
  // Save keypair to file (in production, use secure storage)
  const keypairData = {
    publicKey: wallet.publicKey.toString(),
    secretKey: Array.from(wallet.secretKey)
  };
  
  // Create wallets directory if it doesn't exist
  if (!fs.existsSync('./wallets')) {
    fs.mkdirSync('./wallets');
  }
  
  fs.writeFileSync(
    `./wallets/${label}_wallet.json`,
    JSON.stringify(keypairData, null, 2)
  );
  
  console.log(`Wallet created for ${label}: ${wallet.publicKey.toString()}`);
  return wallet;
}

// Load existing wallet from file
function loadWallet(label) {
  try {
    const data = fs.readFileSync(`./wallets/${label}_wallet.json`, 'utf-8');
    const keypairData = JSON.parse(data);
    
    return Keypair.fromSecretKey(
      Uint8Array.from(keypairData.secretKey)
    );
  } catch (error) {
    console.error(`Error loading wallet for ${label}:`, error);
    throw error;
  }
}

// Request TestNet SOL for development
async function requestAirdrop(wallet, amountInSOL = 2) {
  const publicKey = wallet instanceof Keypair ? wallet.publicKey : wallet;
  
  console.log(`Requesting ${amountInSOL} SOL to ${publicKey.toString()}`);
  
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      amountInSOL * LAMPORTS_PER_SOL
    );
    
    await connection.confirmTransaction(signature);
    console.log(`Airdrop confirmed: ${signature}`);
    
    const balance = await connection.getBalance(publicKey);
    console.log(`New balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  // Create institution wallet
  const institutionWallet = generateWallet('institution');
  
  // Request airdrop
  requestAirdrop(institutionWallet)
    .then(signature => {
      console.log('Airdrop successful:', signature);
    })
    .catch(console.error);
}

module.exports = { generateWallet, loadWallet, requestAirdrop };