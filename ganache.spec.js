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
      await ethrDid.setAttribute('did/pub/Secp256k1/veriKey/pem', `0x${valueBase64}`, 86400, 200000);
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
});
