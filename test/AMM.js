const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) =>
{
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens
const shares = tokens

describe('AMM', () =>
{
    // global variables for AMM tests

    let accounts, deployer, liquidityProvider, investor1, investor2

    let token1, token2, amm

    beforeEach(async () =>
    {

        // Set up accounts
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        liquidityProvider = accounts[1]
        investor1 = accounts[2]
        investor2 = accounts[3]

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

        // Send tokens to investor1
        // in our scenario investor1 is only going to have token1 tokens and buy token2 tokens
        transaction = await token1.connect(deployer).transfer(investor1.address, tokens(100000))
        await transaction.wait()

        // Send tokens to investor2
        // in our scenario investor2 is only going to have token2 tokens and buy token1 tokens
        transaction = await token2.connect(deployer).transfer(investor2.address, tokens(100000))
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

            // Investor1 swaps

            // check price before swapping
            console.log(`Price before swapping: ${await amm.token2Balance() / await amm.token1Balance()}`)

            // investor1 approves the exchange to control all 100k tokens
            transaction = await token1.connect(investor1).approve(amm.address, tokens(100000))
            await transaction.wait()

            // check investor1 balance before swap
            balance = await token1.balanceOf(investor1.address)

            // estimate amount of tokens investor1 will receive
            // after swapping token1: include slippage
            estimate = await amm.calculateToken1Swap(tokens(1))

            // investor1 swaps 1 token1
            transaction = await amm.connect(investor1).swapToken1(tokens(1))
            result = await transaction.wait()

            // check for emission of the Swap event
            await expect(transaction).to.emit(amm, 'Swap').withArgs(
                investor1.address,
                token1.address,
                tokens(1),
                token2.address,
                estimate,
                await amm.token1Balance(),
                await amm.token2Balance(),
                (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )

            // check investor1 balance after swap
            balance = await token2.balanceOf(investor1.address)
            expect(estimate).to.equal(balance)
            
            // Check that AMM token balances are in sync
            expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
            expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

            // check price after swapping
            console.log(`Price after swapping: ${await amm.token2Balance() / await amm.token1Balance()}`)


            // swap some more tokens to see what happens
            balance = await token2.balanceOf(investor1.address)
            console.log(`Investor1 token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

            estimate = await amm.calculateToken1Swap(tokens(1))
            console.log(`token2 amount Investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

            transaction = await amm.connect(investor1).swapToken1(tokens(1))
            await transaction.wait()
            console.log(`Investor1 token2 balance after swap: ${ethers.utils.formatEther(balance)}`)

            // Check again that AMM token balances are in sync
            expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
            expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

            console.log(`Price after swapping: ${await amm.token2Balance() / await amm.token1Balance()}`)


            // Investor1 swaps a large amount
            balance = await token2.balanceOf(investor1.address)
            console.log(`Investor1 token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

            estimate = await amm.calculateToken1Swap(tokens(10000))
            console.log(`token2 amount Investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

            transaction = await amm.connect(investor1).swapToken1(tokens(10000))
            await transaction.wait()
            console.log(`Investor1 token2 balance after swap: ${ethers.utils.formatEther(balance)}`)

            // Check again that AMM token balances are in sync
            expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
            expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

            console.log(`Price after swapping: ${await amm.token2Balance() / await amm.token1Balance()}`)



            // Investor2 swaps

            // investor2 approves all tokens
            transaction = await token2.connect(investor2).approve(amm.address, tokens(100000))
            await transaction.wait()

            // check investor2 balance before swap
            balance = await token1.balanceOf(investor2.address)
            console.log(`Investor2 token1 balance before swap: ${ethers.utils.formatEther(balance)}`)

            estimate = await amm.calculateToken2Swap(tokens(1))
            console.log(`token1 amount Investor2 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

            transaction = await amm.connect(investor2).swapToken2(tokens(1))
            await transaction.wait()

            // check for emission of the Swap event
            await expect(transaction).to.emit(amm, 'Swap').withArgs(
                investor2.address,
                token2.address,
                tokens(1),
                token1.address,
                estimate,
                await amm.token1Balance(),
                await amm.token2Balance(),
                (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )

            // check Investor2 balance after swap
            balance = await token1.balanceOf(investor2.address)
            console.log(`Investor2 token1 balance after swap ${ethers.utils.formatEther(balance)}`)
            expect(estimate).to.equal(balance)

            expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
            expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

            console.log(`Price after swapping: ${await amm.token2Balance() / await amm.token1Balance()}`)


            // removing liquidity

            console.log(`AMM token1 balance: ${ethers.utils.formatEther(await amm.token1Balance())}`)
            console.log(`AMM token2 balance: ${ethers.utils.formatEther(await amm.token2Balance())}`)

            // check LP balance before removing tokens
            balance = await token1.balanceOf(liquidityProvider.address)
            console.log(`Liquidity provider token1 balance before removing funds: ${ethers.utils.formatEther(balance)}`)

            balance = await token2.balanceOf(liquidityProvider.address)
            console.log(`Liquidity provider token2 balance before removing unds: ${ethers.utils.formatEther(balance)}`)

            transaction = await amm.connect(liquidityProvider).removeLiquidity(shares(50)) // 50 shares
            await transaction.wait()
            
            // check LP balance after removing funds
            balance = await token1.balanceOf(liquidityProvider.address)
            console.log(`Liquidity provider token1 balance after removing funds: ${ethers.utils.formatEther(balance)}`)

            balance = await token2.balanceOf(liquidityProvider.address)
            console.log(`Liquidity provider token2 balance after removing funds: ${ethers.utils.formatEther(balance)}`)

            // LP should have 0 shares
            expect(await amm.shares(liquidityProvider.address)).to.equal(0)

            // Deployer should have 100 shares
            expect(await amm.shares(deployer.address)).to.equal(shares(100))

            // Check that total number of shares is 100
            expect(await amm.totalShares()).to.equal(shares(100))

        })
    })
})
