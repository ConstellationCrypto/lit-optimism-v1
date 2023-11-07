import { ethers } from "hardhat";

import {
  isNonDescending,
  getBalance,
  transfer,
  sendFundIfNeeded,
  maintainBalanceWithinRange,
  publishToSNSTopic,
} from "../src/helpers";
import { expect, spy } from "./setup";

describe("helpers", () => {
  describe("isNonDescending", () => {
    describe("when called with valid input", () => {
      it("should return true", async () => {
        const arr1 = [1, 1, 1, 1, 1];
        expect(isNonDescending(...arr1)).to.be.true;
        const arr2 = [1, 2, 3, 4, 5];
        expect(isNonDescending(...arr2)).to.be.true;
        const arr3 = [1, 1, 1, 2, 3];
        expect(isNonDescending(...arr3)).to.be.true;
      });
    });

    describe("when called with invalid input", () => {
      it("should return false", async () => {
        const arr1 = [1, 2, 1, 3, 4];
        expect(isNonDescending(...arr1)).to.be.false;
        const arr2 = [6, 2, 3, 4, 5];
        expect(isNonDescending(...arr2)).to.be.false;
        const arr3 = [5, 4, 3, 2, 1];
        expect(isNonDescending(...arr3)).to.be.false;
      });
    });
  });

  describe("getBalance", () => {
    describe("when called to get native token balance", () => {
      it("should return the correct balance", async () => {
        const [signer] = await ethers.getSigners();
        const expected = await signer.getBalance();
        const actual = await getBalance(ethers.provider, signer.address);
        expect(actual).to.equal(expected);
      });
    });
  });

  describe("transfer", () => {
    describe("when having enough balance to transfer", () => {
      it("should transfer the amount successfully", async () => {
        const [sender, recipient] = await ethers.getSigners();
        const senderBefore = await sender.getBalance();
        const recipientBefore = await recipient.getBalance();

        const value = ethers.utils.parseEther("5");
        const txRes = await transfer(sender, recipient.address, value);
        txRes.wait();

        expect(txRes.gasPrice).to.not.be.undefined;
        expect(txRes.type).to.equal(2);

        const senderAfter = await sender.getBalance();
        const recipientAfter = await recipient.getBalance();

        // sendAfter == senderBefore - value - gasPrice * 21000
        expect(senderAfter).to.equal(
          senderBefore.sub(value).sub(txRes.gasPrice.mul(21000))
        );
        expect(recipientAfter).to.equal(recipientBefore.add(value));
      });
    });
  });

  describe("transferIfNeeded", () => {
    const recipientAddress = "0x0000000000000000000000000000000000000000"; // 0 balance account
    const minBalance = ethers.utils.parseEther("1");
    const targetBalance = ethers.utils.parseEther("5");

    describe("when check setup", () => {
      it("should have proper setup", async () => {
        expect(minBalance).to.be.lt(targetBalance);
      });
    });

    describe("when called if recipient's balance is below min balance requirement", () => {
      it("should have proper pre-state", async () => {
        const recipient = await ethers.getSigner(recipientAddress);
        const [sender] = await ethers.getSigners();
        const senderBalance = await sender.getBalance();
        const recipientBalance = await recipient.getBalance();
        expect(recipientBalance).to.be.lt(minBalance);
        expect(senderBalance).to.be.gt(targetBalance);
      });

      it("should send fund to recipient", async () => {
        const recipient = await ethers.getSigner(recipientAddress);
        const [sender] = await ethers.getSigners();
        await sendFundIfNeeded(
          ethers.provider,
          sender,
          recipientAddress,
          minBalance,
          targetBalance
        );
        const balance = await recipient.getBalance();
        expect(balance).to.equal(targetBalance);
      });
    });

    describe("when called if recipient's balance is greater than or equal to min balance requirement", () => {
      it("should have proper pre-state", async () => {
        const recipient = await ethers.getSigner(recipientAddress);
        const recipientBalance = await recipient.getBalance();
        expect(recipientBalance).to.be.gte(minBalance);
      });

      it("should not send fund to recipient", async () => {
        const recipient = await ethers.getSigner(recipientAddress);
        const [sender] = await ethers.getSigners();
        const senderBalance = await sender.getBalance();
        const recipientBalance = await recipient.getBalance();
        await sendFundIfNeeded(
          ethers.provider,
          sender,
          recipientAddress,
          minBalance,
          targetBalance
        );
        const senderBalanceAfter = await sender.getBalance();
        const recipientBalanceAfter = await recipient.getBalance();
        expect(senderBalanceAfter).to.equal(senderBalance);
        expect(recipientBalanceAfter).to.equal(recipientBalance);
      });
    });
  });

  describe("maintainBalanceWithinRanges", () => {
    const recipientAddress = "0x0000000000000000000000000000000000000001"; // 0 balance account
    const minBalance = ethers.utils.parseEther("10");
    const targetBalance = ethers.utils.parseEther("500");
    const maxBalance = ethers.utils.parseEther("10000");

    describe("when check setup", () => {
      it("should have proper setup", async () => {
        expect(minBalance).to.be.lt(targetBalance);
        expect(targetBalance).to.be.lt(maxBalance);
      });
    });

    describe("when maintainee's balance is greater than max balance", () => {
      it("should send fund to cold wallet", async () => {
        const [sender] = await ethers.getSigners();
        const recipient = await ethers.getSigner(recipientAddress);
        const senderBalance = await sender.getBalance();
        expect(senderBalance).to.gt(maxBalance);
        const recipientBalance = await recipient.getBalance();
        const value = senderBalance.sub(targetBalance);
        await maintainBalanceWithinRange(
          ethers.provider,
          sender,
          recipientAddress,
          minBalance,
          targetBalance,
          maxBalance,
          publishToSNSTopic
        );
        const senderBalanceAfter = await sender.getBalance();
        const recipientBalanceAfter = await recipient.getBalance();
        expect(recipientBalanceAfter).to.be.equal(recipientBalance.add(value));
        // sender balance should be targetBalance - paid gas fee
        expect(senderBalanceAfter).to.be.lt(targetBalance);
      });
    });

    describe("when maintainee's balance falls within range", async () => {
      it("should do nothing", async () => {
        const [sender] = await ethers.getSigners();
        const recipient = await ethers.getSigner(recipientAddress);
        const senderBalance = await sender.getBalance();
        expect(senderBalance).to.lte(maxBalance);
        expect(senderBalance).to.gte(minBalance);
        const recipientBalance = await recipient.getBalance();
        await maintainBalanceWithinRange(
          ethers.provider,
          sender,
          recipientAddress,
          minBalance,
          targetBalance,
          maxBalance,
          publishToSNSTopic
        );
        const senderBalanceAfter = await sender.getBalance();
        const recipientBalanceAfter = await recipient.getBalance();
        expect(senderBalanceAfter).to.be.equal(senderBalance);
        expect(recipientBalanceAfter).to.be.equal(recipientBalance);
      });
    });

    describe("when maintainee's balance is less than min balance", async () => {
      it("should alert cold wallet owners", async () => {
        const [sender] = await ethers.getSigners();
        const recipient = await ethers.getSigner(recipientAddress);
        let senderBalance = await sender.getBalance();

        // Setup pre-state
        const value = senderBalance
          .sub(minBalance)
          .add(ethers.utils.parseEther("1"));
        const txRes = await transfer(sender, recipient.address, value);
        const recipientBalance = await recipient.getBalance();
        txRes.wait();
        senderBalance = await sender.getBalance();
        expect(senderBalance).to.be.lt(minBalance);

        const alertSpy = spy(publishToSNSTopic);
        alertSpy.should.be.spy;

        await maintainBalanceWithinRange(
          ethers.provider,
          sender,
          recipientAddress,
          minBalance,
          targetBalance,
          maxBalance,
          alertSpy
        );
        alertSpy.should.have.been.called.once;
        alertSpy.should.have.been.called.with(
          sender.address,
          minBalance,
          senderBalance,
          targetBalance
        );
        const recipientBalanceAfter = await recipient.getBalance();
        expect(recipientBalanceAfter).to.be.equal(recipientBalance);
      });
    });
  });
});
