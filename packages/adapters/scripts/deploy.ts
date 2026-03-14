/**
 * Deployment Script — JurisGenieAnchor to Sepolia Testnet
 *
 * Prerequisites:
 *   1. npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers
 *   2. Set environment variables:
 *      - SEPOLIA_RPC_URL (e.g., https://sepolia.infura.io/v3/YOUR_KEY)
 *      - DEPLOYER_PRIVATE_KEY (wallet private key with Sepolia ETH)
 *   3. npx hardhat compile
 *   4. npx hardhat run scripts/deploy.ts --network sepolia
 *
 * For local testing:
 *   npx hardhat run scripts/deploy.ts --network hardhat
 */

// This script is designed for Hardhat but can be run standalone.
// When using Hardhat, it will use the configured network.

interface DeploymentResult {
    contractAddress: string;
    transactionHash: string;
    network: string;
    deployer: string;
    blockNumber: number;
    timestamp: string;
}

async function main(): Promise<DeploymentResult> {
    // Dynamic import for Hardhat environment
    const hre = await import('hardhat');
    const { ethers } = hre;

    const [deployer] = await ethers.getSigners();
    console.log('Deploying JurisGenieAnchor with account:', deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('Account balance:', ethers.formatEther(balance), 'ETH');

    const Factory = await ethers.getContractFactory('JurisGenieAnchor');
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deployTx = contract.deploymentTransaction();

    const result: DeploymentResult = {
        contractAddress: address,
        transactionHash: deployTx?.hash ?? 'unknown',
        network: hre.network.name,
        deployer: deployer.address,
        blockNumber: deployTx?.blockNumber ?? 0,
        timestamp: new Date().toISOString(),
    };

    console.log('\n═══════════════════════════════════════════');
    console.log('JurisGenieAnchor Deployed Successfully');
    console.log('═══════════════════════════════════════════');
    console.log(`  Contract: ${result.contractAddress}`);
    console.log(`  TX Hash:  ${result.transactionHash}`);
    console.log(`  Network:  ${result.network}`);
    console.log(`  Deployer: ${result.deployer}`);
    console.log('═══════════════════════════════════════════\n');

    return result;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

export { main, DeploymentResult };
