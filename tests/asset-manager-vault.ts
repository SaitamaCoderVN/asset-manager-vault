import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetManagerVault } from "../target/types/asset_manager_vault";
import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from 'bs58';
import {
  Account,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

// private key of alice, that is customer
const PRIVATE_KEY_ALICE = "<YOUR_PRIVATE_KEY>";

// confirm transaction
async function confirmTransaction(tx: string) {
  const latestBlockHash = await anchor.getProvider().connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: tx,
  });
}

// import wallet from private key
async function importWalletFromPrivateKey(privateKeyString: string): Promise<Keypair> {
  const privateKey = bs58.decode(privateKeyString);
  const wallet = Keypair.fromSecretKey(privateKey);
  console.log("    Imported wallet:", wallet.publicKey.toString());
  return wallet;
}

// get pda
async function getVaultPda(
  program: anchor.Program<AssetManagerVault>,
  tag: string,
  mintAccount: { toBuffer: () => Uint8Array | Buffer; }
): Promise<{ pubkey: PublicKey; bump: number }> {
  const [pubKey, bump] = await PublicKey.findProgramAddressSync(
    [Buffer.from(tag), mintAccount.toBuffer()],
    program.programId
  );
  return { pubkey: pubKey, bump };
}

// log transaction
async function logTransaction(connection: anchor.web3.Connection, txHash: string) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: txHash });
  console.log(`    https://solscan.io/tx/${txHash}?cluster=devnet`);
}

// Test suite
describe("asset manager vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;
  const program = anchor.workspace.AssetManagerVault as Program<AssetManagerVault>;

  let walletAlice: Keypair;
  let mintAlice: PublicKey;
  let ataAlice: Account;

  const TOKEN_DECIMALS = 6;
  const INITIAL_MINT_AMOUNT = 1000 * 10 ** TOKEN_DECIMALS;

  before(async () => {
    // import wallet from private key
    walletAlice = await importWalletFromPrivateKey(PRIVATE_KEY_ALICE);

    // create mint account
    mintAlice = await createMint(
      connection,
      walletAlice,
      walletAlice.publicKey,
      null,
      TOKEN_DECIMALS
    );
    console.log("    mint Alice", mintAlice.toBase58());

    // create ata
    ataAlice = await getOrCreateAssociatedTokenAccount(
      connection,
      walletAlice,
      mintAlice,
      walletAlice.publicKey
    );
    console.log("    ATA Alice", ataAlice.address.toBase58());

    // mint tokens
    const mintTx = await mintTo(
      connection,
      walletAlice,
      mintAlice,
      ataAlice.address,
      walletAlice,
      INITIAL_MINT_AMOUNT
    );
    await confirmTransaction(mintTx);

    // check balance
    const tokenAccountInfo = await getAccount(connection, ataAlice.address);
    const balanceToken = Number(tokenAccountInfo.amount) / 10 ** TOKEN_DECIMALS;
    console.log("    balance token of Alice:", balanceToken);
  });

  it("Is initialized!", async () => {
    const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("SPL_ACCOUNT_VAULT")],
      program.programId
    );
    console.log("    TokenAccountOwnerPda:", tokenAccountOwnerPda.toString());

    try {
      // initialize vault by dev wallet on your devnet
      const initVaultTx = await program.methods
        .initialize()
        .accounts({
          signer: program.provider.publicKey,
        })
        .rpc({ skipPreflight: true });

      await logTransaction(connection, initVaultTx);
    } catch (err) {
      console.error("Error when initializing:", err);
    }
  });

  it("deposit(): multiple deposit on one unique vault", async () => {
    // get vault pda
    const pda = await getVaultPda(program, "SPL_PDA_VAULT", mintAlice);
    const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("SPL_ACCOUNT_VAULT")],
      program.programId
    );

    const depositAmount = (amount: number) => new anchor.BN(amount * 10 ** TOKEN_DECIMALS);

    const depositAccounts = {
      tokenAccountOwnerPda,
      vault: pda.pubkey,
      signer: walletAlice.publicKey,
      mintAccount: mintAlice,
      senderTokenAccount: ataAlice.address,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    for (const amount of [100, 200]) {
      const tx = await program.methods.deposit(depositAmount(amount))
        .accounts(depositAccounts)
        .signers([walletAlice])
        .rpc();
      console.log(`    (deposit +${amount}) https://solscan.io/tx/${tx}?cluster=devnet\n`);
    }
  });
});
