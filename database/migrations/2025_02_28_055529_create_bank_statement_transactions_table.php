<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('bank_statement_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_id')->constrained()->onDelete('cascade'); // Link to `bank_statements`
            $table->date('posting_date');
            $table->date('transaction_date');
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->enum('transaction_type', ['DR', 'CR']); // Debit or Credit
            $table->timestamps();
        });
    }

    public function down() {
        Schema::dropIfExists('bank_statement_transactions');
    }
};
