import { task } from 'hardhat/config';

import { ghoEntityConfig } from '../../helpers/config';
import { getAaveProtocolDataProvider } from '@pollum-io/lending-deploy';
import { GhoToken } from '../../types';

task('add-gho-as-entity', 'Adds Aave as a gho entity').setAction(async (_, hre) => {
  const { ethers } = hre;

  const gho = (await ethers.getContract('GhoToken')) as GhoToken;
  const rexDataProvider = await getAaveProtocolDataProvider();

  const tokenProxyAddresses = await rexDataProvider.getReserveTokensAddresses(gho.address);

  const [deployer] = await hre.ethers.getSigners();

  const addEntityTx = await gho
    .connect(deployer)
    .addFacilitator(
      tokenProxyAddresses.aTokenAddress,
      ghoEntityConfig.label,
      ghoEntityConfig.mintLimit
    );
  const addEntityTxReceipt = await addEntityTx.wait();

  const newEntityEvents = addEntityTxReceipt.events?.find((e) => e.event === 'FacilitatorAdded');

  if (newEntityEvents?.args) {
    console.log(`Address added as a facilitator: ${JSON.stringify(newEntityEvents.args[0])}`);
  } else {
    throw new Error(
      `Error when adding facilitator. Check tx ${addEntityTxReceipt.transactionHash}`
    );
  }
});
