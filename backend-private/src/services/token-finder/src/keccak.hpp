#pragma once

#include <string>

/**
 * Compute Keccak-256 hash of the given input.
 * Returns a 0x-prefixed hexadecimal string of length 66 (2 + 64 hex).
 */
std::string keccak256(const std::string &input);
