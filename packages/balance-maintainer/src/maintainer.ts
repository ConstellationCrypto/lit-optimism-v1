import { TransactionResponse } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { predeploys } from "@constellation-labs/contracts";
import dotenv from "dotenv";

import {
  isNonDescending,
  getBalance,
  getFPEBalance,
  sendFundIfNeeded,
  publishToSNSTopic,
  maintainBalanceWithinRange,
  minWithdrawalAmountFeeVault,
  withdrawFromFeeVault,
  minWithdrawalAmountFpeOracle,
  withdrawFromFpeOracle,
  waitAndFinalize,
} from "./helpers";

// Load environment variables from .env
dotenv.config();
const {
  L1_URL,
  L1_ADDRESS_ENDPOINTS,
  BATCH_SUBMITTER_SEQUENCER_ADDRESSES,
  BATCH_SUBMITTER_PROPOSER_ADDRESSES,
  BATCH_SUBMITTER_MIN_BALANCE,
  BATCH_SUBMITTER_TARGET_BALANCE,

  L1_FEE_WALLET_ADDRESS,
  L1_FEE_WALLET_PRIVATE_KEY,
  L1_FEE_WALLET_MIN_BALANCE,
  L1_FEE_WALLET_MAX_BALANCE,
  L1_FEE_WALLET_TARGET_BALANCE,

  L1_COLD_WALLET_ADDRESS,

  L2_URLS,
  L2_GPO_OWNER_PRIVATE_KEYS,
} = process.env;

// Handles the workflow of wallet balance maintenance
// It operates on L2 first to withdraw funds to L1, before operating on L1
export const main = async () => {
  validateEnvs();

  // L1
  const l1Provider = new ethers.providers.JsonRpcProvider(L1_URL);
  const l1Wallet = new ethers.Wallet(L1_FEE_WALLET_PRIVATE_KEY, l1Provider);

  // Read from envs
  const l2URLs = L2_URLS.split(",");
  const addressEndpoints = L1_ADDRESS_ENDPOINTS.split(",");
  const l2WalletPrivateKeys = L2_GPO_OWNER_PRIVATE_KEYS.split(",");
  const length = l2URLs.length;

  // Then parse them
  const l2Providers = await Promise.all(
    l2URLs.map(async (l2URL) => {
      return new ethers.providers.JsonRpcProvider(l2URL);
    })
  );
  const l2Wallets = await Promise.all(
    l2WalletPrivateKeys.map(async (privateKey, i) => {
      return new ethers.Wallet(privateKey, l2Providers[i]);
    })
  );

  // maintain l1 batch submitter
  const sequencerAddresses = BATCH_SUBMITTER_SEQUENCER_ADDRESSES.split(",");
  const proposerAddresses = BATCH_SUBMITTER_PROPOSER_ADDRESSES.split(",");
  const addresses = sequencerAddresses.concat(proposerAddresses);
  for (const recipient of addresses) {
    try {
      await sendFundIfNeeded(
        l1Provider,
        l1Wallet,
        recipient,
        parseEther(BATCH_SUBMITTER_MIN_BALANCE),
        parseEther(BATCH_SUBMITTER_TARGET_BALANCE)
      );
    } catch (e) {
      console.error(
        "Error when handling batch submitter address " +
          recipient +
          ", error: " +
          e.message
      );
    }
  }

  // Make sure L1 fee wallet's balance is within the range by interacting with cold wallet
  try {
    await maintainBalanceWithinRange(
      l1Provider,
      l1Wallet,
      L1_COLD_WALLET_ADDRESS,
      parseEther(L1_FEE_WALLET_MIN_BALANCE),
      parseEther(L1_FEE_WALLET_TARGET_BALANCE),
      parseEther(L1_FEE_WALLET_MAX_BALANCE),
      publishToSNSTopic
    );
  } catch (e) {
    console.error("Error when handling l1 fee vault: " + e.message);
  }

  // Handle withdrawals in each deployment in parallel
  const feeVaultWithdrawalTxs: TransactionResponse[] = new Array(length);
  const FpeWithdrawalTxs: TransactionResponse[] = new Array(length);
  Array.apply(null, Array(length)).forEach(async (_, i) => {
    // L2 OVM_SequencerFeeVault
    try {
      // get OVM_SequencerFeeVault MIN_WITHDRAWAL_AMOUNT
      const MIN_WITHDRAWAL_AMOUNT = await minWithdrawalAmountFeeVault(
        l2Providers[i]
      );
      console.info(
        "OVM_SequencerFeeVault MIN_WITHDRAWAL_AMOUNT is: " +
          ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT)
      );

      // get OVM_SequencerFeeVault's balance
      const balance = await getBalance(
        l2Providers[i],
        predeploys.OVM_SequencerFeeVault
      );
      console.info(
        "OVM_SequencerFeeVault balance: " + ethers.utils.formatEther(balance)
      );

      // Compare and withdraw if needed
      if (balance.gt(MIN_WITHDRAWAL_AMOUNT)) {
        console.info(
          "OVM_SequencerFeeVault balance: " +
            ethers.utils.formatEther(balance) +
            " is greater than MIN_WITHDRAWAL_AMOUNT: " +
            ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT)
        );
        console.info("OVM_SequencerFeeVault withdrawing");

        const tx = await withdrawFromFeeVault(l2Wallets[i]);
        feeVaultWithdrawalTxs[i] = tx;
      } else {
        console.info(
          "OVM_SequencerFeeVault balance: " +
            ethers.utils.formatEther(balance) +
            " is less than MIN_WITHDRAWAL_AMOUNT: " +
            ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT) +
            ", no action is needed"
        );
      }
    } catch (e) {
      console.error("OVM_SequencerFeeVault withdrawal error: " + e.message);
    }

    // L2 FPE_GasPriceOracle
    try {
      // get MIN_WITHDRAWAL_AMOUNT
      const MIN_WITHDRAWAL_AMOUNT = await minWithdrawalAmountFpeOracle(
        l2Providers[i]
      );
      console.info(
        "FPE_GasPriceOracle MIN_WITHDRAWAL_AMOUNT is: " +
          ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT)
      );

      // get FPE_GasPriceOracle's FPE balance
      const balance = await getFPEBalance(
        l2Providers[i],
        predeploys.FPE_GasPriceOracle
      );
      console.info(
        "FPE_GasPriceOracle balance: " + ethers.utils.formatEther(balance)
      );

      // Compare and withdraw if needed
      if (balance.gt(MIN_WITHDRAWAL_AMOUNT)) {
        console.info(
          "FPE_GasPriceOracle balance: " +
            ethers.utils.formatEther(balance) +
            " is greater than MIN_WITHDRAWAL_AMOUNT: " +
            ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT)
        );
        console.info("FPE_GasPriceOracle withdrawing");
        const tx = await withdrawFromFpeOracle(l2Wallets[i]);
        FpeWithdrawalTxs[i] = tx;
      } else {
        console.info(
          "Balance: " +
            ethers.utils.formatEther(balance) +
            " is less than MIN_WITHDRAWAL_AMOUNT: " +
            ethers.utils.formatEther(MIN_WITHDRAWAL_AMOUNT) +
            ", no action is needed"
        );
      }
    } catch (e) {
      console.error("FPE_GasPriceOracle withdrawal error: " + e.message);
    }
  });

  try {
    await waitAndFinalize(
      feeVaultWithdrawalTxs.concat(FpeWithdrawalTxs),
      l1Wallet,
      l2Wallets,
      addressEndpoints
    );
  } catch (e) {
    console.error("waitAndFinalize error: ", e.message);
  }
};

const validateEnvs = () => {
  // Make sure they are all present
  if (!L1_URL) {
    throw new Error("L1_URL is required");
  }
  if (!L1_ADDRESS_ENDPOINTS) {
    throw new Error("L1_ADDRESS_ENDPOINTS is required");
  }
  if (!BATCH_SUBMITTER_SEQUENCER_ADDRESSES) {
    throw new Error("BATCH_SUBMITTER_SEQUENCER_ADDRESSES is required");
  }
  if (!BATCH_SUBMITTER_PROPOSER_ADDRESSES) {
    throw new Error("BATCH_SUBMITTER_PROPOSER_ADDRESSES is required");
  }
  if (!BATCH_SUBMITTER_MIN_BALANCE) {
    throw new Error("BATCH_SUBMITTER_MIN_BALANCE is required");
  }
  if (!BATCH_SUBMITTER_TARGET_BALANCE) {
    throw new Error("BATCH_SUBMITTER_TARGET_BALANCE is required");
  }
  if (
    !isNonDescending(
      +BATCH_SUBMITTER_MIN_BALANCE,
      +BATCH_SUBMITTER_TARGET_BALANCE
    )
  ) {
    throw new Error(
      "BATCH_SUBMITTER_TARGET_BALANCE should be greater than BATCH_SUBMITTER_MIN_BALANCE"
    );
  }

  if (!L1_FEE_WALLET_ADDRESS) {
    throw new Error("L1_FEE_VAULT_ADDRESS is required");
  }
  if (!L1_FEE_WALLET_PRIVATE_KEY) {
    throw new Error("L1_FEE_VAULT_PRIVATE_KEY is required");
  }
  if (!L1_FEE_WALLET_MIN_BALANCE) {
    throw new Error("L1_FEE_VAULT_MIN_BALANCE is required");
  }
  if (!L1_FEE_WALLET_MAX_BALANCE) {
    throw new Error("L1_FEE_VAULT_MAX_BALANCE is required");
  }
  if (!L1_FEE_WALLET_TARGET_BALANCE) {
    throw new Error("L1_FEE_VAULT_TARGET_BALANCE is required");
  }
  if (
    !isNonDescending(
      +L1_FEE_WALLET_MIN_BALANCE,
      +L1_FEE_WALLET_TARGET_BALANCE,
      +L1_FEE_WALLET_MAX_BALANCE
    )
  ) {
    throw new Error(
      "Expected L1_FEE_VAULT_MIN_BALANCE <= L1_FEE_VAULT_TARGET_BALANCE <= L1_FEE_VAULT_MAX_BALANCE"
    );
  }

  if (!L1_COLD_WALLET_ADDRESS) {
    throw new Error("L1_COLD_WALLET_ADDRESS is required");
  }

  if (!L2_URLS) {
    throw new Error("L2_URLS is required");
  }
  if (!L2_GPO_OWNER_PRIVATE_KEYS) {
    throw new Error("L2_GPO_OWNER_PRIVATE_KEY is required");
  }

  // These envs must have the same length
  const l2Urls = L2_URLS.split(",");
  const addressEndpoints = L1_ADDRESS_ENDPOINTS.split(",");
  const sequencerAddresses = BATCH_SUBMITTER_SEQUENCER_ADDRESSES.split(",");
  const proposerAddresses = BATCH_SUBMITTER_PROPOSER_ADDRESSES.split(",");
  const gpoOwners = L2_GPO_OWNER_PRIVATE_KEYS.split(",");

  if (
    l2Urls.length !== addressEndpoints.length ||
    l2Urls.length !== sequencerAddresses.length ||
    l2Urls.length !== proposerAddresses.length ||
    l2Urls.length !== gpoOwners.length
  ) {
    throw new Error(
      "Invalid env var: length of L2_URLS, BATCH_SUBMITTER_SEQUENCER_ADDRESSES, BATCH_SUBMITTER_PROPOSER_ADDRESSES, L2_GPO_OWNER_PRIVATE_KEY should be equivalent"
    );
  }
};

main().catch((error: any) => {
  console.error(error);
  process.exitCode = 1;
});
