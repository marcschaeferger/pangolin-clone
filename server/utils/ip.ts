interface IPRange {
    start: bigint;
    end: bigint;
  }
  
  /**
   * Converts IP address string to BigInt for numerical operations
   */
  function ipToBigInt(ip: string): bigint {
    return ip.split('.')
      .reduce((acc, octet) => BigInt.asUintN(64, (acc << BigInt(8)) + BigInt(parseInt(octet))), BigInt(0));
  }
  
  /**
   * Converts BigInt to IP address string
   */
  function bigIntToIp(num: bigint): string {
    const octets: number[] = [];
    for (let i = 0; i < 4; i++) {
      octets.unshift(Number(num & BigInt(255)));
      num = num >> BigInt(8);
    }
    return octets.join('.');
  }
  
  /**
   * Converts CIDR to IP range
   */
  function cidrToRange(cidr: string): IPRange {
    const [ip, prefix] = cidr.split('/');
    const prefixBits = parseInt(prefix);
    const ipBigInt = ipToBigInt(ip);
    const mask = BigInt.asUintN(64, (BigInt(1) << BigInt(32 - prefixBits)) - BigInt(1));
    const start = ipBigInt & ~mask;
    const end = start | mask;
    return { start, end };
  }
  
  /**
   * Finds the next available CIDR block given existing allocations
   * @param existingCidrs Array of existing CIDR blocks
   * @param blockSize Desired prefix length for the new block (e.g., 24 for /24)
   * @param startCidr Optional CIDR to start searching from (default: "0.0.0.0/0")
   * @returns Next available CIDR block or null if none found
   */
  export function findNextAvailableCidr(
    existingCidrs: string[],
    blockSize: number,
    startCidr: string = "0.0.0.0/0"
  ): string | null {
    // Convert existing CIDRs to ranges and sort them
    const existingRanges = existingCidrs
      .map(cidr => cidrToRange(cidr))
      .sort((a, b) => (a.start < b.start ? -1 : 1));
  
    // Calculate block size
    const blockSizeBigInt = BigInt(1) << BigInt(32 - blockSize);
    
    // Start from the beginning of the given CIDR
    let current = cidrToRange(startCidr).start;
    const maxIp = cidrToRange(startCidr).end;
  
    // Iterate through existing ranges
    for (let i = 0; i <= existingRanges.length; i++) {
      const nextRange = existingRanges[i];
      
      // Align current to block size
      const alignedCurrent = current + ((blockSizeBigInt - (current % blockSizeBigInt)) % blockSizeBigInt);
      
      // Check if we've gone beyond the maximum allowed IP
      if (alignedCurrent + blockSizeBigInt - BigInt(1) > maxIp) {
        return null;
      }
  
      // If we're at the end of existing ranges or found a gap
      if (!nextRange || alignedCurrent + blockSizeBigInt - BigInt(1) < nextRange.start) {
        return `${bigIntToIp(alignedCurrent)}/${blockSize}`;
      }
  
      // Move current pointer to after the current range
      current = nextRange.end + BigInt(1);
    }
  
    return null;
  }