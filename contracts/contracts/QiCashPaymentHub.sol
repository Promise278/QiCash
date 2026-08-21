// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {QiCashAccessControl} from "./access/QiCashAccessControl.sol";
import {IQiCashVendorRegistry} from "./interfaces/IQiCashVendorRegistry.sol";
import {QuaiAddress} from "./libraries/QuaiAddress.sol";

contract QiCashPaymentHub is QiCashAccessControl {
    using QuaiAddress for address;


    // Domain tag binding a commitment to QiCash's invoice scheme.
    bytes32 public constant COMMIT_DOMAIN = keccak256("QiCash:InvoiceCommitment:v1");

    // Domain tag for sealed payment references.
    bytes32 public constant SEAL_DOMAIN = keccak256("QiCash:SealedPaymentRef:v1");

    // QI exposes 16 fixed denominations, indexed 0-15.
    uint8 public constant MAX_DENOMINATION_INDEX = 15;

    enum InvoiceStatus {
        None,
        Open,
        Settled,
        Cancelled,
        Disputed,
        Refunded,
        DisputeRejected,
        ArbitrationExpired
    }

    // Why an app should or should not let the user pay. Returned rather than reverted so the client can explain the refusal to the user. A revert string is both harder to decode in React Native and useless for telling "forged QR" apart from "expired".
    enum VerificationResult {
        Payable,
        InvoiceNotFound,
        VendorNotActive,
        InvoiceNotOpen,
        InvoiceExpired,
        InvalidQiPayoutAddress,
        InvalidDenomination,
        ExpiryMismatch
    }

    // The full commitment preimage, exactly as encoded in the QR code.
    struct PaymentRequest {
        bytes32 vendorId;
        address qiPayoutAddress;
        uint256 amount;
        uint8 denomination;
        bytes32 salt;
        uint40 expiresAt;
    }

    // Packed into a single storage slot: 20 + 1 + 5 + 5 = 31 bytes. `vendorId` is deliberately absent every caller must already know it to derive the storage key, so storing it would waste a slot on the hottest write path in the system (one per campus purchase).
    struct Invoice {
        address complainant;
        InvoiceStatus status;
        uint40 expiresAt;
        uint40 statusChangedAt;
        bytes32 sealedPaymentRef;
    }

    struct VendorStats {
        uint64 invoicesCreated;
        uint64 settlementsAttested;
        uint64 disputesOpened;
        uint64 disputesUpheld;
    }

    // Vendor registry consulted for authorization. Immutable: a swappable registry would let an admin repoint the root of trust and retroactively legitimise arbitrary vendors. Migration means deploying a new hub, which is visible to everyone.
    IQiCashVendorRegistry public immutable registry;

    // keccak256(abi.encode(vendorId, commitment)) => Invoice.
    mapping(bytes32 => Invoice) private _invoices;

    mapping(bytes32 => VendorStats) private _stats;

    // Upper bound on how far ahead an invoice may expire.
    uint40 public maxInvoiceTtl;

    // How long after expiry/settlement a dispute may still be opened.
    uint40 public disputeWindow;

    // How long after a dispute is opened the arbiter has to rule before anyone may close it as `ArbitrationExpired`. Prevents an inactive or captured arbiter from locking an invoice in `Disputed` forever.
    uint40 public arbitrationDeadline;

    uint40 public constant MIN_INVOICE_TTL = 1 minutes;
    uint40 public constant MAX_INVOICE_TTL_LIMIT = 1 days;
    uint40 public constant MIN_DISPUTE_WINDOW = 1 hours;
    uint40 public constant MAX_DISPUTE_WINDOW = 30 days;
    uint40 public constant MIN_ARBITRATION_DEADLINE = 1 days;
    uint40 public constant MAX_ARBITRATION_DEADLINE = 90 days;

    event InvoiceCreated(
        bytes32 indexed vendorId,
        bytes32 indexed commitment,
        bytes32 indexed invoiceKey,
        uint40 expiresAt,
        uint40 createdAt
    );
    event InvoiceCancelled(bytes32 indexed vendorId, bytes32 indexed invoiceKey);
    event SettlementAttested(
        bytes32 indexed vendorId,
        bytes32 indexed invoiceKey,
        bytes32 sealedPaymentRef
    );
    event DisputeOpened(
        bytes32 indexed vendorId,
        bytes32 indexed invoiceKey,
        address indexed complainant,
        bytes32 reasonHash
    );
    event DisputeResolved(
        bytes32 indexed vendorId,
        bytes32 indexed invoiceKey,
        address indexed arbiter,
        bool upheld,
        bytes32 resolutionHash
    );
    event MaxInvoiceTtlUpdated(uint40 previous, uint40 current);
    event DisputeWindowUpdated(uint40 previous, uint40 current);
    event ArbitrationDeadlineUpdated(uint40 previous, uint40 current);
    event DisputeExpired(
        bytes32 indexed vendorId,
        bytes32 indexed invoiceKey,
        address indexed closedBy
    );

    error ZeroRegistry();
    error ZeroCommitment();
    error InvoiceAlreadyExists(bytes32 invoiceKey);
    error InvoiceMissing(bytes32 invoiceKey);
    error InvoiceNotOpenError(bytes32 invoiceKey, InvoiceStatus status);
    error InvoiceNotDisputable(bytes32 invoiceKey, InvoiceStatus status);
    error InvoiceNotDisputed(bytes32 invoiceKey, InvoiceStatus status);
    error ExpiryInPast(uint40 expiresAt, uint256 now_);
    error ExpiryTooFar(uint40 expiresAt, uint40 maxAllowed);
    error DisputeWindowClosed(uint40 deadline, uint256 now_);
    error CommitmentMismatch(bytes32 expected, bytes32 provided);
    error ZeroPaymentRef();
    error ZeroReasonHash();
    error VendorNotRecognised(address caller);
    error VendorRevokedOrUnknown(address caller);
    error TtlOutOfBounds(uint40 value);
    error DisputeWindowOutOfBounds(uint40 value);
    error ArbitrationDeadlineOutOfBounds(uint40 value);
    error DisputeAlreadyExpired(bytes32 invoiceKey);
    error ArbiterIsComplainant(address arbiter);
    error ArbiterRepresentsVendor(bytes32 vendorId);

    constructor( address initialAdmin, uint8 zone_, IQiCashVendorRegistry registry_, uint40 maxInvoiceTtl_, uint40 disputeWindow_, uint40 arbitrationDeadline_ ) QiCashAccessControl(initialAdmin, zone_) {
        if (address(registry_) == address(0)) revert ZeroRegistry();
        address(registry_).requireQuaiLedgerInZone(zone_);
        registry = registry_;
        _setMaxInvoiceTtl(maxInvoiceTtl_);
        _setDisputeWindow(disputeWindow_);
        _setArbitrationDeadline(arbitrationDeadline_);
    }

    function computeCommitment(PaymentRequest calldata req) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    COMMIT_DOMAIN,
                    block.chainid,
                    address(this),
                    req.vendorId,
                    req.qiPayoutAddress,
                    req.amount,
                    req.denomination,
                    req.salt,
                    req.expiresAt
                )
            );
    }

    /// function is a Storage key for an invoice. Namespaced by vendor see defence (2).
    function invoiceKey(bytes32 vendorId, bytes32 commitment) public pure returns (bytes32) {
        return keccak256(abi.encode(vendorId, commitment));
    }

    /// function Sealed payment reference committed at settlement.
    function computeSealedPaymentRef(
        bytes32 commitment,
        bytes32 qiTxHash,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(SEAL_DOMAIN, commitment, qiTxHash, salt));
    }

    function createInvoice( bytes32 commitment, uint40 expiresAt ) external whenNotPaused returns (bytes32 key) {
        if (commitment == bytes32(0)) revert ZeroCommitment();

        bytes32 vendorId = registry.resolveActiveVendor(msg.sender);

        if (expiresAt <= block.timestamp) revert ExpiryInPast(expiresAt, block.timestamp);
        uint40 maxAllowed = uint40(block.timestamp) + maxInvoiceTtl;
        if (expiresAt > maxAllowed) revert ExpiryTooFar(expiresAt, maxAllowed);

        key = invoiceKey(vendorId, commitment);
        Invoice storage invoice = _invoices[key];
        if (invoice.status != InvoiceStatus.None) revert InvoiceAlreadyExists(key);

        invoice.status = InvoiceStatus.Open;
        invoice.expiresAt = expiresAt;
        invoice.statusChangedAt = uint40(block.timestamp);

        _bump(vendorId, StatField.Created);

        emit InvoiceCreated(vendorId, commitment, key, expiresAt, uint40(block.timestamp));
    }

    // function Voids an unpaid invoice  the student walked away. Prevents an abandoned but still-valid QR from being paid later.
    function cancelInvoice(bytes32 commitment) external {
        bytes32 vendorId = _requireSettlingVendor(msg.sender);
        bytes32 key = invoiceKey(vendorId, commitment);
        Invoice storage invoice = _invoices[key];

        if (invoice.status != InvoiceStatus.Open) {
            revert InvoiceNotOpenError(key, invoice.status);
        }

        invoice.status = InvoiceStatus.Cancelled;
        invoice.statusChangedAt = uint40(block.timestamp);

        emit InvoiceCancelled(vendorId, key);
    }

    // function Records that the vendor received the QI payment.
    function attestSettlement(bytes32 commitment, bytes32 sealedPaymentRef) external {
        if (sealedPaymentRef == bytes32(0)) revert ZeroPaymentRef();

        bytes32 vendorId = _requireSettlingVendor(msg.sender);
        bytes32 key = invoiceKey(vendorId, commitment);
        Invoice storage invoice = _invoices[key];

        if (invoice.status != InvoiceStatus.Open) {
            revert InvoiceNotOpenError(key, invoice.status);
        }

        invoice.status = InvoiceStatus.Settled;
        invoice.statusChangedAt = uint40(block.timestamp);
        invoice.sealedPaymentRef = sealedPaymentRef;

        _bump(vendorId, StatField.Settled);

        emit SettlementAttested(vendorId, key, sealedPaymentRef);
    }

    //  function Opens a dispute against an invoice.
    function openDispute( PaymentRequest calldata req, bytes32 reasonHash ) external returns (bytes32 key) {
        if (reasonHash == bytes32(0)) revert ZeroReasonHash();

        bytes32 commitment = computeCommitment(req);
        key = invoiceKey(req.vendorId, commitment);
        Invoice storage invoice = _invoices[key];

        InvoiceStatus status = invoice.status;
        if (status == InvoiceStatus.None) revert InvoiceMissing(key);
        if (status != InvoiceStatus.Open && status != InvoiceStatus.Settled && status != InvoiceStatus.Cancelled) {
            revert InvoiceNotDisputable(key, status);
        }

        uint40 anchor;
        if (status == InvoiceStatus.Open) {
            anchor = invoice.expiresAt;
        } else {
            anchor = invoice.statusChangedAt;
        }
        uint40 deadline = anchor + disputeWindow;
        if (block.timestamp > deadline) revert DisputeWindowClosed(deadline, block.timestamp);

        invoice.status = InvoiceStatus.Disputed;
        invoice.statusChangedAt = uint40(block.timestamp);
        invoice.complainant = msg.sender;

        _bump(req.vendorId, StatField.Disputed);

        emit DisputeOpened(req.vendorId, key, msg.sender, reasonHash);
    }

    // function is an Arbiter ruling on a dispute. The contract holds no funds, so `upheld` orders no transfer and cannot force one. 
    function resolveDispute( bytes32 vendorId, bytes32 commitment, bool upheld, bytes32 resolutionHash ) external onlyRole(ARBITER_ROLE) {
        bytes32 key = invoiceKey(vendorId, commitment);
        Invoice storage invoice = _invoices[key];

        if (invoice.status != InvoiceStatus.Disputed) {
            revert InvoiceNotDisputed(key, invoice.status);
        }
        if (msg.sender == invoice.complainant) revert ArbiterIsComplainant(msg.sender);
        if (registry.vendorIdOf(msg.sender) == vendorId) revert ArbiterRepresentsVendor(vendorId);

        invoice.status = upheld ? InvoiceStatus.Refunded : InvoiceStatus.DisputeRejected;
        invoice.statusChangedAt = uint40(block.timestamp);

        if (upheld) _bump(vendorId, StatField.Upheld);

        emit DisputeResolved(vendorId, key, msg.sender, upheld, resolutionHash);
    }

    // function Closes a dispute the arbiter failed to rule on in time.
    function expireDispute(bytes32 vendorId, bytes32 commitment) external {
        bytes32 key = invoiceKey(vendorId, commitment);
        Invoice storage invoice = _invoices[key];

        if (invoice.status != InvoiceStatus.Disputed) {
            revert InvoiceNotDisputed(key, invoice.status);
        }
        uint256 deadline = uint256(invoice.statusChangedAt) + arbitrationDeadline;
        if (block.timestamp < deadline) revert DisputeWindowClosed(uint40(deadline), block.timestamp);

        invoice.status = InvoiceStatus.ArbitrationExpired;
        invoice.statusChangedAt = uint40(block.timestamp);

        emit DisputeExpired(vendorId, key, msg.sender);
    }

    // function Checks a revealed QI transaction hash against the sealed reference.
    function verifyPaymentRef( bytes32 vendorId, bytes32 commitment, bytes32 qiTxHash, bytes32 salt ) external view returns (bool) {
        bytes32 stored = _invoices[invoiceKey(vendorId, commitment)].sealedPaymentRef;
        if (stored == bytes32(0)) return false;
        return stored == computeSealedPaymentRef(commitment, qiTxHash, salt);
    }


    // THE function a student's app calls before paying.
    function verifyPaymentRequest( PaymentRequest calldata req ) external view returns (VerificationResult result, bytes32 commitment, bytes32 key) {
        commitment = computeCommitment(req);
        key = invoiceKey(req.vendorId, commitment);

        if (req.denomination > MAX_DENOMINATION_INDEX) {
            return (VerificationResult.InvalidDenomination, commitment, key);
        }
        // A payout address on the wrong ledger is unspendable; a zero address burns the payment. Both are permanent losses, caught before paying.
        if (req.qiPayoutAddress == address(0) || !req.qiPayoutAddress.isQiLedger()) {
            return (VerificationResult.InvalidQiPayoutAddress, commitment, key);
        }

        Invoice storage invoice = _invoices[key];
        if (invoice.status == InvoiceStatus.None) {
            return (VerificationResult.InvoiceNotFound, commitment, key);
        }
        if (invoice.status != InvoiceStatus.Open) {
            return (VerificationResult.InvoiceNotOpen, commitment, key);
        }
        if (req.expiresAt != invoice.expiresAt) {
            return (VerificationResult.ExpiryMismatch, commitment, key);
        }
        if (block.timestamp > invoice.expiresAt) {
            return (VerificationResult.InvoiceExpired, commitment, key);
        }
        if (!registry.isActiveVendor(req.vendorId)) {
            return (VerificationResult.VendorNotActive, commitment, key);
        }

        return (VerificationResult.Payable, commitment, key);
    }


    function getInvoice(bytes32 vendorId, bytes32 commitment) external view returns (Invoice memory) {
        return _invoices[invoiceKey(vendorId, commitment)];
    }

    function getInvoiceByKey(bytes32 key) external view returns (Invoice memory) {
        return _invoices[key];
    }

    function getVendorStats(bytes32 vendorId) external view returns (VendorStats memory) {
        return _stats[vendorId];
    }

    function setMaxInvoiceTtl(uint40 value) external onlyRole(ADMIN_ROLE) {
        _setMaxInvoiceTtl(value);
    }

    function setDisputeWindow(uint40 value) external onlyRole(ADMIN_ROLE) {
        _setDisputeWindow(value);
    }

    function setArbitrationDeadline(uint40 value) external onlyRole(ADMIN_ROLE) {
        _setArbitrationDeadline(value);
    }

    /// function is Bounded so a careless or captured admin cannot set a TTL of zero (bricking payments) or of a year (leaving stale QR codes payable).
    function _setMaxInvoiceTtl(uint40 value) private {
        if (value < MIN_INVOICE_TTL || value > MAX_INVOICE_TTL_LIMIT) {
            revert TtlOutOfBounds(value);
        }
        uint40 previous = maxInvoiceTtl;
        maxInvoiceTtl = value;
        emit MaxInvoiceTtlUpdated(previous, value);
    }

    /// function is Bounded so the dispute window cannot be shrunk to nothing, which  would quietly strip every student of recourse.
    function _setDisputeWindow(uint40 value) private {
        if (value < MIN_DISPUTE_WINDOW || value > MAX_DISPUTE_WINDOW) {
            revert DisputeWindowOutOfBounds(value);
        }
        uint40 previous = disputeWindow;
        disputeWindow = value;
        emit DisputeWindowUpdated(previous, value);
    }

    /// function is Bounded so the arbiter cannot be given a year to sit on a dispute, nor the deadline shrunk to a point where a busy arbiter routinely times out.
    function _setArbitrationDeadline(uint40 value) private {
        if (value < MIN_ARBITRATION_DEADLINE || value > MAX_ARBITRATION_DEADLINE) {
            revert ArbitrationDeadlineOutOfBounds(value);
        }
        uint40 previous = arbitrationDeadline;
        arbitrationDeadline = value;
        emit ArbitrationDeadlineUpdated(previous, value);
    }

    // function Resolves a caller allowed to settle or cancel
    function _requireSettlingVendor(address caller) private view returns (bytes32 vendorId) {
        vendorId = registry.vendorIdOf(caller);
        if (vendorId == bytes32(0)) revert VendorNotRecognised(caller);

        IQiCashVendorRegistry.VendorStatus status = registry.vendorStatus(vendorId);
        if (
            status != IQiCashVendorRegistry.VendorStatus.Active &&
            status != IQiCashVendorRegistry.VendorStatus.Suspended
        ) {
            revert VendorRevokedOrUnknown(caller);
        }
    }

    enum StatField {
        Created,
        Settled,
        Disputed,
        Upheld
    }

    function _bump(bytes32 vendorId, StatField field) private {
        VendorStats storage s = _stats[vendorId];
        if (field == StatField.Created) {
            if (s.invoicesCreated != type(uint64).max) ++s.invoicesCreated;
        } else if (field == StatField.Settled) {
            if (s.settlementsAttested != type(uint64).max) ++s.settlementsAttested;
        } else if (field == StatField.Disputed) {
            if (s.disputesOpened != type(uint64).max) ++s.disputesOpened;
        } else {
            if (s.disputesUpheld != type(uint64).max) ++s.disputesUpheld;
        }
    }
}
