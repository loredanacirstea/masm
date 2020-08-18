# MacroEVM

In-work.

Now, it can be used to assemble asm to bytecode.

## Use

Start client (see Development).
You can use it as a Remix IDE local plugin: http://remix-alpha.ethereum.org.

- works on http://remix-alpha.ethereum.org - Remix alpha version, on http
- activate the `Run and Deploy Transactions` plugin
- name the plugin: `mevm`
- url: `http://localhost:8080`
- location: `Side Panel`

- write your assembly text or load an example from the plugin
- open the mevm plugin & click the `Compile` button

- to deploy, go to the deployment step (top right)
- enter deployment arguments in hex format, if any
- click the `Deploy` button

- you can interact with the deployed contract functions if you supply the full signatures in the source code - e.g. `sig"function get() view public returns (uint256)"`

- you can activate Remix's `Debugger` plugin and paste the transaction hash to debug.

## Development

### Client
```
cd client
npm install
```

#### Compiles and hot-reloads for development
```
npm run serve
```

#### Compiles and minifies for production
```
npm run build
```

#### Run your tests
```
npm run test
```

#### Lints and fixes files
```
npm run lint
```
