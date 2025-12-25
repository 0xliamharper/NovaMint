# NovaMint

NovaMint is a privacy-first NFT collection launcher built on Zama FHEVM. It lets creators publish collections with an
encrypted owner address while still allowing anyone to mint openly. Ownership privacy is preserved on-chain, and only
the creator can decrypt or rotate the hidden owner using the Zama relayer.

## Project Overview

NovaMint focuses on a simple but powerful idea: NFT drops should be publicly mintable while the collection owner can
remain confidential. The smart contract stores the owner address as an encrypted `eaddress`, enabling selective
revealing without leaking ownership on-chain.

## Core Features

- Create NFT collections with a name and fixed max supply
- Store the collection owner as an encrypted address on-chain
- Mint tokens from any collection until supply is exhausted
- Allow only the creator to update the hidden owner field
- Allow only the creator to decrypt the hidden owner using the Zama relayer
- List all collections and show live mint progress in the frontend

## Problems Solved

- **Ownership privacy:** Regular NFTs expose creator addresses. NovaMint encrypts the owner field to keep creators
  private by default.
- **Public minting with private ownership:** Users can still mint transparently while the real owner stays hidden.
- **On-chain supply enforcement:** The contract enforces max supply and minted counts without off-chain coordination.
- **Selective disclosure:** Creators can decrypt the hidden owner when needed without revealing it to the public.

## Advantages

- **On-chain confidentiality:** `eaddress` encryption is verified and stored on-chain, not in a database.
- **Creator-only decryption:** The contract grants ACL permissions only to the collection creator.
- **Low trust surface:** No custom backend is required for minting or collection listing.
- **Composable data model:** Collections and tokens can be indexed via events.
- **Deterministic supply:** Each collection reserves a token id range to prevent collisions.

## How It Works

1. **Create collection**
   - The creator encrypts the owner address using the Zama relayer SDK.
   - The encrypted handle and input proof are submitted to `createCollection`.
   - The contract stores the `eaddress` and grants ACL access to the creator.

2. **Mint**
   - Any user calls `mint(collectionId)` until the supply is exhausted.
   - Token ids are assigned from the collection's reserved range.

3. **Update hidden owner**
   - The creator encrypts a new owner address and calls `setHiddenOwner`.
   - ACL permissions are refreshed for the creator.

4. **Decrypt hidden owner**
   - The creator signs an EIP-712 message and uses the relayer SDK to decrypt.
   - The plaintext owner address never appears on-chain.

## Smart Contract Details

- **Contract:** `NovaMint` in `contracts/NovaMint.sol`
- **Token model:** Minimal ERC721-style ownership tracking (mint-only; no transfers or approvals yet)
- **Collection model:**
  - `id`, `name`, `maxSupply`, `minted`, `creator`, `baseTokenId`, `hiddenOwner`
- **Key functions:**
  - `createCollection(name, maxSupply, hiddenOwnerInput, inputProof)`
  - `setHiddenOwner(collectionId, hiddenOwnerInput, inputProof)`
  - `mint(collectionId)`
  - `getCollection(collectionId)` / `getAllCollections()`
  - `hiddenOwner(collectionId)`
- **Events:** `CollectionCreated`, `HiddenOwnerUpdated`, `Minted`, `Transfer`
- **Errors:** `InvalidCollection`, `SupplyExhausted`, `NotCollectionOwner`, `InvalidToken`, `InvalidSupply`,
  `EmptyName`, `ZeroAddress`

## Frontend Details

- **Location:** `app/`
- **Network:** Sepolia (configured via Zama relayer SDK)
- **Reads:** `useReadContract` from wagmi/viem
- **Writes:** `ethers` Contract with a wallet signer
- **Encryption/Decryption:** `@zama-fhe/relayer-sdk`
- **Styling:** Custom CSS in `app/src/styles/` (no Tailwind)
- **Contract config:** `app/src/config/contracts.ts` (address + ABI)

## Tech Stack

- **Smart contracts:** Solidity, Hardhat, hardhat-deploy
- **Confidentiality:** Zama FHEVM (`@fhevm/solidity`, `@fhevm/hardhat-plugin`)
- **Frontend:** React + Vite + TypeScript
- **Web3:** wagmi, viem (reads), ethers (writes)
- **Wallet UI:** RainbowKit
- **Relayer SDK:** `@zama-fhe/relayer-sdk`
- **Testing/Linting:** Mocha, Chai, ESLint, Solhint

## Repository Structure

```
.
├── contracts/               # Solidity contracts
├── deploy/                  # Deployment scripts
├── tasks/                   # Hardhat CLI tasks
├── test/                    # Contract tests
├── app/                     # React frontend
├── docs/                    # Zama references
└── hardhat.config.ts        # Hardhat config
```

## Development Guide

### Prerequisites

- Node.js 20+
- npm
- A funded Sepolia account for deployment

### Install Dependencies

```bash
npm install
```

```bash
cd app
npm install
```

### Local Compile and Test

```bash
npm run compile
npm run test
```

### Start Local Node and Deploy

```bash
npm run chain
npm run deploy:localhost
```

### Hardhat Tasks

```bash
npx hardhat accounts
npx hardhat task:address --network localhost
npx hardhat task:create-collection --name "My Drop" --supply 25 --network localhost
npx hardhat task:mint --collection-id 1 --network localhost
npx hardhat task:decrypt-hidden --collection-id 1 --network localhost
```

### Deploy to Sepolia

1. Ensure `.env` is configured with:
   - `PRIVATE_KEY`
   - `INFURA_API_KEY`
   - (Optional) `ETHERSCAN_API_KEY`
2. Run local tests and tasks successfully.
3. Deploy:

```bash
npm run deploy:sepolia
```

### Verify on Sepolia

```bash
npm run verify:sepolia -- <CONTRACT_ADDRESS>
```

### Run Frontend

```bash
cd app
npm run dev
```

## Updating the Frontend Contract Config

- After deploying to Sepolia, copy the ABI from `deployments/sepolia/NovaMint.json` into
  `app/src/config/contracts.ts`.
- Update `CONTRACT_ADDRESS` to the new deployed address.
- The frontend does not use environment variables for contract config.

## Security and Privacy Notes

- Encrypted owner data is stored on-chain as `eaddress` and is not readable without ACL permission.
- The creator is granted decryption permission by the contract via `FHE.allow`.
- Anyone can mint tokens; ownership privacy does not block minting.
- Token metadata, transfers, and approvals are intentionally out of scope for this MVP.

## Future Roadmap

- ERC721 transfers and approvals
- Token metadata and `tokenURI`
- Batch minting and creator-controlled allowlists
- Richer collection metadata (images, descriptions, royalty info)
- Analytics dashboard and event indexing
- Optional reveal workflow for hidden owner

## License

BSD-3-Clause-Clear. See `LICENSE`.

## References

- Zama FHEVM notes: `docs/zama_llm.md`
- Zama relayer notes: `docs/zama_doc_relayer.md`
