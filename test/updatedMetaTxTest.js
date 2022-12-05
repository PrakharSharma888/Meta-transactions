const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("MetaTokenTransfer", function () {
    it("Should let user transfer tokens through a relayer with different nonces", async function () {
      // Deploy the contracts
      const RandomTokenFactory = await ethers.getContractFactory("RandomToken");
      const randomTokenContract = await RandomTokenFactory.deploy();
      await randomTokenContract.deployed();
  
      const MetaTokenSenderFactory = await ethers.getContractFactory(
        "TokenSender"
      );
      const tokenSenderContract = await MetaTokenSenderFactory.deploy();
      await tokenSenderContract.deployed();

      // taking three addresses as defined below
      const [_, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners();

      // minting 10000 tokens using the sender address
      const tenThousandTokens = parseEther("10000");
      const txInstance = randomTokenContract.connect(userAddress);
      const tx = txInstance.freeMint(tenThousandTokens);

      await tx.await()

      // geting approval from the sender for infinite supply of tokens
      const approval = await txInstance.approve(
        tokenSenderContract.address,
        BigNumber.from(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // is eqaul to 2^256 -1
        )
      )
      await approval.wait()

    // using nonce as a attribute to get diffrent hashes for same amount of transfer
    let nonce = 1;
    
    // generating hash for 10 tokens
    const transferAmountOfTokens = parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.address,
      nonce
    );

    // taking a signed transaction from the sender
    const signature = await userAddress.signMessage(arrayify(messageHash));

    // sending the signature to the tokenTransfer fucntion on behalf of the sender via a relayer address
    const relayerInstance = tokenSenderContract.connect(relayerAddress)
    const metaTx = await relayerInstance.tokenTransfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.address,
      signature,
      nonce
    )

    await metaTx.wait();
    // fetching the balance of the sender and the recipient 
    let userBalance = await randomTokenContract.balanceOf(userAddress.address);
    let recipientBalance = await randomTokenContract.balanceOf(
      recipientAddress.address
    );

    // checking if it actually reflected on the balance or not
    expect(userBalance.eq(parseEther("9990"))).to.be.true;
    expect(recipientBalance.eq(parseEther("10"))).to.be.true;

    // Increment the nonce
    nonce++;

    // Have user sign a second message, with a different nonce, to transfer 10 more tokens
    const messageHash2 = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.address,
      nonce
    );
    const signature2 = await userAddress.signMessage(arrayify(messageHash2));
    // Have the relayer execute the transaction on behalf of the user
    const metaTxn2 = await relayerSenderContractInstance.tokenTransfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.address,
      signature2,
      nonce,
    );
    await metaTxn2.wait();

    // Check the user's balance decreased, and recipient got 10 tokens
    userBalance = await randomTokenContract.balanceOf(userAddress.address);
    recipientBalance = await randomTokenContract.balanceOf(
      recipientAddress.address
    );

    expect(userBalance.eq(parseEther("9980"))).to.be.true;
    expect(recipientBalance.eq(parseEther("20"))).to.be.true;
    });

    it("Should not let signature reply happen", async() => {
        const RandomTokenFactory = await ethers.getContractFactory("RandomToken");
        const randomTokenContract = await RandomTokenFactory.deploy();
        await randomTokenContract.deployed();

        const MetaTokenSenderFactory = await ethers.getContractFactory(
        "TokenSender"
        );
        const tokenSenderContract = await MetaTokenSenderFactory.deploy();
        await tokenSenderContract.deployed();

        // Get three addresses, treat one as the user address
        // one as the relayer address, and one as a recipient address
        const [_, userAddress, relayerAddress, recipientAddress] =
        await ethers.getSigners();

        const tenThousandTokens = parseEther("10000")
        const mintInstance = randomTokenContract.connect(userAddress)
        const mintTxn = await mintInstance.freeMint(
            tenThousandTokens
        )
        await mintTxn.wait()

        const approval = await mintInstance.approve(
            tokenSenderContract.address,
            BigNumber.from(
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            )
        )
        await approval.wait()

        let nonce = 1;

        const transferAmountOfTokens = parseEther("10");
        const messageHash = await tokenSenderContract.getHash(
          userAddress.address,
          transferAmountOfTokens,
          recipientAddress.address,
          randomTokenContract.address,
          nonce
        );
        const signature = await userAddress.signMessage(arrayify(messageHash));

        // Have the relayer execute the transaction on behalf of the user
        const relayerSenderContractInstance =
        tokenSenderContract.connect(relayerAddress);
        const metaTxn = await relayerSenderContractInstance.transfer(
        userAddress.address,
        transferAmountOfTokens,
        recipientAddress.address,
        randomTokenContract.address,
        nonce,
        signature
        );

        await metaTxn.wait();

        // Have the relayer attempt to execute the same transaction again with the same signature
        // This time, we expect the transaction to be reverted because the signature has already been used.
        expect(relayerSenderContractInstance.transfer(
        userAddress.address,
        transferAmountOfTokens,
        recipientAddress.address,
        randomTokenContract.address,
        nonce,
        signature
        )).to.be.revertedWith('Already executed!');
    })
})
