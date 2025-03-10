import { isPathAllowed } from './verifySession';
import { assertEquals } from '@test/assert';

function runTests() {
    console.log('Running path matching tests...');
    
    // Test exact matching
    assertEquals(isPathAllowed('foo', 'foo'), true, 'Exact match should be allowed');
    assertEquals(isPathAllowed('foo', 'bar'), false, 'Different segments should not match');
    assertEquals(isPathAllowed('foo/bar', 'foo/bar'), true, 'Exact multi-segment match should be allowed');
    assertEquals(isPathAllowed('foo/bar', 'foo/baz'), false, 'Partial multi-segment match should not be allowed');
    
    // Test with leading and trailing slashes
    assertEquals(isPathAllowed('/foo', 'foo'), true, 'Pattern with leading slash should match');
    assertEquals(isPathAllowed('foo/', 'foo'), true, 'Pattern with trailing slash should match');
    assertEquals(isPathAllowed('/foo/', 'foo'), true, 'Pattern with both leading and trailing slashes should match');
    assertEquals(isPathAllowed('foo', '/foo/'), true, 'Path with leading and trailing slashes should match');
    
    // Test simple wildcard matching
    assertEquals(isPathAllowed('*', 'foo'), true, 'Single wildcard should match any single segment');
    assertEquals(isPathAllowed('*', 'foo/bar'), true, 'Single wildcard should match multiple segments');
    assertEquals(isPathAllowed('*/bar', 'foo/bar'), true, 'Wildcard prefix should match');
    assertEquals(isPathAllowed('foo/*', 'foo/bar'), true, 'Wildcard suffix should match');
    assertEquals(isPathAllowed('foo/*/baz', 'foo/bar/baz'), true, 'Wildcard in middle should match');
    
    // Test multiple wildcards
    assertEquals(isPathAllowed('*/*', 'foo/bar'), true, 'Multiple wildcards should match corresponding segments');
    assertEquals(isPathAllowed('*/*/*', 'foo/bar/baz'), true, 'Three wildcards should match three segments');
    assertEquals(isPathAllowed('foo/*/*', 'foo/bar/baz'), true, 'Specific prefix with wildcards should match');
    assertEquals(isPathAllowed('*/*/baz', 'foo/bar/baz'), true, 'Wildcards with specific suffix should match');
    
    // Test wildcard consumption behavior
    assertEquals(isPathAllowed('*', ''), true, 'Wildcard should optionally consume segments');
    assertEquals(isPathAllowed('foo/*', 'foo'), true, 'Trailing wildcard should be optional');
    assertEquals(isPathAllowed('*/*', 'foo'), true, 'Multiple wildcards can match fewer segments');
    assertEquals(isPathAllowed('*/*/*', 'foo/bar'), true, 'Extra wildcards can be skipped');
    
    // Test complex nested paths
    assertEquals(isPathAllowed('api/*/users', 'api/v1/users'), true, 'API versioning pattern should match');
    assertEquals(isPathAllowed('api/*/users/*', 'api/v1/users/123'), true, 'API resource pattern should match');
    assertEquals(isPathAllowed('api/*/users/*/profile', 'api/v1/users/123/profile'), true, 'Nested API pattern should match');
    
    // Test for the requested padbootstrap* pattern
    assertEquals(isPathAllowed('padbootstrap*', 'padbootstrap'), true, 'padbootstrap* should match padbootstrap');
    assertEquals(isPathAllowed('padbootstrap*', 'padbootstrapv1'), true, 'padbootstrap* should match padbootstrapv1');
    assertEquals(isPathAllowed('padbootstrap*', 'padbootstrap/files'), false, 'padbootstrap* should not match padbootstrap/files');
    assertEquals(isPathAllowed('padbootstrap*/*', 'padbootstrap/files'), true, 'padbootstrap*/* should match padbootstrap/files');
    assertEquals(isPathAllowed('padbootstrap*/files', 'padbootstrapv1/files'), true, 'padbootstrap*/files should not match padbootstrapv1/files (wildcard is segment-based, not partial)');
    
    // Test wildcard edge cases
    assertEquals(isPathAllowed('*/*/*/*/*/*', 'a/b'), true, 'Many wildcards can match few segments');
    assertEquals(isPathAllowed('a/*/b/*/c', 'a/anything/b/something/c'), true, 'Multiple wildcards in pattern should match corresponding segments');
    
    // Test patterns with partial segment matches
    assertEquals(isPathAllowed('padbootstrap*', 'padbootstrap-123'), true, 'Wildcards in isPathAllowed should be segment-based, not character-based');
    assertEquals(isPathAllowed('test*', 'testuser'), true, 'Asterisk as part of segment name is treated as a literal, not a wildcard');
    assertEquals(isPathAllowed('my*app', 'myapp'), true, 'Asterisk in middle of segment name is treated as a literal, not a wildcard');

    console.log('All tests passed!');
}

// Run all tests
try {
    runTests();
} catch (error) {
    console.error('Test failed:', error);
}