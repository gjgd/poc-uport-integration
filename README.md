# POC for Uport integration

This repo is a POC for creating, resolving and updating a did:ethr identity on Ganache and Ropsten

## Running the POC

```bash
yarn
npx ganache-cli # in a separate terminal for ganache setup
export UPORT_INFURAURL="https://ropsten.infura.io/v3/<API_KEY>" # infura rpc connection for ropsten setup
export UPORT_MNEMONIC="word1 word2 ..."; # funded account mnemonic for ropsten setup
yarn test
```
