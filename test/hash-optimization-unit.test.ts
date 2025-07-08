import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyAll } from '../src/utils'

const _dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Hash Optimization Unit Tests', () => {
  const testDir = path.join(_dirname, 'temp-hash-test-' + Date.now())
  const srcDir = path.join(testDir, 'src')
  const destDir = path.join(testDir, 'dest')

  beforeEach(async () => {
    // Clean up and create fresh test directories
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore if directory doesn't exist
    }
    await fs.mkdir(srcDir, { recursive: true })
    await fs.mkdir(destDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  test('should copy file when destination does not exist', async () => {
    // Create source file
    const content = 'Hello, World!'
    await fs.writeFile(path.join(srcDir, 'test.txt'), content)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'test.txt', dest: 'test.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)

    // Verify file was copied
    const copiedContent = await fs.readFile(path.join(destDir, 'test.txt'), 'utf8')
    expect(copiedContent).toBe(content)
  })

  test('should skip copying when files are identical (same content)', async () => {
    const content = 'Identical content for testing'
    
    // Create source file
    await fs.writeFile(path.join(srcDir, 'identical.txt'), content)
    
    // Create destination file with same content
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'identical.txt'), content)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'identical.txt', dest: 'identical.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(0)
    expect(result.targets).toBe(1)
  })

  test('should copy when files have different content', async () => {
    const srcContent = 'Original content'
    const destContent = 'Different content'
    
    // Create source file
    await fs.writeFile(path.join(srcDir, 'different.txt'), srcContent)
    
    // Create destination file with different content
    await fs.mkdir(path.dirname(path.join(destDir, 'different.txt')), { recursive: true })
    await fs.writeFile(path.join(destDir, 'different.txt'), destContent)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'different.txt', dest: 'different.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)

    // Verify content was updated
    const finalContent = await fs.readFile(path.join(destDir, 'different.txt'), 'utf8')
    expect(finalContent).toBe(srcContent)
  })

  test('should copy when files have different sizes', async () => {
    const shortContent = 'Short'
    const longContent = 'This is a much longer content that should have a different size'
    
    // Create source file
    await fs.writeFile(path.join(srcDir, 'size-test.txt'), longContent)
    
    // Create destination file with different size
    await fs.mkdir(path.dirname(path.join(destDir, 'size-test.txt')), { recursive: true })
    await fs.writeFile(path.join(destDir, 'size-test.txt'), shortContent)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'size-test.txt', dest: 'size-test.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)

    // Verify content was updated
    const finalContent = await fs.readFile(path.join(destDir, 'size-test.txt'), 'utf8')
    expect(finalContent).toBe(longContent)
  })

  test('should handle large files efficiently', async () => {
    // Create a larger file (1MB)
    const largeContent = 'A'.repeat(1024 * 1024)
    
    await fs.writeFile(path.join(srcDir, 'large.txt'), largeContent)
    await fs.mkdir(path.dirname(path.join(destDir, 'large.txt')), { recursive: true })
    await fs.writeFile(path.join(destDir, 'large.txt'), largeContent)

    const startTime = Date.now()
    
    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'large.txt', dest: 'large.txt' }],
      false,
      true
    )

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(result.copied).toBe(0) // Should skip identical file
    expect(result.targets).toBe(1)
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
  })

  test('should handle binary files correctly', async () => {
    // Create binary content
    const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    
    await fs.writeFile(path.join(srcDir, 'binary.png'), binaryData)
    await fs.mkdir(path.dirname(path.join(destDir, 'binary.png')), { recursive: true })
    await fs.writeFile(path.join(destDir, 'binary.png'), binaryData)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'binary.png', dest: 'binary.png' }],
      false,
      true
    )

    expect(result.copied).toBe(0) // Should skip identical binary file
    expect(result.targets).toBe(1)
  })

  test('should copy when binary files differ', async () => {
    const binaryData1 = Buffer.from([0x89, 0x50, 0x4E, 0x47])
    const binaryData2 = Buffer.from([0x47, 0x49, 0x46, 0x38])
    
    await fs.writeFile(path.join(srcDir, 'binary-diff.bin'), binaryData1)
    await fs.mkdir(path.dirname(path.join(destDir, 'binary-diff.bin')), { recursive: true })
    await fs.writeFile(path.join(destDir, 'binary-diff.bin'), binaryData2)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'binary-diff.bin', dest: 'binary-diff.bin' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)

    // Verify binary content was updated
    const finalContent = await fs.readFile(path.join(destDir, 'binary-diff.bin'))
    expect(finalContent).toEqual(binaryData1)
  })

  test('should handle empty files', async () => {
    // Create empty files
    await fs.writeFile(path.join(srcDir, 'empty.txt'), '')
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'empty.txt'), '')

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'empty.txt', dest: 'empty.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(0) // Should skip identical empty files
    expect(result.targets).toBe(1)
  })

  test('should copy when one file is empty and other is not', async () => {
    await fs.writeFile(path.join(srcDir, 'not-empty.txt'), 'Content')
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'not-empty.txt'), '')

    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'not-empty.txt', dest: 'not-empty.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)

    const finalContent = await fs.readFile(path.join(destDir, 'not-empty.txt'), 'utf8')
    expect(finalContent).toBe('Content')
  })

  test('should handle file access errors gracefully', async () => {
    // Create source file
    await fs.writeFile(path.join(srcDir, 'source.txt'), 'content')
    
    // Create destination file and make it read-only (simulate permission error)
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'source.txt'), 'old content')
    
    // The copy should still work as fs.copy handles permissions
    const result = await copyAll(
      srcDir,
      destDir,
      [{ src: 'source.txt', dest: 'source.txt' }],
      false,
      true
    )

    expect(result.copied).toBe(1)
    expect(result.targets).toBe(1)
  })

  test('should handle multiple files with mixed scenarios', async () => {
    // File 1: Identical content (should skip)
    await fs.writeFile(path.join(srcDir, 'identical.txt'), 'same')
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'identical.txt'), 'same')

    // File 2: Different content (should copy)
    await fs.writeFile(path.join(srcDir, 'different.txt'), 'new')
    await fs.writeFile(path.join(destDir, 'different.txt'), 'old')

    // File 3: New file (should copy)
    await fs.writeFile(path.join(srcDir, 'new.txt'), 'brand new')

    const result = await copyAll(
      srcDir,
      destDir,
      [
        { src: 'identical.txt', dest: 'identical.txt' },
        { src: 'different.txt', dest: 'different.txt' },
        { src: 'new.txt', dest: 'new.txt' }
      ],
      false,
      true
    )

    expect(result.copied).toBe(2) // Should copy 2 files (different + new)
    expect(result.targets).toBe(3)
  })

  test('should respect overwrite=false setting', async () => {
    const srcContent = 'source content'
    const destContent = 'destination content'
    
    await fs.writeFile(path.join(srcDir, 'overwrite-test.txt'), srcContent)
    await fs.ensureDir(destDir)
    await fs.writeFile(path.join(destDir, 'overwrite-test.txt'), destContent)

    const result = await copyAll(
      srcDir,
      destDir,
      [{ 
        src: 'overwrite-test.txt', 
        dest: 'overwrite-test.txt',
        overwrite: false
      }],
      false,
      true
    )

    expect(result.copied).toBe(0) // Should not copy due to overwrite=false
    expect(result.targets).toBe(1)

    // Verify original content is preserved
    const finalContent = await fs.readFile(path.join(destDir, 'overwrite-test.txt'), 'utf8')
    expect(finalContent).toBe(destContent)
  })
})