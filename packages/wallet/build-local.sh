npm run prepack
npm pack
cp deroll-wallet-0.3.7.tgz ../../../cartesify-nodejs-rest-example/backend

cd ../../../cartesify-nodejs-rest-example/backend
npm uninstall @deroll/wallet
npm i ./deroll-wallet-0.3.7.tgz
