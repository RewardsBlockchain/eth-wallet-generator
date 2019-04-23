const identicon = require("./identicon.js");
const qr = require("qr-image");
const ethUtil = require("ethereumjs-util");
const uuidv4 = require("uuid/v4");
const scrypt = require("scryptsy");
const readline = require("readline");
const crypto = require("crypto");
const fs = require("fs");

function EthWallet() {
    this.privateKeyBuffer = "";
    this.privateKeyString = "";
    this.ethAddress = "";
    this.userPassword = "";
    this.walletCurrent = 1;
    this.walletMax = 1;

    if (!fs.existsSync("./wallets")) fs.mkdirSync("./wallets");
    if (!fs.existsSync("./wallets/Identicon")) fs.mkdirSync("./wallets/Identicon");
    if (!fs.existsSync("./wallets/KeyStore")) fs.mkdirSync("./wallets/KeyStore");
    if (!fs.existsSync("./wallets/QR/PRV")) fs.mkdirSync("./QR/PRV");
    if (!fs.existsSync("./wallets/QR/PUB")) fs.mkdirSync("./wallets/QR/PUB");
}

EthWallet.prototype.Menu = function () {
    return new Promise((resolve) => {
        var self = this;
        process.stdout.write("\033c");
        console.log("------Welcome to the------");
        console.log(" RewardsToken Wallet Generator ");
        console.log("========== Menu ==========");
        console.log("1) Generate a single wallet");
        console.log("2) Generate multiple wallets");
        console.log("3) Get data from private key");
        console.log("4) Quit");
        console.log("");

        var rl = readline.createInterface({
            "input": process.stdin,
            "output": process.stdout
        });

        rl.question("Select an option: ", (answer) => {
            if (answer == 1) {
                rl.close();
                self.walletCurrent = 1;
                self.walletMax = 1;
                self.PromptUserForPassword()
                    .then(() => self.GenerateWallet());
                resolve();
            }
            else if (answer == 2) {
                rl.close();
                self.PromptUserForPassword()
                    .then(() => self.GenerateMultipleWallets());
                resolve();
            }
            else if (answer == 3) {
                rl.close();
                self.GetDataFromPrivateKey()
                resolve();
            }
            else {
                rl.close();
                self.Menu();
                resolve();
            }
        });
    })
};

EthWallet.prototype.GetDataFromPrivateKey = function () {
    return new Promise((resolve) => {
        var self = this;

        var rl = readline.createInterface({
            "input": process.stdin,
            "output": process.stdout
        });

        rl.question("Type in a 64-character hexadecimal string and hit enter\n", (answer) => {
            rl.close();

            var buffHex = new Buffer(answer, "hex");
            self.privateKeyBuffer = buffHex;
            self.privateKeyString = self.privateKeyBuffer.toString("hex");

            self.PromptUserForPassword()
                .then(() => self.GetEthAddress())
                .then(() => self.GetQrCodes())
                .then(() => self.GetIdenticon())
                .then(() => self.GetKeystoreFile())
                .then(() => {
                    console.log(`Wallets generated: ${self.walletCurrent}/${self.walletMax}`);
                    resolve();
                });
        });
    })
};

EthWallet.prototype.PromptUserForPassword = function () {
    return new Promise((resolve) => {
        var self = this;

        var rl = readline.createInterface({
            "input": process.stdin,
            "output": process.stdout
        });

        rl.question("Enter a password to encrypt your private key: ", (answer) => {
            rl.close();
            self.userPassword = answer;
            resolve();
        });
    })
};

EthWallet.prototype.GenerateMultipleWallets = function () {
    return new Promise((resolve) => {
        var self = this;

        var rl = readline.createInterface({
            "input": process.stdin,
            "output": process.stdout
        });

        rl.question("Enter the number of wallets you want to generate: ", (answer) => {
            answer = String(answer).replace(/^\s+|\s+$/g, "");
            if (!isNaN(answer) && answer != "") {
                rl.close();
                self.walletCurrent = 1;
                self.walletMax = parseInt(answer, 10);
                self.GenerateWallet();
                resolve();
            } else {
                rl.close();
                self.GenerateMultipleWallets();
                resolve();
            }
        });
    })
};

EthWallet.prototype.GenerateWallet = function () {
    return new Promise((resolve) => {
        var self = this;
        try {
        self.GetPrivateKey()
            .then(() => self.GetEthAddress())
            .then(() => self.GetQrCodes())
            .then(() => self.GetIdenticon())
            .then(() => self.GetKeystoreFile())
            .then(() => {
                console.log(`Wallets generated: ${self.walletCurrent}/${self.walletMax}`);
                if (self.walletCurrent++ < self.walletMax)
                    self.GenerateWallet();
            });
        } catch(e) {
            console.log(e);
        }

    })
};

EthWallet.prototype.GetPrivateKey = function () {
    return new Promise((resolve) => {
        var self = this;
        self.privateKeyBuffer = crypto.randomBytes(32);
        self.privateKeyString = self.privateKeyBuffer.toString("hex");
        resolve();
    })
};

EthWallet.prototype.GetEthAddress = function () {
    return new Promise((resolve) => {
        var self = this;
        self.ethAddress = "0x" + ethUtil.privateToAddress(self.privateKeyBuffer).toString("hex");
        console.log(self.ethAddress);
        resolve();
    })
};

EthWallet.prototype.GetQrCodes = function () {
    return new Promise((resolve) => {
        var self = this;
        var qrPrivateKey = qr.image(self.privateKeyString);
        var qrEthAddress = qr.image(self.ethAddress);

        // create directory if does not exist
        qrPrivateKey.pipe(fs.createWriteStream(`wallets/QR/PRV/Private-${self.walletCurrent}.png`));
        qrEthAddress.pipe(fs.createWriteStream(`wallets/QR/PUB/Public-${self.walletCurrent}.png`));

        resolve();
    });
};
// IDENTITY ICON PRINT
EthWallet.prototype.GetIdenticon = function () {
    return new Promise((resolve) => {
        var self = this;
        var icon = identicon.CreateIcon(self.ethAddress);

        fs.writeFileSync(`wallets/Identicon/identicon-${self.walletCurrent}.png`, icon);

        resolve();
    })
};

EthWallet.prototype.GetKeystoreFile = function () {
    return new Promise((resolve) => {
        var self = this;
        var salt = crypto.randomBytes(32);
        var iv = crypto.randomBytes(16);
        var scryptKey = scrypt(self.userPassword, salt, 8192, 8, 1, 32);

        var cipher = crypto.createCipheriv("aes-128-ctr", scryptKey.slice(0, 16), iv);
        var first = cipher.update(self.privateKeyBuffer);
        var final = cipher.final();
        var ciphertext = Buffer.concat([first, final]);

        var sliced = scryptKey.slice(16, 32);
        sliced = new Buffer(sliced, "hex");
        var mac = ethUtil.sha3(Buffer.concat([scryptKey.slice(16, 32), Buffer.from(ciphertext, "hex")]))

        var hexCiphertext = ciphertext.toString("hex");
        var hexIv = Buffer.from(iv).toString("hex");
        var hexSalt = Buffer.from(salt).toString("hex");
        var hexMac = Buffer.from(mac).toString("hex");

        var keystoreFile = {
            "version": 3,
            "id": uuidv4({random: crypto.randomBytes(16)}),
            "address": self.ethAddress.slice(-40),
            "crypto": {
                "ciphertext": hexCiphertext,
                "cipherparams": {
                    "iv": hexIv
                },
                "cipher": "aes-128-ctr",
                "kdf": "scrypt",
                "kdfparams": {
                    "dklen": 32,
                    "salt": hexSalt,
                    "n": 8192,
                    "r": 8,
                    "p": 1
                },
                "mac": hexMac
            }
        };

        // PRINT DATA SECTION
        var data = `Addr-${self.walletCurrent}, ${self.ethAddress}, `;
        data += `Prv-${self.walletCurrent}, ${self.privateKeyString},\n`;
        // WRITE DATA ----

        //KeyStore
        fs.writeFileSync(`wallets/KeyStore/Keystore-${self.walletCurrent}.json`, JSON.stringify(keystoreFile, null, 2) + "\n");

        //Wallet String Txt
        fs.writeFileSync(`wallets/String-${self.walletCurrent}.txt`, data);
        resolve();
    })
};

var ethWallet = new EthWallet();
ethWallet.Menu();

// System.Diagnostics.Process.Start("python.exe", "converter.py");


