import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyAll } from '../src/utils'

const _dirname = path.dirname(fileURLToPath(import.meta.url))

describe('hash optimization', () => {
  beforeAll(async () => {
    // Set up test files with known content
    const hashTestDir = path.join(_dirname, 'fixtures', 'hash-test')
    
    // Ensure directory exists
    await fs.mkdir(hashTestDir, { recursive: true })
    
    // Create source files
    await fs.writeFile(
      path.join(hashTestDir, 'source1.txt'),
      'This is the original content for hash testing.\nIt has multiple lines to ensure a meaningful hash.\nLine 3 of the file.'
    )
    
    await fs.writeFile(
      path.join(hashTestDir, 'source2.txt'),
      'This is different content for hash testing.\nDifferent lines here.\nAnother line.'
    )
  })

  afterAll(async () => {
    // Clean up test files
    const distDir = path.join(_dirname, 'fixtures', 'dist')
    
    try {
      await fs.rm(distDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  test('should skip copying identical files based on hash comparison', async () => {
    const hashTestDir = path.join(_dirname, 'fixtures', 'hash-test')
    const distDir = path.join(_dirname, 'fixtures', 'dist')
    
    // Clean up any existing dist directory
    try {
      await fs.rm(distDir, { recursive: true, force: true })
    } catch {
      // Ignore if doesn't exist
    }
    
    // First build - copy the file initially
    const result1 = await copyAll(
      hashTestDir,
      distDir,
      [
        {
          src: 'source1.txt',
          dest: 'identical.txt',
          preserveTimestamps: false,
          dereference: true,
          overwrite: true,
        }
      ],
      false,
      true
    )
    
    // Verify first copy worked
    expect(result1.copied).toBe(1)
    
    // Wait a bit to ensure different timestamps if file is modified
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Second build - should skip copying identical file
    const result2 = await copyAll(
      hashTestDir,
      distDir,
      [
        {
          src: 'source1.txt',
          dest: 'identical.txt',
          preserveTimestamps: false,
          dereference: true,
          overwrite: true,
        }
      ],
      false,
      true
    )
    
    // The second copy should be skipped (copied count should be 0)
    expect(result2.copied).toBe(0)
    expect(result2.targets).toBe(1)
  }, 15000)

  test('should copy files when content differs', async () => {
    const hashTestDir = path.join(_dirname, 'fixtures', 'hash-test')
    const distDir = path.join(_dirname, 'fixtures', 'dist')
    
    // Clean up any existing dist directory
    try {
      await fs.rm(distDir, { recursive: true, force: true })
    } catch {
      // Ignore if doesn't exist
    }
    
    // First, copy source1.txt to create initial file
    await copyAll(
      hashTestDir,
      distDir,
      [
        {
          src: 'source1.txt',
          dest: 'modified.txt',
          preserveTimestamps: false,
          dereference: true,
          overwrite: true,
        }
      ],
      false,
      true
    )
    
    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Now copy source2.txt (different content) to the same destination
    const result = await copyAll(
      hashTestDir,
      distDir,
      [
        {
          src: 'source2.txt',
          dest: 'modified.txt',
          preserveTimestamps: false,
          dereference: true,
          overwrite: true,
        }
      ],
      false,
      true
    )
    
    // The file should have been copied because content differs
    expect(result.copied).toBe(1)
    
    // Verify the content was actually updated
    const content = await fs.readFile(path.join(distDir, 'modified.txt'), 'utf8')
    expect(content).toBe('This is different content for hash testing.\nDifferent lines here.\nAnother line.')
  }, 15000)
})