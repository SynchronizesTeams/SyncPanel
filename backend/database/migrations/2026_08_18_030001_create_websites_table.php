<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('websites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('domain_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('hostname')->unique(); // e.g. blog.example.com
            $table->string('document_root');
            $table->string('status')->default('creating'); // creating, deploying, active, suspended, failed, deleting
            $table->integer('storage_limit_mb')->default(500);
            $table->integer('storage_used_mb')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('websites');
    }
};
