// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title NovaMint - Encrypted owner NFT collections
/// @notice Users can create limited NFT collections where the collection owner is stored as an encrypted address.
contract NovaMint is ZamaEthereumConfig {
    struct Collection {
        string name;
        uint256 maxSupply;
        uint256 minted;
        address creator;
        uint256 baseTokenId;
        eaddress hiddenOwner;
        bool exists;
    }

    struct CollectionView {
        uint256 id;
        string name;
        uint256 maxSupply;
        uint256 minted;
        address creator;
        uint256 baseTokenId;
        eaddress hiddenOwner;
    }

    string private constant _NAME = "NovaMint";
    string private constant _SYMBOL = "NOVA";

    uint256 private _collectionCount;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => Collection) private _collections;
    mapping(uint256 => uint256) private _tokenToCollection;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    event CollectionCreated(uint256 indexed id, address indexed creator, string name, uint256 maxSupply, eaddress hiddenOwner);
    event HiddenOwnerUpdated(uint256 indexed id, eaddress hiddenOwner);
    event Minted(uint256 indexed collectionId, uint256 indexed tokenId, address indexed to);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    error InvalidCollection();
    error SupplyExhausted();
    error EmptyName();
    error InvalidSupply();
    error NotCollectionOwner();
    error ZeroAddress();
    error InvalidToken();

    modifier onlyCollectionOwner(uint256 id) {
        if (!_collections[id].exists) {
            revert InvalidCollection();
        }
        if (_collections[id].creator != msg.sender) {
            revert NotCollectionOwner();
        }
        _;
    }

    /// @notice Create a new NFT collection with an encrypted owner field.
    /// @param collectionName Collection name.
    /// @param maxSupply Maximum mintable tokens for the collection.
    /// @param hiddenOwnerInput Encrypted owner address handle produced off-chain.
    /// @param inputProof Input proof associated with the encrypted address.
    /// @return collectionId Newly created collection id.
    function createCollection(
        string calldata collectionName,
        uint256 maxSupply,
        externalEaddress hiddenOwnerInput,
        bytes calldata inputProof
    ) external returns (uint256 collectionId) {
        if (bytes(collectionName).length == 0) {
            revert EmptyName();
        }
        if (maxSupply == 0) {
            revert InvalidSupply();
        }

        eaddress encryptedOwner = FHE.fromExternal(hiddenOwnerInput, inputProof);
        FHE.allowThis(encryptedOwner);
        FHE.allow(encryptedOwner, msg.sender);

        collectionId = ++_collectionCount;
        uint256 baseId = _nextTokenId;
        _nextTokenId += maxSupply;

        _collections[collectionId] = Collection({
            name: collectionName,
            maxSupply: maxSupply,
            minted: 0,
            creator: msg.sender,
            baseTokenId: baseId,
            hiddenOwner: encryptedOwner,
            exists: true
        });

        emit CollectionCreated(collectionId, msg.sender, collectionName, maxSupply, encryptedOwner);
    }

    /// @notice Update the encrypted owner for a collection.
    /// @param collectionId Collection id to update.
    /// @param hiddenOwnerInput Encrypted owner address handle produced off-chain.
    /// @param inputProof Input proof associated with the encrypted address.
    function setHiddenOwner(
        uint256 collectionId,
        externalEaddress hiddenOwnerInput,
        bytes calldata inputProof
    ) external onlyCollectionOwner(collectionId) {
        eaddress encryptedOwner = FHE.fromExternal(hiddenOwnerInput, inputProof);

        _collections[collectionId].hiddenOwner = encryptedOwner;

        FHE.allowThis(encryptedOwner);
        FHE.allow(encryptedOwner, msg.sender);

        emit HiddenOwnerUpdated(collectionId, encryptedOwner);
    }

    /// @notice Mint a token from a collection.
    /// @param collectionId Collection id to mint from.
    /// @return tokenId Newly minted token id.
    function mint(uint256 collectionId) external returns (uint256 tokenId) {
        Collection storage collection = _collections[collectionId];
        if (!collection.exists) {
            revert InvalidCollection();
        }
        if (collection.minted >= collection.maxSupply) {
            revert SupplyExhausted();
        }

        tokenId = collection.baseTokenId + collection.minted;
        collection.minted += 1;

        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _tokenToCollection[tokenId] = collectionId;

        emit Minted(collectionId, tokenId, msg.sender);
        emit Transfer(address(0), msg.sender, tokenId);
    }

    /// @notice Returns summary for a collection id.
    function getCollection(uint256 collectionId) public view returns (CollectionView memory) {
        Collection memory collection = _collections[collectionId];
        if (!collection.exists) {
            revert InvalidCollection();
        }

        return
            CollectionView({
                id: collectionId,
                name: collection.name,
                maxSupply: collection.maxSupply,
                minted: collection.minted,
                creator: collection.creator,
                baseTokenId: collection.baseTokenId,
                hiddenOwner: collection.hiddenOwner
            });
    }

    /// @notice Return all collections created so far.
    function getAllCollections() external view returns (CollectionView[] memory) {
        uint256 count = _collectionCount;
        CollectionView[] memory allCollections = new CollectionView[](count);
        for (uint256 i = 0; i < count; i++) {
            allCollections[i] = getCollection(i + 1);
        }
        return allCollections;
    }

    /// @notice Encrypted owner handle for a collection.
    function hiddenOwner(uint256 collectionId) external view returns (eaddress) {
        if (!_collections[collectionId].exists) {
            revert InvalidCollection();
        }
        return _collections[collectionId].hiddenOwner;
    }

    /// @notice Count of created collections.
    function totalCollections() external view returns (uint256) {
        return _collectionCount;
    }

    /// @notice ERC721-style token name.
    function name() external pure returns (string memory) {
        return _NAME;
    }

    /// @notice ERC721-style token symbol.
    function symbol() external pure returns (string memory) {
        return _SYMBOL;
    }

    /// @notice Return minted count for a collection.
    function mintedCount(uint256 collectionId) external view returns (uint256) {
        if (!_collections[collectionId].exists) {
            revert InvalidCollection();
        }
        return _collections[collectionId].minted;
    }

    /// @notice Token owner.
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) {
            revert InvalidToken();
        }
        return owner;
    }

    /// @notice Token balance for an address.
    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) {
            revert ZeroAddress();
        }
        return _balances[owner];
    }

    /// @notice Collection id for a token.
    function tokenCollection(uint256 tokenId) external view returns (uint256) {
        uint256 collectionId = _tokenToCollection[tokenId];
        if (collectionId == 0) {
            revert InvalidToken();
        }
        return collectionId;
    }

    /// @notice Whether a token has been minted.
    function tokenExists(uint256 tokenId) external view returns (bool) {
        return _owners[tokenId] != address(0);
    }
}
