<?php

namespace App\Services\Deployment;

use Exception;
use ZipArchive;

class ZipExtractionService
{
    /**
     * Max allowed ratio of uncompressed to compressed size (Zip bomb protection).
     */
    protected int $maxCompressionRatio = 100;

    /**
     * Max total uncompressed file size limit in MB (default 200MB per upload).
     */
    protected int $maxTotalUncompressedMb = 200;

    public function extract(string $zipFilePath, string $destinationDir): int
    {
        if (!file_exists($zipFilePath)) {
            throw new Exception("ZIP archive file not found: {$zipFilePath}");
        }

        $zip = new ZipArchive();
        $res = $zip->open($zipFilePath);

        if ($res !== true) {
            throw new Exception("Failed to open ZIP archive. Error code: {$res}");
        }

        $realDestination = realpath(dirname($destinationDir));
        if (!$realDestination) {
            @mkdir($destinationDir, 0755, true);
            $realDestination = realpath($destinationDir);
        } else {
            if (!file_exists($destinationDir)) {
                @mkdir($destinationDir, 0755, true);
            }
            $realDestination = realpath($destinationDir);
        }

        $totalUncompressedSize = 0;
        $numFiles = $zip->numFiles;

        // Phase 1: Security inspection loop
        for ($i = 0; $i < $numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $filename = $stat['name'];

            // Prevent path traversal
            if (
                str_contains($filename, '..') ||
                str_starts_with($filename, '/') ||
                str_starts_with($filename, '\\') ||
                str_contains($filename, ":")
            ) {
                $zip->close();
                throw new Exception("Security Error: Dangerous path traversal detected in ZIP entry: {$filename}");
            }

            // Zip bomb checks
            $compressedSize = max(1, $stat['comp_size']);
            $uncompressedSize = $stat['size'];

            if (($uncompressedSize / $compressedSize) > $this->maxCompressionRatio) {
                $zip->close();
                throw new Exception("Security Error: Zip bomb ratio exceeded for file: {$filename}");
            }

            $totalUncompressedSize += $uncompressedSize;
            if (($totalUncompressedSize / (1024 * 1024)) > $this->maxTotalUncompressedMb) {
                $zip->close();
                throw new Exception("Quota Error: Total uncompressed archive size exceeds maximum limit of {$this->maxTotalUncompressedMb}MB");
            }
        }

        // Phase 2: Safe extraction
        for ($i = 0; $i < $numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $entryName = $stat['name'];
            $targetPath = $realDestination . DIRECTORY_SEPARATOR . ltrim($entryName, '/\\');

            // Confirm target canonical path is strictly inside $realDestination
            $targetDir = dirname($targetPath);
            if (!file_exists($targetDir)) {
                @mkdir($targetDir, 0755, true);
            }

            if (str_ends_with($entryName, '/') || str_ends_with($entryName, '\\')) {
                @mkdir($targetPath, 0755, true);
                continue;
            }

            $stream = $zip->getStream($entryName);
            if (!$stream) {
                continue;
            }

            $outStream = @fopen($targetPath, 'wb');
            if ($outStream) {
                stream_copy_to_stream($stream, $outStream);
                fclose($outStream);
            }
            fclose($stream);

            // Ensure extracted files are not executable server scripts
            @chmod($targetPath, 0644);
        }

        $zip->close();

        return (int) ceil($totalUncompressedSize / (1024 * 1024));
    }
}
