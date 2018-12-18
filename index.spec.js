const resolve = require('did-resolver');
const ethrDidResolver = require('ethr-did-resolver');

const register = ethrDidResolver.default;
const EthrDID = require('ethr-did');
const Contract = require('truffle-contract');
const DidRegistryContract = require('ethr-did-registry');
const Web3 = require('web3');

describe('With Ganache', () => {
  let provider;
  let web3;
  let registryOwner;

  beforeAll(async () => {
    provider = new Web3.providers.HttpProvider('http://localhost:8545');
    web3 = new Web3();
    web3.setProvider(provider);
    const getAccounts = () => new Promise((_resolve, reject) => {
      web3.eth.getAccounts((error, accounts) => {
        if (error) {
          reject(error);
        } else {
          _resolve(accounts);
        }
      });
    });
    const accounts = await getAccounts();
    registryOwner = accounts[0];
  });

  let registryAddress;
  describe('Set up registry', () => {
    beforeAll(async () => {
      const DidReg = Contract(DidRegistryContract);
      DidReg.setProvider(provider);
      const registry = await DidReg.new({
        from: registryOwner,
        gasPrice: 100000000000,
        gas: 4712388,
      });
      registryAddress = registry.address.toLowerCase();
    });

    it('should deploy the registry contract', () => {
      expect(registryAddress).toBeDefined();
    });
  });

  let did;
  describe('Create an Ethr DID', () => {
    beforeAll(async () => {
      const keyPair = EthrDID.createKeyPair();
      const ethrDid = new EthrDID({
        address: keyPair.address,
        provider,
        registry: registryAddress.toLowerCase(),
      });
      did = ethrDid.did;
    });

    it('should create a did', () => {
      expect(did).toBeDefined();
    });

    it('should fail to resolve without setting up the resolver first', () => expect(resolve(did)).rejects.toThrow("Unsupported DID method: 'ethr'"));
  });

  describe('Set up resolver', () => {
    beforeAll(() => {
      register({
        provider,
        registry: registryAddress,
      });
    });

    it('should resolve the did', async () => {
      const didDocument = await resolve(did);
      expect(didDocument['@context']).toBeDefined();
      expect(didDocument.id).toBe(did);
    });
  });
});
