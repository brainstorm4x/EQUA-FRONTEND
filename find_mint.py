from solders.pubkey import Pubkey

# UNIA Token Program ID (Token-2022)
PROGRAM_ID = Pubkey.from_string("B2zocFnLGMryMTt3iBEtezDGqiCQJygc2iXBMYnkDfx2")
seed = b"unia-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
