<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            $table->date('posting_date')->nullable()->change(); // Make posting_date nullable
        });
    }

    public function down()
    {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            $table->date('posting_date')->nullable(false)->change(); // Revert if needed
        });
    }
};
