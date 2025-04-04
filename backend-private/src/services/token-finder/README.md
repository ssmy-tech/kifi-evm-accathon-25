# Description

The token_finder program scans Ethereum (or similar EVM) logs in chunks of 10,000 blocks, detecting newly created liquidity pools from multiple DEX factories (Uniswap V2, SushiSwap, Uniswap V3, PancakeSwap). It retrieves the corresponding token addresses, calls symbol() and name() on each token, fetches the block timestamp, and stores all of these details in a PostgreSQL database. The result is a continuously updated record of newly created DEX liquidity pools, including their tokens' metadata and the time they were created.

# Install PostgreSQL

* sudo apt install postgresql
* sudo -u postgres createuser kifiadmin
* sudo -u postgres createdb kifitokens
* sudo -u postgres psql

```
    alter user <database user> with encrypted password '<database password>';
    grant all privileges on database <database name> to <database user>;
```

# Install libcurl

* sudo apt install libcurl4-openssl-dev

# Install libpqxx

* sudo apt install libpqxx-dev

# Install nlohmann-json3-dev

* sudo apt install nlohmann-json3-dev

# PostgreSQL Table Setup

```
CREATE TABLE IF NOT EXISTS block_info (
  id SERIAL PRIMARY KEY,
  last_block_processed TEXT -- or BIGINT, depending on how you store it
);

CREATE TABLE IF NOT EXISTS liquidity_pools (
  pool_address TEXT PRIMARY KEY,
  dex_name TEXT,
  token0_address TEXT,
  token1_address TEXT,
  token0_symbol TEXT,
  token0_name TEXT,
  token1_symbol TEXT,
  token1_name TEXT,
  fee INTEGER,
  tick_spacing INTEGER,
  block_discovered TEXT,
  block_timestamp TIMESTAMP
);


\set user '<Database User>'
-- or $ psql --set=user="<database user>" 

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON block_info to :user;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON liquidity_pools to :user;

-- [Optional] Set first block to process. Block 0x14FFD5C has a UniswapV3 PoolCreated event.

DELETE FROM block_info;
INSERT INTO block_info (id, last_block_processed) 
  VALUES (1, '0x14FFD5B')
  ON CONFLICT (id) DO NOTHING;

```

# Environment Variables

```
DB_HOST=<PostgreSQL Database Host Name or IP Address>
DB_NAME=<PostgreSQL Database Name>
DB_USER=<PostgreSQL Database User>
DB_PASS=<Password for PostgreSQL Database User>
QUICKNODE_API_URL=<Quicknode URL>/<Quicknode API Key>/

```
