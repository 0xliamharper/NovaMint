import type { useZamaInstance } from '../hooks/useZamaInstance';
import type { Collection } from './NovaMintApp';
import { CollectionCard } from './CollectionCard';

type Props = {
  collections: Collection[];
  isLoading: boolean;
  activeAddress?: string;
  onActionComplete: () => void;
  zama: ReturnType<typeof useZamaInstance>;
};

export function CollectionsGrid({ collections, isLoading, activeAddress, onActionComplete, zama }: Props) {
  if (isLoading) {
    return <div className="placeholder">Loading collections from Sepolia...</div>;
  }

  if (!collections.length) {
    return <div className="placeholder">No collections yet. Be the first to create an encrypted-owner drop.</div>;
  }

  return (
    <div className="collection-grid">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id.toString()}
          collection={collection}
          activeAddress={activeAddress}
          onActionComplete={onActionComplete}
          zama={zama}
        />
      ))}
    </div>
  );
}
