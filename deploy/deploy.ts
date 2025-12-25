import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedNovaMint = await deploy("NovaMint", {
    from: deployer,
    log: true,
  });

  console.log(`NovaMint contract: `, deployedNovaMint.address);
};
export default func;
func.id = "deploy_novamint"; // id required to prevent reexecution
func.tags = ["NovaMint"];
