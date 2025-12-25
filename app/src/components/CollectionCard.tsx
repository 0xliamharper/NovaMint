import { useState } from 'react';
import { Contract } from 'ethers';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import type { useZamaInstance } from '../hooks/useZamaInstance';
import type { Collection } from './NovaMintApp';

type Props = {
  collection: Collection;
  activeAddress?: string;
  onActionComplete: () => void;
  zama: ReturnType<typeof useZamaInstance>;
};

function formatAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBigint(value: bigint) {
  return value.toString();
}

export function CollectionCard({ collection, activeAddress, onActionComplete, zama }: Props) {
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading } = zama;

  const [isMinting, setIsMinting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [status, setStatus] = useState('');
  const [newHiddenOwner, setNewHiddenOwner] = useState('');
  const [decryptedOwner, setDecryptedOwner] = useState<string | null>(null);

  const isCreator =
    activeAddress &&
    collection.creator.toLowerCase() === (activeAddress as string).toLowerCase();

  const progress =
    collection.maxSupply > 0n
      ? Math.min(
          100,
          Number((collection.minted * 10000n) / collection.maxSupply) / 100
        )
      : 0;

  const handleMint = async () => {
    setStatus('');
    setIsMinting(true);
    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Connect your wallet to mint.');
      }
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.mint(collection.id);
      setStatus('Minting token...');
      await tx.wait();
      setStatus('Minted successfully.');
      onActionComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mint failed.';
      setStatus(message);
    } finally {
      setIsMinting(false);
    }
  };

  const handleUpdateHiddenOwner = async () => {
    setStatus('');
    if (!isCreator) {
      setStatus('Only the creator can rotate the hidden owner.');
      return;
    }
    if (!newHiddenOwner.trim()) {
      setStatus('Add the new owner address.');
      return;
    }
    if (!instance) {
      setStatus('Encryption service is not ready.');
      return;
    }

    setIsUpdating(true);
    try {
      const signer = await signerPromise;
      if (!signer || !activeAddress) {
        throw new Error('Connect your creator wallet to continue.');
      }

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, activeAddress);
      input.addAddress(newHiddenOwner.trim());
      const encrypted = await input.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.setHiddenOwner(
        collection.id,
        encrypted.handles[0],
        encrypted.inputProof
      );
      setStatus('Updating hidden owner...');
      await tx.wait();

      setStatus('Hidden owner updated.');
      setNewHiddenOwner('');
      onActionComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update hidden owner.';
      setStatus(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecryptHiddenOwner = async () => {
    setStatus('');
    if (!isCreator) {
      setStatus('Only the creator can decrypt this owner.');
      return;
    }
    if (!instance) {
      setStatus('Encryption service is not ready.');
      return;
    }

    setIsDecrypting(true);
    try {
      const signer = await signerPromise;
      if (!signer || !activeAddress) {
        throw new Error('Connect your creator wallet to decrypt.');
      }

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: collection.hiddenOwner,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        activeAddress,
        startTimeStamp,
        durationDays
      );

      setDecryptedOwner(result[collection.hiddenOwner]);
      setStatus('Hidden owner decrypted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to decrypt.';
      setStatus(message);
    } finally {
      setIsDecrypting(false);
    }
  };

  const supplyLeft = collection.maxSupply - collection.minted;

  return (
    <div className="collection-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">#{collection.id.toString().padStart(3, '0')}</p>
          <h3>{collection.name}</h3>
          <p className="muted">
            Creator: <span className="pill">{formatAddress(collection.creator)}</span>
          </p>
        </div>
        <div className="supply-box">
          <p className="stat-label">Supply</p>
          <p className="stat-value small">
            {formatBigint(collection.minted)} / {formatBigint(collection.maxSupply)}
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="stat-caption">{formatBigint(supplyLeft >= 0n ? supplyLeft : 0n)} left</p>
        </div>
      </div>

      <div className="card-actions">
        <button onClick={handleMint} disabled={isMinting || zamaLoading || supplyLeft <= 0n}>
          {isMinting ? 'Minting...' : supplyLeft > 0n ? 'Mint NFT' : 'Sold out'}
        </button>
        <div className="owner-tools">
          <div className="pill">Hidden owner: encrypted</div>
          {isCreator ? (
            <div className="owner-forms">
              <div className="inline-field">
                <input
                  value={newHiddenOwner}
                  onChange={(event) => setNewHiddenOwner(event.target.value)}
                  placeholder="Set new hidden owner"
                />
                <button
                  type="button"
                  onClick={handleUpdateHiddenOwner}
                  disabled={isUpdating || zamaLoading}
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={handleDecryptHiddenOwner}
                disabled={isDecrypting || zamaLoading}
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt owner'}
              </button>
              {decryptedOwner ? (
                <p className="muted">Decrypted owner: {decryptedOwner}</p>
              ) : null}
            </div>
          ) : (
            <p className="muted">Only the creator can rotate or decrypt the hidden owner.</p>
          )}
        </div>
      </div>

      {status ? <div className="status-banner">{status}</div> : null}
    </div>
  );
}
