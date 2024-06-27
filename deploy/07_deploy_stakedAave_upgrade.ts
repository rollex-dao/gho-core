import { DeployFunction } from 'hardhat-deploy/types';
import { StakedTokenV3Rev3__factory, STAKE_REX_PROXY, waitForTx } from '@pollum-io/lending-deploy';

const func: DeployFunction = async function ({ getNamedAccounts, deployments, ...hre }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const [deployerSigner] = await hre.ethers.getSigners();

  const stkRexProxy = await deployments.get(STAKE_REX_PROXY);
  const instance = StakedTokenV3Rev3__factory.connect(stkRexProxy.address, deployerSigner);

  const stakedAaveImpl = await deploy('StakedREXV3Impl', {
    from: deployer,
    contract: 'StakedREXV3',
    args: [
      await instance.STAKED_TOKEN(),
      await instance.REWARD_TOKEN(),
      await instance.UNSTAKE_WINDOW(),
      await instance.REWARDS_VAULT(),
      await instance.EMISSION_MANAGER(),
      '3153600000', // 100 years from the time of deployment
    ],
    log: true,
  });
  console.log(`stakedAaveImpl Logic:         ${stakedAaveImpl.address}`);
};

func.id = 'StkRexUpgrade';
func.tags = ['StkRexUpgrade', 'full_gho_deploy'];

export default func;
