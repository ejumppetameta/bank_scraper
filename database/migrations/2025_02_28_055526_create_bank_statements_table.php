<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('bank_statements', function (Blueprint $table) {
            $table->id();
            $table->string('full_name'); // Added full name
            $table->string('bank_name'); // Added bank name
            $table->string('unique_code')->index(); // Unique identifier
            $table->string('account_no'); // Added account number
            $table->string('account_name');
            $table->string('statement_month');
            $table->decimal('opening_balance', 15, 2)->nullable();
            $table->decimal('closing_balance', 15, 2)->nullable();
            $table->enum('method', ['pdf', 'csv', 'html']); // Added method
            $table->string('path')->nullable(); // Added path for files (if applicable)
            $table->timestamps();
        });
    }

    public function down() {
        Schema::dropIfExists('bank_statements');
    }
};
