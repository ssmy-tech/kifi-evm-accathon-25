PostgreSQL Table Setup

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

```

Environment Variables

```
DB_HOST=<PostgreSQL Database Host Name or IP Address>
DB_NAME=<PostgreSQL Database Name>
DB_USER=<PostgreSQL Database User>
DB_PASS=<Password for PostgreSQL Database User>
QUICKNODE_API_URL=<Quicknode URL>/<Quicknode API Key>/

```
