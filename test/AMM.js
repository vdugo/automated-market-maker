const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) =>
{
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Token', () =>
{
    // global variables for Token tests
    let accounts, deployer
    let token1, token2
    let amm

    beforeEach(async () =>
    {
        accounts = await ethers.getSigners()
        deployer = accounts[0]

        const Token = await ethers.getContractFactory('Token')
        // both are 1 million tokens
        token1 = await Token.deploy('Dapp University', 'DAPP', '1000000')
        token2 = await Token.deploy('USD Token', 'USD', '1000000')

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
})
