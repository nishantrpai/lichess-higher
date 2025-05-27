import { expect } from "chai";
import { ethers } from "hardhat";

describe("Lichess Wager System", function () {
  // Simple test to start
  it("Should deploy the contracts correctly", async function () {
    const [deployer] = await ethers.getSigners();
    
    // Deploy LichessWager contract
    const LichessWager = await ethers.getContractFactory("LichessWager");
    const lichessWager = await LichessWager.deploy(deployer.address);
    
    const lichessWagerAddress = await lichessWager.getAddress();
    
    // Deploy LichessOracle contract
    const LichessOracle = await ethers.getContractFactory("LichessOracle");
    const lichessOracle = await LichessOracle.deploy(lichessWagerAddress);
    
    const lichessOracleAddress = await lichessOracle.getAddress();
    
    // Check if the contracts were deployed correctly
    expect(await lichessWager.oracle()).to.equal(deployer.address);
    expect(await lichessWager.owner()).to.equal(deployer.address);
    
    expect(await lichessOracle.wagerContract()).to.equal(lichessWagerAddress);
    expect(await lichessOracle.owner()).to.equal(deployer.address);
    expect(await lichessOracle.operators(deployer.address)).to.be.true;
  });
});
