import fs from 'fs';

const idlPath = './public/idl/equa_token.json';
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Add complete type definitions to accounts
idl.accounts = [
  {
    name: "GlobalState",
    discriminator: [163, 46, 74, 168, 216, 123, 133, 98],
    type: {
      kind: "struct",
      fields: [
        {name: "user_count", type: "u32"},
        {name: "total_transactions", type: "u64"},
        {name: "current_epoch", type: "u64"},
        {name: "compounding_complete", type: "bool"},
        {name: "last_epoch_update_time", type: "i64"},
        {name: "token_mint", type: "pubkey"}
      ]
    }
  },
  {
    name: "UserAccount",
    discriminator: [211, 33, 136, 16, 186, 110, 242, 127],
    type: {
      kind: "struct",
      fields: [
        {name: "authority", type: "pubkey"},
        {name: "referral", type: "pubkey"},
        {name: "token_account", type: "pubkey"},
        {name: "minted_amount", type: "u64"},
        {name: "mint_start", type: "i64"},
        {name: "locked_until", type: "i64"},
        {name: "referral_rewards", type: "u64"},
        {name: "last_mint_time", type: "i64"}
      ]
    }
  }
];

fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
console.log('✅ IDL fixed with complete account definitions');
