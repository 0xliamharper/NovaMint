import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'NovaMint',
  projectId: '4b57c0d5a0b74f14aa6b8df17057a2ae',
  chains: [sepolia],
  ssr: false,
});
