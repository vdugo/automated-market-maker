//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";


// Manage pools
// Manage deposits
// Facilitate swaps
// Manage withdrawals

contract AMM
{
    // State variables
    Token public token1;
    Token public token2;

    uint256 public token1Balance;
    uint256 public token2Balance;
    uint256 public K;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    uint256 constant PRECISION = 10 ** 18;

    constructor(Token _token1, Token _token2)
    {
        token1 = _token1;
        token2 = _token2;
    }

    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external
    {
        // function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)
        // Deposit tokens
        require(
            token1.transferFrom(msg.sender, address(this), _token1Amount),
            "failed to transfer token 1"
        );
        require(
            token2.transferFrom(msg.sender, address(this), _token2Amount),
            "failed to transfer token 2"
        );

        // Issue shares

        uint256 share;
        // if this is the first time they are adding liquidity
        // make their shares 100
        if (totalShares == 0)
        {
            share = 100 * PRECISION;
        }
        else
        {
            uint256 share1 = (totalShares * _token1Amount) / token1Balance;
            uint256 share2 = (totalShares * _token2Amount) / token2Balance;
            // account for dust and make sure they're equal, round to 3 decimal places
            require((share1 / 10**3) == (share2 / 10**3), "must provide equal token amounts");
            // since they're equal, doesn't matter which one we set it to
            share = share1;
        }

        totalShares += share;
        shares[msg.sender] = share;

        // Manage pool
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;

        K = token1Balance * token2Balance;
    }
}