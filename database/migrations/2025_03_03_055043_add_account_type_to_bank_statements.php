<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::table('bank_statements', function (Blueprint $table) {
            $table->string('account_type')->after('account_no')->nullable(); // ✅ Add account_type column
        });
    }

    public function down() {
        Schema::table('bank_statements', function (Blueprint $table) {
            $table->dropColumn('account_type'); // ✅ Rollback column if needed
        });
    }
};
