import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "NovaMint";

task("task:address", "Prints the NovaMint address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const novaMint = await deployments.get(CONTRACT_NAME);

  console.log(`NovaMint address is ${novaMint.address}`);
});

task("task:create-collection", "Create a new encrypted-owner collection")
  .addParam("name", "Collection name")
  .addParam("supply", "Maximum supply for the collection")
  .addOptionalParam("owner", "Hidden owner address (defaults to sender)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const novaMint = await deployments.get(CONTRACT_NAME);
    const contract = await ethers.getContractAt(CONTRACT_NAME, novaMint.address);
    const [creator] = await ethers.getSigners();

    const hiddenOwner = (taskArguments.owner as string | undefined) ?? creator.address;
    const maxSupply = BigInt(taskArguments.supply as string);

    const encryptedOwner = await fhevm
      .createEncryptedInput(novaMint.address, creator.address)
      .addAddress(hiddenOwner)
      .encrypt();

    const tx = await contract
      .connect(creator)
      .createCollection(taskArguments.name as string, maxSupply, encryptedOwner.handles[0], encryptedOwner.inputProof);

    console.log(`Creating collection "${taskArguments.name}" with supply ${maxSupply}...`);
    const receipt = await tx.wait();
    console.log(`tx ${tx.hash} status ${receipt?.status}`);
  });

task("task:mint", "Mint a token from a collection")
  .addParam("collectionId", "Collection id to mint from")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const novaMint = await deployments.get(CONTRACT_NAME);
    const contract = await ethers.getContractAt(CONTRACT_NAME, novaMint.address);
    const [minter] = await ethers.getSigners();

    const collectionId = Number(taskArguments.collectionId);
    const tx = await contract.connect(minter).mint(collectionId);

    console.log(`Minting from collection ${collectionId}...`);
    const receipt = await tx.wait();
    console.log(`tx ${tx.hash} status ${receipt?.status}`);
  });

task("task:decrypt-hidden", "Decrypt the hidden owner for a collection (requires ACL permission)")
  .addParam("collectionId", "Collection id to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const novaMint = await deployments.get(CONTRACT_NAME);
    const contract = await ethers.getContractAt(CONTRACT_NAME, novaMint.address);
    const [caller] = await ethers.getSigners();

    const collectionId = Number(taskArguments.collectionId);
    const hiddenOwner = await contract.hiddenOwner(collectionId);
    const decrypted = await fhevm.userDecryptEaddress(hiddenOwner, novaMint.address, caller);

    console.log(`Hidden owner for collection ${collectionId}: ${decrypted}`);
  });
