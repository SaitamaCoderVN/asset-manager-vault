use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

declare_id!("24SVcuivGvZ7TpGejyGTEmHHhtGcgyJjQmvCBXkK3MiJ");

#[program]
pub mod asset_manager_vault {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("INITIALIZE");
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let sender_token_account = &ctx.accounts.sender_token_account;

        if sender_token_account.amount < amount {
            return Err(VaultError::InsufficientFunds.into());
        }

        let transfer_instruction = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"SPL_ACCOUNT_VAULT"],
        bump,
        space = 8
    )]
    /// CHECK: Struct field "token_account_owner_pda" is unsafe, but is not documented.
    pub token_account_owner_pda: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"SPL_ACCOUNT_VAULT"], bump)]
    /// CHECK: Struct field "token_account_owner_pda" is unsafe, but is not documented.
    pub token_account_owner_pda: AccountInfo<'info>,

    #[account(
        init_if_needed,
        seeds = [b"SPL_PDA_VAULT".as_ref(), mint_account.key().as_ref()],
        token::mint = mint_account,
        token::authority = token_account_owner_pda,
        payer = signer,
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub mint_account: Account<'info, Mint>,

    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum VaultError {
    #[msg("Insufficient Funds.")]
    InsufficientFunds,
}
