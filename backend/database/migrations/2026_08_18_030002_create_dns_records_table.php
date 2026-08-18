<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dns_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('domain_id')->constrained()->onDelete('cascade');
            $table->string('cloudflare_record_id')->nullable();
            $table->string('type'); // A, AAAA, CNAME, TXT
            $table->string('name');
            $table->text('content');
            $table->integer('ttl')->default(1); // 1 = auto
            $table->boolean('proxied')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dns_records');
    }
};
