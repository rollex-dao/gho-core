import { task } from 'hardhat/config';
import {
  getAaveProtocolDataProvider,
  getProxyAdminBySlot,
  STAKE_REX_PROXY,
} from '@pollum-io/lending-deploy';
import { getBaseImmutableAdminUpgradeabilityProxy } from '../../helpers/contract-getters';
import { impersonateAccountHardhat } from '../../helpers/misc-utils';
import { StakedREXV3__factory } from '../../types';

task('upgrade-stkRex', 'Upgrade Staked Aave').setAction(async (_, hre) => {
  const { ethers } = hre;
  const signers = await hre.ethers.getSigners();
  const shortExecutor = '0xee56e2b3d491590b5b31738cc34d5232f378a8d5';

  const gho = await ethers.getContract('GhoToken');
  const rexDataProvider = await getAaveProtocolDataProvider();
  const newStakedREXImpl = await ethers.getContract('StakedREXV3Impl');
  const stkRex = (await hre.deployments.get(STAKE_REX_PROXY)).address;

  const admin = await getProxyAdminBySlot(stkRex);

  const signerAdmin = signers.find(({ address }) => address == admin);
  const [deploySigner] = signers;

  if (!signerAdmin) {
    throw `Error: Signers does not contain the stkRex Admin Address.\nDeployer ${signers[0].address}\nAdmin: ${admin}`;
  }

  const stkRexProxy = (await getBaseImmutableAdminUpgradeabilityProxy(stkRex)).connect(signerAdmin);

  const tokenProxyAddresses = await rexDataProvider.getReserveTokensAddresses(gho.address);
  const ghoVariableDebtTokenAddress = tokenProxyAddresses.variableDebtTokenAddress;
  let instance = StakedREXV3__factory.connect(stkRexProxy.address, deploySigner);

  const stakedAaveEncodedInitialize = newStakedREXImpl.interface.encodeFunctionData('initialize', [
    signerAdmin.address,
    signerAdmin.address,
    signerAdmin.address,
    '0',
    await instance.COOLDOWN_SECONDS(),
  ]);

  const upgradeTx = await stkRexProxy.upgradeToAndCall(
    newStakedREXImpl.address,
    stakedAaveEncodedInitialize
  );
  await upgradeTx.wait();

  instance = await StakedREXV3__factory.connect(
    stkRexProxy.address,
    await impersonateAccountHardhat(shortExecutor)
  );
  await instance.setGHODebtToken(ghoVariableDebtTokenAddress);

  console.log(`stkRex upgradeTx.hash: ${upgradeTx.hash}`);
  console.log(`StkRex implementation set to: ${newStakedREXImpl.address}`);
});
