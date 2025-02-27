import { cidrToRange, findNextAvailableCidr } from "./ip";

/**
 * Compares two objects for deep equality
 * @param actual The actual value to test
 * @param expected The expected value to compare against
 * @param message The message to display if assertion fails
 * @throws Error if objects are not equal
 */
export function assertEqualsObj<T>(actual: T, expected: T, message: string): void {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
    }
}

/**
 * Compares two primitive values for equality
 * @param actual The actual value to test
 * @param expected The expected value to compare against
 * @param message The message to display if assertion fails
 * @throws Error if values are not equal
 */
export function assertEquals<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
}

/**
 * Tests if a function throws an expected error
 * @param fn The function to test
 * @param expectedError The expected error message or part of it
 * @param message The message to display if assertion fails
 * @throws Error if function doesn't throw or throws unexpected error
 */
export function assertThrows(
    fn: () => void,
    expectedError: string,
    message: string
): void {
    try {
        fn();
        throw new Error(`${message}: Expected to throw "${expectedError}"`);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw new Error(`${message}\nUnexpected error type: ${typeof error}`);
        }
        
        if (!error.message.includes(expectedError)) {
            throw new Error(
                `${message}\nExpected error: ${expectedError}\nActual error: ${error.message}`
            );
        }
    }
}


// Test cases
function testFindNextAvailableCidr() {
    console.log("Running findNextAvailableCidr tests...");
    
    // Test 1: Basic IPv4 allocation
    {
        const existing = ["10.0.0.0/16", "10.1.0.0/16"];
        const result = findNextAvailableCidr(existing, 16, "10.0.0.0/8");
        assertEquals(result, "10.2.0.0/16", "Basic IPv4 allocation failed");
    }

    // Test 2: Finding gap between allocations
    {
        const existing = ["10.0.0.0/16", "10.2.0.0/16"];
        const result = findNextAvailableCidr(existing, 16, "10.0.0.0/8");
        assertEquals(result, "10.1.0.0/16", "Finding gap between allocations failed");
    }

    // Test 3: No available space
    {
        const existing = ["10.0.0.0/8"];
        const result = findNextAvailableCidr(existing, 8, "10.0.0.0/8");
        assertEquals(result, null, "No available space test failed");
    }

    // // Test 4: IPv6 allocation
    // {
    //     const existing = ["2001:db8::/32", "2001:db8:1::/32"];
    //     const result = findNextAvailableCidr(existing, 32, "2001:db8::/16");
    //     assertEquals(result, "2001:db8:2::/32", "Basic IPv6 allocation failed");
    // }

    // // Test 5: Mixed IP versions
    // {
    //     const existing = ["10.0.0.0/16", "2001:db8::/32"];
    //     assertThrows(
    //         () => findNextAvailableCidr(existing, 16),
    //         "All CIDRs must be of the same IP version",
    //         "Mixed IP versions test failed"
    //     );
    // }

    // Test 6: Empty input
    {
        const existing: string[] = [];
        const result = findNextAvailableCidr(existing, 16);
        assertEquals(result, null, "Empty input test failed");
    }

    // Test 7: Block size alignment
    {
        const existing = ["10.0.0.0/24"];
        const result = findNextAvailableCidr(existing, 24, "10.0.0.0/16");
        assertEquals(result, "10.0.1.0/24", "Block size alignment test failed");
    }

    // Test 8: Block size alignment
    {
        const existing: string[] = [];
        const result = findNextAvailableCidr(existing, 24, "10.0.0.0/16");
        assertEquals(result, "10.0.0.0/24", "Block size alignment test failed");
    }

    // Test 9: Large block size request
    {
        const existing = ["10.0.0.0/24", "10.0.1.0/24"];
        const result = findNextAvailableCidr(existing, 16, "10.0.0.0/16");
        assertEquals(result, null, "Large block size request test failed");
    }

    console.log("All findNextAvailableCidr tests passed!");
}

// function testCidrToRange() {
//     console.log("Running cidrToRange tests...");

//     // Test 1: Basic IPv4 conversion
//     {
//         const result = cidrToRange("192.168.0.0/24");
//         assertEqualsObj(result, {
//             start: BigInt("3232235520"),
//             end: BigInt("3232235775")
//         }, "Basic IPv4 conversion failed");
//     }

//     // Test 2: IPv6 conversion
//     {
//         const result = cidrToRange("2001:db8::/32");
//         assertEqualsObj(result, {
//             start: BigInt("42540766411282592856903984951653826560"),
//             end: BigInt("42540766411282592875350729025363378175")
//         }, "IPv6 conversion failed");
//     }

//     // Test 3: Invalid prefix length
//     {
//         assertThrows(
//             () => cidrToRange("192.168.0.0/33"),
//             "Invalid prefix length for IPv4",
//             "Invalid IPv4 prefix test failed"
//         );
//     }

//     // Test 4: Invalid IPv6 prefix
//     {
//         assertThrows(
//             () => cidrToRange("2001:db8::/129"),
//             "Invalid prefix length for IPv6",
//             "Invalid IPv6 prefix test failed"
//         );
//     }

//     console.log("All cidrToRange tests passed!");
// }

// Run all tests
try {
    // testCidrToRange();
    testFindNextAvailableCidr();
    console.log("All tests passed successfully!");
} catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
}