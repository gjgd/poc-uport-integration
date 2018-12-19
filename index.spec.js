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
});
