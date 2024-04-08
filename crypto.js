var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
const { generateKeyPairSync } = require('crypto')

function encryptWithPublicKey(toEncrypt, publicKey) {
    var buffer = Buffer.from(toEncrypt);
    var encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
};

function decryptWithPrivateKey(toDecrypt, privateKey, user, pass) {
    var buffer = Buffer.from(toDecrypt, "base64");
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey.toString(),
            passphrase: user+pass,
        },
        //privateKey,
        buffer,
    )
    return decrypted.toString("utf8");
};
/*
function encryptWithPrivateKey(toEncrypt, privateKey, user, pass){
    var buffer = Buffer.from(toEncrypt);
    const encrypted = crypto.privateEncrypt(
        {
            key: privateKey.toString(),
            passphrase: user+pass,
        }, 
        buffer
    )
    return encrypted.toString("base64");
}
function decryptWithPublicKey(toDecrypt, publicKey){
    var buffer = Buffer.from(toDecrypt);
    const decrypted = crypto.publicDecrypt(
        publicKey, buffer
    )
    return decrypted.toString("utf8");
}
*/
/**
 * Returns a signature from a string and a public key.
 * @param {String} data 
 * @param {*} privateKey 
 * @returns 
 */
function sign(data,privateKey//,user,pass
){
    let sign = crypto.createSign('SHA256');
    sign.write(data);
    sign.end();
    let signature = sign.sign(privateKey,  'hex');
    return signature
}
/**
 * Returns true if the signature is correct according to the data and the publicKey
 * @param {*} signature 
 * @param {String} data 
 * @param {*} publicKey 
 * @returns 
 */
function verify(signature,data,publicKey){
    let verify = crypto.createVerify('SHA256');
    verify.write(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
}
function importKey(key){
    /*if(typeof key === 'string' || key instanceof String) return crypto.createPublicKey(key);
    return key;*/
    return key;
}
function exportKey(key){
    /*if(typeof key === 'string' || key instanceof String) return key;
    return key.export({
        type: 'spki',
        format: 'pem'
    });*/
    return key;
}


/**
 * 
 * @param {String} passphrase A password to use as a base to generate the key pair. Recommended usage: username+password when creating the user.
 * @returns [privateKey, publicKey] The resulting key pair.
 */
function generateKeys() {
    /*const passphrase=user+pass
    console.log(passphrase)
    //const privateKey = crypto.createPrivateKey(passphrase)
    //const publicKey = crypto.createPublicKey(privateKey)
    const { publicKey, privateKey } = generateKeyPairSync('rsa', 
    {
            'modulusLength': 4096,
            'namedCurve': 'secp256k1', 
            'publicKeyEncoding': {
                'type': 'spki',
                'format': 'pem'     
            },     
            'privateKeyEncoding': {
                'type': 'pkcs8',
                'format': 'pem',
                'cipher': 'aes-256-cbc'//,
                //'passphrase': user+pass
            } 
    });
    
    //writeFileSync('private.pem', privateKey)
    //writeFileSync('public.pem', publicKey)
    console.log(privateKey)
    console.log(publicKey)*/
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
      });
    return [privateKey, publicKey]
}

// let (privateKey,publicKey)= generateKeys();
// let a = encryptWithPublicKey("hello", publicKey)
// let b = decryptWithPrivateKey(a, privateKey);
// console.log(b)
export{encryptWithPublicKey,decryptWithPrivateKey,sign,verify,generateKeys,importKey,exportKey}