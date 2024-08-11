# Asset Manager Vault

This project demonstrates the implementation and testing of a Solana program using the Anchor framework.

## Requirements

- Node.js (version 14 or higher)
- Rust and Cargo
- Solana CLI
- Anchor CLI

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd asset-manager-vault
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Compiling the program

To compile the Solana program, run:

```
anchor build
```

To deploy the program to the devnet, run:

```
anchor deploy
```

## Running tests

1. Ensure your Solana CLI is configured to use the devnet:
   ```
   solana config set --url devnet
   ```

2. Import the customer's private key:
   Open the file `tests/asset-manager-vault.ts` and locate the following line:
   ```typescript
   const PRIVATE_KEY_ALICE = "<YOUR_PRIVATE_KEY>";
   ```
   Replace the existing private key with the customer's private key.

3. Run the tests:
   ```
   anchor test
   ```

## Project Structure

- `programs/`: Contains the Solana program source code
- `tests/`: Contains the tests for the program
- `Anchor.toml`: Configuration file for the Anchor framework

## Notes

- Ensure you have sufficient SOL in your devnet wallet to run the tests.
- Private keys used in tests should only be used for development and testing purposes.

## References

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
