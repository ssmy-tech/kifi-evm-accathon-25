#include <iostream>
#include <string>
#include <cstdlib>      // getenv
#include <stdexcept>
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <chrono>
#include <thread>       // for sleep_for
#include <pqxx/pqxx>
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include "keccak.hpp" // for keccak256

using json = nlohmann::json;

/**
 * Return current local timestamp in "[YYYY-MM-DD HH:MM:SS] " format
 */
static std::string getTimestamp() {
    using namespace std::chrono;
    auto now = system_clock::now();
    std::time_t tt = system_clock::to_time_t(now);
    std::tm localTime = *std::localtime(&tt);

    char buf[64];
    std::strftime(buf, sizeof(buf), "[%Y-%m-%d %H:%M:%S] ", &localTime);
    return std::string(buf);
}

/**
 * Return environment variable or default
 */
static std::string getEnvOrDefault(const char* varName, const char* defaultVal) {
    const char* val = std::getenv(varName);
    return (val ? std::string(val) : std::string(defaultVal));
}

// cURL write callback
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((std::string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

/**
 * Generic JSON-RPC call to QuickNode, logs request and up to 240 chars of response, strips trailing newlines.
 */
static json quickNodeJsonRpcCall(const std::string& rpcUrl, const json& requestBody) {
    // Convert to string
    std::string requestData = requestBody.dump();
    std::cout << getTimestamp() << "[DEBUG] JSON-RPC REQUEST: " << requestData << std::endl;

    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to init cURL in quickNodeJsonRpcCall");
    }

    std::string responseString;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, rpcUrl.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, requestData.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseString);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
        throw std::runtime_error(std::string("cURL error: ") + curl_easy_strerror(res));
    }

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);

    if (httpCode < 200 || httpCode >= 300) {
        throw std::runtime_error("HTTP code=" + std::to_string(httpCode)
                                 + ", response=" + responseString);
    }

    // Remove trailing newline if any
    while (!responseString.empty() && (responseString.back() == '\n' || responseString.back() == '\r')) {
        responseString.pop_back();
    }

    // Log up to 240 chars
    std::string displayResp = responseString.substr(0, std::min<size_t>(240, responseString.size()));
    std::cout << getTimestamp() << "[DEBUG] JSON-RPC RESPONSE: " << displayResp << std::endl;

    // parse JSON
    json resp;
    try {
        resp = json::parse(responseString);
    } catch(const std::exception& e) {
        throw std::runtime_error("JSON parse error: " + std::string(e.what()));
    }
    if (resp.contains("error")) {
        throw std::runtime_error("JSON-RPC error: " + resp["error"].dump());
    }
    return resp;
}

/**
 * Call ERC-20 symbol() or name() => pass 4-byte selector.
 */
static std::string callErc20Function(const std::string& rpcUrl,
                                     const std::string& contractAddress,
                                     const std::string& hexSelector)
{
    json requestBody = {
        {"jsonrpc", "2.0"},
        {"id", 1},
        {"method", "eth_call"},
        {"params", json::array({
            {
                {"to", contractAddress},
                {"data", hexSelector}
            },
            "latest"
        })}
    };

    std::string requestData = requestBody.dump();
    std::cout << getTimestamp() << "[ERC20 DEBUG] JSON-RPC REQUEST: " << requestData << std::endl;

    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to init cURL in callErc20Function()");
    }

    std::string responseString;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, rpcUrl.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, requestData.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseString);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
        throw std::runtime_error(std::string("cURL error: ") + curl_easy_strerror(res));
    }

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);
    curl_easy_cleanup(curl);
    curl_slist_free_all(headers);

    if (httpCode < 200 || httpCode >= 300) {
        throw std::runtime_error("HTTP code=" + std::to_string(httpCode)
                                 + ", response=" + responseString);
    }

    while (!responseString.empty() && (responseString.back() == '\n' || responseString.back() == '\r')) {
        responseString.pop_back();
    }

    std::string displayResp = responseString.substr(0, std::min<size_t>(240, responseString.size()));
    std::cout << getTimestamp() << "[ERC20 DEBUG] JSON-RPC RESPONSE: " << displayResp << std::endl;

    json jsonResp;
    try {
        jsonResp = json::parse(responseString);
    } catch(const std::exception& e) {
        throw std::runtime_error("JSON parse error: " + std::string(e.what()));
    }
    if (jsonResp.contains("error")) {
        throw std::runtime_error("JSON-RPC error: " + jsonResp["error"].dump());
    }
    if (!jsonResp.contains("result")) {
        return "";
    }
    return jsonResp["result"].get<std::string>();
}

/**
 * decode typical ABI-encoded string
 */
static std::string decodeStringFromHex(const std::string& hexData) {
    if (hexData.size() < 2 || hexData.rfind("0x", 0) != 0) {
        return "";
    }
    std::string raw = hexData.substr(2);

    if (raw.size() < 128) {
        return "";
    }

    uint64_t length = std::stoull(raw.substr(64, 64), nullptr, 16);
    if (length > 1000) {
        return "";
    }

    size_t dataStart = 128;
    size_t stringHexLen = length * 2;
    if (dataStart + stringHexLen > raw.size()) {
        return "";
    }

    std::string hexStringBytes = raw.substr(dataStart, stringHexLen);
    std::string result;
    result.reserve(length);

    for (size_t i = 0; i < stringHexLen; i += 2) {
        std::string byteStr = hexStringBytes.substr(i, 2);
        char c = static_cast<char>(std::stoi(byteStr, nullptr, 16));
        result.push_back(c);
    }
    return result;
}

static std::string getErc20Symbol(const std::string& rpcUrl, const std::string& tokenAddress) {
    try {
        std::string hexResult = callErc20Function(rpcUrl, tokenAddress, "0x95d89b41");
        return decodeStringFromHex(hexResult);
    } catch(...) {
        return "";
    }
}

static std::string getErc20Name(const std::string& rpcUrl, const std::string& tokenAddress) {
    try {
        std::string hexResult = callErc20Function(rpcUrl, tokenAddress, "0x06fdde03");
        return decodeStringFromHex(hexResult);
    } catch(...) {
        return "";
    }
}

static std::string decimalToHex(int64_t blockNum) {
    std::ostringstream ss;
    ss << "0x" << std::hex << blockNum;
    return ss.str();
}

// Uniswap V2 => PairCreated => "0x0d3648bd..."
// Uniswap V3 => PoolCreated => "0x783cca1c..."
static const std::string V2_SIG = keccak256("PairCreated(address,address,address,uint256)");
static const std::string V3_SIG = keccak256("PoolCreated(address,address,uint24,int24,address)");

struct DexDefinition {
    std::string dexName;
    std::string factoryAddress;
    bool isV2Style;
};

// We'll handle UniswapV2, SushiSwap, UniswapV3, PancakeSwap
static std::vector<DexDefinition> DEXES = {
    {"UniswapV2",   "0x5C69Bee701EF814A2B6a3EDD4B1652CB9cc5aA6f", true},
    {"SushiSwap",   "0xC0AEe478e3658e2610c5F7A4A2E1777Ce9e4f2Ac", true},
    {"UniswapV3",   "0x1F98431c8aD98523631AE4a59f267346ea31F984", false},
    {"PancakeSwap", "0xca143ce32fe78f1f7019d7d551a6402fc5350c73", true}
};

/**
 * Query logs for one DEX in a block range
 */
static std::vector<json> getDexLogs(const std::string& rpcUrl,
                                    const DexDefinition& dex,
                                    int64_t startBlock,
                                    int64_t endBlock)
{
    std::string sig = (dex.isV2Style ? V2_SIG : V3_SIG);

    auto dec2hex = [&](int64_t x){
        std::ostringstream ss; ss << "0x" << std::hex << x;
        return ss.str();
    };

    json params = {
        {"fromBlock", dec2hex(startBlock)},
        {"toBlock",   dec2hex(endBlock)},
        {"address",   dex.factoryAddress},
        {"topics", json::array({json::array({sig})})}
    };

    json req = {
        {"jsonrpc", "2.0"},
        {"id", 1},
        {"method", "eth_getLogs"},
        {"params", json::array({params})}
    };

    json resp = quickNodeJsonRpcCall(rpcUrl, req);
    if (!resp.contains("result") || !resp["result"].is_array()) {
        return {};
    }
    std::vector<json> logs;
    for (auto& e : resp["result"]) {
        logs.push_back(e);
    }
    return logs;
}

/**
 * Convert last 20 bytes from a zero-padded 32-byte => "0x..."
 */
static std::string topicToAddress(const std::string& topic) {
    if (topic.size() < 66) {
        return "";
    }
    return "0x" + topic.substr(topic.size() - 40);
}

/**
 * get block timestamp as an integer of seconds, then convert to SQL timestamp using to_timestamp
 */
static int64_t getBlockTimestamp(const std::string& rpcUrl, const std::string& blockHex) {
    // e.g. eth_getBlockByNumber( blockHex, false ) => "timestamp"
    json req = {
        {"jsonrpc", "2.0"},
        {"id", 1},
        {"method", "eth_getBlockByNumber"},
        {"params", json::array({blockHex, false})}
    };
    json resp = quickNodeJsonRpcCall(rpcUrl, req);
    if (!resp.contains("result") || resp["result"].is_null()) {
        return 0;
    }
    if (!resp["result"].contains("timestamp")) {
        return 0;
    }
    std::string tsHex = resp["result"]["timestamp"].get<std::string>(); // e.g. "0x6245f31a"
    return std::stoll(tsHex.substr(2), nullptr, 16);
}

// load last block
static std::string loadLastBlockProcessed(pqxx::connection& conn) {
    pqxx::work txn(conn);
    auto r = txn.exec("SELECT last_block_processed FROM block_info WHERE id=1");
    txn.commit();
    if (r.size() == 1 && !r[0]["last_block_processed"].is_null()) {
        return r[0]["last_block_processed"].as<std::string>();
    }
    return "0x0";
}

/**
 * Save last block processed, do an upsert so it works even if table was initially empty
 */
static void saveLastBlockProcessed(pqxx::connection& conn, const std::string& blockHex) {
    static const char* upsertSQL = R"SQL(
        INSERT INTO block_info (id, last_block_processed)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE
          SET last_block_processed = EXCLUDED.last_block_processed
    )SQL";

    pqxx::work txn(conn);
    txn.exec_params(upsertSQL, blockHex);
    txn.commit();
}

/**
 * Insert or update liquidity_pools, storing block_timestamp as a SQL TIMESTAMP
 */
static void insertLiquidityPool(pqxx::connection& conn,
                                const std::string& dexName,
                                const std::string& poolAddress,
                                const std::string& token0,
                                const std::string& token1,
                                const std::string& token0Symbol,
                                const std::string& token0Name,
                                const std::string& token1Symbol,
                                const std::string& token1Name,
                                int fee,
                                int tickSpacing,
                                const std::string& blockHex,
                                int64_t blockTimestampEpoch // seconds
)
{
    // We'll do "to_timestamp($12::double precision)" in the query.
    // The "block_timestamp" column is a TIMESTAMP type in Postgres.
    static const char* sql = R"SQL(
        INSERT INTO liquidity_pools (
          pool_address,
          dex_name,
          token0_address,
          token1_address,
          token0_symbol,
          token0_name,
          token1_symbol,
          token1_name,
          fee,
          tick_spacing,
          block_discovered,
          block_timestamp
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          to_timestamp($12::double precision)
        )
        ON CONFLICT (pool_address) DO UPDATE
        SET
          dex_name         = EXCLUDED.dex_name,
          token0_address   = EXCLUDED.token0_address,
          token1_address   = EXCLUDED.token1_address,
          token0_symbol    = EXCLUDED.token0_symbol,
          token0_name      = EXCLUDED.token0_name,
          token1_symbol    = EXCLUDED.token1_symbol,
          token1_name      = EXCLUDED.token1_name,
          fee              = EXCLUDED.fee,
          tick_spacing     = EXCLUDED.tick_spacing,
          block_discovered = EXCLUDED.block_discovered,
          block_timestamp  = EXCLUDED.block_timestamp
    )SQL";

    // We'll pass blockTimestampEpoch as param #12 (int64 => double precision).
    pqxx::work txn(conn);
    txn.exec_params(
        sql,
        poolAddress,
        dexName,
        token0,
        token1,
        token0Symbol,
        token0Name,
        token1Symbol,
        token1Name,
        fee,
        tickSpacing,
        blockHex,
        (double)blockTimestampEpoch // cast to double
    );
    txn.commit();
}

int main() {
    // 1) env
    std::string dbHost = getEnvOrDefault("DB_HOST", "127.0.0.1");
    std::string dbPort = getEnvOrDefault("DB_PORT", "5432");
    std::string dbName = getEnvOrDefault("DB_NAME", "test_db");
    std::string dbUser = getEnvOrDefault("DB_USER", "test_user");
    std::string dbPass = getEnvOrDefault("DB_PASS", "test_pass");
    std::string quickNodeUrl = getEnvOrDefault("QUICKNODE_API_URL",
        "https://your-network.quiknode.pro/abcd1234/");

    // connect to postgres
    std::ostringstream connStr;
    connStr << "host=" << dbHost
            << " port=" << dbPort
            << " dbname=" << dbName
            << " user=" << dbUser
            << " password=" << dbPass;

    pqxx::connection conn(connStr.str());
    if (!conn.is_open()) {
        std::cerr << getTimestamp() << "Failed to open Postgres at " << connStr.str() << std::endl;
        return 1;
    }
    std::cout << getTimestamp() << "Connected to Postgres." << std::endl;

    // 2) load last block
    std::string lastBlockHex = loadLastBlockProcessed(conn);
    std::cout << getTimestamp() << "Last block processed: " << lastBlockHex << std::endl;

    // If "0x0", let's start 7 days ago for testing
    if (lastBlockHex == "0x0") {
        try {
            // get current block
            json req = {
                {"jsonrpc", "2.0"},
                {"id", 1},
                {"method", "eth_blockNumber"},
                {"params", json::array()}
            };
            json resp = quickNodeJsonRpcCall(quickNodeUrl, req);
            std::string latestHex = resp["result"].get<std::string>();
            int64_t latestBlock = std::stoll(latestHex.substr(2), nullptr, 16);

            // ~7 days => ~50400 blocks
            int64_t sevenDaysAgo = std::max<int64_t>(0, latestBlock - 50400);
            std::string newBlockHex = decimalToHex(sevenDaysAgo);
            saveLastBlockProcessed(conn, newBlockHex);
            lastBlockHex = newBlockHex;
            std::cout << getTimestamp() << "Set last block to ~7 days ago: " << lastBlockHex << std::endl;
        }
        catch (const std::exception& e) {
            std::cerr << getTimestamp() << "[ERROR] Could not set 7 days ago block: " << e.what() << std::endl;
        }
    }

    // 3) main loop
    while (true) {
        try {
            int64_t fromBlock = std::stoll(lastBlockHex.substr(2), nullptr, 16);

            // get latest
            json req = {
                {"jsonrpc", "2.0"},
                {"id", 1},
                {"method", "eth_blockNumber"},
                {"params", json::array()}
            };
            json resp = quickNodeJsonRpcCall(quickNodeUrl, req);
            std::string latestHex = resp["result"].get<std::string>();
            int64_t latestBlock = std::stoll(latestHex.substr(2), nullptr, 16);

            if (latestBlock < fromBlock) {
                std::cout << getTimestamp() << "No new blocks to process." << std::endl;
            } else {
                std::cout << getTimestamp() << "Scanning from block "
                          << fromBlock << " to " << latestBlock << std::endl;

                const int64_t chunkSize = 10000;
                int64_t currentBlock = fromBlock;
                int64_t maxBlockProcessed = fromBlock;

                while (currentBlock <= latestBlock) {
                    int64_t endBlock = std::min(currentBlock + chunkSize, latestBlock);

                    // For each DEX
                    for (auto& dex : DEXES) {
                        auto logs = getDexLogs(quickNodeUrl, dex, currentBlock, endBlock);

                        for (auto& logEntry : logs) {
                            std::string blockNumHex = logEntry["blockNumber"].get<std::string>();
                            int64_t blockDec = std::stoll(blockNumHex.substr(2), nullptr, 16);

                            // fetch block timestamp
                            int64_t blockTimestampEpoch = 0;
                            try {
                                blockTimestampEpoch = getBlockTimestamp(quickNodeUrl, blockNumHex);
                            } catch(...) {
                                blockTimestampEpoch = 0; // fallback
                            }

                            auto topicsArr = logEntry["topics"];
                            if (topicsArr.size() < 3) {
                                continue;
                            }

                            std::string token0, token1, poolAddress;
                            int feeValue = 0;
                            int tickSpacing = 0;

                            if (dex.isV2Style) {
                                // PairCreated => might be 4 topics or 3
                                if (topicsArr.size() == 4) {
                                    // official => pair in topics[3]
                                    token0 = topicToAddress(topicsArr[1].get<std::string>());
                                    token1 = topicToAddress(topicsArr[2].get<std::string>());
                                    poolAddress = topicToAddress(topicsArr[3].get<std::string>());
                                }
                                else if (topicsArr.size() == 3) {
                                    // older fork => pair in data
                                    token0 = topicToAddress(topicsArr[1].get<std::string>());
                                    token1 = topicToAddress(topicsArr[2].get<std::string>());
                                    std::string dataStr = logEntry["data"].get<std::string>();
                                    if (dataStr.size() >= 66) {
                                        poolAddress = "0x" + dataStr.substr(2, 40);
                                    }
                                }
                                else {
                                    continue;
                                }
                            }
                            else {
                                // V3 => topics[3] => fee, data => pool
                                if (topicsArr.size() < 4) {
                                    continue;
                                }
                                token0 = topicToAddress(topicsArr[1].get<std::string>());
                                token1 = topicToAddress(topicsArr[2].get<std::string>());

                                std::string feeTopic = topicsArr[3].get<std::string>();
                                if (feeTopic.size() >= 66) {
                                    uint64_t feeRaw = std::stoull(feeTopic.substr(2), nullptr, 16);
                                    feeValue = (int)(feeRaw & 0xFFFFFF);
                                }

                                std::string dataStr = logEntry["data"].get<std::string>();
                                if (dataStr.size() >= 130) {
                                    std::string w1 = dataStr.substr(2, 64);
                                    std::string w2 = dataStr.substr(66, 64);

                                    uint64_t val1 = std::stoull(w1, nullptr, 16);
                                    tickSpacing = (int)(val1 & 0xFFFFFF);

                                    poolAddress = "0x" + w2.substr(w2.size() - 40);
                                }
                            }

                            if (poolAddress.empty()) {
                                continue;
                            }

                            // fetch token metadata
                            std::string t0Symbol = getErc20Symbol(quickNodeUrl, token0);
                            std::string t0Name   = getErc20Name(quickNodeUrl, token0);
                            std::string t1Symbol = getErc20Symbol(quickNodeUrl, token1);
                            std::string t1Name   = getErc20Name(quickNodeUrl, token1);

                            // upsert with blockTimestamp
                            insertLiquidityPool(
                                conn,
                                dex.dexName,
                                poolAddress,
                                token0,
                                token1,
                                t0Symbol,
                                t0Name,
                                t1Symbol,
                                t1Name,
                                feeValue,
                                tickSpacing,
                                blockNumHex,
                                blockTimestampEpoch
                            );

                            if (blockDec > maxBlockProcessed) {
                                maxBlockProcessed = blockDec;
                            }
                        }
                    }

                    if (maxBlockProcessed > fromBlock) {
                        std::string newLastBlockHex = decimalToHex(maxBlockProcessed);
                        saveLastBlockProcessed(conn, newLastBlockHex);
                        lastBlockHex = newLastBlockHex;
                        std::cout << getTimestamp() << "Updated last block to "
                                  << newLastBlockHex << std::endl;
                    }

                    currentBlock = endBlock + 1;
                }
            }
        }
        catch (const std::exception& e) {
            std::cerr << getTimestamp() << "[ERROR] " << e.what() << std::endl;
        }

        std::cout << getTimestamp() << "Sleeping 1 minute..." << std::endl;
        std::this_thread::sleep_for(std::chrono::minutes(1));
    }

    return 0;
}
