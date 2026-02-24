// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is Ownable(msg.sender), AccessControl, ReentrancyGuard, ChainlinkClient {
    using Chainlink for Chainlink.Request;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    uint256 private constant ORACLE_PAYMENT = 1 * 10**18;
    uint256 public ethPrice;
    uint256 public listingFee = 0.01 ether;
    uint256 private constant DECIMALS = 18;
    uint256 private constant SCALING_FACTOR = 10 ** DECIMALS;

    ERC721Enumerable public nftCollection;

    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        address arbiter;
        uint256 listingTime;
        bool isSold;
    }

    Listing[] public listings;
    mapping(uint256 => uint256) public tokenIdToListingIndex;
    mapping(address => uint256) public sellerEarnings;

    address private oracle;
    bytes32 private jobId;
    uint256 private fee;

    // ================= INDEXED EVENTS (CRITICAL FOR FRONTEND)
    event RequestEthPrice(bytes32 indexed requestId, uint256 price);
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, address arbiter);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 priceETH);
    event DisputeRaised(uint256 indexed tokenId, address arbiter);
    event SaleFinalized(uint256 indexed tokenId, address seller);
    event EthPriceUpdated(uint256 ethPrice);
    event RequestSent(bytes32 indexed requestId);

    constructor(address _nftCollection) {
        _setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        _setChainlinkOracle(0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD);
        jobId = "ca98366cc7314957b8c012c72f05aeeb";
        fee = (1 * LINK_DIVISIBILITY) / 10;
        nftCollection = ERC721Enumerable(_nftCollection);
    }

    // =====================================================
    // LIST NFT
    // =====================================================
    function listNFT(uint256 tokenId, uint256 priceUSD, address arbiter) public payable nonReentrant {
        require(msg.value == listingFee, "Listing fee required");
        require(nftCollection.ownerOf(tokenId) == msg.sender, "Only owner can list");
        require(
            nftCollection.isApprovedForAll(msg.sender, address(this)) ||
            nftCollection.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        require(ethPrice > 0, "ETH price not available yet");

        if (!nftCollection.isApprovedForAll(msg.sender, address(this))) {
            nftCollection.approve(address(this), tokenId);
        }

        /** * FIX: Multiplying by 1e18 twice (once for USD decimals, once for Wei scaling) 
         * ensures the result is correctly scaled as 18-decimal Wei. 
         */
        uint256 priceETH = (priceUSD * 1e18 * SCALING_FACTOR) / ethPrice;

        tokenIdToListingIndex[tokenId] = listings.length;
        listings.push(Listing(tokenId, msg.sender, priceETH, arbiter, block.timestamp, false));

        nftCollection.transferFrom(msg.sender, address(this), tokenId);

        emit NFTListed(tokenId, msg.sender, priceETH, arbiter);
    }

    // =====================================================
    // BUY NFT (KEEPS LISTING FOR ANALYTICS)
    // =====================================================
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        uint256 index = tokenIdToListingIndex[tokenId];
        Listing storage listing = listings[index];

        require(!listing.isSold, "NFT already sold");
        require(msg.value >= listing.price, "Insufficient ETH sent");

        uint256 commission = (msg.value * 10) / 100;
        uint256 sellerAmount = msg.value - commission;

        sellerEarnings[listing.seller] += sellerAmount;
        payable(listing.seller).transfer(sellerAmount);
        payable(owner()).transfer(commission);

        // Mark as sold and update time to start the 24-hour dispute clock
        listing.isSold = true;
        listing.listingTime = block.timestamp;

        nftCollection.transferFrom(address(this), msg.sender, tokenId);

        emit NFTSold(tokenId, listing.seller, msg.sender, msg.value);
    }

    // =====================================================
    // FINALIZE SALE (CLEANS STATE AFTER DISPUTE WINDOW)
    // =====================================================
    function finalizeSale(uint256 tokenId) public {
        uint256 index = tokenIdToListingIndex[tokenId];
        require(listings.length > index && listings[index].tokenId == tokenId, "Listing index mismatch");
        Listing storage listing = listings[index];

        require(listing.isSold, "NFT not sold");
        require(block.timestamp > listing.listingTime + 1 days, "Dispute period not over");

        address seller = listing.seller;
        _removeListing(tokenId);

        emit SaleFinalized(tokenId, seller);
    }

    // =====================================================
    // REVERT LISTING
    // =====================================================
    function revertListing(uint tokenId) public nonReentrant {
        uint256 index = tokenIdToListingIndex[tokenId];
        require(listings[index].seller == msg.sender, "Not authorized");

        nftCollection.transferFrom(address(this), msg.sender, tokenId);
        _removeListing(tokenId);
    }

    // =====================================================
    // INTERNAL REMOVE (SWAP & POP)
    // =====================================================
    function _removeListing(uint256 tokenId) internal {
        uint256 index = tokenIdToListingIndex[tokenId];
        uint256 lastIndex = listings.length - 1;

        if (index != lastIndex) {
            Listing storage lastListing = listings[lastIndex];
            listings[index] = lastListing;
            tokenIdToListingIndex[lastListing.tokenId] = index;
        }

        listings.pop();
        delete tokenIdToListingIndex[tokenId];
    }

    // =====================================================
    // CHAINLINK ORACLE LOGIC (KEPT INTACT)
    // =====================================================
    function reqEthPrice() public returns (bytes32 requestId) {
        Chainlink.Request memory request =
            _buildChainlinkRequest(jobId, address(this), this.fulfill.selector);

        request._add("get", "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD");
        request._add("path", "RAW,ETH,USD,PRICE");

        int256 timesAmount = 10 ** 18;
        request._addInt("times", timesAmount);

        emit RequestSent(requestId);
        return _sendChainlinkRequest(request, fee);
    }

    function fulfill(bytes32 _requestId, uint256 _ethPrice)
        public
        recordChainlinkFulfillment(_requestId)
    {
        emit RequestEthPrice(_requestId, _ethPrice);
        ethPrice = _ethPrice;
        emit EthPriceUpdated(_ethPrice);
    }

    // =====================================================
    // VIEW FUNCTIONS
    // =====================================================
    function getSellerNftListigs() public view returns (Listing[] memory) {
        uint count = 0;
        for (uint i = 0; i < listings.length; i++) {
            if (listings[i].seller == msg.sender) count++;
        }

        Listing[] memory sellerListings = new Listing[](count);
        uint idx = 0;
        for (uint i = 0; i < listings.length; i++) {
            if (listings[i].seller == msg.sender) {
                sellerListings[idx] = listings[i];
                idx++;
            }
        }
        return sellerListings;
    }

    function getNftListigs() public view returns (Listing[] memory) {
        return listings;
    }

    function getSellerEarnings(address seller) public view returns (uint256) {
        return sellerEarnings[seller];
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}
}