<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            $table->date('transaction_date')->nullable()->change();
            $table->text('description')->nullable()->change();
            $table->decimal('amount', 15, 2)->nullable()->change();
            $table->enum('transaction_type', ['DR', 'CR'])->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('bank_statement_transactions', function (Blueprint $table) {
            $table->date('transaction_date')->nullable(false)->change();
            $table->text('description')->nullable(false)->change();
            $table->decimal('amount', 15, 2)->nullable(false)->change();
            $table->enum('transaction_type', ['DR', 'CR'])->nullable(false)->change();
        });
    }
};
