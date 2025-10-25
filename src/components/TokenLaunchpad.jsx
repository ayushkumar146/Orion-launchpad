// ==============================
// 🌟 Solana Token Launchpad (Single Page Explained)
// ==============================

// Import required Solana Web3 + Wallet Adapter + SPL Token libraries
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"; 
// -> Used for creating keypairs, sending transactions, and interacting with Solana programs.

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
// -> Hooks that let you access the blockchain connection and the user’s connected wallet.

import { 
    TOKEN_2022_PROGRAM_ID,                        // SPL Token 2022 program ID (newer standard)
    createMintToInstruction,                      // To mint tokens to a wallet
    createAssociatedTokenAccountInstruction,      // To create user's token account
    getMintLen,                                   // Calculates space needed for mint account
    createInitializeMetadataPointerInstruction,   // Points to where metadata lives
    createInitializeMintInstruction,              // Initializes mint (decimals, authority)
    TYPE_SIZE, LENGTH_SIZE,                       // Byte sizes used in metadata packing
    ExtensionType,                                // Enum for token extensions
    getAssociatedTokenAddressSync                 // Calculates associated token account address
} from "@solana/spl-token";

import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
// -> For encoding metadata and initializing metadata for the mint.


// ==============================
// ⚙️ Main React Component
// ==============================
export function TokenLaunchpad() {
    const { connection } = useConnection(); // Connection to the Solana cluster (devnet/mainnet)
    const wallet = useWallet();             // Access to the connected user wallet


    // ==============================
    // 🚀 Function to Create Token
    // ==============================
    async function createToken() {
        // 1️⃣ Generate a new keypair for your token mint
        const mintKeypair = Keypair.generate();

        // 2️⃣ Define token metadata (name, symbol, URI)
        const metadata = {
            mint: mintKeypair.publicKey,
            name: 'KIRA', // Token name
            symbol: 'KIR    ', // Token symbol (extra spaces are fine)
            uri: 'https://cdn.100xdevs.com/metadata.json', // Metadata JSON link
            additionalMetadata: [],
        };

        // 3️⃣ Calculate memory and rent cost
        const mintLen = getMintLen([ExtensionType.MetadataPointer]); // space for mint
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length; // space for metadata
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen); 
        // rent-exempt balance (so your mint account stays alive forever)

        // 4️⃣ Create and initialize mint account with metadata
        const transaction = new Transaction().add(
            // (a) Create a new account on Solana for the token mint
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,            // who pays the fees
                newAccountPubkey: mintKeypair.publicKey, // new token account
                space: mintLen,                          // memory size
                lamports,                                // rent-exempt amount
                programId: TOKEN_2022_PROGRAM_ID,        // which program owns the account
            }),

            // (b) Initialize metadata pointer (so metadata can be attached)
            createInitializeMetadataPointerInstruction(
                mintKeypair.publicKey,  // token mint address
                wallet.publicKey,       // authority that can update metadata
                mintKeypair.publicKey,  // metadata stored at same address
                TOKEN_2022_PROGRAM_ID
            ),

            // (c) Initialize mint parameters (decimals, mint authority)
            createInitializeMintInstruction(
                mintKeypair.publicKey,  // mint address
                9,                      // decimals (like 1 token = 10^9 smallest units)
                wallet.publicKey,       // who can mint more tokens
                null,                   // no freeze authority
                TOKEN_2022_PROGRAM_ID
            ),

            // (d) Initialize metadata (name, symbol, URI)
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                mint: mintKeypair.publicKey,
                metadata: mintKeypair.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                mintAuthority: wallet.publicKey,
                updateAuthority: wallet.publicKey,
            }),
        );

        // 5️⃣ Sign and send the mint creation transaction
        transaction.feePayer = wallet.publicKey; // you pay transaction fee
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair); // sign with mint account
        await wallet.sendTransaction(transaction, connection);
        console.log(`✅ Token mint created at: ${mintKeypair.publicKey.toBase58()}`);

        // 6️⃣ Derive the Associated Token Account (ATA) for user's wallet
        const associatedToken = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,  // mint address
            wallet.publicKey,       // owner (you)
            false,                  // allow off-curve = false (normal wallet)
            TOKEN_2022_PROGRAM_ID
        );
        console.log(`🧩 Associated Token Address: ${associatedToken.toBase58()}`);

        // 7️⃣ Create the Associated Token Account
        const transaction2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,      // payer
                associatedToken,       // token account address
                wallet.publicKey,      // owner of token account
                mintKeypair.publicKey, // which token mint it belongs to
                TOKEN_2022_PROGRAM_ID, // token program ID
            ),
        );
        await wallet.sendTransaction(transaction2, connection);
        console.log("✅ Associated token account created!");

        // 8️⃣ Mint initial supply of tokens to the wallet
        const transaction3 = new Transaction().add(
            createMintToInstruction(
                mintKeypair.publicKey,  // mint account
                associatedToken,         // destination token account
                wallet.publicKey,        // authority to mint
                1000000000,              // amount (1 billion units = 1 token with 9 decimals)
                [],                      // no multisig
                TOKEN_2022_PROGRAM_ID
            )
        );
        await wallet.sendTransaction(transaction3, connection);
        console.log("💰 Minted tokens successfully!");
    }


    // ==============================
    // 🖥️ Frontend UI (Simple Form)
    // ==============================
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            backgroundColor: '#0f1724',
            color: 'white',
            fontFamily: 'monospace'
        }}>
            <h1>🚀 Solana Token Launchpad</h1>
            {/* Input fields (not wired yet, static for now) */}
            <input className='inputText' type='text' placeholder='Name' style={{margin: '5px', padding: '8px'}}></input>
            <input className='inputText' type='text' placeholder='Symbol' style={{margin: '5px', padding: '8px'}}></input>
            <input className='inputText' type='text' placeholder='Image URL' style={{margin: '5px', padding: '8px'}}></input>
            <input className='inputText' type='text' placeholder='Initial Supply' style={{margin: '5px', padding: '8px'}}></input>
            {/* Button triggers createToken() */}
            <button onClick={createToken} className='btn' 
                style={{marginTop: '10px', padding: '10px 20px', backgroundColor: '#6366f1', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer'}}>
                Create Token
            </button>
        </div>
    );
}
