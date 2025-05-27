import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Lichess Wager contracts...");

  // First, deploy the Lichess Wager with a temporary oracle address
  // We'll update it with the actual oracle address after we deploy the oracle
  const [deployer] = await ethers.getSigners();
  const tempOracleAddress = deployer.address;

  // Deploy the LichessWager contract
  const LichessWager = await ethers.getContractFactory("LichessWager");
  const lichessWager = await LichessWager.deploy(tempOracleAddress);
  await lichessWager.waitForDeployment();

  const lichessWagerAddress = await lichessWager.getAddress();
  console.log(`LichessWager deployed to: ${lichessWagerAddress}`);

  // Deploy the LichessOracle contract with the wager contract address
  const LichessOracle = await ethers.getContractFactory("LichessOracle");
  const lichessOracle = await LichessOracle.deploy(lichessWagerAddress);
  await lichessOracle.waitForDeployment();

  const lichessOracleAddress = await lichessOracle.getAddress();
  console.log(`LichessOracle deployed to: ${lichessOracleAddress}`);

  // Update the oracle address in the wager contract
  const updateOracleTx = await lichessWager.updateOracle(lichessOracleAddress);
  await updateOracleTx.wait();
  console.log(`Oracle address updated in LichessWager contract to: ${lichessOracleAddress}`);

  console.log("Deployment completed successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
