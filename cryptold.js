const { generateKeyPairSync, publicEncrypt,publicDecrypt, privateDecrypt,privateEncrypt } = require('crypto');

const PassPhrase = "The Moon is a Harsh Mistress.";

const Bits = 1024;

const encryptWithRSA = (input, publickey) => {
    const buffer = Buffer.from(input, 'utf-8');
    const encrypted = publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
}

const decryptWithRSA = function (input, privatekey) {
    const buffer = Buffer.from(input, 'base64');
    const decrypted = privateDecrypt(
        {
            key: privatekey,
            passphrase: PassPhrase,
        },
        buffer,
    )
    return decrypted.toString("utf8");
};
const decryptWithPublicKey = function(input, publicKey){
    const buffer = Buffer.from(input, 'base64');
    const decrypted = publicDecrypt(
        {
            key: publicKey,
        },
        buffer,
    )
    return decrypted.toString("utf8");
}
const encryptWithPrivateKey = function(input, publicKey){
    const buffer = Buffer.from(input, 'base64');
    const decrypted = privateEncrypt(
        {
            key: publicKey,
            passphrase: PassPhrase,
        },
        buffer,
    )
    return decrypted.toString("utf8");
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: Bits,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: PassPhrase
    }
});

const encrypted = encryptWithRSA('yes i know', publicKey)
console.log(encrypted);

console.log(decryptWithRSA(encrypted, privateKey));
export{encryptWithPublicKey,decryptWithPrivateKey,encryptWithPrivateKey,decryptWithPublicKey,generateKeys}