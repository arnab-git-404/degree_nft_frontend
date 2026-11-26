import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

// One setting picks the network for the whole frontend (must match the backend's SOLANA_CLUSTER).
export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet';
export const IS_MAINNET = SOLANA_NETWORK === 'mainnet';
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(IS_MAINNET ? 'mainnet-beta' : 'devnet');
export const SOLANA_CONNECTION = new Connection(SOLANA_RPC_URL);

export const isValidPublicKey = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/** @param {'account' | 'tx'} type */
export const getExplorerUrl = (address, type = 'account') => {
  return `https://explorer.solana.com/${type}/${address}${IS_MAINNET ? '' : '?cluster=devnet'}`;
};
