<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            // ✅ Add new columns
            $table->string('ref_no')->nullable()->after('transaction_date'); // Add reference number
            $table->decimal('balance', 15, 2)->nullable()->after('transaction_type'); // Add balance column
            
            // ✅ Modify existing columns
            $table->text('description')->change(); // Change description to text (for longer details)
        });
    }

    public function down() {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            // Rollback changes
            $table->dropColumn('ref_no');
            $table->dropColumn('balance');
            $table->string('description')->change(); // Revert description back to string
        });
    }
};
