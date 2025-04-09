<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('bank_statements', function (Blueprint $table) {
            $table->string('statement_month')->nullable()->change(); // ✅ Make it nullable
        });
    }

    public function down() {
        Schema::table('bank_statements', function (Blueprint $table) {
            $table->string('statement_month')->nullable(false)->change(); // ✅ Rollback to NOT NULL if needed
        });
    }
};
