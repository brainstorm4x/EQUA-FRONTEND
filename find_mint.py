from solders.pubkey import Pubkey

# UNIYAA Token Program ID (Token-2022)
PROGRAM_ID = Pubkey.from_string("6UgzWKDEJvKrKSRRBwYJzzYoYfVFdYhDGpwXa6adLZed")
seed = b"uniyaa-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
