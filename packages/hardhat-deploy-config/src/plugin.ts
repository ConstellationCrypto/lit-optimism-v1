import * as path from 'path'

import { extendEnvironment, extendConfig } from 'hardhat/config'
import {
  HardhatConfig,
  HardhatRuntimeEnvironment,
  HardhatUserConfig,
} from 'hardhat/types'

// From: https://github.com/wighawag/hardhat-deploy/blob/master/src/index.ts#L63-L76
const normalizePath = (
  config: HardhatConfig,
  userPath: string | undefined,
  defaultPath: string
): string => {
  if (userPath === undefined) {
    userPath = path.join(config.paths.root, defaultPath)
  } else {
    if (!path.isAbsolute(userPath)) {
      userPath = path.normalize(path.join(config.paths.root, userPath))
    }
  }
  return userPath
}

export const loadDeployConfig = (hre: HardhatRuntimeEnvironment): any => {
  let config: any
  try {
    config =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require(`${hre.config.paths.deployConfig}/${hre.network.name}.ts`).default
  } catch (err) {
    throw new Error(
      `error while loading deploy config for network: ${hre.network.name}, ${err}`
    )
  }

  return new Proxy(parseDeployConfig(hre, config), {
    get: (target, prop) => {
      if (target.hasOwnProperty(prop)) {
        return target[prop]
      }

      // Explicitly throw if the property is not found since I can't yet figure out a good way to
      // handle the necessary typings.
      throw new Error(
        `property does not exist in deploy config: ${String(prop)}`
      )
    },
  })
}

export const parseDeployConfig = (
  hre: HardhatRuntimeEnvironment,
  config: any
): any => {
  // Create a clone of the config object. Shallow clone is fine because none of the input options
  // are expected to be objects or functions etc.
  const parsed = { ...config }

  for (const [key, spec] of Object.entries(hre.config.deployConfigSpec)) {
    // Make sure the value is defined, or use a default.
    if (parsed[key] === undefined) {
      parsed[key] = spec
    }
  }

  return parsed
}

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.paths.deployConfig = normalizePath(
      config,
      userConfig.paths.deployConfig,
      'deploy-config'
    )
  }
)

extendEnvironment((hre) => {
  hre.deployConfig = loadDeployConfig(hre)
})
