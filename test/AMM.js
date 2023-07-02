const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) =>
{
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('AMM', () =>
{
    // global variables for AMM tests

    let accounts, deployer, liquidityProvider

    let token1, token2, amm

    beforeEach(async () =>
    {

        // Set up accounts
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        liquidityProvider = accounts[1]

        // Deploy Token contracts to the blockchain
        const Token = await ethers.getContractFactory('Token')
        // both are 1 million tokens supply
        token1 = await Token.deploy('Dapp University', 'DAPP', '1000000')
        token2 = await Token.deploy('USD Token', 'USD', '1000000')

        // Send tokens to the liquidity provider
        let transaction = await token1.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
        await transaction.wait()
        transaction = await token2.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
        await transaction.wait()

        // Deploy AMM contract to the blockchain with the already deployed
        // token1 and token2 contracts as the trading pair
        const AMM = await ethers.getContractFactory('AMM')
        amm = await AMM.deploy(token1.address, token2.address)
    })

    describe('Deployment', async () =>
    {
        // check that the AMM contract was deployed properly
        it('has an address', async () =>
        {
            expect(amm.address).to.not.equal(0x0)
        })

        it('tracks token1 address', async () =>
        {
            expect(await amm.token1()).to.equal(token1.address)
        })

        it('tracks token2 address', async () =>
        {
            expect(await amm.token2()).to.equal(token2.address)
        })

    })
    describe('Swapping Tokens', async () =>
    {
        let amount
        it('facilitates swaps', async () =>
        {
            // the deployer approves 100k tokens
            amount = tokens(100000)
            transaction = await token1.connect(deployer).approve(amm.address, amount)
            await transaction.wait()

            transaction = await token2.connect(deployer).approve(amm.address, amount)
            await transaction.wait()

            // deployer provides liquidity for both tokens with same amount
            transaction = await amm.connect(deployer).addLiquidity(amount, amount)
            await transaction.wait()

            // Check that the AMM receives the tokens deposited
            expect(await token1.balanceOf(amm.address)).to.equal(amount)
            expect(await token2.balanceOf(amm.address)).to.equal(amount)

            // checking same thing, but in the AMM contract's state variables
            expect(await amm.token1Balance()).to.equal(amount)
            expect(await amm.token2Balance()).to.equal(amount)

            // check that the deployer has 100 shares, 100 because they get 100 shares
            // when liquidity is added to the pool for the first time
            expect(await amm.shares(deployer.address)).to.equal(tokens(100))

            // check that the pool has 100 shares
            expect(await amm.totalShares()).to.equal(tokens(100))


            // LP adds more liquidity
            
            // LP approves 50k tokens
            amount = tokens(50000)
            transaction = await token1.connect(liquidityProvider).approve(amm.address, amount)
            await transaction.wait()

            transaction = await token2.connect(liquidityProvider).approve(amm.address, amount)
            await transaction.wait()

            // Calculate token2 deposit amount
            let token2Deposit = await amm.calculateToken2Deposit(amount)

            // LP adds liquidity of 50k for both tokens
            transaction = await amm.connect(liquidityProvider).addLiquidity(amount, token2Deposit)
            await transaction.wait()

            expect(await amm.shares(liquidityProvider.address)).to.equal(tokens(50))

            // Deployer should still have 100 shares after the LP depositing liquidity
            expect(await amm.shares(deployer.address)).to.equal(tokens(100))

            // The pool should have a total of 150 shares now
            expect(await amm.totalShares()).to.equal(tokens(150))
            
        })
    })
})
