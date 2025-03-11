#include "keccak.hpp"

#include <vector>
#include <sstream>
#include <iomanip>
#include <cstring> // for memset, memcpy

// Constants for Keccak-f[1600]
static constexpr size_t KECCAK_STATE_SIZE = 25; // 5x5 lanes
static constexpr uint64_t KECCAK_ROUND_CONSTANTS[24] = {
    0x0000000000000001ULL, 0x0000000000008082ULL,
    0x800000000000808aULL, 0x8000000080008000ULL,
    0x000000000000808bULL, 0x0000000080000001ULL,
    0x8000000080008081ULL, 0x8000000000008009ULL,
    0x000000000000008aULL, 0x0000000000000088ULL,
    0x0000000080008009ULL, 0x000000008000000aULL,
    0x000000008000808bULL, 0x800000000000008bULL,
    0x8000000000008089ULL, 0x8000000000008003ULL,
    0x8000000000008002ULL, 0x8000000000000080ULL,
    0x000000000000800aULL, 0x800000008000000aULL,
    0x8000000080008081ULL, 0x8000000000008080ULL,
    0x0000000080000001ULL, 0x8000000080008008ULL
};

// Rotation offsets
static constexpr unsigned int KECCAK_ROTATIONS[5][5] = {
  { 0, 36, 3, 41, 18},
  { 1, 44, 10, 45,  2},
  {62,  6, 43, 15, 61},
  {28, 55, 25, 21, 56},
  {27, 20, 39,  8, 14}
};

/**
 * Keccak-f[1600] permutation on the 5x5 state array (25 lanes of 64 bits).
 */
static void keccakF1600(uint64_t state[KECCAK_STATE_SIZE]) {
    for (int round = 0; round < 24; round++) {
        // Theta
        uint64_t C[5];
        for (int x = 0; x < 5; x++) {
            C[x] = state[x] ^ state[x+5] ^ state[x+10] ^ state[x+15] ^ state[x+20];
        }
        for (int x = 0; x < 5; x++) {
            uint64_t d = C[(x+4) % 5] ^ ((C[(x+1) % 5] << 1) | (C[(x+1) % 5] >> 63));
            for (int y = 0; y < 25; y += 5) {
                state[y + x] ^= d;
            }
        }

        // Rho + Pi
        uint64_t temp[25];
        std::memcpy(temp, state, sizeof(temp));
        for (int x = 0; x < 5; x++) {
            for (int y = 0; y < 5; y++) {
                int newX = y;
                int newY = (2 * x + 3 * y) % 5;
                unsigned int rot = KECCAK_ROTATIONS[x][y];
                uint64_t val = temp[y*5 + x];
                state[newY*5 + newX] = (val << rot) | (val >> (64 - rot));
            }
        }

        // Chi
        for (int y = 0; y < 25; y += 5) {
            uint64_t row[5];
            for (int x = 0; x < 5; x++) row[x] = state[y + x];
            for (int x = 0; x < 5; x++) {
                state[y + x] = row[x] ^ ((~row[(x+1)%5]) & row[(x+2)%5]);
            }
        }

        // Iota
        state[0] ^= KECCAK_ROUND_CONSTANTS[round];
    }
}

/**
 * Pad the input data for Keccak, then absorb and squeeze to get 32-byte (256-bit) hash.
 */
std::string keccak256(const std::string &input) {
    // Rate in bits for Keccak-256 is 1088 => rate in bytes = 1088/8 = 136
    static constexpr size_t RATE_BYTES = 136;
    // We want 256-bit output => capacity is 512 bits => 1600-512=1088 rate bits
    // We'll do absorbing of the input, then 0x01 and 0x80 padding, then permutation, then squeeze 32 bytes.

    // Convert input to bytes
    const uint8_t* data = reinterpret_cast<const uint8_t*>(input.data());
    size_t inLen = input.size();

    // State: 25 lanes of 64 bits each
    uint64_t state[KECCAK_STATE_SIZE];
    std::memset(state, 0, sizeof(state));

    // Absorb input in 136-byte blocks
    size_t offset = 0;
    while ((inLen - offset) >= RATE_BYTES) {
        // XOR block into state
        for (size_t i = 0; i < RATE_BYTES / 8; i++) {
            uint64_t lane = 0;
            // little-endian
            for (int b = 0; b < 8; b++) {
                lane |= (uint64_t)data[offset + i*8 + b] << (8*b);
            }
            state[i] ^= lane;
        }
        keccakF1600(state);
        offset += RATE_BYTES;
    }

    // Last partial block
    uint8_t temp[RATE_BYTES];
    std::memset(temp, 0, RATE_BYTES);
    size_t partial = inLen - offset;
    std::memcpy(temp, data + offset, partial);

    // Append padding
    temp[partial] = 0x01;    // 0x01 domain separation
    temp[RATE_BYTES - 1] |= 0x80; // 0x80 at the end

    for (size_t i = 0; i < RATE_BYTES / 8; i++) {
        uint64_t lane = 0;
        for (int b = 0; b < 8; b++) {
            lane |= (uint64_t)temp[i*8 + b] << (8*b);
        }
        state[i] ^= lane;
    }
    keccakF1600(state);

    // Squeeze 32 bytes from the state
    // The first 136 bytes of state are the "rate" portion, we want first 32
    // bytes from that in little-endian
    uint8_t output[32];
    for (size_t i = 0; i < 4; i++) { // 4 lanes => 4*8=32 bytes
        uint64_t lane = state[i];
        for (int b = 0; b < 8; b++) {
            output[i*8 + b] = (uint8_t)((lane >> (8*b)) & 0xFF);
        }
    }

    // Convert to hex string, 0x-prefixed
    std::ostringstream oss;
    oss << "0x" << std::hex << std::setfill('0');
    for (int i = 0; i < 32; i++) {
        oss << std::setw(2) << (int)output[i];
    }
    return oss.str();
}
