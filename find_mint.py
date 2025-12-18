from solders.pubkey import Pubkey

# EQUA Token Program ID (Token-2022)
PROGRAM_ID = Pubkey.from_string("7QYUbC1YUdJB2uYcmxqccrokowKroiAYGE5kqC6MaFdP")
seed = b"equa-mint"

mint_pda, bump = Pubkey.find_program_address([seed], PROGRAM_ID)
print(f"Mint PDA: {mint_pda}")
print(f"Bump: {bump}")
