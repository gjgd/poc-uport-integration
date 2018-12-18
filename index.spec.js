jest.useFakeTimers();
const Web3 = require('web3');
const contract = require('truffle-contract');
const resolver = require('did-resolver');
const EthrDID = require('ethr-did');
const didRegistryContract = require('ethr-did-registry');
const registerEthrDidToResolver = require('ethr-did-resolver').default;
const HttpProvider = require('ethjs-provider-http');

describe('With Ganache', () => {
  let provider;
  let web3;
  let registryOwner;
  let accounts;

  beforeAll(async () => {
    provider = new HttpProvider('http://localhost:8545');
    web3 = new Web3();
    web3.setProvider(provider);
    accounts = await web3.eth.getAccounts();
    registryOwner = accounts[0];
  });

  let registryAddress;
  let registry;
  describe('Set up registry', () => {
    beforeAll(async () => {
      const DidReg = contract(didRegistryContract);
      DidReg.setProvider(provider);
      registry = await DidReg.new({
        from: registryOwner,
        gasPrice: 100000000000,
        gas: 4712388,
      });
      registryAddress = registry.address;
    });

    it('should deploy the registry contract', () => {
      expect(registryAddress).toBeDefined();
    });
  });

  let did;
  let ethrDid;
  let myAddress;
  describe('Create an Ethr DID', () => {
    beforeAll(async () => {
      const keyPair = EthrDID.createKeyPair();
      myAddress = keyPair.address;
      ethrDid = new EthrDID({
        address: keyPair.address,
        privateKey: keyPair.privateKey,
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
      return expect(owner).toBe(myAddress);
    });

    // eslint-disable-next-line
    it('should fail to resolve without setting up the resolver first', () => {
      return expect(resolver(did)).rejects.toThrow("Unsupported DID method: 'ethr'");
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
    });
  });
});
