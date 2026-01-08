/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/equa_token.json`.
 */
export type EquaToken = {
  "address": "GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C",
  "metadata": {
    "name": "equaToken",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "activateSocialFunds",
      "docs": [
        "Activate social funds (can only be called once after compounding phase ends)",
        "This is a ONE-TIME action that enables monthly distributions"
      ],
      "discriminator": [
        1,
        127,
        115,
        50,
        113,
        56,
        163,
        234
      ],
      "accounts": [
        {
          "name": "socialFundsState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  99,
                  105,
                  97,
                  108,
                  45,
                  102,
                  117,
                  110,
                  100,
                  115,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "globalState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "addBusinessReferrer",
      "docs": [
        "Add a business referrer to the registry (admin only)"
      ],
      "discriminator": [
        110,
        7,
        225,
        205,
        126,
        199,
        112,
        219
      ],
      "accounts": [
        {
          "name": "businessRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "businessRegistry"
          ]
        }
      ],
      "args": [
        {
          "name": "businessReferrer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "claimBonusMint",
      "docs": [
        "Claim a bonus mint attempt by redeeming referral credits",
        "",
        "Redemption Rules:",
        "- 5 Referral Credits = 1 Bonus Mint Attempt",
        "- Bonus mints use the user's current mint tier",
        "- Bonus mints obey price appreciation logic",
        "- Bonus mints consume elevated_mint_attempts_used",
        "",
        "Monthly Caps:",
        "- Base cap: 3 bonus mints per calendar month",
        "- Absolute cap: 5 bonus mints per calendar month",
        "- No rollover between months",
        "",
        "Note: This instruction does NOT increment GlobalState.total_transactions.",
        "Only P2P transfers (transfer_tokens) increment the transaction counter."
      ],
      "discriminator": [
        165,
        189,
        110,
        164,
        88,
        80,
        20,
        71
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "userMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "globalState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimReferralRewards",
      "docs": [
        "Claim accumulated referral rewards (LEGACY - DEPRECATED)",
        "",
        "This instruction is deprecated as of the referral credits update.",
        "Referral rewards are now stored as credits, not EQUA tokens.",
        "Use claim_bonus_mint instead to redeem credits for bonus mint attempts.",
        "",
        "Note: This instruction does NOT increment GlobalState.total_transactions.",
        "Only P2P transfers (transfer_tokens) increment the transaction counter."
      ],
      "discriminator": [
        23,
        112,
        76,
        162,
        157,
        106,
        203,
        246
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "createTokenMint",
      "docs": [
        "Create the EQUA token mint (call once during deployment)"
      ],
      "discriminator": [
        35,
        109,
        237,
        196,
        54,
        218,
        33,
        119
      ],
      "accounts": [
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "distributeSocialFunds",
      "docs": [
        "Distribute monthly social funds to all 5 special-purpose accounts",
        "Can only be called ONCE per calendar month after activation"
      ],
      "discriminator": [
        106,
        191,
        242,
        134,
        7,
        58,
        71,
        221
      ],
      "accounts": [
        {
          "name": "socialFundsState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  99,
                  105,
                  97,
                  108,
                  45,
                  102,
                  117,
                  110,
                  100,
                  115,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "educationFundTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "educationFundPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "educationFundPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  100,
                  117,
                  99,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "healthcareFundTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "healthcareFundPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "healthcareFundPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  101,
                  97,
                  108,
                  116,
                  104,
                  99,
                  97,
                  114,
                  101,
                  45,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "researchFundTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "researchFundPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "researchFundPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  97,
                  114,
                  99,
                  104,
                  45,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "generalGrantsFundTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "generalGrantsFundPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "generalGrantsFundPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  101,
                  110,
                  101,
                  114,
                  97,
                  108,
                  45,
                  103,
                  114,
                  97,
                  110,
                  116,
                  115,
                  45,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "operationsFundTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "operationsFundPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "operationsFundPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110,
                  115,
                  45,
                  102,
                  117,
                  110,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize global state (call this FIRST in tests)"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeBusinessRegistry",
      "docs": [
        "Initialize the business registry (call once during deployment)"
      ],
      "discriminator": [
        151,
        80,
        227,
        76,
        115,
        6,
        7,
        254
      ],
      "accounts": [
        {
          "name": "businessRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeEqxOracle",
      "docs": [
        "Initialize the EQX Oracle (call once during deployment)"
      ],
      "discriminator": [
        64,
        32,
        196,
        225,
        20,
        169,
        225,
        42
      ],
      "accounts": [
        {
          "name": "eqxOracle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  120,
                  45,
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeSocialFunds",
      "docs": [
        "Initialize the social funds state (call once during deployment)"
      ],
      "discriminator": [
        85,
        33,
        118,
        141,
        242,
        213,
        71,
        206
      ],
      "accounts": [
        {
          "name": "socialFundsState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  99,
                  105,
                  97,
                  108,
                  45,
                  102,
                  117,
                  110,
                  100,
                  115,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeUser",
      "docs": [
        "Register a new user with account type (Individual/Business) and metadata",
        "Enforces referral requirement after first 100 users and anti-sybil measures",
        "",
        "Note: This instruction does NOT increment GlobalState.total_transactions.",
        "Only P2P transfers (transfer_tokens) increment the transaction counter."
      ],
      "discriminator": [
        111,
        17,
        185,
        250,
        60,
        122,
        38,
        254
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "userMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "referralAccount",
          "writable": true
        },
        {
          "name": "referrerMetadata",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "businessRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "referral",
          "type": "pubkey"
        },
        {
          "name": "mintStart",
          "type": "i64"
        },
        {
          "name": "userType",
          "type": "u8"
        }
      ]
    },
    {
      "name": "mintTokens",
      "docs": [
        "Mint EQUA tokens with tier limits based on user index",
        "User #1: 100 attempts at 100,000 EQUA each",
        "Users #2-10: 100 attempts at 10,000 EQUA each",
        "Users #11+: Normal limit (1,000 EQUA)",
        "",
        "Note: This instruction does NOT increment GlobalState.total_transactions.",
        "Only P2P transfers (transfer_tokens) increment the transaction counter."
      ],
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "userMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  109,
                  101,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "globalState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "referrerAccount",
          "docs": [
            "NOTE: Must be writable. When no referrer exists, pass user's own account as self-reference"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockedTokenAccount",
          "docs": [
            "Locked token account PDA (only for tiers 1-3)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107,
                  101,
                  100,
                  45,
                  116,
                  111,
                  107,
                  101,
                  110,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "lockedTokenAta",
          "docs": [
            "Associated token account for locked tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lockedTokenPda"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lockedTokenPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107,
                  101,
                  100,
                  45,
                  116,
                  111,
                  107,
                  101,
                  110,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "recordTransaction",
      "docs": [
        "Record a transaction for price tracking",
        "",
        "Note: This is a utility instruction for testing/simulation purposes.",
        "In production, the primary transaction counter is incremented by transfer_tokens.",
        "This allows off-chain systems to simulate transaction counts for price calculations."
      ],
      "discriminator": [
        134,
        39,
        187,
        220,
        192,
        43,
        119,
        10
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "removeBusinessReferrer",
      "docs": [
        "Remove a business referrer from the registry (admin only)"
      ],
      "discriminator": [
        160,
        152,
        102,
        113,
        219,
        128,
        159,
        117
      ],
      "accounts": [
        {
          "name": "businessRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  115,
                  105,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "businessRegistry"
          ]
        }
      ],
      "args": [
        {
          "name": "businessReferrer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "transferTokens",
      "docs": [
        "Transfer EQUA tokens between users (P2P)",
        "",
        "This is the PRIMARY instruction that increments GlobalState.total_transactions.",
        "The counter tracks peer-to-peer user transfers for price appreciation calculations.",
        "",
        "Operations that do NOT increment the counter:",
        "- mint_tokens (token creation/minting)",
        "- initialize_user (user registration)",
        "- claim_referral_rewards (reward claims)",
        "",
        "Note: record_transaction() is a separate utility instruction for testing/simulation"
      ],
      "discriminator": [
        54,
        180,
        238,
        175,
        74,
        85,
        126,
        188
      ],
      "accounts": [
        {
          "name": "senderUserAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "senderAuthority"
              }
            ]
          }
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "recipientUserAccount",
          "docs": [
            "Recipient's user account - caller must provide the correct PDA for recipient's wallet",
            "Validation: Must be a valid UserAccount (Anchor checks discriminator and deserialization)"
          ],
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  45,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "senderAuthority",
          "signer": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unlockTokens",
      "docs": [
        "Unlock tokens after 4-year cliff vesting period",
        "",
        "Can only be called after unlock_timestamp has passed",
        "Transfers all locked tokens from locked ATA to user's ATA",
        "One-time operation per user"
      ],
      "discriminator": [
        233,
        35,
        95,
        159,
        37,
        185,
        47,
        88
      ],
      "accounts": [
        {
          "name": "lockedTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107,
                  101,
                  100,
                  45,
                  116,
                  111,
                  107,
                  101,
                  110,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "lockedTokenAta",
          "writable": true
        },
        {
          "name": "lockedTokenPda",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  107,
                  101,
                  100,
                  45,
                  116,
                  111,
                  107,
                  101,
                  110,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  117,
                  97,
                  45,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "lockedTokenAccount"
          ]
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "updateEqxPrice",
      "docs": [
        "Update the EQX Oracle price (admin only)",
        "All basket calculations occur OFF-CHAIN. This instruction only stores the final price.",
        "",
        "# Arguments",
        "* `eqx_price` - Final EQX price in fixed-point format (1e8 precision)",
        "* `component_prices_hash` - Hash of component prices used in off-chain calculation",
        "* `weights_hash` - Hash of weights used in off-chain calculation"
      ],
      "discriminator": [
        185,
        36,
        232,
        110,
        74,
        175,
        56,
        237
      ],
      "accounts": [
        {
          "name": "eqxOracle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  113,
                  120,
                  45,
                  111,
                  114,
                  97,
                  99,
                  108,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "eqxPrice",
          "type": "u64"
        },
        {
          "name": "componentPricesHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "weightsHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "businessRegistry",
      "discriminator": [
        177,
        43,
        70,
        144,
        19,
        164,
        169,
        191
      ]
    },
    {
      "name": "eqxOracle",
      "discriminator": [
        31,
        243,
        80,
        126,
        98,
        77,
        106,
        77
      ]
    },
    {
      "name": "globalState",
      "discriminator": [
        163,
        46,
        74,
        168,
        216,
        123,
        133,
        98
      ]
    },
    {
      "name": "lockedTokenAccount",
      "discriminator": [
        3,
        186,
        246,
        106,
        222,
        187,
        14,
        143
      ]
    },
    {
      "name": "socialFundsState",
      "discriminator": [
        70,
        6,
        246,
        127,
        128,
        186,
        232,
        185
      ]
    },
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    },
    {
      "name": "userMetadata",
      "discriminator": [
        157,
        214,
        220,
        235,
        98,
        135,
        171,
        28
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "userCountOverflow",
      "msg": "User count overflowed the maximum u32 value. The maximum number of users has been reached."
    },
    {
      "code": 6001,
      "name": "mintOverflow",
      "msg": "Minted amount overflow. The total minted amount would exceed u64::MAX."
    },
    {
      "code": 6002,
      "name": "transactionOverflow",
      "msg": "Transaction count overflow. The total transactions would exceed u64::MAX."
    },
    {
      "code": 6003,
      "name": "rewardOverflow",
      "msg": "Referral reward overflow. The referral rewards would exceed u64::MAX."
    },
    {
      "code": 6004,
      "name": "insufficientBalance",
      "msg": "Insufficient balance for transfer. Check your token account balance before attempting transfer."
    },
    {
      "code": 6005,
      "name": "referralRequired",
      "msg": "Referral is required for user registration after the first 100 users. Please provide a valid referrer's public key."
    },
    {
      "code": 6006,
      "name": "invalidReferralAccount",
      "msg": "Invalid referral account - account does not exist or is not a valid user. Ensure the referrer has already registered."
    },
    {
      "code": 6007,
      "name": "mintAmountExceedsTierLimit",
      "msg": "Mint amount exceeds the tier limit for this user. Tier 1 (User #1): 100,000 EQUA/attempt for 100 attempts; Tier 2 (Users #2-10): 10,000 EQUA/attempt for 100 attempts; Tier 3 (Users #11-100): 1,000 EQUA/attempt for 100 attempts. After elevated attempts exhausted: Tier 4 (#1-1,000): 100 EQUA; Tier 5 (#1,001-10,000): 10 EQUA; Tier 6 (#10,001-100,000): 1 EQUA; Tier 7 (#100,001-1M): 0.1 EQUA; Tier 8 (#1M-10M): 0.01 EQUA; Tier 9 (#10M+): 0.001 EQUA."
    },
    {
      "code": 6008,
      "name": "insufficientSolBalance",
      "msg": "Insufficient SOL balance for registration (anti-sybil measure). Minimum required: 0.05 SOL. Please ensure your wallet has sufficient SOL balance."
    },
    {
      "code": 6009,
      "name": "rapidReferralSequence",
      "msg": "Too rapid referral sequence - wait a few slots before referring another user. This anti-sybil measure prevents automated mass registrations."
    },
    {
      "code": 6010,
      "name": "invalidPdaDerivation",
      "msg": "Account validation failed: The provided account does not match the expected PDA derivation. Check that you're using the correct seeds and program ID."
    },
    {
      "code": 6011,
      "name": "invalidAssociatedTokenAccount",
      "msg": "Missing or invalid Associated Token Account (ATA). Ensure the ATA is initialized for the EQUA mint with Token-2022 program. Use getAssociatedTokenAddressSync() to derive the correct address."
    },
    {
      "code": 6012,
      "name": "invalidAccountOwner",
      "msg": "Account ownership validation failed. The account must be owned by this program. Check that the provided account is a valid program account."
    },
    {
      "code": 6013,
      "name": "invalidAccountDiscriminator",
      "msg": "Account discriminator mismatch. The account data does not match the expected account type. Ensure you're providing the correct account for this instruction."
    },
    {
      "code": 6014,
      "name": "invalidUserAccountPda",
      "msg": "User account PDA derivation failed. Expected seeds: ['user-account', authority.key()]. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6015,
      "name": "invalidUserMetadataPda",
      "msg": "User metadata PDA derivation failed. Expected seeds: ['user-meta', authority.key()]. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6016,
      "name": "invalidGlobalStatePda",
      "msg": "Global state PDA derivation failed. Expected seeds: ['global-state']. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6017,
      "name": "invalidMintPda",
      "msg": "Mint PDA derivation failed. Expected seeds: ['equa-mint']. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6018,
      "name": "invalidMintAuthorityPda",
      "msg": "Mint authority PDA derivation failed. Expected seeds: ['mint-authority']. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6019,
      "name": "insufficientReferralRewards",
      "msg": "Insufficient referral rewards. No rewards available to claim."
    },
    {
      "code": 6020,
      "name": "unauthorizedBusinessRegistryAccess",
      "msg": "Unauthorized access to business registry. Only the registry authority can manage business referrers."
    },
    {
      "code": 6021,
      "name": "businessReferrerAlreadyExists",
      "msg": "Business referrer already exists in the registry."
    },
    {
      "code": 6022,
      "name": "referralEventsOverflow",
      "msg": "Referral events count overflow. The referral events counter has reached its maximum value."
    },
    {
      "code": 6023,
      "name": "invalidBusinessRegistryOwner",
      "msg": "Invalid business registry owner. The business registry must be owned by this program."
    },
    {
      "code": 6024,
      "name": "invalidBusinessRegistryData",
      "msg": "Invalid business registry data. The business registry account data is corrupted or invalid."
    },
    {
      "code": 6025,
      "name": "unauthorizedEqxOracleUpdate",
      "msg": "Unauthorized EQX oracle update. Only the oracle authority can update prices."
    },
    {
      "code": 6026,
      "name": "invalidEqxPrice",
      "msg": "Invalid EQX price. Price must be greater than zero."
    },
    {
      "code": 6027,
      "name": "invalidEqxHashes",
      "msg": "Invalid EQX hashes. Component prices and weights hashes must not be all zeros."
    },
    {
      "code": 6028,
      "name": "invalidEqxOraclePda",
      "msg": "EQX Oracle PDA derivation failed. Expected seeds: ['eqx-oracle']. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6029,
      "name": "invalidSocialFundsStatePda",
      "msg": "Social Funds State PDA derivation failed. Expected seeds: ['social-funds-state']. Ensure you're deriving the PDA correctly on the client side."
    },
    {
      "code": 6030,
      "name": "socialFundsNotActivated",
      "msg": "Social funds have not been activated yet. Activation can only occur after the compounding phase ends."
    },
    {
      "code": 6031,
      "name": "socialFundsAlreadyActivated",
      "msg": "Social funds have already been activated. Activation is a one-time operation."
    },
    {
      "code": 6032,
      "name": "unauthorizedSocialFundsOperation",
      "msg": "Unauthorized social funds operation. Only the social funds authority can perform this action."
    },
    {
      "code": 6033,
      "name": "compoundingNotComplete",
      "msg": "Compounding phase has not ended yet. Social funds can only be activated after compounding completes."
    },
    {
      "code": 6034,
      "name": "monthlyDistributionAlreadyExecuted",
      "msg": "Monthly distribution already executed for this calendar month. Distributions are limited to once per calendar month."
    },
    {
      "code": 6035,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp. Timestamp must be a valid positive Unix timestamp (after January 1, 1970)."
    },
    {
      "code": 6036,
      "name": "legacyReferralRewardsDeprecated",
      "msg": "Legacy referral rewards functionality is deprecated. Referral rewards are now stored as credits. Use claim_bonus_mint to redeem credits for bonus mint attempts."
    },
    {
      "code": 6037,
      "name": "insufficientReferralCredits",
      "msg": "Insufficient referral credits. You need at least 5 credits to claim a bonus mint attempt."
    },
    {
      "code": 6038,
      "name": "monthlyBonusMintCapReached",
      "msg": "Monthly bonus mint cap reached. You have reached the maximum of 5 bonus mints per calendar month."
    },
    {
      "code": 6039,
      "name": "bonusMintOverflow",
      "msg": "Bonus mint overflow. The bonus mint counter has reached its maximum value."
    },
    {
      "code": 6040,
      "name": "lockPeriodNotExpired",
      "msg": "Lock period has not expired yet. Tokens can only be unlocked after the 4-year cliff vesting period."
    },
    {
      "code": 6041,
      "name": "alreadyUnlocked",
      "msg": "Tokens have already been unlocked. This operation can only be performed once."
    },
    {
      "code": 6042,
      "name": "timestampOverflow",
      "msg": "Timestamp overflow. The calculated unlock timestamp exceeds the maximum representable value."
    }
  ],
  "types": [
    {
      "name": "businessRegistry",
      "docs": [
        "Business Registry for tracking business-type referrers",
        "PDA Seeds: [b\"business-registry\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "businessReferrers",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "eqxOracle",
      "docs": [
        "EQX Oracle PDA Account",
        "Seeds: [b\"eqx-oracle\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "docs": [
              "Final EQX price in fixed-point (1e8 precision)"
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "Timestamp when price was last updated"
            ],
            "type": "i64"
          },
          {
            "name": "lastUpdatedSlot",
            "docs": [
              "Slot when price was last updated"
            ],
            "type": "u64"
          },
          {
            "name": "componentPricesHash",
            "docs": [
              "Hash of basket component prices used in off-chain calculation (for auditability)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "weightsHash",
            "docs": [
              "Hash of basket weights used in off-chain calculation (for auditability)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "authority",
            "docs": [
              "Authority that can update the oracle (admin)"
            ],
            "type": "pubkey"
          },
          {
            "name": "version",
            "docs": [
              "Version number for governance tracking"
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userCount",
            "type": "u32"
          },
          {
            "name": "totalTransactions",
            "type": "u64"
          },
          {
            "name": "currentEpoch",
            "type": "u64"
          },
          {
            "name": "compoundingComplete",
            "type": "bool"
          },
          {
            "name": "lastEpochUpdateTime",
            "type": "i64"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "minSolBalance",
            "type": "u64"
          },
          {
            "name": "minSlotGapForReferrals",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lockedTokenAccount",
      "docs": [
        "Locked token account storing locked tokens per user",
        "PDA Seeds: [b\"locked-tokens\", authority.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "lockStartTimestamp",
            "type": "i64"
          },
          {
            "name": "unlockTimestamp",
            "type": "i64"
          },
          {
            "name": "isUnlocked",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "socialFundsState",
      "docs": [
        "Social Funds State for tracking activation and monthly distribution",
        "PDA Seeds: [b\"social-funds-state\"]",
        "Activated only after compounding phase ends"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activated",
            "type": "bool"
          },
          {
            "name": "activationTimestamp",
            "type": "i64"
          },
          {
            "name": "lastDistributionYear",
            "type": "u32"
          },
          {
            "name": "lastDistributionMonth",
            "type": "u32"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "docs": [
        "User account storing registration and minting data",
        "PDA Seeds: [b\"user-account\", authority.key()]",
        "This ensures each wallet can only register once (duplicate prevention via PDA uniqueness)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "referral",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "mintedAmount",
            "type": "u64"
          },
          {
            "name": "mintStart",
            "type": "i64"
          },
          {
            "name": "referralRewards",
            "type": "u64"
          },
          {
            "name": "lastMintTime",
            "type": "i64"
          },
          {
            "name": "referralType",
            "type": "u8"
          },
          {
            "name": "referralEventsCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "userMetadata",
      "docs": [
        "User metadata stored in a separate PDA",
        "Seeds: [b\"user-meta\", authority.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "userAccount",
            "type": "pubkey"
          },
          {
            "name": "userType",
            "type": "u8"
          },
          {
            "name": "userIndex",
            "type": "u32"
          },
          {
            "name": "elevatedMintAttemptsUsed",
            "type": "u32"
          },
          {
            "name": "kycVerified",
            "type": "bool"
          },
          {
            "name": "captchaPassed",
            "type": "bool"
          },
          {
            "name": "deviceFingerprint",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "lastReferralSlot",
            "type": "u64"
          },
          {
            "name": "referralsMade",
            "type": "u32"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bonusMintsThisMonth",
            "type": "u8"
          },
          {
            "name": "lastBonusMintYear",
            "type": "u32"
          },
          {
            "name": "lastBonusMintMonth",
            "type": "u32"
          }
        ]
      }
    }
  ]
};
