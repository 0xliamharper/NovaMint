import { useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';

type Props = {
  onCreated: () => void;
  zama: ReturnType<typeof useZamaInstance>;
};

export function CreateCollectionForm({ onCreated, zama }: Props) {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = zama;

  const [name, setName] = useState('');
  const [supply, setSupply] = useState('');
  const [hiddenOwner, setHiddenOwner] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setSupply('');
    setHiddenOwner('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');

    if (!isConnected || !address) {
      setStatus('Connect your wallet to continue.');
      return;
    }
    if (!instance) {
      setStatus('Encryption service is still starting.');
      return;
    }
    if (!name.trim() || !supply) {
      setStatus('Please add a collection name and max supply.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable.');
      }

      const targetOwner = hiddenOwner.trim() || address;
      const parsedSupply = BigInt(supply);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.addAddress(targetOwner);
      const encrypted = await input.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.createCollection(
        name.trim(),
        parsedSupply,
        encrypted.handles[0],
        encrypted.inputProof
      );
      setStatus('Submitting transaction...');
      await tx.wait();

      setStatus('Collection published to Sepolia.');
      reset();
      onCreated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create collection.';
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label>Collection name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="NovaMint Originals"
            required
          />
        </div>
        <div className="form-field">
          <label>Max supply</label>
          <input
            value={supply}
            onChange={(event) => setSupply(event.target.value.replace(/[^0-9]/g, ''))}
            placeholder="100"
            inputMode="numeric"
            required
          />
        </div>
        <div className="form-field">
          <label>Hidden owner address</label>
          <input
            value={hiddenOwner}
            onChange={(event) => setHiddenOwner(event.target.value)}
            placeholder="Defaults to your connected wallet"
          />
        </div>
      </div>

      <div className="form-footer">
        <div className="status-chip">
          {zamaLoading ? 'Initializing Zama relayer...' : zamaError ? zamaError : status || 'Encrypt the owner address with FHE and publish.'}
        </div>
        <button type="submit" disabled={isSubmitting || zamaLoading || !isConnected}>
          {isSubmitting ? 'Creating...' : 'Create collection'}
        </button>
      </div>
    </form>
  );
}
