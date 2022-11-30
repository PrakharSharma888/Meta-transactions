const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Meta transaction of token transfer", function(){
    it("Should allow to execute the transaction using a releyer!", async()=>{

        const randomTokenContract = await ethers.getContractFactory("RandomToken")
        const _randomTokenContract = await randomTokenContract.deploy()
        await _randomTokenContract.deployed()

        const senderTokenContract = await ethers.getContractFactory("TokenSender")
        const _senderTokenContract = await senderTokenContract.deploy()
        await _senderTokenContract.deployed()

        const [_, sender, recipent, releyer] = await ethers.getSigners()
        const mintingAmountWithDecimals = parseEther("10000")
        console.log(mintingAmountWithDecimals);
        const randomTokenInstance = _randomTokenContract.connect(sender)
        const mintTxn = await randomTokenInstance.freeMint(mintingAmountWithDecimals);

        await mintTxn.wait()

        //taking approval
        const approval = await randomTokenInstance.approve(
            _senderTokenContract.address,
            BigNumber.from(
                // This is uint256's max value (2^256 - 1) in hex
                // Fun Fact: There are 64 f's in here.
                // In hexadecimal, each digit can represent 4 bits
                // f is the largest digit in hexadecimal (1111 in binary)
                // 4 + 4 = 8 i.e. two hex digits = 1 byte
                // 64 digits = 32 bytes
                // 32 bytes = 256 bits = uint256
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // to make it maximum
            )
        )
        await approval.wait()

        // signing of message
        const transferAmount = parseEther("10")
        const messageHash = await _senderTokenContract.getHash(
            sender.address,
            transferAmount,
            recipent.address,
            _randomTokenContract.address
        )
        const signing = await sender.signMessage(arrayify(messageHash));

        // now comes the relayer
        const relayerInstance = _senderTokenContract.connect(releyer);
        const transferTxn = await relayerInstance.tokenTransfer(
            sender.address,
            transferAmount,
            recipent.address,
            _randomTokenContract.address,
            signing
        )
        await transferTxn.wait();

        const senderBalance = await _randomTokenContract.balanceOf(
            sender.address
        )
        const recipentBalance = await _randomTokenContract.balanceOf(
            recipent.address
        )

        expect(senderBalance.lt(mintingAmountWithDecimals)).to.be.true;
        expect(recipentBalance.gt(BigNumber.from(0))).to.be.true;
    });
})