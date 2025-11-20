from solders.pubkey import Pubkey

PROGRAM_ID = Pubkey.from_string("BgNRqYsP1JW8X65rKji4dF47pX5aVPtsFhKioow6aDtL")
seed = b"equa-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
