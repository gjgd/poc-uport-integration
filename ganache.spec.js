jest.useFakeTimers();
const Web3 = require('web3');
const contract = require('truffle-contract');
const resolver = require('did-resolver');
const didRegistryContract = require('ethr-did-registry');
const registerEthrDidToResolver = require('ethr-did-resolver').default;
const HttpProvider = require('ethjs-provider-http');
const EthrDID = require('ethr-did');

describe('With Ganache', () => {
  let provider;
  let web3;
  let registryOwner;
  let identityOwner;
  let newIdentityOwner;
  let delegate;
  let accounts;

  beforeAll(async () => {
    provider = new HttpProvider('http://localhost:8545');
    web3 = new Web3();
    web3.setProvider(provider);
    accounts = await web3.eth.getAccounts();
    registryOwner = accounts[0];
    identityOwner = accounts[1].toLowerCase();
    newIdentityOwner = accounts[2].toLowerCase();
    delegate = accounts[3].toLowerCase();
  });

  let registryAddress;
  let registry;
  describe('Set up registry', () => {
    beforeAll(async () => {
      const DidReg = contract(didRegistryContract);
      DidReg.setProvider(provider);
      registry = await DidReg.new({
        from: registryOwner,
      });
      registryAddress = registry.address;
    });

    it('should deploy the registry contract', () => {
      expect(registryAddress).toBeDefined();
    });
  });

  let did;
  let ethrDid;
  describe('Create an Ethr DID', () => {
    beforeAll(async () => {
      ethrDid = new EthrDID({
        address: identityOwner,
        provider,
        registry: registryAddress.toLowerCase(),
      });
      did = ethrDid.did;
    });

    it('should create a did', () => {
      expect(did).toBeDefined();
    });

    it('should have the right owner', async () => {
      const owner = await ethrDid.lookupOwner();
      expect(owner).toBe(identityOwner);
    });

    it('should fail to resolve without setting up the resolver first', () => {
      expect(resolver(did)).rejects.toThrow("Unsupported DID method: 'ethr'");
    });
  });

  describe('Set up resolver', () => {
    beforeAll(() => {
      registerEthrDidToResolver({
        provider,
        registry: registryAddress,
      });
    });

    it('should resolve the did', async () => {
      const didDocument = await resolver(did);
      expect(didDocument['@context']).toBeDefined();
      expect(didDocument.id).toBe(did);
      expect(didDocument.publicKey).toHaveLength(1);
    });
  });

  describe('Add a delegate', () => {
    beforeAll(async () => {
      await ethrDid.addDelegate(delegate);
    });

    it('should change the DID document', async () => {
      const didDocument = await resolver(did);
      expect(didDocument.publicKey).toHaveLength(2);
      expect(didDocument.publicKey[1].ethereumAddress).toBe(delegate);
    });
  });

  describe('Change owner', () => {
    beforeAll(async () => {
      await ethrDid.changeOwner(newIdentityOwner);
    });

    it('should change the owner in the smart contract', async () => {
      const owner = await ethrDid.lookupOwner();
      expect(owner).toBe(newIdentityOwner);
    });
  });

  describe('Add a large PGP public key', () => {
    it('should add the key in the did document', async () => {
      const value = {
        revocations: '/orbitdb/QmXecs3KW51MvHnH2qzN19gu5fmEtkoU5KwvGavoHEedXM/revocations',
        publicKeyPem: '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v4.0.1\r\nComment: https://openpgpjs.org\r\n\r\nxk8EW/coshMFK4EEAAoCAwT3Om3h2BBBY5W80KBE6MdQhYPAfSeUW8XoluvB\neyDQBV49WeAj1IA5HM+VOZhdc4nbOj98R0Ef3Ki11rurGm5MzQh0ZXN0LWtl\necJ3BBATCAApBQJb9yiyBgsJBwgDAgkQ2Lc5m5Vfb/4EFQgKAgMWAgECGQEC\nGwMCHgEAAKBQAQCR1AqE7Z41wGaArR+PUzspoyuYu1I8Ne5SpuY5jVlgaQEA\n0NDz5Dm9mQ5rgI2Jdrnq0TYH3vrhNdaugfzhDnlYjOHOUwRb9yiyEgUrgQQA\nCgIDBAnQM+84qvBafoux2fyXgNt/OrEXQs+X6uQx6b63MtmebnMPlBlBiMu2\nKoQIi7MNaixhbxC42xE8e8JLURjYpGwDAQgHwmEEGBMIABMFAlv3KLIJENi3\nOZuVX2/+AhsMAADA8gEAldik6/Z8JJlbfJKjRpOUE1uieGKxGG3Kudabi80J\nlOQA/iUqKVWDLEcANaXKqHAOZeyefTfK6TY4S4/vQIdgt7DD\r\n=N/BE\r\n-----END PGP PUBLIC KEY BLOCK-----\r\n\r\n',
      };
      const valueStr = JSON.stringify(value);
      const valueBase64 = Buffer.from(valueStr).toString('hex');
      await ethrDid.setAttribute('did/pub/Secp256k1/veriKey/value', `0x${valueBase64}`, 86400, 200000);
      const didDocument = await resolver(did);
      const returnedValue = didDocument.publicKey[2].value;
      const returnedValueStr = Buffer.from(returnedValue.substring(2), 'hex').toString();
      const returnedValueParsed = JSON.parse(returnedValueStr);
      expect(returnedValueParsed).toEqual(value);
    });
  });

  describe('Add an hex public key', () => {
    it('should add the key in the did document', async () => {
      const publicKeyHex = '0x043e82ae1c5056ece9e12f1fe036a5430eae6b5b6ea06e97ff9484042aaf1e9621efdb928e47f4cde38d5e8694951abe156e625a15eaae0af0e303d5a40e3fe7d6';
      await ethrDid.setAttribute('did/pub/Secp256k1/veriKey/hex', publicKeyHex);
      const didDocument = await resolver(did);
      const returnedPublicKeyHex = didDocument.publicKey[3].publicKeyHex;
      expect(returnedPublicKeyHex).toBe(returnedPublicKeyHex);
    });
  });

  describe('Add an rsa public key', () => {
    it('should add the key in the did document', async () => {
      const rsa4096PublicKey = `-----BEGIN PUBLIC KEY-----
      MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAolN9csarxOP++9pbjLE/
      /ybicmTGL0+or6LmLkos9YEXOb8w1RaoQoLuPNbCqfHlnbiPdvl9zdVHCswf9DwK
      Ba6ecs0Vr3OW3FTSyejHiqinkfmEgRKOoAf7S8nQcsiDzANPondL+1z+dgmo8nTK
      9806ei8LYzKzLjpi+SmdtTVvUQZGuxAT1GuzzT5jyE+MyR2zwSaCTyNC6zwnk51i
      z+zf8WRNe32WtBLhNbz6MKlwup1CSear9oeZQJRQspkud7b84Clv6QeOCPqMuRLy
      ibM8J+BC5cRyxVyV2rHshvD134cbR6uEIsggoC9NvvZcaJlcG25gA7rUrIJ8CGEG
      9WZsmqUfrykOJ3HFqGyJZlpVq0hHM6ikcexdbqPFcwj9Vcx3yecb6WABZCeYVHDw
      3AoGu/Y/m2xJ7L3iPCWcpB94y0e7Yp3M6S8Y4RpL2iEykCXd7CVYVV1QVPz4/5D8
      mT4S4PG0I0/yBbblUz9CcYSJ/9eFOekSRY7TAEEJcrBY7MkXZcNRwcFtgi9PWpaC
      XTsIYri2eBKqAgFT9xaPiFCFYJlpfUe81pgp+5mZsObYlB0AKJb7o0rRa5XLO4JL
      ZiovTaqHZW9gvO3KZyJNYx7XM9Vjwm4FB5NUxSvqHJyUgGC6H7jwK2wKtrThrjkt
      P9+7B63q+4nzilC9UUHEIosCAwEAAQ==
      -----END PUBLIC KEY-----`;
      await ethrDid.setAttribute('did/pub/RSA/veriKey/pem', rsa4096PublicKey, 86400, 200000);
      const didDocument = await resolver(did);
      const returnedRsaKey = didDocument.publicKey[4].publicKeyPem;
      expect(returnedRsaKey).toBe(rsa4096PublicKey);
    });
  });
});
