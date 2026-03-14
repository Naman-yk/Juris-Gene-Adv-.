// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title JurisGenieAnchor
 * @notice Stores execution hashes on-chain for tamper-evident audit trails.
 * @dev Minimal gas-optimized contract for hash anchoring.
 *
 * Each anchor stores:
 * - executionHash (bytes32): SHA-256 hash of the execution result
 * - timestamp (uint256): block.timestamp at anchoring time
 * - anchorer (address): msg.sender who anchored the hash
 *
 * Emits Anchored event for off-chain indexing.
 */
contract JurisGenieAnchor {

    struct Anchor {
        bytes32 executionHash;
        uint256 timestamp;
        address anchorer;
    }

    /// @notice contractId => list of anchors
    mapping(string => Anchor[]) private anchors;

    /// @notice executionHash => whether it has been anchored
    mapping(bytes32 => bool) public isAnchored;

    /// @notice Emitted when a hash is anchored
    event Anchored(
        string indexed contractId,
        bytes32 indexed executionHash,
        address indexed anchorer,
        uint256 timestamp
    );

    /**
     * @notice Anchors an execution hash for a contract.
     * @param contractId The contract identifier
     * @param executionHash The SHA-256 execution hash (as bytes32)
     */
    function anchor(string calldata contractId, bytes32 executionHash) external {
        require(executionHash != bytes32(0), "JGA: zero hash");
        require(!isAnchored[executionHash], "JGA: already anchored");

        anchors[contractId].push(Anchor({
            executionHash: executionHash,
            timestamp: block.timestamp,
            anchorer: msg.sender
        }));

        isAnchored[executionHash] = true;

        emit Anchored(contractId, executionHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verifies whether an execution hash has been anchored.
     * @param executionHash The hash to verify
     * @return True if the hash has been anchored
     */
    function verify(bytes32 executionHash) external view returns (bool) {
        return isAnchored[executionHash];
    }

    /**
     * @notice Gets the number of anchors for a contract.
     * @param contractId The contract identifier
     * @return The number of anchored hashes
     */
    function getAnchorCount(string calldata contractId) external view returns (uint256) {
        return anchors[contractId].length;
    }

    /**
     * @notice Gets a specific anchor by index.
     * @param contractId The contract identifier
     * @param index The anchor index
     * @return executionHash The anchored hash
     * @return timestamp The anchoring timestamp
     * @return anchorer The address that anchored the hash
     */
    function getAnchor(string calldata contractId, uint256 index) external view returns (
        bytes32 executionHash,
        uint256 timestamp,
        address anchorer
    ) {
        require(index < anchors[contractId].length, "JGA: index out of bounds");
        Anchor storage a = anchors[contractId][index];
        return (a.executionHash, a.timestamp, a.anchorer);
    }
}
