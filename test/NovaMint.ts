import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import { NovaMint, NovaMint__factory } from "../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("NovaMint")) as NovaMint__factory;
  const contract = (await factory.deploy()) as NovaMint;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("NovaMint", function () {
  let signers: Signers;
  let contract: NovaMint;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("NovaMint tests require the FHEVM mock. Skipping on non-mock networks.");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  async function encryptOwner(address: string, caller: HardhatEthersSigner) {
    return fhevm.createEncryptedInput(contractAddress, caller.address).addAddress(address).encrypt();
  }

  it("creates a collection with encrypted owner and reserves token ids", async function () {
    const encryptedOwner = await encryptOwner(signers.owner.address, signers.owner);

    const tx = await contract
      .connect(signers.owner)
      .createCollection("Genesis", 2, encryptedOwner.handles[0], encryptedOwner.inputProof);
    await tx.wait();

    const summary = await contract.getCollection(1);
    expect(summary.name).to.eq("Genesis");
    expect(summary.maxSupply).to.eq(2n);
    expect(summary.minted).to.eq(0n);
    expect(summary.creator).to.eq(signers.owner.address);
    expect(summary.baseTokenId).to.eq(1);

    const hiddenOwner = await contract.hiddenOwner(1);
    const decrypted = await fhevm.userDecryptEaddress(hiddenOwner, contractAddress, signers.owner);
    expect(decrypted).to.eq(signers.owner.address);

    const all = await contract.getAllCollections();
    expect(all.length).to.eq(1);
  });

  it("mints tokens up to supply and prevents further minting", async function () {
    const encryptedOwner = await encryptOwner(signers.alice.address, signers.alice);
    await contract
      .connect(signers.alice)
      .createCollection("Limited", 2, encryptedOwner.handles[0], encryptedOwner.inputProof);

    const firstToken = await contract.connect(signers.owner).mint(1);
    await firstToken.wait();
    const secondToken = await contract.connect(signers.bob).mint(1);
    await secondToken.wait();

    const summary = await contract.getCollection(1);
    expect(summary.minted).to.eq(2n);

    await expect(contract.connect(signers.owner).mint(1)).to.be.revertedWithCustomError(contract, "SupplyExhausted");

    const tokenOwner1 = await contract.ownerOf(summary.baseTokenId);
    const tokenOwner2 = await contract.ownerOf(summary.baseTokenId + 1n);
    expect(tokenOwner1).to.eq(signers.owner.address);
    expect(tokenOwner2).to.eq(signers.bob.address);
  });

  it("allows the creator to update the hidden owner and forbids others", async function () {
    const encryptedOwner = await encryptOwner(signers.owner.address, signers.owner);
    await contract
      .connect(signers.owner)
      .createCollection("Transferable", 1, encryptedOwner.handles[0], encryptedOwner.inputProof);

    const newEncryptedOwner = await encryptOwner(signers.bob.address, signers.owner);
    await expect(
      contract.connect(signers.bob).setHiddenOwner(1, newEncryptedOwner.handles[0], newEncryptedOwner.inputProof),
    ).to.be.revertedWithCustomError(contract, "NotCollectionOwner");

    const updateTx = await contract
      .connect(signers.owner)
      .setHiddenOwner(1, newEncryptedOwner.handles[0], newEncryptedOwner.inputProof);
    await updateTx.wait();

    const hiddenOwner = await contract.hiddenOwner(1);
    const decrypted = await fhevm.userDecryptEaddress(hiddenOwner, contractAddress, signers.owner);
    expect(decrypted).to.eq(signers.bob.address);
  });
});
