<?php

namespace Tests\Unit;

use App\Services\Deployment\ZipExtractionService;
use Exception;
use PHPUnit\Framework\TestCase;
use ZipArchive;

class ZipExtractionTest extends TestCase
{
    protected string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tempDir = sys_get_temp_dir() . '/zip_test_' . uniqid();
        @mkdir($this->tempDir, 0755, true);
    }

    protected function tearDown(): void
    {
        if (file_exists($this->tempDir)) {
            $this->removeDirectory($this->tempDir);
        }
        parent::tearDown();
    }

    protected function removeDirectory(string $dir): void
    {
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            (is_dir("$dir/$file")) ? $this->removeDirectory("$dir/$file") : @unlink("$dir/$file");
        }
        @rmdir($dir);
    }

    public function test_safe_zip_extraction_succeeds_for_valid_zip(): void
    {
        $zipPath = $this->tempDir . '/valid.zip';
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString('index.html', '<h1>Hello CloudPanel</h1>');
        $zip->addFromString('css/style.css', 'body { color: red; }');
        $zip->close();

        $destDir = $this->tempDir . '/out';
        $service = new ZipExtractionService();
        $sizeMb = $service->extract($zipPath, $destDir);

        $this->assertFileExists($destDir . '/index.html');
        $this->assertFileExists($destDir . '/css/style.css');
        $this->assertStringContainsString('Hello CloudPanel', file_get_contents($destDir . '/index.html'));
    }

    public function test_path_traversal_entry_is_rejected(): void
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Dangerous path traversal detected');

        $zipPath = $this->tempDir . '/malicious.zip';
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString('../../../etc/passwd', 'malicious data');
        $zip->close();

        $destDir = $this->tempDir . '/out_malicious';
        $service = new ZipExtractionService();
        $service->extract($zipPath, $destDir);
    }
}
