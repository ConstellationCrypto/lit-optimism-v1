import { TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber, Signer, ethers, Wallet } from "ethers";
import { Provider } from "@ethersproject/providers";
import { predeploys } from "@constellation-labs/contracts";
import { formatEther } from "ethers/lib/utils";
import Artifact_OVM_SequencerFeeVault from "@constellation-labs/contracts/artifacts/contracts/L2/predeploys/OVM_SequencerFeeVault.sol/OVM_SequencerFeeVault.json";
import Artifact_FPE_GPO from "@constellation-labs/contracts/artifacts/contracts/L2/predeploys/FPE_GasPriceOracle.sol/FPE_GasPriceOracle.json";
import Artifact_L2_FPE from "@constellation-labs/contracts/artifacts/contracts/L2/predeploys/L2_FPE.sol/L2_FPE.json";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import {
  CrossChainMessenger,
  initializeMessenger,
  MessageStatus,
} from "@constellation-labs/sdk";

/**
 * Validates that args are in non-descending order.
 *
 * @param args arguments
 * @returns true if args are in non-descending order, false otherwise
 */
export const isNonDescending = (...args: number[]): boolean => {
  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] > args[i + 1]) {
      return false;
    }
  }
  return true;
};

/**
 * Gets the balance of the given account.
 *
 * @param provider provider
 * @param address account address
 * @returns balance corresponding to the given address.
 */
export const getBalance = async (
  provider: Provider,
  address: string
): Promise<BigNumber> => {
  return provider.getBalance(address);
};

/**
 * Gets the FPE balance of the given account.
 *
 * @param provider provider
 * @param address account address
 * @returns FPE balance corresponding to the given address.
 */
export const getFPEBalance = async (
  provider: Provider,
  address: string
): Promise<BigNumber> => {
  const contract = new ethers.Contract(
    predeploys.L2_FPE,
    Artifact_L2_FPE.abi,
    provider
  );
  return contract.balanceOf(address);
};

/**
 * Transfers value to given address.
 *
 * @param signer signer of the transfer
 * @param recipient recipient address of the transfer
 * @param value value of the transfer
 * @returns transaction response
 */
export const transfer = async (
  signer: Signer,
  recipient: string,
  value: BigNumber
): Promise<TransactionResponse> => {
  const tx = {
    to: recipient,
    value,
    type: 2,
  };
  return signer.sendTransaction(tx);
};

/**
 * Sends funds to recipient to make it reach target value when recipient's balance is less than min balance.
 *
 * @param provider provider
 * @param signer signer of the transfer
 * @param recipient recipient address of the transfer
 * @param minBalance minimum balance requirement for recipient
 * @param targetBalance target balance of recipient
 * @returns transaction response
 */
export const sendFundIfNeeded = async (
  provider: Provider,
  signer: Signer,
  recipient: string,
  minBalance: BigNumber,
  targetBalance: BigNumber
) => {
  const balance = await getBalance(provider, recipient);
  console.info(
    "Batch submitter " + recipient + " balance " + formatEther(balance)
  );
  if (balance.lt(minBalance)) {
    console.info(
      "Batch submitter balance less than minimum balance requirement " +
        formatEther(minBalance)
    );
    const value = targetBalance.sub(balance);

    const sender = await signer.getAddress();
    console.info(
      "Sending from maintainer " + sender + ", value=" + formatEther(value)
    );
    const res = await transfer(signer, recipient, value);
    console.info("Transaction succeed! txHash: " + res.hash);
  } else {
    console.info("Batch submitter has sufficient balance, no action is needed");
  }
};

/**
 * Publish to AWS SNS topic.
 *
 * @param address monitored wallet address
 * @param minBalance min balance that's supposed to be maintained
 * @param balance current wallet balance
 * @param targetBalance target balance after requested transfer happened
 */
export const publishToSNSTopic = async (
  address: string,
  minBalance,
  balance,
  targetBalance: BigNumber
) => {
  const message =
    "Wallet " +
    address +
    " balance " +
    formatEther(balance) +
    " is below the threshold " +
    formatEther(minBalance) +
    ", in order to reach the target balance " +
    formatEther(targetBalance) +
    ", the balance maintainer system is requesting you to transfer this amount: " +
    formatEther(targetBalance.sub(balance)) +
    " to the wallet";
  console.info(message);

  const REGION = "us-east-1";
  const snsClient = new SNSClient({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 100,
  });
  const params = {
    Message: message,
    TopicArn: process.env.AWS_SNS_TOPIC_ARN,
  };

  try {
    console.info("Publishing message");
    const data = await snsClient.send(new PublishCommand(params));
    console.info("Success.", data);
    return data;
  } catch (err) {
    console.info("Error", err.stack);
  }
};

/**
 * Maintain an account to make sure its balance falls within the range.
 *
 * @param provider provider
 * @param signer signer of the maintainee
 * @param extraFundRecipient recipient address if maintainee has more balance than defined
 * @param minBalance minimum balance requirement for the maintainee
 * @param targetBalance target balance of maintainee
 * @param maxBalance maximum balance requirement for the maintainee
 * @returns transaction response
 */
export const maintainBalanceWithinRange = async (
  provider: Provider,
  signer: Signer,
  coldWalletAddress: string,
  minBalance: BigNumber,
  targetBalance: BigNumber,
  maxBalance: BigNumber,
  alertFunc: (...args: any[]) => void
) => {
  const maintainee = await signer.getAddress();
  const balance = await getBalance(provider, maintainee);
  console.info(
    "Maintainee: " + maintainee + " has balance: " + formatEther(balance)
  );

  if (balance.lt(minBalance)) {
    alertFunc(maintainee, minBalance, balance, targetBalance);
  } else if (balance.gt(maxBalance)) {
    console.info(
      "Maintainee balance is greater than max balance requirement " +
        formatEther(maxBalance) +
        " target: " +
        formatEther(targetBalance)
    );

    const value = balance.sub(targetBalance);

    console.info(
      "Sending from maintainee" +
        maintainee +
        " to cold wallet " +
        coldWalletAddress +
        " value " +
        formatEther(value)
    );
    const res = await transfer(signer, coldWalletAddress, value);
    console.info("Transaction succeed! txHash: " + res.hash);
  } else {
    console.info("Maintainee balance falls within the range, no action needed");
  }
};

/**
 * Gets the min withdrawal amount from OVM_SequencerFeeVault contract.
 *
 * @param signer signer of the transaction
 * @returns transaction response
 */
export const minWithdrawalAmountFeeVault = async (
  provider: Provider
): Promise<BigNumber> => {
  const contract = new ethers.Contract(
    predeploys.OVM_SequencerFeeVault,
    Artifact_OVM_SequencerFeeVault.abi,
    provider
  );

  return contract.MIN_WITHDRAWAL_AMOUNT();
};

/**
 * Withdraws the fund from the OVM_SequencerFeeVault contract.
 *
 * @param signer signer of the transaction
 * @returns transaction response
 */
export const withdrawFromFeeVault = async (
  signer: Signer
): Promise<TransactionResponse> => {
  // withdraw from OVM_SequencerFeeVault
  const contract = new ethers.Contract(
    predeploys.OVM_SequencerFeeVault,
    Artifact_OVM_SequencerFeeVault.abi,
    signer
  );
  const tx = await contract.withdraw();
  return tx;
};

/**
 * Gets the min withdrawal amount from FPE_GasPriceOracle contract.
 *
 * @param signer signer of the transaction
 * @returns transaction response
 */
export const minWithdrawalAmountFpeOracle = async (
  provider: Provider
): Promise<BigNumber> => {
  const contract = new ethers.Contract(
    predeploys.FPE_GasPriceOracle,
    Artifact_FPE_GPO.abi,
    provider
  );

  return contract.MIN_WITHDRAWAL_AMOUNT();
};

/**
 * Withdraw the FPE fund from the FPE_GasPriceOracle contract.
 *
 * @param signer signer of the transaction
 * @returns transaction response
 */
export const withdrawFromFpeOracle = async (
  signer: Signer
): Promise<TransactionResponse> => {
  // withdraw from FPE_GasPriceOracle
  const contract = new ethers.Contract(
    predeploys.FPE_GasPriceOracle,
    Artifact_FPE_GPO.abi,
    signer
  );
  const tx = await contract.withdraw();
  return tx;
};

/**
 * Wait for all txs to be ready for relay, then finalize them on L1
 *
 * @param txs transactions
 * @param l1Wallet wallet on L1 that handles all finalization
 * @param l2Wallets wallets on L2
 * @param addressEndpoints URL endpoint for fetching L1 contract addresses
 * @returns transaction response
 */
export const waitAndFinalize = async (
  txs: TransactionResponse[],
  l1Wallet: Wallet,
  l2Wallets: Wallet[],
  addressEndpoints: string[]
) => {
  const messengers: CrossChainMessenger[] = await Promise.all(
    addressEndpoints.map(async (endpoint, i) => {
      return initializeMessenger(l1Wallet, l2Wallets[i], endpoint);
    })
  );

  // Wait for message to be ready, then finalize it on L1.
  for (const [i, tx] of Object.entries(txs)) {
    if (tx !== undefined) {
      try {
        await messengers[i].waitForMessageStatus(
          tx,
          MessageStatus.READY_FOR_RELAY
        );
        await messengers[i].finalizeMessage(tx);
        await messengers[i].waitForMessageReceipt(tx);
      } catch (err) {
        console.warn(
          "Error while finalizing message, err ",
          err,
          "txHash",
          tx.hash
        );
      }
    }
  }
};
