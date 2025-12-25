import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/NovaMintApp.css';

export function Header() {
  return (
    <header className="nav-bar">
      <div className="nav-left">
        <div className="brand-mark">NM</div>
        <div>
          <p className="brand-title">NovaMint</p>
          <p className="brand-subtitle">Encrypted NFT studio</p>
        </div>
      </div>
      <div className="nav-actions">
        <span className="network-pill">Sepolia</span>
        <ConnectButton />
      </div>
    </header>
  );
}
