from solders.pubkey import Pubkey

# UNIYAA Token Program ID (Token-2022)
PROGRAM_ID = Pubkey.from_string("HFg64becVHyoFuHaLVHEVa7cpG6ejyQztDi8zMh4kLSK")
seed = b"uniyaa-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
