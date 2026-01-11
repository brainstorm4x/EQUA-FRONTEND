from solders.pubkey import Pubkey

# EQUA Token Program ID (Token-2022)
PROGRAM_ID = Pubkey.from_string("2oStivMnhnCsiomYm73S9vzwmnGf7f6J2KCujnNfV7g4")
seed = b"equa-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
