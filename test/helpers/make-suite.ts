import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { tEthereumAddress } from '../../helpers/types';
import { evmSnapshot, evmRevert } from '../../helpers/misc-utils';
import { mintErc20 } from './user-setup';

import {
  AaveOracle,
  AaveProtocolDataProvider,
  GhoAToken,
  GhoDiscountRateStrategy,
  GhoInterestRateStrategy,
  GhoToken,
  GhoOracle,
  GhoVariableDebtToken,
  GhoStableDebtToken,
  Pool,
  IERC20,
  StakedREXV3,
  MintableERC20,
  GhoFlashMinter,
  GhoSteward,
} from '../../types';
import {
  getGhoDiscountRateStrategy,
  getGhoInterestRateStrategy,
  getGhoOracle,
  getGhoToken,
  getGhoAToken,
  getGhoVariableDebtToken,
  getStakedREX,
  getMintableErc20,
  getGhoFlashMinter,
  getGhoSteward,
  getGhoStableDebtToken,
} from '../../helpers/contract-getters';
import {
  getPool,
  getAaveProtocolDataProvider,
  getAaveOracle,
  getACLManager,
  ACLManager,
  Faucet,
  getFaucet,
  getMintableERC20,
  getTestnetReserveAddressFromSymbol,
  STAKE_REX_PROXY,
  TREASURY_PROXY_ID,
} from '@pollum-io/lending-deploy';

declare var hre: HardhatRuntimeEnvironment;

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}

export interface TestEnv {
  deployer: SignerWithAddress;
  poolAdmin: SignerWithAddress;
  emergencyAdmin: SignerWithAddress;
  riskAdmin: SignerWithAddress;
  stkRexWhale: SignerWithAddress;
  aclAdmin: SignerWithAddress;
  users: SignerWithAddress[];
  gho: GhoToken;
  ghoOwner: SignerWithAddress;
  ghoOracle: GhoOracle;
  aToken: GhoAToken;
  stableDebtToken: GhoStableDebtToken;
  variableDebtToken: GhoVariableDebtToken;
  aTokenImplementation: GhoAToken;
  stableDebtTokenImplementation: GhoStableDebtToken;
  variableDebtTokenImplementation: GhoVariableDebtToken;
  interestRateStrategy: GhoInterestRateStrategy;
  discountRateStrategy: GhoDiscountRateStrategy;
  pool: Pool;
  aclManager: ACLManager;
  stakedAave: StakedREXV3;
  rexDataProvider: AaveProtocolDataProvider;
  rexOracle: AaveOracle;
  treasuryAddress: tEthereumAddress;
  weth: MintableERC20;
  usdc: MintableERC20;
  rexToken: IERC20;
  flashMinter: GhoFlashMinter;
  faucetOwner: Faucet;
  ghoSteward: GhoSteward;
}

let HardhatSnapshotId: string = '0x1';
const setHardhatSnapshotId = (id: string) => {
  HardhatSnapshotId = id;
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  poolAdmin: {} as SignerWithAddress,
  emergencyAdmin: {} as SignerWithAddress,
  riskAdmin: {} as SignerWithAddress,
  stkRexWhale: {} as SignerWithAddress,
  aclAdmin: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],
  gho: {} as GhoToken,
  ghoOwner: {} as SignerWithAddress,
  ghoOracle: {} as GhoOracle,
  aToken: {} as GhoAToken,
  stableDebtToken: {} as GhoStableDebtToken,
  variableDebtToken: {} as GhoVariableDebtToken,
  aTokenImplementation: {} as GhoAToken,
  stableDebtTokenImplementation: {} as GhoStableDebtToken,
  variableDebtTokenImplementation: {} as GhoVariableDebtToken,
  interestRateStrategy: {} as GhoInterestRateStrategy,
  discountRateStrategy: {} as GhoDiscountRateStrategy,
  pool: {} as Pool,
  aclManager: {} as ACLManager,
  stakedAave: {} as StakedREXV3,
  rexDataProvider: {} as AaveProtocolDataProvider,
  rexOracle: {} as AaveOracle,
  treasuryAddress: {} as tEthereumAddress,
  weth: {} as MintableERC20,
  usdc: {} as MintableERC20,
  rexToken: {} as IERC20,
  flashMinter: {} as GhoFlashMinter,
  faucetOwner: {} as Faucet,
  ghoSteward: {} as GhoSteward,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, ...restSigners] = await hre.ethers.getSigners();

  console.log('Network:', hre.network.name);

  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }

  testEnv.deployer = deployer;
  testEnv.poolAdmin = deployer;
  testEnv.aclAdmin = deployer;
  testEnv.ghoOwner = deployer;

  // get contracts from gho deployment
  testEnv.gho = await getGhoToken();
  testEnv.ghoOracle = await getGhoOracle();

  testEnv.pool = await getPool();
  testEnv.rexDataProvider = await getAaveProtocolDataProvider();

  testEnv.aclManager = await getACLManager();

  const tokenProxyAddresses = await testEnv.rexDataProvider.getReserveTokensAddresses(
    testEnv.gho.address
  );
  testEnv.aToken = await getGhoAToken(tokenProxyAddresses.aTokenAddress);
  testEnv.stableDebtToken = await getGhoStableDebtToken(tokenProxyAddresses.stableDebtTokenAddress);
  testEnv.variableDebtToken = await getGhoVariableDebtToken(
    tokenProxyAddresses.variableDebtTokenAddress
  );

  testEnv.ghoSteward = await getGhoSteward();

  testEnv.aTokenImplementation = await getGhoAToken();
  testEnv.stableDebtTokenImplementation = await getGhoStableDebtToken();
  testEnv.variableDebtTokenImplementation = await getGhoVariableDebtToken();

  testEnv.interestRateStrategy = await getGhoInterestRateStrategy();
  testEnv.discountRateStrategy = await getGhoDiscountRateStrategy();
  testEnv.rexOracle = await getAaveOracle();

  testEnv.treasuryAddress = (await hre.deployments.get(TREASURY_PROXY_ID)).address;

  testEnv.faucetOwner = await getFaucet();
  testEnv.weth = await getMintableERC20(await getTestnetReserveAddressFromSymbol('WETH'));
  testEnv.usdc = await getMintableERC20(await getTestnetReserveAddressFromSymbol('USDC'));
  testEnv.rexToken = await getMintableErc20(await getTestnetReserveAddressFromSymbol('REX'));

  const userAddresses = testEnv.users.map((u) => u.address);

  await mintErc20(
    testEnv.faucetOwner,
    testEnv.weth.address,
    userAddresses,
    hre.ethers.utils.parseUnits('1000.0', 18)
  );

  await mintErc20(
    testEnv.faucetOwner,
    testEnv.usdc.address,
    userAddresses,
    hre.ethers.utils.parseUnits('100000.0', 18)
  );

  await mintErc20(
    testEnv.faucetOwner,
    testEnv.rexToken.address,
    userAddresses,
    hre.ethers.utils.parseUnits('10.0', 18)
  );

  testEnv.stakedAave = await getStakedREX(
    await (
      await hre.deployments.get(STAKE_REX_PROXY)
    ).address
  );

  testEnv.flashMinter = await getGhoFlashMinter();
}

const setSnapshot = async () => {
  setHardhatSnapshotId(await evmSnapshot());
};

const revertHead = async () => {
  await evmRevert(HardhatSnapshotId);
};

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      await setSnapshot();
    });
    tests(testEnv);
    after(async () => {
      await revertHead();
    });
  });
}
