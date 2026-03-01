-- Add playwright extraction method for JS-rendered fallback results.
ALTER TYPE "ExtractionMethod" ADD VALUE IF NOT EXISTS 'playwright';
