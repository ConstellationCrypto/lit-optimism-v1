export type DeployConfigSpec<
  TDeployConfig extends {
    [key: string]: any
  }
> = {
  [K in keyof TDeployConfig]: any
}
