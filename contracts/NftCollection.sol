// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NftCollection is ERC721Enumerable, Ownable(msg.sender) {

    using Strings for uint256;

    bool public paused = false;
    string public baseURI;
    string public baseExtension = ".json";
    uint public maxMintAmount = 5;
    uint public maxSupply = 1000;
    uint public cost = 0.01 ether;

    struct TokenMetadata {
        string title;
        string description;
        string image;
    }

    mapping(uint256 => TokenMetadata) private _tokenMetadata;

    constructor() ERC721("DevNft", "DNFT") {}

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function mint(address _to, string memory _title, string memory _description, string memory _image) public payable {
        require(!paused, "Contract is paused");
        uint256 supply = totalSupply();
        require(supply + 1 <= maxSupply, "Max supply exceeded");

        if (msg.sender != owner()) {
            require(msg.value >= cost, "Insufficient funds");
        }

        uint256 tokenId = supply + 1;
        _safeMint(_to, tokenId);
        _setTokenMetadata(tokenId, _title, _description, _image);
    }

    function _setTokenMetadata(uint256 tokenId, string memory _title, string memory _description, string memory _image) internal virtual {
        _tokenMetadata[tokenId] = TokenMetadata(_title, _description, _image);
    }

    function tokenMetadata(uint256 tokenId) public view returns (TokenMetadata memory) {
        require(ownerOf(tokenId) != address(0), "ERC721Metadata: Metadata query for nonexistent token");
        return _tokenMetadata[tokenId];
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");

        TokenMetadata memory metadata = _tokenMetadata[tokenId];
        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "', metadata.title, '",',
            '"description": "', metadata.description, '",',
            '"image": "', metadata.image, '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

   

    function tokensOwned(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }


    function setmaxMintAmount(uint256 _newmaxMintAmount) public onlyOwner {
        maxMintAmount = _newmaxMintAmount;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function pause(bool _state) public onlyOwner {
        paused = _state;
    }

    function withdraw() public payable onlyOwner {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Transfer failed");
}
}
library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        // load the table into memory
        string memory table = string(TABLE);

        // multiply by 4/3 rounded up
        uint256 encodedLen = 4 * ((data.length + 2) / 3);

        // add some extra buffer at the end
        string memory result = new string(encodedLen + 32);

        assembly {
            // set the actual output length
            mstore(result, encodedLen)

            // prepare the lookup table
            let tablePtr := add(table, 1)

            // input ptr
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))

            // result ptr, jump over length
            let resultPtr := add(result, 32)

            // run over the input, 3 bytes at a time
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(18, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(12, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(shr(6, input), 0x3F)))))
                resultPtr := add(resultPtr, 1)
                mstore(resultPtr, shl(248, mload(add(tablePtr, and(input, 0x3F)))))
                resultPtr := add(resultPtr, 1)
            }

            // padding with '='
            switch mod(mload(data), 3)
            case 1 {
                mstore(sub(resultPtr, 2), shl(240, 0x3d3d))
            }
            case 2 {
                mstore(sub(resultPtr, 1), shl(248, 0x3d))
            }
        }

        return result;
    }
}
