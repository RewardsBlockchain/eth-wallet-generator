# Ethereum Wallet Generator

```
git clone https://github.com/RewardsBlockchain/eth-wallet-generator/
cd eth-wallet-generator
npm i
npm run start
```

A directory named `wallets` will be created when you first run this program. Inside there will be four files:

- **eth-address.png** - QR code for your Ethereum address
- **private-key.png** - QR code for your private key
- **identicon.png** - The identicon for your Ethereum address
- **wallet.json** - Keystore file that contains your private key if you unencrypt it with a password



-Filestreams:
1 Wallets/QR/Public
2 Wallets/QR/Private
3 Wallets/KeyStore
4 Wallets/Identicon
5 -WalletString.txt


// How to Run:
0) install all global dependencies from package.json
00) update npm  : npm i update
1) Run 'npm start' to begin generating wallets
 -> wallets are generated in /Wallets  within appropriate subfolders
2) Run python script to compile all files to List.txt
	'python convert.py'
3) Import List.txt to Excel as CSV
