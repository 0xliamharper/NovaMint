import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import '../styles/NovaMintApp.css';
import { CollectionsGrid } from './CollectionsGrid';
import { CreateCollectionForm } from './CreateCollectionForm';
import { Header } from './Header';
import { useZamaInstance } from '../hooks/useZamaInstance';

export type Collection = {
  id: bigint;
  name: string;
  maxSupply: bigint;
  minted: bigint;
  creator: `0x${string}`;
  baseTokenId: bigint;
  hiddenOwner: `0x${string}`;
};

function toNumber(value: bigint) {
  return Number(value);
}

export function NovaMintApp() {
  const { address, isConnected } = useAccount();
  const zama = useZamaInstance();

  const { data, isLoading, isRefetching, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAllCollections',
    query: {
      refetchInterval: 12000,
    },
  });

  const collections = useMemo<Collection[]>(() => {
    if (!data) {
      return [];
    }
    return (data as any[]).map((item) => ({
      id: item.id as bigint,
      name: item.name as string,
      maxSupply: item.maxSupply as bigint,
      minted: item.minted as bigint,
      creator: item.creator as `0x${string}`,
      baseTokenId: item.baseTokenId as bigint,
      hiddenOwner: item.hiddenOwner as `0x${string}`,
    }));
  }, [data]);

  const totalMinted = collections.reduce((acc, collection) => acc + collection.minted, 0n);
  const totalSupply = collections.reduce((acc, collection) => acc + collection.maxSupply, 0n);
  const fillRate =
    totalSupply > 0n ? Math.min(100, Number((totalMinted * 10000n) / totalSupply) / 100) : 0;

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className="nova-shell">
      <div className="gradient-bg" />
      <Header />
      <main className="content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Confidential minting</p>
            <h1>Launch NFTs with hidden owners and transparent supply.</h1>
            <p className="lede">
              NovaMint encrypts collection owner addresses with Zama FHE. Creators stay private while
              collectors can mint openly on Sepolia.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#create">
                Create collection
              </a>
              <a className="secondary-link" href="#collections">
                Browse live drops
              </a>
            </div>
            {!isConnected ? (
              <p className="status-note">Connect your wallet to create or mint.</p>
            ) : null}
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <p className="stat-label">Collections</p>
              <p className="stat-value">{collections.length}</p>
              <p className="stat-caption">Encrypted owners on-chain</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Minted / Supply</p>
              <p className="stat-value">
                {totalMinted.toString()} <span className="stat-separator">/</span> {totalSupply.toString()}
              </p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${fillRate}%` }} />
              </div>
              <p className="stat-caption">Live utilization across all drops</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Mint limit</p>
              <p className="stat-value">{toNumber(totalSupply - totalMinted) >= 0 ? toNumber(totalSupply - totalMinted) : 0}</p>
              <p className="stat-caption">Tokens remaining to be minted</p>
            </div>
          </div>
        </section>

        <section id="create" className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Creator dashboard</p>
              <h2>Define a new encrypted-owner collection</h2>
              <p className="lede">
                Encrypt the owner address with the Zama relayer, publish the collection, and invite the community
                to mint.
              </p>
            </div>
          </div>
          <CreateCollectionForm onCreated={handleRefresh} zama={zama} />
        </section>

        <section id="collections" className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Live collections</p>
              <h2>Mint or manage encrypted-owner NFTs</h2>
              <p className="lede">
                Everyone can mint until supply is exhausted. Only creators can rotate or decrypt the hidden owner.
              </p>
            </div>
          </div>
          <CollectionsGrid
            activeAddress={address}
            collections={collections}
            isLoading={isLoading || isRefetching}
            onActionComplete={handleRefresh}
            zama={zama}
          />
        </section>
      </main>
    </div>
  );
}
